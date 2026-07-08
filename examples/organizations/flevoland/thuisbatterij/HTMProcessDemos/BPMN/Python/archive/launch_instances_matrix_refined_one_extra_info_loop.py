# launch_instances_matrix_loop_extra_information.py
#
# Minimal-REST heartbeat runner for Operaton/Camunda 7.
#
# The script builds an in-memory matrix up front. The matrix contains:
#   - all planned process variables
#   - the planned creation day
#   - the planned transition days
#   - the process instance id after creation
#
# During the heartbeat it DOES NOT scan running instances, DOES NOT fetch state,
# and DOES NOT read process variables. It uses REST only when an action is due:
#   a) create the process instance
#   b) complete the external task that moves it to the next state
#
# If an expected topic name is wrong, the script can auto-fallback to the one
# unlocked external task currently available for that process instance. This is
# useful when the BPMN activity id/name differs from the external-task topic.
#
# Refined one-time extra-info flow:
#   ingediend -> beoordeling on originalSubmissionStart + submissionDuration
#   beoordeling -> informatie once on beoordelingStart + extraInformationStart
#   informatie -> beoordeling on beoordelingStart + extraInformationStart + extraInformationDuration
#   beoordeling -> afronden on beoordelingStart + evaluationDuration
#
# The BPMN must have sequence flow informatie -> beoordeling. Completing topic extra-informatie
# sets needsExtraInformation=false and extraInformationCompleted=true, so the next pass
# through beoordeling cannot request extra information again. The script deliberately
# does not complete the afronden task, so instances stay there for now.
#
# Dry run, instant:
#   python .\launch_instances_matrix_loop_extra_information.py --tenant 48 --count 10 --seed 123 --show-matrix --no-sleep
#
# Execute with a 20-second heartbeat:
#   python .\launch_instances_matrix_loop_extra_information.py --tenant 48 --count 10 --username YOUR_USER --password YOUR_PASSWORD --execute

import argparse
import csv
import json
import random
import sys
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import requests
from requests.auth import HTTPBasicAuth


DEFAULT_BASE_URL = "https://operaton.open-regels.nl/engine-rest/engine/default"
DEFAULT_PROCESS_KEY = "processAanvraagInfoBezwaar"
DEFAULT_TENANT_ID = "48"
DEFAULT_BUSINESS_KEY_PREFIX = "test-instance"
DEFAULT_SUBMISSION_TOPIC = "ingediend"
DEFAULT_EVALUATION_TOPIC = "beoordeling"
DEFAULT_INFORMATION_TOPIC = "extra-informatie"
DEFAULT_WORKER_ID = "python-heartbeat-matrix"

VariablePayload = Dict[str, Dict[str, Any]]
ReadableVariables = Dict[str, Any]


@dataclass
class TransitionPlan:
    name: str
    from_topic: str
    target_state: str
    due_day: int
    completion_variables: VariablePayload
    done: bool = False
    external_task_id: Optional[str] = None


@dataclass
class ProcessMatrixRow:
    index: int
    business_key: str
    variables: VariablePayload
    original_submission_start: int
    submission_duration: int
    needs_extra_information: bool
    extra_information_start: int
    extra_information_duration: int
    evaluation_duration: int
    process_instance_id: Optional[str] = None
    started: bool = False
    start_result: Dict[str, Any] = field(default_factory=dict)
    transitions: List[TransitionPlan] = field(default_factory=list)

    @property
    def beoordeling_day(self) -> int:
        return self.original_submission_start + self.submission_duration

    @property
    def informatie_day(self) -> Optional[int]:
        if not self.needs_extra_information:
            return None
        return self.original_submission_start + self.submission_duration + self.extra_information_start

    @property
    def informatie_return_day(self) -> Optional[int]:
        if not self.needs_extra_information:
            return None
        return (
            self.original_submission_start
            + self.submission_duration
            + self.extra_information_start
            + self.extra_information_duration
        )

    @property
    def afronden_day(self) -> int:
        return self.original_submission_start + self.submission_duration + self.evaluation_duration


class OperatonClient:
    def __init__(
        self,
        base_url: str,
        username: Optional[str],
        password: Optional[str],
        timeout_seconds: float,
    ) -> None:
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

    def request_json(self, method: str, path: str, **kwargs: Any) -> Any:
        url = path if path.startswith("http://") or path.startswith("https://") else f"{self.base_url}{path}"
        kwargs.setdefault("timeout", self.timeout_seconds)
        response = self.session.request(method, url, **kwargs)

        if response.status_code not in (200, 201, 204):
            raise RuntimeError(f"HTTP {response.status_code} for {method} {url}\n{response.text}")

        if response.status_code == 204 or not response.text:
            return None

        return response.json()

    def start_instance(self, process_key: str, tenant_id: str, row: ProcessMatrixRow) -> Dict[str, Any]:
        path = f"/process-definition/key/{process_key}/tenant-id/{tenant_id}/start"
        payload = {
            "businessKey": row.business_key,
            "variables": row.variables,
        }
        return self.request_json("POST", path, json=payload)

    def fetch_and_lock_task_by_business_key(
        self,
        business_key: str,
        topic_name: str,
        worker_id: str,
        lock_duration_ms: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Minimal transition lookup: one REST call that both finds and locks the due external task.

        Camunda/Operaton fetchAndLock supports topic filters including businessKey on recent
        Camunda 7 compatible engines. If your engine rejects this filter, run with:
          --push-method query-lock-complete
        """
        payload = {
            "workerId": worker_id,
            "maxTasks": 1,
            "usePriority": True,
            "topics": [
                {
                    "topicName": topic_name,
                    "lockDuration": lock_duration_ms,
                    "businessKey": business_key,
                }
            ],
        }
        tasks = self.request_json("POST", "/external-task/fetchAndLock", json=payload) or []
        if not tasks:
            return None
        return tasks[0]

    def query_unlocked_tasks_by_instance_id(
        self,
        process_instance_id: str,
        topic_name: Optional[str] = None,
        max_results: int = 10,
    ) -> List[Dict[str, Any]]:
        params: Dict[str, Any] = {
            "processInstanceId": process_instance_id,
            "notLocked": "true",
            "maxResults": max_results,
        }
        if topic_name:
            params["topicName"] = topic_name

        return self.request_json("GET", "/external-task", params=params) or []

    def query_unlocked_task_by_instance_id(
        self,
        process_instance_id: str,
        topic_name: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        tasks = self.query_unlocked_tasks_by_instance_id(
            process_instance_id=process_instance_id,
            topic_name=topic_name,
            max_results=1,
        )
        if not tasks:
            return None
        return tasks[0]

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


def variable(value: Any, var_type: str) -> Dict[str, Any]:
    return {"value": value, "type": var_type}


def readable_values(variables: VariablePayload) -> ReadableVariables:
    return {name: details.get("value") for name, details in variables.items()}


def random_bool(probability_true: float) -> bool:
    return random.random() < probability_true


def build_variable_payload(index: int, args: argparse.Namespace) -> VariablePayload:
    subsidy_amount = random.randint(args.min_subsidy, args.max_subsidy)
    needs_extra_information = random_bool(args.prob_needs_extra_information)
    eligible_initial = random_bool(args.prob_eligible_initial)
    will_complain = random_bool(args.prob_will_complain)
    eligible_after_complaint = random_bool(args.prob_eligible_after_complaint)

    original_submission_start = (index - 1) + random.randint(
        args.min_start_offset_days,
        args.max_start_offset_days,
    )

    submission_duration = random.randint(
        args.min_submission_duration_days,
        args.max_submission_duration_days,
    )

    extra_information_start = random.randint(
        args.min_extra_information_start_days,
        args.max_extra_information_start_days,
    )

    extra_information_duration = random.randint(
        args.min_extra_information_duration_days,
        args.max_extra_information_duration_days,
    )

    evaluation_duration = random.randint(
        args.min_evaluation_duration_days,
        args.max_evaluation_duration_days,
    )

    # If extra information is needed, the evaluation must last long enough for:
    #   1) the evaluation to start,
    #   2) the extra-information subprocess to run, and
    #   3) the main evaluation to resume for at least a small tail period.
    # This also satisfies the earlier rule that evaluationDuration is at least
    # 2 more than extraInformationDuration when needsExtraInformation is true.
    if needs_extra_information:
        minimum_evaluation_duration = (
            extra_information_start
            + extra_information_duration
            + args.min_resume_after_extra_information_days
        )
        evaluation_duration = max(evaluation_duration, minimum_evaluation_duration)

    return {
        "subsidyAmount": variable(subsidy_amount, "Long"),
        "needsExtraInformation": variable(needs_extra_information, "Boolean"),
        "extraInformationCompleted": variable(False, "Boolean"),
        "extraInformationRequested": variable(False, "Boolean"),
        "eligibleInitial": variable(eligible_initial, "Boolean"),
        "willComplain": variable(will_complain, "Boolean"),
        "eligibleAfterComplaint": variable(eligible_after_complaint, "Boolean"),
        "originalSubmissionStart": variable(original_submission_start, "Long"),
        "submissionDuration": variable(submission_duration, "Long"),
        "evaluationDuration": variable(evaluation_duration, "Long"),
        "extraInformationStart": variable(extra_information_start, "Long"),
        "extraInformationDuration": variable(extra_information_duration, "Long"),
    }


def build_process_matrix(args: argparse.Namespace) -> List[ProcessMatrixRow]:
    matrix: List[ProcessMatrixRow] = []

    for index in range(1, args.count + 1):
        variables = build_variable_payload(index, args)
        original_submission_start = int(variables["originalSubmissionStart"]["value"])
        submission_duration = int(variables["submissionDuration"]["value"])
        needs_extra_information = bool(variables["needsExtraInformation"]["value"])
        extra_information_start = int(variables["extraInformationStart"]["value"])
        extra_information_duration = int(variables["extraInformationDuration"]["value"])
        evaluation_duration = int(variables["evaluationDuration"]["value"])

        business_key = f"{args.business_key_prefix}-{index}"

        row = ProcessMatrixRow(
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

        row.transitions.append(
            TransitionPlan(
                name="ingediend_to_beoordeling",
                from_topic=args.from_topic,
                target_state="beoordeling",
                due_day=row.beoordeling_day,
                completion_variables={
                    "evaluationStart": variable(row.beoordeling_day, "Long"),
                },
            )
        )

        if needs_extra_information:
            information_day = row.informatie_day
            assert information_day is not None
            row.transitions.append(
                TransitionPlan(
                    name="beoordeling_to_informatie",
                    from_topic=args.extra_information_from_topic,
                    target_state="informatie",
                    due_day=information_day,
                    completion_variables={
                        "informationStart": variable(information_day, "Long"),
                        "extraInformationRequested": variable(True, "Boolean"),
                        "extraInformationRequestedDay": variable(information_day, "Long"),
                    },
                )
            )

            return_day = row.informatie_return_day
            assert return_day is not None
            row.transitions.append(
                TransitionPlan(
                    name="informatie_to_beoordeling_loop",
                    from_topic=args.information_return_topic,
                    target_state="beoordeling",
                    due_day=return_day,
                    completion_variables={
                        "extraInformationCompleted": variable(True, "Boolean"),
                        "evaluationResumedDay": variable(return_day, "Long"),
                        "needsExtraInformation": variable(False, "Boolean"),
                    },
                )
            )

        final_day = row.afronden_day
        row.transitions.append(
            TransitionPlan(
                name="beoordeling_to_afronden",
                from_topic=args.extra_information_from_topic,
                target_state="afronden",
                due_day=final_day,
                completion_variables={
                    "evaluationEnd": variable(final_day, "Long"),
                    "needsExtraInformation": variable(False, "Boolean"),
                },
            )
        )

        matrix.append(row)

    matrix.sort(key=lambda r: (r.original_submission_start, r.index))
    return matrix


def build_action_maps(
    matrix: List[ProcessMatrixRow],
) -> Tuple[Dict[int, List[ProcessMatrixRow]], Dict[int, List[Tuple[ProcessMatrixRow, TransitionPlan]]]]:
    creates_by_day: Dict[int, List[ProcessMatrixRow]] = {}
    transitions_by_day: Dict[int, List[Tuple[ProcessMatrixRow, TransitionPlan]]] = {}

    for row in matrix:
        creates_by_day.setdefault(row.original_submission_start, []).append(row)
        for transition in row.transitions:
            transitions_by_day.setdefault(transition.due_day, []).append((row, transition))

    return creates_by_day, transitions_by_day


def matrix_to_dict(row: ProcessMatrixRow) -> Dict[str, Any]:
    return {
        "index": row.index,
        "businessKey": row.business_key,
        "processInstanceId": row.process_instance_id,
        "started": row.started,
        "originalSubmissionStart": row.original_submission_start,
        "submissionDuration": row.submission_duration,
        "beoordelingDay": row.beoordeling_day,
        "needsExtraInformation": row.needs_extra_information,
        "extraInformationStart": row.extra_information_start,
        "extraInformationDuration": row.extra_information_duration,
        "evaluationDuration": row.evaluation_duration,
        "informatieDay": row.informatie_day,
        "informatieReturnDay": row.informatie_return_day,
        "afrondenDay": row.afronden_day,
        "variables": readable_values(row.variables),
        "transitions": [
            {
                "name": t.name,
                "fromTopic": t.from_topic,
                "targetState": t.target_state,
                "dueDay": t.due_day,
                "done": t.done,
                "externalTaskId": t.external_task_id,
                "completionVariables": readable_values(t.completion_variables),
            }
            for t in row.transitions
        ],
    }


def print_matrix(matrix: List[ProcessMatrixRow]) -> None:
    print("Process matrix built up front:")
    for row in matrix:
        info_day = row.informatie_day if row.informatie_day is not None else "-"
        behandelen_day = row.informatie_return_day if row.informatie_return_day is not None else "-"
        transitions = ", ".join(f"{t.name}@day{t.due_day}" for t in row.transitions)
        print(
            f"  index={row.index:>3} "
            f"businessKey={row.business_key} "
            f"startDay={row.original_submission_start:>3} "
            f"beoordelingDay={row.beoordeling_day:>3} "
            f"informatieDay={str(info_day):>3} "
            f"returnDay={str(behandelen_day):>3} "
            f"finishDay={row.afronden_day:>3} "
            f"needsExtraInformation={row.needs_extra_information} "
            f"transitions=[{transitions}] "
            f"variables={readable_values(row.variables)}"
        )
    print()


def write_matrix_json(matrix: List[ProcessMatrixRow], path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump([matrix_to_dict(row) for row in matrix], f, indent=2, ensure_ascii=False)


def write_matrix_csv(matrix: List[ProcessMatrixRow], path: str) -> None:
    fieldnames = [
        "index",
        "businessKey",
        "processInstanceId",
        "started",
        "originalSubmissionStart",
        "submissionDuration",
        "beoordelingDay",
        "needsExtraInformation",
        "extraInformationStart",
        "extraInformationDuration",
        "evaluationDuration",
        "informatieDay",
        "informatieReturnDay",
        "afrondenDay",
        "subsidyAmount",
        "eligibleInitial",
        "willComplain",
        "eligibleAfterComplaint",
        "transitions",
    ]

    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in matrix:
            values = readable_values(row.variables)
            writer.writerow(
                {
                    "index": row.index,
                    "businessKey": row.business_key,
                    "processInstanceId": row.process_instance_id or "",
                    "started": row.started,
                    "originalSubmissionStart": row.original_submission_start,
                    "submissionDuration": row.submission_duration,
                    "beoordelingDay": row.beoordeling_day,
                    "needsExtraInformation": row.needs_extra_information,
                    "extraInformationStart": row.extra_information_start,
                    "extraInformationDuration": row.extra_information_duration,
                    "evaluationDuration": row.evaluation_duration,
                    "informatieDay": row.informatie_day or "",
                    "informatieReturnDay": row.informatie_return_day or "",
                    "afrondenDay": row.afronden_day,
                    "subsidyAmount": values.get("subsidyAmount"),
                    "eligibleInitial": values.get("eligibleInitial"),
                    "willComplain": values.get("willComplain"),
                    "eligibleAfterComplaint": values.get("eligibleAfterComplaint"),
                    "transitions": "; ".join(
                        f"{t.name}:{t.from_topic}->{t.target_state}@day{t.due_day}:done={t.done}"
                        for t in row.transitions
                    ),
                }
            )


def create_due_instances(
    current_day: int,
    creates_by_day: Dict[int, List[ProcessMatrixRow]],
    args: argparse.Namespace,
    client: OperatonClient,
) -> int:
    due_rows = creates_by_day.get(current_day, [])
    created = 0

    for row in due_rows:
        if row.started:
            continue

        if not args.execute:
            row.started = True
            row.process_instance_id = f"dry-run-instance-{row.index}"
            created += 1
            print(
                f"day={current_day}: WOULD CREATE "
                f"index={row.index} businessKey={row.business_key} "
                f"variables={readable_values(row.variables)}"
            )
            continue

        result = client.start_instance(
            process_key=args.process_key,
            tenant_id=args.tenant,
            row=row,
        )
        row.started = True
        row.process_instance_id = result.get("id")
        row.start_result = result
        created += 1

        print(
            f"day={current_day}: CREATED "
            f"index={row.index} id={row.process_instance_id} "
            f"businessKey={result.get('businessKey')} definitionId={result.get('definitionId')}"
        )

    return created


def describe_external_tasks(tasks: List[Dict[str, Any]]) -> str:
    if not tasks:
        return "none"

    parts = []
    for task in tasks:
        parts.append(
            "{"
            f"id={task.get('id')}, "
            f"topic={task.get('topicName')}, "
            f"activityId={task.get('activityId')}, "
            f"activityName={task.get('activityName')}"
            "}"
        )
    return "; ".join(parts)


def lock_single_auto_task_if_available(
    current_day: int,
    row: ProcessMatrixRow,
    transition: TransitionPlan,
    args: argparse.Namespace,
    client: OperatonClient,
) -> Optional[Dict[str, Any]]:
    """
    Fallback for cases where the configured topic is wrong.

    It still does not fetch process state or process variables. It only asks
    Operaton which unlocked external tasks are available for this specific
    process instance. If exactly one exists, that is the one currently waiting,
    so it is safe to lock and complete it.
    """
    if not row.process_instance_id:
        return None

    tasks = client.query_unlocked_tasks_by_instance_id(
        process_instance_id=row.process_instance_id,
        topic_name=None,
        max_results=args.auto_task_max_results,
    )

    if not tasks:
        return None

    if len(tasks) > 1:
        print(
            f"day={current_day}: AUTO TASK FALLBACK AMBIGUOUS for transition {transition.name} "
            f"index={row.index} businessKey={row.business_key}; "
            f"found {len(tasks)} unlocked external tasks: {describe_external_tasks(tasks)}"
        )
        return None

    task = tasks[0]
    task_id = task.get("id")
    if not task_id:
        print(
            f"day={current_day}: AUTO TASK FALLBACK found a task without id for transition {transition.name} "
            f"index={row.index}: {task}"
        )
        return None

    client.lock_external_task(
        external_task_id=task_id,
        worker_id=args.worker_id,
        lock_duration_ms=args.lock_duration_ms,
    )

    print(
        f"day={current_day}: AUTO TASK FALLBACK selected "
        f"index={row.index} businessKey={row.business_key} "
        f"expectedTopic={transition.from_topic} actualTopic={task.get('topicName')} "
        f"activityId={task.get('activityId')}"
    )

    return task


def complete_due_transition(
    current_day: int,
    row: ProcessMatrixRow,
    transition: TransitionPlan,
    args: argparse.Namespace,
    client: OperatonClient,
) -> bool:
    if transition.done:
        return False

    if not row.started:
        print(
            f"day={current_day}: SKIP TRANSITION {transition.name} "
            f"index={row.index} businessKey={row.business_key}; process was not created yet"
        )
        return False

    if not args.execute:
        transition.done = True
        transition.external_task_id = f"dry-run-task-{row.index}-{transition.name}"
        print(
            f"day={current_day}: WOULD PUSH "
            f"index={row.index} businessKey={row.business_key} "
            f"from={transition.from_topic} to={transition.target_state} "
            f"setVariables={readable_values(transition.completion_variables)}"
        )
        return True

    external_task: Optional[Dict[str, Any]] = None
    topic_is_auto = transition.from_topic.strip().lower() == "auto"

    if topic_is_auto:
        external_task = lock_single_auto_task_if_available(
            current_day=current_day,
            row=row,
            transition=transition,
            args=args,
            client=client,
        )
    elif args.push_method == "fetch-and-lock":
        external_task = client.fetch_and_lock_task_by_business_key(
            business_key=row.business_key,
            topic_name=transition.from_topic,
            worker_id=args.worker_id,
            lock_duration_ms=args.lock_duration_ms,
        )
    else:
        if not row.process_instance_id:
            print(
                f"day={current_day}: SKIP TRANSITION {transition.name} "
                f"index={row.index} businessKey={row.business_key}; no process instance id available"
            )
            return False

        external_task = client.query_unlocked_task_by_instance_id(
            process_instance_id=row.process_instance_id,
            topic_name=transition.from_topic,
        )
        if external_task:
            task_id = external_task.get("id")
            if not task_id:
                print(
                    f"day={current_day}: SKIP TRANSITION {transition.name} "
                    f"index={row.index}; external task did not contain an id"
                )
                return False
            client.lock_external_task(
                external_task_id=task_id,
                worker_id=args.worker_id,
                lock_duration_ms=args.lock_duration_ms,
            )

    if not external_task and args.auto_task_fallback and not topic_is_auto:
        external_task = lock_single_auto_task_if_available(
            current_day=current_day,
            row=row,
            transition=transition,
            args=args,
            client=client,
        )

    if not external_task:
        message = (
            f"day={current_day}: NO TASK FOUND for transition {transition.name} "
            f"index={row.index} businessKey={row.business_key} "
            f"fromTopic={transition.from_topic} target={transition.target_state}. "
            "No state/variable query was performed."
        )
        if args.fail_on_missing_task:
            raise RuntimeError(message)
        print(message)
        return False

    external_task_id = external_task.get("id")
    if not external_task_id:
        raise RuntimeError(
            f"day={current_day}: external task result for index={row.index} did not contain an id: {external_task}"
        )

    client.complete_external_task(
        external_task_id=external_task_id,
        worker_id=args.worker_id,
        variables=transition.completion_variables,
    )

    transition.done = True
    transition.external_task_id = external_task_id

    print(
        f"day={current_day}: PUSHED "
        f"index={row.index} businessKey={row.business_key} "
        f"externalTaskId={external_task_id} "
        f"from={transition.from_topic} actualTopic={external_task.get('topicName')} "
        f"to={transition.target_state} "
        f"setVariables={readable_values(transition.completion_variables)}"
    )

    return True


def complete_due_transitions(
    current_day: int,
    transitions_by_day: Dict[int, List[Tuple[ProcessMatrixRow, TransitionPlan]]],
    args: argparse.Namespace,
    client: OperatonClient,
) -> int:
    due_transitions = transitions_by_day.get(current_day, [])
    completed = 0

    for row, transition in due_transitions:
        if complete_due_transition(
            current_day=current_day,
            row=row,
            transition=transition,
            args=args,
            client=client,
        ):
            completed += 1

    return completed


def run_heartbeat(matrix: List[ProcessMatrixRow], args: argparse.Namespace, client: OperatonClient) -> None:
    creates_by_day, transitions_by_day = build_action_maps(matrix)

    first_day = 1
    last_creation_day = max(creates_by_day.keys(), default=1)
    last_transition_day = max(transitions_by_day.keys(), default=last_creation_day)
    last_day = args.max_days if args.max_days is not None else last_transition_day

    print("Heartbeat starts.")
    print(f"  days: {first_day} through {last_day}")
    print(f"  last creation day: {last_creation_day}")
    print(f"  last transition day: {last_transition_day}")
    print(f"  heartbeat seconds: {args.heartbeat_seconds}")
    print(f"  mode: {'EXECUTE' if args.execute else 'DRY RUN'}")
    print(f"  push method: {args.push_method}")
    print(f"  auto task fallback: {args.auto_task_fallback}")
    print("  REST policy: create only on start day; complete external task only on transition day; no state scans; no variable reads")
    print()

    total_created = 0
    total_completed = 0

    for current_day in range(first_day, last_day + 1):
        has_actions = current_day in creates_by_day or current_day in transitions_by_day

        if has_actions or args.verbose_days:
            print(f"=== Day {current_day} ===")

        total_created += create_due_instances(
            current_day=current_day,
            creates_by_day=creates_by_day,
            args=args,
            client=client,
        )

        total_completed += complete_due_transitions(
            current_day=current_day,
            transitions_by_day=transitions_by_day,
            args=args,
            client=client,
        )

        if has_actions or args.verbose_days:
            print()

        is_last_day = current_day == last_day
        if not is_last_day and not args.no_sleep:
            time.sleep(args.heartbeat_seconds)

    print("Done.")
    if args.execute:
        print(f"Created process instances: {total_created}")
        print(f"Completed external tasks: {total_completed}")
    else:
        print(f"Dry run complete. Would create process instances: {total_created}")
        print(f"Dry run complete. Would complete external tasks: {total_completed}")
        print("Run again with --execute to actually call Operaton.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Minimal-REST matrix heartbeat runner with one-time BPMN extra-information loop for Operaton/Camunda 7."
    )

    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--process-key", default=DEFAULT_PROCESS_KEY)
    parser.add_argument("--tenant", default=DEFAULT_TENANT_ID)
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--username")
    parser.add_argument("--password")
    parser.add_argument("--business-key-prefix", default=DEFAULT_BUSINESS_KEY_PREFIX)

    parser.add_argument("--from-topic", default=DEFAULT_SUBMISSION_TOPIC)
    parser.add_argument("--extra-information-from-topic", default=DEFAULT_EVALUATION_TOPIC)
    parser.add_argument(
        "--information-return-topic",
        default=DEFAULT_INFORMATION_TOPIC,
        help=(
            "External task topic to complete when leaving activity id 'informatie' and returning to 'beoordeling'. "
            "Default: extra-informatie. Use 'auto' to complete the single unlocked external task "
            "for that process instance regardless of topic."
        ),
    )
    parser.add_argument(
        "--behandelen-from-topic",
        dest="information_return_topic",
        default=argparse.SUPPRESS,
        help=argparse.SUPPRESS,
    )
    parser.add_argument("--worker-id", default=DEFAULT_WORKER_ID)
    parser.add_argument("--lock-duration-ms", type=int, default=60000)
    parser.add_argument(
        "--push-method",
        choices=["fetch-and-lock", "query-lock-complete"],
        default="fetch-and-lock",
        help=(
            "fetch-and-lock uses 2 REST calls per transition: fetch+lock, then complete. "
            "query-lock-complete uses 3 REST calls per transition and is a compatibility fallback."
        ),
    )
    parser.add_argument(
        "--fail-on-missing-task",
        action="store_true",
        help="Abort when a scheduled external task is not found. Default: log and continue.",
    )
    parser.add_argument(
        "--auto-task-fallback",
        action=argparse.BooleanOptionalAction,
        default=True,
        help=(
            "If the configured topic is not found, query unlocked external tasks for that specific "
            "process instance. If exactly one is waiting, lock and complete it. Default: enabled."
        ),
    )
    parser.add_argument(
        "--auto-task-max-results",
        type=int,
        default=10,
        help="Maximum external tasks to inspect for auto fallback. Default: 10",
    )

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
    parser.add_argument(
        "--min-resume-after-extra-information-days",
        type=int,
        default=2,
        help="Minimum number of simulated days that beoordeling should continue after extra information returns. Default: 2",
    )

    parser.add_argument("--prob-needs-extra-information", type=float, default=0.25)
    parser.add_argument("--prob-eligible-initial", type=float, default=0.60)
    parser.add_argument("--prob-will-complain", type=float, default=0.10)
    parser.add_argument("--prob-eligible-after-complaint", type=float, default=0.60)

    parser.add_argument("--seed", type=int)
    parser.add_argument("--heartbeat-seconds", "--heartbeat", dest="heartbeat_seconds", type=float, default=20.0)
    parser.add_argument("--max-days", type=int)
    parser.add_argument("--request-timeout-seconds", type=float, default=15.0)
    parser.add_argument("--no-sleep", action="store_true")
    parser.add_argument("--verbose-days", action="store_true")
    parser.add_argument("--show-matrix", action="store_true")
    parser.add_argument("--matrix-json")
    parser.add_argument("--matrix-csv")
    parser.add_argument("--execute", action="store_true")

    args = parser.parse_args()

    if args.count < 1:
        print("--count must be at least 1")
        sys.exit(1)

    if not args.business_key_prefix:
        print("--business-key-prefix cannot be empty in the minimal REST version; it is used to target external tasks.")
        sys.exit(1)

    range_checks = [
        ("--min-subsidy", args.min_subsidy, "--max-subsidy", args.max_subsidy),
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

    if args.min_resume_after_extra_information_days < 0:
        print("--min-resume-after-extra-information-days cannot be negative")
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

    if args.auto_task_max_results < 1:
        print("--auto-task-max-results must be at least 1")
        sys.exit(1)

    if args.request_timeout_seconds <= 0:
        print("--request-timeout-seconds must be greater than 0")
        sys.exit(1)

    probabilities = [
        ("--prob-needs-extra-information", args.prob_needs_extra_information),
        ("--prob-eligible-initial", args.prob_eligible_initial),
        ("--prob-will-complain", args.prob_will_complain),
        ("--prob-eligible-after-complaint", args.prob_eligible_after_complaint),
    ]
    for name, value in probabilities:
        if value < 0 or value > 1:
            print(f"{name} must be between 0 and 1")
            sys.exit(1)

    return args


def main() -> None:
    args = parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    matrix = build_process_matrix(args)

    print("Configuration:")
    print(f"  base_url: {args.base_url}")
    print(f"  process_key: {args.process_key}")
    print(f"  tenant: {args.tenant}")
    print(f"  count: {args.count}")
    print(f"  business_key_prefix: {args.business_key_prefix}")
    print(f"  create variables at start: yes")
    print(f"  submission transition: {args.from_topic} -> beoordeling")
    print(f"  extra information transition: {args.extra_information_from_topic} -> informatie")
    print(f"  information return transition: {args.information_return_topic} -> beoordeling")
    print(f"  final evaluation transition: {args.extra_information_from_topic} -> afronden")
    print(f"  auto task fallback: {args.auto_task_fallback}")
    print(f"  seed: {args.seed}")
    print()

    if args.show_matrix:
        print_matrix(matrix)

    client = OperatonClient(
        base_url=args.base_url,
        username=args.username,
        password=args.password,
        timeout_seconds=args.request_timeout_seconds,
    )

    try:
        run_heartbeat(matrix, args, client)
    finally:
        client.close()

    if args.matrix_json:
        write_matrix_json(matrix, args.matrix_json)
        print(f"Matrix JSON written to: {args.matrix_json}")

    if args.matrix_csv:
        write_matrix_csv(matrix, args.matrix_csv)
        print(f"Matrix CSV written to: {args.matrix_csv}")


if __name__ == "__main__":
    main()
