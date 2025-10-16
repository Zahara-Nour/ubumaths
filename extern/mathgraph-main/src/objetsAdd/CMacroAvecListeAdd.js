/*
 * Created by yvesb on 10/10/2016.
 */

/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroAvecListe from '../objets/CMacroAvecListe'
import CMacro from '../objets/CMacro'

export default CMacroAvecListe

CMacroAvecListe.prototype.ajoutOuRetraitObjetsPossible = function () {
  return true
}

CMacroAvecListe.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CMacro.prototype.depDe4Rec.call(this, p) ||
    this.listeAssociee.depDe4Rec(p))
}

/**
 * Fonction qui renverra true si la macro est une macro avec liste à laquelle on peut ajouter ou retirer des objets
 * @returns {boolean}
 */
CMacroAvecListe.prototype.ajoutOuRetraitObjetsPossible = function () {
  return true
}

CMacroAvecListe.prototype.estDefiniParObjDs = function (listeOb) {
  return CMacro.prototype.estDefiniParObjDs.call(this, listeOb) &&
    this.listeAssociee.estDefiniParObjDs(listeOb)
}
