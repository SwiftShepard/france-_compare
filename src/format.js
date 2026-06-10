// Helpers de formatage (séparés pour réutilisation).
export const eur0 = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n || 0))

export const usd0 = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.round(n || 0))

export const pct1 = (n) => `${(n * 100).toFixed(1)} %`
export const num0 = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n || 0))
