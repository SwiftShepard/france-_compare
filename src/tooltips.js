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
    "« Net avant IR » US = brut − FICA (7,65 %) seulement. Le net US « naturel » ne couvre NI la santé NI la retraite : ces postes sont chiffrés séparément. Le poser comme équivalent du net avant IR français surestimerait le pouvoir d'achat US.",
  coutEmployeurTotal:
    "On part du MÊME point haut des deux côtés : le COÛT TOTAL employeur, puis on redescend symétriquement. Côté FR : brut + cotisations patronales (dégressives — fort allègement près du SMIC, ~42 % au-delà de 1,6 SMIC). Côté US : brut + FICA employeur + chômage (FUTA/SUTA) + assurance santé employeur (poste majeur) + éventuel match 401(k). Comparer le super-brut FR à un simple brut US fausserait tout.",
  cascadeNetAvantIR:
    "Pour rendre les deux nets RÉELLEMENT comparables, on retire santé + retraite + chômage des DEUX côtés : en FR via les cotisations salariales ; aux US via FICA + prime santé (part salarié) + cotisation 401(k) salarié. Sans ce recalage symétrique, le « net avant IR » US paraîtrait bien plus élevé qu'il ne l'est en pouvoir d'achat réel.",
  coutEmployeurEgal:
    "Lecture « à coût employeur égal » : pour 100 € que paie l'employeur, combien arrive net en poche de chaque côté ? Le brut US plus élevé n'est pas de l'argent « en plus » : c'est en grande partie le transfert de la charge du patronat vers le salarié. Une large part du coût employeur FR part en cotisations patronales qui PRÉ-FINANCENT ce que l'Américain devra repayer lui-même ensuite (santé, retraite, chômage). À coût employeur égal, l'écart de NET réel est bien plus faible que l'écart de BRUT affiché — le cœur de la thèse.",

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

  // AXE 1 — dette étudiante de l'actif
  educationLevel:
    "Niveau de diplôme de l'actif : il pilote la durée d'études et donc la dette US (remboursée sur ~20 ans). Le poste « tech » à haut salaire arrive typiquement AVEC un diplôme avancé, donc une dette élevée : le salaire attractif vient avec son passif. Appliqué par adulte actif. Miroir FR non nul (vie étudiante, écoles privées).",
  coaNetDebt:
    "3 grandeurs à NE PAS confondre : (1) le COÛT AFFICHÉ (CoA = tuition + fees + logement) ; (2) le COÛT NET après bourses/aides ; (3) la DETTE réellement empruntée (la part du net financée par emprunt — le reste vient du job, de la famille, de l'épargne). La dette de sortie d'un bachelor public (~27-30 k$) est BIEN inférieure au sticker 4 ans (>100 k$).",
  institutionType:
    "Type d'établissement → coût annuel (CoA et net 2025-26) : community ~21 320 $ ; public in-state ~30 990 $ (net ~20 800) ; out-of-state ~50 000 $ ; privé ~50 920 $ ; élite 77 500-98 300 $. L'élite, très subventionnée, peut coûter NET moins cher que le privé intermédiaire pour les familles modestes. La dette la plus toxique : privé non-élite et out-of-state (cher + peu d'aide, sans le prestige qui ouvre les hauts salaires).",
  loanType:
    "Type de prêt dominant → fraction des intérêts qui CAPITALISE pendant les études. Subventionné : l'État paie les intérêts pendant la scolarité (pas de capitalisation). Non-subventionné / PLUS / privé : les intérêts courent dès le décaissement et s'ajoutent au principal à l'entrée en remboursement (intérêt sur intérêt). Défaut « mix » = majoritairement non-subventionné. Taux fixes 2025-26 : undergrad 6,39 %, grad 7,94 %, PLUS 8,94 %.",
  ugYears:
    "Durée RÉELLE des études undergrad : seulement ~42 % diplôment en 4 ans. Chaque année supplémentaire ajoute un emprunt ET prolonge la phase d'accumulation d'intérêts.",
  borrowedShareOfNet:
    "Part du coût NET financée par EMPRUNT (le reste : job étudiant, apport familial, épargne). Tout n'est jamais emprunté : c'est pourquoi la dette de sortie est bien inférieure au coût net total.",
  payInterestDuringStudies:
    "Payer les intérêts pendant les études (même ~25 $/mois) empêche leur capitalisation et réduit fortement le solde final. OFF par défaut car c'est le cas minoritaire — la plupart laissent capitaliser.",
  debtMode:
    "Mode détaillé : la dette se reconstruit depuis le cursus (établissement, durée, prêt, aides). Mode simple : entrez directement un solde de dette connu, amorti sur ~20 ans.",
  studentDebtDti:
    "Effet système : la mensualité étudiante entre dans le debt-to-income (DTI) US et dégrade la capacité d'emprunt immo/auto, renchérissant leur taux. Contexte 2025 : reprise des recouvrements sur prêts en défaut (saisie sur salaire), ~24 % d'emprunteurs en retard de paiement.",

  // AXE 2 — scolarité des enfants
  schoolChoice:
    "K-12 des enfants. US public ≈ gratuit MAIS qualité corrélée à la valeur immobilière du quartier (bon school district = logement plus cher). US privé : religieux ~8 500 $, moyenne ~15 000 $, indépendant ~30 000 $/an/enfant (jusqu'à 49 000 $) — soit ~195 000 $ à ~640 000 $ sur 13 ans. FR : public gratuit, privé sous contrat très abordable (quelques centaines à ~2 200 €/an).",
  kindergartenCliff:
    "« Kindergarten cliff » : aux US le coût de garde 0-5 ans est très élevé (~10 000-20 000 $/an/enfant) puis chute à quasi-zéro à l'entrée en école publique. En FR, crèche/assistante maternelle subventionnée (reste à charge modéré).",

  // AXE 3 — périscolaire
  extracurricular:
    "Activités extrascolaires (sport compétitif, musique, tutoring, summer camps, « travel teams »). Aux US : très cher, quasi pas subventionné. En FR : clubs municipaux, conservatoires, centres de loisirs, aides CAF → coût bien plus faible à activité équivalente. Un gros budget périscolaire décrit un foyer aisé, pas la médiane.",

  // --- Conversion / lectures ---
  ppa:
    "PPA (parité de pouvoir d'achat) : convertit non pas au taux de change de marché mais selon ce qu'une somme achète réellement. Le dollar « achète » moins que le change ne le suggère, car le niveau des prix US est plus élevé.",
  resteAVivre:
    "Reste à vivre : revenu disponible APRÈS toutes les dépenses contraintes (impôts, santé, retraite, voiture, logement, télécoms, énergie, alimentation, éducation). La lecture reine : ce qui demeure réellement libre.",
  seuilBascule:
    "Seuil de bascule : niveau de revenu à partir duquel le reste à vivre US dépasse celui de la FR. Obtenu en balayant le salaire et en recalculant le modèle complet à chaque point. Il se déplace avec tous les paramètres.",

  // --- Géographie ---
  frRegion:
    "La France n'est pas uniforme. On compare TROIS territoires FR de niveaux de coût différents à TROIS États US, appariés par niveau : Bretagne (province modérée) ↔ Texas ; métropole régionale (Lyon/Nantes/Toulouse) ↔ Caroline du Nord ; Île-de-France/Paris ↔ Californie. Opposer la Bretagne à la Californie serait aussi biaisé que comparer le Texas à Paris. Ce qui change selon la région : logement (surtout), transport, voiture, énergie, alimentation. Ce qui NE change PAS : l'impôt sur le revenu et les cotisations — la fiscalité FR est NATIONALE (alors que l'income tax US varie par État) : une asymétrie réelle, assumée.",
  appariement:
    "Appariement recommandé par niveau de coût : low FR (Bretagne) vs low US (Texas), mid vs mid, high vs high. C'est la lecture honnête — on compare des territoires de niveau de vie comparable. Le croisement libre reste possible (ex. « et si je quitte la Bretagne pour la Californie ? »).",

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
  education: "Poste majeur, 3 axes : (1) dette étudiante de l'actif (US ~20 ans de remboursement, miroir FR non nul) ; (2) scolarité des enfants — garde 0-5 ans (kindergarten cliff) + K-12 public/privé ; (3) périscolaire (sport, musique, tutoring, camps). Massivement auto-financé aux US, socialisé en FR.",
}
