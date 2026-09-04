# CardGolf 3D – APK ganz ohne Termux bauen (empfohlen!)

Termux auf dem Handy hat leider Grenzen beim APK-Bauen (falsche
Prozessor-Architektur bei einem wichtigen Werkzeug namens `aapt2`,
lässt sich nicht sauber lösen). Der zuverlässigere Weg: **GitHub baut
die APK für dich, kostenlos, auf einem richtigen PC-Server.**

Das dauert insgesamt ca. 5 Minuten Arbeit von dir + ein paar Minuten
Wartezeit.

## Schritt 1: GitHub-Konto
Falls du noch keins hast: auf https://github.com kostenlos registrieren.

## Schritt 2: Neues Repository erstellen
1. Oben rechts auf das **+** tippen → **New repository**
2. Name eingeben, z.B. `cardgolf3d`
3. **Public** oder **Private** ist beides ok
4. **Create repository** antippen (ohne README hinzuzufügen)

## Schritt 3: Projekt hochladen
1. Auf der neuen, leeren Repository-Seite auf
   **"uploading an existing file"** tippen
2. Entpacke die ZIP-Datei auf deinem Handy/PC
3. **Alle Dateien und Ordner** aus dem entpackten `apk-project`-Ordner
   auswählen und hochladen (per Drag & Drop oder Dateiauswahl)
   - Wichtig: den Ordner `.github` nicht vergessen (kann versteckt sein,
     ggf. "versteckte Dateien anzeigen" aktivieren)
4. Unten auf **"Commit changes"** tippen

## Schritt 4: Warten, dann APK herunterladen
1. Oben im Repository auf den Reiter **"Actions"** tippen
2. Dort läuft automatisch ein Build namens "Build CardGolf 3D APK"
   (gelber Punkt = läuft noch, grüner Haken = fertig, dauert ca. 3-5 Min)
3. Auf den fertigen (grünen) Lauf tippen
4. Ganz unten bei **"Artifacts"** auf **"CardGolf3D-apk"** tippen
   → lädt eine ZIP mit der APK herunter
5. Diese ZIP entpacken → `app-debug.apk` ist deine fertige App

## Schritt 5: Installieren
`app-debug.apk` auf dein Handy übertragen (oder direkt dort
heruntergeladen) → im Datei-Manager antippen → installieren.
Falls gefragt: "Installation aus unbekannter Quelle erlauben".

---

Falls beim Hochladen die Datei-Anzahl zu groß ist (GitHub Web-Upload
mag keine riesigen Ordner): Du kannst den `node_modules`-Ordner vor dem
Hochladen einfach löschen, der wird für den APK-Build nicht gebraucht.
