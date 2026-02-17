| # | Decision | What it tests |
| --- | --- | --- |
| 1 | leeftijd | Simple passthrough of age input |
| 2 | meerderjarigDezeMaand | Turns 18 this month logic |
| 3 | rechtgevendeLeeftijd | Age eligibility (18+, not turning 18 this month) |
| 4 | inLeven | Null check on overlijdensdatum |
| 5 | statusRouteOk | Insurance/residence conditions |
| 6 | rechtOpToeslag | Full citizen eligibility |
| 7 | rechtOpToeslagAanvraag | Application-level eligibility |
| 8 | woonlandfactor | Domestic vs treaty abroad factor |
| 9 | inkomenBovenDrempel | Income above threshold |
| 10 | normpremie | Standard premium calculation |
| 11 | jaarbedragToeslag | Full amount with caps/threshold |
| 12 | zorgtoeslag_resultaat | Final result (eligible + amountYear) |