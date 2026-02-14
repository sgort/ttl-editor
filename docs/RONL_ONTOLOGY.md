# RONL Ontology v1.0 - Organizational Governance Vocabulary

**Namespace URI:** `https://regels.overheid.nl/ontology#`  
**Prefix:** `ronl:`  
**Version:** 1.0.0  
**Status:** Draft / Under Development  
**Release Date:** 2026-02-15 (planned)  
**Maintainer:** RONL Initiative / VWS

---

## Table of Contents

1. [Overview](#overview)
2. [Namespace Migration](#namespace-migration)
3. [Core Properties](#core-properties)
   - [Validation Properties](#validation-properties)
   - [Certification Properties](#certification-properties)
   - [Vendor Integration Properties](#vendor-integration-properties)
4. [Use Cases & Examples](#use-cases--examples)
5. [Property Constraints](#property-constraints)
6. [Parser Implementation](#parser-implementation)
7. [Migration Guide](#migration-guide)

---

## Overview

The RONL Ontology defines a vocabulary for **organizational governance** in the context of Dutch government rules and decision models. It provides properties for:

- **Validation**: Technical correctness and quality assurance
- **Certification**: Official approval and authorization
- **Vendor Integration**: Relationships between reference implementations and commercial services

### Purpose

Enable transparent, traceable governance of government rules by:

- Tracking who validates decision models and services
- Recording official certification by competent authorities
- Supporting multi-vendor implementations of government services
- Providing audit trails for quality assurance processes

### Scope

The ronl ontology primarily defines **properties** that describe governance relationships. It leverages existing classes from:

- **CPSV-AP**: `cpsv:PublicService`, `cv:PublicOrganisation`
- **CPRMV**: `cprmv:DecisionModel`
- **ORG**: `org:Organization`

---

## Namespace Migration

### Background

The RONL namespace has been reorganized to separate concerns:

| Namespace                              | Purpose                   | Prefix   |
| -------------------------------------- | ------------------------- | -------- |
| `https://regels.overheid.nl/ontology#` | Organizational governance | `ronl:`  |
| `https://cprmv.open-regels.nl/0.3.0/`  | Rule management           | `cprmv:` |

### What Changed

**OLD (deprecated):**

```turtle
@prefix ronl: <https://regels.overheid.nl/termen/> .

<something>
    ronl:hasAnalysis <...> ;
    ronl:hasMethod <...> ;
    ronl:implements <...> .
```

**NEW (current):**

```turtle
@prefix ronl: <https://regels.overheid.nl/ontology#> .
@prefix cprmv: <https://cprmv.open-regels.nl/0.3.0/> .

<something>
    cprmv:hasAnalysis <...> ;
    cprmv:hasMethod <...> ;
    cprmv:implements <...> .
```

### Property Migration Map

Properties moved from old `ronl:` to `cprmv:`:

| Legacy Property        | New Property            | Purpose                     |
| ---------------------- | ----------------------- | --------------------------- |
| `ronl:hasAnalysis`     | `cprmv:hasAnalysis`     | Legal analysis method       |
| `ronl:hasMethod`       | `cprmv:hasMethod`       | Rule extraction methodology |
| `ronl:TemporalRule`    | `cprmv:TemporalRule`    | Temporal rule class         |
| `ronl:ParameterWaarde` | `cprmv:ParameterWaarde` | Parameter value class       |
| `ronl:implements`      | `cprmv:implements`      | Implementation relationship |
| `ronl:implementedBy`   | `cprmv:implementedBy`   | API endpoint                |
| `ronl:confidenceLevel` | `cprmv:confidenceLevel` | Rule confidence             |
| `ronl:validFrom`       | `cprmv:validFrom`       | Temporal validity start     |
| `ronl:validUntil`      | `cprmv:validUntil`      | Temporal validity end       |

### Backward Compatibility

**The CPSV Editor parser maintains backward compatibility:**

- ✅ **Import**: Old TTL files with `ronl: <.../termen/>` are automatically migrated
- ✅ **Export**: Always uses new namespaces (`ronl:` for governance, `cprmv:` for rules)
- ✅ **No data loss**: Property aliases ensure seamless migration

---

## Core Properties

### Validation Properties

Properties describing technical correctness and quality assurance.

#### ronl:validatedBy

**Label:** Validated By  
**Definition:** The organization that performed technical validation of a decision model or service implementation  
**Domain:** `cprmv:DecisionModel`, `cpsv:PublicService`  
**Range:** `org:Organization` (URI reference)  
**Cardinality:** 0..1  
**Constraint:** MUST be a valid organization URI

**Example:**

```turtle
<https://regels.overheid.nl/services/aow-leeftijd/dmn>
    ronl:validatedBy <https://organisaties.overheid.nl/28212263/Sociale_Verzekeringsbank> .
```

---

#### ronl:validationStatus

**Label:** Validation Status  
**Definition:** The current validation state of a decision model or service  
**Domain:** `cprmv:DecisionModel`, `cpsv:PublicService`  
**Range:** `xsd:string`  
**Cardinality:** 0..1  
**Constraint:** MUST be one of: `"validated"`, `"in-review"`, `"not-validated"`  
**Default:** `"not-validated"`

**Example:**

```turtle
<https://regels.overheid.nl/services/aow-leeftijd/dmn>
    ronl:validationStatus "validated"^^xsd:string .
```

---

#### ronl:validatedAt

**Label:** Validated At  
**Definition:** The date when validation was completed  
**Domain:** `cprmv:DecisionModel`, `cpsv:PublicService`  
**Range:** `xsd:date`  
**Cardinality:** 0..1  
**Constraint:** ISO 8601 date format (YYYY-MM-DD)

**Example:**

```turtle
<https://regels.overheid.nl/services/aow-leeftijd/dmn>
    ronl:validatedAt "2026-02-15"^^xsd:date .
```

---

#### ronl:validationNote

**Label:** Validation Note  
**Definition:** Free text description of the validation process, findings, or methodology  
**Domain:** `cprmv:DecisionModel`, `cpsv:PublicService`  
**Range:** `rdf:langString`  
**Cardinality:** 0..1  
**Language Tag:** `@nl` (Dutch)

**Example:**

```turtle
<https://regels.overheid.nl/services/aow-leeftijd/dmn>
    ronl:validationNote "Validated against AOW legislation Article 7a. Test suite: 127 cases passed."@nl .
```

---

### Certification Properties

Properties describing official approval and authorization.

#### ronl:certifiedBy

**Label:** Certified By  
**Definition:** The authoritative organization that officially approved/certified a service implementation  
**Domain:** `cpsv:PublicService`  
**Range:** `org:Organization` (URI reference)  
**Cardinality:** 0..1  
**Constraint:** MUST be a valid organization URI. Typically the competent authority.

**Example:**

```turtle
<https://regels.overheid.nl/vendor-services/blueriq/aow-leeftijd>
    ronl:certifiedBy <https://organisaties.overheid.nl/28212263/Sociale_Verzekeringsbank> .
```

---

#### ronl:certificationStatus

**Label:** Certification Status  
**Definition:** The current certification state of a service implementation  
**Domain:** `cpsv:PublicService`  
**Range:** `xsd:string`  
**Cardinality:** 0..1  
**Constraint:** MUST be one of: `"certified"`, `"pending"`, `"rejected"`, `"expired"`  
**Default:** `"pending"`

**Example:**

```turtle
<https://regels.overheid.nl/vendor-services/blueriq/aow-leeftijd>
    ronl:certificationStatus "certified"^^xsd:string .
```

---

#### ronl:certifiedAt

**Label:** Certified At  
**Definition:** The date when certification was granted  
**Domain:** `cpsv:PublicService`  
**Range:** `xsd:date`  
**Cardinality:** 0..1  
**Constraint:** ISO 8601 date format (YYYY-MM-DD)

**Example:**

```turtle
<https://regels.overheid.nl/vendor-services/blueriq/aow-leeftijd>
    ronl:certifiedAt "2026-02-15"^^xsd:date .
```

---

#### ronl:certificationNote

**Label:** Certification Note  
**Definition:** Free text description of certification requirements, compliance notes, or conditions  
**Domain:** `cpsv:PublicService`  
**Range:** `rdf:langString`  
**Cardinality:** 0..1  
**Language Tag:** `@nl` (Dutch)

**Example:**

```turtle
<https://regels.overheid.nl/vendor-services/blueriq/aow-leeftijd>
    ronl:certificationNote "Meets SVB implementation requirements v2.1. Annual recertification required."@nl .
```

---

### Vendor Integration Properties

Properties describing relationships between reference implementations and vendor services.

#### ronl:basedOn

**Label:** Based On  
**Definition:** The reference service or decision model that this implementation is derived from  
**Domain:** `cpsv:PublicService`, `cprmv:DecisionModel`  
**Range:** `cpsv:PublicService` (URI reference)  
**Cardinality:** 0..1  
**Constraint:** MUST reference a published government service

**Example:**

```turtle
<https://regels.overheid.nl/vendor-services/blueriq/aow-leeftijd>
    ronl:basedOn <https://regels.overheid.nl/services/aow-leeftijd> .
```

---

#### ronl:vendorType

**Label:** Vendor Type  
**Definition:** Classification of vendor organization type  
**Domain:** `org:Organization`  
**Range:** `xsd:string`  
**Cardinality:** 0..1  
**Constraint:** MUST be one of: `"commercial"`, `"open-source"`, `"government"`, `"non-profit"`

**Example:**

```turtle
<https://regels.overheid.nl/vendors/blueriq>
    ronl:vendorType "commercial"^^xsd:string .
```

---

## Use Cases & Examples

### Use Case 1: SVB Reference DMN Self-Validation

**Scenario:** SVB creates and validates their reference decision model for AOW (state pension) age calculation.

```turtle
@prefix ronl: <https://regels.overheid.nl/ontology#> .
@prefix cprmv: <https://cprmv.open-regels.nl/0.3.0/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://regels.overheid.nl/services/aow-leeftijd/dmn>
    a cprmv:DecisionModel ;
    dct:identifier "SVB_LeeftijdsInformatie" ;
    dct:title "SVB Leeftijdsinformatie DMN"@nl ;
    cprmv:implements <https://regels.overheid.nl/services/aow-leeftijd> ;

    # Validation metadata
    ronl:validatedBy <https://organisaties.overheid.nl/28212263/Sociale_Verzekeringsbank> ;
    ronl:validationStatus "validated"^^xsd:string ;
    ronl:validatedAt "2026-02-15"^^xsd:date ;
    ronl:validationNote "Validated against AOW legislation Article 7a. Test suite: 127 cases passed."@nl .
```

**Key Points:**

- SVB validates their own reference implementation
- Status is "validated" - ready for vendor consumption
- Validation date provides temporal tracking
- Note documents validation methodology and test coverage

---

### Use Case 2: Blueriq Vendor Implementation with Tiered Validation

**Scenario:** Blueriq creates a commercial implementation based on SVB's reference DMN. Blueriq self-validates, then SVB certifies.

```turtle
@prefix ronl: <https://regels.overheid.nl/ontology#> .
@prefix cpsv: <http://purl.org/vocab/cpsv#> .
@prefix cv: <http://data.europa.eu/m8g/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix org: <http://www.w3.org/ns/org#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

# Vendor Service Implementation
<https://regels.overheid.nl/vendor-services/blueriq/aow-leeftijd>
    a cpsv:PublicService ;
    dct:identifier "blueriq-aow-leeftijd" ;
    dct:title "AOW Leeftijd - Blueriq Implementation"@nl ;
    dct:description "Commercial rule engine implementation by Blueriq B.V."@nl ;

    # Relationship to reference
    ronl:basedOn <https://regels.overheid.nl/services/aow-leeftijd> ;

    # Service provider
    cv:hasCompetentAuthority <https://regels.overheid.nl/vendors/blueriq> ;

    # Vendor self-validation
    ronl:validatedBy <https://regels.overheid.nl/vendors/blueriq> ;
    ronl:validationStatus "validated"^^xsd:string ;
    ronl:validatedAt "2026-02-10"^^xsd:date ;
    ronl:validationNote "Tested against SVB reference DMN test suite. 127/127 cases passed. Performance: avg 45ms response time."@nl ;

    # SVB certification
    ronl:certifiedBy <https://organisaties.overheid.nl/28212263/Sociale_Verzekeringsbank> ;
    ronl:certificationStatus "certified"^^xsd:string ;
    ronl:certifiedAt "2026-02-15"^^xsd:date ;
    ronl:certificationNote "Meets SVB implementation requirements v2.1. Annual recertification required."@nl .

# Vendor Organization
<https://regels.overheid.nl/vendors/blueriq>
    a org:Organization ;
    skos:prefLabel "Blueriq B.V."@nl ;
    foaf:homepage <https://www.blueriq.com> ;
    ronl:vendorType "commercial"^^xsd:string .
```

**Key Points:**

- Blueriq service is `basedOn` SVB reference (traceability)
- Blueriq validates their own implementation (self-assessment)
- SVB certifies the implementation (official approval)
- Both validation + certification dates tracked
- Vendor type classified for discovery
- Clear distinction between technical validation and official certification

---

### Use Case 3: Validation Lifecycle Tracking

**Scenario:** A new DMN goes through the validation workflow from draft to validated.

```turtle
# Initial state - newly created reference DMN
<https://regels.overheid.nl/services/nieuw/dmn>
    a cprmv:DecisionModel ;
    dct:title "New Decision Model"@nl ;
    ronl:validationStatus "not-validated"^^xsd:string .

# Under review
<https://regels.overheid.nl/services/nieuw/dmn>
    ronl:validationStatus "in-review"^^xsd:string ;
    ronl:validationNote "Review started 2026-02-01. Expected completion: 2026-02-20."@nl .

# Validated
<https://regels.overheid.nl/services/nieuw/dmn>
    ronl:validationStatus "validated"^^xsd:string ;
    ronl:validatedBy <https://organisaties.overheid.nl/.../Sociale_Verzekeringsbank> ;
    ronl:validatedAt "2026-02-18"^^xsd:date ;
    ronl:validationNote "Final review completed. Approved for publication."@nl .
```

**Key Points:**

- Status transitions provide audit trail
- Notes document progress and expectations
- Lifecycle management through status field
- Temporal tracking via validation date

---

### Use Case 4: Multi-Vendor Discovery Query

**Scenario:** Civil servants in the Linked Data Explorer want to find all certified implementations of a specific service.

**SPARQL Query:**

```sparql
PREFIX ronl: <https://regels.overheid.nl/ontology#>
PREFIX cpsv: <http://purl.org/vocab/cpsv#>
PREFIX cv: <http://data.europa.eu/m8g/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?service ?title ?vendor ?vendorName ?certStatus ?certDate
WHERE {
  # Find services based on AOW reference
  ?service a cpsv:PublicService ;
           dct:title ?title ;
           ronl:basedOn <https://regels.overheid.nl/services/aow-leeftijd> ;
           cv:hasCompetentAuthority ?vendor ;
           ronl:certificationStatus ?certStatus ;
           ronl:certifiedAt ?certDate .

  # Get vendor name
  ?vendor skos:prefLabel ?vendorName .

  # Only show certified implementations
  FILTER(?certStatus = "certified")
}
ORDER BY DESC(?certDate)
```

**Results:**
| Service | Title | Vendor | Vendor Name | Cert Status | Cert Date |
|---------|-------|--------|-------------|-------------|-----------|
| `.../blueriq/aow` | AOW - Blueriq Impl | `.../blueriq` | Blueriq B.V. | certified | 2026-02-15 |
| `.../another/aow` | AOW - Another Impl | `.../another` | Another Inc. | certified | 2026-01-20 |

**Key Points:**

- Enables vendor comparison and selection
- Filters by certification status
- Shows temporal information for recency
- Supports informed decision-making

---

## Property Constraints

### Logical Constraints

These constraints should be enforced by applications using the RONL ontology:

#### 1. Validation Completeness

```
IF ronl:validationStatus = "validated"
THEN ronl:validatedBy MUST exist
AND ronl:validatedAt MUST exist
```

**Rationale:** A "validated" status without validator or date is meaningless.

---

#### 2. Certification Completeness

```
IF ronl:certificationStatus = "certified"
THEN ronl:certifiedBy MUST exist
AND ronl:certifiedAt MUST exist
```

**Rationale:** A "certified" status without certifier or date is meaningless.

---

#### 3. Temporal Consistency

```
IF ronl:certifiedAt exists AND ronl:validatedAt exists
THEN ronl:certifiedAt >= ronl:validatedAt
```

**Rationale:** Certification cannot happen before validation in the tiered validation model.

---

#### 4. Organizational Consistency (Reference DMNs)

```
IF Subject is cprmv:DecisionModel
AND ronl:validatedBy = X
THEN X SHOULD BE cv:hasCompetentAuthority of the implementing service
```

**Rationale:** Reference DMNs are typically validated by their own authority.

---

#### 5. Vendor Service Requirements

```
IF Subject has ronl:certifiedBy
THEN Subject MUST have ronl:basedOn
```

**Rationale:** Certified services must reference a canonical service for traceability.

---

### UI Validation Rules

For implementation in the CPSV Editor:

| Field                               | Rule                           | Error Message                                           |
| ----------------------------------- | ------------------------------ | ------------------------------------------------------- |
| `validationStatus` = "validated"    | `validatedBy` must be filled   | "Validator organization required for validated status"  |
| `validationStatus` = "validated"    | `validatedAt` must be filled   | "Validation date required for validated status"         |
| `certificationStatus` = "certified" | `certifiedBy` must be filled   | "Certifying organization required for certified status" |
| `certificationStatus` = "certified" | `certifiedAt` must be filled   | "Certification date required for certified status"      |
| `certifiedAt`                       | Must be >= `validatedAt`       | "Certification date cannot be before validation date"   |
| `validatedBy`                       | Must be valid organization URI | "Invalid organization URI format"                       |
| `certifiedBy`                       | Must be valid organization URI | "Invalid organization URI format"                       |

---

## Parser Implementation

### Namespace Registration

The CPSV Editor parser must register both current and legacy namespaces:

```javascript
// src/config/vocabularies.config.js

namespaces: {
  // Current namespaces
  'https://regels.overheid.nl/ontology#': ['ronl'],
  'https://cprmv.open-regels.nl/0.3.0/': ['cprmv'],

  // Legacy namespace (backward compatibility)
  'https://regels.overheid.nl/termen/': ['ronl-legacy'],
}
```

**Key Points:**

- `ronl` → New governance ontology
- `cprmv` → Rule management vocabulary
- `ronl-legacy` → Internal alias for old namespace (never exported)

---

### Property Aliases

Map legacy properties to their new locations:

```javascript
// src/config/vocabularies.config.js

propertyAliases: {
  // Map old ronl properties to cprmv
  'ronl-legacy:hasAnalysis': 'cprmv:hasAnalysis',
  'ronl-legacy:hasMethod': 'cprmv:hasMethod',
  'ronl-legacy:implements': 'cprmv:implements',
  'ronl-legacy:implementedBy': 'cprmv:implementedBy',
  'ronl-legacy:confidenceLevel': 'cprmv:confidenceLevel',
  'ronl-legacy:validFrom': 'cprmv:validFrom',
  'ronl-legacy:validUntil': 'cprmv:validUntil',
}
```

**Behavior:**

- **Import**: Properties from old namespace are automatically mapped to cprmv
- **Export**: Always uses cprmv namespace for rule properties
- **Transparency**: Users see only the new namespace in exports

---

### Entity Type Mapping

Support both old and new class types during transition:

```javascript
// src/config/vocabularies.config.js

entityTypes: {
  temporalRule: {
    acceptedTypes: [
      'cprmv:TemporalRule',           // NEW (primary)
      'cpsv:Rule',                    // CPSV-AP standard
      'ronl-legacy:TemporalRule',     // OLD (backward compat)
    ],
    canonicalType: 'cprmv:TemporalRule'
  },

  parameter: {
    acceptedTypes: [
      'cprmv:ParameterWaarde',        // NEW (primary)
      'skos:Concept',                 // NL-SBB standard
      'ronl-legacy:ParameterWaarde',  // OLD (backward compat)
    ],
    canonicalType: 'cprmv:ParameterWaarde'
  }
}
```

**Behavior:**

- Parser recognizes multiple type variants
- Canonical type is always used in exports
- No data loss during import/export cycles

---

### Import Flow

```
1. User imports old TTL file
   ↓
2. Parser detects @prefix ronl: <.../termen/>
   ↓
3. Parser maps to internal alias 'ronl-legacy'
   ↓
4. Property aliases convert ronl-legacy:X → cprmv:X
   ↓
5. State populated with properties in cprmv namespace
   ↓
6. UI displays correct data
```

---

### Export Flow

```
1. User clicks "Download TTL"
   ↓
2. TTL generator reads state
   ↓
3. Outputs namespaces:
   - @prefix ronl: <.../ontology#>
   - @prefix cprmv: <.../0.3.0/>
   ↓
4. Rule properties use cprmv: prefix
5. Validation properties use ronl: prefix
   ↓
6. No ronl-legacy prefix in output
```

---

### Testing Backward Compatibility

**Test Case 1: Import Old File**

Input (old-format.ttl):

```turtle
@prefix ronl: <https://regels.overheid.nl/termen/> .

<https://regels.overheid.nl/services/test>
    ronl:hasAnalysis <https://regels.overheid.nl/termen/ALEF> ;
    ronl:implements <https://regels.overheid.nl/services/test> .
```

Expected State After Import:

```javascript
{
  ronlAnalysis: "https://regels.overheid.nl/termen/ALEF",
  // Parser correctly mapped old ronl:hasAnalysis to state
}
```

Expected Output After Export:

```turtle
@prefix ronl: <https://regels.overheid.nl/ontology#> .
@prefix cprmv: <https://cprmv.open-regels.nl/0.3.0/> .

<https://regels.overheid.nl/services/test>
    cprmv:hasAnalysis <https://regels.overheid.nl/termen/ALEF> ;
    cprmv:implements <https://regels.overheid.nl/services/test> .
```

✅ **Result:** Property migrated to cprmv namespace

---

**Test Case 2: Round-Trip Validation Properties**

Input (new-format.ttl):

```turtle
@prefix ronl: <https://regels.overheid.nl/ontology#> .

<https://regels.overheid.nl/services/test/dmn>
    ronl:validatedBy <https://organisaties.overheid.nl/.../SVB> ;
    ronl:validationStatus "validated"^^xsd:string ;
    ronl:validatedAt "2026-02-15"^^xsd:date .
```

Expected State After Import:

```javascript
{
  dmnData: {
    validatedBy: "https://organisaties.overheid.nl/.../SVB",
    validationStatus: "validated",
    validatedAt: "2026-02-15",
  }
}
```

Expected Output After Export:

```turtle
@prefix ronl: <https://regels.overheid.nl/ontology#> .

<https://regels.overheid.nl/services/test/dmn>
    ronl:validatedBy <https://organisaties.overheid.nl/.../SVB> ;
    ronl:validationStatus "validated"^^xsd:string ;
    ronl:validatedAt "2026-02-15"^^xsd:date .
```

✅ **Result:** Perfect round-trip, no data loss

---

## Migration Guide

### For CPSV Editor Users

**Good News:** The CPSV Editor handles migration automatically!

#### When Importing Old Files

1. Open the CPSV Editor
2. Click "Import TTL File"
3. Select your old TTL file (with `@prefix ronl: <.../termen/>`)
4. ✅ **Properties automatically migrated to cprmv**
5. Edit your service normally
6. Download TTL → Exports with new namespaces

**No manual editing required!**

---

#### When Creating New Services

1. Fill in the service form
2. Add validation metadata in Organization tab
3. Download TTL
4. ✅ **Output uses new namespaces automatically**

---

### For External Tool Developers

If you're building tools that consume RONL TTL files:

#### Update Your Namespace Prefixes

```turtle
# OLD - Remove this
@prefix ronl: <https://regels.overheid.nl/termen/> .

# NEW - Add these
@prefix ronl: <https://regels.overheid.nl/ontology#> .
@prefix cprmv: <https://cprmv.open-regels.nl/0.3.0/> .
```

---

#### Update Property References

| Old                    | New                     |
| ---------------------- | ----------------------- |
| `ronl:hasAnalysis`     | `cprmv:hasAnalysis`     |
| `ronl:hasMethod`       | `cprmv:hasMethod`       |
| `ronl:TemporalRule`    | `cprmv:TemporalRule`    |
| `ronl:ParameterWaarde` | `cprmv:ParameterWaarde` |
| `ronl:implements`      | `cprmv:implements`      |
| `ronl:implementedBy`   | `cprmv:implementedBy`   |
| `ronl:confidenceLevel` | `cprmv:confidenceLevel` |
| `ronl:validFrom`       | `cprmv:validFrom`       |
| `ronl:validUntil`      | `cprmv:validUntil`      |

---

#### Support Both During Transition

```sparql
# SPARQL query supporting both old and new
PREFIX ronl: <https://regels.overheid.nl/ontology#>
PREFIX ronl-old: <https://regels.overheid.nl/termen/>
PREFIX cprmv: <https://cprmv.open-regels.nl/0.3.0/>

SELECT ?service ?analysis
WHERE {
  ?service a cpsv:PublicService .

  # Try new property first, fall back to old
  OPTIONAL { ?service cprmv:hasAnalysis ?analysis }
  OPTIONAL { ?service ronl-old:hasAnalysis ?analysis }
}
```

---

## Property Summary

### RONL Ontology Properties (9 total)

| Property                   | Domain                 | Purpose                  | Cardinality |
| -------------------------- | ---------------------- | ------------------------ | ----------- |
| `ronl:validatedBy`         | DecisionModel, Service | Who validated            | 0..1        |
| `ronl:validationStatus`    | DecisionModel, Service | Validation state         | 0..1        |
| `ronl:validatedAt`         | DecisionModel, Service | When validated           | 0..1        |
| `ronl:validationNote`      | DecisionModel, Service | Validation notes         | 0..1        |
| `ronl:certifiedBy`         | Service                | Who certified            | 0..1        |
| `ronl:certificationStatus` | Service                | Certification state      | 0..1        |
| `ronl:certifiedAt`         | Service                | When certified           | 0..1        |
| `ronl:certificationNote`   | Service                | Certification notes      | 0..1        |
| `ronl:basedOn`             | Service                | Reference implementation | 0..1        |
| `ronl:vendorType`          | Organization           | Vendor classification    | 0..1        |

---

## References

### Standards & Specifications

- **CPSV-AP 3.2.0**: [Core Public Service Vocabulary Application Profile](https://semiceu.github.io/CPSV-AP/)
- **CPRMV 0.3.0**: Core Public Rule Management Vocabulary
- **ORG Ontology**: [W3C Organization Ontology](https://www.w3.org/TR/vocab-org/)
- **SKOS**: [Simple Knowledge Organization System](https://www.w3.org/2004/02/skos/)

### Related Documentation

- CPSV Editor User Guide
- CPRMV Specification
- RONL Initiative Homepage: [regels.overheid.nl](https://regels.overheid.nl)
- Linked Data Explorer Documentation

---

## Change Log

### v1.0.0 (2026-02-15)

**Added:**

- Initial release of RONL Ontology
- 9 governance properties (validation, certification, vendor integration)
- Migration from legacy ronl namespace to cprmv
- Backward compatibility support in parser
- Comprehensive documentation and examples

**Changed:**

- Namespace reorganization: governance (ronl) vs rules (cprmv)
- All rule-related properties moved to cprmv namespace

**Deprecated:**

- Old namespace `https://regels.overheid.nl/termen/` (parser still supports for backward compatibility)

---

## Contact & Support

**Maintainer:** RONL Initiative / VWS  
**Questions:** Contact your RONL project lead  
**Issues:** Report via CPSV Editor GitHub repository  
**Documentation:** [regels.overheid.nl/docs](https://regels.overheid.nl/docs)

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-02-15  
**Status:** Draft
