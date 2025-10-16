/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'

export default AddSupObjMacDlg

/**
 * Boîte de dialogue proposant une liste formée de toutes  les macros auxquelles on peut ajouter
 * ou supprimer des objets.
 * @param {MtgApp} app  L'application MtgApp propriétaire
 * @param bAuMoinsUnElt Si true seules les macro ayant plus d'un objet dans la liste associée sont accessibles.
 * @param title Le titre de la boîte de dialogue
 * @param callBackOK Fonction de callBack à appeler après validation par OK et rpenant comme paramètre la macro sélectionnée.
 * @constructor
 * @extends MtgDlg
 */
function AddSupObjMacDlg (app, bAuMoinsUnElt, title, callBackOK) {
  MtgDlg.call(this, app, 'AddSupObjMacDlg', callBackOK)
  const self = this
  const list = app.listePr
  this.inf = list.listeMacrosAvecListeModif(bAuMoinsUnElt)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  let label = ce('label')
  tr.appendChild(label)
  $(label).html(getStr('Macro') + ':')
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.select = ce('select', {
    size: 8, // Le nombre de lignes visibles par défaut
    style: 'width:300px'
  })
  this.select.onchange = function () {
    self.onSelectChange()
  }

  tr.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    option.ondblclick = function () { self.OK() }
    this.select.appendChild(option)
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  label = ce('label')
  tr.appendChild(label)
  $(label).html(getStr('Info') + ' :')

  const textarea = ce('textarea', {
    id: 'ta',
    cols: 60,
    rows: 5,
    disabled: 'true'
  })
  tr.appendChild(textarea)
  this.onSelectChange()
  this.create(title, 500)
}

AddSupObjMacDlg.prototype = new MtgDlg()

AddSupObjMacDlg.prototype.onSelectChange = function () {
  $('#ta').val(this.inf.pointeurs[this.select.selectedIndex].infoHist())
}

AddSupObjMacDlg.prototype.OK = function () {
  this.destroy()
  this.callBackOK(this.inf.pointeurs[this.select.selectedIndex])
}
