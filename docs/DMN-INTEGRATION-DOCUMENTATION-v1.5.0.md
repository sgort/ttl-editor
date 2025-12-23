# DMN Integration Documentation - Version 1.5.0

**Editor Version:** 1.5.0  
**Date:** December 2025  
**Feature:** DMN Decision Engine Integration  
**Status:** ✅ Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Interface](#user-interface)
4. [Data Model](#data-model)
5. [TTL Output Structure](#ttl-output-structure)
6. [Vocabulary Mapping](#vocabulary-mapping)
7. [Implementation Details](#implementation-details)
8. [Usage Guide](#usage-guide)
9. [API Integration](#api-integration)
10. [Best Practices](#best-practices)
11. [URI Generation](#uri-generation)

---

## Overview

### Purpose

The DMN (Decision Model and Notation) integration enables the CPSV Editor to:

- Upload and deploy DMN decision models to the Operaton rule engine
- Test decision evaluations with live data
- Document decision logic as part of public service metadata
- Generate CPSV-AP and CPRMV compliant TTL output

### Key Capabilities

✅ **DMN File Management**

- Upload `.dmn` files (DMN 1.3 XML format)
- Load example DMN files
- Automatic decision key extraction
- File validation and error handling

✅ **Operaton Integration**

- Deploy DMN models to Operaton engine
- Track deployment status and IDs
- Configurable API endpoints
- Live decision evaluation testing

✅ **Smart Request Generation**

- Auto-generate test request bodies from DMN input variables
- Intelligent type detection (String, Integer, Boolean, Date)
- Example values for manual uploads
- Pre-configured data for example files

✅ **Metadata Documentation**

- Complete TTL export with DMN metadata
- Input variable documentation
- API endpoint references
- Source file tracking
- Extracted decision rules with legal references

✅ **URI Sanitization** ⭐

- Automatic service identifier sanitization (spaces to hyphens)
- Support for both short IDs and full URIs in organization field
- Clean, absolute URIs throughout
- No URL encoding issues

---

## Architecture

### Component Structure

```
┌────────────────────────────────────────────┐
│         DMNTab Component (React)           │
│  ┌──────────────────────────────────────┐  │
│  │  • File Upload UI                    │  │
│  │  • API Configuration                 │  │
│  │  • Deployment Controls               │  │
│  │  • Test Interface (Postman-like)     │  │
│  │  • Response Display                  │  │
│  └──────────────┬───────────────────────┘  │
│                 │                          │
│  ┌──────────────▼───────────────────────┐  │
│  │   dmnHelpers.js (Utilities)          │  │
│  │  • DMN Parsing                       │  │
│  │  • Rule Extraction                   │  │
│  │  • TTL Generation                    │  │
│  │  • Input Variable Detection          │  │
│  │  • URI Sanitization                  │  │
│  │  • Validation                        │  │
│  └──────────────┬───────────────────────┘  │
│                 │                          │
└─────────────────┼──────────────────────────┘
                  │
                  │ HTTP POST/GET
                  │
┌─────────────────▼────────────────────────────┐
│      Operaton Rule Engine (REST API)         │
│  ┌─────────────────────────────────────────┐ │
│  │  POST /deployment/create                │ │
│  │  POST /decision-definition/key/{}/eval  │ │
│  │  GET  /decision-definition/key/{}/xml   │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Data Flow

```
1. User uploads DMN file
   ↓
2. Extract decision key from XML
   ↓
3. Sanitize service identifier (spaces → hyphens)
   ↓
4. Generate request body template
   ↓
5. User deploys to Operaton
   ↓
6. Operaton returns deployment ID
   ↓
7. User tests with evaluation
   ↓
8. Store test results
   ↓
9. Extract rules from DMN (CPRMV attributes)
   ↓
10. Generate TTL with complete metadata
   ↓
11. Export TTL file for download
```

---

## User Interface

### DMN Tab Layout

```
┌──────────────────────────────────────────────────────────┐
│  DMN Decision Engine Integration                         │
│  Upload DMN files, deploy to Operaton, and test          │
│  decision evaluations.                                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  API Configuration                                       │
│                                                          │
│  Base URL: [https://operaton.open-regels.nl]             │
│  Decision Key: [RONL_BerekenLeeftijden]                  │
│                                                          │
│  Evaluation URL: https://operaton.../evaluate            │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  DMN File              [Load Example] [Clear]            │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  [Choose a DMN file] or drag and drop              │  │
│  │  DMN, XML files supported                          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  OR (when file uploaded):                                │
│                                                          │
│  x RONL_BerekenLeeftijden_CPRMV.dmn                      │
│    14.96 KB • Uploaded 12/22/2025, 12:53:23 PM           │
│    Decision Key: RONL_BerekenLeeftijden                  │
│                                                          │
│    [Deploy to Operaton]                                  │
│                                                          │
│    x DMN deployed successfully                           │
│      Deployment ID: e4d3b749-d2c-1110-965c-...           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  </> Test Decision Evaluation                            │
│                                                          │
│  Request Body (JSON)                                     │
│  Request body auto-generated from DMN input vars         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ {                                                  │  │
│  │   "variables": {                                   │  │
│  │     "geboortedatumAanvrager": {                    │  │
│  │       "value": "1980-01-23",                       │  │
│  │       "type": "String"                             │  │
│  │     }                                              │  │
│  │   }                                                │  │
│  │ }                                                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [Evaluate Decision]                                     │
│                                                          │
│  Response                               [200 OK]         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ [                                                  │  │
│  │   {                                                │  │
│  │     "leeftijdAanvrager": {                         │  │
│  │       "type": "Integer",                           │  │
│  │       "value": 45                                  │  │
│  │     }                                              │  │
│  │   }                                                │  │
│  │ ]                                                  │  │
│  └────────────────────────────────────────────────────┘  │
│  Tested at: 12/22/2025, 12:54:20 PM                      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  x Ready to Save                                         │
│  DMN metadata and test results will be included in       │
│  your TTL export.                                        │
└──────────────────────────────────────────────────────────┘
```

### UI Features

1. **API Configuration**
   - Editable Base URL and Decision Key
   - Live evaluation URL preview
   - Decision Key auto-fills from DMN
   - Disabled when no file uploaded

2. **File Upload**
   - Drag-and-drop support
   - File validation (.dmn, .xml)
   - Load Example button
   - Clear button with state reset

3. **Deployment**
   - One-click deployment
   - Status indicators (deploying, success, error)
   - Deployment ID display
   - Prevents re-deployment

4. **Testing**
   - JSON editor with syntax highlighting
   - Auto-generated request template
   - Smart type detection
   - Real-time evaluation
   - Formatted response display

5. **Status Messages**
   - Success confirmations (green)
   - Error messages (red)
   - Warning indicators (amber)
   - Info messages (blue)

---

## Data Model

### DMN State Object

```javascript
{
  fileName: string,           // Name of uploaded DMN file
  content: string,            // Raw DMN XML content
  decisionKey: string,        // Decision definition key
  deployed: boolean,          // Deployment status
  deploymentId: string|null,  // Operaton deployment ID
  deployedAt: string|null,    // ISO timestamp of deployment
  apiEndpoint: string,        // Full evaluation endpoint URL
  lastTestResult: object|null,// Last evaluation result
  lastTestTimestamp: string|null, // ISO timestamp of last test
  testBody: string|null       // JSON request body used
}
```

### API Configuration Object

```javascript
{
  baseUrl: string,            // Operaton base URL
  decisionKey: string,        // Decision key for evaluation
  evaluateEndpoint: string,   // Endpoint template for evaluation
  deploymentEndpoint: string  // Endpoint for deployment
}
```

---

## TTL Output Structure

### Decision Model Resource

```turtle
<https://regels.overheid.nl/services/aow-leeftijd/dmn> a cprmv:DecisionModel ;
    dct:identifier "RONL_BerekenLeeftijden" ;
    dct:title "RONL_BerekenLeeftijden_CPRMV.dmn"@nl ;
    dct:format "application/dmn+xml" ;
    dct:source <https://regels.overheid.nl/services/aow-leeftijd/dmn/RONL_BerekenLeeftijden_CPRMV.dmn> ;
    dct:created "2025-12-22T14:30:00Z"^^xsd:dateTime ;
    cprmv:deploymentId "e4d3b749-d2c-1110-965c-425d91a4e460" ;
    cpsv:implements <https://regels.overheid.nl/services/aow-leeftijd> ;
    ronl:implementedBy <https://operaton.open-regels.nl/engine-rest/decision-definition/key/RONL_BerekenLeeftijden/evaluate> ;
    cprmv:lastTested "2025-12-22T14:35:00Z"^^xsd:dateTime ;
    cprmv:testStatus "passed" ;
    dct:description "DMN decision model for service evaluation"@nl .
```

### Input Variables

```turtle
<https://regels.overheid.nl/services/aow-leeftijd/dmn/input/1> a cpsv:Input ;
    dct:identifier "geboortedatumAanvrager" ;
    dct:title "geboortedatumAanvrager"@nl ;
    dct:type "String" ;
    schema:value "1980-01-23" ;
    cpsv:isRequiredBy <https://regels.overheid.nl/services/aow-leeftijd/dmn> .

<https://regels.overheid.nl/services/aow-leeftijd/dmn/input/2> a cpsv:Input ;
    dct:identifier "dagVanAanvraag" ;
    dct:title "dagVanAanvraag"@nl ;
    dct:type "String" ;
    schema:value "2025-09-29" ;
    cpsv:isRequiredBy <https://regels.overheid.nl/services/aow-leeftijd/dmn> .
```

### Extracted Decision Rules

```turtle
<https://regels.overheid.nl/services/aow-leeftijd/rules/DecisionRule_2020> a cpsv:Rule, cprmv:DecisionRule ;
    dct:identifier "DecisionRule_2020" ;
    cpsv:implements <https://regels.overheid.nl/services/aow-leeftijd> ;
    cprmv:extends <https://wetten.overheid.nl/BWBR0002221_2020-01-01_0/Artikel_7a/Lid_1> ;
    cprmv:validFrom "2020-01-01"^^xsd:date ;
    cprmv:validUntil "2020-12-31"^^xsd:date ;
    cprmv:ruleType "temporal-period" ;
    cprmv:confidence "high" ;
    cprmv:decisionTable "DecisionTable_aow" ;
    cprmv:rulesetType "temporal-mapping" .
```

### Service Reference

```turtle
<https://regels.overheid.nl/services/aow-leeftijd> a cpsv:PublicService ;
    dct:identifier "aow-leeftijd" ;
    # ... other service properties ...
    cprmv:hasDecisionModel <https://regels.overheid.nl/services/aow-leeftijd/dmn> .
```

---

## Vocabulary Mapping

### CPRMV Vocabulary (Core)

| Property                 | Domain              | Range               | Description                                             |
| ------------------------ | ------------------- | ------------------- | ------------------------------------------------------- |
| `cprmv:DecisionModel`    | Class               | -                   | A decision model resource (DMN)                         |
| `cprmv:DecisionRule`     | Class               | -                   | A specific rule within a decision model                 |
| `cprmv:hasDecisionModel` | cpsv:PublicService  | cprmv:DecisionModel | Links service to its decision model                     |
| `cprmv:deploymentId`     | cprmv:DecisionModel | xsd:string          | Operaton deployment identifier                          |
| `cprmv:lastTested`       | cprmv:DecisionModel | xsd:dateTime        | Timestamp of last successful test                       |
| `cprmv:testStatus`       | cprmv:DecisionModel | xsd:string          | Status of last test (passed/failed)                     |
| `cprmv:extends`          | cprmv:DecisionRule  | rdfs:Resource       | Legal article extended by this rule                     |
| `cprmv:ruleType`         | cprmv:DecisionRule  | xsd:string          | Type of rule (temporal-period, conditional-calculation) |
| `cprmv:confidence`       | cprmv:DecisionRule  | xsd:string          | Confidence level (high, medium, low)                    |
| `cprmv:note`             | cprmv:DecisionRule  | rdf:langString      | Human-readable note about the rule                      |
| `cprmv:decisionTable`    | cprmv:DecisionRule  | xsd:string          | Decision table identifier                               |
| `cprmv:rulesetType`      | cprmv:DecisionRule  | xsd:string          | Type of ruleset                                         |

### Dublin Core Terms

| Property          | Domain              | Range          | Description                      |
| ----------------- | ------------------- | -------------- | -------------------------------- |
| `dct:identifier`  | cprmv:DecisionModel | xsd:string     | Decision key                     |
| `dct:title`       | cprmv:DecisionModel | rdf:langString | DMN file name                    |
| `dct:format`      | cprmv:DecisionModel | xsd:string     | Media type (application/dmn+xml) |
| `dct:source`      | cprmv:DecisionModel | rdfs:Resource  | URI where DMN file is stored     |
| `dct:created`     | cprmv:DecisionModel | xsd:dateTime   | Deployment timestamp             |
| `dct:description` | cprmv:DecisionModel | rdf:langString | Human-readable description       |

### RONL Vocabulary

| Property             | Domain              | Range         | Description                         |
| -------------------- | ------------------- | ------------- | ----------------------------------- |
| `ronl:implementedBy` | cprmv:DecisionModel | rdfs:Resource | Software system (Operaton endpoint) |

### CPSV-AP

| Property            | Domain              | Range               | Description                         |
| ------------------- | ------------------- | ------------------- | ----------------------------------- |
| `cpsv:implements`   | cprmv:DecisionModel | cpsv:PublicService  | Service implemented by DMN          |
| `cpsv:Input`        | Class               | -                   | Input variable required by decision |
| `cpsv:isRequiredBy` | cpsv:Input          | cprmv:DecisionModel | Links input to decision model       |
| `cpsv:Rule`         | Class               | -                   | Base class for rules                |

### Schema.org

| Property       | Domain     | Range   | Description             |
| -------------- | ---------- | ------- | ----------------------- |
| `schema:value` | cpsv:Input | various | Example value for input |

---

## Implementation Details

### File Locations

```
src/
├── components/
│   └── tabs/
│       ├── DMNTab.jsx              # Main DMN tab component (650 lines)
│       └── index.js                # Barrel export (includes DMNTab)
├── utils/
│   ├── dmnHelpers.js               # DMN TTL utilities (370 lines)
│   └── index.js                    # Barrel export (includes dmnHelpers)
└── App.js                          # Updated with DMN state and integration

public/
└── examples/
    └── organizations/
        └── svb/
            └── RONL_BerekenLeeftijden_CPRMV.dmn  # Example file
```

### Key Functions

#### DMNTab.jsx

```javascript
// Generate request body from DMN input variables
generateRequestBodyFromDMN(dmnContent);

// Load example DMN file
loadExampleDMN();

// Upload and parse DMN file
handleFileUpload(event);

// Deploy DMN to Operaton
handleDeployDMN();

// Evaluate decision with test data
handleEvaluateDMN();

// Clear all DMN data
handleClearFile();
```

#### dmnHelpers.js

```javascript
// Sanitize service identifier for URIs (spaces → hyphens)
sanitizeServiceIdentifier(identifier): string

// Build proper service URI from identifier
buildServiceUri(identifier): string

// Generate DMN metadata TTL
generateDMNTTL(dmnData, serviceUri): string

// Extract rules from DMN XML
extractRulesFromDMN(dmnContent, serviceUri): Array

// Generate rules TTL from extracted rules
generateRulesTTL(rules, serviceUri): string

// Generate complete DMN section
generateCompleteDMNSection(dmnData, serviceUri): string

// Validate DMN data
validateDMNData(dmnData): {valid: boolean, errors: string[]}

// Extract input variables from test result
extractInputsFromTestResult(dmnData): Array
```

### Dependencies

```json
{
  "react": "^18.3.1",
  "lucide-react": "^0.263.1"
}
```

No additional dependencies required - uses native browser APIs:

- `DOMParser` for XML parsing
- `fetch` for HTTP requests
- `FileReader` for file upload
- `Blob` and `URL` for file handling

---

## Usage Guide

### Basic Workflow

1. **Fill in Service Information First** ⭐
   - Go to **Service tab**
   - Fill in Service Identifier (e.g., "aow leeftijd")
   - Fill in Service Name and Description
   - Complete Organization and Legal Resource tabs

2. **Navigate to DMN Tab**
   - Click "DMN" in the tab navigation
   - Verify service metadata is filled

3. **Upload DMN File**
   - Click "Choose a DMN file" or drag and drop
   - Alternatively, click "Load Example" for demo
   - Verify decision key is auto-filled

4. **Deploy to Operaton**
   - Review API configuration
   - Click "Deploy to Operaton"
   - Wait for success confirmation
   - Note the deployment ID

5. **Test Evaluation**
   - Review auto-generated request body
   - Modify test values if needed
   - Click "Evaluate Decision"
   - Verify response is correct

6. **Export TTL**
   - Click "Validate" to check all data
   - Click "Download TTL" to export
   - DMN metadata and rules are included automatically

### Advanced Features

#### Custom Operaton Instance

To use a different Operaton instance:

```
1. Update Base URL: https://your-instance.com
2. Decision Key will auto-fill from DMN
3. Evaluation URL updates automatically
4. Deploy and test as normal
```

#### Manual Request Body

While auto-generation is recommended:

```json
{
  "variables": {
    "yourVariable": {
      "value": "your-value",
      "type": "String"
    }
  }
}
```

Supported types: `String`, `Integer`, `Double`, `Boolean`, `Date`

#### Troubleshooting

**Problem**: Service shows as "unknown-service" in URIs

- **Solution**: Fill in Service Identifier field in Service tab FIRST

**Problem**: Organization URI is incomplete (`<.../organizations/>`)

- **Solution**: Ensure you're using the CORRECTED App.js (v1.5.0) with proper `buildResourceUri` parameter order

**Problem**: Decision Key not filling

- **Solution**: Check DMN has `<decision id="...">` attribute

**Problem**: Deployment fails

- **Solution**: Verify Operaton URL is accessible and DMN is valid XML

**Problem**: Evaluation fails with 404

- **Solution**: Ensure DMN is deployed successfully first

**Problem**: Request body empty

- **Solution**: DMN must have `<inputData>` elements for auto-generation

---

## API Integration

### Operaton REST API

#### Deploy DMN

```http
POST /engine-rest/deployment/create
Content-Type: multipart/form-data

Form Data:
- deployment-name: string
- deployment-source: string
- data: file (DMN XML)

Response: {
  id: string,
  name: string,
  source: string,
  deploymentTime: string,
  ...
}
```

#### Evaluate Decision

```http
POST /engine-rest/decision-definition/key/{key}/evaluate
Content-Type: application/json

Body: {
  "variables": {
    "varName": {
      "value": mixed,
      "type": string
    }
  }
}

Response: [
  {
    "outputVar": {
      "type": string,
      "value": mixed,
      "valueInfo": {}
    }
  }
]
```

### Error Handling

```javascript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  // Process data
} catch (error) {
  // Display error to user
  setError(error.message);
}
```

---

## Best Practices

### DMN File Design

1. **Use Descriptive IDs**

   ```xml
   <decision id="RONL_BerekenLeeftijden" name="Calculate Ages">
   ```

2. **Add CPRMV Attributes to Rules**

   ```xml
   <rule id="DecisionRule_2020"
         cprmv:extends="BWBR0002221_2020-01-01_0/Artikel_7a/Lid_1"
         cprmv:validFrom="2020-01-01"
         cprmv:validUntil="2020-12-31"
         cprmv:ruleType="temporal-period"
         cprmv:confidence="high">
   ```

3. **Document Input Data**

   ```xml
   <inputData id="InputData_dagVanAanvraag"
              name="dagVanAanvraag"
              cprmv:description="De datum waarop de aanvraag wordt gedaan" />
   ```

4. **Use Semantic Variable Names**
   - Dutch: `geboortedatum`, `aanvraagdatum`
   - Include type hints: `isVolledig` (boolean), `aantalMaanden` (integer)

5. **Test Before Deployment**
   - Validate DMN in Camunda Modeler
   - Check all decision tables have inputs/outputs
   - Verify CPRMV attributes are present

---

## URI Generation

### Service Identifier Sanitization ⭐

The editor automatically sanitizes service identifiers to create valid URIs:

```javascript
// Input: "aow leeftijd" (with space)
// Output: "aow-leeftijd" (hyphenated)

sanitizeServiceIdentifier('aow leeftijd');
// Returns: "aow-leeftijd"

// Sanitization rules:
// 1. Convert to lowercase
// 2. Replace spaces with hyphens
// 3. Remove special characters (except hyphens)
// 4. Collapse multiple hyphens
// 5. Remove leading/trailing hyphens
```

**Result:**

```turtle
<https://regels.overheid.nl/services/aow-leeftijd> a cpsv:PublicService ;
    dct:identifier "aow-leeftijd" ;
    cprmv:hasDecisionModel <https://regels.overheid.nl/services/aow-leeftijd/dmn> .
```

### Organization URI Handling ⭐

The editor supports BOTH short IDs and full URIs:

**Option 1: Short ID**

```
Input: "28212263"
Output: <https://regels.overheid.nl/organizations/28212263>
```

**Option 2: Full URI** ✓ Full URI detected - will be used directly

```
Input: "https://organisaties.overheid.nl/28212263/Sociale_Verzekeringsbank"
Output: <https://organisaties.overheid.nl/28212263/Sociale_Verzekeringsbank>
```

The `buildResourceUri()` function intelligently detects full URIs and uses them as-is!

---

## Success Criteria

✅ **All URIs are absolute**

```turtle
<https://regels.overheid.nl/services/aow-leeftijd>
<https://regels.overheid.nl/services/aow-leeftijd/dmn>
<https://regels.overheid.nl/services/aow-leeftijd/rules/DecisionRule_2020>
```

✅ **No URL encoding issues**

```turtle
# ✅ Correct
<https://regels.overheid.nl/services/aow-leeftijd>

# ❌ Wrong (old version)
<https://regels.overheid.nl/services/aow%20leeftijd>
```

✅ **Legal resource references are complete**

```turtle
cprmv:extends <https://wetten.overheid.nl/BWBR0002221_2020-01-01_0/Artikel_7a/Lid_1> ;
```

✅ **No duplicate namespace declarations**

```turtle
# ✅ Only once
@prefix cprmv: <https://cprmv.open-regels.nl/0.3.0/> .
```

✅ **All 13 rules extracted** (for example DMN: 2020-2030 + 2 conditional rules)

✅ **CPRMV-compliant metadata**

- Decision model with deployment tracking
- Input variables with types and examples
- Rules with legal references and validity periods
- Test status and timestamps

---

**Document Version:** 1.5.0  
**Document Status:** Production Ready  
**Last Updated:** December 23, 2025  
**Next Review:** After user feedback

---

_DMN Integration - Part of RONL Initiative Core Public Service Editor_ ✨
