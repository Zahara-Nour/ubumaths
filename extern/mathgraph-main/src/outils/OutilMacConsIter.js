/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import { natObjGraphPourProto } from '../kernel/kernelAdd'
import CMacroConstructionIterative from '../objets/CMacroConstructionIterative'
import MacConsIterDlg from '../dialogs/MacConsIterDlg'
import ConstImpSrcNumDlg from '../dialogs/ConstImpSrcNumDlg'
import CAffLiePt from '../objets/CAffLiePt'
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import CSousListeObjets from '../objets/CSousListeObjets'
import CPrototype from '../objets/CPrototype'

export default OutilMacConsIter

/**
 * Outil servant à créer une macro d'implémentation récursive de construction
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacConsIter (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacConsIter', 33064)
}

OutilMacConsIter.prototype = new OutilMac()

OutilMacConsIter.prototype.select = function () {
  OutilMac.prototype.select.call(this)
  this.mac = null
}

OutilMacConsIter.prototype.traiteObjetDesigne = function (elg, point) {
  const self = this
  const app = this.app
  const doc = app.doc
  const list = app.listePr
  // Par défaut profondeur de récursion de 2 avec la première construction disponible
  if (this.mac === null) {
    this.addComClign(point)
    this.mac = new CMacroConstructionIterative(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null,
      16, false, doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, '', '', null, doc.tablePrototypes[0],
      200, 0, false, Color.black, 0, StyleTrait.stfc(list), Color.black, false)
    new MacConsIterDlg(app, this.mac, false,
      function () {
        self.actionApresDlg()
      })
  } else {
    const proto = this.mac.proto
    this.excluDeDesignation(elg)
    this.ajouteClignotementDe(elg)
    this.tab.push(elg)
    this.indEnCours++
    if (this.indEnCours < proto.nbObjSources) {
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
OutilMacConsIter.prototype.actionApresDlg = function () {
  // Si les éléments sources ne sont pas que des objets graphiques, il faut ouvrir une boîte de dialogue de choix
  // d'objets sources numériques
  const self = this
  const app = this.app
  this.mac.listeAssociee = new CSousListeObjets() // Contiendra les objets sources pour l'implémentation récursive
  const proto = this.mac.proto
  if (proto.natureSources !== CPrototype.graph) {
    new ConstImpSrcNumDlg(app, proto, function (tab) {
      self.tab = tab
      self.suite(tab)
    }, function () {
      app.activeOutilCapt()
    }
    )
  } else {
    this.tab = []
    this.suite()
  }
}

OutilMacConsIter.prototype.suite = function () {
  const app = this.app
  const proto = this.mac.proto
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

OutilMacConsIter.prototype.end = function () {
  const tab = this.tab
  const mac = this.mac
  for (let i = 0; i < tab.length; i++) {
    mac.listeAssociee.add(tab[i])
  }
  this.annuleClignotement()
  this.creeObjet()
}

OutilMacConsIter.prototype.activationValide = function () {
  return this.app.doc.tablePrototypes.length > 0
}
