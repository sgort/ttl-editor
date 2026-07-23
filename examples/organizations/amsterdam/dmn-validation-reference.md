# DMN Validation Reference

This reference documents every validation code produced by the RONL DMN+ syntactic validator, the rule each code enforces, and the rationale for why that rule exists. The validator runs on the shared backend at `POST /v1/dmns/validate` and is used both by the Linked Data Explorer's standalone DMN Validator view and by the CPSV Editor's inline validation in the DMN tab.

---

## How to read this reference

Each entry follows this structure:

| Field | Meaning |
|---|---|
| **Code** | The short typed identifier included in every issue object (e.g. `BIZ-002`) |
| **Severity** | `error` — must fix; `warning` — should fix for RONL publishing; `info` — quality suggestion |
| **Trigger** | The condition that causes this issue to be emitted |
| **Rationale** | Why this rule exists and what goes wrong if it is violated |
| **Fix** | What to change in your DMN file |

---

## Layer 1 — Base DMN (BASE-*)

Layer 1 checks that the file is a structurally sound XML document with the correct root element and namespace. These checks run first; if they fail, layers 2–5 are skipped entirely because a broken document cannot be safely traversed.

---

### BASE-PARSE

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | `libxmljs2.parseXml()` throws a `SyntaxError` — the file is not well-formed XML |
| **Rationale** | DMN files are XML documents. A parser error means the file cannot be read at all — not by the validator, not by Operaton, not by any other DMN tooling. This is the most fundamental failure mode. |
| **Fix** | Open the file in a text editor or XML validator. Common causes: unclosed tags, illegal characters in attribute values, missing XML declaration encoding, byte-order mark (BOM) at the start of the file. The `line` and `column` fields on the issue pinpoint the exact location. |

---

### BASE-ROOT

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | The root element is not named `definitions` |
| **Rationale** | The DMN 1.x specification mandates `<definitions>` as the document root. A different root element means the file is either not a DMN file, is a fragment, or has been corrupted. |
| **Fix** | Ensure the file starts with `<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" ...>`. |

---

### BASE-NS

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | The namespace URI on `<definitions>` is not one of the recognised DMN namespaces |
| **Rationale** | Each DMN version uses a distinct namespace URI. The validator recognises: DMN 1.3 (`https://www.omg.org/spec/DMN/20191111/MODEL/`), DMN 1.2 (`http://www.omg.org/spec/DMN/20180521/MODEL/`), DMN 1.1 (`http://www.omg.org/spec/DMN/20151101/dmn.xsd`), and the Camunda legacy namespace (`https://www.camunda.org/schema/1.0/dmn`). An unrecognised namespace causes XPath queries in layers 2–5 to fail silently, producing incomplete validation results and unexpected Operaton behaviour. |
| **Fix** | Update `xmlns` on `<definitions>` to a recognised namespace. For new files, use the DMN 1.3 namespace. |

---

### BASE-NAME

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | `<definitions>` is missing the `name` attribute or its value is empty |
| **Rationale** | The DMN specification requires a `name` on `<definitions>`. Operaton uses this name in its deployment UI. A missing name makes it harder to identify a model in the engine and in TriplyDB metadata. |
| **Fix** | Add `name="YourModelName"` to the `<definitions>` element. |

---

### BASE-NSATTR

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | `<definitions>` is missing the `namespace` attribute or its value is empty |
| **Rationale** | The `namespace` attribute defines the target namespace for the model's identifiers. Without it, URIs generated from decision IDs are ambiguous. For RONL publishing, this value is used as the base URI for the decision model's linked data identity. |
| **Fix** | Add `namespace="https://regels.overheid.nl/services/{your-service-id}/dmn"` to `<definitions>`. |

---

### BASE-EMPTY

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | The document contains no `<decision>` elements |
| **Rationale** | A DMN file with no decisions contains no executable logic. This typically indicates an empty template, a partially authored file, or a file that only contains `<inputData>` definitions without the associated decisions. |
| **Fix** | Add at least one `<decision>` element, or verify that the correct file was uploaded. |

---

## Layer 2 — Business Rules (BIZ-*)

Layer 2 checks the structural correctness of decision table definitions: that enumerations are valid, that type declarations are present, that rule rows are internally consistent, and that hit-policy constraints are not violated by the static structure of the table.

---

### BIZ-001

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | A `<decisionTable>` has a `hitPolicy` attribute whose value is not in the allowed set: `UNIQUE`, `FIRST`, `ANY`, `COLLECT`, `RULE ORDER`, `OUTPUT ORDER`, `PRIORITY` |
| **Rationale** | Operaton implements the full DMN 1.3 hit policy set but will reject unknown values at deployment time with a cryptic parse error. Catching this before deployment saves a round-trip to the engine. |
| **Fix** | Correct the `hitPolicy` value on the `<decisionTable>` element. If no hit policy is specified, `UNIQUE` is the default. |

---

### BIZ-002

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | An `<inputExpression>` inside a decision table is missing a `typeRef` attribute |
| **Rationale** | `typeRef` declares the FEEL type of the input column. Without it, Operaton performs no type coercion — a string `"true"` is not automatically cast to `boolean true`, which causes rules to never match if the FEEL type does not align with the runtime variable type. For RONL publishing, typed inputs are required for semantic interoperability. |
| **Fix** | Add `typeRef="boolean"` (or `string`, `integer`, `date`, etc.) to the `<inputExpression>`. |

---

### BIZ-003

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | An `<inputExpression>` has a `typeRef` value that is not a known DMN FEEL type |
| **Rationale** | Known types are: `string`, `boolean`, `integer`, `long`, `double`, `number`, `date`, and their capitalised variants. An unknown type (e.g. a misspelling or a custom type name) means the type declaration is present but non-functional. |
| **Fix** | Replace the custom or misspelled type with the correct FEEL type name. |

---

### BIZ-004

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | An `<o>` column in a decision table is missing a `typeRef` attribute |
| **Rationale** | Without a typed output, consuming systems (including the Linked Data Explorer's chain builder) cannot validate that the output type of one DMN matches the expected input type of the next DMN in a chain. This is a prerequisite for type-safe chain composition. |
| **Fix** | Add `typeRef` to the `<o>` element. |

---

### BIZ-005

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | An `<o>` column has a `typeRef` value that is not a known DMN FEEL type |
| **Rationale** | An unrecognised output type cannot be mapped to a FEEL type at runtime and cannot be matched against the input types of downstream decisions in a chain. This typically indicates a typo or a custom type name that should be replaced with a standard FEEL type. |
| **Fix** | Replace the value with a known FEEL type: `string`, `boolean`, `integer`, `long`, `double`, `number`, or `date`. |

---

### BIZ-006

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | A `<rule>` has a different number of `<inputEntry>` elements than there are `<input>` columns declared on the parent `<decisionTable>` |
| **Rationale** | DMN requires exactly one `<inputEntry>` per input column per rule. A mismatch means the table is malformed — Operaton will either throw a parse error at deployment time or silently misalign entries, causing incorrect rule evaluation. |
| **Fix** | Ensure every `<rule>` contains exactly as many `<inputEntry>` elements as there are `<input>` columns in the table. |

---

### BIZ-007

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | A `<rule>` has a different number of `<outputEntry>` elements than there are `<o>` columns declared on the parent `<decisionTable>` |
| **Rationale** | DMN requires at least one `<outputEntry>` per output column per rule. A mismatch means the table is malformed — Operaton will either throw a parse error or produce null output values for the misaligned columns. |
| **Fix** | Ensure every `<rule>` contains exactly as many `<outputEntry>` elements as there are `<o>` columns in the table. |

---

### BIZ-008

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | Two rules in a `UNIQUE` or `ANY` decision table have byte-identical text in every `<inputEntry>` column |
| **Rationale** | A `UNIQUE` table requires that at most one rule fires for any given input. When two rules have identical input entries, both fire for every input that satisfies those entries. Operaton throws `DmnHitPolicyException` at runtime. This is undetectable from the output alone — the engine throws before producing a result. |
| **Fix** | Remove or differentiate the duplicate rule. If the intent is to produce a combined output, consider `hitPolicy="COLLECT"` with an aggregator, or merge the two rules into one. |

---

### BIZ-009

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | A `UNIQUE` or `ANY` decision table contains a catch-all rule (every `<inputEntry>` is empty or `-`) alongside at least one specific rule |
| **Rationale** | An empty or `-` input entry matches any value. A rule where all inputs are empty or `-` therefore matches every possible input combination. In a `UNIQUE` or `ANY` table, this catch-all overlaps with every specific rule — for any input that satisfies a specific rule, both the specific rule and the catch-all fire simultaneously, violating the hit policy. This is the most common overlap pattern in government DMNs and the hardest to spot visually. |
| **Fix** | Change `hitPolicy` to `FIRST` and place the catch-all last (it then only fires when no specific rule matches), or replace the catch-all with explicit rules covering the remaining input combinations. |

<figure markdown style="width:100%; margin:0;">
  ![Screenshot: BIZ-008-009-test.dmn loaded in the DMN Validator showing Business Rules 1E 1W — BIZ-008 error on the duplicate-rows decision and BIZ-009 warning on the catch-all decision](../../assets/screenshots/linked-data-explorer-dmn-validator-biz-008-009-test.png)
  <figcaption>BIZ-008-009-test.dmn loaded in the DMN Validator showing Business Rules 1E 1W — BIZ-008 error on the duplicate-rows decision and BIZ-009 warning on the catch-all decision</figcaption>
</figure>

---

## Layer 3 — Execution Rules (EXEC-*)

Layer 3 validates CPRMV extension attributes. The CPRMV namespace (`https://cprmv.open-regels.nl/0.3.0/`) is defined by the RONL initiative to capture the legal provenance and classification of each decision rule. These attributes are required for RONL-compliant publishing but are not enforced by Operaton itself.

---

### EXEC-001

| | |
|---|---|
| **Severity** | 🔵 info |
| **Trigger** | No element in the document has an attribute in the CPRMV namespace |
| **Rationale** | CPRMV attributes are the mechanism by which a DMN file records its connection to Dutch legislation. Without them, the exported Turtle will contain no legal provenance metadata. The issue is `info` rather than `warning` because a DMN may be published to TriplyDB as a technical artefact before CPRMV metadata has been added. |
| **Fix** | Add CPRMV namespace declaration to `<definitions>`: `xmlns:cprmv="https://cprmv.open-regels.nl/0.3.0/"`, then add attributes such as `cprmv:rulesetType`, `cprmv:ruleType`, and `cprmv:confidence` to your decision elements. |

---

### EXEC-002

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | A `cprmv:rulesetType` attribute has a value that is not in the allowed set: `decision-table`, `conditional-calculation`, `constraint-table`, `derivation-table` |
| **Rationale** | `rulesetType` classifies the structural pattern of the ruleset. An invalid value means the classification cannot be interpreted by downstream systems that use this attribute to determine how to present or execute the ruleset. |
| **Fix** | Set `cprmv:rulesetType` to one of the four allowed values. |

---

### EXEC-003

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | A `cprmv:implements` attribute value does not match the BWB ID format (`BWBR` + 7 digits, e.g. `BWBR0002221`) |
| **Rationale** | BWB IDs are the persistent identifiers for Dutch legislation on `wetten.overheid.nl`. A malformed value cannot be resolved to a legislation page, breaking the link between the DMN and its legal source. |
| **Fix** | Use the correct BWB ID. BWB IDs are found in the URL of the legislation on `wetten.overheid.nl`. |

---

### EXEC-004

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | A `cprmv:ruleType` attribute has a value not in: `temporal-period`, `conditional`, `derivation`, `constraint`, `decision-rule`, `default` |
| **Rationale** | `ruleType` classifies the logical nature of an individual rule. The six types map to distinct patterns in Dutch administrative law. An unknown value cannot be processed by RONL vocabulary services. |
| **Fix** | Set `cprmv:ruleType` to one of the six allowed values. |

---

### EXEC-005

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | A `cprmv:confidence` attribute has a value not in: `low`, `medium`, `high` |
| **Rationale** | `confidence` expresses how certain the rule author is that the DMN correctly implements the underlying legislation. An invalid value cannot be interpreted by governance tooling. |
| **Fix** | Set `cprmv:confidence` to `low`, `medium`, or `high`. |

---

### EXEC-006

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | A `cprmv:validFrom` attribute has a value that does not match `YYYY-MM-DD` |
| **Rationale** | CPRMV dates are ISO 8601 calendar dates. A malformed date cannot be parsed for temporal reasoning — for example, determining whether a rule is currently in effect. |
| **Fix** | Use ISO format: `cprmv:validFrom="2026-01-01"`. |

---

### EXEC-007

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | A `cprmv:validUntil` attribute has a value that does not match `YYYY-MM-DD` |
| **Rationale** | See EXEC-006. |
| **Fix** | Use ISO format: `cprmv:validUntil="2026-12-31"`. |

---

### EXEC-008

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | Both `cprmv:validFrom` and `cprmv:validUntil` are present, both are valid dates, and `validFrom` is not earlier than `validUntil` |
| **Rationale** | A validity period where the start date is equal to or later than the end date is logically impossible — the rule would never be in effect. |
| **Fix** | Ensure `cprmv:validFrom` is an earlier date than `cprmv:validUntil`. |

---

### EXEC-009

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | A rule has `cprmv:ruleType="temporal-period"` but is missing `cprmv:validFrom` |
| **Rationale** | A temporal-period rule is bounded in time by definition. A rule without a start date cannot be used for temporal reasoning. |
| **Fix** | Add `cprmv:validFrom` to the rule. |

---

### EXEC-010

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | A rule has `cprmv:ruleType="temporal-period"` but is missing `cprmv:validUntil` |
| **Rationale** | See EXEC-009. |
| **Fix** | Add `cprmv:validUntil` to the rule, or reconsider whether the rule type should be `default` if no end date applies. |

---

## Layer 4 — Interaction Rules (INT-*)

Layer 4 validates the Decision Requirements Diagram (DRD) — the graph of decisions and information requirements that connects inputs to the final decision output.

---

### INT-001

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | An `<informationRequirement>` contains a `<requiredInput>` whose `href` references an `<inputData>` ID that does not exist in the document |
| **Rationale** | A broken `href` means Operaton cannot locate the dependency at runtime, causing a `NullPointerException` or silent evaluation failure. This is particularly common after copy-paste from another DMN file where IDs were not updated. |
| **Fix** | Verify that every `href="#some-id"` in `<requiredInput>` elements corresponds to the `id` of an `<inputData>` element in the same document. |

---

### INT-002

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | An `<informationRequirement>` contains a `<requiredDecision>` whose `href` references a decision ID that does not exist in the document |
| **Rationale** | See INT-001. A broken decision reference means the DRD is structurally incomplete and will fail at runtime. |
| **Fix** | Verify that every `href="#some-id"` in `<requiredDecision>` elements corresponds to the `id` of a `<decision>` element in the same document. |

---

### INT-003

| | |
|---|---|
| **Severity** | 🔴 error |
| **Trigger** | A `<decision>` has an `<informationRequirement>` that references itself via `<requiredDecision>` |
| **Rationale** | A self-referential dependency creates an infinite evaluation loop. Operaton will throw a cycle detection error at runtime. |
| **Fix** | Remove the self-referential `<requiredDecision>` from the decision. |

---

### INT-004

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | An `<informationRequirement>` element has neither a `<requiredInput>` nor a `<requiredDecision>` child |
| **Rationale** | An `<informationRequirement>` with no referenced element is an empty declaration that contributes nothing to the DRD. It may indicate an incomplete authoring step. |
| **Fix** | Add the appropriate `<requiredInput>` or `<requiredDecision>` child, or remove the empty `<informationRequirement>`. |

---

### INT-005
 
| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | An `<inputData>` element exists in the document but is not referenced by any `<informationRequirement>`. Only fires in DRDs — models with more than one `<decision>` element or at least one `<informationRequirement>`. In standalone single-decision DMNs, `<inputData>` elements serve as input contract declarations for CPSV/publishing purposes and do not require wiring. |
| **Rationale** | An orphaned `<inputData>` element in a DRD declares an input that no decision uses. It adds clutter to the DRD, makes the model harder to understand, and causes the CPSV Editor to generate `cpsv:Input` metadata for an input that has no effect on any decision outcome. |
| **Fix** | Connect the `<inputData>` element to a decision via `<informationRequirement>`, or remove it from the model. |
 
---

### INT-006

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | An `<inputData>` element has a `name` attribute that does not match the `name` of its child `<variable>` element |
| **Rationale** | Operaton resolves inputs by variable name at runtime. A mismatch between the `<inputData name="...">` and its `<variable name="...">` is a common source of "my rule never fires" bugs where the input evaluates to null. |
| **Fix** | Align the `<variable name="...">` with the `<inputData name="...">`. |

---

### INT-007
 
| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | An `<inputExpression>` references a variable name that has no corresponding top-level `<inputData name="...">` declaration in the `<definitions>` element. Not checked for empty expressions, literal booleans (`true` / `false`), or numeric and quoted-string literals — these are hardcoded values, not variable references. |
| **Rationale** | Without a matching `<inputData>` declaration, the CPSV Editor cannot discover the DMN's input contract and generates an empty request body on deploy. Adding `<inputData>` elements with `<variable>` children makes the input contract explicit for both tooling and human readers. |
| **Fix** | For each flagged variable name, add a top-level `<inputData id="InputData_<n>" name="<n>">` element with a `<variable id="Variable_<n>" name="<n>" typeRef="<type>" />` child, placed between `</decision>` and `<dmndi:DMNDI>`. |
 
---

## Layer 5 — Content (CON-*)

Layer 5 checks metadata quality: whether descriptive attributes are populated and whether elements that should carry content actually do. These checks have no functional impact on execution but are required for RONL publishing quality.

---

### CON-001

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | A CPRMV descriptive attribute (`cprmv:title` or `cprmv:description`) is present on a `<decision>` but its value is empty |
| **Rationale** | CPRMV descriptive attributes are used by the Linked Data Explorer and TriplyDB to display human-readable metadata about rules. An empty attribute signals that the author added the placeholder without filling it in. |
| **Fix** | Add meaningful text to the attribute, or remove it if it is not applicable. |

---

### CON-002

| | |
|---|---|
| **Severity** | 🟡 warning |
| **Trigger** | A `cprmv:description` attribute on an `<inputData>` element is present but empty |
| **Rationale** | See CON-001. |
| **Fix** | Add meaningful text or remove the attribute. |

---

### CON-003

| | |
|---|---|
| **Severity** | 🔵 info |
| **Trigger** | A `cprmv:note` attribute on a `<rule>` is present but empty |
| **Rationale** | Rule-level notes are used to explain the intent of a specific rule row in human-readable terms. An empty note is a placeholder that was never completed. |
| **Fix** | Add a note describing the rule's intent or remove the attribute. |

---

### CON-004

| | |
|---|---|
| **Severity** | 🔵 info |
| **Trigger** | A `<variable>` element anywhere in the document is missing a `typeRef` attribute |
| **Rationale** | The `typeRef` on a `<variable>` declares the FEEL type of the value it represents. Without it, consuming decisions in a DRD cannot perform type-safe input binding, and the chain builder in the Linked Data Explorer cannot verify type compatibility between linked DMNs. |
| **Fix** | Add `typeRef` to all `<variable>` elements. |

---

### CON-005

| | |
|---|---|
| **Severity** | 🔵 info |
| **Trigger** | A `<textAnnotation>` element exists but its `<text>` child is empty or missing |
| **Rationale** | Text annotations are author-provided comments in the DRD. An empty annotation is a placeholder that was never filled in. |
| **Fix** | Add a meaningful description to the annotation, or remove it. |

---

## Issue severity summary

| Code | Severity |
|---|---|
| BASE-PARSE | 🔴 error |
| BASE-ROOT | 🔴 error |
| BASE-NS | 🔴 error |
| BASE-NAME | 🟡 warning |
| BASE-NSATTR | 🟡 warning |
| BASE-EMPTY | 🟡 warning |
| BIZ-001 | 🔴 error |
| BIZ-002 | 🟡 warning |
| BIZ-003 | 🟡 warning |
| BIZ-004 | 🟡 warning |
| BIZ-005 | 🟡 warning |
| BIZ-006 | 🔴 error |
| BIZ-007 | 🔴 error |
| BIZ-008 | 🔴 error |
| BIZ-009 | 🟡 warning |
| EXEC-001 | 🔵 info |
| EXEC-002 | 🔴 error |
| EXEC-003 | 🟡 warning |
| EXEC-004 | 🔴 error |
| EXEC-005 | 🔴 error |
| EXEC-006 | 🔴 error |
| EXEC-007 | 🔴 error |
| EXEC-008 | 🔴 error |
| EXEC-009 | 🟡 warning |
| EXEC-010 | 🟡 warning |
| INT-001 | 🔴 error |
| INT-002 | 🔴 error |
| INT-003 | 🔴 error |
| INT-004 | 🟡 warning |
| INT-005 | 🟡 warning |
| INT-006 | 🟡 warning |
| INT-007 | 🟡 warning |
| CON-001 | 🟡 warning |
| CON-002 | 🟡 warning |
| CON-003 | 🔵 info |
| CON-004 | 🔵 info |
| CON-005 | 🔵 info |

---

## API contract

**Endpoint:** `POST /v1/dmns/validate`

**Request:**
```json
{ "content": "<xml string — the full DMN file content>" }
```

**Response (success):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "parseError": null,
    "layers": {
      "base":        { "label": "Base DMN",         "issues": [] },
      "business":    { "label": "Business Rules",   "issues": [] },
      "execution":   { "label": "Execution Rules",  "issues": [] },
      "interaction": { "label": "Interaction Rules","issues": [] },
      "content":     { "label": "Content",          "issues": [] }
    },
    "summary": { "errors": 0, "warnings": 0, "infos": 1 }
  },
  "timestamp": "2026-02-25T14:32:11.000Z"
}
```

**Issue object:**
```json
{
  "severity": "warning",
  "code": "BIZ-009",
  "message": "Catch-all rule \"DecisionRule_catchall\" (all input entries are empty or \"-\") exists alongside specific rules in a UNIQUE table. For any input that matches a specific rule, both the specific rule and the catch-all fire — violating the UNIQUE hit policy. Consider hitPolicy=\"FIRST\", or move default logic to an else-branch.",
  "location": "<decision id=\"beslissing_biz009\">"
}
```

**Response (parse error — layers 2–5 skipped):**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "parseError": "XML is not well-formed: ...",
    "layers": {
      "base": { "label": "Base DMN", "issues": [{ "severity": "error", "code": "BASE-PARSE", ... }] },
      "business":    { "label": "Business Rules",   "issues": [] },
      "execution":   { "label": "Execution Rules",  "issues": [] },
      "interaction": { "label": "Interaction Rules","issues": [] },
      "content":     { "label": "Content",          "issues": [] }
    },
    "summary": { "errors": 1, "warnings": 0, "infos": 0 }
  },
  "timestamp": "..."
}
```

**Response (bad request):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request body must contain a \"content\" field with the DMN XML as a string."
  },
  "timestamp": "..."
}
```

The endpoint is unauthenticated. Maximum request body size is 10 MB.