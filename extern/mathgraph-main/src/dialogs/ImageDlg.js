/*
 * Created by yvesb on 10/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import AvertDlg from './AvertDlg'
import DataOutputStream from '../entreesSorties/DataOutputStream'
import PaneAlignement from './PaneAlignement'
import PaneModeAffichage from './PaneModeAffichage'
import $ from 'jquery'
import { getMtgInput } from 'src/dialogs/dom'
import PaneBoutonsValFonc from 'src/dialogs/PaneBoutonsValFonc'
import CValeur from 'src/objets/CValeur'
import EditeurvaleurReelle from 'src/dialogs/EditeurValeurReelle'
import addQueue from 'src/kernel/addQueue'
export default ImageDlg

/**
 *
 * @param {MtgApp} app
 * @param image
 * @param modification
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function ImageDlg (app, image, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'imageDlg', callBackOK, callBackCancel)
  let tr
  this.image = image
  this.modification = modification
  const list = app.listePr
  // Un CValeur pour stocker la valeur choisie avant vérification
  this.valeurLargeur = new CValeur(list, 1)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  if (!modification) {
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    this.input = ce('input', {
      type: 'file',
      id: 'file',
      accept: 'image/*',
      class: 'inputfile'
    })
    const self = this
    this.input.addEventListener('change', function () {
      if (self.input.files.length > 0) $('#labelinf').html(' ' + self.input.files[0].name)
      else $('#labelinf').html('')
    })
    tr.appendChild(this.input)
    const label = ce('label', {
      for: 'file'
    })
    $(label).html(getStr('Parcourir'))
    tr.appendChild(label)
    // Un label à droite pour contenir le chemin d'accès du fichier choisi
    const labelinf = ce('label', {
      id: 'labelinf',
      style: 'margin-left: 10px;'
    })
    tr.appendChild(labelinf)
  }
  // Un champ d'édition pour la largeur
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr('Larg') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input = getMtgInput({
    id: 'mtginput'
  })
  td.appendChild(input)
  const self = this
  input.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const indmax = modification ? list.indexOf(image) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, input, true, indmax)
  tabHaut.appendChild(paneBoutonsValFonc)
  // Sous l'éditeur de largeur trois lignes d'explications
  for (let i = 1; i <= 3; i++) {
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    label = ce('label')
    $(label).html(getStr('ImgDlg' + i))
    tr.appendChild(label)
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.paneAlign = new PaneAlignement(app, image.alignementHorizontal, image.alignementVertical)
  $(this.paneAlign.container).css('margin-top', '100px')
  const tableBas = ce('table')
  tr.appendChild(tableBas)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  td.appendChild(this.paneAlign.container)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  this.paneModeAffichage = new PaneModeAffichage(this, false, image.effacementFond,
    image.encadrement, image.couleurFond, image.angText.chaineInfo(), indmax)
  td.appendChild(this.paneModeAffichage.container)
  $(this.paneModeAffichage.container).css('margin-top', '100px')
  this.editor = new EditeurvaleurReelle(app, input, indmax, this.valeurLargeur, null)
  const ch = replaceSepDecVirg(app, image.largeur.calcul)
  $(input).val(modification ? ch : 0)

  this.create('Image', 600)
  $(this.input).blur()
}

ImageDlg.prototype = new MtgDlg()

ImageDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this)
  this.paneModeAffichage.init()
}

ImageDlg.prototype.OK = function () {
  const self = this
  const app = this.app
  const im = this.image
  const pma = this.paneModeAffichage
  if (!pma.validate()) {
    return
  } // Faute dans l'angle de rotation du texte
  // On regarde si la formule entrée pour la largeur est valide
  const valid = this.editor.validate($('#mtginput').val())
  if (valid) {
    im.encadrement = pma.getStyleEnc()
    im.effacementFond = pma.getEffFond()
    im.couleurFond = pma.getColor()
    // Si l'alignement vertical ou horizontal est changé on annule tout décalage manuel précédent
    const newHorAlign = this.paneAlign.getHorAlign()
    const newVerAlign = this.paneAlign.getVerAlign()
    if ((im.alignementHorizontal !== newHorAlign) || (im.alignementVertical !== newVerAlign)) {
      im.decX = 0
      im.decY = 0
    }
    //
    im.alignementHorizontal = this.paneAlign.getHorAlign()
    im.alignementVertical = this.paneAlign.getVerAlign()
    im.angText = pma.getAng()
    im.largeur = this.valeurLargeur
    const allowedTypes = ['png', 'jpg', 'jpeg', 'gif']
    const listPr = im.listeProprietaire
    const longUnit = listPr.pointeurLongueurUnite
    if (this.modification) {
      this.destroy()
      im.positionne(false, app.dimf)
      // Si on a modifié la largeur et qu'elle a une valeur strictement positive alors qu'il y a une longueur unité
      // et que l'image est définie avant l longueur unité on reclasse cette image après la longueur unité
      if (im.largeur.rendValeur() > 0) {
        if ((longUnit !== null) && (im.index < longUnit.index)) {
          listPr.reclasseVersFinApres(im, longUnit, this.app.svgFigure)
          im.positionne(false, app.dimf)
        } else {
          if (longUnit === null) {
            new AvertDlg(app, 'avertImNoUnit')
          }
        }
      }
      app.outilActif.annuleClignotement()
      addQueue(function () {
        im.reCreateDisplay(app.svgFigure)
      })
      if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
      if (this.callBackOK !== null) this.callBackOK()
    } else {
      const file = this.input.files[0]
      if (file) {
        let imgType = file.name.split('.')
        imgType = imgType[imgType.length - 1].toLowerCase() // On utilise toLowerCase() pour éviter les extensions en majuscules
        if (allowedTypes.indexOf(imgType) !== -1) {
          const natImage = DataOutputStream.getNatImage(imgType)
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.addEventListener('load', function () {
            self.callBackOK(natImage, reader.result) // reader.result contient la chaîne Base64 représentant l'image
          }, false)
          if (im.largeur.rendValeur() > 0 && longUnit === null) {
            new AvertDlg(app, 'avertImNoUnit')
          }
          this.destroy()
          return
        }
      }
      new AvertDlg(app, 'FichierErr')
    }
  }
}
