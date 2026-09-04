# launch_instances_with_heartbeat.py
#
# Dry run example:
#   python .\launch_instances_with_heartbeat.py --tenant 48 --count 10 --seed 123 --no-sleep
#
# Execute example:
#   python .\launch_instances_with_heartbeat.py --tenant 48 --count 10 --username YOUR_USER --password YOUR_PASSWORD --execute
#
# What this does:
#   1. Builds all planned process instances and variables up front.
#   2. Days start at day 1.
#   3. On each heartbeat/day, it starts only the instances whose
#      originalSubmissionStart equals that day.
#   4. The generated variables are sent as initial variables in the start request.

import argparse
import random
import sys
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import requests
from requests.auth import HTTPBasicAuth


DEFAULT_BASE_URL = "https://operaton.open-regels.nl/engine-rest/engine/default"
DEFAULT_PROCESS_KEY = "processAanvraagInfoBezwaar"
DEFAULT_TENANT_ID = "48"

VariablePayload = Dict[str, Dict[str, Any]]


@dataclass
class PlannedInstance:
    index: int
    business_key: Optional[str]
    variables: VariablePayload
    original_submission_start: int
    started: bool = False
    process_instance_id: Optional[str] = None


def random_bool(probability_true: float) -> bool:
    return random.random() < probability_true


def build_variable_payload(instance_index: int, args: argparse.Namespace) -> VariablePayload:
    """
    Same variable-generation approach as setInitialVariables:
      - subsidyAmount: random amount
      - needsExtraInformation: 25% true
      - eligibleInitial: 60% true
      - willComplain: 10% true
      - eligibleAfterComplaint: 60% true
      - originalSubmissionStart: based on the index plus a 1..3 day offset
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

    return {
        "subsidyAmount": {
            "value": subsidy_amount,
            "type": "Long",
        },
        "needsExtraInformation": {
            "value": needs_extra_information,
            "type": "Boolean",
        },
        "eligibleInitial": {
            "value": eligible_initial,
            "type": "Boolean",
        },
        "willComplain": {
            "value": will_complain,
            "type": "Boolean",
        },
        "eligibleAfterComplaint": {
            "value": eligible_after_complaint,
            "type": "Boolean",
        },
        "originalSubmissionStart": {
            "value": original_submission_start,
            "type": "Long",
        },
    }


def build_planned_instances(args: argparse.Namespace) -> List[PlannedInstance]:
    """
    Build the complete in-memory array before any process instance is created.
    This is the seeded schedule used by the heartbeat loop.
    """
    planned_instances: List[PlannedInstance] = []

    for index in range(1, args.count + 1):
        variables = build_variable_payload(index, args)
        original_submission_start = int(variables["originalSubmissionStart"]["value"])

        business_key = None
        if args.business_key_prefix:
            business_key = f"{args.business_key_prefix}-{index}"

        planned_instances.append(
            PlannedInstance(
                index=index,
                business_key=business_key,
                variables=variables,
                original_submission_start=original_submission_start,
            )
        )

    planned_instances.sort(
        key=lambda item: (item.original_submission_start, item.index)
    )

    return planned_instances


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


def readable_values(variables: VariablePayload) -> Dict[str, Any]:
    return {
        name: details["value"]
        for name, details in variables.items()
    }


def print_schedule(planned_instances: List[PlannedInstance]) -> None:
    print("Planned instances built up front:")
    for item in planned_instances:
        print(
            f"  day={item.original_submission_start:>3} "
            f"index={item.index:>3} "
            f"businessKey={item.business_key} "
            f"values={readable_values(item.variables)}"
        )
    print()


def run_heartbeat(planned_instances: List[PlannedInstance], args: argparse.Namespace, auth=None) -> None:
    if not planned_instances:
        print("No planned instances to process.")
        return

    first_day = 1
    last_day = max(item.original_submission_start for item in planned_instances)
    total_started = 0

    print(f"Starting heartbeat. Days run from {first_day} through {last_day}.")
    print(f"Heartbeat length: {args.heartbeat_seconds} seconds per day.")
    print(f"Mode: {'EXECUTE' if args.execute else 'DRY RUN'}")
    print()

    for current_day in range(first_day, last_day + 1):
        due_today = [
            item for item in planned_instances
            if item.original_submission_start == current_day and not item.started
        ]

        print(f"=== Day {current_day} ===")

        if not due_today:
            print("No instances scheduled for this day.")
        else:
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
                    total_started += 1

                    print(
                        f"Started index={item.index} "
                        f"id={item.process_instance_id} "
                        f"definitionId={result.get('definitionId')} "
                        f"businessKey={result.get('businessKey')} "
                        f"values={values}"
                    )
                else:
                    print(
                        f"Would start index={item.index} "
                        f"businessKey={item.business_key} "
                        f"values={values}"
                    )

        print()

        is_last_day = current_day == last_day
        if not is_last_day and not args.no_sleep:
            time.sleep(args.heartbeat_seconds)

    if args.execute:
        print(f"Done. Started {total_started} process instances for tenant {args.tenant}.")
    else:
        print(f"Dry run complete. Would start {len(planned_instances)} process instances.")
        print("Run again with --execute to actually create them.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Start Operaton/Camunda 7 process instances over simulated days. "
            "All variables are generated up front; each heartbeat/day starts only "
            "instances whose originalSubmissionStart equals that day."
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
        help="Prefix for generated business keys. Use empty string to disable.",
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
        "--execute",
        action="store_true",
        help="Actually create process instances. Without this flag, the script only performs a dry run.",
    )

    args = parser.parse_args()

    if args.count < 1:
        print("--count must be at least 1")
        sys.exit(1)

    if args.min_subsidy > args.max_subsidy:
        print("--min-subsidy cannot be greater than --max-subsidy")
        sys.exit(1)

    if args.min_start_offset_days < 1:
        print("--min-start-offset-days must be at least 1 because days start counting at 1")
        sys.exit(1)

    if args.min_start_offset_days > args.max_start_offset_days:
        print("--min-start-offset-days cannot be greater than --max-start-offset-days")
        sys.exit(1)

    if args.heartbeat_seconds < 0:
        print("--heartbeat-seconds cannot be negative")
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

    auth = None
    if args.username or args.password:
        if not args.username or not args.password:
            print("Both --username and --password are required when using basic auth.")
            sys.exit(1)
        auth = HTTPBasicAuth(args.username, args.password)

    planned_instances = build_planned_instances(args)

    print("Configuration:")
    print(f"  base_url: {args.base_url}")
    print(f"  process_key: {args.process_key}")
    print(f"  tenant: {args.tenant}")
    print(f"  count: {args.count}")
    print(f"  business_key_prefix: {args.business_key_prefix or 'none'}")
    print(f"  seed: {args.seed}")
    print()

    if args.show_schedule:
        print_schedule(planned_instances)

    run_heartbeat(planned_instances, args, auth=auth)


if __name__ == "__main__":
    main()
