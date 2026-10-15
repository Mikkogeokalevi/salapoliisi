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

## V2+ (tulevat mysteerit)

Päätös: kaikki tulevat versiot (v2, v3, ...) SAMASSA Firebase-projektissa
`salapoliisi-dc4c0` (ilmaiset projektit loppu). GitHub Pages tarjoilee
`v2/`-alikansion suoraan → https://mikkogeokalevi.github.io/salapoliisi/v2/

Rakenne kun v2 tehdään:

- `v2/index.html`, `v2/admin.html`, `v2/data/seed.json` — omia
- `js/`, `css/` JAETTU → v2 viittaa `../js/` (skripti-tagit suhteellisina)
- Data ERIKSeen: `games/v2/{steps,solutions,rewards,solved,sessions,config}` —
  v1 säilyy nykyisissä juurikokoelmissa (`steps/`, `solved/`...) koska
  pelaajien progressio on jo kannassa. V2+ aina nimettyyn tilaan.

Mitä vaaditaan kun v2 otetaan työn alle:

1. engine.js/admin.js/sessions.js: kokoelmapolut helperin kautta,
   esim. `colPath("steps")` → `""` (v1) tai `games/v2/steps` (v2).
   Jo NYT: älä ota käyttöön uusia kokoelmia ilman tätä valmiutta.
2. localStorage-avaimet pelikohtaisiksi (`sp_nick` → `sp_nick_v2`) —
   localStorage on origin-kohtainen, joten v1/v2 jakavat avaimet jos
   ei nimetä.
3. firestore.rules: lisää generinen lohko `match /games/{game}/steps/{doc}`
   jne. samaan logiikkaan kuin juurikokoelmat (solutions suljettu,
   solved-verifiointi get():llä games/$(game)/solutions/...).
4. Admin ja tools/import.html: pelivalitsin tai v2-omat versiot jotka
   kirjoittavat games/v2/-polkuun.
5. Auth: sama anon signIn toimii — uid sama projektissa, mutta
   solved-dokumentit ovat eri polussa joten progressio ei sekoitu.
