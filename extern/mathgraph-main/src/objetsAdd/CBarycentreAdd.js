/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CBarycentre from '../objets/CBarycentre'
import CPt from '../objets/CPt'
import { getStr } from '../kernel/kernel'
import ModificationBarycentreDlg from '../dialogs/ModificationBarycentreDlg'
import NatObj from 'src/types/NatObj'
export default CBarycentre

CBarycentre.prototype.infoHist = function () {
  let ch = this.getName() + ' : ' + getStr('Barycentre') + ' ' + getStr('of') + ' '
  for (let i = 0; (i < this.col.length); i++) {
    const noeud = this.col[i]
    ch += '(' + noeud.pointAssocie.getName() + ';' + noeud.poids.chaineInfo() + ') '
  }
  return ch
}

/**
 * Fonction renvoyant la somme des coefficients des points pondérés.
 * @returns {number}
 */
/*
CBarycentre.prototype.sommeCoefficients = function(){
  var resultat = 0;
  for (var i = 0; (i < this.col.length); i++) {
    var noeud = this.col[i];
    resultat = resultat + noeud.poids.rendValeur();
  }
  return resultat;
};
*/

CBarycentre.prototype.modifiableParMenu = function () {
  return false
}

CBarycentre.prototype.modifiableParProtocole = function () {
  return this.impProto === null
}

CBarycentre.prototype.modifDlg = function (app, callBack1, callBack2) {
  new ModificationBarycentreDlg(app, this, callBack1, callBack2)
}

CBarycentre.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  let resultat = false
  for (let i = 0; (i < this.col.length) && !resultat; i++) {
    const noeud = this.col[i]
    resultat = resultat || noeud.pointAssocie.depDe4Rec(p) || noeud.poids.depDe4Rec(p)
  }
  return this.memDep4Rec(resultat || CPt.prototype.depDe4Rec.call(this, p))
}

CBarycentre.prototype.estDefiniParObjDs = function (listeOb) {
  for (let i = 0; i < this.col.length; i++) {
    const noeud = this.col[i]
    // && noeud.pointAssocie.estDefiniParObjDs(listeOb) // Modifié version JS
    if (!(noeud.pointAssocie.estDefPar(listeOb) && noeud.poids.estDefiniParObjDs(listeOb))) return false
  }
  return true
}

CBarycentre.prototype.appartientDroiteParDefinition = function (droite) {
  if (CPt.prototype.appartientDroiteParDefinition.call(this, droite)) return true
  // On regarde si tous les points pondérés appartiennent à la droite mais seuleùent dans le cas d'une droite.
  if (droite.getNature() === NatObj.NDroite) {
    for (let i = 0; i < this.col.length; i++) {
      const noeud = this.col[i]
      if (!noeud.pointAssocie.appartientDroiteParDefinition(droite)) return false
    }
    return true
  }
  return false
}
