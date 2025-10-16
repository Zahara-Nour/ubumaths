/*
 * Created by yvesb on 31/12/2016.
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
import EditeurvaleurComplexe from './EditeurValeurComplexe'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import PaneListeReperes from './PaneListeReperes'
import { getMtgInput } from './dom'

export default PtParAffDlg

/**
 * Dialogue de choix de l'affixe d'un point défini par son affixe
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param {CPointParAffixe} point Le point par affice qui doit être changé
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 */
function PtParAffDlg (app, point, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'ptParAffDlg', callBackOK, callBackCancel)
  const self = this
  this.point = point
  this.modification = modification
  const list = app.listePr
  const tabprincipal = ce('table')
  this.appendChild(tabprincipal)
  const trprincipal = ce('tr')
  tabprincipal.appendChild(trprincipal)
  let td = ce('td')
  trprincipal.appendChild(td)

  const tab = ce('table')
  // this.appendChild(tab);
  td.appendChild(tab)
  const tr = ce('tr')
  tab.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('Affixe') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const inputAff = getMtgInput({
    id: 'mtginputAff'
  })
  td.appendChild(inputAff)
  inputAff.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  const indmax = modification ? list.indexOf(point) - 1 : list.longueur() - 1
  const paneBoutonsValFoncAff = new PaneBoutonsValFonc(this.app, this, inputAff, false, indmax) // false car on est en mode complexe
  tab.appendChild(paneBoutonsValFoncAff)
  this.editorAff = new EditeurvaleurComplexe(app, inputAff, indmax, point.affixe, null)

  if (modification) {
    $(inputAff).val(replaceSepDecVirg(app, point.affixe.calcul))
  }
  // On rajoute à droite un panneau pour le choix du repère
  td = ce('td')
  trprincipal.appendChild(td)
  this.paneListeReperes = new PaneListeReperes(this.app, indmax)
  td.appendChild(this.paneListeReperes.getTab())
  if (modification) this.paneListeReperes.selectRep(point.rep)
  this.create('PtParAff', 550)
}

PtParAffDlg.prototype = new MtgDlg()

PtParAffDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginputAff')
}

PtParAffDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  // On regarde si l'entrée est correcte sur le plan syntaxique
  const sel = $('#mtginputAff')
  if (this.editorAff.validate(sel.val())) {
    this.point.rep = this.paneListeReperes.getSelectedRep()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    if (this.callBackOK !== null) this.callBackOK()
    this.destroy()
  } else sel.focus()
}
