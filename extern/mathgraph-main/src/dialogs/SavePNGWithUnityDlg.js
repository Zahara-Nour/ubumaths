/*
 * Created by yvesb on 18/04/2017.
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
import { getMtgInput } from './dom'
import AvertDlg from './AvertDlg'
import { saveAs } from 'file-saver'
import $ from 'jquery'
import toast from '../interface/toast'
export default SavePNGWithUnityDlg

/**
 * Dialogue d'exportation dans une image avec longueur unité
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param {boolean} bSaveInFile true si après cette boîte de dialogue on enregistre dans un fichier
 * et false si on copie le résultat dans le presse-papiers
 */
function SavePNGWithUnityDlg (app, bSaveInFile) {
  let tr, div, label
  MtgDlg.call(this, app, 'SaveImUnDlg')
  this.bSaveInFile = bSaveInFile
  const self = this
  const tabPrincipal = ce('table', {
    cellspacing: 10
  })
  this.appendChild(tabPrincipal)
  // Seulement pour la version non electron on demande le nom du fichier
  if (this.bSaveInFile) {
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    div = ce('div')
    tr.appendChild(div)
    label = ce('label')
    $(label).html(getStr('saveDlg1'))
    div.appendChild(label)
    this.input = getMtgInput({
      id: 'mtginput'
    })
    div.appendChild(this.input)
    this.input.onkeyup = function (ev) {
      this.demarquePourErreur()
      if (ev.keyCode === 13) {
        $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
        self.OK()
      }
    }
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  label = ce('label')
  $(label).html(getStr('Unit'))
  div.appendChild(label)
  const inputUnity = ce('input', {
    type: 'text',
    id: 'inputUn'
  })
  div.appendChild(inputUnity)
  inputUnity.onkeyup = function (ev) {
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    } else self.displayDim()
  }

  $(inputUnity).val('1')

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  label = ce('label')
  $(label).html(getStr('DimFig'))
  div.appendChild(label)
  // On ajoute un label pour afficher les dimensions de la figure
  const labelDim = ce('label', {
    id: 'dim'
  })
  div.appendChild(labelDim)
  this.displayDim()
  this.create(bSaveInFile ? 'SavePNGWithUnity' : 'CopyWithUnity', 550)
}

SavePNGWithUnityDlg.prototype = new MtgDlg()

SavePNGWithUnityDlg.prototype.OK = function () {
  const app = this.app
  let fileName
  if (this.bSaveInFile) {
    fileName = $('#mtginput').val()
    // On regarde si la chaîne entrée est non-vide et ne contient que des caractères ascii
    if ((fileName === '') || fileName.match(/\W/)) {
      this.input.marquePourErreur()
      new AvertDlg(app, 'NomFichierErr', function () {
        $('#mtginput').focus()
      })
      return
    }
  }
  const unity = parseFloat($('#inputUn').val())
  if (isNaN(unity) || unity === 0) {
    new AvertDlg(app, 'Incorrect', function () {
      $('#inputUn').focus()
    })
    return
  }
  const coef = 96 / 2.54 / app.listePr.pointeurLongueurUnite.rendLongueur() * unity / app.pref_coefMult
  // sous safari et iPad, ça ne fonctionne pas si y'a un délai entre le click et le clipboard.write
  // mais on peut passer une promesse (qui sera résolue avec le blob) plutôt qu'un blob
  // au new ClipboardItem => ça règle le pb !
  const blobPromised = app.getBlobImage('png', { coefMult: app.pref_coefMult, coef })
  if (this.bSaveInFile) {
    blobPromised
      .then(function (blob) {
        saveAs(blob, fileName + '.png')
      })
      .catch(function (error) {
        console.error(error)
        toast({ title: 'ImageConversionError', message: error.message, type: 'error' })
      })
  } else {
    // Créer un élément ClipboardItem à partir d'une promesse de Blob
    const clipboardItem = new ClipboardItem({ 'image/png': blobPromised })
    // et on peut copier dans le presse-papiers
    navigator.clipboard.write([clipboardItem])
      .then(() => {
        toast({ title: 'CopyOk' })
      })
      .catch((error) => {
        this._clipboardCopyErrorHandler(clipboardItem, error)
      })
  }
  // quoi qu'il arrive on ferme cette boite de dialogue
  // (même si les conversions sont encore en cours)
  this.destroy()
}

SavePNGWithUnityDlg.prototype.displayDim = function () {
  const app = this.app
  const dimf = app.dimf
  const ch = $('#inputUn').val()
  if (ch !== '') {
    const unity = parseFloat(ch)
    const long = app.listePr.pointeurLongueurUnite.rendLongueur()
    const avecCadre = app.cadre !== null
    let w = avecCadre ? app.widthCadre : dimf.x
    let h = avecCadre ? app.heightCadre : dimf.y
    w = Math.round(w / long * unity * 100) / 100
    h = Math.round(h / long * unity * 100) / 100
    $('#dim').html('(' + w + ' cm, ' + h + ' cm)')
  } else $('#dim').html('')
}
