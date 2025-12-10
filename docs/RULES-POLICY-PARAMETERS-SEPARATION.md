# Rules--Policy--Parameters (RPP) Separation

## 1. Purpose

This document describes the **Rules--Policy--Parameters (RPP)
Separation** pattern for Business Rule Management (BRM) and Decision
Management, commonly applied in regulated environments (e.g., public
sector).

RPP formalizes the separation of:

- **Policy (Standards / Norms)** -- what is legally or normatively
  required
- **Rules (Decision Logic)** -- how policies are operationalized
- **Parameters (Configuration)** -- implementation choices that may
  vary per agency or context

This separation ensures legal traceability, organizational flexibility,
and stable automation.

---

## 2. Definitions

### 2.1 Policy

Policies are derived directly from laws, regulations, or formal
standards.

Characteristics: - Normative - Stable relative to operations -
Organization-independent - Must be traceable to authoritative sources

Examples: - Legal eligibility criteria - Regulatory thresholds -
Mandated compliance requirements

In ArchiMate: - `Driver` - `Principle` - `Requirement`

---

### 2.2 Rules

Rules represent executable or formalized **decision logic** written in
structured or natural language.

Characteristics: - Interpret policy into operational form - Independent
from specific IT implementations - May be expressed as: - DMN decision
tables - SBVR rules - Pseudocode / structured statements

Examples: - Eligibility determinations - Validation checks - Calculation
logic

In ArchiMate: - `Business Rule`

---

### 2.3 Parameters

Parameters are **configurable values** which tune rule behavior without
changing rule logic.

Characteristics: - Set by responsible agencies or system owners -
Adjustable without legal or rule re-engineering - Enable regional
variation and pilot adjustments

Examples: - Threshold values - Risk score weights - Time windows -
Regional rates

In ArchiMate: - `Business Object` - `Value Specification`

---

## 3. Why Separate?

The RPP pattern enables:

### 3.1 Legal Traceability

    Law → Policy → Rule → Parameter → Decision

Each operational decision can be traced back to statutory authority.

---

### 3.2 Organizational Agility

Agencies can adjust parameters quickly without: - Rewriting
legislation - Reauthoring business rules - Recoding software

---

### 3.3 Governance & Compliance

Clear separation enables:

- Rule audits
- Policy governance
- Parameter approval workflows

---

## 4. Related Standards

Standard Relevance

---

OMG SBVR Formal policy and rule semantics  
OMG DMN Rule and decision modeling  
BPMN Process context for rules  
TOGAF Business architecture governance  
ArchiMate Motivation-to-execution traceability

---

## 5. TOGAF Mapping

RPP fits primarily into **TOGAF Business Architecture**:

### 5.1 Core Artifacts

- Business Rules Catalog
- Policy Catalog
- Requirements Catalog
- Process Decomposition Diagrams

### 5.2 Traceability

    Legislation → Policy Catalog → Business Rules → Process Behavior

---

## 6. ArchiMate Modeling

### 6.1 Element Mapping

Concept ArchiMate Element

---

Law / Regulation `Driver`  
Standards / Norms `Principle` or `Requirement`  
Business Rule `Business Rule`  
Parameters `Business Object` or `Value Specification`  
Execution `Business Process` / `Application Function`

---

### 6.2 Layered Model Structure

    [Driver: Legislation]
            ↓
    [Principle / Requirement]
            ↓
    [Business Rule]
            ↓
    [Parameter: Business Object]
            ↓
    [Process or Application Behavior]

---

## 7. Modeling Viewpoints

### Recommended Visuals:

#### ArchiMate:

- Motivation Viewpoint
- Business Layer Viewpoint
- Motivation-to-Execution traceability views

#### DMN:

- Decision Requirements Diagram (DRD)
- Decision Tables referencing Parameter objects

---

## 8. Governance Model

### 8.1 Ownership

Layer Owner

---

Policy Legislator / Regulator  
Rules Domain architects / legal interpreters  
Parameters Operating agencies / policy executors  
Implementation IT teams

---

### 8.2 Change Management

Change Request Type Affected Layer

---

Legal amendment Policy → Rules  
Program change Rules  
Regional tuning Parameters  
IT improvement Implementation only

---

## 9. Control Mechanisms

### 9.1 Policy Controls

- Legal reviews
- Regulatory impact analysis
- Compliance audits

---

### 9.2 Rule Controls

- Business rule testing
- Stakeholder signoff
- Decision-table coverage checks

---

### 9.3 Parameter Controls

- Approval workflows
- Valid range enforcement
- Version history

---

## 10. Advantages

Benefit Description

---

Agility Rapid tuning without code changes  
Compliance Direct legal traceability  
Stability Core rules remain constant  
Scalability Supports multi-agency or multi-jurisdiction deployment  
Transparency Decisions can be explained and audited

---

## 11. Risks

Risk Mitigation

---

Over-parameterization Govern parameter scope tightly  
Rule sprawl Periodic policy-rule consolidation  
Governance overhead Automate traceability

---

## 12. Implementation Patterns

### 12.1 Technical

- External rule engines
- Configuration registries
- Parameter APIs

---

### 12.2 Process

- Legal → Rule authoring pipeline
- Parameter approval workflows
- Decision simulation/testing

---

## 13. Example Use Case --- Public Benefits

**Policy (Law):**\
Income under national threshold must qualify for assistance.

**Rule:**\
IF applicant gross income \< threshold THEN eligible.

**Parameter:**\
threshold = 18,250 (configurable per year/region)

---

## 14. Summary

The **Rules--Policy--Parameters separation** is a core
decision-management architectural pattern enabling:

- Compliance through traceability
- Operational agility
- Strong governance
- Effective standardization

It integrates naturally with:

- **TOGAF Business Architecture**
- **ArchiMate Motivation and Business Layer modeling**
- **DMN decision modeling standards**
