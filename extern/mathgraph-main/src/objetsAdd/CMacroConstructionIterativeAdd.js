/*
 * Created by yvesb on 30/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroConstructionIterative from '../objets/CMacroConstructionIterative'
import { getStr } from '../kernel/kernel'
import MacConsIterDlg from '../dialogs/MacConsIterDlg'
export default CMacroConstructionIterative

CMacroConstructionIterative.prototype.infoHist = function () {
  let i
  const list = this.listeAssociee
  const proto = this.proto
  let ch = this.getName() + ' : ' + getStr('MacConsItDlg1') + ' ' + getStr('of') +
      ' ' + proto.nom + '\n'
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
  return ch
}

CMacroConstructionIterative.prototype.utilisablePourDemarrage = function () {
  return true
}

CMacroConstructionIterative.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacConsIterDlg(app, this, true, callBack1, callBack2)
}

CMacroConstructionIterative.prototype.depDeProto = function (proto) {
  return this.proto === proto
}
