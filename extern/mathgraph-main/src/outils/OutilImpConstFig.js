/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import { getStr } from '../kernel/kernel'
import { natObjGraphPourProto } from '../kernel/kernelAdd'
import NatCal from '../types/NatCal'
import CPrototype from '../objets/CPrototype'
import CImplementationProto from '../objets/CImplementationProto'
import CCalcul from '../objets/CCalcul'
import CCalculComplexe from '../objets/CCalculComplexe'
import ChoixConstFigDlg from '../dialogs/ChoixConstFigDlg'
import ConstImpSrcNumDlg from '../dialogs/ConstImpSrcNumDlg'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilImpConstFig

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilImpConstFig (app) {
  // Attention : Pour cet outil le troisième pramètre est "GestionConst" pour que l'icône de app.outilGestionConst soit
  // désactivée quand on désactive l'outil (cet outil n'a pas d'icône)
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'GestionConst', -1, true, false, false, false)
}
OutilImpConstFig.prototype = new Outil()

OutilImpConstFig.prototype.select = function () {
  Outil.prototype.select.call(this)
  const self = this
  new ChoixConstFigDlg(this.app, 'Implem', function (proto) {
    self.actionApresChoixConst(proto)
  },
  function () {
    self.app.activeOutilCapt()
  })
}

// tab est un array qui, si on doit choisir des éléments graphiques sources, contient soit un pointeur sur un élément de
// la liste des objets choisi comme source soit une chaîne de caractères qui contient un calcul à créer et à rajouter
// à la figure, on affacet alors comme élément source un pointeur sur ce calcul créé
/**
 * Fonction appelée une fois qu'on a choisi un prototype à implémenter dans la boîte de dialogue de choix de prototype
 * @param proto
 */
OutilImpConstFig.prototype.actionApresChoixConst = function (proto) {
  // Si les éléments sources ne sont pas que des objets graphiques, il faut ouvrir une boîte de dialogue de choix
  // d'objets sources numériques
  const app = this.app
  const self = this
  const list = this.app.listePr
  this.proto = proto
  if ((list.pointeurLongueurUnite === null) && proto.utiliseLongueurUnite()) {
    const unite = proto.premiereLongueur()
    if (unite === null) {
      new AvertDlg(app, getStr('ErrLongUn'), function () { app.activeOutilCapt() })
      return
    }
  }
  // Il peut arriver qu'il n'y ait pas d'objets sources à choisir
  if (proto.nbObjSources === 0) {
    self.tab = []
    this.implemente()
  } else {
    if (proto.natureSources !== CPrototype.graph) {
      // S'il n'y a qu'un seul objet source numérique et que la figure ne contient qu'un seul repère
      // on affecte directement le repère come objet source sans passer par une boîte de dialogue
      if ((proto.nbSrcCal() === 1) && (proto.get(0).estDeNatureCalcul(NatCal.NRepere)) &&
        (list.nombreObjetsCalcul(NatCal.NRepere) === 1)) {
        this.tab = [list.premierRepVis()]
        this.suite(this.tab)
      } else {
        new ConstImpSrcNumDlg(this.app, proto, function (tab) {
          self.tab = tab
          self.suite(tab)
        })
      }
    } else {
      this.tab = []
      self.suite()
    }
  }
}

OutilImpConstFig.prototype.suite = function () {
  const app = this.app
  const proto = this.proto
  if (proto.natureSources === CPrototype.calc) this.implemente()
  else {
    // Il faut maintenant choisir les objets sources graphiques
    this.indEnCours = proto.nbSrcCal() // this.indEnCours contient l'indice de l'objet source (graphique) qu'il faut désigner
    this.app.outilPointageActif = app.outilPointageCre
    app.outilPointageCre.aDesigner = natObjGraphPourProto(proto.get(this.indEnCours).getNature())
    app.outilPointageCre.reset()
    app.indication(proto.chIndSourceGraph(this.indEnCours), 'ClicOn', true)
    this.resetClignotement()
  }
}

OutilImpConstFig.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const proto = this.proto
  this.excluDeDesignation(elg)
  this.ajouteClignotementDe(elg)
  this.tab.push(elg)
  this.indEnCours++
  if (this.indEnCours < proto.nbObjSources) {
    app.outilPointageCre.aDesigner = natObjGraphPourProto(proto.get(this.indEnCours).getNature())
    app.indication(proto.chIndSourceGraph(this.indEnCours), 'ClicOn', true)
  } else this.implemente()
}

OutilImpConstFig.prototype.implemente = function () {
  const app = this.app
  const proto = this.proto
  const list = app.listePr
  this.annuleClignotement()

  // On associe à tous les objets sources du prototype les objets auxquels ils sont associées
  // qui sont dans this.tab mais, pour les éléments de tab qui sont des chaînes de caractères, on
  // crée des calculs et on fait pointer les éléments génériques associés vers ces calculs
  for (let i = 0; i < this.tab.length; i++) {
    const gen = proto.get(i)
    const ch = this.tab[i]
    if (typeof ch !== 'string') gen.elementAssocie = ch
    else {
      // Il faut créer une calcul dont la formule est dans ch;
      const nomCalc = list.genereNomPourCalcul(gen.nom, false)
      const calcul = (gen.estDeNatureCalcul(NatCal.NCalculReel))
        ? new CCalcul(list, null, false, nomCalc, ch)
        : new CCalculComplexe(list, null, false, nomCalc, ch)
      app.ajouteElement(calcul)
      gen.elementAssocie = calcul
    }
  }
  const impProto = new CImplementationProto(list, proto)
  impProto.implemente(app.dimf, proto)
  const indImpProto = list.indexOf(impProto)
  list.reconstruitChainesCalcul(impProto + 1, impProto + proto.longueur() - proto.nbObjSources)

  list.positionne(false, app.dimf)
  this.saveFig()
  list.setReady4MathJax()
  list.afficheTout(indImpProto, app.svgFigure, true, app.doc.couleurFond)
  app.activeOutilCapt()
}

OutilImpConstFig.prototype.activationValide = function () {
  return this.app.doc.tablePrototypes.length > 0
}
