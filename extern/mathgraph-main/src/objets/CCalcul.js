/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCalcul from './CCalculBase'
import CImplementationProto from './CImplementationProto'

export default CCalcul

CCalcul.prototype.getClone = function (listeSource, listeCible) {
  const calculClone = this.calcul.getClone(listeSource, listeCible)
  const ind1 = listeSource.indexOf(this.impProto)
  return new CCalcul(listeCible, listeCible.get(ind1, CImplementationProto.prototype.className),
    this.estElementFinal, this.nomCalcul, this.chaineCalcul, calculClone)
}
