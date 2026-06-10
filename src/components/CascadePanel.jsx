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
        <span>Cascade du revenu — coût employeur total → net en poche (foyer)</span>
        <Info content={TOOLTIPS.coutEmployeurTotal} />
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
            <Stage label="Coût employeur total" value={c.fr.coutEmployeur} max={frMax} currency="eur" color={FR_HEX}
              sub={`+${eur0(c.fr.cotisPatronales)} cotis. patronales (${Math.round(c.fr.patronalRate * 100)} %)`} />
            <Stage label="Brut" value={c.fr.brut} max={frMax} currency="eur" color={FR_HEX}
              sub={`−${eur0(c.fr.cotisSalariales)} cotis. salariales (santé/retraite/chômage)`} />
            <Stage label="Net avant IR" value={c.fr.netAvantIR} max={frMax} currency="eur" color={FR_HEX}
              sub="santé + retraite + chômage déjà financés" />
            <Stage label="Net après IR" value={c.fr.netApresIR} max={frMax} currency="eur" color="#2f6b4f"
              sub={`−${eur0(c.fr.ir)} IR (quotient familial)`} />
          </div>

          {/* US */}
          <div>
            <div style={{ fontWeight: 700, color: US_HEX, marginBottom: 10 }}>🇺🇸 États-Unis — {STATES[stateKey].label}</div>
            <Stage label="Coût employeur total" value={c.us.coutEmployeur} max={usMax} currency="usd" color={US_HEX}
              sub={`+FICA ${usd0(c.us.employerFica)} +santé ${usd0(c.us.employerHealth)} +chômage ${usd0(c.us.employerUnemployment)}${c.us.employerMatch ? ` +match ${usd0(c.us.employerMatch)}` : ''}`} />
            <Stage label={`Brut${c.us.equity ? ` (+${usd0(c.us.equity)} equity)` : ''}`} value={c.us.brut} max={usMax} currency="usd" color={US_HEX} />
            <Stage label={<>Net avant IR<Info content={TOOLTIPS.cascadeNetAvantIR} /></>} value={c.us.netAvantIR} max={usMax} currency="usd" color={US_HEX}
              sub={`−FICA ${usd0(c.us.fica)} −prime santé ${usd0(c.us.employeeHealthPremium)}${c.us.employee401k ? ` −401(k) ${usd0(c.us.employee401k)}` : ''}`} />
            <Stage label="Net après IR" value={c.us.netApresIR} max={usMax} currency="usd" color="#2f6b4f"
              sub={`−${usd0(c.us.ir)} IR féd.+État`} />
          </div>
        </div>

        {/* Lecture « à coût employeur égal » */}
        <div className="coutemp-egal">
          <div className="ce-title">
            À coût employeur égal — net en poche pour 100 d'enveloppe
            <Info content={TOOLTIPS.coutEmployeurEgal} />
          </div>
          <div className="ce-bars">
            <div className="ce-row">
              <span className="ce-lab">🇫🇷 France</span>
              <div className="ce-track"><div className="ce-fill" style={{ width: `${c.efficiency.fr * 100}%`, background: FR_HEX }} /></div>
              <b className="ce-val">{Math.round(c.efficiency.fr * 100)} €</b>
            </div>
            <div className="ce-row">
              <span className="ce-lab">🇺🇸 {STATES[stateKey].label}</span>
              <div className="ce-track"><div className="ce-fill" style={{ width: `${c.efficiency.us * 100}%`, background: US_HEX }} /></div>
              <b className="ce-val">{Math.round(c.efficiency.us * 100)} €</b>
            </div>
          </div>
        </div>

        <div className="note-inline" style={{ marginTop: 12 }}>
          On part du <b>même point haut</b> (coût employeur total) et on redescend symétriquement.
          Le brut US plus élevé n'est pas de l'argent « en plus » : c'est en partie le
          <b> transfert de la charge</b> du patronat vers le salarié (santé, retraite, chômage
          que l'Américain devra repayer lui-même).
          <Info content={TOOLTIPS.coutEmployeurEgal} />
        </div>
      </div>
    </div>
  )
}
