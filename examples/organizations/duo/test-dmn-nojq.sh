#!/bin/bash

# Test Student Finance DMN - No jq required
# Works on Windows Git Bash / WSL

BASE_URL="https://operaton.open-regels.nl/engine-rest"
AUTH="demo:demo"

echo "Testing individual decisions..."
echo ""

test_decision() {
    local name=$1
    local data=$2
    
    echo -n "Testing: $name ... "
    
    response=$(curl -s -X POST -u $AUTH \
      -H 'Content-Type: application/json' \
      -d "$data" \
      "$BASE_URL/decision-definition/key/$name/evaluate")
    
    if echo "$response" | grep -q '"type":"RestException"'; then
        echo "❌ ERROR"
        echo "$response" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"//'
    elif echo "$response" | grep -q '\[{'; then
        echo "✅ OK"
    else
        echo "⚠️  Unknown response"
        echo "$response"
    fi
}

echo "1. Testing: persoon_is_uitwonend"
test_decision "persoon_is_uitwonend" '{
  "variables": {
    "woontAnderAdresDanOuders": {"value": true, "type": "Boolean"},
    "ingeschrevenGemeente": {"value": true, "type": "Boolean"}
  }
}'

echo ""
echo "2. Testing: inschrijving_ononderbroken"
test_decision "inschrijving_ononderbroken" '{
  "variables": {
    "missendeMaand": {"value": false, "type": "Boolean"},
    "medischeVerklaring": {"value": false, "type": "Boolean"}
  }
}'

echo ""
echo "3. Testing: voldoet_nationaliteitseis"
test_decision "voldoet_nationaliteitseis" '{
  "variables": {
    "nationaliteitNL": {"value": true, "type": "Boolean"},
    "voldoetEU": {"value": false, "type": "Boolean"}
  }
}'

echo ""
echo "4. Testing: correcte_opleiding"
test_decision "correcte_opleiding" '{
  "variables": {
    "opleidingBekostigdVoltijd": {"value": true, "type": "Boolean"},
    "opleidingGoedgekeurd": {"value": true, "type": "Boolean"}
  }
}'

echo ""
echo "5. Testing: geen_buitenlandse_financiering"
test_decision "geen_buitenlandse_financiering" '{
  "variables": {
    "buitenlandseFinanciering": {"value": false, "type": "Boolean"}
  }
}'

echo ""
echo "6. Testing: voldoet_leeftijdsvoorwaarden"
test_decision "voldoet_leeftijdsvoorwaarden" '{
  "variables": {
    "leeftijd": {"value": 20, "type": "Integer"},
    "onderwijsniveau": {"value": "HO", "type": "String"},
    "missendeMaand": {"value": false, "type": "Boolean"},
    "medischeVerklaring": {"value": false, "type": "Boolean"}
  }
}'

echo ""
echo "7. Testing: persoon_heeft_aanspraak"
test_decision "persoon_heeft_aanspraak" '{
  "variables": {
    "leeftijd": {"value": 20, "type": "Integer"},
    "onderwijsniveau": {"value": "HO", "type": "String"},
    "missendeMaand": {"value": false, "type": "Boolean"},
    "medischeVerklaring": {"value": false, "type": "Boolean"},
    "nationaliteitNL": {"value": true, "type": "Boolean"},
    "voldoetEU": {"value": false, "type": "Boolean"},
    "opleidingBekostigdVoltijd": {"value": true, "type": "Boolean"},
    "opleidingGoedgekeurd": {"value": true, "type": "Boolean"},
    "buitenlandseFinanciering": {"value": false, "type": "Boolean"}
  }
}'

echo ""
echo "8. Testing: vrijgesteld_bedrag_ouder"
test_decision "vrijgesteld_bedrag_ouder" '{
  "variables": {
    "onderwijsniveau": {"value": "HO", "type": "String"},
    "leefsituatie_ouder1": {"value": "Alleenstaand", "type": "String"}
  }
}'

echo ""
echo "9. Testing: percentage_meetellend_inkomen"
test_decision "percentage_meetellend_inkomen" '{
  "variables": {
    "onderwijsniveau": {"value": "HO", "type": "String"}
  }
}'

echo ""
echo "10. Testing: rekeninkomen_ouder1"
test_decision "rekeninkomen_ouder1" '{
  "variables": {
    "belastbaarInkomen_ouder1": {"value": 45000, "type": "Double"},
    "onderwijsniveau": {"value": "HO", "type": "String"},
    "leefsituatie_ouder1": {"value": "Alleenstaand", "type": "String"}
  }
}'

echo ""
echo "Testing complete!"
