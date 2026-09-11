# From legal model to published decision service — slide exports

Eight slides exported at **3840×2160** (16:9, 2× of the 1920×1080 design size),
PNG, sRGB. Rendered from `DMN to Linked Data Workflow.dc.html`.

Source: `docs/dmn-to-linked-data-workflow.md` (§1–§13).

## Files

| #   | File                                     | Slide                                                                                                 |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 01  | `01-legal-model-to-decision-service.png` | Three regulations, modelled by lawyers, turned into executable law — the totals and their two caveats |
| 02  | `02-the-workflow-nine-stages.png`        | The nine stages: six execute, three need a person, 08 → 06 sends you back                             |
| 03  | `03-three-passes-side-by-side.png`       | Amsterdam (wide), SZW (deep), Den Haag (structural), measured                                         |
| 04  | `04-what-kept-going-wrong.png`           | The defect catalogue, and why passing validation is a weak signal                                     |
| 05  | `05-where-humans-decide.png`             | Eight judgements no pipeline can make, and the trust claim                                            |
| 06  | `06-what-is-still-open.png`              | Four decisions awaiting the responsible body, plus one flagged assumption; three lanes                |
| 07  | `07-two-ideas.png`                       | "Unknown" is a third value; publishing is a discovery step                                            |
| 08  | `08-why-the-testing-is-evidence.png`     | Why a green run is evidence, what comes out per pass, and the ask                                     |

## Embedding in MkDocs

Place the folder under your docs tree, e.g. `docs/assets/dmn-workflow/`, then:

```markdown
![The nine stages of the DMN-to-linked-data workflow](assets/dmn-workflow/02-the-workflow-nine-stages.png)
```

With Material for MkDocs, add a caption and cap the width:

```markdown
<figure markdown>
  ![Nine stages](assets/dmn-workflow/02-the-workflow-nine-stages.png){ width="900" }
  <figcaption>Six stages execute. Three need a person. One sends you back.</figcaption>
</figure>
```

At 3840px wide these are heavier than a docs page needs. If page weight matters,
downscale to 1920px (still crisp on HiDPI) and keep these as the archival copy.

## Notes

- Every figure on these slides is measured from the repository, not estimated.
- Slide 01's caveats and slide 06's list belong together: **"0 failures"** means
  every case passes against the live engine today, not that the models are
  legally correct. Do not publish the headline totals without them.
- Slide 06 supersedes any earlier "four open questions" phrasing: it is four
  decisions awaiting the responsible body **plus one flagged assumption**, and
  open items sit in three lanes with different addressees.
- Amsterdam contributes none of the four. A visual implying every pass leaves
  questions behind gets it backwards.
- Speaker notes for each slide live in the source deck (`data-speaker-notes`).
