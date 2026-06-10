import React, { useMemo, useState } from 'react'
import Controls from './components/Controls.jsx'
import Results from './components/Results.jsx'
import Methodology from './components/Methodology.jsx'
import { computeAll } from './model.js'
import { SALARY } from './config.js'

const DEFAULT_INPUTS = {
  netAvantImpotFR: SALARY.defaultNetAvantImpotFR, // valeur saisie (sens dépend de inputMode)
  inputMode: 'avantIR',       // 'avantIR' (net avant IR) | 'apresIR' (net après IR)
  frRegion: 'bretagne',       // région FR : bretagne (low) / metropole (mid) / idf (high)
  profileKey: 'single',
  employerKey: 'lambda',      // cas dur par défaut, fidèle à la thèse
  ratio: SALARY.posteEquivalentRatio,
  locked: true,               // cadenas verrouillé par défaut
  forcedUsGross: 42000,       // utilisé seulement si déverrouillé
  creditScore: 'fair',
  healthScenario: 'normal',
  housingMode: 'surface',
  useTransit: false,
  climateRisk: false,
  voluntarySavings: false,    // cas dur : aucune épargne retraite US
  medicalBankruptcy: false,
  valueSocialBenefits: false,
  // Éducation / formation (3 axes) — valeurs par défaut représentatives.
  educationLevel: 'bachelor',        // diplôme de l'actif → dette étudiante US
  // AXE 1 — paramètres de dette (défaut = public in-state, cas médian)
  debtMode: 'detailed',              // 'detailed' (pipeline CoA→net→dette) | 'simple' (solde saisi)
  institutionType: 'publicInState',  // community/publicInState/publicOutState/private/elite
  ugYears: 4,                        // durée réelle d'études (4-6)
  loanType: 'mix',                   // subsidized/mix/unsubsidized/private (fraction qui capitalise)
  borrowedShareOfNet: 0.30,          // part du coût NET financée par emprunt
  payInterestDuringStudies: false,   // toggle (OFF = capitalisation, cas majoritaire)
  manualDebtBalance: 30000,          // utilisé en mode 'simple'
  schoolChoice: 'public',            // K-12 des enfants (profil famille)
  extracurricularLevel: 'basic',     // intensité périscolaire (profil famille)
}

export default function App() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS)
  const set = (patch) => setInputs((prev) => ({ ...prev, ...patch }))

  const data = useMemo(() => computeAll(inputs), [inputs])

  return (
    <div className="app">
      <header className="masthead">
        <div className="kicker">Simulateur comparatif · coût & qualité de vie réels</div>
        <h1>France 🇫🇷 vs États-Unis 🇺🇸 — à qualité constante</h1>
        <p className="sub">
          Référence France : Bretagne, ville moyenne type Rennes. Trois archétypes d'États
          américains (Texas, Caroline du Nord, Californie). Tous les paramètres sont
          ajustables en direct : la robustesse de la comparaison se teste, elle ne se décrète pas.
        </p>
      </header>

      <div className="layout">
        <Controls inputs={inputs} set={set} />
        <main>
          <Results data={data} inputs={inputs} />
          <Methodology />
        </main>
      </div>
    </div>
  )
}
