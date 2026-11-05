// Ermittlung der vom Smartphone erreichbaren Netzwerkadresse (nie blind "irgendeine" IP, nie localhost).
import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os';

export interface Candidate { name: string; address: string; score: number; virtual: boolean; kind: 'wlan' | 'ethernet' | 'other' }
const VIRTUAL = /vethernet|virtualbox|vmware|hyper-?v|wsl|docker|tailscale|zerotier|vpn|tap-|tun\d|loopback|bluetooth|utun|vboxnet|veth|br-|vnic|npcap|teredo|isatap|pseudo|openvpn|wireguard|nordlynx|proton/i;
const WLAN = /wi-?fi|wlan|wireless|drahtlos|wlp|wlan0/i;
const ETH = /ethernet|^eth|^en\d|lan-verbindung|enp|eno/i;

export function candidates(ifs: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces()): Candidate[] {
  const out: Candidate[] = [];
  for (const [name, list] of Object.entries(ifs)) {
    for (const i of list ?? []) {
      if (i.internal || (i.family as unknown) !== 'IPv4' && (i.family as unknown) !== 4) continue;
      const a = i.address;
      if (a.startsWith('169.254.') || a.startsWith('127.')) continue; // Link-Local / Loopback
      const virtual = VIRTUAL.test(name) || /^00:?15:?5d|^00:?50:?56|^08:?00:?27|^0a:?00:?27/i.test(i.mac ?? '');
      const kind: Candidate['kind'] = WLAN.test(name) ? 'wlan' : ETH.test(name) ? 'ethernet' : 'other';
      let score = 0;
      if (kind === 'wlan') score += 30; else if (kind === 'ethernet') score += 20;
      if (/^192\.168\./.test(a)) score += 10; else if (/^10\./.test(a)) score += 6; else if (/^172\.(1[6-9]|2\d|3[01])\./.test(a)) score += 4; else score -= 20; // öffentliche IP: unwahrscheinlich im Heimnetz
      if (virtual) score -= 100;
      out.push({ name, address: a, score, virtual, kind });
    }
  }
  return out.sort((x, y) => y.score - x.score);
}

export interface NetInfo { port: number; preferred: string | null; candidates: (Candidate & { url: string; preferred: boolean })[]; configured: string | null; ambiguous: boolean }

/** `override` = fest konfigurierte Adresse (OUTPLAY_HOST / PUBLIC_URL). */
export function netInfo(port: number, override?: string, ifs?: NodeJS.Dict<NetworkInterfaceInfo[]>): NetInfo {
  const cands = candidates(ifs);
  let configured: string | null = null;
  if (override) configured = /^https?:\/\//i.test(override) ? override.replace(/\/+$/, '') : `http://${override}${override.includes(':') ? '' : ':' + port}`;
  const good = cands.filter(c => !c.virtual);
  const best = configured ? null : good[0] ?? cands[0] ?? null;
  const preferred = configured ?? (best ? `http://${best.address}:${port}` : null);
  return {
    port, preferred, configured,
    candidates: cands.map(c => ({ ...c, url: `http://${c.address}:${port}`, preferred: !configured && c === best })),
    ambiguous: !configured && good.length > 1,
  };
}

