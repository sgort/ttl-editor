// Export all tab components from a single location
// This allows importing like: import { ConceptsTab, ServiceTab } from "./components/tabs"
//
// ── Four tabs are deliberately missing from this file ──
//
// ChangelogTab, CPRMVTab, DMNTab and VendorTab are lazy-loaded by App.jsx and
// must NOT be re-exported here. A static re-export in this barrel is enough to
// undo the split completely: rolldown does not tree-shake it, keeps the module
// in the entry chunk, and reports INEFFECTIVE_DYNAMIC_IMPORT. Measured — with
// ChangelogTab left in this file, adding lazy() to App.jsx moved nothing at all
// (685.71 kB before, 685.84 kB after); removing this one line took the entry
// chunk to 541.84 kB.
//
// Nothing about the app misbehaves when the line is re-added, so no behavioural
// test would catch it. no-eager-tabs.test.js exists for that reason — add a tab
// to LAZY_TABS there if you make another one lazy.
export { default as ConceptsTab } from './ConceptsTab';
export { default as IKnowMappingTab } from './IKnowMappingTab';
export { default as LegalTab } from './LegalTab';
export { default as OrganizationTab } from './OrganizationTab';
export { default as ParametersTab } from './ParametersTab';
export { default as RulesTab } from './RulesTab';
export { default as ServiceTab } from './ServiceTab';
