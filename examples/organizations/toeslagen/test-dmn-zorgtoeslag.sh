#!/bin/bash

# Test individual decisions in zorgtoeslag DMN
# Skips constants (p_*) - they always return fixed values

BASE_URL="https://operaton.open-regels.nl/engine-rest"
AUTH="demo:demo"

echo ""
echo "=================================="
echo "Testing: resultaat_zorgtoeslag DMN"
echo "=================================="
echo ""

pass=0
fail=0

test_decision() {
    local num=$1
    local name=$2
    local data=$3

    echo -n "$num. Testing: $name ... "

    response=$(curl -s -X POST -u $AUTH \
      -H 'Content-Type: application/json' \
      -d "$data" \
      "$BASE_URL/decision-definition/key/$name/evaluate")

    if echo "$response" | grep -q '"type":"RestException"'; then
        echo "❌ ERROR"
        echo "   $(echo "$response" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"//')"
        fail=$((fail + 1))
    elif echo "$response" | grep -q '^\[{'; then
        echo "✅ OK"
        pass=$((pass + 1))
    else
        echo "⚠️  UNEXPECTED"
        echo "   $response"
        fail=$((fail + 1))
    fi
}

# ── Leeftijd decisions ──────────────────────────────────────────────────────

test_decision "1" "leeftijd" '{
  "variables": {
    "leeftijdOpDatumBerekening": {"value": 26, "type": "Integer"}
  }
}'

test_decision "2" "meerderjarigDezeMaand" '{
  "variables": {
    "leeftijdOpLaatsteDagVorigeMaand": {"value": 17, "type": "Integer"},
    "leeftijdOpLaatsteDagHuidigeMaand": {"value": 18, "type": "Integer"}
  }
}'

test_decision "3" "rechtgevendeLeeftijd" '{
  "variables": {
    "leeftijdOpDatumBerekening": {"value": 26, "type": "Integer"},
    "leeftijdOpLaatsteDagVorigeMaand": {"value": 26, "type": "Integer"},
    "leeftijdOpLaatsteDagHuidigeMaand": {"value": 26, "type": "Integer"}
  }
}'

# ── Persoonsgegevens ────────────────────────────────────────────────────────

test_decision "4" "inLeven" '{
  "variables": {
    "overlijdensdatum": {"value": null, "type": "Date"}
  }
}'

test_decision "5" "statusRouteOk" '{
  "variables": {
    "woonachtigNL": {"value": true, "type": "Boolean"},
    "rechtmatigVerblijfNL": {"value": true, "type": "Boolean"},
    "statusZorgverzekerd": {"value": "Binnenlands zorgverzekerd", "type": "String"}
  }
}'

# ── Eligibility ──────────────────────────────────────────────────────────────

test_decision "6" "rechtOpToeslag" '{
  "variables": {
    "leeftijdOpDatumBerekening": {"value": 26, "type": "Integer"},
    "leeftijdOpLaatsteDagVorigeMaand": {"value": 26, "type": "Integer"},
    "leeftijdOpLaatsteDagHuidigeMaand": {"value": 26, "type": "Integer"},
    "overlijdensdatum": {"value": null, "type": "Date"},
    "woonachtigNL": {"value": true, "type": "Boolean"},
    "rechtmatigVerblijfNL": {"value": true, "type": "Boolean"},
    "statusZorgverzekerd": {"value": "Binnenlands zorgverzekerd", "type": "String"},
    "gedetineerd": {"value": false, "type": "Boolean"}
  }
}'

test_decision "7" "rechtOpToeslagAanvraag" '{
  "variables": {
    "leeftijdOpDatumBerekening": {"value": 26, "type": "Integer"},
    "leeftijdOpLaatsteDagVorigeMaand": {"value": 26, "type": "Integer"},
    "leeftijdOpLaatsteDagHuidigeMaand": {"value": 26, "type": "Integer"},
    "overlijdensdatum": {"value": null, "type": "Date"},
    "woonachtigNL": {"value": true, "type": "Boolean"},
    "rechtmatigVerblijfNL": {"value": true, "type": "Boolean"},
    "statusZorgverzekerd": {"value": "Binnenlands zorgverzekerd", "type": "String"},
    "gedetineerd": {"value": false, "type": "Boolean"}
  }
}'

# ── Financial calculations ───────────────────────────────────────────────────

test_decision "8" "woonlandfactor" '{
  "variables": {
    "statusZorgverzekerd": {"value": "Binnenlands zorgverzekerd", "type": "String"},
    "woonlandfactorBuitenland": {"value": 1.0, "type": "Double"}
  }
}'

test_decision "9" "inkomenBovenDrempel" '{
  "variables": {
    "toetsingsinkomen": {"value": 30000.0, "type": "Double"}
  }
}'

test_decision "10" "normpremie" '{
  "variables": {
    "toetsingsinkomen": {"value": 30000.0, "type": "Double"}
  }
}'

test_decision "11" "jaarbedragToeslag" '{
  "variables": {
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

# ── Final result ─────────────────────────────────────────────────────────────

test_decision "12" "zorgtoeslag_resultaat" '{
  "variables": {
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

echo ""
echo "=================================="
echo "Results: $pass passed, $fail failed"
echo "=================================="
echo ""
