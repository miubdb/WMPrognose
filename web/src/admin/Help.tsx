import { Dialog } from './ui';

/** „Erste Schritte“: kurz, ohne Fachjargon. Wird beim allerersten Start einmal angeboten und ist danach über „Hilfe“ erreichbar. */
export function Help({ online, onClose }: { online: boolean; onClose: () => void }) {
  return (
    <Dialog title="Erste Schritte" wide onClose={onClose} actions={<button className="btn primary" onClick={onClose}>Verstanden</button>}>
      <ol className="steps">
        {!online && <li><b>Spieleabend starten.</b> Öffne das <a href="/host" target="_blank" rel="noreferrer">Showmaster-Pult</a>, wähle eines der beiden Pakete und tippe auf „Spielraum erstellen“.</li>}
        <li><b>Fernseher verbinden.</b> Öffne auf dem Fernseher (oder einem zweiten Bildschirm) die TV-Adresse, die im Showmaster-Pult steht.</li>
        <li><b>Mitspieler einladen.</b> Sie scannen mit dem Handy den QR-Code auf dem Fernseher oder geben den Raumcode ein. Alle müssen im selben WLAN sein – ein Passwort brauchen sie nicht.</li>
        <li><b>Show starten.</b> Im Showmaster-Pult auf „Show starten“ – das Pult führt dich durch den Abend.</li>
      </ol>
      <h4>Eigene Fragen und Pakete</h4>
      <ul className="small">
        <li><b>Fragen:</b> Unter „Fragen“ neue Fragen anlegen, ändern und mit „Testen“ ausprobieren.</li>
        <li><b>Pakete:</b> Unter „Pakete“ ein Paket duplizieren oder „Neues Paket erstellen“. Runden per Ziehen sortieren, Fragen hinzufügen, „Veröffentlichen“ – fertig.</li>
        <li><b>Sicherung:</b> Unter „Sicherung &amp; Update“ lässt sich alles in eine Datei sichern.</li>
      </ul>
      <p className="small muted">Deine Daten liegen nur auf diesem Computer (Ordner <code>data</code>). Es gibt keine gemeinsame Datenbank mit anderen.</p>
    </Dialog>
  );
}
