// @vitest-environment node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from '@babel/parser';

/**
 * The four heavy tabs must stay code-split.
 *
 * ChangelogTab and CPRMVTab each import a large build-time JSON blob
 * (changelog.json ~158 kB and growing with every release, cprmv-example.json
 * ~69 kB); DMNTab and VendorTab are the two largest components. Splitting them
 * out took the entry chunk from 685.71 kB to 392.74 kB (176.58 → 104.71 kB
 * gzipped) and silenced the 500 kB warning.
 *
 * The split has two halves and BOTH are load-bearing:
 *
 *   1. App.jsx reaches each tab only through `lazy(() => import(…))`.
 *   2. components/tabs/index.js does not re-export them.
 *
 * Half 2 is the counter-intuitive one and the reason this file exists. A single
 * static re-export in the barrel pins the module into the entry chunk even
 * though App imports it dynamically — rolldown does not tree-shake it and says
 * INEFFECTIVE_DYNAMIC_IMPORT. Measured during this work: with ChangelogTab left
 * in the barrel, adding lazy() to App.jsx moved nothing at all (685.71 kB
 * before, 685.84 kB after). The app behaves identically either way, so no
 * behavioural test can notice; only a bundle measurement or this file can.
 *
 * Modelled on ronl-business-api's no-eager-changelog.test.ts, and parse-based
 * for the same reason: a regex cannot tell an import from the same words in a
 * comment, and components/tabs/index.js now names all four tabs in a comment
 * explaining why they are absent — which a grep-based guard would read as the
 * very violation it is warning about.
 *
 * These files are plain JSX with no type-only imports, so — unlike the RBA
 * original — every import here is a runtime edge and none needs exempting.
 *
 * ── Shape expectations ──
 *
 * Each lazy() call must be the initializer of a top-level `const`, with an
 * expression-bodied arrow: `const X = lazy(() => import('…'))`. Moving it inside
 * the component body would mint a fresh lazy type on every render and remount
 * the tab. Neither shape is required by React; they are required so this guard
 * can find the binding without a general-purpose control-flow analyser. If you
 * restructure and these fail for an unrelated reason, that is why.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const BARREL = join(HERE, 'index.js');
const APP = join(HERE, '..', '..', 'App.jsx');

/** Tabs App loads lazily. Add one here when you make another tab lazy. */
const LAZY_TABS = ['ChangelogTab', 'CPRMVTab', 'DMNTab', 'VendorTab'];

const BARREL_SPECIFIER = './components/tabs';
const tabModuleFromApp = (tab) => `./components/tabs/${tab}`;

const parseSource = (code) => parse(code, { sourceType: 'module', plugins: ['jsx'] });
const parseFile = (path) => parseSource(readFileSync(path, 'utf-8'));

/** Every module specifier this file depends on at runtime, with the names bound. */
function staticEdges(ast) {
  const edges = [];
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') {
      edges.push({
        source: node.source.value,
        names: node.specifiers.map((s) => (s.imported ? s.imported.name : s.local.name)),
      });
    } else if (
      (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') &&
      node.source
    ) {
      // A re-export with a module specifier is as static an edge as an import,
      // and is how the barrel would pull a tab back in without anything in this
      // directory ever writing the word `import`.
      edges.push({
        source: node.source.value,
        names: (node.specifiers ?? []).map((s) => (s.local ? s.local.name : '*')),
      });
    }
  }
  return edges;
}

/** Names bound as values by `import … from 'react'`. */
function reactBindings(ast) {
  const names = new Set();
  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration' || node.source.value !== 'react') continue;
    for (const s of node.specifiers) names.add(s.local.name);
  }
  return names;
}

/**
 * The specifier node of a dynamic import, or null when the node is not one.
 *
 * The two @babel/parser majors disagree on how they represent `import(…)`, and
 * both are in play here: v7 is what the repo pins, v8 is what Renovate proposes.
 *
 *   v7   CallExpression, callee.type 'Import', specifier in arguments[0]
 *   v8   ImportExpression (ESTree-aligned),    specifier in .source
 *
 * Everything else this file reads is identical across the two — ImportDeclaration,
 * ExportNamedDeclaration, ExportAllDeclaration and StringLiteral all keep their
 * shape — so this is the only place that needs to know.
 *
 * Recognising both matters more than it looks. Under v8 the v7-only predicate
 * matched nothing, so lazyBindings() found no bindings and strayDynamicImports()
 * found no strays: the guard could no longer see the thing it exists to check.
 * It failed loudly rather than passing vacuously, which is the good outcome and
 * not one to rely on — hence the fixtures at the bottom of this file, which pin
 * both shapes without needing either parser version installed.
 *
 * No argument-count check: v7 accepts `import(spec, options)` for import
 * attributes, and a two-argument dynamic import is still a dynamic import.
 */
const dynamicImportSpecifier = (node) => {
  if (!node || typeof node !== 'object') return null;
  if (node.type === 'ImportExpression') return node.source ?? null;
  if (node.type === 'CallExpression' && node.callee?.type === 'Import') {
    return node.arguments?.[0] ?? null;
  }
  return null;
};

/**
 * Top-level `const X = lazy(() => import('…'))` bindings, as name → specifier.
 * Also returns the CallExpression nodes so stray dynamic imports can exclude them.
 */
function lazyBindings(ast) {
  const react = reactBindings(ast);
  const bindings = new Map();
  const sanctioned = new Set();
  for (const node of ast.program.body) {
    if (node.type !== 'VariableDeclaration') continue;
    for (const decl of node.declarations) {
      const init = decl.init;
      if (init?.type !== 'CallExpression') continue;
      if (init.callee.type !== 'Identifier' || !react.has(init.callee.name)) continue;
      if (init.arguments.length !== 1) continue;
      const arrow = init.arguments[0];
      if (arrow.type !== 'ArrowFunctionExpression') continue;
      const specifier = dynamicImportSpecifier(arrow.body);
      if (specifier?.type !== 'StringLiteral') continue;
      bindings.set(decl.id.name, specifier.value);
      sanctioned.add(arrow.body);
    }
  }
  return { bindings, sanctioned };
}

/**
 * Dynamic imports that no lazy() binding owns.
 *
 * A bare `import('./components/tabs/DMNTab');` at module scope fires the fetch
 * at module evaluation, so the chunk downloads on every page load while staying
 * nominally separate — the split reads as intact and saves nothing. Nothing
 * else in this file would see it, since every other check inspects declarations.
 */
function strayDynamicImports(ast) {
  const { sanctioned } = lazyBindings(ast);
  const strays = [];
  const walk = (node) => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const specifier = dynamicImportSpecifier(node);
    if (specifier && !sanctioned.has(node)) {
      strays.push(specifier.type === 'StringLiteral' ? specifier.value : '<computed specifier>');
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
      walk(node[key]);
    }
  };
  walk(ast.program.body);
  return strays;
}

/** Lazy tabs the barrel re-exports — each one silently undoes the split. */
function barrelOffenders(ast) {
  const offenders = [];
  for (const edge of staticEdges(ast)) {
    const tab = LAZY_TABS.find((t) => edge.source === `./${t}`);
    if (tab) offenders.push(tab);
  }
  return offenders;
}

/** Lazy tabs App pulls in statically — directly, or by name through the barrel. */
function appStaticOffenders(ast) {
  const offenders = [];
  for (const edge of staticEdges(ast)) {
    const direct = LAZY_TABS.find((t) => edge.source === tabModuleFromApp(t));
    if (direct) offenders.push(`${direct} (imported directly from ${edge.source})`);
    if (edge.source === BARREL_SPECIFIER) {
      for (const name of edge.names) {
        if (LAZY_TABS.includes(name))
          offenders.push(`${name} (named in the ${edge.source} import)`);
      }
    }
  }
  return offenders;
}

describe('the heavy tabs stay code-split', () => {
  it('the barrel re-exports none of them', () => {
    const offenders = barrelOffenders(parseFile(BARREL));
    expect(
      offenders,
      `components/tabs/index.js re-exports ${offenders.join(', ')}. A static re-export here ` +
        `keeps the module in the entry chunk even though App.jsx imports it dynamically — ` +
        `rolldown reports INEFFECTIVE_DYNAMIC_IMPORT and the bundle does not shrink by a byte.`
    ).toEqual([]);
  });

  it('App imports none of them statically', () => {
    const offenders = appStaticOffenders(parseFile(APP));
    expect(offenders, `App.jsx statically imports ${offenders.join(', ')}`).toEqual([]);
  });

  it('App reaches each of them through a top-level lazy() binding', () => {
    const { bindings } = lazyBindings(parseFile(APP));
    const actual = Object.fromEntries(LAZY_TABS.map((t) => [t, bindings.get(t) ?? null]));
    const expected = Object.fromEntries(LAZY_TABS.map((t) => [t, tabModuleFromApp(t)]));
    expect(
      actual,
      `each lazy tab needs a module-scope \`const <Tab> = lazy(() => import('./components/tabs/<Tab>'))\` ` +
        `in App.jsx — a null below means none was found, or its shape changed (see this file's header)`
    ).toEqual(expected);
  });

  it('App has no dynamic import outside those bindings', () => {
    const strays = strayDynamicImports(parseFile(APP));
    expect(
      strays,
      `dynamic import of ${strays.join(', ')} outside a lazy() binding — it fires at module ` +
        `evaluation, so the chunk downloads on every page load whether or not the tab is opened`
    ).toEqual([]);
  });
});

/**
 * The checks above run against the real files, so they can only show those are
 * currently well-formed. These run the same functions over synthetic sources, to
 * show each check rejects what it claims to — and accepts the correct variants
 * it must not reject.
 */
describe('the checks themselves', () => {
  const APP_SRC = `
import { lazy, Suspense, useState } from 'react';
import { ConceptsTab, ServiceTab } from './components/tabs';
const ChangelogTab = lazy(() => import('./components/tabs/ChangelogTab'));
const CPRMVTab = lazy(() => import('./components/tabs/CPRMVTab'));
const DMNTab = lazy(() => import('./components/tabs/DMNTab'));
const VendorTab = lazy(() => import('./components/tabs/VendorTab'));
function App() {
  return <Suspense fallback={null}><ChangelogTab /></Suspense>;
}
`;

  const BARREL_SRC = `
export { default as ConceptsTab } from './ConceptsTab';
export { default as ServiceTab } from './ServiceTab';
`;

  it('accepts the shapes it is modelled on', () => {
    expect(barrelOffenders(parseSource(BARREL_SRC))).toEqual([]);
    expect(appStaticOffenders(parseSource(APP_SRC))).toEqual([]);
    expect(strayDynamicImports(parseSource(APP_SRC))).toEqual([]);
    expect(lazyBindings(parseSource(APP_SRC)).bindings.get('DMNTab')).toBe(
      './components/tabs/DMNTab'
    );
  });

  it('rejects a re-export of a lazy tab from the barrel', () => {
    const src = `${BARREL_SRC}export { default as DMNTab } from './DMNTab';\n`;
    expect(barrelOffenders(parseSource(src))).toEqual(['DMNTab']);
  });

  it('rejects `export * from` a lazy tab, which names no specifier', () => {
    const src = `${BARREL_SRC}export * from './VendorTab';\n`;
    expect(barrelOffenders(parseSource(src))).toEqual(['VendorTab']);
  });

  it('rejects a lazy tab added to the barrel import in App', () => {
    const src = APP_SRC.replace(
      "import { ConceptsTab, ServiceTab } from './components/tabs';",
      "import { ConceptsTab, DMNTab, ServiceTab } from './components/tabs';"
    ).replace("const DMNTab = lazy(() => import('./components/tabs/DMNTab'));", '');
    expect(appStaticOffenders(parseSource(src))).toEqual([
      'DMNTab (named in the ./components/tabs import)',
    ]);
  });

  it('rejects a direct static import of a lazy tab in App', () => {
    const src =
      "import ChangelogTab from './components/tabs/ChangelogTab';\n" +
      APP_SRC.replace(
        "const ChangelogTab = lazy(() => import('./components/tabs/ChangelogTab'));",
        ''
      );
    expect(appStaticOffenders(parseSource(src))).toEqual([
      'ChangelogTab (imported directly from ./components/tabs/ChangelogTab)',
    ]);
  });

  it('rejects a bare dynamic import at module scope', () => {
    const src = APP_SRC.replace(
      'const ChangelogTab = lazy(',
      "import('./components/tabs/ChangelogTab');\nconst ChangelogTab = lazy("
    );
    expect(strayDynamicImports(parseSource(src))).toEqual(['./components/tabs/ChangelogTab']);
    // Nothing else notices, which is why this check is separate.
    expect(appStaticOffenders(parseSource(src))).toEqual([]);
    expect(lazyBindings(parseSource(src)).bindings.size).toBe(4);
  });

  it('rejects an eager void-prefetch too', () => {
    const src = APP_SRC.replace(
      'const DMNTab = lazy(',
      "void import('./components/tabs/DMNTab');\nconst DMNTab = lazy("
    );
    expect(strayDynamicImports(parseSource(src))).toEqual(['./components/tabs/DMNTab']);
  });

  it('rejects a lazy() moved off module scope', () => {
    const src = APP_SRC.replace(
      "const DMNTab = lazy(() => import('./components/tabs/DMNTab'));",
      ''
    ).replace(
      'function App() {',
      "function App() {\n  const DMNTab = lazy(() => import('./components/tabs/DMNTab'));"
    );
    expect(lazyBindings(parseSource(src)).bindings.get('DMNTab')).toBeUndefined();
  });

  // Both parser majors, pinned as literal AST fragments.
  //
  // The checks above run through whichever @babel/parser is installed, so they
  // can only ever exercise one of the two shapes. These do not parse anything:
  // they hand dynamicImportSpecifier() the node each major produces for
  // `import('./M')`, so the day the pin moves to v8 this file keeps working and
  // says so here rather than in a CI log.
  it.each([
    [
      'v7',
      {
        type: 'CallExpression',
        callee: { type: 'Import' },
        arguments: [{ type: 'StringLiteral', value: './M' }],
      },
    ],
    ['v8', { type: 'ImportExpression', source: { type: 'StringLiteral', value: './M' } }],
  ])('reads a dynamic import specifier from the %s AST shape', (_major, node) => {
    expect(dynamicImportSpecifier(node)).toEqual({ type: 'StringLiteral', value: './M' });
  });

  it('treats an ordinary call as not a dynamic import', () => {
    const notAnImport = {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'require' },
      arguments: [{ type: 'StringLiteral', value: './M' }],
    };
    expect(dynamicImportSpecifier(notAnImport)).toBeNull();
  });

  it('rejects a lazy() whose callee is not React lazy', () => {
    const src = APP_SRC.replace(
      "import { lazy, Suspense, useState } from 'react';",
      "import { Suspense, useState } from 'react';\nimport { lazy } from './my-lazy';"
    );
    expect(lazyBindings(parseSource(src)).bindings.size).toBe(0);
  });
});
