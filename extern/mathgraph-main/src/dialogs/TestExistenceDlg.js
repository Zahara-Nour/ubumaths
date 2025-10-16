/*
 * Created by yvesb on 23/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import NatCal from '../types/NatCal'
import MtgDlg from './MtgDlg'
//
import $ from 'jquery'
import 'jquery-textrange'
import EditeurNomCalcul from './EditeurNomCalcul'
import { getMtgInput } from './dom'
export default TestExistenceDlg

/**
 * Boîte de dialogue servant à créer un test d'existence d'une valeur
 * @param {MtgApp} app L'application associée
 * @param obj Le complexe associé
 * @param modification true si on modifie un objet déjà créé
 * @param callBackOK function appelée si l'utilisateur valide ou null
 * @param callBackCancel Fonction appelée si l'utilisateur ferme la boîte de dialogue ou null
 * @constructor
 */
function TestExistenceDlg (app, obj, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'TestExistence', callBackOK, callBackCancel)
  this.obj = obj
  this.modification = modification
  const self = this
  const list = app.listePr
  const indmax = modification ? list.indexOf(obj) - 1 : -1
  this.inf = list.listeParNatCal(app, NatCal.NTteValROuC, indmax)
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
  $(label).html(getStr('NomCalcul') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input = getMtgInput({
    id: 'mtginput'
  })
  td.appendChild(input)
  if (modification) {
    $(input).val(obj.nomCalcul)
    $(input).attr('disabled', true)
  }

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabCentre = ce('table')
  tr.appendChild(tabCentre)
  td = ce('td')
  tabCentre.appendChild(td)
  const caption = ce('caption', {
    class: 'mtgCaption',
    style: 'width:180px'
  })
  $(caption).html(getStr('TestExistence') + ' ' + getStr('of') + ' :')
  td.appendChild(caption)

  this.select = ce('select', {
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
    if (modification ? (this.inf.pointeurs[i] === obj.valeurAssociee) : i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.select.appendChild(option)
  }
  // En bas du tableau un champ d'info sur le complexe
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabBas = ce('table')
  tr.appendChild(tabBas)
  tr = ce('tr')
  tabBas.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('ChoixValeurDlg3'))
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
  this.create('TestExistence', 450)
}

TestExistenceDlg.prototype = new MtgDlg()

TestExistenceDlg.prototype.onSelectChange = function () {
  const ind = this.select.selectedIndex
  if (ind === -1) return
  const el = this.inf.pointeurs[ind]
  $('#mtginfo').text(el.infoHist())
}

TestExistenceDlg.prototype.OK = function () {
  const app = this.app
  // if (app.lastDlgId() !== this.id) return;
  // On regarde si l'entrée est correcte sur le plan syntaxique
  if (this.editeurName.validate()) {
    if (!this.modification) this.obj.nomCalcul = $('#mtginput').val()
    this.obj.valeurAssociee = this.inf.pointeurs[this.select.selectedIndex]
    if (!this.modification) app.ajouteElement(this.obj)
    app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : 'TestExistence')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  }
}

TestExistenceDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.select : 'mtginput')
}
