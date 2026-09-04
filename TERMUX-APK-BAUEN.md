# CardGolf 3D – APK bauen (ganz einfach)

## Das Wichtigste zuerst: 1 Datei, 1 Befehl

1. Entpacke die ZIP-Datei auf deinem Handy, z.B. nach `Downloads/apk-project`
2. Öffne **Termux**
3. Kopier-paste diese 3 Zeilen (eine nach der anderen, Enter drücken):

```bash
termux-setup-storage
cd ~/storage/downloads/apk-project
bash build.sh
```

4. Warten. Beim ersten Mal dauert es ein paar Minuten (lädt Android-SDK
   herunter). Am Ende steht da:

```
FERTIG! Deine APK ist hier:
/storage/emulated/0/Download/CardGolf3D.apk
```

5. Öffne deinen **Datei-Manager** → **Downloads** → tippe auf
   **CardGolf3D.apk** → **Installieren**.
   Falls Android fragt "Aus unbekannter Quelle installieren erlauben?" →
   **Erlauben** antippen.

Das war's. Das Skript macht alles automatisch (Pakete installieren,
Android SDK laden, Lizenzen akzeptieren, App bauen) – du musst nichts
mehr bestätigen.

---

## Falls etwas schiefgeht

**"Speicherplatz voll" o.ä.** – Das SDK braucht ca. 1–2 GB freien Platz.

**Skript bricht mit einem Fehler ab** – Einfach nochmal `bash build.sh`
ausführen. Bereits heruntergeladene Sachen werden übersprungen, es geht
schneller weiter.

**Du willst nochmal von vorne anfangen** – Lösche einfach den ganzen
Ordner `~/android-sdk` und starte `bash build.sh` erneut.

---

## Wenn du das Spiel später änderst

Falls du irgendwann eine neue `index.html` bekommst:

1. Ersetze `www/index.html` mit der neuen Datei
2. Führe nochmal `bash build.sh` aus

Fertig – die neue Version wird automatisch mit eingebaut.

---

## Für Fortgeschrittene: Release-APK (signiert, zum Veröffentlichen)

Die Debug-APK aus `build.sh` reicht zum Selbst-Installieren und Testen
völlig aus. Für eine "echte" Release-Version (z.B. für den Play Store)
bräuchtest du zusätzlich einen eigenen Signatur-Schlüssel – das ist ein
extra Schritt, den wir bei Bedarf separat machen können.
