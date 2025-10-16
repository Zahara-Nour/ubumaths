/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CUniteyRep from '../objets/CUniteyRep'
import { chaineNombre, getStr } from '../kernel/kernel'
import InfoRepDlg from '../dialogs/InfoRepDlg'
export default CUniteyRep

CUniteyRep.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('UniteyRep') + ' ' + this.rep.getNom()
}

CUniteyRep.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('UniteyRep') + ' ' + this.rep.getNom()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.value, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CUniteyRep.prototype.modifDlg = function (app, callBack1, callBack2) {
  new InfoRepDlg(app, this, 3, true, callBack1, callBack2)
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CUniteyRep.prototype.genereNom = function () {
  CUniteyRep.ind++
  return 'uyrep' + CUniteyRep.ind
}
