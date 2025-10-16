/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import { getMtgInput } from './dom'
import AvertDlg from './AvertDlg'
import $ from 'jquery'
export default ModifConstDlg

/**
 * Boîte de dialogue servant à modifier un prototype de la figure
 * @param {MtgApp} app L'application MtgApp propriétaire
 * @param proto Le prototype à modifier
 * @param callBackOK Fonction de callBack à appeler si l'utilisateur valide par OK
 * @param callBackCancel Fonction de callBack à appeler si l'utilisateur annule
 * @constructor
 */
function ModifConstDlg (app, proto, callBackOK, callBackCancel = null) {
  MtgDlg.call(this, app, 'ModifConstDlg', callBackOK, callBackCancel)
  this.proto = proto
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const div = ce('div')
  tr.appendChild(div)
  let label = ce('label')
  div.appendChild(label)
  $(label).html(getStr('NomConst'))
  this.inputName = getMtgInput({
    id: 'nom',
    size: 36
  })
  $(this.inputName).val(proto.nom)
  div.appendChild(this.inputName)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('Info'))
  tr.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const inputinf = ce('textarea', {
    id: 'comm', // Ne pas utiliser "ta" comme id car déjà utilisé dans le dialogue appelant
    cols: 70,
    rows: 12
  })
  tr.appendChild(inputinf)
  $(inputinf).val(proto.commentaire)
  this.create(getStr('infConst'), 600)
}

ModifConstDlg.prototype = new MtgDlg()

ModifConstDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.inputName)
}

ModifConstDlg.prototype.OK = function () {
  const nom = $('#nom').val()
  if (nom !== '') {
    this.proto.nom = nom
    this.proto.commentaire = $('#comm').val()
    this.destroy()
    this.callBackOK()
  } else {
    const self = this
    new AvertDlg(this.app, 'Incorrect', function () {
      self.inputName.marquePourErreur()
      self.inputName.focus()
    })
  }
}
