/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointLieBipoint from '../objets/CPointLieBipoint'
import CPt from '../objetsAdd/CPtAdd'
export default CPointLieBipoint

CPointLieBipoint.prototype.infoHist = function () {
  return this.getName() + ' : ' + this.ptBipoint.info()
}

CPointLieBipoint.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) ||
    this.ptBipoint.depDe4Rec(p))
}

CPointLieBipoint.prototype.antecedentDirect = function () {
  return this.ptBipoint
}

// Attention : Nom différentié par rapport à la version Java
CPointLieBipoint.prototype.appartientDroiteParDefinition = function (droite) {
  // Modifié version 6.9.1
  // CPt.prototype.appartientDroiteParDefinition.call renvoie true si la droite contient this par définition
  return this.ptBipoint.estDefiniPar(droite) || CPt.prototype.appartientDroiteParDefinition.call(this, droite)
}
// Attention : Nom différentié par rapport à la verrsion Java
CPointLieBipoint.prototype.appartientCercleParDefinition = function (cercle) {
  // Modifié version 6.9.1
  // CPt.prototype.appartientCercleParDefinition.call renvoie true si le cercle contient this par définition
  return this.ptBipoint.estDefiniPar(cercle) || CPt.prototype.appartientCercleParDefinition.call(this, cercle)
}

CPointLieBipoint.prototype.estDefiniParObjDs = function (listeOb) {
  return this.ptBipoint.estDefiniParObjDs(listeOb)
}
