# Public Service TTL Editor - Project Structure

**Version:** 1.4.0 (Post-Modularization)  
**Date:** December 2025  
**Framework:** React 18.3.1  
**Purpose:** Generate CPSV-AP 3.2.0 compliant RDF/Turtle files for Dutch government services

---

## Project Overview

The TTL Editor has been modularized from a monolithic 1,723-line application into a well-structured, maintainable codebase with clear separation of concerns across Components, Utils, and Data layers.

**Architecture:** Component-based with Utils for business logic, organized in layers:

- **App Layer:** Main orchestration (App.js)
- **Components:** UI elements (tabs, preview panel)
- **Utils:** Business logic (TTL generation, validation, constants)
- **Data:** Externalized configuration (changelog, roadmap)

---

## Directory Structure

```
ttl-editor/
├── public/                          # Static assets (favicon, index.html)
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
│   │       ├── RulesTab.jsx         # Temporal rules form
│   │       ├── ParametersTab.jsx    # Parameters form
│   │       └── ChangelogTab.jsx     # Version history display
│   │
│   ├── utils/
│   │   ├── index.js                 # Barrel export for all utils
│   │   ├── constants.js             # Shared constants, options
│   │   ├── ttlHelpers.js            # TTL generation functions
│   │   ├── validators.js            # Validation logic
│   │   └── parseTTL_enhanced.js     # TTL import/parsing
│   │
│   ├── data/
│   │   ├── changelog.json           # Version history data
│   │   └── roadmap.json             # Future features roadmap
│   │
│   └── config/
│       └── vocabularies_config.js   # RDF vocabulary mappings
│
├── docs/
│   ├── README.md                            # Project documentation
│   ├── FIELD-MAPPING-CPSV-AP-3_2_0.md      # CPSV-AP compliance mapping
│   ├── VOCABULARY-INSTRUCTIONS.md           # Vocabulary usage guide
│   └── NAMESPACE-PROPERTIES.md              # RDF namespace reference
│
├── package.json                     # Dependencies, scripts
├── tailwind.config.js               # Tailwind CSS configuration
├── postcss.config.js                # PostCSS configuration
└── .eslintrc.json                   # ESLint configuration
```

---

## Core Files

### App Layer

#### `src/App.js` (~790 lines after modularization)

**Function:** Main application orchestrator  
**Responsibilities:**

- Application state management (service, organization, legal, rules, parameters)
- Tab navigation logic
- Import/export TTL functionality
- Validation coordination
- Layout structure (header, tabs, preview panel toggle)
- Clear dialog management
- Component composition

**Key Features:**

- Split-screen layout with toggle-able preview panel
- TTL import with vocabulary detection
- Export/download functionality
- Validation with feedback
- Responsive design

---

### Components

#### `src/components/PreviewPanel.jsx` (~65 lines)

**Function:** Live TTL preview side panel  
**Responsibilities:**

- Display TTL output in real-time
- Copy to clipboard functionality
- Line count display
- Dark theme with syntax highlighting

**Props:**

- `ttlContent`: String - Generated TTL to display

**Features:**

- Auto-updates as user edits
- Fixed position on right edge
- Scrollable content area
- Copy button with feedback

---

#### `src/components/tabs/ServiceTab.jsx` (~155 lines)

**Function:** Public service metadata form  
**Responsibilities:**

- Service identifier input (dct:identifier)
- Service name/title (dct:title)
- Service description (dct:description)
- Thematic area URI (cv:thematicArea)
- Economic sector (cv:sector)
- Keywords (dcat:keyword)
- Language selection (dct:language)

**Props:**

- `service`: Object - Service data
- `setService`: Function - Update service state

**Compliance:** Maps to cpsv:PublicService (CPSV-AP 3.2.0)

---

#### `src/components/tabs/OrganizationTab.jsx` (~120 lines)

**Function:** Organization/competent authority form  
**Responsibilities:**

- Organization identifier or URI (org:Organization)
- Organization preferred name (skos:prefLabel) \*required
- Homepage URL (foaf:homepage)
- URI detection and validation

**Props:**

- `organization`: Object - Organization data
- `setOrganization`: Function - Update organization state

**Compliance:** Maps to cv:PublicOrganisation (CPSV-AP 3.2.0)

**Features:**

- Auto-detects full URIs vs short identifiers
- Green hint for full URI detection
- Generates namespaced URIs for short identifiers

---

#### `src/components/tabs/LegalTab.jsx` (~145 lines)

**Function:** Legal resource metadata form  
**Responsibilities:**

- BWB ID or URI input (eli:LegalResource)
- Version/consolidation date (eli:realized_by)
- Document title (dct:title)
- Document description (dct:description)
- BWB ID validation

**Props:**

- `legalResource`: Object - Legal resource data
- `setLegalResource`: Function - Update legal state

**Compliance:** Maps to eli:LegalResource

**Features:**

- BWB ID pattern validation (BWBR/BWBV format)
- Auto-detects full URIs
- Links to wetten.overheid.nl
- Date picker for version dates

---

#### `src/components/tabs/RulesTab.jsx` (~170 lines)

**Function:** Temporal rules management form  
**Responsibilities:**

- Rule URI (rdf:about)
- Rule versioning chain (ronl:extends)
- Valid from/until dates (ronl:validFrom/validUntil)
- Confidence level (ronl:confidenceLevel)
- Rule description (dct:description)
- Add/remove multiple rules

**Props:**

- `temporalRules`: Array - List of temporal rules
- `addTemporalRule`: Function - Create new rule
- `removeTemporalRule`: Function - Delete rule
- `updateTemporalRule`: Function - Update rule field

**Compliance:** Maps to RONL vocabulary

**Features:**

- Multiple rules support
- Versioning chain via extends field
- Confidence levels (high/medium/low)
- Card-based layout

---

#### `src/components/tabs/ParametersTab.jsx` (~195 lines)

**Function:** Parameters management form  
**Responsibilities:**

- Parameter notation (skos:notation) \*required
- Parameter label (skos:prefLabel) \*required
- Parameter value (schema:value) \*required
- Unit selection (schema:unitCode)
- Description (dct:description)
- Valid from/until dates (ronl:validFrom/validUntil)
- Add/remove multiple parameters

**Props:**

- `parameters`: Array - List of parameters
- `addParameter`: Function - Create new parameter
- `removeParameter`: Function - Delete parameter
- `updateParameter`: Function - Update parameter field

**Compliance:** Maps to CPRMV vocabulary

**Features:**

- Multiple parameters support
- Unit options (EUR, PCT, NUM, MONTHS, YEARS, DAYS)
- Decimal value input
- Uppercase notation convention

---

#### `src/components/tabs/ChangelogTab.jsx` (~120 lines)

**Function:** Version history and roadmap display  
**Responsibilities:**

- Display changelog from JSON data
- Show version numbers, dates, status
- Categorize changes (Added, Changed, Fixed, Security)
- Display roadmap items

**Props:** None (reads from data files)

**Features:**

- Color-coded version statuses
- Expandable sections
- Icon-based categorization
- Roadmap preview

---

#### `src/components/tabs/index.js` (~15 lines)

**Function:** Barrel export for tab components  
**Responsibilities:**

- Centralized export point for all tab components
- Simplifies imports in App.js

**Exports:**

- ChangelogTab
- LegalTab
- OrganizationTab
- ParametersTab
- RulesTab
- ServiceTab

---

### Utils

#### `src/utils/constants.js` (~85 lines)

**Function:** Shared constants and configuration  
**Responsibilities:**

- RDF namespace definitions
- Confidence level options
- Unit type options
- Language options
- Sector options
- URI prefix definitions

**Exports:**

- `NAMESPACES`: Object - RDF namespace URIs
- `CONFIDENCE_LEVELS`: Array - Rule confidence options
- `UNIT_OPTIONS`: Array - Parameter unit types
- `LANGUAGE_OPTIONS`: Array - ISO language codes
- `SECTOR_OPTIONS`: Array - Economic sectors
- `URI_PREFIXES`: Object - Base URIs for generation

---

#### `src/utils/ttlHelpers.js` (~120 lines)

**Function:** TTL generation helpers  
**Responsibilities:**

- Generate service TTL block
- Generate organization TTL block
- Generate legal resource TTL block
- Generate temporal rules TTL blocks
- Generate parameters TTL blocks
- Escape TTL string values
- Format dates for TTL

**Exports:**

- `generateServiceTTL()`: String - Service metadata
- `generateOrganizationTTL()`: String - Organization metadata
- `generateLegalResourceTTL()`: String - Legal metadata
- `generateTemporalRulesTTL()`: String - Rules metadata
- `generateParametersTTL()`: String - Parameters metadata
- `escapeTTLString()`: String - Escape special characters
- `formatDate()`: String - ISO date formatting

---

#### `src/utils/validators.js` (~140 lines)

**Function:** Validation logic  
**Responsibilities:**

- Validate service data
- Validate organization data
- Validate legal resource data
- Validate temporal rules
- Validate parameters
- Check required fields
- Validate URI formats
- Validate BWB IDs

**Exports:**

- `validateService()`: Object - {valid, errors}
- `validateOrganization()`: Object - {valid, errors}
- `validateLegalResource()`: Object - {valid, errors}
- `validateTemporalRules()`: Object - {valid, errors}
- `validateParameters()`: Object - {valid, errors}
- `validateAll()`: Object - {valid, errors}

---

#### `src/utils/parseTTL_enhanced.js` (~350 lines)

**Function:** TTL import and parsing  
**Responsibilities:**

- Parse TTL files into JavaScript objects
- Extract service metadata
- Extract organization metadata
- Extract legal resource metadata
- Extract temporal rules
- Extract parameters
- Detect and handle vocabularies
- Handle multiple formats (CPSV-AP, RONL, CPRMV)

**Exports:**

- `parseTTL()`: Object - Parsed data structure

**Features:**

- Vocabulary detection
- Namespace resolution
- Multi-line value handling
- Date parsing
- Array value extraction (keywords, etc.)

---

#### `src/utils/index.js` (~12 lines)

**Function:** Barrel export for utils  
**Responsibilities:**

- Centralized export point for all utilities
- Simplifies imports throughout application

**Exports:**

- All constants (from constants.js)
- All TTL helpers (from ttlHelpers.js)
- All validators (from validators.js)
- parseTTL (from parseTTL_enhanced.js)

---

### Data Files

#### `src/data/changelog.json` (~180 lines)

**Function:** Version history data  
**Structure:**

```json
{
  "versions": [
    {
      "version": "1.4.0",
      "date": "2025-12-03",
      "status": "Current",
      "statusColor": "emerald",
      "borderColor": "emerald",
      "sections": [
        {
          "title": "Added",
          "icon": "✨",
          "iconColor": "blue",
          "items": ["Feature 1", "Feature 2"]
        }
      ]
    }
  ]
}
```

**Purpose:** Powers ChangelogTab display

---

#### `src/data/roadmap.json` (~35 lines)

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

### Configuration Files

#### `src/config/vocabularies_config.js` (~140 lines)

**Function:** RDF vocabulary mappings  
**Responsibilities:**

- Define supported vocabularies
- Map vocabulary prefixes to namespaces
- Configure TTL parser vocabulary detection

**Exports:**

- `vocabularies`: Object - Vocabulary configurations

---

### Entry Points & Styles

#### `src/index.js` (~25 lines)

**Function:** React application entry point  
**Responsibilities:**

- Import React and ReactDOM
- Import root App component
- Import global styles
- Render App into DOM
- Web Vitals reporting setup

---

#### `src/index.css` (~15 lines)

**Function:** Global styles and Tailwind imports  
**Responsibilities:**

- Import Tailwind base, components, utilities
- Define global CSS variables
- Set body font and background

---

#### `src/App.css` (~30 lines)

**Function:** Application-level styles  
**Responsibilities:**

- Component-specific styles
- Custom animations
- Override default styles

---

### Configuration Files (Root)

#### `package.json`

**Function:** Project metadata and dependencies  
**Key Dependencies:**

- react: ^18.3.1
- react-dom: ^18.3.1
- lucide-react: ^0.263.1 (icons)
- tailwindcss: ^3.x (styling)

**Scripts:**

- `start`: Development server
- `build`: Production build
- `test`: Run tests
- `eject`: Eject from CRA

---

#### `tailwind.config.js`

**Function:** Tailwind CSS configuration  
**Responsibilities:**

- Define content paths for purging
- Extend theme colors
- Configure plugins

---

#### `.eslintrc.json`

**Function:** ESLint configuration  
**Responsibilities:**

- Code quality rules
- React-specific rules
- Enforce coding standards

---

## Documentation Files

#### `README.md` (~400 lines)

**Function:** Project documentation  
**Contents:**

- Getting started guide
- Feature overview
- Development setup
- Deployment instructions
- Architecture explanation

---

#### `FIELD-MAPPING-CPSV-AP-3_2_0.md` (~500 lines)

**Function:** CPSV-AP compliance reference  
**Contents:**

- Field-to-property mappings
- Required vs optional fields
- CPSV-AP 3.2.0 specification
- EU vocabulary compliance

---

#### `VOCABULARY-INSTRUCTIONS.md` (~450 lines)

**Function:** RDF vocabulary usage guide  
**Contents:**

- Namespace explanations
- Property usage guidelines
- RONL vocabulary specifics
- CPRMV vocabulary specifics
- Examples and best practices

---

## Key Metrics

**Original codebase:** 1,723 lines (monolithic App.js)  
**Modularized codebase:** ~2,200 lines (distributed across files)  
**Main App.js:** ~790 lines (54% reduction)  
**Number of components:** 7 tab components + 1 preview panel  
**Number of utils:** 4 utility files  
**Test coverage:** Components isolated for testing  
**Code maintainability:** High (clear separation of concerns)

---

## Component Props Summary

| Component       | Props                            | State Management      |
| --------------- | -------------------------------- | --------------------- |
| App             | -                                | Local state (hooks)   |
| PreviewPanel    | ttlContent                       | Internal (copy state) |
| ServiceTab      | service, setService              | Lifted to App         |
| OrganizationTab | organization, setOrganization    | Lifted to App         |
| LegalTab        | legalResource, setLegalResource  | Lifted to App         |
| RulesTab        | temporalRules, add/remove/update | Lifted to App         |
| ParametersTab   | parameters, add/remove/update    | Lifted to App         |
| ChangelogTab    | -                                | Reads from JSON       |

---

## Data Flow

```
User Input (Form Fields)
    ↓
Tab Component (ServiceTab, OrganizationTab, etc.)
    ↓
State Update (via setService, setOrganization, etc.)
    ↓
App.js (orchestrates state)
    ↓
TTL Generation (utils/ttlHelpers.js)
    ↓
PreviewPanel (live display)
    ↓
Download/Export (TTL file)
```

---

## Import/Export Flow

```
Import TTL File
    ↓
parseTTL_enhanced.js (parse TTL)
    ↓
Extract metadata (service, org, legal, rules, params)
    ↓
Update App state
    ↓
Populate all tabs

Export:
App state
    ↓
Generate TTL (ttlHelpers.js)
    ↓
Combine all sections
    ↓
Download .ttl file
```

---

## Standards Compliance

**CPSV-AP 3.2.0:** Core Public Service Vocabulary - Application Profile  
**RONL:** Regels Overheid Nederland (temporal rules)  
**CPRMV:** Common Parameters Vocabulary (parameters)  
**ELI:** European Legislation Identifier (legal resources)  
**Dublin Core:** Metadata terms (title, description, etc.)  
**SKOS:** Simple Knowledge Organization System (concepts)  
**Schema.org:** Value/unit definitions  
**FOAF:** Friend of a Friend (homepage, etc.)

---

## Future Enhancements

Potential improvements documented in roadmap.json:

- Advanced validation with SHACL
- Template system for common services
- Multi-language support
- Integration with TriplyDB
- Collaborative editing
- Version control for services

---

**Generated:** December 2025  
**Maintainer:** Ministry of Health, Welfare and Sport (VWS)  
**License:** See project repository  
**Contact:** RONL Initiative

---

_Public Service TTL Editor - Project Structure Documentation_  
_Version 1.4.0 - Modularized Architecture_ ✓
