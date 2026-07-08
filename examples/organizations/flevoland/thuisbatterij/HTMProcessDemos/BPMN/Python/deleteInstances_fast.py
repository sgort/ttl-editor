# deleteInstances_fast.py
#
# Fast deletion of Operaton/Camunda 7 process instances.
#
# Examples:
#   Dry-run count only:
#     python .\deleteInstances_fast.py --username YOUR_USER --password YOUR_PASSWORD
#
#   Fastest: create one async delete batch based on the query:
#     python .\deleteInstances_fast.py --username YOUR_USER --password YOUR_PASSWORD --execute
#
#   Fallback: first collect ids, then submit async delete batches of ids:
#     python .\deleteInstances_fast.py --username YOUR_USER --password YOUR_PASSWORD --execute --mode ids --batch-size 500

import argparse
import sys
import time
from typing import Any, Dict, List, Optional

import requests
from requests.auth import HTTPBasicAuth


DEFAULT_BASE_URL = "https://operaton.open-regels.nl/engine-rest/engine/default"
DEFAULT_PROCESS_KEY = "processAanvraagInfoBezwaar"
DEFAULT_TENANT_ID = "48"


class RestError(RuntimeError):
    pass


def bool_str(value: bool) -> str:
    return "true" if value else "false"


def make_auth(args: argparse.Namespace) -> Optional[HTTPBasicAuth]:
    if args.username or args.password:
        if not args.username or not args.password:
            print("Both --username and --password are required when using basic auth.")
            sys.exit(1)
        return HTTPBasicAuth(args.username, args.password)
    return None


def make_session(args: argparse.Namespace) -> requests.Session:
    session = requests.Session()
    auth = make_auth(args)
    if auth:
        session.auth = auth
    session.headers.update({"Accept": "application/json"})
    return session


def build_query_params(args: argparse.Namespace, *, first_result: int = 0) -> Dict[str, Any]:
    """Query params for GET /process-instance and /process-instance/count."""
    params: Dict[str, Any] = {
        "tenantIdIn": args.tenant,
        "firstResult": first_result,
        "maxResults": args.batch_size,
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


def build_count_params(args: argparse.Namespace) -> Dict[str, Any]:
    params = build_query_params(args)
    params.pop("firstResult", None)
    params.pop("maxResults", None)
    return params


def build_process_instance_query(args: argparse.Namespace) -> Dict[str, Any]:
    """JSON query for POST /process-instance/delete.

    This is the important speed-up: the engine can create one batch from the query,
    so the client does not need to delete each instance individually.
    """
    query: Dict[str, Any] = {
        "tenantIdIn": [args.tenant],
    }

    if args.process_definition_id:
        query["processDefinitionId"] = args.process_definition_id
    else:
        query["processDefinitionKey"] = args.process_key

    if not args.all_for_process:
        query["businessKeyLike"] = f"{args.business_key_prefix}-%"

    return query


def request_json(
    session: requests.Session,
    method: str,
    url: str,
    *,
    timeout: int,
    **kwargs: Any,
) -> Any:
    response = session.request(method, url, timeout=timeout, **kwargs)
    if response.status_code not in (200, 204):
        raise RestError(f"{method} {url} failed. HTTP {response.status_code}: {response.text}")
    if response.status_code == 204 or not response.text.strip():
        return None
    return response.json()


def fetch_count(session: requests.Session, base_url: str, args: argparse.Namespace) -> int:
    url = f"{base_url.rstrip('/')}/process-instance/count"
    data = request_json(
        session,
        "GET",
        url,
        params=build_count_params(args),
        timeout=args.timeout,
    )
    return int(data.get("count", 0))


def fetch_instances_page(
    session: requests.Session,
    base_url: str,
    args: argparse.Namespace,
    *,
    first_result: int,
) -> List[Dict[str, Any]]:
    url = f"{base_url.rstrip('/')}/process-instance"
    data = request_json(
        session,
        "GET",
        url,
        params=build_query_params(args, first_result=first_result),
        timeout=args.timeout,
    )
    return data or []


def fetch_sample(session: requests.Session, base_url: str, args: argparse.Namespace) -> List[Dict[str, Any]]:
    original_batch_size = args.batch_size
    args.batch_size = min(args.sample_size, original_batch_size)
    try:
        return fetch_instances_page(session, base_url, args, first_result=0)
    finally:
        args.batch_size = original_batch_size


def chunked(items: List[str], size: int) -> List[List[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def start_async_delete_by_query(
    session: requests.Session,
    base_url: str,
    args: argparse.Namespace,
) -> Any:
    url = f"{base_url.rstrip('/')}/process-instance/delete"
    body = {
        "processInstanceQuery": build_process_instance_query(args),
        "deleteReason": args.delete_reason,
        "skipCustomListeners": args.skip_custom_listeners,
        "skipIoMappings": args.skip_io_mappings,
        "skipSubprocesses": args.skip_subprocesses,
        "failIfNotExists": False,
    }
    return request_json(session, "POST", url, json=body, timeout=args.timeout)


def collect_instance_ids(
    session: requests.Session,
    base_url: str,
    args: argparse.Namespace,
) -> List[str]:
    ids: List[str] = []
    first_result = 0

    while True:
        instances = fetch_instances_page(session, base_url, args, first_result=first_result)
        if not instances:
            break

        for instance in instances:
            instance_id = instance.get("id")
            if instance_id:
                ids.append(instance_id)

        if len(instances) < args.batch_size:
            break

        first_result += args.batch_size

    return ids


def submit_delete_batch_for_ids(
    session: requests.Session,
    base_url: str,
    args: argparse.Namespace,
    ids: List[str],
) -> Any:
    url = f"{base_url.rstrip('/')}/process-instance/delete"
    body = {
        "processInstanceIds": ids,
        "deleteReason": args.delete_reason,
        "skipCustomListeners": args.skip_custom_listeners,
        "skipIoMappings": args.skip_io_mappings,
        "skipSubprocesses": args.skip_subprocesses,
        "failIfNotExists": False,
    }
    return request_json(session, "POST", url, json=body, timeout=args.timeout)


def print_scope(args: argparse.Namespace) -> None:
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
    print(f"Delete strategy: {args.mode}")
    print()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fast delete running Operaton/Camunda 7 process instances."
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
        help="Optional exact process definition ID from Cockpit. If provided, this overrides --process-key.",
    )

    parser.add_argument(
        "--tenant",
        default=DEFAULT_TENANT_ID,
        help=f"Tenant ID. Default: {DEFAULT_TENANT_ID}",
    )

    parser.add_argument(
        "--business-key-prefix",
        default="test-instance",
        help="Only delete instances with business keys like this prefix. Default: test-instance",
    )

    parser.add_argument(
        "--all-for-process",
        action="store_true",
        help="Delete ALL running instances for this process and tenant, ignoring business key prefix.",
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Batch size for id-based fallback mode. Default: 500",
    )

    parser.add_argument("--username", help="Basic auth username")
    parser.add_argument("--password", help="Basic auth password")

    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually delete instances. Without this flag, the script only performs a dry run.",
    )

    parser.add_argument(
        "--mode",
        choices=("query", "ids"),
        default="query",
        help=(
            "query = fastest: one async delete batch using the processInstanceQuery. "
            "ids = fallback: collect ids first, then submit id batches. Default: query"
        ),
    )

    parser.add_argument(
        "--delete-reason",
        default="Bulk cleanup from deleteInstances_fast.py",
        help="Delete reason stored in engine history/user operation log.",
    )

    parser.add_argument(
        "--skip-custom-listeners",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Skip custom listeners. Default: true",
    )

    parser.add_argument(
        "--skip-io-mappings",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Skip input/output mappings. Default: true",
    )

    parser.add_argument(
        "--skip-subprocesses",
        action=argparse.BooleanOptionalAction,
        default=False,
        help="Skip subprocess deletion. Default: false",
    )

    parser.add_argument(
        "--timeout",
        type=int,
        default=60,
        help="HTTP timeout in seconds. Default: 60",
    )

    parser.add_argument(
        "--sample-size",
        type=int,
        default=10,
        help="Number of example instances to show in dry run. Default: 10",
    )

    parser.add_argument(
        "--no-sample",
        action="store_true",
        help="Do not print sample instances during dry run.",
    )

    args = parser.parse_args()

    if args.batch_size < 1:
        print("--batch-size must be at least 1")
        sys.exit(1)

    base_url = args.base_url.rstrip("/")
    session = make_session(args)

    print_scope(args)

    try:
        count = fetch_count(session, base_url, args)
        print(f"Matching running instances: {count}")

        if not args.execute:
            if count and not args.no_sample:
                print()
                print(f"Sample, max {args.sample_size}:")
                for instance in fetch_sample(session, base_url, args):
                    print(
                        f"  id={instance.get('id')} "
                        f"definitionId={instance.get('definitionId')} "
                        f"businessKey={instance.get('businessKey')}"
                    )
            print()
            print("Dry run complete. Run again with --execute to actually delete them.")
            return

        if count == 0:
            print("Nothing to delete.")
            return

        started_at = time.perf_counter()

        if args.mode == "query":
            print("Creating one async delete batch from the query...")
            batch = start_async_delete_by_query(session, base_url, args)
            elapsed = time.perf_counter() - started_at
            print("Delete batch submitted.")
            if batch:
                print(f"Batch id: {batch.get('id')}")
                print(f"Total jobs: {batch.get('totalJobs')}")
                print(f"Batch jobs created: {batch.get('batchJobsPerSeed')}")
                print(f"Invocations per batch job: {batch.get('invocationsPerBatchJob')}")
            print(f"Client-side time: {elapsed:.2f} seconds")
            print("The engine job executor will perform the actual deletions asynchronously.")
            return

        print("Collecting instance ids...")
        ids = collect_instance_ids(session, base_url, args)
        print(f"Collected {len(ids)} ids. Submitting delete batches...")

        batches = chunked(ids, args.batch_size)
        for index, id_batch in enumerate(batches, start=1):
            batch = submit_delete_batch_for_ids(session, base_url, args, id_batch)
            batch_id = batch.get("id") if batch else "n/a"
            print(f"Submitted batch {index}/{len(batches)} with {len(id_batch)} ids. Batch id: {batch_id}")

        elapsed = time.perf_counter() - started_at
        print(f"Done. Submitted {len(batches)} async delete batch request(s) for {len(ids)} instances.")
        print(f"Client-side time: {elapsed:.2f} seconds")
        print("The engine job executor will perform the actual deletions asynchronously.")

    except RestError as exc:
        print(str(exc))
        print()
        print("If query mode fails because your Operaton/Camunda version does not accept processInstanceQuery here, retry with:")
        print("  --mode ids --batch-size 500")
        sys.exit(1)
    except requests.RequestException as exc:
        print(f"HTTP request failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
