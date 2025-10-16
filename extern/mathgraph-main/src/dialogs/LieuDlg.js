/*
 * Created by yvesb on 12/02/2017.
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
import { getMtgInput } from './dom'
import EditeurConst from './EditeurConst'
import NatObj from '../types/NatObj'
export default LieuDlg

/**
 * Dialogue de création ou modification d'un lieu de points généré par point lié (lieu continu ou discret)
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param lieu Le lieu de points qui doit être changé
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 * @param callBackOK null ou fonction de callBack à appeler après OK
 * @param callBackCancel null ou fonction de callBack à appeler après annumlation
 */
function LieuDlg (app, lieu, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'LieuDlg', callBackOK, callBackCancel)
  const self = this
  this.lieu = lieu
  this.modification = modification
  const tab = ce('table')
  this.appendChild(tab)
  let tr = ce('tr')
  tab.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr('NbPts') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)

  const input = getMtgInput({
    id: 'mtginput',
    size: 5 // 4 pas assez grand pour iPad
  })
  td.appendChild(input)
  input.onkeyup = function (ev) {
    if (ev.keyCode === 13) {
      $(this).blur() // Nécessaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  if (lieu.estDeNature(NatObj.NLieu)) {
    tr = ce('tr')
    tab.appendChild(tr)
    td = ce('td')
    tr.appendChild(td)
    label = ce('label', {
      for: 'cbLieuFerme'
    })
    $(label).html(getStr('LieuFerme'))
    td.appendChild(label)
    td = ce('td')
    tr.appendChild(td)
    const cbLieuFerme = ce('input', {
      type: 'checkbox',
      id: 'cbLieuFerme'
    })
    td.appendChild(cbLieuFerme)

    tr = ce('tr')
    tab.appendChild(tr)
    td = ce('td')
    tr.appendChild(td)
    label = ce('label', {
      for: 'cbGestAuto'
    })
    $(label).html(getStr('courbeDlg9'))
    td.appendChild(label)
    td = ce('td')
    tr.appendChild(td)
    const cbGestAuto = ce('input', {
      type: 'checkbox',
      id: 'cbGestAuto'
    })
    td.appendChild(cbGestAuto)
    if (lieu.infoLieu.fermeOuNon) cbLieuFerme.setAttribute('checked', 'checked')
    if (lieu.infoLieu.gestionDiscontinuite) cbGestAuto.setAttribute('checked', 'checked')
    $(input).val(lieu.infoLieu.nombreDePoints)
  } else $(input).val(lieu.nombreDePoints)
  this.editeur = new EditeurConst(app, input, 4, 5000)
  this.create('LieuPt', 400)
}

LieuDlg.prototype = new MtgDlg()

LieuDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}

LieuDlg.prototype.OK = function () {
  let bnbptsdif
  const nbPts = parseInt($('#mtginput').val())
  if (this.editeur.validate()) {
    if (this.lieu.estDeNature(NatObj.NLieu)) {
      const info = this.lieu.infoLieu
      bnbptsdif = info.nombreDePoints !== nbPts
      if (bnbptsdif) {
        info.nombreDePoints = nbPts
        this.lieu.changeCaracteristiques()
        this.app.listePr.metAJourSurfacesAyantPourBord(this.lieu)
      }
      info.fermeOuNon = $('#cbLieuFerme').prop('checked')
      info.gestionDiscontinuite = $('#cbGestAuto').prop('checked')
    } else {
      bnbptsdif = this.lieu.nombreDePoints !== nbPts
      if (bnbptsdif) {
        this.lieu.nombreDePoints = nbPts
        this.lieu.changeCaracteristiques()
      }
    }
    this.lieu.metAJour()
    if (this.callBackOK !== null) this.callBackOK()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
  }
}
