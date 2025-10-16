/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { testToile } from '../kernel/kernel'
import CLieuDiscretDeBase from './CLieuDiscretDeBase'
export default CLieuDiscretParVariable

/**
 * Classe représentant un lieu de points non reliés généré par les valeurs d'une variable.
 * @constructor
 * @extends CLieuDiscretDeBase
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la liste propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} masque  true si l'objet est masqué
 * @param {CPt} pointATracer  Le point qui laisse une trace.
 * @param {number} nombreDePoints  Le nombre de points du lieu
 * @param {MotifPoint} motif  Le motif utilisé pour la trace des points.
 * @param {CVariableBornee} variableGeneratrice  La variable dont les valeurs génèrent le lieu.
 * @returns {CLieuDiscretParVariable}
 */
function CLieuDiscretParVariable (listeProprietaire, impProto, estElementFinal, couleur, masque,
  pointATracer, nombreDePoints, motif, variableGeneratrice) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CLieuDiscretDeBase.call(this, listeProprietaire)
    else {
      CLieuDiscretDeBase.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        masque, pointATracer, nombreDePoints, motif)
      this.variableGeneratrice = variableGeneratrice
    }
  }
}
CLieuDiscretParVariable.prototype = new CLieuDiscretDeBase()
CLieuDiscretParVariable.prototype.constructor = CLieuDiscretParVariable
CLieuDiscretParVariable.prototype.superClass = 'CLieuDiscretDeBase'
CLieuDiscretParVariable.prototype.className = 'CLieuDiscretParVariable'

CLieuDiscretParVariable.prototype.numeroVersion = function () {
  return 2
}

CLieuDiscretParVariable.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.pointATracer)
  const ind2 = listeSource.indexOf(this.variableGeneratrice)
  const ind3 = listeSource.indexOf(this.impProto)
  const ptelb = new CLieuDiscretParVariable(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, listeCible.get(ind1, 'CPt'),
    this.nombreDePoints, this.motif, listeCible.get(ind2, 'CVariableBornee'))
  if (listeCible.className !== 'CPrototype') {
    // this.listeElementsAncetres.setImage(ptelb.listeElementsAncetres, ptelb.listeProprietaire, this.listeProprietaire);
    ptelb.listeElementsAncetres.setImage(this.listeElementsAncetres, this.listeProprietaire, ptelb.listeProprietaire)
  }
  return ptelb
}
CLieuDiscretParVariable.prototype.metAJour = function () {
  CLieuDiscretDeBase.prototype.metAJour.call(this)
  this.etablitListeElementsAncetres()
}
CLieuDiscretParVariable.prototype.positionne = function (infoRandom, dimfen) {
  let valeur
  if (!this.variableGeneratrice.existe) {
    this.existe = false
    return
  }
  const valeurMinimale = this.variableGeneratrice.valeurMini
  const valeurMaximale = this.variableGeneratrice.valeurMaxi
  const valeurInitiale = this.variableGeneratrice.valeurActuelle
  const pas = (valeurMaximale - valeurMinimale) / (this.nombreDePoints - 1)
  valeur = valeurMinimale
  this.indiceDernierPointTrace = -1
  const nb = this.nombreDePoints - 1
  for (let i = 0; i < this.nombreDePoints; i++) {
    valeur = (i === 0) ? valeurMinimale : ((i === nb) ? valeurMaximale : valeur + pas)
    this.variableGeneratrice.donneValeur(valeur)
    this.listeElementsAncetres.positionne(infoRandom, dimfen)
    if (this.pointATracer.existe) {
      if (testToile(this.pointATracer.x, this.pointATracer.y)) {
        this.indiceDernierPointTrace++
        this.absPoints[this.indiceDernierPointTrace] = this.pointATracer.x
        this.ordPoints[this.indiceDernierPointTrace] = this.pointATracer.y
      }
    }
  }

  // On redonne à la variable génératrice sa valeur initiale
  this.variableGeneratrice.donneValeur(valeurInitiale)
  this.listeElementsAncetres.positionne(infoRandom, dimfen)
  this.existe = (this.indiceDernierPointTrace >= 0)
}
CLieuDiscretParVariable.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.pointATracer === p.pointATracer) && (this.variableGeneratrice === p.variableGeneratrice)
  } else return false
}
/**
 * Fonction mettant dans this.listeElementsAncetres la liste de tous les objets de la liste
 * propriétaire qui doivent être calculés lorsque le lieu est calculé.
 * @returns {void}
 */

CLieuDiscretParVariable.prototype.etablitListeElementsAncetres = function () {
  if (this.listeProprietaire.className !== 'CPrototype') {
    this.listeElementsAncetres.retireTout()
    const indicePointATracer = this.listeProprietaire.indexOf(this.pointATracer)
    const indiceVariableGeneratrice = this.listeProprietaire.indexOf(this.variableGeneratrice)
    this.listeElementsAncetres.add(this.variableGeneratrice)
    for (let i = indiceVariableGeneratrice + 1; i < indicePointATracer; i++) {
      const ptelb = this.listeProprietaire.get(i)
      if ((this.pointATracer.depDe(ptelb)) && (ptelb.depDe(this.variableGeneratrice))) { this.listeElementsAncetres.add(ptelb) }
    }
    this.listeElementsAncetres.add(this.pointATracer)
  }
}
CLieuDiscretParVariable.prototype.read = function (inps, list) {
  CLieuDiscretDeBase.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.variableGeneratrice = list.get(ind1, 'CVariableBornee')
  if (this.nVersion === 1) this.etablitListeElementsAncetres()
  else this.listeElementsAncetres.read(inps, list)
}
CLieuDiscretParVariable.prototype.write = function (oups, list) {
  CLieuDiscretDeBase.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.variableGeneratrice)
  oups.writeInt(ind1)
  this.listeElementsAncetres.write(oups, this.listeProprietaire)
}
