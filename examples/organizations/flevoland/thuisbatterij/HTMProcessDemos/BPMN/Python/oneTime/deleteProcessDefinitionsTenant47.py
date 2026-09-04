import argparse
import sys
from typing import Any

import requests
from requests.auth import HTTPBasicAuth


def get_json(session: requests.Session, url: str, params: dict[str, Any]) -> list[dict[str, Any]]:
    response = session.get(url, params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def list_process_definitions(
    session: requests.Session,
    base_url: str,
    tenant_id: str,
    page_size: int = 100,
) -> list[dict[str, Any]]:
    """
    Lists all process definitions for a tenant.
    Uses pagination in case there are many definitions.
    """
    all_defs: list[dict[str, Any]] = []
    first_result = 0

    while True:
        params = {
            "tenantIdIn": tenant_id,
            "firstResult": first_result,
            "maxResults": page_size,
            "sortBy": "key",
            "sortOrder": "asc",
        }

        batch = get_json(
            session,
            f"{base_url.rstrip('/')}/process-definition",
            params=params,
        )

        if not batch:
            break

        all_defs.extend(batch)

        if len(batch) < page_size:
            break

        first_result += page_size

    return all_defs


def delete_process_definition(
    session: requests.Session,
    base_url: str,
    definition_id: str,
    cascade: bool,
    skip_custom_listeners: bool,
    skip_io_mappings: bool,
) -> None:
    params = {
        "cascade": str(cascade).lower(),
        "skipCustomListeners": str(skip_custom_listeners).lower(),
        "skipIoMappings": str(skip_io_mappings).lower(),
    }

    response = session.delete(
        f"{base_url.rstrip('/')}/process-definition/{definition_id}",
        params=params,
        timeout=30,
    )
    response.raise_for_status()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Delete all Operaton/Camunda 7 process definitions for a given tenant."
    )

    parser.add_argument(
        "--base-url",
        default="https://operaton.open-regels.nl/engine-rest/engine/default",
        help="Operaton REST base URL. Default: %(default)s",
    )
    parser.add_argument("--tenant", default="47", help="Tenant ID to delete. Default: 47")
    parser.add_argument("--username", required=True, help="Basic auth username")
    parser.add_argument("--password", required=True, help="Basic auth password")

    parser.add_argument(
        "--cascade",
        action="store_true",
        help="Also delete running process instances, historic process instances, and jobs for the definitions.",
    )
    parser.add_argument(
        "--skip-custom-listeners",
        action="store_true",
        help="Skip custom execution listeners during deletion.",
    )
    parser.add_argument(
        "--skip-io-mappings",
        action="store_true",
        help="Skip input/output mappings during deletion.",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually delete. Without this flag, the script only does a dry run.",
    )

    args = parser.parse_args()

    session = requests.Session()
    session.auth = HTTPBasicAuth(args.username, args.password)
    session.headers.update({"Accept": "application/json"})

    print(f"REST base URL: {args.base_url}")
    print(f"Tenant ID: {args.tenant}")
    print(f"Mode: {'DELETE' if args.execute else 'DRY RUN'}")
    print()

    try:
        definitions = list_process_definitions(
            session=session,
            base_url=args.base_url,
            tenant_id=args.tenant,
        )
    except requests.HTTPError as e:
        print(f"Failed to list process definitions: {e}", file=sys.stderr)
        if e.response is not None:
            print(e.response.text, file=sys.stderr)
        return 1

    if not definitions:
        print(f"No process definitions found for tenant {args.tenant}.")
        return 0

    print(f"Found {len(definitions)} process definition(s):")
    for d in definitions:
        print(
            f"- id={d.get('id')} | key={d.get('key')} | "
            f"name={d.get('name')} | version={d.get('version')} | "
            f"tenantId={d.get('tenantId')} | deploymentId={d.get('deploymentId')}"
        )

    print()

    if not args.execute:
        print("Dry run only. Add --execute to actually delete these definitions.")
        print("Add --cascade if there are running/historic instances that must also be removed.")
        return 0

    confirm_text = f"DELETE TENANT {args.tenant}"
    typed = input(f'Type "{confirm_text}" to confirm deletion: ').strip()

    if typed != confirm_text:
        print("Confirmation did not match. Aborting.")
        return 1

    failures = 0

    for d in definitions:
        definition_id = d["id"]
        try:
            delete_process_definition(
                session=session,
                base_url=args.base_url,
                definition_id=definition_id,
                cascade=args.cascade,
                skip_custom_listeners=args.skip_custom_listeners,
                skip_io_mappings=args.skip_io_mappings,
            )
            print(f"Deleted: {definition_id}")
        except requests.HTTPError as e:
            failures += 1
            print(f"FAILED: {definition_id} -> {e}", file=sys.stderr)
            if e.response is not None:
                print(e.response.text, file=sys.stderr)

    print()
    print(f"Done. Deleted: {len(definitions) - failures}, Failed: {failures}")

    return 0 if failures == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())