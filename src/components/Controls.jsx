import React from 'react'
import { PROFILES, EMPLOYER, STATES, SALARY } from '../config.js'
import {
  computeSalary, resolveNetAvantIRperAdult, computeRepresentativity,
  netAvantIRtoNetApresIR_household, netApresIRtoNetAvantIR_household,
} from '../model.js'
import { eur0, usd0, pct1 } from '../format.js'
import RepBadge from './RepBadge.jsx'
import Info from './Info.jsx'
import { TOOLTIPS } from '../tooltips.js'

function Seg({ options, value, onChange, compact }) {
  return (
    <div className={`seg ${compact ? 'compact' : ''}`}>
      {options.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ label, tip, checked, onChange }) {
  return (
    <div className="toggle-row">
      <div className="tlabel">{label}{tip && <Info content={tip} />}</div>
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="slider" />
      </label>
    </div>
  )
}

export default function Controls({ inputs, set }) {
  const adults = PROFILES[inputs.profileKey].adults
  // Net avant IR résolu (per-adulte) quel que soit le mode de saisie.
  const netAvantIR = resolveNetAvantIRperAdult(inputs)

  // Recalcule le miroir salaire pour l'affichage du cadenas (sur le net avant IR).
  const salary = computeSalary({
    netAvantImpotFR: netAvantIR,
    employerKey: inputs.employerKey,
    ratio: inputs.ratio,
    locked: inputs.locked,
    forcedUsGross: inputs.forcedUsGross,
  })

  // Bascule du mode de saisie : on convertit la valeur affichée pour conserver
  // le MÊME scénario économique (réversible via le barème au quotient familial).
  const switchMode = (mode) => {
    if (mode === inputs.inputMode) return
    if (mode === 'apresIR') {
      const apresHH = netAvantIRtoNetApresIR_household(netAvantIR * adults, inputs.profileKey)
      set({ inputMode: 'apresIR', netAvantImpotFR: Math.round(apresHH / adults) })
    } else {
      // déjà résolu en net avant IR
      set({ inputMode: 'avantIR', netAvantImpotFR: Math.round(netAvantIR) })
    }
  }

  const isApres = inputs.inputMode === 'apresIR'

  // Représentativité de la config courante (anti-cherry-picking).
  const rep = computeRepresentativity(inputs)

  return (
    <div className="controls">
      {/* SALAIRE & CADENAS */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">Salaire de référence</div>
        <div className="panel-body">
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Mode de saisie du revenu</label>
            <Seg
              compact
              value={inputs.inputMode}
              onChange={switchMode}
              options={[
                { value: 'avantIR', label: 'Net avant IR' },
                { value: 'apresIR', label: 'Net après IR' },
              ]}
            />
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>
              {isApres ? 'Net après impôt' : 'Net avant impôt'} — France (€/an, par adulte)
              <Info content={isApres ? TOOLTIPS.netApresIR : TOOLTIPS.netAvantIR} />
              <Info content={TOOLTIPS.foyerBiactif} />
            </label>
            <input
              type="number"
              step="1000"
              value={inputs.netAvantImpotFR}
              onChange={(e) => set({ netAvantImpotFR: Number(e.target.value) || 0 })}
            />
            {isApres && (
              <div className="hint">Résolu en <b>{eur0(netAvantIR)}</b> avant IR/adulte (quotient familial).</div>
            )}
          </div>

          <div className="salary-mirror">
            <div className="side">
              <small>Brut FR reconstruit</small>
              <input type="text" value={eur0(salary.brutFR)} readOnly />
            </div>
            <button
              className={`lock-btn ${inputs.locked ? 'locked' : ''}`}
              title={inputs.locked ? 'Lien verrouillé (ratio poste-équivalent). Cliquer pour forcer la valeur US.' : 'Lien déverrouillé : valeur US forcée. Cliquer pour re-verrouiller.'}
              onClick={() => {
                if (inputs.locked) {
                  // passage en déverrouillé : on initialise la valeur forcée au calcul courant
                  set({ locked: false, forcedUsGross: Math.round(salary.brutUS) })
                } else {
                  set({ locked: true })
                }
              }}
            >
              {inputs.locked ? '🔒' : '🔓'}
            </button>
            <div className="side">
              <small>Brut US équivalent<Info content={TOOLTIPS.cadenas} /></small>
              <input
                type="number"
                value={inputs.locked ? Math.round(salary.brutUS) : inputs.forcedUsGross}
                readOnly={inputs.locked}
                onChange={(e) => set({ forcedUsGross: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>
              Ratio poste-équivalent (US / FR brut) — {inputs.ratio.toFixed(2)}×
              <Info content={TOOLTIPS.ratioPoste} />
            </label>
            <input
              type="range" min="0.9" max="2" step="0.05"
              value={inputs.ratio}
              disabled={!inputs.locked}
              onChange={(e) => set({ ratio: Number(e.target.value) })}
            />
            <span className="ratio-pill">
              Ratio implicite : {salary.impliedRatio.toFixed(2)}× ·
              effectif employeur : {salary.effectiveRatio.toFixed(2)}×
            </span>
          </div>

          <div className="hint warn" style={{ marginTop: 8 }}>
            ⚠️ Le net US ne couvre <b>ni santé ni retraite</b>
            <Info content={TOOLTIPS.miroirUS} />
          </div>
        </div>
      </div>

      {/* PARAMÈTRES */}
      <div className="panel">
        <div className="panel-head">Paramètres</div>
        <div className="panel-body">
          <div className="field">
            <label>Profil de foyer</label>
            <Seg
              value={inputs.profileKey}
              onChange={(v) => set({ profileKey: v })}
              options={[
                { value: 'single', label: 'Célibataire' },
                { value: 'couple', label: 'Couple' },
                { value: 'family', label: 'Famille' },
              ]}
            />
            <div className="hint">{PROFILES[inputs.profileKey].label}</div>
          </div>

          <div className="field">
            <label>
              Type d'employeur
              <Info content="Pilote 401(k)+match, qualité de l'assurance santé, equity/vesting et le ratio de rémunération. « Lambda » = cas dur, fidèle à la thèse (défaut)." />
            </label>
            <Seg
              value={inputs.employerKey}
              onChange={(v) => set({ employerKey: v })}
              options={Object.values(EMPLOYER).map((e) => ({ value: e.key, label: e.label }))}
            />
            <RepBadge share={rep.employer.share} minority={rep.employer.minority} note={rep.employer.note}
              text={inputs.employerKey === 'big' ? 'grand groupe — cas minoritaire' : 'PME/lambda — majoritaire'} />
            <RepBadge share={rep.healthPlan.share} minority={rep.healthPlan.minority} note={rep.healthPlan.note}
              text={rep.healthPlan.key === 'ppo' ? 'assurance PPO — favorable rare' : 'assurance HDHP — ordinaire'} />
          </div>

          <div className="field">
            <label>
              Credit score (US)
              <Info content={TOOLTIPS.creditScore} />
            </label>
            <Seg compact
              value={inputs.creditScore}
              onChange={(v) => set({ creditScore: v })}
              options={[
                { value: 'poor', label: 'Poor' },
                { value: 'fair', label: 'Fair' },
                { value: 'good', label: 'Good' },
                { value: 'excellent', label: 'Excel.' },
              ]}
            />
            <RepBadge share={rep.creditScore.share} minority={rep.creditScore.minority} note={rep.creditScore.note} />
          </div>

          <div className="field">
            <label>
              Scénario santé
              <Info content={TOOLTIPS.santeHonnete} />
            </label>
            <Seg
              value={inputs.healthScenario}
              onChange={(v) => set({ healthScenario: v })}
              options={[
                { value: 'normal', label: 'Année normale' },
                { value: 'pepin', label: 'Année avec pépin' },
              ]}
            />
            <RepBadge alea share={rep.healthScenario.pepinAnnualProb} note={rep.healthScenario.note}
              text={rep.healthScenario.isPepin ? 'pépin ≈ 10 %/an, ~41 % sur 5 ans' : 'année normale non garantie chaque année'} />
          </div>

          <div className="field">
            <label>
              Logement — lecture
              <Info content={TOOLTIPS.logementLecture} />
            </label>
            <Seg
              value={inputs.housingMode}
              onChange={(v) => set({ housingMode: v })}
              options={[
                { value: 'surface', label: 'À surface égale' },
                { value: 'budget', label: 'À budget égal' },
              ]}
            />
            <RepBadge alea note={rep.housing.note} text="propriétaire : FR ~58 % · TX ~62 % · NC ~66 % · CA ~55 %" />
          </div>

          <div className="field" style={{ marginBottom: 4 }}>
            <label>Options</label>
            <Toggle
              label="Transport en commun (FR)"
              tip="Lève la dépendance auto FR : abonnement (prise en charge employeur 50 %) au lieu d'un véhicule. Réaliste surtout en métropole."
              checked={inputs.useTransit}
              onChange={(v) => set({ useTransit: v })}
            />
            {inputs.useTransit && (
              <RepBadge share={rep.transit.share} minority note={rep.transit.note}
                text="offre suffisante ≈ 1 actif FR sur 5" />
            )}
            <Toggle
              label="Risque climatique (habitation US)"
              tip={TOOLTIPS.risqueClimatique}
              checked={inputs.climateRisk}
              onChange={(v) => set({ climateRisk: v })}
            />
            <Toggle
              label="Épargner pour la retraite (US)"
              tip="Chiffre l'épargne (401k/IRA) nécessaire pour égaler la couverture retraite FR. Désactivé = cas dur : aucune épargne, retraite dégradée."
              checked={inputs.voluntarySavings}
              onChange={(v) => set({ voluntarySavings: v })}
            />
            <RepBadge alea share={rep.retirement401k.withMatch} note={rep.retirement401k.note}
              text="≈45 % cotisent à un 401(k) avec match" />
            <Toggle
              label="Faillite médicale (US)"
              tip="Dette médicale, 1re cause de faillite personnelle aux US. Surcoût annualisé, appliqué seulement en scénario « pépin ». OFF par défaut pour ne pas dramatiser."
              checked={inputs.medicalBankruptcy}
              onChange={(v) => set({ medicalBankruptcy: v })}
            />
            <Toggle
              label="Valoriser les avantages sociaux FR"
              tip={TOOLTIPS.congesValorises}
              checked={inputs.valueSocialBenefits}
              onChange={(v) => set({ valueSocialBenefits: v })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
