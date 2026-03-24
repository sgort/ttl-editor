# LVG Integratie — Concept Alignment en Data-integratieregels

**Versie:** 0.1  
**Status:** Concept  
**Organisatie:** RVO / RONL Initiative  
**Bestandslocatie:** `examples/organizations/rvo/LVG/`

---

## Achtergrond

De Landelijke Voorziening Gegevens (LVG) omvat concepten afkomstig uit vier afzonderlijke basisregistraties: WOZ, BAG, BRP en BRK. Elk concept is als afzonderlijk `.ttl`-bestand beschikbaar in de LVG-map. De stelselplaat 2020 toont hoe de kernobjecten zich onderling verhouden vanuit het perspectief van een burger die op een adres woont.

Dit document beschrijft de regels waarmee deze concepten semantisch worden uitgelijnd en operationeel worden geïntegreerd tot een burgergericht gegevensmodel.

---

## Bronconcepten per registratie

| Concept | Registratie | Bestand |
|---|---|---|
| Persoon | BRP | `persoon.ttl` |
| Adres binnenland | BRP | `adres_binnenland.ttl` |
| Aanduiding hoofdadres verblijfsobject | WOZ | `aanduiding_hoofdadres_verblijfsobject.ttl` |
| Verblijfsobject (eigendomsrecht) | BRK | `verblijfsobject.ttl` |
| Verblijfsobject–Pand relatie | BAG | `verblijfsobject_pand-verblijfsobject.ttl` |

De sleutels die integratie mogelijk maken zijn:

| BRP-veld | Koppelt aan |
|---|---|
| `identificatiecode_verblijfplaats` | BAG verblijfsobject identificatiecode |
| `identificatiecode_nummeraanduiding` | BAG nummeraanduiding identificatiecode |
| `burgerservicenummer` | WOZ-subject (eigenaar/gebruiker) |

---

## Het `lvg:`-naamruimte

De integratieregels introduceren predicaten die niet bestaan binnen één van de bronregistraties, maar de verbindingen daartussen beschrijven. Deze predicaten worden gebundeld onder een eigen ontologie-naamruimte:

```
Prefix:    lvg:
Namespace: https://regels.overheid.nl/lvg/ontology#
```

### Motivatie

Geen van de vier registraties voorziet in een vocabulaire die de *onderlinge* relaties tussen haar eigen concepten en die van de andere registraties benoemt. De BAG definieert wat een verblijfsobject is; de BRP definieert wat een persoon is; maar de relatie "persoon woont in verblijfsobject" is een stelseloverkoepelende samenhang die in geen van beide registraties als eigenschap bestaat. Zonder een expliciete naamruimte hiervoor zou een implementatie ofwel vrije tekst gebruiken, ofwel bestaande predicaten zoals `schema:address` of `owl:sameAs` semantisch overbelasten op een manier die de oorspronkelijke specificatie niet dekt.

### Positionering

De `lvg:`-naamruimte is een *integratieontologie*, niet een vervanging van de bronregistraties. Zij:

- definieert uitsluitend predicaten, geen klassen — de klassen `brp:Persoon`, `bag:Verblijfsobject`, `woz:WOZObject` enz. blijven in de eigen bronregistraties;
- verwijst via `rdfs:isDefinedBy` naar de wettelijke grondslag van elke relatie (bijv. Wet BRP, Wet BAG, Wet WOZ);
- is ontworpen als aanvulling op bestaande vocabulaires (CPSV-AP, CPRMV, RONL-ontologie) binnen het bredere RONL-stelsel;
- moet worden beheerd en gepubliceerd op `https://regels.overheid.nl/lvg/ontology`, analoog aan de bestaande RONL-ontologie op `https://regels.overheid.nl/ontology#`.

### Gedefinieerde predicaten

| Predicaat | Domein | Bereik | Stelselplaat-relatie |
|---|---|---|---|
| `lvg:woontOp` | `brp:Persoon` | `bag:Nummeraanduiding` | woont op |
| `lvg:woontIn` | `brp:Persoon` | `bag:Verblijfsobject` | woont in |
| `lvg:isAanduidingVan` | `bag:Nummeraanduiding` | `bag:Verblijfsobject` | is aanduiding van |
| `lvg:isVerbondenMet` | `woz:WOZObject` | `bag:Verblijfsobject` | is verbonden met |
| `lvg:isEigenaarGebruikerVan` | `brp:Persoon` | `woz:WOZObject` | is eigenaar/gebruiker van |
| `lvg:maaktDeelUitVan` | `bag:Verblijfsobject` | `bag:Pand` | maakt deel uit van |

### Naamruimtedeclaratie (TTL)

```turtle
@prefix lvg:  <https://regels.overheid.nl/lvg/ontology#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .

<https://regels.overheid.nl/lvg/ontology>
    a owl:Ontology ;
    rdfs:label "LVG Integratieontologie"@nl ;
    rdfs:comment "Predicaten voor de stelseloverkoepelende koppeling van WOZ, BAG, BRP en BRK in het LVG-model."@nl .
```

---

## Laag 1 — Concept Alignment (SKOS)

Deze regels worden eenmalig vastgelegd in `lvg-integratie.ttl` en beschrijven semantische gelijkwaardigheid of verwantschap tussen concepten uit verschillende registraties.

### R1 — BRK verblijfsobject is hetzelfde concept als het BAG verblijfsobject

De BRK levert het verblijfsobject mee als het gekoppeld is aan een BAG-adres. De `skos:scopeNote` in `verblijfsobject.ttl` (BRK) bevestigt dit expliciet.

```turtle
brk:verblijfsobject skos:exactMatch bag:verblijfsobject .
```

### R2 — BRP adres binnenland is nauw verwant aan WOZ aanduiding hoofdadres verblijfsobject

Beide concepten beschrijven hetzelfde fysieke adres, maar vanuit een verschillende registratieperspectief. Het BRP-adres legt de woonsituatie van de persoon vast; het WOZ-concept legt de adresaanduiding van het object zelf vast, afgeleid via de BAG–WOZ-koppeling.

```turtle
brp:adres_binnenland skos:closeMatch woz:aanduiding_hoofdadres_verblijfsobject .
```

### R3 — Beide adresconcepten vallen onder het gemeenschappelijke clusterbegrip Adres

Dit is reeds aanwezig via `skos:broadMatch` in de bronbestanden. De declaratie hier maakt de relatie expliciet in de integratiemap.

```turtle
brp:adres_binnenland
    skos:broadMatch <http://opendata.stelselcatalogus.nl/id/clusterbegrip/Adres> .

woz:aanduiding_hoofdadres_verblijfsobject
    skos:broadMatch <http://opendata.stelselcatalogus.nl/id/clusterbegrip/Adres> .
```

---

## Laag 2 — Data-integratieregels (SPARQL CONSTRUCT)

De volgende zes regels construeren het burgercentrische gegevensmodel op querytijd. Ze sluiten direct aan op de vijf relaties in de stelselplaat 2020.

### Regel A — Persoon woont op Adres

Basis-koppeling binnen de BRP. Legt de `identificatiecode_nummeraanduiding` als join-sleutel naar de BAG.

```sparql
CONSTRUCT {
  ?persoon lvg:woontOp ?nummeraanduiding .
}
WHERE {
  ?persoon  a                                          brp:Persoon ;
            brp:burgerservicenummer                    ?bsn ;
            brp:adresBinnenland                        ?adresRecord .
  ?adresRecord
            brp:identificatiecode_nummeraanduiding     ?numId .
  ?nummeraanduiding
            bag:identificatiecode                      ?numId .
}
```

### Regel B — Persoon woont in Verblijfsobject

Koppeling BRP → BAG via `identificatiecode_verblijfplaats`. Dit is de directe objectkoppeling, los van de adresaanduiding.

```sparql
CONSTRUCT {
  ?persoon lvg:woontIn ?verblijfsobject .
}
WHERE {
  ?persoon  brp:adresBinnenland                        ?adresRecord .
  ?adresRecord
            brp:identificatiecode_verblijfplaats       ?vboId .
  ?verblijfsobject
            bag:identificatiecode                      ?vboId .
}
```

### Regel C — Adres is aanduiding van Verblijfsobject

Interne BAG-relatie: de nummeraanduiding is het hoofdadres van het verblijfsobject. De kwaliteitsomschrijving in `aanduiding_hoofdadres_verblijfsobject.ttl` (WOZ) bevestigt dat deze koppeling voortkomt uit de BAG–WOZ-koppeling.

```sparql
CONSTRUCT {
  ?nummeraanduiding lvg:isAanduidingVan ?verblijfsobject .
}
WHERE {
  ?verblijfsobject  bag:hoofdadres          ?numId .
  ?nummeraanduiding bag:identificatiecode   ?numId .
}
```

### Regel D — WOZ-object is verbonden met Verblijfsobject

Koppeling WOZ → BAG via de verblijfsobjectidentificatie. De populatiebeschrijving in `aanduiding_hoofdadres_verblijfsobject.ttl` stelt dat alle BAG-verblijfsobjecten worden gekoppeld aan één of meer WOZ-objecten.

```sparql
CONSTRUCT {
  ?wozObject lvg:isVerbondenMet ?verblijfsobject .
}
WHERE {
  ?wozObject  a                                woz:WOZObject ;
              woz:verblijfsobjectIdentificatie  ?vboId .
  ?verblijfsobject
              bag:identificatiecode             ?vboId .
}
```

### Regel E — Persoon is eigenaar/gebruiker van WOZ-object

Koppeling WOZ → BRP via het burgerservicenummer. Dit is de gevoeligste koppeling: WOZ-eigenaargegevens zijn beperkt toegankelijk en de toepassingsscope van deze regel moet afgebakend zijn tot geautoriseerde use cases.

```sparql
CONSTRUCT {
  ?persoon lvg:isEigenaarGebruikerVan ?wozObject .
}
WHERE {
  ?persoon   brp:burgerservicenummer  ?bsn .
  ?wozObject woz:subjectidentificatie ?bsn .
}
```

### Regel F — Verblijfsobject maakt deel uit van Pand

Structurele BAG-relatie die de keten sluit naar het fysieke gebouw. Gebaseerd op `verblijfsobject_pand-verblijfsobject.ttl` (BAG), waarbij één verblijfsobject in meerdere panden kan zijn gelegen.

```sparql
CONSTRUCT {
  ?verblijfsobject lvg:maaktDeelUitVan ?pand .
}
WHERE {
  ?verblijfsobject bag:pandIdentificatie ?pandId .
  ?pand            bag:identificatiecode ?pandId .
}
```

---

## Resulterende gegevensgraaf per burger

Na toepassing van Regels A t/m F ontstaat de volgende burgercentrische graaf:

```
brp:Persoon
  ├─ lvg:woontOp          ──► bag:Nummeraanduiding
  │                                │
  │                                └─ lvg:isAanduidingVan ──► bag:Verblijfsobject
  │                                                                │
  └─ lvg:woontIn          ─────────────────────────────────────► bag:Verblijfsobject
                                                                   │
                                                                   ├─ lvg:isVerbondenMet ◄── woz:WOZObject
                                                                   │                              ▲
                                                                   │              lvg:isEigenaarGebruikerVan
                                                                   │                         brp:Persoon
                                                                   │
                                                                   └─ lvg:maaktDeelUitVan ──► bag:Pand
```

---

## Aandachtspunten bij implementatie

**`lvg:`-naamruimte publiceren.** De predicaten hebben pas formele semantische status zodra de ontologie gepubliceerd is op `https://regels.overheid.nl/lvg/ontology`. Zolang dit niet het geval is, zijn de SPARQL CONSTRUCT-queries functioneel bruikbaar maar ontbreekt de machine-leesbare definitie van de predicaten.

**Regel E en toegangsrechten.** De BSN-koppeling in Regel E valt onder de Wet WOZ en de AVG. De query mag uitsluitend worden uitgevoerd in een geautoriseerde context (bijv. mijn.overheid.nl-equivalent) en niet als onderdeel van een openbaar SPARQL-endpoint.

**BRK als substituut voor BAG in Regel B.** Omdat `brk:verblijfsobject skos:exactMatch bag:verblijfsobject` (Regel R1), kan het doelknooppunt in Regel B worden vervangen door het BRK-verblijfsobject wanneer de BRK de gezaghebbende geometrie levert. De SKOS `exactMatch` maakt dit substitutief.

**Één verblijfsobject, meerdere panden.** Regel F genereert meerdere `lvg:maaktDeelUitVan`-triples wanneer een verblijfsobject in meer dan één pand is gelegen. Dit is conform de BAG-definitie en moet worden meegenomen in downstream SPARQL-queries die de pand-URI als enkelvoudige waarde verwachten.
