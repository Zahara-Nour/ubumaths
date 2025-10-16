/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import Nat from '../types/Nat'
import Pointeur from '../types/Pointeur'
import { circleLensOpacity, decxLens, decyLens, distancePointPoint, distMinForMouse, distMinForTouch, preventDefault, radiusLens, ratioLens } from '../kernel/kernel'
import { mousePosition, touchPosition } from '../kernel/kernelAdd'
import OutilPointage from './OutilPointage'
import ChoixTypeDlg from '../dialogs/ChoixTypeDlg'
import ChoixObjProchesDlg from 'src/dialogs/ChoixObjProchesDlg'
export default OutilPointageCapture

/**
 * Outil de pountage utilisé par l'outil de capture d'objet mobile
 * Hérite de OutilPointage
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPointageCapture (app) {
  OutilPointage.call(this, app)
}
OutilPointageCapture.prototype = new OutilPointage()

OutilPointageCapture.prototype.reset = function () {
  OutilPointage.prototype.reset.call(this)
  this.objetPredesigne = null
  this.cadre_Ver_Capt = false // Indique si on est en train de capturer la partie verticale du cadre d'affichage
  this.cadre_Hor_Capt = false // Indique si on est en train de capturer la partie horizontale du cadre d'affichage
}

OutilPointageCapture.prototype.setLensPosition = function (x, y) {
  const app = this.app
  app.svgLens.setAttribute('display', 'block')
  if (!app.circleLens) {
    app.circleLens = cens('circle', {
      cx: '0',
      cy: '0',
      r: String(radiusLens),
      style: `fill:#fff000; fill-opacity: ${circleLensOpacity};`
    })
    // On met le cercle matérialisant la loupe dans le svg global qui est le parent du svg de la figure
    app.svgFigure.parentNode.appendChild(app.circleLens)
  }
  if (app.useLens) {
    let decy = decyLens
    if (y + ratioLens * decy - 0.5 * radiusLens < 0) decy = -decyLens
    app.svgLens.setAttribute('transform', `translate(${x},${y}) scale(${ratioLens}) translate(-${x},-${y}) translate(${decxLens},${decy})`)
    app.circleClip.setAttribute('cx', String(x))
    app.circleClip.setAttribute('cy', String(y))
    app.circleLens.setAttribute('cx', String(x + decxLens * ratioLens))
    app.circleLens.setAttribute('cy', String(y + decy * ratioLens))
  }
}

OutilPointageCapture.prototype.mousemove = function (evt) {
  this.devicemove(evt, 'mouse', mousePosition)
}

OutilPointageCapture.prototype.touchmove = function (evt) {
  this.devicemove(evt, 'touch', touchPosition)
}

OutilPointageCapture.prototype.devicemove = function (evt, type, fonc) {
  let point
  const app = this.app
  const svg = app.svgFigure
  const doc = app.doc
  const list = doc.listePr
  // Pour les devicemove on supprime les lignes suivantes car sur PC avec écran tactile et stylet
  // on peut avoir un mix des deux types d'événements
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if (doc.type && (doc.type != type)) return;
  // if ((type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  const elc = app.elementCapture
  const tab = fonc(svg, evt, app.zoomFactor)
  const x = tab.x
  const y = tab.y
  // if (x<0 || x>app.dimf.x || y<0 || y>app.dimf.y) return; // Devenu inutile depuis que les événements sont interceptés par un rectangle
  if (app.cadre && (this.cadre_Ver_Capt || this.cadre_Hor_Capt)) {
    // Les deux lignes suivantes pour la capture du cadre au touch
    preventDefault(evt)
    evt.stopPropagation()
    let w = app.widthCadre; let h = app.heightCadre
    // Pour les deux lignes suivantes, voir OptionsFigDlg
    const wmax = app.svgFigure.dimWork.x - 8
    const hmax = app.svgFigure.dimWork.y - 8
    if ((this.cadre_Ver_Capt) && (x > 20) && (x < wmax)) w = Math.round(x)
    if ((this.cadre_Hor_Capt) && (y > 20) && (y < hmax)) h = Math.round(y)
    app.setCadreDim(w, h)
  } else {
    if (elc === null) {
      if (app.translatable && app.isTranslating) {
        app.outilCapt.cursor = 'move'
        const point = fonc(svg, evt, app.zoomFactor)
        const x = point.x
        const y = point.y
        const decx = x - this.xInitSouris
        const decy = y - this.yInitSouris
        if ((decx !== 0) || (decy !== 0)) {
          const modif = list.translateDe(decx, decy)
          if (modif) {
            this.xInitSouris = x
            this.yInitSouris = y
            list.positionne(false, app.dimf)
            list.update(svg, app.doc.couleurFond, true, true) // Modifié version 6.4.8
          }
        }
      } else {
        const info = this.app.infoProx
        const nbObjetsProches = doc.listePr.procheDePourCapture(this.aDesigner,
          tab, info, app.listeExclusion, true, type)
        if ((nbObjetsProches === 0) && app.cadre) {
          const distmin = type === 'touch' ? distMinForTouch : distMinForMouse
          const cadreVerProche = Math.abs(x - app.widthCadre) <= distmin
          const cadreHorProche = Math.abs(y - app.heightCadre) <= distmin
          app.outilActif.cursor = (cadreHorProche || cadreVerProche) ? 'pointer' : 'default'
        } else app.outilActif.cursor = (nbObjetsProches > 0) ? 'pointer' : 'default'
      }
    } else {
      const dimf = doc.dimf
      const couleurFond = doc.couleurFond
      if (elc.estDeNature(NatObj.NPointMobile)) {
        if ((Math.abs(x - elc.x) >= 1) || (Math.abs(y - elc.y) >= 1)) {
          point = { x: 0, y: 0 }
          const abs = new Pointeur()
          const b = elc.testDeplacement(dimf, x, y, point, abs)
          if (b) {
            if (elc.estDeNature(NatObj.NPointCapturableNonLie)) {
              elc.placeEn(point.x, point.y)
            } else if (elc.estDeNature(NatObj.NPointLie)) {
              elc.donneAbscisse(abs.getValue())
            }
          }
          if (app.useLens) {
            this.setLensPosition(elc.x, elc.y)
          }
        }
      } else {
        if (elc.estDeNature(NatObj.NMarqueAngle)) {
          const ray = distancePointPoint(x, y, elc.centreX, elc.centreY)
          if (ray > 3) {
            elc.setRayon(ray)
            if (app.useLens) this.setLensPosition(elc.centreX, elc.centreY)
          }
        } else {
          if (elc.estDeNature(NatObj.NAffLieAPoint)) {
            const pt = elc.pointLie
            if (pt === null) {
              const dx = x - this.xInitSouris
              const dy = y - this.yInitSouris
              if ((dx !== 0) || (dy !== 0)) {
                elc.placeNom(this.xAffInitial + dx, this.yAffInitial + dy)
                // Pas de loupe quand on capture une image.
                if (app.useLens && !elc.estDeNature(NatObj.NImage)) {
                  // On centre l'affichage dans la loupe (utile surtout pour les petits affichages
                  const rectAff = elc.rectAff
                  const x1 = elc.xNom + elc.decX + rectAff.x + rectAff.width / 2
                  const y1 = elc.yNom + elc.decY + rectAff.y + rectAff.height / 2
                  this.setLensPosition(x1, y1)
                }
              }
            } else {
              const decx = this.xdecalageInitialRelatifAffichage + x - this.xInitSouris
              const decy = this.ydecalageInitialRelatifAffichage + y - this.yInitSouris
              elc.decaleNom(decx, decy)
              // Pas de loupe quand on capture une image
              if (app.useLens && !elc.estDeNature(NatObj.NImage)) {
                const rectAff = elc.rectAff
                const x1 = elc.xNom + elc.decX + rectAff.x + rectAff.width / 2
                const y1 = elc.yNom + elc.decY + rectAff.y + rectAff.height / 2
                this.setLensPosition(x1, y1)
              }
            }
          } else {
            if (elc.estDeNature(NatObj.NLieuObjet)) {
              // Si ce lieu d'objet est capturable c'est qu'il est généré par un CCommentaire ou un CLatex
              // CLieuObjetAncetre lieu = (CLieuObjetAncetre) elementCapture;
              // Si l'affichage générant le lieu d'objet n'a pas été punaisé on déplace l'affichage
              // qui a généré le lieu d'objets ce qui dépalce le lieu d'objets lui-même.
              // c'est le cas par exemple pour les graduations d'un repère
              const aff = elc.elementAssocie
              if (!aff.fixed) {
                aff.decaleNom(this.xdecalageInitialRelatifAffichage + x - this.xInitSouris,
                  this.ydecalageInitialRelatifAffichage + y - this.yInitSouris)
              }
            } else {
              elc.decaleNom(this.xdecalageInitialRelatifAffichage + x - this.xInitSouris,
                this.ydecalageInitialRelatifAffichage + y - this.yInitSouris)
            }
          }
        }
      }
      app.listeARecalculer.positionne(false, dimf)
      // Ligne suivante modifié version 6.4.8 (ajout du dernier paramètre)
      app.listeARecalculer.update(svg, couleurFond, true, true)
    }
  }
}

OutilPointageCapture.prototype.mousedown = function (evt) {
  this.devicedown(evt, 'mouse', mousePosition)
}

OutilPointageCapture.prototype.touchstart = function (evt) {
  this.devicedown(evt, 'touch', touchPosition)
}

OutilPointageCapture.prototype.devicedown = function (evt, type, fonc) {
  const app = this.app
  let mac
  const svg = app.svgFigure
  const doc = app.doc
  if (!doc.isActive) return
  const liste = doc.listePr
  const dimf = doc.dimf
  const couleurFond = doc.couleurFond
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if (doc.type && (doc.type != type)) return;
  if ((type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  if (app.elementCapture !== null) {
    app.elementCapture = null
    app.listeARecalculer.retireTout()
    return
  }
  if (liste.macroEnCours !== null) {
    mac = liste.macroEnCours.macroEnCours()
    if ((mac.className === 'CMacroPause') && (mac.dureePause === 0)) {
      mac.passageMacroSuiv(svg, dimf, couleurFond)
      return
    }
    if ((mac !== null) && (mac.className === 'CMacroApparition') && mac.executionPossible()) {
      mac.execute(svg, dimf, couleurFond, true)
      // Attention mac ne pointe plus forcément sur la macro en cours
      if (!liste.macroEnCours.macroEnCours().executionEnCours) liste.macroEnCours.passageMacroSuiv(svg, dimf, couleurFond)
      return
    }
  }
  const info = this.app.infoProx
  const point = fonc(svg, evt, app.zoomFactor)
  // if (point.x<0 || point.x>app.dimf.x || point.y<0 || point.y>app.dimf.y) return;
  this.xInitSouris = point.x
  this.yInitSouris = point.y
  const nbObjetsProches = liste.procheDePourCapture(this.aDesigner,
    point, info, app.listeExclusion, true, type)
  if (nbObjetsProches > 0) {
    if ((mac = info.infoParType[NatObj.indiceMacro].premierVoisin) !== null) {
      if (mac.executionEnCours) {
        mac.macroEnCours().termineAction(svg, dimf, couleurFond)
      }
    }
    if (!liste.documentProprietaire.modeTraceActive) liste.deleteTraces()
    if (this.objetPredesigne !== null) {
      const dist = type === 'touch' ? distMinForTouch : distMinForMouse
      if (this.objetPredesigne.distancePoint(point.x, point.y, true, dist) < dist) {
        app.elementCapture = this.objetPredesigne
        this.objetPredesigne = null
        this.callBackAfterChoice()
      }
    } else {
      if (app.elementCapture === null) {
        const self = this
        if (info.premierPointVoisin !== null) { // Priorité aux points
          if (info.nombrePointsVoisins === 1) {
            app.elementCapture = info.premierPointVoisin
            this.callBackAfterChoice()
          } else {
            preventDefault(evt)
            evt.stopPropagation()
            if (info.nombreTypesProches > 1) {
              new ChoixTypeDlg(app, info, Nat.and(info.typesProches, NatObj.NPointMobile), this,
                'objetPredesigne', point, type, function () {
                  self.callBackAfterChoice()
                })
            } else {
              // Si plusieurs objets du type choisi on lance une boîte de dialogue de choix de l'objet de ce type
              /*
              new PremierDernierDlg(app, this, 'objetPredesigne', info.premierPointVoisin,
                info.dernierPointVoisin, function () {
                  self.callBackAfterChoice()
                })
               */
              new ChoixObjProchesDlg(app, this, 'objetPredesigne', info.typesProches, point,
                app.listeExclusion, type, false, false, self.callBackAfterChoice)
            }
          }
        } else {
          if (info.nombreTypesProches > 1) {
            new ChoixTypeDlg(app, info, info.typesProches, this,
              'objetPredesigne', point, type, function () {
                self.callBackAfterChoice()
              })
          } else {
            if (nbObjetsProches === 1) {
              app.elementCapture = info.premierVoisin()
              this.callBackAfterChoice()
            } else {
              // Si plusieurs objets du type choisi on lance une boîte de dialogue de choix de l'objet de ce type
              /*
              new PremierDernierDlg(app, this, 'objetPredesigne', info.premierVoisin(),
                info.dernierVoisin(), function () {
                  self.callBackAfterChoice()
                })
               */
              new ChoixObjProchesDlg(app, this, 'objetPredesigne', info.typesProches, point,
                app.listeExclusion, type, false, false, self.callBackAfterChoice)
            }
          }
        }
      }
    }
  } else {
    if (liste.macroEnCours !== null) {
      if (liste.macroEnCours.className === 'CMacroSuiteMacros') {
        mac = liste.macroEnCours.macroEnCours()
        if (mac.arretParClic()) {
          mac.termineAction(svg, dimf, couleurFond)
          liste.macroEnCours.passageMacroSuiv(svg, dimf, couleurFond)
        }
      } else {
        // Si la macro en cours est une macro d'apparition avec clic pour objet suivant
        // on ne la désactive que si on est au dernier objet
        mac = liste.macroEnCours.macroEnCours()
        if ((mac.className === 'CMacroApparition') && mac.executionEnCours) {
          this.liste.update(svg, couleurFond)
        } else {
          if (mac.arretParClic()) mac.termineAction(svg, dimf, couleurFond)
        }
      }
    } else {
      if (app.cadre && !this.cadre_Ver_Capt && !this.cadre_Hor_Capt) {
        const distmin = type === 'touch' ? distMinForTouch : distMinForMouse
        this.cadre_Ver_Capt = Math.abs(point.x - app.widthCadre) <= distmin
        this.cadre_Hor_Capt = Math.abs(point.y - app.heightCadre) <= distmin
      }
      // Version 8.0. On donne la possibilité de translater la figure si aucun objet capturable
      // n'est proche et si le cadre de sélection n'est pas proche non plus.
      if (app.translatable && (!app.cadre || (app.cadre && !this.cadre_Ver_Capt && !this.cadre_Hor_Capt))) app.isTranslating = true
    }
  }
}

// Fonction appelée après un clic de souris lorsqu'un dialogue de choix est apparu
// ou lorsqu'un seul objet était proche de la souris
OutilPointageCapture.prototype.callBackAfterChoice = function () {
  const app = this.app
  const doc = app.doc
  const elc = app.elementCapture
  let affEffectif
  if (elc !== null) {
    if (elc.estDeNature(Nat.or(NatObj.NAffLieAPoint, NatObj.NLieuObjet))) {
      if (elc.estDeNature(NatObj.NLieuObjet)) {
        // l'affichage générant le lieu d'objets étant souvent caché, son rectAff.x
        // et son rectAff.y peuvent être nuls.
        affEffectif = elc.elementAssocie
      } else {
        affEffectif = elc
      }
      this.xdecalageInitialRelatifAffichage = affEffectif.decX
      this.ydecalageInitialRelatifAffichage = affEffectif.decY
      this.xAffInitial = affEffectif.xNom
      this.yAffInitial = affEffectif.yNom
      /// ////////////////////////////////////
      // Supprimé version 6.0. Inutile
      // this.rectAffxInitial = aff.rectAff.x;
      // this.rectAffyInitial = aff.rectAff.y;
      /// /////////////////////////////////////
    }
    app.listeARecalculer.retireTout()
    app.listeARecalculer.ajouteObjetsDependantsSauf(app.elementCapture, doc.listePr, null)
  }
}
OutilPointageCapture.prototype.deviceup = function () {
  const app = this.app
  app.doc.type = '' // Pour autoriser à nouveau tous les événements souris ou touch
  const svg = this.app.svgFigure
  const doc = this.app.doc
  this.cadre_Ver_Capt = false
  this.cadre_Hor_Capt = false
  document.body.style.cursor = 'default'
  // Par précaution, si on a pas capturé au touch on exécute quand même le test suivant
  if (app.circleLens) {
    app.svgLens.setAttribute('display', 'none')
    app.svgFigure.parentNode.removeChild(app.circleLens)
    app.circleLens = null
  }
  if (app.elementCapture !== null) {
    app.elementCapture = null
    // Ligne suivante modifié version 6.4.8 (ajout du dernier paramètre)
    app.listeARecalculer.update(svg, doc.couleurFond, true, true)
    app.listeARecalculer.retireTout()
    app.outilCapt.saveFig()
  } else {
    if (app.translatable && app.isTranslating) {
      app.outilCapt.saveFig()
    }
  }
  app.isTranslating = false
}

OutilPointageCapture.prototype.touchend = function () {
  this.deviceup()
}

OutilPointageCapture.prototype.touchcancel = function () {
  this.deviceup()
}

OutilPointageCapture.prototype.mouseup = function () {
  this.deviceup()
}
