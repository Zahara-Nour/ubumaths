/*
 * Created by yvesb on 20/05/2017.
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
import EditeurValeurReelle from './EditeurValeurReelle'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import CValeur from '../objets/CValeur'
import CImplementationProto from '../objets/CImplementationProto'

import PaneListeReperes from './PaneListeReperes'
import { getMtgInput } from './dom'
export default GraduationsAxesDlg

/**
 *
 * @param {MtgApp} app
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function GraduationsAxesDlg (app, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'GradDlg', callBackOK, callBackCancel)
  const self = this
  const list = app.listePr
  // 4 CValeur pour stocker les valeurs pour l'équation, a, b et c.
  this.valgradx = new CValeur(list, 1)
  this.valgrady = new CValeur(list, 1)
  this.valnbgradx = new CValeur(list, 20)
  this.valnbgrady = new CValeur(list, 20)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)

  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  // En haut deux boutons radio pour le choix entre garduation simple et graduation trigo
  const div = ce('div')
  tr.appendChild(div)
  let radio = ce('input', {
    type: 'radio',
    id: 'radio1',
    name: 'typegrad'
  })
  div.appendChild(radio)
  radio.setAttribute('checked', 'checked')
  radio.onchange = function () {
    $('#trgradx').css('visibility', 'visible')
    $(self.paneBoutonsValFoncgradx).css('visibility', 'visible')
  }
  let label = ce('label', {
    for: 'radio1'
  })
  div.appendChild(label)
  $(label).html(getStr('NewRepDlg13'))
  radio = ce('input', {
    type: 'radio',
    id: 'radio2',
    name: 'typegrad',
    style: 'margin-left:20px'
  })
  div.appendChild(radio)
  radio.onchange = function () {
    $('#trgradx').css('visibility', 'hidden')
    $(self.paneBoutonsValFoncgradx).css('visibility', 'hidden')
  }
  label = ce('label', {
    for: 'radio2'
  })
  div.appendChild(label)
  $(label).html(getStr('NewRepDlg14'))

  const trPrincipal = ce('tr')
  tabPrincipal.appendChild(trPrincipal)
  let td = ce('td')
  trPrincipal.appendChild(td)
  const tabGauche = ce('table')
  td.appendChild(tabGauche)
  tr = ce('tr')
  tabGauche.appendChild(tr)
  tr = ce('tr', {
    id: 'trgradx'
  })
  tabGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('Unitex')) // Unité sur l'axe des abscisses
  td = ce('td')
  tr.appendChild(td)
  this.inputgradx = getMtgInput({
    size: 16
  })
  $(this.inputgradx).val('1')
  td.appendChild(this.inputgradx)
  this.paneBoutonsValFoncgradx = new PaneBoutonsValFonc(this.app, this, this.inputgradx, true, -1)
  tabGauche.appendChild(this.paneBoutonsValFoncgradx)

  tr = ce('tr')
  tabGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('NbGradx')) // Nombre de graduations sur l'axe (xx')
  td = ce('td')
  tr.appendChild(td)
  this.inputnbgradx = getMtgInput({
    size: 16
  })
  $(this.inputnbgradx).val('20')
  td.appendChild(this.inputnbgradx)
  let paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.inputnbgradx, true, -1)
  tabGauche.appendChild(paneBoutonsValFonc)

  tr = ce('tr')
  tabGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('Unitey')) // Pas de graduation sur l'axe (yy')
  td = ce('td')
  tr.appendChild(td)
  this.inputgrady = getMtgInput({
    size: 16
  })
  $(this.inputgrady).val('1')
  td.appendChild(this.inputgrady)
  paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.inputgrady, true, -1)
  tabGauche.appendChild(paneBoutonsValFonc)

  tr = ce('tr')
  tabGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('NbGrady')) // Nombre de graduations sur l'axe (yy')
  td = ce('td')
  tr.appendChild(td)
  this.inputnbgrady = getMtgInput({
    size: 16
  })
  $(this.inputnbgrady).val('20')
  td.appendChild(this.inputnbgrady)
  paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.inputnbgrady, true, -1)
  tabGauche.appendChild(paneBoutonsValFonc)

  td = ce('td')
  trPrincipal.appendChild(td)
  // A droite un panneau de choix de repère
  const indmax = list.longueur() - 1
  this.paneListeRep = new PaneListeReperes(app, indmax)
  td.appendChild(this.paneListeRep.getTab())

  this.editeurgradx = new EditeurValeurReelle(app, this.inputgradx, indmax, this.valgradx, null)
  this.editeurnbgradx = new EditeurValeurReelle(app, this.inputnbgradx, indmax, this.valnbgradx, null)
  this.editeurgrady = new EditeurValeurReelle(app, this.inputgrady, indmax, this.valgrady, null)
  this.editeurnbgrady = new EditeurValeurReelle(app, this.inputnbgrady, indmax, this.valnbgrady, null)

  this.create('GraduationAxes', 650)
}

GraduationsAxesDlg.prototype = new MtgDlg()

GraduationsAxesDlg.prototype.OK = function () {
  let gradx, nbgradx, grady, nbgrady
  const app = this.app
  const list = app.listePr
  const gradSimple = $('#radio1').prop('checked')
  if ((gradSimple ? this.editeurgradx.validate() : true) && this.editeurnbgradx.validate() &&
    this.editeurgrady.validate() && this.editeurnbgrady.validate()) {
    // Si les valeurs choisies pne sont pas des références à des valeurs existantes
    // on crée de nouveux calculs qu'on ajoute à la figure
    if (gradSimple) {
      gradx = this.valgradx.getCalcForImpProto(app, 'gradx', true)
    }
    nbgradx = this.valnbgradx.getCalcForImpProto(app, 'nbgradx', true)
    grady = this.valgrady.getCalcForImpProto(app, 'grady', true)
    nbgrady = this.valnbgrady.getCalcForImpProto(app, 'nbgrady', true)
    const proto = app.docCons.getPrototype(gradSimple ? 'GraduationAxesRepereAvecPas' : 'GraduationReperePourTrigoAvecPas')
    let i = 0
    proto.get(i++).elementAssocie = this.paneListeRep.getSelectedRep() // Pointe sur le repère
    if (gradSimple) proto.get(i++).elementAssocie = gradx
    proto.get(i++).elementAssocie = nbgradx
    proto.get(i++).elementAssocie = grady
    proto.get(i).elementAssocie = nbgrady
    const impProto = new CImplementationProto(list, proto)
    impProto.implemente(app.dimf, proto)
    impProto.nomProto = getStr('GraduationAxes')
    const indImpProto = list.indexOf(impProto)
    list.positionne(false, app.dimf)
    list.setReady4MathJax() // Nécessaire en cas de graduation trigonométrique qui utilise des CLatex
    list.afficheTout(indImpProto, app.svgFigure, true, app.doc.couleurFond)
    app.outilGraduationAxes.saveFig()
    this.callBackOK()
    this.destroy()
  }
}
