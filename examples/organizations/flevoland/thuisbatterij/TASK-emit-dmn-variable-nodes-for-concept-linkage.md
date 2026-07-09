# Task: Emit DMN input/output variable nodes so NL-SBB concepts are self-describing

**Status:** open — pick up later
**Area:** `src/utils/ttlGenerator.js` (TTL generation)
**Raised:** 2026-07-09 (Flevoland Thuisbatterij debugging session)
**Priority:** medium — data-model gap; currently worked around on the query side (LDE + RONL Business API)

## Summary

NL-SBB concepts emitted by the editor point at a DMN variable via
`dct:subject <serviceUri/dmn/input/N>` (or `.../output/N`), but the matching
variable node — `<serviceUri/dmn/input/N> a cpsv:Input ; … cpsv:isRequiredBy <dmn>`
— is **not always emitted**. When it is missing, the variable URI is *terminal*
(no outgoing triples), so there is no path from the concept to its DMN/service in
the graph. Consumers that traverse `concept → dct:subject → variable →
cpsv:isRequiredBy/cpsv:produces → dmn → cprmv:implements → service` therefore see
**no concepts** for the affected service.

## Evidence

Published file:
`examples/organizations/flevoland/thuisbatterij/[v1.10.6]-recht-en-hoogte-subsidie-thuisbatterij-Flevoland-0.4.1.ttl`

- 21 × `dct:subject <…/dmn/input|output/N>` (concept → variable)
- **0** × `cpsv:isRequiredBy`, **0** × `cpsv:produces` (variable → DMN)
- The variable URIs `…/dmn/input/N` never appear as a subject.

Result: the Linked Data Explorer "NL-SBB Concepts and Services" query and the RONL
Business API Regelcatalogus "Begrippen" tab returned zero concepts for the
Thuisbatterij service until the queries were patched.

## Root cause

In `src/utils/ttlGenerator.js`:

- `generateConceptsSection()` (~line 1266) always writes
  `dct:subject <${serviceUri}/dmn/${concept.linkedTo}>` for every concept.
- The `cpsv:Input` / `cpsv:Output` nodes that give those URIs a
  `cpsv:isRequiredBy` / `cpsv:produces` edge to the DMN are only written by the
  DMN section (~lines 1174–1212) **when `extractInputsFromTestResult()` /
  `extractOutputsFromTestResult()` return rows** — i.e. only when a DMN test
  result was available at generation time. For this export they returned empty,
  so the edges were never emitted while the concepts still referenced them.

## Proposed fix (editor side)

Make the concept → DMN linkage self-describing regardless of test-result
availability. Options, roughly in order of preference:

1. **Always emit the variable node** for every `concept.linkedTo` the concepts
   section references — at minimum
   `<serviceUri/dmn/input/N> a cpsv:Input ; cpsv:isRequiredBy <dmnUri> .`
   (and `cpsv:Output` / `cpsv:produces` for outputs) — driven by the concept
   list, not by the test result. Enrich with `dct:identifier`/`schema:value`
   when a test result *is* present.
2. Alternatively, point `dct:subject` straight at the DMN
   (`<serviceUri/dmn>`), or add a direct `cprmv`/`cpsv` edge from the concept to
   the DMN, so no intermediate variable node is required.

Keep the emitted `dct:subject` URI shape stable (`…/dmn/input|output/N`) if
possible so existing consumers keep working.

## Current workaround (already shipped, so this is not urgent)

The consuming SPARQL queries were patched to derive the DMN URI from the variable
URI when the explicit edge is absent:

```sparql
OPTIONAL { ?variable cpsv:isRequiredBy ?dmnRequired . }
OPTIONAL { ?variable cpsv:produces    ?dmnProduced . }
BIND(IRI(REPLACE(STR(?variable), "/(input|output)/[0-9]+$", "")) AS ?dmnFromUri)
BIND(COALESCE(?dmnRequired, ?dmnProduced, ?dmnFromUri) AS ?dmn)
{ ?dmn cprmv:implements ?service } UNION { ?dmn cprmv041:implements ?service }
```

Patched in:
- `linked-data-explorer` → `packages/frontend/src/utils/constants.ts`
  ("NL-SBB Concepts and Services")
- `ronl-business-api` → `packages/backend/src/services/regelcatalogus.service.ts`
  (`fetchConcepts`) and `packages/backend/src/mcp-servers/triplydb/index.ts`
  (`conceptListQuery`)

Fixing the editor to emit the variable nodes would let those queries fall back to
the explicit, more robust edge instead of relying on URI-string derivation.

## Acceptance criteria

- A fresh export of the Thuisbatterij service (with **no** DMN test result loaded)
  contains, for every concept, a variable node with a `cpsv:isRequiredBy` or
  `cpsv:produces` edge to the DMN.
- Traversing `concept → dct:subject → variable → (isRequiredBy|produces) → dmn`
  reaches the DMN without relying on URI-string parsing.
- Existing exports/consumers are unaffected (URI shape unchanged).
