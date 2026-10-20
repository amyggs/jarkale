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
| `test-effort.js` | Valinnainen ponnistuksen kirjaus (RIR/RPE): asetus, valinta kuitatun sarjan alla, tallennus RPE:nä, yhteenveto, edellinen kerta, jako |

- `run.sh` käynnistää kaksi paikallista palvelinta: 8765 (nykyinen versio) ja 8766 (vertailuversio).
- `fixtures/ohjelma-esimerkki.md` on keksitty ohjelma, jonka rakenne vastaa valmentajan tekstiohjelmaa. Oikeaa ohjelmaa ei tallenneta julkiseen repoon.
- Testit eivät käytä oikeaa dataa: jokainen testi tyhjentää selaimen muistin aluksi.
- Julkaisu: kaikkien testien pitää mennä läpi ennen kuin versio puskataan.
