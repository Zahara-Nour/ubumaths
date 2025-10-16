/*
 * Created by yvesb on 20/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCb from '../objets/CCb'
export default CCb

CCb.prototype.depDe4Rec = function (p) {
  this.elementTestePourDependDePourRec = p
  return false
}

CCb.prototype.memDep4Rec = function (resultat) {
  this.dependDeElementTestePourRec = resultat
  return resultat
}

/**
 * Sert à savoir si un objet est défini uniquement par des objets figurant
 * dans une liste passée en paramètre. A redéfinir pour les descendants
 * @returns {boolean}
 */
CCb.prototype.estDefiniParObjDs = function () {
  return true
}

// Ajout version 6.3.0 pour les créations de constructions.
CCb.prototype.estConstantPourConst = function () {
  return this.estConstant()
}
