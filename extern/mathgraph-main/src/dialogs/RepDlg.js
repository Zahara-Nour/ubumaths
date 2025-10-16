/*
 * Created by yvesb on 22/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
import CValeur from '../objets/CValeur'
import EditeurValeurReelle from './EditeurValeurReelle'
import CDroiteAB from '../objets/CDroiteAB'
import LineStylePanel from '../interface/LineStylePanel'
import ColorButton from '../interface/ColorButton'
import constantes from '../kernel/constantes'
import StyleTrait from '../types/StyleTrait'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import { getMtgInput } from './dom'

import Color from '../types/Color'
import { ce, ceIn, cens, ge } from '../kernel/dom'
import CImplementationProto from '../objets/CImplementationProto'

export default RepDlg

/**
 *
 * @param {MtgApp} app
 * @param rep
 * @param modification
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function RepDlg (app, rep, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'RepDlg', callBackOK, callBackCancel)
  this.rep = rep
  this.modification = modification
  this.thickness = rep.style.strokeWidth
  const list = app.listePr
  this.absor = new CValeur(list, 0)
  this.ordor = new CValeur(list, 0)
  this.unitex = new CValeur(list, 1)
  this.unitey = new CValeur(list, 1)
  // On utilise un cellspacing important pour que la boîte de dialogue soit assez grande pour que
  // la boîte de dialogue de chois de couleur tienne dedans
  const tabPrincipal = ce('table', {
    cellspacing: 25
  })
  this.appendChild(tabPrincipal)
  const tr1 = ce('tr')
  tabPrincipal.appendChild(tr1)
  const tabHaut = ce('table')
  tr1.appendChild(tabHaut)
  let tr = ce('tr')
  tabHaut.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const tabHautGauche = ce('table')
  td.appendChild(tabHautGauche)
  let tr2 = ce('tr')
  tabHautGauche.appendChild(tr2)
  td = ce('td')
  tr2.appendChild(td)
  let input = ce('input', {
    id: 'rdquadver',
    type: 'checkBox'
  })
  td.appendChild(input)
  if (rep.quadrillageVertical) input.setAttribute('checked', 'checked')
  td = ce('td')
  tr2.appendChild(td)
  let label = ce('label', {
    for: 'rdquadver'
  })
  $(label).html(getStr('NewRepDlg5'))
  td.appendChild(label)
  tr2 = ce('tr')
  tabHautGauche.appendChild(tr2)
  td = ce('td')
  tr2.appendChild(td)
  input = ce('input', {
    id: 'rdquadhor',
    type: 'checkBox'
  })
  td.appendChild(input)
  if (rep.quadrillageHorizontal) input.setAttribute('checked', 'checked')
  td = ce('td')
  tr2.appendChild(td)
  label = ce('label', {
    for: 'rdquadhor'
  })
  $(label).html(getStr('NewRepDlg6'))
  td.appendChild(label)
  tr2 = ce('tr')
  tabHautGauche.appendChild(tr2)
  td = ce('td')
  tr2.appendChild(td)
  input = ce('input', {
    id: 'rdquadpoint',
    type: 'checkBox'
  })
  td.appendChild(input)
  if (rep.pointilles) input.setAttribute('checked', 'checked')
  td = ce('td')
  tr2.appendChild(td)
  label = ce('label', {
    for: 'rdquadpoint'
  })
  $(label).html(getStr('NewRepDlg7'))
  td.appendChild(label)
  // En haut et à droite un svg va contenir un bouton de choix de couleur et un lineStylePanel
  td = ce('td')
  tr.appendChild(td)
  const svg = cens('svg', {
    width: Math.floor(2 * constantes.lineStyleWidth + 5),
    height: String(6 * constantes.lineStyleButtonHeight)
  })
  td.appendChild(svg)
  this.lineStylePanel = new LineStylePanel(app, rep.style.style)
  svg.appendChild(this.lineStylePanel.g)
  this.colorButton = new ColorButton(this, rep.couleur)
  this.colorButton.container.setAttribute('transform', 'translate(' + String(constantes.lineStyleWidth + 5) + ',0)')
  svg.appendChild(this.colorButton.container)
  // En troisième colonne de la première ligne un select pour le choix de l'épaisseur
  td = ce('td')
  tr.appendChild(td)
  const caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:80px;'
  })
  $(caption).html(getStr('Epaisseur'))
  td.appendChild(caption)
  this.select = ce('select', {
    size: 4, // Le nombre de lignes visibles par défaut
    style: 'width:80px;'
  })
  const self = this
  this.select.onchange = function () {
    self.thickness = self.select.selectedIndex + 1
  }
  td.appendChild(this.select)
  for (let i = 0; i < 5; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === this.thickness - 1) option.setAttribute('selected', 'selected')
    $(option).html(String(i + 1))
    this.select.appendChild(option)
  }
  // Quatre éditeurs de formule pour l'abscisse à l'origine, l'ordonnée à l'origine et les unités
  const indmax = modification ? list.indexOf(rep) - 1 : list.longueur() - 1
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabBas = ce('table')
  tr.appendChild(tabBas)
  tr = ce('tr')
  tabBas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('OrAbs'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputabsor = getMtgInput({
    id: 'inputabsor'
  })
  td.appendChild(this.inputabsor)
  $(this.inputabsor).val(rep.abscisseOrigine.chaineInfo())
  let paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.inputabsor, true, indmax)
  tabBas.appendChild(paneBoutonsValFonc)

  tr = ce('tr')
  tabBas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('OrOrd'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputordor = getMtgInput({
    id: 'inputordor'
  })
  td.appendChild(this.inputordor)
  $(this.inputordor).val(rep.ordonneeOrigine.chaineInfo())
  paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.inputordor, true, indmax)
  tabBas.appendChild(paneBoutonsValFonc)

  tr = ce('tr')
  tabBas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('Unitex'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputunitex = getMtgInput({
    id: 'inputunitex'
  })
  td.appendChild(this.inputunitex)
  $(this.inputunitex).val(rep.uniteX.chaineInfo())
  paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.inputunitex, true, indmax)
  tabBas.appendChild(paneBoutonsValFonc)

  tr = ce('tr')
  tabBas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('Unitey'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputunitey = getMtgInput({
    id: 'inputunitey'
  })
  td.appendChild(this.inputunitey)
  $(this.inputunitey).val(rep.uniteY.chaineInfo())
  paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.inputunitey, true, indmax)
  tabBas.appendChild(paneBoutonsValFonc)

  if (!modification) {
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    label = ce('label')
    tr.appendChild(label)
    $(label).html(getStr('NewRepDlg8'))
    input = ce('input', {
      type: 'checkbox',
      id: 'creerax'
    })
    label.appendChild(input)
    $(input).attr('checked', 'checked')

    tr = ceIn(tabPrincipal, 'tr')
    const tabAxes = ceIn(tr, 'table')
    input.onchange = () => {
      tabAxes.style.display = input.checked ? 'block' : 'none'
    }
    // Quatre lignes pour choisir si on veut on non des flèches au bout des axes
    // et si on veut ou non des étiquettes au bout des axes
    tr = ceIn(tabAxes, 'tr')
    this.cbFlechex = ceIn(tr, 'input', {
      type: 'checkbox',
      id: 'cbFlechex'
    })
    this.cbFlechex.checked = true
    label = ceIn(tr, 'label', {
      for: 'cbFlechex'
    })
    $(label).html(getStr('AddFlechex'))
    tr = ceIn(tabAxes, 'tr')
    this.cbFlechey = ceIn(tr, 'input', {
      type: 'checkbox',
      id: 'cbFlechey'
    })
    this.cbFlechey.checked = true
    label = ceIn(tr, 'label', {
      for: 'cbFlechey'
    })
    $(label).html(getStr('AddFlechey'))
    tr = ceIn(tabAxes, 'tr')
    label = ceIn(tr, 'label')
    $(label).html(getStr('EtiqAxex'))
    this.inputEtiqx = ceIn(tr, 'input', {
      type: 'text'
    })
    tr = ceIn(tabAxes, 'tr')
    label = ceIn(tr, 'label')
    $(label).html(getStr('EtiqAxey'))
    this.inputEtiqy = ceIn(tr, 'input', {
      type: 'text'
    })
  }

  this.editororx = new EditeurValeurReelle(app, this.inputabsor, indmax, this.absor, null)
  this.editorory = new EditeurValeurReelle(app, this.inputordor, indmax, this.ordor, null)
  this.editorux = new EditeurValeurReelle(app, this.inputunitex, indmax, this.unitex, null)
  this.editoruy = new EditeurValeurReelle(app, this.inputunitey, indmax, this.unitey, null)

  // Création de la boîte de dialogue par jqueryui
  this.create('Repere', 600)
}

RepDlg.prototype = new MtgDlg()

RepDlg.prototype.OK = function () {
  let axe
  const app = this.app
  const svgFig = app.svgFigure
  const dimf = app.dimf
  const list = app.listePr
  const indiceImpInitial = list.longueur()
  if (this.editororx.validate($('#inputabsor').val())) {
    if (this.editorory.validate($('#inputordor').val())) {
      if (this.editorux.validate($('#inputunitex').val())) {
        if (this.editoruy.validate($('#inputunitey').val())) {
          const rep = this.rep
          rep.donneCouleur(this.colorButton.color)
          rep.style = new StyleTrait(this.app.listePr, this.lineStylePanel.style, this.thickness)
          rep.quadrillageHorizontal = $('#rdquadver').prop('checked')
          rep.quadrillageVertical = $('#rdquadhor').prop('checked')
          rep.pointilles = $('#rdquadpoint').prop('checked')
          rep.abscisseOrigine = this.absor
          rep.ordonneeOrigine = this.ordor
          rep.uniteX = this.unitex
          rep.uniteY = this.unitey
          if (this.modification) app.gestionnaire.enregistreFigureEnCours('ModifObj')
          else {
            if (ge('creerax').checked) {
              const taille = app.getTaillePoliceNom()
              const list = app.listePr
              const stfc = StyleTrait.stfc(list)
              if (!list.existeDroiteABDefiniePar(rep.o, rep.i)) {
                axe = new CDroiteAB(list, null, false, Color.black, false, 0, 0, false, '', taille, stfc, 0.9, rep.o, rep.i)
                app.ajouteElement(axe, false)
                axe.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
              }
              if (!list.existeDroiteABDefiniePar(rep.o, rep.j)) {
                axe = new CDroiteAB(list, null, false, Color.black, false, 0, 0, false, '', taille, stfc, 0.9, rep.o, rep.j)
                app.ajouteElement(axe, false)
                axe.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
              }
              if (this.cbFlechex.checked) {
                if (this.inputEtiqx.value) {
                  // On charge la construction qui est contenue dans this.app.docConst
                  const proto = this.app.docCons.getPrototype('AjoutFlecheAxeAbsAvecEtiq')
                  proto.get(0).elementAssocie = rep
                  const impProto = new CImplementationProto(list, proto)
                  impProto.implemente(dimf, proto)
                  impProto.nomProto = getStr('AddArrowx')
                  // On change le texte créé par le prototype par le contenu de l'éditeur
                  list.get(list.longueur() - 1).chaineCommentaire = this.inputEtiqx.value
                  list.positionne(false, dimf)
                  list.afficheTout(indiceImpInitial, svgFig, true, app.doc.couleurFond)
                } else {
                  // On charge la construction qui est contenue dans this.app.docConst
                  const proto = this.app.docCons.getPrototype('AjoutFlecheAxeAbs')
                  proto.get(0).elementAssocie = rep
                  const impProto = new CImplementationProto(list, proto)
                  impProto.implemente(dimf, proto)
                  impProto.nomProto = getStr('AddArrowx')
                  list.afficheTout(indiceImpInitial, svgFig, true, app.doc.couleurFond)
                }
              } else {
                const etiqx = this.inputEtiqx.value
                if (etiqx) {
                  const proto = this.app.docCons.getPrototype('AjoutEtiqAxeAbs')
                  proto.get(0).elementAssocie = rep
                  const impProto = new CImplementationProto(list, proto)
                  impProto.implemente(dimf, proto)
                  impProto.nomProto = getStr('AddLabelx')
                  // On change le texte créé par le prototype par le contenu de l'éditeur
                  list.get(list.longueur() - 1).chaineCommentaire = etiqx
                  list.positionne(false, dimf)
                  list.afficheTout(indiceImpInitial, svgFig, true, app.doc.couleurFond)
                }
              }
              if (this.cbFlechey.checked) {
                if (this.inputEtiqy.value) {
                  // On charge la construction qui est contenue dans this.app.docConst
                  const proto = this.app.docCons.getPrototype('AjoutFlecheAxeOrdAvecEtiq')
                  proto.get(0).elementAssocie = rep
                  const impProto = new CImplementationProto(list, proto)
                  impProto.implemente(dimf, proto)
                  impProto.nomProto = getStr('AddArrowy')
                  // On change le texte créé par le prototype par le contenu de l'éditeur
                  list.get(list.longueur() - 1).chaineCommentaire = this.inputEtiqy.value
                  list.positionne(false, dimf)
                  list.afficheTout(indiceImpInitial, svgFig, true, app.doc.couleurFond)
                } else {
                  // On charge la construction qui est contenue dans this.app.docConst
                  const proto = this.app.docCons.getPrototype('AjoutFlecheAxeOrd')
                  proto.get(0).elementAssocie = rep
                  const impProto = new CImplementationProto(list, proto)
                  impProto.implemente(dimf, proto)
                  impProto.nomProto = getStr('AddArrowy')
                  list.afficheTout(indiceImpInitial, svgFig, true, app.doc.couleurFond)
                }
              } else {
                const etiqy = this.inputEtiqy.value
                if (etiqy) {
                  const proto = this.app.docCons.getPrototype('AjoutEtiqAxeOrd')
                  proto.get(0).elementAssocie = rep
                  const impProto = new CImplementationProto(list, proto)
                  impProto.implemente(dimf, proto)
                  impProto.nomProto = getStr('AddLabely')
                  // On change le texte créé par le prototype par le contenu de l'éditeur
                  list.get(list.longueur() - 1).chaineCommentaire = etiqy
                  list.positionne(false, dimf)
                  list.afficheTout(indiceImpInitial, svgFig, true, app.doc.couleurFond)
                }
              }
            }
          }
          if (this.callBackOK !== null) this.callBackOK()
          this.destroy()
        } else this.inputunitey.focus()
      } else this.inputunitex.focus()
    } else this.inputordor.focus()
  } else this.inputabsor.focus()
}
