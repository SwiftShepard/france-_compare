import React from 'react'
import { computeRepresentativity } from '../model.js'

const ICONS = {
  representative: '✅',
  mostly: '🟢',
  mixed: '🟡',
  minority: '🔴',
}

/**
 * Bandeau qualitatif synthétique : à quel point la config courante est
 * représentative. Basé sur le NOMBRE de filtres minoritaires, jamais sur un
 * produit de pourcentages (variables corrélées).
 */
export default function RepBanner({ inputs }) {
  const rep = computeRepresentativity(inputs)
  const g = rep.global
  return (
    <div className={`rep-banner level-${g.level}`}>
      <div className="rb-icon">{ICONS[g.level]}</div>
      <div style={{ flex: 1 }}>
        <div className="rb-title">{g.label}</div>
        <div className="rb-sub">
          {g.minorityCount === 0
            ? 'Aucun filtre n\'est positionné sur une valeur minoritaire : les résultats reflètent un cas courant.'
            : `${g.minorityCount} hypothèse(s) minoritaire(s) empilée(s). Plus on en cumule, moins la configuration décrit la population réelle.`}
        </div>
        {g.items.length > 0 && (
          <div className="rb-items">
            {g.items.map((it, i) => (
              <span className="rb-chip" key={i}>
                {it.label}{it.favors !== 'neutre' && <span className="muted"> · avantage {it.favors}</span>}
              </span>
            ))}
          </div>
        )}
        <div className="rb-caveat">{g.caveat}</div>
      </div>
    </div>
  )
}
