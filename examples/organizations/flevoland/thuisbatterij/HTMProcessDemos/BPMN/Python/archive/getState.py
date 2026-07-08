# show_process_instance_states_tenant48.py

#python .\getState.py  --username YOUR_USER --password YOUR_PASSWORD --summary

import argparse
import re
import sys
import requests
from requests.auth import HTTPBasicAuth


DEFAULT_BASE_URL = "https://operaton.open-regels.nl/engine-rest/engine/default"
DEFAULT_PROCESS_KEY = "processAanvraagInfoBezwaar"
DEFAULT_TENANT_ID = "48"


INTERESTING_VARIABLES = [
    "subsidyAmount",
    "needsExtraInformation",
    "willComplain",
    "eligibleInitial",
    "eligibleAfterComplaint",
    "originalSubmissionStart",
    "evaluationStart",
    "extraInformationStart",
    "complaintStart",
    "submissionDuration",
    "evaluationDuration",
    "extraInformationDuration",
    "complaintDuration",
]


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


def flatten_activity_tree(activity_tree):
    """
    Recursively extract active BPMN activities from the activity-instance tree.
    """
    result = []

    def walk(node):
        activity_id = node.get("activityId")
        activity_name = node.get("activityName")
        activity_type = node.get("activityType")

        if activity_id:
            result.append({
                "activityId": activity_id,
                "activityName": activity_name,
                "activityType": activity_type,
            })

        for child in node.get("childActivityInstances", []):
            walk(child)

        for child in node.get("childTransitionInstances", []):
            transition_activity_id = child.get("activityId")
            transition_activity_name = child.get("activityName")
            transition_activity_type = child.get("activityType")

            if transition_activity_id:
                result.append({
                    "activityId": transition_activity_id,
                    "activityName": transition_activity_name,
                    "activityType": f"transition:{transition_activity_type}",
                })

    walk(activity_tree)

    # Remove the root process entry if there are child activities.
    if len(result) > 1:
        result = [
            item for item in result
            if item["activityType"] != "processDefinition"
        ]

    return result


def fetch_activity_state(base_url, instance_id, auth=None):
    url = f"{base_url.rstrip('/')}/process-instance/{instance_id}/activity-instances"
    tree = request_json("GET", url, auth=auth)

    if not tree:
        return []

    return flatten_activity_tree(tree)


def fetch_tasks(base_url, instance_id, auth=None):
    url = f"{base_url.rstrip('/')}/task"

    params = {
        "processInstanceId": instance_id
    }

    return request_json("GET", url, auth=auth, params=params) or []


def fetch_incidents(base_url, instance_id, auth=None):
    url = f"{base_url.rstrip('/')}/incident"

    params = {
        "processInstanceId": instance_id
    }

    return request_json("GET", url, auth=auth, params=params) or []


def fetch_variables(base_url, instance_id, auth=None):
    url = f"{base_url.rstrip('/')}/process-instance/{instance_id}/variables"

    params = {
        "deserializeValues": "false"
    }

    variables = request_json("GET", url, auth=auth, params=params) or {}

    filtered = {}

    for name in INTERESTING_VARIABLES:
        if name in variables:
            filtered[name] = variables[name].get("value")

    return filtered


def format_activity(activity):
    activity_id = activity.get("activityId")
    activity_name = activity.get("activityName")
    activity_type = activity.get("activityType")

    if activity_name:
        return f"{activity_name} [{activity_id}, {activity_type}]"

    return f"{activity_id} [{activity_type}]"


def print_instance_state(index, instance, state, summary=False):
    print("=" * 100)
    print(f"Instance #{index}")
    print(f"Instance id:     {instance.get('id')}")
    print(f"Business key:    {instance.get('businessKey')}")
    print(f"Definition id:   {instance.get('definitionId')}")
    print(f"Tenant id:       {instance.get('tenantId')}")
    print()

    activities = state["activities"]

    print("Current BPMN state:")
    if activities:
        for activity in activities:
            print(f"  - {format_activity(activity)}")
    else:
        print("  - No active activity found. The instance may have completed or be in transition.")
    print()

    if summary:
        return

    tasks = state["tasks"]
    incidents = state["incidents"]
    variables = state["variables"]

    print("Active user tasks:")
    if tasks:
        for task in tasks:
            task_name = task.get("name")
            task_key = task.get("taskDefinitionKey")
            assignee = task.get("assignee")
            created = task.get("created")

            print(
                f"  - {task_name} "
                f"[key={task_key}, assignee={assignee}, created={created}]"
            )
    else:
        print("  - None")
    print()

    print("Incidents:")
    if incidents:
        for incident in incidents:
            print(
                f"  - {incident.get('incidentType')} "
                f"at {incident.get('activityId')}: "
                f"{incident.get('incidentMessage')}"
            )
    else:
        print("  - None")
    print()

    print("Selected variables:")
    if variables:
        for name, value in variables.items():
            print(f"  - {name}: {value}")
    else:
        print("  - None found")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Show the current state of running Operaton/Camunda process instances."
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
        "--business-key-prefix",
        default="test-instance",
        help="Only show instances with business keys like this prefix. Default: test-instance"
    )

    parser.add_argument(
        "--all-for-process",
        action="store_true",
        help="Show all running instances for this process and tenant, ignoring business key prefix."
    )

    parser.add_argument(
        "--summary",
        action="store_true",
        help="Only show the Current BPMN state per process instance."
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of process instances to fetch per page. Default: 100"
    )

    parser.add_argument(
        "--username",
        help="Basic auth username"
    )

    parser.add_argument(
        "--password",
        help="Basic auth password"
    )

    args = parser.parse_args()

    if args.all_for_process:
        args.business_key_prefix = None

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

    if args.summary:
        print("Output mode: summary, only Current BPMN state")
    else:
        print("Output mode: full")

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

    for fallback_index, instance in enumerate(instances, start=1):
        instance_id = instance.get("id")

        parsed_index = parse_index_from_business_key(instance.get("businessKey"))
        display_index = parsed_index if parsed_index is not None else fallback_index

        if args.summary:
            state = {
                "activities": fetch_activity_state(args.base_url, instance_id, auth=auth),
            }
        else:
            state = {
                "activities": fetch_activity_state(args.base_url, instance_id, auth=auth),
                "tasks": fetch_tasks(args.base_url, instance_id, auth=auth),
                "incidents": fetch_incidents(args.base_url, instance_id, auth=auth),
                "variables": fetch_variables(args.base_url, instance_id, auth=auth),
            }

        print_instance_state(
            index=display_index,
            instance=instance,
            state=state,
            summary=args.summary
        )

    print(f"Found {len(instances)} matching running process instances.")


if __name__ == "__main__":
    main()