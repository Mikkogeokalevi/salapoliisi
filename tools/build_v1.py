#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ================================================================
# Salapoliisi - V1-tuotantobuild
#
# Kopioi dist/v1/-kansioon vain ne tiedostot joita V1-peli tarvitsee.
# V2-steppimoduulit ja kehitystyokalut javat paketin ulkopuolelle.
#
# Ajo:  py tools/build_v1.py
# Tulos: dist/v1/ (voidaan tiputtaa mihin tahansa staattiselle
#        palvelimelle; GitHub Pages julkaisee edelleen repo-juuren)
# ================================================================
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist", "v1")

# V1-pelin kayttamat pulmatyypit (data/seed.json + tuotannon steps)
V1_STEPS = [
    "range", "sequence", "snake", "laser", "breakout",
    "maze", "mines", "flappy", "hanoi", "slider15",
]

FILES = [
    "index.html",
    "admin.html",
    "sessions.html",
    "favicon.png",
    "apple-touch-icon.png",
    "logo.jpg",
    "css/base.css",
    "css/game.css",
    "js/config.js",
    "js/firebase-init.js",
    "js/audio.js",
    "js/engine.js",
    "js/story.js",
    "js/admin.js",
    "js/sessions.js",
    "js/steps/common.js",
] + ["js/steps/%s.js" % s for s in V1_STEPS]

# Rivit joita EI kopioida HTML-tiedostoihin:
#  - script-tagit step-tyypeille jotka eivat ole V1_STEPS-listalla
#  - leaflet-viittaukset (ainoastaan V2:n mapClick-tyyppi kayttaa)
STEP_SCRIPT_RE = re.compile(r'js/steps/([A-Za-z0-9_]+)\.js')
LEAFLET_RE = re.compile(r'leaflet', re.I)


def filter_html(text):
    out = []
    for line in text.splitlines(True):
        m = STEP_SCRIPT_RE.search(line)
        if m and m.group(1) not in V1_STEPS and m.group(1) != "common":
            continue
        if LEAFLET_RE.search(line):
            continue
        out.append(line)
    return "".join(out)


def main():
    missing = [f for f in FILES if not os.path.isfile(os.path.join(ROOT, f))]
    if missing:
        print("VIRHE: lahtotiedostoja puuttuu:")
        for f in missing:
            print("  -", f)
        sys.exit(1)

    if os.path.isdir(DIST):
        shutil.rmtree(DIST)

    n_files = 0
    total = 0
    for rel in FILES:
        src = os.path.join(ROOT, rel)
        dst = os.path.join(DIST, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if rel.endswith(".html"):
            with open(src, "r", encoding="utf-8") as fh:
                text = filter_html(fh.read())
            with open(dst, "w", encoding="utf-8", newline="") as fh:
                fh.write(text)
        else:
            shutil.copyfile(src, dst)
        sz = os.path.getsize(dst)
        total += sz
        n_files += 1
        print("  + %-28s %7d B" % (rel, sz))

    print()
    print("V1-build valmis: %s" % DIST)
    print("%d tiedostoa, yhteensa %.1f KB" % (n_files, total / 1024.0))


if __name__ == "__main__":
    main()
