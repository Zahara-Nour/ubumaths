/*
 * Created by yvesb on 23/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroitePerpendiculaire from '../objets/CDroitePerpendiculaire'
import CDroite from '../objets/CDroite'
import { getStr } from '../kernel/kernel'
import CTransformation from 'src/objets/CTransformation'
export default CDroitePerpendiculaire

CDroitePerpendiculaire.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo6') + ' ' + this.d.getNom() + ' ' +
    getStr('chinfo196') + ' ' + this.a.getName()
}

/* Modifié version 6.9.1
CDroitePerpendiculaire.prototype.contientParDefinition = function (po) {
  return (this.a === po)
}
 */

/** @inheritDoc */
CDroitePerpendiculaire.prototype.contientParDefinition = function (po) {
  if ((this.a === po) || CDroite.prototype.contientParDefinition.call(this, po)) return true
  if (po.estPointImage() && this.d.className === 'CDroitePerpendiculaire') {
    // On regarde si po est un point image par une transformation transformant une droite en une droite parallèle.
    const ptAntecedent = po.antecedent
    const d = this.d.d // La droite à la quelle this est parallèle par double orthogoalié
    if (ptAntecedent.appartientDroiteParDefinition(d)) {
      // Par toutes les transformations usuelles l'image d'une droite est une droite
      const trans = po.transformation
      // Si la transformation associé au point iamge n'est pas la même que celle associée à la droite image
      const natTrans = trans.natureTransformation()
      switch (natTrans) {
        case CTransformation.homothetie :
        case CTransformation.symetrieCentrale :
          return trans.centre.appartientDroiteParDefinition(d)
        // Dans le cas d'une translation, si l'origine de la translation est sur la droite d
        // et son extrémité sur la droite this et si le point antécédent est sur la droite d
        // ou encore s'ils sont tous les trois sur la droite d
        // la droite contient le point image
        case CTransformation.translation : {
          return (trans.or.appartientDroiteParDefinition(d) && trans.ex.appartientDroiteParDefinition(this)) ||
            (trans.or.appartientDroiteParDefinition(d) && trans.ex.appartientDroiteParDefinition(d))
        }
        case CTransformation.translationParVect : {
          const vect = trans.vecteurTrans
          return (vect.point1.appartientDroiteParDefinition(d) && vect.point2.appartientDroiteParDefinition(this)) ||
            (vect.point1.appartientDroiteParDefinition(d) && vect.point2.appartientDroiteParDefinition(d))
        }
        default :
          return false
      }
    }
  }
  return false
}

CDroitePerpendiculaire.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CDroite.prototype.depDe4Rec.call(this, p) ||
    this.a.depDe4Rec(p) || this.d.depDe4Rec(p))
}

CDroitePerpendiculaire.prototype.estDefiniParObjDs = function (listeOb) {
  return this.a.estDefPar(listeOb) &&
  this.d.estDefPar(listeOb)
}
