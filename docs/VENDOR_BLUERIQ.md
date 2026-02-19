# Vendor Tab Implementation - Blueriq Service Metadata

**Version:** 1.9.0  
**Date:** February 15, 2026  
**Status:** Production Ready  
**Feature:** Multi-Vendor Service Metadata Architecture

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Interface](#user-interface)
4. [Data Model](#data-model)
5. [TTL Output Specification](#ttl-output-specification)
6. [Implementation Details](#implementation-details)
7. [Validation](#validation)
8. [Import/Export](#importexport)
9. [Certification Workflow](#certification-workflow)
10. [Future Enhancements](#future-enhancements)

---

## Overview

### Purpose

The Vendor Tab enables Dutch government services to document **vendor-specific implementations** of their decision models. While the CPSV Editor creates reference DMN decision models, vendors like Blueriq, iKnow, and others provide commercial implementations with additional features, support, and enterprise capabilities.

This tab creates a bridge between:

- **Reference Implementation**: Open-source DMN model validated by government
- **Vendor Implementation**: Commercial service with SLAs, support, and certification

### Key Features

✅ **Multi-Vendor Architecture**: Dropdown loads all RONL Method Concepts from TriplyDB  
✅ **Blueriq Service Metadata**: Full contact, technical, and certification information  
✅ **Logo Management**: Asset path generation matching Organization tab pattern  
✅ **URL Validation**: Real-time feedback for vendor website and service endpoint  
✅ **Certification Workflow**: Track conformance assessment status and certification  
✅ **TTL Generation**: Complete RDF output with schema.org and RONL vocabularies

---

## Architecture

### Component Structure

```
VendorTab
├── Vendor Selection (ronl:MethodConcept dropdown)
├── Vendor-Specific Content (conditional rendering)
│   ├── iKnow → IKnowMappingTab (XML import)
│   ├── Blueriq → Blueriq Service Metadata Form
│   └── Other → Implementation Placeholder
└── Certification Request Modal
```

### State Management

```javascript
// Global State (useEditorState hook)
const [vendorService, setVendorService] = useState({
  selectedVendor: '', // RONL Method Concept URI
  contact: {
    organizationName: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    logo: '', // Base64 for preview, asset path for TTL
  },
  serviceNotes: '',
  technical: {
    serviceUrl: '',
    license: '',
    accessType: 'fair-use', // or 'iam-required'
  },
  certification: {
    status: 'not-certified', // or 'in-review', 'certified'
    certifiedBy: '',
    certifiedAt: '',
    certificationNote: '',
  },
});

// Local UI State (VendorTab component)
const [selectedVendor, setSelectedVendor] = useState('');
const [vendorConcepts, setVendorConcepts] = useState([]);
const [showCertificationModal, setShowCertificationModal] = useState(false);
```

### Key State Synchronization Points

**Critical Fix Applied:** The dropdown `onChange` handler updates **both** local and parent state:

```javascript
onChange={(e) => {
  const newVendor = e.target.value;
  setSelectedVendor(newVendor);          // Local UI state
  setVendorService({                      // Parent state
    ...vendorService,
    selectedVendor: newVendor
  });
}}
```

Without this dual update, TTL generation fails because `vendorService.selectedVendor` remains empty.

---

## User Interface

### Vendor Selection

**Dropdown Population:**

- Fetches RONL Method Concepts via SPARQL query on component mount
- Endpoint: `https://api.open-regels.triply.cc/datasets/stevengort/ronl/services/ronl/sparql`
- Query: `SELECT ?narrower ?prefLabel WHERE { ronl:MethodConcept skos:narrower ?narrower }`
- Populates dropdown with 17 vendor options (as of Feb 2026)

**SPARQL Query:**

```sparql
PREFIX ronl: <https://regels.overheid.nl/termen/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?narrower ?prefLabel
WHERE {
  ronl:MethodConcept skos:narrower ?narrower .
  ?narrower skos:prefLabel ?prefLabel .
  FILTER(LANG(?prefLabel) = "nl" || LANG(?prefLabel) = "")
}
ORDER BY ?prefLabel
```

### Blueriq Service Configuration

#### Section 1: Vendor Contact Information (70% width)

| Field             | RDF Property                         | Required | Validation         |
| ----------------- | ------------------------------------ | -------- | ------------------ |
| Organization Name | schema:name                          | ✅       | -                  |
| Contact Person    | schema:contactPoint/schema:name      | -        | -                  |
| Email             | schema:contactPoint/schema:email     | -        | Email format       |
| Phone             | schema:contactPoint/schema:telephone | -        | -                  |
| Website           | foaf:homepage                        | -        | **URL validation** |

#### Section 2: Vendor Logo (30% width)

- **Upload Button**: File input for PNG/JPG/GIF
- **Preview**: Shows uploaded logo with Blueriq branding
- **Remove Button**: Clears uploaded logo
- **Asset Path Generation**: `./assets/Blueriq_vendor_logo.png`
- **Size Limit**: ~500KB recommended (validation shows warning for >1MB)

#### Section 3: Technical Information

| Field       | RDF Property    | Required | Validation                     |
| ----------- | --------------- | -------- | ------------------------------ |
| Service URL | schema:url      | -        | **URL validation**             |
| License     | schema:license  | -        | Free text                      |
| Access Type | ronl:accessType | ✅       | Radio: fair-use / iam-required |

#### Section 4: Service Notes

- **Field**: Textarea (8 rows)
- **RDF Property**: `dct:description`
- **Purpose**: Vendor-specific features, limitations, implementation details
- **Example**: "This vendor implementation includes additional validation for edge cases not covered in the reference DMN..."

#### Section 5: Conformance Assessment and Approved Provider Registry

**Certification Status Options:**

1. **Not Validated** (default) - Initial state
2. **In Review** - Submitted for assessment
3. **Certified** - Approved by competent authority

**Conditional Fields** (shown only for in-review/certified):

- Certification Date (ronl:certifiedAt)
- Certification Note (ronl:certificationNote)

**Auto-Populated Field:**

- Certified By URI (ronl:certifiedBy) - Auto-fills from Organization tab identifier

**Action Button:**

- "Request Certification" - Opens modal with email template

---

## Data Model

### RONL Ontology Extensions

```turtle
@prefix ronl: <https://regels.overheid.nl/ontology#> .

# Class Definition
ronl:VendorService a rdfs:Class ;
    rdfs:label "Vendor Service Implementation"@en ;
    rdfs:comment "Commercial implementation of a government decision model"@nl .

# Properties
ronl:basedOn rdfs:domain ronl:VendorService ;
    rdfs:range cprmv:DecisionModel .

ronl:implementedBy rdfs:domain ronl:VendorService ;
    rdfs:range ronl:MethodConcept .

ronl:accessType rdfs:domain ronl:VendorService ;
    rdfs:range xsd:string .

ronl:certificationStatus rdfs:domain ronl:VendorService ;
    rdfs:range xsd:string .

ronl:certifiedBy rdfs:domain ronl:VendorService ;
    rdfs:range cv:PublicOrganisation .

ronl:certifiedAt rdfs:domain ronl:VendorService ;
    rdfs:range xsd:date .

ronl:certificationNote rdfs:domain ronl:VendorService ;
    rdfs:range rdf:langString .
```

### Schema.org Integration

```turtle
@prefix schema: <http://schema.org/> .

# Vendor service uses schema:provider for contact info
schema:provider rdfs:domain ronl:VendorService ;
    rdfs:range schema:Organization .

# Nested contact point structure
schema:contactPoint rdfs:domain schema:Organization ;
    rdfs:range schema:ContactPoint .
```

### State Object Structure

```javascript
vendorService: {
  selectedVendor: "https://regels.overheid.nl/termen/Blueriq",

  contact: {
    organizationName: "Blueriq",
    contactPerson: "René Frankena",
    email: "contact@blueriq.com",
    phone: "+31 6 12 34 56 78",
    website: "https://www.blueriq.com",
    logo: "data:image/png;base64,iVBORw0KGgoAAAA..."  // Base64 string
  },

  serviceNotes: "Service Notes goes here...",

  technical: {
    serviceUrl: "https://regelservices.blueriq.com/shortcut/Doccle",
    license: "Commercial",
    accessType: "iam-required"  // or "fair-use"
  },

  certification: {
    status: "not-certified",  // or "in-review", "certified"
    certifiedBy: "https://organisaties.overheid.nl/28212263/Sociale_Verzekeringsbank",
    certifiedAt: "2026-02-15",
    certificationNote: "Certified implementation validated..."
  }
}
```

---

## TTL Output Specification

### Complete Example

```turtle
# ============================================================
#  Vendor Service
# ============================================================

<https://regels.overheid.nl/services/aow-leeftijd/vendor> a ronl:VendorService ;
    ronl:basedOn <https://regels.overheid.nl/services/aow-leeftijd/dmn> ;
    ronl:implementedBy <https://regels.overheid.nl/termen/Blueriq> ;
    schema:provider [
        a schema:Organization ;
        schema:name "Blueriq" ;
        schema:image <./assets/Blueriq_vendor_logo.png> ;
        schema:contactPoint [
            schema:name "René Frankena" ;
            schema:email "contact@blueriq.com" ;
            schema:telephone "+31 6 12 34 56 78"
        ] ;
        foaf:homepage <https://www.blueriq.com>
    ] ;
    schema:url <https://regelservices.blueriq.com/shortcut/Doccle> ;
    schema:license "Commercial" ;
    ronl:accessType "iam-required" ;
    dct:description "Service Notes goes here..."@nl  .
```

### URI Construction

**Vendor Service URI Pattern:**

```
{serviceUri}/vendor
```

**Example:**

- Service URI: `https://regels.overheid.nl/services/aow-leeftijd`
- Vendor URI: `https://regels.overheid.nl/services/aow-leeftijd/vendor`

### Conditional Output Rules

#### Rule 1: Vendor Section Only Generated When Vendor Selected

```javascript
hasVendorService() {
  return (
    this.vendorService &&
    this.vendorService.selectedVendor &&
    this.vendorService.selectedVendor.trim() !== ''
  );
}
```

**Result:** No vendor section if dropdown = "-- Select vendor --"

#### Rule 2: Contact Information Only When Fields Present

```javascript
const hasContact =
  vendor.contact.organizationName ||
  vendor.contact.contactPerson ||
  vendor.contact.email ||
  vendor.contact.phone ||
  vendor.contact.website ||
  vendor.contact.logo;

if (hasContact) {
  // Generate schema:provider block
}
```

#### Rule 3: Certification Metadata Only for Non-Default Status

```javascript
if (vendor.certification.status && vendor.certification.status !== 'not-certified') {
  ttl += `    ronl:certificationStatus "${vendor.certification.status}"^^xsd:string ;\n`;
  // ... additional certification fields
}
```

**Result:** Cleaner TTL without empty certification metadata

#### Rule 4: Logo as Asset Path (Not Base64)

```javascript
if (vendor.contact.logo && vendor.contact.logo.trim() !== '') {
  const vendorUri = vendor.selectedVendor;
  const vendorName = vendorUri.split('/').pop(); // "Blueriq"
  const logoPath = `./assets/${vendorName}_vendor_logo.png`;

  ttl += `        schema:image <${logoPath}> ;\n`;
}
```

**Why?**

- Keeps TTL files small (~10KB vs 188KB)
- Matches Organization tab pattern
- Actual upload happens during publish workflow

---

## Implementation Details

### File Structure

```
src/
├── components/tabs/
│   ├── VendorTab.jsx                 # Main vendor tab component
│   └── IKnowMappingTab.jsx           # iKnow-specific integration
├── hooks/
│   └── useEditorState.js             # Global state including vendorService
├── utils/
│   ├── ttlGenerator.js               # TTL generation logic
│   ├── validators.js                 # URL validation for vendor fields
│   └── ronlHelper.js                 # SPARQL queries for RONL concepts
└── App.js                             # Main app with buildStateForTTL()
```

### Key Functions

#### 1. Vendor Concept Loading (ronlHelper.js)

```javascript
export async function fetchAllRonlConcepts(endpoint) {
  const queries = [
    { type: 'analysis', concept: 'ronl:AnalysisConcept' },
    { type: 'method', concept: 'ronl:MethodConcept' },
  ];

  const results = await Promise.all(
    queries.map(async ({ type, concept }) => {
      const query = `
        PREFIX ronl: <https://regels.overheid.nl/termen/>
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        
        SELECT ?narrower ?prefLabel
        WHERE {
          ${concept} skos:narrower ?narrower .
          ?narrower skos:prefLabel ?prefLabel .
          FILTER(LANG(?prefLabel) = "nl" || LANG(?prefLabel) = "")
        }
        ORDER BY ?prefLabel
      `;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sparql-query' },
        body: query,
      });

      const data = await response.json();
      return data.results.bindings.map((b) => ({
        uri: b.narrower.value,
        label: b.prefLabel.value,
      }));
    })
  );

  return {
    analysisConcepts: results[0],
    methodConcepts: results[1],
  };
}
```

#### 2. TTL Generation (ttlGenerator.js)

```javascript
generateVendorServiceSection() {
  if (!this.hasVendorService()) {
    return '';
  }

  const vendor = this.vendorService;
  const vendorUri = `${this.serviceUri}/vendor`;

  let ttl = '';
  ttl += `<${vendorUri}> a ronl:VendorService ;\n`;
  ttl += `    ronl:basedOn <${this.serviceUri}/dmn> ;\n`;
  ttl += `    ronl:implementedBy <${vendor.selectedVendor}> ;\n`;

  // Contact information block
  const hasContact = vendor.contact.organizationName ||
                     vendor.contact.contactPerson ||
                     vendor.contact.email ||
                     vendor.contact.phone ||
                     vendor.contact.website ||
                     vendor.contact.logo;

  if (hasContact) {
    ttl += `    schema:provider [\n`;
    ttl += `        a schema:Organization ;\n`;

    if (vendor.contact.organizationName) {
      ttl += `        schema:name "${escapeTTLString(vendor.contact.organizationName)}" ;\n`;
    }

    // Logo as asset path
    if (vendor.contact.logo && vendor.contact.logo.trim() !== '') {
      const vendorName = vendor.selectedVendor.split('/').pop();
      const logoPath = `./assets/${vendorName}_vendor_logo.png`;
      ttl += `        schema:image <${logoPath}> ;\n`;
    }

    // Contact point nested structure
    const hasContactPoint = vendor.contact.contactPerson ||
                            vendor.contact.email ||
                            vendor.contact.phone;

    if (hasContactPoint) {
      ttl += `        schema:contactPoint [\n`;
      if (vendor.contact.contactPerson) {
        ttl += `            schema:name "${escapeTTLString(vendor.contact.contactPerson)}" ;\n`;
      }
      if (vendor.contact.email) {
        ttl += `            schema:email "${vendor.contact.email}" ;\n`;
      }
      if (vendor.contact.phone) {
        ttl += `            schema:telephone "${vendor.contact.phone}" \n`;
      }
      ttl += `        ] ;\n`;
    }

    if (vendor.contact.website) {
      ttl += `        foaf:homepage <${vendor.contact.website}> \n`;
    }

    ttl += `    ] ;\n`;
  }

  // Technical information
  if (vendor.technical.serviceUrl) {
    ttl += `    schema:url <${vendor.technical.serviceUrl}> ;\n`;
  }
  if (vendor.technical.license) {
    ttl += `    schema:license "${escapeTTLString(vendor.technical.license)}" ;\n`;
  }
  if (vendor.technical.accessType) {
    ttl += `    ronl:accessType "${vendor.technical.accessType}" ;\n`;
  }

  // Service notes
  if (vendor.serviceNotes && vendor.serviceNotes.trim() !== '') {
    ttl += `    dct:description "${escapeTTLString(vendor.serviceNotes)}"@nl ;\n`;
  }

  // Certification (only if status is not "not-certified")
  if (vendor.certification.status &&
      vendor.certification.status !== 'not-certified') {
    ttl += `    ronl:certificationStatus "${vendor.certification.status}"^^xsd:string ;\n`;

    if (vendor.certification.certifiedBy) {
      ttl += `    ronl:certifiedBy <${vendor.certification.certifiedBy}> ;\n`;
    }
    if (vendor.certification.certifiedAt) {
      ttl += `    ronl:certifiedAt "${vendor.certification.certifiedAt}"^^xsd:date ;\n`;
    }
    if (vendor.certification.certificationNote) {
      ttl += `    ronl:certificationNote "${escapeTTLString(vendor.certification.certificationNote)}"@nl ;\n`;
    }
  }

  ttl = ttl.slice(0, -2) + ' .\n\n';
  return ttl;
}
```

#### 3. URL Validation (validators.js)

```javascript
/**
 * Validate vendor service fields
 * @param {object} vendorService - Vendor service state object
 * @returns {string[]} - Array of error messages
 */
export function validateVendorService(vendorService) {
  const errors = [];

  if (!vendorService.selectedVendor) {
    return errors; // No validation if no vendor selected
  }

  if (vendorService.contact.website && !isValidUrl(vendorService.contact.website)) {
    errors.push('Vendor website must be a valid URL (e.g., https://www.blueriq.com)');
  }

  if (vendorService.technical.serviceUrl && !isValidUrl(vendorService.technical.serviceUrl)) {
    errors.push('Service URL must be a valid URL (e.g., https://api.blueriq.com/service)');
  }

  return errors;
}

// Helper function
function isValidUrl(str) {
  if (!str) return false;
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}
```

---

## Validation

### Real-Time Validation

**Input Type Validation:**

```javascript
<input
  type="url" // Browser validation
  value={vendorService.contact.website || ''}
  className={`... ${
    vendorService.contact.website && !isValidUrl(vendorService.contact.website)
      ? 'border-red-500'
      : 'border-gray-300'
  }`}
/>
```

**Visual Feedback:**

- ✅ Valid URL: Green/normal border
- ❌ Invalid URL: Red border + warning text
- ⚪ Empty: Normal state (optional field)

### Form Validation

**Integrated into App.js validation:**

```javascript
const handleValidate = () => {
  const validation = validateForm({
    service,
    organization,
    legalResource,
    ronlAnalysis,
    ronlMethod,
    temporalRules,
    parameters,
    vendorService, // ✅ Added vendor validation
  });

  if (!validation.isValid) {
    // Show error messages
  }
};
```

**Example Error Messages:**

```
Validation failed with 2 errors:
- Vendor website must be a valid URL (e.g., https://www.blueriq.com)
- Service URL must be a valid URL (e.g., https://api.blueriq.com/service)
```

---

## Import/Export

### Export (Download TTL)

**State Flow:**

```
User fills Vendor form
  → vendorService state updates
  → buildStateForTTL() includes vendorService
  → generateTTL(state) called
  → hasVendorService() checks selectedVendor
  → generateVendorServiceSection() creates TTL
  → Vendor section appended to TTL file
```

**TTL Position:**

```
1. Namespaces
2. Public Service
3. Cost
4. Output
5. Organization
6. Legal Resource
7. Temporal Rules
8. Parameters
9. CPRMV Rules
10. DMN Decision Model
11. DMN Inputs/Outputs
12. CPRMV Decision Rules (from DMN)
13. NL-SBB Concepts
14. Vendor Service  ← HERE
```

### Import (TTL File Upload)

**Parser Enhancement Needed:**
Currently, the TTL parser (`parseTTL.enhanced.js`) does **not** parse vendor service sections. This is a planned enhancement for v1.9.1.

**Planned Implementation:**

```javascript
// Add to parseTTL.enhanced.js
if (subject.includes('/vendor')) {
  currentSection = 'vendor';

  if (property === 'ronl:implementedBy') {
    extractedData.vendorService.selectedVendor = extractValue(rest);
  }
  if (property === 'schema:name' && inProvider) {
    extractedData.vendorService.contact.organizationName = extractValue(rest);
  }
  // ... etc
}
```

**Round-Trip Support:**

1. ✅ Export TTL with vendor section
2. ❌ Import TTL (vendor section ignored currently)
3. 🔄 v1.9.1 will add full import support

---

## Certification Workflow

### Conformance Assessment Modal

**Trigger:** Click "Request Certification" button

**Modal Contents:**

1. **Pre-filled Email Template**
   - To: Certifying organization (from Organization tab)
   - Subject: "Conformance Assessment Request - {Service Name}"
   - Body: Auto-populated with service details, vendor info, DMN endpoint

2. **Information Included:**
   - Service name and identifier
   - Decision model endpoint
   - Vendor implementation URL
   - Contact information
   - Validation status of reference DMN

3. **Action Buttons:**
   - "Open in Mail Client" - Opens default email app
   - "Copy to Clipboard" - Copies email content
   - "Close" - Dismisses modal

### Certification States

**State 1: Not Certified** (Default)

- Status: `not-certified`
- UI: Orange badge, "Request Certification" button visible
- TTL: No certification metadata generated

**State 2: In Review**

- Status: `in-review`
- UI: Blue badge, certification date/note fields shown
- TTL: Includes `ronl:certificationStatus`, `ronl:certifiedBy`, `ronl:certifiedAt`, `ronl:certificationNote`

**State 3: Certified**

- Status: `certified`
- UI: Green badge, certification date/note fields shown (read-only recommended)
- TTL: Full certification metadata included

### Auto-Population Logic

```javascript
useEffect(() => {
  if (
    vendorService.certification.status === 'not-certified' &&
    !vendorService.certification.certifiedBy &&
    organization.identifier
  ) {
    const orgUri = organization.identifier.startsWith('http')
      ? organization.identifier
      : `https://regels.overheid.nl/organizations/${organization.identifier}`;

    setVendorService({
      ...vendorService,
      certification: {
        ...vendorService.certification,
        certifiedBy: orgUri,
      },
    });
  }
}, [organization.identifier]);
```

**Why?** The competent authority (Organization tab) is typically also the certifying authority.

---

## Future Enhancements

### Phase 1: Import Support (v1.9.1)

**Goal:** Full round-trip support for vendor metadata

**Implementation:**

- Enhance `parseTTL.enhanced.js` to parse `ronl:VendorService` entities
- Extract nested `schema:provider` and `schema:contactPoint` structures
- Populate `vendorService` state from imported TTL
- Test: Export → Import → Verify all fields populate

**Complexity:** Medium (2-3 hours)

### Phase 2: Multi-Vendor Support (v1.10.0)

**Additional Vendors:**

- **Oracle Policy Automation** - Similar metadata structure to Blueriq
- **IBM ODM** - Enterprise decision management platform
- **Signavio** - Process and decision modeling
- **Custom/Other** - Generic vendor metadata form

**Implementation Pattern:**

```javascript
{
  selectedVendor === 'https://regels.overheid.nl/termen/Oracle' && (
    <OracleVendorForm vendorService={vendorService} setVendorService={setVendorService} />
  );
}
```

### Phase 3: Publish Integration (v2.0.0)

**Goal:** Integrate vendor logo upload with TriplyDB publish workflow

**Current State:**

- Vendor logo stored as base64 in state
- TTL references asset path `./assets/Blueriq_vendor_logo.png`
- Logo not actually uploaded to TriplyDB

**Enhancement:**

```javascript
// In publishToTriplyDB function
if (vendorService.contact.logo) {
  const vendorName = vendorService.selectedVendor.split('/').pop();
  const logoAssetName = `${vendorName}_vendor_logo.png`;

  await uploadLogoAsset(
    vendorService.contact.logo, // Base64 data
    logoAssetName,
    triplyDBConfig
  );
}
```

**Similar to Organization logo upload** - reuse existing `uploadLogoAsset()` function

### Phase 4: Certification Registry (v2.1.0)

**Goal:** Public registry of certified vendor implementations

**Features:**

- Query TriplyDB for all `ronl:VendorService` with `ronl:certificationStatus "certified"`
- Display in table: Service Name, Vendor, Certification Date, Certifying Authority
- Filter by service type, vendor, competent authority
- Link to service detail page with full metadata

**SPARQL Query:**

```sparql
PREFIX ronl: <https://regels.overheid.nl/ontology#>
PREFIX dct: <http://purl.org/dc/terms/>

SELECT ?service ?serviceName ?vendor ?certDate ?certOrg
WHERE {
  ?vendorService a ronl:VendorService ;
    ronl:basedOn/cprmv:implements ?service ;
    ronl:implementedBy ?vendor ;
    ronl:certificationStatus "certified"^^xsd:string ;
    ronl:certifiedAt ?certDate ;
    ronl:certifiedBy ?certOrg .

  ?service dct:title ?serviceName .
}
ORDER BY DESC(?certDate)
```

### Phase 5: Vendor-Specific Validation (v2.2.0)

**Goal:** Validate vendor implementation against reference DMN

**Features:**

- Compare vendor service endpoint responses with reference DMN
- Test identical inputs → verify identical outputs
- Report conformance score (e.g., 127/127 test cases passed)
- Store validation results in certification metadata

**Implementation:**

```javascript
async function validateVendorConformance(vendorUrl, referenceDmnUrl, testCases) {
  const results = await Promise.all(
    testCases.map(async (testCase) => {
      const vendorResponse = await fetch(vendorUrl, {
        method: 'POST',
        body: JSON.stringify(testCase.input),
      });

      const referenceResponse = await fetch(referenceDmnUrl, {
        method: 'POST',
        body: JSON.stringify(testCase.input),
      });

      return {
        input: testCase.input,
        vendorOutput: await vendorResponse.json(),
        referenceOutput: await referenceResponse.json(),
        match: deepEqual(vendorOutput, referenceOutput),
      };
    })
  );

  return {
    totalTests: testCases.length,
    passed: results.filter((r) => r.match).length,
    failed: results.filter((r) => !r.match).length,
    details: results,
  };
}
```

---

## Technical Specifications

### Dependencies

| Package      | Version | Purpose      |
| ------------ | ------- | ------------ |
| React        | 18.3.1  | UI framework |
| Tailwind CSS | 3.x     | Styling      |
| Lucide React | 0.263.1 | Icons        |

**No additional dependencies required** for vendor functionality

### Browser Compatibility

| Feature                     | Chrome | Firefox | Safari | Edge |
| --------------------------- | ------ | ------- | ------ | ---- |
| URL validation (type="url") | ✅     | ✅      | ✅     | ✅   |
| File upload (logo)          | ✅     | ✅      | ✅     | ✅   |
| SPARQL fetch                | ✅     | ✅      | ✅     | ✅   |
| Modal dialog                | ✅     | ✅      | ✅     | ✅   |

### Performance

**Vendor Dropdown Load:**

- SPARQL query: ~300ms
- Parsing 17 concepts: <10ms
- Total: ~310ms

**TTL Generation:**

- Vendor section: <5ms
- Full TTL with vendor: ~50-100ms (depends on DMN size)

**File Size:**

- Without vendor logo: ~10KB
- With logo (base64): ~188KB
- With logo (asset path): ~10KB ✅

---

## Glossary

| Term                       | Definition                                                               |
| -------------------------- | ------------------------------------------------------------------------ |
| **CPSV-AP**                | Core Public Service Vocabulary - Application Profile (EU standard)       |
| **CPRMV**                  | Core Public Rule Management Vocabulary (Dutch extension)                 |
| **DMN**                    | Decision Model and Notation (OMG standard)                               |
| **RONL**                   | Regels Open Nederland (Dutch government initiative)                      |
| **Vendor Service**         | Commercial implementation of a government decision model                 |
| **Conformance Assessment** | Process of certifying a vendor implementation matches the reference      |
| **Method Concept**         | RONL taxonomy term identifying a rule management method/platform         |
| **Asset Path**             | Relative file path for resources (e.g., `./assets/logo.png`)             |
| **Base64**                 | Binary-to-text encoding for embedding images in data                     |
| **Blank Node**             | Anonymous RDF resource without a URI (e.g., `[ a schema:Organization ]`) |

---

## Change Log

### v1.9.0 (February 15, 2026)

- ✅ Initial vendor tab implementation
- ✅ Blueriq service metadata form
- ✅ Multi-vendor dropdown from TriplyDB
- ✅ URL validation with real-time feedback
- ✅ Logo upload and asset path generation
- ✅ TTL generation for ronl:VendorService
- ✅ Certification workflow modal
- ✅ Integration with validateForm()

### v1.9.1 (Planned)

- 🔄 Import support for vendor metadata
- 🔄 Round-trip testing (export → import → export)

### v2.0.0 (Planned)

- 🔄 TriplyDB publish integration with logo upload
- 🔄 Additional vendor support (Oracle, IBM ODM)

---

## References

**Documentation:**

- [CPSV-AP 3.2.0 Specification](https://joinup.ec.europa.eu/collection/semic-support-centre/solution/core-public-service-vocabulary-application-profile)
- [CPRMV Vocabulary](https://cprmv.open-regels.nl/0.3.0/)
- [RONL Initiative](https://regels.overheid.nl)
- [Schema.org Vocabulary](https://schema.org)

**Related Tabs:**

- Organization Tab - Provides certifying authority URI
- Service Tab - Service identifier for vendor URI construction
- DMN Tab - Reference decision model for ronl:basedOn link

**Code Files:**

- `src/components/tabs/VendorTab.jsx`
- `src/utils/ttlGenerator.js` (generateVendorServiceSection)
- `src/utils/validators.js` (validateVendorService)
- `src/utils/ronlHelper.js` (fetchAllRonlConcepts)

---

**Document Version:** 1.0  
**Last Updated:** February 15, 2026  
**Maintainer:** Steven Gort  
**License:** Open Source (RONL Initiative)
