// Tests for the citation stub minted alongside cell-level grounding —
// ttlGenerator's citedUri(), see ttlGenerator.cellGrounding.test.js for the
// grounding itself.
//
// cprmv:isBasedOn carries sh:class cprmv:Rule in RuleShape, so its object must
// be typed. For an external citation (wetten.overheid.nl, CVDR) this graph
// describes nothing else, so a minimal stub is minted with the URI itself as
// cprmv:id — there is no better identifier available.
//
// That is wrong when the target is a rule THIS DOCUMENT already emits in its
// CPRMV Rules section: the subject is typed there, with a real cprmv:id, and
// the stub contradicts it. Observed in
// examples/organizations/szw/Normenbrief---Informatie-voor-gemeenten.ttl, where
// 12 subjects ended up with two conflicting cprmv:id values. See issue #116.
//
// That file has since been re-exported through the fixed generator, so the
// tests below assert it is clean rather than reproducing the defect from it.
// The regeneration test is what actually proves the fix: it reparses the file's
// published rules back into generator state and re-runs the generator, so it
// holds regardless of whether the committed artefact happens to be buggy.

import fs from 'fs';
import path from 'path';

import { TTLGenerator } from './ttlGenerator';

// The rule this service publishes itself, and the URI ttlGenerator derives for
// it via sanitizeRuleIdPath (", " -> "_", spaces -> "-", periods removed).
const PUBLISHED_RULE = {
  ruleId: 'onderdeel a.',
  rulesetId: 'BWBR0015703',
  definition: 'een alleenstaande of een alleenstaande ouder: € 1.419,46;',
  situatie: 'een alleenstaande of een alleenstaande ouder',
  norm: '1.419,46',
  ruleIdPath: 'BWBR0015703_2026-07-01_0, Artikel 21, onderdeel a.',
};
const PUBLISHED_URI =
  'https://cprmv.open-regels.nl/rules/BWBR0015703_2026-07-01_0_Artikel-21_onderdeel-a';

// An external citation, which must keep its stub — nothing else in the graph
// types it.
const EXTERNAL_URI = 'https://lokaleregelgeving.overheid.nl/CVDR645454/12';

const dmn = (isBasedOn) => `<?xml version="1.0"?>
  <definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
               xmlns:cprmv="https://standaarden.open-regels.nl/standards/cprmv/0.4.1#"
               xmlns:dct="http://purl.org/dc/terms/">
    <decision id="d1">
      <decisionTable id="table1">
        <rule id="rule1">
          <outputEntry id="oe1"
                       cprmv:sourceQuote="een alleenstaande of een alleenstaande ouder"
                       cprmv:isBasedOn="${isBasedOn}">
            <text>1419.46</text>
          </outputEntry>
        </rule>
      </decisionTable>
    </decision>
  </definitions>`;

const gen = ({ isBasedOn, cprmvRules }) =>
  new TTLGenerator({
    service: { identifier: 'citation-stub-test', name: 'Citation stub test' },
    organization: {},
    legalResource: {},
    temporalRules: [],
    parameters: [],
    cprmvRules,
    cost: {},
    output: {},
    concepts: [],
    dmnData: { content: dmn(isBasedOn), fileName: 'test.dmn', decisionKey: 'd1' },
  });

/** Every cprmv:id asserted about one subject, across the whole document. */
const idsFor = (ttl, subjectUri) => {
  const blocks = ttl.split(/\n(?=<)/);
  return blocks
    .filter((b) => b.startsWith(`<${subjectUri}>`))
    .flatMap((b) => [...b.matchAll(/cprmv:id\s+"([^"]*)"/g)].map((m) => m[1]));
};

describe('citation stubs for cell groundings', () => {
  test('a citation pointing at a rule this document publishes gets no stub', () => {
    const ttl = gen({ isBasedOn: PUBLISHED_URI, cprmvRules: [PUBLISHED_RULE] }).generate();

    // The grounding itself still points there.
    expect(ttl).toContain(`cprmv:isBasedOn <${PUBLISHED_URI}>`);

    // ...and the subject keeps exactly one cprmv:id: its real one.
    expect(idsFor(ttl, PUBLISHED_URI)).toEqual(['onderdeel a.']);
  });

  test('an external citation still gets its stub, so sh:class is satisfied', () => {
    const ttl = gen({ isBasedOn: EXTERNAL_URI, cprmvRules: [PUBLISHED_RULE] }).generate();

    expect(ttl).toContain(`<${EXTERNAL_URI}> a cprmv:Rule ;`);
    expect(idsFor(ttl, EXTERNAL_URI)).toEqual([EXTERNAL_URI]);
  });

  test('a citation matching a rule the Rules section SKIPS still gets its stub', () => {
    // generateCprmvRulesSection only emits a rule carrying at least one of
    // ruleId / rulesetId / definition. A rule with none of them is silently
    // skipped, so nothing types its URI — suppressing the stub there would
    // leave cprmv:isBasedOn pointing at an untyped subject and break sh:class.
    const skipped = { ruleIdPath: PUBLISHED_RULE.ruleIdPath };
    const ttl = gen({ isBasedOn: PUBLISHED_URI, cprmvRules: [skipped] }).generate();

    expect(ttl).toContain(`<${PUBLISHED_URI}> a cprmv:Rule ;`);
    expect(idsFor(ttl, PUBLISHED_URI)).toEqual([PUBLISHED_URI]);
  });

  test('with no published rules at all, every citation keeps its stub', () => {
    const ttl = gen({ isBasedOn: PUBLISHED_URI, cprmvRules: [] }).generate();

    expect(ttl).toContain(`<${PUBLISHED_URI}> a cprmv:Rule ;`);
    expect(idsFor(ttl, PUBLISHED_URI)).toEqual([PUBLISHED_URI]);
  });
});

// The case the issue was actually reported from: the real SZW normenbrief
// service, whose 216 published rules and grounded DMN land in one document. The
// synthetic tests above pin the rule; this one pins the artefact.
describe('the real SZW normenbrief export', () => {
  const root = (p) => path.resolve(process.cwd(), p);
  const publishedTtl = fs.readFileSync(
    root('examples/organizations/szw/Normenbrief---Informatie-voor-gemeenten.ttl'),
    'utf8'
  );
  const dmnContent = fs.readFileSync(
    root('examples/organizations/szw/PW-normbedragen.dmn'),
    'utf8'
  );

  /** Read the published CPRMV Rules back out as cprmvRules state. */
  const publishedRules = () => {
    const block =
      /<https:\/\/cprmv\.open-regels\.nl\/rules\/[^>]+> a cprmv:Rule ;([\s\S]*?)\.\s*\n/g;
    const field = (body, prop) => {
      const m = new RegExp(`cprmv:${prop}\\s+"([^"]*)"`).exec(body);
      return m ? m[1] : undefined;
    };
    return [...publishedTtl.matchAll(block)]
      .map(([, body]) => ({
        ruleId: field(body, 'id'),
        rulesetId: field(body, 'rulesetId'),
        definition: field(body, 'definition'),
        situatie: field(body, 'situatie'),
        norm: field(body, 'norm'),
        ruleIdPath: field(body, 'ruleIdPath'),
      }))
      .filter((r) => r.ruleIdPath);
  };

  const regenerate = () =>
    new TTLGenerator({
      service: { identifier: 'normbedragen-jul26-041', name: 'Normenbrief' },
      organization: {},
      legalResource: { identifier: 'BWBR0015703' },
      temporalRules: [],
      parameters: [],
      cprmvRules: publishedRules(),
      cost: {},
      output: {},
      concepts: [],
      dmnData: {
        content: dmnContent,
        fileName: 'PW-normbedragen.dmn',
        decisionKey: 'pw-normbedragen',
      },
    }).generate();

  /** subject -> set of cprmv:id values asserted about it. */
  const idsBySubject = (ttl) => {
    const map = new Map();
    for (const block of ttl.split(/\n(?=<)/)) {
      const subject = /^<([^>]+)>/.exec(block);
      if (!subject) continue;
      const ids = [...block.matchAll(/cprmv:id\s+"([^"]*)"/g)].map((m) => m[1]);
      if (!ids.length) continue;
      if (!map.has(subject[1])) map.set(subject[1], new Set());
      ids.forEach((id) => map.get(subject[1]).add(id));
    }
    return map;
  };

  test('the committed export carries no conflicting ids', () => {
    // It carried 12 when #116 was reported, all under BWBR0015703's 2026-07-01
    // articles. The file was re-exported through the fixed generator, so this
    // now guards the artefact rather than the defect: a future export made with
    // a regressed generator, or hand-edited, fails here.
    const conflicts = [...idsBySubject(publishedTtl)].filter(([, ids]) => ids.size > 1);
    expect(conflicts).toEqual([]);
  });

  test('its 2026-07-01 rules keep their real cprmv:id, not their URI', () => {
    // The specific loss #116 described: the stub overwrote "onderdeel a." with
    // the subject's own URI. Asserting the surviving value, so a regression
    // cannot pass merely by emitting one id.
    const ids = idsBySubject(publishedTtl).get(PUBLISHED_URI);
    expect([...(ids ?? [])]).toEqual(['onderdeel a.']);
  });

  test('regenerating it now yields no subject with two cprmv:id values', () => {
    const conflicts = [...idsBySubject(regenerate())].filter(([, ids]) => ids.size > 1);
    expect(conflicts).toEqual([]);
  });

  test('the grounding and the external-citation stubs both survive', () => {
    const ttl = regenerate();

    // All 80 groundings still emitted...
    expect((ttl.match(/cprmv:sourceQuote /g) || []).length).toBe(80);

    // ...and the two termijnen with no published rule set here still get their
    // stubs, because nothing else in this document types those URIs.
    expect(ttl).toContain(
      '<https://cprmv.open-regels.nl/rules/BWBR0015703_2025-07-01_0_Artikel-21_onderdeel-a> a cprmv:Rule ;'
    );
    expect(ttl).toContain(
      '<https://cprmv.open-regels.nl/rules/BWBR0015703_2026-01-01_0_Artikel-21_onderdeel-a> a cprmv:Rule ;'
    );
    // The 2026-07-01 one is published above, so it must NOT be stubbed.
    expect(ttl).not.toContain(`<${PUBLISHED_URI}> a cprmv:Rule ;\n    cprmv:id "${PUBLISHED_URI}"`);
  });
});
