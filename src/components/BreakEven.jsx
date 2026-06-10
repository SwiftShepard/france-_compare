import React, { useMemo, useState } from 'react'
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { computeBreakEven } from '../model.js'
import { PROFILES, STATES } from '../config.js'
import { eur0, usd0 } from '../format.js'

const FR_HEX = '#1f4e79'
const US_HEX = '#9c2b2b'

function TooltipBox({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const p = payload[0].payload
  return (
    <div style={{ background: '#fff', border: '1px solid #cbd3dd', borderRadius: 6, padding: '8px 10px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        Salaire FR réf. {eur0(p.frNet)} <span className="muted">≈ {usd0(p.usGrossPerAdult)} brut US/adulte</span>
      </div>
      <div style={{ color: FR_HEX }}>Reste à vivre FR : <b>{eur0(p.frRav)}</b></div>
      <div style={{ color: US_HEX }}>Reste à vivre US : <b>{eur0(p.usRav)}</b></div>
      <div style={{ marginTop: 3, fontWeight: 600 }}>
        Écart US−FR : <span style={{ color: p.diff >= 0 ? US_HEX : FR_HEX }}>{p.diff >= 0 ? '+' : ''}{eur0(p.diff)}</span>
      </div>
    </div>
  )
}

export default function BreakEven({ inputs }) {
  const [profileKey, setProfileKey] = useState(inputs.profileKey)
  const [stateKey, setStateKey] = useState('TX')
  const [mode, setMode] = useState('A') // A = deux courbes, B = différentiel

  const result = useMemo(
    () => computeBreakEven(inputs, { profileKey, stateKey, min: 20000, max: 120000, step: 2000 }),
    [inputs, profileKey, stateKey]
  )
  const { points, breakEven, verdict } = result

  // Bornes Y pour le gradient (mode B) : offset du passage à zéro.
  const diffs = points.map((p) => p.diff)
  const maxD = Math.max(...diffs)
  const minD = Math.min(...diffs)
  const gradOffset = maxD <= 0 ? 0 : minD >= 0 ? 1 : maxD / (maxD - minD)

  const xFmt = (v) => `${Math.round(v / 1000)}k€`

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Seuil de bascule — à partir de quel revenu les US deviennent-ils avantageux ?</span>
      </div>
      <div className="panel-body">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <div className="tabs" style={{ margin: 0 }}>
            {Object.values(PROFILES).map((p) => (
              <button key={p.key} className={profileKey === p.key ? 'active' : ''} onClick={() => setProfileKey(p.key)}>
                {p.label.replace('Couple marié, sans enfant', 'Couple').replace('Couple marié + 2 enfants', 'Famille')}
              </button>
            ))}
          </div>
          <div className="tabs" style={{ margin: 0 }}>
            {['TX', 'NC', 'CA'].map((sk) => (
              <button key={sk} className={stateKey === sk ? 'active' : ''} onClick={() => setStateKey(sk)}>
                {STATES[sk].label}
              </button>
            ))}
          </div>
          <div className="tabs" style={{ margin: 0, marginLeft: 'auto' }}>
            <button className={mode === 'A' ? 'active' : ''} onClick={() => setMode('A')}>Deux courbes</button>
            <button className={mode === 'B' ? 'active' : ''} onClick={() => setMode('B')}>Différentiel</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: 16, alignItems: 'stretch' }}>
          <div>
            <ResponsiveContainer width="100%" height={360}>
              {mode === 'A' ? (
                <LineChart data={points} margin={{ top: 10, right: 16, left: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
                  <XAxis dataKey="frNet" type="number" domain={['dataMin', 'dataMax']}
                    tickFormatter={xFmt} tick={{ fontSize: 11, fill: '#51606f' }}
                    label={{ value: `Salaire FR de référence (${inputs.inputMode === 'apresIR' ? 'net après IR' : 'net avant IR'} / adulte)`, position: 'insideBottom', offset: -12, fontSize: 11, fill: '#8a97a6' }} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: '#51606f' }} />
                  <Tooltip content={<TooltipBox />} />
                  <ReferenceLine y={0} stroke="#cbd3dd" />
                  <Line dataKey="frRav" name="Reste à vivre France" stroke={FR_HEX} strokeWidth={2.5} dot={false} />
                  <Line dataKey="usRav" name="Reste à vivre États-Unis" stroke={US_HEX} strokeWidth={2.5} dot={false} />
                  {breakEven && (
                    <ReferenceLine x={breakEven.frSalary} stroke="#1c2430" strokeDasharray="4 3"
                      label={{ value: 'Seuil', position: 'top', fontSize: 11, fill: '#1c2430' }} />
                  )}
                </LineChart>
              ) : (
                <AreaChart data={points} margin={{ top: 10, right: 16, left: 8, bottom: 24 }}>
                  <defs>
                    <linearGradient id="diffGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={gradOffset} stopColor={US_HEX} stopOpacity={0.55} />
                      <stop offset={gradOffset} stopColor={FR_HEX} stopOpacity={0.45} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
                  <XAxis dataKey="frNet" type="number" domain={['dataMin', 'dataMax']}
                    tickFormatter={xFmt} tick={{ fontSize: 11, fill: '#51606f' }}
                    label={{ value: `Salaire FR de référence (${inputs.inputMode === 'apresIR' ? 'net après IR' : 'net avant IR'} / adulte)`, position: 'insideBottom', offset: -12, fontSize: 11, fill: '#8a97a6' }} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: '#51606f' }} />
                  <Tooltip content={<TooltipBox />} />
                  <ReferenceLine y={0} stroke="#1c2430" strokeWidth={1.5} />
                  <Area dataKey="diff" name="Écart US − FR" stroke="#51606f" strokeWidth={1.5} fill="url(#diffGrad)" />
                  {breakEven && (
                    <ReferenceLine x={breakEven.frSalary} stroke="#1c2430" strokeDasharray="4 3"
                      label={{ value: 'Seuil', position: 'top', fontSize: 11, fill: '#1c2430' }} />
                  )}
                </AreaChart>
              )}
            </ResponsiveContainer>
            <div className="legend" style={{ marginTop: 6 }}>
              <span><span className="dot" style={{ background: FR_HEX }} />Zone / courbe avantage France</span>
              <span><span className="dot" style={{ background: US_HEX }} />Zone / courbe avantage États-Unis</span>
            </div>
          </div>

          {/* Panneau verdict du seuil */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="read" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="rt">Seuil de bascule</div>
              {breakEven ? (
                <>
                  <div className="rv" style={{ fontSize: 26, marginTop: 6 }}>{eur0(breakEven.frSalary)}</div>
                  <div className="rd">soit ≈ <b>{usd0(breakEven.usGrossPerAdult)}</b> de brut US / adulte</div>
                  <div className="rd" style={{ marginTop: 10 }}>
                    Pour un <b>{PROFILES[profileKey].label.toLowerCase()}</b> {breakEven.rising ? 'au' : 'au'} <b>{STATES[stateKey].label}</b>,
                    vivre aux US devient avantageux <b>au-delà</b> de ce niveau de salaire FR équivalent.
                    En-dessous, la France conserve un reste à vivre supérieur.
                  </div>
                </>
              ) : (
                <>
                  <div className="rv" style={{ fontSize: 18, marginTop: 6, color: verdict === 'fr_always' ? FR_HEX : US_HEX }}>
                    {verdict === 'fr_always' ? 'Aucun seuil' : 'US toujours devant'}
                  </div>
                  <div className="rd" style={{ marginTop: 8 }}>
                    {verdict === 'fr_always'
                      ? <>La <b>France reste avantageuse sur toute la plage</b> de revenus (20 k€ – 120 k€) pour ce profil et ces paramètres. Le seuil de bascule n'existe pas ici.</>
                      : <>Les <b>États-Unis sont avantageux sur toute la plage</b> de revenus (20 k€ – 120 k€) pour ce profil et ces paramètres.</>}
                  </div>
                </>
              )}
              <div className="note-inline" style={{ marginTop: 12 }}>
                Le seuil se déplace en direct avec l'employeur, le credit score, le scénario
                santé et tous les toggles. Activez « pépin santé » pour le voir reculer.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
