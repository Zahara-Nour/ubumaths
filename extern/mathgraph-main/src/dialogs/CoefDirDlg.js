/*
 * Created by yvesb on 21/01/2017.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import EditeurvaleurReelle from './EditeurValeurReelle'
import CValeur from '../objets/CValeur'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import PaneListeReperes from './PaneListeReperes'
import { getMtgInput } from './dom'
export default CoefDirDlg

/**
 * Dialogue de choix de coefficient directeur d'une droite
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param dte La droite dont le coefficient directeur doit être changé
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 * @param callBackOK null ou fonction de callBack à appeler après OK
 * @param callBackCancel null ou fonction de callBack à appeler après annumlation
 */
function CoefDirDlg (app, dte, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'coefDirDlg', callBackOK, callBackCancel)
  const self = this
  this.dte = dte
  this.modification = modification
  const list = app.listePr
  // Un CValeur pour stocker la valeur choisie avant vérification
  this.valeurCoef = new CValeur(list, 1)
  const tab = ce('table')
  this.appendChild(tab)
  let tr = ce('tr')
  tab.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('CoefDir') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input = getMtgInput({
    id: 'mtginput'
  })
  td.appendChild(input)
  input.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  const indmax = modification ? list.indexOf(dte) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, input, true, indmax)
  tab.appendChild(paneBoutonsValFonc)
  tr = ce('tr')
  tab.appendChild(tr)
  this.paneListeRep = new PaneListeReperes(app, indmax)
  tr.appendChild(this.paneListeRep.getTab())
  if (modification) this.paneListeRep.selectRep(dte.rep)

  this.editor = new EditeurvaleurReelle(app, input, indmax, this.valeurCoef, null)
  if (modification) {
    $(input).val(replaceSepDecVirg(app, dte.m.calcul))
  }
  this.create('CoefDir', 450)
}

CoefDirDlg.prototype = new MtgDlg()

CoefDirDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}

CoefDirDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const sel = $('#mtginput')
  if (this.editor.validate(sel.val())) {
    this.dte.m = this.valeurCoef
    this.dte.rep = this.paneListeRep.getSelectedRep()
    if (this.callBackOK !== null) this.callBackOK()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
  } else sel.focus()
}
