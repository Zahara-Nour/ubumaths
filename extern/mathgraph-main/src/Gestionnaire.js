/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Color from './types/Color'
import StyleEncadrement from './types/StyleEncadrement'
import CAffLiePt from './objets/CAffLiePt'
import CCommentaire from './objets/CCommentaire'
import CListeObjets from './objets/CListeObjets'
import { addZoomListener, getStr } from './kernel/kernel'
import addQueue from 'src/kernel/addQueue'

export default Gestionnaire

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function Gestionnaire (app) {
  /** @type {MtgApp} */
  this.app = app
  /** @type {CListeObjets[]} */
  this.sauvegarde = [] // Contiendra les CListeObjets des actions sur la figure
  /**
   * Chaîne décrivant la nature de l'action en cours
   * @type {string[]}
   */
  this.natureSauvegarde = []
}
Gestionnaire.nombreMaxiAnnulations = 50 // Le nombre maxi d'annulations
Gestionnaire.prototype.initialise = function () {
  const app = this.app
  const list = app.listePr
  this.sauvegarde = []
  this.natureSauvegarde = []
  this.sauvegarde.push(new CListeObjets())
  list.setCopy(this.sauvegarde[0])
  this.indiceFigureEnCours = 0
  this.indiceDerniereSauvegarde = 0
  app.buttonAnnuler.tip = ''
}

Gestionnaire.prototype.metAJourTipIconesAnnulerRefaire = function () {
  const app = this.app
  app.cacheTip()
  if (this.indiceFigureEnCours > 0) {
    app.buttonAnnuler.tip = getStr('Annuler') + ' ' +
    getStr(this.natureSauvegarde[this.indiceFigureEnCours])
  } else app.buttonAnnuler.tip = ''
  if (this.indiceFigureEnCours !== this.indiceDerniereSauvegarde) {
    app.buttonRefaire.tip = getStr('Refaire') + ' ' +
      getStr(this.natureSauvegarde[this.indiceFigureEnCours + 1])
  } else app.buttonRefaire.tip = ''
}

/**
 * Enregistre la figure
 * @param {string} nature chaîne décrivant à la suite de quelle action la figure est enregistrée
 * @param {boolean} updateToolbars : on ne met à jour les toolbar de gauche que si updateToolbars est true
 */
Gestionnaire.prototype.enregistreFigureEnCours = function enregistreFigureEnCours (nature, updateToolbars = true) {
  const app = this.app
  // Modification version 6.3.0 : Si ola boîte d dialogue de protocole est ouverte et qu'on est en traint
  // de modifier un objet via sa boîte de dialogue dde modification, on n'enregistre pas la figure.
  // Toutes les modifications sont enrégistrées d'un seul coup quand on quitte la boîte de dialogue de protocole.
  if (!app.isRunningProtocol) {
    app.effaceIndication()
    app.doc.setDirty(app.electron, true)
    const list = this.app.listePr
    // Ajout version 6.3.0
    // Par exemple, si une macro incrémente une variable, si on modifie un objet dépendant de cette variable, il doit etre ajouté
    // à la liste des objets sur lesquels agit cette macro.
    list.metAJourMacros()
    // Fin ajout
    if (this.indiceFigureEnCours < Gestionnaire.nombreMaxiAnnulations - 1) {
      this.indiceFigureEnCours++
      this.natureSauvegarde[this.indiceFigureEnCours] = nature
      // natureSauvegarde[indiceFigureEnCours] = nature;
      this.sauvegarde[this.indiceFigureEnCours] = new CListeObjets()
      list.setCopy(this.sauvegarde[this.indiceFigureEnCours])
      this.indiceDerniereSauvegarde = this.indiceFigureEnCours
      // Il faut mettre à jour les listes maintenues de façon internes par les
      // macros
      // quand la figure a été modifiée
      list.etablitListesInternesMacros()
    } else { // Il faut tout décaler et on perd alors la première sauvegarde
      for (let i = 1; i < Gestionnaire.nombreMaxiAnnulations; i++) {
        this.natureSauvegarde[i - 1] = this.natureSauvegarde[i]
        this.sauvegarde[i - 1] = this.sauvegarde[i]
      }
      this.natureSauvegarde[Gestionnaire.nombreMaxiAnnulations - 1] = nature
      this.sauvegarde[Gestionnaire.nombreMaxiAnnulations - 1] = new CListeObjets()
      list.setCopy(this.sauvegarde[Gestionnaire.nombreMaxiAnnulations - 1])
    }
    this.metAJourTipIconesAnnulerRefaire()
    if (updateToolbars) app.updateToolsToolBar()
    list.initialiseDependances()
    // Si la figure est un exercice de construction et si elle a un énoncé, on s'arrange pour que le g element de cet énoncé
    // (affichage de texte ou LaTeX) soit le dernier du svg;
    this.reclasseEnonce()
  }
}

Gestionnaire.prototype.enregistreFigureEnCoursPourZoom = function () {
  const nat = 'Zoom'
  if (this.indiceFigureEnCours !== 0) {
    const ch = this.natureSauvegarde[this.indiceFigureEnCours]
    if (ch.indexOf(nat) === 0) {
      if (this.indiceFigureEnCours < Gestionnaire.nombreMaxiAnnulations - 1) {
        this.indiceFigureEnCours--
      }
    }
  }
  this.enregistreFigureEnCours(nat)
}

Gestionnaire.prototype.annulationPossible = function () {
  return (this.indiceFigureEnCours > 0)
}

Gestionnaire.prototype.refairePossible = function () {
  return (this.indiceFigureEnCours < this.indiceDerniereSauvegarde)
}

Gestionnaire.prototype.annuleAction = function () {
  // On englobe dans un try catch pour capturer les erreurs arrivant dans LaboMep quand on ferme la fenêtre
  // de l'exercice
  try {
    const app = this.app
    const doc = this.app.doc
    let list = doc.listePr
    doc.setDirty(app.electron, true)
    this.indiceFigureEnCours--
    // Ligne suivante ajoutée version 7.3.2 suite rapport bugsnag
    app.outilActif.annuleClignotement()
    // Modification version 6.3.5 : Il faut appeler app.retireTout() avant list.retireTout()
    app.retireTout()
    list.retireTout(true)
    list = new CListeObjets()
    list.associeA(doc)
    doc.listePr = list
    this.app.listePr = list
    this.sauvegarde[this.indiceFigureEnCours].setCopy(list)
    list.initialiseDependances() // Ajout version 4.9.7 pour contrer bug aléatoire sur macos d'animation
    list.setClone(this.sauvegarde[this.indiceFigureEnCours])
    // Il faut mettre à jour les liste maintenues de façon internes par les macros
    list.etablitListesInternesMacros()
    // Il faut recréer le buffer de traces et éventuellement l'image de fond de la figure
    app.prepareTracesEtImageFond()
    // list.creePaneVariables doit être appelé après app.prepareTracesEtImageFond car les paneVariables
    // sont maintenant des foreign objects du svg de la figure qui sinon seraient masqués par les objets créés par prepareTracesEtImageFond
    list.creePaneVariables()
    // Il faut recréer les deux affichages de texet utilisés pour la désigantion des objets et les tip d'outils
    app.commentaireDesignation = new CCommentaire(list, null, false, Color.red, 0, 0, 0, 6, true, null, 13, StyleEncadrement.Sans,
      false, Color.white, CAffLiePt.alignHorCent, CAffLiePt.alignVerTop, '')
    // Contrairement à la version Java il faut afficher même vide
    app.commentaireDesignation.positionne()
    app.commentaireDesignation.affiche(app.svgFigure, false, doc.couleurFond)
    //
    app.calculateAndDisplay(false)
    app.updateToolsToolBar()
    app.listePourConst = app.listePourConstruction()
    this.metAJourTipIconesAnnulerRefaire()
    app.reInitConst() // Pour réinitialiser une éventuelle construction en cours
    app.createCadre(app.widthCadre, app.heightCadre, app.cadreVisible)
    // Si la figure est un exercice de construction et si elle a un énoncé, on s'arrange pour que le g element de cet énoncé
    // (affichage de texte ou LaTeX) soit le dernier du svg;
    // Si la figure est un exercice de construction et si elle a un énoncé, on s'arrange pour que le g element de cet énoncé
    // (affichage de texte ou LaTeX) soit le dernier du svg;
    this.reclasseEnonce()
    if (app.zoomOnWheel) addZoomListener(doc, app.svgFigure, app.svgGlob)
  } catch (e) {
    console.error('Erreur dans Annuler de Gestionnaire', e)
  }
}

Gestionnaire.prototype.refaitAction = function () {
  // On englobe dans un try catch pour capturer les erreurs arrivant dans LaboMep quand on ferme la fenêtre
  // de l'exercice
  try {
    const app = this.app
    const doc = app.doc
    const list = app.listePr
    doc.setDirty(app.electron, true)
    this.indiceFigureEnCours++
    // Ligne suivante ajoutée version 7.3.2 suite rapport bugsnag
    app.outilActif.annuleClignotement()
    // Modification version 6.3.5 : Il faut appeler app.retireTout() avant list.retireTout()
    app.retireTout()
    list.retireTout(true)
    doc.listePr = new CListeObjets()
    this.sauvegarde[this.indiceFigureEnCours].setCopy(list)
    list.setClone(this.sauvegarde[this.indiceFigureEnCours])
    list.associeA(doc)
    doc.listePr = list
    app.listePr = list
    list.etablitListesInternesMacros()
    // Il faut recréer le buffer de traces et éventuellement l'image de fond de la figure
    app.prepareTracesEtImageFond()
    // list.creePaneVariables doit être appelé après app.prepareTracesEtImageFond car les paneVariables
    // sont maintenant des foreign objects du svg de la figure qui sinon seraient masqués par les objets créés par prepareTracesEtImageFond
    list.creePaneVariables()
    // Il faut recréer les deux affichages de texet utilisés pour la désigantion des objets et les tip d'outils
    app.commentaireDesignation = new CCommentaire(list, null, false, Color.red, 0, 0, 0, 6, true, null, 13, StyleEncadrement.Sans,
      false, Color.white, CAffLiePt.alignHorCent, CAffLiePt.alignVerTop, '')
    // Contrairement à la version Java il faut afficher même vide
    app.commentaireDesignation.positionne()
    app.commentaireDesignation.affiche(app.svgFigure, false, doc.couleurFond)
    //
    app.calculateAndDisplay(false)
    app.updateToolsToolBar()
    app.listePourConst = app.listePourConstruction()
    this.metAJourTipIconesAnnulerRefaire()
    app.reInitConst() // Pour réinitialiser une éventuelle construction en cours
    app.createCadre(app.widthCadre, app.heightCadre, app.cadreVisible)
    this.reclasseEnonce()
    if (app.zoomOnWheel) addZoomListener(doc, app.svgFigure, app.svgGlob)
  } catch (e) {
    console.error('Erreur dans Refaire action de Gestionnaire', e)
  }
}

// Modifié version 6.4.8 pour être appelé via addQueue car sinon appelé trop tôt et enonce.g est null
/**
 * Fonction qui, dans le cas où l'exercice est un exercice de construction et qu'il a un énoncé incorporé à la figure,
 * s'arrange pour que le g element de cet enonce soit le dernier g element du SVG de la figure afi qu'il soit toujours
 * bien visible.
 * La fonction termine son exécution avant que ce soit effectif, utiliser app.ready() pour savoir quand c'est terminé
 * @returns {void}
 */
Gestionnaire.prototype.reclasseEnonce = function reclasseEnonce () {
  const app = this.app
  if (app.estExercice) {
    const enonce = app.getEnonce()
    if (enonce !== null) {
      addQueue(function () {
        const svg = app.svgFigure
        const g = enonce.g
        svg.removeChild(g)
        svg.appendChild(g)
      })
    }
  }
}
