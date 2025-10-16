/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import Outil from './Outil'
import toast from '../interface/toast'
export default OutilDepunaiserTout

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilDepunaiserTout (app) {
  Outil.call(this, app, 'DepunaiserTout', 32961, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilDepunaiserTout.prototype = new Outil()

/**
 * @return {void}
 */
OutilDepunaiserTout.prototype.select = function () {
  const app = this.app
  const list = app.listePr
  const done = list.depunaiseTout()
  toast({ title: done ? 'AvertTtDep' : 'AvertNoDep' })
  app.activeOutilCapt()
}
