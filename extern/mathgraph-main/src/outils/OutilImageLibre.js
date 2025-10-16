/*
 * Created by yvesb on 10/05/2017.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import { base64Decode } from '../kernel/kernel'
import CImage from '../objets/CImage'
import ImageDlg from '../dialogs/ImageDlg'
import StyleEncadrement from '../types/StyleEncadrement'
import CAffLiePt from '../objets/CAffLiePt'
import CValeur from 'src/objets/CValeur'

export default OutilImageLibre

/**
 * Outil servant à créer une image libre sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilImageLibre (app) {
  Outil.call(this, app, 'ImageLibre', 33097, false)
}
OutilImageLibre.prototype = new Outil()

OutilImageLibre.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  app.outilPointageActif = this.app.outilPointageClic
  app.outilPointageActif.reset()
  app.indication('indImage')
}

OutilImageLibre.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const self = this
  this.image = new CImage(app.listePr, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, 13,
    StyleEncadrement.Sans, false, app.doc.couleurFond, CAffLiePt.alignHorCent,
    CAffLiePt.alignVerCent, 0, '', null, new CValeur(app.listePr, 0), false)
  new ImageDlg(app, this.image, false, this.callBackOK, function () { self.app.activeOutilCapt() })
}

OutilImageLibre.prototype.callBackOK = function (natImage, dataBase64) {
  // Quand on arrive ici, this pointer sur une boîte de dialogue ImageDlg
  const app = this.app
  const im = this.image
  im.natImage = natImage
  const tab = dataBase64.split(',')
  im.image = base64Decode(tab[tab.length - 1], true)
  const image = ce('img', {
    src: dataBase64
  })
  image.onload = function () {
    im.width = image.width
    im.height = image.height
    app.ajouteElement(im)
    im.positionne(false, app.dimf)
    im.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    app.outilActif.saveFig()
    app.activeOutilCapt()
  }
}

OutilImageLibre.prototype.isDisplayTool = function () {
  return true
}
