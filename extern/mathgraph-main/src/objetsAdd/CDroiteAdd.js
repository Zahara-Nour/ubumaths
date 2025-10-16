import CDroite from 'src/objets/CDroite'
import CTransformation from 'src/objets/CTransformation'
import { getStr } from '../kernel/kernel'
export default CDroite

/**
 * Fonction renvoyant la nature de l'objet (par exemple point, droite, cercle)
 * @returns {string}
 */
CDroite.prototype.getTypeName = function () {
  return getStr('Dte')
}

/**
 * Fonction  servant à savoir si un point
 * est par définition sur une droite. Renverra true par exemple
 * si la droite est définie par deux points et le point est un de ces deux points
 * ou si le point est lié à la droite
 * @param {CPt} po
 * @returns {boolean}
 **/
CDroite.prototype.contientParDefinition = function (po) {
  if (po.estPointImage()) {
    const trans = po.transformation
    const antecedent = po.antecedent
    const natTrans = trans.natureTransformation()
    switch (natTrans) {
      case CTransformation.homothetie :
      case CTransformation.symetrieCentrale :
        return antecedent.appartientDroiteParDefinition(this) && trans.centre.appartientDroiteParDefinition(this)
      case CTransformation.translation :
        return antecedent.appartientDroiteParDefinition(this) && trans.or.appartientDroiteParDefinition(this) &&
          trans.ex.appartientDroiteParDefinition(this)
      case CTransformation.translationParVect: {
        const vect = trans.vecteurTrans
        return antecedent.appartientDroiteParDefinition(this) && vect.point1.appartientDroiteParDefinition(this) &&
          vect.point2.appartientDroiteParDefinition(this)
      }
    }
  }
  return false
}
