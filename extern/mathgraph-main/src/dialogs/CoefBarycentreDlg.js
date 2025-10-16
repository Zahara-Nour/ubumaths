/*
 * Created by yvesb on 23/04/2017.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import EditeurvaleurReelle from './EditeurValeurReelle'
import CValeur from '../objets/CValeur'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import { getMtgInput } from './dom'
export default CoefBarycentreDlg

/**
 * Dialogue appelé pour donner à un point pondéré d'un barycentre son coefficient
 * @constructor
 * @param {MtgApp} app La MtgApp proppriétaire
 * @param bar Le barycentre propriétaire du noeud qui contient le point
 * @param noeud Le point du barycentre dont on modifie le coefficient
 * @param modification true si on modifie un point pondéré déjà créé
 * @param callBackOK null ou fonction à appeler apès OK
 * @param callBackCancel null ou fonction à appeler après Cancel
 */
function CoefBarycentreDlg (app, bar, noeud, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'coefDirDlg', callBackOK, callBackCancel)
  this.modification = modification
  this.bar = bar
  this.noeud = noeud
  const self = this
  const list = app.listePr
  // Un CValeur pour stocker la valeur choisie avant vérification
  this.valeur = new CValeur(list, 1)
  const tab = ce('table')
  this.appendChild(tab)
  const tr = ce('tr')
  tab.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('Coef'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input = getMtgInput({
    id: 'mtginput'
  })
  td.appendChild(input)
  input.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  $(input).val(replaceSepDecVirg(app, noeud.poids.calcul))
  input.select()
  const indmax = modification ? list.indexOf(bar) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, input, true, indmax)
  tab.appendChild(paneBoutonsValFonc)
  this.editor = new EditeurvaleurReelle(app, input, indmax, this.valeur, null)
  this.create('CoefBar', 450)
}

CoefBarycentreDlg.prototype = new MtgDlg()

CoefBarycentreDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}

CoefBarycentreDlg.prototype.OK = function () {
  const sel = $('#mtginput')
  // if (this.app.lastDlgId() !== this.id) return;
  if (this.editor.validate(sel.val())) {
    this.noeud.poids = this.valeur
    if (this.callBackOK !== null) this.callBackOK()
    this.destroy()
  } else sel.focus()
}
