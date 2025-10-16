/*
 * Created by yvesb on 13/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import ButtonTool from './ButtonTool'
import OutilAddDlg from '../dialogs/OutilAddDlg'
import OutilAddByListDlg from '../dialogs/OutilAddByListDlg'

export default ButtonToolAdd

/**
 * Bouton rajouté à l'extrémité droite de certains menus déroulants.
 * Quand on clique sur un de ces boutons, une boîte de dialogue propose d'activer des outils supplémentaires (à usage unique).
 * @param {MtgApp} app  L'application proprétaire
 * @param {boolean} byList true si le choix de l'outil se fait dans une liste (création de macros)
 * @param {Outil} outilAdd  Un outil du type OutilAdd qui contient un tableau contenant la liste des outils à proposer
 * @param {string} tip le tip au survol de la souris
 * @param {string} title  Le titre de la boîte de dialogue quand on clique sur le bouton
 * @param {string} [iconName=null] null ou le nom de l'icône qu"on souhaite associer
 * @constructor
 * @extends Button
 */
function ButtonToolAdd (app, byList, outilAdd, tip, title = 'ChoixOutil', iconName = null) {
  ButtonTool.call(this, app, iconName || 'Add', 'left', false, 0, tip)
  this.byList = byList
  this.outilAdd = outilAdd
  this.title = title
}

ButtonToolAdd.prototype = new ButtonTool()

ButtonToolAdd.prototype.singleClickAction = function () {
  const nameEditor = this.app.nameEditor
  // Si un éditeur de nom de point ou droite est en cours, on le masque à ce niveau
  if (nameEditor.isVisible) nameEditor.montre(false)
  this.app.unFoldExpandableBars()
  // Tous les outils lancés par l'icône d'outils supplémentaires n'ont pas d'icône et activent l'outil de capture après
  // qu'ils aient été utilisés. Si un autre outil était actif avant l'utilisation d'un tel outil, il faut donc le désactiver
  // pour l'outi de capture
  this.app.activeOutilCapt()
  // On ouvre une boîte de dialogue présentant les outils suppémentaires dont le nom est inclus dans toolArray
  if (this.byList) new OutilAddByListDlg(this.app, this.outilAdd, this.title)
  else new OutilAddDlg(this.app, this.outilAdd, this.title)
}

ButtonToolAdd.prototype.doubleClickAction = function () {
  this.singleClickAction()
}
