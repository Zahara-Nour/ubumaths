/*
 * Created by yvesb on 18/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import toast from 'src/interface/toast'
import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import { getMtgInput } from './dom'
import AvertDlg from './AvertDlg'
import { saveAs } from 'file-saver'
import $ from 'jquery'
export default SaveImageDlg

/**
 * Dialogue d'exportation dans une image
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param {string} imageType png|jpeg|svg
 */
function SaveImageDlg (app, imageType) {
  MtgDlg.call(this, app, 'SaveImDlg')
  this.imageType = imageType
  const self = this
  const tabPrincipal = ce('table', {
    cellspacing: 10
  })
  this.appendChild(tabPrincipal)
  const tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const div = ce('div')
  tr.appendChild(div)
  const label = ce('label')
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
  const title = imageType === 'png' ? 'SavePNG' : (imageType === 'jpeg' ? 'SaveJPG' : 'SaveSVG')
  this.create(title, 550)
}

SaveImageDlg.prototype = new MtgDlg()

SaveImageDlg.prototype.OK = function () {
  const self = this
  const name = $('#mtginput').val()
  // On regarde si la chaîne entrée est non-vide et ne contient que des caractères ascii
  const app = this.app
  if ((name === '') || name.match(/\W/)) {
    this.input.marquePourErreur()
    new AvertDlg(app, 'NomFichierErr', function () {
      $('#mtginput').focus()
    })
    return
  }

  const suffix = self.imageType === 'jpeg' ? 'jpg' : self.imageType
  app.getBlobImage(suffix)
    .then((blob) => {
      const fileName = name + '.' + suffix
      saveAs(blob, fileName)
    })
    .catch((error) => {
      console.log(error)
      toast({ title: 'ImageConversionError', type: 'error', message: error })
    })
    .then(() => {
      this.destroy()
    })
}
