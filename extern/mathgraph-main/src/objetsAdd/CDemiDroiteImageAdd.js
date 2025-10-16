/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDemiDroiteImage from '../objets/CDemiDroiteImage'
import CDemiDroite from '../objets/CDemiDroite'
import { getStr } from '../kernel/kernel'

export default CDemiDroiteImage

CDemiDroiteImage.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo36') + ' ' + this.antecedent.getName() + ' ' +
    getStr('par') + ' ' + this.transformation.complementInfo()
}

CDemiDroiteImage.prototype.associeATransformation = function (trans) {
  this.transformation = trans
}

CDemiDroiteImage.prototype.antecedentDirect = function () {
  return this.transformation
}

CDemiDroiteImage.prototype.modifiableParMenu = function () {
  return !this.estElementFinal && this.transformation.imageModifiableParMenu()
}

/* Revu version 6.9.1
CDemiDroiteImage.prototype.contientParDefinition = function (po) {
  if (po.estPointImage()) { return (this.transformation === po.transformation) && (po.antecedent.appartientDroiteParDefinition(this.antecedent)) } else return false
}
 */
/** @inheritDoc */
CDemiDroiteImage.prototype.contientParDefinition = function (po) {
  // Toutes les tansformations usuelles transforment une demi-droite en une demi-droite
  if (po.estPointImage()) {
    const ddteAntecedent = this.antecedent
    const ptAntecedent = po.antecedent
    // Par toutes les transformations usuelles l'image d'une demi-droite est une demi-droite
    return (this.transformation === po.transformation) && ptAntecedent.appartientDroiteParDefinition(ddteAntecedent)
  }
  return false
}

/* Abandonné version 6.9.1
CDemiDroiteImage.prototype.estParalleleParDefinition = function (dte) {
  return (dte === this) ||
    (((this.transformation.natureTransformation() & CTransformation.tteTransImDtePar) !== 0) &&
    (this.antecedent.estParalleleParDefinition(dte) || dte.estParalleleParDefinition(this.antecedent)))
}
 */

CDemiDroiteImage.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CDemiDroite.prototype.depDe4Rec.call(this, p) ||
    this.antecedent.depDe4Rec(p) || this.transformation.depDe4Rec(p))
}

/**
 * Fonction qui renvoie true seulement pour les objets qui sont des objets images d'un autre par une transformation
 * @returns {boolean}
 */
CDemiDroiteImage.prototype.estImageParTrans = function () {
  return true
}

CDemiDroiteImage.prototype.estDefiniParObjDs = function (listeOb) {
  return this.antecedent.estDefPar(listeOb) &&
  this.transformation.estDefPar(listeOb)
}
