# launch_instances_matrix_with_informatie_jump.py
#
# Matrix-driven heartbeat runner for Operaton/Camunda 7.
#
# It creates process instances and then performs only pre-planned REST actions.
# It does NOT scan all process instances and it does NOT read process variables
# during the heartbeat.
#
# BPMN activity id behavior for subsidieProcess(2).bpmn:
#   - ingediend   : external service task, topic "ingediend"
#   - beoordeling : external service task, topic "beoordeling"
#   - informatie  : external service task, topic "extra-informatie"
#
# Timeline:
#   day originalSubmissionStart:
#       create the process instance with all generated variables
#
#   day originalSubmissionStart + submissionDuration:
#       complete topic "ingediend" so the process reaches activity id "beoordeling"
#
#   if needsExtraInformation is true,
#   day originalSubmissionStart + submissionDuration + extraInformationStart:
#       complete topic "beoordeling" so the BPMN gateway sends the process to activity id "informatie"
#
#   if needsExtraInformation is true,
#   day originalSubmissionStart + submissionDuration + extraInformationStart + extraInformationDuration:
#       perform a process-instance modification:
#         cancel all executions at activity id "informatie"
#         start before activity id "beoordeling"
#       This is a real jump back to the BPMN task id "beoordeling"; it does not
#       complete the "informatie" external task and therefore does not follow
#       informatie's outgoing sequence flow to the merge gateway.
#
# Dry run:
#   python .\launch_instances_matrix_with_informatie_jump.py --tenant 48 --count 10 --seed 123 --show-matrix --no-sleep
#
# Execute:
#   python .\launch_instances_matrix_with_informatie_jump.py --tenant 48 --count 10 --username YOUR_USER --password YOUR_PASSWORD --execute

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
DEFAULT_FROM_TOPIC = "ingediend"
DEFAULT_EXTRA_INFORMATION_FROM_TOPIC = "beoordeling"
DEFAULT_RETURN_FROM_ACTIVITY_ID = "informatie"
DEFAULT_RETURN_TO_ACTIVITY_ID = "beoordeling"
DEFAULT_WORKER_ID = "python-heartbeat-matrix"

VariablePayload = Dict[str, Dict[str, Any]]
ReadableVariables = Dict[str, Any]


def variable(value: Any, var_type: str) -> Dict[str, Any]:
    return {"value": value, "type": var_type}


def readable_values(variables: VariablePayload) -> ReadableVariables:
    return {name: details.get("value") for name, details in variables.items()}


@dataclass
class ExternalTaskTransition:
    name: str
    from_topic: str
    target_activity_id: str
    due_day: int
    completion_variables: VariablePayload
    done: bool = False
    external_task_id: Optional[str] = None


@dataclass
class ActivityJump:
    name: str
    cancel_activity_id: str
    start_before_activity_id: str
    due_day: int
    variables: VariablePayload
    done: bool = False


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
    external_task_transitions: List[ExternalTaskTransition] = field(default_factory=list)
    activity_jumps: List[ActivityJump] = field(default_factory=list)

    @property
    def beoordeling_day(self) -> int:
        return self.original_submission_start + self.submission_duration

    @property
    def informatie_day(self) -> Optional[int]:
        if not self.needs_extra_information:
            return None
        return self.original_submission_start + self.submission_duration + self.extra_information_start

    @property
    def return_to_beoordeling_day(self) -> Optional[int]:
        if not self.needs_extra_information:
            return None
        return (
            self.original_submission_start
            + self.submission_duration
            + self.extra_information_start
            + self.extra_information_duration
        )


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
        payload = {
            "businessKey": row.business_key,
            "variables": row.variables,
        }
        return self.request_json(
            "POST",
            f"/process-definition/key/{process_key}/tenant-id/{tenant_id}/start",
            json=payload,
        )

    def fetch_and_lock_task_by_business_key(
        self,
        business_key: str,
        topic_name: str,
        worker_id: str,
        lock_duration_ms: int,
    ) -> Optional[Dict[str, Any]]:
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
        return tasks[0] if tasks else None

    def query_unlocked_task_by_instance_id(
        self,
        process_instance_id: str,
        topic_name: str,
    ) -> Optional[Dict[str, Any]]:
        params = {
            "processInstanceId": process_instance_id,
            "topicName": topic_name,
            "notLocked": "true",
            "maxResults": 1,
        }
        tasks = self.request_json("GET", "/external-task", params=params) or []
        return tasks[0] if tasks else None

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

    def jump_activity(
        self,
        process_instance_id: str,
        cancel_activity_id: str,
        start_before_activity_id: str,
        variables: Optional[VariablePayload] = None,
        skip_custom_listeners: bool = False,
        skip_io_mappings: bool = False,
    ) -> None:
        start_instruction: Dict[str, Any] = {
            "type": "startBeforeActivity",
            "activityId": start_before_activity_id,
        }
        if variables:
            start_instruction["variables"] = variables

        payload = {
            "skipCustomListeners": skip_custom_listeners,
            "skipIoMappings": skip_io_mappings,
            "instructions": [
                {
                    "type": "cancelAllForActivity",
                    "activityId": cancel_activity_id,
                },
                start_instruction,
            ],
        }
        self.request_json(
            "POST",
            f"/process-instance/{process_instance_id}/modification",
            json=payload,
        )


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

    # Required initialization rule:
    # when extra information is needed, evaluationDuration is always at least
    # 2 more than extraInformationDuration.
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

        row = ProcessMatrixRow(
            index=index,
            business_key=f"{args.business_key_prefix}-{index}",
            variables=variables,
            original_submission_start=original_submission_start,
            submission_duration=submission_duration,
            needs_extra_information=needs_extra_information,
            extra_information_start=extra_information_start,
            extra_information_duration=extra_information_duration,
            evaluation_duration=evaluation_duration,
        )

        row.external_task_transitions.append(
            ExternalTaskTransition(
                name="ingediend_to_beoordeling",
                from_topic=args.from_topic,
                target_activity_id="beoordeling",
                due_day=row.beoordeling_day,
                completion_variables={
                    "evaluationStart": variable(row.beoordeling_day, "Long"),
                },
            )
        )

        if needs_extra_information:
            informatie_day = row.informatie_day
            assert informatie_day is not None
            row.external_task_transitions.append(
                ExternalTaskTransition(
                    name="beoordeling_to_informatie",
                    from_topic=args.extra_information_from_topic,
                    target_activity_id="informatie",
                    due_day=informatie_day,
                    completion_variables={
                        "extraInformationRequestDay": variable(informatie_day, "Long"),
                    },
                )
            )

            return_day = row.return_to_beoordeling_day
            assert return_day is not None
            jump_variables: VariablePayload = {
                "extraInformationReceived": variable(True, "Boolean"),
                "extraInformationReceivedDay": variable(return_day, "Long"),
                "evaluationRestart": variable(return_day, "Long"),
            }
            if args.clear_needs_extra_information_on_return:
                jump_variables["needsExtraInformation"] = variable(False, "Boolean")

            row.activity_jumps.append(
                ActivityJump(
                    name="informatie_to_beoordeling_jump",
                    cancel_activity_id=args.return_from_activity_id,
                    start_before_activity_id=args.return_to_activity_id,
                    due_day=return_day,
                    variables=jump_variables,
                )
            )

        matrix.append(row)

    matrix.sort(key=lambda r: (r.original_submission_start, r.index))
    return matrix


def build_action_maps(
    matrix: List[ProcessMatrixRow],
) -> Tuple[
    Dict[int, List[ProcessMatrixRow]],
    Dict[int, List[Tuple[ProcessMatrixRow, ExternalTaskTransition]]],
    Dict[int, List[Tuple[ProcessMatrixRow, ActivityJump]]],
]:
    creates_by_day: Dict[int, List[ProcessMatrixRow]] = {}
    external_tasks_by_day: Dict[int, List[Tuple[ProcessMatrixRow, ExternalTaskTransition]]] = {}
    jumps_by_day: Dict[int, List[Tuple[ProcessMatrixRow, ActivityJump]]] = {}

    for row in matrix:
        creates_by_day.setdefault(row.original_submission_start, []).append(row)
        for transition in row.external_task_transitions:
            external_tasks_by_day.setdefault(transition.due_day, []).append((row, transition))
        for jump in row.activity_jumps:
            jumps_by_day.setdefault(jump.due_day, []).append((row, jump))

    return creates_by_day, external_tasks_by_day, jumps_by_day


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
        "returnToBeoordelingDay": row.return_to_beoordeling_day,
        "variables": readable_values(row.variables),
        "externalTaskTransitions": [
            {
                "name": t.name,
                "fromTopic": t.from_topic,
                "targetActivityId": t.target_activity_id,
                "dueDay": t.due_day,
                "done": t.done,
                "externalTaskId": t.external_task_id,
                "completionVariables": readable_values(t.completion_variables),
            }
            for t in row.external_task_transitions
        ],
        "activityJumps": [
            {
                "name": j.name,
                "cancelActivityId": j.cancel_activity_id,
                "startBeforeActivityId": j.start_before_activity_id,
                "dueDay": j.due_day,
                "done": j.done,
                "variables": readable_values(j.variables),
            }
            for j in row.activity_jumps
        ],
    }


def print_matrix(matrix: List[ProcessMatrixRow]) -> None:
    print("Process matrix built up front:")
    for row in matrix:
        informatie_day = row.informatie_day if row.informatie_day is not None else "-"
        return_day = row.return_to_beoordeling_day if row.return_to_beoordeling_day is not None else "-"
        external_actions = ", ".join(f"{t.name}@day{t.due_day}" for t in row.external_task_transitions)
        jump_actions = ", ".join(f"{j.name}@day{j.due_day}" for j in row.activity_jumps)
        print(
            f"  index={row.index:>3} "
            f"businessKey={row.business_key} "
            f"startDay={row.original_submission_start:>3} "
            f"beoordelingDay={row.beoordeling_day:>3} "
            f"informatieDay={str(informatie_day):>3} "
            f"returnToBeoordelingDay={str(return_day):>3} "
            f"needsExtraInformation={row.needs_extra_information} "
            f"external=[{external_actions}] "
            f"jumps=[{jump_actions}] "
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
        "returnToBeoordelingDay",
        "subsidyAmount",
        "eligibleInitial",
        "willComplain",
        "eligibleAfterComplaint",
        "externalTaskTransitions",
        "activityJumps",
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
                    "returnToBeoordelingDay": row.return_to_beoordeling_day or "",
                    "subsidyAmount": values.get("subsidyAmount"),
                    "eligibleInitial": values.get("eligibleInitial"),
                    "willComplain": values.get("willComplain"),
                    "eligibleAfterComplaint": values.get("eligibleAfterComplaint"),
                    "externalTaskTransitions": "; ".join(
                        f"{t.name}:{t.from_topic}->{t.target_activity_id}@day{t.due_day}:done={t.done}"
                        for t in row.external_task_transitions
                    ),
                    "activityJumps": "; ".join(
                        f"{j.name}:{j.cancel_activity_id}->before:{j.start_before_activity_id}@day{j.due_day}:done={j.done}"
                        for j in row.activity_jumps
                    ),
                }
            )


def create_due_instances(
    current_day: int,
    creates_by_day: Dict[int, List[ProcessMatrixRow]],
    args: argparse.Namespace,
    client: OperatonClient,
) -> int:
    created = 0
    for row in creates_by_day.get(current_day, []):
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


def complete_due_external_task(
    current_day: int,
    row: ProcessMatrixRow,
    transition: ExternalTaskTransition,
    args: argparse.Namespace,
    client: OperatonClient,
) -> bool:
    if transition.done:
        return False

    if not row.started:
        print(
            f"day={current_day}: SKIP {transition.name} "
            f"index={row.index}; process was not created yet"
        )
        return False

    if not args.execute:
        transition.done = True
        transition.external_task_id = f"dry-run-task-{row.index}-{transition.name}"
        print(
            f"day={current_day}: WOULD COMPLETE EXTERNAL TASK "
            f"index={row.index} businessKey={row.business_key} "
            f"topic={transition.from_topic} targetActivityId={transition.target_activity_id} "
            f"setVariables={readable_values(transition.completion_variables)}"
        )
        return True

    external_task: Optional[Dict[str, Any]] = None

    if args.push_method == "fetch-and-lock":
        external_task = client.fetch_and_lock_task_by_business_key(
            business_key=row.business_key,
            topic_name=transition.from_topic,
            worker_id=args.worker_id,
            lock_duration_ms=args.lock_duration_ms,
        )
    else:
        if not row.process_instance_id:
            print(f"day={current_day}: SKIP {transition.name} index={row.index}; no process instance id")
            return False
        external_task = client.query_unlocked_task_by_instance_id(
            process_instance_id=row.process_instance_id,
            topic_name=transition.from_topic,
        )
        if external_task:
            client.lock_external_task(
                external_task_id=external_task["id"],
                worker_id=args.worker_id,
                lock_duration_ms=args.lock_duration_ms,
            )

    if not external_task:
        message = (
            f"day={current_day}: NO EXTERNAL TASK FOUND for {transition.name} "
            f"index={row.index} businessKey={row.business_key} topic={transition.from_topic}"
        )
        if args.fail_on_missing_task:
            raise RuntimeError(message)
        print(message)
        return False

    external_task_id = external_task.get("id")
    if not external_task_id:
        raise RuntimeError(f"External task result did not contain id: {external_task}")

    client.complete_external_task(
        external_task_id=external_task_id,
        worker_id=args.worker_id,
        variables=transition.completion_variables,
    )

    transition.done = True
    transition.external_task_id = external_task_id
    print(
        f"day={current_day}: COMPLETED EXTERNAL TASK "
        f"index={row.index} businessKey={row.business_key} "
        f"externalTaskId={external_task_id} topic={transition.from_topic} "
        f"targetActivityId={transition.target_activity_id} "
        f"setVariables={readable_values(transition.completion_variables)}"
    )
    return True


def perform_due_activity_jump(
    current_day: int,
    row: ProcessMatrixRow,
    jump: ActivityJump,
    args: argparse.Namespace,
    client: OperatonClient,
) -> bool:
    if jump.done:
        return False

    if not row.started:
        print(f"day={current_day}: SKIP JUMP {jump.name} index={row.index}; process was not created yet")
        return False

    if not row.process_instance_id:
        print(f"day={current_day}: SKIP JUMP {jump.name} index={row.index}; no process instance id")
        return False

    if not args.execute:
        jump.done = True
        print(
            f"day={current_day}: WOULD JUMP "
            f"index={row.index} businessKey={row.business_key} "
            f"cancelAllForActivity={jump.cancel_activity_id} "
            f"startBeforeActivity={jump.start_before_activity_id} "
            f"setVariables={readable_values(jump.variables)}"
        )
        return True

    client.jump_activity(
        process_instance_id=row.process_instance_id,
        cancel_activity_id=jump.cancel_activity_id,
        start_before_activity_id=jump.start_before_activity_id,
        variables=jump.variables,
        skip_custom_listeners=args.skip_custom_listeners_on_jump,
        skip_io_mappings=args.skip_io_mappings_on_jump,
    )

    jump.done = True
    print(
        f"day={current_day}: JUMPED "
        f"index={row.index} businessKey={row.business_key} "
        f"processInstanceId={row.process_instance_id} "
        f"cancelAllForActivity={jump.cancel_activity_id} "
        f"startBeforeActivity={jump.start_before_activity_id} "
        f"setVariables={readable_values(jump.variables)}"
    )
    return True


def complete_due_external_tasks(
    current_day: int,
    external_tasks_by_day: Dict[int, List[Tuple[ProcessMatrixRow, ExternalTaskTransition]]],
    args: argparse.Namespace,
    client: OperatonClient,
) -> int:
    completed = 0
    for row, transition in external_tasks_by_day.get(current_day, []):
        if complete_due_external_task(current_day, row, transition, args, client):
            completed += 1
    return completed


def perform_due_activity_jumps(
    current_day: int,
    jumps_by_day: Dict[int, List[Tuple[ProcessMatrixRow, ActivityJump]]],
    args: argparse.Namespace,
    client: OperatonClient,
) -> int:
    jumped = 0
    for row, jump in jumps_by_day.get(current_day, []):
        if perform_due_activity_jump(current_day, row, jump, args, client):
            jumped += 1
    return jumped


def run_heartbeat(matrix: List[ProcessMatrixRow], args: argparse.Namespace, client: OperatonClient) -> None:
    creates_by_day, external_tasks_by_day, jumps_by_day = build_action_maps(matrix)

    first_day = 1
    last_creation_day = max(creates_by_day.keys(), default=1)
    last_external_task_day = max(external_tasks_by_day.keys(), default=last_creation_day)
    last_jump_day = max(jumps_by_day.keys(), default=last_external_task_day)
    last_planned_day = max(last_creation_day, last_external_task_day, last_jump_day)
    last_day = args.max_days if args.max_days is not None else last_planned_day

    print("Heartbeat starts.")
    print(f"  days: {first_day} through {last_day}")
    print(f"  last creation day: {last_creation_day}")
    print(f"  last external-task day: {last_external_task_day}")
    print(f"  last activity-jump day: {last_jump_day}")
    print(f"  heartbeat seconds: {args.heartbeat_seconds}")
    print(f"  mode: {'EXECUTE' if args.execute else 'DRY RUN'}")
    print(f"  external-task push method: {args.push_method}")
    print("  REST policy: create only on start day; complete external tasks only on due days; modify activity only on jump day")
    print()

    total_created = 0
    total_external_tasks_completed = 0
    total_activity_jumps = 0

    for current_day in range(first_day, last_day + 1):
        has_actions = (
            current_day in creates_by_day
            or current_day in external_tasks_by_day
            or current_day in jumps_by_day
        )

        if has_actions or args.verbose_days:
            print(f"=== Day {current_day} ===")

        total_created += create_due_instances(current_day, creates_by_day, args, client)
        total_external_tasks_completed += complete_due_external_tasks(current_day, external_tasks_by_day, args, client)
        total_activity_jumps += perform_due_activity_jumps(current_day, jumps_by_day, args, client)

        if has_actions or args.verbose_days:
            print()

        if current_day != last_day and not args.no_sleep:
            time.sleep(args.heartbeat_seconds)

    print("Done.")
    if args.execute:
        print(f"Created process instances: {total_created}")
        print(f"Completed external tasks: {total_external_tasks_completed}")
        print(f"Activity jumps: {total_activity_jumps}")
    else:
        print(f"Dry run complete. Would create process instances: {total_created}")
        print(f"Dry run complete. Would complete external tasks: {total_external_tasks_completed}")
        print(f"Dry run complete. Would perform activity jumps: {total_activity_jumps}")
        print("Run again with --execute to actually call Operaton.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Matrix heartbeat runner with explicit jump from BPMN activity id informatie back to beoordeling."
    )

    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--process-key", default=DEFAULT_PROCESS_KEY)
    parser.add_argument("--tenant", default=DEFAULT_TENANT_ID)
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--username")
    parser.add_argument("--password")
    parser.add_argument("--business-key-prefix", default=DEFAULT_BUSINESS_KEY_PREFIX)

    parser.add_argument("--from-topic", default=DEFAULT_FROM_TOPIC)
    parser.add_argument("--extra-information-from-topic", default=DEFAULT_EXTRA_INFORMATION_FROM_TOPIC)
    parser.add_argument("--return-from-activity-id", default=DEFAULT_RETURN_FROM_ACTIVITY_ID)
    parser.add_argument("--return-to-activity-id", default=DEFAULT_RETURN_TO_ACTIVITY_ID)
    parser.add_argument("--worker-id", default=DEFAULT_WORKER_ID)
    parser.add_argument("--lock-duration-ms", type=int, default=60000)
    parser.add_argument(
        "--push-method",
        choices=["fetch-and-lock", "query-lock-complete"],
        default="fetch-and-lock",
        help="fetch-and-lock is usually 2 REST calls per external-task transition; query-lock-complete is a compatibility fallback.",
    )
    parser.add_argument("--fail-on-missing-task", action="store_true")
    parser.add_argument(
        "--clear-needs-extra-information-on-return",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Set needsExtraInformation=false when jumping from informatie back to beoordeling. Default: enabled.",
    )
    parser.add_argument("--skip-custom-listeners-on-jump", action="store_true")
    parser.add_argument("--skip-io-mappings-on-jump", action="store_true")

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
        print("--business-key-prefix cannot be empty; it is used to target external tasks.")
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
    print("  create variables at start: yes")
    print(f"  external transition 1: topic {args.from_topic} -> activity id beoordeling")
    print(f"  external transition 2: topic {args.extra_information_from_topic} -> activity id informatie")
    print(f"  activity jump: cancel activity id {args.return_from_activity_id} -> start before activity id {args.return_to_activity_id}")
    print(f"  clear needsExtraInformation on return: {args.clear_needs_extra_information_on_return}")
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
