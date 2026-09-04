# launch_instances_with_heartbeat_fast.py
#
# Faster version of the heartbeat runner.
#
# Why this version is faster:
#   - It no longer scans every running instance on every simulated day.
#   - It precomputes which instances can be due on each day.
#   - On a heartbeat, it only checks the instances that are due that day.
#   - It uses one shared requests.Session instead of creating a new connection per REST call.
#
# Dry run, no waiting:
#   python .\launch_instances_with_heartbeat_fast.py --tenant 48 --count 10 --seed 123 --show-schedule --no-sleep
#
# Execute with a 20-second heartbeat:
#   python .\launch_instances_with_heartbeat_fast.py --tenant 48 --count 10 --username YOUR_USER --password YOUR_PASSWORD --execute

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


@dataclass
class DuePush:
    planned_instance: PlannedInstance
    rule: PushRule


class OperatonClient:
    def __init__(self, base_url: str, username: Optional[str], password: Optional[str], timeout_seconds: float):
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.session = requests.Session()

        if username or password:
            if not username or not password:
                print("Both --username and --password are required when using basic auth.")
                sys.exit(1)
            self.session.auth = HTTPBasicAuth(username, password)

    def close(self) -> None:
        self.session.close()

    def request_json(self, method: str, path_or_url: str, **kwargs):
        if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
            url = path_or_url
        else:
            url = f"{self.base_url}{path_or_url}"

        kwargs.setdefault("timeout", self.timeout_seconds)
        response = self.session.request(method, url, **kwargs)

        if response.status_code not in (200, 201, 204):
            raise RuntimeError(
                f"HTTP {response.status_code} for {method} {url}\n{response.text}"
            )

        if response.status_code == 204 or not response.text:
            return None

        return response.json()

    def start_instance(
        self,
        process_key: str,
        tenant_id: str,
        planned_instance: PlannedInstance,
    ) -> Dict[str, Any]:
        path = f"/process-definition/key/{process_key}/tenant-id/{tenant_id}/start"

        payload: Dict[str, Any] = {
            "variables": planned_instance.variables,
        }

        if planned_instance.business_key:
            payload["businessKey"] = planned_instance.business_key

        return self.request_json("POST", path, json=payload)

    def find_running_instance(
        self,
        args: argparse.Namespace,
        planned_instance: PlannedInstance,
    ) -> Optional[Dict[str, Any]]:
        """
        Resolve the running process instance.

        Fast path: use the id we received when the script started the instance.
        Restart path: if the script was restarted and only the business key is known,
        query Operaton for that specific business key instead of scanning all instances.
        """
        if planned_instance.process_instance_id:
            return {
                "id": planned_instance.process_instance_id,
                "businessKey": planned_instance.business_key,
                "tenantId": args.tenant,
            }

        if not planned_instance.business_key:
            return None

        params: Dict[str, Any] = {
            "tenantIdIn": args.tenant,
            "businessKey": planned_instance.business_key,
            "maxResults": 2,
        }

        if args.process_definition_id:
            params["processDefinitionId"] = args.process_definition_id
        else:
            params["processDefinitionKey"] = args.process_key

        instances = self.request_json("GET", "/process-instance", params=params) or []
        if not instances:
            return None

        return instances[0]

    def fetch_activity_state(self, instance_id: str) -> List[str]:
        tree = self.request_json(
            "GET",
            f"/process-instance/{instance_id}/activity-instances",
        )
        return collect_active_activity_ids(tree)

    def fetch_external_tasks_for_instance(self, instance_id: str, topic_name: str) -> List[Dict[str, Any]]:
        params = {
            "processInstanceId": instance_id,
            "topicName": topic_name,
            "notLocked": "true",
            "maxResults": 10,
        }
        return self.request_json("GET", "/external-task", params=params) or []

    def lock_external_task(self, external_task_id: str, worker_id: str, lock_duration_ms: int) -> None:
        payload = {
            "workerId": worker_id,
            "lockDuration": lock_duration_ms,
        }
        self.request_json("POST", f"/external-task/{external_task_id}/lock", json=payload)

    def complete_external_task(
        self,
        external_task_id: str,
        worker_id: str,
        variables: Optional[VariablePayload] = None,
    ) -> None:
        payload = {
            "workerId": worker_id,
            "variables": variables or {},
        }
        self.request_json("POST", f"/external-task/{external_task_id}/complete", json=payload)



def random_bool(probability_true: float) -> bool:
    return random.random() < probability_true



def variable(value: Any, var_type: str) -> Dict[str, Any]:
    return {
        "value": value,
        "type": var_type,
    }



def parse_index_from_business_key(business_key: Optional[str]) -> Optional[int]:
    if not business_key:
        return None

    match = re.search(r"(\d+)$", business_key)
    if not match:
        return None

    return int(match.group(1))



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



def build_variable_payload(instance_index: int, args: argparse.Namespace) -> VariablePayload:
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

    # User rule: if extra information is needed, evaluationDuration must be
    # at least 2 more than extraInformationDuration.
    if needs_extra_information:
        evaluation_duration = max(evaluation_duration, extra_information_duration + 2)

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

    planned_instances.sort(key=lambda item: (item.original_submission_start, item.index))
    return planned_instances



def readable_values(variables: VariablePayload) -> VariableValues:
    return {name: details["value"] for name, details in variables.items()}



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



def build_due_maps(planned_instances: List[PlannedInstance], args: argparse.Namespace) -> Tuple[Dict[int, List[PlannedInstance]], Dict[int, List[DuePush]]]:
    starts_by_day: Dict[int, List[PlannedInstance]] = {}
    pushes_by_day: Dict[int, List[DuePush]] = {}

    for item in planned_instances:
        starts_by_day.setdefault(item.original_submission_start, []).append(item)

        beoordeling_rule = PushRule(
            name="submission_to_evaluation",
            from_topic=args.from_topic,
            target_state_label="beoordeling",
            due_day=item.beoordeling_day,
            completion_variables={
                "evaluationStart": variable(item.beoordeling_day, "Long"),
            },
        )
        pushes_by_day.setdefault(item.beoordeling_day, []).append(DuePush(item, beoordeling_rule))

        if item.needs_extra_information:
            informatie_rule = PushRule(
                name="evaluation_to_information",
                from_topic=args.extra_information_from_topic,
                target_state_label=DEFAULT_INFORMATION_TARGET_STATE,
                due_day=item.informatie_day,
                completion_variables={
                    "informationStart": variable(item.informatie_day, "Long"),
                },
            )
            pushes_by_day.setdefault(item.informatie_day, []).append(DuePush(item, informatie_rule))

    return starts_by_day, pushes_by_day



def start_due_instances(
    current_day: int,
    starts_by_day: Dict[int, List[PlannedInstance]],
    args: argparse.Namespace,
    client: OperatonClient,
) -> int:
    due_today = starts_by_day.get(current_day, [])

    if not due_today:
        print("Creation: no instances scheduled for this day.")
        return 0

    started_count = 0

    for item in due_today:
        if item.started:
            continue

        values = readable_values(item.variables)

        if args.execute:
            result = client.start_instance(
                process_key=args.process_key,
                tenant_id=args.tenant,
                planned_instance=item,
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
            item.started = True
            item.process_instance_id = f"dry-run-instance-{item.index}"
            started_count += 1

    return started_count



def attempt_push(
    current_day: int,
    due_push: DuePush,
    args: argparse.Namespace,
    client: OperatonClient,
) -> Tuple[int, str]:
    item = due_push.planned_instance
    rule = due_push.rule

    if not item.started:
        # This can happen when --max-days starts too early or a previous creation failed.
        print(
            f"State check: due for {rule.name}, but planned instance was not started yet "
            f"index={item.index} businessKey={item.business_key} currentDay={current_day}"
        )
        return 0, "not_started"

    if not args.execute:
        print(
            f"State check: would check/push rule={rule.name} "
            f"index={item.index} businessKey={item.business_key} "
            f"from={rule.from_topic} to={rule.target_state_label} dueDay={rule.due_day} "
            f"setVariables={readable_values(rule.completion_variables)}"
        )
        return 1, "would_push"

    instance = client.find_running_instance(args, item)
    if not instance:
        print(
            f"State check: due for {rule.name}, but no running instance was found "
            f"index={item.index} businessKey={item.business_key} currentDay={current_day}"
        )
        return 0, "not_found"

    instance_id = instance.get("id")
    if not instance_id:
        print(
            f"State check: due for {rule.name}, but the resolved instance has no id "
            f"index={item.index} businessKey={item.business_key}"
        )
        return 0, "not_found"

    item.process_instance_id = instance_id
    active_activity_ids = client.fetch_activity_state(instance_id)

    if rule.from_topic not in active_activity_ids:
        print(
            f"State check: due for {rule.name} but not at from-topic "
            f"index={item.index} id={instance_id} businessKey={item.business_key} "
            f"dueDay={rule.due_day} currentDay={current_day} "
            f"activeState={active_activity_ids} expectedFromTopic={rule.from_topic} "
            f"target={rule.target_state_label}"
        )
        return 0, "due_but_not_at_from_topic"

    external_tasks = client.fetch_external_tasks_for_instance(instance_id, rule.from_topic)
    if not external_tasks:
        print(
            f"State check: due and at {rule.from_topic}, but no unlocked external task found "
            f"index={item.index} id={instance_id} businessKey={item.business_key} "
            f"target={rule.target_state_label}"
        )
        return 0, "due_but_no_external_task"

    external_task_id = external_tasks[0].get("id")

    print(
        f"State check: completing rule={rule.name} "
        f"index={item.index} id={instance_id} businessKey={item.business_key} "
        f"externalTaskId={external_task_id} from={rule.from_topic} "
        f"to={rule.target_state_label} dueDay={rule.due_day} "
        f"setVariables={readable_values(rule.completion_variables)}"
    )

    client.lock_external_task(
        external_task_id=external_task_id,
        worker_id=args.worker_id,
        lock_duration_ms=args.lock_duration_ms,
    )
    client.complete_external_task(
        external_task_id=external_task_id,
        worker_id=args.worker_id,
        variables=rule.completion_variables,
    )

    return 1, "pushed"



def maybe_push_due_instances(
    current_day: int,
    pushes_by_day: Dict[int, List[DuePush]],
    args: argparse.Namespace,
    client: OperatonClient,
) -> Dict[str, int]:
    due_today = pushes_by_day.get(current_day, [])

    counters = {
        "due": len(due_today),
        "pushedOrWouldPush": 0,
        "notStarted": 0,
        "notFound": 0,
        "dueButNotAtFromTopic": 0,
        "dueButNoExternalTask": 0,
    }

    if not due_today:
        print("State check: no transitions scheduled for this day.")
        return counters

    print(f"State check: checking {len(due_today)} due transition(s) for this day.")

    for due_push in due_today:
        pushed, status = attempt_push(
            current_day=current_day,
            due_push=due_push,
            args=args,
            client=client,
        )
        counters["pushedOrWouldPush"] += pushed

        if status == "not_started":
            counters["notStarted"] += 1
        elif status == "not_found":
            counters["notFound"] += 1
        elif status == "due_but_not_at_from_topic":
            counters["dueButNotAtFromTopic"] += 1
        elif status == "due_but_no_external_task":
            counters["dueButNoExternalTask"] += 1

    print(
        "State check summary: "
        f"due={counters['due']}, "
        f"pushedOrWouldPush={counters['pushedOrWouldPush']}, "
        f"notStarted={counters['notStarted']}, "
        f"notFound={counters['notFound']}, "
        f"dueButNotAtFromTopic={counters['dueButNotAtFromTopic']}, "
        f"dueButNoExternalTask={counters['dueButNoExternalTask']}"
    )

    return counters



def run_heartbeat(planned_instances: List[PlannedInstance], args: argparse.Namespace, client: OperatonClient) -> None:
    if not planned_instances:
        print("No planned instances to process.")
        return

    starts_by_day, pushes_by_day = build_due_maps(planned_instances, args)

    first_day = 1
    planned_last_start_day = max(item.original_submission_start for item in planned_instances)
    last_transition_day = max(pushes_by_day.keys(), default=planned_last_start_day)
    last_day = args.max_days if args.max_days is not None else last_transition_day

    print(f"Starting heartbeat. Days run from {first_day} through {last_day}.")
    print(f"Last planned creation day: {planned_last_start_day}.")
    print(f"Last planned transition day: {last_transition_day}.")
    print(f"Heartbeat length: {args.heartbeat_seconds} seconds per day.")
    print("State check mode: fast due-day targeting.")
    print(f"Mode: {'EXECUTE' if args.execute else 'DRY RUN'}")
    print()

    total_started = 0
    total_pushed = 0

    for current_day in range(first_day, last_day + 1):
        print(f"=== Day {current_day} ===")

        total_started += start_due_instances(
            current_day=current_day,
            starts_by_day=starts_by_day,
            args=args,
            client=client,
        )

        push_counters = maybe_push_due_instances(
            current_day=current_day,
            pushes_by_day=pushes_by_day,
            args=args,
            client=client,
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
        print(f"Dry run complete. Would start {total_started} planned process instances.")
        print(f"Would complete external tasks where due: {total_pushed}")
        print("Run again with --execute to actually create and push instances.")



def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Start Operaton/Camunda 7 process instances over simulated days and "
            "push only the instances that are actually due on each heartbeat."
        )
    )

    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--process-key", default=DEFAULT_PROCESS_KEY)
    parser.add_argument("--process-definition-id", help="Optional exact process definition ID when resolving running instances.")
    parser.add_argument("--tenant", default=DEFAULT_TENANT_ID)
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--username")
    parser.add_argument("--password")
    parser.add_argument("--business-key-prefix", default="test-instance")

    parser.add_argument("--from-topic", default=DEFAULT_SUBMISSION_TOPIC)
    parser.add_argument("--extra-information-from-topic", default=DEFAULT_EVALUATION_TOPIC)
    parser.add_argument("--worker-id", default=DEFAULT_WORKER_ID)
    parser.add_argument("--lock-duration-ms", type=int, default=60000)

    parser.add_argument("--min-subsidy", type=int, default=4000)
    parser.add_argument("--max-subsidy", type=int, default=5000)
    parser.add_argument("--min-start-offset-days", type=int, default=1)
    parser.add_argument("--max-start-offset-days", type=int, default=3)
    parser.add_argument("--min-submission-duration-days", type=int, default=2)
    parser.add_argument("--max-submission-duration-days", type=int, default=3)
    parser.add_argument("--min-evaluation-duration-days", type=int, default=3)
    parser.add_argument("--max-evaluation-duration-days", type=int, default=5)
    parser.add_argument("--min-extra-information-start-days", type=int, default=1)
    parser.add_argument("--max-extra-information-start-days", type=int, default=2)
    parser.add_argument("--min-extra-information-duration-days", type=int, default=2)
    parser.add_argument("--max-extra-information-duration-days", type=int, default=3)

    parser.add_argument("--prob-needs-extra-information", type=float, default=0.25)
    parser.add_argument("--prob-eligible-initial", type=float, default=0.60)
    parser.add_argument("--prob-will-complain", type=float, default=0.10)
    parser.add_argument("--prob-eligible-after-complaint", type=float, default=0.60)

    parser.add_argument("--seed", type=int)
    parser.add_argument("--heartbeat-seconds", type=float, default=20.0)
    parser.add_argument("--max-days", type=int)
    parser.add_argument("--request-timeout-seconds", type=float, default=15.0)
    parser.add_argument("--no-sleep", action="store_true")
    parser.add_argument("--show-schedule", action="store_true")
    parser.add_argument("--execute", action="store_true")

    args = parser.parse_args()

    if args.count < 1:
        print("--count must be at least 1")
        sys.exit(1)

    if args.min_subsidy > args.max_subsidy:
        print("--min-subsidy cannot be greater than --max-subsidy")
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

    if args.min_start_offset_days < 1:
        print("--min-start-offset-days must be at least 1 because days start counting at 1")
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

    if args.request_timeout_seconds <= 0:
        print("--request-timeout-seconds must be greater than 0")
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
    print(f"  request timeout seconds: {args.request_timeout_seconds}")
    print(f"  seed: {args.seed}")
    print()

    if args.show_schedule:
        print_schedule(planned_instances)

    client = OperatonClient(
        base_url=args.base_url,
        username=args.username,
        password=args.password,
        timeout_seconds=args.request_timeout_seconds,
    )

    try:
        run_heartbeat(planned_instances, args, client)
    finally:
        client.close()


if __name__ == "__main__":
    main()
