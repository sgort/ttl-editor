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

// Module-level, never reset — two flattenCprmvRules() calls landing in the
// same millisecond (Date.now() alone isn't fine-grained enough) would
// otherwise mint identical `base + seq` ids, colliding as React keys if both
// calls' results end up merged into the same list.
let globalSeq = 0;

// Recursively collect the definitions of nested SUB-CLAUSES — hasPart members
// that are not themselves rules (they carry no rule_id_path), e.g. the
// "onderdeel 1°./2°./3°." enumeration nested under "Artikel 31, lid 2,
// onderdeel r.". The editor model is flat and these belong to the parent's
// text, so they are folded into the parent's definition instead of being
// imported as standalone, norm-less rules. Members that ARE rules in their own
// right (carry a rule_id_path) are skipped here and emitted separately by the
// caller. Joined with a single space; the source clauses keep their own
// trailing punctuation.
const subClauseText = (ruleObj) => {
  const nested = hasPartOf(ruleObj);
  if (!nested) return '';
  const parts = [];
  for (const sub of Object.values(nested)) {
    if (!sub || typeof sub !== 'object') continue;
    if (asString(looseField(sub, 'rule_id_path', 'ruleIdPath'))) continue;
    const def = asString(stdField(sub, 'definition'));
    if (def) parts.push(def);
    const deeper = subClauseText(sub);
    if (deeper) parts.push(deeper);
  }
  return parts.join(' ');
};

/**
 * Flatten CPRMV Rules API JSON into the editor's flat cprmvRules array.
 *
 * Nested members that are rules in their own right (carry a rule_id_path) become
 * their own entries. Nested SUB-CLAUSES (members without a rule_id_path — e.g.
 * the "onderdeel 1°./2°./3°." enumeration under "onderdeel r.") are folded into
 * their parent rule's definition rather than imported as separate norm-less
 * rules, so the parent keeps the complete legal text.
 *
 * @param {Array|Object} jsonData parsed API output
 * @returns {Array<{id,ruleId,rulesetId,definition,situatie,norm,ruleIdPath}>}
 */
export const flattenCprmvRules = (jsonData) => {
  const out = [];
  const base = Date.now();

  const visitRule = (key, ruleObj, inheritedRulesetId = '') => {
    if (!ruleObj || typeof ruleObj !== 'object') return;
    // Nested sub-rules often carry only id + definition; inherit the parent's
    // rulesetId so they group under the same RuleSet on export.
    const rulesetId = asString(looseField(ruleObj, 'rulesetid', 'rulesetId')) || inheritedRulesetId;
    // Fold nested sub-clauses (hasPart members without a rule_id_path) into this
    // rule's definition rather than importing them as separate, norm-less rules.
    let definition = asString(stdField(ruleObj, 'definition'));
    const extra = subClauseText(ruleObj);
    if (extra) definition = definition ? `${definition} ${extra}` : extra;
    out.push({
      id: base + globalSeq++,
      ruleId: asString(stdField(ruleObj, 'id') ?? key),
      rulesetId,
      definition,
      situatie: asString(looseField(ruleObj, 'situatie')),
      norm: asString(looseField(ruleObj, 'norm')),
      ruleIdPath: asString(looseField(ruleObj, 'rule_id_path', 'ruleIdPath')),
    });
    // Still recurse into nested members that ARE rules in their own right (carry
    // a rule_id_path); their own sub-clauses fold into them in turn. Plain
    // sub-clauses were already folded into `definition` above.
    const nested = hasPartOf(ruleObj);
    if (nested) {
      Object.entries(nested).forEach(([k, v]) => {
        if (v && typeof v === 'object' && asString(looseField(v, 'rule_id_path', 'ruleIdPath'))) {
          visitRule(k, v, rulesetId);
        }
      });
    }
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
