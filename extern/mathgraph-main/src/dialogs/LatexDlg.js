/*
 * Created by yvesb on 13/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce, cens } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
import PaneAlignement from './PaneAlignement'
import PaneTaillePolice from './PaneTaillePolice'
import PaneModeAffichage from './PaneModeAffichage'
import TextButton from './TextButton'
import CLatex from '../objets/CLatex'
import StyleEncadrement from '../types/StyleEncadrement'
import InsertionDynamiqueDlg from './InsertionDynamiqueDlg'
import InsertionFormuleDlg from './InsertionFormuleDlg'
import MtgTextAreaWithCharSpe from './MtgTextAreaWithCharSpe'
import AvertDlg from './AvertDlg'
import addQueue from 'src/kernel/addQueue'

export default LatexDlg

/**
 * Dialogue de création ou modification d'un affichage LaTeX
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param latex Le CLatex à modifier
 * @param modification true si on modifie un CLaTeX déjà présent dans la figure
 * @param callBackOK Fonction de callBack à appeler si on valide par OK
 * @param callBackCancel Fonction de callBack à appeler si on referme sans valider
 */
function LatexDlg (app, latex, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'LatexDlg', callBackOK, callBackCancel)
  this.latex = latex
  this.modification = modification
  const self = this
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabBoutons = ce('table')
  tr.appendChild(tabBoutons)
  /*
  this.textarea = ce("textarea", {
    cols : 40,
    rows : 12,
    wrap : "off"
  });
  */
  this.textarea = new MtgTextAreaWithCharSpe(app, { cols: 45, rows: 12, wrap: 'off' }, ['grec', 'math', 'arrows'], true, this)
  this.textarea.owner = this
  const jqta = $(this.textarea)
  jqta.css('overflow-x', 'scroll')
  /*
  $(this.textarea).css("overflow-y", "auto");
  */
  // On ne peut pas utiliser de style css pour le textarea car sinon il est écrasé par un autre style de jquery
  jqta.css('font-size', '14px')
  jqta.keyup(this.onkeyup)

  // Le tableau des boutons est formé de 3 lignes de 9 icônes
  const files = [
    ['LatexQuotient', 'LatexRacine', 'LatexRacineN', 'LatexVecteur', 'LatexMesureAlgebrique', 'LatexSouligne',
      'LatexIntegrale', 'LatexSigma', 'LatexTexte'],
    ['LatexPar', 'LatexCrochet', 'LatexAccolade', 'LatexAccoladeDouble', 'LatexValeurAbsolue',
      'LatexNorme', 'LatexMatrice21', 'LatexMatrice12',
      'LatexMatrice22'],
    ['LatexMatrice31', 'LatexMatrice13',
      'LatexAngle', 'LatexLimite', 'LatexSin', 'LatexCos', 'LatexTan', 'LatexExp', 'LatexLn']
  ]
  // Version 6.4.8 : On utilise dfrac au lieu de frac suite au passage à MathJax3
  const codes = [
    ['\\dfrac{}{}', '\\sqrt{}', '\\sqrt [] {}', '\\overrightarrow {}', '\\overline {}', '\\underline {}',
      '\\int_{}^{} ', '\\sum_{}^{}', '\\text{}'],
    ['\\left(  \\right)', '\\left[  \\right]', '\\left\\{  \\right.', '\\left\\{  \\right\\}', '\\left|  \\right|',
      '\\left\\|  \\right\\|', '\\begin{array}{l}\n \n\\\\ \n\\end{array}', '\\begin{matrix}\n & \n\\end{matrix}',
      '\\begin{matrix}\n & \n\\\\  & \n\\end{matrix}'],
    ['\\begin{array}{l}\n \n\\\\ \n\\\\ \n\\end{array}', '\\begin{matrix}\n &  & \n\\end{matrix}',
      '\\widehat{}', '\\lim_{x \\to {}}', '\\sin ', '\\cos ', '\\tan ', '\\mathrm{e}^{}', '\\ln ']
  ]
  const decalage = [
    [7, 6, 7, 17, 11, 12, 6, 6, 6],
    [7, 7, 8, 8, 7, 8, 17, 15, 15],
    [17, 15, 9, 13, 5, 5, 5, 12, 4]
  ]
  for (let i = 0; i < 3; i++) {
    tr = ce('tr')
    for (let j = 0; j < 9; j++) {
      tabBoutons.appendChild(tr)
      const textButton = new TextButton(app, files[i][j], codes[i][j], this.textarea, decalage[i][j], function () { self.updatePreview() })
      tr.appendChild(textButton.container)
    }
  }
  // Au centre un tableau d'une seule ligne contenant le textarea d'édition du code et à droite un svg pour l'aperçu temps réel
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabCentre = ce('table')
  tr.appendChild(tabCentre)
  tr = ce('tr')
  let th = ce('th', {
    class: 'mtgcaption'
  })
  $(th).html(getStr('CodeLatex'))
  tabCentre.appendChild(th)
  th = ce('th', {
    class: 'mtgcation'
  })
  $(th).html(getStr('Apercu'))
  tabCentre.appendChild(th)
  tabCentre.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  td.appendChild(this.textarea)
  td = ce('td')
  $(td).css('overflow', 'scroll').css('border', '1px solid lightgray').css('vertical-align', 'top')
  tr.appendChild(td)
  const div = ce('div', {
    // Depuis le 18/3/2025 on impose la fonte 'Roboto' sur tous les conteneurs de svg mtg32
    style: 'position:relative;margin-left:auto;margin-right:auto;width:400px;height:150px;font-weight:normal;font-family: Roboto, sans-serif;'
  })
  td.appendChild(div)
  this.svg = cens('svg', {
    width: '600',
    height: '600'
  })
  div.appendChild(this.svg)
  // Un ligne contenant un bouton pour insertion de valeur dynamique
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const btnIns = ce('button', {
    tabindex: -1
  })
  btnIns.onclick = function () { self.onBtnIns() }
  $(btnIns).html(getStr('InsVal'))
  tr.appendChild(btnIns)
  const btnFor = ce('button', {
    tabindex: -1,
    style: 'margin-left:10px;'
  })
  btnFor.onclick = function () { self.onBtnFor() }
  $(btnFor).html(getStr('InsForDlg1'))
  tr.appendChild(btnFor)

  // Dans la troisième ligne du tableau principal, un tableau de trois colonnes contenant un panneau de choix de
  // mode d'affichage, un panneau de choix d'alignement et un manneua de choix de taille de police
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.paneAlign = new PaneAlignement(app, latex.alignementHorizontal, latex.alignementVertical)
  const tableBas = ce('table')
  tr.appendChild(tableBas)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  td.appendChild(this.paneAlign.container)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  this.paneTaillePolice = new PaneTaillePolice(latex.taillePolice, function () { self.updatePreview() })
  tableBas.appendChild(this.paneTaillePolice.container)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  const list = app.listePr
  const indmax = modification ? list.indexOf(latex) - 1 : list.longueur() - 1
  this.paneModeAffichage = new PaneModeAffichage(this, false, latex.effacementFond,
    latex.encadrement, latex.couleurFond, latex.angText.chaineInfo(), indmax,
    function () { self.updatePreview() }, !latex.estFinalEtAngleEstDynamique())
  td.appendChild(this.paneModeAffichage.container)
  if (modification) $(this.textarea).val(latex.chaineCommentaire)
  this.create('AffLatex', 820)
}

LatexDlg.prototype = new MtgDlg()

LatexDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.textarea)
  this.paneModeAffichage.init()
}

LatexDlg.prototype.OK = function () {
  // const time = Date.now();
  // if (time - this.timeStart < MtgDlg.delay) return; // Moins d'une seconde dans doute mauvais endroit de clic sur un bouton
  // if (this.app.lastDlgId() !== this.id) return;
  const self = this
  const ch = $(this.textarea).val()
  if (ch === '') {
    new AvertDlg(this.app, 'Vide', function () { self.textarea.focus() })
  } else {
    const lat = this.latex
    const pma = this.paneModeAffichage
    if (!pma.validate()) {
      return
    } // Faute dans l'angle de rotation du texte
    lat.encadrement = pma.getStyleEnc()
    lat.effacementFond = pma.getEffFond()
    lat.couleurFond = pma.getColor()
    if (!lat.estFinalEtAngleEstDynamique()) lat.angText = pma.getAng()
    // Si l'alignement vertical ou horizontal est changé on annule tout décalage manuel précédent
    const newHorAlign = this.paneAlign.getHorAlign()
    const newVerAlign = this.paneAlign.getVerAlign()
    if ((lat.alignementHorizontal !== newHorAlign) || (lat.alignementVertical !== newVerAlign)) {
      lat.decX = 0
      lat.decY = 0
    }
    //
    lat.alignementHorizontal = newHorAlign
    lat.alignementVertical = newVerAlign
    lat.taillePolice = this.paneTaillePolice.getTaille()
    lat.chaineCommentaire = ch
    // $(lat).css("font-size", Fonte.tailleLatex(lat.taillePolice))
    lat.determineDependances()
    lat.positionne(false, this.app.dimf)
    this.app.outilActif.annuleClignotement()
    lat.setReady4MathJax()
    /* Supprimé version 6.4.1
    if (this.modification) {
      // Il faut récréer l'affichage complètement
      addQueue(function () {
        lat.reCreateDisplay(self.app.svgFigure)
      })
    }
    */
    if (this.callBackOK !== null) this.callBackOK()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
  }
}

LatexDlg.prototype.onkeyup = function (evt) {
  // Non traité si c'est la touche entrée ou une touche de déplacement de curseur
  const kc = evt.keyCode
  // On sort si touche entrée ou déplacement à gauche ou à droite
  if ((evt.charCode === 0) && ((kc === 13) || (kc === 37) || (kc === 39))) return
  const self = this.owner
  addQueue(function () {
    while (self.svg.childNodes.length !== 0) self.svg.removeChild(self.svg.childNodes[0])
  })
  addQueue(function () {
    self.updatePreview()
  })
}

LatexDlg.prototype.updatePreview = function () {
  const app = this.app
  const list = app.listePr
  const pma = this.paneModeAffichage
  const lat = new CLatex(list, null, false, this.latex.couleur, 0, 0, 0, 0, false, null,
    this.paneTaillePolice.getTaille(), pma.getStyleEnc(),
    pma.getEffFond(), pma.getColor(), 0, 0, $(this.textarea).val())
  lat.determineDependances(list.indexOf(this.latex))
  lat.positionne(false, app.dimf)
  lat.setReady4MathJax()
  const self = this
  addQueue(function () {
    while (self.svg.childNodes.length !== 0) self.svg.removeChild(self.svg.childNodes[0])
    const g = lat.createg()
    if (lat.encadrement !== StyleEncadrement.Sans) $(g).attr('transform', 'translate(3,2)')
    self.svg.appendChild(g)
  })
}

LatexDlg.prototype.onBtnIns = function () {
  const app = this.app
  const list = app.listePr
  new InsertionDynamiqueDlg(app, this.textarea, this, this.modification ? list.indexOf(this.latex) - 1 : -1, true)
}

LatexDlg.prototype.onBtnFor = function () {
  const app = this.app
  const list = app.listePr
  new InsertionFormuleDlg(app, this.textarea, this, this.modification ? list.indexOf(this.latex) - 1 : -1, true)
}
