/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

/**
 * Classe pour gérer les traitements des fontes et chaînes de caractères
 * @typedef Fonte
 * @type {Object}
 */
const Fonte = {
  Normal: 0,
  Gras: 1,
  Italique: 2,
  Underline: 4, // Ajout version 5.0
  grec: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'κ', 'λ', 'μ', 'ν', 'ξ', 'π', 'ρ', 'σ', 'τ', 'φ',
    'χ', 'ψ', 'ω', 'Γ', 'Δ', 'Ξ', 'Π', 'Σ', 'Φ', 'Χ', 'Ψ', 'Ω'],
  grecLatex: ['\\alpha ', '\\beta ', '\\gamma ', '\\delta ', '\\varepsilon ', '\\zeta ', '\\eta ', '\\theta ', '\\kappa ',
    '\\lambda ', '\\mu ', '\\nu ', '\\xi ', '\\pi ', '\\rho ', '\\sigma ', '\\tau ', '\\varphi ', '\\chi ',
    '\\psi ', '\\omega ', '\\Gamma ', '\\Delta ', '\\Xi ', '\\Pi ', '\\Sigma ', '\\Phi ', '\\Chi ', '\\Psi ', '\\Omega'],
  math: ['≤', '≥', '×', '∀', '∃', '∅', '∇', '∉', '∊', '∍', '∏', '∑', '∞', '∧', '∨', '∩', '∪',
    '∫', '∼', '≅', '≈', '∼', '≃', '≠', '≡', '⊂', '⊄', '⊃', 'ℓ', '⊥', '⊕', '⊗', '≺', '≻', '∂', '∁'],
  mathLatex: ['\\le ', '\\ge ', '\\times ', '\\forall ', '\\exists ', '\\emptyset ', '\\nabla ', '\\notin ', '\\in ', '\\ni ', '\\prod ', '\\sum ', '\\infty ',
    '\\wedge ', '\\vee ', '\\cap ', '\\cup ', '\\int ', '\\sim ', '\\cong ', '\\approx ', '\\sim', '\\simeq', '\\ne ', '\\equiv ', '\\subset ', '\\not\\subset ',
    '\\supset ', '\\ell ', '\\perp ', '\\oplus ', '\\otimes ', '\\prec ', '\\succ ', '\\partial ', '\\complement '],
  arrows: ['↑', '←', '→', '↓', '↔', '↕', '⇔', '⇒', '⇐', '⇎', '↦', '⇏', '⇍', '↩', '↪', '↺', '↻'],
  arrowsLatex: ['\\uparrow ', '\\leftarrow ', '\\rightarrow ', '\\downarrow ', '\\leftrightarrow ', '\\updownarrow ', '\\Leftrightarrow ',
    '\\Rightarrow ', '\\Leftarrow ', '\\nLeftrightarrow ', '\\mapsto ', '\\nRightarrow ', '\\nLeftarrow ', '\\hookleftarrow ',
    '\\hookrightarrow ', '\\circlearrowleft ', '\\circlearrowright '],
  estNomGrec: function (ch) {
    const ch2 = '\\' + ch + ' '
    for (let i = 0; i < Fonte.grecLatex.length; i++) {
      if (Fonte.grecLatex[i] === ch2) return true
    }
    return false
  },
  /**
   * Fonction renvoyant true si carac est un e chaîne de carctère formée de une lettre
   * gérée par le logiciel.
   * @param {string} carac
   * @returns {boolean}
   */
  lettre: function (carac) {
    const car = carac.charCodeAt(0)
    let res = ((car >= 'a'.charCodeAt(0)) && (car <= 'z'.charCodeAt(0))) ||
      ((car >= 'A'.charCodeAt(0)) && (car <= 'Z'.charCodeAt(0)))
    // Lettres grecques acceptées par le logiciel
    res = res || ((car >= 0x3b1) && (car <= (0x3b1 + 7)))
    res = res || (car === 0x3b1 + 10)
    res = res || (car === 0x3b1 + 11)
    res = res || (car === 0x3b1 + 13)
    res = res || ((car >= 0x3b1 + 15) && (car <= (0x3b1 + 19)))
    res = res || ((car >= 0x3b1 + 21) && (car <= (0x3b1 + 24)))
    res = res || ((car >= 0x391 + 2) && (car <= (0x391 + 3)))
    res = res || (car === 0x391 + 15)
    res = res || ((car >= 0x391 + 18) && (car <= (0x391 + 19)))
    res = res || ((car >= 0x391 + 21) && (car <= (0x391 + 24)))
    return res
  },
  /**
   * Renvoie true si car est un caractère ' ou "
   * @param {string} car
   * @returns {boolean}
   */
  prime: function (car) {
    return (car === "'") || (car === '"')
  },
  /**
   * Revoie true si car est une chaine de caractères à un chiffre
   * @param {string} car
   * @returns {boolean}
   */
  chiffre: function (car) {
    return (car.charCodeAt(0) >= '0'.charCodeAt(0)) && (car.charCodeAt(0) <= '9'.charCodeAt(0))
  },
  /**
   * Revoie true si car est une chaine de caractères à un chiffre ou ²
   * @param {string} car
   * @returns {boolean}
   */
  chiffreOuCarre: function (car) {
    return ((car === '²') || Fonte.chiffre(car))
  },
  /**
   * Revoie true si car est une chaine de caractères à un chiffre ou un point décimal
   * @param {string} car
   * @returns {boolean}
   */
  chiffreOuPointDecimal: function (car) {
    return ((car === '.') || Fonte.chiffre(car))
  },
  /**
   * Revoie true si car est une chaine de caractères à une lettre ou ' ou "
   * @param {string} car
   * @returns {boolean}
   */
  lettreOuPrime: function (car) {
    return (Fonte.lettre(car) || (car === '\'') || (car === '"'))
  },
  /**
   * Fonction renvoyant la taille réelle de caractères par un indice de taille
   * @param {number} indiceDeTaille entier
   * @returns {number}
   */
  taille: function (indiceDeTaille) {
    switch (indiceDeTaille) {
      case 0 : // Taille 8
        return 9
      case 1 : // Taille 9
        return 10
      case 2 : // Taille 11
        return 12
      case 3 : // Taille 12
        return 14
      case 4 : // Taille 14
        return 17
      // Ajouts version 4.7.5.2
      default :
        return 2 * indiceDeTaille + 9
      // default : return (int)(coef*13);
    }
  },
  /**
   * Fonction renvoyant les premiers caractères de ch qui ne sont pas des chiffres
   * @param {string} ch
   * @returns {string}
   */
  premiersCaracteresNonChiffres: function (ch) {
    const len = ch.length
    let i = 0
    while (i < len) {
      if (Fonte.chiffre(ch.charAt(i))) break
      else i++
    }
    if (i === len) return ch
    else return ch.substring(0, i)
  },
  /**
 * Renvoie la taiile utilisée en LaTeX par  taille
 * @param {number} taille La taille de police
 * @returns {number}
 */
  /* Plus utilisé version 6.4 avec MathJax 3
  tailleLatex : function(taille) {
    // return taille - 1;
    // Modifié version 6.4.2
    return taille;
  },
  */
  /**
 * Renvoie true si ch représente un nombre décimal
 * @param {string} ch
 * @returns {boolean}
 */
  estDecimalCorrect: function (ch) {
    let ptdec = false
    for (let i = 0; i < ch.length; i++) {
      const car = ch.charAt(i)
      if (car === '.') {
        if (ptdec) return false
        else ptdec = true
      } else if (!Fonte.chiffre(car)) return false
    }
    return true
  },
  /**
 * Fonctions renvoyant les premeirs caractères ni chiffres ni ' ni " de ch
 * @param {string} ch
 * @returns {string}
 */
  premiersCaracteresNonChiffresNonPrime: function (ch) {
    const len = ch.length
    let i = 0
    while (i < len) {
      if (Fonte.chiffre(ch.charAt(i)) || Fonte.prime(ch.charAt(i))) break
      else i++
    }
    if (i === len) return ch
    else return ch.substring(0, i)
  },
  // Ajout version 5.0
  styleEcriture: function (st) {
    let ch = ''
    if ((st & Fonte.Gras) !== 0) ch += 'font-weight:bold;'
    if ((st & Fonte.Italique) !== 0) ch += 'font-style:italic;'
    if ((st & Fonte.Underline) !== 0) ch += 'text-decoration:underline'
    return ch
  },
  validationNomPoint: function (chaine) {
    if (chaine === '') return true
    const premierCar = chaine.charAt(0)
    if (!Fonte.lettre(premierCar)) return false
    // Le premier caractère est bien une lettre
    let carPrecedent = premierCar
    let valable = true
    for (let i = 1; i < chaine.length; i++) {
      const carEnCours = chaine.charAt(i)
      // Cas d'une lettre
      if (Fonte.lettre(carEnCours)) {
        if (Fonte.chiffre(carPrecedent) || Fonte.prime(carPrecedent) || Fonte.lettre(carPrecedent)) { valable = false }
      } else {
        if (Fonte.prime(carEnCours)) {
          if (Fonte.chiffre(carPrecedent) || Fonte.prime(carPrecedent)) { valable = false }
        } else {
          if (!(Fonte.chiffre(carEnCours))) { valable = false }
        }
      }
      carPrecedent = carEnCours
    }
    return valable
  },
  validationNomDroite: function (chaine) {
    // On autorise les noms de droites entre parenthèses
    if ((chaine.indexOf('(') === 0) && (chaine.charAt(chaine.length - 1) === ')')) { return Fonte.validationNomPoint(chaine.substring(1, chaine.length - 1)) } else return Fonte.validationNomPoint(chaine)
  },
  /**
   * Fonction renvoayant true si le caractère car est une des caractères grecs acceptés par le logiciel
   * @param car
   * @returns {boolean}
   */
  estCaractereGrec: function (car) {
    for (let i = 0; i < Fonte.grec.length; i++) {
      if (car === Fonte.grec[i]) return true
    }
    return false
  },
  convertitLatex: function (car) {
    for (let i = 0; i < Fonte.grec.length; i++) {
      if (car === Fonte.grec[i]) return Fonte.grecLatex[i]
    }
    return ''
  },
  remplaceUnicodeParLatex: function (ch) {
    let i
    let st = ch
    const bstart$ = ch.startsWith('$')
    const dol = bstart$ ? '' : '$'
    for (i = 0; i < Fonte.grec.length; i++) st = st.replace(Fonte.grec[i], dol + Fonte.grecLatex[i] + dol)
    for (i = 0; i < Fonte.math.length; i++) st = st.replace(Fonte.math[i], dol + Fonte.mathLatex[i] + dol)
    for (i = 0; i < Fonte.arrows.length; i++) st = st.replace(Fonte.arrows[i], dol + Fonte.arrowsLatex[i] + dol)
    return st
  },
  traiteCodesDiese: function (st) {
    let ind1, ind2, k
    let ch = st
    while ((ind1 = ch.indexOf('#G')) !== -1) {
      k = ch.indexOf('#', ind1 + 2)
      ind2 = (k === -1) ? ch.length : k
      ch = ch.substring(0, ind1) + '\\textbf{' + ch.substring(ind1 + 2, ind2) + '}' + ch.substring(ind2)
    }
    while ((ind1 = ch.indexOf('#I')) !== -1) {
      k = ch.indexOf('#', ind1 + 2)
      ind2 = (k === -1) ? ch.length : k
      ch = ch.substring(0, ind1) + '\\textit{' + ch.substring(ind1 + 2, ind2) + '}' + ch.substring(ind2)
    }
    ch = ch.replace('#N', '')
    ch = ch.replace('#', '')
    return ch
  }
}

export default Fonte
