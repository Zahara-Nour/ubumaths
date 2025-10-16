/*
 * Created by yvesb on 16/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import AvertDlg from 'src/dialogs/AvertDlg'
import Dimf from 'src/types/Dimf'
import DisplayCodeDlg from 'src/dialogs/DisplayCodeDlg'
import { copyToClipBoard } from '../kernel/dom'
import toast from '../interface/toast'
export default OutilCodeBase64

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilCodeBase64 (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'CodeBase64', -1, false, false, false, false)
}

OutilCodeBase64.prototype = new Outil()

OutilCodeBase64.prototype.select = function () {
  const app = this.app
  if (navigator?.clipboard) {
    const code = app.getBase64Code()
    copyToClipBoard(code)
      .then(result => {
        if (result) toast({ title: 'CopyCodeOk' })
        else new AvertDlg(self.app, 'CopyCodeKo')
      })
  } else {
    const doc = app.doc
    const olddimf = doc.dimf
    if (app.cadre) {
      // y'a un cadre de sélection, on ne veut que ce qu'il contient
      // (et seulement au clic sur cet outil d'export,
      // la méthode app.getBase64Code exporte toujours la figure complète)
      doc.dimf = new Dimf(app.widthCadre, app.heightCadre)
    }
    doc.dimf = olddimf
    new DisplayCodeDlg(app, app.getBase64Code(), 'Base64')
  }
}
