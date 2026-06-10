/**
 * =============================================================================
 *  MODEL — MOTEUR DE CALCUL (fonctions pures)
 * =============================================================================
 *  Aucune valeur « en dur » ici : tout vient de config.js. Le module expose
 *  computeAll(inputs) qui renvoie, pour la France et pour un État US donné, le
 *  revenu disponible, le détail des dépenses contraintes poste par poste, et le
 *  RESTE À VIVRE (la lecture reine).
 *
 *  Convention : on raisonne en EUR pour la France et en USD pour les US ; la
 *  conversion finale en une devise commune (EUR) se fait dans les helpers de
 *  lecture (toEUR). Cela évite de mélanger les devises dans les calculs métier.
 * =============================================================================
 */

import {
  CONVERSION, PROFILES, SALARY, EMPLOYER, TAX_FR, TAX_US_FEDERAL, TAX_US_STATE,
  TRANSFERS_FR, SOCIAL_BENEFITS_FR, HEALTH, RETIREMENT, CAR, TELECOM, ENERGY,
  HOUSING, FOOD, EDUCATION, REPRESENTATIVITY,
} from './config.js'

// ---------------------------------------------------------------------------
//  Helpers génériques
// ---------------------------------------------------------------------------

/** Impôt progressif par tranches marginales. */
function progressiveTax(taxable, brackets) {
  let tax = 0
  let lower = 0
  for (const b of brackets) {
    if (taxable <= lower) break
    const slice = Math.min(taxable, b.upTo) - lower
    tax += slice * b.rate
    lower = b.upTo
  }
  return Math.max(0, tax)
}

/** Mensualité d'un prêt amortissable (formule standard). */
function monthlyPayment(principal, annualRate, months) {
  if (principal <= 0) return 0
  const r = annualRate / 12
  if (r === 0) return principal / months
  return (principal * r) / (1 - Math.pow(1 + r, -months))
}

// USD → EUR pour les lectures finales.
export const usdToEur = (usd) => usd / CONVERSION.exchangeRate
// EUR → USD.
export const eurToUsd = (eur) => eur * CONVERSION.exchangeRate

// ===========================================================================
//  SALAIRE — reconstruction des deux côtés (corrige le piège du « net avant impôt »)
// ===========================================================================

/**
 * À partir du net avant impôt FR saisi par l'utilisateur, reconstruit :
 *  - le brut FR
 *  - le brut US équivalent (via ratio poste-équivalent, ajusté employeur)
 *  - le « miroir US » : brut US − FICA (PAS de santé ni retraite dedans)
 *
 * @param netAvantImpotFR  net avant IR France (€/an)
 * @param employerKey      'lambda' | 'big'
 * @param ratio            ratio poste-équivalent effectif (déjà lu depuis l'UI)
 * @param locked           true = US auto-calculé ; false = US forcé
 * @param forcedUsGross    brut US forcé (USD) si déverrouillé
 */
export function computeSalary({ netAvantImpotFR, employerKey, ratio, locked, forcedUsGross }) {
  const emp = EMPLOYER[employerKey]

  // Brut FR = on « remet » les cotisations salariales sur le net avant impôt.
  const brutFR = netAvantImpotFR / (1 - SALARY.cotisSalarialesRate)

  // Ratio effectif : le grand groupe paie davantage (ratioBonus).
  const effectiveRatio = ratio * (1 + (locked ? emp.ratioBonus : 0))

  // Brut US équivalent : brut FR converti en USD × ratio poste-équivalent.
  let brutUS
  if (locked) {
    brutUS = eurToUsd(brutFR) * effectiveRatio
  } else {
    brutUS = forcedUsGross
  }

  // Equity / vesting (grand groupe) : rémunération additionnelle (miroir des
  // bonus d'un grand groupe FR). Comptée comme revenu US supplémentaire.
  const equityUS = brutUS * emp.equityShareOfPay

  // Miroir US : on retire la FICA. ⚠️ Ni santé ni retraite ici : ce sont des
  // postes de dépense séparés (c'est tout le piège corrigé).
  const fica = brutUS * SALARY.ficaRate
  const netAvantImpotUS = brutUS - fica // équivalent structurel du « net avant impôt » FR... mais sans santé/retraite couvertes

  return {
    brutFR,
    brutUS,
    equityUS,
    fica,
    netAvantImpotUS,
    effectiveRatio,
    // ratio implicite affiché si déverrouillé
    impliedRatio: eurToUsd(brutFR) > 0 ? brutUS / eurToUsd(brutFR) : 0,
  }
}

// ===========================================================================
//  IMPÔTS
// ===========================================================================

/** IR France avec quotient familial + transferts reçus. */
export function computeTaxFR({ netAvantImpotFR, profileKey }) {
  const p = PROFILES[profileKey]
  const revenuImposable = netAvantImpotFR * (1 - TAX_FR.abattement)

  const parts = p.adults * TAX_FR.partsPerAdult + p.kids * TAX_FR.partsPerKid

  // Impôt avec quotient familial.
  const taxParPart = progressiveTax(revenuImposable / parts, TAX_FR.brackets)
  let ir = taxParPart * parts

  // Plafonnement de l'avantage du quotient familial (simplifié) : on compare au
  // calcul sans enfants et on plafonne le gain par demi-part.
  if (p.kids > 0) {
    const partsAdultsOnly = p.adults * TAX_FR.partsPerAdult
    const irSansEnfants = progressiveTax(revenuImposable / partsAdultsOnly, TAX_FR.brackets) * partsAdultsOnly
    const avantageQF = irSansEnfants - ir
    const demiParts = p.kids // 2 enfants = 2 demi-parts
    const avantagePlafonne = Math.min(avantageQF, demiParts * TAX_FR.plafondDemiPart)
    ir = irSansEnfants - avantagePlafonne
  }

  // Transferts reçus (réduisent la charge nette).
  const transfers = computeTransfersFR({ netAvantImpotFR, profileKey })

  return { ir: Math.max(0, ir), parts, revenuImposable, transfers }
}

/** Transferts sociaux reçus FR (allocations, prime d'activité, APL). */
export function computeTransfersFR({ netAvantImpotFR, profileKey }) {
  const p = PROFILES[profileKey]
  let allocFamiliales = 0
  let primeActivite = 0
  let apl = 0

  // Allocations familiales : à partir de 2 enfants, dégressives.
  if (p.kids >= 2) {
    let monthly = TRANSFERS_FR.allocFamiliales.monthlyBase2Kids
    if (netAvantImpotFR > TRANSFERS_FR.allocFamiliales.plafond2) monthly /= 4
    else if (netAvantImpotFR > TRANSFERS_FR.allocFamiliales.plafond1) monthly /= 2
    allocFamiliales = monthly * 12
  }

  // Prime d'activité : bas revenus. Éteinte au-dessus d'un net mensuel/personne.
  const persons = p.adults + p.kids * 0.5
  const netMensuelParPersonne = netAvantImpotFR / 12 / persons
  if (netMensuelParPersonne < TRANSFERS_FR.primeActivite.extinctionNetMensuelParPersonne) {
    const max = p.kids > 0
      ? TRANSFERS_FR.primeActivite.monthlyMaxFamily
      : TRANSFERS_FR.primeActivite.monthlyMaxSingle
    // Dégressivité linéaire jusqu'à extinction.
    const ratio = 1 - netMensuelParPersonne / TRANSFERS_FR.primeActivite.extinctionNetMensuelParPersonne
    primeActivite = Math.max(0, max * ratio) * 12
  }

  // APL : nulle par défaut en mode propriétaire.
  if (TRANSFERS_FR.apl.enabled) apl = TRANSFERS_FR.apl.monthlyMax * 12

  return {
    allocFamiliales,
    primeActivite,
    apl,
    total: allocFamiliales + primeActivite + apl,
  }
}

/** Impôt fédéral + État US. */
export function computeTaxUS({ brutUS, equityUS, profileKey, stateKey }) {
  const p = PROFILES[profileKey]
  const filing = p.adults === 1 ? 'single' : 'couple'
  const grossTaxable = brutUS + equityUS

  // Fédéral.
  const stdDed = TAX_US_FEDERAL.standardDeduction[profileKey]
  const fedTaxable = Math.max(0, grossTaxable - stdDed)
  let federal = progressiveTax(fedTaxable, TAX_US_FEDERAL.brackets[filing])
  // Child Tax Credit.
  federal = Math.max(0, federal - p.kids * TAX_US_FEDERAL.childTaxCredit)

  // État.
  const st = TAX_US_STATE[stateKey]
  let state = 0
  if (st.type === 'flat') {
    state = fedTaxable * st.rate
  } else if (st.type === 'progressive') {
    const factor = p.adults === 1 ? 1 : st.coupleSeuilFactor
    const brackets = st.brackets.map((b) => ({
      upTo: b.upTo === Infinity ? Infinity : b.upTo * factor,
      rate: b.rate,
    }))
    state = progressiveTax(fedTaxable, brackets)
  }

  return { federal, state, total: federal + state }
}

// ===========================================================================
//  DÉPENSES CONTRAINTES — postes
// ===========================================================================

/** Santé US : primes + reste à charge attendu sur le scénario choisi. */
export function computeHealthUS({ profileKey, employerKey, healthScenario, medicalBankruptcy }) {
  const planKey = EMPLOYER[employerKey].healthPlanQuality
  const plan = HEALTH.US.plans[planKey]
  const premium = plan.employeePremiumAnnual[profileKey]

  const careSpend = HEALTH.US.careSpend[healthScenario][profileKey]
  const deductible = plan.deductible[profileKey]
  const oopMax = plan.outOfPocketMax[profileKey]

  // Reste à charge = franchise (jusqu'au montant des soins) + coinsurance sur
  // l'excédent, plafonné à l'out-of-pocket max.
  let oop = 0
  if (careSpend <= deductible) {
    oop = careSpend
  } else {
    oop = deductible + (careSpend - deductible) * plan.coinsurance
  }
  oop = Math.min(oop, oopMax)

  const dentalVision = HEALTH.US.dentalVisionOOP[profileKey]
  const bankruptcy = medicalBankruptcy && healthScenario === 'pepin'
    ? HEALTH.medicalBankruptcyAnnualUS[profileKey]
    : 0

  const total = premium + oop + dentalVision + bankruptcy
  return { premium, oop, dentalVision, bankruptcy, total, planKey }
}

/** Santé FR : mutuelle (part salarié) + reste à charge. */
export function computeHealthFR({ profileKey, healthScenario }) {
  const mutuelle = HEALTH.FR.mutuelleAnnualEmployeeShare[profileKey]
  const resteACharge = HEALTH.FR.resteAChargeAnnual[healthScenario][profileKey]
  const dentalVision = HEALTH.FR.dentalVisionOOP[profileKey]
  const total = mutuelle + resteACharge + dentalVision
  return { mutuelle, resteACharge, dentalVision, total }
}

/** Retraite US : épargne nécessaire pour égaler la couverture FR. */
export function computeRetirementUS({ brutUS, employerKey, voluntarySavings }) {
  const emp = EMPLOYER[employerKey]
  // Cas dur par défaut : aucune épargne volontaire → coût 0 aujourd'hui (mais
  // retraite dégradée demain). Si l'utilisateur active l'épargne OU s'il y a un
  // match employeur (grand groupe), on chiffre la contribution.
  if (!voluntarySavings && !emp.has401kMatch) {
    return { employeeContribution: 0, employerMatch: 0, total: 0 }
  }
  const targetRate = voluntarySavings ? RETIREMENT.targetSavingsRateUS : emp.match401kRate
  const employeeContribution = brutUS * targetRate
  const employerMatch = emp.has401kMatch ? brutUS * emp.match401kRate : 0
  // Le coût « de poche » est la part salarié (le match est de l'argent gratuit
  // mais l'employé doit quand même contribuer pour le capter).
  return { employeeContribution, employerMatch, total: employeeContribution }
}

/** Voiture US : coût de possession total annualisé. dtiRatePenalty = surcoût
 *  de taux issu de la dette étudiante (effet système). */
export function computeCarUS({ profileKey, stateKey, creditScore, dtiRatePenalty = 0 }) {
  const n = CAR.vehiclesUS[profileKey]
  const rate = CAR.creditScoreRatesUS[creditScore] + dtiRatePenalty
  const principal = CAR.vehiclePriceUS * (1 - CAR.downPaymentRateUS)
  const monthly = monthlyPayment(principal, rate, CAR.loanTermMonthsUS)
  const creditAnnualPerCar = monthly * 12
  // Coût total du crédit (intérêts) pour pédagogie.
  const totalInterestPerCar = monthly * CAR.loanTermMonthsUS - principal

  const perCar =
    creditAnnualPerCar +
    CAR.negativeEquityAnnualUS +
    CAR.insuranceAnnualUS[stateKey] +
    CAR.maintenanceAnnualUS +
    CAR.fuelAnnualUS

  return {
    vehicles: n,
    monthlyPaymentPerCar: monthly,
    creditAnnualPerCar,
    totalInterestPerCar,
    insurancePerCar: CAR.insuranceAnnualUS[stateKey],
    total: perCar * n,
    rate,
  }
}

/** Voiture FR : taux fixe, option transport en commun. */
export function computeCarFR({ profileKey, useTransit }) {
  if (useTransit) {
    const map = { single: CAR.transitFR.annualSingle, couple: CAR.transitFR.annualCouple, family: CAR.transitFR.annualFamily }
    // En report transport en commun : on garde éventuellement 1 véhicule pour la
    // famille (usage mixte) — simplifié : célib/couple = 0 voiture, famille = 1.
    if (profileKey === 'family') {
      const oneCar = carFRperVehicle()
      return { vehicles: 1, total: map.family + oneCar, transit: map.family }
    }
    return { vehicles: 0, total: map[profileKey], transit: map[profileKey] }
  }
  const n = CAR.vehiclesFR[profileKey]
  return { vehicles: n, total: carFRperVehicle() * n, transit: 0 }
}

function carFRperVehicle() {
  const principal = CAR.vehiclePriceFR * (1 - CAR.downPaymentRateFR)
  const monthly = monthlyPayment(principal, CAR.loanRateFR, CAR.loanTermMonthsFR)
  return monthly * 12 + CAR.insuranceAnnualFR + CAR.maintenanceAnnualFR + CAR.fuelAnnualFR
}

/** Télécoms US (service équivalent au forfait FR + frais cachés). */
export function computeTelecomUS({ profileKey }) {
  const lines = TELECOM.linesPerProfile[profileKey]
  const mobile = TELECOM.US.mobilePerLineMonthly * lines
  const monthly = mobile + TELECOM.US.internetMonthly + TELECOM.US.streamingMonthly + TELECOM.US.hiddenFeesMonthly
  return { lines, mobileMonthly: mobile, hiddenFeesMonthly: TELECOM.US.hiddenFeesMonthly, total: monthly * 12 }
}

export function computeTelecomFR({ profileKey }) {
  const lines = TELECOM.linesPerProfile[profileKey]
  const mobile = TELECOM.FR.mobilePerLineMonthly * lines
  const monthly = mobile + TELECOM.FR.fiberMonthly + TELECOM.FR.streamingMonthly
  return { lines, mobileMonthly: mobile, total: monthly * 12 }
}

/** Énergie US : volume × prix État (+ volatilité TX). */
export function computeEnergyUS({ profileKey, stateKey }) {
  const kwh = ENERGY.elecKwhUS[profileKey]
  const elec = kwh * ENERGY.elecPriceUS[stateKey]
  const volatility = stateKey === 'TX' ? ENERGY.txVolatilitySurcharge : 0
  const waterGas = ENERGY.waterGasAnnualUS[profileKey]
  return { kwh, elec, volatility, waterGas, total: elec + volatility + waterGas }
}

export function computeEnergyFR({ profileKey }) {
  const kwh = ENERGY.elecKwhFR[profileKey]
  const elec = kwh * ENERGY.elecPriceFR
  const waterGas = ENERGY.waterGasAnnualFR[profileKey]
  return { kwh, elec, waterGas, total: elec + waterGas }
}

/** Logement US : crédit (taux ∝ credit score + DTI) + property tax + assurance + HOA. */
export function computeHousingUS({ profileKey, stateKey, creditScore, climateRisk, housingMode, dtiRatePenalty = 0 }) {
  // housingMode : 'surface' (à surface égale) ou 'budget' (à budget égal vs FR).
  const surface = HOUSING.surfaceM2[profileKey]
  let value
  if (housingMode === 'budget') {
    // À budget égal : on dépense le même montant qu'en France → la valeur du
    // bien US correspond à ce budget FR converti. On calcule la surface obtenue.
    const frValue = HOUSING.surfaceM2[profileKey] * HOUSING.pricePerM2FR
    value = eurToUsd(frValue)
  } else {
    value = surface * HOUSING.pricePerM2US[stateKey]
  }
  const surfaceObtained = value / HOUSING.pricePerM2US[stateKey]

  const rate = HOUSING.mortgageBaseRateUS + HOUSING.mortgageScoreSurcharge[creditScore] + dtiRatePenalty
  const principal = value * (1 - HOUSING.downPaymentRateUS)
  const monthly = monthlyPayment(principal, rate, HOUSING.loanTermYearsUS * 12)
  const creditAnnual = monthly * 12

  const propertyTax = value * HOUSING.propertyTaxRateUS[stateKey]
  const insurance = HOUSING.homeInsuranceAnnualUS[stateKey] + (climateRisk ? HOUSING.climateRiskSurchargeUS[stateKey] : 0)
  const hoa = HOUSING.hoaAnnualUS[stateKey]

  return {
    value, surface: surfaceObtained, rate, creditAnnual, monthly,
    propertyTax, insurance, hoa,
    total: creditAnnual + propertyTax + insurance + hoa,
  }
}

export function computeHousingFR({ profileKey, housingMode }) {
  const surface = HOUSING.surfaceM2[profileKey]
  const value = surface * HOUSING.pricePerM2FR
  const principal = value * (1 - HOUSING.downPaymentRateFR)
  const monthly = monthlyPayment(principal, HOUSING.mortgageRateFR, HOUSING.loanTermYearsFR * 12)
  const creditAnnual = monthly * 12
  const taxeFonciere = value * HOUSING.taxeFonciereRateFR
  const insurance = HOUSING.homeInsuranceAnnualFR
  return {
    value, surface, rate: HOUSING.mortgageRateFR, creditAnnual, monthly,
    taxeFonciere, insurance,
    total: creditAnnual + taxeFonciere + insurance,
  }
}

/** Alimentation. */
export function computeFoodUS({ profileKey }) {
  const base = FOOD.annualUSbase[profileKey]
  const withQuality = base * FOOD.qualityPremiumUS
  return { base, qualityPremium: withQuality - base, total: withQuality }
}
export function computeFoodFR({ profileKey }) {
  return { total: FOOD.annualFR[profileKey] }
}

// ----- AXE 1 : dette étudiante de l'actif -----
/**
 * Solde capitalisé d'une phase d'emprunt : chaque tranche annuelle court et
 * capitalise les intérêts (sur sa part non-subventionnée) AVANT le 1er paiement.
 * Renvoie le solde à l'entrée en remboursement (principal gonflé).
 */
function capitalizedBalance({ annualBorrowed, years, rate, unsubFraction, originationFee, graceYears, payInterestDuringStudies }) {
  let balance = 0
  for (let k = 1; k <= years; k++) {
    // Tranche décaissée en début d'année k → court jusqu'à l'entrée en
    // remboursement (fin de la dernière année + grâce).
    const yearsAccruing = (years - k + 1) + graceYears
    const gross = annualBorrowed * (1 + originationFee)
    const subPart = gross * (1 - unsubFraction) // intérêts payés par l'État (pas de capitalisation)
    const accrual = payInterestDuringStudies ? 1 : Math.pow(1 + rate, yearsAccruing)
    const unsubPart = gross * unsubFraction * accrual
    balance += subPart + unsubPart
  }
  return balance
}

/**
 * Dette étudiante US de l'actif. Pipeline réaliste :
 *   CoA → coût net (après aides) → part empruntée → capitalisation des intérêts
 *   pendant les études → amortissement sur la durée réelle (~20 ans).
 * Appliquée PAR ADULTE actif (foyer bi-actif). Mode 'simple' : solde saisi direct.
 */
export function computeStudentDebtUS({ educationLevel, profileKey, debtMode, manualDebtBalance,
  institutionType = 'publicInState', ugYears, loanType = 'mix', borrowedShareOfNet,
  payInterestDuringStudies = false }) {
  const sd = EDUCATION.studentDebt
  const adults = PROFILES[profileKey].adults
  const grace = sd.graceMonths / 12

  // --- Mode simple : l'utilisateur connaît son solde de dette ---
  if (debtMode === 'simple') {
    const balPerAdult = Math.max(0, manualDebtBalance || 0)
    const monthlyPerAdult = monthlyPayment(balPerAdult, sd.rateUndergrad, sd.repaymentYears * 12)
    return {
      mode: 'simple', stickerTotal: null, netTotal: null,
      balance: balPerAdult * adults, monthly: monthlyPerAdult * adults,
      annual: monthlyPerAdult * adults * 12, perAdultMonthly: monthlyPerAdult,
      capitalizedPerAdult: balPerAdult,
    }
  }

  if (!educationLevel || educationLevel === 'none') {
    return { mode: 'detailed', stickerTotal: 0, netTotal: 0, balance: 0, monthly: 0, annual: 0, perAdultMonthly: 0, capitalizedPerAdult: 0 }
  }

  const years = Math.max(1, ugYears || sd.ugYearsDefault)
  const coaAnnual = sd.coaByInstitution[institutionType] ?? sd.coaByInstitution.publicInState
  const netAnnual = sd.netByInstitution[institutionType] ?? sd.netByInstitution.publicInState
  const share = borrowedShareOfNet != null ? borrowedShareOfNet : sd.borrowedShareOfNet
  const annualBorrowedUG = netAnnual * share
  const unsubFrac = sd.unsubFractionByLoanType[loanType] ?? sd.unsubFractionByLoanType.mix

  // Phase UG (undergrad) capitalisée.
  const ugDebt = capitalizedBalance({
    annualBorrowed: annualBorrowedUG, years, rate: sd.rateUndergrad,
    unsubFraction: unsubFrac, originationFee: sd.originationSubUnsub,
    graceYears: grace, payInterestDuringStudies,
  })

  // Phase GRAD (master/doctorat) — tout non-subventionné, taux grad.
  const gradYears = sd.gradYearsByLevel[educationLevel] || 0
  const gradDebt = gradYears > 0 ? capitalizedBalance({
    annualBorrowed: sd.gradAnnualBorrowed, years: gradYears, rate: sd.rateGrad,
    unsubFraction: 1.0, originationFee: sd.originationSubUnsub,
    graceYears: grace, payInterestDuringStudies,
  }) : 0

  const capitalizedPerAdult = ugDebt + gradDebt
  // Amortissement séparé par phase (taux distincts) sur la durée réelle.
  const monthlyPerAdult =
    monthlyPayment(ugDebt, sd.rateUndergrad, sd.repaymentYears * 12) +
    monthlyPayment(gradDebt, sd.rateGrad, sd.repaymentYears * 12)
  const monthly = monthlyPerAdult * adults

  // Sticker vs net (sur la phase UG, pour la pédagogie « ne pas confondre »).
  const stickerTotal = coaAnnual * years * adults
  const netTotal = netAnnual * years * adults

  return {
    mode: 'detailed',
    stickerTotal, netTotal,
    coaAnnual, netAnnual, ugYears: years, gradYears,
    ugDebt: ugDebt * adults, gradDebt: gradDebt * adults,
    capitalizedPerAdult,
    balance: capitalizedPerAdult * adults,
    monthly, annual: monthly * 12, perAdultMonthly: monthlyPerAdult,
  }
}

/** Miroir FR : coût annualisé de l'éducation supérieure de l'actif (non nul). */
export function computeStudentCostFR({ educationLevel, profileKey }) {
  const adults = PROFILES[profileKey].adults
  const perAdult = EDUCATION.studentDebt.annualFRByLevel[educationLevel] || 0
  return { annual: perAdult * adults }
}

/**
 * Pénalité de taux US issue du DTI : la mensualité étudiante dégrade la
 * capacité d'emprunt → surcoût de taux immo & auto (effet système).
 */
export function computeStudentDtiPenalty({ studentMonthly, brutUS }) {
  const grossMonthly = brutUS / 12
  if (grossMonthly <= 0) return 0
  const dti = studentMonthly / grossMonthly
  const sd = EDUCATION.studentDebt.dti
  return Math.min(sd.ratePenaltyCap, dti * sd.ratePenaltyFactor)
}

// ----- AXES 2 & 3 : enfants (scolarité + périscolaire) + AXE 1 agrégé -----
/** Éducation / formation US (3 axes). studentDebt déjà calculé en amont. */
export function computeEducationUS({ profileKey, stateKey, schoolChoice, extracurricularLevel, studentDebtAnnual }) {
  const p = PROFILES[profileKey]
  let daycare = 0, k12 = 0, extracurricular = 0
  if (p.kids > 0) {
    daycare = EDUCATION.daycareUSannualPerKid * EDUCATION.daycareKidsEquiv
    const k12PerKid = (EDUCATION.k12USannualPerKid[schoolChoice] || 0) * (EDUCATION.k12StateMultiplierUS[stateKey] || 1)
    k12 = k12PerKid * EDUCATION.k12KidsEquiv
    extracurricular = EDUCATION.extracurricularUSByLevel[extracurricularLevel] || 0
  }
  const total = daycare + k12 + extracurricular + (studentDebtAnnual || 0)
  return { daycare, k12, extracurricular, studentDebt: studentDebtAnnual || 0, total }
}

/** Éducation / formation FR (3 axes, miroir honnête). */
export function computeEducationFR({ profileKey, schoolChoice, extracurricularLevel, educationLevel }) {
  const p = PROFILES[profileKey]
  let daycare = 0, k12 = 0, extracurricular = 0
  if (p.kids > 0) {
    daycare = EDUCATION.daycareFRannualPerKid * EDUCATION.daycareKidsEquiv
    k12 = (EDUCATION.k12FRannualPerKid[schoolChoice] || 0) * EDUCATION.k12KidsEquiv
    extracurricular = EDUCATION.extracurricularFRByLevel[extracurricularLevel] || 0
  }
  const studentCost = computeStudentCostFR({ educationLevel, profileKey }).annual
  const total = daycare + k12 + extracurricular + studentCost
  return { daycare, k12, extracurricular, studentCost, total }
}

/** Avantages sociaux FR valorisés en € (rémunération invisible). */
export function computeSocialBenefitsValueFR({ brutFR, profileKey }) {
  // Taux journalier ≈ brut annuel / 217 jours travaillés.
  const dailyRate = brutFR / 217
  const sb = SOCIAL_BENEFITS_FR
  const parental = profileKey === 'family'
    ? sb.congeParentaliteJoursAmortiFamily
    : sb.congeParentaliteJoursAmortiSingle
  const jours = sb.congesPayesJours + sb.congeMaladieJours + parental
  return { dailyRate, jours, value: dailyRate * jours }
}

// ===========================================================================
//  MODE DE SAISIE DU REVENU : net avant IR  /  net après IR
// ===========================================================================
/**
 * Inverse le barème IR : à partir d'un net APRÈS IR (foyer), retrouve le net
 * AVANT IR (foyer) tel que netAvantIR − IR(netAvantIR, profil) = netApresIR.
 * L'IR dépend du quotient familial → la conversion dépend du profil.
 * Inversion numérique (f(net)=net−IR est strictement croissante).
 */
export function netApresIRtoNetAvantIR_household(householdApresIR, profileKey) {
  if (householdApresIR <= 0) return 0
  let lo = householdApresIR
  let hi = householdApresIR * 2 + 100000 // borne large : IR < 45 %
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const ir = computeTaxFR({ netAvantImpotFR: mid, profileKey }).ir
    const apres = mid - ir
    if (apres < householdApresIR) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Convertit un net AVANT IR (foyer) en net APRÈS IR (foyer). */
export function netAvantIRtoNetApresIR_household(householdAvantIR, profileKey) {
  const ir = computeTaxFR({ netAvantImpotFR: householdAvantIR, profileKey }).ir
  return householdAvantIR - ir
}

/**
 * Résout, quel que soit le mode de saisie, le net AVANT IR PAR ADULTE — la
 * grandeur de référence sur laquelle tout le reste du modèle est bâti.
 * inputs.inputMode : 'avantIR' (défaut) | 'apresIR'.
 */
export function resolveNetAvantIRperAdult(inputs) {
  const adults = PROFILES[inputs.profileKey].adults
  if (inputs.inputMode === 'apresIR') {
    const householdApres = inputs.netAvantImpotFR * adults
    const householdAvant = netApresIRtoNetAvantIR_household(householdApres, inputs.profileKey)
    return householdAvant / adults
  }
  return inputs.netAvantImpotFR
}

/**
 * Taux de cotisations PATRONALES FR effectif, DÉGRESSIF (allègements généraux).
 * Plein taux au-delà de 1,6 SMIC, allègement max au niveau du SMIC. Calculé sur
 * le brut PAR TRAVAILLEUR (l'allègement s'apprécie par salarié).
 */
export function frPatronalRate(brutPerWorker) {
  const { smicAnnualBrut: smic, cotisPatronalesMax: max,
    cotisPatronalesReductionMax: redMax, cotisPatronalesSeuilHautSmic: seuil } = SALARY
  const ratio = brutPerWorker / smic
  // t = 1 au SMIC (allègement plein), 0 à `seuil` SMIC (plus d'allègement).
  const t = Math.min(1, Math.max(0, (seuil - Math.max(1, ratio)) / (seuil - 1)))
  return max - redMax * t
}

/**
 * Cascade SYMÉTRIQUE « coût employeur total → brut → net avant IR → net après IR »
 * pour les deux pays, au niveau du FOYER. On part du MÊME point haut (le coût
 * total employeur) et on redescend les marches symétriquement.
 *
 * ⚠️ Symétrie clé : au stade « net avant IR », les DEUX côtés ont retiré
 * santé + retraite + chômage — côté FR via les cotisations salariales, côté US
 * via FICA + prime santé part salarié + cotisation 401(k) salarié. C'est ce qui
 * rend les deux nets RÉELLEMENT comparables et révèle qu'à coût employeur égal,
 * l'écart de net est bien plus faible que l'écart de brut affiché.
 */
export function computeCascade(inputs, stateKey = 'TX') {
  const profileKey = inputs.profileKey
  const adults = PROFILES[profileKey].adults
  const netAvantIRperAdult = resolveNetAvantIRperAdult(inputs)
  const householdNetAvantIR = netAvantIRperAdult * adults

  // ----- FRANCE (foyer) -----
  const brutFR = householdNetAvantIR / (1 - SALARY.cotisSalarialesRate)
  const brutFRperWorker = brutFR / adults
  const patronalRate = frPatronalRate(brutFRperWorker)
  const coutEmployeurFR = brutFR * (1 + patronalRate)
  const irFR = computeTaxFR({ netAvantImpotFR: householdNetAvantIR, profileKey }).ir
  const netApresIRfr = householdNetAvantIR - irFR

  // ----- ÉTATS-UNIS (foyer) -----
  const salary = computeSalary({
    netAvantImpotFR: householdNetAvantIR,
    employerKey: inputs.employerKey,
    ratio: inputs.ratio,
    locked: inputs.locked,
    forcedUsGross: inputs.forcedUsGross * adults,
  })
  const emp = EMPLOYER[inputs.employerKey]
  const planKey = emp.healthPlanQuality
  const brutUSperWorker = salary.brutUS / adults

  // -- Part EMPLOYEUR (coût total) --
  const employerFica = salary.brutUS * SALARY.ficaRate
  const employerHealth = HEALTH.US.plans[planKey].employerPremiumAnnual[profileKey]
  const employerUnemployment = adults *
    (Math.min(brutUSperWorker, SALARY.usEmployerUnemploymentBase) * SALARY.usEmployerUnemploymentRate + SALARY.usFutaPerWorker)
  const employerMatch = emp.has401kMatch ? salary.brutUS * emp.match401kRate : 0
  const coutEmployeurUS = salary.brutUS + salary.equityUS + employerFica + employerHealth + employerUnemployment + employerMatch

  // -- Part SALARIÉ retirée pour atteindre le net avant IR (miroir des cotis FR) --
  const employeeFica = salary.fica
  const employeeHealthPremium = HEALTH.US.plans[planKey].employeePremiumAnnual[profileKey]
  const employee401k = computeRetirementUS({ brutUS: salary.brutUS, employerKey: inputs.employerKey, voluntarySavings: inputs.voluntarySavings }).total
  const netAvantIRus = salary.brutUS + salary.equityUS - employeeFica - employeeHealthPremium - employee401k

  const taxUS = computeTaxUS({ brutUS: salary.brutUS, equityUS: salary.equityUS, profileKey, stateKey })
  const netApresIRus = netAvantIRus - taxUS.total

  // -- Lecture « à coût employeur égal » : net en poche pour 100 d'enveloppe --
  const frEfficiency = coutEmployeurFR > 0 ? netApresIRfr / coutEmployeurFR : 0
  const usEfficiency = coutEmployeurUS > 0 ? netApresIRus / coutEmployeurUS : 0

  return {
    profileKey, stateKey, adults, netAvantIRperAdult,
    efficiency: { fr: frEfficiency, us: usEfficiency },
    fr: {
      coutEmployeur: coutEmployeurFR,
      brut: brutFR,
      netAvantIR: householdNetAvantIR,
      ir: irFR,
      netApresIR: netApresIRfr,
      cotisPatronales: coutEmployeurFR - brutFR,
      patronalRate,
      cotisSalariales: brutFR - householdNetAvantIR,
    },
    us: {
      coutEmployeur: coutEmployeurUS,
      brut: salary.brutUS,
      equity: salary.equityUS,
      employerFica, employerHealth, employerUnemployment, employerMatch,
      fica: employeeFica,
      employeeHealthPremium, employee401k,
      netAvantIR: netAvantIRus,
      ir: taxUS.total,
      netApresIR: netApresIRus,
    },
  }
}

// ===========================================================================
//  AGRÉGATION — computeAll
// ===========================================================================

/**
 * Calcule tout pour la France et pour un État US donné.
 * inputs = {
 *   netAvantImpotFR, profileKey, employerKey, stateKey,
 *   ratio, locked, forcedUsGross,
 *   creditScore, healthScenario, medicalBankruptcy,
 *   useTransit, climateRisk, housingMode, voluntarySavings,
 *   valueSocialBenefits  (bool : déduire la valeur des avantages sociaux FR du coût FR)
 * }
 */
export function computeSide(inputs, stateKey) {
  const { netAvantImpotFR, profileKey, employerKey } = inputs

  // Mode de saisie : on résout d'abord le net AVANT IR par adulte (la saisie
  // peut être en net après IR → on remonte via le barème au quotient familial).
  const netAvantIRperAdult = resolveNetAvantIRperAdult({ ...inputs, profileKey })

  // Hypothèse foyer : chaque adulte actif perçoit le salaire de référence
  // (foyer bi-actif pour un couple). Le revenu du FOYER = référence × nb adultes.
  // C'est l'hypothèse la plus réaliste et la plus neutre ; pour un foyer mono-actif,
  // diviser le salaire de référence saisi par deux.
  const adults = PROFILES[profileKey].adults
  const householdNet = netAvantIRperAdult * adults

  // Le brut/miroir US est calculé au niveau du FOYER. En mode déverrouillé, le
  // brut US forcé est aussi un brut de foyer (× adultes appliqué au forçage).
  const salary = computeSalary({
    netAvantImpotFR: householdNet,
    employerKey,
    ratio: inputs.ratio,
    locked: inputs.locked,
    forcedUsGross: inputs.forcedUsGross * adults,
  })

  // ----- FRANCE -----
  const taxFR = computeTaxFR({ netAvantImpotFR: householdNet, profileKey })
  const healthFR = computeHealthFR({ profileKey, healthScenario: inputs.healthScenario })
  const carFR = computeCarFR({ profileKey, useTransit: inputs.useTransit })
  const telecomFR = computeTelecomFR({ profileKey })
  const energyFR = computeEnergyFR({ profileKey })
  const housingFR = computeHousingFR({ profileKey, housingMode: inputs.housingMode })
  const foodFR = computeFoodFR({ profileKey })
  const eduFR = computeEducationFR({
    profileKey,
    schoolChoice: inputs.schoolChoice,
    extracurricularLevel: inputs.extracurricularLevel,
    educationLevel: inputs.educationLevel,
  })
  const socialBenefitsFR = computeSocialBenefitsValueFR({ brutFR: salary.brutFR, profileKey })

  // Revenu disponible FR = net avant impôt (foyer) − IR + transferts.
  const dispoFR = householdNet - taxFR.ir + taxFR.transfers.total

  const postesFR = {
    impots: taxFR.ir, // l'IR seul (les cotisations sont déjà hors net avant impôt)
    sante: healthFR.total,
    retraite: 0, // pré-financée par cotisations → non recomptée
    voiture: carFR.total,
    telecom: telecomFR.total,
    energie: energyFR.total,
    logement: housingFR.total,
    alimentation: foodFR.total,
    education: eduFR.total,
  }
  // Note : l'IR est déjà retiré du dispo ; pour la lecture « dépenses contraintes »
  // on l'inclut comme poste mais on ne le redéduit pas du dispo (voir resteAVivre).
  const depensesContraintesFR =
    postesFR.sante + postesFR.voiture + postesFR.telecom + postesFR.energie +
    postesFR.logement + postesFR.alimentation + postesFR.education

  let resteAVivreFR = dispoFR - depensesContraintesFR
  // Option : valoriser les avantages sociaux FR (rémunération invisible).
  if (inputs.valueSocialBenefits) resteAVivreFR += socialBenefitsFR.value

  // ----- US (devise USD) -----
  const taxUS = computeTaxUS({ brutUS: salary.brutUS, equityUS: salary.equityUS, profileKey, stateKey })
  const healthUS = computeHealthUS({ profileKey, employerKey, healthScenario: inputs.healthScenario, medicalBankruptcy: inputs.medicalBankruptcy })
  const retirementUS = computeRetirementUS({ brutUS: salary.brutUS, employerKey, voluntarySavings: inputs.voluntarySavings })
  // Dette étudiante de l'actif (AXE 1) → calculée AVANT voiture/logement car
  // elle dégrade le DTI et renchérit ces crédits (effet système).
  const studentDebtUS = computeStudentDebtUS({
    educationLevel: inputs.educationLevel, profileKey,
    debtMode: inputs.debtMode, manualDebtBalance: inputs.manualDebtBalance,
    institutionType: inputs.institutionType, ugYears: inputs.ugYears,
    loanType: inputs.loanType, borrowedShareOfNet: inputs.borrowedShareOfNet,
    payInterestDuringStudies: inputs.payInterestDuringStudies,
  })
  const dtiRatePenalty = computeStudentDtiPenalty({ studentMonthly: studentDebtUS.monthly, brutUS: salary.brutUS })
  const carUS = computeCarUS({ profileKey, stateKey, creditScore: inputs.creditScore, dtiRatePenalty })
  const telecomUS = computeTelecomUS({ profileKey })
  const energyUS = computeEnergyUS({ profileKey, stateKey })
  const housingUS = computeHousingUS({ profileKey, stateKey, creditScore: inputs.creditScore, climateRisk: inputs.climateRisk, housingMode: inputs.housingMode, dtiRatePenalty })
  const foodUS = computeFoodUS({ profileKey })
  const eduUS = computeEducationUS({
    profileKey, stateKey,
    schoolChoice: inputs.schoolChoice,
    extracurricularLevel: inputs.extracurricularLevel,
    studentDebtAnnual: studentDebtUS.annual,
  })

  // Revenu disponible US = brut + equity − FICA − IR(féd+État).
  const dispoUS = salary.brutUS + salary.equityUS - salary.fica - taxUS.total

  const postesUS_usd = {
    impots: taxUS.total + salary.fica, // IR + FICA (prélèvements totaux US hors dépenses)
    sante: healthUS.total,
    retraite: retirementUS.total,
    voiture: carUS.total,
    telecom: telecomUS.total,
    energie: energyUS.total,
    logement: housingUS.total,
    alimentation: foodUS.total,
    education: eduUS.total,
  }
  const depensesContraintesUS =
    healthUS.total + retirementUS.total + carUS.total + telecomUS.total +
    energyUS.total + housingUS.total + foodUS.total + eduUS.total

  const resteAVivreUS_usd = dispoUS - depensesContraintesUS

  // Conversion des postes US en EUR pour comparaison commune.
  const postesUS = Object.fromEntries(
    Object.entries(postesUS_usd).map(([k, v]) => [k, usdToEur(v)])
  )

  return {
    salary,
    fr: {
      dispo: dispoFR,
      postes: postesFR,
      depensesContraintes: depensesContraintesFR,
      resteAVivre: resteAVivreFR,
      details: { taxFR, healthFR, carFR, telecomFR, energyFR, housingFR, foodFR, eduFR, socialBenefitsFR },
    },
    us: {
      stateKey,
      dispo_usd: dispoUS,
      dispo_eur: usdToEur(dispoUS),
      postes: postesUS, // en EUR
      postes_usd: postesUS_usd,
      depensesContraintes_usd: depensesContraintesUS,
      depensesContraintes_eur: usdToEur(depensesContraintesUS),
      resteAVivre_usd: resteAVivreUS_usd,
      resteAVivre_eur: usdToEur(resteAVivreUS_usd),
      details: { taxUS, healthUS, retirementUS, carUS, telecomUS, energyUS, housingUS, foodUS, eduUS, studentDebtUS, dtiRatePenalty },
    },
  }
}

/** Calcule la France une fois + les 3 États US. */
export function computeAll(inputs) {
  const fr = computeSide(inputs, 'TX').fr // la partie FR est indépendante de l'État
  const salary = computeSide(inputs, 'TX').salary
  const states = {}
  for (const stateKey of ['TX', 'NC', 'CA']) {
    states[stateKey] = computeSide(inputs, stateKey).us
  }
  return { fr, salary, states }
}

// ===========================================================================
//  COURBE DE SEUIL DE BASCULE (break-even FR vs US)
// ===========================================================================
/**
 * Balaye le SALAIRE FR de référence sur une plage et recalcule, à chaque point,
 * le reste à vivre FR et US avec EXACTEMENT le même modèle (aucune formule
 * nouvelle). Renvoie les points + le seuil de bascule (croisement des courbes /
 * passage par zéro du différentiel).
 *
 * Cohérence avec le cadenas : on fige le RATIO EFFECTIF observé au point courant
 * (qu'il vienne du ratio verrouillé ou d'une valeur US forcée) et on l'applique
 * proportionnellement sur toute la plage — le salaire US suit donc le salaire FR
 * via ce même ratio à chaque point.
 *
 * @param inputs  l'état global (employeur, credit score, scénario santé, toggles…)
 * @param opts    { profileKey, stateKey, min, max, step }
 */
export function computeBreakEven(inputs, { profileKey, stateKey, min = 20000, max = 120000, step = 2000 }) {
  // Ratio effectif courant = brutUS / (brutFR converti en USD), per-adulte.
  // computeSalary gère déjà locked/unlocked + bonus employeur + equity en amont.
  // On part du net AVANT IR résolu (cohérent quel que soit le mode de saisie).
  const baseNetAvantIR = resolveNetAvantIRperAdult({ ...inputs, profileKey })
  const baseSalary = computeSalary({
    netAvantImpotFR: baseNetAvantIR,
    employerKey: inputs.employerKey,
    ratio: inputs.ratio,
    locked: inputs.locked,
    forcedUsGross: inputs.forcedUsGross,
  })
  const effectiveRatio = baseSalary.impliedRatio // brutUS / eurToUsd(brutFR)

  const points = []
  for (let x = min; x <= max + 1; x += step) {
    // x est exprimé dans le MODE de saisie courant (avant ou après IR). On le
    // résout en net avant IR par adulte pour dériver le brut FR, puis le brut US.
    const pointNetAvantIR = resolveNetAvantIRperAdult({ ...inputs, profileKey, netAvantImpotFR: x })
    const brutFRperAdult = pointNetAvantIR / (1 - SALARY.cotisSalarialesRate)
    const forcedUsGrossPerAdult = eurToUsd(brutFRperAdult) * effectiveRatio
    const pointInputs = {
      ...inputs,
      profileKey,
      netAvantImpotFR: x,
      locked: false,
      forcedUsGross: forcedUsGrossPerAdult,
    }
    const res = computeSide(pointInputs, stateKey)
    const frRav = res.fr.resteAVivre
    const usRav = res.us.resteAVivre_eur
    points.push({
      frNet: x,
      usGross: res.salary.brutUS,                 // brut US foyer (USD)
      usGrossPerAdult: forcedUsGrossPerAdult,      // brut US par adulte (USD)
      frRav,
      usRav,
      diff: usRav - frRav,                          // >0 ⇒ avantage US
    })
  }

  // Détection du seuil : premier changement de signe du différentiel.
  let breakEven = null
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if ((a.diff <= 0 && b.diff > 0) || (a.diff >= 0 && b.diff < 0)) {
      // Interpolation linéaire du point de passage par zéro.
      const t = Math.abs(a.diff) / (Math.abs(a.diff) + Math.abs(b.diff))
      const frSalary = a.frNet + t * (b.frNet - a.frNet)
      const usGross = a.usGross + t * (b.usGross - a.usGross)
      const usGrossPerAdult = a.usGrossPerAdult + t * (b.usGrossPerAdult - a.usGrossPerAdult)
      const rising = b.diff > a.diff // true ⇒ on passe d'avantage FR à avantage US
      breakEven = { frSalary, usGross, usGrossPerAdult, rising }
      break
    }
  }

  // Cas sans croisement : qui gagne sur toute la plage ?
  let verdict = null
  if (!breakEven) {
    verdict = points[0].diff < 0 ? 'fr_always' : 'us_always'
  }

  return { points, breakEven, verdict, effectiveRatio, range: { min, max, step } }
}

// ===========================================================================
//  REPRÉSENTATIVITÉ — fréquences marginales + verdict global qualitatif
// ===========================================================================
/**
 * Annote la config courante : pour chaque filtre, la part de population
 * concernée par l'option choisie (fréquence MARGINALE, prise isolément), plus
 * un verdict global qualitatif basé sur le NOMBRE de filtres positionnés sur une
 * valeur minoritaire — JAMAIS sur un produit de pourcentages (variables
 * corrélées → produit statistiquement faux).
 */
export function computeRepresentativity(inputs) {
  const R = REPRESENTATIVITY
  const emp = EMPLOYER[inputs.employerKey]
  const planKey = emp.healthPlanQuality

  const employer = { ...R.employer[inputs.employerKey], key: inputs.employerKey }
  const creditScore = { ...R.creditScore[inputs.creditScore], key: inputs.creditScore }
  const healthPlan = { ...R.healthPlan[planKey], key: planKey, drivenBy: inputs.employerKey }
  const transit = { ...R.transitFR, active: !!inputs.useTransit }
  const retirement401k = { ...R.retirement401k }
  const healthScenario = {
    ...R.healthScenario,
    scenario: inputs.healthScenario,
    isPepin: inputs.healthScenario === 'pepin',
  }
  const housing = { ...R.housingOwnership }
  const hasKids = PROFILES[inputs.profileKey].kids > 0
  const educationLevel = { ...R.educationLevel[inputs.educationLevel], key: inputs.educationLevel }
  const institution = { ...R.institution[inputs.institutionType || 'publicInState'], key: inputs.institutionType || 'publicInState' }
  const school = { ...R.school[inputs.schoolChoice], key: inputs.schoolChoice }
  const extracurricular = { ...R.extracurricular[inputs.extracurricularLevel], key: inputs.extracurricularLevel }
  // L'établissement ne compte dans le tally que si l'actif a fait des études
  // (educationLevel ≠ none) et n'est pas en mode « solde saisi ».
  const hasDegree = inputs.educationLevel && inputs.educationLevel !== 'none'
  const detailedDebt = inputs.debtMode !== 'simple'

  // Tally global = hypothèses FAVORABLES & RARES empilées (cherry-picking),
  // dans les DEUX sens. On ne compte QUE les choix avantageux minoritaires :
  //  - un score « fair/poor » est minoritaire mais DÉSAVANTAGE les US → pas un
  //    cherry-pick (sa fréquence marginale reste affichée sur le contrôle) ;
  //  - l'assurance PPO est PILOTÉE par « grand groupe » → on ne la recompte pas
  //    séparément pour éviter de compter deux fois le même choix ;
  //  - les choix éducation qui CHARGENT le côté US (diplôme avancé, privé, gros
  //    périscolaire) sont des minorités aisées qui favorisent la thèse FR.
  const minorityItems = []
  if (employer.key === 'big') minorityItems.push({ label: 'Grand groupe', favors: 'US' })
  if (inputs.creditScore === 'excellent') minorityItems.push({ label: 'Credit score excellent', favors: 'US' })
  if (transit.active) minorityItems.push({ label: '100 % transport en commun (FR)', favors: 'FR' })
  if (educationLevel.minority) minorityItems.push({ label: `Diplôme ${inputs.educationLevel}`, favors: 'FR' })
  if (hasDegree && detailedDebt && institution.minority) minorityItems.push({ label: 'Établissement cher', favors: 'FR' })
  if (hasKids && school.minority) minorityItems.push({ label: 'École privée', favors: 'FR' })
  if (hasKids && extracurricular.minority) minorityItems.push({ label: 'Gros périscolaire', favors: 'FR' })

  const n = minorityItems.length
  let level, label
  if (n === 0) { level = 'representative'; label = 'Configuration représentative de la majorité' }
  else if (n === 1) { level = 'mostly'; label = 'Configuration globalement représentative — 1 hypothèse minoritaire' }
  else if (n === 2) { level = 'mixed'; label = 'Configuration mixte — 2 hypothèses minoritaires' }
  else { level = 'minority'; label = 'Cas minoritaire — peu représentatif de la population' }

  return {
    employer, creditScore, healthPlan, transit, retirement401k, healthScenario, housing,
    educationLevel, institution, school, extracurricular, hasKids,
    vehicles: R.vehicles,
    global: {
      minorityCount: n,
      level,
      label,
      items: minorityItems,
      caveat: 'Fréquences marginales (chaque filtre isolé). Elles ne se multiplient pas : ces variables sont corrélées (grand groupe ⇒ plus souvent bon score, bon plan, 401(k)). Cumuler grand groupe + excellent score + bonne assurance décrit « une minorité dans la minorité », sans chiffre produit.',
    },
  }
}
