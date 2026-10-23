# CardGolf3D – Netlify Workshop API (Integrationsentwurf)

## Enthalten
- `/.netlify/functions/workshop`: serverseitige Twitch-Tokenprüfung über Twitch Validate.
- Gemeinsame Workshop-Itemliste über Netlify Blobs.
- Serverseitige Erstellerprüfung beim Löschen.
- Kaufdatensätze und idempotente Erstattungsdatensätze (ein Datensatz pro Kauf).

## Wichtig – noch nicht als Echtgeld-/Münz-Wallet produktionsfertig
Der bestehende CardGolf3D-Spielstand und die erspielten Münzen liegen im Browser (`savePath`/localStorage). Deshalb kann ein Netlify-Endpunkt den korrekten Kontostand nicht sicher kennen, solange das Spielkonto und alle Münzbewegungen nicht vollständig auf eine serverseitige Wallet umgestellt wurden. Der API-Entwurf verbucht deshalb absichtlich keine endgültige Münzauszahlung und markiert Rückerstattungen als `pending-wallet-integration`. Damit werden keine falschen Erfolgsversprechen gemacht und keine Münzen verloren.

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
