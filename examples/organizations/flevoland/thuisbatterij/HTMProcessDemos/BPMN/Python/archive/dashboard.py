# dashboard.py
#
# Standalone Flask dashboard for Operaton/Camunda process instance status.
#
# Example:
#   python .\dashboard.py --username YOUR_USER --password YOUR_PASSWORD
#
# Then open:
#   http://127.0.0.1:5050
#
# Install dependencies if needed:
#   pip install flask requests

import argparse
import datetime as dt
import re
import sys
from collections import Counter

import requests
from flask import Flask, jsonify, render_template_string
from requests.auth import HTTPBasicAuth


DEFAULT_BASE_URL = "https://operaton.open-regels.nl/engine-rest/engine/default"
DEFAULT_PROCESS_KEY = "processAanvraagInfoBezwaar"
DEFAULT_TENANT_ID = "48"
DEFAULT_BUSINESS_KEY_PREFIX = "test-instance"
DEFAULT_REFRESH_SECONDS = 20
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 5050


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


app = Flask(__name__)
APP_CONFIG = None
AUTH = None


DASHBOARD_HTML = r"""
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Operaton Process Dashboard</title>
  <style>
    :root {
      --bg: #0f172a;
      --panel: #111827;
      --panel-2: #1f2937;
      --text: #e5e7eb;
      --muted: #9ca3af;
      --border: #374151;
      --accent: #38bdf8;
      --ok: #22c55e;
      --warn: #f59e0b;
      --bad: #ef4444;
      --chip: #334155;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: radial-gradient(circle at top, #1e293b 0, var(--bg) 42%);
      color: var(--text);
    }

    header {
      padding: 22px 28px;
      border-bottom: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.88);
      position: sticky;
      top: 0;
      z-index: 10;
      backdrop-filter: blur(8px);
    }

    h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      line-height: 1.2;
    }

    .subhead {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      color: var(--muted);
      font-size: 14px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 9px;
      background: rgba(51, 65, 85, 0.9);
      border: 1px solid var(--border);
      border-radius: 999px;
      white-space: nowrap;
    }

    main {
      padding: 24px 28px 44px;
      max-width: 1800px;
      margin: 0 auto;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 18px;
    }

    .stat {
      background: rgba(17, 24, 39, 0.88);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 15px 16px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
    }

    .stat-label {
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 6px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
    }

    .panel {
      background: rgba(17, 24, 39, 0.88);
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      background: rgba(31, 41, 55, 0.76);
    }

    .panel-title {
      font-weight: 700;
    }

    .status-text {
      color: var(--muted);
      font-size: 14px;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-bottom: 14px;
    }

    input[type="search"] {
      width: min(520px, 100%);
      padding: 10px 12px;
      color: var(--text);
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid var(--border);
      border-radius: 10px;
      outline: none;
    }

    button {
      padding: 10px 12px;
      color: var(--text);
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 10px;
      cursor: pointer;
    }

    button:hover { border-color: var(--accent); }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    th, td {
      padding: 11px 12px;
      border-bottom: 1px solid rgba(55, 65, 81, 0.78);
      vertical-align: top;
      text-align: left;
    }

    th {
      color: var(--muted);
      font-weight: 600;
      background: rgba(15, 23, 42, 0.72);
      position: sticky;
      top: 94px;
      z-index: 5;
    }

    tr:hover td { background: rgba(56, 189, 248, 0.045); }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      color: #cbd5e1;
    }

    .state-chip {
      display: inline-flex;
      align-items: center;
      padding: 4px 8px;
      border-radius: 999px;
      background: var(--chip);
      border: 1px solid var(--border);
      margin: 0 4px 4px 0;
      font-size: 12px;
    }

    .state-ingediend { border-color: #60a5fa; }
    .state-beoordeling { border-color: #facc15; }
    .state-complete { border-color: var(--ok); }
    .state-incident { border-color: var(--bad); }

    .var-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(120px, 1fr));
      gap: 4px 10px;
      min-width: 320px;
    }

    .var-name {
      color: var(--muted);
      font-size: 12px;
    }

    .var-value {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }

    .error {
      display: none;
      padding: 12px 14px;
      margin-bottom: 14px;
      background: rgba(239, 68, 68, 0.14);
      border: 1px solid rgba(239, 68, 68, 0.6);
      border-radius: 12px;
      color: #fecaca;
      white-space: pre-wrap;
    }

    .empty {
      padding: 26px;
      color: var(--muted);
      text-align: center;
    }

    .small { font-size: 12px; color: var(--muted); }
  </style>
</head>
<body>
  <header>
    <h1>Operaton Process Dashboard</h1>
    <div class="subhead">
      <span class="pill">Tenant: <strong id="tenant">{{ tenant }}</strong></span>
      <span class="pill">Process key: <strong id="process-key">{{ process_key }}</strong></span>
      <span class="pill">Refresh: <strong id="refresh-seconds">{{ refresh_seconds }}</strong>s</span>
      <span class="pill">Next refresh in: <strong id="countdown">{{ refresh_seconds }}</strong>s</span>
      <span class="pill">Last updated: <strong id="last-updated">not yet</strong></span>
    </div>
  </header>

  <main>
    <div id="error" class="error"></div>

    <section class="stats">
      <div class="stat">
        <div class="stat-label">Running instances</div>
        <div class="stat-value" id="stat-instances">0</div>
      </div>
      <div class="stat">
        <div class="stat-label">Active user tasks</div>
        <div class="stat-value" id="stat-tasks">0</div>
      </div>
      <div class="stat">
        <div class="stat-label">Incidents</div>
        <div class="stat-value" id="stat-incidents">0</div>
      </div>
      <div class="stat">
        <div class="stat-label">States</div>
        <div class="stat-value" id="stat-states">0</div>
      </div>
    </section>

    <div class="toolbar">
      <input id="filter" type="search" placeholder="Filter by business key, state, task, variable, id...">
      <button id="refresh-now">Refresh now</button>
      <span class="small" id="result-count"></span>
    </div>

    <section class="panel" style="margin-bottom: 18px;">
      <div class="panel-header">
        <div class="panel-title">State summary</div>
        <div class="status-text" id="summary-status">Waiting for first refresh...</div>
      </div>
      <div id="state-summary" style="padding: 14px 16px;"></div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div class="panel-title">Process instances</div>
        <div class="status-text" id="table-status">Waiting for first refresh...</div>
      </div>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Business key</th>
              <th>Current BPMN state</th>
              <th>User tasks</th>
              <th>Incidents</th>
              <th>Selected variables</th>
              <th>Instance id</th>
            </tr>
          </thead>
          <tbody id="instance-body">
            <tr><td colspan="7" class="empty">Waiting for data...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>

<script>
const REFRESH_SECONDS = {{ refresh_seconds }};
let allRows = [];
let secondsLeft = REFRESH_SECONDS;
let countdownTimer = null;
let refreshTimer = null;

function text(value) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function escapeHtml(value) {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stateClass(label) {
  const lower = label.toLowerCase();
  if (lower.includes('ingediend')) return 'state-ingediend';
  if (lower.includes('beoordeling')) return 'state-beoordeling';
  if (lower.includes('incident')) return 'state-incident';
  if (lower.includes('complete')) return 'state-complete';
  return '';
}

function renderVariables(vars) {
  const entries = Object.entries(vars || {});
  if (!entries.length) return '<span class="small">None</span>';

  return '<div class="var-grid">' + entries.map(([key, value]) => `
    <div class="var-name">${escapeHtml(key)}</div>
    <div class="var-value">${escapeHtml(value)}</div>
  `).join('') + '</div>';
}

function renderActivities(activities) {
  if (!activities || !activities.length) {
    return '<span class="state-chip state-complete">No active activity</span>';
  }

  return activities.map(a => {
    const label = a.activityName || a.activityId || '-';
    const detail = a.activityId && a.activityName ? ` / ${a.activityId}` : '';
    const cls = stateClass(label + ' ' + detail);
    return `<span class="state-chip ${cls}" title="${escapeHtml(a.activityType || '')}">${escapeHtml(label)}<span class="small">${escapeHtml(detail)}</span></span>`;
  }).join('');
}

function renderTasks(tasks) {
  if (!tasks || !tasks.length) return '<span class="small">None</span>';

  return tasks.map(t => `
    <div>
      <strong>${escapeHtml(t.name || '-')}</strong><br>
      <span class="small">${escapeHtml(t.taskDefinitionKey || '-')} / ${escapeHtml(t.assignee || 'unassigned')}</span>
    </div>
  `).join('');
}

function renderIncidents(incidents) {
  if (!incidents || !incidents.length) return '<span class="small">None</span>';

  return incidents.map(i => `
    <div>
      <span class="state-chip state-incident">${escapeHtml(i.incidentType || 'incident')}</span><br>
      <span class="small">${escapeHtml(i.activityId || '-')}</span><br>
      <span class="small">${escapeHtml(i.incidentMessage || '')}</span>
    </div>
  `).join('');
}

function searchableText(row) {
  return JSON.stringify(row).toLowerCase();
}

function renderRows() {
  const body = document.getElementById('instance-body');
  const filter = document.getElementById('filter').value.trim().toLowerCase();
  const rows = filter ? allRows.filter(row => searchableText(row).includes(filter)) : allRows;

  document.getElementById('result-count').textContent = `${rows.length} shown / ${allRows.length} total`;

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty">No matching instances.</td></tr>';
    return;
  }

  body.innerHTML = rows.map(row => `
    <tr>
      <td>${escapeHtml(row.displayIndex)}</td>
      <td><strong>${escapeHtml(row.businessKey)}</strong><br><span class="small">definition: ${escapeHtml(row.definitionId)}</span></td>
      <td>${renderActivities(row.activities)}</td>
      <td>${renderTasks(row.tasks)}</td>
      <td>${renderIncidents(row.incidents)}</td>
      <td>${renderVariables(row.variables)}</td>
      <td class="mono">${escapeHtml(row.id)}</td>
    </tr>
  `).join('');
}

function renderStateSummary(summary) {
  const container = document.getElementById('state-summary');
  const entries = Object.entries(summary || {}).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    container.innerHTML = '<span class="small">No active states found.</span>';
    return;
  }

  container.innerHTML = entries.map(([state, count]) => {
    const cls = stateClass(state);
    return `<span class="state-chip ${cls}"><strong>${escapeHtml(count)}</strong>&nbsp;${escapeHtml(state)}</span>`;
  }).join('');
}

function setError(message) {
  const error = document.getElementById('error');
  if (!message) {
    error.style.display = 'none';
    error.textContent = '';
    return;
  }
  error.style.display = 'block';
  error.textContent = message;
}

function resetCountdown() {
  secondsLeft = REFRESH_SECONDS;
  document.getElementById('countdown').textContent = secondsLeft;
}

async function refreshData() {
  document.getElementById('summary-status').textContent = 'Refreshing...';
  document.getElementById('table-status').textContent = 'Refreshing...';

  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    allRows = data.instances || [];

    document.getElementById('tenant').textContent = data.config.tenant;
    document.getElementById('process-key').textContent = data.config.processKey;
    document.getElementById('last-updated').textContent = data.generatedAt;

    document.getElementById('stat-instances').textContent = data.counts.instances;
    document.getElementById('stat-tasks').textContent = data.counts.tasks;
    document.getElementById('stat-incidents').textContent = data.counts.incidents;
    document.getElementById('stat-states').textContent = Object.keys(data.stateSummary || {}).length;

    renderStateSummary(data.stateSummary);
    renderRows();

    document.getElementById('summary-status').textContent = 'OK';
    document.getElementById('table-status').textContent = 'OK';
    setError(null);
  } catch (err) {
    document.getElementById('summary-status').textContent = 'Error';
    document.getElementById('table-status').textContent = 'Error';
    setError(String(err.message || err));
  } finally {
    resetCountdown();
  }
}

function startTimers() {
  refreshData();

  countdownTimer = setInterval(() => {
    secondsLeft = Math.max(0, secondsLeft - 1);
    document.getElementById('countdown').textContent = secondsLeft;
  }, 1000);

  refreshTimer = setInterval(refreshData, REFRESH_SECONDS * 1000);
}

document.getElementById('filter').addEventListener('input', renderRows);
document.getElementById('refresh-now').addEventListener('click', refreshData);
startTimers();
</script>
</body>
</html>
"""


class DashboardArgs:
    """Simple object for passing selected fields to functions reused from getState.py style code."""

    def __init__(self, config):
        self.base_url = config.base_url
        self.process_key = config.process_key
        self.process_definition_id = config.process_definition_id
        self.tenant = config.tenant
        self.business_key_prefix = config.business_key_prefix
        self.batch_size = config.batch_size


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
    kwargs.setdefault("timeout", 15)
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

    return request_json("GET", url, auth=auth, params=params) or []


def fetch_all_instances(base_url, args, auth=None):
    all_instances = []
    first_result = 0

    while True:
        instances = fetch_instances(
            base_url=base_url,
            args=args,
            auth=auth,
            first_result=first_result,
        )

        if not instances:
            break

        all_instances.extend(instances)
        first_result += args.batch_size

    return all_instances


def flatten_activity_tree(activity_tree):
    """Recursively extract active BPMN activities from the activity-instance tree."""
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

        for child in node.get("childActivityInstances", []) or []:
            walk(child)

        for child in node.get("childTransitionInstances", []) or []:
            transition_activity_id = child.get("activityId")
            transition_activity_name = child.get("activityName")
            transition_activity_type = child.get("activityType")

            if transition_activity_id:
                result.append({
                    "activityId": transition_activity_id,
                    "activityName": transition_activity_name,
                    "activityType": f"transition:{transition_activity_type}",
                })

    if activity_tree:
        walk(activity_tree)

    # Remove the root process entry if there are child activities.
    if len(result) > 1:
        result = [
            item for item in result
            if item.get("activityType") != "processDefinition"
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
    params = {"processInstanceId": instance_id}
    return request_json("GET", url, auth=auth, params=params) or []


def fetch_incidents(base_url, instance_id, auth=None):
    url = f"{base_url.rstrip('/')}/incident"
    params = {"processInstanceId": instance_id}
    return request_json("GET", url, auth=auth, params=params) or []


def fetch_variables(base_url, instance_id, auth=None):
    url = f"{base_url.rstrip('/')}/process-instance/{instance_id}/variables"
    params = {"deserializeValues": "false"}
    variables = request_json("GET", url, auth=auth, params=params) or {}

    filtered = {}
    for name in INTERESTING_VARIABLES:
        if name in variables:
            filtered[name] = variables[name].get("value")

    return filtered


def simplify_tasks(tasks):
    simplified = []
    for task in tasks or []:
        simplified.append({
            "id": task.get("id"),
            "name": task.get("name"),
            "taskDefinitionKey": task.get("taskDefinitionKey"),
            "assignee": task.get("assignee"),
            "created": task.get("created"),
        })
    return simplified


def simplify_incidents(incidents):
    simplified = []
    for incident in incidents or []:
        simplified.append({
            "incidentType": incident.get("incidentType"),
            "activityId": incident.get("activityId"),
            "incidentMessage": incident.get("incidentMessage"),
        })
    return simplified


def activity_label(activity):
    name = activity.get("activityName")
    activity_id = activity.get("activityId")
    if name and activity_id:
        return f"{name} [{activity_id}]"
    return name or activity_id or "Unknown"


def get_dashboard_status():
    args = DashboardArgs(APP_CONFIG)
    instances = fetch_all_instances(APP_CONFIG.base_url, args, auth=AUTH)

    def sort_key(instance):
        parsed_index = parse_index_from_business_key(instance.get("businessKey"))
        if parsed_index is not None:
            return (0, parsed_index)
        return (1, instance.get("businessKey") or instance.get("id") or "")

    instances.sort(key=sort_key)

    rows = []
    state_counter = Counter()
    total_tasks = 0
    total_incidents = 0

    for fallback_index, instance in enumerate(instances, start=1):
        instance_id = instance.get("id")
        parsed_index = parse_index_from_business_key(instance.get("businessKey"))
        display_index = parsed_index if parsed_index is not None else fallback_index

        activities = fetch_activity_state(APP_CONFIG.base_url, instance_id, auth=AUTH)
        tasks = fetch_tasks(APP_CONFIG.base_url, instance_id, auth=AUTH)
        incidents = fetch_incidents(APP_CONFIG.base_url, instance_id, auth=AUTH)
        variables = fetch_variables(APP_CONFIG.base_url, instance_id, auth=AUTH)

        if activities:
            for activity in activities:
                state_counter[activity_label(activity)] += 1
        else:
            state_counter["No active activity"] += 1

        total_tasks += len(tasks)
        total_incidents += len(incidents)

        rows.append({
            "displayIndex": display_index,
            "id": instance_id,
            "businessKey": instance.get("businessKey"),
            "definitionId": instance.get("definitionId"),
            "tenantId": instance.get("tenantId"),
            "activities": activities,
            "tasks": simplify_tasks(tasks),
            "incidents": simplify_incidents(incidents),
            "variables": variables,
        })

    return {
        "ok": True,
        "generatedAt": dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "config": {
            "tenant": APP_CONFIG.tenant,
            "processKey": APP_CONFIG.process_key,
            "processDefinitionId": APP_CONFIG.process_definition_id,
            "businessKeyPrefix": APP_CONFIG.business_key_prefix,
            "refreshSeconds": APP_CONFIG.refresh_seconds,
        },
        "counts": {
            "instances": len(rows),
            "tasks": total_tasks,
            "incidents": total_incidents,
        },
        "stateSummary": dict(state_counter),
        "instances": rows,
    }


@app.route("/")
def index():
    return render_template_string(
        DASHBOARD_HTML,
        tenant=APP_CONFIG.tenant,
        process_key=APP_CONFIG.process_key,
        refresh_seconds=APP_CONFIG.refresh_seconds,
    )


@app.route("/api/status")
def api_status():
    try:
        return jsonify(get_dashboard_status())
    except Exception as exc:
        return jsonify({
            "ok": False,
            "error": str(exc),
            "generatedAt": dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }), 500


def parse_args():
    parser = argparse.ArgumentParser(
        description="Standalone Flask dashboard for Operaton/Camunda process instance status."
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
        help="Optional exact process definition ID from Cockpit. Overrides --process-key.",
    )

    parser.add_argument(
        "--tenant",
        default=DEFAULT_TENANT_ID,
        help=f"Tenant ID. Default: {DEFAULT_TENANT_ID}",
    )

    parser.add_argument(
        "--business-key-prefix",
        default=DEFAULT_BUSINESS_KEY_PREFIX,
        help=f"Only show instances with business keys like this prefix. Default: {DEFAULT_BUSINESS_KEY_PREFIX}",
    )

    parser.add_argument(
        "--all-for-process",
        action="store_true",
        help="Show all running instances for this process and tenant, ignoring business key prefix.",
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of process instances to fetch per page. Default: 100",
    )

    parser.add_argument(
        "--refresh-seconds",
        type=int,
        default=DEFAULT_REFRESH_SECONDS,
        help=f"Browser refresh interval in seconds. Default: {DEFAULT_REFRESH_SECONDS}",
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
        "--host",
        default=DEFAULT_HOST,
        help=f"Flask host. Default: {DEFAULT_HOST}",
    )

    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"Flask port. Default: {DEFAULT_PORT}",
    )

    args = parser.parse_args()

    if args.all_for_process:
        args.business_key_prefix = None

    if args.refresh_seconds < 1:
        print("--refresh-seconds must be at least 1")
        sys.exit(1)

    return args


if __name__ == "__main__":
    APP_CONFIG = parse_args()
    AUTH = get_auth(APP_CONFIG)

    print("Starting dashboard.")
    print(f"Open: http://{APP_CONFIG.host}:{APP_CONFIG.port}")
    print(f"Tenant: {APP_CONFIG.tenant}")
    print(f"Process key: {APP_CONFIG.process_key}")
    print(f"Refresh interval: {APP_CONFIG.refresh_seconds} seconds")
    if APP_CONFIG.business_key_prefix:
        print(f"Business key filter: {APP_CONFIG.business_key_prefix}-%")
    else:
        print("Business key filter: none")

    app.run(
        host=APP_CONFIG.host,
        port=APP_CONFIG.port,
        debug=False,
        use_reloader=False,
    )
