// Regression tests for the date-axis derivation: the published consolidation
// date (eli:is_realized_by version + cprmv:RuleSet validFrom/id) must come from
// the BWB date the rules actually carry in their ruleIdPath, not the manually
// entered legalResource.version. See generateLegalResourceSection /
// generateRuleSetsSection in ttlGenerator.js.

import { TTLGenerator } from './ttlGenerator';

const baseState = {
  service: { identifier: 'normbedragen-jul26-test' },
  legalResource: { bwbId: 'BWBR0015703', version: '2026-03-04', title: 'Participatiewet' },
  cprmvRules: [
    {
      ruleId: 'onderdeel a.',
      rulesetId: 'BWBR0015703',
      definition: 'x',
      ruleIdPath: 'BWBR0015703_2026-04-03_0, Artikel 20, lid 1, onderdeel a.',
    },
    {
      ruleId: 'onderdeel c.',
      rulesetId: 'BWBR0044894',
      definition: 'y',
      ruleIdPath: 'BWBR0044894_2026-01-01_0, Artikel 7a., onderdeel c.',
    },
  ],
};

describe('ttlGenerator date-axis derivation', () => {
  test('eli:is_realized_by uses the rules BWB date, not the manual version', () => {
    const ttl = new TTLGenerator(baseState).generateLegalResourceSection();
    expect(ttl).toContain('eli:is_realized_by <https://wetten.overheid.nl/BWBR0015703/2026-04-03>');
    expect(ttl).not.toContain('/2026-03-04');
  });

  test('each RuleSet validFrom + id matches its own rules applicable_date', () => {
    const ttl = new TTLGenerator(baseState).generateRuleSetsSection();
    // Primary ruleset: 2026-04-03 (NOT the manual 2026-03-04)
    expect(ttl).toContain('cprmv:id "BWBR0015703_2026-04-03"');
    expect(ttl).toContain('cprmv:validFrom "2026-04-03"^^xsd:date');
    // Non-primary ruleset: now dated from its own rules (previously version-less)
    expect(ttl).toContain('cprmv:id "BWBR0044894_2026-01-01"');
    expect(ttl).toContain('cprmv:validFrom "2026-01-01"^^xsd:date');
    expect(ttl).not.toContain('2026-03-04');
  });

  test('falls back to the manual version when no rule carries a dated path', () => {
    const ttl = new TTLGenerator({
      ...baseState,
      cprmvRules: [{ ruleId: 'a', rulesetId: 'BWBR0015703', definition: 'x', ruleIdPath: '' }],
    }).generateLegalResourceSection();
    expect(ttl).toContain('eli:is_realized_by <https://wetten.overheid.nl/BWBR0015703/2026-03-04>');
  });
});
