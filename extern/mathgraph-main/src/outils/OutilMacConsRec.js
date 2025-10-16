/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import { natObjGraphPourProto } from '../kernel/kernelAdd'
import CMacroConstructionRecursive from '../objets/CMacroConstructionRecursive'
import MacConsRecDlg from '../dialogs/MacConsRecDlg'
import ConstImpSrcNumDlg from '../dialogs/ConstImpSrcNumDlg'
import CAffLiePt from '../objets/CAffLiePt'
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import CSousListeObjets from '../objets/CSousListeObjets'
import CPrototype from '../objets/CPrototype'

export default OutilMacConsRec

/**
 * Outil servant à créer une macro d'implémentation récursive de construction
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacConsRec (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacConsRec', 33065)
}

OutilMacConsRec.prototype = new OutilMac()

OutilMacConsRec.prototype.select = function () {
  OutilMac.prototype.select.call(this)
  this.mac = null
}

OutilMacConsRec.prototype.traiteObjetDesigne = function (elg, point) {
  let i
  const self = this
  const app = this.app
  const doc = app.doc
  const list = app.listePr
  const tableProto = []
  // Pa défaut profondeur de récursion de 2 avec la première construction disponible
  for (i = 0; i < 3; i++) tableProto.push(doc.tablePrototypes[0])
  if (this.mac === null) {
    this.addComClign(point)
    this.mac = new CMacroConstructionRecursive(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null,
      16, false, doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, '', '', null, tableProto, 1, 2, 0,
      false, false, Color.black, 0, StyleTrait.stfc(list), Color.black, false)
    new MacConsRecDlg(app, this.mac, false,
      function () {
        self.actionApresDlg()
      },
      function () {
        app.activeOutilCapt()
      })
  } else {
    const proto = this.mac.tableProto[0]
    this.excluDeDesignation(elg)
    this.ajouteClignotementDe(elg)
    this.tab.push(elg)
    this.indEnCours++
    if (this.indEnCours < proto.nbSrcGraph()) { // Modifié version 6.4.1
      app.outilPointageCre.aDesigner = natObjGraphPourProto(proto.get(this.indEnCours).getNature())
      app.indication(proto.chIndSourceGraph(this.indEnCours), 'ClicOn', true)
    } else this.end()
  }
}

// this.tab est un array qui, si on doit choisir des éléments graphiques sources, contient soit un pointeur sur un élément de
// la liste des objets choisi comme source soit une chaîne de caractères qui contient un calcul à créer et à rajouter
// à la figure, on affecte alors comme élément source un pointeur sur ce calcul créé
/**
 * Fonction appelée une fois qu'on a choisi un prototype à implémenter dans la boîte de dialogue de choix de prototype
 */
OutilMacConsRec.prototype.actionApresDlg = function () {
  // Si les éléments sources ne sont pas que des objets graphiques, il faut ouvrir une boîte de dialogue de choix
  // d'objets sources numériques
  const self = this
  this.mac.listeAssociee = new CSousListeObjets() // Contiendra les objets sources pour l'implémentation récursive
  const proto = this.mac.tableProto[0]
  if (proto.natureSources !== CPrototype.graph) {
    new ConstImpSrcNumDlg(this.app, proto, function (tab) {
      self.tab = tab
      self.suite(tab)
    })
  } else {
    this.tab = []
    this.suite()
  }
}

OutilMacConsRec.prototype.suite = function () {
  const app = this.app
  const proto = this.mac.tableProto[0]
  if (proto.natureSources === CPrototype.calc) this.end()
  else {
    // Il faut maintenant choisir les objets sources graphiques
    this.indEnCours = proto.nbSrcCal() // this.indEnCours contient l'indice de l'objet source (graphique) qu'il faut désigner
    this.app.outilPointageActif = app.outilPointageCre
    app.outilPointageCre.aDesigner = natObjGraphPourProto(proto.get(this.indEnCours).getNature())
    app.outilPointageCre.reset()
    app.indication(proto.chIndSourceGraph(this.indEnCours), 'ClicOn', true)
  }
}

OutilMacConsRec.prototype.end = function () {
  const tab = this.tab
  const mac = this.mac
  for (let i = 0; i < tab.length; i++) {
    mac.listeAssociee.add(tab[i])
  }
  this.annuleClignotement()
  this.creeObjet()
}

OutilMacConsRec.prototype.activationValide = function () {
  return this.app.doc.tablePrototypes.length > 0
}
