#!/bin/bash

# Enhanced test for Student Finance - Gets BOTH besluit AND totaal_bedrag
# NOTE: Requires 2 API calls - cannot get both in single evaluation!

BASE_URL="https://operaton.open-regels.nl/engine-rest"
AUTH="demo:demo"

echo ""
echo "=========================================="
echo "Student Finance Application - Test Case 1"
echo "=========================================="
echo ""

# Test data
TEST_DATA='{
  "variables": {
    "leeftijd": { "value": 20, "type": "Integer" },
    "onderwijsniveau": { "value": "HO", "type": "String" },
    "woontAnderAdresDanOuders": { "value": true, "type": "Boolean" },
    "ingeschrevenGemeente": { "value": true, "type": "Boolean" },
    "nationaliteitNL": { "value": true, "type": "Boolean" },
    "voldoetEU": { "value": false, "type": "Boolean" },
    "opleidingBekostigdVoltijd": { "value": true, "type": "Boolean" },
    "opleidingGoedgekeurd": { "value": false, "type": "Boolean" },
    "buitenlandseFinanciering": { "value": false, "type": "Boolean" },
    "missendeMaand": { "value": false, "type": "Boolean" },
    "medischeVerklaring": { "value": false, "type": "Boolean" },
    "gewensteLening": { "value": 200.0, "type": "Double" },
    "aantalKinderenAanvBeurs": { "value": 1, "type": "Integer" },
    "belastbaarInkomen_ouder1": { "value": 32000.0, "type": "Double" },
    "belastbaarInkomen_ouder2": { "value": 28000.0, "type": "Double" },
    "termijnStudieschuldJaar_ouder1": { "value": 0.0, "type": "Double" },
    "termijnStudieschuldJaar_ouder2": { "value": 0.0, "type": "Double" },
    "aantalKinderenZonderSF_ouder1": { "value": 0, "type": "Integer" },
    "aantalKinderenZonderSF_ouder2": { "value": 0, "type": "Integer" },
    "leefsituatie_ouder1": { "value": "Alleenstaand", "type": "String" },
    "leefsituatie_ouder2": { "value": "Alleenstaand", "type": "String" },
    "maandenGenoten": { "value": 6, "type": "Integer" },
    "maxMaanden": { "value": 48, "type": "Integer" },
    "maandenSindsEersteMaandRecht": { "value": 10, "type": "Integer" }
  }
}'

# Call 1: Get the amounts
echo "📊 Evaluating: totaal_bedrag..."
TOTAAL_RESPONSE=$(curl -s -X POST -u $AUTH \
  -H 'Content-Type: application/json' \
  -d "$TEST_DATA" \
  "$BASE_URL/decision-definition/key/totaal_bedrag/evaluate")

# Call 2: Get the decision  
echo "⚖️  Evaluating: besluit_aanvraag..."
BESLUIT_RESPONSE=$(curl -s -X POST -u $AUTH \
  -H 'Content-Type: application/json' \
  -d "$TEST_DATA" \
  "$BASE_URL/decision-definition/key/besluit_aanvraag/evaluate")

echo ""
echo "=========================================="
echo "RESULTS"
echo "=========================================="
echo ""

# Check for errors
if echo "$TOTAAL_RESPONSE" | grep -q '"type":"RestException"'; then
    echo "❌ Error calculating totaal_bedrag:"
    echo "$TOTAAL_RESPONSE" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"//'
    exit 1
fi

if echo "$BESLUIT_RESPONSE" | grep -q '"type":"RestException"'; then
    echo "❌ Error evaluating besluit_aanvraag:"
    echo "$BESLUIT_RESPONSE" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"//'
    exit 1
fi

# Parse totaal_bedrag response
echo "💰 Financial Breakdown:"
echo "----------------------"

TOTAAL=$(echo "$TOTAAL_RESPONSE" | grep -o '"totaalBedrag":{"[^}]*"value":[^,}]*' | grep -o '[0-9.]*' | head -1)
BASIS=$(echo "$TOTAAL_RESPONSE" | grep -o '"basisbeurs":{"[^}]*"value":[^,}]*' | grep -o '[0-9.]*' | head -1)
AANV=$(echo "$TOTAAL_RESPONSE" | grep -o '"aanvullendeBeurs":{"[^}]*"value":[^,}]*' | grep -o '[0-9.]*' | head -1)
LENING=$(echo "$TOTAAL_RESPONSE" | grep -o '"lening":{"[^}]*"value":[^,}]*' | grep -o '[0-9.]*' | head -1)

if [ -n "$TOTAAL" ]; then
    echo "Total Amount: €$TOTAAL"
fi

if [ -n "$BASIS" ]; then
    echo "  - Basic Grant (basisbeurs): €$BASIS"
fi

if [ -n "$AANV" ]; then
    echo "  - Supplementary Grant (aanvullendeBeurs): €$AANV"
fi

if [ -n "$LENING" ]; then
    echo "  - Loan (lening): €$LENING"
fi

echo ""
echo "📋 Application Decision:"
echo "------------------------"

# Parse besluit_aanvraag response
if echo "$BESLUIT_RESPONSE" | grep -q '"value":true'; then
    echo "Status: ✅ APPROVED (toegekend = true)"
elif echo "$BESLUIT_RESPONSE" | grep -q '"value":false'; then
    echo "Status: ❌ REJECTED (toegekend = false)"
else
    echo "Status: ⚠️  UNKNOWN"
fi

echo ""
echo "=========================================="
echo ""
echo "📄 Raw JSON Responses:"
echo ""
echo "1. Totaal Bedrag (totaal_bedrag):"
echo "$TOTAAL_RESPONSE" | sed 's/^/   /'
echo ""
echo "2. Besluit Aanvraag (besluit_aanvraag):"
echo "$BESLUIT_RESPONSE" | sed 's/^/   /'
echo ""
