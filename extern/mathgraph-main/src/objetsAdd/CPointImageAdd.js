/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointImage from '../objets/CPointImage'
import CPt from '../objets/CPt'
import CTransformation from '../objets/CTransformation'
import { getStr } from '../kernel/kernel'
export default CPointImage

CPointImage.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo18') + ' ' + this.antecedent.getName() + ' ' + getStr('par') +
    ' ' + this.transformation.complementInfo()
}

CPointImage.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) ||
    this.antecedent.depDe4Rec(p) || this.transformation.depDe4Rec(p))
}

CPointImage.prototype.antecedentDirect = function () {
  return this.transformation
}

CPointImage.prototype.modifiableParMenu = function () {
  return !this.estElementFinal && this.transformation.imageModifiableParMenu()
}

/* Version 6.9.1 : C'est juste la droite qui dit si elle contient le point et c'est fait dans CPt.prototype.appartientDroiteParDefinition
Pour éviter les appels récursifs ce sont les droites ou les cercles qui doivent dire si, par propriété, un point image
par une transformation leur appartient
CPointImage.prototype.appartientDroiteParDefinition = function (droite) {
  // Ligne suivante modifié version 6.9.1
  // if (CPt.prototype.appartientDroiteParDefinition.call(this, droite)) return true
  if (droite.contientParDefinition(this)) return true
  let trans, vect
  const antecedent = this.antecedent
  const natTrans = this.transformation.natureTransformation()
  // Si la transormation transformme une droite en une droite paralèle, on regarde si l'antécédent appartient à une droite parallèle à droite
  if (((natTrans & CTransformation.tteTransImDtePar) !== 0) && (this.listeProprietaire.appDteParParDef(antecedent, droite))) return true
  switch (natTrans) {
    case CTransformation.homothetie :
    case CTransformation.symetrieCentrale :
      return this.transformation.centre.appartientDroiteParDefinition(droite) && antecedent.appartientDroiteParDefinition(droite)
    case CTransformation.translation :
      trans = this.transformation
      return (this.antecedent.appartientDroiteParDefinition(droite) && this.listeProprietaire.sontParDefinitionSurParallele(trans.or, trans.ex, droite)) ||
        (trans.ex.appartientDroiteParDefinition(droite) && this.listeProprietaire.sontParDefinitionSurParallele(antecedent, trans.or, droite))
    case CTransformation.translationParVect :
      vect = this.transformation.vect
      return (this.antecedent.appartientDroiteParDefinition(droite) && this.listeProprietaire.sontParDefinitionSurParallele(vect.point1, vect.point2, droite)) ||
        (vect.point2.appartientDroiteParDefinition(droite) && this.listeProprietaire.sontParDefinitionSurParallele(antecedent, vect.point1, droite))

    default : return false
  }
}
 */

CPointImage.prototype.appartientCercleParDefinition = function (cercle) {
  if (CPt.prototype.appartientCercleParDefinition.call(this, cercle)) return true
  const antecedent = this.antecedent
  const natTrans = this.transformation.natureTransformation()
  const className = cercle.className
  if ((natTrans === CTransformation.rotation) && (className === 'CCercleOA' || className === 'CCercleOR' || className === 'CCercleOAB')) {
    return (this.transformation.centre === cercle.o) && antecedent.appartientCercleParDefinition(cercle)
  } else return false
}

/**
 * Fonction qui renvoie true seulement pour les objets qui sont des objets images d'un autre par une transformation
 * @returns {boolean}
 */
CPointImage.prototype.estImageParTrans = function () {
  return true
}

CPointImage.prototype.estDefiniParObjDs = function (listeOb) {
  return this.antecedent.estDefPar(listeOb) &&
  this.transformation.estDefPar(listeOb)
}
