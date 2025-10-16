/*
 * Created by yvesb on 23/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObj'
import Nat from '../types/Nat'
import addQueue from 'src/kernel/addQueue'

export default OutilPalette
/**
 * Outil servant à modifier le style de tracé ou la couleur d'un objet
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPalette (app) {
  Outil.call(this, app, 'Palette', 32810, false)
}

OutilPalette.prototype = new Outil()

OutilPalette.prototype.select = function () {
  const app = this.app
  // Il faut appeler les lignes suivantes avant le Outil.prototype.select.call(this)
  // car c'est l'appel de Outil.prototype.select.call(this) qui met à jour la palette de droite
  // if (!app.outilActifPrec.isSurfTool() && !(app.outilActifPrec === app.outilCopierStyle)) {
  if (!(app.outilActif === app.outilCopierStyle)) {
    app.opacity = 1
  }
  Outil.prototype.select.call(this)
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = NatObj.NTtObjSaufDuplique
  app.outilPointageActif.reset()
  this.cursor = 'default'
}

/**
 * Fonction traitant l'objet désigné
 * @param {CElementGraphique} elg l'objet dont le style est à modifiér
 * @param {Point} point Coordonnées du point cliqué (pas utilisé ici)
 * @param bForProtocol : true seulement quand cette fonction est appelée depuis la boîte de dialogue de protocole
 */
OutilPalette.prototype.traiteObjetDesigne = function (elg, point, bForProtocol = false) {
  let i
  const app = this.app
  let objetChange = (app.getCouleur() !== elg.couleur)
  const styleTrait = app.getStyleTrait()
  const stylePoint = app.getStylePoint()
  const styleFleche = app.getStyleFleche()
  const styleMarqueSegment = app.getStyleMarqueSegment()
  const styleMarqueAngle = app.getStyleMarqueAngle()
  elg.donneCouleur(app.getCouleur())
  if (elg.estDeNature(Nat.or(NatObj.NSurface, NatObj.NDemiPlan))) {
    objetChange = objetChange || (elg.styleRemplissage !== app.getStyleRemplissage())
    // Nécessaire d'utiliser donneStyleRemplissage car pour un remplissage quadrillé il faut redéfinir le pattern
    if (objetChange) elg.donneStyleRemplissage(app.getStyleRemplissage())
  } else {
    if (elg.estDeNature(NatObj.NTtPoint)) {
      objetChange = objetChange || (elg.motif !== stylePoint)
      elg.motif = stylePoint
    } else {
      if (elg.estDeNature(NatObj.NLieuDiscret)) {
        objetChange = objetChange || (elg.motif !== stylePoint)
        elg.motif = stylePoint
      } else {
        if (elg.estDeNature(NatObj.NMarqueSegment)) {
          objetChange = objetChange || (elg.motif !== styleMarqueSegment) ||
            (elg.style !== styleTrait)
          elg.motif = styleMarqueSegment
          elg.style = styleTrait
        } else {
          if (elg.estDeNature(NatObj.NGrapheSuiteRecComplexe)) {
            objetChange = objetChange || (elg.motif !== stylePoint) ||
              (elg.style !== styleTrait)
            elg.motif = stylePoint
            elg.style = styleTrait
            elg.updateObjetsInternes()
          } else {
            if (elg.estDeNature(NatObj.NVecteur)) {
              objetChange = objetChange || (elg.motifFleche !== styleFleche)
              elg.donneStyleFleche(styleFleche)
            } else {
              if (elg.estDeNature(NatObj.NMarqueAngle)) {
                objetChange = objetChange || (elg.styleMarque !== styleMarqueAngle)
                elg.donneStyleMarque(styleMarqueAngle)
                if (elg.estOriente()) {
                  objetChange = objetChange || (elg.motifFleche !== styleFleche)
                  elg.donneStyleFleche(styleFleche)
                }
              } else {
                // Version 7.0 : Si on change le style du lieu d'objet d'un point
                // on donne au point ancetre du lieu d'objets le style de point actif
                if (elg.estDeNature(NatObj.NLieuObjet) && elg.elementAssocie.estDeNature(NatObj.NTtPoint)) {
                  elg.elementAssocie.motif = stylePoint
                  elg = elg.elementAssocie
                  objetChange = true
                }
              }
            }
          }
        }
      }
    }
  }
  if (elg.estDeNature(NatObj.NObjLigne)) {
    objetChange = objetChange || (elg.style !== styleTrait)
    elg.donneStyle(styleTrait)
  }
  if (bForProtocol) return
  this.saveFig()
  if (objetChange) {
    const list = app.listePr
    list.metAJourObjetsDependantDe(elg) // Nécessaire pour les lieux d'objets
    // Il faut d'abord appeler setReady4MathJax pour tous les éléments graphiques à réafficher
    // puis appeler via la pile de Mathjax une fonction qui va remplacer tous leur gElements
    // par un nouveaupour tenir compte du changement de style
    // I faut appeler positionne pour les élments dépendnat de elg par exemple pour les marques de segment
    list.positionneDependantsDe(false, app.dimf, elg)
    for (i = 0; i < list.longueur(); i++) {
      const el = list.get(i)
      if (el.existe && el.estDeNature(NatObj.NTtObj) && !el.estElementIntermediaire() && el.depDe(elg)) {
        el.setReady4MathJax()
      }
    }
    const svg = app.svgFigure
    addQueue(function () {
      for (i = 0; i < list.longueur(); i++) {
        const el = list.get(i)
        if (el.estDeNature(NatObj.NTtObj) && !el.estElementIntermediaire() && el.depDe(elg) && el.hasgElement) {
          const g = el.createg(svg, app.doc.couleurFond)
          svg.replaceChild(g, el.g)
          g.setAttribute('id', el.id)
          el.g = g
          if (el.estDeNature(NatObj.NObjNommable) && (el.nom !== '') &&
            !el.nomMasque) el.updateName(svg, true)
          if (el.estDeNature(NatObj.NEditeurFormule)) {
            if (el.affichageFormule) {
              el.latex.isToBeUpdated = true
              el.latex.update(svg)
              el.glatex = el.latex.g
            }
          }
        }
      }
    })
  }
  // this.select();
}

// Pour l'outil palette tou doit être disponible dans la palette de droite
OutilPalette.prototype.isPointTool = function () {
  return true
}

OutilPalette.prototype.isLineTool = function () {
  return true
}

OutilPalette.prototype.isSurfTool = function () {
  return true
}

OutilPalette.prototype.isArrowTool = function () {
  return true
}

OutilPalette.prototype.isAngleTool = function () {
  return true
}

OutilPalette.prototype.isSegmentMarkTool = function () {
  return true
}
