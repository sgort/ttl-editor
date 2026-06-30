// cprmvImport.js — map CPRMV Rules API JSON into the editor's flat rule model.
//
// The 0.4.1 API returns an array of cprmv:RuleSet objects, each with a
// `…#hasPart` object-map (keyed by rule id) of cprmv:Rule objects, which may
// themselves nest a `…#hasPart`. Rule fields live under the standards namespace
// (`id`, `definition`) plus a set of extension predicates under
// `http://cprmv.open-regels.nl/` (`situatie`, `norm`, `rulesetid`, `rule_id_path`).
//
// Older payloads are tolerated: the 0.4.1 "slash" namespace, the 0.3.0 namespace,
// `contains` instead of `hasPart`, and a flat array of rule objects (the legacy
// cprmv-example.json shape).

const TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

// Standards namespaces, newest first.
const STD_NS = [
  'https://standaarden.open-regels.nl/standards/cprmv/0.4.1#',
  'https://standaarden.open-regels.nl/standards/cprmv/0.4.1/#',
  'https://cprmv.open-regels.nl/0.3.0/',
];

// Extension predicates namespace (situatie / norm / rulesetid / rule_id_path / …).
const EXT_NS = 'http://cprmv.open-regels.nl/';

// Read a standards-namespace field (e.g. "id", "definition") trying each known
// namespace, then a bare key.
const stdField = (obj, local) => {
  for (const ns of STD_NS) {
    if (obj[ns + local] != null) return obj[ns + local];
  }
  return obj[local];
};

// Read an extension/loose field, e.g. "situatie" → http://cprmv.open-regels.nl/situatie,
// also accepting a bare or camelCase key.
const looseField = (obj, ...locals) => {
  for (const local of locals) {
    if (obj[EXT_NS + local] != null) return obj[EXT_NS + local];
    if (obj[local] != null) return obj[local];
  }
  return undefined;
};

// The hasPart / contains object-map, under any known namespace.
const hasPartOf = (obj) => {
  for (const ns of STD_NS) {
    if (obj[ns + 'hasPart'] && typeof obj[ns + 'hasPart'] === 'object') return obj[ns + 'hasPart'];
    if (obj[ns + 'contains'] && typeof obj[ns + 'contains'] === 'object')
      return obj[ns + 'contains'];
  }
  if (obj.hasPart && typeof obj.hasPart === 'object') return obj.hasPart;
  if (obj.contains && typeof obj.contains === 'object') return obj.contains;
  return null;
};

const asString = (v) => (v == null ? '' : String(v));

/**
 * Flatten CPRMV Rules API JSON into the editor's flat cprmvRules array.
 * Nested sub-rules are flattened into their own entries (the editor model is flat).
 *
 * @param {Array|Object} jsonData parsed API output
 * @returns {Array<{id,ruleId,rulesetId,definition,situatie,norm,ruleIdPath}>}
 */
export const flattenCprmvRules = (jsonData) => {
  const out = [];
  let seq = 0;
  const base = Date.now();

  const visitRule = (key, ruleObj, inheritedRulesetId = '') => {
    if (!ruleObj || typeof ruleObj !== 'object') return;
    // Nested sub-rules often carry only id + definition; inherit the parent's
    // rulesetId so they group under the same RuleSet on export.
    const rulesetId = asString(looseField(ruleObj, 'rulesetid', 'rulesetId')) || inheritedRulesetId;
    out.push({
      id: base + seq++,
      ruleId: asString(stdField(ruleObj, 'id') ?? key),
      rulesetId,
      definition: asString(stdField(ruleObj, 'definition')),
      situatie: asString(looseField(ruleObj, 'situatie')),
      norm: asString(looseField(ruleObj, 'norm')),
      ruleIdPath: asString(looseField(ruleObj, 'rule_id_path', 'ruleIdPath')),
    });
    const nested = hasPartOf(ruleObj);
    if (nested) Object.entries(nested).forEach(([k, v]) => visitRule(k, v, rulesetId));
  };

  const visitEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return;
    const type = asString(entry[TYPE]);
    const parts = hasPartOf(entry);
    if (type.endsWith('RuleSet') && parts) {
      // RuleSet wrapper — its members are the rules.
      Object.entries(parts).forEach(([k, v]) => visitRule(k, v));
    } else {
      // The entry is itself a rule (single rule, or legacy flat-array element).
      visitRule(null, entry);
    }
  };

  (Array.isArray(jsonData) ? jsonData : [jsonData]).forEach(visitEntry);
  return out;
};

export default flattenCprmvRules;
