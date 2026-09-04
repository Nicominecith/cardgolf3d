#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
#  CardGolf 3D – Ein-Klick APK-Build fuer Termux
#  Einfach ausfuehren mit:  bash build.sh
#  Alles laeuft automatisch durch (-y ueberall), keine Fragen.
# ============================================================
set -e

# --- 0. Auf internen Speicher kopieren, falls noetig ---
# Auf dem externen/geteilten Speicher (~/storage/...) verbietet Android das
# Ausfuehren von Dateien (noexec), auch wenn chmod +x klappt. Deshalb das
# Projekt bei Bedarf zuerst in den internen, privaten Termux-Speicher kopieren.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
INTERNAL_DIR="$HOME/apk-project"

if [[ "$SCRIPT_DIR" == "$HOME/storage"* ]] || [[ "$SCRIPT_DIR" == /storage/* ]] || [[ "$SCRIPT_DIR" == /sdcard/* ]]; then
    if [ "$SCRIPT_DIR" != "$INTERNAL_DIR" ]; then
        echo "Projekt liegt auf externem Speicher (dort kann Android keine"
        echo "Skripte ausfuehren). Kopiere einmalig nach: $INTERNAL_DIR ..."
        rm -rf "$INTERNAL_DIR"
        cp -r "$SCRIPT_DIR" "$INTERNAL_DIR"
        cd "$INTERNAL_DIR"
        exec bash build.sh
    fi
fi

echo "=================================================="
echo " CardGolf 3D - APK wird gebaut. Bitte warten..."
echo " (Beim ersten Mal dauert das ein paar Minuten)"
echo "=================================================="

# Verhindert, dass Android Termux in den Tiefschlaf schickt waehrend gebaut wird
termux-wake-lock 2>/dev/null || true

# --- 1. Termux-Pakete ---
echo ""
echo "[1/5] Installiere benoetigte Pakete..."

# Falls Termux noch auf den alten, nicht mehr gepflegten Server "termux.net"
# zeigt, fehlen neuere Pakete wie openjdk-17. Auf den aktuellen offiziellen
# Server umstellen, falls noetig.
REPO_FILE="$PREFIX/etc/apt/sources.list"
if [ -f "$REPO_FILE" ] && grep -q "termux.net" "$REPO_FILE"; then
    echo "Alter Paket-Server erkannt, stelle auf aktuellen Server um..."
    echo "deb https://packages.termux.dev/apt/termux-main stable main" > "$REPO_FILE"
fi

yes | pkg update -y
yes | pkg upgrade -y
pkg install -y wget unzip aapt aapt2

# Java-Paketname kann sich je nach Termux-Version unterscheiden,
# daher automatisch das passende suchen und installieren.
JAVA_OK=0
for JAVA_PKG in openjdk-17 openjdk-21 openjdk-18 openjdk-11 openjdk; do
    if pkg install -y "$JAVA_PKG" 2>/dev/null; then
        echo "Java-Paket installiert: $JAVA_PKG"
        JAVA_OK=1
        break
    fi
done
if [ "$JAVA_OK" -eq 0 ]; then
    echo ""
    echo "FEHLER: Konnte kein Java-Paket installieren."
    echo "Fuehre folgendes aus und schick mir die Ausgabe:"
    echo "  pkg search openjdk"
    exit 1
fi

# --- 2. Android SDK Command-Line-Tools ---
export ANDROID_SDK_ROOT="$HOME/android-sdk"
export ANDROID_HOME="$HOME/android-sdk"

if [ ! -d "$ANDROID_SDK_ROOT/cmdline-tools/latest" ]; then
    echo ""
    echo "[2/5] Lade Android SDK herunter (einmalig, ca. 150 MB)..."
    mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools"
    cd "$ANDROID_SDK_ROOT/cmdline-tools"
    wget -q --show-progress https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip
    unzip -q cmdline-tools.zip
    rm cmdline-tools.zip
    mv cmdline-tools latest
else
    echo ""
    echo "[2/5] Android SDK bereits vorhanden, ueberspringe Download."
fi

export PATH="$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools"

# --- 3. SDK-Pakete + Lizenzen (alles automatisch mit "ja") ---
echo ""
echo "[3/5] Installiere Android-SDK-Komponenten..."
echo "(Das kann je nach Internetverbindung mehrere Minuten dauern -"
echo " es laeuft im Hintergrund weiter, auch wenn laenger nichts passiert.)"
yes | sdkmanager --licenses || true
echo ""
echo "Lade Android-Plattform + Build-Tools (kann dauern)..."
yes | sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# --- 4. APK bauen ---
echo ""
echo "[4/5] Baue die APK (das dauert am laengsten, oft 5-20 Minuten)..."
echo "Bitte NICHT abbrechen, auch wenn es laenger dauert oder mal kurz"
echo "nichts Neues auftaucht - Termux nicht in den Hintergrund schieben,"
echo "sonst kann Android den Vorgang abwuergen."
echo ""
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/android"
chmod +x gradlew

# Der von Google mitgelieferte aapt2-Binary passt nicht zu Termux/Android
# (falsche CPU-Architektur/Linkerformat) und crasht immer. Termux hat eine
# eigene, funktionierende Version - Gradle anweisen, die zu benutzen.
AAPT2_BIN="$(command -v aapt2)"
if [ -n "$AAPT2_BIN" ]; then
    if ! grep -q "android.aapt2FromMavenOverride" gradle.properties 2>/dev/null; then
        echo "android.aapt2FromMavenOverride=$AAPT2_BIN" >> gradle.properties
    fi
fi

./gradlew assembleDebug --console=plain

# --- 5. APK an einen leicht findbaren Ort kopieren ---
echo ""
echo "[5/5] Kopiere fertige APK nach Downloads..."
mkdir -p ~/storage/downloads 2>/dev/null || true
APK_SRC="$SCRIPT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
APK_DEST="$HOME/storage/downloads/CardGolf3D.apk"

if [ -f "$APK_SRC" ]; then
    SRC_SIZE=$(stat -c%s "$APK_SRC" 2>/dev/null || wc -c < "$APK_SRC")

    # Kopieren + pruefen ob die Kopie wirklich vollstaendig/identisch ist
    # (der Weg ueber den geteilten Speicher via ~/storage kann bei groesseren
    # Dateien manchmal Kopien beschaedigen - deshalb hier mit Nachpruefung
    # und bis zu 3 Versuchen).
    COPY_OK=0
    for attempt in 1 2 3; do
        cp "$APK_SRC" "$APK_DEST" 2>/dev/null
        sync
        DEST_SIZE=$(stat -c%s "$APK_DEST" 2>/dev/null || wc -c < "$APK_DEST" 2>/dev/null || echo 0)
        if [ "$SRC_SIZE" = "$DEST_SIZE" ]; then
            COPY_OK=1
            break
        fi
        echo "Kopie unvollstaendig (Versuch $attempt), versuche erneut..."
        sleep 1
    done

    echo ""
    echo "=================================================="
    if [ "$COPY_OK" -eq 1 ]; then
        echo " FERTIG! Deine APK ist hier:"
        echo " $APK_DEST"
    else
        echo " ACHTUNG: Kopie nach Downloads war beim Pruefen"
        echo " weiter unvollstaendig. Nutze stattdessen direkt:"
        echo " $APK_SRC"
    fi
    echo ""
    echo " Original (garantiert unbeschaedigt) liegt hier:"
    echo " $APK_SRC"
    echo ""
    echo " Installieren:"
    echo " Am zuverlaessigsten mit (falls termux-api installiert ist,"
    echo " sonst: pkg install termux-api):"
    echo "   termux-open $APK_SRC"
    echo ""
    echo " Alternativ: Datei-Manager -> Downloads -> CardGolf3D.apk"
    echo " antippen und installieren. Falls gefragt: 'Installation aus"
    echo " unbekannter Quelle erlauben' antippen."
    echo "=================================================="
    termux-wake-unlock 2>/dev/null || true
else
    echo "FEHLER: APK wurde nicht gefunden. Etwas ist schiefgelaufen."
    termux-wake-unlock 2>/dev/null || true
    exit 1
fi
