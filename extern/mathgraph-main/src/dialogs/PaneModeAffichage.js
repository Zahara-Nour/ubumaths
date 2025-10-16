/*
 * Created by yvesb on 10/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// import $ from './jQuery-ui'
import $ from 'jquery'
import { ce, cens } from 'src/kernel/dom'
import { getStr, uniteAngleRadian } from '../kernel/kernel'
import constantes from '../kernel/constantes'
import ColorButton from '../interface/ColorButton'
import { getMtgInput } from './dom' // Ajout version 6.0
import EditeurValeurReelle from './EditeurValeurReelle'
import CValeurAngle from '../objets/CValeurAngle'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'

export default PaneModeAffichage

/**
 * Classe représentant un tableau de deux colonnes permettant de choisir si un affichage doit :
 * Effacer ou non le fond qu'il recouvre
 * Avoir un encadrement et si oui un encadrement simple ou 3D
 * Si on a choisi un effacement du fond, un bouton de choix de couleur permet de faire apparaître. un colorPicker
 * pour le choix de la couleur de fond de l'affichage.
 * this.container contient le tableau proprement dit
 * @param dlg Le dialogue contenant le panneau
 * @param bPourMacro true si c'est dans une boîte de dialogue pour créer ou modifier une macro, false sinon
 *                     Si true, pas de style d'encadrement proposé
 * @param effacementFond true si la case encadrement du fond doit être cochée
 * @param styleEncadrement Entier de 0 à 2 fournissant le styme d'encadrement (voir StyleEncadrement)
 * @param color La couleur initiale pour le boton de choix de couleur de fond
 * @param indMax indice Maxi que l'angle de rotation du texte peut utiliser
 * @param {boolean} chaineValInit  null si on ne doit pas éditer un angle d'afficahe, sinon la chaîne du calcul de l'angle
 * @param callBack Fonction (éventuelle) à appeler en cas de changement de style d'encadrement
 * @param {boolean} displayAngleEditor si false, on ne met pas l'éditeur d'angle
 * @constructor
 */
function PaneModeAffichage (dlg, bPourMacro, effacementFond, styleEncadrement, color, chaineValInit = null,
  indMax = -1, callBack = null, displayAngleEditor = true) {
  this.callBack = callBack
  this.chaineValInit = chaineValInit
  this.displayAngleEditor = displayAngleEditor
  const app = dlg.app
  const listePr = app.listePr
  this.valeurAngle = new CValeurAngle(listePr, 0)
  const self = this
  const tabPrincipal = ce('table') // Le tableau principal qui sera this.container
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tab = ce('table', {
    cellspacing: 2
  })
  tr.appendChild(tab)
  this.container = tabPrincipal
  const caption = ce('caption', {
    class: 'mtgcaption'
  })
  $(caption).html(getStr('ModeAff') + ' :')
  tab.appendChild(caption)
  $(tab).css('border', '1px solid lightgray')
  let td = ce('td') // La colonne de gauche qui contiendra un tableau de 4 lignes
  tab.appendChild(td)
  const tabgauche = ce('table')
  td.appendChild(tabgauche)
  tr = ce('tr')
  tabgauche.appendChild(tr)
  const cbEffacementFond = ce('input', {
    type: 'checkbox',
    id: 'cbEffFond'
  })
  tr.appendChild(cbEffacementFond)
  if (effacementFond) cbEffacementFond.setAttribute('checked', 'checked')
  cbEffacementFond.onclick = function () {
    self.oncheckBoxChange()
  }
  let label = ce('label', {
    for: 'cbEffFond'
  })
  $(label).html(getStr('EffFond'))
  tr.appendChild(label)
  if (!bPourMacro) {
    // On ajoute maintenant trois ligne contenant trois boutons radios pour le style d'encadrement suivis du labe
    // Leurs id seront radio0, radio1 et radio2
    const ar = ['EncSans', 'EncSimple', 'Enc3D']
    for (let i = 0; i < 3; i++) {
      tr = ce('tr')
      tabgauche.appendChild(tr)
      // Radio Button "Sans encadrement"
      const radio = ce('input', {
        type: 'radio',
        id: 'panemoderd' + i,
        name: 'encad'
      })
      radio.onchange = function () {
        if (self.callBack !== null) self.callBack()
      }
      if (i === styleEncadrement) radio.setAttribute('checked', 'checked')
      tr.appendChild(radio)
      label = ce('label', {
        for: 'panemoderd' + i
      })
      $(label).html(getStr(ar[i]))
      tr.appendChild(label)
    }
  }
  // Dans la colonne de droite un tableau de deux lignes contenant le titre et au-dessous un bouton de choix de couleur
  td = ce('td') // La colonne de droite
  tab.appendChild(td)
  const tabdroit = ce('table', {
    id: 'panemodetabdroit'
  })
  $('#paneModetabdroit').css('visibility', effacementFond ? 'visible' : 'hidden')
  td.appendChild(tabdroit)
  tr = ce('tr')
  tabdroit.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('CoulFond'))
  tr.appendChild(label)
  tr = ce('tr')
  tabdroit.appendChild(tr)
  // Un svg pour contenir le bouton de choix de couleur
  const w = Math.floor(constantes.lineStyleWidth)
  const h = Math.floor(constantes.lineStyleWidth / 2)
  const svg = cens('svg', {
    width: w,
    height: h
  })
  svg.appendChild(cens('rect', {
    x: 0,
    y: 0,
    width: w,
    height: h,
    fill: constantes.buttonFrameColor
  }))
  tr.appendChild(svg)
  // Création du bouton de choix de couleur
  this.colorButton = new ColorButton(dlg, color, this.callBack)
  svg.appendChild(this.colorButton.container)
  /// ////////////////////////////////////////////////////////////////////////
  // Version 6.0 : On ajoute une éditeur pour le choix de l'angle d'affichage
  // saut si displayAngleEditor est à false (on ne doit pas changer l'angle pour un objet final de construction)
  if (displayAngleEditor && chaineValInit !== null) {
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    label = ce('label')
    $(label).html(getStr('Angle') + ' (' + ((listePr.uniteAngle === uniteAngleRadian) ? 'rad' : 'deg') + ')' + ' : ')
    tr.appendChild(label)
    this.input = getMtgInput({
      id: 'inputAngle'
    })
    tr.appendChild(this.input)
    $(this.input).val(chaineValInit)
    this.editeur = new EditeurValeurReelle(dlg.app, this.input, indMax, this.valeurAngle, null)
    // Version 6.2.2 : On ajoute des boutons sous l'éditeur d'angle
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    const paneBoutonsValFonc = new PaneBoutonsValFonc(app, dlg, this.input, true, indMax)
    tr.appendChild(paneBoutonsValFonc)
  }
}

PaneModeAffichage.prototype.oncheckBoxChange = function () {
  if (this.callBack) this.callBack()
  $('#panemodetabdroit').css('visibility', $('#cbEffFond').prop('checked') ? 'visible' : 'hidden')
}

/**
 * Fonction qui doit être appelée par la boîte de dialogue appelante pour que le bouton de choix de couleur
 * et le label au-dessys soient cachés à l'ouverture de la boîte de dialogue
 */
PaneModeAffichage.prototype.init = function () {
  this.oncheckBoxChange()
}

PaneModeAffichage.prototype.getEffFond = function () {
  return $('#cbEffFond').prop('checked')
}

PaneModeAffichage.prototype.getStyleEnc = function () {
  for (let i = 0; i < 3; i++) {
    if ($('#panemoderd' + i).prop('checked')) return i
  }
}

PaneModeAffichage.prototype.getColor = function () {
  return this.colorButton.color
}

PaneModeAffichage.prototype.validate = function () {
  if (this.chaineValInit !== null && this.displayAngleEditor) return this.editeur.validate()
  else return true
}

PaneModeAffichage.prototype.getAng = function () {
  return this.valeurAngle
}
