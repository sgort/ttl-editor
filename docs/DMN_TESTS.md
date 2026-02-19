# DMN Testing Suite Documentation

**Version:** 1.9.2  
**Date:** February 17, 2026  
**Component:** DMN Tab (`src/components/tabs/DMNTab.jsx`)

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Intermediate Decision Tests](#intermediate-decision-tests)
4. [Test Cases Upload](#test-cases-upload)
5. [File Formats](#file-formats)
6. [Usage Workflow](#usage-workflow)
7. [Examples](#examples)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Overview

The DMN Testing Suite provides two advanced testing modes that complement the existing single-evaluate functionality:

1. **Intermediate Decision Tests** — Test each sub-decision in the DRD individually
2. **Test Cases Upload** — Run multiple test scenarios from JSON files

These features mirror the shell script testing patterns used in the examples directory:

- `test-dmn-zorgtoeslag.sh` (intermediate decisions)
- `test-cases-zorgtoeslag.sh` (batch test cases)

---

## Features

### ✅ Smart Constant Filtering

Automatically skips constant parameters (decisions with `p_*` prefix) from:

- Intermediate decision testing
- Primary decision key extraction for deployment

**Example:** For a DMN with 20 total decisions:

- 8 constants filtered (p_maxaftrek, p_normpremie_alleenstaande, etc.)
- 12 testable decisions retained (leeftijd, rechtOpToeslag, zorgtoeslag_resultaat, etc.)

### ✅ Progressive Result Display

Test results appear in real-time as they execute:

- Intermediate tests update row-by-row
- Test cases show pass/fail counters incrementally
- No need to wait for complete batch to see results

### ✅ Dual Format Support

Test cases accept both formats automatically:

**Toeslagen format:**

```json
[{
  "name": "TC1_Eligible_NL_insured_moderate_income",
  "expected": "eligible=true, amountYear>0",
  "requestBody": { "variables": {...} }
}]
```

**DUO format:**

```json
[{
  "testName": "Test Case 1",
  "testResult": "Eligible (should return toegekend = true)",
  "variables": {...}
}]
```

### ✅ NL-SBB Concept Generation

On successful test case execution, the last successful result automatically generates NL-SBB concepts for semantic linking via the Linked Data Explorer.

---

## Intermediate Decision Tests

### What It Does

Tests each sub-decision in the DMN Decision Requirements Diagram (DRD) individually by calling:

```
POST /engine-rest/decision-definition/key/{decisionId}/evaluate
```

### When to Use

- **Debugging complex DMNs** — Identify which sub-decision is failing
- **Unit testing decision logic** — Verify individual calculation steps
- **Development validation** — Test intermediate results before final output

### How It Works

1. Upload and deploy your DMN file
2. DMN is parsed to extract all `<decision>` elements
3. Constant parameters (`p_*` prefix) are automatically filtered out
4. Badge shows: "12 testable decisions detected (p\_\* constants filtered)"
5. Click "Run Intermediate Tests" button
6. Each decision is evaluated sequentially using the full test body
7. Results display progressively: ✅ OK | ❌ ERROR | ⚠️ UNEXPECTED

### Example Output

```
1  leeftijd                        ✅ OK
2  meerderjarigDezeMaand           ✅ OK
3  rechtgevendeLeeftijd            ✅ OK
4  inLeven                         ✅ OK
5  statusRouteOk                   ✅ OK
6  rechtOpToeslag                  ✅ OK
7  rechtOpToeslagAanvraag          ✅ OK
8  woonlandfactor                  ✅ OK
9  inkomenBovenDrempel             ✅ OK
10 normpremie                      ✅ OK
11 jaarbedragToeslag               ✅ OK
12 zorgtoeslag_resultaat           ✅ OK
```

### UI Location

**DMN Tab → Intermediate Decision Tests** (collapsible section)

- Only visible after successful deployment
- Only shows when `decisions.length > 1` (skips single-table DMNs)
- Expand to see run button and results table

---

## Test Cases Upload

### What It Does

Runs multiple test scenarios from a JSON file against the primary decision key:

```
POST /engine-rest/decision-definition/key/{primaryKey}/evaluate
```

### When to Use

- **Regression testing** — Verify DMN still works after changes
- **Scenario validation** — Test edge cases and business rules
- **Documentation** — Maintain executable test specifications
- **Quality assurance** — Validate outputs match expected results

### How It Works

1. Prepare a `test-cases.json` file (see formats below)
2. Upload and deploy your DMN file
3. Click "Upload test-cases.json" in the Test Cases section
4. Loaded cases display with count: "test-cases.json (4 cases)"
5. Click "Run All Test Cases"
6. Each case executes sequentially
7. Results show: name, expected, actual, ✅ OK / ❌ FAIL badge
8. Last successful result generates NL-SBB concepts

### Example Output

```
4/4 passed / 0/4 failed

✅ 1  TC1_Eligible_NL_insured_moderate_income
     Expected: eligible=true, amountYear>0

✅ 2  TC2_Not_eligible_detained
     Expected: eligible=false, amountYear=0

✅ 3  TC3_Not_eligible_became_18_this_month
     Expected: eligible=false, amountYear=0

✅ 4  TC4_Eligible_treaty_abroad_missing_income
     Expected: eligible=true, amountYear=null
```

### UI Location

**DMN Tab → Test Cases** (collapsible section)

- Only visible after successful deployment
- Upload button shows filename after selection
- Results table shows after running tests
- Blue info badge: "💡 NL-SBB concepts updated from last successful test case result"

---

## File Formats

### Toeslagen Format

Used by: `examples/organizations/toeslagen/test-cases.json`

```json
[
  {
    "name": "TC1_Eligible_NL_insured_moderate_income",
    "expected": "eligible=true, amountYear>0",
    "requestBody": {
      "variables": {
        "datumBerekening": { "value": "2026-02-17", "type": "String" },
        "geboortedatum": { "value": "2000-01-10", "type": "String" },
        "leeftijdOpDatumBerekening": { "value": 26, "type": "Integer" },
        "leeftijdOpLaatsteDagVorigeMaand": { "value": 26, "type": "Integer" },
        "leeftijdOpLaatsteDagHuidigeMaand": { "value": 26, "type": "Integer" },
        "overlijdensdatum": { "value": null, "type": "Date" },
        "woonachtigNL": { "value": true, "type": "Boolean" },
        "rechtmatigVerblijfNL": { "value": true, "type": "Boolean" },
        "statusZorgverzekerd": { "value": "Binnenlands zorgverzekerd", "type": "String" },
        "gedetineerd": { "value": false, "type": "Boolean" },
        "toetsingsinkomen": { "value": 30000.0, "type": "Double" },
        "woonlandfactorBuitenland": { "value": 1.0, "type": "Double" }
      }
    }
  },
  {
    "name": "TC2_Not_eligible_detained",
    "expected": "eligible=false, amountYear=0",
    "requestBody": {
      "variables": { ... }
    }
  }
]
```

**Required fields:**

- `name` (string) — Test case identifier
- `expected` (string) — Expected outcome description
- `requestBody` (object) — Complete Operaton request body with `variables`

### DUO Format

Used by: `examples/organizations/duo/test-cases.json`

```json
[
  {
    "testName": "Test Case 1",
    "testResult": "Eligible (should return toegekend = true)",
    "variables": {
      "leeftijd": { "value": 20, "type": "Integer" },
      "onderwijsniveau": { "value": "HO", "type": "String" },
      "woontAnderAdresDanOuders": { "value": true, "type": "Boolean" },
      "ingeschrevenGemeente": { "value": true, "type": "Boolean" },
      "nationaliteitNL": { "value": true, "type": "Boolean" },
      "gewensteLening": { "value": 200.0, "type": "Double" }
    }
  },
  {
    "testName": "Test Case 2",
    "testResult": "Not eligible due to foreign financing",
    "variables": { ... }
  }
]
```

**Required fields:**

- `testName` (string) — Test case identifier
- `testResult` (string) — Expected outcome description
- `variables` (object) — Operaton variables object (no `requestBody` wrapper)

### Normalization

Both formats are automatically normalized to:

```javascript
{
  name: string,
  expected: string,
  requestBody: { variables: {...} }
}
```

---

## Usage Workflow

### Complete Testing Flow

```
1. UPLOAD DMN
   ↓
   • File card shows: "12 testable decisions detected (p_* constants filtered)"
   • Decision Key field auto-filled with primary decision (e.g., zorgtoeslag_resultaat)
   • Request body auto-generated from inputData elements

2. DEPLOY TO OPERATON
   ↓
   • Deployment button shows: "Deployed — ID: ddbd0e2d..."
   • Console logs: "[DMN] Extracted primary decision key: 'zorgtoeslag_resultaat' (skipped 8 p_* constant(s))"

3. SINGLE EVALUATE (existing)
   ↓
   • Modify request body values if needed
   • Click "Evaluate Decision"
   • Response shows in formatted JSON
   • NL-SBB concepts generated on success

4. INTERMEDIATE TESTS (new)
   ↓
   • Expand "Intermediate Decision Tests" section
   • Click "Run Intermediate Tests"
   • See 12 results appear progressively
   • Expand any row to see raw JSON response

5. TEST CASES (new)
   ↓
   • Expand "Test Cases" section
   • Click "Upload test-cases.json"
   • Select file (4 cases loaded)
   • Click "Run All Test Cases"
   • See 4 results: 4 passed / 0 failed
   • NL-SBB concepts updated from last success

6. EXPORT TTL
   ↓
   • Click "Download TTL"
   • DMN metadata, test results, and concepts included
```

---

## Examples

### Example 1: Zorgtoeslag DMN

**File:** `examples/organizations/toeslagen/resultaat_zorgtoeslag_operaton_compat.dmn`

**Total decisions:** 20  
**Filtered (p\_\*):** 8 constants  
**Testable:** 12 decisions

**Intermediate tests:**

```
leeftijd                      ✅  Simple passthrough
meerderjarigDezeMaand         ✅  Turns 18 logic
rechtgevendeLeeftijd          ✅  Age eligibility
inLeven                       ✅  Null check on death date
statusRouteOk                 ✅  Insurance/residence
rechtOpToeslag                ✅  Full citizen eligibility
rechtOpToeslagAanvraag        ✅  Application eligibility
woonlandfactor                ✅  Domestic vs treaty abroad
inkomenBovenDrempel           ✅  Income threshold
normpremie                    ✅  Standard premium calc
jaarbedragToeslag             ✅  Full amount with caps
zorgtoeslag_resultaat         ✅  Final result
```

**Test cases:** `examples/organizations/toeslagen/test-cases.json` (4 cases)

- TC1: Eligible NL insured, moderate income → eligible=true, amountYear>0
- TC2: Not eligible detained → eligible=false, amountYear=0
- TC3: Not eligible became 18 this month → eligible=false, amountYear=0
- TC4: Eligible treaty abroad missing income → eligible=true, amountYear=null

**Shell script equivalents:**

- Intermediate: `test-dmn-zorgtoeslag.sh`
- Test cases: `test-cases-zorgtoeslag.sh`

### Example 2: DUO Studenten DMN

**Test cases:** `examples/organizations/duo/test-cases.json` (3 cases)

- Test Case 1: Eligible (toegekend = true)
- Test Case 2: Not eligible due to foreign financing (toegekend = false)
- Test Case 3: Not eligible due to age / not HO (toegekend = false)

**Shell script equivalent:** `test-cases.sh`

---

## Troubleshooting

### Issue: Wrong Decision Key Extracted

**Symptom:**

```
Decision Key: p_STANDAARDPREMIE
Test cases fail: "Decision not found"
```

**Cause:** First decision in XML is a constant parameter

**Solution:** Already fixed in v1.9.2. The `extractPrimaryDecisionKey()` helper now skips `p_*` constants automatically.

**Console should show:**

```
[DMN] Extracted primary decision key: "zorgtoeslag_resultaat" (skipped 8 p_* constant(s))
```

### Issue: Date Type Conversion Error

**Symptom:**

```json
{
  "type": "InvalidRequestException",
  "message": "Cannot convert value '2026-02-17' of type 'Date' to java type java.util.Date"
}
```

**Cause:** Using `type: 'Date'` in request body

**Solution:** Already fixed in v1.9.2. Date values now use `type: 'String'` automatically.

**Correct format:**

```json
"datumBerekening": { "value": "2026-02-17", "type": "String" }
```

**Incorrect format:**

```json
"datumBerekening": { "value": "2026-02-17", "type": "Date" }
```

### Issue: Empty Request Body Generated

**Symptom:** Request body shows `{ "variables": {} }`

**Cause:** DMN file has no `<inputData>` elements or they're malformed

**Solution:**

1. Check DMN XML has `<inputData>` elements
2. Verify `<variable typeRef="...">` children exist
3. Use "Load Example" to see working format
4. Manually edit request body if needed

### Issue: Test Cases Upload Fails

**Symptom:** "Failed to parse test cases: ..."

**Possible causes:**

1. File is not valid JSON
2. Array is missing (must be `[...]` not `{...}`)
3. Test case format is unrecognized

**Solution:**

1. Validate JSON syntax (use jsonlint.com)
2. Ensure top-level is an array
3. Use one of the two supported formats (Toeslagen or DUO)
4. Check example files in `examples/organizations/*/test-cases.json`

### Issue: All Intermediate Tests Show ERROR

**Symptom:** Every decision returns ❌ ERROR

**Possible causes:**

1. DMN not deployed
2. Decision keys incorrect
3. Request body has wrong variable names

**Solution:**

1. Verify deployment status shows "Deployed — ID: ..."
2. Check console for extraction logs
3. Compare request body variable names to DMN `<inputData>` names
4. Use "Load Example" to see working format

---

## Best Practices

### 1. Test Case Organization

**Structure:**

```
examples/
└── organizations/
    └── your-organization/
        ├── your-dmn.dmn
        ├── test-cases.json
        ├── test-dmn-your-dmn.sh (optional)
        └── test-cases-your-dmn.sh (optional)
```

**Naming conventions:**

- DMN file: descriptive name, lowercase with underscores
- Test cases: `test-cases.json` or `test-cases-{dmn-name}.json`
- Shell scripts: `test-dmn-{name}.sh`, `test-cases-{name}.sh`

### 2. Test Case Coverage

**Minimum coverage:**

- ✅ Happy path (valid input, expected output)
- ✅ Edge cases (boundary values, null handling)
- ✅ Negative cases (invalid input, error conditions)

**Example for zorgtoeslag:**

- TC1: Eligible with typical values (happy path)
- TC2: Not eligible due to detention (negative case)
- TC3: Not eligible due to age boundary (edge case)
- TC4: Eligible abroad with missing data (null handling)

### 3. Expected Results Format

**Be specific in `expected` field:**

**Good:**

```json
"expected": "eligible=true, amountYear>0"
"expected": "toegekend=false, reason='Te jong'"
"expected": "output.value=1234.56, output.unit='EUR'"
```

**Avoid vague:**

```json
"expected": "should work"
"expected": "eligible"
```

### 4. Variable Naming

**Use exact DMN names:**

```json
// ✅ Correct - matches DMN <inputData name="...">
"datumBerekening": { "value": "2026-02-17", "type": "String" }

// ❌ Wrong - typo or mismatch
"datum_berekening": { ... }
"datumbereken": { ... }
```

### 5. Type Consistency

**Follow Operaton conventions:**

| DMN typeRef | JSON type | Example value |
| ----------- | --------- | ------------- |
| date        | String    | "2026-02-17"  |
| boolean     | Boolean   | true          |
| integer     | Integer   | 42            |
| long        | Integer   | 1234567890    |
| double      | Double    | 1234.56       |
| string      | String    | "text"        |

**Special cases:**

```json
// Null date (use type: Date for null only)
"overlijdensdatum": { "value": null, "type": "Date" }

// Null double
"toetsingsinkomen": { "value": null, "type": "Double" }
```

### 6. Debugging Strategy

**Start small:**

1. Single evaluate first (verify request body works)
2. Fix any errors in single evaluate
3. Run intermediate tests (identify failing sub-decisions)
4. Create test case for specific scenario
5. Run all test cases (validate complete flows)

**Progressive refinement:**

```
Single evaluate (1 request)
  ↓
Intermediate tests (12 requests)
  ↓
Test cases (4 requests)
  ↓
Shell scripts (batch automation)
```

### 7. Console Monitoring

**Watch for:**

```
[DMN Parse] Filtered 8 constant parameter(s), kept 12 testable decision(s)
[DMN] Extracted primary decision key: "zorgtoeslag_resultaat" (skipped 8 p_* constant(s))
```

**Red flags:**

```
[DMN] All decisions are constants (p_*), using first one: "p_STANDAARDPREMIE"
Error extracting decision key from DMN: ...
Error parsing DMN decisions: ...
```

---

## Shell Script Integration

The UI testing features mirror existing shell script patterns. You can still use shell scripts for CI/CD:

### Intermediate Decision Testing

**UI equivalent:** DMN Tab → Intermediate Decision Tests  
**Shell script:** `examples/organizations/toeslagen/test-dmn-zorgtoeslag.sh`

```bash
#!/bin/bash
BASE_URL="https://operaton.open-regels.nl/engine-rest"
AUTH="demo:demo"

test_decision() {
  local name=$1
  local data=$2
  curl -s -X POST -u $AUTH \
    -H 'Content-Type: application/json' \
    -d "$data" \
    "$BASE_URL/decision-definition/key/$name/evaluate"
}

test_decision "leeftijd" '{"variables": {...}}'
test_decision "rechtOpToeslag" '{"variables": {...}}'
# ... etc
```

### Test Cases Execution

**UI equivalent:** DMN Tab → Test Cases  
**Shell script:** `examples/organizations/toeslagen/test-cases-zorgtoeslag.sh`

```bash
#!/bin/bash
# Reads test-cases.json and evaluates zorgtoeslag_resultaat

run_test() {
  local num=$1
  local name=$2
  local expected=$3
  local data=$4

  curl -s -X POST -u $AUTH \
    -H 'Content-Type: application/json' \
    -d "$data" \
    "$BASE_URL/decision-definition/key/zorgtoeslag_resultaat/evaluate"
}

# TC1
run_test "1" "TC1_Eligible" "eligible=true" '{...}'
# TC2
run_test "2" "TC2_Detained" "eligible=false" '{...}'
```

---

## Future Enhancements

Planned improvements for future versions:

1. **Assertion Engine** — Parse `expected` field and validate actual vs expected programmatically
2. **Export Results** — Download test results as JSON for documentation/CI
3. **Batch Testing** — Upload folder of DMNs + test cases, run all
4. **Historical Tracking** — Compare results across runs, detect regressions
5. **Custom Filters** — UI to add/edit decision filtering patterns beyond `p_*`
6. **Parallel Execution** — Run test cases concurrently (with rate limiting)
7. **Coverage Metrics** — Show which decision paths are tested vs untested

---

## Summary

The DMN Testing Suite provides comprehensive testing capabilities within the CPSV Editor:

✅ **Intermediate tests** validate each decision individually  
✅ **Test cases** verify complete scenarios end-to-end  
✅ **Smart filtering** skips constants automatically  
✅ **Dual format** support for both test case patterns  
✅ **Progressive display** shows results in real-time  
✅ **NL-SBB integration** generates concepts from successful tests  
✅ **Shell script parity** mirrors existing test patterns

These features enable thorough DMN validation without leaving the editor, while maintaining compatibility with existing shell-based testing workflows.
