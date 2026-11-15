# Provinciesprint — België

Zelfstandig browserspel over de 10 Belgische provincies en hun hoofdsteden.

## Spelen

Open `StartHier.html` rechtstreeks, of start een lokale server:

```sh
python3 -m http.server 8000 --directory games/belgie-provincies
```

Open daarna <http://localhost:8000/StartHier.html>.

## Spelregels

1. Klik de gevraagde provincies op de kaart. De eerste timer stopt na de tiende juiste klik.
2. Start de tweede ronde en sleep elke hoofdstad naar haar provincie. Deze ronde heeft een eigen timer.
3. De eindscore is de som van beide rondetijden.
4. Behoort de totaaltijd tot de lokale top 10, dan kan de speler een naam invullen. Het klassement blijft in deze browser bewaard via `localStorage`.

De kaart werkt met muis en touch. Met het toetsenbord gebruik je `Tab` en `Enter` of spatie: selecteer in ronde 2 eerst een stad en activeer daarna de juiste provincie. Het Brussels Hoofdstedelijk Gewest telt niet mee: België heeft 10 provincies en Brussel is een gewest.

Bij minder dan 10 opgeslagen scores komt iedere voltooide poging in aanmerking. Daarna kwalificeert alleen een tijd die strikt sneller is dan de huidige nummer 10. Namen zijn maximaal 24 tekens.

## Geografische data

De vereenvoudigde SVG-paden in `map-data.js` zijn afgeleid van `Belgium.provinces.WGS84.geojson` uit [Belgium Geographic Data](https://github.com/mathiasleroy/Belgium-Geographic-Data), copyright 2015 Mathias Leroy, beschikbaar onder de MIT-licentie. Brussel is uit de speelbare gebieden gefilterd. De WGS84-coördinaten worden lokaal equirectangulair geprojecteerd met lengtegraadcorrectie op de gemiddelde Belgische breedtegraad, zodat de landsvorm niet horizontaal wordt uitgerekt.
