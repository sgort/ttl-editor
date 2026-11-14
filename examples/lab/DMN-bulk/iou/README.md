# DMN-bulk, adapted for TTL and the LDE

The files one level up are the concept as delivered. This folder holds the
same Ingezetene example adapted so it can travel through the IOU tools as they
exist today: the DMN through TTL (the CPSV Editor), the forms through the LDE
Form Editor, the process through the LDE BPMN Modeler.

Only the example files are adapted, not the tools. Every adaptation below is
something a generic bulk feature would have to do, or make unnecessary.

## What changed, and why

| File                                                        | Change                                                                                                                                                                                  | Why                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ingezetene-single-case.dmn`                                | Added six `<inputData>` elements, one per input, each wired to the decision with an `<informationRequirement>`, plus their DRD shapes. Decision id, rules and hit policy are untouched. | TTL's import check (`INT-007`) requires every input variable to be declared. With these the LDE validator reports 0 errors and 0 warnings (one optional CPRMV info remains).                                                                        |
| `ingezetene-counter.dmn`                                    | **Dropped.**                                                                                                                                                                            | Counting is plumbing, not law; in IOU a DMN is published as part of a public service. The count now lives in the BPMN (decision of 13 November 2026).                                                                                               |
| `ingezetene-bulk-process.bpmn`                              | `operaton:` prefix replaced by `camunda:`.                                                                                                                                              | The LDE Modeler, its properties panel and its deploy bundle read `camunda:` only. Operaton accepts that prefix; every seeded LDE example uses it.                                                                                                   |
|                                                             | Init step is now a plain task with two output parameters: `aantalIngezetenen = ${0}` and `gevallen = ${JSON('[…]')}`.                                                                   | Replaces the call to `InitialiseerAantalIngezetenen`.                                                                                                                                                                                               |
|                                                             | Counter step is now a plain task with output parameter `${persoonIngezetene ? aantalIngezetenen + 1 : aantalIngezetenen}`.                                                              | Replaces the call to `VerhoogAantalIngezetenen`. Still sequential, so each iteration sees the previous count.                                                                                                                                       |
|                                                             | `camunda:formRefBinding="deployment"` on both user tasks.                                                                                                                               | Modeler convention: the form is taken from the process's own deployment, which the deploy modal ships with the BPMN.                                                                                                                                |
|                                                             | `camunda:decisionRefTenantId="${null}"` on the business rule task.                                                                                                                      | Lets a process deployed under an organisation reach the shared, tenant-less `Ingezetene` decision.                                                                                                                                                  |
|                                                             | `camunda:candidateGroups="caseworker"` on both user tasks.                                                                                                                              | RBA lists caseworker tasks by candidate group; without one the tasks appear only in Tasklist. Added after the first walk-through.                                                                                                                   |
| `ingezetene-bulk-input.form`, `ingezetene-bulk-result.form` | Added a submit button (`"type": "button", "action": "submit"`) at the end of each form: _Gevallen beoordelen_ and _Afronden_. Ids, keys and the dynamic list are unchanged.             | Operaton Tasklist supplies its own Complete button; RBA does not, it completes a task only on form-js's `submit` event, which only a submit button fires. Without one a task cannot be completed in RBA. Found in the RBA test of 14 November 2026. |

One behavioural difference: `aantalIngezetenen` is now a `Long` instead of an
`Integer`, because the EL expression produces a `Long`. The result form's number
field shows it the same way.

## Verified on local Operaton (13 November 2026)

- `iou/ingezetene-single-case.dmn` validated through the LDE backend
  (`POST /v1/dmns/validate`): valid, 0 errors, 0 warnings.
- `iou/ingezetene-bulk-process.bpmn` with both forms deployed to the local
  engine (`localhost:8081`) and run with three cases: Geval 1 true (one
  indicator), Geval 2 false (exclusion wins), Geval 3 true (two indicators).
  The instance reached the result task with `aantalIngezetenen = 2` and no
  incidents.

## Walk-through in the tools

**TTL (CPSV Editor)**

1. Create a service for Ingezetene (BES) and fill in the required tabs.
2. DMN tab: upload `iou/ingezetene-single-case.dmn`. Expect a green _Syntax
   valid_ badge.
3. Deploy to Operaton (signed in as `lde-author`).
4. Upload `iou/testCases/ingezetene-test-cases.json` and run all test cases.
   Expect 11 PASS: one case per rule (7), plus four combinations: an
   indicator with the exclusion, all five indicators, all six inputs true,
   and two indicators together. Expected answers come from the concept
   document's formula, not from the DMN, and each case names the rule it
   exercises.
5. Publish to TriplyDB **from acceptance, not from localhost**: a local session
   records `localhost:8081` as the decision's `cprmv:implementedBy`. The local
   walk-through can stop before this step; the Modeler finds the decision on
   the engine by key and does not need it in the catalogue.

**LDE**

6. Form Editor: import `iou/ingezetene-bulk-input.form` and
   `iou/ingezetene-bulk-result.form`.
7. BPMN Modeler: import `iou/ingezetene-bulk-process.bpmn`. Check that the
   properties panel shows both forms and the decision on their tasks.
8. Deploy. The deploy modal should list the BPMN and both forms, and not the
   DMN (decisions are not part of a Modeler bundle).

**Run**

9. Start `IngezeteneBulkProcess` (Tasklist or RBA), add rows, complete, and
   read the count on the result form.

## Walk-through results (13 November 2026, localhost)

| Step                           | Result                                                                                                                                                                                                                                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TTL: upload DMN                | Valid, no warnings, thanks to the added `<inputData>`.                                                                                                                                                                                                                                                                 |
| TTL: deploy                    | `Ingezetene` v1 on the engine, **without a tenant**.                                                                                                                                                                                                                                                                   |
| TTL: test cases                | 11/11 PASS with `testCases/ingezetene-test-cases.json`.                                                                                                                                                                                                                                                                |
| LDE Form Editor                | Both forms imported without complaint, `operaton` platform markers and all.                                                                                                                                                                                                                                            |
| LDE Modeler, **original** BPMN | Imported, but every link was gone: no form badges, no decision badge, empty "Link to Form" dropdowns. The Modeler reads only `camunda:formRef` / `camunda:decisionRef`; the file has `operaton:`. Nothing warned.                                                                                                      |
| LDE Modeler, `iou/` BPMN       | All three badges present without manual linking.                                                                                                                                                                                                                                                                       |
| LDE deploy                     | Organisation `BES`, board Caseworker. Bundle: the BPMN and both forms, no DMN. One amber warning: no `ronl:ropaRef`. Deployed under tenant `BES`. The re-exported XML kept the output parameters, the loop and `decisionRefTenantId="${null}"`; it dropped `decisionRefBinding="latest"`, which is the default anyway. |
| Run (REST, three cases)        | Result task reached, `aantalIngezetenen = 2`, no incidents. The `BES` process reaches the tenant-less decision.                                                                                                                                                                                                        |

## Questions for the generic feature

Record here what the walk-through shows.

- A BPMN exported from the Operaton Modeler loses all its links in the LDE
  Modeler without a warning. Convert `operaton:` to `camunda:` on import, or at
  least warn?
- The user tasks have no candidate groups. RBA lists caseworker tasks by
  candidate group (`operaton.service.ts`), so these tasks would not appear in
  the caseworker dashboard; only Tasklist shows them. Choosing board
  Caseworker in the deploy modal does not set them.
- TTL needs `<inputData>` declarations that a decision exported from a modeller
  often lacks. Should TTL offer to add them, since the input expressions
  already name every variable?
- Which steps above could the tools derive from the DMN's inputs alone? (The
  form row, the JSON seed, the loop and the input mappings are all mechanical.)
- Per-case outcomes are still lost: `persoonIngezetene` is overwritten on every
  iteration, so the result form shows inputs and a total, not which case passed.
- Does the form renderer in RBA return a dynamic list as `Json`, as Tasklist
  does after the seed?
