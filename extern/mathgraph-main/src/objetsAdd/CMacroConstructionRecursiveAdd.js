/*
 * Created by yvesb on 30/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroConstructionRecursive from '../objets/CMacroConstructionRecursive'
import MacConsRecDlg from '../dialogs/MacConsRecDlg'
import { getStr } from '../kernel/kernel'
export default CMacroConstructionRecursive

CMacroConstructionRecursive.prototype.infoHist = function () {
  let i
  const list = this.listeAssociee
  const proto = this.tableProto[0]
  let ch = this.getName() + ' : ' + getStr('MacConsRecDlg1') + ' ' + getStr('of') +
    ' ' + proto.nom + '\n'
  if (this.nbSources !== 0) {
    ch += getStr('ObjSrc')
    const nbsc = proto.nbSrcCal()
    if (nbsc !== 0) {
      for (i = 0; i < nbsc; i++) {
        ch += list.get(i).getNom() + ', '
      }
    }
    for (i = nbsc; i < proto.nbObjSources; i++) {
      ch += list.get(i).nom + ', '
    }
    ch = ch.substring(0, ch.lastIndexOf(', '))
  }
  return ch
}

CMacroConstructionRecursive.prototype.utilisablePourDemarrage = function () {
  return true
}

CMacroConstructionRecursive.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacConsRecDlg(app, this, true, callBack1, callBack2)
}

CMacroConstructionRecursive.prototype.depDeProto = function (proto) {
  for (let j = 0; j <= this.profondMax; j++) {
    if (this.tableProto[j] === proto) return true
  }
  return false
}
