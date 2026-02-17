### Regel: B01.01-besluit-aanvraag

Studiefinanciering wordt toegekend indien aan alle volgende voorwaarden is voldaan:

- Het totale bedrag van studiefinanciering van de Persoon is groter dan 0.
- De Persoon heeft aanspraak.
- De Persoon heeft nog recht op tenminste één maand studiefinanciering.

### Regel: B02.01-aanspraak

Een Persoon heeft aanspraak indien aan alle volgende voorwaarden is voldaan:

- De Persoon voldoet aan de leeftijdsvoorwaarden.
- De Persoon voldoet aan de nationaliteitseis.
- De Persoon is ingeschreven voor een opleiding waarvoor studiefinanciering wordt gegeven.
- De Persoon krijgt geen buitenlandse financiering.

### Regel: B02.02-leeftijd

| de leeftijd van de Persoon | de leeftijd van de Persoon | de Inschrijving is voor een HO opleiding | de Inschrijving is ononderbroken | de Persoon voldoet aan de leeftijdsvoorwaarden |
| -------------------------- | -------------------------- | ---------------------------------------- | -------------------------------- | ---------------------------------------------- |
| >= 18                      | < 30                       | Waar                                     | Waar                             | Waar                                           |
| < 18                       | Onwaar                     | Waar                                     | Waar                             | Waar                                           |
| < 18                       | -                          | Onwaar                                   | Waar                             | Onwaar                                         |
| >= 30                      | -                          | Waar                                     | Waar                             | Waar                                           |
| >= 30                      | -                          | Waar                                     | Onwaar                           | Onwaar                                         |

### Regel: B02.02.02-ononderbroken-inschrijving

Een Inschrijving is ononderbroken indien aan tenminste één van de volgende voorwaarden is voldaan:

- De Inschrijving heeft van beginmaand tot en met nu geen missende maand.
- De Inschrijving de inschrijving is onderbroken met een medische verklaring.

### Regel: B02.03-nationaliteitsvoorwaarden

Een Persoon voldoet aan de nationaliteitseis indien aan tenminste één van de volgende voorwaarden is voldaan:

- De Persoon heeft de nederlandse nationalitiet.
- De Persoon voldoet aan de EU voorwaarden (moet nog worden uitgewerkt)

### Regel: B02.04-correcte-opleiding

Een Persoon is ingeschreven voor een opleiding waarvoor studiefinanciering wordt gegeven indien aan tenminste één van de volgende voorwaarden is voldaan:

- Opleiding is een bekostigde voltijd opleiding.
- Opleiding is goedgekeurd door instantie.

### Regel: B03.01-totaal-bedrag

Het totale bedrag van studiefinanciering van een Persoon moet worden berekend als A + B + C waarin geldt dat:

- A = de bedrag basisbeurs van de Persoon.
- B = de Hoogte van de toe te kennen aanvullende beurs van de Studiefinanciering.
- C = het bedrag aan lening van de Persoon.

### Regel: B03.02-basisbeurs

| de Persoon is uitwonend | het onderwijsniveau van de aanvraag van de Studiefinanciering | het bedrag basisbeurs van de Persoon |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------ |
| Onwaar                  | MBO                                                           | 107,26                               |
| Waar                    | MBO                                                           | 350,03                               |
| Onwaar                  | HO                                                            | 130,21                               |
| Waar                    | HO                                                            | 324,52                               |

### Regel: B03.03-aanvullende-beurs

De Hoogte van de toe te kennen aanvullende beurs van een Studiefinanciering moet worden berekend als Maximum(A - B, 0) waarin geldt dat:

- A = de maximale aanvullende beurs van het Studiefinanciering.
- B = de maandelijkse ouderlijke bijdrage van de Ouders.

### Regel: B03.04-bedrag-aan-lening

Het bedrag aan lening van een Persoon moet worden berekend als Minimum(A,B) waarin geldt dat:

- A = de gewenste lening van de Persoon.
- B = het maximale leningsbedrag van de Persoon.

### Regel: B03.03.01-maximaal-aanvullend

| het onderwijsniveau van de aanvraag van de Studiefinanciering | de Persoon is uitwonend | de maximale aanvullende beurs van het Studiefinanciering |
| ------------------------------------------------------------- | ----------------------- | -------------------------------------------------------- |
| MBO                                                           | Onwaar                  | 438.08                                                   |
| MBO                                                           | Waar                    | 466.40                                                   |
| HO                                                            | -                       | 491.08                                                   |

### Regel: B03.03.02-maandelijkse-inhouding-aanvullend

De maandelijkse ouderlijke bijdrage van een Ouders moet worden berekend als A / B waarin geldt dat:

- A = de inhouding per jaar van de Ouders.
- B = 12.

### Regel: B03.03.03-totaal-bedrag-per-kind-aanvullend

De inhouding per jaar van de Ouders moet worden berekend als A / B waarin geldt dat:

- A = het gezamelijke ouderbijdrage van de Ouders.
- B = de aantal kinderen met een aanvullende beurs van de Ouders.

### Regel: B03.03.04-rekeninkomen-ouders

Het gezamelijke ouderbijdrage van de Ouders moet worden berekend als som van het ouderbijdrage per jaar van de Ouder.

### Regel: B03.03.05-jaarbedrag-per-ouder

Het ouderbijdrage per jaar van een Ouder moet worden berekend als A - B - C waarin geldt dat:

- A = het rekeninkomen van de Ouder.
- B = de aftrekpost andere kinderen van de Ouder.
- C = het termijnbedrag op jaarbasis van de studieschuld van de Ouder.

### Regel: B03.03.06-aftrekpost-andere-kinderen

De aftrekpost andere kinderen van een Ouder moet worden berekend als A \* B waarin geldt dat:

- A = ieder kind zonder studiefinanciering van de Ouder.
- B = 363.

### Regel: B03.03.07-rekeninkomen-van-een-ouder

Het rekeninkomen van een Ouder moet worden berekend als C \* (A - B) waarin geldt dat:

- A = het belastbaar inkomen van de Ouder.
- B = het Vrijgesteld bedrag van de Ouder.
- C = het Percentage van inkomen dat meetelt van het Studiefinanciering.

### Regel: B03.03.08-vrijgesteld-bedrag-van-de-ouder

| het onderwijsniveau van de aanvraag van de Studiefinanciering | de leefsituatie van de Ouder       | het Vrijgesteld bedrag van de Ouder |
| ------------------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| MBO                                                           | Alleenstaand                       | 29333.26                            |
| HBO                                                           | Alleenstaand                       | 29289.28                            |
| MBO                                                           | Andere ouder is overleden          | 46305.40                            |
| HBO                                                           | Andere ouder is overleden          | 41500.60                            |
| MBO                                                           | Inkomen andere ouder telt niet mee | 46305.40                            |
| HBO                                                           | Inkomen andere ouder telt niet mee | 41500.60                            |
| MBO                                                           | -                                  | 23152.70                            |
| MBO                                                           | -                                  | 20750.30                            |

### Regel: B03.03.09-percentage-meetellend-inkomen

| het onderwijsniveau van de aanvraag van de Studiefinanciering | het Percentage van inkomen dat meetelt van het Studiefinanciering |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| MBO                                                           | 26                                                                |
| HO                                                            | 13.6                                                              |

### Regel: B03.05-maximale-leenbedrag

Het maximale leningsbedrag van een Persoon moet worden berekend als A + B waarin geldt dat:

- A = de maandelijkse ouderlijke bijdrage van de Ouders.
- B = de maximale lening van het Studiefinanciering.

### Regel: B03.06-maximale-lening

| het onderwijsniveau van de aanvraag van de Studiefinanciering | de maximale lening van Studiefinanciering |
| ------------------------------------------------------------- | ----------------------------------------- |
| MBO                                                           | 233,65                                    |
| HO                                                            | 315,17                                    |

### Regel: B03.04.01-persoon-uitwonend

Een Persoon is uitwonend indien aan alle volgende voorwaarden is voldaan:

- De Persoon woont op een ander adres dan beide ouders.
- De Persoon is ingeschreven op een adres bij een gemeente.

### Regel: B04.01-nog-een-maand-studiefinanciering

Een Persoon heeft nog recht op tenminste één maand studiefinanciering indien aan alle volgende voorwaarden is voldaan:

- De Persoon heeft nog tenminste één maand opnametermijn.
- Het aantal maanden genoten studiefinanciering van zijn huidige inschrijving van de Persoon is groter dan 0.

### Regel: B04.02-verbuikte-jaren

Het aantal maanden genoten studiefinanciering van zijn huidige inschrijving van een Persoon moet worden berekend als A - B waarin geldt dat:

- A = de maximale hoeveelheid studiefinancieringsjaren van Opleiding.
- B = het aantal maanden genoten studiefinanciering van zijn huidige inschrijving van de Persoon.

### Regel: B04.04-aantal-jaar-voor-een-inschrijving

| de Inschrijving van de Persoon | de maximale hoeveelheid studiefinancieringsjaren van Opleiding |
| ------------------------------ | -------------------------------------------------------------- |
| MBO 1 of 2                     | Onbeperkt                                                      |
| MBO 3 of 4                     | 4                                                              |
| HO                             | 4 jaar of meer als de studie langer duurt                      |

### Regel: B04.05-opnametermijn

Een Persoon heeft nog tenminste één maand opnametermijn indien huidige maand is kleiner dan de de eerste maand van het recht op het Studiefinanciering + 10 jaar.
