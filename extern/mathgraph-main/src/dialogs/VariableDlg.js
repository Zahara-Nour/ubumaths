/*
 * Created by yvesb on 14/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { chaineNombre, getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import EditeurvaleurReelle from './EditeurValeurReelle'
import $ from 'jquery'
import EditeurNomCalcul from './EditeurNomCalcul'
import CValeur from '../objets/CValeur'
import AvertDlg from './AvertDlg'
import { getMtgInput } from './dom'

export default VariableDlg

/**
 * Dialogue de création ou modification d'une variable
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param va La variable à modifier
 * @param callBackOK : Fonction de callBack à appeler aorès clic sur OK
 * @param callBackCancel : Fonction de callBack à appeler aorès clic sur Cancel
 * @param modification {boolean} : true si le dialogue est ouvert pour modifier une variable déjà existante
 */
function VariableDlg (app, va, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'calculdlg', callBackOK, callBackCancel)
  this.va = va
  this.modification = modification
  const list = app.listePr
  const self = this
  // Les formules obtenues pour les valeur mini, maxi, le pas et la valeur actuelle seront renvoyées dans un CValeur
  this.valMin = new CValeur(list)
  this.valMax = new CValeur(list)
  this.valPas = new CValeur(list)
  this.valAct = new CValeur(list)

  const tab = ce('table')
  this.appendChild(tab)
  let tr = ce('tr')
  tab.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr('NomVar') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  /*
  this.inputName = ce("input", {
    type: "text",
  });
  */
  this.inputName = getMtgInput()
  td.appendChild(this.inputName)

  tr = ce('tr')
  tab.appendChild(tr)
  td = ce('td')
  label = ce('label')
  $(label).html(getStr('ValMin'))
  td.appendChild(label)
  tr.appendChild(td)
  td = ce('td')
  tr.appendChild(td)
  this.inputValMin = getMtgInput()
  td.appendChild(this.inputValMin)
  this.editeurValMin = new EditeurvaleurReelle(app, this.inputValMin, 0, this.valMin, null)

  tr = ce('tr')
  tab.appendChild(tr)
  td = ce('td')
  label = ce('label')
  $(label).html(getStr('ValMax'))
  td.appendChild(label)
  tr.appendChild(td)
  td = ce('td')
  tr.appendChild(td)
  this.inputValMax = getMtgInput()
  td.appendChild(this.inputValMax)
  this.editeurValMax = new EditeurvaleurReelle(app, this.inputValMax, 0, this.valMax, null)

  tr = ce('tr')
  tab.appendChild(tr)
  td = ce('td')
  label = ce('label')
  $(label).html(getStr('ValPas'))
  td.appendChild(label)
  tr.appendChild(td)
  td = ce('td')
  tr.appendChild(td)
  this.inputValPas = getMtgInput()
  td.appendChild(this.inputValPas)
  this.editeurValPas = new EditeurvaleurReelle(app, this.inputValPas, 0, this.valPas, null)

  tr = ce('tr')
  tab.appendChild(tr)
  td = ce('td')
  label = ce('label')
  $(label).html(getStr('ValAct'))
  td.appendChild(label)
  tr.appendChild(td)
  td = ce('td')
  tr.appendChild(td)
  this.inputValAct = getMtgInput()
  td.appendChild(this.inputValAct)
  this.inputValAct.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }

  this.editeurValAct = new EditeurvaleurReelle(app, this.inputValAct, 0, this.valAct, null)

  tr = ce('tr')
  tab.appendChild(tr)
  label = ce('label', {
    for: 'cbdlg'
  })
  $(label).html(getStr('DlgAss'))
  tr.appendChild(label)
  this.cbDlgAss = ce('input', {
    id: 'cbdlg',
    type: 'checkbox'
  })
  label.appendChild(this.cbDlgAss)

  if (modification) {
    $(this.inputName).val(va.nomCalcul)
    $(this.inputName).attr('disabled', true)
    $(this.inputValMin).val(va.chaineValeurMini)
    $(this.inputValMax).val(va.chaineValeurMaxi)
    $(this.inputValPas).val(va.chaineValeurPas)
    $(this.inputValAct).val(chaineNombre(va.valeurActuelle, 12))
    if (va.dialogueAssocie) $('#cbdlg').attr('checked', 'checked')
  }

  this.editeurName = new EditeurNomCalcul(app, !modification, this.inputName)
  this.create('Variable', 500)
}

VariableDlg.prototype = new MtgDlg()

VariableDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this)
  const self = this
  setTimeout(function () { // Ne marche pas sans un setTimeOut
    if (self.modification) {
      self.inputValAct.focus()
      self.inputValAct.select()
    } else self.inputName.focus() // Pour que le focus soit donné à l'éditeur au départ ou quand un  message d'erreur est affiché
  }, 0)
}

VariableDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  // var time = Date.now();
  // if (time - this.timeStart < MtgDlg.delay) return; // Moins d'une seconde dans doute mauvais endroit de clic sur un bouton
  const app = this.app
  const self = this
  // On regarde si l'entrée est correcte sur le plan syntaxique
  if (this.editeurName.validate()) {
    if (this.editeurValMin.validate($(this.inputValMin).val())) {
      if (this.editeurValMax.validate($(this.inputValMax).val())) {
        if (this.editeurValPas.validate($(this.inputValPas).val())) {
          if (this.editeurValAct.validate($(this.inputValAct).val())) {
            if (!this.modification) this.va.nomCalcul = $(this.inputName).val()
            const va = this.va
            const min = this.valMin.rendValeur()
            const max = this.valMax.rendValeur()
            const pas = this.valPas.rendValeur()
            const act = this.valAct.rendValeur()
            // On vérifie la validité des valeurs entrées
            if (min >= max) {
              new AvertDlg(app, 'vardlg1', function () { self.inputValMax.focus() })
              return
            }
            if (((pas > max - min) || (pas <= 0))) {
              new AvertDlg(app, 'vardlg2', function () { self.inputValPas.focus() })
              return
            }
            if ((act < min) || (act > max)) {
              new AvertDlg(app, 'vardlg3', function () { self.inputValAct.focus() })
              return
            }
            va.chaineValeurMini = $(this.inputValMin).val()
            va.valeurMini = min
            va.chaineValeurMaxi = $(this.inputValMax).val()
            va.valeurMaxi = max
            va.chaineValeurPas = $(this.inputValPas).val()
            va.valeurPas = pas
            va.valeurActuelle = act
            if (!this.modification) this.app.ajouteElement(va)
            // On regarde s'il fauut créer au supprimer le div associé à la variable
            const dlgass = va.dialogueAssocie
            const b = $('#cbdlg').prop('checked')
            if (dlgass !== b) {
              app.removePaneVariables()
              va.dialogueAssocie = b
              app.listePr.creePaneVariables()
            }
            this.app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : 'Variable')
            this.destroy()
            if (this.callBackOK !== null) this.callBackOK()
          } else this.inputValAct.focus()
        } else this.inputValPas.focus()
      } else this.inputValMax.focus()
    } else this.inputValMin.focus()
  }
}
