/*
 * Created by yvesb on 03/05/2017.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import MtgDlg from './MtgDlg'
import PaneAnimation from './PaneAnimation'
import $ from 'jquery'
export default OptionsAnimDlg

/**
 *
 * @param {MtgApp} app
 * @param callBackOK
 * @constructor
 */
function OptionsAnimDlg (app, callBackOK) {
  MtgDlg.call(this, app, 'AnimDlg', callBackOK)
  const tabPrincipal = ce('table')
  $(tabPrincipal).css('margin', 'auto')
  this.appendChild(tabPrincipal)
  this.paneAnimation = new PaneAnimation(app, app.pref_Anim, true, true, false)
  tabPrincipal.appendChild(this.paneAnimation.container) // On rajoute le panneau
  // Création de la boîte de dialogue par jqueryui
  this.create('OptionsAnim', 450)
}

OptionsAnimDlg.prototype = new MtgDlg()

OptionsAnimDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}

OptionsAnimDlg.prototype.OK = function () {
  if (this.paneAnimation.getinfoAnim()) {
    const app = this.app
    const mac = app.macroAnimation
    const pref = app.pref_Anim
    mac.nombrePointsPourAnimation = pref.nbPts
    mac.frequenceAnimationMacro = pref.freq
    mac.animationCyclique = pref.animCycl
    mac.inverserSens = pref.invSens
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  }
}
