#!/bin/bash

# Run every case in pw-normbedragen-test-cases.json against an Operaton
# instance. Deploys PW-normbedragen.dmn first by default (so this is
# self-contained), then evaluates each case against its own `decision` and
# compares the engine's answer to that case's `expectedOutputs`.
#
# Usage:
#   ./test-cases-pw.sh
#   OPERATON_URL=https://operaton.open-regels.nl/engine-rest ./test-cases-pw.sh
#   SKIP_DEPLOY=1 ./test-cases-pw.sh   # reuse whatever's already deployed —
#                                      # e.g. when iterating on the cases file
#                                      # itself, where the DMN hasn't changed
#   VERBOSE=1 ./test-cases-pw.sh       # print every case, not just failures
#
# Why `expectedOutputs` and not `expected`: the sibling Amsterdam runner parses
# the human-readable `expected` string, which works but has to re-derive types
# from text. These cases carry the same expectation twice — `expected` for the
# editor's DMN tab, which reads that field, and `expectedOutputs` as real JSON
# for this runner. Numbers compare as numbers here, so 1106.40 and 1106.4 are
# the same value rather than two different strings.
#
# Requires: curl, jq

set -u

OPERATON_URL="${OPERATON_URL:-https://operaton.open-regels.nl/engine-rest}"
SKIP_DEPLOY="${SKIP_DEPLOY:-0}"
VERBOSE="${VERBOSE:-0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DMN_FILE="$SCRIPT_DIR/../PW-normbedragen.dmn"
CASES_FILE="$SCRIPT_DIR/pw-normbedragen-test-cases.json"

echo ""
echo "======================================================="
echo "Test Cases: PW-normbedragen.dmn"
echo "======================================================="
echo "Operaton: $OPERATON_URL"
echo ""

if [ "$SKIP_DEPLOY" = "1" ]; then
    echo "── Skipping deploy (SKIP_DEPLOY=1) — using whatever's already live"
else
    echo "── Deploying $DMN_FILE ..."
    deploy_response=$(curl -s -X POST \
      -F "deployment-name=PW-normbedragen" \
      -F "deploy-changed-only=true" \
      -F "PW-normbedragen.dmn=@${DMN_FILE};type=text/xml" \
      "$OPERATON_URL/deployment/create")

    deployed_count=$(echo "$deploy_response" | jq '.deployedDecisionDefinitions | length' 2>/dev/null)
    if [ -z "$deployed_count" ] || [ "$deployed_count" = "null" ]; then
        echo "   ⚠ No new decisions deployed. Fine if this exact file is already"
        echo "     live (deploy-changed-only skips unchanged resources); a problem"
        echo "     otherwise: $deploy_response"
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
    request_body=$(echo "$case_json" | jq -c '.requestBody')
    expected_outputs=$(echo "$case_json" | jq -c '.expectedOutputs')

    response=$(curl -s -X POST \
      -H 'Content-Type: application/json' \
      -d "$request_body" \
      "$OPERATON_URL/decision-definition/key/$decision/evaluate")

    if echo "$response" | jq -e 'type == "object" and (.type // "" | test("Exception"))' >/dev/null 2>&1; then
        echo "❌ $num/$case_count $name — ENGINE ERROR"
        echo "   $(echo "$response" | jq -r '.message // "(no message)"')"
        fail=$((fail + 1))
        continue
    fi

    # An expectation of [] means "no rule matched at all", which Operaton
    # reports as an empty array — structurally different from a row whose
    # values are all null.
    if [ "$expected_outputs" = "[]" ]; then
        if [ "$(echo "$response" | jq 'if type == "array" then length else -1 end')" = "0" ]; then
            [ "$VERBOSE" = "1" ] && echo "✅ $num/$case_count $name (empty result set)"
            pass=$((pass + 1))
        else
            echo "❌ $num/$case_count $name — expected an empty result set, got: $response"
            fail=$((fail + 1))
        fi
        continue
    fi

    # Flatten the response's first row to { key: value } and compare it against
    # expectedOutputs key by key. jq does the comparison so numbers stay numbers
    # and booleans stay booleans.
    #
    # Deliberately NOT using `//` to default a lookup: jq's `//` yields its
    # right-hand side when the left is null OR FALSE, so `$act[.key] // null`
    # silently turns an actual `false` into `null` and every case expecting a
    # boolean false fails against a value the response plainly contains. has()
    # separates "absent" from "present and falsy"; an absent key reports as
    # <missing> rather than masquerading as null.
    mismatches=$(jq -n \
      --argjson exp "$expected_outputs" \
      --argjson res "$response" \
      '($res | if type == "array" then (if length > 0 then .[0] else {} end) else . end
             | with_entries(.value |= (if type == "object" and has("value")
                                       then .value else . end))) as $act
       | [ $exp | to_entries[] as $e
           | ($act | has($e.key)) as $present
           | select(($present | not) or $act[$e.key] != $e.value)
           | "\($e.key)(expected=\($e.value|tostring),actual=\(if $present then ($act[$e.key]|tostring) else "<missing>" end))" ]
       | join(" ")' 2>/dev/null)

    if [ -z "$mismatches" ] || [ "$mismatches" = '""' ]; then
        [ "$VERBOSE" = "1" ] && echo "✅ $num/$case_count $name"
        pass=$((pass + 1))
    else
        echo "❌ $num/$case_count $name — $(echo "$mismatches" | tr -d '"')"
        echo "   Raw: $response"
        fail=$((fail + 1))
    fi
done < <(jq -c '.[]' "$CASES_FILE")

echo ""
echo "======================================================="
echo "Results: $pass passed, $fail failed (of $case_count)"
echo "======================================================="
echo ""

[ "$fail" -eq 0 ]
