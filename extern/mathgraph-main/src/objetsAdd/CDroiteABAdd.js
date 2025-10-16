/*
 * Created by yvesb on 23/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroiteAB from '../objets/CDroiteAB'
import CDroite from '../objets/CDroite'
import { getStr } from '../kernel/kernel'
export default CDroiteAB

/** @inheritDoc */
CDroiteAB.prototype.contientParDefinition = function (po) {
  return (this.a === po) || (this.b === po) || CDroite.prototype.contientParDefinition.call(this, po)
}

/**
 * Fonction utilisée par le protocole de la figure et renvoyant soit le nom de la droite (donnée lors de la boîte
 * de dialogue de protocole soit la chaîne de caractères décriavnt la doite ((OA) par exemple).
 * @returns {string}
 */
CDroiteAB.prototype.getNom = function () {
  return '(' + this.a.getName() + this.b.getName() + ')'
}

CDroiteAB.prototype.infoHist = function () {
  return this.getNom() + ' : ' + getStr('Dte') + ' ' + getStr('chinfo196') + ' ' +
    this.a.getName() + ' ' + getStr('et') + ' ' + this.b.getName()
}

CDroiteAB.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CDroite.prototype.depDe4Rec.call(this, p) ||
    this.a.depDe4Rec(p) || this.b.depDe4Rec(p))
}

CDroiteAB.prototype.estDefiniParObjDs = function (listeOb) {
  return this.a.estDefPar(listeOb) &&
  this.b.estDefPar(listeOb)
}
