import React, { useState } from 'react'
import { computeCascade } from '../model.js'
import { STATES, PROFILES } from '../config.js'
import { eur0, usd0 } from '../format.js'
import Info from './Info.jsx'
import { TOOLTIPS } from '../tooltips.js'

const FR_HEX = '#1f4e79'
const US_HEX = '#9c2b2b'

/** Une ligne d'étage de la cascade avec barre proportionnelle. */
function Stage({ label, value, max, currency, color, sub }) {
  const fmt = currency === 'usd' ? usd0 : eur0
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
        <span>{label}{sub && <span className="muted" style={{ fontSize: 11 }}> · {sub}</span>}</span>
        <b style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(value)}</b>
      </div>
      <div style={{ height: 7, background: '#eef1f4', borderRadius: 4, marginTop: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
    </div>
  )
}

export default function CascadePanel({ inputs }) {
  const [stateKey, setStateKey] = useState('TX')
  const c = computeCascade(inputs, stateKey)

  const frMax = c.fr.coutEmployeur
  const usMax = c.us.coutEmployeur

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Cascade du revenu — où part l'argent à chaque étage (foyer)</span>
      </div>
      <div className="panel-body">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <span className="muted" style={{ fontSize: 12 }}>
            Profil : <b>{PROFILES[c.profileKey].label}</b> · {c.adults} adulte(s) actif(s) ·
            saisie en <b>{inputs.inputMode === 'apresIR' ? 'net après IR' : 'net avant IR'}</b>
          </span>
          <div className="tabs" style={{ margin: 0, marginLeft: 'auto' }}>
            {['TX', 'NC', 'CA'].map((sk) => (
              <button key={sk} className={stateKey === sk ? 'active' : ''} onClick={() => setStateKey(sk)}>
                {STATES[sk].label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
          {/* FRANCE */}
          <div>
            <div style={{ fontWeight: 700, color: FR_HEX, marginBottom: 10 }}>🇫🇷 France</div>
            <Stage label="Coût employeur" value={c.fr.coutEmployeur} max={frMax} currency="eur" color={FR_HEX}
              sub={`dont ${eur0(c.fr.cotisPatronales)} cotis. patronales`} />
            <Stage label="Brut" value={c.fr.brut} max={frMax} currency="eur" color={FR_HEX}
              sub={`−${eur0(c.fr.cotisSalariales)} cotis. salariales`} />
            <Stage label="Net avant IR" value={c.fr.netAvantIR} max={frMax} currency="eur" color={FR_HEX}
              sub="santé + retraite déjà financées" />
            <Stage label="Net après IR" value={c.fr.netApresIR} max={frMax} currency="eur" color="#2f6b4f"
              sub={`−${eur0(c.fr.ir)} IR (quotient familial)`} />
          </div>

          {/* US */}
          <div>
            <div style={{ fontWeight: 700, color: US_HEX, marginBottom: 10 }}>🇺🇸 États-Unis — {STATES[stateKey].label}</div>
            <Stage label="Coût employeur" value={c.us.coutEmployeur} max={usMax} currency="usd" color={US_HEX}
              sub={`+FICA empl. ${usd0(c.us.employerFica)} +santé ${usd0(c.us.employerHealth)}${c.us.employerMatch ? ` +match ${usd0(c.us.employerMatch)}` : ''}`} />
            <Stage label={`Brut${c.us.equity ? ` (+${usd0(c.us.equity)} equity)` : ''}`} value={c.us.brut} max={usMax} currency="usd" color={US_HEX}
              sub={`−${usd0(c.us.fica)} FICA salarié`} />
            <Stage label={<>Net avant IR (miroir)<Info content={TOOLTIPS.miroirUS} /></>} value={c.us.netAvantIR} max={usMax} currency="usd" color={US_HEX}
              sub="⚠️ ne couvre NI santé NI retraite" />
            <Stage label="Net après IR" value={c.us.netApresIR} max={usMax} currency="usd" color="#2f6b4f"
              sub={`−${usd0(c.us.ir)} IR féd.+État`} />
          </div>
        </div>

        <div className="note-inline" style={{ marginTop: 12 }}>
          ⚠️ Le « net avant IR » des deux pays n'est <b>pas équivalent</b>
          <Info content={TOOLTIPS.miroirUS} /> — comparer les deux directement surestimerait
          le pouvoir d'achat US.
        </div>
      </div>
    </div>
  )
}
