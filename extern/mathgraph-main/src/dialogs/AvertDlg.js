/*
 * Created by yvesb on 30/12/2016.
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
import $ from 'jquery'

let lastMessage

export default AvertDlg
/**
 * Boîte de dialogue d'avertissement
 * @param {MtgApp} app
 * @param {string} message
 * @param {VoidCallback} callBackOK
 * @constructor
 * @extends MtgDlg
 */
function AvertDlg (app, message, callBackOK = null) {
  // Si on appuie deux fois très rapidement sur entrée en validant un input
  // d'une boîte de dialogue (alors qu'on a redonné le focus à l'input après une erreur de saisie)
  // il peut arriver qu'un deuxième dialogue d'avertissement soit lancé alors que le premier est déjà présent.
  // Mais on veut quand même gérer plusieurs messages d'erreur => on ignore seulement si c'est le même message
  // Version 7.0 : Pour pouvoir éventuellement avoir plusieurs messages d'avertissements empilés sans causer
  // de plantage, on ajoute à l'id normale avertDlg un nombre qui est le nombre de dialogues déjà ouverts
  // if (app.lastDlgId() === 'avertDlg' && lastMessage === message) return
  if (app.lastDlgId().startsWith('avertDlg') && lastMessage === message) return
  lastMessage = message
  MtgDlg.call(this, app, 'avertDlg' + app.dlg.length, callBackOK)
  const label = ce('label')
  // Si le message n'est pas défini, c'est un message composé
  // (mais message peut être un truc qui vient déjà de getStr, d'où le lax ci-dessous)
  let mes = getStr(message, { lax: true })
  if (mes === '') mes = message
  $(label).html(mes)
  this.appendChild(label)
  const self = this
  $('#' + self.id).dialog({
    modal: true,
    title: getStr('Avert'),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    buttons: [{
      text: getStr('Fermer'),
      id: 'btnClose',
      click: function (ev) {
        self.OK()
        self.stopEvent(ev) // Rajouté version 6.9.3
      }
    }],
    open: function () {
      self.onOpen()
    },
    closeOnEscape: false,
    width: 500,
    // On centre la boîte de dialogue sur le div parent de l'application
    position: { my: 'center', at: 'center', of: this.app.svg.parentElement }
  })
}

AvertDlg.prototype = new MtgDlg()

AvertDlg.prototype.onOpen = function () {
  setTimeout(function () { // Ne marche pas sans un setTimeOut
    $('#btnClose').focus() // Pour que le focus soit donné au bouton Fermer
  }, 100)
}

AvertDlg.prototype.OK = function () {
  this.destroy()
  if (typeof this.callBackOK === 'function') {
    // Dans certains cas rappeler la callback trop rapidement pose pb sur iPad,
    // avec le clavier virtuel qui apparaît au mauvais endroit et cache un input.
    setTimeout(this.callBackOK, 250)
  }
}
