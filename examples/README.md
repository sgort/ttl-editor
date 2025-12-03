# TTL Repository Structure Guide

## 📁 Recommended Project Structure

```
ttl-editor/
├── public/
├── src/
├── examples/                          # TTL files repository
│   ├── README.md                      # Documentation for examples
│   ├── templates/                     # Generic templates
│   │   ├── basic-service.ttl
│   │   ├── service-with-rules.ttl
│   │   └── complete-example.ttl
│   │
│   └── organizations/                 # Organized by organization
│       ├── svb/                       # Sociale Verzekeringsbank
│       │   ├── README.md
│       │   ├── aow-leeftijd.ttl
│       │   ├── aow-pensioen.ttl
│       │   └── metadata.json
│       │
│       ├── gemeente-utrecht/          # Municipality of Utrecht
│       │   ├── README.md
│       │   ├── individuele-inkomenstoeslag.ttl
│       │   ├── bijzondere-bijstand.ttl
│       │   └── metadata.json
│       │
│       ├── belastingdienst/          # Tax Authority
│       │   ├── README.md
│       │   ├── inkomstenbelasting.ttl
│       │   └── metadata.json
│       │
│       └── uwv/                       # Employee Insurance Agency
│           ├── README.md
│           ├── ww-uitkering.ttl
│           └── metadata.json
│
├── package.json
├── README.md
└── .gitignore
```

---

## 📋 Structure Rationale

### 1. **Top-Level `examples/` Directory**

**Why:**

- Separate from source code (`src/`)
- Easy to find and browse
- Won't interfere with build process
- Clear purpose for contributors

**Location:** Root level, alongside `src/` and `public/`

### 2. **`examples/templates/` Subdirectory**

**Purpose:** Generic, reusable templates

**Contents:**

- `basic-service.ttl` - Minimal service definition
- `service-with-rules.ttl` - Service with temporal rules
- `complete-example.ttl` - All possible fields filled
- `multi-rule-example.ttl` - Multiple temporal rules

**Use Case:** Starting points for new services, testing, documentation

### 3. **`examples/organizations/` Subdirectory**

**Purpose:** Real-world examples organized by organization

**Structure:** One folder per organization using kebab-case

**Benefits:**

- ✅ Easy to find organization-specific services
- ✅ Clear ownership and context
- ✅ Scalable as more organizations adopt the tool
- ✅ Can include organization-specific documentation

---

## 🏢 Organization Folder Structure

### Standard Organization Folder

```
examples/organizations/[organization-name]/
├── README.md              # Organization info and service index
├── [service-1].ttl       # Service TTL file
├── [service-2].ttl       # Service TTL file
├── [service-3].ttl       # Service TTL file
└── metadata.json         # Organization metadata (optional)
```

### Example: SVB (Sociale Verzekeringsbank)

```
examples/organizations/svb/
├── README.md
├── aow-leeftijd.ttl
├── aow-pensioen.ttl
├── aow-nabestaanden.ttl
└── metadata.json
```

**README.md Content:**

```markdown
# Sociale Verzekeringsbank (SVB)

Official TTL service definitions for SVB public services.

## Organization Details

- **Name**: Sociale Verzekeringsbank
- **Website**: https://www.svb.nl
- **Identifier**: `00000001002220647000`

## Services

### AOW Leeftijdsbepaling

- **File**: `aow-leeftijd.ttl`
- **Description**: Calculation of retirement age based on birth date
- **Last Updated**: 2025-10-14

### AOW Pensioen Uitkering

- **File**: `aow-pensioen.ttl`
- **Description**: Old age pension benefit calculation
- **Last Updated**: 2025-10-14
```

**metadata.json Content:**

```json
{
  "organization": {
    "name": "Sociale Verzekeringsbank",
    "identifier": "00000001002220647000",
    "homepage": "https://www.svb.nl",
    "type": "Government Agency"
  },
  "services": [
    {
      "filename": "aow-leeftijd.ttl",
      "identifier": "aow-leeftijd",
      "name": "AOW Leeftijdsbepaling",
      "lastUpdated": "2025-10-14",
      "status": "active"
    },
    {
      "filename": "aow-pensioen.ttl",
      "identifier": "aow-pensioen",
      "name": "AOW Pensioen Uitkering",
      "lastUpdated": "2025-10-14",
      "status": "active"
    }
  ]
}
```

---

## 📝 Naming Conventions

### Organization Folders

- **Format**: `kebab-case` (lowercase with hyphens)
- **Examples**:
  - `svb`
  - `gemeente-utrecht`
  - `belastingdienst`
  - `uwv`
  - `gemeente-amsterdam`

### TTL Files

- **Format**: `kebab-case.ttl`
- **Pattern**: `[service-identifier].ttl`
- **Examples**:
  - `aow-leeftijd.ttl`
  - `individuele-inkomenstoeslag.ttl`
  - `ww-uitkering.ttl`
  - `bijzondere-bijstand.ttl`

### Guidelines

- Use descriptive, meaningful names
- Match service identifier when possible
- Avoid spaces and special characters
- Use Dutch service names (primary language)

---

## 📚 Documentation Files

### Main Examples README (`examples/README.md`)

```markdown
# TTL Examples Repository

This directory contains example TTL files generated with the Public Service TTL Editor.

## Structure

- **templates/** - Generic templates for quick start
- **organizations/** - Real-world examples organized by organization

## Organizations

- [Sociale Verzekeringsbank (SVB)](./organizations/svb/)
- [Gemeente Utrecht](./organizations/gemeente-utrecht/)
- [Belastingdienst](./organizations/belastingdienst/)
- [UWV](./organizations/uwv/)

## Using These Examples

### As Templates

Copy a template from `templates/` to start a new service definition.

### Importing

Use the "Import TTL File" button in the editor to load and edit any example.

### Contributing

To add your organization's services:

1. Create a folder in `organizations/[your-org]/`
2. Add TTL files and README.md
3. Submit a pull request

## Standards

All examples follow:

- CPSV-AP 3.0
- CPRMV 0.3.0
- RONL Vocabulary

## Validation

All TTL files have been validated using the TTL Editor's validation feature.
```

---

## 🔧 .gitignore Updates

Add to your `.gitignore` to avoid committing unnecessary files:

```gitignore
# Node modules and build
/node_modules
/build

# Examples - exclude drafts but include published
examples/**/*.draft.ttl
examples/**/*.tmp.ttl
examples/**/temp/

# Metadata
examples/**/.DS_Store
```

---

## 🎯 Benefits of This Structure

### For Users

- ✅ Easy to find examples by organization
- ✅ Clear context for each service
- ✅ Can copy-paste templates to start quickly
- ✅ Browse real-world implementations

### For Contributors

- ✅ Clear where to add new services
- ✅ Consistent organization
- ✅ Easy to maintain and update
- ✅ Metadata for automation

### For Development

- ✅ Examples for testing import functionality
- ✅ Regression testing with real data
- ✅ Documentation of edge cases
- ✅ Showcase of capabilities

### For RONL Initiative

- ✅ Central repository of government services
- ✅ Demonstrates adoption across organizations
- ✅ Knowledge sharing between municipalities
- ✅ Standards compliance examples

---

## 📊 Alternative Structure (If Needed Later)

If you get hundreds of services, consider this enhanced structure:

```
examples/organizations/[org-name]/
├── README.md
├── metadata.json
├── services/
│   ├── social-benefits/
│   │   ├── aow-leeftijd.ttl
│   │   └── aow-pensioen.ttl
│   └── regulations/
│       └── compliance-check.ttl
└── rules/
    ├── temporal-rules-2024.ttl
    └── temporal-rules-2025.ttl
```

But start simple with the flat structure!

---

## 🔍 Search and Discovery

### GitHub/GitLab Features

With this structure, you can use:

- **Search**: Find TTL files by service name
- **Browse**: Navigate by organization
- **Filter**: List all services for one org
- **Raw View**: Direct link to TTL content

### Example URLs

```
/examples/organizations/svb/aow-leeftijd.ttl
/examples/organizations/gemeente-utrecht/individuele-inkomenstoeslag.ttl
/examples/templates/basic-service.ttl
```

---

## 💡 Future Enhancements

### 1. **Index Page**

Generate an HTML index page listing all services:

```
examples/index.html
```

### 2. **Validation Script**

Automated validation of all TTL files:

```bash
npm run validate-examples
```

### 3. **Statistics Dashboard**

Show number of services per organization, most common patterns, etc.

### 4. **Template Generator**

CLI tool to create new organization folders:

```bash
npm run create-org -- --name "Gemeente Amsterdam"
```

### 5. **Import from Examples**

Add dropdown in editor to load examples directly:

```jsx
<select onChange={loadExample}>
  <option>Select example...</option>
  <option value="svb/aow-leeftijd">SVB - AOW Leeftijd</option>
  <option value="gemeente-utrecht/inkomenstoeslag">Utrecht - Inkomenstoeslag</option>
</select>
```

---

## ✅ Recommended Next Steps

1. **Create the structure** (30 minutes)

   ```bash
   mkdir -p examples/{templates,organizations}
   ```

2. **Add your current TTL** (15 minutes)
   - Move existing TTL to appropriate org folder
   - Create README for that organization

3. **Create 2-3 templates** (1 hour)
   - Basic service template
   - Service with rules template
   - Complete example with all fields

4. **Document** (30 minutes)
   - Main examples/README.md
   - Organization README files

5. **Commit and push** (5 minutes)
   ```bash
   git add examples/
   git commit -m "Add TTL examples repository"
   git push
   ```

---

## 🎓 Best Practices

### Maintenance

- Update `metadata.json` when adding/removing services
- Include last updated date in READMEs
- Keep organization info current
- Remove deprecated services (or mark as `status: "deprecated"`)

### Quality

- Validate all TTL files before committing
- Test import functionality with each example
- Ensure proper escaping and formatting
- Follow naming conventions consistently

### Documentation

- Explain the purpose of each service
- Link to relevant regulations/laws
- Note any special considerations
- Include contact information if available

---

## 📧 Questions?

This structure balances:

- **Organization** - Easy to navigate
- **Scalability** - Can grow to hundreds of services
- **Simplicity** - Not over-engineered
- **Discoverability** - Clear paths to examples
- **Maintenance** - Easy to update and extend

Start with this structure and evolve as needed!
