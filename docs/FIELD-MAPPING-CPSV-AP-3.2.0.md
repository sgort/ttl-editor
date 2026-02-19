# Field-to-Property Mapping: Core Public Service Editor ↔ CPSV-AP 3.2.0

**Editor Version:** 1.9.0  
**Date:** February 2026  
**Status:** ✅ CPSV-AP 3.2.0 Compliant + DMN Integration

---

### Version 1.9.0 - CPRMV Semantic Linking ⭐

**What's New:**

- Explicit cprmv:implements property linking rules to legal resources
- Automatic semantic linking (no user configuration needed)
- Versioned URI support using eli:is_realized_by when available
- Policy tab informational banner with clickable legal resource link
- Eliminates fragile string-based SPARQL queries

**Vocabulary Extensions:**

- CPRMV: `implements` (links Rule to versioned LegalResource)

**Benefits:**

- ✅ Unambiguous rule-to-law relationships
- ✅ Clean SPARQL queries without string parsing
- ✅ Temporal traceability with version-specific links
- ✅ Reduced query result duplication
- ✅ Better semantic data quality

---

## Table of Contents

1. [Service Tab](#1-service-tab)
2. [Organization Tab](#2-organization-tab)
3. [Legal Tab](#3-legal-tab)
4. [Rules Tab](#4-rules-tab)
5. [Parameters Tab](#5-parameters-tab)
6. [Cost & Output Sections](#6-cost--output-sections)
7. [CPRMV Tab](#7-cprmv-tab)
8. [DMN Tab](#8-dmn-tab)
9. [Future CPSV-AP Classes](#9-future-cpsv-ap-classes)
10. [Implementation Summary](#10-implementation-summary)

---

## Legend

| Symbol | Meaning                       |
| ------ | ----------------------------- |
| ✅     | Implemented and compliant     |
| 🎯     | Phase 1 completed (v1.4.0)    |
| ⭐     | New in v1.5.0                 |
| 📋     | Phase 2 planned               |
| 🔮     | Phase 3 planned               |
| ℹ️     | Extension (RONL/CPRMV/Custom) |

---

## 1. Service Tab

**CPSV-AP Class:** `cpsv:PublicService` 🎯

### Current Fields (v1.5.0)

| UI Field Label                             | State Property         | TTL Output        | CPSV-AP 3.2.0 Property | Status | Notes                          |
| ------------------------------------------ | ---------------------- | ----------------- | ---------------------- | ------ | ------------------------------ |
| Unique identifier for this service \*      | `service.identifier`   | `dct:identifier`  | `dct:identifier`       | ⭐     | **MANDATORY** - Auto-sanitized |
| Official name of the service \*            | `service.name`         | `dct:title`       | `dct:title`            | ✅     | Correct                        |
| Detailed description of the service        | `service.description`  | `dct:description` | `dct:description`      | ✅     | Correct                        |
| URI for thematic classification            | `service.thematicArea` | `cv:thematicArea` | `cv:thematicArea`      | ✅     | Correct                        |
| Government level providing this service \* | `service.sector`       | `cv:sector`       | `cv:sector`            | 🎯     | **MANDATORY** (Phase 1)        |
| Comma-separated keywords                   | `service.keywords`     | `dcat:keyword`    | `dcat:keyword`         | ✅     | Correct                        |
| Language of the service \*                 | `service.language`     | `dct:language`    | `dct:language`         | 🎯     | **MANDATORY** (Phase 1)        |

**Note on Identifier Sanitization:**
Service identifiers are automatically sanitized to create valid URIs:

- Spaces → hyphens (`"aow leeftijd"` → `"aow-leeftijd"`)
- Lowercase conversion
- Special character removal
- Result: `<https://regels.overheid.nl/services/aow-leeftijd>`

### Service Relationships

| UI Field                | State Property            | TTL Output                 | CPSV-AP 3.2.0 Property      | Status | Notes                   |
| ----------------------- | ------------------------- | -------------------------- | --------------------------- | ------ | ----------------------- |
| Has Competent Authority | `organization.identifier` | `cv:hasCompetentAuthority` | `cv:hasCompetentAuthority`  | 🎯     | Links to Organization   |
| Has Legal Resource      | `legalResource.bwbId`     | `cv:hasLegalResource`      | `cv:hasLegalResource`       | 🎯     | Links to Legal Resource |
| Has Cost                | `cost.identifier`         | `cv:hasCost`               | `cv:hasCost`                | 🎯     | Links to Cost           |
| Produces Output         | `output.identifier`       | `cpsv:produces`            | `cpsv:produces`             | 🎯     | Links to Output         |
| Has Decision Model      | `dmnData.fileName`        | `cprmv:hasDecisionModel`   | `cprmv:hasDecisionModel` ℹ️ | ⭐     | Links to DMN (v1.5.0)   |

### Missing CPSV-AP 3.2.0 Fields

| CPSV-AP Property     | Cardinality | Priority | Suggested UI Label  | Phase   |
| -------------------- | ----------- | -------- | ------------------- | ------- |
| `dct:type`           | 0..\*       | Medium   | Service Type        | Phase 2 |
| `cv:processingTime`  | 0..1        | Medium   | Processing Time     | Phase 2 |
| `cv:spatial`         | 0..\*       | Low      | Geographic Coverage | Phase 2 |
| `adms:status`        | 0..1        | Medium   | Status              | Phase 2 |
| `cv:hasChannel`      | 0..\*       | Medium   | Service Channels    | Phase 2 |
| `cv:hasContactPoint` | 0..\*       | Medium   | Contact Points      | Phase 2 |
| `cv:isGroupedBy`     | 0..\*       | Low      | Grouped By Event    | Phase 3 |
| `cv:isClassifiedBy`  | 0..\*       | Low      | Classification      | Phase 3 |

---

## 2. Organization Tab

**CPSV-AP Class:** `cv:PublicOrganisation` 🎯

### Current Fields

| UI Field Label                        | State Property            | TTL Output       | CPSV-AP 3.2.0 Property | Status | Notes                           |
| ------------------------------------- | ------------------------- | ---------------- | ---------------------- | ------ | ------------------------------- |
| Organization URI or identifier ⭐     | `organization.identifier` | `dct:identifier` | `dct:identifier`       | ⭐     | Supports full URIs or short IDs |
| Preferred name of the organization \* | `organization.name`       | `skos:prefLabel` | `skos:prefLabel`       | ✅     | Correct                         |
| Homepage URL of the organization      | `organization.homepage`   | `foaf:homepage`  | `foaf:homepage`        | ✅     | Correct (via foaf:Agent)        |
| Geographic Jurisdiction \*            | `organization.spatial`    | `cv:spatial`     | `cv:spatial`           | 🎯     | **MANDATORY** - Phase 1 added   |

**Note on Organization URI:**
The organization identifier field intelligently handles both formats:

- **Short ID:** `"28212263"` → `<https://regels.overheid.nl/organizations/28212263>`
- **Full URI:** `"https://organisaties.overheid.nl/28212263/Sociale_Verzekeringsbank"` → Used as-is  
  ✓ Full URI detected - will be used directly

### Class Type Change

| Before (v1.3.0)    | After (v1.4.0)          | Status                     |
| ------------------ | ----------------------- | -------------------------- |
| `org:Organization` | `cv:PublicOrganisation` | 🎯 CPSV-AP 3.2.0 compliant |

### Missing CPSV-AP 3.2.0 Fields

| CPSV-AP Property | Cardinality | Priority | Suggested UI Label | Phase   |
| ---------------- | ----------- | -------- | ------------------ | ------- |
| `locn:address`   | 0..\*       | Medium   | Address            | Phase 3 |

---

## 3. Legal Tab

**CPSV-AP Class:** `eli:LegalResource` 🎯

### Current Fields

| UI Field Label                    | State Property              | TTL Output           | CPSV-AP 3.2.0 Property | Status | Notes                   |
| --------------------------------- | --------------------------- | -------------------- | ---------------------- | ------ | ----------------------- |
| BWB ID (e.g., BWBR0002221) \*     | `legalResource.bwbId`       | `dct:identifier`     | `dct:identifier`       | 🎯     | Supports full URI or ID |
| Legal Resource Version            | `legalResource.version`     | `eli:is_realized_by` | `eli:is_realized_by`   | ✅     | Version expression      |
| Title of the legal resource       | `legalResource.title`       | `dct:title`          | `dct:title`            | ✅     | Correct                 |
| Description of the legal resource | `legalResource.description` | `dct:description`    | `dct:description`      | ✅     | Correct                 |

### Property Change

| Before (v1.3.0) | After (v1.4.0)        | Status                     |
| --------------- | --------------------- | -------------------------- |
| `cpsv:follows`  | `cv:hasLegalResource` | 🎯 CPSV-AP 3.2.0 compliant |

### Missing CPSV-AP 3.2.0 Fields

| CPSV-AP Property       | Cardinality | Priority | Suggested UI Label        | Phase   |
| ---------------------- | ----------- | -------- | ------------------------- | ------- |
| `dct:language`         | 0..\*       | Medium   | Language                  | Phase 2 |
| `dct:type`             | 0..1        | Medium   | Legal Resource Type       | Phase 2 |
| `eli:implements`       | 0..\*       | Medium   | Implements Legal Resource | Phase 2 |
| `eli:establishedUnder` | 0..\*       | Low      | Established Under         | Phase 3 |

### RONL Concepts

**New in v1.8.3:** Integration with RONL (Regels Open Nederland) vocabulary for legislative analysis and rules management methodologies.

| Field Label | UI Tab | State Property | RDF Property       | Required | Format | Notes                                                 |
| ----------- | ------ | -------------- | ------------------ | -------- | ------ | ----------------------------------------------------- |
| Analysis    | Legal  | `ronlAnalysis` | `ronl:hasAnalysis` | No       | URI    | Legislative analysis methodology from RONL vocabulary |
| Method      | Legal  | `ronlMethod`   | `ronl:hasMethod`   | No       | URI    | Rules management methodology from RONL vocabulary     |

**Data Source:**

- **Endpoint:** `https://api.open-regels.triply.cc/datasets/stevengort/ronl/services/ronl/sparql`
- **Analysis Concepts:** Fetched via SPARQL query: `ronl:AnalysisConcept skos:narrower ?narrower`
- **Method Concepts:** Fetched via SPARQL query: `ronl:MethodConcept skos:narrower ?narrower`

**Available Analysis Options (3):**

- `ronl:WetsanalyseJAS` - Wetsanalyse (JAS) - Legal Analysis Schema
- `ronl:WetsanalyseJRM` - Wetsanalyse (JRM) - Legal Reference Model
- `ronl:FLINT` - FLINT protocol for normative tasks

**Available Method Options (16):**

- `ronl:AKN4EU`, `ronl:ALEF`, `ronl:Avola`, `ronl:Beinformed`, `ronl:Blawx`, `ronl:Blueriq`, `ronl:Catala`, `ronl:CircuLaw`, `ronl:ConcordiaLegal`, `ronl:DataLex`, `ronl:Demo`, `ronl:Leos`, `ronl:OpenFisca`, `ronl:RuleSpeak`, `ronl:Sparkwise`, `ronl:USoft`

**Implementation Details:**

- Dropdowns populate on component mount via `fetchAllRonlConcepts()` utility
- Values stored as full URIs (e.g., `https://regels.overheid.nl/termen/WetsanalyseJAS`)
- Backend proxy used for SPARQL queries to avoid CORS issues
- Full round-trip support: values preserved in TTL export and restored on import
- Loading states and error handling for network issues

**Example TTL Output:**

```turtle
<https://wetten.overheid.nl/BWBR0002221> a eli:LegalResource ;
    dct:identifier "BWBR0002221" ;
    dct:title "Algemene Ouderdomswet"@nl ;
    dct:description "Wet van 31 mei 1956..."@nl ;
    ronl:hasAnalysis <https://regels.overheid.nl/termen/WetsanalyseJAS> ;
    ronl:hasMethod <https://regels.overheid.nl/termen/ALEF> .
```

**Technical Implementation:**

- **Utility:** `src/utils/ronlHelper.js` - SPARQL query functions
- **State Management:** `useEditorState` hook with `ronlAnalysis` and `ronlMethod` properties
- **TTL Generator:** `generateLegalResourceSection()` in `src/utils/ttlGenerator.js`
- **Parser:** `parseTTLEnhanced()` in `src/parseTTL.enhanced.js`
- **UI Component:** Side-by-side dropdowns in `LegalTab.jsx`

---

## 4. Rules Tab

**CPSV-AP Class:** `cpsv:Rule, ronl:TemporalRule` 🎯 ℹ️

### Current Fields

| UI Field Label          | State Property         | TTL Output             | CPSV-AP 3.2.0 Property    | Status | Notes                   |
| ----------------------- | ---------------------- | ---------------------- | ------------------------- | ------ | ----------------------- |
| Rule Identifier \*      | `rule.identifier`      | `dct:identifier`       | `dct:identifier`          | 🎯     | **MANDATORY** (Phase 1) |
| Rule Title \*           | `rule.title`           | `dct:title`            | `dct:title`               | 🎯     | **MANDATORY** (Phase 1) |
| Rule URI                | `rule.uri`             | (Subject URI)          | -                         | ✅     | Optional custom URI     |
| Extends (Legal Article) | `rule.extends`         | `ronl:extends`         | `ronl:extends` ℹ️         | ✅     | RONL extension          |
| Valid From              | `rule.validFrom`       | `ronl:validFrom`       | `ronl:validFrom` ℹ️       | ✅     | Temporal validity       |
| Valid Until             | `rule.validUntil`      | `ronl:validUntil`      | `ronl:validUntil` ℹ️      | ✅     | Temporal validity       |
| Confidence Level        | `rule.confidenceLevel` | `ronl:confidenceLevel` | `ronl:confidenceLevel` ℹ️ | ✅     | high/medium/low         |
| Rule Description        | `rule.description`     | `dct:description`      | `dct:description`         | ✅     | Correct                 |

### Dual Typing

Rules are typed as both CPSV-AP core and RONL extension:

```turtle
<rule-uri> a cpsv:Rule, ronl:TemporalRule ;
```

This allows:

- **CPSV-AP compliance** - recognized as standard Rule
- **RONL extensions** - temporal validity, confidence, extends properties

### Missing CPSV-AP 3.2.0 Fields

| CPSV-AP Property       | Cardinality | Priority | Suggested UI Label        | Phase   |
| ---------------------- | ----------- | -------- | ------------------------- | ------- |
| `dct:language`         | 0..\*       | Medium   | Language                  | Phase 2 |
| `dct:type`             | 0..1        | Medium   | Rule Type                 | Phase 2 |
| `eli:implements`       | 0..\*       | Medium   | Implements Legal Resource | Phase 2 |
| `eli:establishedUnder` | 0..\*       | Low      | Established Under         | Phase 3 |

---

## 5. Parameters Tab

**Current Class:** `ronl:ParameterWaarde` ℹ️

### Current Fields

| UI Field Label                 | State Property      | TTL Output        | Status | Notes          |
| ------------------------------ | ------------------- | ----------------- | ------ | -------------- |
| Notation (Machine-readable) \* | `param.notation`    | `skos:notation`   | ✅     | RONL extension |
| Label (Human-readable) \*      | `param.label`       | `skos:prefLabel`  | ✅     | RONL extension |
| Value \*                       | `param.value`       | `schema:value`    | ✅     | RONL extension |
| Unit                           | `param.unit`        | `schema:unitCode` | ✅     | RONL extension |
| Description                    | `param.description` | `dct:description` | ✅     | RONL extension |
| Valid From                     | `param.validFrom`   | `ronl:validFrom`  | ✅     | RONL extension |
| Valid Until                    | `param.validUntil`  | `ronl:validUntil` | ✅     | RONL extension |

### Note on Parameters

Parameters (`ronl:ParameterWaarde`) are a **RONL-specific extension** not part of CPSV-AP core. This is acceptable - CPSV-AP is designed to be extensible. These fields support the Dutch regulatory context for normative values and constants.

**No changes needed** - this is compliant as an extension.

---

## 6. Cost & Output Sections

### 6.1 Cost (cv:Cost)

**Location:** Within Service Tab  
**CPSV-AP Class:** `cv:Cost`

| UI Field Label     | State Property     | TTL Output        | CPSV-AP 3.2.0 Property | Status |
| ------------------ | ------------------ | ----------------- | ---------------------- | ------ |
| Cost Identifier \* | `cost.identifier`  | `dct:identifier`  | `dct:identifier`       | 🎯     |
| Amount             | `cost.value`       | `cv:value`        | `cv:value`             | 🎯     |
| Currency           | `cost.currency`    | `cv:currency`     | `cv:currency`          | 🎯     |
| Cost Description   | `cost.description` | `dct:description` | `dct:description`      | 🎯     |

**Implementation:** Collapsible section within Service Tab. Optional - leave identifier empty if service has no costs.

---

### 6.2 Output (cv:Output)

**Location:** Within Service Tab  
**CPSV-AP Class:** `cv:Output`

| UI Field Label       | State Property       | TTL Output        | CPSV-AP 3.2.0 Property | Status |
| -------------------- | -------------------- | ----------------- | ---------------------- | ------ |
| Output Identifier \* | `output.identifier`  | `dct:identifier`  | `dct:identifier`       | 🎯     |
| Output Name \*       | `output.name`        | `dct:title`       | `dct:title`            | 🎯     |
| Output Description   | `output.description` | `dct:description` | `dct:description`      | 🎯     |
| Output Type          | `output.type`        | `dct:type`        | `dct:type`             | 🎯     |

**Implementation:** Collapsible section within Service Tab. Optional - leave identifier empty if service produces no specific outputs.

---

## 7. Policy Tab (ie CPRMV tab)

**CPSV-AP Class:** `cprmv:Rule` ℹ️

### Current Fields (v1.3.0+)

| UI Field Label      | State Property    | TTL Output         | Status | Notes           |
| ------------------- | ----------------- | ------------------ | ------ | --------------- |
| Rule ID \*          | `rule.ruleId`     | `cprmv:id`         | ✅     | CPRMV mandatory |
| Ruleset ID (BWB) \* | `rule.rulesetId`  | `cprmv:rulesetId`  | ✅     | CPRMV mandatory |
| Definition \*       | `rule.definition` | `cprmv:definition` | ✅     | CPRMV mandatory |
| Situation \*        | `rule.situatie`   | `cprmv:situatie`   | ✅     | CPRMV mandatory |
| Norm \*             | `rule.norm`       | `cprmv:norm`       | ✅     | CPRMV mandatory |
| Rule ID Path \*     | `rule.ruleIdPath` | `cprmv:ruleIdPath` | ✅     | CPRMV mandatory |

### Note on CPRMV

CPRMV (Core Public Rule Management Vocabulary) is a **Dutch extension** for managing normative values extracted from legislation (normenbrief format). This tab supports JSON import for bulk rule loading.

**No changes needed** - this is compliant as an extension.

#### cprmv:implements (Semantic Link to Legal Resource)

**Property:** `cprmv:implements`  
**Type:** URI Reference  
**Cardinality:** 0..1 (automatically added when legal resource exists)  
**Status:** ⭐ **New in v1.9.0**

**Purpose:**
Creates an explicit semantic link from each CPRMV rule to its source legal resource, eliminating the need for fragile string-based matching in SPARQL queries.

**Behavior:**

- **Automatic linking:** When a legal resource is defined in the Legal tab, all CPRMV rules automatically link to it
- **Versioned URI preference:** If `eli:is_realized_by` version exists, rules link to the versioned URI
- **No user action required:** The link is generated during TTL export based on existing legal resource data

**URI Construction:**

| Legal Resource Input          | Version      | Generated cprmv:implements URI                                    |
| ----------------------------- | ------------ | ----------------------------------------------------------------- |
| `BWBR0011453`                 | `2025-01-01` | `<https://wetten.overheid.nl/BWBR0011453/2025-01-01>`             |
| `BWBR0011453`                 | _(none)_     | `<https://wetten.overheid.nl/BWBR0011453>`                        |
| `CVDR123456`                  | `2025-01-01` | `<https://lokaleregelgeving.overheid.nl/CVDR123456/1/2025-01-01>` |
| `https://example.org/law/abc` | _(any)_      | `<https://example.org/law/abc>`                                   |

---

### Rule URI Generation (v1.9.0 - Critical Fix)

**Background:**
CPRMV rules must have **globally unique URIs**. The original implementation used only `rulesetId` and `ruleId` (e.g., "BWBR0015703_onderdeel a."), which caused **URI collisions** when multiple articles contained the same subsection identifier (e.g., "onderdeel a." appears in Artikel 20 lid 1, Artikel 20 lid 2, and Artikel 21).

**Problem:**

```turtle
# BROKEN - Same URI for 3 different rules!
<https://cprmv.open-regels.nl/rules/BWBR0015703_onderdeel%20a.>  # Artikel 20, lid 1, onderdeel a.
<https://cprmv.open-regels.nl/rules/BWBR0015703_onderdeel%20a.>  # Artikel 20, lid 2, onderdeel a.
<https://cprmv.open-regels.nl/rules/BWBR0015703_onderdeel%20a.>  # Artikel 21, onderdeel a.
```

**Impact:** RDF merges triples with identical URIs. TriplyDB showed only 12 unique entities instead of 30 separate rules.

**Solution:**
Rule URIs now use the complete `cprmv:ruleIdPath` to guarantee uniqueness:

```turtle
# FIXED - Each rule has a unique URI
<https://cprmv.open-regels.nl/rules/BWBR0015703_2026-01-01_0_Artikel-20_lid-1_onderdeel-a>
<https://cprmv.open-regels.nl/rules/BWBR0015703_2026-01-01_0_Artikel-20_lid-2_onderdeel-a>
<https://cprmv.open-regels.nl/rules/BWBR0015703_2026-01-01_0_Artikel-21_onderdeel-a>
```

**URI Sanitization Rules:**

| Character            | Replacement | Example                                  |
| -------------------- | ----------- | ---------------------------------------- |
| `, ` (comma + space) | `_`         | `Artikel 20, lid 1` → `Artikel-20_lid-1` |
| ` ` (space)          | `-`         | `onderdeel a` → `onderdeel-a`            |
| `.` (period)         | _(removed)_ | `onderdeel a.` → `onderdeel-a`           |
| `()` (parentheses)   | _(removed)_ | `lid 1(a)` → `lid-1a`                    |

**Fallback:** If `ruleIdPath` is not available, the editor falls back to `rulesetId_ruleId` pattern (backward compatible with older data).

---

**Example TTL Output:**

```turtle
# Legal Resource with version
<https://wetten.overheid.nl/BWBR0015703> a eli:LegalResource ;
    dct:identifier "BWBR0015703" ;
    dct:title "Participatiewet"@nl ;
    eli:is_realized_by <https://wetten.overheid.nl/BWBR0015703/2026-01-01/0/2026-01-01> .

# CPRMV Rule with unique URI and versioned legal resource link
<https://cprmv.open-regels.nl/rules/BWBR0015703_2026-01-01_0_Artikel-20_lid-1_onderdeel-a> a cprmv:Rule ;
    cprmv:id "onderdeel a." ;
    cprmv:rulesetId "BWBR0015703" ;
    cprmv:definition "een alleenstaande van 18, 19 of 20 jaar: € 345,99;"@nl ;
    cprmv:situatie "een alleenstaande van 18, 19 of 20 jaar"@nl ;
    cprmv:norm "345,99" ;
    cprmv:ruleIdPath "BWBR0015703_2026-01-01_0, Artikel 20, lid 1, onderdeel a." ;
    cprmv:implements <https://wetten.overheid.nl/BWBR0015703/2026-01-01/0/2026-01-01> .
```

**SPARQL Query Benefits:**

Before (string matching):

```sparql
SELECT ?rule ?legalResource WHERE {
  ?rule cprmv:rulesetId ?rulesetId .
  ?legalResource dct:identifier ?identifier .
  FILTER(CONTAINS(?identifier, ?rulesetId))  # Fragile string matching
}
```

After (semantic link):

```sparql
SELECT ?rule ?legalResource WHERE {
  ?rule cprmv:implements ?legalResource .  # Direct semantic relationship
}
```

**Benefits:**

- **Eliminates ambiguity:** No more multiple legal resources matching the same `rulesetId`
- **Guarantees uniqueness:** Full hierarchical path ensures no URI collisions
- **Reduces duplicates:** Query results now return actual rule count (30 rules = 30 results)
- **Temporal precision:** Rules explicitly link to the legislation version they were extracted from
- **Query simplification:** Direct RDF traversal replaces string parsing logic
- **Maintainability:** Explicit semantic relationships are easier to understand and debug
- **Human-readable URIs:** Include article, section, and subsection in the identifier

**UI Indicator:**

The Policy tab displays an informational banner showing which legal resource all rules will link to:

```
Legal Source: All rules will automatically link to
https://wetten.overheid.nl/BWBR0015703/2026-01-01/0/2026-01-01 via cprmv:implements
📅 Version: 2026-01-01/0/2026-01-01
```

---

## 8. DMN Tab

**Location:** Dedicated "DMN" tab  
**CPSV-AP Class:** `cprmv:DecisionModel` ℹ️  
**Purpose:** Document and test decision logic using DMN (Decision Model and Notation)

### 8.1 Decision Model Resource (cprmv:DecisionModel)

| UI Field/Feature              | State Property              | TTL Output           | Vocabulary  | Status | Notes                        |
| ----------------------------- | --------------------------- | -------------------- | ----------- | ------ | ---------------------------- |
| DMN File Upload               | `dmnData.fileName`          | `dct:title`          | Dublin Core | ⭐     | File name as title           |
| -                             | `dmnData.content`           | -                    | -           | ⭐     | Raw XML (not exported)       |
| Decision Key (auto-extracted) | `dmnData.decisionKey`       | `dct:identifier`     | Dublin Core | ⭐     | From DMN `<decision id>`     |
| -                             | -                           | `dct:format`         | Dublin Core | ⭐     | Fixed: "application/dmn+xml" |
| -                             | -                           | `dct:source`         | Dublin Core | ⭐     | Placeholder DMN file URI     |
| Deployment Timestamp          | `dmnData.deployedAt`        | `dct:created`        | Dublin Core | ⭐     | ISO 8601 datetime            |
| Deployment ID                 | `dmnData.deploymentId`      | `cprmv:deploymentId` | CPRMV ℹ️    | ⭐     | Operaton deployment ID       |
| -                             | -                           | `cpsv:implements`    | CPSV-AP     | ⭐     | Link back to service         |
| API Endpoint                  | `dmnData.apiEndpoint`       | `ronl:implementedBy` | RONL ℹ️     | ⭐     | Operaton evaluation URL      |
| Last Test Timestamp           | `dmnData.lastTestTimestamp` | `cprmv:lastTested`   | CPRMV ℹ️    | ⭐     | ISO 8601 datetime            |
| Test Status                   | -                           | `cprmv:testStatus`   | CPRMV ℹ️    | ⭐     | "passed" or "failed"         |
| -                             | -                           | `dct:description`    | Dublin Core | ⭐     | Fixed description text       |

**Example TTL Output:**

```turtle
<https://regels.overheid.nl/services/aow-leeftijd/dmn> a cprmv:DecisionModel ;
    dct:identifier "RONL_BerekenLeeftijden" ;
    dct:title "RONL_BerekenLeeftijden_CPRMV.dmn"@nl ;
    dct:format "application/dmn+xml" ;
    dct:source <https://regels.overheid.nl/services/aow-leeftijd/dmn/RONL_BerekenLeeftijden_CPRMV.dmn> ;
    dct:created "2025-12-23T07:37:49.563Z"^^xsd:dateTime ;
    cprmv:deploymentId "47df2e05-dfd2-11f0-a2f7-82ff4494b5e4" ;
    cpsv:implements <https://regels.overheid.nl/services/aow-leeftijd> ;
    ronl:implementedBy <https://operaton-doc.open-regels.nl/engine-rest/decision-definition/key/RONL_BerekenLeeftijden/evaluate> ;
    cprmv:lastTested "2025-12-23T07:37:51.263Z"^^xsd:dateTime ;
    cprmv:testStatus "passed" ;
    dct:description "DMN decision model for service evaluation"@nl .
```

---

### 8.2 Input Variables (cpsv:Input)

**Auto-extracted from DMN `<inputData>` elements and test results**

| UI Field/Feature          | State Property | TTL Output          | Vocabulary  | Status | Notes                    |
| ------------------------- | -------------- | ------------------- | ----------- | ------ | ------------------------ |
| Variable Name (from DMN)  | -              | `dct:identifier`    | Dublin Core | ⭐     | Input variable name      |
| Variable Name (from DMN)  | -              | `dct:title`         | Dublin Core | ⭐     | Same as identifier       |
| Type (auto-detected)      | -              | `dct:type`          | Dublin Core | ⭐     | String, Integer, Boolean |
| Example Value (from test) | -              | `schema:value`      | Schema.org  | ⭐     | Value used in test       |
| -                         | -              | `cpsv:isRequiredBy` | CPSV-AP     | ⭐     | Links to Decision Model  |

**Example TTL Output:**

```turtle
<https://regels.overheid.nl/services/aow-leeftijd/dmn/input/1> a cpsv:Input ;
    dct:identifier "dagVanAanvraag" ;
    dct:title "dagVanAanvraag"@nl ;
    dct:type "String" ;
    schema:value "" ;
    cpsv:isRequiredBy <https://regels.overheid.nl/services/aow-leeftijd/dmn> .
```

---

### 8.3 Decision Rules (cprmv:DecisionRule)

**Auto-extracted from DMN XML using CPRMV attributes**

| CPRMV Attribute            | TTL Output            | Vocabulary  | Status | Notes                        |
| -------------------------- | --------------------- | ----------- | ------ | ---------------------------- |
| `id` (from DMN)            | `dct:identifier`      | Dublin Core | ⭐     | Rule identifier              |
| -                          | `cpsv:implements`     | CPSV-AP     | ⭐     | Links to service             |
| `cprmv:extends`            | `cprmv:extends`       | CPRMV ℹ️    | ⭐     | Legal article URI (absolute) |
| `cprmv:validFrom`          | `cprmv:validFrom`     | CPRMV ℹ️    | ⭐     | Start date                   |
| `cprmv:validUntil`         | `cprmv:validUntil`    | CPRMV ℹ️    | ⭐     | End date                     |
| `cprmv:ruleType`           | `cprmv:ruleType`      | CPRMV ℹ️    | ⭐     | Rule category                |
| `cprmv:confidence`         | `cprmv:confidence`    | CPRMV ℹ️    | ⭐     | Confidence level             |
| `cprmv:note`               | `cprmv:note`          | CPRMV ℹ️    | ⭐     | Human-readable description   |
| `decisionTable` (from DMN) | `cprmv:decisionTable` | CPRMV ℹ️    | ⭐     | Decision table ID            |
| `cprmv:rulesetType`        | `cprmv:rulesetType`   | CPRMV ℹ️    | ⭐     | Ruleset category             |

**Example TTL Output:**

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

---

### 8.4 Service-DMN Relationship

The Public Service links to its Decision Model:

| Property                 | Domain               | Range                 | Cardinality | Status |
| ------------------------ | -------------------- | --------------------- | ----------- | ------ |
| `cprmv:hasDecisionModel` | `cpsv:PublicService` | `cprmv:DecisionModel` | 0..1        | ⭐     |

**Example:**

```turtle
<https://regels.overheid.nl/services/aow-leeftijd> a cpsv:PublicService ;
    # ... other service properties ...
    cprmv:hasDecisionModel <https://regels.overheid.nl/services/aow-leeftijd/dmn> .
```

---

### 8.5 DMN Tab Features

| Feature                    | Status | Description                                  |
| -------------------------- | ------ | -------------------------------------------- |
| File Upload                | ⭐     | Upload `.dmn` XML files                      |
| Load Example               | ⭐     | Load pre-configured example DMN              |
| Decision Key Extraction    | ⭐     | Auto-extract from `<decision id>`            |
| Request Body Generation    | ⭐     | Auto-generate from `<inputData>` elements    |
| Operaton Deployment        | ⭐     | Deploy DMN to rule engine                    |
| Decision Evaluation        | ⭐     | Test with live data (Postman-style)          |
| Status Tracking            | ⭐     | Track deployment and test status             |
| Rule Extraction            | ⭐     | Extract rules from DMN with CPRMV attributes |
| Legal Reference Conversion | ⭐     | Convert relative to absolute URIs            |
| TTL Export                 | ⭐     | Include all metadata in export               |

---

### 8.6 Input Variable Type Detection

The DMN tab intelligently detects input types based on naming patterns:

| Pattern                       | Detected Type | Example Value | Notes                  |
| ----------------------------- | ------------- | ------------- | ---------------------- |
| Contains "datum" or "date"    | String        | "2025-01-01"  | ISO 8601 date format   |
| Contains "is" or "heeft"      | Boolean       | false         | Dutch boolean patterns |
| Contains "aantal" or "bedrag" | Integer       | 0             | Numeric patterns       |
| Default                       | String        | ""            | Fallback type          |

---

#### 8.7 NL-SBB Concepts

The CPSV Editor automatically generates semantic concept definitions for DMN decision variables according to the **Dutch Standard for Describing Concepts (NL-SBB)**. These concepts enable semantic interoperability across different decision models.

**Key Features:**

- **Automatic Generation**: Concepts are automatically created when you test a DMN model
- **Full CRUD Operations**: Add, edit, and delete concepts with a user-friendly interface
- **Semantic Linking**: Use `skos:exactMatch` to link concepts across different ontologies
- **Import/Export**: Concepts are preserved in round-trip import/export cycles
- **Manual Management**: Add custom input/output concepts beyond auto-generated ones

**Concept Properties:**

- **Preferred Label** (skos:prefLabel): Human-readable name in Dutch
- **Notation** (skos:notation): Short machine code (e.g., "GA", "LP")
- **Definition** (skos:definition): Semantic description of the concept
- **Variable Name**: Technical name used in DMN and URIs
- **Exact Match** (skos:exactMatch): Optional URI to equivalent concept in another ontology

**Use Cases:**

- **Cross-DMN Validation**: Link variables like "geboortedatum" = "birthdate" across different models
- **Chain Detection**: Enable the Linked Data Explorer to detect cycles and validate decision chains
- **Concept Harmonization**: Standardize terminology across different government organizations
- **Semantic Search**: Enable semantic queries across multiple decision models

**Standards Compliance:**

- NL-SBB (Nederlandse Standaard voor het Beschrijven van Begrippen)
- SKOS (Simple Knowledge Organization System)
- Linked Data principles with dereferenceable URIs

**Documentation**: [Dutch Standard for Describing Concepts](https://geonovum.github.io/NL-SBB/)

### 8.8 Operaton API Integration

| API Endpoint                              | Method | Purpose           | Status |
| ----------------------------------------- | ------ | ----------------- | ------ |
| `/deployment/create`                      | POST   | Deploy DMN file   | ⭐     |
| `/decision-definition/key/{key}/evaluate` | POST   | Evaluate decision | ⭐     |

**Configuration:**

- Base URL: Configurable (default: `https://operaton-doc.open-regels.nl`)
- Decision Key: Auto-extracted from DMN
- Evaluation URL: Auto-generated from configuration

---

### 8.9 Vocabulary Extensions

**New CPRMV Properties:**

| Property                 | Domain                | Range                 | Description                     |
| ------------------------ | --------------------- | --------------------- | ------------------------------- |
| `cprmv:DecisionModel`    | Class                 | -                     | A decision model resource (DMN) |
| `cprmv:DecisionRule`     | Class                 | -                     | A specific rule within DMN      |
| `cprmv:hasDecisionModel` | `cpsv:PublicService`  | `cprmv:DecisionModel` | Links service to decision model |
| `cprmv:deploymentId`     | `cprmv:DecisionModel` | `xsd:string`          | Deployment identifier           |
| `cprmv:lastTested`       | `cprmv:DecisionModel` | `xsd:dateTime`        | Last test timestamp             |
| `cprmv:testStatus`       | `cprmv:DecisionModel` | `xsd:string`          | Test result status              |
| `cprmv:extends`          | `cprmv:DecisionRule`  | `rdfs:Resource`       | Legal article extended          |
| `cprmv:ruleType`         | `cprmv:DecisionRule`  | `xsd:string`          | Type of rule                    |
| `cprmv:confidence`       | `cprmv:DecisionRule`  | `xsd:string`          | Confidence level                |
| `cprmv:note`             | `cprmv:DecisionRule`  | `rdf:langString`      | Human-readable note             |
| `cprmv:decisionTable`    | `cprmv:DecisionRule`  | `xsd:string`          | Decision table identifier       |
| `cprmv:rulesetType`      | `cprmv:DecisionRule`  | `xsd:string`          | Type of ruleset                 |

**New RONL Properties:**

| Property             | Domain                | Range           | Description                         |
| -------------------- | --------------------- | --------------- | ----------------------------------- |
| `ronl:implementedBy` | `cprmv:DecisionModel` | `rdfs:Resource` | Software system executing the model |

**CPSV-AP Properties (Used):**

| Property            | Domain                | Range                 | Description                  |
| ------------------- | --------------------- | --------------------- | ---------------------------- |
| `cpsv:implements`   | `cprmv:DecisionModel` | `cpsv:PublicService`  | Service implemented by model |
| `cpsv:Input`        | Class                 | -                     | Input variable               |
| `cpsv:isRequiredBy` | `cpsv:Input`          | `cprmv:DecisionModel` | Input required by model      |
| `cpsv:Rule`         | Class                 | -                     | Base class for rules         |

---

## 9. Future CPSV-AP Classes

### 9.1 Channel (cv:Channel)

**Priority:** MEDIUM

| CPSV-AP Property    | Cardinality | Suggested UI Label    | Notes                 |
| ------------------- | ----------- | --------------------- | --------------------- |
| `dct:identifier`    | 1..\*       | Channel Identifier \* | **MANDATORY**         |
| `dct:description`   | 0..\*       | Description           | Text                  |
| `cv:processingTime` | 0..1        | Processing Time       | Duration              |
| `dct:type`          | 0..1        | Channel Type          | Online/Phone/InPerson |

---

### 9.2 ContactPoint (cv:ContactPoint)

**Priority:** MEDIUM

| CPSV-AP Property | Cardinality | Suggested UI Label | Notes        |
| ---------------- | ----------- | ------------------ | ------------ |
| `cv:contactPage` | 0..\*       | Contact Page URL   | Document URL |
| `cv:hasEmail`    | 0..\*       | Email Address      | Email        |
| `cv:telephone`   | 0..\*       | Phone Number       | Phone        |

---

### 9.3 Requirement (cv:Requirement)

**Priority:** MEDIUM-LOW

| CPSV-AP Property  | Cardinality | Suggested UI Label  | Notes         |
| ----------------- | ----------- | ------------------- | ------------- |
| `dct:identifier`  | 1..\*       | Requirement ID \*   | **MANDATORY** |
| `dct:title`       | 1..\*       | Requirement Name \* | **MANDATORY** |
| `dct:description` | 1..\*       | Description \*      | **MANDATORY** |
| `dct:type`        | 0..\*       | Requirement Type    | Code          |

---

### 9.4 Evidence (cv:Evidence)

**Priority:** LOW

| CPSV-AP Property  | Cardinality | Suggested UI Label | Notes         |
| ----------------- | ----------- | ------------------ | ------------- |
| `dct:identifier`  | 1..\*       | Evidence ID \*     | **MANDATORY** |
| `dct:title`       | 1..\*       | Evidence Name \*   | **MANDATORY** |
| `dct:description` | 0..\*       | Description        | Text          |
| `dct:type`        | 0..1        | Evidence Type      | Code          |

---

### 9.5 Event (cv:Event, cv:BusinessEvent, cv:LifeEvent)

**Priority:** LOW

| CPSV-AP Property  | Cardinality | Suggested UI Label | Notes                   |
| ----------------- | ----------- | ------------------ | ----------------------- |
| `dct:identifier`  | 1..\*       | Event ID \*        | **MANDATORY**           |
| `dct:title`       | 1..\*       | Event Name \*      | **MANDATORY**           |
| `dct:description` | 0..\*       | Description        | Text                    |
| `dct:type`        | 0..\*       | Event Type         | BusinessEvent/LifeEvent |

---

### 9.6 Address (locn:Address)

**Priority:** LOW (sub-entity of Organization)

| CPSV-AP Property         | Cardinality | Suggested UI Label | Notes       |
| ------------------------ | ----------- | ------------------ | ----------- |
| `locn:thoroughfare`      | 0..\*       | Street             | Street name |
| `locn:locatorDesignator` | 0..\*       | House Number       | Number      |
| `locn:postCode`          | 0..\*       | Postal Code        | Postcode    |
| `locn:postName`          | 0..\*       | City               | City name   |
| `locn:adminUnitL1`       | 0..\*       | Country            | Country     |
| `locn:adminUnitL2`       | 0..\*       | Province/Region    | Region      |

---

## 10. Implementation Summary

### Version 1.5.0 - DMN Integration ⭐

**What's New:**

- DMN Tab with complete decision engine integration
- Operaton REST API integration (deployment & evaluation)
- Automatic input variable extraction and documentation
- Smart request body generation
- Rule extraction from DMN XML with CPRMV attributes
- Complete TTL export with decision model metadata
- URI sanitization for service identifiers (spaces → hyphens)
- Organization URI handling (supports both short IDs and full URIs)

**Vocabulary Extensions:**

- CPRMV: `DecisionModel`, `DecisionRule`, `hasDecisionModel`, `deploymentId`, `lastTested`, `testStatus`, `extends`, `ruleType`, `confidence`, `note`, `decisionTable`, `rulesetType`
- RONL: `implementedBy`
- Uses CPSV-AP: `implements`, `Input`, `isRequiredBy`, `Rule`

**Benefits:**

- ✅ Document executable decision logic
- ✅ Test rules with live data
- ✅ Track deployment and versions
- ✅ Link decisions to legal sources
- ✅ Extract rules automatically from DMN
- ✅ Export complete service + rules metadata
- ✅ Clean, absolute URIs throughout

---

### Phase 1 Complete (v1.4.0) 🎯

**Achievements:**

- ✅ All mandatory CPSV-AP 3.2.0 properties implemented
- ✅ Service, Organization, Legal Resource compliant
- ✅ Cost and Output sections added
- ✅ Proper class types and relationships
- ✅ Geographic jurisdiction (cv:spatial) mandatory

---

### Current Compliance Status

| Component          | CPSV-AP 3.2.0 Status | Notes                      |
| ------------------ | -------------------- | -------------------------- |
| **Service**        | ✅ Compliant         | All mandatory fields       |
| **Organization**   | ✅ Compliant         | Including cv:spatial       |
| **Legal Resource** | ✅ Compliant         | Using cv:hasLegalResource  |
| **Cost**           | ✅ Compliant         | Optional, properly modeled |
| **Output**         | ✅ Compliant         | Optional, properly modeled |
| **Rules**          | ℹ️ Extension         | RONL temporal rules        |
| **Parameters**     | ℹ️ Extension         | CPRMV parameters           |
| **CPRMV Rules**    | ℹ️ Extension         | Dutch normenbrief format   |
| **DMN**            | ⭐ New Extension     | Decision models (v1.5.0)   |

---

### Future Phases

**Phase 2 (Planned):**

- 📋 Channel (cv:Channel)
- 📋 ContactPoint (cv:ContactPoint)
- 📋 Criterion (cv:Criterion)

**Phase 3 (Planned):**

- 🔮 Requirement (cv:Requirement)
- 🔮 Evidence (cv:Evidence)
- 🔮 Event (cv:Event)
- 🔮 Participation (cpov:Participation)

---

## References

### Standards Documentation

- **CPSV-AP 3.2.0:** https://semiceu.github.io/CPSV-AP/
- **CPRMV 0.3.0:** https://cprmv.open-regels.nl/0.3.0/
- **RONL Vocabulary:** https://regels.overheid.nl/termen/
- **DMN 1.3:** https://www.omg.org/spec/DMN/1.3/
- **Operaton API:** https://docs.operaton.org/
- **Dublin Core:** https://www.dublincore.org/specifications/dublin-core/dcmi-terms/
- **Schema.org:** https://schema.org/

### Editor Resources

- **Application:** https://cpsv.open-regels.nl/
- **Repository:** Part of RONL Initiative
- **Documentation:**
  - [README.md](./../README.md)
  - FIELD-MAPPING-CPSV-AP-3.2.0.md (this document)
  - [DMN-INTEGRATION-DOCUMENTATION-v1.5.1.md](./DMN-INTEGRATION-DOCUMENTATION-v1.5.1.md)

---

_Core Public Service Editor - CPSV-AP 3.2.0 Compliant + DMN Integration_
