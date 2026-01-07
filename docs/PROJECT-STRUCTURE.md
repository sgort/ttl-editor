# Public Service TTL Editor - Project Structure

**Version:** 1.5.1 (Fully Modularized)  
**Date:** January 2026  
**Framework:** React 18.3.1  
**Purpose:** Generate CPSV-AP 3.2.0 compliant RDF/Turtle files for Dutch government services

---

## Project Overview

The TTL Editor has evolved from a monolithic 1,800+ line application to a fully modularized, maintainable codebase with clear separation of concerns across Components, Hooks, Utils, and Data layers.

**Architecture:** Component-based with custom hooks for state management, utilities for business logic, and modular TTL generation.

**Modularization Journey:**

- **v1.0:** Monolithic App.js
- **v1.3:** Component extraction
- **v1.5.0:** State + TTL extraction
- **v1.5.1:** Full modularization

**Key Architectural Patterns:**

- **Custom Hooks:** State management, array operations
- **Utility Classes:** TTL generation, import handling
- **DRY Principles:** Reusable handlers for common operations
- **RPP Separation:** Visual alignment with Rules--Policy--Parameters pattern

---

## Directory Structure

```
ttl-editor/
├── public/                          # Static assets
│   ├── index.html                   # HTML template
│   ├── favicon.svg                  # Application icon
│   ├── manifest.json                # PWA manifest
│   └── examples/                    # Example files
│       └── organizations/
│           └── svb/                 # SVB organization examples
│               └── *.dmn            # DMN example files
│
├── src/
│   ├── App.js                       # Main application orchestrator
│   ├── App.css                      # Application-level styles
│   ├── index.js                     # React entry point
│   ├── index.css                    # Global styles, Tailwind imports
│   │
│   ├── components/
│   │   ├── PreviewPanel.jsx         # Live TTL preview side panel
│   │   └── tabs/
│   │       ├── index.js             # Barrel export for all tabs
│   │       ├── ServiceTab.jsx       # Public service metadata form
│   │       ├── OrganizationTab.jsx  # Organization/authority form
│   │       ├── LegalTab.jsx         # Legal resource form
│   │       ├── RulesTab.jsx         # Temporal rules form (RPP: Rules)
│   │       ├── ParametersTab.jsx    # Parameters form (RPP: Parameters)
│   │       ├── CPRMVTab.jsx         # CPRMV rules form (RPP: Policy)
│   │       ├── DMNTab.jsx           # DMN decision model form
│   │       ├── IKnowMappingTab.jsx  # iKnow integration tab
│   │       └── ChangelogTab.jsx     # Version history display
│   │
│   ├── hooks/
│   │   ├── useEditorState.js        # State management hook
│   │   └── useArrayHandlers.js      # DRY array operations hook
│   │
│   ├── utils/
│   │   ├── index.js                 # Barrel export for all utils
│   │   ├── constants.js             # Shared constants, options
│   │   ├── ttlGenerator.js          # TTL generation class (NEW v1.5.0)
│   │   ├── importHandler.js         # Import logic module (NEW v1.5.1)
│   │   ├── dmnHelpers.js            # DMN-specific utilities
│   │   ├── validators.js            # Validation logic
│   │   └── parseTTL.enhanced.js     # TTL parser (enhanced)
│   │
│   ├── data/
│   │   ├── changelog.json           # Version history data
│   │   ├── roadmap.json             # Future features roadmap
│   │   └── cprmv-example.json       # Example CPRMV data
│   │
│   └── config/
│       ├── vocabularies_config.js   # RDF vocabulary mappings
│       └── iknow-mappings.js        # iKnow field mapping configurations
│
├── docs/
│   ├── FIELD-MAPPING-CPSV-AP-3_2_0.md      # CPSV-AP compliance mapping
│   ├── NAMESPACE-PROPERTIES.md             # RDF property reference
│   ├── VOCABULARY-INSTRUCTIONS.md          # Vocabulary usage guide
│   ├── RULES-POLICY-PARAMETERS-SEPARATION.md  # RPP architecture pattern
│   ├── REFERENCE-ARCHITECTURE-SEMANTIC-MEDIATION.md  # Semantic mediation
│   ├── ARCHITECTURE-VISUAL.md              # Visual architecture diagrams
│   ├── PROJECT-STRUCTURE.md                # This file - detailed structure
│   └── PROJECT-STRUCTURE-QUICK.md          # Quick reference guide
│
├── .github/
│   └── workflows/
│       └── azure-static-web-apps.yml  # CI/CD configuration
│
├── package.json                      # Dependencies and scripts
├── tailwind.config.js                # Tailwind CSS configuration
├── README.md                         # Project overview
└── LICENSE                           # MIT License

```

---

## Core Application

### `src/App.js`

**Function:** Main application orchestrator and UI container

**Responsibilities:**

- Tab navigation and routing
- Import/Export TTL workflow
- Validation coordination
- Preview panel toggle
- Clear All functionality with confirmation dialog
- File upload handling
- Status message display

**State Management:**

- Uses `useEditorState` hook for all editor state
- Uses `useArrayHandlers` hooks for Rules, Parameters, CPRMV
- Local UI state (activeTab, showPreviewPanel, importStatus, showClearDialog)

**Key Features:**

- Modular tab rendering
- Real-time TTL generation for preview
- Import status notifications with auto-hide
- Confirmation dialog for destructive actions
- Responsive layout with optional preview panel

**Props Passed to Tabs:**

- Service, Organization, Legal: state + setter functions
- Rules, Parameters, CPRMV: arrays + handler functions (add/remove/update)
- DMN: dmnData + setDmnData
- iKnow: mappingConfig + callbacks

---

## Custom Hooks (NEW v1.5.0+)

### `src/hooks/useEditorState.js`

**Function:** Centralized state management for editor data

**Responsibilities:**

- Initialize all editor state (service, organization, legal, rules, parameters, CPRMV, cost, output, DMN, iKnow)
- Provide state setters
- Implement `clearAllData()` function
- Load default iKnow mappings on mount

**Returns:**

```javascript
{
  // State
  (service,
    organization,
    legalResource,
    temporalRules,
    parameters,
    cprmvRules,
    cost,
    output,
    dmnData,
    iknowMappingConfig,
    availableIKnowMappings,
    // Setters
    setService,
    setOrganization,
    setLegalResource,
    setTemporalRules,
    setParameters,
    setCprmvRules,
    setCost,
    setOutput,
    setDmnData,
    setIknowMappingConfig,
    // Actions
    clearAllData);
}
```

**Benefits:**

- Single source of truth for state
- Encapsulated clear logic
- Easier to test
- Reduces App.js complexity

---

### `src/hooks/useArrayHandlers.js`

**Function:** DRY handlers for array CRUD operations

**Exports:**

- `useArrayHandlers(items, setItems, createDefaultItem)` - Core hook
- `useTemporalRulesHandlers()` - Pre-configured for rules
- `useParametersHandlers()` - Pre-configured for parameters
- `useCprmvRulesHandlers()` - Pre-configured for CPRMV

**Provided Handlers:**

```javascript
{
  (handleAdd, // Add new item with unique ID
    handleUpdate, // Update item by ID with partial updates
    handleRemove, // Remove item by ID
    handleUpdateField, // Update single field (convenience)
    handleClear, // Clear entire array
    handleReplace); // Replace entire array
}
```

**ID Generation:**

- Uses `Math.max(...ids) + 1` for new IDs
- Falls back to 1 for empty arrays
- Better than `Date.now()` for rapid additions

**Benefits:**

- Eliminates duplicate array logic across tabs
- Consistent behavior for all array operations
- Easier to maintain and test
- Saves ~20 lines per tab using arrays

---

## Components

### PreviewPanel

**File:** `src/components/PreviewPanel.jsx`

**Function:** Live TTL code preview with copy functionality

**Props:**

- `ttlContent`: String - Generated TTL content

**Features:**

- Syntax highlighting (numbered lines)
- Copy to clipboard button
- Fixed position side panel (500px width)
- Scrollable content area
- Real-time updates on state changes

---

### Tab Components

All tabs are in `src/components/tabs/` and exported via `index.js`.

#### `ServiceTab.jsx`

**Function:** Public service metadata form

**Props:**

- `service`: Object - Service state
- `setService`: Function - Update service
- `cost`: Object - Cost state
- `setCost`: Function - Update cost
- `output`: Object - Output state
- `setOutput`: Function - Update output

**Compliance:** CPSV-AP 3.2.0 cpsv:PublicService

**Sections:**

- Service Details (identifier, title, description)
- Classification (thematic area, sector, keywords, language)
- Cost Information (optional)
- Output Information (optional)

**Features:**

- URI sanitization (spaces → hyphens)
- Language selection (ISO 639-1)
- Sector selection (EU authority codes)
- Custom sector input option

---

#### `OrganizationTab.jsx`

**Function:** Organization/competent authority form

**Props:**

- `organization`: Object - Organization state
- `setOrganization`: Function - Update organization

**Compliance:** CPSV-AP 3.2.0 cv:PublicOrganisation

**Fields:**

- Organization identifier or URI
- Preferred name (mandatory)
- Homepage URL
- Geographic jurisdiction (mandatory, cv:spatial)

**Features:**

- Auto-detects full URIs vs short identifiers
- Visual indicator for URI detection
- Geographic jurisdiction selection

---

#### `LegalTab.jsx`

**Function:** Legal resource metadata form

**Props:**

- `legalResource`: Object - Legal resource state
- `setLegalResource`: Function - Update legal resource

**Compliance:** ELI eli:LegalResource

**Fields:**

- BWB ID or URI (mandatory)
- Version/consolidation date
- Document title
- Document description

**Features:**

- BWB ID validation (BWBR/BWBV format)
- Auto-detects full URIs
- Links to wetten.overheid.nl
- Date picker for versions

---

#### `RulesTab.jsx` (RPP: Rules Layer 🔵)

**Function:** Temporal rules management form

**Props:**

- `temporalRules`: Array - Rules array
- `addTemporalRule`: Function - Add handler
- `removeTemporalRule`: Function - Remove handler
- `updateTemporalRule`: Function - Update handler

**Compliance:** RONL ronl:TemporalRule + CPSV-AP cpsv:Rule

**Fields per Rule:**

- Rule URI (auto-generated from index)
- Rule identifier (dct:identifier)
- Rule title (dct:title)
- Extends (ronl:extends) - versioning chain
- Valid from/until dates (ronl:validFrom/validUntil)
- Confidence level (ronl:confidenceLevel: high/medium/low)
- Description (dct:description)

**RPP Features (v1.5.1):**

- Blue banner with "RPP Layer: Rules" badge
- Architecture explanation
- RPP pattern flow description

---

#### `ParametersTab.jsx` (RPP: Parameters Layer 🟢)

**Function:** Parameters management form

**Props:**

- `parameters`: Array - Parameters array
- `addParameter`: Function - Add handler
- `removeParameter`: Function - Remove handler
- `updateParameter`: Function - Update handler

**Compliance:** RONL ronl:ParameterWaarde + CPRMV

**Fields per Parameter:**

- Notation (skos:notation, mandatory, machine-readable)
- Label (skos:prefLabel, mandatory, human-readable)
- Value (schema:value, mandatory, decimal)
- Unit (schema:unitCode: EUR/PCT/NUM/DAYS/MONTHS/YEARS)
- Description (dct:description)
- Valid from/until dates (ronl:validFrom/validUntil)

**RPP Features (v1.5.1):**

- Green banner with "RPP Layer: Parameters" badge
- Architecture explanation
- RPP pattern flow description

**Features:**

- Uppercase notation convention
- Unit selection dropdown
- Decimal value input
- Temporal validity per parameter

---

#### `CPRMVTab.jsx` (RPP: Policy Layer 🟣)

**Function:** CPRMV normative rules management form

**Props:**

- `cprmvRules`: Array - CPRMV rules array
- `addCPRMVRule`: Function - Add handler
- `removeCPRMVRule`: Function - Remove handler
- `updateCPRMVRule`: Function - Update handler
- `handleImportJSON`: Function - Import JSON handler
- `setCprmvRules`: Function - Direct setter for bulk operations

**Compliance:** CPRMV vocabulary

**Fields per Rule:**

- Rule ID Path (cprmv:ruleIdPath, mandatory)
- Rule ID (cprmv:id, mandatory)
- Ruleset ID (cprmv:rulesetId, mandatory)
- Definition (cprmv:definition, mandatory)
- Situation (cprmv:situatie)
- Norm (cprmv:norm)

**RPP Features (v1.5.1):**

- Purple banner with "RPP Layer: Policy" badge
- Architecture explanation with CPRMV API link
- Example data button
- RPP pattern flow description

**Features:**

- JSON import from normenbrief format
- Load example data button
- CPRMV Rules API integration
- Card-based layout with validation hints

---

#### `DMNTab.jsx`

**Function:** DMN decision model management

**Props:**

- `dmnData`: Object - DMN state
- `setDmnData`: Function - Update DMN

**Features:**

- Upload DMN files
- Deploy to Operaton rule engine
- Test decision evaluations
- Automatic input variable extraction
- Rule extraction with CPRMV attributes
- Import preservation mode for imported TTL

**Imported DMN Mode:**

- Read-only display of imported DMN blocks
- "Imported" badge indicator
- Clear option to start fresh
- Prevents accidental modification

---

#### `IKnowMappingTab.jsx`

**Function:** iKnow legislative analysis integration

**Props:**

- `mappingConfig`: Object - Current mapping configuration
- `setMappingConfig`: Function - Update mapping
- `availableMappings`: Array - Available mapping templates
- `onImportComplete`: Function - Callback after import

**Features:**

- Parse iKnow XML exports (CognitatieAnnotation/Semantics)
- Configurable field mappings
- Import/Configure dual mode
- Preview mapped data
- Load example functionality

---

#### `ChangelogTab.jsx`

**Function:** Version history and roadmap display

**Props:** None (reads from data files)

**Features:**

- Version history from `changelog.json`
- Color-coded version statuses
- Icon-based categorization
- Documentation links
- Roadmap preview

---

## Utilities

### `src/utils/ttlGenerator.js` (NEW v1.5.0)

**Function:** TTL generation class

**Class:** `TTLGenerator`

**Constructor:**

```javascript
new TTLGenerator({
  service,
  organization,
  legalResource,
  temporalRules,
  parameters,
  cprmvRules,
  cost,
  output,
  dmnData,
});
```

**Methods:**

- `generate()` - Generate complete TTL document
- `generateNamespaces()` - RDF namespace prefixes
- `generateSectionHeader(title)` - Section comment headers
- `generateServiceSection()` - Service TTL block
- `generateOrganizationSection()` - Organization TTL block
- `generateLegalResourceSection()` - Legal resource TTL block
- `generateTemporalRulesSection()` - Rules TTL blocks
- `generateParametersSection()` - Parameters TTL blocks
- `generateCprmvRulesSection()` - CPRMV rules TTL blocks
- `generateCostSection()` - Cost TTL block
- `generateOutputSection()` - Output TTL block
- `generateDmnSection()` - DMN TTL blocks
- `hasDMN()` - Check if DMN data exists
- `hasTemporalRules()` - Check if rules exist
- `hasParameters()` - Check if parameters exist
- `hasCprmvRules()` - Check if CPRMV rules exist
- `stripDmnHeaders(dmnBlocks)` - Remove duplicate headers

**Helper Function:**

```javascript
generateTTL(state); // Convenience wrapper
```

**Benefits:**

- Encapsulated generation logic
- Easier to test and maintain
- Clear method responsibilities
- Modular section generation

---

### `src/utils/importHandler.js` (NEW v1.5.1)

**Function:** Centralized import logic for TTL files

**Functions:**

- `parseTTL(ttlContent)` - Parse and normalize TTL
- `validateTTLFile(file)` - File validation
- `readFileContent(file)` - Promise-based FileReader
- `processTTLImport(file)` - Complete import pipeline
- `applyImportedData(importedData, setters)` - Apply to state
- `handleTTLImport(event, setters, setImportStatus)` - React event handler

**Features:**

- Async/await pattern
- Comprehensive error handling
- Status message generation
- DMN preservation logic
- File reset for re-import
- Proper state setter orchestration

**Benefits:**

- Reusable import logic
- Better error handling
- Easier to test
- Reduced App.js complexity

---

### `src/utils/dmnHelpers.js`

**Function:** DMN-specific utilities

**Functions:**

- `generateCompleteDMNSection(dmnData, serviceUri)` - DMN TTL generation
- `extractInputsFromTestResult(dmnData)` - Extract input variables
- `extractRulesFromDMN(dmnContent)` - Parse DMN XML for rules
- `validateDMNData(dmnData)` - DMN validation
- `sanitizeServiceIdentifier(identifier)` - URI sanitization

**Features:**

- DMN XML parsing
- Rule extraction with CPRMV attributes
- Input variable documentation
- Service identifier sanitization (spaces → hyphens)

---

### `src/utils/constants.js`

**Function:** Shared constants and configuration

**Exports:**

- `NAMESPACES`: Object - RDF namespace URIs
- `TTL_NAMESPACES`: String - Formatted namespace prefixes for TTL
- `CONFIDENCE_LEVELS`: Array - Rule confidence options
- `UNIT_OPTIONS`: Array - Parameter unit types
- `LANGUAGE_OPTIONS`: Array - ISO 639-1 language codes
- `SECTOR_OPTIONS`: Array - EU sector classifications
- `DEFAULT_SERVICE`: Object - Default service state
- `DEFAULT_ORGANIZATION`: Object - Default organization state
- `DEFAULT_LEGAL_RESOURCE`: Object - Default legal resource state
- `DEFAULT_COST`: Object - Default cost state
- `DEFAULT_OUTPUT`: Object - Default output state

---

### `src/utils/validators.js`

**Function:** Validation logic

**Functions:**

- `validateForm(state)` - Complete form validation
- `validateService(service)` - Service validation
- `validateOrganization(organization)` - Organization validation
- `validateLegalResource(legalResource)` - Legal resource validation
- `sanitizeFilename(filename)` - Filename sanitization

**Returns:** `{valid: boolean, errors: string[]}`

---

### `src/utils/parseTTL.enhanced.js`

**Function:** Enhanced TTL parser

**Function:** `parseTTL(ttlContent)`

**Features:**

- Vocabulary detection (CPSV-AP, RONL, CPRMV, ELI)
- Multi-line value parsing
- Namespace resolution
- Date parsing
- Array value extraction (keywords)
- DMN block preservation
- Legal resource collision fix (v1.5.1)

**Returns:** Parsed data structure matching editor state

---

### `src/utils/index.js`

**Function:** Barrel export for all utilities

**Exports:**

- All from `constants.js`
- `generateTTL` from `ttlGenerator.js`
- `validateForm`, `sanitizeFilename` from `validators.js`
- `parseTTL` from `parseTTL.enhanced.js`

---

## Data Files

### `src/data/changelog.json`

**Function:** Version history data

**Structure:**

```json
{
  "versions": [
    {
      "version": "1.5.1",
      "status": "Enhancement",
      "statusColor": "purple",
      "borderColor": "purple",
      "date": "January 7, 2026",
      "sections": [
        {
          "title": "Section Title",
          "icon": "✨",
          "iconColor": "emerald",
          "items": ["Change 1", "Change 2"]
        }
      ]
    }
  ]
}
```

**Purpose:** Powers ChangelogTab display

---

### `src/data/roadmap.json`

**Function:** Future features roadmap

**Structure:**

```json
{
  "items": [
    {
      "icon": "🎯",
      "title": "Feature Title",
      "description": "Feature description"
    }
  ]
}
```

**Purpose:** Shows planned features in ChangelogTab

---

### `src/data/cprmv-example.json`

**Function:** Example CPRMV data

**Purpose:** Provides example data for "Load Example" button in CPRMV tab

---

## Configuration Files

### `src/config/vocabularies_config.js`

**Function:** RDF vocabulary mappings

**Exports:**

- `vocabularies`: Object - Vocabulary configurations for parser

**Vocabularies:**

- CPSV-AP, RONL, CPRMV, ELI, DCT, SKOS, SCHEMA, FOAF, ORG

---

### `src/config/iknow-mappings.js`

**Function:** iKnow field mapping configurations

**Exports:**

- `iknowMappings`: Array - Pre-configured mapping templates

**Purpose:** Provides default mappings for iKnow XML to CPSV-AP fields

---

## Documentation

All documentation is in `docs/` directory:

- **FIELD-MAPPING-CPSV-AP-3_2_0.md** - Complete UI field to RDF property mapping
- **NAMESPACE-PROPERTIES.md** - RDF namespace and property reference
- **VOCABULARY-INSTRUCTIONS.md** - Vocabulary usage guidelines
- **RULES-POLICY-PARAMETERS-SEPARATION.md** - RPP architecture pattern explanation
- **REFERENCE-ARCHITECTURE-SEMANTIC-MEDIATION.md** - Semantic mediation patterns
- **ARCHITECTURE-VISUAL.md** - Visual architecture diagrams
- **PROJECT-STRUCTURE.md** - This file, detailed structure

---

## Key Metrics (v1.5.1)

**Code Reduction:**

- Original App.js: 1,723 lines
- After Phase 1 (Components): 1,007 lines (-716, -42%)
- After Phase 2 (TTL Generator): 757 lines (-250, -25%)
- After Phase 3 (Import Handler): 650 lines (-107, -14%)
- After Phase 4 (Array Handlers): ~590 lines (-60, -9%)
- **Total Reduction: -1,133 lines (-66% from original)**

**New Modules Created:**

- `useEditorState.js` - 135 lines
- `ttlGenerator.js` - 443 lines
- `importHandler.js` - 250 lines
- `useArrayHandlers.js` - 150 lines

**Component Distribution:**

- Main App: ~590 lines
- Tab Components: 9 tabs × ~150-200 lines avg
- Hooks: 2 hooks × ~135-150 lines
- Utils: 6 files × ~100-450 lines
- Total Codebase: ~3,500 lines (well-organized)

**Maintainability:**

- ✅ Clear separation of concerns
- ✅ Reusable hooks and utilities
- ✅ DRY principles applied
- ✅ Easy to test individual modules
- ✅ Consistent patterns across codebase

---

## Data Flow

```
┌─────────────────┐
│  User Input     │
│  (Form Fields)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tab Component  │
│  (controlled)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  State Update   │
│  (via hooks)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    App.js       │
│  (orchestrator) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TTL Generator  │
│  (class-based)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PreviewPanel    │
│ (live display)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Download/Export │
│   (.ttl file)   │
└─────────────────┘
```

---

## Import/Export Flow

```
┌──────────────────┐
│  Import TTL File │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  importHandler   │
│  (parse TTL)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  parseTTL        │
│  (extract data)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Apply to State  │
│  (all setters)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Populate Tabs   │
│  (UI updates)    │
└──────────────────┘

Export Flow:
┌──────────────────┐
│   Current State  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  TTL Generator   │
│  (generate())    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Combine All     │
│  (sections)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Download .ttl   │
└──────────────────┘
```

---

## Standards Compliance

**CPSV-AP 3.2.0:** Core Public Service Vocabulary - Application Profile  
**RONL:** Regels Overheid Nederland (temporal rules, parameters)  
**CPRMV:** Core Public Rule Management Vocabulary (normative rules)  
**ELI:** European Legislation Identifier (legal resources)  
**Dublin Core:** Metadata terms (title, description, identifier)  
**SKOS:** Simple Knowledge Organization System (notation, prefLabel)  
**Schema.org:** Value and unit definitions (parameters)  
**FOAF:** Friend of a Friend (organization homepage)  
**ORG:** Organization ontology (organization structure)

---

## RPP Architecture Pattern (v1.5.1)

The editor implements visual separation for the **Rules--Policy--Parameters** pattern:

| Layer          | Tab        | Color     | Badge                   | Description                                  |
| -------------- | ---------- | --------- | ----------------------- | -------------------------------------------- |
| **Rules**      | Rules      | 🔵 Blue   | "RPP Layer: Rules"      | Decision logic that operationalizes policies |
| **Policy**     | CPRMV      | 🟣 Purple | "RPP Layer: Policy"     | Normative values from legislation            |
| **Parameters** | Parameters | 🟢 Green  | "RPP Layer: Parameters" | Configurable values for tuning               |

**Features:**

- Color-coded tab navigation
- Explanatory banners in each tab
- RPP pattern flow descriptions
- Architecture context for users

**Documentation:** See `docs/RULES-POLICY-PARAMETERS-SEPARATION.md`

---

## Future Enhancements

See `src/data/roadmap.json` for detailed roadmap:

- **Phase B:** RPP deep integration (cross-references, traceability)
- **Phase 2:** Extended CPSV-AP (channels, contact points, criteria)
- **Phase 3:** Advanced features (multi-language, collaboration, version control)

---

_Public Service CPSV Editor - Project Structure Documentation_  
_Version 1.5.1 - Fully Modularized Architecture with RPP Alignment_ ✅
