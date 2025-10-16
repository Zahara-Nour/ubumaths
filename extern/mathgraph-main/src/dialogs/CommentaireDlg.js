/*
 * Created by yvesb on 18/03/2017.
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
import CCommentaire from '../objets/CCommentaire'
import StyleEncadrement from '../types/StyleEncadrement'
import InsertionDynamiqueDlg from './InsertionDynamiqueDlg'
import InsertionFormuleDlg from './InsertionFormuleDlg'
import MtgTextAreaWithCharSpe from './MtgTextAreaWithCharSpe'
import AvertDlg from './AvertDlg'
import addQueue from 'src/kernel/addQueue'

export default CommentaireDlg

/**
 * Dialogue de création ou modification d'un affichage de texte
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param comm Le CCommentaire à modifier
 * @param modification true si on modifie un CCommentaire déjà présent dans la figure
 * @param callBackOK Fonction de callBack à appeler si on valide par OK
 * @param callBackCancel Fonction de callBack à appeler si on referme sans valider
 */
function CommentaireDlg (app, comm, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'CommentaireDlg', callBackOK, callBackCancel)
  this.comm = comm
  this.modification = modification
  const self = this
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabBoutons = ce('table')
  tr.appendChild(tabBoutons)
  this.textarea = new MtgTextAreaWithCharSpe(app, { cols: 45, rows: 12, wrap: 'off' }, ['grec', 'math', 'arrows'], false, this)
  this.textarea.owner = this
  const jqta = $(this.textarea)
  jqta.css('overflow-x', 'scroll')
  // On ne peut pas utiliser de style css pour le textarea car sinon il est écrasé par un autre style de jquery
  jqta.css('font-size', '14px')
  jqta.keyup(this.onkeyup)

  // Le tableau des boutons est formé de 3 lignes de 9 icônes
  const files =
    ['styleTexteExposant', 'styleTexteIndice', 'styleTexteNormal', 'styleTexteGras', 'styleTexteItalique', 'styleTexteSouligne']
  const codes =
    ['#H()', '#L()', '#N', '#G', '#I', '#U']
  const decalage = [3, 3, 2, 2, 2, 2]
  tr = ce('tr')
  for (let j = 0; j < 6; j++) {
    tabBoutons.appendChild(tr)
    const textButton = new TextButton(app, files[j], codes[j], this.textarea, decalage[j], function () { self.updatePreview() })
    tr.appendChild(textButton.container)
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
  $(th).html(getStr('TexteAAff'))
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
  $(td).css('overflow', 'scroll')
  $(td).css('border', '1px solid lightgray')
  $(td).css('vertical-align', 'top')
  tr.appendChild(td)
  const div = ce('div', {
    // Depuis le 18/3/2025 on impose la fonte 'Roboto' sur tous les conteneurs de svg mtg32
    style: 'position:relative;width:400px;height:150px;font-weight:normal;font-family: Roboto, sans-serif;'
  })
  td.appendChild(div)
  this.svg = cens('svg', {
    width: '600px',
    height: '600px'
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
  this.paneAlign = new PaneAlignement(app, comm.alignementHorizontal, comm.alignementVertical)
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
  this.paneTaillePolice = new PaneTaillePolice(comm.taillePolice, function () { self.updatePreview() })
  tableBas.appendChild(this.paneTaillePolice.container)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  const list = app.listePr
  const indmax = modification ? list.indexOf(comm) - 1 : list.longueur() - 1
  this.paneModeAffichage = new PaneModeAffichage(this, false, comm.effacementFond,
    comm.encadrement, comm.couleurFond, comm.angText.chaineInfo(), indmax,
    function () { self.updatePreview() }, !comm.estFinalEtAngleEstDynamique())
  td.appendChild(this.paneModeAffichage.container)
  if (modification) $(this.textarea).val(comm.chaineCommentaire)
  this.create('Commentaire', 820)
}

CommentaireDlg.prototype = new MtgDlg()

CommentaireDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.textarea)
  this.paneModeAffichage.init()
  this.updatePreview()
}

CommentaireDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const ch = $(this.textarea).val()
  const self = this
  if (ch === '') {
    new AvertDlg(this.app, 'Vide', function () { self.textarea.focus() })
  } else {
    const comm = this.comm
    const pma = this.paneModeAffichage
    if (!pma.validate()) {
      return
    } // Faute dans l'angle de rotation du texte

    comm.encadrement = pma.getStyleEnc()
    comm.effacementFond = pma.getEffFond()
    comm.couleurFond = pma.getColor()
    if (!comm.estFinalEtAngleEstDynamique()) comm.angText = pma.getAng()
    // Si l'alignement vertical ou horizontal est changé on annule tout décalage manuel précédent
    const newHorAlign = this.paneAlign.getHorAlign()
    const newVerAlign = this.paneAlign.getVerAlign()
    if ((comm.alignementHorizontal !== newHorAlign) || (comm.alignementVertical !== newVerAlign)) {
      comm.decX = 0
      comm.decY = 0
    }
    //
    comm.alignementHorizontal = newHorAlign
    comm.alignementVertical = newVerAlign
    comm.taillePolice = this.paneTaillePolice.getTaille()
    comm.chaineCommentaire = ch
    comm.determineDependances()
    comm.positionne(false, this.app.dimf)
    this.app.outilActif.annuleClignotement()
    comm.setReady4MathJax()
    // Les lignes suivantes avaient été supprimées version 6.4.1 mais sont nécessaires cer sinon si on change la
    // d'affichage la nouvelle taille n'est pas appliquée après validation mais elles ne doivent pas être appelées
    // si cette boîte de dialogue est appelée depuis la boîte de dialogue de protocole
    if (this.modification && self.app.dlg[0] !== 'ProtocoleDlg') {
      // Il faut récréer l'affichage complètement
      addQueue(function () {
        comm.reCreateDisplay(self.app.svgFigure)
      })
    }
    if (this.callBackOK !== null) this.callBackOK()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
  }
}

CommentaireDlg.prototype.onkeyup = function (evt) {
  // Non traité si c'est la touche entrée ou une touche de déplacement de curseur
  const kc = evt.keyCode
  // On sort si touche déplacement à gauche ou à droite mais pas si touch Entrée qui permet de passer à la ligne
  if ((evt.charCode === 0) && ((kc === 37) || (kc === 39))) return
  const self = this.owner
  self.updatePreview()
}
/**
 * Met à jour l'aperçu
 * @returns {void}
 */
CommentaireDlg.prototype.updatePreview = function () {
  const app = this.app
  const list = app.listePr
  const pma = this.paneModeAffichage
  const comm = new CCommentaire(list, null, false, this.comm.couleur, 0, 0, 0, 0, false, null,
    this.paneTaillePolice.getTaille(), pma.getStyleEnc(),
    pma.getEffFond(), pma.getColor(), 0, 0, $(this.textarea).val())
  comm.determineDependances(list.indexOf(this.comm))
  comm.positionne(false, app.dimf)
  comm.setReady4MathJax()
  const self = this
  addQueue(function () {
    while (self.svg.childNodes.length !== 0) self.svg.removeChild(self.svg.childNodes[0])
    const g = comm.createg()
    if (comm.encadrement !== StyleEncadrement.Sans) $(g).attr('transform', 'translate(2,2)')
    self.svg.appendChild(g)
  })
}

CommentaireDlg.prototype.onBtnIns = function () {
  const app = this.app
  const list = app.listePr
  new InsertionDynamiqueDlg(app, this.textarea, this, this.modification ? list.indexOf(this.comm) - 1 : -1, false)
}

CommentaireDlg.prototype.onBtnFor = function () {
  const app = this.app
  const list = app.listePr
  new InsertionFormuleDlg(app, this.textarea, this, this.modification ? list.indexOf(this.comm) - 1 : -1, false)
}
