/**
 * Namespace-agnostic element lookup for real-world DMN files.
 *
 * Every DMN authoring tool this project has seen in practice (Camunda Modeler,
 * iKnow) exports elements under a namespace prefix -- `<dmn:decisionTable>`,
 * `<dmn:rule>`, etc. An unprefixed CSS type selector (`querySelectorAll('rule')`)
 * silently matches nothing against a prefixed element: for non-HTML documents,
 * Selectors API type selectors match by (namespace, local name), and an
 * unprefixed selector implies the *null* namespace, not "any namespace" --
 * confirmed empirically in jsdom and consistent with the same behavior in real
 * browsers. `getElementsByTagNameNS('*', localName)` matches by local name
 * regardless of namespace/prefix, which is what every lookup below needs.
 *
 * @param {Element|Document} root
 * @param {string} localName
 * @returns {Element[]}
 */
function queryAllLocal(root, localName) {
  return Array.from(root.getElementsByTagNameNS('*', localName));
}

/** Single-result convenience wrapper around queryAllLocal. */
function queryLocal(root, localName) {
  return root.getElementsByTagNameNS('*', localName)[0] || null;
}

/**
 * Sanitizes a service identifier to create valid URIs
 * @param {string} identifier - Service identifier
 * @returns {string} - Sanitized identifier suitable for URIs
 */
export function sanitizeServiceIdentifier(identifier) {
  if (!identifier) return 'unknown-service';

  return identifier
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove any non-alphanumeric chars except hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Builds a proper service URI from an identifier
 * @param {string} identifier - Service identifier
 * @returns {string} - Complete service URI
 */
export function buildServiceUri(identifier) {
  const sanitized = sanitizeServiceIdentifier(identifier);
  return `https://regels.overheid.nl/services/${sanitized}`;
}

/**
 * Extract the primary decision key from DMN XML.
 *
 * Strategy:
 *  1. Skip constant parameters (p_* prefix) — they aren't testable decisions.
 *  2. Prefer a *root* decision: one that no other decision depends on via
 *     informationRequirement -> requiredDecision. This is the output decision
 *     of the DRD, not an intermediate one that just happens to appear first.
 *  3. If a DMN has several independent roots (e.g. a combined "Recht én Hoogte"
 *     model), document order breaks the tie — the user can override via the
 *     decision picker / Decision Key field.
 *  4. Fall back to the first decision if every decision is a constant.
 *
 * @param {string} dmnContent - Raw DMN XML
 * @returns {string} - Decision key (id attribute) or '' if none found
 */
export function extractPrimaryDecisionKey(dmnContent) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(dmnContent, 'text/xml');

    const decisionElements = queryAllLocal(xmlDoc, 'decision');
    const skippedConstants = decisionElements.filter((d) =>
      (d.getAttribute('id') || '').startsWith('p_')
    ).length;

    // Testable decisions = everything except p_* constants
    const testable = decisionElements.filter((d) => {
      const id = d.getAttribute('id');
      return id && !id.startsWith('p_');
    });

    if (testable.length === 0) {
      // Fallback: if all decisions are p_*, use the first one anyway
      const firstId = decisionElements[0]?.getAttribute('id');
      if (firstId) {
        console.warn(`[DMN] All decisions are constants (p_*), using first one: "${firstId}"`);
        return firstId;
      }
      return '';
    }

    // Ids that are required by another decision — these are NOT roots.
    const requiredIds = new Set();
    decisionElements.forEach((d) => {
      queryAllLocal(d, 'requiredDecision').forEach((rd) => {
        const ref = (rd.getAttribute('href') || '').replace(/^#/, '');
        if (ref) requiredIds.add(ref);
      });
    });

    const roots = testable.filter((d) => !requiredIds.has(d.getAttribute('id')));
    const chosen = (roots.length > 0 ? roots : testable)[0];
    const id = chosen.getAttribute('id');

    if (roots.length > 1) {
      console.warn(
        `[DMN] Multiple root decisions found (${roots
          .map((d) => d.getAttribute('id'))
          .join(', ')}); defaulting to "${id}" by document order. ` +
          `Use the decision picker to choose another.`
      );
    } else {
      console.log(
        `[DMN] Extracted primary decision key: "${id}" (skipped ${skippedConstants} p_* constant(s))`
      );
    }
    return id;
  } catch (err) {
    console.error('Error extracting decision key from DMN:', err);
  }
  return '';
}

/**
 * Extract input variables from test result data
 * @param {Object} dmnData - DMN metadata object with test results
 * @returns {Array} - Array of input objects {name, type, exampleValue}
 */
export function extractInputsFromTestResult(dmnData) {
  const inputs = [];

  // Try to parse the test body if it exists
  if (dmnData.testBody) {
    try {
      const testData =
        typeof dmnData.testBody === 'string' ? JSON.parse(dmnData.testBody) : dmnData.testBody;

      if (testData.variables) {
        Object.entries(testData.variables).forEach(([name, varData]) => {
          inputs.push({
            name: name,
            type: varData.type || 'String',
            exampleValue: varData.value,
          });
        });
      }
    } catch (err) {
      console.error('Error extracting inputs from test data:', err);
    }
  }

  return inputs;
}

/**
 * Extract output variables from DMN test result data
 * @param {Object} dmnData - DMN metadata object with test results
 * @returns {Array} - Array of output objects {name, type, exampleValue}
 */
export function extractOutputsFromTestResult(dmnData) {
  const outputs = [];

  if (!dmnData.lastTestResult) {
    return outputs;
  }

  try {
    const result = dmnData.lastTestResult;

    // Operaton returns outputs in two possible formats:
    // Format 1: Array of output objects
    // Format 2: Direct object with outputs

    if (Array.isArray(result)) {
      // Format 1: [{outputName: {value: X, type: Y}}]
      result.forEach((outputObj) => {
        Object.entries(outputObj).forEach(([name, varData]) => {
          outputs.push({
            name: name,
            type: varData.type || 'String',
            exampleValue: varData.value,
          });
        });
      });
    } else if (typeof result === 'object') {
      // Format 2: {outputName: {value: X, type: Y}}
      Object.entries(result).forEach(([name, varData]) => {
        if (varData && typeof varData === 'object' && 'value' in varData) {
          outputs.push({
            name: name,
            type: varData.type || 'String',
            exampleValue: varData.value,
          });
        }
      });
    }
  } catch (err) {
    console.error('Error extracting outputs from test result:', err);
  }

  return outputs;
}

/**
 * Map a DMN typeRef to Operaton's REST variable type naming, matching the
 * convention used elsewhere in this file/DMNTab.jsx (Boolean/Integer/Double/
 * Date, default String).
 */
function operatonTypeForTypeRef(typeRef) {
  switch ((typeRef || '').toLowerCase()) {
    case 'boolean':
      return 'Boolean';
    case 'integer':
    case 'long':
      return 'Integer';
    case 'number':
    case 'double':
    case 'decimal':
      return 'Double';
    case 'date':
      return 'Date';
    default:
      return 'String';
  }
}

/**
 * Extract a decision's declared output variable(s) directly from the DMN XML
 * (`<dmn:output name="..." typeRef="...">` inside its `<dmn:decisionTable>`),
 * independent of any live evaluate result.
 *
 * `extractOutputsFromTestResult` above can only discover output names/types
 * by inspecting what an evaluate call actually returned — which silently
 * yields nothing whenever the decision legitimately produces no matching row
 * (e.g. a `RULE ORDER` root with no catch-all rule, evaluated against a
 * baseline/disqualifying auto-generated request body). Unlike inputs — which
 * `generateRequestBodyFromDMN` already discovers by parsing `<dmn:inputData>`
 * directly, so they're unaffected by whether the decision matched anything —
 * outputs had no such XML-derived fallback. This closes that asymmetry.
 *
 * @param {string} dmnContent - Raw DMN XML content
 * @param {string} decisionKey - The `<dmn:decision id="...">` to look up
 * @returns {Array<{name: string, type: string}>}
 */
export function extractOutputsFromDMN(dmnContent, decisionKey) {
  if (!dmnContent || !decisionKey) return [];

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(dmnContent, 'text/xml');

    const decisions = queryAllLocal(xmlDoc, 'decision');
    const decision = decisions.find((d) => d.getAttribute('id') === decisionKey);
    if (!decision) return [];

    const outputs = queryAllLocal(decision, 'output');
    return outputs
      .map((o) => ({
        name: o.getAttribute('name') || o.getAttribute('label'),
        type: operatonTypeForTypeRef(o.getAttribute('typeRef')),
      }))
      .filter((o) => Boolean(o.name));
  } catch (err) {
    console.error('Error extracting outputs from DMN:', err);
    return [];
  }
}

/**
 * Extract cell-level legislative groundings from a DMN <inputEntry>/<outputEntry>
 * element's `dct:source` / `cprmv:sourceQuote` / `cprmv:isBasedOn` attributes.
 *
 * Supports both the unnumbered shorthand (exactly one grounding — the common
 * case) and the numbered attribute family (`dct:source1`, `cprmv:sourceQuote1`,
 * `cprmv:isBasedOn1`, `dct:source2`, ...) used for compound cells that need more
 * than one grounding — see cprmv-cell-level-linking-prototype.md, "Multiple
 * groundings per cell". No upper bound on the numbered form; scanning stops at
 * the first N with none of the three attributes present.
 *
 * @param {Element} entryEl - an <inputEntry> or <outputEntry> element
 * @returns {Array<{source: string|null, sourceQuote: string|null, isBasedOn: string|null}>}
 *   Empty array when the cell carries no grounding attributes at all — most
 *   cells (wildcards, cross-decision references with no annotation coverage)
 *   are rightfully ungrounded.
 */
function extractCellGroundings(entryEl) {
  const groundings = [];

  const push = (source, sourceQuote, isBasedOn) => {
    if (source || sourceQuote || isBasedOn) {
      groundings.push({
        source: source || null,
        sourceQuote: sourceQuote || null,
        isBasedOn: isBasedOn || null,
      });
    }
  };

  push(
    entryEl.getAttribute('dct:source'),
    entryEl.getAttribute('cprmv:sourceQuote'),
    entryEl.getAttribute('cprmv:isBasedOn')
  );

  for (let n = 1; ; n++) {
    const source = entryEl.getAttribute(`dct:source${n}`);
    const sourceQuote = entryEl.getAttribute(`cprmv:sourceQuote${n}`);
    const isBasedOn = entryEl.getAttribute(`cprmv:isBasedOn${n}`);
    if (!source && !sourceQuote && !isBasedOn) break;
    push(source, sourceQuote, isBasedOn);
  }

  return groundings;
}

/**
 * Extract one <inputEntry>/<outputEntry> cell: its own `id` (the stable per-cell
 * key a published TTL's cell URI is built from), its FEEL condition/value text,
 * and any cprmv groundings (see extractCellGroundings).
 *
 * @param {Element} entryEl - an <inputEntry> or <outputEntry> element
 * @returns {{id: string|null, text: string, groundings: Array}}
 */
function extractCell(entryEl) {
  const textEl = queryLocal(entryEl, 'text');
  return {
    id: entryEl.getAttribute('id') || null,
    text: textEl ? textEl.textContent : '',
    groundings: extractCellGroundings(entryEl),
  };
}

/**
 * Extracts rules from DMN content and generates TTL
 * @param {string} dmnContent - Raw DMN XML content
 * @param {string} serviceUri - URI of the service
 * @returns {Array} - Array of rule objects with TTL representation
 */
export function extractRulesFromDMN(dmnContent, serviceUri) {
  if (!dmnContent) return [];

  // Ensure serviceUri is properly formatted
  const cleanServiceUri = serviceUri.replace(/%20/g, '-').replace(/\s+/g, '-');
  const rules = [];

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(dmnContent, 'text/xml');

    // Extract decision tables
    const decisionTables = queryAllLocal(xmlDoc, 'decisionTable');

    decisionTables.forEach((table, tableIndex) => {
      const tableId = table.getAttribute('id') || `table-${tableIndex}`;

      // Get cprmv:rulesetType if available
      const rulesetType = table.getAttribute('cprmv:rulesetType') || 'decision-table';

      // Extract rules from the decision table
      const ruleElements = queryAllLocal(table, 'rule');

      ruleElements.forEach((rule, ruleIndex) => {
        const ruleId = rule.getAttribute('id') || `rule-${ruleIndex}`;
        const ruleUri = `${cleanServiceUri}/rules/${ruleId}`;

        // Extract CPRMV attributes
        const cprmvExtends = rule.getAttribute('cprmv:extends');
        const cprmvValidFrom = rule.getAttribute('cprmv:validFrom');
        const cprmvValidUntil = rule.getAttribute('cprmv:validUntil');
        const cprmvRuleType = rule.getAttribute('cprmv:ruleType') || 'decision-rule';
        const cprmvConfidence = rule.getAttribute('cprmv:confidence') || 'medium';
        const cprmvNote = rule.getAttribute('cprmv:note');

        // Extract input and output entries — cell-level id + FEEL text + any
        // cprmv groundings (inputEntries/outputEntries), plus the plain FEEL
        // text arrays (inputs/outputs) kept for backward compatibility.
        const inputEntries = queryAllLocal(rule, 'inputEntry').map(extractCell);
        const outputEntries = queryAllLocal(rule, 'outputEntry').map(extractCell);
        const inputs = inputEntries.map((c) => c.text);
        const outputs = outputEntries.map((c) => c.text);

        const ruleObj = {
          id: ruleId,
          uri: ruleUri,
          extends: cprmvExtends,
          validFrom: cprmvValidFrom,
          validUntil: cprmvValidUntil,
          ruleType: cprmvRuleType,
          confidence: cprmvConfidence,
          note: cprmvNote,
          inputs: inputs,
          outputs: outputs,
          inputEntries: inputEntries,
          outputEntries: outputEntries,
          tableId: tableId,
          rulesetType: rulesetType,
        };

        rules.push(ruleObj);
      });
    });
  } catch (error) {
    console.error('Error extracting rules from DMN:', error);
  }

  return rules;
}

/**
 * Validates DMN data before export
 * @param {Object} dmnData - DMN metadata object
 * @returns {Object} - Validation result {valid: boolean, errors: string[]}
 */
export function validateDMNData(dmnData) {
  const errors = [];

  if (!dmnData) {
    return { valid: true, errors: [] }; // DMN is optional
  }

  if (dmnData.fileName && !dmnData.content) {
    errors.push('DMN file name exists but content is missing');
  }

  if (dmnData.deployed && !dmnData.deploymentId) {
    errors.push('DMN is marked as deployed but has no deployment ID');
  }

  if (dmnData.content) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(dmnData.content, 'text/xml');
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        errors.push('DMN content is not valid XML');
      }
    } catch (error) {
      errors.push(`DMN validation error: ${error.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
}

/**
 * Generate NL-SBB compliant concept URI from variable name
 * @param {string} variableName - DMN variable name (e.g., "geboortedatumAanvrager")
 * @param {string} serviceIdentifier - Service identifier for scoping
 * @returns {string} - Concept URI
 */
export function generateConceptUri(variableName, serviceIdentifier) {
  const cleanServiceId = sanitizeServiceIdentifier(serviceIdentifier);
  return `https://regels.overheid.nl/concepts/${cleanServiceId}/${variableName}`;
}

/**
 * Generate human-readable concept label from variable name
 * Handles acronyms better (AOW stays together, not "A O W")
 * @param {string} variableName - Camel case variable name
 * @returns {string} - Spaced label
 */
export function generateConceptLabel(variableName) {
  // Split on capital letters but keep consecutive capitals together
  return variableName
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // Handle acronyms: "AOWDatum" → "AOW Datum"
    .replace(/([a-z\d])([A-Z])/g, '$1 $2') // Handle normal camelCase: "datumAanvrager" → "datum Aanvrager"
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Generate concept definition from variable context
 * @param {string} variableName - Variable name
 * @param {string} type - Variable type (String, Integer, Boolean)
 * @param {string} ioType - 'input' or 'output'
 * @returns {string} - Dutch definition
 */
export function generateConceptDefinition(variableName, type, ioType) {
  const label = generateConceptLabel(variableName);
  const typeMap = {
    String: 'tekstuele waarde',
    Integer: 'numerieke waarde',
    Boolean: 'ja/nee waarde',
    Date: 'datumwaarde',
  };
  const typeDescription = typeMap[type] || 'waarde';

  if (ioType === 'input') {
    return `${label} is een ${typeDescription} die als invoer dient voor de beslisregel.`;
  } else {
    return `${label} is een ${typeDescription} die als uitvoer wordt gegenereerd door de beslisregel.`;
  }
}

/**
 * Generate notation by taking first letter of each word in camelCase
 * Example: "geboortedatumAanvrager" → "GA"
 * Example: "AOWDatumPartner" → "AOWDP"
 * @param {string} variableName - Variable name
 * @param {string[]} existingNotations - Already used notations to avoid collisions
 * @returns {string} - Unique notation code
 */
export function generateConceptNotation(variableName, existingNotations = []) {
  // Split camelCase into words
  // Insert space before uppercase letters, then split
  const words = variableName
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // "AOWDatum" → "AOW Datum"
    .replace(/([a-z\d])([A-Z])/g, '$1 $2') // "datumAanvrager" → "datum Aanvrager"
    .split(' ')
    .filter((word) => word.length > 0); // Remove empty strings

  // Take first letter of each word
  let notation = words.map((word) => word.charAt(0).toUpperCase()).join('');

  // If notation is too short (1 char), use more letters
  if (notation.length === 1 && words.length === 1) {
    notation = words[0].substring(0, Math.min(4, words[0].length)).toUpperCase();
  }

  // If notation is too long (>6 chars), intelligently shorten
  if (notation.length > 6) {
    // Keep first word (max 3 chars) + first letter of remaining words
    const firstWord = words[0].substring(0, 3).toUpperCase();
    const restLetters = words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');
    notation = firstWord + restLetters;
  }

  // Handle collision by appending number
  let finalNotation = notation;
  let counter = 1;
  while (existingNotations.includes(finalNotation)) {
    finalNotation = `${notation}${counter}`;
    counter++;
  }

  return finalNotation;
}

/**
 * Coerce a raw token from an expected string into a JS scalar.
 * '...'/"..." -> string, true/false -> boolean, null -> null, numerics -> number.
 */
function coerceExpectedScalar(token) {
  const val = token.trim();
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    return val.slice(1, -1);
  }
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null') return null;
  if (val !== '' && !Number.isNaN(Number(val))) return Number(val);
  return val;
}

/**
 * Parse a human-readable expected string into an object of expected outputs.
 * Example: "rechtOpSubsidie=false, reden='Aanvrager is failliet'"
 *       -> { rechtOpSubsidie: false, reden: 'Aanvrager is failliet' }
 * Quoted values may contain commas; bare values may not. Returns {} if nothing
 * parseable is found.
 */
function parseExpectedString(expected) {
  if (typeof expected !== 'string' || !expected.trim()) return {};
  const out = {};
  const pair = /([A-Za-z_]\w*)\s*=\s*('[^']*'|"[^"]*"|[^,]+)/g;
  let m;
  while ((m = pair.exec(expected)) !== null) {
    out[m[1]] = coerceExpectedScalar(m[2]);
  }
  return out;
}

/**
 * Flatten an Operaton evaluate response into a { outputName: value } map.
 * The response is an array of result rows; each output is { type, value, valueInfo }.
 */
function flattenEngineOutputs(parsed) {
  if (!parsed) return null;
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  const flat = {};
  for (const row of rows) {
    if (row && typeof row === 'object') {
      for (const [k, v] of Object.entries(row)) {
        flat[k] = v && typeof v === 'object' && 'value' in v ? v.value : v;
      }
    }
  }
  return flat;
}

/** Compare two scalars tolerating string/number/boolean representation differences. */
function looseValueEqual(exp, act) {
  if (exp === act) return true;
  if (exp == null || act == null) return false;
  if (typeof exp === 'string' || typeof act === 'string') {
    return String(exp).trim() === String(act).trim();
  }
  return exp === act;
}

/**
 * Judge a test case by comparing its `expected` against the engine's actual output.
 *
 * @param {object|string} expected - structured outputs object, or a human-readable
 *   string like "rechtOpSubsidie=false, reden='Aanvrager is failliet'".
 * @param {*} parsed - the parsed Operaton evaluate response (array of result rows).
 * @returns {{verdict: 'pass'|'fail'|'unverified', mismatches: Array, actual: object|null}}
 *   - 'pass'       every expected output matches the actual value
 *   - 'fail'       at least one differs; `mismatches` lists {key, expected, actual}
 *   - 'unverified' no parseable expectation — only the HTTP call could be checked
 */
export function evaluateTestCaseExpectation(expected, parsed) {
  const actual = flattenEngineOutputs(parsed);

  // Cases that expect no matching rule (empty result set). This covers both a
  // descriptive expectation ("empty result", "no matching rule") and a literal
  // empty-collection value ("[]" or "{}") copied straight from the engine output.
  if (
    typeof expected === 'string' &&
    (/empty result|no matching rule/i.test(expected) || /^\s*(\[\s*\]|\{\s*\})\s*$/.test(expected))
  ) {
    const isEmpty = !actual || Object.keys(actual).length === 0;
    return {
      verdict: isEmpty ? 'pass' : 'fail',
      mismatches: isEmpty ? [] : [{ key: '(result set)', expected: 'empty', actual }],
      actual,
    };
  }

  const expectedObj =
    expected && typeof expected === 'object' ? expected : parseExpectedString(expected);

  if (!expectedObj || Object.keys(expectedObj).length === 0) {
    return { verdict: 'unverified', mismatches: [], actual };
  }

  const mismatches = [];
  for (const [key, exp] of Object.entries(expectedObj)) {
    const act = actual ? actual[key] : undefined;
    if (!looseValueEqual(exp, act)) {
      mismatches.push({ key, expected: exp, actual: act });
    }
  }
  return { verdict: mismatches.length === 0 ? 'pass' : 'fail', mismatches, actual };
}

// Default export object for convenience
const dmnHelpers = {
  evaluateTestCaseExpectation,
  extractPrimaryDecisionKey,
  extractRulesFromDMN,
  extractInputsFromTestResult,
  extractOutputsFromTestResult,
  extractOutputsFromDMN,
  validateDMNData,
  sanitizeServiceIdentifier,
  buildServiceUri,
  generateConceptUri,
  generateConceptLabel,
  generateConceptDefinition,
  generateConceptNotation,
};

export default dmnHelpers;
