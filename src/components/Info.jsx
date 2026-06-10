import React, { useState, useRef, useLayoutEffect, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

/**
 * Infobulle accessible — déclenchée au SURVOL (desktop), au CLIC/TAP (mobile) ET
 * au FOCUS clavier. Jamais en hover seul (contrainte tactile non négociable).
 *
 *  - hover/focus : ouverture éphémère (se ferme à la sortie/blur).
 *  - clic/tap    : « épingle » l'infobulle (reste ouverte) ; second tap, clic
 *    extérieur ou Échap la ferment.
 *  - rendue dans un portal (document.body) pour ne pas être rognée par un
 *    conteneur overflow:hidden, et repositionnée automatiquement près des bords.
 *
 * Props :
 *  - content : texte/JSX de l'infobulle.
 *  - term    : si fourni, le déclencheur est ce terme souligné en pointillés.
 *  - bare    : enrobe `children` sans style d'icône (ex : pastille).
 *  - children: contenu du déclencheur (défaut : icône ⓘ).
 */
export default function Info({ content, term, bare, children, className }) {
  const [hoverOpen, setHoverOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const triggerRef = useRef(null)
  const tipRef = useRef(null)
  const [pos, setPos] = useState({ top: -9999, left: -9999, placement: 'top' })
  const id = useId()
  const visible = hoverOpen || pinned

  // Positionnement : au-dessus par défaut, bascule dessous si pas la place,
  // clampé horizontalement dans la fenêtre.
  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !tipRef.current) return
    const tr = triggerRef.current.getBoundingClientRect()
    const tip = tipRef.current
    const tw = tip.offsetWidth
    const th = tip.offsetHeight
    const m = 8
    let placement = 'top'
    let top = tr.top - th - m
    if (top < m) { placement = 'bottom'; top = tr.bottom + m }
    let left = tr.left + tr.width / 2 - tw / 2
    left = Math.max(m, Math.min(left, window.innerWidth - tw - m))
    setPos({ top, left, placement })
  }, [visible, content])

  // Fermeture au clic extérieur / Échap quand épinglée.
  useEffect(() => {
    if (!pinned) return
    const onDoc = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        tipRef.current && !tipRef.current.contains(e.target)
      ) { setPinned(false); setHoverOpen(false) }
    }
    const onKey = (e) => { if (e.key === 'Escape') { setPinned(false); setHoverOpen(false) } }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  const triggerProps = {
    ref: triggerRef,
    tabIndex: 0,
    role: 'button',
    'aria-label': typeof content === 'string' ? content : undefined,
    'aria-describedby': visible ? id : undefined,
    'aria-expanded': visible,
    onMouseEnter: () => setHoverOpen(true),
    onMouseLeave: () => setHoverOpen(false),
    onFocus: () => setHoverOpen(true),
    onBlur: () => setHoverOpen(false),
    onClick: (e) => { e.preventDefault(); e.stopPropagation(); setPinned((p) => !p) },
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPinned((p) => !p) }
    },
  }

  const triggerClass = term ? 'info-term' : bare ? 'info-trigger' : 'info-ico'

  return (
    <>
      <span className={`${triggerClass} ${className || ''}`} {...triggerProps}>
        {term || children || 'ⓘ'}
      </span>
      {visible && createPortal(
        <div
          ref={tipRef}
          id={id}
          role="tooltip"
          className={`info-tip placement-${pos.placement}`}
          style={{ top: pos.top, left: pos.left }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  )
}
