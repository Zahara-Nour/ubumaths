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
import NatObj from '../types/NatObj'
import MotifPoint from '../types/MotifPoint'
import CImplementationProto from '../objets/CImplementationProto'
import PaneListeReperes from './PaneListeReperes'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import $ from 'jquery'
import 'jquery-textrange'
import EditeurValeurReelle from './EditeurValeurReelle'
import AvertDlg from './AvertDlg'
import { getMtgInput } from './dom'
import StyleTrait from '../types/StyleTrait'
export default CourbeFoncAvecCrochetsDlg

/**
 *
 * @param {MtgApp} app
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function CourbeFoncAvecCrochetsDlg (app, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'CourbeDlg', callBackOK, callBackCancel)
  const self = this
  const list = app.listePr
  this.inf = list.listeParNatCal(app, NatCal.NFoncR1Var, -1)
  // 3 CValeur pour stocker les valeurs pour a, b et r (le rayon des croches et pixel).
  this.valeura = new CValeur(list)
  this.valeurb = new CValeur(list)
  this.valeurr = new CValeur(list)

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
  $(caption).html(getStr('Fonction'))
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
  const tab = [']a;b[', '[a;b[', ']a;b]', ']a;+&infin;[', ']-&infin;;a[']
  // Pour j variant de 1 à 5 : Courbe sur ]a;b[, sur [a;b[, sur ]a;b], sur ]a; + infini[, sur ]- infini; a[
  for (let j = 1; j < 6; j++) {
    const radio = ce('input', {
      type: 'radio',
      id: 'radio' + j,
      name: 'interv'
    })
    tr.appendChild(radio)
    if (j === 1) radio.setAttribute('checked', 'checked')
    radio.onchange = function () {
      (j < 4) ? self.showInputab() : self.showInputa()
    }
    label = ce('label', {
      for: 'radio' + j
    })
    $(label).html(tab[j - 1])
    tr.appendChild(label)
  }

  const trValeursab = ce('tr')
  tabPrincipal.appendChild(trValeursab)
  const paneValeurs = ce('table', {
    id: 'paneVal'
  })
  trValeursab.appendChild(paneValeurs)
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
  const paneValr = ce('table')
  tr.appendChild(paneValr)
  tr = ce('tr')
  paneValr.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label', {
    id: 'labelb'
  })
  $(label).html(getStr('RayPix') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour la valeur de b
  this.inputr = getMtgInput()
  $(this.inputr).attr('size', 15)
  td.appendChild(this.inputr)
  $(this.inputr).val('6') // 6 pixels comme rayon proposé par défaut pour les crochets
  const paneBoutonsValFoncr = new PaneBoutonsValFonc(this.app, this, this.inputr, true, -1)
  paneValr.appendChild(paneBoutonsValFoncr)

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

  const indf = list.longueur() - 1
  this.editeura = new EditeurValeurReelle(app, this.inputa, indf, this.valeura, null)
  this.editeurb = new EditeurValeurReelle(app, this.inputb, indf, this.valeurb, null)
  this.editeurr = new EditeurValeurReelle(app, this.inputr, indf, this.valeurr, null)
  this.onSelectChange()
  this.create('CourbeFoncCr', 650)
}

CourbeFoncAvecCrochetsDlg.prototype = new MtgDlg()

CourbeFoncAvecCrochetsDlg.prototype.showInputab = function () {
  $('#paneVala').css('visibility', 'visible')
  $('#paneValb').css('visibility', 'visible')
}

CourbeFoncAvecCrochetsDlg.prototype.showInputa = function () {
  $('#paneVala').css('visibility', 'visible')
  $('#paneValb').css('visibility', 'hidden')
}

CourbeFoncAvecCrochetsDlg.prototype.onSelectChange = function () {
  $('#info').val(this.inf.pointeurs[this.select.selectedIndex].infoHist())
}

CourbeFoncAvecCrochetsDlg.prototype.OK = function () {
  // On cherche quel est l'indice du bouton radio coché
  let selectrad
  for (selectrad = 1; selectrad < 6; selectrad++) {
    if ($('#radio' + selectrad).prop('checked')) break
  }
  const avecEditb = selectrad < 4
  if (this.editeura.validate() && (avecEditb ? this.editeurb.validate() : true) && this.editeurr.validate()) {
    const app = this.app
    const nbPts = parseInt($('#inputnb').val())
    if (nbPts < 4 || nbPts > 5000 || isNaN(nbPts)) {
      new AvertDlg(app, 'Incorrect', function () {
        $('#inputnb').focus()
      })
    } else {
      const list = app.listePr
      // Array formé des noms des prototypes à utiliser
      const tab = ['CourbeSurabCrochetab', 'CourbeSurabCrochetb', 'CourbeSurabCrocheta',
        'CourbeSuraInfCrocheta', 'CourbeSurInfaCrocheta']
      const proto = app.docConsAv.getPrototype(tab[selectrad - 1])

      // Si les valeurs choisies pour le minimum et le maximum ne sont pas des références à des valeurs exsitantes
      // on crée de nouveux calculs qu'on ajoute à la figure
      const valeura = this.valeura.getCalcForImpProto(app, 'a', true)
      let valeurb
      if (avecEditb) valeurb = this.valeurb.getCalcForImpProto(app, 'b', true)
      const valeurr = this.valeurr.getCalcForImpProto(app, 'rpix', true)
      // On affecte les éléments sources au prototype
      let i = 0
      proto.get(i++).elementAssocie = this.paneListeRep.getSelectedRep()
      proto.get(i++).elementAssocie = this.inf.pointeurs[this.select.selectedIndex]
      proto.get(i++).elementAssocie = valeura
      if (selectrad < 4) proto.get(i++).elementAssocie = valeurb
      proto.get(i).elementAssocie = valeurr
      const impProto = new CImplementationProto(list, proto)
      impProto.implemente(app.dimf, proto)
      impProto.nomProto = getStr('CourbeFonc')
      const styleTrait = app.getStyleTrait()
      const coul = app.getCouleur()
      const lieu = impProto.premierFinal(NatObj.NLieu)
      lieu.donneCouleur(coul)
      lieu.donneStyle(styleTrait)
      lieu.nombrePoints = parseInt($('#inputnb').val())
      let arc = impProto.premierFinal(NatObj.NArc)
      const sw = styleTrait.strokeWidth
      arc.donneStyle(new StyleTrait(list, StyleTrait.styleTraitContinu, sw))
      arc.donneCouleur(coul)
      if (avecEditb) {
        arc = impProto.dernierFinal(NatObj.NArc)
        arc.donneStyle(new StyleTrait(list, StyleTrait.styleTraitContinu, sw))
        arc.donneCouleur(coul)
      }
      if (selectrad === 2 || selectrad === 3) {
        const pt = impProto.dernierFinal(NatObj.NPointDansRepere)
        pt.donneMotif(MotifPoint.rond)
        pt.donneCouleur(coul)
      }

      const indImpProto = list.indexOf(impProto)
      list.positionne(false, app.dimf)
      list.setReady4MathJax()
      list.afficheTout(indImpProto, app.svgFigure, true, app.doc.couleurFond)
      app.gestionnaire.enregistreFigureEnCours('CourbeFoncCr')
      this.destroy()
      app.activeOutilCapt()
    }
  }
}
