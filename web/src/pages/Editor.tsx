import { useState } from 'react';
import type { Avatar as AvatarT } from '../../../shared/types';
import { AVATAR_LIMITS } from '../../../shared/types';
import { Avatar, ACC_NAMES, BGS, FACE_NAMES, HAIR_COLORS, HAIR_NAMES, HAT_NAMES, SHIRT_COLORS, SHIRT_NAMES, SKINS, randomAvatar } from '../ui/Avatar';

type Tab = 'face' | 'hair' | 'hat' | 'shirt' | 'acc' | 'color';
const TABS: { id: Tab; label: string }[] = [
  { id: 'color', label: '① Farben' }, { id: 'face', label: '② Gesicht' }, { id: 'hair', label: 'Frisur' }, { id: 'hat', label: 'Kopf' }, { id: 'shirt', label: 'Trikot' }, { id: 'acc', label: 'Extras' },
];

export function AvatarEditor({ value, onChange }: { value: AvatarT; onChange: (a: AvatarT) => void }) {
  const [tab, setTab] = useState<Tab>('color');
  const set = (k: keyof AvatarT, v: number) => onChange({ ...value, [k]: v });
  const opts = (k: keyof AvatarT, names: string[]) => (
    <div className="optgrid">
      {Array.from({ length: AVATAR_LIMITS[k] }, (_, i) => (
        <button type="button" key={i} className={`opt ${value[k] === i ? 'sel' : ''}`} onClick={() => set(k, i)} aria-label={names[i]}>
          <Avatar a={{ ...value, [k]: i }} size={58} /><span>{names[i]}</span>
        </button>
      ))}
    </div>
  );
  const swatches = (k: keyof AvatarT, colors: string[], label: string) => (
    <div className="swrow"><b>{label}</b><div>{colors.map((c, i) => <button type="button" key={i} className={`sw ${value[k] === i ? 'sel' : ''}`} style={{ background: c }} onClick={() => set(k, i)} aria-label={`${label} ${i + 1}`} />)}</div></div>
  );
  return (
    <div className="editor">
      <div className="preview">
        <Avatar a={value} size={150} />
        <button type="button" className="btn ghost small" onClick={() => onChange(randomAvatar())}>🎲 Zufall</button>
      </div>
      <div className="tabs">{TABS.map(t => <button type="button" key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
      <div className="tabbody">
        {tab === 'face' && opts('face', FACE_NAMES)}
        {tab === 'hair' && opts('hair', HAIR_NAMES)}
        {tab === 'hat' && opts('hat', HAT_NAMES)}
        {tab === 'shirt' && opts('shirt', SHIRT_NAMES)}
        {tab === 'acc' && opts('acc', ACC_NAMES)}
        {tab === 'color' && <>
          {swatches('skin', SKINS, 'Hautton')}
          {swatches('hairColor', HAIR_COLORS, 'Haarfarbe')}
          {swatches('shirtColor', SHIRT_COLORS, 'Trikotfarbe')}
          {swatches('bg', BGS, 'Hintergrund')}
        </>}
      </div>
    </div>
  );
}
