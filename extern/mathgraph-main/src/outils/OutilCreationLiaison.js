/*
 * Created by yvesb on 20/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import NatObj from '../types/NatObj'
import Nat from '../types/Nat'
import CPointLieDroite from '../objets/CPointLieDroite'
import CPointLieCercle from '../objets/CPointLieCercle'
import CPointLieLigne from '../objets/CPointLieLigne'
import CPointLiePoint from '../objets/CPointLiePoint'
import CPointLieLieuParPtLie from '../objets/CPointLieLieuParPtLie'
import CPointLieLieuParVar from '../objets/CPointLieLieuParVar'
import Pointeur from '../types/Pointeur'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilCreationLiaison

/**
 * Outil servant à transformer un point libre en un point lié à u  objet
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilCreationLiaison (app) {
  Outil.call(this, app, 'CreationLiaison', 32877, true)
}

OutilCreationLiaison.prototype = new Outil()

OutilCreationLiaison.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.point = null // Pointera sur le point libre qu'on veut lier à un objet
  app.outilPointageActif = app.outilPointageObjetClignotant
  app.listeClignotante.ajouteObjetsParNatureNonMasques(app.listePr, NatObj.NPointBase)
  app.outilPointageActif.aDesigner = NatObj.NPointBase
  app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigner un objet clignotant
  this.resetClignotement()
  app.indication('indCrLiaison1')
}

OutilCreationLiaison.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  if (this.point === null) {
    this.point = elg
    // On n'exclut pas pointPourTrace d'une désignation possible car le point lié peut être égal
    // au point générateur du lieu
    this.annuleClignotement()
    app.outilPointageActif = app.outilPointageCre
    app.outilPointageActif.aDesigner = Nat.or(NatObj.NTteDroite, NatObj.NCercle, NatObj.NArc, NatObj.NTtPoint,
      NatObj.NPolygone, NatObj.NLigneBrisee, NatObj.NLieu, NatObj.NPointBase)
    app.outilPointageActif.reset()
    this.ajouteClignotementDe(elg)
    this.excluDeDesignation(elg)
    this.resetClignotement()
    app.indication('indCrLiaison2')
  } else {
    if (elg.appartientABlocDependantPourReclassement(this.point)) {
      const self = this
      new AvertDlg(app, 'OpImp', function () {
        self.app.activeOutilCapt()
      })
    } else this.creeLiaison(elg, point)
  }
}

OutilCreationLiaison.prototype.creeLiaison = function (el, point) {
  let Cl, ptLie
  const app = this.app
  const list = app.listePr
  this.annuleClignotement()
  if (el.estDeNature(NatObj.NTteDroite)) {
    Cl = CPointLieDroite
  } else {
    if (el.estDeNature(NatObj.NTtCercle)) {
      Cl = CPointLieCercle
    } else {
      if (el.estDeNature(Nat.or(NatObj.NPolygone, NatObj.NLigneBrisee))) {
        Cl = CPointLieLigne
      } else {
        if (el.estDeNature(NatObj.NTtPoint)) {
          Cl = CPointLiePoint
        } else {
          if (el.estDeNature(NatObj.NLieu)) {
            if (el.className === 'CLieuDePoints') {
              Cl = CPointLieLieuParPtLie
            } else {
              // Cas d'un point lié à un lieu de points généré par une variable
              Cl = CPointLieLieuParVar
            }
          }
        }
      }
    }
  }
  if (Cl === CPointLiePoint) {
    ptLie = new Cl(app.listePr, null, false, this.point.couleur, this.point.nomMasque,
      this.point.decX, this.point.decY, this.point.masque, this.point.nom, this.point.tailleNom,
      this.point.motif, this.point.marquePourTrace, el)
  } else {
    ptLie = new Cl(app.listePr, null, false, this.point.couleur, this.point.nomMasque,
      this.point.decX, this.point.decY, this.point.masque, this.point.nom, this.point.tailleNom,
      this.point.motif, this.point.marquePourTrace, this.point.fixed, 0, el)
    const abs = new Pointeur()
    const pointres = { x: 0, y: 0 }
    ptLie.testDeplacement(app.dimf, point.x, point.y, pointres, abs)
    ptLie.donneAbscisse(abs.getValue())
  }
  const indicePointRemplace = list.indexOf(this.point)
  const indiceObjetCible = el.estElementFinal ? list.indexOf(el.impProto.dernierObjetFinal()) : list.indexOf(el)
  list.remplaceObjet(this.point, ptLie)
  list.remplacePoint(this.point, ptLie)
  ptLie.tag = this.point.tag // Ajout version 6.6.0

  // Si l'objet auquel on doit lier le point a été créé après le
  // point, il faut décaler le point ainsi que tous les objets en
  // dépendant et ayant été créés entre ce point et l'objet
  // immédiatement après cet objet}
  if (indicePointRemplace < indiceObjetCible) list.decaleDependants(indicePointRemplace, indiceObjetCible)

  // Ajout version 4.8.0 : Il faut remettre à jour les index de chaque élément de la liste (CElementBase.index)
  list.updateIndexes()
  this.point.removegElement(app.svgFigure)
  const coulFond = app.doc.couleurFond
  ptLie.positionne(false, app.dimf)
  ptLie.creeAffichage(app.svgFigure, false, coulFond)
  list.metAJour() // Ajout version 6.3.0
  list.positionne(false, app.dimf)
  list.update(app.svgFigure, coulFond, true)
  this.saveFig()
  app.reInitConst()
  app.activeOutilCapt()
}
