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
import EditeurvaleurReelle from './EditeurValeurReelle'
import CValeurAngle from '../objets/CValeurAngle'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import { getMtgInput } from './dom'
import ChoixAngleUsuelDlg from './ChoixAngleUsuelDlg'

export default RotationDlg

/**
 * Dialogue de choix d'angle de rotation
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param rot La rotation dont l'angle doit être changé
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 */
function RotationDlg (app, rot, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'rotDlg', callBackOK, callBackCancel)
  const self = this
  this.rot = rot
  this.modification = modification
  const list = app.listePr
  // Un CValeurAng pour stocker la valeur choisie pour l'angle avant vérification
  this.valeur = new CValeurAngle(list, 0)
  const tab = ce('table')
  this.appendChild(tab)
  const tr = ce('tr')
  tab.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('Angle') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  /*
  var input = getMtgInput({
    id: "mtginput",
    list : "mtgAngleList"
  });
  */
  const input = getMtgInput({
    id: 'mtginput',
    list: 'mtgAngleList'
  })
  td.appendChild(input)
  input.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  td = ce('td')
  tr.appendChild(td)
  td.style.padding = '1px'
  addImg(td, 'dropdown')
  td.onclick = function () {
    new ChoixAngleUsuelDlg(app, input, list.uniteAngle)
  }

  const indmax = modification ? list.indexOf(rot) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, input, true, indmax)
  tab.appendChild(paneBoutonsValFonc)
  this.editor = new EditeurvaleurReelle(app, input, indmax, this.valeur, null)
  if (modification) {
    $(input).val(replaceSepDecVirg(app, rot.angle.calcul))
  }
  this.create('AngleRot', 400)
}

RotationDlg.prototype = new MtgDlg()

RotationDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}

RotationDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  // On regarde si l'entrée est correcte sur le plan syntaxique
  if (this.editor.validate()) {
    this.rot.angle = this.valeur
    if (this.callBackOK !== null) this.callBackOK()
    this.destroy()
    // this.app.outilActif.actionApresDlg();
  }
}
