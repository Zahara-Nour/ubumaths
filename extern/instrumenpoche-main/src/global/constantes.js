/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */

/**
 * Le namespace svg
 * @type {string}
 */
export const svgns = 'http://www.w3.org/2000/svg'
/**
 * Liste des caractères grecs (alpha: 'α', beta…)
 * @type {Object}
 */
export const caracteresGrecs = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  phi: 'φ',
  chi: 'χ', // c'est bien le χ minuscule (ressemble à sa majuscule mais en plus bas)
  psi: 'ψ',
  omega: 'ω',
  Gamma: 'Γ',
  Delta: 'Δ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Phi: 'Φ',
  Chi: 'Χ',
  Psi: 'Ψ',
  Omega: 'Ω'
}
/**
 * Les caractères spéciaux qui seront remplacés par leur caractère UTF8 (nom => char)
 * pour utilisation sous la forme £nom£ dans un texte
 * @type {object}
 */
export const caracteresSpeciaux = {
  alpha2: 'α', // quel intérêt ? £alpha£ est déjà remplacé par le même caractère via caracteresGrecs
  plus: '+',
  moins: '-',
  fois: '×',
  divise: '÷',
  petitf: 'f',
  petitebarre: '–',
  grandebarre: '—',
  prime: "'",
  seconde: '"',
  puceronde: '•',
  grandC: 'ℂ',
  euler: 'ℂ',
  petitg: 'ℊ',
  petith: 'ℏ',
  Ironde: 'ℑ',
  Lronde: 'ℒ',
  lronde: 'ℓ',
  grandN: 'ℕ',
  Pronde: '℘',
  grandQ: 'ℚ',
  Rronde: 'ℜ',
  grandR: 'ℝ',
  grandZ: 'ℤ',
  Eronde: 'ℰ',
  Fronde: 'ℱ',
  Nronde: 'ℵ',
  flecheG: '←',
  flecheH: '↑',
  flecheD: '→',
  flecheB: '↓',
  flecheDG: '↔',
  flecheGD: '↔',
  flecheHB: '↕',
  flecheBH: '↕',
  croissant: '↗',
  decroissant: '↘',
  alaligneadroite: '↳',
  alaligneagauche: '↵',
  doubleflecheG: '⇐',
  doubleflecheD: '⇒',
  doubleflecheDG: '⇔',
  doubleflecheGD: '⇔',
  flecheGbarre: '⇤',
  flecheDbarre: '⇥',
  flecheGcreuse: '⇦',
  flecheHcreuse: '⇧',
  flecheDcreuse: '⇨',
  flecheBcreuse: '⇩',
  qqsoit: '∀',
  pourtout: '∀',
  quelquesoit: '∀',
  complement: '∁',
  differentielpartiel: '∂',
  ilexiste: '∃',
  ilnexistepas: '∄',
  vide: '∅',
  nabla: '∇',
  appartienta: '∈',
  nappartientpasa: '∉',
  contient: '∋',
  petitcontient: '∍',
  grandproduit: '∏',
  grandcoproduit: '∐',
  grandesomme: '∑',
  petitebarrefine: '−',
  moinsouplus: '∓',
  antislash: '\\',
  asterisque: '∗',
  racine: '√',
  proportionnela: '∝',
  infini: '∞',
  angle: '∡',
  anglespherique: '∢',
  // divise: '∣', // faudrait savoir ! déjà défini plus haut comme ÷
  nedivisepas: '∤',
  parallelea: '//',
  nestpasparallelea: '∦',
  etlogique: '∧',
  oulogique: '∨',
  inter: '∩',
  intersection: '∩',
  union: '∪',
  integrale: '∫',
  doubleintegrale: '∬',
  tripleintegrale: '∭',
  integralecurviligne: '∮',
  integralesurfacique: '∯',
  integralevolumique: '∰',
  egaleasymptotiquea: '≃',
  environdroit: '≃',
  environegala: '≅',
  environ: '≈',
  egalpardefinition: '≝',
  differentde: '≠',
  identiquea: '≡',
  inferieura: '≤',
  superieura: '≥',
  inclusdans: '⊂',
  // contient: '⊃', doublon avec ∋ défini plus haut
  nestpasinclusdans: '⊄',
  necontientpas: '⊅',
  sommedirecte: '⊕',
  differencedirecte: '⊖',
  produittensoriel: '⊗',
  divisiondirecte: '⊘',
  produitdirect: '⊙',
  top: '⊤',
  perpendiculairea: '⊥',
  antecedentde: '⊶',
  imagede: '⊷',
  angledroitarc: '⊾',
  point: '⋅',
  pv: ';'
}

/**
 * π/180
 * @type {number}
 */
export const convDegRad = Math.PI / 180
/**
 * 180/π
 * @type {number}
 */
export const convRadDeg = 180 / Math.PI
/**
 * Valeur de cos(30°)
 * @type {number}
 */
export const cos30 = Math.cos(30 * convDegRad)
/**
 * Valeur de sin(30°)
 * @type {number}
 */
export const sin30 = 0.5
