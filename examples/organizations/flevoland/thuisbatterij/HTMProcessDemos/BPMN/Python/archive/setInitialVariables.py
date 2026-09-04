# randomize_process_variables_tenant48.py

import argparse
import random
import re
import sys
import requests
from requests.auth import HTTPBasicAuth


DEFAULT_BASE_URL = "https://operaton.open-regels.nl/engine-rest/engine/default"
DEFAULT_PROCESS_KEY = "processAanvraagInfoBezwaar"
DEFAULT_TENANT_ID = "48"


def random_bool(probability_true):
    return random.random() < probability_true


def parse_index_from_business_key(business_key):
    """
    Extracts the trailing number from a business key.

    Examples:
      test-instance-1  -> 1
      test-instance-10 -> 10

    Returns None if no trailing number is found.
    """
    if not business_key:
        return None

    match = re.search(r"(\d+)$", business_key)
    if not match:
        return None

    return int(match.group(1))


def fetch_instances(base_url, args, auth=None, first_result=0):
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

    response = requests.get(url, params=params, auth=auth)

    if response.status_code != 200:
        raise RuntimeError(
            f"Failed to fetch process instances. "
            f"HTTP {response.status_code}: {response.text}"
        )

    return response.json()


def fetch_all_instances(base_url, args, auth=None):
    all_instances = []
    first_result = 0

    while True:
        instances = fetch_instances(
            base_url=base_url,
            args=args,
            auth=auth,
            first_result=first_result
        )

        if not instances:
            break

        all_instances.extend(instances)
        first_result += args.batch_size

    return all_instances


def update_variables(base_url, instance_id, variables, auth=None):
    """
    Uses the Camunda/Operaton variable modification endpoint to update
    multiple process variables in one request.
    """
    url = f"{base_url.rstrip('/')}/process-instance/{instance_id}/variables"

    payload = {
        "modifications": variables,
        "deletions": []
    }

    response = requests.post(url, json=payload, auth=auth)

    if response.status_code not in (200, 204):
        raise RuntimeError(
            f"Failed to update variables for instance {instance_id}. "
            f"HTTP {response.status_code}: {response.text}"
        )


def build_variable_payload(instance_index, args):
    subsidy_amount = random.randint(args.min_subsidy, args.max_subsidy)

    needs_extra_information = random_bool(0.25)
    eligible_initial = random_bool(0.60)
    will_complain = random_bool(0.10)
    eligible_after_complaint = random_bool(0.60)

    original_submission_start = (instance_index - 1) + random.randint(1, 3)

    return {
        "subsidyAmount": {
            "value": subsidy_amount,
            "type": "Long"
        },
        "needsExtraInformation": {
            "value": needs_extra_information,
            "type": "Boolean"
        },
        "eligibleInitial": {
            "value": eligible_initial,
            "type": "Boolean"
        },
        "willComplain": {
            "value": will_complain,
            "type": "Boolean"
        },
        "eligibleAfterComplaint": {
            "value": eligible_after_complaint,
            "type": "Boolean"
        },
        "originalSubmissionStart": {
            "value": original_submission_start,
            "type": "Long"
        }
    }


def main():
    parser = argparse.ArgumentParser(
        description="Randomly update subsidy process variables for running process instances."
    )

    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"Engine REST base URL. Default: {DEFAULT_BASE_URL}"
    )

    parser.add_argument(
        "--process-key",
        default=DEFAULT_PROCESS_KEY,
        help=f"Process definition key. Default: {DEFAULT_PROCESS_KEY}"
    )

    parser.add_argument(
        "--process-definition-id",
        help="Optional exact process definition ID from Cockpit. Overrides --process-key."
    )

    parser.add_argument(
        "--tenant",
        default=DEFAULT_TENANT_ID,
        help=f"Tenant ID. Default: {DEFAULT_TENANT_ID}"
    )

    parser.add_argument(
        "--min-subsidy",
        type=int,
        default=4000,
        help="Minimum random subsidy amount. Default: 4000"
    )

    parser.add_argument(
        "--max-subsidy",
        type=int,
        default=5000,
        help="Maximum random subsidy amount. Default: 5000"
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of process instances to fetch per page. Default: 100"
    )

    parser.add_argument(
        "--business-key-prefix",
        default="test-instance",
        help="Only update instances with business keys like this prefix. Default: test-instance"
    )

    parser.add_argument(
        "--username",
        help="Basic auth username"
    )

    parser.add_argument(
        "--password",
        help="Basic auth password"
    )

    parser.add_argument(
        "--seed",
        type=int,
        help="Optional random seed for reproducible random values."
    )

    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually update variables. Without this flag, the script only performs a dry run."
    )

    args = parser.parse_args()

    if args.min_subsidy > args.max_subsidy:
        print("--min-subsidy cannot be greater than --max-subsidy")
        sys.exit(1)

    if args.seed is not None:
        random.seed(args.seed)

    auth = None
    if args.username or args.password:
        if not args.username or not args.password:
            print("Both --username and --password are required when using basic auth.")
            sys.exit(1)
        auth = HTTPBasicAuth(args.username, args.password)

    mode = "UPDATE" if args.execute else "DRY RUN"

    print("Searching for process instances...")
    print(f"Tenant: {args.tenant}")

    if args.process_definition_id:
        print(f"Process definition ID: {args.process_definition_id}")
    else:
        print(f"Process key: {args.process_key}")

    if args.business_key_prefix:
        print(f"Business key filter: {args.business_key_prefix}-%")
    else:
        print("Business key filter: none")

    print(f"Subsidy range: {args.min_subsidy} to {args.max_subsidy}")
    print("Probabilities:")
    print("  needsExtraInformation: 25% true")
    print("  eligibleInitial: 60% true")
    print("  willComplain: 10% true")
    print("  eligibleAfterComplaint: 60% true")
    print(f"Mode: {mode}")
    print()

    instances = fetch_all_instances(
        base_url=args.base_url,
        args=args,
        auth=auth
    )

    if not instances:
        print("No matching process instances found.")
        return

    def sort_key(instance):
        business_key = instance.get("businessKey")
        parsed_index = parse_index_from_business_key(business_key)
        if parsed_index is not None:
            return parsed_index
        return 999999999

    instances.sort(key=sort_key)

    total_updated = 0

    for fallback_index, instance in enumerate(instances, start=1):
        instance_id = instance.get("id")
        definition_id = instance.get("definitionId")
        business_key = instance.get("businessKey")

        parsed_index = parse_index_from_business_key(business_key)
        instance_index = parsed_index if parsed_index is not None else fallback_index

        variables = build_variable_payload(
            instance_index=instance_index,
            args=args
        )

        readable_values = {
            name: details["value"]
            for name, details in variables.items()
        }

        print(
            f"{'Would update' if not args.execute else 'Updating'} "
            f"index={instance_index} "
            f"id={instance_id} "
            f"definitionId={definition_id} "
            f"businessKey={business_key} "
            f"values={readable_values}"
        )

        if args.execute:
            update_variables(
                base_url=args.base_url,
                instance_id=instance_id,
                variables=variables,
                auth=auth
            )
            total_updated += 1

    print()
    if args.execute:
        print(f"Done. Updated variables for {total_updated} process instances.")
    else:
        print(f"Dry run complete. Found {len(instances)} matching process instances.")
        print("Run again with --execute to actually update them.")


if __name__ == "__main__":
    main()