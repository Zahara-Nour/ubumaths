/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CVariableBornee from '../objets/CVariableBornee'
import { chaineNombre, getStr } from '../kernel/kernel'
import VariableDlg from '../dialogs/VariableDlg'
export default CVariableBornee

CVariableBornee.prototype.info = function () {
  return this.nomCalcul + ' : ' + getStr('Variable')
}

CVariableBornee.prototype.infoHist = function () {
  return this.nomCalcul + ' : ' + getStr('Variable') + '\n' +
    getStr('chinfo77') + ' ' + chaineNombre(this.valeurMini, 12) + '\n' +
    getStr('chinfo78') + ' ' + chaineNombre(this.valeurMaxi, 12) + '\n' +
    getStr('chinfo79') + ' ' + chaineNombre(this.valeurPas, 12) + '\n' +
    getStr('chinfo80') + ' ' + chaineNombre(this.valeurActuelle, 12)
}

CVariableBornee.prototype.modifiableParMenu = function () {
  return true
}

CVariableBornee.prototype.modifDlg = function (app, callBack1, callBack2) {
  new VariableDlg(app, this, true, callBack1, callBack2)
}

CVariableBornee.prototype.onClickEgal = function () {
  const list = this.listeProprietaire
  const app = list.documentProprietaire.app
  // Si app n'est pas défini c'est qu'on est dans un mtgAppLecteur sur lequel l'API a été appliquée
  if (!app) {
    this.onClickEgalBase()
    return
  }
  const self = this
  new VariableDlg(app, this, true, function () {
    list.initialiseDependances()
    list.positionneDependantsDe(false, app.dimf, self)
    list.metAJourObjetsDependantDe(self)
    // Il faut rappeler positionneDependantsDe avec un dernier paramètre à true
    // Pour que ce soit par positionneFull qui soit appelé pour chaque élément dépendant de el car si, par exemple,
    // un ematrice avait des termes dépendants d'une dérivée partielle qui vient d'être recalculée
    // par metAJourObjetsDependantDe ses termes doivent tous être recalculés
    // list.positionneDependantsDe(false, app.dimf, el) // Il faut rappeler positionneDependantsDe pour par exemple recalculer les dérivées
    list.positionneDependantsDe(false, app.dimf, self, true) // Il faut rappeler positionneDependantsDe pour par exemple recalculer les dérivées
    list.setDependantLatexToBeUpdated(self) // Le deuxième positionnement des CLaTeX dépendant de el a mis leur membre isToBeUpdated
    // à false et il faut le remettre à true pour qu'ils soient réaffichés
    // car ces dérivées n'ont été mises à jour que dans metAJourObjetsDependantDe
    list.updateDependants(self, app.svgFigure, app.doc.couleurFond, true)
    self.updateDisplay()
  }, null)
}

CVariableBornee.prototype.estDefiniParObjDs = function (listeOb) {
  // Modifié version 6.3.0 car si un objet final dépend d'une variable qui n'est pas un objet source, elle sera rajoutée
  // aux éléments intermédiaires.
  // return (listeOb.contains(this));
  return true
}
