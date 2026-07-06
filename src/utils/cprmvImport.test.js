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
