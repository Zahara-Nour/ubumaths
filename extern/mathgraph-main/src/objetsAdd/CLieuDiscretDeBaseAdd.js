/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLieuDiscretDeBase from '../objets/CLieuDiscretDeBase'
import { distancePointPoint, getStr } from '../kernel/kernel'
import CElementGraphique from '../objets/CElementGraphique'
import LieuDlg from '../dialogs/LieuDlg'
export default CLieuDiscretDeBase

CLieuDiscretDeBase.prototype.depDe4Rec = function (p) {
  return CElementGraphique.prototype.depDe4Rec.call(this, p) || this.pointATracer.depDe4Rec(p)
}

CLieuDiscretDeBase.prototype.distancePoint = function (xp, yp, masquage, distmin) {
  if (!this.existe || (masquage && this.masque)) return -1
  else {
    for (let i = 0; i <= this.indiceDernierPointTrace; i++) {
      const d = distancePointPoint(xp, yp, this.absPoints[i], this.ordPoints[i])
      if (d < distmin) return d
    }
    return -1
  }
}

CLieuDiscretDeBase.prototype.changeCaracteristiques = function () {
  this.absPoints = new Array(this.nombreDePoints)
  this.ordPoints = new Array(this.nombreDePoints)
}

CLieuDiscretDeBase.prototype.modifiableParMenu = function () {
  return true
}

CLieuDiscretDeBase.prototype.modifDlg = function (app, callBack1, callBack2) {
  new LieuDlg(app, this, true, callBack1, callBack2)
}

// Modifié par rapport à la version Java
/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CLieuDiscretDeBase.prototype.genereNom = function () {
  CLieuDiscretDeBase.ind++
  return getStr('rlieud') + CLieuDiscretDeBase.ind
}

CLieuDiscretDeBase.prototype.estDefiniParObjDs = function (listeOb) {
  return this.pointATracer.estDefPar(listeOb)
}
