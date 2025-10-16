/*
 * Created by yvesb on 13/02/2025.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce, cens } from 'src/kernel/dom'
import MtgDlg from '../dialogs/MtgDlg'
import CValeur from '../objets/CValeur'
import { getStr } from '../kernel/kernel'
import $ from 'jquery'
import { getMtgInput } from '../dialogs/dom'
import PaneBoutonsValFonc from '../dialogs/PaneBoutonsValFonc'
import constantes from '../kernel/constantes'
import LineStylePanel from '../interface/LineStylePanel'
import ColorButton from '../interface/ColorButton'
import StyleTrait from '../types/StyleTrait'
import Color from '../types/Color'
import EditeurValeurReelle from '../dialogs/EditeurValeurReelle'
import AvertDlg from '../dialogs/AvertDlg'
import CImplementationProto from '../objets/CImplementationProto'
import PaneListeReperes from '../dialogs/PaneListeReperes'

export default QuadrillageDlg

function QuadrillageDlg (app, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'QuadDlg', callBackOK, callBackCancel)
  const self = this
  const list = app.listePr
  this.valxmin = new CValeur(list, '-5')
  this.valxmax = new CValeur(list, '5')
  this.valxstep = new CValeur(list, '1')
  this.valymin = new CValeur(list, '-5')
  this.valymax = new CValeur(list, '5')
  this.valystep = new CValeur(list, '1')
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  const trPrincipal = ce('tr')
  tabPrincipal.appendChild(trPrincipal)
  let td = ce('td')
  trPrincipal.appendChild(td)
  const tabGauche = ce('table')
  td.appendChild(tabGauche)
  td = ce('td', { style: 'text-align:center;' })
  trPrincipal.appendChild(td)
  const tabDroit = ce('table')
  td.appendChild(tabDroit)
  // Les 3 éditeurs pour les ordonnées
  let tr = ce('tr')
  tabGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('quadxmin')) // Abscisse de début du quadrillage
  td = ce('td')
  tr.appendChild(td)
  this.inputxmin = getMtgInput({
    size: 16
  })
  td.appendChild(this.inputxmin)
  $(this.inputxmin).val('-5')
  this.paneBoutonsValxmin = new PaneBoutonsValFonc(this.app, this, this.inputxmin, true, -1)
  tabGauche.appendChild(this.paneBoutonsValxmin)
  tr = ce('tr')
  tabGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('quadxmax')) // Abscisse de début du quadrillage
  td = ce('td')
  tr.appendChild(td)
  this.inputxmax = getMtgInput({
    size: 16
  })
  td.appendChild(this.inputxmax)
  $(this.inputxmax).val('5')
  this.paneBoutonsValxmax = new PaneBoutonsValFonc(this.app, this, this.inputxmax, true, -1)
  tabGauche.appendChild(this.paneBoutonsValxmax)
  tr = ce('tr')
  tabGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('quadxstep')) // Abscisse de début du quadrillage
  td = ce('td')
  tr.appendChild(td)
  this.inputxstep = getMtgInput({
    size: 16
  })
  td.appendChild(this.inputxstep)
  $(this.inputxstep).val('1')
  this.paneBoutonsValxstep = new PaneBoutonsValFonc(this.app, this, this.inputxstep, true, -1)
  tabGauche.appendChild(this.paneBoutonsValxstep)
  // Les 3 éditeurs pour les ordonnées
  tr = ce('tr')
  tabGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('quadymin')) // Abscisse de début du quadrillage
  td = ce('td')
  tr.appendChild(td)
  this.inputymin = getMtgInput({
    size: 16
  })
  td.appendChild(this.inputymin)
  $(this.inputymin).val('-5')
  this.paneBoutonsValymin = new PaneBoutonsValFonc(this.app, this, this.inputymin, true, -1)
  tabGauche.appendChild(this.paneBoutonsValymin)
  tr = ce('tr')
  tabGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('quadymax')) // Abscisse de début du quadrillage
  td = ce('td')
  tr.appendChild(td)
  this.inputymax = getMtgInput({
    size: 16
  })
  td.appendChild(this.inputymax)
  $(this.inputymax).val('5')
  this.paneBoutonsValymax = new PaneBoutonsValFonc(this.app, this, this.inputymax, true, -1)
  tabGauche.appendChild(this.paneBoutonsValymax)
  tr = ce('tr')
  tabGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('quadystep')) // Abscisse de début du quadrillage
  td = ce('td')
  tr.appendChild(td)
  this.inputystep = getMtgInput({
    size: 16
  })
  td.appendChild(this.inputystep)
  $(this.inputystep).val('1')
  this.paneBoutonsValystep = new PaneBoutonsValFonc(this.app, this, this.inputystep, true, -1)
  tabGauche.appendChild(this.paneBoutonsValystep)
  tr = ce('tr')
  tabDroit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  // A droite un panneau de choix de repère
  const indmax = list.longueur() - 1
  this.paneListeRep = new PaneListeReperes(app, indmax)
  td.appendChild(this.paneListeRep.getTab())
  // Au dessous du choix du repère ce qu'il faut pour choisir l'épaisseur et la couleur
  // En haut et à droite un svg va contenir un bouton de choix de couleur et un lineStylePanel
  tr = ce('tr')
  tabDroit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  const svg = cens('svg', {
    width: Math.floor(2 * constantes.lineStyleWidth + 5),
    height: String(6 * constantes.lineStyleButtonHeight)
  })
  td.appendChild(svg)
  this.lineStylePanel = new LineStylePanel(app, StyleTrait.styleTraitContinu)
  svg.appendChild(this.lineStylePanel.g)
  this.colorButton = new ColorButton(this, new Color(191, 191, 191))
  this.colorButton.container.setAttribute('transform', 'translate(' + String(constantes.lineStyleWidth + 5) + ',0)')
  svg.appendChild(this.colorButton.container)
  // En troisième colonne de la première ligne un select pour le choix de l'épaisseur
  tr = ce('tr')
  tabDroit.appendChild(tr)
  // td = ce('td', { style: 'text-align:center;' })
  tr.appendChild(td)
  tr = ce('tr')
  tabDroit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  const tabEpaisseur = ce('table')
  td.appendChild(tabEpaisseur)
  td = ce('td')
  tabEpaisseur.appendChild(td)
  const caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:120px;'
  })
  $(caption).html(getStr('Epaisseur'))
  td.appendChild(caption)
  this.select = ce('select', {
    size: 4, // Le nombre de lignes visibles par défaut
    style: 'width:80px;'
  })
  this.select.onchange = function () {
    self.thickness = self.select.selectedIndex + 1
  }
  this.thickness = 1
  td.appendChild(this.select)
  for (let i = 0; i < 5; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(String(i + 1))
    this.select.appendChild(option)
  }
  tr = ce('tr')
  tabGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('AvecGrad')) // Abscisse de début du quadrillage
  td = ce('td')
  tr.appendChild(td)
  this.cbGrad = ce('input', {
    id: 'cbgrad',
    type: 'checkBox'
  })
  td.appendChild(this.cbGrad)
  this.editeurxmin = new EditeurValeurReelle(app, this.inputxmin, indmax, this.valxmin, null)
  this.editeurxmax = new EditeurValeurReelle(app, this.inputxmax, indmax, this.valxmax, null)
  this.editeurxstep = new EditeurValeurReelle(app, this.inputxstep, indmax, this.valxstep, null)
  this.editeurymin = new EditeurValeurReelle(app, this.inputymin, indmax, this.valymin, null)
  this.editeurymax = new EditeurValeurReelle(app, this.inputymax, indmax, this.valymax, null)
  this.editeurystep = new EditeurValeurReelle(app, this.inputystep, indmax, this.valystep, null)
  this.create('Quadrillage', 650)
}

QuadrillageDlg.prototype = new MtgDlg()

QuadrillageDlg.prototype.OK = function () {
  function entier (x) {
    return Math.abs(x - Math.round(x)) < 0.000000001
  }
  const app = this.app
  const list = app.listePr
  const self = this
  if (this.editeurxmin.validate() && this.editeurxmax.validate() && this.editeurxstep.validate() &&
    this.editeurymin.validate() && this.editeurymax.validate() && this.editeurystep.validate()) {
    const xmin = this.valxmin.valeur
    const xmax = this.valxmax.valeur
    const xstep = this.valxstep.valeur
    const ymin = this.valymin.valeur
    const ymax = this.valymax.valeur
    const ystep = this.valystep.valeur
    if ((xmin >= xmax) || (ymin >= ymax) || (xstep === 0) || (ystep === 0)) {
      new AvertDlg(app, 'DonneesInvalides', function () {
        self.inputxmin.focus()
      })
      return
    } else {
      if (!entier((xmax - xmin) / xstep) || !entier((ymax - ymin) / ystep)) {
        new AvertDlg(app, 'AvertQuad', function () {
          self.inputxmin.focus()
        })
        return
      }
    }
    const calcxmin = this.valxmin.getCalcForImpProto(app, 'quadxmin', true)
    const calcxmax = this.valxmax.getCalcForImpProto(app, 'quadxmax', true)
    const calcxstep = this.valxstep.getCalcForImpProto(app, 'quadxstep', true)
    const calcymin = this.valymin.getCalcForImpProto(app, 'quadymin', true)
    const calcymax = this.valymax.getCalcForImpProto(app, 'quadymax', true)
    const calcystep = this.valystep.getCalcForImpProto(app, 'quadystep', true)
    const proto = app.docCons.getPrototype('QuadrillageDansRepereAvecPas')
    let i = 0
    proto.get(i++).elementAssocie = calcxmin
    proto.get(i++).elementAssocie = calcxmax
    proto.get(i++).elementAssocie = calcxstep
    proto.get(i++).elementAssocie = calcymin
    proto.get(i++).elementAssocie = calcymax
    proto.get(i++).elementAssocie = calcystep
    proto.get(i++).elementAssocie = this.paneListeRep.getSelectedRep() // Pointe sur le repère choisi
    const impProto = new CImplementationProto(list, proto)
    impProto.implemente(app.dimf, proto)
    const nbobj = list.longueur()
    const lieuObj1 = list.get(nbobj - 1) // Le deuxième  lieu d'objet de segments généré
    const lieuObj2 = list.get(nbobj - 7) // Le premier lieu d'objet de segments généré
    const seg1 = list.get(nbobj - 2) // Le deuxième segment générant le deuxième lieu d'objets
    const seg2 = list.get(nbobj - 8)
    const style = new StyleTrait(app.listePr, this.lineStylePanel.style, this.thickness)
    seg1.donneStyle(style)
    seg2.donneStyle(style)
    const color = this.colorButton.color
    lieuObj1.donneCouleur(color)
    lieuObj2.donneCouleur(color)
    // Il faut mettre à jour les deux lieux d'objets car on a pu changer le style de trait des
    // segemnts qui les génèrent
    lieuObj1.metAJour()
    lieuObj2.metAJour()
    impProto.nomProto = getStr('Quadrillage')
    const indImpProto = list.indexOf(impProto)
    // Si la case Avec graduaitons est cochée on va rajouter des graduations sur les axes
    if ($(this.cbGrad).prop('checked')) {
      const protoGrad = app.docCons.getPrototype('GraduationRepereAvecPas')
      let i = 0
      protoGrad.get(i++).elementAssocie = this.paneListeRep.getSelectedRep() // Pointe sur le repère choisi
      protoGrad.get(i++).elementAssocie = calcxmin
      protoGrad.get(i++).elementAssocie = calcxmax
      protoGrad.get(i++).elementAssocie = calcxstep
      protoGrad.get(i++).elementAssocie = calcymin
      protoGrad.get(i++).elementAssocie = calcymax
      protoGrad.get(i++).elementAssocie = calcystep
      const impProtoGrad = new CImplementationProto(list, protoGrad)
      impProtoGrad.implemente(app.dimf, protoGrad)
    }
    list.positionne(false, app.dimf)
    list.setReady4MathJax() // Nécessaire en cas de graduation trigonométrique qui utilise des CLatex
    list.afficheTout(indImpProto, app.svgFigure, true, app.doc.couleurFond)
    app.outilQuadrillage.saveFig()
    this.callBackOK()
    this.destroy()
  }
}
