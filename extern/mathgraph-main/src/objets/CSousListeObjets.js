/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CListeObjets from './CListeObjets'

export default CSousListeObjets

/**
 * Classe utilisée pour gérer des listes d'objets internes à la liste principale de la figure.
 * Cet objet difère de CListeObjets dans le fait qu'il n'enregistre pas des objets dans le flux
 * mais seulement les indices des objets de la liste
 * @constructor
 * @param {KernelUniteAngle} uniteAngle
 * @param id
 * @returns {CSousListeObjets}
 */
function CSousListeObjets (uniteAngle, id) {
  CListeObjets.call(this, uniteAngle, id)
}
// CListeObjets.prototype = Object.create(Array.prototype);
CSousListeObjets.prototype = new CListeObjets()
CSousListeObjets.prototype.constructor = CSousListeObjets
CSousListeObjets.prototype.className = 'CSousListeObjets'
CSousListeObjets.prototype.superClass = 'CListeObjets'

CSousListeObjets.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb === ancienPoint) this.set(this.indexOf(ancienPoint), nouveauPoint)
  }
}
CSousListeObjets.prototype.read = function (inps, listeProprietaire) {
  const nombreObjets = inps.readInt()
  for (let i = 0; i < nombreObjets; i++) {
    const ind = inps.readInt()
    const elb = listeProprietaire.get(ind)
    this.add(elb)
  }
}
CSousListeObjets.prototype.write = function (oups, listeProprietaire) {
  const lon = this.longueur()
  oups.writeInt(lon)
  for (let i = 0; i < lon; i++) oups.writeInt(listeProprietaire.indexOf(this.get(i)))
}
