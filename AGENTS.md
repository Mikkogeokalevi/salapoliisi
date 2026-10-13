# AGENTS.md — Salapoliisi

## Projekti

Staattinen HTML/CSS/JS geokätköilymysteeri. Ei buildia, ei npm:ää.
Firebase compat SDK 10.12.2 CDN:stä. Leaflet 1.9.4 CDN:stä.

## Komennot

- Paikallinen ajo: `py -m http.server 8000` → http://localhost:8000
- Julkaisu: `push-to-github.bat` (tavallinen push, EI force)
- Firestore-säännöt: `firestore.rules` → liitä konsoliin tai `firebase deploy --only firestore:rules`
- Datantuonti: avaa `tools/import.html` selaimessa admin-kirjautuneena

## Arkitehtuuri

- `index.html` = peli (boot → chat-virta → pulma-sheetit → loppukoodi)
- `js/engine.js` = tila + vastustarkistus (`solved`-dokumentit, sääntövertaus)
- `js/story.js` = chat-renderointi, `js/audio.js` = Web Audio
- `js/steps/*.js` = pulmatyypit; rekisteröityvät `window.Steps[type]`
- Pulmatyypin lisäys: luo tiedosto, rekisteröi tyyppi, lisää script-tag index.html:aan

## Data-sopimukset

- `steps/step_N` on julkinen — ei vastauksia sinne
- `solutions/step_N.answers[]` normalisoitu: `trim().toLowerCase()`, välit yhtenäistetty
- `rewards/step_N.{codePart,revealText}`
- `solved/{uid}_{stepId}`, `sessions/{uid}`, `sessions/{uid}/wrongAnswers`
- Loppukoodi: `solutions/final` + `rewards/final`

## Tärkeää

- `data/seed.json` ja export-JSON:t SISÄLTÄVÄT VASTAUKSET → .gitignore, älä committaa
- Admin-sähköposti kahdessa paikassa: `js/config.js` ADMIN_EMAIL + `firestore.rules`
- Mobiilifirst: testaa kapealla viewportilla; älä lisää hover-riippuvuutta
- Vanhaa `lahenalueet`-projektia ei kosketa — erillinen Firebase-projekti `salapoliisi-dc4c0`
