/*
 * Created by yvesb on 19/01/2017.
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
import CValeur from '../objets/CValeur'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import PaneListeReperes from './PaneListeReperes'
import EditeurValeurReelle from './EditeurValeurReelle'
import NatCal from '../types/NatCal'
import { getMtgInput } from './dom'

export default PtBaseEntDlg

/**
 * Dialogue de création ou modification de point libre à coordonnées entières
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param {CPointBaseEnt} point le point à changer
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 */
function PtBaseEntDlg (app, point, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'ptBaseEntDlg', callBackOK, callBackCancel)
  const self = this
  this.point = point
  this.modification = modification
  const list = app.listePr
  // Un CValeur pour stocker la valeur choisie pour l'abscisse mini avant vérification
  this.valeurAbsMin = new CValeur(list, 0)
  // Un CValeur pour stocker la valeur choisie pour l'ordonnée mini avant vérification
  this.valeurOrdMin = new CValeur(list, 0)
  // Un CValeur pour stocker la valeur choisie pour l'abscisse maxi avant vérification
  this.valeurAbsMax = new CValeur(list, 0)
  // Un CValeur pour stocker la valeur choisie pour l'ordonnée maxi avant vérification
  this.valeurOrdMax = new CValeur(list, 0)
  const tabprincipal = ce('table')
  this.appendChild(tabprincipal)
  let tr = ce('tr')
  tabprincipal.appendChild(tr)
  const tabhaut = ce('table')
  tr.appendChild(tabhaut)
  tr = ce('tr')
  tabhaut.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const indmax = modification ? list.indexOf(point) - 1 : list.longueur() - 1
  this.paneListeRep = new PaneListeReperes(app, indmax)
  td.appendChild(this.paneListeRep.getTab())
  if (modification) this.paneListeRep.selectRep(point.rep)
  // Début des lignes correspondant à l'entrée des données des abscisses (chechBox suivi d'une ligne d'entrée
  // des abscisses mini et maxi
  tr = ce('tr')
  tabprincipal.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  let label = ce('label', {
    for: 'cb1'
  })
  $(label).html(getStr('AbsLibres'))
  td.appendChild(label)
  this.cbAbsLibres = ce('input', {
    type: 'checkBox',
    id: 'cb1'
  })
  td.appendChild(this.cbAbsLibres)
  if ((modification && (this.point.absLibres)) || !modification) this.cbAbsLibres.setAttribute('checked', 'checked') // Corrigé version 6.4.1
  // On rajoute une ligne qui va contenit dexu tableaux côte à côte pour entre abscisse mini et maxi
  const trAbs = ce('tr')
  tabprincipal.appendChild(trAbs)
  // Un premier tableau à gauche pour l'entrée de l'abscisse mini
  td = ce('td')
  trAbs.appendChild(td)
  const tabAbsGauche = ce('table')
  td.appendChild(tabAbsGauche)
  tr = ce('tr')
  tabAbsGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('AbsMin') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputAbsMin = getMtgInput({
    size: 14
  })
  td.appendChild(this.inputAbsMin)
  this.paneBoutonsValFoncAbsMin = new PaneBoutonsValFonc(this.app, this, this.inputAbsMin, true, indmax)
  tabAbsGauche.appendChild(this.paneBoutonsValFoncAbsMin)
  this.editeurAbsMin = new EditeurValeurReelle(app, this.inputAbsMin, indmax, this.valeurAbsMin, null)
  // Un deuxième tableau à droite dans la même ligne pour l'entrée de l'abscisse maxi
  td = ce('td')
  trAbs.appendChild(td)
  const tabAbsDroit = ce('table')
  td.appendChild(tabAbsDroit)
  tr = ce('tr')
  tabAbsDroit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('AbsMax') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputAbsMax = getMtgInput({
    size: 14
  })
  td.appendChild(this.inputAbsMax)
  this.paneBoutonsValFoncAbsMax = new PaneBoutonsValFonc(this.app, this, this.inputAbsMax, true, indmax)
  tabAbsDroit.appendChild(this.paneBoutonsValFoncAbsMax)
  this.editeurAbsMax = new EditeurValeurReelle(app, this.inputAbsMax, indmax, this.valeurAbsMax, null)

  // Début des lignes correspondant à l'entrée des données des ordonnées (chechBox suivi d'une ligne d'entrée
  // des ordonnées mini et maxi
  tr = ce('tr')
  tabprincipal.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label', {
    for: 'cb2'
  })
  $(label).html(getStr('OrdLibres'))
  td.appendChild(label)
  this.cbOrdLibres = ce('input', {
    type: 'checkBox',
    id: 'cb2'
  })
  td.appendChild(this.cbOrdLibres)
  if ((modification && (this.point.ordLibres)) || !modification) this.cbOrdLibres.setAttribute('checked', 'checked') // Corrigé version 6.4.1
  // On rajoute une ligne qui va contenit deux tableaux côte à côte pour entre ordonnée mini et maxi
  const trOrd = ce('tr')
  tabprincipal.appendChild(trOrd)
  // Un premier tableau à gauche pour l'entrée de l'ordonnée mini
  td = ce('td')
  trOrd.appendChild(td)
  const tabOrdGauche = ce('table')
  td.appendChild(tabOrdGauche)
  tr = ce('tr')
  tabOrdGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('OrdMin') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputOrdMin = getMtgInput({
    size: 14
  })
  td.appendChild(this.inputOrdMin)
  this.paneBoutonsValFoncOrdMin = new PaneBoutonsValFonc(this.app, this, this.inputOrdMin, true, indmax)
  tabOrdGauche.appendChild(this.paneBoutonsValFoncOrdMin)
  this.editeurOrdMin = new EditeurValeurReelle(app, this.inputOrdMin, indmax, this.valeurOrdMin, null)

  // Un deuxième tableau à droite dans la même ligne pour l'entrée de l'ordonnée maxi
  td = ce('td')
  trOrd.appendChild(td)
  const tabOrdDroit = ce('table')
  td.appendChild(tabOrdDroit)
  tr = ce('tr')
  tabOrdDroit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('OrdMax') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputOrdMax = getMtgInput({
    size: 14
  })
  td.appendChild(this.inputOrdMax)
  this.paneBoutonsValFoncOrdMax = new PaneBoutonsValFonc(this.app, this, this.inputOrdMax, true, indmax)
  tabOrdDroit.appendChild(this.paneBoutonsValFoncOrdMax)
  this.editeurOrdMax = new EditeurValeurReelle(app, this.inputOrdMax, indmax, this.valeurOrdMax, null)
  const chabsmin = replaceSepDecVirg(app, point.absMin.calcul)
  $(this.inputAbsMin).val(modification ? chabsmin : '-5')
  const chabsmax = replaceSepDecVirg(app, point.absMax.calcul)
  $(this.inputAbsMax).val(modification ? chabsmax : '5')
  const chordmin = replaceSepDecVirg(app, point.ordMin.calcul)
  $(this.inputOrdMin).val(modification ? chordmin : '-5')
  const chordmax = replaceSepDecVirg(app, point.ordMax.calcul)
  $(this.inputOrdMax).val(modification ? chordmax : '5')

  this.setAbsState()
  this.setOrdState()

  this.cbAbsLibres.onclick = function () {
    self.setAbsState()
  }

  this.cbOrdLibres.onclick = function () {
    self.setOrdState()
  }
  this.create('PtLibreEnt', 650)
}

PtBaseEntDlg.prototype = new MtgDlg()

PtBaseEntDlg.prototype.setAbsState = function () {
  const b = ($(this.cbAbsLibres).prop('checked'))
  $(this.inputAbsMin).attr('disabled', b)
  $(this.inputAbsMax).attr('disabled', b)
  $(this.paneBoutonsValFoncAbsMin).css('visibility', b ? 'hidden' : 'visible')
  $(this.paneBoutonsValFoncAbsMax).css('visibility', b ? 'hidden' : 'visible')
}

PtBaseEntDlg.prototype.setOrdState = function () {
  const b = ($(this.cbOrdLibres).prop('checked'))
  $(this.inputOrdMin).attr('disabled', b)
  $(this.inputOrdMax).attr('disabled', b)
  $(this.paneBoutonsValFoncOrdMin).css('visibility', b ? 'hidden' : 'visible')
  $(this.paneBoutonsValFoncOrdMax).css('visibility', b ? 'hidden' : 'visible')
}

PtBaseEntDlg.prototype.onCancel = function () {
  const app = this.app
  this.destroy()
  if (this.callBackCancel !== null) this.callBackCancel()
  if (!this.modification) {
    if (app.listePr.nombreObjetsCalcul(NatCal.NRepere, false) > 1) app.activeOutilCapt()
    else {
      app.outilActif.deselect()
      app.outilActif.select()
    }
  }
}

PtBaseEntDlg.prototype.OK = function () {
  this.point.rep = this.paneListeRep.getSelectedRep()
  // Si l'utilisateur a précisé des valeurs pour les abscisses mmini et maxi on les vérifie
  const b1 = $(this.cbAbsLibres).prop('checked')
  if (!b1) {
    if (!this.editeurAbsMin.validate($(this.inputAbsMin).val())) {
      this.inputAbsMin.focus()
      return
    }
    if (!this.editeurAbsMax.validate($(this.inputAbsMax).val())) {
      this.inputAbsMax.focus()
      return
    }
  }
  const b2 = $(this.cbOrdLibres).prop('checked')
  if (!b2) {
    if (!this.editeurOrdMin.validate($(this.inputOrdMin).val())) {
      this.inputOrdMin.focus()
      return
    }
    if (!this.editeurOrdMax.validate($(this.inputOrdMax).val())) {
      this.inputOrdMax.focus()
      return
    }
  }
  this.point.absLibres = b1
  this.point.ordLibres = b2
  if (!b1) {
    this.point.absMin = this.valeurAbsMin
    this.point.absMax = this.valeurAbsMax
  }
  if (!b2) {
    this.point.ordMin = this.valeurOrdMin
    this.point.ordMax = this.valeurOrdMax
  }
  if (this.callBackOK !== null) this.callBackOK()
  this.destroy()
}
