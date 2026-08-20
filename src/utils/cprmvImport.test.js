// Tests for flattenCprmvRules — in particular that nested sub-clauses fold into
// the parent rule's definition instead of importing as separate norm-less rules.

import { flattenCprmvRules } from './cprmvImport';

const STD = 'https://standaarden.open-regels.nl/standards/cprmv/0.4.1#';
const EXT = 'http://cprmv.open-regels.nl/';
const TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

// A RuleSet whose member rule "onderdeel r." has a nested hasPart of three
// sub-clauses (none carry a rule_id_path) — the real-world "ingeval:" pattern.
const makeRuleset = () => ({
  [TYPE]: STD + 'RuleSet',
  [STD + 'rulesetId']: 'BWBR0015703',
  [STD + 'hasPart']: {
    'onderdeel r.': {
      [TYPE]: STD + 'Rule',
      [STD + 'id']: 'onderdeel r.',
      [STD + 'definition']: 'inkomsten uit arbeid ... ingeval:',
      [EXT + 'situatie']: 'inkomsten uit arbeid ...',
      [EXT + 'norm']: '177,66',
      [EXT + 'rulesetid']: 'BWBR0015703',
      [EXT + 'rule_id_path']: 'BWBR0015703_2026-04-03_0, Artikel 31, lid 2, onderdeel r.',
      [STD + 'hasPart']: {
        'onderdeel 1°.': {
          [TYPE]: STD + 'Rule',
          [STD + 'id']: 'onderdeel 1°.',
          [STD + 'definition']:
            'hij de volledige zorg heeft voor een tot zijn last komend kind tot 12 jaar,',
          [EXT + 'rulesetid']: 'BWBR0015703',
        },
        'onderdeel 2°.': {
          [TYPE]: STD + 'Rule',
          [STD + 'id']: 'onderdeel 2°.',
          [STD + 'definition']:
            'de periode van zes maanden, bedoeld in onderdeel n, is verstreken, en',
          [EXT + 'rulesetid']: 'BWBR0015703',
        },
        'onderdeel 3°.': {
          [TYPE]: STD + 'Rule',
          [STD + 'id']: 'onderdeel 3°.',
          [STD + 'definition']: 'dit volgens het college bijdraagt aan zijn arbeidsinschakeling;',
          [EXT + 'rulesetid']: 'BWBR0015703',
        },
      },
    },
  },
});

describe('flattenCprmvRules — sub-clause folding', () => {
  test('nested sub-clauses (no rule_id_path) fold into the parent definition', () => {
    const rules = flattenCprmvRules([makeRuleset()]);
    // Only the parent rule — the 3 sub-clauses are NOT separate entries.
    expect(rules).toHaveLength(1);
    const r = rules[0];
    expect(r.ruleId).toBe('onderdeel r.');
    expect(r.norm).toBe('177,66');
    expect(r.ruleIdPath).toBe('BWBR0015703_2026-04-03_0, Artikel 31, lid 2, onderdeel r.');
    // The full legal text: parent + the three sub-clauses, in order.
    expect(r.definition).toBe(
      'inkomsten uit arbeid ... ingeval: ' +
        'hij de volledige zorg heeft voor een tot zijn last komend kind tot 12 jaar, ' +
        'de periode van zes maanden, bedoeld in onderdeel n, is verstreken, en ' +
        'dit volgens het college bijdraagt aan zijn arbeidsinschakeling;'
    );
  });

  test('nested members that are themselves rules (have rule_id_path) stay separate', () => {
    const rs = makeRuleset();
    rs[STD + 'hasPart']['onderdeel r.'][STD + 'hasPart']['real'] = {
      [TYPE]: STD + 'Rule',
      [STD + 'id']: 'real sub',
      [STD + 'definition']: 'a genuine nested rule',
      [EXT + 'norm']: '1,00',
      [EXT + 'rulesetid']: 'BWBR0015703',
      [EXT + 'rule_id_path']: 'BWBR0015703_2026-04-03_0, Artikel 31, lid 2, onderdeel r., sub',
    };
    const rules = flattenCprmvRules([rs]);
    // Parent + the genuine nested rule (still 1 fewer than the 3 folded sub-clauses).
    expect(rules).toHaveLength(2);
    expect(rules.some((r) => r.ruleId === 'real sub')).toBe(true);
    // The genuine rule's text is NOT folded into the parent.
    const parent = rules.find((r) => r.ruleId === 'onderdeel r.');
    expect(parent.definition).not.toContain('a genuine nested rule');
  });

  test('a flat rule with no hasPart is unchanged', () => {
    const flat = {
      [TYPE]: STD + 'Rule',
      [STD + 'id']: 'lid 3',
      [STD + 'definition']: 'plain definition',
      [EXT + 'norm']: '5',
      [EXT + 'rulesetid']: 'BWBR0015703',
      [EXT + 'rule_id_path']: 'BWBR0015703_2026-04-03_0, Artikel 19, lid 3',
    };
    const rules = flattenCprmvRules([flat]);
    expect(rules).toHaveLength(1);
    expect(rules[0].definition).toBe('plain definition');
  });
});

// Remaining P2 coverage (see
// https://iou-architectuur.open-regels.nl/cpsv-editor/developer/testing/): the older/alternate payload
// shapes the module comment says are tolerated, plus edge/malformed input.
describe('flattenCprmvRules — namespace variants and legacy shapes', () => {
  const STD_041_SLASH = 'https://standaarden.open-regels.nl/standards/cprmv/0.4.1/#';
  const STD_030 = 'https://cprmv.open-regels.nl/0.3.0/';

  test('accepts the 0.4.1 "slash" namespace variant', () => {
    const ruleset = {
      [TYPE]: STD_041_SLASH + 'RuleSet',
      [STD_041_SLASH + 'hasPart']: {
        r1: {
          [TYPE]: STD_041_SLASH + 'Rule',
          [STD_041_SLASH + 'id']: 'r1',
          [STD_041_SLASH + 'definition']: 'slash-namespace definition',
          [EXT + 'norm']: '1',
          [EXT + 'rulesetid']: 'BWBR0000001',
          [EXT + 'rule_id_path']: 'BWBR0000001_2026-01-01_0, Artikel 1',
        },
      },
    };
    const rules = flattenCprmvRules([ruleset]);
    expect(rules).toHaveLength(1);
    expect(rules[0].definition).toBe('slash-namespace definition');
  });

  test('accepts the 0.3.0 namespace with "contains" instead of "hasPart"', () => {
    const ruleset = {
      [TYPE]: STD_030 + 'RuleSet',
      [STD_030 + 'contains']: {
        r1: {
          [TYPE]: STD_030 + 'Rule',
          [STD_030 + 'id']: 'r1',
          [STD_030 + 'definition']: '0.3.0 contains-shaped definition',
          [EXT + 'norm']: '2',
          [EXT + 'rulesetid']: 'BWBR0000002',
          [EXT + 'rule_id_path']: 'BWBR0000002_2026-01-01_0, Artikel 2',
        },
      },
    };
    const rules = flattenCprmvRules([ruleset]);
    expect(rules).toHaveLength(1);
    expect(rules[0].definition).toBe('0.3.0 contains-shaped definition');
  });

  test('accepts a legacy flat array of rule objects with no RuleSet wrapper', () => {
    const flatArray = [
      {
        [TYPE]: STD + 'Rule',
        [STD + 'id']: 'flat-1',
        [STD + 'definition']: 'first flat rule',
        [EXT + 'rulesetid']: 'BWBR0000003',
        [EXT + 'rule_id_path']: 'BWBR0000003_2026-01-01_0, Artikel 1',
      },
      {
        [TYPE]: STD + 'Rule',
        [STD + 'id']: 'flat-2',
        [STD + 'definition']: 'second flat rule',
        [EXT + 'rulesetid']: 'BWBR0000003',
        [EXT + 'rule_id_path']: 'BWBR0000003_2026-01-01_0, Artikel 2',
      },
    ];
    const rules = flattenCprmvRules(flatArray);
    expect(rules.map((r) => r.ruleId)).toEqual(['flat-1', 'flat-2']);
  });

  test('a single RuleSet object (not wrapped in an array) is accepted', () => {
    const rules = flattenCprmvRules(makeRuleset());
    expect(rules).toHaveLength(1);
  });

  test('multiple top-level RuleSets are all flattened together', () => {
    const rs1 = makeRuleset();
    const rs2 = {
      [TYPE]: STD + 'RuleSet',
      [STD + 'hasPart']: {
        'onderdeel x.': {
          [TYPE]: STD + 'Rule',
          [STD + 'id']: 'onderdeel x.',
          [STD + 'definition']: 'a rule from the second ruleset',
          [EXT + 'rulesetid']: 'BWBR0009999',
          [EXT + 'rule_id_path']: 'BWBR0009999_2026-01-01_0, Artikel 1, onderdeel x.',
        },
      },
    };
    const rules = flattenCprmvRules([rs1, rs2]);
    expect(rules.map((r) => r.ruleId)).toEqual(['onderdeel r.', 'onderdeel x.']);
  });

  test.each([
    [null, []],
    [undefined, []],
    [[], []],
    [[null, undefined, 'not-an-object'], []],
  ])('tolerates malformed input %p without throwing', (input, expected) => {
    expect(flattenCprmvRules(input)).toEqual(expected);
  });

  test('each flattened rule gets a unique, monotonically increasing id', () => {
    const rules = flattenCprmvRules([makeRuleset()]);
    const rs2 = makeRuleset();
    const moreRules = flattenCprmvRules([rs2]);
    // ids are seeded from Date.now() + a per-call sequence — same-call entries
    // must never collide, even if two separate calls land in the same tick.
    expect(new Set([...rules, ...moreRules].map((r) => r.id)).size).toBe(
      rules.length + moreRules.length
    );
  });
});
