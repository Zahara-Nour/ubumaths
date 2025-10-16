/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
export default OutilHelp
/**
 * Outil servant à modifier un objet qui a été créé par un menu
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilHelp (app) {
  Outil.call(this, app, 'Help', 33007, false, false)
}

OutilHelp.prototype = new Outil()

OutilHelp.prototype.select = function () {
  let prefix
  if (this.app.electron) {
    prefix = './'
  } else if (this.app.pwa) {
    prefix = './aide/'
  } else {
    prefix = 'https://www.mathgraph32.org/aide/'
  }
  // Pas d'aide en Allemand pour l'allemand
  const lang = this.app.language === 'de' ? 'en' : this.app.language
  window.open(prefix + lang + '/MathGraph32Help.htm')
}
