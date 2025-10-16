/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr } from '../kernel/kernel'
import Nat from '../types/Nat'
import NatObj from '../types/NatObj'
import OutilObjetPar2Objets from './OutilObjetPar2Objets'
import CSurfaceDeuxLieux from '../objets/CSurfaceDeuxLieux'
import CImplementationProto from '../objets/CImplementationProto'
import AvertDlg from '../dialogs/AvertDlg'
import { defaultSurfOpacity } from 'src/objets/CMathGraphDoc'
export default OutilCouronne

/**
 * Outil servant à créer une surface délimitée par un polygône, un cercle, un arc de cercle ou un lieu fermé
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilCouronne (app) {
  const nat = Nat.or(NatObj.NLieu, NatObj.NCercle, NatObj.NPolygone)
  OutilObjetPar2Objets.call(this, app, 'Couronne', 32873, true, nat, nat)
}

OutilCouronne.prototype = new OutilObjetPar2Objets()

OutilCouronne.prototype.isSurfTool = function () {
  return true
}

OutilCouronne.prototype.select = function () {
  // On ne doit pas pouvoir désigner des lieux de points non fermés
  OutilObjetPar2Objets.prototype.select.call(this)
  const list = this.app.listePr
  for (let i = 0; i < list.longueur(); i++) {
    const el = list.get(i)
    if (el.estDeNature(NatObj.NLieu) && !el.infoLieu.fermeOuNon) this.excluDeDesignation(el)
  }
}

OutilCouronne.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'indCour'
    case 2 : return 'indCour'
  }
}

OutilCouronne.prototype.creeObjet = function () {
  let proto; let surf
  const app = this.app
  const list = app.listePr
  const docConsAv = app.docConsAv
  const ob1 = this.ob1; const ob2 = this.ob2
  // Cas où l'utilisateur a cliqué sur deux lieux fermés : Inutile d'utiliser une macro-construction
  const coul = app.getCouleur()
  coul.opacity = defaultSurfOpacity
  if (ob1.estDeNature(NatObj.NLieu) && ob2.estDeNature(NatObj.NLieu)) {
    surf = new CSurfaceDeuxLieux(app.listePr, null, false, app.getCouleur(), false, app.getStyleRemplissage(), ob1, ob2)
    app.ajouteElement(surf)
    const verif = app.verifieDernierElement(1)
    if (verif) {
      // L'élément créé existe bien et a été ajouté à la liste
      surf.creeAffichage(this.app.svgFigure, false, app.doc.couleurFond)
      this.annuleClignotement()
      this.saveFig()
    } else new AvertDlg(app, 'DejaCree')

    this.reselect()
    return
  } else if (this.sontDeNat(NatObj.NCercle, NatObj.NCercle)) proto = docConsAv.getPrototype('Couronne')
  else if (this.sontDeNat(NatObj.NCercle, NatObj.NPolygone)) proto = docConsAv.getPrototype('CouronneCerclePoly')
  else if (this.sontDeNat(NatObj.NPolygone, NatObj.NPolygone)) proto = docConsAv.getPrototype('CouronnePolys')
  else if (this.sontDeNat(NatObj.NCercle, NatObj.NLieu)) proto = docConsAv.getPrototype('CouronneCercleLieu')
  else if (this.sontDeNat(NatObj.NPolygone, NatObj.NLieu)) proto = docConsAv.getPrototype('CouronnePolyLieu')

  // On affecte les éléments sources au prototype
  proto.get(0).elementAssocie = this.ob1
  proto.get(1).elementAssocie = this.ob2
  const impProto = new CImplementationProto(list, proto)
  impProto.implemente(app.dimf, proto)
  impProto.nomProto = getStr('Couronne')

  surf = impProto.dernierFinal(NatObj.NSurface)
  surf.donneCouleur(coul)
  surf.donneStyleRemplissage(app.getStyleRemplissage())
  const indImpProto = list.indexOf(impProto)
  list.positionne(false, app.dimf)
  list.setReady4MathJax()
  list.afficheTout(indImpProto, app.svgFigure, true, app.doc.couleurFond)
  // Corrigé version 5.6.4
  if (app.estExercice) app.listePourConst = app.listePourConstruction()
  this.saveFig()
}

/**
 * Fonction renvoyant true si this.ob1 et this.obj sont de nature nat1 et nat2.
 * Dans le cas où c'est le cas, this.ob1 et this.ob2 sont remaniés si nécessaire de façon à ce que
 * Si au moins un des deux est un cercle, this.ob1 pointe sur le cercle
 * Si aucun n'est un cercle et si au moins un des deux est un polygone, this.ob1 pointe sur le polygone
 * @param nat1
 * @param nat2
 */
OutilCouronne.prototype.sontDeNat = function (nat1, nat2) {
  const ob1 = this.ob1; const ob2 = this.ob2
  if ((ob1.estDeNature(nat1) && ob2.estDeNature(nat2)) || (ob1.estDeNature(nat2) && ob2.estDeNature(nat1))) {
    if (ob1.estDeNature(NatObj.NCercle)) return true
    if (ob2.estDeNature(NatObj.NCercle)) {
      this.ob1 = ob2
      this.ob2 = ob1
    } else {
      if (ob1.estDeNature(NatObj.NPolygone)) return true
      if (ob2.estDeNature(NatObj.NPolygone)) {
        this.ob1 = ob2
        this.ob2 = ob1
      }
    }
    return true
  } else return false
}

OutilCouronne.prototype.preIndication = function () {
  return 'Couronne'
}

OutilCouronne.prototype.isSurfTool = function () {
  return true
}
