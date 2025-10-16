/*
 * Created by yvesb on 04/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import $ from 'jquery'
import { ce } from 'src/kernel/dom'
import MtgDlg from './MtgDlg'
import PaneListeReperes from './PaneListeReperes'
export default ModifRepDlg

/**
 * Dialogue appelée pour changer le repère associé à une mesure.
 * @param {MtgApp} app L'application propriétaire
 * @param mes La mesure dont on modifie le repère
 * @param repInit Le repère initialement associé à la mesure.
 * @param title Le titre désigant la nature de l'objet
 * @param callBackOK Fonction appelée si l'utilisateur clique sur OK : un seul paramètre pour la fonction qui est le repère choisi.

 * @constructor
 */
function ModifRepDlg (app, mes, repInit, title, callBackOK) {
  MtgDlg.call(this, app, 'Repdlg')
  this.callBackOK = callBackOK
  const tab = ce('table')
  this.appendChild(tab)
  let tr = ce('tr')
  tab.appendChild(tr)
  const info = ce('textarea', {
    id: 'info',
    disabled: 'true',
    cols: 40,
    rows: 4
  })
  tr.appendChild(info)
  $(info).css('font-size', '13px').text(mes.infoHist())
  tr = ce('tr')
  tab.appendChild(tr)
  this.paneListeRep = new PaneListeReperes(app, app.listePr.indexOf(mes) - 1)
  tr.appendChild(this.paneListeRep.getTab())
  this.paneListeRep.selectRep(repInit)
  this.create(title, 400)
}

ModifRepDlg.prototype = new MtgDlg()

ModifRepDlg.prototype.OK = function () {
  this.callBackOK(this.paneListeRep.getSelectedRep())
  this.destroy()
}
