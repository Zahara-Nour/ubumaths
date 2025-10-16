/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CCalculAncetre from './CCalculAncetre'
export default CTestDependanceVariable

/**
 * Classe représentant un test de dépendance d'une fonction par rapport à une variable.
 * Renvoie 1 si la formule de la fonction dépend de la variable et 0 sinon.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom du calcul.
 * @param {CCalcul} fonctionAssociee  Fonction de une, deux ou trois variables d'une
 * variable réelle ou complexe.
 * @param {number} indiceVariable  Indide de la variable (0 pour une fonction de une variable).
 * @returns {CTestDependanceVariable}
 */
function CTestDependanceVariable (listeProprietaire, impProto, estElementFinal, nomCalcul,
  fonctionAssociee, indiceVariable) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    if (arguments.length === 3) CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal)
    else {
      CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
      this.fonctionAssociee = fonctionAssociee
      this.indiceVariable = indiceVariable
    }
  }
  this.existe = true
}
CTestDependanceVariable.prototype = new CCalculAncetre()
CTestDependanceVariable.prototype.constructor = CTestDependanceVariable
CTestDependanceVariable.prototype.superClass = 'CCalculAncetre'
CTestDependanceVariable.prototype.className = 'CTestDependanceVariable'

CTestDependanceVariable.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CTestDependanceVariable(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CCalcul'), this.indiceVariable)
}
CTestDependanceVariable.prototype.getNatureCalcul = function () {
  return NatCal.NTestDependanceVariable
}
CTestDependanceVariable.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) || this.fonctionAssociee.depDe(p))
}
CTestDependanceVariable.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.fonctionAssociee.dependDePourBoucle(p)
}
CTestDependanceVariable.prototype.rendValeur = function () {
  return this.resultat
}
CTestDependanceVariable.prototype.positionne = function () {
  // Existe toujours égal à true pour cet objet
  this.resultat = this.fonctionAssociee.calcul.dependDeVariable(this.indiceVariable) ? 1 : 0
}
CTestDependanceVariable.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.fonctionAssociee === p.fonctionAssociee) && (this.indiceVariable === p.indiceVariable)
  } else return false
}
CTestDependanceVariable.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.fonctionAssociee = list.get(ind1, 'CCalcul')
  this.indiceVariable = inps.readInt()
}
CTestDependanceVariable.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.fonctionAssociee)
  oups.writeInt(ind1)
  oups.writeInt(this.indiceVariable)
}
