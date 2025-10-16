/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce, cens, empty } from '../kernel/dom'
import { getStr } from '../kernel/kernel'
import MacroDlg from './MacroDlg'
import ListeConstFig from './ListeConstFig'
import constantes from '../kernel/constantes'
import ColorButton from '../interface/ColorButton'
import LineStylePanel from '../interface/LineStylePanel'
import $ from 'jquery'
import { getMtgInput } from './dom'
import AvertDlg from '../dialogs/AvertDlg'
import CCbGlob from '../kernel/CCbGlob'
import EditeurConst from '../dialogs/EditeurConst'
import StyleTrait from '../types/StyleTrait'

export default MacConsRecDlg

/**
 * Dialogue de création ou modification d'une macro d'implémentation de construction récursive
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param {CMacroConstructionRecursive} mac  La macro qui doit être modifiée
 * @param modification {boolean} : true si le dialogue est ouvert pour modifier une macro déjà existante
 * @param callBackOK Fonction de callBack à appeler si on valide par OK
 * @param callBackCancel Fonction de callBack à appeler si on referme sans valider

 */
function MacConsRecDlg (app, mac, modification, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, modification, callBackOK, callBackCancel)
  this.mac = mac
  this.modification = modification
  const profRec = mac.profondMax // La profondeur de récursion de la macro
  let i; let radio; let label
  const self = this
  const tabPrincipal = ce('table', {
    cellspacing: 2
  })
  let tr = ce('tr')
  let div = ce('div')
  this.appendChild(tabPrincipal)
  // Ajout de l'éditeur d'intitulé /////////////////////////////////
  this.addEditInt(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  // Ajout du pane d'information sur la macro //////////////////////
  this.addPaneInfo(tabPrincipal, true) // True pour que le textarea n'ait qu'une ligne
  /// //////////////////////////////////////////////////////////////////////////////////
  // 12 boutons radio pour le choix de la profondeur de récursion
  /// //////////////////////////////////////////////////////////////////////////////////
  tabPrincipal.appendChild(tr)
  let td = ce('td', {
    style: 'border:1px solid lightgray'
  })
  tr.appendChild(td)
  let caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:400px'
  })
  $(caption).html(getStr('MacRecDlg1'))
  td.appendChild(caption)
  td.appendChild(div)
  for (i = 0; i < 13; i++) {
    radio = ce('input', {
      type: 'radio',
      id: 'rad' + i,
      name: 'prof'
    })
    div.appendChild(radio)
    if (i === profRec) radio.setAttribute('checked', 'checked')
    radio.onchange = function () {
      self.updateSelects(self.getSelectedProf())
    }
    label = ce('label', {
      for: 'radio' + i
    })
    $(label).html(i)
    div.appendChild(label)
  }
  /// //////////////////////////////////////////////////////////////////////////////////////////////
  // Un panneau pour associer à chaque niveau de récursion une construction
  /// //////////////////////////////////////////////////////////////////////////////////////////////
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabChoix = ce('table', {
    cellspacing: 2
  })
  tr.appendChild(tabChoix)
  tr = ce('tr')
  tabChoix.appendChild(tr)
  td = ce('td', {
    style: 'vertical-align:top;width:200px;'
  })
  tr.appendChild(td)
  caption = ce('caption', { class: 'mtgcaption', style: 'width:200px' })
  $(caption).html(getStr('MacRecDlg2'))
  td.appendChild(caption)
  this.selectLeft = ce('select', {
    size: 4,
    style: 'width:200px'
  })
  td.appendChild(this.selectLeft)
  td = ce('td', {
    style: 'vertical-align:top;width:250px;'
  })
  tr.appendChild(td)
  caption = ce('caption', { class: 'mtgcaption', style: 'width:250px' })
  $(caption).html(getStr('Const') + ' : ')
  td.appendChild(caption)
  this.listeConst = new ListeConstFig(app, function () {
    self.tab[self.selectLeft.selectedIndex] = self.listeConst.getSelectedItem()
  })
  td.appendChild(this.listeConst.select)
  this.updateSelects(profRec)
  this.selectLeft.selectedIndex = 0
  const tabProtoApp = app.doc.tablePrototypes
  this.listeConst.selectElt(modification ? mac.tableProto[0] : tabProtoApp[0])
  // Un array tab qui associera à chaque indice compris entre 0 et le niveau de récursion choisi
  // Une construction de la figure
  this.tab = []
  for (i = 0; i <= profRec; i++) {
    this.tab.push(modification ? mac.tableProto[i] : tabProtoApp[0])
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabInput = ce('table', { cellspacing: 2 })
  tr.appendChild(tabInput)
  tr = ce('tr')
  tabInput.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('MacRecDlg3')) // Nombre d'itération par niveau
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input1 = getMtgInput({ id: 'input1', size: 3 })
  td.appendChild(input1)
  tr = ce('tr')
  tabInput.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('MacRecDlg4')) // Nombre d'itération par niveau
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input2 = getMtgInput({ id: 'input2', size: 3 })
  td.appendChild(input2)
  tr = ce('tr')
  tabInput.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('MacRecDlg5')) // Nombre d'itération par niveau
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input3 = getMtgInput({ id: 'input3', size: 3 })
  td.appendChild(input3)

  // CheckBox pour choisir ou pas de ne créer que les objets de dernière génération
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  const cb1 = ce('input', {
    id: 'cb1',
    type: 'checkbox'
  })
  div.appendChild(cb1)
  label = ce('label', {
    for: 'cb1'
  })
  $(label).html(getStr('MacRecDlg6'))
  div.appendChild(label)

  // CheckBox pour choisir ou non de donner une couleur spécifique aux objets créés.
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabCoul = ce('table', {
    cellspacing: 0
  })
  tr.appendChild(tabCoul)
  tr = ce('tr')
  tabCoul.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  div = ce('div')
  td.appendChild(div)
  const cb2 = ce('input', {
    id: 'cb2',
    type: 'checkbox'
  })
  div.appendChild(cb2)
  cb2.onclick = function () {
    $('#tdcoul').css('visibility', $('#cb2').prop('checked') ? 'visible' : 'hidden')
  }
  label = ce('label', {
    for: 'cb2'
  })
  $(label).html(getStr('MacRecDlg7'))
  div.appendChild(label)
  td = ce('td', {
    id: 'tdcoul'
  })
  tr.appendChild(td)
  let svg = cens('svg', {
    width: Math.floor(constantes.lineStyleWidth),
    height: String(constantes.lineStyleWidth / 2)
  })
  td.appendChild(svg)
  this.colorButton = new ColorButton(this, mac.imposerCouleur ? mac.couleurImp : app.getCouleur())
  // this.colorButton.container.setAttribute("transform","translate(" + String(constantes.lineStyleWidth + 5) + ",0)");
  svg.appendChild(this.colorButton.container)

  // Un tableau contenant 3 boutons radio pour choisir si on joint ou non les points fianux
  // et si oui si c'est par un polygone ou une ligne brisée
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabPtsFinaux = ce('table', {
    cellspacing: 2,
    style: 'border:1px solid lightgray'
  })
  tr.appendChild(tabPtsFinaux)
  const tdLeft = ce('td', {
    style: 'vertical-align:top;'
  })
  tabPtsFinaux.appendChild(tdLeft)
  const tabPtsFinauxLeft = ce('table', {
    cellspacing: 2
  })
  tdLeft.appendChild(tabPtsFinauxLeft)
  const tdRight = ce('td', {
    id: 'tdright'
  }) // Contiendra un éventuel panneau de choix de couleur et de style de trait
  tabPtsFinaux.appendChild(tdRight)
  tr = ce('tr')
  tabPtsFinauxLeft.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)

  const rad1 = ce('input', {
    id: 'radlig0',
    type: 'radio',
    name: 'pts'
  })
  div.appendChild(rad1)
  rad1.onclick = function () {
    self.onRadioChange()
  }

  label = ce('label')
  $(label).html(getStr('MacRecDlg9')) // Ne pas joindre
  div.appendChild(label)

  tr = ce('tdr')
  tabPtsFinauxLeft.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  const rad2 = ce('input', {
    id: 'radlig1',
    type: 'radio',
    name: 'pts'
  })
  div.appendChild(rad2)
  label = ce('label')
  $(label).html(getStr('MacRecDlg10')) // Joindre par un polygone
  div.appendChild(label)
  rad2.onclick = function () {
    self.onRadioChange()
  }
  // Si on choisit de remplir par un polygone, on propose une checkbow pour le remplir ou non

  tr = ce('tr', {
    id: 'trpol'
  })
  div = ce('div')
  tr.appendChild(div)
  tabPtsFinauxLeft.appendChild(tr)
  const cb3 = ce('input', {
    id: 'cb3',
    type: 'checkbox',
    style: 'margin-left:20px;'
  })
  div.appendChild(cb3)
  label = ce('label', {
    for: 'cb3'
  })
  $(label).html(getStr('MacRecDlg8'))
  div.appendChild(label)

  tr = ce('tr')
  tabPtsFinauxLeft.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  const rad3 = ce('input', {
    id: 'radlig2',
    type: 'radio',
    name: 'pts'
  })
  div.appendChild(rad3)
  rad3.onclick = function () {
    self.onRadioChange()
  }

  label = ce('label')
  $(label).html(getStr('MacRecDlg11')) // Joindre par une ligne brisée
  div.appendChild(label)

  // A droite des trois boutons radio un panneau de choix de couleur et de style si on chosit d'utiliser un
  // polygone ou une ligne brisée pour joindre les points finaux
  const tabLigne = ce('table', {
    cellSpacing: 0,
    id: 'tabligne'
  })
  tdRight.appendChild(tabLigne)
  td = ce('td')
  tabLigne.appendChild(td)
  svg = cens('svg', {
    width: Math.floor(2 * constantes.lineStyleWidth + 5),
    height: String(6 * constantes.lineStyleButtonHeight)
  })
  td.appendChild(svg)
  const bligne = mac.choixLigne !== 0
  this.lineStylePanel = new LineStylePanel(app, bligne ? mac.styleLigne.style : app.getStyleTrait().style)
  svg.appendChild(this.lineStylePanel.g)
  this.colorLineButton = new ColorButton(this, bligne ? mac.couleurLigne : app.getCouleur())
  this.colorLineButton.container.setAttribute('transform', 'translate(' + String(constantes.lineStyleWidth + 5) + ',0)')
  svg.appendChild(this.colorLineButton.container)

  td = ce('td', {
    style: 'vertical-align:top;'
  })
  tabLigne.appendChild(td)
  caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:80px;'
  })
  $(caption).html(getStr('Epaisseur'))
  td.appendChild(caption)
  this.select = ce('select', {
    size: 4, // Le nombre de lignes visibles par défaut
    style: 'width:80px;'
  })
  td.appendChild(this.select)
  for (i = 0; i < 5; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === ((mac.choixLigne === 0) ? 0 : mac.styleLigne.strokeWidth - 1)) option.setAttribute('selected', 'selected')
    $(option).html(String(i + 1))
    this.select.appendChild(option)
  }

  if (modification) {
    $(input1).val(mac.nbImp)
    $(input1).attr('disabled', true)
    $(input2).val(mac.pasRec)
    $(input2).attr('disabled', true)
    $(input3).val(mac.nbSourcesPourIter)
    $(input3).attr('disabled', true)
  }
  if (mac.creationNiveauMax) $(cb1).attr('checked', 'checked')
  if (mac.imposerCouleur) $(cb2).attr('checked', 'checked')
  else $('#tdcoul').css('visibility', 'hidden')
  const choixLigne = mac.choixLigne
  for (i = 0; i < 3; i++) if (choixLigne === i) $('#radlig' + i).attr('checked', 'checked')
  if ((choixLigne === 1) && mac.polygoneRempli) $('#cb3').attr('checked', 'checked')
  this.onRadioChange()

  this.editeur1 = new EditeurConst(app, input1, 2, 1000, true) // Pour le nombre d'itérations par niveau
  this.editeur2 = new EditeurConst(app, input2, 1, 1000, true) // Pour le pas d'itération
  this.editeur3 = new EditeurConst(app, input3, 0, 1000, true) // Pour le nombre d'objets sources communs à toutes les itérations

  /// ////////////////////////////////////////////////////////////////////////////////////////////////////
  this.addPaneBas(tabPrincipal)
  this.create('MacConsRecDlg1', 650)
}

MacConsRecDlg.prototype = new MacroDlg()

/**
 * Fonction qui renvoie le niveau de profondeur de récursion correspondant au bouton radio correspondant coché
 */
MacConsRecDlg.prototype.getSelectedProf = function () {
  for (let i = 0; i < 13; i++) {
    if ($('#rad' + i).prop('checked')) return i
  }
}

MacConsRecDlg.prototype.updateSelects = function (profRec) {
  const self = this
  const selectLeft = this.selectLeft
  empty(selectLeft)
  let i
  for (i = 0; i <= profRec; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(i)
    selectLeft.appendChild(option)
  }
  selectLeft.onchange = function () {
    self.onSelectLeftChange()
  }
  // On réinitialise le tableau contenant les constructions affectées à chaque niveau avec le premier prototype de la figure
  this.tab = []
  for (i = 0; i <= profRec; i++) this.tab.push(this.app.doc.tablePrototypes[0])
  this.onSelectLeftChange()
}

MacConsRecDlg.prototype.onSelectLeftChange = function () {
  this.listeConst.selectElt(this.tab[this.selectLeft.selectedIndex])
}

MacConsRecDlg.prototype.onRadioChange = function () {
  $('#tdright').css('display', $('#radlig0').prop('checked') ? 'none' : 'block')
  $('#trpol').css('display', $('#radlig1').prop('checked') ? 'block' : 'none')
}

MacConsRecDlg.prototype.OK = function () {
  const mac = this.mac
  if ($('#inputint').val() !== '') {
    if (this.editeur1.validate() && this.editeur2.validate() && this.editeur3.validate()) {
      const profondMax = this.getSelectedProf()
      const nbImp = parseInt($('#input1').val())
      const pasRec = parseInt($('#input2').val())
      const nbSources = parseInt($('#input3').val())
      const ch = this.validate(profondMax, nbSources, nbImp, pasRec)
      if (ch === '') {
        mac.profondMax = profondMax
        mac.nbSourcesPourIter = nbSources
        mac.nbImp = nbImp
        mac.pasRec = pasRec
        mac.tableProto = this.tab
        mac.creationNiveauMax = $('#cb1').prop('checked')
        mac.imposerCouleur = $('#cb2').prop('checked')
        if (mac.imposerCouleur) mac.couleurImp = this.colorButton.color
        // On regarde quel est le choix pour les points finaix parmi les 3 rboutons radios proposés
        let choix
        for (let i = 0; i < 3; i++) {
          if ($('#radlig' + i).prop('checked')) {
            choix = i
            break
          }
        }
        mac.choixLigne = choix
        const thickness = this.select.selectedIndex + 1
        if (mac.choixLigne !== 0) { // Si on a demandé que les points finaux soient reliés par un polygone ou une ligne brisée
          mac.styleLigne = new StyleTrait(this.app.listePr, this.lineStylePanel.style, thickness)
          mac.couleurLigne = this.colorLineButton.color
        }
        if (mac.choixLigne === 1) mac.polygoneRempli = $('#cb3').prop('checked')
        this.saveBasic()// Sauvegarde les autres caractéristiques da la macro
        this.callBackOK()
        if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
        this.destroy()
      } else new AvertDlg(this.app, ch, function () { $('#input1').focus() })
    }
  } else this.avertIncorrect()
}

/**
 * Fonction qui analyse si les macros constructions choisies pour chaque niveau d'itération peuvent bien
 * être implémentées récursivement avec les choix effectués dans la boîte de dialogue.
 * Renvoie "" si tout va bien et sinon une chaîne contenant l'erreur à afficher dans un message d'erreur
 */
/**
 * Fonction qui analyse si les macros constructions choisies pour chaque niveau d'itération peuvent bien
 * être implémentées récursivement avec les choix effectués dans la boîte de dialogue.
 * Renvoie "" si tout va bien et sinon une chaîne contenant l'erreur à afficher dans un message d'erreur
 * @param {number} profondMax La profondeur de récursion choisie
 * @param {number} nbSources Le nombre d'objets sources à réutiliser à chaque itération
 * @param {number} nbImp Le nombre d'implémentations à chauque itération
 * @param {number} pasRec Le pas d'itération
 */
MacConsRecDlg.prototype.validate = function (profondMax, nbSources, nbImp, pasRec) {
  let i
  const app = this.app
  const list = app.listePr
  for (i = 0; i <= profondMax; i++) {
    const proto = this.tab[i]
    const chErr = proto.implementPossible(list)
    if (chErr !== '') {
      this.listeConst.selectedIndex = i
      return getStr('ImpImposs') + '\n' + chErr
    }
    if ((list.pointeurLongueurUnite == null) && proto.utiliseLongueurUnite()) {
      this.listeConst.selectedIndex = i
      return getStr('ErrLong')
    }
    if (!proto.estRecursible(nbSources, nbImp, pasRec)) {
      this.listeConst.selectedIndex = i
      return getStr('errRec')
    }
  }
  // On fait une estimation du nombre d'objets à créer avec le prototype de niveau de récursion 0
  let n; let p
  const proto0 = this.tab[0]
  if ($('#cb1').prop('checked')) {
    p = proto0.nombreObjetsJusqueFinal(proto0.nbObjSources - nbSources) // Nombre objets créés sauf dernière étape
    n = (proto0.longueur() - proto0.nbObjSources - nbSources) * Math.exp(profondMax * Math.log(nbImp)) +
      p * (Math.exp(profondMax * Math.log(nbImp)) - 1) / (nbImp - 1)
  } else n = (proto0.longueur() - proto0.nbObjSources - nbSources) * (Math.exp((profondMax + 1) * Math.log(nbImp)) - 1) / (nbImp - 1)
  if (n > CCbGlob.nombreMaxObj) return getStr('errImpMax')
  return ''
}
