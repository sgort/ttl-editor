#!/bin/bash

# Run all test cases in test-cases-hva-full-dmn-export.json against a local
# Operaton instance. Deploys the patched DMN first by default (so this is
# self-contained — no need to deploy separately), then evaluates every case
# against its own `decision` and checks the result against `expected`.
#
# Usage:
#   ./test-cases-hva.sh
#   OPERATON_URL=https://my-operaton/engine-rest ./test-cases-hva.sh
#   SKIP_DEPLOY=1 ./test-cases-hva.sh   # reuse whatever's already deployed —
#                                       # e.g. iterating on test-cases-hva-full-dmn-export.json
#                                       # itself, where the DMN hasn't changed
#
# Requires: curl, jq

set -u

OPERATON_URL="${OPERATON_URL:-http://localhost:8081/engine-rest}"
SKIP_DEPLOY="${SKIP_DEPLOY:-0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DMN_FILE="$SCRIPT_DIR/../HvA_full_dmn_export-patched.dmn"
CASES_FILE="$SCRIPT_DIR/test-cases-hva-full-dmn-export.json"

echo ""
echo "======================================================="
echo "Test Cases: HvA_full_dmn_export-patched.dmn"
echo "======================================================="
echo "Operaton: $OPERATON_URL"
echo ""

if [ "$SKIP_DEPLOY" = "1" ]; then
    echo "── Skipping deploy (SKIP_DEPLOY=1) — using whatever's already live at $OPERATON_URL"
else
    echo "── Deploying $DMN_FILE ..."
    deploy_response=$(curl -s -X POST \
      -F "deployment-name=HvA_full_dmn_export-patched" \
      -F "deploy-changed-only=true" \
      -F "HvA_full_dmn_export-patched.dmn=@${DMN_FILE};type=text/xml" \
      "$OPERATON_URL/deployment/create")

    deployed_count=$(echo "$deploy_response" | jq '.deployedDecisionDefinitions | length' 2>/dev/null)
    if [ -z "$deployed_count" ] || [ "$deployed_count" = "null" ]; then
        echo "❌ Deploy failed or returned no new decisions (deploy-changed-only may have skipped an"
        echo "   unchanged resource — that's fine if you already deployed this exact file):"
        echo "   $deploy_response"
    else
        echo "   Deployed $deployed_count decision(s)."
    fi
fi
echo ""

pass=0
fail=0
num=0

case_count=$(jq 'length' "$CASES_FILE")

while IFS= read -r case_json; do
    num=$((num + 1))
    name=$(echo "$case_json" | jq -r '.name')
    decision=$(echo "$case_json" | jq -r '.decision')
    expected=$(echo "$case_json" | jq -r '.expected')
    request_body=$(echo "$case_json" | jq -c '.requestBody')

    echo "── Test $num/$case_count: $name"
    echo "   Decision: $decision"
    echo "   Expected: $expected"
    echo -n "   Result:   "

    response=$(curl -s -X POST \
      -H 'Content-Type: application/json' \
      -d "$request_body" \
      "$OPERATON_URL/decision-definition/key/$decision/evaluate")

    if echo "$response" | jq -e 'type == "object" and (.type == "RestException" or .type == "InvalidRequestException")' >/dev/null 2>&1; then
        echo "❌ ERROR"
        msg=$(echo "$response" | jq -r '.message // "(no message)"')
        echo "   $msg"
        fail=$((fail + 1))
        echo ""
        continue
    fi

    # Empty-result cases (no matching rule)
    if echo "$expected" | grep -qiE 'empty result|no matching rule'; then
        if [ "$(echo "$response" | jq 'length')" = "0" ]; then
            echo "✅ PASS (empty result, as expected)"
            pass=$((pass + 1))
        else
            echo "❌ FAIL — expected empty result, got: $response"
            fail=$((fail + 1))
        fi
        echo ""
        continue
    fi

    # Multi-row RULE ORDER results: "key: N matching rows -> 'v1' | 'v2' | ..."
    # (root decision `aanspraken`, which can return >1 row per case). Parse the
    # key, expected row count, and the pipe-separated expected values, then
    # compare against every row's value for that key, in order.
    if echo "$expected" | grep -qE '^[A-Za-z0-9_/]+: [0-9]+ matching rows? ->'; then
        key=$(echo "$expected" | sed -E 's/^([A-Za-z0-9_/]+):.*/\1/')
        # composite keys ("a/b") aren't emitted by any current case — only the
        # single-key form is; fall back to the first component if one shows up.
        key=$(echo "$key" | cut -d/ -f1)
        exp_count=$(echo "$expected" | sed -E 's/^[A-Za-z0-9_/]+: ([0-9]+) matching rows?.*/\1/')
        exp_values_raw=$(echo "$expected" | sed -E 's/^[A-Za-z0-9_/]+: [0-9]+ matching rows? -> //')
        IFS='|' read -ra exp_values <<< "$exp_values_raw"

        act_count=$(echo "$response" | jq 'length')
        act_values_json=$(echo "$response" | jq -c --arg k "$key" '[.[] | (.[$k].value | tostring)]')

        all_ok=true
        mismatches=""
        [ "$act_count" != "$exp_count" ] && all_ok=false && mismatches=" row-count(expected=$exp_count,actual=$act_count)"

        idx=0
        for raw in "${exp_values[@]}"; do
            exp_val=$(echo "$raw" | sed -E "s/^\s+|\s+\$//g" | tr -d "'")
            act_val=$(echo "$act_values_json" | jq -r --argjson i "$idx" '.[$i] // "null"')
            if [ "$act_val" != "$exp_val" ]; then
                all_ok=false
                mismatches="$mismatches row$idx(expected=$exp_val,actual=$act_val)"
            fi
            idx=$((idx + 1))
        done

        if $all_ok; then
            echo "✅ PASS ($act_count rows, $(echo "$response" | jq -c '[.[].'"$key"'.value]'))"
            pass=$((pass + 1))
        else
            echo "❌ FAIL —$mismatches"
            echo "   Raw: $response"
            fail=$((fail + 1))
        fi
        echo ""
        continue
    fi

    # Parse "key = value, key2 = value2" (or "key=value, ...") out of `expected`
    # and check each key's actual value in response[0].
    all_ok=true
    mismatches=""
    IFS=',' read -ra pairs <<< "$expected"
    for pair in "${pairs[@]}"; do
        key=$(echo "$pair" | sed -E 's/^[^`]*`([^`]+)`.*/\1/; s/^\s*([A-Za-z0-9_]+)\s*=.*/\1/' | tr -d ' `')
        exp_val=$(echo "$pair" | sed -E 's/^[^=]*=\s*//' | tr -d '`' | sed -E "s/^'(.*)'\$/\1/" | sed -E 's/^\s+|\s+$//g')
        [ -z "$key" ] && continue
        act_val=$(echo "$response" | jq -r --arg k "$key" 'if (.[0][$k] // null) == null then "null" else (.[0][$k].value | tostring) end' 2>/dev/null)
        if [ "$act_val" != "$exp_val" ]; then
            all_ok=false
            mismatches="$mismatches $key(expected=$exp_val,actual=$act_val)"
        fi
    done

    if $all_ok; then
        echo "✅ PASS ($(echo "$response" | jq -c '.[0]'))"
        pass=$((pass + 1))
    else
        echo "❌ FAIL —$mismatches"
        echo "   Raw: $response"
        fail=$((fail + 1))
    fi
    echo ""
done < <(jq -c '.[]' "$CASES_FILE")

echo "======================================================="
echo "Results: $pass passed, $fail failed (of $case_count)"
echo "======================================================="
echo ""

[ "$fail" -eq 0 ]
