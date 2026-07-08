from flask import Flask, jsonify, request, render_template_string
from pathlib import Path
import subprocess
import sys
import shlex

app = Flask(__name__)

# This is the directory from which you run:
# python local_runner.py
LAUNCH_DIR = Path.cwd().resolve()

# Exclude this runner script from the generated buttons
RUNNER_FILE = Path(__file__).resolve().name

# Default parameters shown in every script parameter field
DEFAULT_PARAMETERS = "--tenant 48"


def get_available_scripts():
    """
    Return Python scripts in the launch directory, excluding this runner script.
    """
    scripts = []

    for path in LAUNCH_DIR.glob("*.py"):
        if path.name == RUNNER_FILE:
            continue

        scripts.append(path.name)

    return sorted(scripts)


def parse_parameter_text(parameter_text):
    """
    Parse command-line parameters from the text field.

    Example input:
      --username piet --password geheim --tenant 48

    Becomes:
      ["--username", "piet", "--password", "geheim", "--tenant", "48"]

    Quoted values also work:
      --name "My Process" --tenant 48
    """
    parameter_text = parameter_text.strip()

    if not parameter_text:
        return []

    return shlex.split(parameter_text)


@app.route("/")
def home():
    return render_template_string(HTML_PAGE)


@app.route("/scripts", methods=["GET"])
def scripts():
    """
    Browser calls this when the page loads.
    This only lists scripts. It does not run them.
    """
    return jsonify({
        "scripts": get_available_scripts(),
        "default_parameters": DEFAULT_PARAMETERS
    })


@app.route("/run", methods=["POST"])
def run_script():
    """
    Browser calls this only after pressing a Run button.
    """
    data = request.get_json(force=True)

    script_name = data.get("script")
    parameter_text = data.get("parameters", "")

    available_scripts = get_available_scripts()

    if script_name not in available_scripts:
        return jsonify({
            "ok": False,
            "error": f"Script is not allowed or does not exist: {script_name}"
        }), 400

    script_path = LAUNCH_DIR / script_name
    parameters = parse_parameter_text(parameter_text)

    try:
        result = subprocess.run(
            [sys.executable, str(script_path), *parameters],
            cwd=LAUNCH_DIR,
            capture_output=True,
            text=True,
            timeout=300,
            shell=False
        )

        return jsonify({
            "ok": result.returncode == 0,
            "script": script_name,
            "parameters": parameters,
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr
        })

    except subprocess.TimeoutExpired:
        return jsonify({
            "ok": False,
            "script": script_name,
            "error": "Script timed out after 300 seconds."
        }), 500

    except Exception as exc:
        return jsonify({
            "ok": False,
            "script": script_name,
            "error": str(exc)
        }), 500


HTML_PAGE = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Local Python Script Runner</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      background: #ffffff;
    }

    .page {
      display: flex;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }

    .left-panel {
      width: 45%;
      min-width: 420px;
      padding: 32px;
      box-sizing: border-box;
      overflow-y: auto;
      border-right: 1px solid #ddd;
      background: #ffffff;
    }

    .right-panel {
      flex: 1;
      padding: 32px;
      box-sizing: border-box;
      overflow-y: auto;
      background: #f7f7f7;
    }

    h1 {
      margin-top: 0;
    }

    .script-card {
      border: 1px solid #ccc;
      padding: 16px;
      margin-bottom: 16px;
      border-radius: 8px;
      background: #fafafa;
    }

    .script-title {
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 10px;
    }

    input {
      width: 100%;
      padding: 10px;
      font-size: 14px;
      margin-bottom: 10px;
      box-sizing: border-box;
    }

    button {
      padding: 10px 18px;
      font-size: 15px;
      cursor: pointer;
    }

    pre {
      background: #ffffff;
      padding: 16px;
      white-space: pre-wrap;
      border: 1px solid #ccc;
      min-height: 70vh;
      overflow-x: auto;
      box-sizing: border-box;
    }

    .ok {
      color: green;
      font-weight: bold;
    }

    .error {
      color: red;
      font-weight: bold;
    }

    .status-box {
      background: #ffffff;
      border: 1px solid #ccc;
      padding: 12px;
      margin-bottom: 16px;
      border-radius: 8px;
    }

    @media (max-width: 900px) {
      .page {
        flex-direction: column;
        height: auto;
        overflow: auto;
      }

      .left-panel {
        width: 100%;
        min-width: 0;
        border-right: none;
        border-bottom: 1px solid #ddd;
      }

      .right-panel {
        width: 100%;
      }

      pre {
        min-height: 300px;
      }
    }
  </style>
</head>
<body>

  <div class="page">

    <div class="left-panel">
      <h1>Local Python Script Runner</h1>

      <h2>Scripts</h2>
      <div id="scriptContainer">Loading scripts...</div>
    </div>

    <div class="right-panel">
      <h2>Status</h2>
      <div id="status" class="status-box">Ready.</div>

      <h2>Output</h2>
      <pre id="output"></pre>
    </div>

  </div>

  <script>
    async function loadScripts() {
      const response = await fetch("/scripts");
      const data = await response.json();

      const container = document.getElementById("scriptContainer");
      container.innerHTML = "";

      if (!data.scripts || data.scripts.length === 0) {
        container.textContent = "No Python scripts found in the launch directory.";
        return;
      }

      for (const script of data.scripts) {
        const card = document.createElement("div");
        card.className = "script-card";

        const title = document.createElement("div");
        title.className = "script-title";
        title.textContent = script;

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Optional parameters, for example: --username USER --password PASS --tenant 48";
        input.value = data.default_parameters || "--tenant 48";
        input.id = "params-" + script;

        const button = document.createElement("button");
        button.textContent = "Run " + script;
        button.onclick = function () {
          runScript(script, input.value);
        };

        card.appendChild(title);
        card.appendChild(input);
        card.appendChild(button);

        container.appendChild(card);
      }
    }

    async function runScript(script, parameters) {
      const status = document.getElementById("status");
      const output = document.getElementById("output");

      status.innerHTML = "Running <strong>" + script + "</strong>...";
      output.textContent = "";

      try {
        const response = await fetch("/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            script: script,
            parameters: parameters
          })
        });

        const data = await response.json();

        if (data.ok) {
          status.innerHTML = "<span class='ok'>Finished successfully: " + script + "</span>";
        } else {
          status.innerHTML = "<span class='error'>Finished with error: " + script + "</span>";
        }

        output.textContent =
          "Script: " + script + "\\n" +
          "Parameters parsed as: " + JSON.stringify(data.parameters || []) + "\\n" +
          "Return code: " + (data.returncode ?? "") + "\\n\\n" +
          "STDOUT:\\n" + (data.stdout || "") + "\\n\\n" +
          "STDERR / ERROR:\\n" + (data.stderr || data.error || "");

      } catch (err) {
        status.innerHTML = "<span class='error'>Request failed.</span>";
        output.textContent = err;
      }
    }

    loadScripts();
  </script>

</body>
</html>
"""


if __name__ == "__main__":
    print(f"Serving scripts from: {LAUNCH_DIR}")
    print("Open this URL in your browser:")
    print("http://127.0.0.1:5000")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )