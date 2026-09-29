# Een Nederlands toepassingsprofiel voor DMN

**Voorstel — DMN-AP NL**

_English version: [`dmn-ap-nl-proposal.md`](dmn-ap-nl-proposal.md)._

**Aan:** Forum Standaardisatie, als eigenaar van de CPRMV-specificatie.

**Naar aanleiding van:** de deelsessie "Van wet tot loket over de grenzen van je
organisatie heen; concrete kansen en mogelijkheden", die wij samen met Amsterdam
verzorgden op _Congres: Forum Standaardisatie 20 jaar — Standaarden, openheid en
autonomie_. Daar is dit voor het eerst voorgesteld, en de voorzitter van het
Forum kwam er in de slotwoorden op terug, samen met de ambitie van het Forum om
er werk van te maken. Wat hieronder volgt, is dat voorstel op schrift.

Drie vragen kwamen naar boven bij het modelleren van drie regelingen als
uitvoerbare beslisdiensten. Geen enkele implementatiepartij kan ze beslechten,
omdat het telkens gaat om wat de standaard zou moeten eisen en niet om hoe één
hulpmiddel zich gedraagt. Dit stuk stelt een toepassingsprofiel voor dat ze
beslecht, plus een vierde ronde om te bewijzen dat het profiel werkt vóórdat
iemand wordt gevraagd het toe te passen.

**Twee van de drie liggen al bij u**, als openstaande vragen bij CPRMV
opgeworpen tijdens de eerste van die rondes en nog altijd open. Dit voorstel
betoogt dat het geen twee losse eindjes zijn maar symptomen van hetzelfde
ontbrekende ding — en dat de derde vraag, die wij tot nu toe als een gebrek in
ons eigen gereedschap behandelden, om dezelfde reden op dezelfde plek thuishoort.

Begeleidend document bij
[`dmn-to-linked-data-workflow.md`](dmn-to-linked-data-workflow.md), waarin het
werk staat beschreven waarop dit rust. Elk getal in dit stuk is gemeten aan dat
werk, niet geschat.

---

## 1. De vraag, op één pagina

**Wat wij willen:** instemming om **DMN-AP NL** te ontwikkelen, een Nederlands
toepassingsprofiel op OMG DMN, en een opdracht om het te demonstreren op één
artikel van de Participatiewet voordat het aan wie dan ook ter toepassing wordt
voorgelegd. Dit is de concrete vorm van de ambitie die de voorzitter op het
congres benoemde: een route van _wet_ naar _loket_ die het oversteken van een
organisatiegrens overleeft.

**Van wie:** Forum Standaardisatie, dat CPRMV al in eigendom heeft. De
openstaande vragen in §2 zijn daar via die standaard terechtgekomen; dit stuk
vraagt wat te doen aan het feit dat ze blijven binnenkomen.

**Wat het is:** een _inperking_ van een bestaande internationale standaard, zoals
DCAT-AP dat doet op DCAT en CPSV-AP op CPSV. **Het vraagt niets van OMG.** De
basisspecificatie op <https://www.omg.org/dmn/> blijft precies zoals hij is. Een
profiel legt vast welke van de keuzevrijheden hier verplicht zijn, en wat een
conform model moet kunnen aantonen.

**Waarom nu:** wij hebben dezelfde werkwijze drie keer doorlopen — Amsterdam,
SZW, Den Haag — over **34 beslissingen en 179 regels**, en alle drie gepubliceerd
als linked data. Het bewijsmateriaal ligt er, de faalpatronen zijn
gecatalogiseerd, en een vierde regeling staat klaar. Dit is het moment om vast te
leggen wat we geleerd hebben als eis, in plaats van het mee te dragen als kennis
in drie changelogs — en omdat het Forum al in het openbaar en vanaf de
voorzittersstoel heeft uitgesproken hier werk van te willen maken.

**Wat het kost:** één werkgroep, en één modelleerronde die toch al gepland stond.
§6 stelt voor de vierde ronde _tegen het conceptprofiel aan_ te draaien, zodat
het profiel door het werk getoetst wordt in plaats van bovenop het werk te komen.

**Hoe het eruitziet als het werkt:** een professional leest artikel 36 op
`wetten.overheid.nl`, klikt één keer, en kijkt naar het beslismodel dat het
uitvoert — en kan dat model aanroepen en antwoord krijgen. §6.2 zet uiteen hoe,
en waarom het moeilijke deel al gedaan is.

**De kwestie in één zin:**

> Alle drie de opgeleverde modellen openden correct in een modelleertool,
> doorstonden de validatie, en waren niet uitvoerbaar. Nergens in de standaard
> staat dat dat een tekortkoming is.

---

## 2. De kwestie

De drie rondes leverden bevindingen op in drie banen, gescheiden naar wie ze kan
beslechten: het overheidsorgaan dat eigenaar is van de regeling, het gereedschap
dat wij bouwen, en de standaard. Dit voorstel gaat uitsluitend over de derde
baan.

Daar horen drie vragen thuis.

### 2.1 Wat identificeert een regel, en overleeft dat een her-export?

Een regel heeft een naam nodig die het bestand waaruit hij komt overleeft — zodat
een beslissing kan worden aangehaald, gecontroleerd, gecorrigeerd en gekoppeld
aan de wet die zij uitvoert. Vandaag eist niets zo'n naam.

Waargenomen: toen een bronmodel opnieuw werd geëxporteerd uit de
modelleeromgeving, veranderden de regelidentificaties, en de afspraak die wij
daarvoor bedachten (`cprmv:ruleIdPath`) is de onze, niet die van de standaard.
Daarnaast overschreef een generator de echte identificatie van een gepubliceerde
regel met het webadres van die regel zelf, op **12 plaatsen in één gepubliceerd
bestand** — geldige uitvoer, conform elke controle die wij konden uitvoeren, en
onjuist.

### 2.2 Wat is de relatie van een beslismodel tot de wet die het uitvoert?

DMN heeft de constructies — `knowledgeSource`, `authorityRequirement` — en zegt
niets over wat die moeten bevatten of hoe ze verderop in de keten landen.

Waargenomen: één model droeg **11 kennisbronnen en 12 gezagsverwijzingen**; die
benoemden herkomst van gegevens in plaats van wetgeving, droegen geen
oplosbaar adres, en bereikten de gepubliceerde uitvoer in het geheel niet. Een
ander model droeg **48 bronnen en 99 verwijzingen**, waarvan er 2 niet oplosten.
Ons gereedschap leest er niets van, en dat is ons gat om te dichten — maar het
blijft dicht zolang geen profiel zegt wat het lezen ervan zou betekenen.

### 2.3 Wat mag een model over zichzelf beweren, en wat moet het bewijzen?

Dit is de vraag die het zwaarst weegt, en waarvoor het minste voorwerk bestaat.

Waargenomen: **de validator keurde alle drie de opgeleverde exports goed als
`valid`, terwijl geen van drieën correct kon draaien.** Eén model kon in het
geheel geen recht toekennen — beide toekenningsregels vereisten een voorwaarde
die een eerdere regel al afwijst, zodat onder de eigen hit policy geen van beide
ooit kon vuren. Het was geldig. Het opende. Het rolde uit, na reparatie. Het gaf
antwoord. Het kon alleen nooit ja zeggen, en geen enkele controle die iemand
uitvoerde was in staat dat op te merken.

> **Een aantekening bij het aantal.** Het werkwijzedocument noteert twee vragen
> in de baan van de standaard en één in die van het gereedschap. §2.2 tilt dat
> derde punt bewust over: het gereedschap leest niets van de juridische
> bronlaag van DMN _omdat geen profiel dat eist_. Onder een profiel houdt het op
> een gebrek in gereedschap te zijn en wordt het een conformiteitseis. Die
> herduiding ís het betoog, en staat hier vermeld in plaats van verondersteld.

---

## 3. Waarom een profiel, en waarom dit geen overkill is

De drie rondes werden uitgevoerd door mensen die wisten waarnaar ze moesten
zoeken — in toenemende mate, omdat de catalogus meegroeide. Vijftien
terugkerende families van gebreken worden nu gecontroleerd vóórdat een model
wordt uitgerold. Die kennis zit op dit moment in drie changelogs en één
werkwijzedocument, en dat wil zeggen: in ons.

Een profiel zet dat om in iets dat een hulpmiddel kan controleren en waarop een
leverancier aanspreekbaar is. Het onderscheid waar het om draait:

|                              | Vandaag                                 | Onder een profiel                                                 |
| ---------------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| "Het model is geldig"        | het parseert, en voldoet aan een schema | het parseert, rolt uit, geeft antwoord, en toont zijn dekking aan |
| Wie controleert              | wie het toevallig weet                  | een conformiteitscontrole, in CI                                  |
| Wat een leverancier oplevert | een bestand dat opent                   | een bestand plus bewijs dat het draait                            |
| Wanneer een gebrek opvalt    | na uitrol, bij inspectie                | vóór acceptatie, bij een controle                                 |
| Wat "klaar" betekent         | het model is overgedragen               | het model beantwoordde elke vraag die het zegt te beslissen       |

De drie rondes zijn het bewijs dat dit niet theoretisch is. Elke ronde vond
gebreken waarop de vorige ons had leren letten, en vond daarnaast telkens nieuwe.

---

## 4. Wat DMN-AP NL zou vastleggen

Vijf conformiteitsgebieden. Elk benoemt wat is waargenomen, wat het profiel moet
eisen, en — het onderdeel dat er een profiel van maakt in plaats van een mening —
hoe een hulpmiddel conformiteit aantoont.

### 4.1 Persistente identificatie op regelniveau

**Waargenomen.** Regelidentificaties veranderden tussen her-exports van hetzelfde
bronmodel. Een gepubliceerd bestand droeg op 12 plaatsen twee verschillende
identificaties voor hetzelfde subject. De afspraak die dit vandaag bijeenhoudt,
is een eigen bedenksel.

**Het profiel moet eisen.** Elke regel draagt een identificatie die uniek is
binnen zijn regelset, stabiel over her-exports van dezelfde bron, en oplosbaar.
Het profiel legt vast hoe die wordt gevormd en verbiedt haar af te leiden uit een
vindplaats — een adres is waar iets is, niet wat iets is.

**Conformiteit wordt aangetoond door.** Hetzelfde bronmodel tweemaal exporteren
en vergelijken: elke regelidentificatie ongewijzigd. De graaf van het model
samenvoegen met de juridische graaf waarnaar het verwijst: geen subject met twee
verschillende identificaties.

### 4.2 Uitrol

**Waargenomen.** Geen van de drie opgeleverde modellen rolde uit zoals
ontvangen. De oorzaken liepen uiteen van een ontbrekend engine-specifiek attribuut
op 25 beslissingen, via 48 niet-geëscapete ampersands die het bestand ongeldige
XML maakten, tot expressies met niet-sluitende haakjes.

**Het profiel moet eisen.** Een conform model rolt zonder aanpassing uit op een
conforme engine. Het profiel benoemt de minimale verzameling elementen, en — even
belangrijk — legt vast dat een model voor zijn uitrolbaarheid niet afhankelijk
mag zijn van attributen die eigen zijn aan de engine van één leverancier.

**Conformiteit wordt aangetoond door.** Uitrol op een referentie-engine, waarbij
elke beslissing die het model declareert wordt geregistreerd.

### 4.3 Uitvoering — het rolt uit _én_ het geeft antwoord

**Waargenomen.** Dat zijn twee verschillende dingen, en in het gat ertussen zitten
de dure gebreken. Een beslissingsuitvoer met een label maar zonder naam
veroorzaakt een lege, niet-gelogde fout — maar pas zodra alle invoer oplost,
zodat zij zich verschuilt achter elk ander gebrek. Een lege invoerexpressie
levert een ongeldig model op dat _werkt_, omdat een engine raadt op grond van een
variabelenaam; het faalt later, wanneer er iets anders verandert. En één volledig
model bleek zijn eigen toekenningsuitkomst niet te kunnen bereiken.

**Het profiel moet eisen.** Elke uitkomst die een model declareert, moet met
enige invoer bereikbaar zijn, en het model moet voor elk daarvan een
gedocumenteerd verzoek met een gedocumenteerd antwoord beantwoorden. Onbereikbare
regels en onbereikbare uitvoer zijn conformiteitsfouten, geen waarschuwingen.

**Conformiteit wordt aangetoond door.** Statische bereikbaarheidsanalyse over de
beslistabellen, plus een live evaluatie die elke gedeclareerde uitkomst
demonstreert. Een model dat niet aan het ja zeggen te krijgen is, is niet conform.

### 4.4 Elke conditie moet haar plaats verdienen

**Waargenomen, en ronduit gezegd: dit hebben wij niet gedaan.** Alle drie de
rondes bereikten _regeldekking_ — één eigen testgeval per regel, 100, 121 en 65
gevallen voor 99, 25 en 55 regels. Het validatiedocument van Amsterdam zegt het
met zoveel woorden: "not strict classic MC/DC … but rule/decision coverage".

Regeldekking is de moeite waard. Zij vond onjuiste normbedragen, onbereikbare
uitvoer, en twee verschillende invoeren die stilzwijgend hetzelfde antwoordden.
Maar zij kan geen _conditie_ vinden die de uitkomst nooit zelfstandig beïnvloedt
— een kolom die decoratief is, of waarvan het effect altijd door een andere wordt
gemaskeerd. Daar is
[MC/DC](https://en.wikipedia.org/wiki/Modified_condition/decision_coverage)
precies voor bedoeld, en dat is de maatstaf die al wordt gehanteerd waar falende
software gevolgen heeft.

**Het profiel moet eisen** — geformuleerd als eigenschap, omdat het om de
eigenschap gaat en de methode om haar aan te tonen nog openstaat:

> Geen enkele conditie mag in een beslistabel voorkomen zonder bewijs dat zij op
> eigen kracht een uitkomst kan veranderen.

Een conditie die dat niet kan, is ballast of een gebrek. In een
rechtsbeslissing is zij erger dan beide: het is dan **een gegeven dat de burger
is gevraagd aan te leveren en dat diens antwoord nooit had kunnen beïnvloeden**.
Zo gelezen is dit helemaal geen testeis — het gaat over administratieve lasten
en dataminimalisatie, en het is controleerbaar.

**De kandidaat-methode is MC/DC**, precies de techniek om die eigenschap vast te
stellen: voor elke conditie een paar testgevallen dat alleen in die conditie
verschilt en waarbij de uitkomst verschilt. Meegeleverd als bewijs bij het
model, niet beweerd.

**Conformiteit wordt aangetoond door.** Een dekkingsrapport dat per conditie het
paar testgevallen benoemt dat het zelfstandige effect aantoont — en een live run
van alle gevallen.

**Dit is het enige van de vijf gebieden dat wij als hypothese voorleggen.** Over
de eigenschap zijn wij overtuigd. Of MC/DC haar op gewone beslistabellen kan
vaststellen is een open vraag, en §6.1 is het experiment dat die beslecht. Houdt
MC/DC geen stand, dan blijft de eigenschap staan en wordt de methode vervangen.

### 4.5 Een interoperabiliteitsafspraak over de interactiedialoog

**Waargenomen.** Een aanroepende partij heeft vandaag geen machineleesbaar
contract voor een beslisdienst. Concreet: de datum-invoer van één model moest als
tekst worden meegegeven in plaats van als datum, en dat was alleen te ontdekken
door het te proberen. Twee modellen geven "geen antwoord" op twee structureel
verschillende manieren terug — een leeg resultaat, en een resultaat waarvan alle
waarden leeg zijn — die verschillende dingen betekenen, en niets zegt welke te
verwachten valt. Het opsommen van de toegestane invoerwaarden van een model bleek
de voorwaarde te zijn om überhaupt een uitvoerbaar verzoek te kunnen samenstellen.

**Het profiel moet eisen.** Een gedeclareerd contract per beslisdienst:
invoernamen en -typen, toegestane waarden waar het domein gesloten is, de
woordenlijst van mogelijke uitkomsten, en de betekenis van elke verschijningsvorm
van "geen antwoord".

**Conformiteit wordt aangetoond door.** Uit uitsluitend het model een geldig
verzoek samenstellen, zonder verdere voorkennis, en dat met succes evalueren.

Dit is de eis met het grootste bereik. De andere vier maken een model
betrouwbaar; deze maakt het _bruikbaar voor een ander_, en dat is de hele reden
om beslissingen als dienst te publiceren.

### 4.6 De juridische koppeling, in een vorm die de infrastructuur van de wet zelf kan indexeren

> **Een zesde gebied, voorgesteld en niet verondersteld.** De vijf hierboven zijn
> de gebieden die wij ons hadden voorgenomen vast te leggen. Dit gebied volgt uit
> de doelstelling in §6.2, en het is de eis waarom §2.2 vraagt en die §4 verder
> onbeantwoord laat. Of het wordt overgenomen, is een besluit en geen
> uitgemaakte zaak.

**Waargenomen.** §2.2 legt vast dat `knowledgeSource` en `authorityRequirement`
bevatten wat de auteur erin zet: in het ene model herkomst van gegevens in plaats
van wetgeving, zonder oplosbaar adres. Een ander model droeg verankering op
celniveau in JuriConnect-vorm — en die verwijzing blijkt **teken voor teken de
identificatie te zijn waarop de landelijke juridische informatievoorziening al
sleutelt**. De koppeling tussen beslismodel en wet bestaat vandaag al, in één
model, bij toeval van goed vakmanschap in plaats van als eis.

**Het profiel moet eisen.** Dat een model verklaart welke wettelijke bepaling
elke verankerde regel uitvoert, als JuriConnect-verwijzing (`jci`) inclusief de
versiecoördinaten, op het niveau waarop die bepaling wordt gepubliceerd. Niet op
documentniveau "dit model gaat over de Participatiewet", maar op bepalingsniveau:
_deze regel voert artikel 36 uit zoals dat op deze datum luidde_.

**Conformiteit wordt aangetoond door.** Elke verklaarde verwijzing op te lossen
tegen de landelijke juridische informatievoorziening en de bepaling terug te
krijgen — en, zodra §6.2 bestaat, het model vanuit die bepaling weer terug te
vinden.

---

## 5. Wat dit niet is

Het benoemen waard, omdat elk van deze punten een begrijpelijke eerste reactie is
geweest:

- **Geen wijziging van DMN.** Een profiel perkt een bestaande standaard in. Aan
  OMG wordt niets gevraagd, en niets hierin hoeft op hen te wachten.
- **Geen nieuwe modelleertaal.** Elk model in de onderbouwing is gewoon DMN,
  gemaakt in gewone hulpmiddelen.
- **Niet de validator die wij al hebben.** De bestaande validator keurde alle
  drie de kapotte modellen goed. Conformiteit betekent hier _aangetoond gedrag_,
  geen schemacontrole — dat onderscheid is de kern van het voorstel.
- **Geen oordeel over de regelingen.** De keten meldt vragen aan het orgaan dat
  eigenaar is van de wet; zij beantwoordt ze niet. Vier van zulke vragen staan
  vandaag open en blijven open.
- **Geen afgerond werk vermomd als voorstel.** §4.4 is een eis waaraan wij niet
  voldoen. Dat wordt hier openlijk gezegd, en §6 is hoe eraan voldaan wordt.

---

## 6. De demonstrator: een vierde ronde op artikel 36

**Onderwerp:** Participatiewet, hoofdstuk 4, paragraaf 4.1, artikel 36 —
_individuele inkomenstoeslag_, op de geversioneerde verwijzing
<https://wetten.overheid.nl/jci1.3:c:BWBR0015703&hoofdstuk=4&paragraaf=4.1&artikel=36&z=2026-07-01&g=2026-07-01>.

Het is om vier redenen het juiste onderwerp, en die zijn niet toevallig:

1. **Het is al gemodelleerd.** Amsterdam modelleerde het tweemaal — zelfstandig,
   en binnen een model van 25 beslissingen — zodat er een referentiepunt is om
   tegen af te meten in plaats van een schatting.
2. **Het is al verankerd in precies dat artikel.** Die JCI-verwijzing zit vandaag
   in de verankering op celniveau van het bestaande model. De juridische koppeling
   die §4.2 gestandaardiseerd wil zien, bestaat hier al, in de vorm die het
   profiel zou moeten beschrijven.
3. **Het heeft de juiste omvang.** 8 condities en 5 regels. Groot genoeg om MC/DC
   betekenis te geven, klein genoeg om echte MC/DC haalbaar te maken — wat de
   drie afgeronde rondes, met 99, 25 en 55 regels, niet waren.
4. **Het is een echte rechtsbeslissing** over geld dat wordt uitgekeerd aan
   mensen met een laag inkomen, met een geversioneerde juridische bron. Er is
   niets speelgoedachtigs aan.

### 6.1 Wat de demonstrator precies toetst aan §4.4

De tabel van artikel 36 zoals die er vandaag ligt — acht condities, vijf regels,
`hitPolicy=FIRST`, vier regels die recht toekennen en één wildcardregel die
afwijst:

```
 C1 woonachtig in de gemeente        C5 vermogen op 31-12 vorig jaar
 C2 leeftijd >= 21                   C6 een schuldregeling
 C3 uitzicht op inkomensverbetering  C7 gezinssituatie
 C4 langdurig laag inkomen           C8 partner: uitzicht op inkomensverbetering

 R1  true  >=21  false  true  <=grens   ·    not "met partner"  ·     → true
 R2  true  >=21  false   ·      ·     true   not "met partner"  ·     → true
 R3  true  >=21  false  true  <=grens   ·           ·         false   → true
 R4  true  >=21  false   ·      ·     true          ·         false   → true
 R5   ·      ·     ·     ·      ·       ·           ·           ·     → false
```

**Wat regeldekking oplevert: vijf testgevallen.** Eén per regel. R1 bindt zes
condities, en één testgeval bewijst alleen dat _een_ combinatie R1 laat vuren.
Het toont nooit aan dat C5 ertoe doet. Was die cel onjuist, of is C5 vervuld
zodra C1 tot en met C4 dat zijn, dan slaagt het testgeval nog steeds en merkt
niemand iets.

**Wat MC/DC zou opleveren: ruwweg negen tot twaalf.** En elk extra testgeval is
een aanvrager die wordt afgewezen **op precies één grond** — en dat is in een
rechtsbeslissing de _motivering_: de grond die in de beschikking staat en
waarover een bezwaar gaat. Dat is het betoog voor §4.4 in één zin: kan dit model
voor elke afwijzingsgrond een juiste afwijzing op één grond produceren?

#### Drie manieren waarop het kan mislukken, alle zichtbaar in die tabel

**Maskering onder FIRST.** R1 en R3 verschillen alleen in C6, C7 en C8. Om aan
te tonen dat C7 de uitkomst zelfstandig beïnvloedt, is een testgeval nodig
waarin het omzetten van alleen C7 het antwoord verandert — maar door dat om te
zetten vuurt R1 niet meer en **kan R3 vuren en dezelfde `true` teruggeven**.
Geen verandering in uitkomst, dus geen zelfstandig effect aangetoond. Ook R3
breken betekent een tweede conditie wijzigen, en dan is het geen MC/DC-paar
meer. Of er voor elke conditie in een FIRST-tabel een geldig paar bestaat, is
werkelijk onbekend; bestaat het niet, dan is de methode onvervulbaar.

**MC/DC is gedefinieerd over booleaanse condities, en deze zijn dat niet.** C2 is
een bereiktoets op een berekende leeftijd, C5 een vergelijking met een
grenswaarde, C7 een tekstvergelijking. "De conditie omzetten" vraagt om een
definitie die het profiel zou moeten leveren voor bereiken en opsommingen. Blijkt
die definitie willekeurig, dan is zij niet handhaafbaar.

**Het kan voor sommige regels kloppen en voor andere ruis zijn.** R1 en R3 binden
elk zes condities, en daar is MC/DC zijn prijs waard. Andere tabellen in de
onderbouwing binden één conditie per regel; daar valt MC/DC samen met
regeldekking en leveren de extra testgevallen niets op.

#### De drie uitkomsten, vooraf vastgelegd

| Uitkomst                  | Wat §4.4 dan wordt                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| Houdt volledig stand      | zoals geschreven — de eigenschap, vastgesteld met MC/DC, voor elke beslistabel                      |
| Houdt stand met beperking | MC/DC alleen vereist voor regels die meer dan één conditie binden; elders regeldekking              |
| Houdt geen stand          | de methode vervalt, de eigenschap blijft, en de bereikbaarheidseis uit §4.3 draagt wat zij al droeg |

Wij zouden niet durven voorspellen welke. Daar gaat het juist om: een methode
voorschrijven die vervolgens onder een gewone hit policy onhaalbaar blijkt,
betekent een niet-handhaafbare standaard schrijven — en die schrijven voor
mensen die eraan moeten voldoen. Beter dat te ontdekken op acht condities van
één artikel.

#### Eén detail om te weten vóór de ronde begint

Het zelfstandige model van dit artikel draagt een uitvoer met een `label` en
**zonder `name`** — het gebrek uit §4.3, hersteld in het grotere model waarin het
ook voorkomt maar hier nooit teruggezet. De demonstrator begint dus met een model
dat al niet aan het profiel voldoet, en dat is een eerlijker vertrekpunt dan een
model dat wij eerst stilletjes hadden opgeschoond.

### 6.2 Van de wet naar het model, met één muisklik

Een tweede doelstelling voor de vierde ronde, en degene die de rest zichtbaar
maakt voor mensen die nooit een profiel zullen lezen.

**Wat er vandaag al is.** Op `wetten.overheid.nl` draagt artikel 36 een
relatie-icoon — _Toon relaties in LiDO_ — dat een venster opent met externe
relaties die bij `linkeddata.overheid.nl` bekend zijn, gegroepeerd naar het soort
object aan de andere kant: jurisprudentie, ministeriële regelingen, officiële
publicaties, wetten. Doorklikken brengt u in LiDO, waar de inkomende en uitgaande
relaties van het artikel worden opgesomd en gefilterd kunnen worden.

Elke categorie is een **juridisch document**. Een professional die het artikel
leest, kan de jurisprudentie bereiken die het uitlegt en de regelingen die ervan
afhangen. Wat hij of zij niet kan bereiken, is het beslismodel dat het uitvoert —
omdat die categorie niet bestaat.

**Wat wij voorstellen.** Publiceer het model van artikel 36 als linked data,
conform DMN-AP NL, registreer het in LiDO bij de bepaling die het uitvoert, en
voeg één regel toe aan dat venster:

> **Kennismodel**

Eén muisklik van de tekst van de wet naar het uitvoerbare model daarvan. En
vervolgens, naarmate meer regelingen zijn gemodelleerd, diezelfde klik vanaf elk
artikel dat er een heeft.

**Waarom dit haalbaar is en geen wensdenken.** De identificatie waarmee LiDO het
artikel adresseert, luidt
`jci1.3:c:BWBR0015703&hoofdstuk=4&paragraaf=4.1&artikel=36&z=2026-07-01&g=2026-07-01`.
Die tekenreeks staat **ongewijzigd al in de verankering op celniveau van het
bestaande Amsterdamse model van precies dit artikel**. Er hoeft geen afbeelding
te worden bedacht en geen koppeltabel te worden onderhouden: de sleutel waarop de
infrastructuur van de wet indexeert, is de sleutel die het modelleerwerk al
opschrijft. §4.6 is de eis die dat verandert van een gelukkig toeval in een
eigenschap van elk conform model.

**Wat het van wie vraagt.** Drie stappen, en alleen de eerste is van ons:

| Stap                                                                         | Wie                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------ |
| Het model als linked data publiceren, met zijn JuriConnect-verwijzingen erin | wij, in de vierde ronde                          |
| Een beslismodel accepteren als relateerbaar object en het indexeren          | de beheerder van LiDO (`linkeddata.overheid.nl`) |
| De regel _Kennismodel_ aan het relatievenster toevoegen                      | de beheerder van `wetten.overheid.nl`            |

Hiermee komt er een **vierde geadresseerde** bij de drie uit §2 — de juridische
informatievoorziening zelf. Dat is de reden dat deze doelstelling hier wordt
benoemd en niet verondersteld: niets eraan ligt in onze handen, en een profiel
dat prachtig verankerde modellen oplevert die vanuit de wet niet te vinden zijn,
zou het punt hebben gemist.

**Wat het zou aantonen.** Dat _van wet tot loket_ geen kreet is. De route wordt:
lees het artikel, klik één keer, zie het beslismodel dat het uitvoert, en — omdat
§4.3 dat eist — roep dat model aan en krijg antwoord. Voor een professional bij
een gemeente is dat het verschil tussen weten dát een regel bestaat en haar
kunnen toepassen.

### Wat de vierde ronde zou opleveren

| Product                        | Doel                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| DMN-AP NL, concept             | het profiel zelf, geschreven vóór de ronde, herzien door de ronde                                      |
| Een conformiteitscontrole      | de vijf gebieden uit §4, uitvoerbaar, draaibaar in CI                                                  |
| Het model                      | gewoon DMN, conform het concept                                                                        |
| Een MC/DC-testverzameling      | de eerste echte MC/DC-dekking in dit programma                                                         |
| Een gepubliceerde beslisdienst | linked data, met de juridische grondslag eraan vast                                                    |
| Een bevindingenrapport         | op welke eisen het model de eerste keer viel, en welke daarvan het profiel ving in plaats van een mens |
| Een registratie in LiDO        | het model vindbaar vanaf artikel 36 zelf, via een regel _Kennismodel_ (§6.2)                           |

### Hoe wij zouden weten of het profiel deugt

De demonstrator moet kunnen mislukken, anders bewijst hij niets. Drie maatstaven,
vooraf vastgelegd:

- **Vangt de controle wat mensen vingen?** Draai hem opnieuw tegen de drie
  afgeronde modellen. Hij hoort de gebreken die die rondes bij inspectie vonden
  zelfstandig te vinden. Alles wat hij mist, is een gat in het profiel.
- **Kost de vierde ronde minder dan de derde?** De catalogus maakte elke ronde
  al goedkoper. Zet een geschreven profiel dat niet voort, dan is het
  documentatie en geen infrastructuur.
- **Vindt MC/DC iets dat regeldekking niet vond?** §6.1 zet de drie uitkomsten
  uiteen die dit kan opleveren en wat elk daarvan met §4.4 doet. Levert
  volledige conditiedekking op een al tweemaal gemodelleerde beslissing niets
  op, dan is dat bewijs tégen de methode, en dan moeten wij dat zeggen.

Dat laatste punt is het eerlijke. Wij stellen een methode voor die wij zelf nog
niet hebben toegepast, op grond van een redenering, en in §6.1 wordt die
redenering getoetst.

---

## 7. Governance — de besluiten die wij vragen

Het eigenaarschap staat niet ter discussie. CPRMV is van u, de twee openstaande
vragen in §2 kwamen via die standaard bij u binnen, en een DMN-profiel perkt de
laag in die direct onder de laag ligt die CPRMV beschrijft. Het profiel hoort
daar waar de woordenlijst, de shapes en de publicatieafspraken al wonen.

Wij vragen **niet** om toepassing, om een verplichting aan leveranciers, of om
een plek op de "pas toe of leg uit"-lijst. Dat komt later, als de demonstrator
het verdient — en §6 is bewust zo opgezet dat hij dat ook níet kan verdienen.

Drie besluiten staan echt open:

**1 — Eén standaard of twee?** CPRMV beschrijft regels, regelsets en hun
juridische grondslag als linked data. DMN-AP NL zou de DMN-_bron_ inperken die
ze voortbrengt: of een model uitrolt, antwoord geeft, zijn dekking aantoont, en
declareert hoe het aan te roepen is. Aangrenzende lagen, één eigenaar. Of dat een
tweede document wordt of een nieuw onderdeel van CPRMV, is een vraag over hoe u
wenst te versioneren en te publiceren, en daar hebben wij geen belang bij.

**2 — Welke status, en wanneer?** De eindsituatie die een profiel tanden geeft,
is er een waarin een overheidsorgaan conformiteit van een leverancier kan
verlangen, wat langs de Nederlandse route de "pas toe of leg uit"-lijst betekent.
Wij vragen daar nu niet om, en zouden ertegen pleiten het te vragen voordat de
demonstrator rapporteert. Het benoemen van die bestemming verandert wél hoe het
concept geschreven moet worden, dus het is de moeite waard dit vroeg te
beslechten, ook al ligt de indiening ver weg.

**3 — Een opdracht voor de demonstrator.** De vierde ronde uit §6 vindt hoe dan
ook plaats; de vraag is of zij _tegen een conceptprofiel aan_ draait en
terugrapporteert, of dat zij een vierde eenmalige exercitie wordt. Alleen het
eerste toetst iets.

Dit is het besluit dat een uitgesproken ambitie omzet in een werkopdracht. Het
congres heeft vastgesteld dat het probleem wordt herkend; een opdracht op één
artikel van de Participatiewet stelt vast of het ook oplosbaar is, tegen de prijs
van één modelleerronde die toch al gepland stond.

### Wat wij zouden terugbrengen

Geen specificatie ter toetsing, maar het bewijsmateriaal dat een toetsing nodig
heeft: een concept, een uitvoerbare conformiteitscontrole, een testverzameling
ter grootte van vier regelingen, en een eerlijk rapport over welke eisen het
contact met een echte beslissing hebben doorstaan — §4.4 bovenal.

### Vervolgstappen, als hiermee wordt ingestemd

1. Een werkgroep beleggen onder Forum Standaardisatie — modelleren, juridische
   analyse, implementatie, en ten minste één organisatie die eraan zou moeten
   voldoen.
2. DMN-AP NL opstellen langs de vijf gebieden uit §4, met de drie afgeronde
   rondes als testcorpus.
3. De vierde ronde op artikel 36 tegen het concept aan uitvoeren.
4. Rapporteren: wat het profiel ving, wat het miste, wat het kostte, en welke
   van de drie uitkomsten uit §6.1 §4.4 heeft opgeleverd.
5. Pas daarna: besluiten of DMN-AP NL ter toetsing voor de "pas toe of leg
   uit"-lijst wordt aangeboden.

---

## 8. De onderbouwing

Alles hierboven rust op werk dat al is gedaan en gepubliceerd in deze repository.

|                                    | Amsterdam                    | SZW                   | Den Haag                     |
| ---------------------------------- | ---------------------------- | --------------------- | ---------------------------- |
| Regeling                           | inkomensregelingen           | bijstandsnormbedragen | recht op ALO                 |
| Beslissingen                       | 25                           | 2                     | 9 → 7                        |
| Regels                             | 99                           | 17 → 25               | 44 → 55                      |
| Testgevallen                       | 100                          | 121                   | 65                           |
| Uitgerold zoals ontvangen          | nee                          | nee                   | nee                          |
| Juridische verwijzingen in de bron | 48 bronnen / 99 verwijzingen | geen                  | 11 bronnen / 12 verwijzingen |
| Gepubliceerd als linked data       | ja                           | ja                    | ja                           |

**3 organisaties · 34 beslissingen · 179 regels · 286 testgevallen · vandaag 0
fouten.**

Twee kanttekeningen reizen met die kop mee en horen er niet van te worden
losgemaakt: de 179 regels zijn de _gepubliceerde_ modellen, waarvan er twee
tijdens de afleiding zijn gegroeid; en "0 fouten" betekent dat vandaag elk
testgeval slaagt tegen de live engine, niet dat de modellen juridisch juist zijn.

Voor de details:

| Voor                                              | Zie                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| De werkwijze die deze rondes volgden              | [`dmn-to-linked-data-workflow.md`](dmn-to-linked-data-workflow.md)                 |
| De gebrekencatalogus, alle vijftien families      | idem, §4                                                                           |
| Wat openstaat, en wie elk punt bezit              | idem, §13                                                                          |
| De presentatie voor een niet-technisch publiek    | [`dmn-workflow-slides/`](dmn-workflow-slides/)                                     |
| Het model van artikel 36 zoals het er nu ligt     | `examples/organizations/amsterdam/individuele inkomenstoeslag-iknow-patched.dmn`   |
| Wat er nodig was om dat model uitrolbaar te maken | `examples/organizations/amsterdam/individuele-inkomenstoeslag-iknow-deploy-fix.md` |
