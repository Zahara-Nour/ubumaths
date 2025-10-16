/*
 * Created by yvesb on 02/10/2016.
 */
import { addImg, ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import CValeur from '../objets/CValeur'
import CValeurAngle from '../objets/CValeurAngle'
import EditeurvaleurReelle from './EditeurValeurReelle'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import { getMtgInput } from './dom'
import ChoixAngleUsuelDlg from './ChoixAngleUsuelDlg'

export default SimilitudeDlg

/**
 * Dialogue de choix d'angle et rapport d'une similitude
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param sim La similitude à changer
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 */
function SimilitudeDlg (app, sim, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'simDlg', callBackOK, callBackCancel)
  const self = this
  this.sim = sim
  this.modification = modification
  const list = app.listePr
  // Un CValeur pour stocker la valeur de l'angle avant vérification
  this.valeur = new CValeurAngle(list, 0)
  // Un CValeur pour stocker la valeur du rapport avant vérification
  this.valeurRap = new CValeur(list, 1)
  const tab = ce('table')
  this.appendChild(tab)
  let tr = ce('tr')
  tab.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr('Angle') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const inputAngle = getMtgInput({
    id: 'mtginputAng',
    list: 'mtgAngleList'
  })
  td.appendChild(inputAngle)
  td = ce('td')
  tr.appendChild(td)
  td.style.padding = '1px'
  addImg(td, 'dropdown')
  td.onclick = function () {
    new ChoixAngleUsuelDlg(app, inputAngle, list.uniteAngle)
  }
  const indmax = modification ? app.listePr.indexOf(sim) - 1 : list.longueur() - 1
  const paneBoutonsValFoncAng = new PaneBoutonsValFonc(this.app, this, inputAngle, true, indmax)
  tab.appendChild(paneBoutonsValFoncAng)
  this.editorAngle = new EditeurvaleurReelle(app, inputAngle, indmax, this.valeur, null)

  tr = ce('tr')
  tab.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('Rapport') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const inputRapport = getMtgInput({
    id: 'mtginputRap'
  })
  td.appendChild(inputRapport)
  inputRapport.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  const paneBoutonsValFoncRap = new PaneBoutonsValFonc(this.app, this, inputRapport, true, indmax)
  tab.appendChild(paneBoutonsValFoncRap)
  this.editorRapport = new EditeurvaleurReelle(app, inputRapport, indmax, this.valeurRap, null)
  if (modification) {
    $(inputRapport).val(replaceSepDecVirg(app, sim.rapport.calcul))
    $(inputAngle).val(replaceSepDecVirg(app, sim.angle.calcul))
  }
  this.create('Sim', 400)
}

SimilitudeDlg.prototype = new MtgDlg()

SimilitudeDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginputAng')
}

SimilitudeDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  // On regarde si l'entrée est correcte sur le plan syntaxique
  const selang = $('#mtginputAng')
  const selrap = $('#mtginputRap')
  if (this.editorAngle.validate(selang.val())) {
    if (this.editorRapport.validate(selrap.val())) {
      this.sim.angle = this.valeur
      this.sim.rapport = this.valeurRap
      if (this.callBackOK !== null) this.callBackOK()
      // this.app.outilActif.actionApresDlg();
      this.destroy()
    } else selrap.focus()
  } else selang.focus()
}
