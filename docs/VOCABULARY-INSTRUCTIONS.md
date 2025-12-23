# Vocabulary Configuration Guide

## Overview

The `vocabularies.config.js` file is the central configuration system for managing RDF vocabularies and namespaces in the TTL Editor. It allows the parser to recognize and handle multiple vocabulary prefixes without code changes.

**Key Benefits:**

- ✅ Add new vocabularies by editing configuration only
- ✅ No code changes needed to support new prefixes
- ✅ Centralized namespace management
- ✅ Property aliasing for vocabulary variations
- ✅ Easy maintenance and updates

---

## File Structure

```javascript
export const VOCABULARY_CONFIG = {
  version: '1.0.0',
  lastUpdated: '2025-10-27',

  namespaces: {
    /* URI to prefix mappings */
  },
  entityTypes: {
    /* RDF type definitions */
  },
  propertyAliases: {
    /* Property normalization */
  },
};
```

### 1. Namespaces

Maps namespace URIs to their accepted prefixes

### 2. Entity Types

Defines which RDF types map to editor sections

### 3. Property Aliases

Normalizes different property names to a canonical form

---

## Section 1: Namespaces

### Purpose

Maps namespace URIs to their accepted prefix variations.

### Structure

```javascript
namespaces: {
  'http://example.org/ontology#': ['prefix1', 'prefix2'],
  // URI → array of accepted prefixes
}
```

### Current Configuration

```javascript
namespaces: {
  'http://purl.org/vocab/cpsv#': ['cpsv'],
  'http://data.europa.eu/m8g/': ['cv', 'cpsv-ap'],
  'http://www.w3.org/ns/org#': ['org'],
  'http://xmlns.com/foaf/0.1/': ['foaf'],
  'http://data.europa.eu/eli/ontology#': ['eli'],
  'https://regels.overheid.nl/termen/': ['ronl'],
  'https://cprmv.open-regels.nl/0.3.0/': ['cprmv'],
  'http://purl.org/dc/terms/': ['dct'],
  'http://www.w3.org/ns/dcat#': ['dcat'],
  'http://www.w3.org/2004/02/skos/core#': ['skos'],
  'http://www.w3.org/2001/XMLSchema#': ['xsd'],
  'http://schema.org/': ['schema']
}
```

### How to Add a New Namespace

**Example:** Adding W3C PROV namespace

```javascript
namespaces: {
  // ... existing namespaces ...
  'http://www.w3.org/ns/prov#': ['prov'],
}
```

**TTL Files Can Now Use:**

```turtle
@prefix prov: <http://www.w3.org/ns/prov#> .

<https://example.nl/service/1> a cpsv:PublicService ;
    prov:wasGeneratedBy <https://example.nl/activity/123> .
```

---

## Section 2: Entity Types

### Purpose

Defines which RDF types are recognized and mapped to editor sections.

### Structure

```javascript
entityTypes: {
  editorSection: {
    acceptedTypes: ['prefix:Type1', 'prefix:Type2'],
    canonicalType: 'prefix:Type1'
  }
}
```

### Available Editor Sections

- `service` - Service tab
- `organization` - Organization tab
- `legalResource` - Legal tab
- `temporalRule` - Rules tab
- `parameter` - Parameters tab

### Current Configuration

```javascript
entityTypes: {
  service: {
    acceptedTypes: [
      'cpsv:PublicService',
      'cpsv-ap:PublicService'
    ],
    canonicalType: 'cpsv:PublicService'
  },
  organization: {
    acceptedTypes: [
      'org:Organization',
      'foaf:Organization'
    ],
    canonicalType: 'org:Organization'
  },
  legalResource: {
    acceptedTypes: [
      'eli:LegalResource'
    ],
    canonicalType: 'eli:LegalResource'
  },
  temporalRule: {
    acceptedTypes: [
      'ronl:TemporalRule'
    ],
    canonicalType: 'ronl:TemporalRule'
  },
  parameter: {
    acceptedTypes: [
      'skos:Concept',
      'ronl:ParameterWaarde'
    ],
    canonicalType: 'skos:Concept'
  }
}
```

### How to Add a New Entity Type

**Example 1:** Adding support for `dcmi:Service`

```javascript
service: {
  acceptedTypes: [
    'cpsv:PublicService',
    'cpsv-ap:PublicService',
    'dcmi:Service'  // ← Add this
  ],
  canonicalType: 'cpsv:PublicService'
}
```

**TTL Files Can Now Use:**

```turtle
<https://example.nl/service/1> a dcmi:Service ;
    dct:title "Example Service"@nl .
```

**Result:** Parser recognizes `dcmi:Service` as a service entity

---

**Example 2:** Adding support for custom parameter type

```javascript
parameter: {
  acceptedTypes: [
    'skos:Concept',
    'ronl:ParameterWaarde',
    'custom:Parameter'  // ← Add this
  ],
  canonicalType: 'skos:Concept'
}
```

**TTL Files Can Now Use:**

```turtle
<https://example.nl/param/1> a custom:Parameter ;
    skos:notation "MAX_INCOME" ;
    schema:value "1500.00"^^xsd:decimal .
```

**Result:** Parser recognizes `custom:Parameter` as a parameter entity

---

## Section 3: Property Aliases

### Purpose

Maps different property names to a canonical form, allowing the parser to treat them equivalently.

### Structure

```javascript
propertyAliases: {
  'alternative:property': 'canonical:property',
  // Alternative → Canonical mapping
}
```

### Current Configuration

```javascript
propertyAliases: {
  // Organization properties
  'foaf:name': 'skos:prefLabel',
  'org:name': 'skos:prefLabel',

  // Service properties - CPSV-AP to CV mapping
  'cpsv-ap:hasCompetentAuthority': 'cv:hasCompetentAuthority',
  'cpsv-ap:thematicArea': 'cv:thematicArea',
  'cpsv-ap:sector': 'cv:sector',
  'cpsv-ap:hasChannel': 'cv:hasChannel',
  'cpsv-ap:hasContactPoint': 'cv:hasContactPoint',
  'cpsv-ap:hasCost': 'cv:hasCost',
  'cpsv-ap:hasOutput': 'cv:hasOutput',
  'cpsv-ap:hasLegalResource': 'cv:hasLegalResource',

  // Temporal rule properties - CPRMV to RONL mapping
  'cprmv:validFrom': 'ronl:validFrom',
  'cprmv:validUntil': 'ronl:validUntil',
  'cprmv:confidence': 'ronl:confidenceLevel',
  'cprmv:confidenceLevel': 'ronl:confidenceLevel',
  'cprmv:extends': 'ronl:extends'
}
```

### How Property Aliasing Works

**Concept:** Different vocabularies may use different property names for the same concept. Aliasing normalizes them.

**Example:** Organization names can be expressed as:

- `foaf:name`
- `org:name`
- `skos:prefLabel`

**Configuration:**

```javascript
propertyAliases: {
  'foaf:name': 'skos:prefLabel',
  'org:name': 'skos:prefLabel',
}
```

**Result:** All three are treated as `skos:prefLabel` internally

**TTL Input (any of these work):**

```turtle
# Option 1
<https://example.nl/org/1> a org:Organization ;
    foaf:name "Gemeente Utrecht"@nl .

# Option 2
<https://example.nl/org/1> a org:Organization ;
    org:name "Gemeente Utrecht"@nl .

# Option 3
<https://example.nl/org/1> a org:Organization ;
    skos:prefLabel "Gemeente Utrecht"@nl .
```

**Parser Result:** All stored as `organization.name = "Gemeente Utrecht"`

### How to Add Property Aliases

**Example 1:** Adding support for `rdfs:label` as organization name

```javascript
propertyAliases: {
  // Organization properties
  'foaf:name': 'skos:prefLabel',
  'org:name': 'skos:prefLabel',
  'rdfs:label': 'skos:prefLabel',  // ← Add this
}
```

**Now Accepts:**

```turtle
<https://example.nl/org/1> a org:Organization ;
    rdfs:label "Gemeente Utrecht"@nl .
```

---

**Example 2:** Adding custom validity properties

```javascript
propertyAliases: {
  // ... existing aliases ...

  // Custom validity properties
  'custom:startDate': 'ronl:validFrom',
  'custom:endDate': 'ronl:validUntil',
}
```

**Now Accepts:**

```turtle
<https://example.nl/rule/1> a ronl:TemporalRule ;
    custom:startDate "2024-01-01"^^xsd:date ;
    custom:endDate "2024-12-31"^^xsd:date .
```

**Result:** Normalized to `ronl:validFrom` and `ronl:validUntil`

---

## Common Use Cases

### Use Case 1: Supporting European DCAT-AP Vocabulary

**Requirement:** Support DCAT-AP service descriptions

**Step 1:** Add namespace

```javascript
namespaces: {
  // ... existing ...
  'http://www.w3.org/ns/dcat#': ['dcat'],
}
```

**Step 2:** Add entity type (if needed)

```javascript
service: {
  acceptedTypes: [
    'cpsv:PublicService',
    'cpsv-ap:PublicService',
    'dcat:DataService'  // ← Add support
  ],
  canonicalType: 'cpsv:PublicService'
}
```

**Step 3:** Add property aliases (if needed)

```javascript
propertyAliases: {
  // ... existing ...
  'dcat:keyword': 'dcat:keyword',  // Use as-is
  'dcat:theme': 'cv:thematicArea',  // Map to existing
}
```

**Result:** Can now import DCAT-AP service descriptions

---

### Use Case 2: Supporting Dutch Government Vocabularies

**Requirement:** Support specific Dutch government ontologies

**Step 1:** Add namespace

```javascript
namespaces: {
  // ... existing ...
  'https://data.overheid.nl/vocabularies/basis#': ['basis'],
}
```

**Step 2:** Add entity types

```javascript
organization: {
  acceptedTypes: [
    'org:Organization',
    'foaf:Organization',
    'basis:Overheidsorganisatie'  // ← Dutch gov org
  ],
  canonicalType: 'org:Organization'
}
```

**Step 3:** Add property aliases

```javascript
propertyAliases: {
  // ... existing ...
  'basis:organisatieNaam': 'skos:prefLabel',
}
```

**Result:** Can import Dutch government organization data

---

### Use Case 3: Supporting International Standards

**Requirement:** Support schema.org and Dublin Core variations

**Already Supported (no changes needed):**

```javascript
namespaces: {
  'http://schema.org/': ['schema'],
  'http://purl.org/dc/terms/': ['dct'],
}
```

**If you need aliases:**

```javascript
propertyAliases: {
  // ... existing ...
  'schema:name': 'dct:title',      // Schema.org → Dublin Core
  'schema:description': 'dct:description',
}
```

---

## Helper Functions

The configuration exports several helper functions for use in the parser.

### 1. detectEntityType(line)

**Purpose:** Detects which entity type a TTL line represents

**Usage:**

```javascript
import { detectEntityType } from './config/vocabularies.config.js';

const line = '<https://example.nl/service/1> a cpsv:PublicService ;';
const type = detectEntityType(line);
// Returns: 'service'
```

**How it works:**

1. Checks line for `a TYPE` pattern
2. Compares TYPE against all `acceptedTypes`
3. Returns the matching entity section name

---

### 2. normalizeProperty(property)

**Purpose:** Converts property to its canonical form

**Usage:**

```javascript
import { normalizeProperty } from './config/vocabularies.config.js';

const normalized = normalizeProperty('foaf:name');
// Returns: 'skos:prefLabel'

const unchanged = normalizeProperty('dct:title');
// Returns: 'dct:title' (no alias defined)
```

**How it works:**

1. Looks up property in `propertyAliases`
2. Returns canonical form if alias exists
3. Returns original property if no alias

---

### 3. getCanonicalType(entityName)

**Purpose:** Gets the canonical RDF type for an entity section

**Usage:**

```javascript
import { getCanonicalType } from './config/vocabularies.config.js';

const canonical = getCanonicalType('service');
// Returns: 'cpsv:PublicService'

const paramType = getCanonicalType('parameter');
// Returns: 'skos:Concept'
```

---

### 4. extractPrefixMap(ttlContent)

**Purpose:** Extracts all `@prefix` declarations from TTL content

**Usage:**

```javascript
import { extractPrefixMap } from './config/vocabularies.config.js';

const ttl = `
@prefix cpsv: <http://purl.org/vocab/cpsv#> .
@prefix dct: <http://purl.org/dc/terms/> .
`;

const prefixes = extractPrefixMap(ttl);
// Returns: {
//   'cpsv': 'http://purl.org/vocab/cpsv#',
//   'dct': 'http://purl.org/dc/terms/'
// }
```

---

### 5. validatePrefixes(ttlContent, options)

**Purpose:** Validates that essential prefixes are present

**Usage:**

```javascript
import { validatePrefixes } from './config/vocabularies.config.js';

const ttl = `@prefix cpsv: <http://purl.org/vocab/cpsv#> .`;
const validation = validatePrefixes(ttl, { silent: true });

// Returns: {
//   valid: false,
//   warnings: [
//     'Missing recommended prefix: @prefix cv: <http://data.europa.eu/m8g/>',
//     'Missing recommended prefix: @prefix dct: <http://purl.org/dc/terms/>'
//   ]
// }
```

**Options:**

- `silent: true` - Don't log warnings to console

---

## Best Practices

### 1. Maintain Backward Compatibility

✅ **Good:** Add new types alongside existing ones

```javascript
parameter: {
  acceptedTypes: [
    'skos:Concept',           // Keep existing
    'ronl:ParameterWaarde',   // Keep existing
    'custom:Parameter'        // Add new
  ],
  canonicalType: 'skos:Concept'
}
```

❌ **Bad:** Remove existing types

```javascript
parameter: {
  acceptedTypes: [
    'custom:Parameter'  // Don't remove old types!
  ],
  canonicalType: 'custom:Parameter'
}
```

---

### 2. Use Canonical Types Consistently

✅ **Good:** Set canonical to most common/standard type

```javascript
service: {
  acceptedTypes: [
    'cpsv:PublicService',      // Standard EU type
    'cpsv-ap:PublicService',
    'custom:Service'
  ],
  canonicalType: 'cpsv:PublicService'  // Use EU standard
}
```

❌ **Bad:** Use custom type as canonical

```javascript
service: {
  acceptedTypes: [
    'cpsv:PublicService',
    'cpsv-ap:PublicService',
    'custom:Service'
  ],
  canonicalType: 'custom:Service'  // Non-standard
}
```

---

### 3. Document Your Changes

✅ **Good:** Add comments explaining custom vocabularies

```javascript
entityTypes: {
  parameter: {
    acceptedTypes: [
      'skos:Concept',              // Standard SKOS concept
      'ronl:ParameterWaarde',      // Dutch gov parameter
      'myorg:CustomParameter'      // Our organization's custom type
    ],
    canonicalType: 'skos:Concept'
  }
}
```

---

### 4. Group Related Aliases

✅ **Good:** Organize aliases by category

```javascript
propertyAliases: {
  // Organization names
  'foaf:name': 'skos:prefLabel',
  'org:name': 'skos:prefLabel',
  'rdfs:label': 'skos:prefLabel',

  // Temporal properties
  'cprmv:validFrom': 'ronl:validFrom',
  'cprmv:validUntil': 'ronl:validUntil',
  'custom:startDate': 'ronl:validFrom',
  'custom:endDate': 'ronl:validUntil',
}
```

---

### 5. Update Version Information

✅ **Good:** Update metadata when making changes

```javascript
export const VOCABULARY_CONFIG = {
  version: '1.1.0', // Increment version
  lastUpdated: '2025-11-14', // Update date

  // ... configuration ...
};
```

---

## Testing Your Changes

### Step 1: Create Test TTL File

Create a TTL file using your new vocabulary:

```turtle
@prefix custom: <https://example.org/vocab#> .
@prefix dct: <http://purl.org/dc/terms/> .

<https://example.nl/test/1> a custom:NewType ;
    dct:title "Test Service"@nl ;
    custom:customProperty "Test Value" .
```

### Step 2: Import in Editor

1. Start the editor: `npm start`
2. Click "Import TTL File"
3. Select your test file
4. Check if data appears in correct tab

### Step 3: Verify Parsing

Check browser console for any parsing errors:

- ✅ No errors = Success
- ❌ Errors = Check your configuration

### Step 4: Test Export

1. After importing, click "Download TTL"
2. Verify the exported TTL is valid
3. Try importing the exported file again (round-trip test)

---

## Troubleshooting

### Problem: Entity Not Recognized

**Symptom:** TTL imports but entity doesn't appear in any tab

**Solution:**

1. Check if RDF type is in `acceptedTypes`
2. Verify namespace prefix matches TTL file
3. Check console for parsing errors

**Example Fix:**

```javascript
// Add missing type
parameter: {
  acceptedTypes: [
    'skos:Concept',
    'ronl:ParameterWaarde',
    'your:MissingType'  // ← Add this
  ],
  canonicalType: 'skos:Concept'
}
```

---

### Problem: Property Not Imported

**Symptom:** Entity recognized but some properties are empty

**Solution:**

1. Check if property needs an alias
2. Verify parser handles the property (check `parseTTL.enhanced.js`)
3. Add alias if needed

**Example Fix:**

```javascript
propertyAliases: {
  // ... existing ...
  'your:customName': 'skos:prefLabel',  // ← Map to known property
}
```

---

### Problem: Namespace Not Found

**Symptom:** Console warnings about missing prefixes

**Solution:**

1. Add namespace to `namespaces` object
2. Ensure TTL file has matching `@prefix` declaration

**Example Fix:**

```javascript
namespaces: {
  // ... existing ...
  'https://your-domain.org/vocab#': ['yourvocab'],  // ← Add namespace
}
```

---

## Migration Guide

### From Hardcoded to Configuration-Based

**Old Approach** (hardcoded in parser):

```javascript
// In parseTTL.js
if (line.includes('a cpsv:PublicService')) {
  currentSection = 'service';
}
```

**New Approach** (configuration-based):

```javascript
// In vocabularies.config.js
entityTypes: {
  service: {
    acceptedTypes: ['cpsv:PublicService'],
    canonicalType: 'cpsv:PublicService'
  }
}

// In parser
const type = detectEntityType(line);  // Uses config
```

**Benefits:**

- ✅ No parser code changes needed
- ✅ Easy to add new types
- ✅ Centralized management

---

## Version History

### Version 1.0.0 (October 2025)

- Initial configuration system
- Support for CPSV-AP, CPRMV, RONL vocabularies
- Basic property aliasing

### Version 1.1.0 (November 2025)

- Added `ronl:ParameterWaarde` support
- Enhanced parameter type recognition
- Bug fixes for organization name parsing

---

## Related Documentation

- **NAMESPACE-PROPERTIES.md** - Complete property reference
- **parseTTL.enhanced.js** - Parser implementation
- **App.js** - Editor implementation

---

## Quick Reference

### Adding Support for New Vocabulary

```javascript
// 1. Add namespace
namespaces: {
  'https://your-vocab.org/': ['vocab']
}

// 2. Add entity type (if needed)
yourSection: {
  acceptedTypes: ['vocab:YourType'],
  canonicalType: 'vocab:YourType'
}

// 3. Add property aliases (if needed)
propertyAliases: {
  'vocab:yourProperty': 'canonical:property'
}
```

### Testing Checklist

- [ ] Added namespace to `namespaces`
- [ ] Added type to `entityTypes` (if new entity)
- [ ] Added aliases to `propertyAliases` (if needed)
- [ ] Created test TTL file
- [ ] Imported successfully in editor
- [ ] Data appears in correct tab
- [ ] Export works correctly
- [ ] Round-trip test passes
- [ ] No console errors
- [ ] Updated version number
- [ ] Documented changes

---

## Support

For questions or issues:

- Check existing TTL files for examples
- Review parser logs in browser console
- Consult NAMESPACE-PROPERTIES.md for property details
- Test with minimal TTL files first

---

_Vocabulary Configuration Guide Version 1.0_  
_Last Updated: November 14, 2025_  
_For TTL Editor Version 1.2.2+_
