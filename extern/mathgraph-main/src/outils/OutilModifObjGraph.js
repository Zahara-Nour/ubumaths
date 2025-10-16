/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObj'
export default OutilModifObjGraph

/**
 * Outil servant à modifier un objet qui a été créé par un menu
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilModifObjGraph (app) {
  Outil.call(this, app, 'ModifObjGraph', 35000, true)
}

OutilModifObjGraph.prototype = new Outil()

OutilModifObjGraph.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NTtObj
  if (app.estExercice) {
    for (let i = 0; i < app.nbObjInit; i++) {
      const el = app.listePr.get(i)
      if (el.estDeNature(NatObj.NTtObj) && el.modifiableParMenu()) this.excluDeDesignation(el)
    }
  }
  // Version 8.4.2 : on ne permet pas de modifier les affchages (textes, LaTeX, images, affichages de valeurs)
  // quand ils sont punaisés.
  const list = app.listePr
  for (const el of list.col) {
    if (el.estDeNature(NatObj.NAffLieAPoint) && el.fixed) this.excluDeDesignation(el)
  }
  app.outilPointageCre.reset(true) // true pour ne pouvoir modifier que les objets modifiables par menu
}

OutilModifObjGraph.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const self = this
  this.ajouteClignotementDe(elg)
  this.resetClignotement()
  const ant = elg.antecedentDirect()
  if (ant.estDeNature(NatObj.NTransformation)) {
    ant.modificationImage(app, elg, true)
  } else {
    elg.modifDlg(app, function () { // La fonction utilisée quand l'utilisateur valide la boîte de dialogue
      self.annuleClignotement()
      const list = app.listePr
      list.initialiseDependances()
      list.positionneDependantsDe(false, app.dimf, elg, true) // full à true pour un positionneFull
      list.updateDependants(elg, app.svgFigure, app.doc.couleurFond, true)
    }, function () {
      self.annuleClignotement()
      self.reselect()
    })
  }
}

OutilModifObjGraph.prototype.isReadyForTouchEnd = function () {
  return false
}
