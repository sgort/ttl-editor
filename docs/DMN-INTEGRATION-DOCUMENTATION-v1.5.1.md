# DMN Integration Documentation - Version 1.5.1

**Editor Version:** 1.5.1  
**Date:** December 2025  
**Feature:** DMN Decision Engine Integration + Import Preservation  
**Status:** ✅ Production Ready

---

## 🆕 What's New in v1.5.1

### DMN Import Preservation (Option 3)

**The Problem Solved:**

- Previously, importing TTL files with DMN data would silently discard the DMN metadata
- Users lost deployment IDs, test results, and extracted rules on import/export cycles
- No clear indication that DMN data existed in imported files

**The Solution:**

- ✅ **Automatic DMN Detection** - Parser identifies DMN entities on import
- ✅ **Block Preservation** - Raw DMN TTL blocks stored unchanged
- ✅ **Visual Indicators** - "Imported" badge on DMN tab
- ✅ **Clear Communication** - Blue info panel explains preserved data
- ✅ **Perfect Round-trip** - Import → Edit → Export preserves all DMN data
- ✅ **Flexible Workflow** - Option to clear imported DMN and create new

**User Experience:**

```
User imports TTL with DMN
    ↓
✅ Message: "DMN data preserved but cannot be edited"
    ↓
✅ DMN tab shows "Imported" badge
    ↓
✅ Blue info panel explains what's preserved
    ↓
User edits Service/Organization/Legal
    ↓
User exports TTL
    ↓
✅ All edits included + DMN unchanged
```

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Interface](#user-interface)
4. [Import Preservation](#import-preservation)
5. [Data Model](#data-model)
6. [TTL Output Structure](#ttl-output-structure)
7. [Vocabulary Mapping](#vocabulary-mapping)
8. [Implementation Details](#implementation-details)
9. [Usage Guide](#usage-guide)
10. [API Integration](#api-integration)
11. [Best Practices](#best-practices)
12. [URI Generation](#uri-generation)

---

## Overview

### Purpose

The DMN (Decision Model and Notation) integration enables the CPSV Editor to:

- Upload and deploy DMN decision models to the Operaton rule engine
- Test decision evaluations with live data
- Document decision logic as part of public service metadata
- Generate CPSV-AP and CPRMV compliant TTL output
- **🆕 Preserve imported DMN data across import/export cycles**

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

✅ **🆕 Import Preservation** ⭐ NEW in v1.5.1

- Automatic detection of DMN data in imported TTL files
- Perfect preservation of DMN blocks during import/export cycles
- Clear visual indication of imported DMN status
- Ability to clear and recreate DMN data
- No data loss in version control workflows

---

## Architecture

### Component Structure

```
┌────────────────────────────────────────────────────────────┐
│         DMNTab Component (React)                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • File Upload UI                                    │  │
│  │  • API Configuration                                 │  │
│  │  • Deployment Controls                               │  │
│  │  • Test Interface (Postman-like)                     │  │
│  │  • Response Display                                  │  │
│  │  • Import Notice UI (when DMN imported)              │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                          │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │   dmnHelpers.js (Utilities)                          │  │
│  │  • DMN Parsing                                       │  │
│  │  • Rule Extraction                                   │  │
│  │  • TTL Generation                                    │  │
│  │  • Input Variable Detection                          │  │
│  │  • URI Sanitization                                  │  │
│  │  • Validation                                        │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                          │
└─────────────────┼──────────────────────────────────────────┘
                  │
                  │ HTTP POST/GET
                  │
┌─────────────────▼──────────────────────────────────────────┐
│      Operaton Rule Engine (REST API)                       │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  POST /deployment/create                              │ │
│  │  POST /decision-definition/key/{}/eval                │ │
│  │  GET  /decision-definition/key/{}/xml                 │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Data Flow - Creating New DMN

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

### 🆕 Data Flow - Importing Existing DMN

```
1. User imports TTL file
   ↓
2. Parser detects DMN entities (DecisionModel, Input, DecisionRule)
   ↓
3. Capture raw DMN blocks (preserving exact formatting)
   ↓
4. Set state: isImported=true, importedDmnBlocks="..."
   ↓
5. DMN tab displays "Imported" badge
   ↓
6. DMN tab shows blue preservation notice
   ↓
7. User edits other tabs (Service, Org, Legal, etc.)
   ↓
8. User exports TTL
   ↓
9. Edits included + DMN blocks appended unchanged
   ↓
10. Perfect round-trip ✅
```

---

## User Interface

### DMN Tab Layout - Normal Mode

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
│    [Deploy to Operaton]                                  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Test Evaluation (Postman-style)                         │
│                                                          │
│  Request Body:                                           │
│  {                                                       │
│    "variables": {                                        │
│      "dagVanAanvraag": {"value": "", "type": "String"},  │
│      "geboortedatumAanvrager": {"value": "..."}          │
│    }                                                     │
│  }                                                       │
│                                                          │
│  [Evaluate Decision]                                     │
└──────────────────────────────────────────────────────────┘
```

### 🆕 DMN Tab Layout - Import Preservation Mode

```
┌──────────────────────────────────────────────────────────┐
│  DMN Data Imported                       [Imported]      │
│                                                          │
│  This TTL file contains DMN decision model data that     │
│  was imported from an external source. The DMN data is   │
│  preserved in your TTL exports but cannot be edited in   │
│  this interface.                                         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  What's Preserved:                                 │  │
│  │                                                    │  │
│  │  • Decision Model Metadata - Deployment ID,        │  │
│  │    timestamps, test status                         │  │
│  │  • Input Variables - Variable names, types, and    │  │
│  │    example values                                  │  │
│  │  • Extracted Decision Rules - Rules with legal     │  │
│  │    references and validity periods                 │  │
│  │  • API Integration - Operaton endpoint references  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  How to Edit DMN Data:                             │  │
│  │                                                    │  │
│  │  1. Export your current TTL (DMN data will be      │  │
│  │     included)                                      │  │
│  │  2. Manually remove the DMN sections from the TTL  │  │
│  │     file if needed                                 │  │
│  │  3. Re-import the TTL and use the DMN tab to       │  │
│  │     create new DMN data                            │  │
│  │                                                    │  │
│  │  Or click "Clear Imported DMN Data" below to       │  │
│  │  create new DMN models.                            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│   Your exports will include the original DMN data        │
│     unchanged.                                           │
│                                                          │
│                          [Clear Imported DMN Data]       │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Why can't I edit imported DMN?                          │
│                                                          │
│  The DMN tab is designed for creating and deploying      │
│  new DMN decision models to Operaton. When you import    │
│  a TTL file that already contains DMN data, it           │
│  preserves that data exactly as it was, including        │
│  deployment IDs, test results, and rule extractions.     │
│  This ensures data integrity and prevents accidental     │
│  modifications to production decision models.            │
│                                                          │
│  You can still edit all other aspects of your service    │
│  (Service, Organization, Legal, Rules, Parameters) and   │
│  the DMN data will remain unchanged in your exports.     │
└──────────────────────────────────────────────────────────┘
```

### Tab Navigation with Import Indicator

```
┌─────────┬─────────────┬────────┬────────┬────────────┬────────┬─────────────┐
│ Service │Organization │ Legal  │ Rules  │ Parameters │ CPRMV  │ DMN Imported│
└─────────┴─────────────┴────────┴────────┴────────────┴────────┴─────────────┘
                                                                    ↑
                                                            Blue badge appears
                                                            when DMN is imported
```

---

## 🆕 Import Preservation

### How It Works

#### 1. Detection Phase

During TTL import, the parser:

1. Scans each line for DMN entity types:
   - `cprmv:DecisionModel` - Decision model metadata
   - `cpsv:Input` - Input variables
   - `cprmv:DecisionRule` - Extracted rules

2. When DMN entity detected:
   - Set `inDmnSection = true`
   - Set `hasDmnData = true`
   - Start capturing raw lines

3. Capture continues until:
   - Non-DMN entity encountered
   - End of file reached

#### 2. Storage Phase

```javascript
// Parser output includes:
{
  service: { ... },
  organization: { ... },
  legalResource: { ... },
  // ... other fields ...

  // NEW in v1.5.1:
  hasDmnData: true,                    // Detection flag
  importedDmnBlocks: "raw TTL string"  // Exact DMN content
}
```

#### 3. State Management

```javascript
// App.js state includes:
dmnData: {
  fileName: '',
  content: '',
  // ... other fields ...

  // NEW in v1.5.1:
  importedDmnBlocks: "raw TTL from import",
  isImported: true  // UI control flag
}
```

#### 4. Export Phase

```javascript
// When generating TTL for export:
if (dmnData.isImported && dmnData.importedDmnBlocks) {
  // Append preserved blocks unchanged
  ttl += dmnData.importedDmnBlocks;
} else if (dmnData.fileName && dmnData.content) {
  // Generate new DMN section from uploaded file
  ttl += generateCompleteDMNSection(dmnData, serviceUri);
}
```

### What Gets Preserved

When importing TTL with DMN, these elements are captured **exactly as they appear**:

✅ **Decision Model Block**

```turtle
<serviceUri/dmn> a cprmv:DecisionModel ;
    dct:identifier "RONL_BerekenLeeftijden" ;
    dct:title "RONL_BerekenLeeftijden_CPRMV.dmn"@nl ;
    dct:format "application/dmn+xml" ;
    dct:source <serviceUri/dmn/RONL_BerekenLeeftijden_CPRMV.dmn> ;
    dct:created "2025-12-22T14:45:32.255Z"^^xsd:dateTime ;
    cprmv:deploymentId "ddbd0e2d-df44-11f0-965c-425d91a4e460" ;
    cpsv:implements <serviceUri> ;
    ronl:implementedBy <https://operaton.../evaluate> ;
    cprmv:lastTested "2025-12-22T14:45:33.634Z"^^xsd:dateTime ;
    cprmv:testStatus "passed" ;
    dct:description "DMN decision model for service evaluation"@nl .
```

✅ **Input Variables**

```turtle
<serviceUri/dmn/input/1> a cpsv:Input ;
    dct:identifier "dagVanAanvraag" ;
    dct:title "dagVanAanvraag"@nl ;
    dct:type "String" ;
    schema:value "" ;
    cpsv:isRequiredBy <serviceUri/dmn> .
```

✅ **Extracted Decision Rules**

```turtle
<serviceUri/rules/DecisionRule_2020> a cpsv:Rule, cprmv:DecisionRule ;
    dct:identifier "DecisionRule_2020" ;
    dct:title "AOW leeftijd regel 2020"@nl ;
    cprmv:extends <https://wetten.overheid.nl/.../artikel/7a> ;
    ronl:validFrom "2020-01-01"^^xsd:date ;
    ronl:validUntil "2020-12-31"^^xsd:date ;
    cprmv:ruleType "decisionTable" ;
    cprmv:confidence "high" ;
    cprmv:note "Extracted from DMN decision table"@nl ;
    cprmv:decisionTable "berekenLeeftijd" .
```

✅ **Comments and Formatting**

- Section headers like `# DMN Decision Model`
- Blank lines between entities
- Comment annotations
- Original indentation

### User Workflows

#### Workflow 1: Import → Edit → Export

```
1. User imports aow-leeftijd-with-rules.ttl
   ✅ DMN detected: "DMN data preserved but cannot be edited"
   ✅ DMN tab shows "Imported" badge
   ✅ DMN tab shows blue preservation notice

2. User edits Service Name to "AOW Leeftijdsberekening (Updated)"

3. User edits Legal Resource description

4. User clicks "Download TTL"
   ✅ Service name updated in output
   ✅ Legal description updated in output
   ✅ DMN blocks included exactly as imported
   ✅ Perfect round-trip achieved

5. Git commit shows:
   - Service name changed ✓
   - Legal description changed ✓
   - DMN section unchanged ✓
```

#### Workflow 2: Clear and Recreate

```
1. User imports TTL with DMN
   ✅ DMN preserved, tab shows "Imported" badge

2. User wants to create new DMN version
   → Clicks "Clear Imported DMN Data"
   → Confirmation dialog appears

3. User confirms
   ✅ importedDmnBlocks cleared
   ✅ isImported set to false
   ✅ DMN tab returns to normal upload UI
   ✅ "Imported" badge removed

4. User clicks "Load Example"
   ✅ New DMN file loaded

5. User deploys and tests
   ✅ New deployment ID

6. User exports TTL
   ✅ New DMN section generated
   ✅ Old DMN data replaced
```

#### Workflow 3: Iterative Development

```
1. Developer creates service with DMN

2. Exports to aow-v1.ttl

3. Colleague imports aow-v1.ttl
   ✅ DMN preserved
   ✅ Can edit other fields
   ✅ DMN metadata intact

4. Colleague adds parameters, exports to aow-v2.ttl

5. Developer imports aow-v2.ttl
   ✅ Parameters visible
   ✅ DMN still intact
   ✅ No data loss in collaboration
```

### Benefits of Import Preservation

| Benefit                    | Description                                         |
| -------------------------- | --------------------------------------------------- |
| 🔒 **Data Integrity**      | DMN metadata survives import/export cycles          |
| 👁️ **Clear Communication** | Visual indicators show DMN status                   |
| 🔄 **Perfect Round-trip**  | No data loss when editing services                  |
| 🎯 **Git-Friendly**        | DMN unchanged in version control                    |
| 🛡️ **Production Safety**   | Prevents accidental modification of deployed models |
| ⚡ **Flexible Workflow**   | Can clear and recreate when needed                  |
| 📊 **Audit Trail**         | Deployment IDs and test results preserved           |

---

## Data Model

### DMN State Structure (v1.5.1)

```javascript
dmnData: {
  // File upload
  fileName: string,              // e.g., "RONL_BerekenLeeftijden_CPRMV.dmn"
  content: string,               // XML content of DMN file

  // Deployment
  decisionKey: string,           // Extracted from DMN (e.g., "RONL_BerekenLeeftijden")
  deployed: boolean,             // Deployment status
  deploymentId: string | null,   // Operaton deployment ID
  deployedAt: string | null,     // ISO timestamp

  // API configuration
  apiEndpoint: string,           // Operaton base URL

  // Testing
  lastTestResult: object | null, // Last evaluation response
  lastTestTimestamp: string | null,
  testBody: string | null,       // Request body JSON

  // 🆕 NEW in v1.5.1: Import preservation
  importedDmnBlocks: string | null,  // Raw TTL blocks from import
  isImported: boolean,                // Flag for UI control
}
```

### Detection Logic

```javascript
// In parseTTL.enhanced.js

// DMN entity detection (vocabularies.config.js)
export const detectEntityType = (line) => {
  // Check DMN entities FIRST (before regular entities)
  if (line.includes('a cprmv:DecisionModel')) return 'dmnModel';
  if (line.includes('a cpsv:Input')) return 'dmnInput';
  if (line.includes('a cprmv:DecisionRule')) return 'dmnRule';

  // ... regular entity detection ...
};

// DMN block capture
if (detectedType === 'dmnModel' ||
    detectedType === 'dmnInput' ||
    detectedType === 'dmnRule') {

  if (!inDmnSection) {
    inDmnSection = true;
    parsed.hasDmnData = true;
  }

  dmnLines.push(rawLine);  // Capture exact line
  continue;
}

// Store captured blocks
if (parsed.hasDmnData && dmnLines.length > 0) {
  parsed.importedDmnBlocks = dmnLines.join('\n');
}
```

---

## TTL Output Structure

### Complete TTL with DMN (v1.5.1)

```turtle
@prefix cpsv: <http://purl.org/vocab/cpsv#> .
@prefix cv: <http://data.europa.eu/m8g/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix eli: <http://data.europa.eu/eli/ontology#> .
@prefix ronl: <https://regels.overheid.nl/termen/> .
@prefix cprmv: <https://cprmv.open-regels.nl/0.3.0/> .
@prefix schema: <http://schema.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# ========================================
# Public Service
# ========================================

<https://regels.overheid.nl/services/aow-leeftijd> a cpsv:PublicService ;
    dct:identifier "aow-leeftijd" ;
    dct:title "Bepaling leeftijd AOW"@nl ;
    dct:description "Bepaling van de leeftijd AOW (Algemene Ouderdomswet)."@nl ;
    cv:hasCompetentAuthority <https://organisaties.overheid.nl/.../Sociale_Verzekeringsbank> ;
    cv:hasLegalResource <https://wetten.overheid.nl/BWBR0002221> ;
    cprmv:hasDecisionModel <https://regels.overheid.nl/services/aow-leeftijd/dmn> .

# ========================================
# Organization
# ========================================

<https://organisaties.overheid.nl/.../Sociale_Verzekeringsbank> a cv:PublicOrganisation ;
    dct:identifier "https://organisaties.overheid.nl/.../Sociale_Verzekeringsbank" ;
    skos:prefLabel "Sociale Verzekeringsbank"@nl ;
    foaf:homepage <https://www.svb.nl> ;
    cv:spatial <https://publications.europa.eu/resource/authority/country/NLD> .

# ========================================
# Legal Resource
# ========================================

<https://wetten.overheid.nl/BWBR0002221> a eli:LegalResource ;
    dct:identifier "BWBR0002221" ;
    dct:title "Algemene Ouderdomswet"@nl ;
    dct:description "De informatie op wetten.overheid.nl..."@nl ;
    eli:is_realized_by <https://wetten.overheid.nl/BWBR0002221/2025-01-01> .

# ========================================
# DMN Decision Model (🆕 Preserved or Generated)
# ========================================

# DMN Decision Model
<https://regels.overheid.nl/services/aow-leeftijd/dmn> a cprmv:DecisionModel ;
    dct:identifier "RONL_BerekenLeeftijden" ;
    dct:title "RONL_BerekenLeeftijden_CPRMV.dmn"@nl ;
    dct:format "application/dmn+xml" ;
    dct:source <https://regels.overheid.nl/services/aow-leeftijd/dmn/RONL_BerekenLeeftijden_CPRMV.dmn> ;
    dct:created "2025-12-22T14:45:32.255Z"^^xsd:dateTime ;
    cprmv:deploymentId "ddbd0e2d-df44-11f0-965c-425d91a4e460" ;
    cpsv:implements <https://regels.overheid.nl/services/aow-leeftijd> ;
    ronl:implementedBy <https://operaton.open-regels.nl/engine-rest/decision-definition/key/RONL_BerekenLeeftijden/evaluate> ;
    cprmv:lastTested "2025-12-22T14:45:33.634Z"^^xsd:dateTime ;
    cprmv:testStatus "passed" ;
    dct:description "DMN decision model for service evaluation"@nl .

# Required Inputs
<https://regels.overheid.nl/services/aow-leeftijd/dmn/input/1> a cpsv:Input ;
    dct:identifier "dagVanAanvraag" ;
    dct:title "dagVanAanvraag"@nl ;
    dct:type "String" ;
    schema:value "" ;
    cpsv:isRequiredBy <https://regels.overheid.nl/services/aow-leeftijd/dmn> .

# ... more inputs ...

# Rules extracted from DMN
<https://regels.overheid.nl/services/aow-leeftijd/rules/DecisionRule_2020> a cpsv:Rule, cprmv:DecisionRule ;
    dct:identifier "DecisionRule_2020" ;
    dct:title "AOW leeftijd regel 2020"@nl ;
    cprmv:extends <https://wetten.overheid.nl/BWBR0002221/2020-01-01/0/artikel/7a> ;
    ronl:validFrom "2020-01-01"^^xsd:date ;
    ronl:validUntil "2020-12-31"^^xsd:date ;
    cprmv:ruleType "decisionTable" ;
    cprmv:confidence "high" ;
    cprmv:note "Extracted from DMN decision table"@nl ;
    cprmv:decisionTable "berekenLeeftijd" .

# ... more rules (2021-2030) ...
```

---

## Vocabulary Mapping

### CPRMV Vocabulary (v0.3.0)

**Core Classes:**

| Class                 | Description             | Usage                     |
| --------------------- | ----------------------- | ------------------------- |
| `cprmv:DecisionModel` | DMN decision model      | Represents deployed DMN   |
| `cprmv:DecisionRule`  | Extracted rule from DMN | Individual decision rules |

**Properties:**

| Property                 | Domain              | Range               | Description                 |
| ------------------------ | ------------------- | ------------------- | --------------------------- |
| `cprmv:hasDecisionModel` | cpsv:PublicService  | cprmv:DecisionModel | Links service to DMN        |
| `cprmv:deploymentId`     | cprmv:DecisionModel | xsd:string          | Operaton deployment ID      |
| `cprmv:lastTested`       | cprmv:DecisionModel | xsd:dateTime        | Last evaluation timestamp   |
| `cprmv:testStatus`       | cprmv:DecisionModel | xsd:string          | Test result (passed/failed) |
| `cprmv:extends`          | cprmv:DecisionRule  | rdfs:Resource       | Legal article extended      |
| `cprmv:ruleType`         | cprmv:DecisionRule  | xsd:string          | Type of rule                |
| `cprmv:confidence`       | cprmv:DecisionRule  | xsd:string          | Confidence level            |
| `cprmv:decisionTable`    | cprmv:DecisionRule  | xsd:string          | Decision table ID           |

### RONL Vocabulary

| Property             | Domain              | Range         | Description                 |
| -------------------- | ------------------- | ------------- | --------------------------- |
| `ronl:implementedBy` | cprmv:DecisionModel | rdfs:Resource | Software implementing model |
| `ronl:validFrom`     | cprmv:DecisionRule  | xsd:date      | Rule effective date         |
| `ronl:validUntil`    | cprmv:DecisionRule  | xsd:date      | Rule expiration date        |

### CPSV-AP Properties

| Property            | Domain              | Range               | Description                |
| ------------------- | ------------------- | ------------------- | -------------------------- |
| `cpsv:implements`   | cprmv:DecisionModel | cpsv:PublicService  | Service implemented by DMN |
| `cpsv:Input`        | Class               | -                   | Input variable             |
| `cpsv:isRequiredBy` | cpsv:Input          | cprmv:DecisionModel | Links input to model       |
| `cpsv:Rule`         | Class               | -                   | Base class for rules       |

---

## Implementation Details

### File Locations

```
src/
├── components/
│   └── tabs/
│       ├── DMNTab.jsx              # Main DMN tab (850+ lines)
│       │                           # 🆕 Import notice UI added
│       └── index.js                # Barrel export
├── utils/
│   ├── dmnHelpers.js               # DMN TTL utilities (370 lines)
│   ├── parseTTL.enhanced.js        # 🆕 DMN block capture (523 lines)
│   └── config/
│       └── vocabularies.config.js  # 🆕 DMN entity detection
└── App.js                          # 🆕 State management for imports
```

### Key Changes in v1.5.1

#### 1. vocabularies.config.js

```javascript
export const detectEntityType = (line) => {
  // 🆕 DMN detection BEFORE regular entities
  if (line.includes('a cprmv:DecisionModel')) return 'dmnModel';
  if (line.includes('a cpsv:Input')) return 'dmnInput';
  if (line.includes('a cprmv:DecisionRule')) return 'dmnRule';

  // Regular entity detection...
};
```

#### 2. parseTTL.enhanced.js

```javascript
// 🆕 DMN tracking variables
let inDmnSection = false;
let dmnLines = [];

// 🆕 Capture DMN entities
if (detectedType === 'dmnModel' ||
    detectedType === 'dmnInput' ||
    detectedType === 'dmnRule') {

  if (!inDmnSection) {
    inDmnSection = true;
    parsed.hasDmnData = true;
  }

  dmnLines.push(rawLine);
  continue;
}

// 🆕 Store captured blocks
if (parsed.hasDmnData && dmnLines.length > 0) {
  parsed.importedDmnBlocks = dmnLines.join('\n');
  console.log('✅ DMN data detected and preserved:', dmnLines.length, 'lines');
}
```

#### 3. App.js

```javascript
// 🆕 Enhanced state
const [dmnData, setDmnData] = useState({
  // ... existing fields ...
  importedDmnBlocks: null,
  isImported: false,
});

// 🆕 Import handler
if (parsed.hasDmnData && parsed.importedDmnBlocks) {
  setDmnData({
    // ... reset fields ...
    importedDmnBlocks: parsed.importedDmnBlocks,
    isImported: true,
  });
  setImportStatus({
    message: 'TTL imported successfully. DMN data preserved but cannot be edited.',
  });
}

// 🆕 Export handler
if (dmnData.isImported && dmnData.importedDmnBlocks) {
  ttl += dmnData.importedDmnBlocks; // Preserved blocks
} else if (dmnData.fileName && dmnData.content) {
  ttl += generateCompleteDMNSection(dmnData, serviceUri); // New DMN
}

// 🆕 parseTTL wrapper must pass through DMN fields
return {
  // ... all other fields ...
  hasDmnData: parsed.hasDmnData || false,
  importedDmnBlocks: parsed.importedDmnBlocks || null,
};
```

#### 4. DMNTab.jsx

```javascript
const DMNTab = ({ dmnData, setDmnData }) => {
  // 🆕 Early return for imported DMN
  if (dmnData.isImported) {
    return (
      <div className="space-y-6">
        {/* Blue preservation notice */}
        <div className="bg-blue-50 border-2 border-blue-200...">
          <h3>📋 DMN Data Imported</h3>
          <p>This TTL file contains DMN decision model data...</p>

          {/* What's preserved */}
          <ul>
            <li>Decision Model Metadata</li>
            <li>Input Variables</li>
            <li>Extracted Decision Rules</li>
            <li>API Integration</li>
          </ul>

          {/* Clear button */}
          <button onClick={clearImportedDMN}>Clear Imported DMN Data</button>
        </div>
      </div>
    );
  }

  // Normal DMN tab UI continues...
};
```

---

## Usage Guide

### Basic Workflow - Creating New DMN

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
   - Click "Download TTL"
   - DMN metadata included in export
   - All 13+ rules extracted automatically

### 🆕 Workflow - Importing Existing DMN

1. **Import TTL File**
   - Click "Import TTL File"
   - Select file with DMN data
   - See message: "DMN data preserved but cannot be edited"

2. **Verify Import**
   - Check DMN tab button for "Imported" badge
   - Click DMN tab
   - See blue preservation notice
   - Verify what's preserved

3. **Edit Other Tabs**
   - Edit Service, Organization, Legal as needed
   - Add/modify Parameters, Rules, CPRMV
   - DMN remains unchanged

4. **Export Updated TTL**
   - Click "Download TTL"
   - Your edits included
   - DMN blocks appended unchanged
   - Perfect round-trip achieved

5. **Optional: Clear and Recreate**
   - Click "Clear Imported DMN Data"
   - Confirm action
   - DMN tab returns to normal mode
   - Upload new DMN file
   - Deploy and test as normal

---

## API Integration

### Operaton REST API

**Base URL:** `https://operaton-doc.open-regels.nl` (configurable)

**Endpoints Used:**

1. **Deploy DMN**
   - **Method:** `POST`
   - **Endpoint:** `/engine-rest/deployment/create`
   - **Content-Type:** `multipart/form-data`
   - **Body:**
     - `deployment-name`: Service identifier
     - `upload`: DMN file (XML)
   - **Response:**
     ```json
     {
       "id": "ddbd0e2d-df44-11f0-965c-425d91a4e460",
       "deploymentTime": "2025-12-22T14:45:32.255Z"
     }
     ```

2. **Evaluate Decision**
   - **Method:** `POST`
   - **Endpoint:** `/engine-rest/decision-definition/key/{decisionKey}/evaluate`
   - **Content-Type:** `application/json`
   - **Body:**
     ```json
     {
       "variables": {
         "dagVanAanvraag": { "value": "2025-01-15", "type": "String" },
         "geboortedatumAanvrager": { "value": "1958-03-20", "type": "String" }
       }
     }
     ```
   - **Response:**
     ```json
     {
       "aowLeeftijd": 67,
       "aowIngangsdatum": "2025-09-20"
     }
     ```

---

## Best Practices

### DMN File Management

✅ **DO:**

- Use descriptive DMN file names (e.g., `RONL_BerekenLeeftijden_CPRMV.dmn`)
- Include CPRMV attributes in DMN XML for rule extraction
- Test thoroughly before deployment
- Document input variable types and examples
- Use semantic decision keys (not "Decision_1")

❌ **DON'T:**

- Deploy without testing first
- Use spaces in decision keys (use underscores or camelCase)
- Forget to fill in service metadata before uploading DMN
- Deploy to production without validation

### 🆕 Import/Export Best Practices

✅ **DO:**

- Always use "Import TTL" for files with existing DMN
- Verify "Imported" badge appears after import
- Export frequently to preserve work
- Use version control (Git) for TTL files
- Keep deployment IDs for audit trails

❌ **DON'T:**

- Manually edit DMN sections in TTL files
- Clear imported DMN unless you're creating a new version
- Forget to export before closing browser
- Mix DMN from different deployments

### Version Control

```bash
# Good workflow
git add aow-leeftijd.ttl
git commit -m "Updated service description (DMN preserved)"

# DMN section unchanged in diff
git diff
- dct:description "Old description"@nl ;
+ dct:description "New description"@nl ;
# DMN blocks: no changes ✓
```

---

## URI Generation

### Service URI Sanitization

**Problem:** Service identifiers with spaces create invalid URIs

**Solution:** Automatic sanitization

```javascript
// Input
serviceIdentifier: "aow leeftijd"

// Output
<https://regels.overheid.nl/services/aow-leeftijd> a cpsv:PublicService ;

// Function
function sanitizeServiceIdentifier(identifier) {
  return identifier
    .replace(/\s+/g, '-')      // spaces → hyphens
    .replace(/%20/g, '-')      // URL encoding → hyphens
    .toLowerCase();
}
```

### Organization URI Handling

**Supports both formats:**

```javascript
// Short ID → Full URI
"28212263"
→ "https://organisaties.overheid.nl/28212263/Sociale_Verzekeringsbank"

// Full URI → Use as-is
"https://organisaties.overheid.nl/28212263/Sociale_Verzekeringsbank"
→ "https://organisaties.overheid.nl/28212263/Sociale_Verzekeringsbank"
```

### DMN-Specific URIs

```javascript
// Decision Model
<{serviceUri}/dmn> a cprmv:DecisionModel

// Input Variables
<{serviceUri}/dmn/input/{n}> a cpsv:Input

// Extracted Rules
<{serviceUri}/rules/DecisionRule_{year}> a cpsv:Rule, cprmv:DecisionRule
```

**Example:**

```turtle
# Service
<https://regels.overheid.nl/services/aow-leeftijd>

# DMN URIs derived from service
<https://regels.overheid.nl/services/aow-leeftijd/dmn>
<https://regels.overheid.nl/services/aow-leeftijd/dmn/input/1>
<https://regels.overheid.nl/services/aow-leeftijd/rules/DecisionRule_2020>
```

---

## Troubleshooting

### 🆕 Import Issues

**Problem:** Imported DMN not detected

**Symptoms:**

- No "Imported" badge on DMN tab
- Message says "TTL imported successfully" (not "DMN data preserved")
- DMN tab shows upload UI instead of preservation notice

**Solution:**

1. Check browser console for: `"✅ DMN data detected and preserved: X lines"`
2. If not present, check TTL file contains DMN entities:
   - `cprmv:DecisionModel`
   - `cpsv:Input`
   - `cprmv:DecisionRule`
3. Verify `vocabularies.config.js` has DMN detection
4. Verify `parseTTL.enhanced.js` has capture logic
5. Check `App.js` passes through `hasDmnData` and `importedDmnBlocks`

**Problem:** DMN data lost on export

**Symptoms:**

- Import works (badge shows)
- But exported TTL has no DMN blocks

**Solution:**

1. Check `generateTTL` in App.js has import check:
   ```javascript
   if (dmnData.isImported && dmnData.importedDmnBlocks) {
     ttl += dmnData.importedDmnBlocks;
   }
   ```
2. Verify state: `console.log(dmnData.importedDmnBlocks)` should not be null
3. Check export isn't calling old DMN generation function

### Deployment Issues

**Problem:** Deploy fails with 400 error

**Causes:**

- Invalid DMN XML format
- Network connectivity issues
- Incorrect API endpoint

**Solution:**

1. Verify DMN file is valid XML
2. Check API endpoint is reachable
3. Test with "Load Example" first
4. Check browser console for detailed error

**Problem:** Decision key mismatch

**Symptoms:**

- DMN deploys successfully
- Evaluation returns 404

**Solution:**

- Ensure decision key matches ID in DMN XML
- Check for typos in API configuration
- Verify Operaton has processed deployment

### Evaluation Issues

**Problem:** Evaluation returns unexpected results

**Causes:**

- Incorrect input variable types
- Missing required inputs
- DMN logic errors

**Solution:**

1. Review auto-generated request body
2. Verify all required inputs have values
3. Check input types match DMN expectations (String, Integer, etc.)
4. Test DMN logic in Operaton Modeler first

---

## Summary

### Version 1.5.1 Highlights

| Feature                    | Status        | Description                     |
| -------------------------- | ------------- | ------------------------------- |
| **DMN Upload & Deploy**    | ✅ Production | Upload DMN, deploy to Operaton  |
| **Test Evaluation**        | ✅ Production | Postman-style testing interface |
| **Rule Extraction**        | ✅ Production | Extract 13+ rules from DMN      |
| **TTL Export**             | ✅ Production | Complete CPSV-AP + CPRMV output |
| **URI Sanitization**       | ✅ Production | Clean, absolute URIs            |
| **🆕 Import Preservation** | ✅ NEW        | Preserve DMN on import/export   |
| **🆕 Visual Indicators**   | ✅ NEW        | "Imported" badge + blue notice  |
| **🆕 Clear & Recreate**    | ✅ NEW        | Flexible DMN workflow           |

### Compliance

✅ **CPSV-AP 3.2.0** - All mandatory properties  
✅ **CPRMV 0.3.0** - Decision model vocabulary  
✅ **RONL** - Temporal rules and implementation  
✅ **DMN 1.3** - Standard decision notation  
✅ **RDF/Turtle** - Semantic data format

---

**Document Version:** 1.5.1  
**Document Status:** Production Ready  
**Last Updated:** December 23, 2025  
**Changes:** Added import preservation functionality (Option 3)  
**Next Review:** After user feedback

---

_DMN Integration v1.5.1 - Perfect Round-trip with Import Preservation_ ✨
