/*
 * Created by yvesb on 11/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObj'

export default OutilExecutionMacro

/**
 * Outil servant à modifier le style de tracé ou la couleur d'un objet
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilExecutionMacro (app) {
  Outil.call(this, app, 'ExecutionMacro', 32942, false)
}

OutilExecutionMacro.prototype = new Outil()

OutilExecutionMacro.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  app.listePr.terminerMacros = false // Ajout version 6.4. Utilisé dans CMacro.passageMacroSuivante
  app.outilPointageActif = app.outilPointageExecMac
  app.outilPointageActif.aDesigner = NatObj.NMacro
  app.outilPointageActif.reset()
  this.cursor = 'crosshair'
  app.indication('indMacro')
}

OutilExecutionMacro.prototype.deselect = function () {
  const app = this.app
  const list = app.listePr
  const doc = app.doc
  if (list.macroEnCours !== null) list.macroEnCours.macroEnCours().termineAction(app.svgFigure, app.dimf, doc.couleurFond)
  Outil.prototype.deselect.call(this)
}
