/*
 * Created by yvesb on 01/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
//
import $ from 'jquery'
import 'jquery-textrange'
import EditeurNomCalcul from './EditeurNomCalcul'
import { getMtgInput } from './dom'

export default DeriveeDlg

/**
 * Boîte de dialogue permettant de créer la dérivée d'une fonction pour laquelle la dérivée n'a pas
 * été déjà calculée
 * @param {MtgApp} app
 * @param der La dérivée à modifier
 * @param modification true si on modifie une dérivée déjà présente dans la figure
 * @param callBackOK null ou fonction de callBack à appeler après OK
 * @param callBackCancel null ou fonction de callBack à appeler après annulation
 * @constructor
 */
function DeriveeDlg (app, der, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'DeriveeDlg', callBackOK, callBackCancel)
  this.der = der
  this.modification = modification
  const self = this
  const list = app.listePr
  const indmax = modification ? list.indexOf(der) - 1 : -1
  this.inf = list.listeFonctionsReellesSansDerivees(indmax, modification ? der.fonctionAssociee : null)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr('DerDlg1'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input = getMtgInput({
    id: 'mtginput'
  })
  input.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  td.appendChild(input)
  if (modification) {
    $(input).val(der.nomCalcul)
    $(input).attr('disabled', true)
  }
  tr = ce('tr')
  tabHaut.appendChild(tr)
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('DerDlg2'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.select = ce('SELECT', {
    size: 8, // Le nombre de lignes visibles par défaut
    style: 'width:180px'
  })
  this.select.onchange = function () {
    self.onSelectChange()
  }
  td.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (modification ? (this.inf.pointeurs[i] === der.fonctionAssociee) : i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.select.appendChild(option)
  }
  // En bas du tableau un champ d'info sur la fonction sélectionnée
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabBas = ce('table')
  tr.appendChild(tabBas)
  tr = ce('tr')
  tabBas.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('InfoFonc'))
  tr.appendChild(label)
  tr = ce('tr')
  tabBas.appendChild(tr)
  const inputinf = ce('textarea', {
    id: 'mtginfo',
    disabled: 'true',
    cols: 40,
    rows: 4
  })
  tr.appendChild(inputinf)
  this.editeurName = new EditeurNomCalcul(app, !this.modification, input)
  this.onSelectChange()
  this.create('Der', 450)
}

DeriveeDlg.prototype = new MtgDlg()

DeriveeDlg.prototype.onSelectChange = function () {
  const ind = this.select.selectedIndex
  if (ind === -1) return
  const el = this.inf.pointeurs[ind]
  $('#mtginfo').text(el.infoHist())
}

DeriveeDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.select : 'mtginput')
}

DeriveeDlg.prototype.OK = function () {
  const app = this.app
  // if (app.lastDlgId() !== this.id) return;
  if (this.editeurName.validate()) {
    if (!this.modification) this.der.nomCalcul = $('#mtginput').val()
    this.der.fonctionAssociee = this.inf.pointeurs[this.select.selectedIndex]
    if (!this.modification) app.ajouteElement(this.der)
    app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : 'Der')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  }
}
