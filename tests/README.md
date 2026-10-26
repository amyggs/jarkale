# Regressiotestit

Playwright-hyväksymistestit, jotka ajetaan oikeaa `index.html`-tiedostoa vasten Chromiumissa (Pixel 7 -emulointi).

```
npm i playwright      # kerran
tests/run.sh          # kaikki testit
tests/run.sh test-gym.js
```

| Testi | Kattaa |
|---|---|
| `test-gym.js` | Saliosio: ohjelmien tuonti tekstinä, treenin kirjaus, ajastin, ennätykset, kehityskuvaajat, ohjelmanäkymä, liikenimien täsmäys |
| `test-sync.js` | Google Drive -synkronointi (väärennetyt GIS ja Drive), tilitarkistus, tombstonet, PT-kopio |
| `test-r1.js` | Päiväkirjaus, Päivän tila, PT-vienti ja taaksepäinyhteensopivuus vanhaan versioon (v2.9.3, haetaan gitistä) |
| `test-delete.js` | Päivän kirjauksen poisto, Kumoa, salitreenipäivä |
| `test-haptics.js` | Kosketusvärinän tasot |
| `test-safety.js` | Eheys: ei kaksoismäärittelyjä, perustavoitteet tallentuvat, vioittunut tallenne säilyy, (myöhemmin) nollaus/palautus synkronoinnin kanssa, fontit paikallisesti |
| `test-news.js` | Pilotin uutiskortti (tarvitsee `../jarkale-pilotti`) |
| `test-gymonly.js` | Pelkkää treeniä kirjaavan polku: Trendit, Mitat piilossa, ensimmäinen yhteenveto, tuonnin nimi ja Tallenna-nappi, viikkorivin selite |
| `test-effort.js` | Valinnainen koetun rasittavuuden kirjaus (RIR/RPE): asetus, valinta kuitatun sarjan alla, tallennus RPE:nä, yhteenveto, edellinen kerta, jako |
| `test-gymsettings.js` | Treeniasetukset Treeni-välilehdellä, pääasetuksissa vain pääkytkin, takaisin-ele, kapea näyttö |
| `test-backup.js` | Varmuuskopiomuistutus Treeni-kodissa (ehdot, sulkeminen) ja napin siirtymä Asetusten Drive-osioon (ei suoraa latausta); Kirjaa-muistutus |
| `test-setrow.js` | Toistojen − / + aktiivisella sarjalla (lähtö harmaasta ehdotuksesta), mahtuminen 360/412 px, pienennetyn liikerivin rivitys (nimi ei katkea kesken sanan) |
| `test-swap.js` | Vaihda liike kesken treenin: vanhan liikkeen tavoitepaino ja kirjoitetut kilot tyhjenevät, tehdyt sarjat säilyvät, ehdotus uuden liikkeen historiasta |
| `test-sumwrap.js` | Yhteenvedon liikerivit: nimi ei katkea, pitkä sarjarivi siirtyy nimen alle; ennätys liikkeen omalla rivillä, ei erillistä listaa (näkymä, jaettava teksti) |
| `test-swipereset.js` | Päivän vaihto pyyhkäisyllä: kesken vedon piiloutuva kortti (Kehon mittaus) ei jää sivuun siirretyksi, kun palataan tähän päivään |
| `test-strongtext.js` | Strongin Jaa treeni -tekstin tuonti ohjelmaksi: lämmittely pois, paunat kiloiksi, " - " nimessä, @strongapp/linkki/päiväys ohitetaan, tavallinen tuonti ennallaan |
| `test-trainfirst.js` | Treeni ensin: kesken oleva treeni avautuu käynnistyksessä, pelkkä treeni aloittaa Treeni-välilehdeltä, seuraava treeni Kirjaa-näkymässä vain suunniteltuna treenipäivänä |
| `test-hevy.js` | Treenihistorian tuonti Hevyn CSV:stä: tunnistus, päiväysmuoto, lämmittely ja aikasarjat pois, failure/dropset mukaan, paunat, kaksoistuonnin esto, lähde hevy |
| `test-progtext.js` | Ohjelmateksti Word-kopiona (tyhjä rivi joka välissä): supersarja ja kolmoissarja säilyvät, pitkä sulkeissa oleva ohje ohjeeksi, lyhyt tarkenne nimeen, loppupiste ei ohjeeksi |
| `test-extras.js` | Erikoistekniikat: "+ R/P + DS" tuonnissa lisäriveiksi, rivien tunnisteet, painoehdotukset (R/P sama, DS −30 %), ei sarjamäärään eikä ennätyksiin, yhteenveto, jako, seuraava kerta, valikosta lisäys |
| `test-archive.js` | Ohjelman arkistointi: kysymys uuden ohjelman tuonnin jälkeen (edellinen valittu ohjelma), Arkistoi muokkausnäkymän yläreunassa, ei uudella ohjelmalla |

- `run.sh` käynnistää kaksi paikallista palvelinta: 8765 (nykyinen versio) ja 8766 (vertailuversio).
- `fixtures/ohjelma-esimerkki.md` on keksitty ohjelma, jonka rakenne vastaa valmentajan tekstiohjelmaa. Oikeaa ohjelmaa ei tallenneta julkiseen repoon.
- Testit eivät käytä oikeaa dataa: jokainen testi tyhjentää selaimen muistin aluksi.
- Julkaisu: kaikkien testien pitää mennä läpi ennen kuin versio puskataan. `scripts/release.sh` ajaa ne osana julkaisua, ja GitHub Actions ajaa ne jokaisesta pushista (`.github/workflows/tests.yml`).
