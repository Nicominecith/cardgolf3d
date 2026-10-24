# CardGolf3D – Netlify Workshop API (Integrationsentwurf)

## Enthalten
- `/.netlify/functions/workshop`: serverseitige Twitch-Tokenprüfung über Twitch Validate.
- Gemeinsame Workshop-Itemliste über Netlify Blobs.
- Serverseitige Erstellerprüfung beim Löschen.
- Kaufdatensätze und idempotente Erstattungsdatensätze (ein Datensatz pro Kauf).

## Workshop komplett über Netlify Blobs
- Workshop-Items, Käufe, Ersteller-Einnahmen und Rückerstattungen liegen serverseitig in Netlify Blobs (`cardgolf3d-workshop`). Die Webseite hat dafür keinen lokalen Workshop-Speicher mehr.
- Kaufen/Veröffentlichen: erst Server, dann Münzen im Spielstand (schlägt der Server fehl, werden keine Münzen abgezogen).
- Einnahmen abholen (`claim`): Server setzt die Einnahmen auf 0 und liefert den Betrag.
- Item löschen (`delete`, nur Ersteller): Käufer bekommen beim nächsten Öffnen des Workshops automatisch ihre Münzen zurück (`claimRefunds`), das Item verschwindet bei ihnen.
- Beim Öffnen des Workshops werden Käufe geräteübergreifend wiederhergestellt (`myPurchases`).
- Preise stehen in `workshop.mjs` (`PRICE`, `CREATOR_CUT`) und müssen zu `WS_BUY_PRICE` / `WS_CREATOR_CUT` in `index.html` passen.
- Hinweis: Münzen selbst liegen weiter im Spielstand des Browsers. Wer Münzen manipuliert, kann sie also auch hier einsetzen; eine echte Wallet bräuchte eine transaktionsfähige Datenbank.

## Netlify deploy
1. ZIP-Inhalt ins GitHub-Repository übernehmen und auf Netlify deployen.
2. Sicherstellen, dass Netlify Blobs für die Site aktiviert ist.
3. Funktion erreichbar unter `/.netlify/functions/workshop`.
4. Twitch-Login muss einen gültigen Access Token in `Authorization: Bearer <token>` senden.

## Nächster notwendiger Schritt
Die Münzlogik (Münzen verdienen, ausgeben, Workshop kaufen, Ersteller-Einnahmen abholen) muss auf eine zentrale Wallet mit atomaren Buchungen umgestellt werden. Für parallele Käufe/Löschungen sollte dafür eine transaktionsfähige Datenbank verwendet werden; Netlify Blobs allein ist keine sichere Transaktions-Wallet.

## Neu: Workshop-Maps
- Eigene Maps werden im Browser gespeichert (Workshop → „Neue Map bauen“) und sind unter **Level** spielbar.
- „Veröffentlichen“ (Twitch-Login nötig) sendet die Map an `/.netlify/functions/workshop` (`publishMap`, max. 20 pro Spieler, Eingaben werden serverseitig geprüft). Alle Spieler sehen sie unter „Community-Maps“.
- Löschen eigener Maps: `deleteMap` (nur Ersteller).
- Ablauf im Spiel: Workshop-Map → nächste Workshop-Map → danach endlos zufällige Level.
- `netlify.toml` setzt Cache-Header, blockiert `main.js`/`package.json` im Web und liefert eine PWA-Datei (`manifest.webmanifest`).
