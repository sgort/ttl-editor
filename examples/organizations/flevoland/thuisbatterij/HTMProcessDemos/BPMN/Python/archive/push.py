# randomly_complete_ingediend_to_beoordeling_tenant48.py

import argparse
import random
import re
import sys
import requests
from requests.auth import HTTPBasicAuth


DEFAULT_BASE_URL = "https://operaton.open-regels.nl/engine-rest/engine/default"
DEFAULT_PROCESS_KEY = "processAanvraagInfoBezwaar"
DEFAULT_TENANT_ID = "48"
DEFAULT_FROM_TOPIC = "ingediend"
DEFAULT_WORKER_ID = "python-state-pusher"


def parse_index_from_business_key(business_key):
    if not business_key:
        return None

    match = re.search(r"(\d+)$", business_key)
    if not match:
        return None

    return int(match.group(1))


def get_auth(args):
    if args.username or args.password:
        if not args.username or not args.password:
            print("Both --username and --password are required when using basic auth.")
            sys.exit(1)
        return HTTPBasicAuth(args.username, args.password)

    return None


def request_json(method, url, auth=None, **kwargs):
    response = requests.request(method, url, auth=auth, **kwargs)

    if response.status_code not in (200, 201, 204):
        raise RuntimeError(
            f"HTTP {response.status_code} for {method} {url}\n{response.text}"
        )

    if response.status_code == 204 or not response.text:
        return None

    return response.json()


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

    return request_json("GET", url, auth=auth, params=params)


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


def fetch_activity_instance_tree(base_url, instance_id, auth=None):
    url = f"{base_url.rstrip('/')}/process-instance/{instance_id}/activity-instances"
    return request_json("GET", url, auth=auth)


def collect_active_activity_ids(activity_tree):
    activity_ids = []

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


def fetch_external_tasks_for_instance(base_url, instance_id, topic_name, auth=None):
    url = f"{base_url.rstrip('/')}/external-task"

    params = {
        "processInstanceId": instance_id,
        "topicName": topic_name,
        "notLocked": "true",
        "maxResults": 10,
    }

    return request_json("GET", url, auth=auth, params=params) or []


def lock_external_task(base_url, external_task_id, worker_id, lock_duration_ms, auth=None):
    url = f"{base_url.rstrip('/')}/external-task/{external_task_id}/lock"

    payload = {
        "workerId": worker_id,
        "lockDuration": lock_duration_ms
    }

    response = requests.post(url, json=payload, auth=auth)

    if response.status_code not in (200, 204):
        raise RuntimeError(
            f"Failed to lock external task {external_task_id}. "
            f"HTTP {response.status_code}: {response.text}"
        )


def complete_external_task(base_url, external_task_id, worker_id, auth=None):
    url = f"{base_url.rstrip('/')}/external-task/{external_task_id}/complete"

    payload = {
        "workerId": worker_id,
        "variables": {}
    }

    response = requests.post(url, json=payload, auth=auth)

    if response.status_code not in (200, 204):
        raise RuntimeError(
            f"Failed to complete external task {external_task_id}. "
            f"HTTP {response.status_code}: {response.text}"
        )


def main():
    parser = argparse.ArgumentParser(
        description="Randomly complete external task 'ingediend' so instances move to 'beoordeling'."
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
        "--from-topic",
        default=DEFAULT_FROM_TOPIC,
        help=f"External task topic to complete. Default: {DEFAULT_FROM_TOPIC}"
    )

    parser.add_argument(
        "--chance",
        type=float,
        default=0.25,
        help="Chance per instance to complete the external task. Default: 0.25"
    )

    parser.add_argument(
        "--business-key-prefix",
        default="test-instance",
        help="Only affect instances with business keys like this prefix. Default: test-instance"
    )

    parser.add_argument(
        "--all-for-process",
        action="store_true",
        help="Consider all running instances for this process and tenant, ignoring business key prefix."
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of process instances to fetch per page. Default: 100"
    )

    parser.add_argument(
        "--worker-id",
        default=DEFAULT_WORKER_ID,
        help=f"Worker id used to lock and complete external tasks. Default: {DEFAULT_WORKER_ID}"
    )

    parser.add_argument(
        "--lock-duration-ms",
        type=int,
        default=60000,
        help="External task lock duration in milliseconds. Default: 60000"
    )

    parser.add_argument(
        "--seed",
        type=int,
        help="Optional random seed for reproducible selection."
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
        help="Actually complete external tasks. Without this flag, the script only performs a dry run."
    )

    args = parser.parse_args()

    if args.chance < 0 or args.chance > 1:
        print("--chance must be between 0 and 1")
        sys.exit(1)

    if args.all_for_process:
        args.business_key_prefix = None

    if args.seed is not None:
        random.seed(args.seed)

    auth = get_auth(args)

    print("Searching for running process instances...")
    print(f"Tenant: {args.tenant}")

    if args.process_definition_id:
        print(f"Process definition ID: {args.process_definition_id}")
    else:
        print(f"Process key: {args.process_key}")

    if args.business_key_prefix:
        print(f"Business key filter: {args.business_key_prefix}-%")
    else:
        print("Business key filter: none")

    print(f"From external task topic: {args.from_topic}")
    print("Target state after completion: beoordeling")
    print(f"Chance: {args.chance * 100:.1f}%")
    print(f"Mode: {'COMPLETE TASKS' if args.execute else 'DRY RUN'}")
    print()

    instances = fetch_all_instances(
        base_url=args.base_url,
        args=args,
        auth=auth
    )

    if not instances:
        print("No matching running process instances found.")
        return

    def sort_key(instance):
        parsed_index = parse_index_from_business_key(instance.get("businessKey"))
        if parsed_index is not None:
            return parsed_index
        return 999999999

    instances.sort(key=sort_key)

    selected_count = 0
    completed_count = 0
    skipped_count = 0

    for fallback_index, instance in enumerate(instances, start=1):
        instance_id = instance.get("id")
        business_key = instance.get("businessKey")
        definition_id = instance.get("definitionId")

        parsed_index = parse_index_from_business_key(business_key)
        display_index = parsed_index if parsed_index is not None else fallback_index

        activity_tree = fetch_activity_instance_tree(
            base_url=args.base_url,
            instance_id=instance_id,
            auth=auth
        )

        active_activity_ids = collect_active_activity_ids(activity_tree)

        if args.from_topic not in active_activity_ids:
            print(
                f"Skipping index={display_index} "
                f"id={instance_id} "
                f"businessKey={business_key} "
                f"because current state is {active_activity_ids}, not {args.from_topic}"
            )
            skipped_count += 1
            continue

        roll = random.random()

        if roll >= args.chance:
            print(
                f"Skipping index={display_index} "
                f"id={instance_id} "
                f"businessKey={business_key} "
                f"currentState={active_activity_ids} "
                f"roll={roll:.4f}"
            )
            skipped_count += 1
            continue

        selected_count += 1

        external_tasks = fetch_external_tasks_for_instance(
            base_url=args.base_url,
            instance_id=instance_id,
            topic_name=args.from_topic,
            auth=auth
        )

        if not external_tasks:
            print(
                f"No unlocked external task found for index={display_index} "
                f"id={instance_id} "
                f"businessKey={business_key} "
                f"topic={args.from_topic}"
            )
            skipped_count += 1
            continue

        external_task = external_tasks[0]
        external_task_id = external_task.get("id")

        print(
            f"{'Would complete' if not args.execute else 'Completing'} "
            f"index={display_index} "
            f"id={instance_id} "
            f"businessKey={business_key} "
            f"definitionId={definition_id} "
            f"externalTaskId={external_task_id} "
            f"from={args.from_topic} "
            f"to=beoordeling "
            f"roll={roll:.4f}"
        )

        if args.execute:
            lock_external_task(
                base_url=args.base_url,
                external_task_id=external_task_id,
                worker_id=args.worker_id,
                lock_duration_ms=args.lock_duration_ms,
                auth=auth
            )

            complete_external_task(
                base_url=args.base_url,
                external_task_id=external_task_id,
                worker_id=args.worker_id,
                auth=auth
            )

            completed_count += 1

    print()
    print(f"Matching running instances: {len(instances)}")
    print(f"Randomly selected:         {selected_count}")
    print(f"Skipped:                   {skipped_count}")

    if args.execute:
        print(f"Completed external tasks:  {completed_count}")
        print("Selected instances should now be at state: beoordeling")
    else:
        print("Dry run complete. Run again with --execute to actually complete external tasks.")


if __name__ == "__main__":
    main()