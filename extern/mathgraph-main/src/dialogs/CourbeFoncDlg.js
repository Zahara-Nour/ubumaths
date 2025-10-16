/*
 * Created by yvesb on 07/04/2017.
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
import CValeur from '../objets/CValeur'
import NatCal from '../types/NatCal'
import PaneListeReperes from './PaneListeReperes'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import $ from 'jquery'
import 'jquery-textrange'
import EditeurValeurReelle from './EditeurValeurReelle'
import AvertDlg from './AvertDlg'
import { getMtgInput } from './dom'
export default CourbeFoncDlg

/**
 *
 * @param {MtgApp} app
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function CourbeFoncDlg (app, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'CourbeDlg', callBackOK, callBackCancel)
  const self = this
  const list = app.listePr
  this.inf = list.listeParNatCal(app, NatCal.NFoncR1Var, -1)
  // 2 CValeur pour stocker les valeurs pour a et b.
  this.valeura = new CValeur(list)
  this.valeurb = new CValeur(list)

  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  // Un premier tableau en haut pour contenir la liste des fonctions et la liste des repères
  const tabListes = ce('table')
  $(tabListes).css('margin', ' 0 auto')
  tr.appendChild(tabListes)
  let td = ce('td')
  tabListes.appendChild(td)
  const caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:220px'
  })
  $(caption).html(getStr('InsDynDlg1'))
  td.appendChild(caption)
  this.select = ce('SELECT', {
    size: 5, // Le nombre de lignes visibles par défaut
    style: 'width:220px'
  })
  this.select.onchange = function () {
    self.onSelectChange()
  }
  td.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.select.appendChild(option)
  }
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tabListes.appendChild(td)
  this.paneListeRep = new PaneListeReperes(app, list.longueur() - 1)
  td.appendChild(this.paneListeRep.getTab())
  // Un tableau pour contenir les boutons radio de choix d'intervalle pour la courbe
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabRadio = ce('table')
  tr.appendChild(tabRadio)
  tr = ce('tr')
  tabRadio.appendChild(tr)
  let label = ce('label', {
    for: 'radio1'
  })
  $(label).html(getStr('courbeDlg1'))
  tr.appendChild(label)
  // Tableau formé des fonctions a appeler quand on coche une des quatre cases
  // Pour j variant de 1 à 4 : Courbe sur R, courbe sur [a;b], courbe sur [a; + infini[, courbe sur ]- infini; a]
  const tabFonc = ['hideInputab', 'showInputab', 'showInputa', 'showInputa']
  for (let j = 1; j < 5; j++) {
    const radio = ce('input', {
      type: 'radio',
      id: 'radio' + j,
      name: 'interv'
    })
    tr.appendChild(radio)
    if (j === 1) radio.setAttribute('checked', 'checked')
    radio.onchange = function () {
      self[tabFonc[j - 1]]()
    }
    label = ce('label', {
      for: 'radio' + j
    })
    $(label).html(getStr('courbeDlg' + String(j + 1)))
    tr.appendChild(label)
  }

  const trValeurs = ce('tr')
  tabPrincipal.appendChild(trValeurs)
  const paneValeurs = ce('table', {
    id: 'paneVal'
  })
  trValeurs.appendChild(paneValeurs)
  td = ce('td')
  paneValeurs.appendChild(td)
  const paneValeursGauche = ce('table', {
    id: 'paneVala'
  })
  td.appendChild(paneValeursGauche)
  tr = ce('tr')
  paneValeursGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label', {
    id: 'labela'
  })
  $(label).html(getStr('Valeura') + ' :')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour la valeur de a
  this.inputa = getMtgInput()
  $(this.inputa).attr('size', 15)
  td.appendChild(this.inputa)
  const paneBoutonsValFonca = new PaneBoutonsValFonc(this.app, this, this.inputa, true, -1)
  paneValeursGauche.appendChild(paneBoutonsValFonca)

  td = ce('td')
  paneValeurs.appendChild(td)
  const paneValeursDroit = ce('table', {
    id: 'paneValb'
  })
  td.appendChild(paneValeursDroit)
  tr = ce('tr')
  paneValeursDroit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label', {
    id: 'labelb'
  })
  $(label).html(getStr('Valeurb') + ' :')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour la valeur de b
  this.inputb = getMtgInput()
  $(this.inputb).attr('size', 15)
  td.appendChild(this.inputb)
  const paneBoutonsValFoncb = new PaneBoutonsValFonc(this.app, this, this.inputb, true, -1)
  paneValeursDroit.appendChild(paneBoutonsValFoncb)

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneInfo = ce('table')
  tr.appendChild(paneInfo)
  tr = ce('tr')
  paneInfo.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  $(td).css('vertical-align', 'top')
  label = ce('label')
  $(label).html(getStr('InfoFonc'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const textarea = ce('textarea', {
    id: 'info',
    cols: 35,
    rows: 2,
    disabled: 'true'
  })
  tr.appendChild(textarea)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  // Un tableau contenant l'éditeur du nombre de points
  const paneInput = ce('table')
  tr.appendChild(paneInput)
  tr = ce('tr')
  paneInput.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('courbeDlg10'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const inputnb = getMtgInput({
    id: 'inputnb',
    size: 5 // 3 ou 4 trop petit sur iPad
  })
  $(inputnb).val('500')
  td.appendChild(inputnb)

  // En bas un tableau pour les trois checkbox
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneBas = ce('table', {
    cellspacing: 4
  })
  tr.appendChild(paneBas)
  tr = ce('tr')
  paneBas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  let div = ce('div')
  td.appendChild(div)
  const cb1 = ce('input', {
    id: 'cb1',
    type: 'checkbox'
  })
  $(cb1).attr('checked', 'checked')
  div.appendChild(cb1)
  label = ce('label', {
    for: 'cb1'
  })
  $(label).html(getStr('courbeDlg7'))
  div.appendChild(label)

  td = ce('td')
  tr.appendChild(td)
  div = ce('div')
  td.appendChild(div)
  const cb2 = ce('input', {
    id: 'cb2',
    type: 'checkbox'
  })
  $(cb2).attr('checked', 'checked')
  div.appendChild(cb2)
  label = ce('label', {
    for: 'cb2'
  })
  $(label).html(getStr('courbeDlg8'))
  div.appendChild(label)

  tr = ce('tr')
  paneBas.appendChild(tr)

  td = ce('td')
  tr.appendChild(td)
  div = ce('div')
  td.appendChild(div)
  const cb3 = ce('input', {
    id: 'cb3',
    type: 'checkbox'
  })
  $(cb3).attr('checked', 'checked')
  div.appendChild(cb3)
  label = ce('label', {
    for: 'cb3'
  })
  $(label).html(getStr('courbeDlg9'))
  div.appendChild(label)
  const indf = list.longueur() - 1
  this.editeura = new EditeurValeurReelle(app, this.inputa, indf, this.valeura, null)
  this.editeurb = new EditeurValeurReelle(app, this.inputb, indf, this.valeurb, null)
  this.hideInputab()
  this.onSelectChange()
  this.create('CourbeFonc', 650)
}

CourbeFoncDlg.prototype = new MtgDlg()

CourbeFoncDlg.prototype.showInputab = function () {
  $('#paneVala').css('visibility', 'visible')
  $('#paneValb').css('visibility', 'visible')
}

CourbeFoncDlg.prototype.showInputa = function () {
  $('#paneVala').css('visibility', 'visible')
  $('#paneValb').css('visibility', 'hidden')
}
CourbeFoncDlg.prototype.hideInputab = function () {
  $('#paneVala').css('visibility', 'hidden')
  $('#paneValb').css('visibility', 'hidden')
}

CourbeFoncDlg.prototype.onSelectChange = function () {
  $('#info').val(this.inf.pointeurs[this.select.selectedIndex].infoHist())
}

CourbeFoncDlg.prototype.OK = function () {
  const courbeSurR = $('#radio1').prop('checked')
  const courbeSurab = $('#radio2').prop('checked')
  const courbeSuraInf = $('#radio3').prop('checked')
  const courbeSurInfa = $('#radio4').prop('checked')
  const editeuraVis = courbeSurab || courbeSuraInf || courbeSurInfa

  if ((editeuraVis ? this.editeura.validate() : true) && (courbeSurab ? this.editeurb.validate() : true)) {
    const app = this.app
    const nbPts = parseInt($('#inputnb').val())
    if (nbPts < 4 || nbPts > 5000 || isNaN(nbPts)) {
      new AvertDlg(app, 'Incorrect', function () {
        $('#inputnb').focus()
      })
    } else {
      const list = app.listePr
      const nomx = list.genereNomPourCalcul('x', true)
      const nomy = list.genereNomPourCalcul('y', true)
      const nompt = list.genereNomPourPointOuDroite('x', true)
      const ptLieCache = $('#cb1').prop('checked')
      const ptGenCache = $('#cb2').prop('checked')
      const gestionAuto = $('#cb3').prop('checked')
      const rep = this.paneListeRep.getSelectedRep()
      const fonc = this.inf.pointeurs[this.select.selectedIndex]
      const ind = list.longueur() // Pour svoir à partir de quel indice créer les g elements
      if (courbeSurR) {
        app.ajouteCourbeSurR(rep, fonc, nompt, nomx, nomy, nbPts, ptLieCache, ptGenCache, gestionAuto)
      } else if (courbeSurab) {
        app.ajouteCourbeSurab(rep, fonc, nompt, nomx, nomy, nbPts, ptLieCache, ptGenCache, gestionAuto, this.valeura, this.valeurb)
      } else if (courbeSuraInf) {
        app.ajouteCourbeSuraInf(rep, fonc, nompt, nomx, nomy, nbPts, ptLieCache, ptGenCache, gestionAuto, this.valeura)
      } else {
        app.ajouteCourbeSurInfa(rep, fonc, nompt, nomx, nomy, nbPts, ptLieCache, ptGenCache, gestionAuto, this.valeura)
      }
      list.afficheTout(ind, app.svgFigure, true, app.doc.couleurFond)
      app.gestionnaire.enregistreFigureEnCours('CourbeFonc')
      this.destroy()
      app.activeOutilCapt()
    }
  }
}
