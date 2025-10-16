/*
 * Created by yvesb on 30/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroSuiteMacros from '../objets/CMacroSuiteMacros'
import { getStr } from '../kernel/kernel'
import MacSuiteMacDlg from '../dialogs/MacSuiteMacDlg'
export default CMacroSuiteMacros

CMacroSuiteMacros.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo135') + ' ' + this.listeAssociee.listeNoms()
}

CMacroSuiteMacros.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacSuiteMacDlg(app, this, true, callBack1, callBack2)
}

// Optimisé version 6.4.1
CMacroSuiteMacros.prototype.peutEtreMacroFinBoucle = function () {
  for (let i = 0; i < this.listeAssociee.longueur(); i++) {
    if (!this.listeAssociee.get(i).peutEtreMacroFinBoucle()) return false
  }
  return true
}

/**
 * Fonction qui renverra true si la macro est une macro avec liste à laquelle on peut ajouter ou retirer des objets
 * @returns {boolean}
 */
CMacroSuiteMacros.prototype.ajoutOuRetraitObjetsPossible = function () {
  return false
}

// Optimisé version 6.4.1
CMacroSuiteMacros.prototype.utilisablePourDemarrage = function () {
  for (let i = 0; i < this.listeAssociee.longueur(); i++) {
    if (!this.listeAssociee.get(i).utilisablePourDemarrage()) return false
  }
  return true
}
