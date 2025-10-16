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
import EditeurNomCalcul from './EditeurNomCalcul'
import CValeur from '../objets/CValeur'
import CMatrice from '../objets/CMatrice'
import $ from 'jquery'
import { getMtgInput } from './dom'

export default MatriceParTxtDlg

/**
 * Function créant une matrice à partir du texte obtenu par copier-coller depuis un tableur
 * Les lignes sont séparées par de \n et sur une ligne les termes par des \t
 * Une fois la matrice créée on peu plus la modifier via un autre texte
 * @param {MtgApp} app L'application propriétaire
 * @param {VoidCallback} callBackOK : Eventuelle fonction de callback à appeler après validation par OK
 * @param {VoidCallback} callBackCancel : Eventuelle fonction de callback à appeler si on annule
 * @constructor
 */
function MatriceParTxtDlg (app, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'matTxtDlg', callBackOK, callBackCancel)
  let td, tr, label
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabNom = ce('table')
  tr.appendChild(tabNom)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabNom.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('NomMat') + ' : ')
  td.appendChild(label)
  td = ce('td')
  this.inputName = getMtgInput()
  td.appendChild(this.inputName)
  tr.appendChild(td)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabBas = ce('table')
  tr.appendChild(tabBas)
  tr = ce('tr')
  tabBas.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('TxtMat') + ' : ')
  tr.appendChild(label)
  tr = ce('tr')
  tabBas.appendChild(tr)
  const textarea = ce('textarea', {
    id: 'txtmat',
    cols: 80,
    rows: 20,
    style: 'font-size:13px;'
  })
  tr.appendChild(textarea)
  this.editeurName = new EditeurNomCalcul(app, true, this.inputName)
  this.create('MatriceParTxt', 650)
}

MatriceParTxtDlg.prototype = new MtgDlg()

function castToMatrix (txt) {
  if (txt.endsWith('\n')) txt = txt.substring(0, txt.length - 1)
  const matrix = txt.replace(/,/g, '.').split('\n').map(line => line.split('\t').map(Number))
  const nbCol = matrix[0].length
  const isNumMatrix = matrix.every(line => line.length === nbCol && line.every(nb => Number.isFinite(nb)))
  if (isNumMatrix) return matrix
  else return null
}

MatriceParTxtDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.inputName)
}

MatriceParTxtDlg.prototype.OK = function () {
  if (this.editeurName.validate()) {
    const app = this.app
    const txt = $('#txtmat').val()
    const tab = castToMatrix(txt)
    if (tab && txt !== '') {
      const n = tab.length
      const p = tab[0].length
      const matval = tab.map((li) => li.map((el) => new CValeur(app.listePr, el)))
      const mat = new CMatrice(app.listePr, null, false, $(this.inputName).val(), n, p, matval)
      app.ajouteElement(mat)
      app.gestionnaire.enregistreFigureEnCours('MatriceParTxt')
      if (this.callBackOK) this.callBackOK()
      this.destroy()
    } else {
      new AvertDlg(app, 'DonneesInvalides')
      $('#textarea').focus()
    }
  }
}
