import React, { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { STATES, FR_REGIONS, REGION_PAIRS, POSTE_LABELS, CONVERSION } from '../config.js'
import { eur0, usd0, num0 } from '../format.js'
import BreakEven from './BreakEven.jsx'
import CascadePanel from './CascadePanel.jsx'
import RepBanner from './RepBanner.jsx'
import Info from './Info.jsx'
import { TOOLTIPS, POSTE_TIPS } from '../tooltips.js'

const STATE_COLORS = { TX: 'var(--tx)', NC: 'var(--nc)', CA: 'var(--ca)' }
const STATE_HEX = { TX: '#c08a2d', NC: '#4a7a8c', CA: '#8a4a8c' }
const FR_HEX = '#1f4e79'

/* ----- Triple lecture de conversion ----- */
function TripleReading({ data, stateKey }) {
  const us = data.states[stateKey]
  const fr = data.fr
  const change = us.dispo_usd / CONVERSION.exchangeRate
  const ppa = us.dispo_usd * CONVERSION.pppFactorEURtoUSD

  const cards = [
    {
      t: '1 · Taux de change brut',
      v: eur0(change),
      d: `Revenu disponible US converti à ${CONVERSION.exchangeRate} USD/EUR. Lecture la plus flatteuse pour les US.`,
      fr: fr.dispo,
    },
    {
      t: '2 · Parité de pouvoir d\'achat',
      v: eur0(ppa),
      d: TOOLTIPS.ppa,
      fr: fr.dispo,
    },
    {
      t: '3 · Reste à vivre net ★',
      v: eur0(us.resteAVivre_eur),
      d: TOOLTIPS.resteAVivre,
      fr: fr.resteAVivre,
    },
  ]

  return (
    <div className="triple">
      {cards.map((c) => {
        const usVal = c.t.startsWith('1') ? change : c.t.startsWith('2') ? ppa : us.resteAVivre_eur
        const gap = usVal - c.fr
        return (
          <div className="read" key={c.t}>
            <div className="rt">{c.t}<Info content={c.d} /></div>
            <div className="rv">{c.v}</div>
            <div className="rd" style={{ marginTop: 6 }}>
              FR : <b>{eur0(c.fr)}</b> · écart US−FR :{' '}
              <b style={{ color: gap >= 0 ? 'var(--us)' : 'var(--fr)' }}>
                {gap >= 0 ? '+' : ''}{eur0(gap)}
              </b>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ----- Cartes verdict APPARIÉES par niveau (région FR ↔ État US) ----- */
function VerdictGrid({ data }) {
  return (
    <div className="verdict-grid">
      {REGION_PAIRS.map((pair) => {
        const region = FR_REGIONS[pair.region]
        const us = data.states[pair.state]
        const frRav = data.frRegions[pair.region].resteAVivre
        const usRav = us.resteAVivre_eur
        const delta = usRav - frRav
        const frWins = delta < 0
        const frPct = (Math.max(0, frRav) / (Math.max(0, frRav) + Math.max(0, usRav) || 1)) * 100
        return (
          <div className="verdict-card" key={pair.region}>
            <div className="state-tag" style={{ marginBottom: 2, fontWeight: 600 }}>Niveau {pair.label.toLowerCase()}</div>
            <div className="state-name" style={{ fontSize: 14 }}>{region.label} <span className="muted">vs</span> {STATES[pair.state].label}</div>
            <div className="state-tag">{region.tagline} ↔ {STATES[pair.state].tagline}</div>
            <div className="rav-line">
              <span>Reste à vivre 🇫🇷 {region.label}</span><b>{eur0(frRav)}</b>
            </div>
            <div className="rav-line">
              <span>Reste à vivre 🇺🇸 {STATES[pair.state].label}</span><b>{eur0(usRav)}</b>
            </div>
            <div className="bar-mini">
              <div className="fr-seg" style={{ width: `${frPct}%` }} />
              <div className="us-seg" style={{ width: `${100 - frPct}%` }} />
            </div>
            <div className={`delta ${frWins ? 'fr-wins' : 'us-wins'}`}>
              <span>{frWins ? 'Avantage France' : 'Avantage États-Unis'}</span>
              <span className="amount">{delta >= 0 ? '+' : ''}{eur0(delta)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ----- Graphe poste par poste (Recharts) ----- */
function PostesChart({ data }) {
  const frLabel = FR_REGIONS[data.fr.regionKey].label
  const rows = Object.keys(POSTE_LABELS).map((key) => ({
    poste: POSTE_LABELS[key],
    FR: Math.round(data.fr.postes[key]),
    TX: Math.round(data.states.TX.postes[key]),
    NC: Math.round(data.states.NC.postes[key]),
    CA: Math.round(data.states.CA.postes[key]),
  }))

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Détail poste par poste — coût annuel (€, US converti au change)</span>
        <Info content="Impôts = IR (FR) vs IR fédéral + État + FICA (US). Santé US = primes + reste à charge attendu. Retraite = épargne nécessaire (0 par défaut en lambda sans épargne)." />
      </div>
      <div className="panel-body">
        <div className="legend">
          <span><span className="dot" style={{ background: FR_HEX }} />{frLabel}</span>
          <span><span className="dot" style={{ background: STATE_HEX.TX }} />Texas</span>
          <span><span className="dot" style={{ background: STATE_HEX.NC }} />Caroline du Nord</span>
          <span><span className="dot" style={{ background: STATE_HEX.CA }} />Californie</span>
        </div>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={rows} margin={{ top: 8, right: 16, left: 8, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
            <XAxis dataKey="poste" angle={-35} textAnchor="end" interval={0} height={70}
              tick={{ fontSize: 11, fill: '#51606f' }} />
            <YAxis tick={{ fontSize: 11, fill: '#51606f' }}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip
              formatter={(v, name) => [eur0(v), name]}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #cbd3dd' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="FR" name={frLabel} fill={FR_HEX} radius={[2, 2, 0, 0]} />
            <Bar dataKey="TX" name="Texas" fill={STATE_HEX.TX} radius={[2, 2, 0, 0]} />
            <Bar dataKey="NC" name="Caroline du Nord" fill={STATE_HEX.NC} radius={[2, 2, 0, 0]} />
            <Bar dataKey="CA" name="Californie" fill={STATE_HEX.CA} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ----- Tableau détaillé pour l'État sélectionné ----- */
function PostesTable({ data, stateKey }) {
  const us = data.states[stateKey]
  const rows = Object.keys(POSTE_LABELS).map((key) => ({
    key,
    label: POSTE_LABELS[key],
    fr: data.fr.postes[key],
    us: us.postes[key],
  }))
  const frTotal = rows.reduce((s, r) => s + r.fr, 0)
  const usTotal = rows.reduce((s, r) => s + r.us, 0)

  const frLabel = FR_REGIONS[data.fr.regionKey].label
  const paired = FR_REGIONS[data.fr.regionKey].pairUS === stateKey
  return (
    <div className="panel">
      <div className="panel-head">
        <span>Tableau comparatif — {frLabel} vs {STATES[stateKey].label}</span>
        <span className={`pill ${paired ? '' : 'warn'}`} style={{ fontSize: 10 }}>
          {paired ? '✓ appariée par niveau' : 'comparaison non appariée'}
        </span>
      </div>
      <div className="panel-body" style={{ overflowX: 'auto' }}>
        <table className="postes">
          <thead>
            <tr>
              <th>Poste</th>
              <th className="fr-col">{frLabel} (€)</th>
              <th className="us-col">{STATES[stateKey].label} (€)</th>
              <th>Écart</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const gap = r.us - r.fr
              return (
                <tr key={r.key}>
                  <td>{r.label}{POSTE_TIPS[r.key] && <Info content={POSTE_TIPS[r.key]} />}</td>
                  <td className="fr-col">{eur0(r.fr)}</td>
                  <td className="us-col">{eur0(r.us)}</td>
                  <td style={{ color: gap > 0 ? 'var(--us)' : gap < 0 ? 'var(--fr)' : 'inherit' }}>
                    {gap >= 0 ? '+' : ''}{eur0(gap)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total dépenses contraintes + impôts</td>
              <td className="fr-col">{eur0(frTotal)}</td>
              <td className="us-col">{eur0(usTotal)}</td>
              <td style={{ color: usTotal - frTotal > 0 ? 'var(--us)' : 'var(--fr)' }}>
                {usTotal - frTotal >= 0 ? '+' : ''}{eur0(usTotal - frTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

/* ----- Détails « zoom » d'un poste clé (santé, voiture, logement) ----- */
function ZoomDetails({ data, stateKey }) {
  const us = data.states[stateKey].details
  const fr = data.fr.details
  const sb = fr.socialBenefitsFR

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Zoom — ce que cachent les postes ({STATES[stateKey].label})</span>
        <Info content="Le credit score US pilote le taux du prêt auto ET immo (il n'existe pas en France). La negative equity auto, les HOA et les frais cachés télécoms sont intégrés mais rarement chiffrés." />
      </div>
      <div className="panel-body">
        <div className="kpi-strip" style={{ marginBottom: 10 }}>
          <span>Crédit auto US (TAEG)<Info content={TOOLTIPS.creditScore} /> : <b>{(us.carUS.rate * 100).toFixed(2)} %</b> · {us.carUS.vehicles} véhicule(s)<Info content={TOOLTIPS.negativeEquity} /></span>
          <span>Crédit immo US (taux) : <b>{(us.housingUS.rate * 100).toFixed(2)} %</b></span>
          <span>Surface logement : <b>{num0(us.housingUS.surface)} m²</b></span>
        </div>
        <div className="kpi-strip" style={{ marginBottom: 10 }}>
          <span className="warn">Santé US : prime <b>{usd0(us.healthUS.premium)}</b> + reste à charge <b>{usd0(us.healthUS.oop)}</b> + dentaire/optique <b>{usd0(us.healthUS.dentalVision)}</b>{us.healthUS.bankruptcy ? <> + dette médicale <b>{usd0(us.healthUS.bankruptcy)}</b></> : null}</span>
        </div>
        <div className="kpi-strip" style={{ marginBottom: 10 }}>
          <span>Santé FR : mutuelle<Info content={TOOLTIPS.mutuelle} /> <b>{eur0(fr.healthFR.mutuelle)}</b> + reste à charge <b>{eur0(fr.healthFR.resteACharge)}</b></span>
          <span>Property tax US<Info content={TOOLTIPS.propertyTax} /> : <b>{usd0(us.housingUS.propertyTax)}</b></span>
          <span>Taxe foncière FR : <b>{eur0(fr.housingFR.taxeFonciere)}</b></span>
        </div>
        <div className="kpi-strip" style={{ marginBottom: 10 }}>
          <span>Retraite US à financer : <b>{usd0(us.retirementUS.total)}</b>{us.retirementUS.employerMatch > 0 ? <> (match employeur {usd0(us.retirementUS.employerMatch)})</> : ' (0 par défaut — retraite dégradée)'}</span>
          <span>Avantages sociaux FR valorisés<Info content={TOOLTIPS.congesValorises} /> : <b>{eur0(sb.value)}</b> ({sb.jours} j payés)</span>
        </div>
        {us.studentDebtUS.balance > 0 && (
          <div className="kpi-strip">
            <span className="warn">Dette étudiante US<Info content={TOOLTIPS.coaNetDebt} /> : solde <b>{usd0(us.studentDebtUS.balance)}</b> → <b>{usd0(us.studentDebtUS.annual)}</b>/an{us.dtiRatePenalty > 0 ? <> · DTI<Info content={TOOLTIPS.studentDebtDti} /> +{(us.dtiRatePenalty * 100).toFixed(2)} pt sur crédits</> : null}</span>
            {us.studentDebtUS.stickerTotal != null && (
              <span className="muted">Coût affiché<Info content={TOOLTIPS.coaNetDebt} /> {usd0(us.studentDebtUS.stickerTotal)} → net {usd0(us.studentDebtUS.netTotal)} → dette {usd0(us.studentDebtUS.balance)}</span>
            )}
          </div>
        )}
        {(us.eduUS.k12 > 0 || us.eduUS.daycare > 0) && (
          <div className="kpi-strip">
            {us.eduUS.k12 > 0 && <span>Scolarité K-12 US : <b>{usd0(us.eduUS.k12)}</b>/an{us.eduUS.extracurricular > 0 ? <> · périscolaire <b>{usd0(us.eduUS.extracurricular)}</b></> : null}</span>}
            {us.eduUS.daycare > 0 && <span>Garde 0-5 ans US<Info content={TOOLTIPS.kindergartenCliff} /> : <b>{usd0(us.eduUS.daycare)}</b> vs FR <b>{eur0(fr.eduFR.daycare)}</b></span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Results({ data, inputs }) {
  const [stateKey, setStateKey] = useState('TX')

  return (
    <div>
      <RepBanner inputs={inputs} />

      <div className="section">
        <h2>Cascade du revenu — coût employeur → net après IR</h2>
        <div className="section-sub">
          Où part l'argent à chaque étage, pour les deux pays. La saisie peut se faire en net
          avant ou après IR (sélecteur de gauche) : la cascade reste cohérente.
        </div>
        <CascadePanel inputs={inputs} />
      </div>

      <div className="section">
        <h2>Synthèse — comparaison appariée par niveau de coût <Info content={TOOLTIPS.appariement} /></h2>
        <div className="section-sub">
          Verdict €/an après toutes dépenses contraintes. Chaque carte compare une <b>région FR
          à l'État US de même niveau</b> (Bretagne↔Texas, métropole↔Caroline du Nord,
          Île-de-France↔Californie). C'est la lecture honnête : on ne compare pas la Bretagne à
          la Californie. Les sections ci-dessous suivent la région choisie à gauche.
        </div>
        <VerdictGrid data={data} />
      </div>

      <div className="section">
        <h2>Triple lecture de conversion</h2>
        <div className="section-sub">
          Le même revenu disponible US vu sous trois angles. Du change (flatteur) au reste à
          vivre (réel), l'écart se resserre.
        </div>
        <div className="tabs">
          {['TX', 'NC', 'CA'].map((sk) => (
            <button key={sk} className={stateKey === sk ? 'active' : ''} onClick={() => setStateKey(sk)}>
              {STATES[sk].label}
            </button>
          ))}
        </div>
        <TripleReading data={data} stateKey={stateKey} />
      </div>

      <div className="section">
        <h2>Courbe de seuil de bascule</h2>
        <div className="section-sub">
          On balaye le salaire de référence et on recalcule le reste à vivre à chaque point
          avec le modèle complet. Le croisement des courbes (ou le passage par zéro du
          différentiel) donne le revenu à partir duquel les US deviennent réellement
          avantageux. Le seuil bouge en direct avec tous les paramètres globaux.
        </div>
        <BreakEven inputs={inputs} />
      </div>

      <div className="section">
        <h2>Comparaison visuelle poste par poste</h2>
        <div className="section-sub">Quel poste fait la différence ? Barres France vs trois archétypes d'États.</div>
        <PostesChart data={data} />
      </div>

      <div className="section">
        <h2>Détail chiffré — {STATES[stateKey].label}</h2>
        <div className="section-sub">Choisissez l'État ci-dessus pour piloter ce tableau et le zoom.</div>
        <div style={{ display: 'grid', gap: 16 }}>
          <PostesTable data={data} stateKey={stateKey} />
          <ZoomDetails data={data} stateKey={stateKey} />
        </div>
      </div>
    </div>
  )
}
