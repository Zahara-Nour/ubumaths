/*
 * Created by yvesb on 09/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'

export default OutilTranslationFigure
/**
 * Outil servant à démasquer des objest masqués
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilTranslationFigure (app) {
  // Version 8.2.7 : Comme on rajoute l'outil translation de figure on lui donne une id
  // différente des versions précédentes pour que, dans les exercices de construction j3p
  // on ne puisse pas translater la figure.
  Outil.call(this, app, 'TranslationFigure', 32022, false)
}

OutilTranslationFigure.prototype = new Outil()

OutilTranslationFigure.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  this.cursor = 'default'
  app.outilPointageActif = app.outilPointageTranslation
  app.outilPointageActif.reset()
}

// On renvoie trop pour ne pas scroller sur périphérique mobile
OutilTranslationFigure.prototype.isWorking = function () {
  return true
}
