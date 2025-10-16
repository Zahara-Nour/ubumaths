/*
 * Created by yvesb on 05/10/2016.
 */
import { cens } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getAbsolutePath, getStr, notify } from '../kernel/kernel'
import constantes from '../kernel/constantes'

export default Button

/**
 *
 * @param {MtgApp} app
 * @param {string} fileName
 * @param {string} tip
 * @param {number} w
 * @param {number} h
 * @param {boolean} [bframe=true]
 * @param {boolean} [bNoZoomFactor=false]
 * @constructor
 * @implements TippedElt
 */
function Button (app, fileName, tip, w, h, bframe = true, bNoZoomFactor = false) {
  if (arguments.length === 0) return
  this.activable = true // this.activable peut être changé dans Buttontool
  this.app = app
  this.fileName = fileName
  const zf = bNoZoomFactor ? 1 : app.zoomFactor
  this.w = w * zf
  this.h = h * zf
  this.tip = getStr(tip)
  this.bframe = bframe
  this.clicks = 0
  this.isArrow = this.fileName.indexOf('arrow') === 0
}
/**
 * Donne au bouton l'apparence activé ou non (suivant la valeur de bActivate)
 * @param {boolean} bActivate
 */
Button.prototype.activate = function (bActivate) {
  // Certains boutons de la barre horizontale peuvent avoir été créés dan avoir une implémentation
  // graphique pour être disponible dans le choix des outils
  if (this.activable) {
    this.mask.setAttribute('fill-opacity', '0')
    this.frameRect.setAttribute('fill', bActivate ? 'url(#buttonGradAct)' : constantes.buttonBackGroundColor)
    this.mask.setAttribute('stroke', bActivate ? constantes.buttonActivatedBackGroundColor : constantes.buttonBackGroundColor)
    this.isActivated = bActivate
  }
}
Button.prototype.build = function () {
  const self = this
  const w = this.w
  const h = this.h
  const g = cens('g')
  // g.setAttribute("id",this.tip);
  this.container = g
  const frameRect = cens('rect', {
    width: w,
    height: h,
    x: '0',
    y: '0',
    stroke: constantes.buttonStroke,
    fill: constantes.buttonFill,
    'fill-opacity': '1'
  })
  if (!this.bframe) {
    frameRect.style.visibility = 'hidden'
  }
  this.frameRect = frameRect
  g.appendChild(frameRect)
  const mask = cens('rect', {
    width: w,
    height: h,
    x: '0',
    y: '0',
    stroke: constantes.buttonStroke,
    fill: 'url(#buttonGrad)',
    'fill-opacity': '0' // Sera passé à un quand la souris passe dessus
  })
  this.mask = mask
  if (!this.bframe) {
    mask.style.visibility = 'hidden'
    mask.style.pointerEvents = 'all'
  }
  g.appendChild(mask)
  if (this.isArrow) {
    const points = '3,1 3,' + String(h - 1) + ' ' + String(w - 2) + ',' + String(h / 2)
    const poly = cens('polygon', {
      points,
      fill: 'url(#arrowGrad)',
      'fill-opacity': '0.5',
      style: 'stroke:#A9A9F5;stroke-width:1',
      'pointer-events': 'none'
    })
    this.poly = poly
    g.appendChild(poly)
    g.addEventListener('mouseover', function () {
      self.poly.setAttribute('fill-opacity', '1')
    })
    g.addEventListener('mouseout', function () {
      self.poly.setAttribute('fill-opacity', '0.5')
    })
  } else {
    if (this.fileName.length !== 0) { // fileName est "" pour les OneColorButton
      const gImage = cens('g', {
        transform: 'translate(1,1)',
        'pointer-events': 'none'// ,
        // opacity: "0.8"
      })
      g.appendChild(gImage)
      this.image = cens('image', {
        width: String(w - 2),
        height: String(h - 2),
        x: '0',
        y: '0'
      })
      gImage.appendChild(this.image)
      // Chargement en lazy-loading de l'image
      import(`src/images/${this.fileName}.png`)
        .then(({ default: img }) => {
          // img est un chemin relatif en /src/images, pour que ça fonctionne en cross-domain il faut l'url absolue
          const href = getAbsolutePath(img)
          self.image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href)
        })
        .catch(error => console.error(`impossible de charger src/images/${this.fileName}.png`, error))
    }
  }
  mask.addEventListener('mouseover', function () {
    if (!self.isActivated) self.mask.setAttribute('fill-opacity', '1')
  })
  mask.addEventListener('mouseout', function () { self.mask.setAttribute('fill-opacity', '0') })
  // Initialement les boutons de la barre de gauche ne sont pas visibles.
  // Ils sont rendus visibles quand on crée les expandableBar
  g.setAttribute('visibility', 'hidden') // Sera changé pour les descendants
  const clickListener = this.devicedown.bind(this)
  const overListener = this.deviceOver.bind(this)
  // faut préciser l'option passive sur du touch pour éviter les warnings de chrome
  // (passive doit être à false si on fait du preventDefault)
  const passiveOpts = { capture: false, passive: true }
  // On avait au départ un écouteur sur mousedown et sur touchstart
  // Sur IOS, le bouton ouvrir ne marchait pas
  // => 41c6ee90 du 27/02/2025 passe à un seul écouteur click (règle le pb iOS)
  // Pb sur android, un double clic ne déroule plus la barre
  // 6bd6ad51 du 28/02/2025, si android : mousedown + touchstart, sinon click
  // Pb avec stylet sur iPad qui marche pas
  // 073d2f06 du 01/10/2025 => iPad comme android
  // sur iPad ça fonctionne désormais au stylet, mais le bouton ouvrir marche plus :-/
  // pour l'action ouvrir sous iOS, il faut un événement trusted qui doit être un pointerup ou un click
  // on passe à pointerup pour tous ceux qui le gèrent, mouseup+touchend pour les autres
  // (77baf420 du 2025-10-07)

  // cf https://developer.mozilla.org/fr/docs/Web/API/Event/isTrusted
  // cette condition est nécessaire pour certaines actions, comme ouvrir le navigateur de fichiers

  // Safari semble nettement plus restrictif sur les événements trusted,
  // mais visiblement il suit à la lettre les specs :
  // Cf https://html.spec.whatwg.org/#tracking-user-activation et https://html.spec.whatwg.org/#activation-triggering-input-event
  // => mousedown|pointerdown|pointerup|touchend, ou keydown si c'est pas esc ou un raccourci du navigateur
  if ('onpointerup' in window) {
    g.addEventListener('pointerup', clickListener, passiveOpts)
  } else {
    g.addEventListener('mouseup', clickListener, passiveOpts)
    g.addEventListener('touchend', clickListener, passiveOpts)
  }
  g.addEventListener('mouseover', overListener, passiveOpts)
}

Button.prototype.devicedown = function (event) {
  // cf commentaires ci-dessus concernant les événements trusted
  if ('isTrusted' in event && !event.isTrusted) {
    notify(Error('event invalide pour ouvrir la sélection de fichier'), { onlyOnce: true })
  }
  if (this.expandableBar == null) {
    // on est sûr de ne pas avoir de double clic à gérer
    this.singleClickAction()
    return
  }

  // on doit attendre un peu, on fixe à 300ms (un peu rapide, mais sinon ça fait attendre trop longtemps l'activation du bouton)
  this.clicks++
  if (this.clicks >= 2) {
    this.doubleClickAction()
    this.clicks = 0 // Ajout version 6.1.0
  } else {
    const self = this
    setTimeout(function () {
      switch (self.clicks) {
        case 1 :
          self.singleClickAction()
          self.clicks = 0 // Ajout version 6.1.0
          break
        case 2 :
          self.doubleClickAction()
          self.clicks = 0 // Ajout version 6.1.0
      }
    }, constantes.dblClickDelay)
  }
}

Button.prototype.deviceOver = function () {
  // Si le bouton n'a pas de cadre(ToolBarArrow) pas de tip
  if (!this.bframe || self.tipDisplayed || self.tip === '') return
  const app = this.app
  // var doc = app.doc;
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if (doc.type && (doc.type != type)) return;
  // doc.type = type;
  if (!this.tipDisplayed && this.tip !== '') {
    app.cacheTip() // Sans argument pour effacer l'ancien tip quel qu'il soit
    app.setTip(this)
    const self = this
    setTimeout(function () {
      self.app.cacheTip(self)
    }, 2000)
  }
}
/**
 * Appelé lors d'un simple clic sur la fonction
 * A redéfinir pour les descendants
 */
Button.prototype.singleClickAction = function () {
}
/**
 * Appelé au double clic si y'a une propriété expandableBar
 * A redéfinir pour les descendants si double click implémenté
 */
Button.prototype.doubleClickAction = function () {
  this.singleClickAction()
}
