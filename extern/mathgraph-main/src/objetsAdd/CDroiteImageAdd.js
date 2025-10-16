/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroiteImage from '../objets/CDroiteImage'
import CDroite from '../objets/CDroite'
import CTransformation from '../objets/CTransformation'
import { getStr } from '../kernel/kernel'

export default CDroiteImage

CDroiteImage.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo34') + ' ' + this.antecedent.getNom() + ' ' +
    getStr('par') + ' ' + this.transformation.complementInfo()
}

CDroiteImage.prototype.antecedentDirect = function () {
  return this.transformation
}

CDroiteImage.prototype.modifiableParMenu = function () {
  return !this.estElementFinal && this.transformation.imageModifiableParMenu()
}

CDroiteImage.prototype.contientParDefinition = function (po) {
  if (po.estPointImage()) {
    if (CDroite.prototype.contientParDefinition.call(this, po)) return true
    const dteAntecedent = this.antecedent
    const ptAntecedent = po.antecedent
    if (ptAntecedent.appartientDroiteParDefinition(dteAntecedent)) {
      const trans = po.transformation
      // Par toutes les transformations usuelles l'image d'une droite est une droite
      if ((this.transformation === trans) && (trans.natureTransformation !== CTransformation.inversion)) {
        return true
      }
      // On regarde si la droite est image par une transformation transformant une droite par une droite parallèle
      if ((this.transformation.natureTransformation() & CTransformation.tteTransImDtePar) !== 0) {
        // Si la transformation associé au point image n'est pas la même que celle associée à la droite image
        const natTrans = trans.natureTransformation()
        switch (natTrans) {
          case CTransformation.homothetie :
          case CTransformation.symetrieCentrale :
            return trans.centre.appartientDroiteParDefinition(dteAntecedent)
          // Dans le cas d'une translation, si l'origine de la translation est sur la droite antécédent
          // et son extrémité sur la droite image et si le point antécédent est sur la droite antcécédent
          // ou encore s'ils sont tous les trois sur la droite antécédent
          // la droite contient le point image
          case CTransformation.translation :
            return (trans.or.appartientDroiteParDefinition(dteAntecedent) && trans.ex.appartientDroiteParDefinition(this)) ||
              (trans.or.appartientDroiteParDefinition(dteAntecedent) && trans.ex.appartientDroiteParDefinition(dteAntecedent))
          case CTransformation.translationParVect : {
            const vect = trans.vecteurTrans
            return (vect.point1.appartientDroiteParDefinition(dteAntecedent) && vect.point2.appartientDroiteParDefinition(this)) ||
              (vect.point1.appartientDroiteParDefinition(dteAntecedent) && vect.point2.appartientDroiteParDefinition(dteAntecedent))
          }
          default :
            return false
        }
      }
    }
  }
  return false
}

/* Abandonné version 6.9.1
CDroiteImage.prototype.estParalleleParDefinition = function (dte) {
  return (dte === this) ||
    (((this.transformation.natureTransformation() & CTransformation.tteTransImDtePar) !== 0) &&
    (this.antecedent.estParalleleParDefinition(dte) || dte.estParalleleParDefinition(this.antecedent)))
}
 */

CDroiteImage.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CDroite.prototype.depDe4Rec.call(this, p) ||
    this.antecedent.depDe4Rec(p) || this.transformation.depDe4Rec(p))
}

/**
 * Fonction qui renvoie true seulement pour les objets qui sont des objets images d'un autre par une transformation
 * @returns {boolean}
 */
CDroiteImage.prototype.estImageParTrans = function () {
  return true
}

CDroiteImage.prototype.estDefiniParObjDs = function (listeOb) {
  return this.antecedent.estDefPar(listeOb) &&
  this.transformation.estDefPar(listeOb)
}
