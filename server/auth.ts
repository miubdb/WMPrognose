// Admin-Authentifizierung: serverseitig geprüftes Passwort (scrypt), zufällige Sitzungs-Tokens in HttpOnly-Cookie, Rate-Limit.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Store } from './store';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const SESSION_MS = 12 * 3600 * 1000;

export class AdminAuth {
  static readonly MIN_LEN = 12;
  /** passwordRequiredFromEnv: Online-Betrieb – kein automatisch erzeugtes Passwort, Anmeldung nur mit ADMIN_PASSWORD. */
  constructor(private store: Store, private envPassword: string | undefined, private now: () => number, private opts: { passwordRequiredFromEnv?: boolean } = {}) {
    this.store.db.prepare('DELETE FROM admin_sessions WHERE expires < ?').run(this.now());
  }
  private get(k: string): string | null { return (this.store.db.prepare('SELECT value FROM settings WHERE key=?').get(k) as any)?.value ?? null; }
  private set(k: string, v: string) { this.store.db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, v); }
  private hash(pw: string) { const salt = randomBytes(16); return `${salt.toString('hex')}:${scryptSync(pw, salt, 32).toString('hex')}`; }
  verify(pw: string): boolean {
    if (typeof pw !== 'string' || !pw || pw.length > 200) return false;
    if (this.envPassword) {
      const a = Buffer.from(sha(pw)), b = Buffer.from(sha(this.envPassword));
      return timingSafeEqual(a, b);
    }
    const h = this.get('admin_hash'); if (!h) return false;
    const [salt, hex] = h.split(':');
    const test = scryptSync(pw, Buffer.from(salt, 'hex'), 32);
    return timingSafeEqual(test, Buffer.from(hex, 'hex'));
  }
  /** Lokale Erstinstallation: noch kein Passwort gewählt (es gibt bewusst kein Standard- oder Zufallspasswort). */
  get setupNeeded(): boolean { return !this.envPassword && !this.opts.passwordRequiredFromEnv && !this.get('admin_hash'); }
  setPassword(pw: string) { if (typeof pw !== 'string' || pw.length < AdminAuth.MIN_LEN) throw new Error(`Das Passwort braucht mindestens ${AdminAuth.MIN_LEN} Zeichen.`); if (pw.length > 200) throw new Error('Das Passwort ist zu lang.'); this.set('admin_hash', this.hash(pw)); this.store.db.exec('DELETE FROM admin_sessions'); }
  /** Erst-Einrichtung: setzt das Passwort NUR, solange noch keines existiert, und meldet direkt an. */
  setup(pw: string): string { if (!this.setupNeeded) throw new Error('Die Einrichtung ist bereits abgeschlossen.'); this.setPassword(pw); return this.newSession(); }
  private newSession(): string { const token = randomBytes(32).toString('base64url'); this.store.db.prepare('INSERT INTO admin_sessions(hash,expires) VALUES(?,?)').run(sha(token), this.now() + SESSION_MS); return token; }
  get configured(): boolean { return !!this.envPassword || !!this.get('admin_hash'); }
  private failKey(ip: string) { return 'fails:' + sha(ip).slice(0, 16); }
  /** Gibt ein Sitzungs-Token zurück oder null / 'limited'. Fehlversuche werden in der Datenbank gezählt (überleben Neustarts und gelten für alle Instanzen). */
  login(pw: string, ip: string): string | null | 'limited' {
    const key = this.failKey(ip);
    let f: { n: number; reset: number } | null = null;
    try { f = JSON.parse(this.get(key) ?? 'null'); } catch { f = null; }
    if (f && f.reset > this.now() && f.n >= 8) return 'limited';
    if (!this.verify(pw)) {
      const cur = f && f.reset > this.now() ? f : { n: 0, reset: this.now() + 10 * 60000 };
      cur.n++; this.set(key, JSON.stringify(cur));
      return null;
    }
    this.store.db.prepare('DELETE FROM settings WHERE key=?').run(key);
    return this.newSession();
  }
  check(token: string | undefined): boolean {
    if (!token) return false;
    const r = this.store.db.prepare('SELECT expires FROM admin_sessions WHERE hash=?').get(sha(token)) as any;
    return !!r && r.expires > this.now();
  }
  logout(token: string | undefined) { if (token) this.store.db.prepare('DELETE FROM admin_sessions WHERE hash=?').run(sha(token)); }
}
