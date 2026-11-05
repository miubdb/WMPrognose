# OUTPLAY am Samstag auf dem Windows-Laptop

## Voraussetzungen (einmalig, am besten schon heute/morgen erledigen)
- **Node.js 22.13 oder neuer (LTS)** von <https://nodejs.org> installieren (Standardoptionen).
- Den Projektordner auf den Laptop kopieren (z. B. `git clone` der Branch `claude/upbeat-galileo-4el50u` oder ZIP von GitHub entpacken).
- **Einmal mit Internet** `OUTPLAY-STARTEN.bat` ausführen: installiert die Abhängigkeiten (`npm install`) und baut die Oberfläche. Danach läuft alles **ohne Internet**.
- Der Laptop und alle Handys im **selben WLAN** (oder Handy-Hotspot/Router ohne Gästenetz-Isolation).

## Starten
1. Doppelklick auf **`OUTPLAY-STARTEN.bat`**. Es prüft Node, installiert/baut bei Bedarf und zeigt dann alle Links.
2. Gibt es mehrere Netzwerkadapter (WLAN, Ethernet, VPN, WSL …), fragt das Fenster, **welcher davon das WLAN/LAN der Handys ist**. Virtuelle Adapter (WSL, VirtualBox, VPN) werden automatisch aussortiert.
3. Beim ersten Start fragt die **Windows-Firewall**: nur **„Private Netzwerke“** erlauben (nicht „Öffentlich“). Es wird kein Port ins Internet geöffnet.
4. Showmaster: `http://<WLAN-IP>:8080/host` (Laptop oder Tablet). Admin: `http://<WLAN-IP>:8080/admin`.
5. **TV:** Laptop per HDMI an den Fernseher, im Browser `http://localhost:8080/tv/RAUMCODE` öffnen (Raumcode erscheint nach „Spielraum erstellen“), **einmal klicken** (Ton + Vollbild). Der **QR-Code auf dem TV enthält automatisch die WLAN-Adresse** (nie `localhost`).
6. Beim Fernseher-Browser `F11` für Vollbild. Der Showmaster kann am selben Laptop in einem zweiten Browserfenster/Tab arbeiten oder (besser) auf Handy/Tablet.

Datenbank: `data\outplay.db` · Automatische Backups: `data\backups` (alle 10 min, die letzten 30) · Admin-Passwort beim ersten Start: `data\admin-passwort.txt` (notieren, Datei danach löschen).

## Inhalte vom Online-Admin übernehmen
1. Online: Paket veröffentlichen → **📤 Spieleabend exportieren** → JSON-Datei speichern und auf den Laptop bringen (Mail, Cloud, USB).
2. Laptop: `/admin` anmelden → **Import/Export** → Datei wählen. Der Prüfbericht zeigt, was neu/identisch/als Kopie angelegt wird (nichts ist gespeichert, bis du bestätigst).
3. **✅ Importieren & veröffentlichen** → Meldung „Inhalt stimmt mit dem Export überein“.
4. `/host` → bei „Spielepaket“ das importierte Paket wählen → Spielraum erstellen.
Mehrfaches Importieren derselben Datei legt nichts doppelt an.

## Windows-Einstellungen (nichts davon wird automatisch verändert)
- **Strom:** Laptop ans Netzteil. *Einstellungen → System → Netzbetrieb & Akku*: Beim Netzbetrieb „Bildschirm ausschalten“ und „Energiesparmodus“ auf **Nie**. Bei Bedarf *Systemsteuerung → Energieoptionen → Höchstleistung/Ausbalanciert → „Beim Zuklappen: Nichts unternehmen“*.
- **Standby verhindern:** Siehe oben; zusätzlich Bildschirmschoner aus. Auch ein kurzer Standby trennt die Handys (sie verbinden sich danach automatisch neu).
- **WLAN/Gastnetz:** Gastnetzwerke blockieren oft die Verbindung zwischen Geräten („Client-Isolation“). Dann den normalen WLAN-Zugang oder einen Handy-Hotspot (Laptop verbindet sich mit dem Hotspot eines Handys, die anderen ebenfalls) nutzen. Öffentliche/Hotel-WLANs gehen meist nicht.
- **Firewall:** Beim ersten Start „Zugriff zulassen“ nur für *Private Netzwerke*. Falls versehentlich abgelehnt: *Windows-Sicherheit → Firewall → App durch Firewall zulassen → Node.js JavaScript Runtime → „Privat“ anhaken*. Nichts an der Router-Portweiterleitung ändern.
- **HDMI:** `Windows-Taste + P` → „Duplizieren“ oder „Nur zweiter Bildschirm“. Bildschirmauflösung 1920×1080 empfohlen (TV-Ansicht skaliert sich selbst).
- **Browser:** Chrome/Edge, `F11` Vollbild, Ton am Fernseher/Laptop prüfen (die TV-Seite einmal anklicken, damit Ton erlaubt wird).

## Notfall
- **Handy verliert die Verbindung / App-Wechsel / Sperrbildschirm:** Seite wieder öffnen – Platz und Punkte bleiben (automatisch). Anderes Handy: *Platz wiederherstellen* mit dem 6-stelligen Code (der Showmaster sieht alle Codes) oder Platz im Pult freigeben (📱).
- **Handys erreichen den Laptop nicht:** Gleiches WLAN? Gastnetz? Stimmt die IP im QR-Code mit dem Fenster von OUTPLAY überein? Firewall „Privat“? Bei mehreren Adaptern `OUTPLAY-STARTEN.bat` neu starten und den richtigen wählen. Notlösung: Handy-Hotspot.
- **Server versehentlich beendet/Laptop neu gestartet:** `OUTPLAY-STARTEN.bat` erneut starten. Raum, Spieler, Punkte, Phase und Timer kommen aus der Datenbank; Handys, TV und Showmaster verbinden sich selbst neu (TV-Seite einmal klicken, Showmaster ggf. `/host` neu öffnen – der Browser erinnert sich).
- **Datenbank beschädigt/zurücksetzen:** Server beenden, ein Backup aus `data\backups` auf **`OUTPLAY-WIEDERHERSTELLEN.bat`** ziehen. Das Skript sichert die alte Datenbank vorher.
- **Eine Frage ist kaputt:** Showmaster → „Korrektur & Notfall“ → Aufgabe neu starten oder überspringen; Punkte pro Spieler per ± korrigieren.
