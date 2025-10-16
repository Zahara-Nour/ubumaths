/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import { getStr } from '../kernel/kernel'
import CCalcul from '../objets/CCalcul'
import CImplementationProto from '../objets/CImplementationProto'
import CourbePolyDlg from '../dialogs/CourbePolyDlg'
import CMesureX from 'src/objets/CMesureX'
import CMesureY from 'src/objets/CMesureY'
import CValeur from 'src/objets/CValeur'
import CResultatValeur from 'src/objets/CResultatValeur'
import CMatrice from 'src/objets/CMatrice'

export default OutilCourbePoly

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilCourbePoly (app) {
  Outil.call(this, app, 'CourbePoly', 32987, true)
}
OutilCourbePoly.prototype = new Outil()

OutilCourbePoly.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const callBack = function () { app.activeOutilCapt() }
  const self = this
  new CourbePolyDlg(this.app, function (nbPoints, rep, nbPtsCourbe) {
    self.suite(nbPoints, rep, nbPtsCourbe)
  }, callBack)
}

/**
 * Une fois que la boîte de dialogue demandant le repère et le nombre de points a été validé, cette fonction
 * est appelée avec le nombre de points demandés nbPoints et le repère rep en paramètres
 * @param {number} nbPoints entier, le nombre de points par lesquels passera la courbe
 * @param {CRepere} rep  le repère dans lequel tracer la courbe
 * @param {number} nbPointsCourbe le nombre de points pour tracer la corube (1000 par défaut)
 */
OutilCourbePoly.prototype.suite = function (nbPoints, rep, nbPointsCourbe) {
  this.nbPoints = nbPoints
  this.nbPointsCourbe = nbPointsCourbe
  this.rep = rep
  const app = this.app
  const list = app.listePr
  // On crée maintenant nbPoints calculs qui contiendront les coefficients directeurs souhaités pour les tangentes
  this.coef = []
  // On crée un tableau qui contiendra des pointeurs sur les points cliqués qui n'étaient pas nommés
  this.ptsSansNom = []
  for (let i = 0; i < nbPoints; i++) {
    this.coef[i] = new CCalcul(list, null, false, list.genereNomPourCalcul('mt', true), '0')
    app.ajouteElement(this.coef[i])
  }
  // Maintenant on va attendre que l'utilisateur ait cliqué sur nnPoints
  this.nbPtsCliques = 0 // Ce nombre augmentera à chaque fois qu'on clique sur un point
  this.points = [] // Ce tableau contiendra des pointeurs sur les points cliqués
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  app.outilPointageActif.reset()
  app.indication(getStr('indCourTan1') + '1' + getStr('indCourTan2'), '', true)
}

OutilCourbePoly.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const list = app.listePr
  const nbPoints = this.nbPoints
  this.nbPtsCliques++
  this.points.push(elg)
  this.ajouteClignotementDe(elg)
  this.excluDeDesignation(elg)
  if (this.nbPtsCliques === 1) this.resetClignotement()
  // Si tous les points cont été désignés, on implémente la construction
  const tabmesabs = []
  const tabmesord = []
  if (this.nbPtsCliques >= nbPoints) {
    this.annuleClignotement()
    // On crée des mesures d'abscisses  et d'ordonnées pour chacun des points créés
    for (let i = 0; i < nbPoints; i++) {
      const pt = this.points[i]
      if (pt.nom === '') {
        pt.donneNom(list.genereNomPourPointOuDroite('M', true))
        pt.nomMasque = true
      }
      const mesabs = new CMesureX(list, null, false,
        list.genereNomPourCalcul('mesx', true), this.rep, this.points[i])
      tabmesabs.push(mesabs)
      const mesord = new CMesureY(list, null, false,
        list.genereNomPourCalcul('mesy', true), this.rep, this.points[i])
      tabmesord.push(mesord)
      app.ajouteElement(mesabs)
      app.ajouteElement(mesord)
    }
    // Oncrée une matrice de deux colonnes formées des coordonnées mesurées
    // On crée une matrice de deux colonnes formées des mesures d'abscisses en première colonne
    // et d'ordonnées en deuxième
    const tabVal = []
    for (let i = 0; i < nbPoints; i++) {
      const lig = []
      for (let j = 0; j < 2; j++) {
        lig.push(new CValeur(list, new CResultatValeur(list, tabmesabs[i])))
        lig.push(new CValeur(list, new CResultatValeur(list, tabmesord[i])))
      }
      tabVal.push(lig)
    }
    const mat = new CMatrice(list, null, false, list.genereNomPourCalcul('matCoord', true),
      nbPoints, 2, tabVal)
    app.ajouteElement(mat)
    const proto = app.docConsAv.getPrototype('PolyParCoord')
    proto.get(0).elementAssocie = mat
    const impProto = new CImplementationProto(list, proto)
    impProto.implemente(app.dimf, proto)
    impProto.nomProto = getStr('CourbePoly')
    // Il faut maintenant créer la courbe de la fonction polynôme qui est le dernier objet
    // final de la construction
    // Dernier paramètre false car pas de gestion auto des discontinuités
    app.ajouteCourbeSurR(this.rep, list.get(list.longueur() - 1),
      list.genereNomPourPointOuDroite('x', true),
      list.genereNomPourCalcul('x', true),
      list.genereNomPourCalcul('y', true),
      this.nbPointsCourbe, true, true, false)
    const indImpProto = list.indexOf(impProto)
    list.positionne(false, app.dimf)
    list.setReady4MathJax()
    list.afficheTout(indImpProto, app.svgFigure, true, app.doc.couleurFond)
    this.saveFig()
    // Corrigé version 5.6.4
    if (app.estExercice) app.listePourConst = app.listePourConstruction()
    app.activeOutilCapt()
  } else app.indication(getStr('indCourTan1') + String(this.nbPtsCliques + 1) + getStr('indCourTan2'), '', true)
}

OutilCourbePoly.prototype.activationValide = function () {
  const list = this.app.listePr
  return list.nombreObjetsCalcul(NatCal.NRepere) > 0
}

OutilCourbePoly.prototype.isLineTool = function () {
  return true
}
