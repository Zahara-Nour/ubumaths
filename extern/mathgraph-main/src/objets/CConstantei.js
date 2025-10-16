/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'
export default CConstantei

/**
 * Classe représenant le nombre complexe i dans les arbres binaires de calcul.
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @returns {CConstantei}
 */
function CConstantei (listeProprietaire) {
  CCb.call(this, listeProprietaire)
}
CConstantei.prototype = new CCb()
CConstantei.prototype.constructor = CConstantei
CConstantei.prototype.superClass = 'CCb'
CConstantei.prototype.className = 'CConstantei'

CConstantei.prototype.nature = function () {
  return CCbGlob.natConstantei
}
CConstantei.prototype.resultatComplexe = function (infoRandom, zRes) {
  zRes.x = 0
  zRes.y = 1
}
CConstantei.prototype.getClone = function (listeSource, listeCible) {
  return new CConstantei(listeCible)
}
CConstantei.prototype.getCopie = function () {
  return new CConstantei(this.listeProprietaire)
}
CConstantei.prototype.chaineCalcul = function (varFor) {
  return 'i'
}
CConstantei.prototype.chaineLatex = function (varFor) {
  return 'i'
}
CConstantei.prototype.estConstant = function () {
  return true
}
