# launch_instances_with_heartbeat_and_information_push.py
#
# Dry run, no waiting:
#   python .\launch_instances_with_heartbeat_and_information_push.py --tenant 48 --count 10 --seed 123 --show-schedule --no-sleep
#
# Execute with a 20-second heartbeat:
#   python .\launch_instances_with_heartbeat_and_information_push.py --tenant 48 --count 10 --username YOUR_USER --password YOUR_PASSWORD --execute
#
# What this does:
#   1. Builds all planned process instances and variables up front.
#   2. Days start at day 1.
#   3. On each heartbeat/day, it starts only the instances whose
#      originalSubmissionStart equals the current day.
#   4. It then queries already-running process instances and pushes:
#        a. ingediend -> beoordeling when:
#             currentDay == originalSubmissionStart + submissionDuration
#        b. beoordeling -> informatie when:
#             needsExtraInformation is true AND
#             currentDay == originalSubmissionStart + submissionDuration + extraInformationStart
#   5. If needsExtraInformation is true, initialization always makes
#      evaluationDuration at least 2 more than extraInformationDuration.

import argparse
import random
import re
import sys
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import requests
from requests.auth import HTTPBasicAuth


DEFAULT_BASE_URL = "https://operaton.open-regels.nl/engine-rest/engine/default"
DEFAULT_PROCESS_KEY = "processAanvraagInfoBezwaar"
DEFAULT_TENANT_ID = "48"
DEFAULT_SUBMISSION_TOPIC = "ingediend"
DEFAULT_EVALUATION_TOPIC = "beoordeling"
DEFAULT_INFORMATION_TARGET_STATE = "informatie"
DEFAULT_WORKER_ID = "python-heartbeat-pusher"

VariablePayload = Dict[str, Dict[str, Any]]
VariableValues = Dict[str, Any]


@dataclass
class PlannedInstance:
    index: int
    business_key: Optional[str]
    variables: VariablePayload
    original_submission_start: int
    submission_duration: int
    needs_extra_information: bool
    extra_information_start: int
    extra_information_duration: int
    evaluation_duration: int
    started: bool = False
    process_instance_id: Optional[str] = None

    @property
    def beoordeling_day(self) -> int:
        return self.original_submission_start + self.submission_duration

    @property
    def informatie_day(self) -> int:
        return self.original_submission_start + self.submission_duration + self.extra_information_start


@dataclass
class PushRule:
    name: str
    from_topic: str
    target_state_label: str
    due_day: int
    completion_variables: VariablePayload


def random_bool(probability_true: float) -> bool:
    return random.random() < probability_true


def parse_index_from_business_key(business_key: Optional[str]) -> Optional[int]:
    if not business_key:
        return None

    match = re.search(r"(\d+)$", business_key)
    if not match:
        return None

    return int(match.group(1))


def get_auth(args: argparse.Namespace):
    if args.username or args.password:
        if not args.username or not args.password:
            print("Both --username and --password are required when using basic auth.")
            sys.exit(1)
        return HTTPBasicAuth(args.username, args.password)

    return None


def request_json(method: str, url: str, auth=None, **kwargs):
    response = requests.request(method, url, auth=auth, **kwargs)

    if response.status_code not in (200, 201, 204):
        raise RuntimeError(
            f"HTTP {response.status_code} for {method} {url}\n{response.text}"
        )

    if response.status_code == 204 or not response.text:
        return None

    return response.json()


def to_int(value: Any, variable_name: str, instance_id: str) -> Optional[int]:
    """
    Convert Camunda/Operaton primitive variable values into ints.
    Returns None when the value is missing or cannot be interpreted.
    """
    if value is None:
        return None

    try:
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        return int(str(value))
    except (TypeError, ValueError):
        print(
            f"Skipping id={instance_id}: variable {variable_name} "
            f"has non-integer value {value!r}"
        )
        return None


def to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value != 0
    if isinstance(value, float):
        return value != 0.0
    if value is None:
        return False

    text = str(value).strip().lower()
    return text in {"true", "1", "yes", "ja", "waar", "y"}


def variable(value: Any, var_type: str) -> Dict[str, Any]:
    return {
        "value": value,
        "type": var_type,
    }


def build_variable_payload(instance_index: int, args: argparse.Namespace) -> VariablePayload:
    """
    Same variable-generation approach as setInitialVariables, extended with
    durations and extra-information timing for the heartbeat.
    """
    subsidy_amount = random.randint(args.min_subsidy, args.max_subsidy)

    needs_extra_information = random_bool(args.prob_needs_extra_information)
    eligible_initial = random_bool(args.prob_eligible_initial)
    will_complain = random_bool(args.prob_will_complain)
    eligible_after_complaint = random_bool(args.prob_eligible_after_complaint)

    original_submission_start = (instance_index - 1) + random.randint(
        args.min_start_offset_days,
        args.max_start_offset_days,
    )

    submission_duration = random.randint(
        args.min_submission_duration_days,
        args.max_submission_duration_days,
    )

    evaluation_duration = random.randint(
        args.min_evaluation_duration_days,
        args.max_evaluation_duration_days,
    )

    extra_information_start = random.randint(
        args.min_extra_information_start_days,
        args.max_extra_information_start_days,
    )

    extra_information_duration = random.randint(
        args.min_extra_information_duration_days,
        args.max_extra_information_duration_days,
    )

    # Required rule from the user:
    # if needsExtraInformation is true, evaluationDuration must always be
    # at least 2 more than extraInformationDuration.
    if needs_extra_information:
        evaluation_duration = max(
            evaluation_duration,
            extra_information_duration + 2,
        )

    return {
        "subsidyAmount": variable(subsidy_amount, "Long"),
        "needsExtraInformation": variable(needs_extra_information, "Boolean"),
        "eligibleInitial": variable(eligible_initial, "Boolean"),
        "willComplain": variable(will_complain, "Boolean"),
        "eligibleAfterComplaint": variable(eligible_after_complaint, "Boolean"),
        "originalSubmissionStart": variable(original_submission_start, "Long"),
        "submissionDuration": variable(submission_duration, "Long"),
        "evaluationDuration": variable(evaluation_duration, "Long"),
        "extraInformationStart": variable(extra_information_start, "Long"),
        "extraInformationDuration": variable(extra_information_duration, "Long"),
    }


def build_planned_instances(args: argparse.Namespace) -> List[PlannedInstance]:
    """
    Build the complete in-memory array before any process instance is created.
    This seeded schedule is the source for both creation and expected transitions.
    """
    planned_instances: List[PlannedInstance] = []

    for index in range(1, args.count + 1):
        variables = build_variable_payload(index, args)

        original_submission_start = int(variables["originalSubmissionStart"]["value"])
        submission_duration = int(variables["submissionDuration"]["value"])
        needs_extra_information = bool(variables["needsExtraInformation"]["value"])
        extra_information_start = int(variables["extraInformationStart"]["value"])
        extra_information_duration = int(variables["extraInformationDuration"]["value"])
        evaluation_duration = int(variables["evaluationDuration"]["value"])

        business_key = None
        if args.business_key_prefix:
            business_key = f"{args.business_key_prefix}-{index}"

        planned_instances.append(
            PlannedInstance(
                index=index,
                business_key=business_key,
                variables=variables,
                original_submission_start=original_submission_start,
                submission_duration=submission_duration,
                needs_extra_information=needs_extra_information,
                extra_information_start=extra_information_start,
                extra_information_duration=extra_information_duration,
                evaluation_duration=evaluation_duration,
            )
        )

    planned_instances.sort(
        key=lambda item: (item.original_submission_start, item.index)
    )

    return planned_instances


def readable_values(variables: VariablePayload) -> VariableValues:
    return {
        name: details["value"]
        for name, details in variables.items()
    }


def print_schedule(planned_instances: List[PlannedInstance]) -> None:
    print("Planned instances built up front:")
    for item in planned_instances:
        info_day_text = str(item.informatie_day) if item.needs_extra_information else "-"
        print(
            f"  startDay={item.original_submission_start:>3} "
            f"beoordelingDay={item.beoordeling_day:>3} "
            f"informatieDay={info_day_text:>3} "
            f"index={item.index:>3} "
            f"businessKey={item.business_key} "
            f"values={readable_values(item.variables)}"
        )
    print()


def start_instance(
    base_url: str,
    process_key: str,
    tenant_id: str,
    planned_instance: PlannedInstance,
    auth=None,
) -> Dict[str, Any]:
    url = (
        f"{base_url.rstrip('/')}"
        f"/process-definition/key/{process_key}/tenant-id/{tenant_id}/start"
    )

    payload: Dict[str, Any] = {
        "variables": planned_instance.variables,
    }

    if planned_instance.business_key:
        payload["businessKey"] = planned_instance.business_key

    response = requests.post(url, json=payload, auth=auth)

    if response.status_code not in (200, 201):
        raise RuntimeError(
            f"Failed to start instance index={planned_instance.index}. "
            f"HTTP {response.status_code}: {response.text}"
        )

    return response.json()


def fetch_instances(base_url: str, args: argparse.Namespace, auth=None, first_result: int = 0):
    url = f"{base_url.rstrip('/')}/process-instance"

    params = {
        "tenantIdIn": args.tenant,
        "maxResults": args.batch_size,
        "firstResult": first_result,
    }

    if args.process_definition_id:
        params["processDefinitionId"] = args.process_definition_id
    else:
        params["processDefinitionKey"] = args.process_key

    if args.business_key_prefix:
        params["businessKeyLike"] = f"{args.business_key_prefix}-%"

    return request_json("GET", url, auth=auth, params=params) or []


def fetch_all_instances(base_url: str, args: argparse.Namespace, auth=None) -> List[Dict[str, Any]]:
    all_instances: List[Dict[str, Any]] = []
    first_result = 0

    while True:
        instances = fetch_instances(
            base_url=base_url,
            args=args,
            auth=auth,
            first_result=first_result,
        )

        if not instances:
            break

        all_instances.extend(instances)
        first_result += args.batch_size

    return all_instances


def fetch_activity_instance_tree(base_url: str, instance_id: str, auth=None):
    url = f"{base_url.rstrip('/')}/process-instance/{instance_id}/activity-instances"
    return request_json("GET", url, auth=auth)


def collect_active_activity_ids(activity_tree) -> List[str]:
    activity_ids: List[str] = []

    def walk(node):
        activity_id = node.get("activityId")
        activity_type = node.get("activityType")

        if activity_id and activity_type != "processDefinition":
            activity_ids.append(activity_id)

        for child in node.get("childActivityInstances", []) or []:
            walk(child)

        for child in node.get("childTransitionInstances", []) or []:
            if child.get("activityId"):
                activity_ids.append(child.get("activityId"))

    if activity_tree:
        walk(activity_tree)

    return activity_ids


def fetch_variable_values(base_url: str, instance_id: str, auth=None) -> VariableValues:
    url = f"{base_url.rstrip('/')}/process-instance/{instance_id}/variables"

    params = {
        "deserializeValues": "false",
    }

    variables = request_json("GET", url, auth=auth, params=params) or {}

    return {
        name: details.get("value")
        for name, details in variables.items()
    }


def fetch_external_tasks_for_instance(
    base_url: str,
    instance_id: str,
    topic_name: str,
    auth=None,
) -> List[Dict[str, Any]]:
    url = f"{base_url.rstrip('/')}/external-task"

    params = {
        "processInstanceId": instance_id,
        "topicName": topic_name,
        "notLocked": "true",
        "maxResults": 10,
    }

    return request_json("GET", url, auth=auth, params=params) or []


def lock_external_task(
    base_url: str,
    external_task_id: str,
    worker_id: str,
    lock_duration_ms: int,
    auth=None,
) -> None:
    url = f"{base_url.rstrip('/')}/external-task/{external_task_id}/lock"

    payload = {
        "workerId": worker_id,
        "lockDuration": lock_duration_ms,
    }

    response = requests.post(url, json=payload, auth=auth)

    if response.status_code not in (200, 204):
        raise RuntimeError(
            f"Failed to lock external task {external_task_id}. "
            f"HTTP {response.status_code}: {response.text}"
        )


def complete_external_task(
    base_url: str,
    external_task_id: str,
    worker_id: str,
    variables: Optional[VariablePayload] = None,
    auth=None,
) -> None:
    url = f"{base_url.rstrip('/')}/external-task/{external_task_id}/complete"

    payload = {
        "workerId": worker_id,
        "variables": variables or {},
    }

    response = requests.post(url, json=payload, auth=auth)

    if response.status_code not in (200, 204):
        raise RuntimeError(
            f"Failed to complete external task {external_task_id}. "
            f"HTTP {response.status_code}: {response.text}"
        )


def sort_instance_key(instance: Dict[str, Any]) -> Tuple[int, str]:
    parsed_index = parse_index_from_business_key(instance.get("businessKey"))
    if parsed_index is not None:
        return parsed_index, instance.get("id") or ""
    return 999999999, instance.get("id") or ""


def start_due_instances(
    current_day: int,
    planned_instances: List[PlannedInstance],
    args: argparse.Namespace,
    auth=None,
) -> int:
    due_today = [
        item for item in planned_instances
        if item.original_submission_start == current_day and not item.started
    ]

    if not due_today:
        print("Creation: no instances scheduled for this day.")
        return 0

    started_count = 0

    for item in due_today:
        values = readable_values(item.variables)

        if args.execute:
            result = start_instance(
                base_url=args.base_url,
                process_key=args.process_key,
                tenant_id=args.tenant,
                planned_instance=item,
                auth=auth,
            )
            item.started = True
            item.process_instance_id = result.get("id")
            started_count += 1

            print(
                f"Creation: started index={item.index} "
                f"id={item.process_instance_id} "
                f"definitionId={result.get('definitionId')} "
                f"businessKey={result.get('businessKey')} "
                f"values={values}"
            )
        else:
            print(
                f"Creation: would start index={item.index} "
                f"businessKey={item.business_key} "
                f"values={values}"
            )
            # Mark it as started in dry-run so the simulated later heartbeat
            # can still reason as if the planned instance would exist.
            item.started = True

    return started_count


def build_due_push_rules(
    current_day: int,
    instance_id: str,
    variables: VariableValues,
    args: argparse.Namespace,
) -> List[PushRule]:
    rules: List[PushRule] = []

    original_submission_start = to_int(
        variables.get("originalSubmissionStart"),
        "originalSubmissionStart",
        instance_id,
    )
    submission_duration = to_int(
        variables.get("submissionDuration"),
        "submissionDuration",
        instance_id,
    )

    if original_submission_start is None or submission_duration is None:
        return rules

    beoordeling_day = original_submission_start + submission_duration

    if beoordeling_day == current_day:
        rules.append(
            PushRule(
                name="submission_to_evaluation",
                from_topic=args.from_topic,
                target_state_label="beoordeling",
                due_day=beoordeling_day,
                completion_variables={
                    "evaluationStart": variable(current_day, "Long"),
                },
            )
        )

    needs_extra_information = to_bool(variables.get("needsExtraInformation"))
    if not needs_extra_information:
        return rules

    extra_information_start = to_int(
        variables.get("extraInformationStart"),
        "extraInformationStart",
        instance_id,
    )

    if extra_information_start is None:
        return rules

    informatie_day = original_submission_start + submission_duration + extra_information_start

    if informatie_day == current_day:
        rules.append(
            PushRule(
                name="evaluation_to_information",
                from_topic=args.extra_information_from_topic,
                target_state_label=DEFAULT_INFORMATION_TARGET_STATE,
                due_day=informatie_day,
                completion_variables={
                    "informationStart": variable(current_day, "Long"),
                },
            )
        )

    return rules


def attempt_push_rule(
    current_day: int,
    rule: PushRule,
    instance: Dict[str, Any],
    display_index: int,
    active_activity_ids: List[str],
    args: argparse.Namespace,
    auth=None,
) -> Tuple[int, str]:
    instance_id = instance.get("id")
    business_key = instance.get("businessKey")
    definition_id = instance.get("definitionId")

    if rule.from_topic not in active_activity_ids:
        print(
            f"State check: due for {rule.name} but not at from-topic "
            f"index={display_index} id={instance_id} businessKey={business_key} "
            f"dueDay={rule.due_day} currentDay={current_day} "
            f"activeState={active_activity_ids} expectedFromTopic={rule.from_topic} "
            f"target={rule.target_state_label}"
        )
        return 0, "due_but_not_at_from_topic"

    external_tasks = fetch_external_tasks_for_instance(
        base_url=args.base_url,
        instance_id=instance_id,
        topic_name=rule.from_topic,
        auth=auth,
    )

    if not external_tasks:
        print(
            f"State check: due and at {rule.from_topic}, but no unlocked external task found "
            f"index={display_index} id={instance_id} businessKey={business_key} "
            f"target={rule.target_state_label}"
        )
        return 0, "due_but_no_external_task"

    external_task = external_tasks[0]
    external_task_id = external_task.get("id")

    print(
        f"State check: {'completing' if args.execute else 'would complete'} "
        f"rule={rule.name} "
        f"index={display_index} "
        f"id={instance_id} "
        f"businessKey={business_key} "
        f"definitionId={definition_id} "
        f"externalTaskId={external_task_id} "
        f"from={rule.from_topic} "
        f"to={rule.target_state_label} "
        f"dueDay={rule.due_day} "
        f"setVariables={readable_values(rule.completion_variables)}"
    )

    if args.execute:
        lock_external_task(
            base_url=args.base_url,
            external_task_id=external_task_id,
            worker_id=args.worker_id,
            lock_duration_ms=args.lock_duration_ms,
            auth=auth,
        )

        complete_external_task(
            base_url=args.base_url,
            external_task_id=external_task_id,
            worker_id=args.worker_id,
            variables=rule.completion_variables,
            auth=auth,
        )

    return 1, "pushed"


def maybe_push_due_instances(
    current_day: int,
    args: argparse.Namespace,
    auth=None,
) -> Dict[str, int]:
    print("State check: querying existing running process instances...")

    instances = fetch_all_instances(
        base_url=args.base_url,
        args=args,
        auth=auth,
    )

    counters = {
        "instances": 0,
        "withTimingVariables": 0,
        "pushedOrWouldPush": 0,
        "dueButNotAtFromTopic": 0,
        "dueButNoExternalTask": 0,
    }

    if not instances:
        print("State check: no matching running process instances found.")
        return counters

    instances.sort(key=sort_instance_key)
    counters["instances"] = len(instances)

    for fallback_index, instance in enumerate(instances, start=1):
        instance_id = instance.get("id")
        business_key = instance.get("businessKey")

        parsed_index = parse_index_from_business_key(business_key)
        display_index = parsed_index if parsed_index is not None else fallback_index

        if not instance_id:
            continue

        variables = fetch_variable_values(
            base_url=args.base_url,
            instance_id=instance_id,
            auth=auth,
        )

        if "originalSubmissionStart" in variables and "submissionDuration" in variables:
            counters["withTimingVariables"] += 1

        due_rules = build_due_push_rules(
            current_day=current_day,
            instance_id=instance_id,
            variables=variables,
            args=args,
        )

        if not due_rules:
            if args.verbose_state_check:
                start_value = variables.get("originalSubmissionStart")
                submission_duration_value = variables.get("submissionDuration")
                extra_information_start_value = variables.get("extraInformationStart")
                needs_extra_information_value = variables.get("needsExtraInformation")
                print(
                    f"State check: not due index={display_index} "
                    f"id={instance_id} businessKey={business_key} "
                    f"currentDay={current_day} "
                    f"originalSubmissionStart={start_value} "
                    f"submissionDuration={submission_duration_value} "
                    f"needsExtraInformation={needs_extra_information_value} "
                    f"extraInformationStart={extra_information_start_value}"
                )
            continue

        activity_tree = fetch_activity_instance_tree(
            base_url=args.base_url,
            instance_id=instance_id,
            auth=auth,
        )
        active_activity_ids = collect_active_activity_ids(activity_tree)

        for rule in due_rules:
            pushed, status = attempt_push_rule(
                current_day=current_day,
                rule=rule,
                instance=instance,
                display_index=display_index,
                active_activity_ids=active_activity_ids,
                args=args,
                auth=auth,
            )
            counters["pushedOrWouldPush"] += pushed

            if status == "due_but_not_at_from_topic":
                counters["dueButNotAtFromTopic"] += 1
            elif status == "due_but_no_external_task":
                counters["dueButNoExternalTask"] += 1

    print(
        "State check summary: "
        f"instances={counters['instances']}, "
        f"withTimingVariables={counters['withTimingVariables']}, "
        f"pushedOrWouldPush={counters['pushedOrWouldPush']}, "
        f"dueButNotAtFromTopic={counters['dueButNotAtFromTopic']}, "
        f"dueButNoExternalTask={counters['dueButNoExternalTask']}"
    )

    return counters


def run_heartbeat(planned_instances: List[PlannedInstance], args: argparse.Namespace, auth=None) -> None:
    if not planned_instances:
        print("No planned instances to process.")
        return

    first_day = 1
    planned_last_start_day = max(item.original_submission_start for item in planned_instances)
    planned_last_beoordeling_day = max(item.beoordeling_day for item in planned_instances)
    planned_last_information_day = max(
        (item.informatie_day for item in planned_instances if item.needs_extra_information),
        default=planned_last_beoordeling_day,
    )
    last_planned_transition_day = max(planned_last_beoordeling_day, planned_last_information_day)
    last_day = args.max_days if args.max_days is not None else last_planned_transition_day

    print(f"Starting heartbeat. Days run from {first_day} through {last_day}.")
    print(f"Last planned creation day: {planned_last_start_day}.")
    print(f"Last planned ingediend -> beoordeling day: {planned_last_beoordeling_day}.")
    print(f"Last planned beoordeling -> informatie day: {planned_last_information_day}.")
    print(f"Heartbeat length: {args.heartbeat_seconds} seconds per day.")
    print(f"Mode: {'EXECUTE' if args.execute else 'DRY RUN'}")
    print()

    total_started = 0
    total_pushed = 0

    for current_day in range(first_day, last_day + 1):
        print(f"=== Day {current_day} ===")

        total_started += start_due_instances(
            current_day=current_day,
            planned_instances=planned_instances,
            args=args,
            auth=auth,
        )

        push_counters = maybe_push_due_instances(
            current_day=current_day,
            args=args,
            auth=auth,
        )
        total_pushed += push_counters["pushedOrWouldPush"]

        print()

        is_last_day = current_day == last_day
        if not is_last_day and not args.no_sleep:
            time.sleep(args.heartbeat_seconds)

    print("Done.")
    if args.execute:
        print(f"Started process instances: {total_started}")
        print(f"Completed external tasks: {total_pushed}")
    else:
        print(f"Dry run complete. Would start {len(planned_instances)} planned process instances.")
        print(f"Would complete external tasks where due: {total_pushed}")
        print("Run again with --execute to actually create and push instances.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Start Operaton/Camunda 7 process instances over simulated days, "
            "then move existing instances from 'ingediend' to 'beoordeling' "
            "and from 'beoordeling' to 'informatie' when the timing variables say they are due."
        )
    )

    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"Engine REST base URL. Default: {DEFAULT_BASE_URL}",
    )

    parser.add_argument(
        "--process-key",
        default=DEFAULT_PROCESS_KEY,
        help=f"Process definition key. Default: {DEFAULT_PROCESS_KEY}",
    )

    parser.add_argument(
        "--process-definition-id",
        help="Optional exact process definition ID when querying existing instances. Overrides --process-key for queries.",
    )

    parser.add_argument(
        "--tenant",
        default=DEFAULT_TENANT_ID,
        help=f"Tenant ID. Default: {DEFAULT_TENANT_ID}",
    )

    parser.add_argument(
        "--count",
        type=int,
        default=10,
        help="Number of instances to plan/start. Default: 10",
    )

    parser.add_argument(
        "--username",
        help="Basic auth username",
    )

    parser.add_argument(
        "--password",
        help="Basic auth password",
    )

    parser.add_argument(
        "--business-key-prefix",
        default="test-instance",
        help="Prefix for generated business keys and query filtering. Use empty string to disable.",
    )

    parser.add_argument(
        "--all-for-process",
        action="store_true",
        help="When checking existing instances, ignore business key prefix and consider all running instances for this process and tenant.",
    )

    parser.add_argument(
        "--from-topic",
        default=DEFAULT_SUBMISSION_TOPIC,
        help=f"External task topic to complete for ingediend -> beoordeling. Default: {DEFAULT_SUBMISSION_TOPIC}",
    )

    parser.add_argument(
        "--extra-information-from-topic",
        default=DEFAULT_EVALUATION_TOPIC,
        help=(
            "External task topic to complete for beoordeling -> informatie. "
            f"Default: {DEFAULT_EVALUATION_TOPIC}"
        ),
    )

    parser.add_argument(
        "--worker-id",
        default=DEFAULT_WORKER_ID,
        help=f"Worker id used to lock and complete external tasks. Default: {DEFAULT_WORKER_ID}",
    )

    parser.add_argument(
        "--lock-duration-ms",
        type=int,
        default=60000,
        help="External task lock duration in milliseconds. Default: 60000",
    )

    parser.add_argument(
        "--min-subsidy",
        type=int,
        default=4000,
        help="Minimum random subsidy amount. Default: 4000",
    )

    parser.add_argument(
        "--max-subsidy",
        type=int,
        default=5000,
        help="Maximum random subsidy amount. Default: 5000",
    )

    parser.add_argument(
        "--min-start-offset-days",
        type=int,
        default=1,
        help="Minimum random offset used for originalSubmissionStart. Default: 1",
    )

    parser.add_argument(
        "--max-start-offset-days",
        type=int,
        default=3,
        help="Maximum random offset used for originalSubmissionStart. Default: 3",
    )

    parser.add_argument(
        "--min-submission-duration-days",
        type=int,
        default=2,
        help="Minimum random submissionDuration. Default: 2",
    )

    parser.add_argument(
        "--max-submission-duration-days",
        type=int,
        default=3,
        help="Maximum random submissionDuration. Default: 3",
    )

    parser.add_argument(
        "--min-evaluation-duration-days",
        type=int,
        default=3,
        help="Minimum random evaluationDuration. Default: 3",
    )

    parser.add_argument(
        "--max-evaluation-duration-days",
        type=int,
        default=5,
        help="Maximum random evaluationDuration. Default: 5",
    )

    parser.add_argument(
        "--min-extra-information-start-days",
        type=int,
        default=1,
        help="Minimum random extraInformationStart offset after beoordeling starts. Default: 1",
    )

    parser.add_argument(
        "--max-extra-information-start-days",
        type=int,
        default=2,
        help="Maximum random extraInformationStart offset after beoordeling starts. Default: 2",
    )

    parser.add_argument(
        "--min-extra-information-duration-days",
        type=int,
        default=2,
        help="Minimum random extraInformationDuration. Default: 2",
    )

    parser.add_argument(
        "--max-extra-information-duration-days",
        type=int,
        default=3,
        help="Maximum random extraInformationDuration. Default: 3",
    )

    parser.add_argument(
        "--prob-needs-extra-information",
        type=float,
        default=0.25,
        help="Probability that needsExtraInformation is true. Default: 0.25",
    )

    parser.add_argument(
        "--prob-eligible-initial",
        type=float,
        default=0.60,
        help="Probability that eligibleInitial is true. Default: 0.60",
    )

    parser.add_argument(
        "--prob-will-complain",
        type=float,
        default=0.10,
        help="Probability that willComplain is true. Default: 0.10",
    )

    parser.add_argument(
        "--prob-eligible-after-complaint",
        type=float,
        default=0.60,
        help="Probability that eligibleAfterComplaint is true. Default: 0.60",
    )

    parser.add_argument(
        "--seed",
        type=int,
        help="Optional random seed for reproducible planned variables.",
    )

    parser.add_argument(
        "--heartbeat-seconds",
        type=float,
        default=20.0,
        help="Seconds to wait between simulated days. Default: 20",
    )

    parser.add_argument(
        "--max-days",
        type=int,
        help="Optional maximum simulated day. Defaults to the last planned push day.",
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of process instances to fetch per page. Default: 100",
    )

    parser.add_argument(
        "--no-sleep",
        action="store_true",
        help="Do not wait between days. Useful for checking the planned schedule quickly.",
    )

    parser.add_argument(
        "--show-schedule",
        action="store_true",
        help="Print the complete pre-generated instance schedule before the heartbeat starts.",
    )

    parser.add_argument(
        "--verbose-state-check",
        action="store_true",
        help="Also print instances that are checked but not due yet.",
    )

    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually create process instances and complete external tasks. Without this flag, the script only performs a dry run.",
    )

    args = parser.parse_args()

    if args.all_for_process:
        args.business_key_prefix = ""

    if args.count < 1:
        print("--count must be at least 1")
        sys.exit(1)

    if args.min_subsidy > args.max_subsidy:
        print("--min-subsidy cannot be greater than --max-subsidy")
        sys.exit(1)

    if args.min_start_offset_days < 1:
        print("--min-start-offset-days must be at least 1 because days start counting at 1")
        sys.exit(1)

    range_checks = [
        ("--min-start-offset-days", args.min_start_offset_days, "--max-start-offset-days", args.max_start_offset_days),
        ("--min-submission-duration-days", args.min_submission_duration_days, "--max-submission-duration-days", args.max_submission_duration_days),
        ("--min-evaluation-duration-days", args.min_evaluation_duration_days, "--max-evaluation-duration-days", args.max_evaluation_duration_days),
        ("--min-extra-information-start-days", args.min_extra_information_start_days, "--max-extra-information-start-days", args.max_extra_information_start_days),
        ("--min-extra-information-duration-days", args.min_extra_information_duration_days, "--max-extra-information-duration-days", args.max_extra_information_duration_days),
    ]

    for min_name, min_value, max_name, max_value in range_checks:
        if min_value < 0:
            print(f"{min_name} cannot be negative")
            sys.exit(1)
        if min_value > max_value:
            print(f"{min_name} cannot be greater than {max_name}")
            sys.exit(1)

    if args.heartbeat_seconds < 0:
        print("--heartbeat-seconds cannot be negative")
        sys.exit(1)

    if args.max_days is not None and args.max_days < 1:
        print("--max-days must be at least 1")
        sys.exit(1)

    if args.lock_duration_ms < 1:
        print("--lock-duration-ms must be at least 1")
        sys.exit(1)

    if args.batch_size < 1:
        print("--batch-size must be at least 1")
        sys.exit(1)

    probability_args = [
        ("--prob-needs-extra-information", args.prob_needs_extra_information),
        ("--prob-eligible-initial", args.prob_eligible_initial),
        ("--prob-will-complain", args.prob_will_complain),
        ("--prob-eligible-after-complaint", args.prob_eligible_after_complaint),
    ]
    for name, value in probability_args:
        if value < 0 or value > 1:
            print(f"{name} must be between 0 and 1")
            sys.exit(1)

    return args


def main() -> None:
    args = parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    auth = get_auth(args)

    planned_instances = build_planned_instances(args)

    print("Configuration:")
    print(f"  base_url: {args.base_url}")
    print(f"  process_key: {args.process_key}")
    print(f"  process_definition_id for queries: {args.process_definition_id or 'none'}")
    print(f"  tenant: {args.tenant}")
    print(f"  count: {args.count}")
    print(f"  business_key_prefix: {args.business_key_prefix or 'none'}")
    print(f"  submission topic: {args.from_topic} -> beoordeling")
    print(f"  extra information topic: {args.extra_information_from_topic} -> informatie")
    print(f"  seed: {args.seed}")
    print()

    if args.show_schedule:
        print_schedule(planned_instances)

    run_heartbeat(planned_instances, args, auth=auth)


if __name__ == "__main__":
    main()
