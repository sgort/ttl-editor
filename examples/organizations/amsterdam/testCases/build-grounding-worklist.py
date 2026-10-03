#!/usr/bin/env python3
"""
build-grounding-worklist.py

Produces concept-grounding-worklist.csv: every column in the DRD, how many cells
it governs, and the concepts it might be grounded in, ranked.

The round logged as step 11 in ../CHANGELOG.md enriched the six already-grounded
cells on Rule 1 using the @concept link in HvA_annotaties.xml. That link enriches
a cell that is already grounded; it cannot decide *which* concept grounds a cell
that is not, because the DMN names facts as camelCase variables
(npVermogen31DecemberVorigJaar) while the export names them as Dutch phrases
("Aanvrager heeft vermogen"), and nothing in the material records the
correspondence.

So this proposes rather than decides. Each row carries up to three ranked
candidates and an empty confirmed_concept_id column for a modeller to fill in.
See concept-grounding-worklist.md for the numbers and for why the ambiguous rows
are the majority.

Read-only with respect to the DMN and the annotation export.

Usage:
    python build-grounding-worklist.py
    python build-grounding-worklist.py --dmn ../HvA_full_dmn_export-patched.dmn \
        --annotations ../HvA_annotaties.xml --csv concept-grounding-worklist.csv
"""

import argparse
import csv
import os
import re

from lxml import etree

HERE = os.path.dirname(os.path.abspath(__file__))

# An input column names a fact, a condition or a value; an output names a legal
# relation. Restricting by type is what makes the subject-agreement check below
# worth anything -- without it every column matches dozens of Rechtssubjecten.
INPUT_TYPES = {"Juridisch relevant feit", "Voorwaarde", "Waarde"}
OUTPUT_TYPES = {"Rechtsbetrekking", "Juridisch relevant feit"}

# The DMN encodes the subject in the variable prefix; the concept names it in
# words. "patner" is a typo in the source export, kept so the match still works.
SUBJECT = {
    "np": {"natuurlijk", "natuurlijke", "persoon", "aanvrager", "rechthebbende"},
    "kind": {"kind", "scholier", "minderjarige"},
    "partner": {"partner", "patner"},
}

STOP = {"heeft", "een", "het", "van", "over", "beschikt", "wordt", "zijn",
        "met", "voor", "aan", "als", "die", "dat"}


def split_camel(word):
    return re.findall(r"[A-Z]?[a-z]+|[A-Z]+(?![a-z])", word)


def column_tokens(value):
    value = re.sub(r"\(.*?\)", " ", value)          # drop FEEL call arguments
    parts = []
    for word in re.split(r"[^A-Za-z]+", value):
        parts += split_camel(word)
    return [p.lower() for p in parts if p]


def name_tokens(name):
    return [t for t in re.findall(r"[a-zA-Z]+", name.lower()) if len(t) > 2]


def local(el):
    return etree.QName(el).localname


def load_annotations(path):
    """The export as delivered was not well-formed XML -- four <property>
    values held 14 unescaped double quotes. They were escaped on 2026-10-03
    (ttl-editor#190) and the file now parses strictly; the recovering parser is
    kept so a future re-export with the same defect still reads."""
    root = etree.parse(path, etree.XMLParser(recover=True, huge_tree=True)).getroot()
    concepts = [(c.get("id"), c.get("name"), c.get("type"))
                for c in root.iter("concept") if c.get("id") and c.get("name")]
    by_concept = {}
    for ann in root.iter("textannotation"):
        if ann.get("id") and ann.get("concept"):
            by_concept.setdefault(ann.get("concept"), []).append(ann)
    return concepts, by_concept


def citations_for(concept_id, by_concept):
    seen, out = set(), []
    for ann in by_concept.get(concept_id, []):
        jc = ann.get("juriconnect")
        if jc and jc not in seen:
            seen.add(jc)
            out.append(jc)
    return out


def collect_columns(dmn_path):
    """-> {column expression: {kind, cells, wild, grounded}}

    A column, not a cell, is the unit that names a fact: grounding is decided
    once per column and applies to every cell beneath it."""
    root = etree.parse(dmn_path).getroot()
    columns = {}
    for table in [e for e in root.iter() if local(e) == "decisionTable"]:
        specs = []
        for inp in [e for e in table if local(e) == "input"]:
            expr = None
            for ex in [c for c in inp if local(c) == "inputExpression"]:
                for t in [c for c in ex if local(c) == "text"]:
                    expr = (t.text or "").strip()
            specs.append(("input", expr or "(unnamed)"))
        for out in [e for e in table if local(e) == "output"]:
            specs.append(("output", out.get("name") or "(unnamed)"))

        for rule in [e for e in table if local(e) == "rule"]:
            cells = ([c for c in rule if local(c) == "inputEntry"]
                     + [c for c in rule if local(c) == "outputEntry"])
            for idx, cell in enumerate(cells):
                if idx >= len(specs):
                    continue
                kind, expr = specs[idx]
                rec = columns.setdefault(
                    expr, {"kind": kind, "cells": 0, "wild": 0, "grounded": 0})
                text = ""
                for t in [c for c in cell if local(c) == "text"]:
                    text = (t.text or "").strip()
                if text in ("", "-"):
                    rec["wild"] += 1
                else:
                    rec["cells"] += 1
                if any("source" in k or "cprmv" in k for k in cell.keys()):
                    rec["grounded"] += 1
    return columns


def rank(expr, kind, concepts):
    tokens = column_tokens(expr)
    prefix = tokens[0] if tokens and tokens[0] in SUBJECT else None
    body = set(t for t in (tokens[1:] if prefix else tokens)
               if t not in STOP and len(t) > 2)
    allowed = INPUT_TYPES if kind == "input" else OUTPUT_TYPES

    scored = []
    for cid, name, ctype in concepts:
        if ctype not in allowed:
            continue
        nt = set(name_tokens(name))
        if not nt:
            continue
        if prefix and not (nt & SUBJECT[prefix]):
            continue
        overlap = len(body & nt)
        if not overlap:
            continue
        scored.append((overlap / max(len(body | nt), 1), name, ctype, cid))
    scored.sort(reverse=True)
    return scored


def verdict_for(scored):
    if not scored:
        return "no candidate"
    top = scored[0][0]
    second = scored[1][0] if len(scored) > 1 else 0.0
    if top >= 0.99:
        return "exact"
    if top >= 0.5 and (top - second) >= 0.15:
        return "clear"
    return "ambiguous"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dmn", default=os.path.join(HERE, "..", "HvA_full_dmn_export-patched.dmn"))
    ap.add_argument("--annotations", default=os.path.join(HERE, "..", "HvA_annotaties.xml"))
    ap.add_argument("--csv", default=os.path.join(HERE, "concept-grounding-worklist.csv"))
    args = ap.parse_args()

    concepts, by_concept = load_annotations(args.annotations)
    columns = collect_columns(args.dmn)

    rows = []
    for expr, rec in columns.items():
        scored = rank(expr, rec["kind"], concepts)
        candidates = []
        for score, name, ctype, cid in scored[:3]:
            jc = citations_for(cid, by_concept)
            candidates.append([name, ctype, cid, round(score, 2), jc[0] if jc else ""])
        while len(candidates) < 3:
            candidates.append(["", "", "", "", ""])
        rows.append({"column": expr, "kind": rec["kind"], "cells": rec["cells"],
                     "wild": rec["wild"], "grounded": rec["grounded"],
                     "verdict": verdict_for(scored), "candidates": candidates})

    # ordered by payoff: the column that would ground the most cells comes first
    rows.sort(key=lambda r: (-r["cells"], r["column"]))

    with open(args.csv, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        header = ["dmn_column", "kind", "groundable_cells", "wildcard_cells",
                  "already_grounded", "verdict"]
        for n in (1, 2, 3):
            header += ["candidate_%d" % n, "type_%d" % n, "concept_id_%d" % n,
                       "score_%d" % n, "juriconnect_%d" % n]
        header.append("confirmed_concept_id")
        writer.writerow(header)
        for row in rows:
            out = [row["column"], row["kind"], row["cells"], row["wild"],
                   row["grounded"], row["verdict"]]
            for cand in row["candidates"]:
                out += cand
            out.append("")
            writer.writerow(out)

    total = sum(r["cells"] for r in rows)
    print("columns: %d, groundable cells: %d" % (len(rows), total))
    for v in ("exact", "clear", "ambiguous", "no candidate"):
        sub = [r for r in rows if r["verdict"] == v]
        print("  %-13s %3d columns  %4d cells"
              % (v, len(sub), sum(r["cells"] for r in sub)))
    print("\nwrote %s" % args.csv)


if __name__ == "__main__":
    main()
