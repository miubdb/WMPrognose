# JANIQUIZITION

Die Gameshow für den Spieleabend: ein Laptop als Showmaster, der Fernseher als Bühne, die Handys der Mitspieler als Buzzer. Läuft komplett lokal im WLAN – ohne Internet, ohne Konto.

## ⬇️ Download für Windows

### **[➜ JANIQUIZITION für Windows herunterladen](https://github.com/miubdb/WMPrognose/releases/latest/download/JANIQUIZITION-Windows.zip)**

(Alle Versionen: [Releases](https://github.com/miubdb/WMPrognose/releases/latest))

## In 5 Schritten spielen

1. **ZIP herunterladen** (Link oben) und mit Rechtsklick → **„Alle extrahieren …“** entpacken. *Nicht* direkt aus dem ZIP starten.
2. Im neuen Ordner **`JANIQUIZITION-STARTEN.bat`** doppelklicken.
   Windows meldet evtl. „Der Computer wurde durch Windows geschützt“ → **Weitere Informationen → Trotzdem ausführen**. Bei der Firewall-Frage **„Private Netzwerke“** erlauben.
3. Im Browser öffnet sich die Einrichtung: **eigenes Admin-Passwort wählen** (mindestens 12 Zeichen). Das war’s – nichts muss installiert werden.
4. Das schwarze Fenster zeigt die Adressen. Öffne das **Showmaster-Pult** (`…/host`), wähle eines der **zwei mitgelieferten Pakete** und klicke „Spielraum erstellen“.
5. **Fernseher** verbinden (TV-Adresse steht im Pult), **Mitspieler** scannen den QR-Code. Alle im selben WLAN. Dann „Show starten“.

Genaue Schritt-für-Schritt-Hilfe steht auch in der Datei `ANLEITUNG.txt` im Download und in der App unter **„Hilfe“**.

## Gut zu wissen

- **Deine Daten** liegen nur auf deinem Rechner (Ordner `data`). Es gibt keine gemeinsame Datenbank und keine Cloud.
- **Eigene Fragen & Pakete:** `http://localhost:8080/admin` (mit deinem Passwort).
- **Update:** neue ZIP-Datei in **denselben Ordner** entpacken (Dateien ersetzen). `data` bleibt unberührt, zusätzlich wird vor dem ersten Start eine Sicherheitskopie angelegt.
- **Passwort vergessen:** `JANIQUIZITION-PASSWORT-ZURUECKSETZEN.bat` (Programm vorher beenden). Fragen und Spielstände bleiben erhalten.
- **Offline-Karte** (optional, für „Wo zur Hölle?“): `JANIQUIZITION-KARTE-LADEN.bat`. Ohne sie läuft eine einfachere Karte.
- Voraussetzungen: Windows 10/11 (64 Bit), WLAN/Router. Node.js o. Ä. muss **nicht** installiert werden – es ist im Download enthalten.

## Für Entwickler

Technische Dokumentation: [docs/ENTWICKLUNG.md](docs/ENTWICKLUNG.md) · Spiele: [docs/SPIELE.md](docs/SPIELE.md) · Fragenprüfung: [docs/FRAGEN-PRUEFUNG.md](docs/FRAGEN-PRUEFUNG.md)

Dieses Projekt ist für den privaten Freundeskreis gedacht. Drittanbieter-Lizenzen: siehe `LIZENZEN.txt` im Download.
