/*
 * Created by yvesb on 08/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CListeObjets from '../objets/CListeObjets'
import NatObj from '../types/NatObj'

export default OutilRideau
/**
 * Outil servant à démasquer des objest masqués
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilRideau (app) {
  Outil.call(this, app, 'Rideau', 32808, true)
}

OutilRideau.prototype = new Outil()

OutilRideau.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  this.cursor = 'default'
  const list = this.app.listePourConst
  // Il est nécessaire de créer une liste pointant sur les objets que l'utilisateur ne va pas démasquer car
  // deselect va appeler annuleClignotement qui donne l'attribut visible à tous les objets de la liste
  this.listeOb = new CListeObjets(list.uniteAngle, '') // Contiendra des pointeurs sur les objets qu'on a choisi de démasquer
  // S'il y a plus de 1000 objets on ne donne pas la possibilité de démasquer les objets finaux de constructions masqués
  // ce qui arrive souvent pour les figures dans lesquelles on a implémenté des constructions récursives ou itératives
  const b = list.longueur() <= 1000
  for (const el of list.col) {
    if (el.estDeNature(NatObj.NTtObj) && el.masque && !el.estElementIntermediaire() && (b || (!el.estElementFinal))) {
      this.ajouteClignotementDe(el)
      this.listeOb.add(el)
    }
  }
  // On rend les objets masqués visibles
  list.updateEvenMasked(app.svgFigure, app.doc.couleurFond)
  //
  app.outilPointageActif = app.outilPointageObjetClignotant
  app.outilPointageActif.aDesigner = NatObj.NTtObj
  app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigner un objet clignotant
  // même lorsqu'il est phase de masquage
  this.resetClignotement()
  this.cursor = 'default'
  app.indication('Rid')
}

OutilRideau.prototype.deselect = function () {
  Outil.prototype.deselect.call(this)
  this.listeOb.montreTout(false)
  this.listeOb.retireTout()
  const app = this.app
  app.listePr.update(app.svgFigure, app.doc.couleurFond, true) // true pour que les objets masqués soient masqués
  this.saveFig()
}

OutilRideau.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  app.listeClignotante.removeObject(elg)
  this.listeOb.removeObject(elg)
  elg.montre()
  app.listePr.update(app.svgFigure, app.doc.couleurFond, true)
}
