/*
 * Created by yvesb on 12/05/2017.
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
import AvertDlg from './AvertDlg'
import $ from 'jquery'
export default ImageFondDlg

/**
 *
 * @param {MtgApp} app
 * @param callBackOK
 * @constructor
 */
function ImageFondDlg (app, callBackOK) {
  MtgDlg.call(this, app, 'imageFondDlg', callBackOK)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  const tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.input = ce('input', {
    type: 'file',
    id: 'fileImFond', // Attention on est dans la boîte de dialogue d'options et il y a déjà un input d'id file pour le choix de la figure donnant le niveau d'utilisation
    accept: 'image/*',
    class: 'inputfile'
  })
  const self = this
  this.input.addEventListener('change', function () {
    if (self.input.files.length > 0) $('#labelinf').html(' ' + self.input.files[0].name)
    else $('#labelinf').html('')
  })
  tr.appendChild(this.input)
  const label = ce('label', {
    for: 'fileImFond'
  })
  $(label).html(getStr('Parcourir'))
  tr.appendChild(label)
  // Un label à droite pour contenir le chemin d'accès du fichier choisi
  const labelinf = ce('label', {
    id: 'labelinf',
    style: 'margin-left: 10px;'
  })
  tr.appendChild(labelinf)

  this.create('ChoixImFond', 500)
  $(this.input).blur()
}

ImageFondDlg.prototype = new MtgDlg()

ImageFondDlg.prototype.OK = function () {
  const app = this.app
  const self = this
  const file = this.input.files[0]
  if (file) {
    app.setImageFond(file, function () {
      self.destroy()
      self.callBackOK()
    })
  } else {
    new AvertDlg(app, 'FichierErr')
  }
}
