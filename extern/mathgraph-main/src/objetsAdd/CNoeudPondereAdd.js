/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CNoeudPondere from '../objets/CNoeudPondere'

export default CNoeudPondere

CNoeudPondere.prototype.estDefiniParObjDs = function (listeOb) {
  return this.pointAssocie.estDefPar(listeOb) &&
  this.poids.estDefiniParObjDs(listeOb)
}
