/*
 * Created by yvesb on 27/04/2017.
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
import EditeurvaleurReelle from './EditeurValeurReelle'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import CValeur from '../objets/CValeur'
import CImplementationProto from '../objets/CImplementationProto'
import { getMtgInput } from './dom'
import AvertDlg from './AvertDlg'
export default SegmentParLongDlg

/**
 *
 * @param {MtgApp} app
 * @param pt
 * @param bptCree
 * @constructor
 */
function SegmentParLongDlg (app, pt, bptCree) {
  MtgDlg.call(this, app, 'segparlongdlg')
  this.pt = pt
  this.bptCree = bptCree
  const list = app.listePr
  this.valeur = new CValeur(list, 1)
  const self = this
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  const tr = ce('tr')
  tabPrincipal.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('LongSeg'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input = getMtgInput({
    id: 'mtginput'
  })
  input.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  td.appendChild(input)
  const indder = list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, input, true, indder)
  tabPrincipal.appendChild(paneBoutonsValFonc)
  this.editeur = new EditeurvaleurReelle(app, input, indder, this.valeur, null)
  this.create('SegmentParLong', 500)
}

SegmentParLongDlg.prototype = new MtgDlg()

SegmentParLongDlg.prototype.OK = function () {
  const app = this.app
  const list = app.listePr
  // if (this.app.lastDlgId() !== this.id) return;
  const valid = this.editeur.validate($('#mtginput').val())
  if (valid) {
    if (this.valeur.valeur <= 0) { new AvertDlg(app, 'Incorrect', function () { $('#mtginput').focus() }) } else {
      // Si la valeur choisie n'est pas une référence à une valeur exsitante
      // on crée un nouveau calcul qu'on ajoute à la figure
      const val = this.valeur.getCalcForImpProto(app, getStr('long'), true)
      const proto = app.docCons.getPrototype('SegmentParLongueur')
      proto.get(0).elementAssocie = val // Pointe sur le repère
      proto.get(1).elementAssocie = this.pt
      const impProto = new CImplementationProto(list, proto)
      impProto.implemente(app.dimf, proto)
      impProto.nomProto = getStr('SegmentParLong')
      // On modifie le style de trait et de couleur des objets finaux
      const col = app.getCouleur()
      const affval = list.get(list.longueur() - 1)
      affval.couleurFond = app.doc.couleurFond
      affval.effacementFond = false
      affval.donneCouleur(col)
      affval.taillePolice = 16
      const styleTrait = app.getStyleTrait()
      const indImpProto = list.indexOf(impProto)
      const pt = list.get(indImpProto + 2)
      pt.donneCouleur(col)
      pt.donneMotif(app.getStylePoint())
      pt.decaleNom(3, 0)
      // pt.donneNom(app.genereNomPourPoint()); // Ajout version 4.7.0.1
      pt.tailleNom = app.getTaillePoliceNom()
      const seg = list.get(indImpProto + 3)
      seg.donneCouleur(col)
      seg.donneStyle(styleTrait)
      list.positionne(false, app.dimf)
      // list.setReady4MathJax(); // Inutile car pas de CLatex
      list.afficheTout(indImpProto, app.svgFigure, true, app.doc.couleurFond)
      app.outilSegmentParLong.saveFig()
      app.activeOutilCapt()
      app.listePourConst = app.listePourConstruction()
      this.destroy()
      // On édite le nom du nouveau point créé
      const nameEditor = app.nameEditor
      if (this.pt.nom === '') {
        nameEditor.associeA(this.pt)
        nameEditor.setPosition()
        nameEditor.montre(true)
      } else {
        nameEditor.associeA(pt)
        nameEditor.setPosition()
        nameEditor.montre(true)
      }
    }
  }
}

SegmentParLongDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}

SegmentParLongDlg.prototype.onCancel = function () {
  if (this.bptCree) {
    const app = this.app
    const list = app.listePr
    list.get(list.longueur() - 1).removegElement(app.svgFigure)
    app.detruitDernierElement()
  }
  this.destroy()
  this.app.activeOutilCapt()
}
