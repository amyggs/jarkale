# Järkäle – ohjeet tekoälyavustajalle

Henkilökohtainen treeni- ja hyvinvointiseuranta. Yksi HTML-tiedosto (`index.html`), vanilla JS, ei frameworkkeja, ei build-vaihetta. Hostaus GitHub Pages. Kaikki käyttöliittymäteksti suomeksi.

## Repot
- `amyggs/jarkale` (tämä): oma versio, kaikki kehitys tänne.
- `amyggs/jarkale-pilotti`: pilottikäyttäjien versio. **Älä muokkaa pilotin `index.html`:ää käsin.** Se on tämän repon `index.html`, jossa alatunniste on "Pilotti vX", ja sen tekee `scripts/release.sh`. Pilotti tunnistetaan osoitteesta (`html.pilot`): PT-ominaisuudet piilossa (`.pt-only`), oma uutiskortti (`PILOT_NEWS`) ja oma Mitä uutta (`PILOT_CHANGELOG`).
- Työskentele niin, että pilotti on sisarkansiona: `../jarkale-pilotti`.

## Julkaisu
1. Tee muutos `index.html`:ään.
2. Nosta alatunnisteen versio (`Järkäle tracking vX.Y.Z`) ja lisää kohta `CHANGELOG`in alkuun (sama versio).
3. Jos muutos on pilotille merkittävä (hän huomaa sen tai hyötyy siitä), lisää kohta myös `PILOT_CHANGELOG`iin: päivämäärä otsikkona, käyttäjän näkökulmasta, ei versionumeroita. Korjaukset, joita käyttäjä ei huomaa, teemakohtaiset hienosäädöt ja kehittäjämerkinnät vain `CHANGELOG`iin.
4. Uusi testi → lisää se `tests/run.sh`:n listaan ja `tests/README.md`:n taulukkoon.
5. `scripts/release.sh` tarkistaa version, nostaa välimuistin (`sw.js`) molemmissa repoissa, ajaa `node --check`, rakentaa pilotin ja ajaa testit. `--commit "vX.Y.Z: …"` tekee lisäksi commitin ja pushin molempiin.
6. GitHub Actions ajaa testit jokaisesta pushista (`.github/workflows/tests.yml`). Tulokset kirjoitetaan ajon huomautuksiksi, joten ne näkyvät ilman lokia: `gh run view <id> --repo amyggs/jarkale` (ANNOTATIONS: yhteenveto kaikista tiedostoista, epäonnistuneista oma virherivi).

Älä julkaise, jos yksikin testi epäonnistuu.

## Testit
- Playwright + Chromium, Pixel 7 -emulointi, ajetaan UTC-ajassa. `tests/run.sh` tai `tests/run.sh test-gym.js`.
- Ennen ajoa vapauta portit: `fuser -k 8765/tcp 8766/tcp`.
- Testit eivät käytä oikeaa dataa. Repo on julkinen: **ei oikeita vientitiedostoja, ohjelmia tai henkilötietoja** repoon, vain keksittyjä esimerkkejä (`tests/fixtures/`).

## Tuotteen linja (lukittu)
- Käyttäjällä on jo ohjelma (oma tai valmentajan). Järkäle kirjaa sen ja näyttää, mitä tapahtuu. Ei ohjelmageneraattoria.
- Ei omaa palvelinta, ei käyttäjätiliä, ei analytiikkaa. Data puhelimessa ja halutessa käyttäjän omassa Google Drivessa (`drive.appdata`, `drive.file`). Tekoälyanalyysi vain käyttäjän omalla API-avaimella. Jos tietovirtoihin tulee muutos, päivitä `tietosuoja.html`.
- Rajattu pois: AI-valmentaja, painoehdotukset, ravinto/kaloriseuranta, lihaskartta, volyymi- ja tonnimäärät, liikekirjasto, puhekirjaus, levylaskuri, viikkoputki (päiväkohtainen kirjausputki pidetään).
- 20.10.2026 alkaen ei uusia ominaisuuksia ilman erillistä päätöstä. Korjaukset ja selkeytykset sallittuja.

## Teemat
- 9 teemaa (`data-palette`): ampiainen (= Järkäle, oletus), kaurapuuro, magnesium, lasi, soitin, fosfori, kuusnelonen, tekstitv, manageri. Jokaisessa vaalea ja tumma (`data-theme`).
- Käyttöliittymämuutos tarkistetaan kaikissa 9 × 2 yhdistelmässä, kapein leveys 360 px. Vaaleissa teemoissa tarkista erityisesti valkoiset reunat ja läpikuultavat elementit.
- `manifest.webmanifest`: `theme_color` #111312 on tarkoituksellinen. Chrome värittää asennetun sovelluksen Androidin alapalkin sillä; ilman sitä palkki on valkoinen. Älä poista äläkä vaihda vaaleaksi.

## Data
- `S.entries` = päiväkirjaukset (päivämäärä avaimena), `G` = sali (ohjelmat, `G.sessions`).
- Tuodut treenit (`source:"strong"`) eivät luo päiväkirjauksia (`gymHealLinks` ohittaa ne).
- Datamallin muutos vaikuttaa Drive-synkronointiin (poistomerkinnät), CSV-vientiin (`CSV_SCHEMA_VERSION`) ja PT-vientiin: tarkista kaikki kolme.

## Kirjoitustyyli
- Suomalaiset lukumuodot: desimaalipilkku, uni muodossa "7 h 20 min", sitovat välit sarjateksteissä (`60 × 10`).
- Tekstit kertovat käyttäjälle, mitä tapahtuu ja miksi. Ei teknistä jargonia.

## Tilan seuranta
Projektin päätökset ja versiohistoria ovat Clauden projektin dokumenteissa (`claude/jarkale-tracking-tila.md` ja jatko-osa `claude/jarkale-tracking-tila-jatko.md`). Lue ne ennen isompia muutoksia, jos ne ovat saatavilla.
