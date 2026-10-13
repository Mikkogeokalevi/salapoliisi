# Salapoliisi — interaktiivinen mysteeri-kätköpeli

Selainpohjainen geokätköilymysteeri: pelaaja toimii tutkijana salaisella tutkintakanavalla ja ratkoo ~10 koodilla toteutettua pulmavaihetta (Caesar-salaus, morse, numerolukot, kartta, johtoleikkuu, muistisarja, järjestely...). Jokainen ratkaistu vaihe paljastaa osan loppukoodista, jolla kätkö varmennetaan geocache-checkerissa.

## Tekniikka

- Vanilla HTML/CSS/JS — ei build-työkalua, ei paketinhallintaa
- Firebase Auth (anonyymi pelaajille + email/password adminille), Firestore
- Leaflet 1.9.4 + OpenStreetMap (karttapulmat)
- Web Audio API (morse, ääniefektit — ei äänitiedostoja)
- Hosting: GitHub Pages

## Tiedostot

```
index.html              # peli
admin.html              # hallinta (kirjautuminen)
sessions.html           # sessioiden tarkastelu (kirjautuminen)
tools/import.html       # seed.json → Firestore
js/                     # moottori + pulmamoduulit
css/                    # tyylit
data/seed.example.json  # datamallin pohja (julkinen)
data/seed.json          # TODELLINEN data — GITIGNORED (sisältää vastaukset!)
firestore.rules         # tietoturvasäännöt
push-to-github.bat      # julkaisu (tavallinen push)
```

## Vastussuojaus (anti-cheat)

Oikeat vastaukset ovat `solutions/`-kokoelmassa, jota pelaaja ei voi lukea.
Arvaus kirjoitetaan `solved/{uid}_{step}`-dokumenttina, ja Firestore-sääntö
vertaa sita ratkaisuun **palvelimella** — väärä arvaus = permission-denied.
Koodinpalat (`rewards/`) ovat luettavissa vain ratkaisseille.

→ DevToolsista ei löydy vastauksia. (Huom: riittävän määrätietoinen voi
aina arvata vastauksia kirjoituksin — säännöt estävät lukemisen, eivät
brute-forcea. Tähän tarkoitukseen riittävä.)

## Alkuasennus (kerta)

### 1. Firebase

1. console.firebase.google.com → projekti `salapoliisi-dc4c0` (luotu)
2. **Authentication → Sign-in method:** ota käyttöön **Email/Password** ja **Anonymous**
3. **Authentication → Users → Add user:** admin-sähköposti + salasana
4. **Firestore Database → Create database:** production mode, `europe-north1`
5. **Firestore → Rules:** liitä `firestore.rules`-tiedoston sisältö → **Publish**
   - VAIHDA ensin tiedostossa admin-sähköposti omaan (ja `js/config.js` ADMIN_EMAIL)
6. `js/config.js`: Firebase-config jo paikallaan

### 2. Data

```bash
py -m http.server 8000
# selain: http://localhost:8000/tools/import.html
```
- Kirjaudu admin-tunnuksilla → valitse `data/seed.json` → Aja tuonti
- Varmista admin.html:ssä että vaiheet + vastaukset + koodinpalat ovat perillä

### 3. GitHub

```bash
# repo: https://github.com/Mikkogeokalevi/salapoliisi (public)
# Pages: Settings → Pages → Deploy from branch → main → /(root)
push-to-github.bat
```

Peli: `https://mikkogeokalevi.github.io/salapoliisi/`

## Paikallinen ajo

```bash
py -m http.server 8000
# http://localhost:8000          → peli
# http://localhost:8000/admin    → hallinta
```

## Data-muutokset

- Pelidatan ainoa totuudenlähde: Firestore + paikallinen `data/seed.json`
- Muokkaa vaiheita `admin.html`:llä TAI `seed.json` + `tools/import.html`
- Admin → "Vie JSON" tekee täyden varmuuskopion (sisältää vastaukset — älä committaa)

## Turvallisuushuomiot

- Firebase API-avain on julkinen suunnitellusti — suojaus on säännöissä
- `data/seed.json` ja export-tiedostot sisältävät vastaukset — ne ovat .gitignoressa
- Admin-sähköposti: `js/config.js` ADMIN_EMAIL + `firestore.rules`
