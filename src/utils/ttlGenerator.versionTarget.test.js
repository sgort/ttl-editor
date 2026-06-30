// Tests for the CPRMV target-version selector: 0.4.1 (RuleSet/hasPart model,
// standaarden namespace) vs 0.3.2 (flat cprmv:Rule + cprmv:Dataset model,
// cprmv.open-regels.nl/0.3.2/ namespace). See generateNamespaces,
// generateDatasetsSection and the wrapper-section gating in ttlGenerator.js.

import { TTLGenerator } from './ttlGenerator';

const cprmvRules = [
  {
    ruleId: 'onderdeel a.',
    rulesetId: 'BWBR0015703',
    definition: 'een alleenstaande: € 345,99;',
    situatie: 'een alleenstaande',
    norm: '345,99',
    ruleIdPath: 'BWBR0015703_2026-04-03_0, Artikel 20, lid 1, onderdeel a.',
  },
  {
    ruleId: 'onderdeel c.',
    rulesetId: 'BWBR0044894',
    definition: '19-jarigen: € 231,09;',
    norm: '231,09',
    ruleIdPath: 'BWBR0044894_2026-01-01_0, Artikel 7a., onderdeel c.',
  },
];

const baseState = {
  service: { identifier: 'normbedragen-jul26-test' },
  legalResource: { bwbId: 'BWBR0015703', version: '2026-03-04', title: 'Participatiewet' },
  cprmvRules,
};

const gen = (version) => new TTLGenerator({ ...baseState, cprmvVersion: version });

describe('CPRMV target-version selector', () => {
  test('defaults to 0.4.1 when unset, binding the standaarden namespace', () => {
    const ns = new TTLGenerator(baseState).generateNamespaces();
    expect(ns).toContain(
      '@prefix cprmv: <https://standaarden.open-regels.nl/standards/cprmv/0.4.1#> .'
    );
  });

  test('0.3.2 binds the versioned-path namespace the LDE flat query expects', () => {
    const ns = gen('0.3.2').generateNamespaces();
    expect(ns).toContain('@prefix cprmv: <https://cprmv.open-regels.nl/0.3.2/> .');
    expect(ns).not.toContain('standards/cprmv/0.4.1#');
  });

  test('0.3.2 emits a cprmv:Dataset per ruleset with the rules-derived dcat:version', () => {
    const ds = gen('0.3.2').generateDatasetsSection();
    // Primary ruleset: dated from its rules (2026-04-03), titled, NOT the manual 2026-03-04.
    expect(ds).toContain(
      '<https://cprmv.open-regels.nl/datasets/BWBR0015703_2026-04-03> a cprmv:Dataset, dcat:Dataset'
    );
    expect(ds).toContain('dcat:version "2026-04-03"');
    expect(ds).toContain('dct:title "Participatiewet"@nl');
    // Non-primary ruleset: dated from its own rules, no title.
    expect(ds).toContain('<https://cprmv.open-regels.nl/datasets/BWBR0044894_2026-01-01>');
    expect(ds).toContain('dcat:version "2026-01-01"');
    expect(ds).toContain('dct:issued "');
    expect(ds).not.toContain('2026-03-04');
  });

  test('flat cprmv:Rule section carries the predicates the LDE flat query reads', () => {
    const flat = gen('0.3.2').generateCprmvRulesSection();
    expect(flat).toContain('a cprmv:Rule');
    expect(flat).toContain('cprmv:rulesetId "BWBR0015703"');
    expect(flat).toContain(
      'cprmv:ruleIdPath "BWBR0015703_2026-04-03_0, Artikel 20, lid 1, onderdeel a."'
    );
    expect(flat).toContain('cprmv:norm "345,99"');
  });

  test('0.4.1 still emits the RuleSet wrapper (regression)', () => {
    const rs = gen('0.4.1').generateRuleSetsSection();
    expect(rs).toContain('a cprmv:RuleSet');
    expect(rs).toContain('cprmv:hasPart (');
  });

  test('generate() picks the Dataset wrapper for 0.3.2 and RuleSet for 0.4.1', () => {
    const fullState = (version) =>
      new TTLGenerator({
        service: { identifier: 'normbedragen-jul26-test', name: 'Normenbrief' },
        organization: {},
        legalResource: { bwbId: 'BWBR0015703', version: '2026-03-04', title: 'Participatiewet' },
        ronlAnalysis: '',
        ronlMethod: '',
        temporalRules: [],
        parameters: [],
        cprmvRules,
        cost: {},
        output: {},
        dmnData: {},
        concepts: [],
        vendorService: {},
        cprmvVersion: version,
      });

    const ttl032 = fullState('0.3.2').generate();
    expect(ttl032).toContain('@prefix cprmv: <https://cprmv.open-regels.nl/0.3.2/> .');
    expect(ttl032).toContain('a cprmv:Dataset, dcat:Dataset');
    expect(ttl032).toContain('a cprmv:Rule');
    expect(ttl032).not.toContain('a cprmv:RuleSet');

    const ttl041 = fullState('0.4.1').generate();
    expect(ttl041).toContain('standards/cprmv/0.4.1#');
    expect(ttl041).toContain('a cprmv:RuleSet');
    expect(ttl041).not.toContain('a cprmv:Dataset');
  });
});
