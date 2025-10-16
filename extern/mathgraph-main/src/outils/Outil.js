/*
 * Created by yvesb on 16/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CDroiteImage from '../objets/CDroiteImage'
import CCercleImage from '../objets/CCercleImage'
import CArcDeCercleImage from '../objets/CArcDeCercleImage'
import CPointImage from '../objets/CPointImage'
import CDemiDroiteImage from '../objets/CDemiDroiteImage'
import CSegment from '../objets/CSegment'
import CLigneBrisee from '../objets/CLigneBrisee'
import CPolygone from '../objets/CPolygone'
import CNoeudPointeurSurPoint from '../objets/CNoeudPointeurSurPoint'
import StyleTrait from '../types/StyleTrait'
import CCercleOR from '../objets/CCercleOR'
import Color from '../types/Color'
import CValeur from '../objets/CValeur'
import CDemiDroiteOA from '../objets/CDemiDroiteOA'
import CIntDroiteCercle from '../objets/CIntDroiteCercle'
import CPointLieBipoint from '../objets/CPointLieBipoint'
import MotifPoint from '../types/MotifPoint'
import CRotation from '../objets/CRotation'
import CValeurAngle from '../objets/CValeurAngle'
import CHomothetie from '../objets/CHomothetie'
import CCommentaire from '../objets/CCommentaire'
import CAffLiePt from '../objets/CAffLiePt'
import StyleEncadrement from '../types/StyleEncadrement'
import addQueue from '../kernel/addQueue'
import CLieuDePoints from '../objets/CLieuDePoints'
import CLieuParVariable from '../objets/CLieuParVariable'
import InfoLieu from '../types/InfoLieu'
import CLieuDiscretParPointLie from '../objets/CLieuDiscretParPointLie'
import CLieuDiscretParVariable from '../objets/CLieuDiscretParVariable'
import { defaultSurfOpacity } from '../objets/CMathGraphDoc'

export default Outil
/**
 * Classe ancêtre de tous les outils pouvant agir sur la figure.
 * @param {MtgApp} app Application propriétaire
 * @param {string} toolName Le nom de l'outil
 * @param {number} toolIndex L'index de l'outil tel que dans la version Java
 * @param {boolean} [avecClign=false] true si l'outil utilise un clignotement d'objets lors de la création
 * @param {boolean} [isSelectable=true] true si l'outil est sélectionnable, false s'il est à action immédiate quand
 * on clique sur le bouton de recalcul de la figure. true par defaut
 * @param {boolean} [always=false] true si l'outil est toujours présent dans les exercices de construction
 * @param {boolean} [hasIcon=true] true par défaut. A metre à false pour les outils sans icône associée
 * @constructor
 */
function Outil (app, toolName, toolIndex, avecClign = false,
  isSelectable = true, always = false, hasIcon = true) {
  this.app = app
  this.toolName = toolName
  this.avecClign = avecClign
  this.toolIndex = toolIndex
  this.timer = null
  this.isSelectable = isSelectable
  this.always = always
  this.hasIcon = hasIcon
  this.cursor = 'crosshair'
}
/**
 * Fonction sélectionnant l'outil
 */
Outil.prototype.select = function () {
  // On englobe dans un try catch pour capturer les erreurs arrivant dans LaboMep quand on ferme la fenêtre
  // de l'exercice
  try {
    // Le nombre de points créés au clic de la souris si l'option de création des points au clic est activée
    const app = this.app
    // Ajout version 6.4 : Si une macro est en cours d'exécution on l'arrête.
    app.termineMacroEnCours()

    this.nbPtsCrees = 0
    const btn = this.app['button' + this.toolName]
    // Certains outils ne sont pas associés à un bouton (obtenus pas bouton +)
    if (btn) btn.activate(true)
    // Pour que, sur écran tactile avec stylet, on ne voie plus une éventuelle désignation encore affichée
    // il faut que la ligne ci-dessous soit appelée avec un setTimeOut pour passer après d'éventuels événements
    // touchmove ou mousemove
    setTimeout(function () {
      app.cacheDesignation()
    })
    app.outilActifPrec = app.outilActif // Ajout version 6.3.3
    app.outilActif = this
    // Version 6.9.0 : Ligne suivante our que si un outil n'a pas d'indication fugitive l'outil
    // affichant la dernière indication de l'outil en cours n'affiche pas  l'indication d'un autre outil
    app.indication('')
    // if (app.nameEditor.isVisible) app.nameEditor.montre(false);
    // Si l'outil qu'on active est un outil de création de surface, on met le curseur d'opacité à 0.2, sinon à 1
    // Attention : app.outilPalette.isSurfTool renvoie true
    if ((this !== app.outilPalette) && this.isSurfTool()) {
      if (app.opacity === 1) app.opacity = defaultSurfOpacity
    } else {
      if (this !== app.outilPalette) app.opacity = 1
    }
    app.updateRightPanel()
    app.listeExclusion.retireTout()
  } catch (error) {
    console.error('Erreur dans outil.select', error)
  }
}

/**
 * Déselectionne l'outil
 */
Outil.prototype.deselect = function () {
  // On englobe dans un try catch pour capturer les erreurs arrivant dans LaboMep quand on ferme la fenêtre
  // de l'exercice
  try {
    const app = this.app
    const btn = this.app['button' + this.toolName]
    // Certains outils ne sont pas associés à un bouton (obtenus pas bouton +)
    if (btn) btn.activate(false)
    else this.app.buttonCapt.activate(false)
    if (this.avecClign) this.annuleClignotement()
    app.supprimeObjetsVisuels()
    app.listeExclusion.retireTout()
    // La ligne suivante remet à jour la barre d'icônes car une fois qu'un outil est déselectionné pour
    // en sélecionner un autre certains outils peuvent ne plus être activables alors que  d'autres peuvent l'être
    // app.updateToolsToolBar();// Supprimé et déplacé dans Gestionnaire.enregistreFigureEnCours
    // Certains outils d'affichage ont céé un affichage clignotatnt pour désigner l'endroit d'affichage
    // (commentaire libre, latex libre, affichage de valeur libre, macros)
    if (this.comClig) {
      this.comClig.removegElement(app.svgFigure)
      this.comClig = null
    }
    // Lorsque la création de point par défaut est activée on peut avoir créé des points qu'il fait détruire si l'objet
    // n'a pas été créé
    if (this.nbPtsCrees > 0) {
      const list = app.listePourConst
      for (let i = 0; i < this.nbPtsCrees; i++) {
        const pt = list.get(list.longueur() - i - 1)
        if (app.nameEditor.isVisible && app.nameEditor.eltAssocie === pt) app.nameEditor.montre(false)
        pt.removegElement(app.svgFigure)
      }
      app.detruitDerniersElements(this.nbPtsCrees)
      this.nbPtsCrees = 0
    }
    // if (app.nameEditor.isVisible) app.nameEditor.montre(false);
  } catch (e) {
    console.error('Erreur dans outil.deselect', e)
  }
}

Outil.prototype.reselect = function () {
  this.deselect()
  this.select()
}

/**
 * Fonction qui renverra true seulement pour les outils servant à créer une surface.
 * Cela permet de savoir s'il faut ou non mettre le curseur d'opacité à 1 ou à 0.3
 * lorsqu'on active un outil de création d'objet
 * @returns {boolean}
 */
Outil.prototype.isSurfTool = function () {
  return false
}

/**
 * Fonction renvoyant éventuellement une indication supplémentaire à rajouter devant indication()
 * et suivi de :
 * @returns {string}
 */
Outil.prototype.preIndication = function () {
  return ''
}

/**
 * Fonction renvoyant true si l'outil est activable
 * A redéfinir pour les descendants
 * @returns {boolean}
 */
Outil.prototype.activationValide = function () {
  return true
}
/*
 Fonction relançant le clignotement de la liste listeClignotante de l'application this.app
 */
Outil.prototype.resetClignotement = function () {
  if (this.timer !== null) this.annuleClignotement()
  this.app.clignotementPair = true
  const app = this.app
  this.timer = setInterval(function () {
    app.actionClignotement()
  }, 500)
}
/**
 * Annule le clignotement de this.app.listeClignotante
 * @returns {void}
 */
Outil.prototype.annuleClignotement = function () {
  // Le try catch ci-dessous est pour supprimer des erreurs quand on est dans LaboMep
  // Cette fonction peut être appelée lors d'un try catch de actionClignotement
  // et si la fenêtre de l'exercice a été fermée il ne faut plus touher au DOM
  try {
    clearInterval(this.timer)
    this.timer = null
    const app = this.app
    if (!this.app.clignotementPair) {
      app.listeClignotante.montreTout(true)
      const doc = app.doc
      // Version 6.7.2 : Il faut passer un dernier paramètre byBlock à false car sinon il est true pas défaut
      app.listeClignotante.update(app.svgFigure, doc.couleurFond, true, false)
    }
    this.app.listeClignotante.retireTout()
  } catch (e) {
    console.error('erreur dans annuleClignotement', e)
  }
}
/**
 * Fonction ajoutant el à la liste listeClignotatnte de this.app l'élément el
 * @param el CElementGraphique : l'objet à rajouter à la liste clignotante
 */
Outil.prototype.ajouteClignotementDe = function (el) {
  this.app.listeClignotante.add(el)
}

/**
 * Enlève le clignotement actif de l'objet obj
 * @param {COb} obj
 */
Outil.prototype.enleveDeClign = function (obj) {
  clearInterval(this.timer)
  this.timer = null
  const app = this.app
  const list = app.listeClignotante
  if (!this.app.clignotementPair) {
    list.montreTout(true)
    const doc = app.doc
    list.update(app.svgFigure, doc.couleurFond, true)
  }
  this.app.clignotementPair = true
  // Correction version 6.9.0 : Il  faut attendre pour relancer le clignotement que le update précédent ait été
  // effectué
  const me = this
  addQueue(function () {
    for (let i = 0; i < list.longueur(); i++) {
      const el = list.get(i)
      if (el === obj) {
        list.col.splice(i, 1)
      }
    }
    me.timer = setInterval(function () {
      app.actionClignotement(app)
    }, 500)
  })
}

/**
 * Fonction ajoutanat à la liste listeObjetsVisuels de l'application this.app
 * les élémengts graphiques servant à visualiser l'action de l'outil.
 * A redéfinir pour les descendants
 */
Outil.prototype.ajouteObjetsVisuels = function () {
}
/**
 * Fonction rajoutant à al liste listeExclusion de l'application this.app l'élément el
 * el ne pourra pas être désigné par poinatge de souris.
 * @param el CElementGraphique : L'objet à rajouter
 */
Outil.prototype.excluDeDesignation = function (el) {
  this.app.listeExclusion.add(el)
}

Outil.prototype.addImage = function (el, bEditionNom = true) {
  this.app.ajouteElement(el, bEditionNom)
}

Outil.prototype.ajouteImageParTransformation = function (objet, trans, nombreObjetsCrees) {
  let ptim1, ptim2, col, lig, ptim
  const app = this.app
  const list = app.listePr
  const coul = app.getCouleur()
  const st = app.getStyleTrait()
  const taille = app.getTaillePoliceNom()
  nombreObjetsCrees.setValue(nombreObjetsCrees.getValue() + 1)
  app.nameEditor.montre(false) // Pour annuler l'édition d'un éventuel objet image précédent
  trans.positionne(false) // Nécessaire car ajouteElement ne positionne que l'image et pas la transformation
  if (objet.estDeNature(NatObj.NTtPoint)) {
    this.addImage(new CPointImage(list, null, false, coul, false, 0, 3, false, '',
      taille, app.getStylePoint(), false, objet, trans))
  } else {
    const nat = objet.getNature()
    switch (nat) {
      case NatObj.NDroite :
        this.addImage(new CDroiteImage(list, null, false, coul, false, 0, 0, false, '', taille, st, 0.9, objet, trans))
        break
      case NatObj.NDemiDroite :
        this.addImage(new CDemiDroiteImage(list, null, false, coul, false, st, objet, trans))
        break
      case NatObj.NCercle :
        this.addImage(new CCercleImage(list, null, false, coul, false, st, objet, trans))
        break
      case NatObj.NArc :
        this.addImage(new CArcDeCercleImage(list, null, false, coul, false, st, objet, trans))
        break
      case NatObj.NSegment :
        ptim1 = list.pointImageDePar(objet.point1, trans)
        if (ptim1 === null) {
          ptim1 = new CPointImage(list, null, false, coul, false, 0, 3, false, '',
            taille, app.getStylePoint(), false, objet.point1, trans)
          this.addImage(ptim1, false)
          nombreObjetsCrees.setValue(nombreObjetsCrees.getValue() + 1)
        }
        ptim2 = list.pointImageDePar(objet.point2, trans)
        if (ptim2 === null) {
          ptim2 = new CPointImage(list, null, false, coul, false, 0, 3, false, '',
            taille, app.getStylePoint(), false, objet.point2, trans)
          this.addImage(ptim2, false)
          nombreObjetsCrees.setValue(nombreObjetsCrees.getValue() + 1)
        }
        this.addImage(new CSegment(list, null, false, coul, false, st, ptim1, ptim2))
        break
      case NatObj.NLigneBrisee :
      case NatObj.NPolygone :
        col = []
        if (nat === NatObj.NLigneBrisee) { lig = new CLigneBrisee(list, null, false, coul, false, app.getStyleTrait(), col) } else lig = new CPolygone(list, null, false, coul, false, app.getStyleTrait(), col)
        for (let i = 0; i < objet.colPoints.length; i++) {
          const pt = objet.colPoints[i].pointeurSurPoint
          ptim = list.pointImageDePar(pt, trans)
          if (ptim === null) {
            ptim = new CPointImage(list, null, false, coul, false, 0, 3, false, '',
              taille, app.getStylePoint(), false, pt, trans)
            this.addImage(ptim)
            nombreObjetsCrees.setValue(nombreObjetsCrees.getValue() + 1)
          }
          col.push(new CNoeudPointeurSurPoint(list, ptim))
        }
        lig.prepareTableauxCoordonnees()
        this.addImage(lig)
        break
      case NatObj.NLieuDiscret:
      case NatObj.NLieu: {
        let nbObjCrees = 0
        const color = app.getCouleur()
        const styleTrait = app.getStyleTrait()
        ptim1 = list.pointImageDePar(objet.pointATracer, trans)
        if (ptim1 === null) {
          ptim1 = new CPointImage(list, null, false, coul, false, 0, 3, true, '',
            taille, MotifPoint.petitRond, false, objet.pointATracer, trans)
          this.addImage(ptim1, false)
          nbObjCrees++
        }
        let lieu
        const infoLieu = objet.infoLieu ? new InfoLieu(objet.infoLieu) : null
        switch (objet.className) {
          case 'CLieuDiscretParVariable':
            lieu = new CLieuDiscretParVariable(list, null, false, color, false, ptim1, objet.nombreDePoints, app.getStylePoint(), objet.variableGeneratrice)
            break
          case 'CLieuDiscretParPointLie':
            lieu = new CLieuDiscretParPointLie(list, null, false, color, false, ptim1, objet.nombreDePoints, app.getStylePoint(), objet.pointLieGenerateur)
            break
          case 'CLieuParVariable':
            lieu = new CLieuParVariable(list, null, false, color, false, styleTrait, ptim1, infoLieu, objet.variableGeneratrice)
            break
          case 'CLieuDePoints':
          default:
            lieu = new CLieuDePoints(list, null, false, color, false, styleTrait, ptim1, infoLieu, objet.pointLieGenerateur)
        }
        this.addImage(lieu, false)
        nbObjCrees++
        nombreObjetsCrees.setValue(nbObjCrees)
      }
    }
  }
}

/**
 * Fonction qui devra être redéfinie pour les descendants
 * Renverra true si lorsque, sur un périphérique mobile, on relâche le doigt et qu'on traite un objet proche de ce doigt
 * Par exemple, pour un outil de création par deux points, il faudra que this.point1 ne soit pas null,
 * c'est-à-dire que le premier point ait déjà été désigné
 * @returns {boolean}
 */
Outil.prototype.isReadyForTouchEnd = function () {
  return true
}

/**
 * Fonction  redéfinir pour les descendants et servant sur les périphériques mobiles
 * Si cette fonction renvoie true, les événements touch ne sont pas propagés pour éviter
 * par exemple qu'on glisse dans la figure quand on faut glisser le doigt après avoir cliqué sur un premier point
 * @returns {boolean}
 */
Outil.prototype.isWorking = function () {
  return false
}

Outil.prototype.actionApresDlg = function () {
}

/**
 * Fonction qui devra être redéfinie par les outils qui utilisent un clic sur l'icône stop
 * en bas et à droite de la barre d'outils de droite pour finir une action.
 */
Outil.prototype.actionFin = function () {
}

/**
 * Méthode ajoutant un rapporteur à la liste d'objets visuels. Utilisée pour
 * l'outil rapporteur et peut-être plus tard les outils de création d'arc de
 * cercle. Renvoie un pointeur sur un point d'intersection entre le cercle
 * extérieur du rapporteur et une demi-droite joignant le centre de ce cercle
 * avec le point suivant le pointeur souris
 * Modifié version 5.0
 */
Outil.prototype.ajouteRapporteur = function (origine) {
  let coul, styleTrait
  const app = this.app
  const doc = app.doc
  // On crée d'abord un cercle de centre origine et de rayon fixe
  // qui servira de support extérieur au rapporteur
  const liste = app.listeObjetsVisuels
  const stfc = StyleTrait.stfc(liste)
  const stfp = StyleTrait.stfp(liste)
  const bl = Color.black
  const ptrond = MotifPoint.petitRond
  const taille = app.getTaillePoliceNom()
  // Pour la version js on se sert d'un CCercleOR avec rayon en pixels
  const ptCercleRapExt = new CCercleOR(liste, null, false, bl, false, stfc, origine,
    new CValeur(liste, 80), true)
  app.ajouteObjetVisuel(ptCercleRapExt)
  // Puis un cercle intérieur
  const ptCercleRapInt = new CCercleOR(liste, null, false, bl, false, stfc, origine,
    new CValeur(liste, 40), true)
  app.ajouteObjetVisuel(ptCercleRapInt)
  // On crée un demi-droite de Origine vers PointSouris
  // var ptdemid = new CDemiDroiteOA(liste, null, false, Couleur
  //   .TraduitCouleur(1), false, StyleTrait.traitPointille, origine, frame
  //   .cadreActif().paneFigure.pointSouris);
  const ptdemid = new CDemiDroiteOA(liste, null, false, bl, true, stfp, origine, app.mousePoint)
  app.ajouteObjetVisuel(ptdemid)
  // On crée l'intersection de cette demi-droite avec le cercle extérieur
  // du rapporteur
  // CIntDroiteCercle ptint = new CIntDroiteCercle(liste, null, false, ptdemid,
  //   ptCercleRapExt);
  const ptint = new CIntDroiteCercle(liste, null, false, ptdemid, ptCercleRapExt)
  app.ajouteObjetVisuel(ptint)
  const ptplb = new CPointLieBipoint(liste, null, false, bl, true, 0, 0, false, '', taille, ptrond, false, ptint, 1)
  app.ajouteObjetVisuel(ptplb)
  // On rajoute des graduations au rapporteur
  // On crée d'abord une rotation d'angle 10°
  // CRotation ptrot10 = new CRotation(liste, null, false, origine, 10);
  const ptrot10 = new CRotation(liste, null, false, origine, new CValeurAngle(liste, 10))
  app.ajouteObjetVisuel(ptrot10)
  // On crée une homothétie servant à créer les graduations de 10°
  // CHomothetie hom1 = new CHomothetie(liste, null, false, origine, 0.85);
  const hom1 = new CHomothetie(liste, null, false, origine, new CValeur(liste, 0.85))
  app.ajouteObjetVisuel(hom1)
  // Et une autre pour les graduations de 90°
  const hom2 = new CHomothetie(liste, null, false, origine, new CValeur(liste, 0.5))
  app.ajouteObjetVisuel(hom2)
  // On crée les images par des rotations d'angle 10°
  let ptp1 = ptplb
  for (let i = 1; i <= 36; i++) {
    const ptim = new CPointImage(liste, null, false, Color.green, true, 0, 0, true, '', app.getTaillePoliceNom(),
      ptrond, false, ptp1, ptrot10)
    app.ajouteObjetVisuel(ptim)
    // On crée l'image du point créé par l'homothétie pour créer les
    // graduations
    // Pour les multiples de 90° elles sont rouges, sinon vertes
    // CPointImage ptima = new CPointImage(liste, null, false, Couleur
    //  .TraduitCouleur(3), 13, MotifPoint.Pixel, ptim, hom1);
    const ptima = new CPointImage(liste, null, false, Color.green, true, 0, 0, true, '', taille, ptrond, false, ptim, hom1)
    app.ajouteObjetVisuel(ptima)
    // On crée un segment graduation

    if ((i % 9) === 0) {
      coul = 'red'
      styleTrait = new StyleTrait(liste, StyleTrait.styleTraitContinu, 2)
    } else {
      coul = 'blue'
      styleTrait = stfc
    }
    // On crée des graduations joignant le centre aux 90°
    if ((i % 9) === 0) {
      // CPointImage ptim2 = new CPointImage(liste, null, false, Couleur
      //   .TraduitCouleur(1), MotifPoint.Croix, 13, ptim, hom2);
      const ptim2 = new CPointImage(liste, null, false, bl, true, 0, 0, true, '', app.getTaillePoliceNom(), ptrond,
        false, ptim, hom2)
      app.ajouteObjetVisuel(ptim2)
      // CSegment ptseg90 = new CSegment(liste, null, false, origine, ptim2); // Segment
      // en
      // pointillés
      const ptseg90 = new CSegment(liste, null, false, bl, false, stfp, origine, ptim2)
      app.ajouteObjetVisuel(ptseg90)
      // CPointImage ptim3 = new CPointImage(liste, null, false, Couleur
      //  .TraduitCouleur(1), MotifPoint.Croix, 2, ptima, hom1);
      const ptim3 = new CPointImage(liste, null, false, bl, true, 0, 0, true, '', app.getTaillePoliceNom(), ptrond,
        false, ptima, hom1)
      app.ajouteObjetVisuel(ptim3)
      let chai
      switch (i) {
        case 9:
        case 27:
          chai = '90°'
          break
        case 18:
          chai = '180°'
          break
        case 36:
          chai = '0°'
          break
      }
      // CCommentaire ptcom = new CCommentaire(liste, null, false, Couleur
      //  .TraduitCouleur(coul), 0d, 0d,(int)(-8d*k), (int)(-6d*k), false, ptim3, (int)(k*10),
      //  StyleEncadrement.Sans, false, doc.couleurFond, chai,
      //  CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop);
      const ptcom = new CCommentaire(liste, null, false, Color[coul], 0, 0, -8, -6, false, ptim3, 10, StyleEncadrement.Sans,
        false, doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, chai)
      app.ajouteObjetVisuel(ptcom)
    }
    // CSegment ptgrad = new CSegment(liste, null, false, Couleur
    //  .TraduitCouleur(coul), false, styleTrait, ptima, ptim);
    const ptgrad = new CSegment(liste, null, false, Color[coul], false, styleTrait, ptima, ptim)
    app.ajouteObjetVisuel(ptgrad)
    // Pour 10° et -10° on ajoute un commentaire de graduation
    if ((i === 1) || (i === 35)) {
      // CPointImage ptim4 = new CPointImage(liste, null, false, Couleur
      //   .TraduitCouleur(1), MotifPoint.Croix, 13, ptima, hom1);
      const ptim4 = new CPointImage(liste, null, false, bl, true, 0, 0, true, '', app.getTaillePoliceNom(), ptrond,
        false, ptima, hom1)
      app.ajouteObjetVisuel(ptim4)
      // CCommentaire ptcom = new CCommentaire(liste, null, false, Couleur
      //  .TraduitCouleur(coul), 0d, 0d, (int)(-10d*k), (int)(-6d*k), false, ptim4, (int)(k*10),
      //  StyleEncadrement.Sans, false, doc.couleurFond, "10°",
      //  CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop);

      const ptcom = new CCommentaire(liste, null, false, Color[coul], 0, 0, -10, -6, false, ptim4, 10, StyleEncadrement.Sans,
        false, doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, '10°')
      app.ajouteObjetVisuel(ptcom)
    }
    ptp1 = ptim
  }
  return ptplb
}

/**
 * Fonction enregistrant la figure avec le gestionnaire
 * @param {boolean} updateToolbars si true après enregistrement on met à jour les toolbar de gauche
 */
Outil.prototype.saveFig = function (updateToolbars = true) {
  this.app.gestionnaire.enregistreFigureEnCours(this.toolName, updateToolbars)
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
Outil.prototype.creationPointPossible = function () {
  return false
}

/**
 * Fonction interdisant la désignation comme objets sources graphiques d'objets dépendant des objets sources
 * graphiques ou non graphiques déjà désignés
 */
Outil.prototype.excluDesignationObjDepObjSrc = function () {
  const app = this.app
  const list = app.listePr
  for (let i = 0; i < list.longueur(); i++) {
    const elb = list.get(i)
    if (elb.dependDeAuMoinsUn(app.listeSrcNG) || elb.dependDeAuMoinsUn(app.listeSrcG) ||
      app.listeSrcNG.depDe(elb) || app.listeSrcG.depDe(elb)) {
      app.listeExclusion.add(elb)
    }
  }
}

/**
 * Fonction interdisant la designation d'objets dépendant de l'objet graphique elg
 * @param elg
 */
Outil.prototype.excluDesignationObjDepDe = function (elg) {
  const app = this.app
  const list = app.listePr
  for (const elb of list.col) {
    if (elb.depDe(elg)) app.listeExclusion.add(elb)
  }
}

/**
 * Fonction renvoyant true si l'outil a besoin qu'on affiche dans la palette les différents styles
 * de type de point
 * @returns {boolean}
 */
Outil.prototype.isPointTool = function () {
  return false
}

/**
 * Fonction renvoyant true si l'outil a besoin de la palette de style et d'épaisseur de trait
 */
Outil.prototype.isLineTool = function () {
  return false
}

/**
 * Fonction renvoyant true si l'outil a besoin que dans la palette de droite on voie les différents
 * styles de marque d'angle
 * @returns {boolean}
 */
Outil.prototype.isAngleTool = function () {
  return false
}

/**
 * Fonction renvoyant true si l'outil a besoin que dans la palette de droite on voie les différents
 * styles de flèches disponibles
 * @returns {boolean}
 */
Outil.prototype.isArrowTool = function () {
  return false
}

/**
 * Fonction renvoyant true si l'outil est un outil de création de surface et a donc besoin
 * que soient affichés dans la palette de droite les différents styles de surface
 * @returns {boolean}
 */
Outil.prototype.isSurfTool = function () {
  return false
}

/**
 * Fonction renvoyant true si l'outil a besoin qu'on affiche dans la palette de droite
 * les différents types de marques de segments
 * @returns {boolean}
 */
Outil.prototype.isSegmentMarkTool = function () {
  return false
}

/**
 * Fonction renvoyant true si l'outil actif est un affichage (texte, LaTex, affichage de valeur, macro)
 * @returns {boolean}
 */
Outil.prototype.isDisplayTool = function () {
  return false
}

Outil.prototype.isGraphicTool = function () {
  return this.isPointTool() || this.isLineTool() || this.isAngleTool() ||
    this.isArrowTool() || this.isSegmentMarkTool() || this.isSurfTool() || this.isDisplayTool()
}
