/*
 * Created by yvesb on 23/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroiteParallele from '../objets/CDroiteParallele'
import CDroite from '../objets/CDroite'
import { getStr } from '../kernel/kernel'
import CTransformation from 'src/objets/CTransformation'
export default CDroiteParallele

CDroiteParallele.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo5') + ' ' + this.d.getNom() + ' ' +
    getStr('chinfo196') + ' ' + this.a.getName()
}

CDroiteParallele.prototype.contientParDefinition = function (po) {
  if ((this.a === po) || CDroite.prototype.contientParDefinition.call(this, po)) return true
  if (po.estPointImage()) {
    // On regarde si po est un point image par une transformation transformant une droite en une droite parallèle.
    const ptAntecedent = po.antecedent
    const d = this.d // La droite à la quelle this est parallèle
    if (ptAntecedent.appartientDroiteParDefinition(d)) {
      // Par toutes les transformations usuelles l'image d'une droite est une droite
      const trans = po.transformation
      // Si la transformation associé au point iamge n'est pas la même que celle associée à la droite image
      const natTrans = trans.natureTransformation()
      switch (natTrans) {
        case CTransformation.homothetie :
        case CTransformation.symetrieCentrale :
          return trans.centre.appartientDroiteParDefinition(d)
        // Dans le cas d'une translation, si l'origine de la translation est sur la droite antécédent
        // et son extrémité sur la droite image et si le point antécédent est sur la droite antcécédent
        // ou encore s'ils sont tous les trois sur la droite antécédent
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

CDroiteParallele.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CDroite.prototype.depDe4Rec.call(this, p) ||
    this.a.depDe4Rec(p) || this.d.depDe4Rec(p))
}

CDroiteParallele.prototype.estDefiniParObjDs = function (listeOb) {
  return this.a.estDefPar(listeOb) &&
  this.d.estDefPar(listeOb)
}
