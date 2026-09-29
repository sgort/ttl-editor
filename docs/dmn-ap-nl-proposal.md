# A Dutch application profile for DMN

**Proposal — DMN-AP NL**

_Nederlandse versie: [`dmn-ap-nl-voorstel.md`](dmn-ap-nl-voorstel.md)._

**To:** Forum Standaardisatie, as owner of the CPRMV specification.

**Following:** the breakout session "Van wet tot loket over de grenzen van je
organisatie heen; concrete kansen en mogelijkheden", which we hosted with
Amsterdam at _Congres: Forum Standaardisatie 20 jaar — Standaarden, openheid
en autonomie_. This was first proposed there, and the Forum's chair returned
to it in the closing remarks, together with the Forum's ambition to act on
it. What follows is that proposal written down.

Three questions came out of modelling three regulations as executable decision
services. No implementer can settle them, because each is a question about what
the standard should require rather than about how one tool behaves. This
proposes an application profile that settles them, and a fourth pass to prove
the profile works before anyone is asked to adopt it.

**Two of the three are already with you**, raised as open questions against
CPRMV during the first of those passes and still open. This proposal argues they
are not two loose ends but symptoms of the same missing thing — and that the
third question, which we had been treating as our own tooling defect, belongs in
the same place for the same reason.

Companion to [`dmn-to-linked-data-workflow.md`](dmn-to-linked-data-workflow.md),
which describes the work this rests on. Every figure quoted here was measured
from that work, not estimated.

---

## 1. The ask, in one page

**What we want:** agreement to develop **DMN-AP NL**, a Dutch application
profile for OMG DMN, and a mandate to demonstrate it on one article of the
Participatiewet before it is proposed to anyone for adoption. This is the
concrete form of the ambition the chair named at the congress: a route from
_wet_ to _loket_ that survives crossing an organisational boundary.

**From whom:** Forum Standaardisatie, which already owns CPRMV. The open
questions in §2 arrived there through that standard; this asks what to do about
the fact that they keep arriving.

**What it is:** a _constraint_ on an existing international standard, in the way
DCAT-AP profiles DCAT and CPSV-AP profiles CPSV. **It asks nothing of OMG.** The
base specification at <https://www.omg.org/dmn/> stays exactly as it is. A
profile says which of its options are mandatory here, and what a conformant
model must be able to prove.

**Why now:** we have run the same workflow three times — Amsterdam, SZW, Den
Haag — over **34 decisions and 179 rules**, and published all three as linked
data. The evidence is in hand, the failure modes are catalogued, and a fourth
regulation is queued. This is the moment to write down what we learned as a
requirement, rather than carrying it as institutional memory in three
changelogs — and because the Forum has already said, in public and from the
chair, that it intends to act on exactly this.

**What it costs:** one working group, and one modelling pass that was going to
happen anyway. §6 proposes running the fourth pass _against the draft profile_,
so the profile is tested by the work rather than in addition to it.

**What it would look like when it works:** a professional reads artikel 36 on
`wetten.overheid.nl`, clicks once, and is looking at the decision model that
implements it — and can call that model and get an answer. §6.2 sets out how,
and why the hard part is already done.

**The one-sentence case:**

> Every one of the three delivered models opened correctly in a modelling tool,
> passed validation, and could not be executed. Nothing in the standard says
> that is a failure.

---

## 2. The issue

The three passes produced findings in three lanes, separated by who can settle
them: the government body that owns the regulation, the tooling we build, and
the standard. This proposal is about the third lane only.

Three questions belong there.

### 2.1 What identifies a rule, and does it survive a re-export?

A rule needs a name that outlives the file it came from — so a decision can be
cited, audited, corrected and linked to the law it implements. Today nothing
requires one.

Observed: when a source model was re-exported from its authoring tool, rule
identifiers changed, and the local convention invented to cope
(`cprmv:ruleIdPath`) is ours, not the standard's. Separately, a generator
overwrote a published rule's real identifier with that rule's own web address in
**12 places in a single published file** — valid output, conformant to every
shape we could check, and wrong.

### 2.2 What is a decision model's relationship to the law it implements?

DMN has the constructs — `knowledgeSource`, `authorityRequirement` — and says
nothing about what they must carry or how they map onto anything downstream.

Observed: one model carried **11 knowledge sources and 12 authority links**;
they named data provenance rather than statute, carried no resolvable address,
and reached the published output not at all. Another carried **48 sources and 99
links**, of which 2 did not resolve. Our tooling reads none of it, which is our
gap to close — but it stays closed as long as no profile says what reading it
would mean.

### 2.3 What may a model claim about itself, and what must it prove?

This is the one that matters most, and the one with the least prior art.

Observed: **the validator passed all three delivered exports as `valid` while
none of them could run correctly.** One model could not grant entitlement at all
— both of its approval rules required a condition an earlier rule already
refuses, so under its own hit policy neither could ever fire. It was valid. It
opened. It deployed, once patched. It answered. It simply could never say yes,
and no check anyone ran was capable of noticing.

> **A note on the count.** The workflow document records two questions in the
> standard lane and one in the tooling lane. §2.2 promotes that third item
> deliberately: the tool reads no part of DMN's legal-source layer _because no
> profile requires it to_. Under a profile it stops being a tooling defect and
> becomes a conformance requirement. That reframing is the argument, and it is
> stated here rather than assumed.

---

## 3. Why a profile, and why this is not over-engineering

The three passes were run by people who knew what to look for — increasingly
so, because the catalogue grew as they went. Fifteen recurring defect families
are now checked before a model is deployed. That knowledge currently lives in
three changelogs and one workflow document, which is to say it lives in us.

A profile converts that into something a tool can check and a supplier can be
held to. The distinction that makes the case:

|                          | Today                             | Under a profile                                       |
| ------------------------ | --------------------------------- | ----------------------------------------------------- |
| "The model is valid"     | it parses, and satisfies a schema | it parses, deploys, answers, and proves its coverage  |
| Who checks               | whoever happens to know           | a conformance checker, in CI                          |
| What a supplier delivers | a file that opens                 | a file plus evidence it runs                          |
| When a defect is found   | after deployment, by inspection   | before acceptance, by a gate                          |
| What "done" means        | the model was handed over         | the model answered every question it claims to decide |

The three passes are the argument that this is not theoretical. Each found
defects the previous one had taught us to look for, and each found new ones
anyway.

---

## 4. What DMN-AP NL would specify

Five conformance areas. Each states what was observed, what the profile must
require, and — the part that makes it a profile rather than an opinion — how a
tool proves conformance.

### 4.1 Persistent identifiers at rule granularity

**Observed.** Rule identifiers changed across re-exports of the same source
model. A published file carried two different identifiers for the same subject
in 12 places. The convention that holds this together today is a local
invention.

**The profile must require.** Every rule carries an identifier that is unique
within its ruleset, stable across re-exports of the same source, and resolvable.
The profile defines how it is minted and forbids deriving it from a location —
an address is where something is, not what it is.

**Conformance is proved by.** Exporting the same source model twice and
comparing: every rule identifier unchanged. Merging the model's graph with the
legal graph it cites: no subject carrying two different identifiers.

### 4.2 Deployment

**Observed.** None of the three delivered models deployed as received. Causes
ranged from a missing engine-specific attribute on 25 decisions, through 48
unescaped ampersands that made the file invalid XML, to expressions with
unbalanced parentheses.

**The profile must require.** A conformant model deploys to a conformant engine
without modification. The profile names the minimum element set, and — equally
important — states that a model must not depend on attributes specific to one
vendor's engine in order to be deployable at all.

**Conformance is proved by.** Deployment to a reference engine, registering
every decision the model declares.

### 4.3 Execution — it deploys _and_ it answers

**Observed.** The two are not the same thing, and the gap between them is where
the expensive defects live. A decision output carrying a label but no name
causes a blank, unlogged failure — but only once every input resolves, so it
hides behind any other defect. An empty input expression produces an invalid
model that _works_, because an engine guesses from a variable name; it fails
later, when something unrelated changes. And an entire model proved unable to
reach its own approval outcome.

**The profile must require.** Every outcome a model declares must be reachable
by some input, and the model must answer a documented request with a documented
response for each one. Unreachable rules and unreachable outputs are conformance
failures, not warnings.

**Conformance is proved by.** Static reachability analysis over the decision
tables, plus a live evaluation demonstrating each declared outcome. A model that
cannot be made to say yes does not conform.

### 4.4 Every condition must earn its place

**Observed, and stated plainly: we have not done this.** All three passes
achieved _rule coverage_ — one dedicated case per rule, 100, 121 and 65 cases
for 99, 25 and 55 rules. Amsterdam's own validation document says so in terms:
"not strict classic MC/DC … but rule/decision coverage".

Rule coverage is worth having. It found wrong benefit amounts, unreachable
outputs, and two different inputs silently answering identically. But it cannot
find a _condition_ that never independently affects the outcome — a column that
is decorative, or one whose effect is always masked by another. That is exactly
what [MC/DC](https://en.wikipedia.org/wiki/Modified_condition/decision_coverage)
is for, and it is the standard already used where software failure has
consequences.

**The profile must require** — stated as a property, because the property is
what matters and the method for proving it is still open:

> No condition may appear in a decision table without evidence that it can, on
> its own, change an outcome.

A condition that cannot is either dead weight or a defect. In a benefits
decision it is worse than either: it is **a fact the citizen was asked to supply
that could never have affected their answer**. Read that way this is not a
testing requirement at all — it is administrative burden and data minimisation,
and it is checkable.

**The candidate method is MC/DC**, which is exactly the technique for
establishing that property: for each condition, a pair of cases differing in
that condition alone, in which the outcome differs. Submitted as evidence with
the model, not asserted.

**Conformance is proved by.** A coverage report naming, per condition, the pair
of cases that demonstrates its independent effect — and a live run of all of
them.

**This is the one area of the five we are proposing as a hypothesis.** The
property we are confident about. Whether MC/DC can establish it on ordinary
decision tables is an open question, and §6.1 is the experiment that settles it.
If MC/DC does not survive, the property stands and the method is replaced.

### 4.5 An interoperability agreement on the interaction dialog

**Observed.** A caller today has no machine-readable contract for a decision
service. Concretely: one model's date input had to be sent as a string rather
than a date, discoverable only by trying it. Two models return "no answer" in
two structurally different ways — an empty result, and a result whose values are
all empty — which mean different things, and nothing says which to expect.
Enumerating a model's allowed input values turned out to be what makes an
evaluable request constructible at all.

**The profile must require.** A declared contract per decision service: input
names and types, allowed values where the domain is closed, the vocabulary of
possible outcomes, and the meaning of each shape of "no answer".

**Conformance is proved by.** Constructing a valid request from the model alone,
with no other knowledge, and evaluating it successfully.

This is the requirement with the widest reach. The other four make a model
trustworthy; this one makes it _usable by somebody else_, which is the whole
point of publishing decisions as services.

### 4.6 The legal link, in a form the law's own infrastructure can index

> **A sixth area, proposed rather than assumed.** The five above are the ones we
> set out to specify. This one follows from the objective in §6.2, and it is the
> requirement §2.2 asks for and that §4 otherwise leaves unanswered. Whether to
> adopt it is a decision, not a foregone conclusion.

**Observed.** §2.2 records that `knowledgeSource` and `authorityRequirement`
carry whatever an author puts in them: in one model, data provenance rather than
statute, with no resolvable address. A different model carried cell-level
grounding in JuriConnect form — and that reference turns out to be **byte-for-byte
the identifier the national legal-information service already keys on**. The join
between a decision model and the law exists today, in one model, by accident of
good practice rather than by requirement.

**The profile must require.** That a model declares which legal provision each
grounded rule implements, as a JuriConnect (`jci`) reference including the
version coordinates, at the granularity at which the provision is published. Not
a document-level "this model concerns the Participatiewet", but provision-level:
_this rule implements artikel 36 as it stood on this date_.

**Conformance is proved by.** Resolving every declared reference against the
national legal-information service and getting the provision back — and, once
§6.2 exists, finding the model again from that provision.

---

## 5. What this is not

Worth stating, because each has been a reasonable first reaction:

- **Not a change to DMN.** A profile constrains an existing standard. OMG is
  not asked for anything, and nothing here needs to wait for them.
- **Not a new modelling language.** Every model in the evidence base is ordinary
  DMN, authored in ordinary tools.
- **Not a validator we already have.** The existing validator passed all three
  broken models. Conformance here means _demonstrated behaviour_, not a schema
  check — that distinction is the substance of the proposal.
- **Not a judgement on the regulations.** The pipeline reports questions to the
  body that owns the law; it does not answer them. Four such questions are open
  today and stay open.
- **Not finished work dressed as a proposal.** §4.4 is a requirement we have not
  met. That is said openly, and §6 is how it gets met.

---

## 6. The demonstrator: a fourth pass on artikel 36

**Subject:** Participatiewet, hoofdstuk 4, paragraaf 4.1, artikel 36 —
_individuele inkomenstoeslag_, at the versioned reference
<https://wetten.overheid.nl/jci1.3:c:BWBR0015703&hoofdstuk=4&paragraaf=4.1&artikel=36&z=2026-07-01&g=2026-07-01>.

It is the right subject for four reasons, and they are not incidental:

1. **It is already modelled.** Amsterdam modelled it twice — standalone, and
   inside a 25-decision model — so there is a baseline to measure against rather
   than a guess.
2. **It is already grounded in that exact article.** That JCI reference is
   present in the existing model's cell-level grounding today. The legal link
   §4.2 asks the profile to standardise already exists here, in the form the
   profile would need to describe.
3. **It is the right size.** 8 conditions and 5 rules. Large enough that MC/DC
   is meaningful, small enough that true MC/DC is achievable — which the three
   completed passes, at 99, 25 and 55 rules, were not.
4. **It is a real entitlement decision** about money paid to people on a low
   income, with a versioned legal source. Nothing about it is a toy.

### 6.1 What the demonstrator actually tests about §4.4

The article 36 table, as it stands today — eight conditions, five rules,
`hitPolicy=FIRST`, four rules granting entitlement and one wildcard default
refusing it:

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

**What rule coverage gives you: five cases.** One per rule. R1 binds six
conditions, and one case proves only that _some_ combination makes R1 fire. It
never shows that C5 matters. If that cell were wrong, or if C5 were satisfied
whenever C1–C4 are, the case still passes and nothing notices.

**What MC/DC would give you: roughly nine to twelve.** And each additional case
is an applicant refused **for exactly one reason** — which in a benefits
decision is the _motivering_, the ground stated in the letter and the thing an
appeal turns on. That is the argument for §4.4 in one line: can this model
produce a correct single-ground refusal for every ground there is?

#### Three ways it can fail, all visible in that table

**Masking under FIRST.** R1 and R3 differ only in C6, C7 and C8. To show C7
independently affects the outcome you need a case where flipping C7 alone
changes the answer — but flipping it stops R1 firing and **R3 may then fire and
return the same `true`**. No change in outcome, so no independent effect
demonstrated. Breaking R3 as well means changing a second condition, which is no
longer an MC/DC pair. Whether a valid pair exists for every condition in a
FIRST-hit table is genuinely unknown, and if it does not, the method is
unsatisfiable.

**MC/DC is defined over boolean conditions, and these are not.** C2 is a range
test on a computed age, C5 a comparison against a threshold, C7 a string test.
"Flip the condition" needs a definition the profile would have to supply for
ranges and enumerations. If that definition turns out arbitrary, it cannot be
enforced.

**It may be right for some rules and noise for others.** R1 and R3 bind six
conditions each, where MC/DC earns its cost. Other tables in the evidence base
bind one condition per rule, where MC/DC collapses into rule coverage and the
extra cases buy nothing.

#### The three outcomes, fixed in advance

| Outcome            | What §4.4 becomes                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Survives intact    | as written — the property, established by MC/DC, for every decision table                                               |
| Survives qualified | MC/DC required only for rules binding more than one condition; rule coverage elsewhere                                  |
| Fails              | the method is dropped, the property stays, and §4.3's reachability requirement carries the load it was already carrying |

We would not predict which. That is the point of running it: mandating a method
that then proves unachievable under an ordinary hit policy would mean writing an
unenforceable standard, and writing it for people obliged to comply with it.
Better to find out on eight conditions of one article.

#### One detail worth knowing before the pass starts

The standalone model of this article carries an output with a `label` and **no
`name`** — the defect described in §4.3, fixed in the larger model it also
appears in but never back-ported here. The demonstrator therefore begins with a
model that already fails the profile, which is a more honest starting point than
one we had quietly cleaned up first.

### 6.2 From the law to the model, in one click

A second objective for the fourth pass, and the one that makes the rest visible
to people who will never read a profile.

**What exists today.** On `wetten.overheid.nl`, artikel 36 carries a relations
icon — _Toon relaties in LiDO_ — which opens a panel of external relations held
at `linkeddata.overheid.nl`, grouped by the kind of thing on the other end:
jurisprudentie, ministeriële regelingen, officiële publicaties, wetten. Following
it opens LiDO, where the article's incoming and outgoing relations are listed and
can be filtered.

Every category is a **legal document**. A professional reading the article can
reach the case law that interprets it and the regulations that depend on it. What
they cannot reach is the decision model that executes it — because no such
category exists.

**What we propose.** Publish the artikel 36 model as linked data conformant to
DMN-AP NL, register it in LiDO against the provision it implements, and add one
entry to that panel:

> **Kennismodel**

One click from the text of the law to the executable model of it. Then, as more
regulations are modelled, the same click from every article that has one.

**Why this is tractable rather than aspirational.** The identifier LiDO uses to
address the article is
`jci1.3:c:BWBR0015703&hoofdstuk=4&paragraaf=4.1&artikel=36&z=2026-07-01&g=2026-07-01`.
That string is **already present, unchanged, in the cell-level grounding of the
existing Amsterdam model of this very article**. No mapping has to be invented
and no crosswalk has to be maintained: the key the law's infrastructure indexes
on is the key the modelling work already writes down. §4.6 is the requirement
that turns that from a happy accident into a property every conformant model has.

**What it needs from whom.** Three things, and only the first is ours:

| Step                                                                  | Who                                             |
| --------------------------------------------------------------------- | ----------------------------------------------- |
| Publish the model as linked data, carrying its JuriConnect references | us, in the fourth pass                          |
| Accept a decision model as a relatable object and index it            | the operator of LiDO (`linkeddata.overheid.nl`) |
| Add the _Kennismodel_ entry to the relations panel                    | the operator of `wetten.overheid.nl`            |

This adds a **fourth addressee** to the three in §2 — the legal-information
infrastructure itself. It is the reason this objective is stated here rather than
assumed: nothing about it is in our gift, and a profile that produced beautifully
grounded models nobody could find from the law would have missed the point.

**What it would demonstrate.** That _van wet tot loket_ is not a slogan. The
route becomes: read the article, click once, see the decision model that
implements it, and — because §4.3 requires it — call that model and get an
answer. For a professional at a municipality, that is the difference between
knowing a rule exists and being able to apply it.

### What the fourth pass would produce

| Deliverable                  | Purpose                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| DMN-AP NL, draft             | the profile itself, written before the pass, revised by it                                                |
| A conformance checker        | the five areas of §4, executable, runnable in CI                                                          |
| The model                    | ordinary DMN, conformant to the draft                                                                     |
| An MC/DC suite               | the first true MC/DC coverage in this programme                                                           |
| A published decision service | linked data, with its legal basis attached                                                                |
| A findings report            | which requirements the model failed first time, and which of them the profile caught rather than a person |
| A LiDO registration          | the model discoverable from artikel 36 itself, via a _Kennismodel_ entry (§6.2)                           |

### How we would know the profile is any good

The demonstrator has to be able to fail, or it proves nothing. Three measures,
fixed in advance:

- **Does the checker catch what people caught?** Re-run it against the three
  completed models. It should independently find the defects those passes found
  by inspection. Anything it misses is a gap in the profile.
- **Does the fourth pass cost less than the third?** The catalogue already made
  each pass cheaper. If a written profile does not continue that, it is
  documentation rather than infrastructure.
- **Does MC/DC find something rule coverage did not?** §6.1 sets out the three
  outcomes this can return and what each does to §4.4. If full condition
  coverage on an already twice-modelled decision surfaces nothing, that is
  evidence against the method, and we should say so.

That last point is the honest one. We are proposing a method we have not yet
used, on the strength of an argument, and §6.1 is where the argument gets
tested.

---

## 7. Governance — the decisions we are asking for

Ownership is not in question. CPRMV is yours, the two standing questions in §2
came to you through it, and a DMN profile constrains the layer immediately
beneath the one CPRMV describes. The profile belongs where the vocabulary,
the shapes and the publishing conventions already live.

We are **not** asking for adoption, a mandate on suppliers, or a place on the
comply-or-explain list. Those come later, if the demonstrator earns them — and
§6 is deliberately built so that it can fail to.

Three decisions are genuinely open:

**1 — One standard or two?** CPRMV describes rules, rulesets and their legal
basis as linked data. DMN-AP NL would constrain the DMN _source_ that produces
them: whether a model deploys, answers, proves its coverage, and declares how to
call it. Adjacent layers, one owner. Whether that is a second document or a new
part of CPRMV is a question about how you prefer to version and publish, and we
have no stake in the answer.

**2 — What standing, and when?** The end state that gives a profile teeth is one
where a public body can require conformance from a supplier, which on the Dutch
route means the comply-or-explain list. We are not asking for that now, and
would argue against asking before the demonstrator reports. Naming it as the
intended destination changes how the draft should be written, so it is worth
settling early even if the submission is far off.

**3 — A mandate for the demonstrator.** The fourth pass in §6 happens either
way; the question is whether it runs _against a draft profile_ and reports back,
or runs as a fourth one-off. Only the first tests anything.

This is the decision that converts a stated ambition into a work item. The
congress established that the problem is recognised; a mandate for one article
of the Participatiewet establishes whether it is tractable, at a cost of one
modelling pass that was already scheduled.

### What we would bring back

Not a specification for assessment, but the evidence an assessment would need:
a draft, an executable conformance checker, four regulations' worth of test
corpus, and an honest report on which requirements survived contact with a real
decision — §4.4 most of all.

### Next steps, if this is agreed

1. Convene a working group under Forum Standaardisatie — modelling, legal
   analysis, implementation, and at least one body that would have to conform.
2. Draft DMN-AP NL against the five areas in §4, with the three completed passes
   as the test corpus.
3. Run the fourth pass on artikel 36 against the draft.
4. Report: what the profile caught, what it missed, what it cost, and which
   of §6.1's three outcomes §4.4 returned.
5. Only then: decide whether to take DMN-AP NL through assessment for the
   comply-or-explain list.

---

## 8. The evidence base

Everything above rests on work already done and published in this repository.

|                           | Amsterdam             | SZW                   | Den Haag              |
| ------------------------- | --------------------- | --------------------- | --------------------- |
| Regulation                | income schemes        | bijstandsnorm amounts | ALO entitlement       |
| Decisions                 | 25                    | 2                     | 9 → 7                 |
| Rules                     | 99                    | 17 → 25               | 44 → 55               |
| Test cases                | 100                   | 121                   | 65                    |
| Deployed as received      | no                    | no                    | no                    |
| Legal links in the source | 48 sources / 99 links | none                  | 11 sources / 12 links |
| Published as linked data  | yes                   | yes                   | yes                   |

**3 bodies · 34 decisions · 179 rules · 286 test cases · 0 failures today.**

Two caveats travel with that headline and should not be separated from it: the
179 rules are the _published_ models, two of which grew during derivation; and
"0 failures" means every case passes against the live engine today, not that the
models are legally correct.

For detail:

| For                                         | Read                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| The workflow these passes followed          | [`dmn-to-linked-data-workflow.md`](dmn-to-linked-data-workflow.md)                 |
| The defect catalogue, all fifteen families  | same, §4                                                                           |
| What is open, and who owns each item        | same, §13                                                                          |
| The slide deck for a non-technical audience | [`dmn-workflow-slides/`](dmn-workflow-slides/)                                     |
| The artikel 36 model as it stands today     | `examples/organizations/amsterdam/individuele inkomenstoeslag-iknow-patched.dmn`   |
| What it took to make that one deployable    | `examples/organizations/amsterdam/individuele-inkomenstoeslag-iknow-deploy-fix.md` |
