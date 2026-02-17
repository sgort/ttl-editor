#!/bin/bash

# Test all 4 test cases for zorgtoeslag DMN
# Reads test-cases.json and evaluates zorgtoeslag_resultaat

BASE_URL="https://operaton.open-regels.nl/engine-rest"
AUTH="demo:demo"

echo ""
echo "======================================================="
echo "Test Cases: Resultaat Zorgtoeslag"
echo "======================================================="
echo ""

pass=0
fail=0

run_test() {
    local num=$1
    local name=$2
    local expected=$3
    local data=$4

    echo "── Test $num: $name"
    echo "   Expected: $expected"
    echo -n "   Result:   "

    response=$(curl -s -X POST -u $AUTH \
      -H 'Content-Type: application/json' \
      -d "$data" \
      "$BASE_URL/decision-definition/key/zorgtoeslag_resultaat/evaluate")

    if echo "$response" | grep -q '"type":"RestException"'; then
        echo "❌ ERROR"
        echo "   $(echo "$response" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"//')"
        fail=$((fail + 1))
    else
        ELIGIBLE=$(echo "$response" | grep -o '"eligible":{"[^}]*"value":[^,}]*' | grep -o '"value":[^,}]*' | cut -d':' -f2)
        AMOUNT=$(echo "$response" | grep -o '"amountYear":{"[^}]*"value":[^,}]*' | grep -o '"value":[^,}]*' | cut -d':' -f2)
        echo "eligible=$ELIGIBLE, amountYear=$AMOUNT"
        echo "   Raw:      $response"
        pass=$((pass + 1))
    fi
    echo ""
}

# TC1: Eligible NL insured, moderate income
run_test "1" "TC1_Eligible_NL_insured_moderate_income" \
    "eligible=true, amountYear>0" \
    '{
      "variables": {
        "datumBerekening": {"value": "2026-02-17T00:00:00.000+0100", "type": "Date"},
        "geboortedatum": {"value": "2000-01-10T00:00:00.000+0100", "type": "Date"},
        "leeftijdOpDatumBerekening": {"value": 26, "type": "Integer"},
        "leeftijdOpLaatsteDagVorigeMaand": {"value": 26, "type": "Integer"},
        "leeftijdOpLaatsteDagHuidigeMaand": {"value": 26, "type": "Integer"},
        "overlijdensdatum": {"value": null, "type": "Date"},
        "woonachtigNL": {"value": true, "type": "Boolean"},
        "rechtmatigVerblijfNL": {"value": true, "type": "Boolean"},
        "statusZorgverzekerd": {"value": "Binnenlands zorgverzekerd", "type": "String"},
        "gedetineerd": {"value": false, "type": "Boolean"},
        "toetsingsinkomen": {"value": 30000.0, "type": "Double"},
        "woonlandfactorBuitenland": {"value": 1.0, "type": "Double"}
      }
    }'

# TC2: Not eligible - detained
run_test "2" "TC2_Not_eligible_detained" \
    "eligible=false, amountYear=0" \
    '{
      "variables": {
        "datumBerekening": {"value": "2026-02-17T00:00:00.000+0100", "type": "Date"},
        "geboortedatum": {"value": "1995-06-01T00:00:00.000+0100", "type": "Date"},
        "leeftijdOpDatumBerekening": {"value": 30, "type": "Integer"},
        "leeftijdOpLaatsteDagVorigeMaand": {"value": 30, "type": "Integer"},
        "leeftijdOpLaatsteDagHuidigeMaand": {"value": 30, "type": "Integer"},
        "overlijdensdatum": {"value": null, "type": "Date"},
        "woonachtigNL": {"value": true, "type": "Boolean"},
        "rechtmatigVerblijfNL": {"value": true, "type": "Boolean"},
        "statusZorgverzekerd": {"value": "Binnenlands zorgverzekerd", "type": "String"},
        "gedetineerd": {"value": true, "type": "Boolean"},
        "toetsingsinkomen": {"value": 25000.0, "type": "Double"},
        "woonlandfactorBuitenland": {"value": 1.0, "type": "Double"}
      }
    }'

# TC3: Not eligible - became 18 this month
run_test "3" "TC3_Not_eligible_became_18_this_month" \
    "eligible=false, amountYear=0" \
    '{
      "variables": {
        "datumBerekening": {"value": "2026-02-17T00:00:00.000+0100", "type": "Date"},
        "geboortedatum": {"value": "2008-02-20T00:00:00.000+0100", "type": "Date"},
        "leeftijdOpDatumBerekening": {"value": 17, "type": "Integer"},
        "leeftijdOpLaatsteDagVorigeMaand": {"value": 17, "type": "Integer"},
        "leeftijdOpLaatsteDagHuidigeMaand": {"value": 18, "type": "Integer"},
        "overlijdensdatum": {"value": null, "type": "Date"},
        "woonachtigNL": {"value": true, "type": "Boolean"},
        "rechtmatigVerblijfNL": {"value": true, "type": "Boolean"},
        "statusZorgverzekerd": {"value": "Binnenlands zorgverzekerd", "type": "String"},
        "gedetineerd": {"value": false, "type": "Boolean"},
        "toetsingsinkomen": {"value": 0.0, "type": "Double"},
        "woonlandfactorBuitenland": {"value": 1.0, "type": "Double"}
      }
    }'

# TC4: Eligible abroad (verdragsgerechtigd), missing income → amountYear=null
run_test "4" "TC4_Eligible_treaty_abroad_missing_income" \
    "eligible=true, amountYear=null" \
    '{
      "variables": {
        "datumBerekening": {"value": "2026-02-17T00:00:00.000+0100", "type": "Date"},
        "geboortedatum": {"value": "1990-11-12T00:00:00.000+0100", "type": "Date"},
        "leeftijdOpDatumBerekening": {"value": 35, "type": "Integer"},
        "leeftijdOpLaatsteDagVorigeMaand": {"value": 35, "type": "Integer"},
        "leeftijdOpLaatsteDagHuidigeMaand": {"value": 35, "type": "Integer"},
        "overlijdensdatum": {"value": null, "type": "Date"},
        "woonachtigNL": {"value": false, "type": "Boolean"},
        "rechtmatigVerblijfNL": {"value": true, "type": "Boolean"},
        "statusZorgverzekerd": {"value": "Buitenlands verdragsgerechtigd", "type": "String"},
        "gedetineerd": {"value": false, "type": "Boolean"},
        "toetsingsinkomen": {"value": null, "type": "Double"},
        "woonlandfactorBuitenland": {"value": 0.85, "type": "Double"}
      }
    }'

echo "======================================================="
echo "Results: $pass passed, $fail failed"
echo "======================================================="
echo ""
