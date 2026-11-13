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
| `test-themes.js` | Kaikki 9 teemaa vaaleana ja tummana, 360 px: tekstin luettavuus mitattuna pikseleistä (kuva tekstin kanssa ja ilman, raja 3,0; himmeät ehdotusarvot 1,6), ei vaakaylivuotoa, tulevien päivien pallot erottuvat, tilarivin väri. Noin 2 min. Yhden teeman ajo: `PAL=soitin tests/run.sh test-themes.js` |
| `test-wrap.js` | Rivitys 360 px: pitkillä ohjelma-, päivä- ja liikenimillä mikään sana ei katkea keskeltä (yhdysmerkki ja ajatusviiva sallittu) eikä mikään mene reunan yli. 11 näkymää (Kirjaa, Trendit, Mitat, Asetukset, Treeni, treeni käynnissä, yhteenveto, muokkaus, liikehistoria, treenin asetukset, tuonnin esikatselu), teemat Järkäle, Teksti-TV ja Kuusnelonen |
| `test-month.js` | Kuukausikuva: treenimäärä ja -päivät (tyhjä treeni ei lasketa, kaksi samana päivänä), treenipäivien selite, suunnitellut päivät, kehitys (vain aiemman historian liikkeet, paras arvioitu maksimi), kuva syntyy kahdella teemalla, Jaa kuukausi -nappi ja kuukauden alun ehdotus (Playwrightin kello) |
| `test-ios.js` | iPhone selaimessa (iPhone 13 -emulointi Chromiumilla, ei WebKit): aloituksessa ohje Koti-valikkoon lisäämisestä, siirtokortti kun dataa on (Drive ensin), Myöhemmin piilottaa, ei ohjetta Koti-valikosta avattuna eikä Androidissa |
| `test-taps.js` | Napautusmittari: tavallinen treeni oikeilla napautuksilla (aloitus 1, sama sarja kuin viimeksi 1, painon tai toiston muutos 2, väärin kuitatun korjaus 3, lopetus 2; koko esimerkkitreeni 17). Kaatuu, jos perustilanne vaatii enemmän napautuksia |
| `test-e1cap.js` | Arvioitu maksimi vertailuissa enintään 12 toistolla: liikesivun paras sarja ja 1RM, kehityssuunta, yhteenvedon nuoli (samalla painolla toisto lisää on nousu myös yli 12 toistolla) |
| `test-chartrange.js` | Liikekäyrän aikaväli: valinnat vain kun tuovat lisää kertoja, oletus 6 kk, Kaikki koko historia, valinta muistetaan, vuosi pitkän välin päivämäärissä, vanha liike näkyy silti |
| `test-hold.js` | Kirjaa-näkymän −/+ pohjassa: arvo juoksee ja kiihtyy, ei ylimääräistä askelta irrotuksessa, vieritys ei muuta arvoa; askeleet 100 välein sadan ruudukkoon |
| `test-trainsec.js` | Kirjaa: salitreenipäivänä Salitreeni-nappi ilman treenityyppiä, rasitus ja kulku kortissa ja tallessa; ilman salitreeniä kuten ennen |
| `test-move.js` | Siirto omaan domainiin kahden originin välillä: ilmoitus piilossa kunnes kytketään, kaikki tiedot siirtyvät, #-osa poistuu, API-avain ei siirry, rikkinäinen linkki ja peruttu vahvistus eivät muuta tietoja |
| `test-feedback.js` | Palaute kehittäjälle: nappi vain pilotissa (asetukset ja Mitä uutta), mailto osoitteeseen tuki@jarkale.com, mukana versio, laite ja teema mutta ei kirjauksia |
| `test-layout.js` | Tabletti ja tietokone: puhelin ennallaan (myös askeleet), tabletilla 120 % ja paino/uni/askeleet samalla rivillä, tietokoneella sivupalkki palstan vasemmalla kaikissa 18 teemassa, kaaviot leveinä ja uudelleen piirrettyinä, iso näyttö suurenee |
| `test-multiprog.js` | Useampi käytössä oleva ohjelma: kaikkien päivät Treeni-välilehdellä (yhden päivän ohjelmat päivinä, monipäiväiset ryhminä), kierto ohjelmien yli, yksi ohjelma ennallaan, tuonti lisää yhden päivän ohjelmaan |

- `run.sh` käynnistää kaksi paikallista palvelinta: 8765 (nykyinen versio) ja 8766 (vertailuversio).
- `fixtures/ohjelma-esimerkki.md` on keksitty ohjelma, jonka rakenne vastaa valmentajan tekstiohjelmaa. Oikeaa ohjelmaa ei tallenneta julkiseen repoon.
- Testit eivät käytä oikeaa dataa: jokainen testi tyhjentää selaimen muistin aluksi.
- Julkaisu: kaikkien testien pitää mennä läpi ennen kuin versio puskataan. `scripts/release.sh` ajaa ne osana julkaisua, ja GitHub Actions ajaa ne jokaisesta pushista (`.github/workflows/tests.yml`).
