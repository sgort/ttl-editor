#!/bin/bash

# Simple test using the first test case from test-cases.json
# Works in Git Bash on Windows

BASE_URL="https://operaton.open-regels.nl/engine-rest"
AUTH="demo:demo"

echo ""
echo "Testing: besluit_aanvraag with Test Case 1"
echo "Expected: toegekend = true (eligible)"
echo ""

curl -X POST \
  -u $AUTH \
  -H 'Content-Type: application/json' \
  -d '{
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
}' \
  "$BASE_URL/decision-definition/key/besluit_aanvraag/evaluate"

echo ""
echo ""
echo "Look for 'toegekend' in the response above."
echo "If you see an error with 'decision with key null', we need to debug further."
echo ""
