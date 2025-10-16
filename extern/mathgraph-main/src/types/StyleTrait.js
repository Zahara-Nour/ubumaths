/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
export default StyleTrait
/**
 * Définition des styles de traits utilisés.
 * Modifié version 5.0 pour que le style de trait soit un objet ayant un style de trait et une couleur
 * @param {CListeObjets} liste La liste contenant l'objet auquel sera affecté le style
 * @param {number} style Entier de 0 à 5 pour le style de trait
 * @param {number} strokeWidth Epaisseur du trait
 * @constructor
 */
function StyleTrait (liste, style, strokeWidth) {
  this.liste = liste // La liste propriétaire
  if (arguments.length !== 1) {
    this.style = style
    this.strokeWidth = strokeWidth
    this.stroke = this.getStroke()
  }
}
StyleTrait.straitFin = 0
StyleTrait.straitPointille = 1
StyleTrait.straitEpais = 2
StyleTrait.straitTrait = 3
StyleTrait.straitPointPoint = 4
StyleTrait.straitTresEpais = 5
StyleTrait.straitPointilleEpais = 6
// Nouvelles constantes version 5.0 pour les styles de trait
StyleTrait.styleTraitContinu = 0
StyleTrait.styleTraitPointille = 1
StyleTrait.styleTraitTrait = 2
StyleTrait.styleTraitPointPoint = 3
StyleTrait.styleTraitPointPointPoint = 4
StyleTrait.styleTraitTraitLongTrait = 5
//

// Quand on clone un objet descendnt de CElementLigne, il est nécessaire de coler son style de trait
// car quand on exporte la figure avec un coefficient multiplicateur, on modifie le style et donc le style
// ne peut pas être le style de l'objet initial
StyleTrait.prototype.getClone = function () {
  return new StyleTrait(this.liste, this.style, this.strokeWidth)
}

StyleTrait.prototype.getStroke = function () {
  switch (this.style) {
    case StyleTrait.styleTraitContinu : return ''
    case StyleTrait.styleTraitPointille : return '3 3'
    case StyleTrait.styleTraitTrait : return '10 10'
    case StyleTrait.styleTraitPointPoint : return '10 3 3 3 3 3'
    case StyleTrait.styleTraitPointPointPoint : return '10 3 3 3 3 3 3 3'
    case StyleTrait.styleTraitTraitLongTrait : return '10 3 5 3'
    default : return ''
  }
}

/**
 * Fonction utilisée quand on exporte la figure avec un coefficient multiplicateur
 * @param {number} coef Le coefficient multiplicateur
 * @returns {string}
 */
StyleTrait.prototype.getStrokeByCoef = function (coef) {
  const k3 = String(3 * coef)
  const k10 = String(10 * coef)
  const k5 = String(5 * coef)
  switch (this.style) {
    case StyleTrait.styleTraitContinu : return ''
    case StyleTrait.styleTraitPointille : return k3 + ' ' + k3
    case StyleTrait.styleTraitTrait : return k10 + ' ' + k10
    case StyleTrait.styleTraitPointPoint : return k10 + ' ' + k3 + ' ' + k3 + ' ' + k3 + ' ' + k3 + ' ' + k3
    case StyleTrait.styleTraitPointPointPoint : return k10 + ' ' + k3 + ' ' + k3 + ' ' + k3 + ' ' + k3 + ' ' + k3 + ' ' + k3 + ' ' + k3
    case StyleTrait.styleTraitTraitLongTrait : return k10 + ' ' + k3 + ' ' + k5 + ' ' + k3
    default : return ''
  }
}

// Style de trait fin pointillé utilisé par plusieurs outils
StyleTrait.stfp = function (list) { return new StyleTrait(list, StyleTrait.styleTraitPointille, 1) }
// Styles de trait fin continue utilisé dans plusieurs outils
StyleTrait.stfc = function (list) { return new StyleTrait(list, StyleTrait.styleTraitContinu, 1) }
StyleTrait.stfc2 = function (list) { return new StyleTrait(list, StyleTrait.styleTraitContinu, 2) }
StyleTrait.prototype.read = function (inps, liste) {
  this.liste = liste
  this.style = inps.readByte()
  this.stroke = this.getStroke()
  let stw = inps.readByte()
  // Lignes suivantes pour corriger un bug de la version 8.6.0 où quand on ajoutait un quadrillage à une figure
  // on pouvait avoir des segments d'épaisseur nulle
  if (stw <= 0) stw = 1
  this.strokeWidth = stw
}
StyleTrait.prototype.write = function (oups) {
  oups.writeByte(this.style)
  oups.writeByte(this.strokeWidth)
}

StyleTrait.prototype.readOld = function (inps, liste, bbyte) {
  this.liste = liste
  const oldstyle = bbyte ? inps.readByte() : inps.readInt()
  switch (oldstyle) {
    case StyleTrait.straitFin :
      this.style = StyleTrait.styleTraitContinu
      this.strokeWidth = 1
      break
    case StyleTrait.straitPointille :
      this.style = StyleTrait.styleTraitPointille
      this.strokeWidth = 1
      break
    case StyleTrait.straitEpais :
      this.style = StyleTrait.styleTraitContinu
      this.strokeWidth = 2
      break
    case StyleTrait.straitTrait :
      this.style = StyleTrait.styleTraitTrait
      this.strokeWidth = 1
      break
    case StyleTrait.straitPointPoint :
      this.style = StyleTrait.styleTraitPointPoint
      this.strokeWidth = 1
      break
    case StyleTrait.straitTresEpais :
      this.style = StyleTrait.styleTraitContinu
      this.strokeWidth = 3
      break
    case StyleTrait.straitPointilleEpais :
      this.style = StyleTrait.styleTraitPointille
      this.strokeWidth = 2
      break
    default :
      this.style = StyleTrait.styleTraitContinu
      this.strokeWidth = 1
  }
  this.stroke = this.getStroke()
}
