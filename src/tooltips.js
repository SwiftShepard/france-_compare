/**
 * =============================================================================
 *  TOOLTIPS — textes d'infobulles centralisés (clé → contenu)
 * =============================================================================
 *  Tout le texte explicatif déplacé hors de l'affichage permanent vit ici :
 *  définitions de termes techniques, hypothèses de poste, notes méthodo.
 *  (Les indicateurs de représentativité, eux, sont déjà centralisés dans
 *  config.js → REPRESENTATIVITY et passés dynamiquement.)
 *
 *  Modifier un texte = éditer ce fichier, sans toucher au JSX.
 * =============================================================================
 */
export const TOOLTIPS = {
  // --- Salaire & conversion ---
  netAvantIR:
    "Net en bas de fiche de paie FR : APRÈS cotisations sociales (santé, retraite, chômage), AVANT impôt sur le revenu. Ce n'est PAS l'équivalent du net US, qui n'a subi que la FICA.",
  netApresIR:
    "Revenu après impôt sur le revenu. Il dépend du quotient familial : à montant égal, le net avant IR correspondant diffère selon le profil (célibataire / couple / famille).",
  ratioPoste:
    "Différentiel de rémunération brute observé pour un MÊME métier entre US et FR. 1,30× = le poste paie 30 % de plus en brut aux US, avant de retraiter tout ce que l'Américain auto-finance (santé, retraite…).",
  cadenas:
    "Verrouillé : le brut US se déduit du brut FR via le ratio poste-équivalent. Déverrouillé : vous forcez la valeur US à la main (le ratio devient une simple info).",
  miroirUS:
    "« Net avant IR » US = brut − FICA (7,65 %) seulement. Il ne couvre NI la santé NI la retraite : ces postes sont chiffrés séparément. Le poser comme équivalent du net avant IR français surestimerait le pouvoir d'achat US.",

  // --- Fiscalité ---
  fica:
    "FICA : cotisation sociale US prélevée sur le salaire (6,2 % Social Security + 1,45 % Medicare = 7,65 % part salarié). C'est le SEUL prélèvement social automatique côté US — bien moins large que les cotisations françaises.",
  quotientFamilial:
    "Quotient familial : le revenu imposable FR est divisé par un nombre de parts (célibataire 1 ; couple 2 ; +0,5 part par enfant) avant d'appliquer le barème, ce qui abaisse fortement l'impôt des familles. L'avantage par demi-part est plafonné.",
  propertyTax:
    "Property tax : impôt foncier annuel US, en % de la valeur du bien (ici TX ~1,8 %, NC ~0,9 %, CA ~0,75 %). Le Texas la fait élevée pour compenser l'absence d'income tax. Équivalent FR : la taxe foncière, bien plus douce (~0,45 %).",
  salesTaxTVA:
    "Sales tax (US, ajoutée en caisse, ~6-9 % selon l'État) vs TVA (FR, déjà incluse dans le prix affiché, 20 % standard). Les montants indirects se nourrissent automatiquement des dépenses de consommation calculées.",

  // --- Santé ---
  deductible:
    "Deductible (franchise) : montant annuel de soins que l'assuré paie INTÉGRALEMENT avant que l'assurance ne commence à rembourser. Les plans à haute franchise (HDHP) ont une prime basse mais un reste à charge élevé en cas de soins.",
  copay:
    "Copay : somme forfaitaire fixe payée à chaque acte (ex : 30 $ par consultation), indépendante du coût réel.",
  coinsurance:
    "Coinsurance : part en POURCENTAGE des soins restant à charge après la franchise (ex : 20 %), jusqu'à atteindre l'out-of-pocket max.",
  oopMax:
    "Out-of-pocket max : plafond annuel de reste à charge. Au-delà, l'assurance prend 100 %. Il peut atteindre plusieurs milliers de dollars — d'où le risque financier d'une « année avec pépin ».",
  hdhp:
    "HDHP (High-Deductible Health Plan) : plan à haute franchise, prime mensuelle basse mais reste à charge élevé. Fréquent chez les employeurs lambda. Retenu par défaut (cas dur réaliste).",
  ppo:
    "PPO : plan à meilleure couverture (franchise basse, reste à charge réduit), plus cher en prime. Plutôt l'apanage des grands groupes.",
  mutuelle:
    "Mutuelle FR : complémentaire santé co-payée par l'employeur (≥ 50 %). Avec la Sécu et le « 100 % Santé » (dentaire/optique), le reste à charge réel reste faible.",
  santeHonnete:
    "Comparaison honnête = coût santé TOTAL annuel attendu : primes/cotisations + reste à charge sur une année de consommation réaliste. On ne compare pas la seule prime US à la seule cotisation mutuelle FR.",
  congesValorises:
    "Avantage social FR valorisé en € : 5 semaines de congés payés + congés maladie indemnisés + congé maternité/paternité payé (zéro garanti par la loi fédérale US). Rémunération « invisible » = jours payés × taux journalier.",

  // --- Voiture ---
  creditScore:
    "Credit score : note de solvabilité US (≈ 300-850) qui pilote le TAUX de tous les crédits (auto, immo). N'existe pas en France, où le crédit est à taux fixe protégé. Un mauvais score renchérit fortement les mensualités.",
  negativeEquity:
    "Negative equity : à mi-crédit, on doit souvent plus que la valeur de revente du véhicule. Le déficit est roulé dans le crédit suivant — effet boule de neige rarement chiffré.",
  coutPossession:
    "Coût de possession TOTAL annualisé : crédit + assurance + entretien + carburant + dépréciation. Le prix de l'essence seul est l'arbre qui cache la forêt. Hypothèse d'entretien réaliste (fiabilité en baisse), pas une voiture mythique increvable.",

  // --- Télécoms ---
  telecomService:
    "Prix pour SERVICE équivalent : on prend le forfait FR (multi-lignes illimité + fibre) comme référence et on calcule ce qu'il coûte aux US (data, débit, nb de lignes). Le mobile y est facturé PAR LIGNE.",
  fraisCachesTelecom:
    "Frais cachés US : taxes télécoms, location d'équipement (equipment rental), broadcast fees… ils gonflent la facture bien au-delà du prix annoncé.",

  // --- Énergie ---
  energieVolume:
    "Le kWh est moins cher aux US, mais le VOLUME consommé est bien supérieur (grande maison, clim quasi obligatoire au Sud, chauffage électrique). Prix unitaire différencié par État (TX volatil, CA très cher).",

  // --- Logement ---
  hoa:
    "HOA (Homeowners Association) fees : charges de copropriété/lotissement US, fréquentes et parfois lourdes, annualisées ici. Pas d'équivalent direct en France.",
  risqueClimatique:
    "Risque climatique : feux (CA), ouragans (côtes)… les primes d'assurance habitation explosent, jusqu'à l'inassurabilité ou le recours à des assureurs de dernier ressort hors de prix.",
  logementLecture:
    "Double lecture : « à surface égale » compare le coût d'un même confort ; « à budget égal » compare ce qu'on obtient pour la même somme (TX brille en m², CA s'effondre).",
  tauxFixeFR:
    "Spécificité protectrice française : le crédit immobilier est à TAUX FIXE, indépendant de tout score individuel. Aux US, le taux dépend du credit score.",

  // --- Alimentation ---
  qualiteConstante:
    "Comparaison à QUALITÉ CONSTANTE : le panier FR de référence (marque lambda à bio Leclerc) est valorisé côté US au niveau Whole Foods / organic pour matcher la qualité — pas au niveau Walmart générique. Double effet : prix nominal US plus élevé + prime qualité. Choix méthodo assumé, pas biais caché.",

  // --- Éducation ---
  garde:
    "Garde jeune enfant : crèche/assistante maternelle FR fortement subventionnée (CMG CAF + crédit d'impôt) vs daycare US plein tarif non aidé (peut atteindre un quasi-salaire).",
  detteEtudiante:
    "Dette étudiante US : l'université génère un remboursement annualisé qui plombe le budget des jeunes actifs sur des décennies. La fac FR est quasi gratuite (quelques centaines €/an).",

  // --- Conversion / lectures ---
  ppa:
    "PPA (parité de pouvoir d'achat) : convertit non pas au taux de change de marché mais selon ce qu'une somme achète réellement. Le dollar « achète » moins que le change ne le suggère, car le niveau des prix US est plus élevé.",
  resteAVivre:
    "Reste à vivre : revenu disponible APRÈS toutes les dépenses contraintes (impôts, santé, retraite, voiture, logement, télécoms, énergie, alimentation, éducation). La lecture reine : ce qui demeure réellement libre.",
  seuilBascule:
    "Seuil de bascule : niveau de revenu à partir duquel le reste à vivre US dépasse celui de la FR. Obtenu en balayant le salaire et en recalculant le modèle complet à chaque point. Il se déplace avec tous les paramètres.",

  // --- Hypothèse foyer ---
  foyerBiactif:
    "Hypothèse foyer : chaque adulte actif perçoit le salaire de référence (foyer bi-actif pour un couple). Revenu du foyer = référence × nombre d'adultes. Pour un foyer mono-actif, diviser la saisie par deux.",
}

/**
 * Tooltips par POSTE de dépense (hypothèse retenue + ce qui est inclus).
 * Affichés en infobulle à côté du libellé de chaque poste.
 */
export const POSTE_TIPS = {
  impots: "FR : IR progressif au quotient familial (les cotisations sont déjà hors du net avant IR). US : IR fédéral + impôt d'État + FICA. Inclut aussi la fiscalité indirecte (sales tax / TVA, property tax / taxe foncière).",
  sante: "Coût santé TOTAL annuel = primes/cotisations + reste à charge attendu sur l'année (franchise, coinsurance, dentaire/optique). On ne compare pas la seule prime US à la seule mutuelle FR.",
  retraite: "FR : retraite pré-financée par les cotisations (non recomptée). US : épargne volontaire nécessaire pour égaler la couverture FR. Par défaut 0 (cas dur) sauf match employeur ou épargne activée.",
  voiture: "Coût de possession TOTAL annualisé : crédit (taux ∝ credit score), assurance, entretien, carburant, dépréciation/negative equity. US : 1 véhicule par adulte. Option transport en commun côté FR.",
  telecom: "Prix pour SERVICE équivalent au forfait FR (multi-lignes illimité + fibre), mobile facturé par ligne côté US, frais cachés US inclus (taxes, location d'équipement, broadcast fees).",
  energie: "Volume différencié (US supérieur : grande maison, clim, chauffage élec) × prix du kWh par État. Le kWh moins cher est en partie mangé par le volume consommé.",
  logement: "Mode propriétaire. US : crédit (taux ∝ credit score) + property tax + assurance (± risque climatique) + HOA. FR : crédit à taux fixe + taxe foncière douce + assurance dérisoire.",
  alimentation: "Comparaison à QUALITÉ CONSTANTE : panier FR courant valorisé côté US au niveau Whole Foods / organic. Double effet : prix nominal US plus élevé + prime qualité. Choix méthodo assumé.",
  education: "Garde jeune enfant (crèche FR subventionnée vs daycare US plein tarif) + dette étudiante US annualisée (fac FR quasi gratuite).",
}
