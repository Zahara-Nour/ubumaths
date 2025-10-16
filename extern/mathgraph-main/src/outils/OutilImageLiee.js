/*
 * Created by yvesb on 12/05/2017.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { base64Decode } from '../kernel/kernel'
import OutilObjetPar1Objet from '../outils/OutilObjetPar1Objet'
import NatObj from '../types/NatObj'
import CImage from '../objets/CImage'
import ImageDlg from '../dialogs/ImageDlg'
import StyleEncadrement from '../types/StyleEncadrement'
import CAffLiePt from '../objets/CAffLiePt'
import CValeur from 'src/objets/CValeur'

export default OutilImageLiee
/**
 * Outil servant à créer une image libre sur la figure
 * @param {MtgApp} app L'application  propriétaire
 * @constructor
 */
function OutilImageLiee (app) {
  OutilObjetPar1Objet.call(this, app, 'ImageLiee', 33099, true, NatObj.NTtPoint)
}

OutilImageLiee.prototype = new OutilObjetPar1Objet()

OutilImageLiee.prototype.indication = function () {
  return 'indPt'
}

OutilImageLiee.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const self = this
  this.image = new CImage(app.listePr, null, false, app.getCouleur(), 0, 0, 0, 0, false, elg, 13,
    StyleEncadrement.Sans, false, app.doc.couleurFond, CAffLiePt.alignHorCent,
    CAffLiePt.alignVerLow, 0, '', null, new CValeur(app.listePr, 0), false)
  new ImageDlg(app, this.image, false, this.callBackOK, function () { self.app.activeOutilCapt() })
}

OutilImageLiee.prototype.ajouteObjetsVisuels = function () {}

OutilImageLiee.prototype.callBackOK = function (natImage, dataBase64) {
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

OutilImageLiee.prototype.isDisplayTool = function () {
  return true
}
