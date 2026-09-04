# start_process_instances_tenant48.py

#python .\start_process_instances_tenant48.py --tenant 48 --count 10

import argparse
import sys
import requests
from requests.auth import HTTPBasicAuth


DEFAULT_BASE_URL = "https://operaton.open-regels.nl/engine-rest/engine/default"
DEFAULT_PROCESS_KEY = "processAanvraagInfoBezwaar"
DEFAULT_TENANT_ID = "48"


def start_instance(base_url, process_key, tenant_id, auth=None, business_key_prefix=None, index=None):
    url = (
        f"{base_url.rstrip('/')}"
        f"/process-definition/key/{process_key}/tenant-id/{tenant_id}/start"
    )

    payload = {
        "variables": {}
    }

    if business_key_prefix:
        payload["businessKey"] = f"{business_key_prefix}-{index}"

    response = requests.post(url, json=payload, auth=auth)

    if response.status_code not in (200, 201):
        raise RuntimeError(
            f"Failed to start instance {index}. "
            f"HTTP {response.status_code}: {response.text}"
        )

    return response.json()


def main():
    parser = argparse.ArgumentParser(
        description="Start multiple Operaton/Camunda 7 process instances for a tenant."
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
        "--tenant",
        default=DEFAULT_TENANT_ID,
        help=f"Tenant ID. Default: {DEFAULT_TENANT_ID}"
    )

    parser.add_argument(
        "--count",
        type=int,
        default=10,
        help="Number of instances to start. Default: 10"
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
        "--business-key-prefix",
        default="test-instance",
        help="Prefix for generated business keys. Use empty string to disable."
    )

    args = parser.parse_args()

    auth = None
    if args.username or args.password:
        if not args.username or not args.password:
            print("Both --username and --password are required when using basic auth.")
            sys.exit(1)
        auth = HTTPBasicAuth(args.username, args.password)

    started = []

    for i in range(1, args.count + 1):
        business_key_prefix = args.business_key_prefix or None

        result = start_instance(
            base_url=args.base_url,
            process_key=args.process_key,
            tenant_id=args.tenant,
            auth=auth,
            business_key_prefix=business_key_prefix,
            index=i
        )

        started.append(result)
        print(
            f"Started instance {i}: "
            f"id={result.get('id')} "
            f"definitionId={result.get('definitionId')} "
            f"businessKey={result.get('businessKey')}"
        )

    print(f"\nDone. Started {len(started)} process instances for tenant {args.tenant}.")


if __name__ == "__main__":
    main()