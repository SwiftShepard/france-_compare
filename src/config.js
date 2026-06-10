/**
 * =============================================================================
 *  CONFIG — SOURCE DE VÉRITÉ UNIQUE DES HYPOTHÈSES
 * =============================================================================
 *
 *  Toutes les hypothèses de prix, taux, barèmes et volumes sont centralisées
 *  ici. La logique de calcul (model.js) ne contient AUCUN nombre « magique » :
 *  elle lit tout depuis cet objet. Pour mettre à jour le simulateur avec des
 *  chiffres plus récents, il suffit d'éditer ce fichier.
 *
 *  Année de référence des chiffres : 2024 (barèmes fiscaux 2024 sur revenus,
 *  prix observés 2023-2024). Les montants sont volontairement des ORDRES DE
 *  GRANDEUR DÉFENDABLES, pas des valeurs au centime. Chaque hypothèse
 *  favorable à la thèse du projet est ajustable en direct dans l'interface.
 *
 *  Unités : tout est annuel et dans la devise locale (EUR côté FR, USD côté US)
 *  sauf mention explicite. La conversion se fait dans model.js.
 *
 *  SOURCES (ordre de grandeur) :
 *   - Fiscalité FR : barème IR 2024 (impots.gouv.fr), cotisations salariales ~22 %.
 *   - Fiscalité US fédérale : brackets 2024 (IRS), standard deduction 2024.
 *   - State tax : TX 0 % ; NC 4,5 % flat (2024) ; CA barème 1 %–12,3 %.
 *   - Santé US : KFF Employer Health Benefits Survey 2023 (primes, deductibles).
 *   - Santé FR : Sécu + mutuelle, 100 % Santé dentaire/optique (Ameli).
 *   - Auto : AAA "Your Driving Costs" 2023 ; taux crédit auto par credit score
 *     (Experian State of the Automotive Finance Market 2023).
 *   - Logement : Freddie Mac (taux fixe US 30 ans ~7 %), médianes Zillow par État ;
 *     FR taux fixe ~3,5-4 % (Banque de France 2024).
 *   - Télécoms : forfaits opérateurs FR (~20 €/4 lignes) vs US (Verizon/AT&T).
 *   - Énergie : EIA (prix kWh par État) ; CRE / tarif réglementé FR.
 *   - Garde/éducation : daycare US (Child Care Aware), crèche FR (CAF/CMG).
 *
 *  ⚠️ Ce sont des hypothèses discutables : c'est exactement pourquoi elles sont
 *  toutes exposées et modifiables. La robustesse de la thèse se teste en jouant
 *  avec ces curseurs, pas en figeant un cadrage.
 * =============================================================================
 */

// ---------------------------------------------------------------------------
//  CONVERSION MONÉTAIRE — triple lecture
// ---------------------------------------------------------------------------
export const CONVERSION = {
  // 1) Taux de change brut (marché). 1 EUR = X USD.
  exchangeRate: 1.08,
  // 2) Parité de pouvoir d'achat (PPA) — OCDE 2023 : ~1 EUR ≈ 0,73 USD de
  //    pouvoir d'achat (l'euro « achète » moins de USD nominaux qu'au change
  //    parce que le niveau général des prix US est plus élevé). On stocke le
  //    facteur PPA pour la lecture « pouvoir d'achat ».
  pppFactorEURtoUSD: 0.73,
}

// ---------------------------------------------------------------------------
//  ARCHÉTYPES D'ÉTATS US
// ---------------------------------------------------------------------------
export const STATES = {
  TX: { key: 'TX', label: 'Texas', tagline: 'low-cost, 0 % income tax État' },
  NC: { key: 'NC', label: 'Caroline du Nord', tagline: 'profil médian' },
  CA: { key: 'CA', label: 'Californie', tagline: 'high-cost, fiscalité élevée' },
}

// ---------------------------------------------------------------------------
//  PROFILS DE FOYER
// ---------------------------------------------------------------------------
export const PROFILES = {
  single: { key: 'single', label: 'Célibataire', adults: 1, kids: 0 },
  couple: { key: 'couple', label: 'Couple marié, sans enfant', adults: 2, kids: 0 },
  family: { key: 'family', label: 'Couple marié + 2 enfants', adults: 2, kids: 2 },
}

// ---------------------------------------------------------------------------
//  SALAIRE & MIROIR US — la mécanique centrale
// ---------------------------------------------------------------------------
export const SALARY = {
  // Saisie utilisateur : salaire de RÉFÉRENCE France, exprimé en
  // « net avant impôt » ANNUEL (€). C'est le net qui apparaît en bas de fiche
  // de paie française : APRÈS cotisations sociales (santé, retraite, chômage),
  // AVANT impôt sur le revenu.
  defaultNetAvantImpotFR: 30000,

  // Pour reconstruire le brut FR à partir du net avant impôt : on « remet » les
  // cotisations salariales. Cotisations salariales ≈ 22 % du brut.
  //   brut = netAvantImpot / (1 - cotisSalarialesRate)
  cotisSalarialesRate: 0.22,

  // ⚠️ PIÈGE CRITIQUE corrigé ici : le net avant impôt FR inclut déjà le
  // pré-financement de la santé et de la retraite (via cotisations). Le net US
  // « naturel » n'a subi que la FICA (7,65 %) et ne couvre NI santé NI retraite.
  // On ne pose donc JAMAIS les deux nets comme équivalents : on part du brut
  // équivalent, on retire la FICA, et santé/retraite deviennent des postes de
  // dépense séparés côté US (voir HEALTH, RETIREMENT).
  ficaRate: 0.0765, // Social Security 6,2 % + Medicare 1,45 % (part salarié)

  // Ratio « à poste équivalent » : différentiel de rémunération brute observé
  // pour un MÊME métier entre US et FR. 1,30 = le poste paie 30 % de plus en
  // brut aux US (avant de retraiter tout ce que l'Américain auto-finance).
  // Ajustable ; verrouillé par défaut (cadenas).
  posteEquivalentRatio: 1.30,

  // Le ratio « poste équivalent » dépend aussi du type d'employeur (un grand
  // groupe paie davantage et ajoute de l'equity — voir EMPLOYER).

  // Cotisations PATRONALES FR (part employeur), pour la cascade « coût employeur
  // → brut ». PAS un taux plat : forte dégressivité via les allègements généraux
  // (réduction « Fillon ») près du SMIC, dégressifs jusqu'à 1,6 SMIC.
  //   - plein taux ~42 % au-delà de 1,6 SMIC ;
  //   - au niveau du SMIC, l'allègement ramène l'effectif à ~10 %.
  cotisPatronalesMax: 0.42,        // plein taux (haut salaire)
  cotisPatronalesReductionMax: 0.32, // allègement max au niveau du SMIC
  smicAnnualBrut: 21621,           // SMIC brut annuel ~2025 (1 801,80 €/mois ×12)
  cotisPatronalesSeuilHautSmic: 1.6, // au-delà : plus d'allègement, plein taux

  // Part EMPLOYEUR chômage US (FUTA + SUTA), pour le coût employeur total US.
  // Faible, sur une base de salaire basse (≠ FICA). FUTA 0,6 % sur 7 000 $ ;
  // SUTA variable ~2,7 % sur une base ~10 000-15 000 $ → quelques centaines $.
  usEmployerUnemploymentRate: 0.027, // SUTA moyen
  usEmployerUnemploymentBase: 12000, // base imposable moyenne (par travailleur)
  usFutaPerWorker: 42,               // 0,6 % × 7 000 $
}

// ---------------------------------------------------------------------------
//  TYPE D'EMPLOYEUR — pilote plusieurs variables US d'un coup
// ---------------------------------------------------------------------------
export const EMPLOYER = {
  lambda: {
    key: 'lambda',
    label: 'PME / poste lambda',
    has401kMatch: false,        // pas (ou très peu) de match employeur
    match401kRate: 0,           // % du salaire matché
    healthPlanQuality: 'hdhp',  // plan médiocre haute franchise (voir HEALTH)
    equityShareOfPay: 0,        // pas d'equity
    ratioBonus: 0,              // pas de bonus sur le ratio poste-équivalent
  },
  big: {
    key: 'big',
    label: 'Grand groupe',
    has401kMatch: true,
    match401kRate: 0.04,        // match classique 4 % du salaire
    healthPlanQuality: 'ppo',   // meilleur plan (PPO), reste à charge plus bas
    equityShareOfPay: 0.10,     // ~10 % de la rému en equity/vesting (miroir des
                                // bonus d'un grand groupe FR type Dassault)
    ratioBonus: 0.10,           // +10 % sur le ratio poste-équivalent
  },
}

// ---------------------------------------------------------------------------
//  IMPÔT SUR LE REVENU — FRANCE (barème 2024, revenus 2023/2024)
// ---------------------------------------------------------------------------
export const TAX_FR = {
  // Abattement forfaitaire 10 % pour frais professionnels (approximation du
  // revenu net imposable à partir du net avant impôt).
  abattement: 0.10,
  // Barème progressif par PART (quotient familial).
  brackets: [
    { upTo: 11294, rate: 0.0 },
    { upTo: 28797, rate: 0.11 },
    { upTo: 82341, rate: 0.30 },
    { upTo: 177106, rate: 0.41 },
    { upTo: Infinity, rate: 0.45 },
  ],
  // Quotient familial : nombre de parts.
  //   1 adulte = 1 part ; couple = 2 parts ; chaque enfant = 0,5 part
  //   (le 3e enfant = 1 part, hors périmètre ici).
  partsPerAdult: 1,
  partsPerKid: 0.5,
  // Plafonnement de l'avantage du quotient familial : ~1 759 €/demi-part (2024).
  // Modélisé de façon simplifiée (le gain par demi-part enfant est plafonné).
  plafondDemiPart: 1759,
}

// ---------------------------------------------------------------------------
//  IMPÔT SUR LE REVENU — ÉTATS-UNIS (fédéral 2024)
// ---------------------------------------------------------------------------
export const TAX_US_FEDERAL = {
  standardDeduction: { single: 14600, couple: 29200, family: 29200 },
  // Brackets fédéraux 2024 (single et MFJ). On applique les barèmes MFJ aux
  // profils couple/family.
  brackets: {
    single: [
      { upTo: 11600, rate: 0.10 },
      { upTo: 47150, rate: 0.12 },
      { upTo: 100525, rate: 0.22 },
      { upTo: 191950, rate: 0.24 },
      { upTo: 243725, rate: 0.32 },
      { upTo: 609350, rate: 0.35 },
      { upTo: Infinity, rate: 0.37 },
    ],
    couple: [
      { upTo: 23200, rate: 0.10 },
      { upTo: 94300, rate: 0.12 },
      { upTo: 201050, rate: 0.22 },
      { upTo: 383900, rate: 0.24 },
      { upTo: 487450, rate: 0.32 },
      { upTo: 731200, rate: 0.35 },
      { upTo: Infinity, rate: 0.37 },
    ],
  },
  // Child Tax Credit : 2 000 $/enfant (réduit l'impôt fédéral, profil famille).
  childTaxCredit: 2000,
}

// State income tax par archétype.
export const TAX_US_STATE = {
  TX: { type: 'none' },
  NC: { type: 'flat', rate: 0.045 }, // 4,5 % flat (2024)
  CA: {
    type: 'progressive',
    // Barème CA simplifié (single ; doublé en seuils pour MFJ via factor).
    brackets: [
      { upTo: 10412, rate: 0.01 },
      { upTo: 24684, rate: 0.02 },
      { upTo: 38959, rate: 0.04 },
      { upTo: 54081, rate: 0.06 },
      { upTo: 68350, rate: 0.08 },
      { upTo: 349137, rate: 0.093 },
      { upTo: 418961, rate: 0.103 },
      { upTo: 698271, rate: 0.113 },
      { upTo: Infinity, rate: 0.123 },
    ],
    coupleSeuilFactor: 2, // seuils ~doublés pour MFJ
  },
}

// ---------------------------------------------------------------------------
//  TRANSFERTS SOCIAUX REÇUS — FRANCE (sous conditions de ressources)
// ---------------------------------------------------------------------------
export const TRANSFERS_FR = {
  // Allocations familiales : versées à partir de 2 enfants. Montant de base
  // ~140 €/mois pour 2 enfants, dégressif au-dessus de plafonds de revenus.
  allocFamiliales: {
    monthlyBase2Kids: 140,
    // Plafonds annuels (foyer) au-delà desquels le montant est réduit (modélisé
    // en 2 paliers simplifiés).
    plafond1: 70000, // au-delà : montant divisé par 2
    plafond2: 95000, // au-delà : montant divisé par 4
  },
  // APL (aide au logement) : surtout bas revenus / locataires. En mode
  // propriétaire (défaut) l'APL accession est quasi éteinte → modélisée nulle
  // par défaut mais le poste existe.
  apl: { enabled: false, monthlyMax: 0 },
  // Prime d'activité : complément de revenu pour revenus modestes. Se déclenche
  // surtout pour bas salaires / famille. Modélisée par un seuil d'extinction.
  primeActivite: {
    // Au-dessus de ce net mensuel par UC, prime ≈ 0.
    extinctionNetMensuelParPersonne: 1700,
    monthlyMaxSingle: 180,
    monthlyMaxFamily: 320,
  },
}

// ---------------------------------------------------------------------------
//  AVANTAGES SOCIAUX FR VALORISÉS EN ÉQUIVALENT MONÉTAIRE
//  (rémunération « invisible » : jours payés que l'Américain lambda n'a pas)
// ---------------------------------------------------------------------------
export const SOCIAL_BENEFITS_FR = {
  // 5 semaines de congés payés = 25 jours ouvrés garantis par la loi
  // (vs 0 jour garanti par la loi fédérale US).
  congesPayesJours: 25,
  // Jours de congé maladie indemnisés / an (ordre de grandeur d'usage courant).
  congeMaladieJours: 8,
  // Congé maternité/paternité payé, amorti par an (ordre de grandeur,
  // surtout pertinent pour le profil famille).
  congeParentaliteJoursAmortiSingle: 0,
  congeParentaliteJoursAmortiFamily: 6,
  // Le taux journalier est dérivé du salaire (voir model.js).
}

// ---------------------------------------------------------------------------
//  SANTÉ
// ---------------------------------------------------------------------------
export const HEALTH = {
  US: {
    // Primes ANNUELLES part salarié (employeur paie le reste). KFF 2023.
    // Variable selon qualité de plan (pilotée par EMPLOYER).
    plans: {
      hdhp: { // plan médiocre haute franchise (défaut lambda)
        employeePremiumAnnual: { single: 1700, couple: 4500, family: 7000 },
        // Part PATRONALE de la prime (pour la cascade « coût employeur »). KFF 2023 :
        // l'employeur paie la majeure partie de la prime totale.
        employerPremiumAnnual: { single: 5500, couple: 10000, family: 13000 },
        deductible: { single: 2500, couple: 4500, family: 5000 },
        coinsurance: 0.20,            // 20 % à charge après franchise
        outOfPocketMax: { single: 6000, couple: 11000, family: 13000 },
      },
      ppo: { // meilleur plan (grand groupe)
        employeePremiumAnnual: { single: 1400, couple: 3600, family: 5800 },
        employerPremiumAnnual: { single: 6500, couple: 12000, family: 16000 },
        deductible: { single: 800, couple: 1600, family: 1800 },
        coinsurance: 0.15,
        outOfPocketMax: { single: 4000, couple: 8000, family: 9000 },
      },
    },
    // Dépenses de soins « facturées » (avant prise en charge) selon scénario.
    // C'est le coût brut des soins sur lequel s'appliquent franchise/coinsurance.
    careSpend: {
      normal: { single: 1500, couple: 3000, family: 5000 },   // année courante
      pepin: { single: 18000, couple: 22000, family: 28000 }, // accident/opé/grossesse
    },
    // Dentaire + optique : assurances séparées, mal couvertes. Reste à charge
    // annuel typique (part non remboursée).
    dentalVisionOOP: { single: 700, couple: 1300, family: 2200 },
  },
  FR: {
    // La santé est déjà pré-financée par les cotisations (côté salaire). Ici on
    // ne compte QUE le reste à charge réel + la mutuelle (part salarié, ≥50 %
    // payée par l'employeur).
    mutuelleAnnualEmployeeShare: { single: 240, couple: 480, family: 600 },
    // Reste à charge réel (faible) selon scénario.
    resteAChargeAnnual: {
      normal: { single: 150, couple: 300, family: 500 },
      pepin: { single: 600, couple: 800, family: 1200 }, // plafonné par la Sécu + mutuelle
    },
    // Dentaire + optique : 100 % Santé → reste à charge très faible.
    dentalVisionOOP: { single: 60, couple: 120, family: 220 },
  },
  // Toggle faillite médicale (dette médicale US). OFF par défaut.
  // Surcoût annualisé d'une dette médicale (intérêts + remboursement) en cas
  // de pépin non couvert. Volontairement modéré pour ne pas dramatiser.
  medicalBankruptcyAnnualUS: { single: 2500, couple: 3500, family: 5000 },
}

// ---------------------------------------------------------------------------
//  RETRAITE
// ---------------------------------------------------------------------------
export const RETIREMENT = {
  // Côté FR : la retraite est pré-financée par les cotisations (incluse dans le
  // passage net→brut). On ne la recompte donc PAS comme dépense FR.
  //
  // Côté US : pour atteindre une qualité de vie retraite équivalente, l'employé
  // doit épargner volontairement (401k/IRA). Cas dur par défaut = AUCUNE épargne
  // (l'Américain ne met rien de côté → il « gagne » du reste à vivre aujourd'hui
  // mais se prépare une retraite dégradée). Pour une comparaison HONNÊTE on
  // permet de chiffrer l'épargne nécessaire.
  //
  // targetSavingsRateUS : part du brut US qu'il FAUDRAIT épargner pour égaler la
  // couverture retraite FR. Appliqué seulement si l'utilisateur active l'épargne
  // ou si l'employeur propose un match (grand groupe → on suppose qu'on capte
  // au moins le match).
  targetSavingsRateUS: 0.08,
  // Si match employeur présent, l'employé contribue au moins jusqu'au match.
}

// ---------------------------------------------------------------------------
//  VOITURE — coût de possession total annualisé
// ---------------------------------------------------------------------------
export const CAR = {
  // Nb de véhicules. US = 1 par adulte (dépendance auto). FR plus souple.
  vehiclesUS: { single: 1, couple: 2, family: 2 },
  vehiclesFR: { single: 1, couple: 1, family: 2 },

  // Véhicule de référence : compacte/SUV type Civic/RAV4.
  vehiclePriceUS: 32000, // USD, prix d'achat
  vehiclePriceFR: 30000, // EUR, équivalent

  // Crédit auto US piloté par le CREDIT SCORE (n'existe pas en FR).
  loanTermMonthsUS: 72, // durées longues (72-84 mois)
  creditScoreRatesUS: { // TAEG selon score (Experian 2023)
    poor: 0.1380,
    fair: 0.1080,
    good: 0.0750,
    excellent: 0.0520,
  },
  downPaymentRateUS: 0.10, // apport 10 %

  // FR : crédit auto à taux fixe, indépendant de tout score.
  loanTermMonthsFR: 60,
  loanRateFR: 0.045,
  downPaymentRateFR: 0.15,

  // Dépréciation : negative equity à mi-crédit (on doit plus que la valeur).
  // Déficit roulé dans le crédit suivant — effet boule de neige annualisé.
  negativeEquityAnnualUS: 600, // par véhicule, USD

  // Assurance auto annuelle (US structurellement plus chère et obligatoire).
  insuranceAnnualUS: { TX: 1700, NC: 1450, CA: 2200 }, // par véhicule
  insuranceAnnualFR: 650, // par véhicule, EUR

  // Entretien réaliste (fiabilité en baisse : downsizing, courroie immergée…).
  // Pas une voiture mythique increvable.
  maintenanceAnnualUS: 1300, // par véhicule, USD
  maintenanceAnnualFR: 900,  // par véhicule, EUR

  // Carburant annuel (l'arbre qui cache la forêt, mais on le compte).
  fuelAnnualUS: 1600, // par véhicule, USD
  fuelAnnualFR: 1400, // par véhicule, EUR

  // Alternative TRANSPORT EN COMMUN côté FR (levier activable).
  transitFR: {
    // Abonnement annuel après prise en charge employeur 50 %.
    annualSingle: 420,   // célib urbain : bascule possible 100 % transports
    annualCouple: 840,
    annualFamily: 1100,  // usage mixte périurbain
    // Médian transports US (faible offre) — coût annuel si on tente le report.
    annualUS: 1100,
  },
}

// ---------------------------------------------------------------------------
//  TÉLÉCOMS & ABONNEMENTS — prix pour SERVICE ÉQUIVALENT
// ---------------------------------------------------------------------------
export const TELECOM = {
  // Référence de SERVICE = forfait FR (lignes illimitées + fibre). On price le
  // même niveau réel côté US (data, débit, illimité réel, nb de lignes).
  linesPerProfile: { single: 1, couple: 2, family: 4 },

  FR: {
    mobilePerLineMonthly: 12, // forfait illimité ~12 €/ligne
    fiberMonthly: 30,         // box fibre
    streamingMonthly: 25,     // services streaming
  },
  US: {
    mobilePerLineMonthly: 45,    // facturé PAR LIGNE, illimité réel
    internetMonthly: 70,         // équivalent fibre/câble
    streamingMonthly: 35,        // services (souvent plus chers)
    // Frais cachés qui gonflent la facture après prix annoncé :
    hiddenFeesMonthly: 22,       // taxes télécoms + equipment rental + broadcast
  },
}

// ---------------------------------------------------------------------------
//  ÉNERGIE (élec / gaz / eau) — volume différencié × prix par État
// ---------------------------------------------------------------------------
export const ENERGY = {
  // Consommation élec ANNUELLE (kWh) — US supérieure (grande maison, clim Sud,
  // chauffage élec fréquent) vs FR (logements plus petits, meilleure isolation).
  elecKwhUS: { single: 7000, couple: 10000, family: 14000 },
  elecKwhFR: { single: 3000, couple: 4500, family: 6500 },

  // Prix du kWh par État (EIA) — montre que le kWh moins cher est mangé par le
  // volume consommé.
  elecPriceUS: { TX: 0.14, NC: 0.13, CA: 0.30 }, // USD/kWh (CA parmi les + chers)
  elecPriceFR: 0.25, // EUR/kWh (tarif réglementé)

  // Volatilité TX (réseau dérégulé, pics type blackout 2021) : surcoût annuel.
  txVolatilitySurcharge: 250, // USD/an

  // Eau + gaz : bon marché des deux côtés, facturation différente. Forfait
  // annuel simplifié.
  waterGasAnnualUS: { single: 700, couple: 1100, family: 1600 },
  waterGasAnnualFR: { single: 600, couple: 950, family: 1400 },
}

// ---------------------------------------------------------------------------
//  LOGEMENT — plus gros poste. Mode PROPRIÉTAIRE par défaut.
// ---------------------------------------------------------------------------
export const HOUSING = {
  // Surface de référence (m²) à confort égal selon profil.
  surfaceM2: { single: 45, couple: 70, family: 110 },

  // Prix au m² (achat). US converti depuis $/sqft → $/m² (×10,76).
  pricePerM2US: { TX: 1900, NC: 2300, CA: 6500 }, // USD/m²
  pricePerM2FR: 3200, // EUR/m² (ville moyenne type Rennes)

  // Crédit immobilier US : taux fixe 30 ans piloté par CREDIT SCORE (cohérence
  // avec la voiture). Base + prime selon score.
  loanTermYearsUS: 30,
  mortgageBaseRateUS: 0.070, // ~7 % (Freddie Mac 2024) pour bon score
  mortgageScoreSurcharge: { excellent: 0.0, good: 0.003, fair: 0.010, poor: 0.020 },
  downPaymentRateUS: 0.10,

  // FR : crédit à TAUX FIXE indépendant de tout score (spécificité protectrice).
  loanTermYearsFR: 25,
  mortgageRateFR: 0.038, // ~3,8 % (Banque de France 2024)
  downPaymentRateFR: 0.10,

  // Property tax US (annuelle, % de la valeur). TX élevée (compense l'absence
  // d'income tax) — lien avec le poste fiscal.
  propertyTaxRateUS: { TX: 0.018, NC: 0.0090, CA: 0.0075 },
  // Taxe foncière FR (plus douce, % de la valeur, approximation).
  taxeFonciereRateFR: 0.0045,

  // Assurance habitation : US chère + RISQUE CLIMATIQUE ; FR dérisoire.
  homeInsuranceAnnualUS: { TX: 2400, NC: 1700, CA: 1600 }, // base
  // Surcoût risque climatique (toggle) : feu CA, ouragans côtes, jusqu'à
  // l'inassurabilité / assureurs de dernier recours hors de prix.
  climateRiskSurchargeUS: { TX: 1200, NC: 900, CA: 3000 },
  homeInsuranceAnnualFR: 280,

  // HOA fees US (fréquents), annualisés. Pas d'équivalent FR.
  hoaAnnualUS: { TX: 900, NC: 700, CA: 1800 },
}

// ---------------------------------------------------------------------------
//  ALIMENTATION / CONSO COURANTE — à QUALITÉ ÉQUIVALENTE
// ---------------------------------------------------------------------------
export const FOOD = {
  // Panier alimentaire annuel FR de référence (marque lambda → bio Leclerc).
  annualFR: { single: 3600, couple: 6000, family: 9600 },
  // Côté US : double effet cumulé.
  //   1) prix nominal US déjà plus élevé en supermarché classique
  //   2) prime QUALITÉ pour matcher le niveau FR (Whole Foods / organic)
  annualUSbase: { single: 4200, couple: 7200, family: 11400 }, // supermarché classique
  qualityPremiumUS: 1.35, // ×1,35 pour atteindre le niveau organic/Whole Foods
}

// ---------------------------------------------------------------------------
//  ÉDUCATION / FORMATION — poste MAJEUR, 3 axes
//   AXE 1 : dette étudiante de l'ACTIF (tous profils)
//   AXE 2 : scolarité des enfants par étage (profil famille)
//   AXE 3 : périscolaire / activités extrascolaires
//  Aux US : massivement auto-financé. En FR : massivement socialisé.
//  SOURCES (2025-2026) commentées par bloc ; tout est ajustable.
// ---------------------------------------------------------------------------
export const EDUCATION = {

  // ===== AXE 1 — DETTE ÉTUDIANTE DE L'ACTIF =================================
  // Paramètre du PROFIL ACTIF (pas projeté sur les enfants). Appliqué par adulte
  // actif (foyer bi-actif → chaque adulte porte son diplôme/sa dette).
  //
  // ⚠️ 3 grandeurs à NE JAMAIS confondre :
  //   1. CoA (coût d'attendance) = tuition+fees+room&board affiché.
  //   2. Coût NET = CoA − aides/bourses (ce qui reste à financer).
  //   3. Dette empruntée = la PART du net financée par emprunt (le reste : job,
  //      famille, épargne). La dette de sortie d'un bachelor public (~27-30 k$)
  //      est très inférieure au CoA 4 ans (>100 k$). Le modèle part du net ×
  //      part empruntée, PAS du sticker.
  studentDebt: {
    // --- Coûts ANNUELS par type d'établissement (USD, 2025-26) ---
    // CoA = sticker affiché ; net = après aides moyennes.
    coaByInstitution: {
      community: 21320,       // tuition ~4 150
      publicInState: 30990,   // tuition ~11 950 (6 360 FL → 18 000 VT/NH)
      publicOutState: 50000,  // tuition ~31 880
      private: 50920,         // tuition ~45 000
      elite: 87000,           // 77 500–98 300 (tuition 59 000–71 000)
    },
    netByInstitution: {
      community: 13000,
      publicInState: 20800,   // coût net moyen public
      publicOutState: 33000,
      private: 36200,         // coût net moyen privé
      elite: 28000,           // élite TRÈS subventionnée (Stanford net ~37,6 k ;
                              // Harvard ~17,9 k pour bénéficiaires) → net < privé
                              // intermédiaire pour les familles éligibles.
    },
    // Part du coût NET financée par EMPRUNT (reste : job/famille/épargne).
    // Calibrée pour que public in-state 4 ans → ~29 k$ de dette de sortie.
    borrowedShareOfNet: 0.30,

    // --- Durée ---
    ugYearsDefault: 4,  // bachelor nominal ; ajustable 4-6 (~42 % diplôment en 4 ans)
    gradYearsByLevel: { none: 0, bachelor: 0, master: 2, doctorate: 5 }, // empilé sur l'UG
    gradAnnualBorrowed: 13000, // emprunt annuel phase grad (tout non-subventionné)

    // --- Taux fixes fédéraux 2025-26 ---
    rateUndergrad: 0.0639,
    rateGrad: 0.0794,
    ratePlus: 0.0894,
    // Frais d'origination (ajoutés au principal).
    originationSubUnsub: 0.01057,
    originationPlus: 0.04228,

    // --- Type de prêt dominant (UG) → fraction NON-subventionnée qui CAPITALISE
    //     les intérêts pendant les études. Sub = l'État paie les intérêts. ---
    unsubFractionByLoanType: { subsidized: 0.0, mix: 0.7, unsubsidized: 1.0, private: 1.0 },

    // --- Remboursement ---
    repaymentYears: 20,  // durée RÉELLE moyenne (et non 10)
    graceMonths: 6,      // grâce avant 1er paiement (intérêts continuent de courir)

    // FR (miroir HONNÊTE, pas zéro) : public quasi gratuit MAIS vie étudiante +
    // prêts d'écoles privées (commerce/ingé). Pas de capitalisation côté public FR.
    annualFRByLevel: { none: 0, bachelor: 300, master: 1200, doctorate: 600 },

    // Effet SYSTÈME — la mensualité étudiante entre dans le debt-to-income (DTI)
    // US et dégrade la capacité/le taux d'emprunt immo & auto.
    dti: {
      ratePenaltyFactor: 0.06, // pénalité de taux ∝ (mensualité étudiante / revenu)
      ratePenaltyCap: 0.012,   // plafond +1,2 pt de taux
    },
  },

  // ===== AXE 2 — SCOLARITÉ DES ENFANTS (profil famille) =====================
  // Garde petite enfance 0-5 ans (« kindergarten cliff » : coût élevé concentré
  // sur 0-5 ans puis quasi-zéro à l'entrée en école publique).
  daycareUSannualPerKid: 14000,  // USD plein tarif non aidé (10 000-20 000 $)
  daycareFRannualPerKid: 3000,   // EUR reste à charge après CMG CAF + crédit d'impôt
  // Équivalents-enfants en bas âge (snapshot lifecycle d'une famille 2 enfants).
  daycareKidsEquiv: 0.6,

  // K-12 (primaire/middle/high). Choix public/privé en paramètre.
  k12KidsEquiv: 1.4, // équivalents-enfants en âge scolaire K-12
  // US : public quasi gratuit (corrélé à la valeur immo du quartier — bon
  // school district = logement plus cher, lien signalé sans double comptage).
  // Privé paramétrable, USD/an/enfant : religieux ~8 500, moyenne ~15 000,
  // indépendant haut de gamme ~30 000 (jusqu'à 49 000). CA plus cher.
  k12USannualPerKid: { public: 0, privateReligious: 8500, privateAverage: 15000, privateIndependent: 30000 },
  k12StateMultiplierUS: { TX: 0.85, NC: 0.9, CA: 1.2 }, // CA ~18 000 $/an moyenne
  // FR : public gratuit (réel), privé sous contrat très abordable.
  k12FRannualPerKid: { public: 0, privateReligious: 900, privateAverage: 1500, privateIndependent: 2200 },

  // ===== AXE 3 — PÉRISCOLAIRE / EXTRASCOLAIRE (profil famille) ==============
  // Sport compétitif, musique, tutoring, summer camps, « travel teams ».
  // US : très cher, quasi pas subventionné. FR : clubs municipaux,
  // conservatoires, centres de loisirs, aides CAF → coût bien plus faible à
  // activité équivalente (mantra qualité/prix). Par foyer (2 enfants).
  extracurricularUSByLevel: { basic: 1200, invested: 9000 }, // USD/an/foyer
  extracurricularFRByLevel: { basic: 400, invested: 1500 },  // EUR/an/foyer
}

// ---------------------------------------------------------------------------
//  REPRÉSENTATIVITÉ — fréquences marginales par filtre (anti-cherry-picking)
// ---------------------------------------------------------------------------
/**
 * Part de population réellement concernée par CHAQUE option, prise ISOLÉMENT
 * (fréquence marginale). But : empêcher de présenter un cas rare comme la norme,
 * dans les DEUX sens (favorable US comme favorable FR).
 *
 * ⚠️ RÈGLE STATISTIQUE : ne JAMAIS multiplier ces marginales pour estimer la
 * probabilité d'un profil complet — ces variables sont CORRÉLÉES (un salarié de
 * grand groupe a plus souvent bon credit score, bonne assurance, un 401(k)).
 * Le produit serait faux. Le cumul ne s'exprime que qualitativement.
 *
 * SOURCES (ordres de grandeur, à rafraîchir) :
 *  - Emploi par taille d'entreprise : INSEE (FR, catégories GE/ETI/PME/TPE) ;
 *    US Census / BLS (firms 500+). 2022-2023.
 *  - Credit scores : Experian / FICO band distribution 2023.
 *  - 401(k) : BLS National Compensation Survey 2023 (accès / participation) ;
 *    Vanguard "How America Saves" 2023 (match).
 *  - Plans santé : KFF Employer Health Benefits Survey 2023 (part HDHP).
 *  - Aléa santé : CDC/HCUP (taux annuel d'hospitalisation adulte ~8-10 %).
 *  - Taux de propriété : INSEE (FR ~58 %) ; US Census 2023 (national ~66 %, par État).
 *  - Transport en commun : part de la population avec offre suffisante pour se
 *    passer de voiture (forte en métropole, faible en périurbain/rural).
 */
export const REPRESENTATIVITY = {
  // En-dessous de ce seuil, une option est étiquetée « cas minoritaire ».
  minorityThreshold: 0.30,

  employer: {
    // Part des actifs employés par de grands groupes. Majorité en PME/TPE des
    // deux côtés de l'Atlantique. FR : grandes entreprises (INSEE GE) ~25-30 % ;
    // US : firms 500+ ~46 % mais « grand groupe » (très grandes) bien moins.
    lambda: { share: 0.70, minority: false, note: 'PME/TPE et postes lambda : la majorité des actifs (FR comme US).' },
    big: { share: 0.30, minority: true, note: 'Grands groupes ≈ 25-30 % des actifs. Les avantages associés (401(k) avec match, equity, bonne assurance) sont donc l\'exception, pas la règle.' },
  },

  creditScore: {
    // Bandes FICO 2023 regroupées par tier de tarification crédit.
    poor: { share: 0.16, minority: true, note: 'Score faible (<580). Part importante souvent passée sous silence : taux de crédit les plus élevés.' },
    fair: { share: 0.18, minority: true, note: 'Score moyen (580-669). Sous la moyenne, taux pénalisants.' },
    good: { share: 0.45, minority: false, note: 'Score correct (670-799) : le gros de la population.' },
    excellent: { share: 0.21, minority: true, note: 'Super-prime (≈ 800+) : seuls ~21 % obtiennent les MEILLEURS taux auto/immo. Sélectionner « excellent » = cas favorable minoritaire.' },
  },

  // 401(k) : les trois conditions cumulées (accès ET cotisation ET match) font
  // chuter le chiffre. Le défaut « aucune épargne » reflète une réalité majoritaire.
  retirement401k: {
    access: 0.68,        // ont accès à un plan
    participate: 0.51,   // y cotisent réellement
    withMatch: 0.45,     // accès + cotisent + bénéficient d'un match employeur
    note: '≈ 45 % des salariés US cotisent à un 401(k) AVEC match employeur (accès ⩾ cotisation ⩾ match). Le défaut « aucune épargne retraite » reflète donc la majorité.',
  },

  // Niveau de couverture santé : plans à haute franchise (HDHP) fréquents car
  // prime basse ; bonne couverture (PPO bas reste-à-charge) plus rare chez les
  // employeurs lambda.
  healthPlan: {
    hdhp: { share: 0.55, minority: false, note: 'Plans à haute franchise (HDHP) : fréquents car prime faible — l\'ordinaire du poste lambda.' },
    ppo: { share: 0.45, minority: true, note: 'Bonne couverture (PPO, faible reste-à-charge) : cas favorable, plus rare hors grands groupes.' },
  },

  // Aléa santé (pas un cas favorable : un risque). Proba annuelle réaliste de
  // « pépin » (hospitalisation/opération/accident/grossesse).
  healthScenario: {
    pepinAnnualProb: 0.10,        // ~10 %/an
    pepinCumul5y: 1 - Math.pow(0.9, 5), // ≈ 41 % sur 5 ans
    note: 'Un « pépin » (hospitalisation/opération/accident) ≈ 10 %/an, soit ~41 % de risque sur 5 ans. L\'année normale n\'est pas garantie chaque année.',
  },

  // Taux de propriété (mode propriétaire par défaut).
  housingOwnership: {
    FR: 0.58, TX: 0.62, NC: 0.66, CA: 0.55,
    note: 'Taux de propriété : FR ~58 %, TX ~62 %, NC ~66 %, CA ~55 %. Le mode propriétaire concerne la majorité, mais une large minorité est locataire (surtout en CA).',
  },

  // Transport en commun FR : part avec offre suffisante pour se passer de voiture.
  transitFR: {
    share: 0.22, minority: true,
    note: 'Offre suffisante pour se passer de voiture ≈ 1 actif FR sur 5 (forte en métropole, faible en périurbain/rural). La Bretagne hors Rennes est largement dépendante de la voiture.',
  },

  // Nombre de véhicules (non modifiable ici, mais représentativité indicative).
  vehicles: {
    note: 'Hypothèse : 1 véhicule par adulte côté US (dépendance auto quasi généralisée), plus souple côté FR (un couple partage souvent une voiture).',
  },

  // Niveau de diplôme de l'actif (pilote la dette étudiante US).
  // Parts indicatives sur la population active US. Un diplôme avancé = dette
  // plus lourde : choisir master/doctorat décrit une minorité ET charge le
  // côté US (favorable à la thèse FR) → à signaler.
  educationLevel: {
    none: { share: 0.45, minority: false, note: "Sans diplôme du supérieur : ~45 % des actifs US. Pas de dette étudiante (mais salaire généralement plus bas)." },
    bachelor: { share: 0.35, minority: false, note: "Bachelor : la voie diplômante la plus courante. Dette ~30 000 $, ~222 $/mois sur 20 ans." },
    master: { share: 0.15, minority: true, note: "Master : ~15 % des actifs. Dette moyenne ~58 570 $. Charge le côté US (favorable à la thèse FR)." },
    doctorate: { share: 0.05, minority: true, note: "Doctorat / diplôme pro : ~5 % des actifs, dette lourde (62 770–212 430 $). Le haut salaire « tech » arrive AVEC ce passif. Cas minoritaire." },
  },

  // Type d'établissement (UG). Le public in-state est la voie majoritaire et la
  // moins endettante. La « horror story » n'est NI l'élite (sur-subventionnée
  // pour les modestes) NI le public in-state, mais le PRIVÉ NON-ÉLITE et
  // l'OUT-OF-STATE : cher + peu d'aide, sans le prestige qui ouvre les hauts salaires.
  institution: {
    community: { share: 0.10, minority: false, note: "Community college (~21 320 $/an) : option la moins chère, souvent 2 ans puis transfert. Dette faible." },
    publicInState: { share: 0.55, minority: false, note: "Public in-state : voie majoritaire. Net ~20 800 $/an, dette de sortie médiane ~27-30 k$ (≠ le sticker 4 ans >100 k$)." },
    publicOutState: { share: 0.12, minority: true, note: "Public out-of-state : tuition ~3× l'in-state, faible aide. Profil de dette TOXIQUE (cher sans le prestige élite)." },
    private: { share: 0.20, minority: true, note: "Privé non lucratif ~50 920 $/an affiché. Le privé NON-élite intermédiaire = dette lourde, dotation modeste donc peu d'aide." },
    elite: { share: 0.03, minority: true, note: "Élite (~77 500-98 300 $/an affichés) MAIS aide très généreuse (Stanford net ~37,6 k, Harvard ~17,9 k pour bénéficiaires). Le plein tarif n'est payé que par les familles aisées non éligibles." },
  },

  // Choix d'école K-12 (profil famille). La majorité des enfants US sont en
  // public ; le privé (surtout indépendant) est un choix de foyer aisé,
  // minoritaire, qui charge le côté US.
  school: {
    public: { share: 0.90, minority: false, note: "École publique : ~90 % des enfants US (et la quasi-totalité en FR). Gratuit, mais aux US la qualité est corrélée à la valeur immobilière du quartier." },
    privateReligious: { share: 0.07, minority: true, note: "Privé religieux US ~8 500 $/an/enfant. Minoritaire." },
    privateAverage: { share: 0.07, minority: true, note: "Privé US tous types ~15 000 $/an/enfant. Sur 13 ans ≈ 195 000 $/enfant. Choix aisé minoritaire." },
    privateIndependent: { share: 0.02, minority: true, note: "Privé indépendant haut de gamme ~30 000 $/an (jusqu'à 49 000 $), ≈ 640 000 $ sur 13 ans. ~2 % des enfants : minorité dans la minorité." },
  },

  // Intensité du périscolaire (profil famille).
  extracurricular: {
    basic: { share: 0.70, minority: false, note: "Périscolaire de base (club, activité accessible)." },
    invested: { share: 0.20, minority: true, note: "Gros budget périscolaire (sport compétitif, travel teams, tutoring, summer camps) : décrit un foyer aisé, pas la médiane. Aux US ces activités sont quasi non subventionnées." },
  },
}

// ---------------------------------------------------------------------------
//  MÉTA — libellés des postes pour l'affichage
// ---------------------------------------------------------------------------
export const POSTE_LABELS = {
  impots: 'Impôts & prélèvements',
  sante: 'Santé',
  retraite: 'Retraite (épargne nécessaire)',
  voiture: 'Voiture',
  telecom: 'Télécoms & abonnements',
  energie: 'Énergie (élec/gaz/eau)',
  logement: 'Logement',
  alimentation: 'Alimentation / conso',
  education: 'Éducation / garde',
}
