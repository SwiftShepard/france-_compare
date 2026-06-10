import React from 'react'

export default function Methodology() {
  return (
    <div className="panel methodo section">
      <div className="panel-head">Méthodologie & thèse assumée</div>
      <div className="panel-body">
        <div className="thesis-box">
          <strong>Thèse du projet.</strong> L'idée reçue selon laquelle les États-Unis
          offrent un pouvoir d'achat nettement supérieur à poste équivalent est en partie
          un trompe-l'œil. À <strong>qualité de vie et de consommation équivalente</strong>,
          une fois intégrées toutes les dépenses contraintes que l'Américain auto-finance
          (santé, retraite, voiture, éducation…), l'écart se réduit fortement, voire
          s'inverse selon le profil et l'État. Ce simulateur sert à <strong>tester</strong>
          cette thèse honnêtement : chaque hypothèse qui lui est favorable est ajustable.
        </div>

        <details className="methodo-details">
        <summary>Principes méthodologiques détaillés (qualité constante, piège du net, lectures…)</summary>
        <p><strong>1. Comparaison à qualité constante.</strong> On ne compare pas des prix
        faciaux mais le coût d'un <strong>même niveau de service</strong>. Un panier
        alimentaire FR courant (marque lambda à bio Leclerc) est valorisé côté US au niveau
        Whole Foods / organic pour <em>matcher la qualité</em>, pas au niveau Walmart
        générique. De même, le service télécom FR (multi-lignes illimité + fibre) sert de
        référence : on calcule ce qu'il coûte réellement aux US.</p>

        <p><strong>2. Le piège du « net avant impôt ».</strong> Le net avant impôt français
        est un net <strong>après</strong> toutes les cotisations sociales (santé, retraite,
        chômage). Le net américain « naturel » n'a subi que la FICA (7,65 %) et n'inclut
        <strong> ni santé ni retraite</strong>. On ne pose donc jamais les deux nets comme
        équivalents : on reconstruit le brut, on retire la FICA, et santé/retraite
        deviennent des <strong>postes de dépense séparés</strong> côté US. Sans cette
        correction, le modèle mentirait en faveur des US.</p>

        <p><strong>3. Reste à vivre, la lecture reine.</strong> Au-delà du taux de change et
        de la parité de pouvoir d'achat (PPA), la mesure qui compte est le revenu disponible
        <strong> après dépenses contraintes</strong>. C'est elle qui révèle ce qu'il reste
        réellement à dépenser librement.</p>

        <p><strong>4. Double lecture des cotisations sociales FR.</strong> Elles sont à la
        fois (a) un prélèvement et (b) une dépense pré-payée (santé, retraite) à mettre en
        face des dépenses US correspondantes. Les avantages sociaux FR (5 semaines de congés
        payés, congés maladie et maternité indemnisés — zéro garanti par la loi fédérale US)
        sont valorisables en équivalent monétaire.</p>

        <p><strong>5. Symétrie géographique.</strong> La France n'est pas uniforme. On compare
        <strong> trois territoires FR</strong> de niveaux de coût différents à <strong>trois
        États US</strong> de niveaux différents, <strong>appariés par niveau</strong> : Bretagne
        (province modérée) ↔ Texas ; métropole régionale (Lyon/Nantes/Toulouse) ↔ Caroline du
        Nord ; Île-de-France/Paris ↔ Californie. Comparer la Bretagne à la Californie serait
        aussi biaisé que comparer le Texas à Paris. Ce qui change selon la région : logement
        (surtout), transport, voiture, énergie, alimentation. Ce qui <strong>ne change pas</strong> :
        l'IR et les cotisations — la fiscalité FR est <strong>nationale</strong>, alors que
        l'income tax US varie par État. Cette asymétrie est réelle et assumée, pas un bug.</p>

        <ul>
          <li><strong>Archétypes FR</strong> : Bretagne/Rennes (low), métropole régionale (mid),
          Île-de-France/Paris (high) — appariés aux 3 États US.</li>
          <li><strong>Archétypes US</strong> : Texas (low-cost, 0 % income tax), Caroline du
          Nord (médian), Californie (high-cost).</li>
          <li><strong>Mode propriétaire</strong> par défaut des deux côtés.</li>
          <li>Tous les chiffres sont des <strong>ordres de grandeur défendables</strong>
          (sources documentées dans <code>config.js</code>), volontairement exposés pour
          qu'un contradicteur teste ses propres valeurs plutôt que de crier au biais.</li>
        </ul>

        <p className="muted" style={{ fontSize: 12 }}>
          Garde-fou : la force de l'argument vient de sa robustesse au paramétrage, pas d'un
          cadrage figé. Les chiffres sont des hypothèses discutables, assumées comme telles.
        </p>
        </details>
      </div>
    </div>
  )
}
