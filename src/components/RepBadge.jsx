import React from 'react'
import Info from './Info.jsx'

/**
 * Pastille de représentativité affichée à côté d'un contrôle.
 * Le texte explicatif (note) est en INFOBULLE accessible (survol + tap + focus),
 * jamais en title= hover-seul.
 * - share : fréquence marginale (0-1), optionnelle.
 * - minority : true ⇒ style « cas minoritaire » (ambre).
 * - alea : true ⇒ style « aléa » (bleu, pour le scénario santé).
 * - note : phrase explicative (contenu de l'infobulle).
 */
export default function RepBadge({ share, minority, alea, note, text }) {
  const tone = alea ? 'alea' : minority ? 'minority' : 'neutral'
  const pct = share != null ? `${Math.round(share * 100)} %` : null
  return (
    <Info bare content={note}>
      <span className={`rep-badge ${tone}`}>
        <span className="ico">ⓘ</span>
        {pct && <span className="pct">{pct}</span>}
        <span>{text || (minority ? 'cas minoritaire' : alea ? 'aléa' : 'majoritaire')}</span>
      </span>
    </Info>
  )
}
