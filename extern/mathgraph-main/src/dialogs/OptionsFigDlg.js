/*
 * Created by yvesb on 16/04/2017.
 */
import { ce, ceIn } from 'src/kernel/dom'
import ShortcutsDlg from './ShortcutsDlg'

/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { addZoomListener, getStr, mtgFileExtension, uniteAngleDegre, uniteAngleRadian } from '../kernel/kernel'
import { getButtonArrow } from '../kernel/kernelAdd'
import MtgDlg from './MtgDlg'
import OptionsAnimDlg from './OptionsAnimDlg'
import ImageFondDlg from './ImageFondDlg'
import ConfirmDlg from './ConfirmDlg'
import ChoixOutilsDlg from './ChoixOutilsDlg'
import $ from 'jquery'
import CMathGraphDoc from '../objetsAdd/CMathGraphDocAdd'
import { getMtgInput } from './dom'
import EditeurConst from './EditeurConst'
import AboutDlg from './AboutDlg'
import TextFigDlg from './TextFigDlg'
import ChoixLangDlg from './ChoixLangDlg'
import CoulFondDlg from './CouleurFondDlg'
import ChoixEltsFigesDlg from './ChoixEltsFigesDlg'
import ChoixMacDemDlg from './ChoixMacDemDlg'
import AvertDlg from 'src/dialogs/AvertDlg'
import DataInputStream from 'src/entreesSorties/DataInputStream'
export default OptionsFigDlg

/**
 *
 * @param {MtgApp} app
 * @param callBackOK
 * @constructor
 */
function OptionsFigDlg (app, callBackOK) {
  MtgDlg.call(this, app, 'OptionsFigDlg', callBackOK)
  let cb, tr, td, label
  const self = this
  /// ////////////////////////////////////////////////////////////////////////////////////////////////
  // On crée un nouveau document pour stocker les choix d'outils au cas où l'utilisateur sortirait de la
  // boîte de dialogue sans valider
  this.doc = new CMathGraphDoc('doc')
  this.doc.setIdMenusFromDoc(app.doc)
  /// ////////////////////////////////////////////////////////////////////////////////////////////////

  const list = app.listePr
  // On cherche d'abord si on utilise ou non un niveau prédéfini
  let niv
  for (niv = 0; niv < 4; niv++) {
    if (app.level === app.levels[niv]) break
  }
  // Test suivant car on peut avoir chargé un niveau personnalisé
  if (niv < 4) this.niv = niv; else {
    this.niv = 4
    this.personalizedLevel = true
  }
  // this.niv vaut 4 si la figure utilise une figure spécifique pour le niveau d'utilisation -fonctionnement personnalisé)
  // Dans ce cas on ne donne pas la possibilité de changer de niveau d'utilisation
  //
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  tr = ceIn(tabPrincipal, 'tr')

  // unité d'angle
  const tabUnite = ce('table')
  tr.appendChild(tabUnite)
  tr = ceIn(tabUnite, 'tr')
  let div = ceIn(tr, 'div')
  label = ceIn(div, 'label')
  $(label).html(getStr('unAng'))
  ceIn(div, 'input', {
    type: 'radio',
    id: 'degre',
    name: 'unite'
  })
  if (list.uniteAngle === uniteAngleDegre) $('#degre').attr('checked', 'checked')
  label = ceIn(div, 'label', {
    for: 'degre'
  })
  $(label).html(getStr('Degre'))
  ceIn(div, 'input', {
    type: 'radio',
    id: 'radian',
    name: 'unite',
    style: 'margin-left:15px'
  })
  if (list.uniteAngle === uniteAngleRadian) $('#radian').attr('checked', 'checked')
  label = ceIn(div, 'label', {
    for: 'radian'
  })
  $(label).html(getStr('Radian'))

  // Une checkBox pour savoir si on utilise le . ou la virgule comme séparateur décimal.
  tr = ceIn(tabPrincipal, 'tr')
  cb = ceIn(tr, 'input', {
    type: 'checkbox',
    id: 'cbDecimalDot'
  })
  label = ceIn(tr, 'label', {
    for: 'cbDecimalDot'
  })
  $(label).html(getStr('decimalDot'))
  if (app.decimalDot) $(cb).attr('checked', 'checked')
  // /////////////////////////////////////////////////////////////////
  // Quatre boutons radio pour le choix du niveau d'id niv0 à niv3  //
  // Et un de plus si on est en fonctionnement personnalisé         //
  // /////////////////////////////////////////////////////////////////
  tr = ceIn(tabPrincipal, 'tr')
  const tabNiveau = ceIn(tr, 'table')
  const nivMax = this.personalizedLevel ? 4 : 3
  for (niv = 0; niv <= nivMax; niv++) {
    if (niv % 2 === 0) {
      tr = ce('tr')
      tabNiveau.appendChild(tr)
    }
    td = ceIn(tr, 'td')

    const rad = ceIn(td, 'input', {
      type: 'radio',
      id: 'niv' + niv,
      name: 'niv'
    })
    if (this.niv === niv) $(rad).attr('checked', 'checked')
    label = ceIn(td, 'label', {
      for: 'niv' + niv
    })
    $(label).html(getStr('niv' + niv))
  }

  if (app.electron || app.pwa) {
    // Pour la version electron on propose de redémarrer avec le niveau choisi
    tr = ceIn(tabPrincipal, 'tr')
    div = ceIn(tr, 'div')
    cb = ceIn(div, 'input', {
      type: 'checkbox',
      id: 'cbstartlevel'
    })
    label = ceIn(div, 'label', {
      for: 'cbstartlevel'
    })
    $(label).html(getStr('NivDem'))
    // Pour la version electron on propose de redémarrer en mode dys
    tr = ceIn(tabPrincipal, 'tr')
    div = ceIn(tr, 'div')
    cb = ceIn(div, 'input', {
      type: 'checkbox',
      id: 'cbdys'
    })
    label = ceIn(div, 'label', {
      for: 'cbdys'
    })
    $(label).html(getStr('DysDem'))
    if (app.dys) $(cb).attr('checked', 'checked')
    // Pour la version electron on peut choisir la figure de démarrage. 3 choix possibles
    tr = ceIn(tabPrincipal, 'tr')
    const tabStart = ceIn(tr, 'table')
    tr = ceIn(tabStart, 'tr')
    td = ceIn(tr, 'td')
    label = ceIn(td, 'label')
    $(label).html(getStr('start'))
    const choix = ['frameGrid', 'frameDotted', 'unity']
    for (let i = 0; i < 3; i++) {
      td = ce('td')
      tr.appendChild(td)
      const rd = ceIn(td, 'input', {
        type: 'radio',
        id: 'rdst' + i,
        name: 'start'
      })
      if (app.pref_StartFig === choix[i]) $(rd).attr('checked', 'checked')
      label = ceIn(td, 'label')
      $(label).html(getStr('start' + i))
    }
  }

  /// /////////////////////////////////////////////////////////////////////////////////////////////
  // Une checkBox pour personnaliser les outils disponibles. Si un choix a déjà été fait        //
  // cette case est cochée et le bouton de choix des outils est visible.                        //
  // Sinon le bouton de choix des outils n'apparait que si on coche la case                     //
  // Toute action sur la checkBox réinitialise les outils à aucun outil interdit                //
  /// /////////////////////////////////////////////////////////////////////////////////////////////
  tr = ceIn(tabPrincipal, 'tr')
  div = ceIn(tr, 'div')
  cb = ceIn(div, 'input', {
    type: 'checkbox',
    id: 'cbtools'
  })
  if (app.doc.hasOwnTools()) $(cb).attr('checked', 'checked')
  cb.onclick = function () {
    const checked = $('#cbtools').prop('checked')
    $('#div').css('display', checked ? 'inline' : 'none')
    if (!checked) self.doc.setIdMenus(app, true, [], 3)
  }
  label = ceIn(div, 'label', {
    for: 'cbtools'
  })
  $(label).html(getStr('OutilsPer'))
  /// /////////////////////////////////////////////////////////////////////////////////////////////
  tr = ceIn(tabPrincipal, 'tr')
  div = ceIn(tr, 'div', {
    id: 'div'
  })
  // var btnTools = getButtonArrow(app, "tools");
  const btnTools = ceIn(div, 'button', {
    style: 'margin-left:20px;'
  })
  $(btnTools).html(getStr('ChoixOutils'))
  btnTools.onclick = function () {
    // Modification version 7.7.5 : Le niveau doit être 3 si on a chargé une figure avec un niveau personnalisé
    // new ChoixOutilsDlg(self.app, self.doc, self.getSelectedNiv())
    const selectedNiv = self.getSelectedNiv()
    const niv = selectedNiv === 4 ? 3 : selectedNiv
    new ChoixOutilsDlg(self.app, self.doc, niv, null, !$('#cbstartlevel').prop('checked'))
  }
  $(div).css('display', app.doc.hasOwnTools() ? 'inline' : 'none')

  // Un bouton pour choisir les outils permis ou interdits depuis un fichier contenant une figure
  const input = ceIn(div, 'input', {
    type: 'file',
    id: 'file',
    accept: '.' + mtgFileExtension,
    class: 'inputfile'
  })
  input.addEventListener('change', function () {
    const file = input.files[0]
    if (file) {
      const reader = new FileReader()
      reader.readAsArrayBuffer(file)
      reader.onload = function () {
        try {
          const ba = new Uint8Array(reader.result)
          let doc
          try {
            const inps = new DataInputStream(ba)
            // var doc = new CMathGraphDoc(self.id + "figurePanel", true, true); // Modifié version 6.3.0
            doc = new CMathGraphDoc(app.id, true, true)
            doc.read(inps)
            new ChoixOutilsDlg(app, self.doc, 3, doc, !$('#cbstartlevel').prop('checked')) // 3 pour utiliser le niveau le plus avancé
          } catch (e) {
            new AvertDlg(app, e.message)
          }
        } catch (e) {
          new AvertDlg(app, e.message)
        }
        input.value = null
      }
    }
  })
  const fileLabel = ceIn(div, 'label', {
    for: 'file'
  })
  fileLabel.style.marginLeft = '30px'
  $(fileLabel).html(getStr('ChoixOutilsFig'))

  /// ////////////////////////////////////////////////////////////////////////////////////////////////
  // Une checkBox pour afficher ou non directement les mesures de longueur et d'angle sur la figure
  tr = ceIn(tabPrincipal, 'tr')
  div = ceIn(tr, 'div')
  cb = ceIn(div, 'input', {
    type: 'checkbox',
    id: 'cbmes'
  })
  if (app.displayMeasures) $(cb).attr('checked', 'checked')
  label = ceIn(div, 'label', {
    for: 'cbmes'
  })
  $(label).html(getStr('DispMeas'))

  // Deux éditeurs pour les dimensions minimales de la figure
  tr = ceIn(tabPrincipal, 'tr')
  label = ceIn(tr, 'label')
  $(label).html(getStr('DimMin'))
  const dimWork = app.svgFigure.dimWork // Les dimensions de la fenêtre de travail
  tr = ceIn(tabPrincipal, 'tr')
  label = ceIn(tr, 'label')
  $(label).html(getStr('DimAct') + Math.round(dimWork.x) + ' X ' + Math.round(dimWork.y))
  tr = ceIn(tabPrincipal, 'tr')
  div = ceIn(tr, 'div')
  label = ceIn(div, 'label', {
    style: 'margin-left: 20px;'
  })
  $(label).html(getStr('LargMin'))
  const inputwmin = getMtgInput({
    id: 'inpwmin',
    size: 5 // 4 trop petit sur iPad
  })
  div.appendChild(inputwmin)
  $(inputwmin).val(app.doc.dimMinFig.x)
  label = ceIn(div, 'label')
  $(label).css('font-size', '13px')
  $(label).html(' (5000 max)')

  label = ceIn(div, 'label', {
    style: 'margin-left: 20px;'
  })
  $(label).html(getStr('HautMin'))
  const inputhmin = getMtgInput({
    id: 'inphmin',
    size: 5 // 4 trop petit sur iPad
  })
  $(inputhmin).val(app.doc.dimMinFig.y)
  div.appendChild(inputhmin)
  label = ceIn(div, 'label')
  $(label).css('font-size', '13px')
  $(label).html(' (3000 max)')

  /// /////////////////////////////////////////////////////////////////////////////////////////////
  // Une checkBox pour donner la possibilité d'afficher un cadre grisé de dimensions données
  tr = ceIn(tabPrincipal, 'tr')
  div = ceIn(tr, 'div')
  label = ceIn(div, 'label')
  $(label).html(getStr('AffCad'))

  // Dessous deux champs d'édition pour largeur et hauteur du cadre désiré
  tr = ceIn(tabPrincipal, 'tr')
  div = ceIn(tr, 'div')
  label = ceIn(div, 'label', {
    style: 'margin-left: 20px;'
  })
  $(label).html(getStr('Larg') + ' : ')
  const w = Math.floor(app.svgFigure.dimWork.x - 8)
  const inputw = getMtgInput({
    id: 'inpw',
    size: 5 // 4 trop petit sur iPad
  })
  div.appendChild(inputw)
  $(inputw).val(app.widthCadre)
  label = ceIn(div, 'label')
  $(label).css('font-size', '13px')
  $(label).html(' (10 ' + getStr('a') + ' ' + w + ')')

  label = ceIn(div, 'label', {
    style: 'margin-left: 20px;'
  })
  $(label).html(getStr('Haut') + ' : ')
  const h = Math.floor(app.svgFigure.dimWork.y - 8)
  const inputh = getMtgInput({
    id: 'inph',
    size: 5 // 4 trop petit sur iPad
  })
  div.appendChild(inputh)
  $(inputh).val(app.heightCadre)
  label = ceIn(div, 'label')
  $(label).css('font-size', '13px')
  $(label).html(' (10 ' + getStr('a') + ' ' + h + ')')

  // On donne la possibilité d'activer ou pas le zoom avec la roulette de la souris
  tr = ceIn(tabPrincipal, 'tr')
  cb = ceIn(tr, 'input', {
    type: 'checkbox',
    id: 'cbwheel'
  })
  if (app.zoomOnWheel) $('#cbwheel').attr('checked', 'checked')
  label = ceIn(tr, 'label', {
    for: 'cbwheel'
  })
  $(label).html(getStr('ZoomOnWheel'))

  /// /////////////////////////////////////////////////////////////////////////////////////////////
  // Une checkBox pour montrer ou cacher l'image de fond s'il y en a une
  if (app.doc.imageFond !== null) {
    tr = ceIn(tabPrincipal, 'tr')
    div = ceIn(tr, 'div')
    cb = ceIn(div, 'input', {
      type: 'checkbox',
      id: 'cbimfvis'
    })
    if (app.doc.imageFondVisible) $(cb).attr('checked', true)
    cb.onclick = function () {
      const b = $('#cbimfvis').prop('checked')
      $(self.app.gImageFond).css('visibility', b ? 'visible' : 'hidden')
      self.app.doc.imageFondVisible = b
    }
    label = ceIn(div, 'label', {
      for: 'cbimfvis'
    })
    $(label).html(getStr('ImFondVis'))
  }

  // coef multiplicateur pour l'export des images
  tr = ceIn(tabPrincipal, 'tr')
  tabPrincipal.appendChild(tr)
  div = ceIn(tr, 'div')
  label = ceIn(div, 'label')
  $(label).html(getStr('coefMult'))
  const inputCoef = getMtgInput({
    id: 'inpcoef',
    size: 4
  })
  div.appendChild(inputCoef)
  $('#inpcoef').val(app.pref_coefMult)

  this.editw = new EditeurConst(app, inputw, 10, w)
  this.edith = new EditeurConst(app, inputh, 10, h)
  this.editwmin = new EditeurConst(app, inputwmin, 0, 5000)
  this.edithmin = new EditeurConst(app, inputhmin, 0, 3000)
  this.editcoef = new EditeurConst(app, inputCoef, 0.25, 4, false)

  /// /////////////////////////////////////////////////////////////////////////////////////////////
  // En bas on rajoute des items avec des flèches pour ouvrir d'autres boîtes de dialogue
  tr = ceIn(tabPrincipal, 'tr')
  const tabBas = ceIn(tr, 'table')
  tr = ceIn(tabBas, 'tr')
  let btn = getButtonArrow(app, 'figes')
  btn.onclick = function () {
    new ChoixEltsFigesDlg(self.app)
  }
  tr.appendChild(btn)
  label = ceIn(tr, 'label', {
    class: 'labelarrow',
    for: 'figes'// Pour qu'on puisse activer l'outil en cliquant sur le label
  })
  $(label).html(getStr('EltsFiges'))

  tr = ceIn(tabBas, 'tr')
  btn = getButtonArrow(app, 'anim')
  btn.onclick = function () {
    new OptionsAnimDlg(self.app, null)
  }
  tr.appendChild(btn)
  label = ceIn(tr, 'label', {
    class: 'labelarrow',
    for: 'anim'// Pour qu'on puisse activer l'outil en cliquant sur le label
  })
  $(label).html(getStr('OptionsAnim'))

  if (app.doc.imageFond === null) {
    tr = ceIn(tabBas, 'tr')
    btn = getButtonArrow(app, 'imFond')
    btn.onclick = function () {
      new ImageFondDlg(self.app, function () {
        self.destroy()
      })
    }
    tr.appendChild(btn)
    label = ceIn(tr, 'label', {
      class: 'labelarrow',
      for: 'imFond'// Pour qu'on puisse activer l'outil en cliquant sur le label
    })
    $(label).html(getStr('ChoixImFond'))
  } else {
    tr = ceIn(tabBas, 'tr')
    btn = getButtonArrow(app, 'imFond')
    btn.onclick = function () {
      new ConfirmDlg(self.app, 'AvertNonAnnul', function () {
        self.app.deleteImageFond()
        self.destroy()
      })
    }
    tr.appendChild(btn)
    label = ceIn(tr, 'label', {
      class: 'labelarrow',
      for: 'imFond'// Pour qu'on puisse activer l'outil en cliquant sur le label
    })
    $(label).html(getStr('DelImFond'))
  }

  tr = ceIn(tabBas, 'tr')
  btn = getButtonArrow(app, 'couFond')
  btn.onclick = function () {
    new CoulFondDlg(self.app, function () {
      self.destroy()
    })
  }
  tr.appendChild(btn)
  label = ceIn(tr, 'label', {
    class: 'labelarrow',
    for: 'couFond'// Pour qu'on puisse activer l'outil en cliquant sur le label
  })
  $(label).html(getStr('CouFond'))

  // la langue
  tr = ceIn(tabBas, 'tr')
  btn = getButtonArrow(app, 'choixL')
  btn.onclick = function () {
    new ChoixLangDlg(self.app)
  }
  tr.appendChild(btn)
  label = ceIn(tr, 'label', {
    class: 'labelarrow',
    for: 'choixL'// Pour qu'on puisse activer l'outil en cliquant sur le label
  })
  $(label).html(getStr('ChoixLang'))

  if (list.listeMacPourDem().noms.length > 1) {
    tr = ceIn(tabBas, 'tr')
    btn = getButtonArrow(app, 'macdem')
    btn.onclick = function () {
      new ChoixMacDemDlg(self.app)
    }
    tr.appendChild(btn)
    label = ceIn(tr, 'label', {
      class: 'labelarrow',
      for: 'macdem'// Pour qu'on puisse activer l'outil en cliquant sur le label
    })
    $(label).html(getStr('ChoixMacDem'))
  }

  tr = ceIn(tabBas, 'tr')
  btn = getButtonArrow(app, 'TextFig')
  btn.onclick = function () {
    new TextFigDlg(self.app)
  }
  tr.appendChild(btn)
  label = ceIn(tr, 'label', {
    class: 'labelarrow',
    for: 'TextFig'// Pour qu'on puisse activer l'outil en cliquant sur le label
  })
  $(label).html(getStr('TextFig'))

  // bouton à propos
  tr = ceIn(tabBas, 'tr')
  btn = getButtonArrow(app, 'about')
  btn.onclick = function () {
    new AboutDlg(self.app)
  }
  tr.appendChild(btn)
  label = ceIn(tr, 'label', {
    class: 'labelarrow',
    for: 'about'// Pour qu'on puisse activer l'outil en cliquant sur le label
  })
  $(label).html(getStr('About'))

  // raccourcis clavier
  tr = ceIn(tabBas, 'tr')
  td = ceIn(tr, 'td')
  btn = getButtonArrow(app, 'shortcuts')
  btn.onclick = function () {
    new ShortcutsDlg(self.app)
  }
  td.appendChild(btn)
  label = ceIn(td, 'label', {
    class: 'labelarrow',
    for: 'shortcuts' // Pour qu'on puisse activer l'outil en cliquant sur le label
  })
  label.innerHTML = getStr('Shortcuts')

  // lien vers le site
  tr = ceIn(tabBas, 'tr')
  btn = getButtonArrow(app, 'Web')
  btn.onclick = function () {
    window.open('https://www.mathgraph32.org')
  }
  tr.appendChild(btn)
  label = ceIn(tr, 'label', {
    class: 'labelarrow',
    for: 'Web'// Pour qu'on puisse activer l'outil en cliquant sur le label
  })
  $(label).html(getStr('Web'))

  // Création de la boîte de dialogue par jqueryui
  this.create('OptionsFig', 740)
}

OptionsFigDlg.prototype = new MtgDlg()

OptionsFigDlg.prototype.OK = function () {
  const app = this.app
  const doc = app.doc
  const electron = app.electron
  const list = app.listePr
  const decDot = $('#cbDecimalDot').prop('checked')
  app.decimalDot = decDot
  list.decimalDot = decDot
  if (this.editw.validate() && this.edith.validate() &&
    this.editwmin.validate() && this.edithmin.validate() && this.editcoef.validate()) {
    list.uniteAngle = $('#radian').prop('checked') ? uniteAngleRadian : uniteAngleDegre
    // On regarde le niveau choisi est le même que le niveau précédent
    const niv = this.getSelectedNiv()
    // Pour annuler un fonctionnement personnalisé, il faut soit cocher cocher la case utiliser ce niveau aup prochain démmarrage
    // soit choisir de nouveaux outils en cochant la case Utiliser ce choix d'outil au prochain démarrage
    // Si  le logiciel est en mode de fonctionnement personnalisé et si on a coché la case d'un niveau prédéfini,
    // on va changer les icônes relativement au niveau coché mais cela est provisoire saut si on a coché
    // la case Utiliser le niveau choisipour le prochain démarrage
    if (niv !== 4) {
      app.levelIndex = niv // Utilisé dans getResult()
      app.level = app.levels[niv]
    }
    app.doc.setIdMenusFromDoc(this.doc)
    // On met à jour les icônes de la barre horizontale suibant le document
    app.updateToolbar()
    // }
    // Pour la version electron si la case est cochéee on appelle setLevel de la page index.html de façon que
    // le niveau soit mémorisé par l'application
    // et idem pour le redémarrage en mode dys
    // Idem pour l'affichage des mesures sur la figure
    if (electron || app.pwa) {
      const choix = ['frameGrid', 'frameDotted', 'unity']
      // Si on est déjà en niveau de fonctionnement personnalisé et si on a coché la case
      // Utiliser ce choix pour le démarrage du logiciel il n'y a pas à appeler setLevel(niv)
      if ($('#cbstartlevel').prop('checked') && (niv < 4)) {
        // eslint-disable-next-line no-undef
        if (electron) setLevel(niv)
        else localStorage.setItem('level', niv.toString())
      }
      // setLevel est défini dans index.html pour electron
      const checked = $('#cbdys').prop('checked')
      if (electron) setDysMode(checked) // eslint-disable-line no-undef
      else localStorage.setItem('dysmode', checked.toString())
      // setDecimalDot est défini dans index.html pour electron
      if (electron) setDecimalDot(decDot) // eslint-disable-line no-undef
      else localStorage.setItem('decimalDot', decDot.toString())
      // setDysMode est défini dans index.html
      const dispm = $('#cbmes').prop('checked')
      if (electron) setDisplayMeasures(dispm) // eslint-disable-line no-undef
      else localStorage.setItem('displaymeasures', dispm.toString())
      // setDisplayMeasures est défini dans index.html pour la version electron
      let i
      for (i = 0; i < 3; i++) if ($('#rdst' + i).prop('checked')) break
      if (electron) setStartFig(choix[i]) // eslint-disable-line no-undef
      else localStorage.setItem('startFig', choix[i])
      // setStartFig est défini dans index.html pour la version electron
    }
    const oldMinWidth = parseInt($('#inpwmin').val())
    const oldMinHeight = parseInt($('#inphmin').val())
    if ((doc.dimMinFig.x !== oldMinWidth) || (doc.dimMinFig.y !== oldMinHeight)) {
      doc.dimMinFig.x = oldMinWidth
      doc.dimMinFig.y = oldMinHeight
      app.resizeSvgFig()
    }
    const wr = parseInt($('#inpw').val())
    const hr = parseInt($('#inph').val())
    // On redimensionne le cadre de sélection suivant le contenu des éditeurs
    app.deleteCadre()
    app.createCadre(wr, hr, app.cadreVisible)
    // Même si le cadre n'est pas créé, il faut mettre à jour ses dimensions
    app.widthCadre = wr
    app.heightCadre = hr
    if ($('#cbwheel').prop('checked')) {
      if (!app.doc.wheelListener) {
        addZoomListener(app.doc, app.svgFigure, app.svgGlob)
      }
      app.zoomOnWheel = true
    } else {
      if (app.doc.wheelListener) {
        app.svgGlob.removeEventListener('wheel', app.doc.wheelListener)
        app.doc.wheelListener = null
      }
      app.zoomOnWheel = false
    }
    // eslint-disable-next-line no-undef
    if (electron) setZoomOnWheel(app.zoomOnWheel)
    else {
      if (app.pwa) localStorage.setItem('zoomOnWheel', app.zoomOnWheel.toString())
    }
    app.pref_coefMult = parseFloat($('#inpcoef').val())
    app.displayMeasures = $('#cbmes').prop('checked')
    app.updateToolsToolBar()
    app.activeOutilCapt()
    this.callBackOK()
    this.destroy()
  }
}

OptionsFigDlg.prototype.getSelectedNiv = function () {
  const nivMax = this.personalizedLevel ? 4 : 3
  for (let niv = 0; niv <= nivMax; niv++) {
    if ($('#niv' + niv).prop('checked')) return niv
  }
}
