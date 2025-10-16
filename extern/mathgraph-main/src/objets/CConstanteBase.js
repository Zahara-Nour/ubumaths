/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { chaineNombre } from '../kernel/kernel'
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'

export default CConstante

/**
 * Classe représentant une constante dans un arbre binaire de calcul.
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {number} valeur  La valeur rebdue par la constante.
 * @returns {CConstante}
 */
function CConstante (listeProprietaire, valeur) {
  CCb.call(this, listeProprietaire)
  if (arguments.length !== 1) this.valeur = valeur
}
CConstante.prototype = new CCb()
CConstante.prototype.constructor = CConstante
CConstante.prototype.superClass = 'CCb'
CConstante.prototype.className = 'CConstante'

CConstante.prototype.nature = function () {
  return CCbGlob.natConstante
}

CConstante.prototype.getClone = function (listeSource, listeCible) {
  return new CConstante(listeCible, this.valeur)
}

CConstante.prototype.getCopie = function () {
  return new CConstante(this.listeProprietaire, this.valeur)
}

CConstante.prototype.resultat = function (infoRandom) {
  return this.valeur
}

CConstante.prototype.resultatComplexe = function (infoRandom, zRes) {
  zRes.x = this.valeur// Par défaut on suppose le calcul réel
  zRes.y = 0
}

CConstante.prototype.chaineCalcul = function (varFor) {
  // Attention : dans certianes boîte de dialogue on a affaire à des CConst qui n'ont pas de liste propriétaire
  const decimalDot = this.listeProprietaire ? this.listeProprietaire.decimalDot : true
  return chaineNombre(this.valeur, 12, decimalDot)
}

CConstante.prototype.estConstant = function () {
  return true
}

CConstante.prototype.estConstante0 = function () {
  return this.valeur === 0
}

CConstante.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  this.valeur = inps.readDouble()
}

CConstante.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  oups.writeDouble(this.valeur)
}
