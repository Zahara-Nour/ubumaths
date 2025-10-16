/*
 * Created by yvesb on 24/01/2017.
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
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import PaneListeReperes from './PaneListeReperes'
import AvertDlg from './AvertDlg'
import Pointeur from '../types/Pointeur'
import { getMtgInput } from '../dialogs/dom'
export default EqDroiteDlg

/**
 * Dialogue de choix d'angle de rotation
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param dte La droite dont le coefficient directeur doit être changé
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 * @param callBackOK null ou fonction de callBack à appeler après OK
 * @param callBackCancel null ou fonction de callBack à appeler après annumlation
 */
function EqDroiteDlg (app, dte, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'eqDroiteDlg', callBackOK, callBackCancel)
  const self = this
  this.dte = dte
  this.modification = modification
  const list = app.listePr
  const tab = ce('table')
  this.appendChild(tab)
  let tr = ce('tr')
  tab.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('EqDroite') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.input = getMtgInput({
    size: 24
  })
  td.appendChild(this.input)
  this.input.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  const indmax = modification ? list.indexOf(dte) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.input, true, indmax)
  tab.appendChild(paneBoutonsValFonc)
  tr = ce('tr')
  tab.appendChild(tr)
  this.paneListeRep = new PaneListeReperes(app, indmax)
  tr.appendChild(this.paneListeRep.getTab())
  if (modification) {
    $(this.input).val(replaceSepDecVirg(app, dte.equation, ['x', 'y']))
  }
  this.create('DtParEq', 500)
}

EqDroiteDlg.prototype = new MtgDlg()

EqDroiteDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.input)
}

EqDroiteDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const inderr = new Pointeur(0)
  // Si l'équation est correcte, this.verifieFormules se charge de modifier la droite
  const valid = this.dte.verifieFormules($(this.input).val(), inderr)
  if (valid) {
    this.input.demarquePourErreur()
    this.dte.rep = this.paneListeRep.getSelectedRep()
    if (this.callBackOK !== null) this.callBackOK()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
  } else {
    const col = inderr.getValue()
    $(this.input).textrange('setcursor', col)
    // $(this.input).focus();
    const self = this
    new AvertDlg(this.app, 'ErrSyntaxe', function () {
      self.input.focus()
      self.input.marquePourErreur()
    })
  }
}
