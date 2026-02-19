#!/bin/bash

# Simple test using the first test case from test-cases.json
# Works in Git Bash on Windows

BASE_URL="https://operaton.open-regels.nl/engine-rest"
AUTH="demo:demo"

echo ""
echo ""
echo "Testing: besluit_aanvraag with Test Case 1"
echo "Expected: Eligible (should return toegekend = true)"
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
echo "Testing: besluit_aanvraag with Test Case 2"
echo "Expected: Not eligible due to foreign financing (should return toegekend = false)"
echo ""

curl -X POST \
  -u $AUTH \
  -H 'Content-Type: application/json' \
  -d '{
    "variables": {
      "leeftijd": { "value": 22, "type": "Integer" },
      "onderwijsniveau": { "value": "HO", "type": "String" },

      "woontAnderAdresDanOuders": { "value": true, "type": "Boolean" },
      "ingeschrevenGemeente": { "value": true, "type": "Boolean" },

      "nationaliteitNL": { "value": true, "type": "Boolean" },
      "voldoetEU": { "value": false, "type": "Boolean" },

      "opleidingBekostigdVoltijd": { "value": true, "type": "Boolean" },
      "opleidingGoedgekeurd": { "value": false, "type": "Boolean" },

      "buitenlandseFinanciering": { "value": true, "type": "Boolean" },

      "missendeMaand": { "value": false, "type": "Boolean" },
      "medischeVerklaring": { "value": false, "type": "Boolean" },

      "gewensteLening": { "value": 150.0, "type": "Double" },

      "aantalKinderenAanvBeurs": { "value": 1, "type": "Integer" },
      "belastbaarInkomen_ouder1": { "value": 25000.0, "type": "Double" },
      "belastbaarInkomen_ouder2": { "value": 24000.0, "type": "Double" },
      "termijnStudieschuldJaar_ouder1": { "value": 0.0, "type": "Double" },
      "termijnStudieschuldJaar_ouder2": { "value": 0.0, "type": "Double" },
      "aantalKinderenZonderSF_ouder1": { "value": 0, "type": "Integer" },
      "aantalKinderenZonderSF_ouder2": { "value": 0, "type": "Integer" },
      "leefsituatie_ouder1": { "value": "Alleenstaand", "type": "String" },
      "leefsituatie_ouder2": { "value": "Alleenstaand", "type": "String" },

      "maandenGenoten": { "value": 12, "type": "Integer" },
      "maxMaanden": { "value": 48, "type": "Integer" },
      "maandenSindsEersteMaandRecht": { "value": 12, "type": "Integer" }
  }
}' \
  "$BASE_URL/decision-definition/key/besluit_aanvraag/evaluate"

echo ""
echo ""
echo "Testing: besluit_aanvraag with Test Case 3"
echo "Expected: Not eligible due to age / not HO (should return toegekend = false)"
echo ""

curl -X POST \
  -u $AUTH \
  -H 'Content-Type: application/json' \
  -d '{
    "variables": {
      "leeftijd": { "value": 17, "type": "Integer" },
      "onderwijsniveau": { "value": "MBO", "type": "String" },

      "woontAnderAdresDanOuders": { "value": false, "type": "Boolean" },
      "ingeschrevenGemeente": { "value": true, "type": "Boolean" },

      "nationaliteitNL": { "value": true, "type": "Boolean" },
      "voldoetEU": { "value": false, "type": "Boolean" },

      "opleidingBekostigdVoltijd": { "value": true, "type": "Boolean" },
      "opleidingGoedgekeurd": { "value": false, "type": "Boolean" },

      "buitenlandseFinanciering": { "value": false, "type": "Boolean" },

      "missendeMaand": { "value": false, "type": "Boolean" },
      "medischeVerklaring": { "value": false, "type": "Boolean" },

      "gewensteLening": { "value": 100.0, "type": "Double" },

      "aantalKinderenAanvBeurs": { "value": 1, "type": "Integer" },
      "belastbaarInkomen_ouder1": { "value": 35000.0, "type": "Double" },
      "belastbaarInkomen_ouder2": { "value": 35000.0, "type": "Double" },
      "termijnStudieschuldJaar_ouder1": { "value": 0.0, "type": "Double" },
      "termijnStudieschuldJaar_ouder2": { "value": 0.0, "type": "Double" },
      "aantalKinderenZonderSF_ouder1": { "value": 0, "type": "Integer" },
      "aantalKinderenZonderSF_ouder2": { "value": 0, "type": "Integer" },
      "leefsituatie_ouder1": { "value": "Alleenstaand", "type": "String" },
      "leefsituatie_ouder2": { "value": "Alleenstaand", "type": "String" },

      "maandenGenoten": { "value": 1, "type": "Integer" },
      "maxMaanden": { "value": 48, "type": "Integer" },
      "maandenSindsEersteMaandRecht": { "value": 1, "type": "Integer" }
  }
}' \
  "$BASE_URL/decision-definition/key/besluit_aanvraag/evaluate"
