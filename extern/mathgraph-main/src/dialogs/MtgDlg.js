/*
 * Created by yvesb on 19/10/2016.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr, preventDefault, isMobileDevice } from '../kernel/kernel'
import $ from 'jquery'

/**
 * L'id du div utilisé pour les boîtes de dialogue (utilisé en dur dans le code dans beaucoup de sélecteurs)
 * @type {string}
 */
export const idDivDlg = 'divMtgDlg'

export default MtgDlg

/**
 * Constructeur de la boîte de dialogue
 * @param {MtgApp} app L'application propriétaire
 * @param {string} id L'id de la fenêtre
 * @param {VoidCallback} callBackOK null ou fonction de callBack à appeler après OK
 * @param {VoidCallback} callBackCancel null ou fonction de callBack à appeler après annulation
 * @constructor
 */
function MtgDlg (app, id, callBackOK = null, callBackCancel = null) {
  if (arguments.length > 0) {
    if (!app.divDlg) throw Error('Cette instance n’a pas de divDlg et ne peut pas gérer de boites de dialogue')
    /** @type {MtgApp} */
    this.app = app
    app.cacheDesignation() // Pour chacher une éventuelle désignation active (par exemple ce point affiché à l'écran)
    /** @type {string} */
    this.id = id
    /** @type {VoidCallback} */
    this.callBackOK = callBackOK
    /** @type {VoidCallback} */
    this.callBackCancel = callBackCancel
    // this.timeStart = new Date(); // Est maintenant dans onOpen
    // Version 6.9.3 : Il ne faut pas considérer les CarSpeciauxDlg comme des dialogue à part entière
    // car ce sont toujours des enfants d'uen autre dialogue.
    // Dans cette modif, dans EntreeNomDlg si on appuie très rapidemnt sur OK plusieurs fois de suite
    // ça finit par planter car en cas d'affichage d'une AvertDlg, le charSpeciauxDlg peut être le dernier créé
    // et la sécurité pour ne pas afficher le même AvertDlg ne fonctionne plus
    // app.dlg.push(id)
    if (id !== 'charspedlg') app.dlg.push(id)
    this.dlgCharSpe = null // Utilisé par les MtgInputWithCharSpe et CarSpeciauxDlg
    try {
      // Try nécessaire à cause de l'avertissement qui peut apparaître si on veut ouvrir sous electron un fichier invalide
      app.cacheTip()
    } catch (e) {
      console.error(e)
    }
    this.div = ce('div', {
      id
    })
    $(this.div).css('-webkit-tap-highlight-color', 'transparent') // Pour éviter le grisé sur ipad
    this.parentDiv = app.divDlg
    this.parentDiv.appendChild(this.div)
  }
}

/**
 * Ajoute l'élément au div principal
 * @param {HTMLElement} el
 */
MtgDlg.prototype.appendChild = function (el) {
  this.div.appendChild(el)
}

// Délai au-dessous duquel on ne répond pas aux boutons de validation ou d'annulation (en ms)
// MtgDlg.delay = 1000;

MtgDlg.prototype.stopEvent = function (evt) {
  preventDefault(evt)
  evt.stopPropagation()
}
/**
 * Fonction créant la boîte de dialogue avec un titre title et une largeur width
 */
/**
 * Fonction pouvant être appelée pour construire la boîte de dialogue
 * quand this.OK() doit être appelé quand on clique sur OK et rien ne doit être fait
 * si on annule ou referme la boîte de dialogue.
 * @param {string} titleTextCode  Le textCode du titre de la boîte de dialogue
 * @param width La largeur de la boîte de dialogue
 * ou ferme la fenêtre
 */
MtgDlg.prototype.create = function (titleTextCode, width) {
  const self = this
  const buttons = [
    {
      text: getStr('OK'),
      id: 'btnOK',
      click: function (ev) {
        self.stopEvent(ev) // Déplacé version 6.9.3
        self.OK() // paramètre ev supprimé version 6.9.3 car ne sert jamais
      }
    },
    {
      text: getStr('Cancel'),
      id: 'btnCancel',
      click: function (ev) {
        self.stopEvent(ev) // Déplacé version 6.9.3
        self.onCancel() // paramètre ev supprimé version 6.9.3 car ne sert jamais
      }
    }
  ]
  $('#' + self.id).dialog({
    modal: true,
    title: getStr(titleTextCode),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    buttons,
    close: function (ev) {
      self.stopEvent(ev)
      self.onClose()
    },
    open: function () {
      self.onOpen()
    },
    width,
    closeOnEscape: false,
    // On centre la boîte de dialogue sur le div parent de l'application
    position: { my: 'center', at: 'center', of: this.app.svg.parentElement }
  })
}

/**
 * Fonction appelée par défaut lorsque l'utilisateur appuie sur le bouton annuler
 * Par défaut cette fonction retourne si un certaint temps ne s'est pas écoulé entre l'affichage de la fenêtre et le
 * clic sur le bouton Annuler, ferme la fenêtre et réactive l'outil actif
 * Pour un comportement autre que ce comportement standard, reédinir cette fonction (sans appeller la méthode ancêtre)
 */
MtgDlg.prototype.onCancel = function (event) {
  if (typeof this.callBackCancel === 'function') this.callBackCancel(event)
  this.destroy()
}

/**
 * Appelée par défaut lorsque l'utilisateur referme la boîte
 * (appelle callBackCancel si ça existe et détruit la boîte de dialogue)
 * Pour un comportement autre que ce comportement standard, redéfinir cette fonction (sans appeller la méthode ancêtre)
 */
MtgDlg.prototype.onClose = function (event) {
  if (typeof this.callBackCancel === 'function') this.callBackCancel(event)
  this.destroy()
}

/**
 * Fonction appelée à l'ouverture de la fenêtre.
 * A appeler par les fonctions redéfinissant cette fonction
 * @param {string|HTMLInputElement} inputToFocus : Si présent, l'id d'un input ou  un autre élément auquel donner le focus
 * au lancement de la boîte de dialogue, sinon on donne le focus au bouton OK s'il est présent.
 * Sur périphérique mobile, on ne donne pas le focus à l'input et même on lui affecte un blut()
 * pour que le clavier virtule ne cache ps la boîte de dialogue au démarrage
 */
MtgDlg.prototype.onOpen = function (inputToFocus) {
  this.app.effaceIndication()
  if (inputToFocus) {
    const input = typeof inputToFocus === 'string' ? document.getElementById(inputToFocus) : inputToFocus
    if (isMobileDevice && (input.tagName.toLowerCase() === 'input')) {
      // Pour ne pas déplier le clavier par défaut sur périphérique mobile
      $(input).blur()
    } else {
      setTimeout(function () { // Ne marche pas sans un setTimeOut
        $(input).focus() // Pour que le focus soit donné à l'éditeur au départ
      }, 0)
    }
  } else {
    if (!isMobileDevice) $('#btnOK').focus()
  }
}

MtgDlg.prototype.destroy = function () {
  if (this.dlgCharSpe != null) {
    this.dlgCharSpe.destroy()
    this.dlgCharSpe = null
  }
  $('#' + this.id).dialog('destroy')
  // this.app.dlg.pop() // Modifié version 6.9.3
  if (this.id !== 'charspedlg') this.app.dlg.pop()
  // Une fois le dialogue détruit, le div qui a servi à le générer est de nouveau présent. Il faut le détruire.
  this.parentDiv.removeChild(this.div)
  // Si un éditeur de nom est en cours on lui redonne le focus
  const ne = this.app.nameEditor
  if (ne.isVisible) ne.editeur.focus() // Pour que, par défaut, le bouton OK ait le focus
  // On retourne en haut de la page (important pour périphériques mobiles)
  // $('html,body').scrollTop(0);
}

/* Supprimé version 6.9.3 car pas utilisé
MtgDlg.prototype.tab = function () {
  return ce('table', {
    cellspacing: 10
  })
}
 */

/**
 * @callback clickListener
 * @param {MouseEvent|TouchEvent} event
 * @this {MtgDlg}
 * @return {void}
 */
