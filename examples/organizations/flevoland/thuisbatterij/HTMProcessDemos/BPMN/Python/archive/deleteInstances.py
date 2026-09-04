# delete_process_instances_tenant48.py

#python .\deleteInstances.py --username YOUR_USER --password YOUR_PASSWORD --execute

import argparse
import sys
import requests
from requests.auth import HTTPBasicAuth


DEFAULT_BASE_URL = "https://operaton.open-regels.nl/engine-rest/engine/default"
DEFAULT_PROCESS_KEY = "processAanvraagInfoBezwaar"
DEFAULT_TENANT_ID = "48"


def build_query_params(args):
    params = {
        "tenantIdIn": args.tenant,
        "maxResults": args.batch_size,
        "firstResult": 0,
    }

    if args.process_definition_id:
        params["processDefinitionId"] = args.process_definition_id
    else:
        params["processDefinitionKey"] = args.process_key

    # Safety filter: by default only delete instances launched by the previous script
    # with business keys like test-instance-1, test-instance-2, etc.
    if not args.all_for_process:
        params["businessKeyLike"] = f"{args.business_key_prefix}-%"

    return params


def fetch_instances(base_url, args, auth=None):
    url = f"{base_url.rstrip('/')}/process-instance"
    params = build_query_params(args)

    response = requests.get(url, params=params, auth=auth)

    if response.status_code != 200:
        raise RuntimeError(
            f"Failed to fetch process instances. "
            f"HTTP {response.status_code}: {response.text}"
        )

    return response.json()


def delete_instance(base_url, instance_id, auth=None):
    url = f"{base_url.rstrip('/')}/process-instance/{instance_id}"

    params = {
        "skipCustomListeners": "true",
        "skipIoMappings": "true",
        "failIfNotExists": "false",
    }

    response = requests.delete(url, params=params, auth=auth)

    if response.status_code not in (200, 204):
        raise RuntimeError(
            f"Failed to delete instance {instance_id}. "
            f"HTTP {response.status_code}: {response.text}"
        )


def main():
    parser = argparse.ArgumentParser(
        description="Delete running Operaton/Camunda 7 process instances for tenant 48."
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
        help="Optional exact process definition ID from Cockpit. If provided, this overrides --process-key."
    )

    parser.add_argument(
        "--tenant",
        default=DEFAULT_TENANT_ID,
        help=f"Tenant ID. Default: {DEFAULT_TENANT_ID}"
    )

    parser.add_argument(
        "--business-key-prefix",
        default="test-instance",
        help="Only delete instances with business keys like this prefix. Default: test-instance"
    )

    parser.add_argument(
        "--all-for-process",
        action="store_true",
        help="Delete ALL running instances for this process and tenant, ignoring business key prefix."
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="How many instances to fetch per loop. Default: 100"
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
        "--execute",
        action="store_true",
        help="Actually delete instances. Without this flag, the script only performs a dry run."
    )

    args = parser.parse_args()

    auth = None
    if args.username or args.password:
        if not args.username or not args.password:
            print("Both --username and --password are required when using basic auth.")
            sys.exit(1)
        auth = HTTPBasicAuth(args.username, args.password)

    total_deleted = 0
    total_seen = 0

    print("Searching for process instances...")
    print(f"Tenant: {args.tenant}")

    if args.process_definition_id:
        print(f"Process definition ID: {args.process_definition_id}")
    else:
        print(f"Process key: {args.process_key}")

    if args.all_for_process:
        print("Scope: ALL running instances for this process and tenant")
    else:
        print(f"Scope: businessKey like {args.business_key_prefix}-%")

    print(f"Mode: {'DELETE' if args.execute else 'DRY RUN'}")
    print()

    while True:
        instances = fetch_instances(args.base_url, args, auth=auth)

        if not instances:
            break

        total_seen += len(instances)

        for instance in instances:
            instance_id = instance.get("id")
            definition_id = instance.get("definitionId")
            business_key = instance.get("businessKey")

            print(
                f"{'Deleting' if args.execute else 'Would delete'} "
                f"id={instance_id} "
                f"definitionId={definition_id} "
                f"businessKey={business_key}"
            )

            if args.execute:
                delete_instance(args.base_url, instance_id, auth=auth)
                total_deleted += 1

        # Important:
        # Do NOT use increasing firstResult while deleting.
        # We always fetch from firstResult=0 again, because the result set shrinks.
        if not args.execute:
            break

    print()
    if args.execute:
        print(f"Done. Deleted {total_deleted} process instances.")
    else:
        print(f"Dry run complete. Found {total_seen} matching process instances.")
        print("Run again with --execute to actually delete them.")


if __name__ == "__main__":
    main()