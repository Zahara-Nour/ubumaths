/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce, cens, ge, setAttrs, setStyle } from './kernel/dom'
import NatObj from './types/NatObj'
import NatCal from './types/NatCal'
import Color from './types/Color'
import Dimf from './types/Dimf'
import InfoProx from './types/InfoProx'
import Nat from './types/Nat'
import Pointeur from './types/Pointeur'
import { addZoomListener, base64Decode, base64Encode, circleLensOpacity, decxLens, decyLens, getMousePositionToParent, getTouchPositionToParent, preventDefault, radiusLens, ratioLens, svgLensOpacity } from './kernel/kernel'
import CListeObjets from './objets/CListeObjets'
import CMathGraphDoc from './objets/CMathGraphDoc'
import DataInputStream from './entreesSorties/DataInputStream'
import CalcC from './kernel/CalcC'
import StyleTrait from './types/StyleTrait'
import { addQueue, abort } from 'src/kernel/addQueue'
import addLatex from 'src/kernel/addLatex'

import '../css/mtg32Player.css'

export default MtgAppLecteur

/**
 * Classe permettant de gérer l'affichage de figures MathGraph32 en JavaScript
 * @constructor
 * @param {boolean} [zoomOnWheel=false] Si true les événements wheel provoquent zoom ou dézoom sur la figure
 * @param {boolean} [decimalDot=true] true si le séparateur décimal est le point
 * @param {boolean} [translatable=false] true si on veut pouvoir faire glisser la figure. false par défaut.
 * @param {boolean} [useLens=false] true si on utilise la loupe sur écran tactile quand un point est capturé
 * @returns {MtgAppLecteur}
 */
function MtgAppLecteur (zoomOnWheel = false, decimalDot = true, translatable = false, useLens = false) {
  this.zoomOnWheel = zoomOnWheel
  this.decimalDot = decimalDot
  this.translatable = translatable
  this.useLens = useLens
  /** @type {CMathGraphDoc[]} */
  this.docs = [] // Doit être ici et pas dans suiteConst
  const t = this
  // On mémorise les gestionaires de souris et de touch pour pouvoir éventuellement les détruire
  this.onmdown = t.deviceDown.bind(t, 'mouse')
  this.onmmove = t.deviceMove.bind(t, 'mouse')
  this.onmup = t.onmouseup.bind(t)
  this.ontstart = t.deviceDown.bind(t, 'touch')
  this.ontmove = t.deviceMove.bind(t, 'touch')
  this.ontend = t.ontouchend.bind(t)
  this.ontcancel = t.ontouchcancel.bind(t)

  // on avait un listener pour un CustomEvent mathjaxLoadingFailure dans le commit a5e743ef du 2025-06-11
  // CustomEvent lancé en cas d'échec du addLatex dans CAffLiePt,
  // mais y'en a finalement pas besoin
}

/**
 * Annule la pile des actions en cours (affichages et chargements)
 */
MtgAppLecteur.prototype.abort = function () {
  abort()
}

/**
 * Fonction positionnant le svg servant à obtenir une loupe aux coordonnées (x, y) dans les svg d'id idDoc
 * @param {string} id l'id du document
 * @param {number} x l'abscisse du centre de la loupe
 * @param {number} y L'ordonnée du centre de la loupe
 */
MtgAppLecteur.prototype.setLensPosition = function (id, x, y) {
  if (this.useLens) {
    const svgLens = document.getElementById(id + 'Lens')
    let decy = decyLens
    if (y + ratioLens * decy - 0.5 * radiusLens < 0) decy = -decyLens
    svgLens.setAttribute('transform', `translate(${x},${y}) scale(${ratioLens}) translate(-${x},-${y}) translate(${decxLens},${decy})`)
    const circleClip = this['circleClip' + id]
    circleClip.setAttribute('cx', String(x))
    circleClip.setAttribute('cy', String(y))
    const circleLens = this['circleLens' + id]
    circleLens.setAttribute('cx', String(x + decxLens))
    circleLens.setAttribute('cy', String(y + decy * ratioLens))
  }
}

/**
 * Ajoute le document par son id représenté par une chaîne chdoc en dataBase64
 * @param {string} idDoc  L'id du document qui sera celle du svg contenant la figure.
 * @param {string} chdoc  Chaine base64 décrivant la figure (obtenue via MathGraph32 par
 * le menu Edition - Copier le code de la figure (pour html)
 * @param {boolean} [displayOnLoad=true]  true si la figure doit être affichée dès le démarrage de la page.
 * @param {boolean} [isActive=true]  true si la figure répond dès le démarrage aux actions souris et clavier.
 * @returns {void}
 */
MtgAppLecteur.prototype.addDoc = function addDoc (idDoc, chdoc, displayOnLoad = true, isActive = true) {
  // on commence par regarder si y'a déjà un doc avec cet id et le virer si c'est le cas
  if (this.getDoc(idDoc)) this.removeDoc(idDoc)

  // on en profite pour nettoyer notre liste de docs,
  // au cas où les svg auraient été virés du dom depuis le dernier appel
  for (const doc of this.docs) {
    const svg = ge(doc.id, true)
    if (!svg) this.removeDoc(doc.id)
  }
  // @todo mettre un MutationObserver sur le svg lors de sa création pour appeler removeDoc dès que le svg est viré du dom

  const svg = ge(idDoc)
  // avant on sortait silencieusement, maintenant on râle, mais on devrait carrément planter ici… (throw Error plutôt que console)
  if (svg === null) return
  // On mémorise le div qui contient le svg global qui lui-même contiendra le svg de la figure
  svg.containerDiv = svg.parentElement
  // Le figContainer est le contenant du svg de la figure qui peut avoir des barres de défilement.
  // Pour la version lecteur c'est le div qui contient la figure.
  // Pour la version appli c'est le foreign Object qui contient les svg de la figure
  svg.figContainer = svg.parentElement
  if (svg.localName !== 'svg') return console.error(Error(`L’élément d’id ${idDoc} n'est pas un svg`))
  svg.setAttribute('shape-rendering', 'geometricPrecision')
  // Depuis le 18/3/2025 on impose la fonte 'Roboto' sur tous les conteneurs de svg mtg32
  svg.parentElement.style.fontFamily = 'Roboto'

  // Modification version 6.3.2 pour rendre le player compatible avec les figures avec hachures.
  let defs = document.getElementById('mtg32_patterns')
  if (defs === null) {
    defs = cens('defs', {
      id: 'mtg32_patterns'
    })
    svg.appendChild(defs)
  }
  // Fin modif 6.3.2
  // On rend tous les éléments du div parent non sélectionnables
  /**
   * parent du SVG (à priori un div, mais ça pourrait éventuellement être un autre svg qui n'a rien à voir avec mtg)
   * @type {HTMLElement|SVGElement}
   */
  const par = svg.parentElement
  if (par.style.position === '') par.style.position = 'relative'
  par.classList.add('text2jax_ignore') // Ajout version 5.0.3
  par.style.pointerEvents = 'all'
  svg.setAttribute('pointer-events', 'all')
  // Version 8.4 : Pour pouvoir utiliser une loupe sur écran tactile quand on déplace un objet
  // il faut que le svg de la figure soit inclus dans un svg global qui contiendra le svg de la figure
  // suivi d'une réplique (use) servant à afficher le contenu de la loupe
  // On crée un svg identique à celui-déjà créé
  const svgGlob = svg.cloneNode(true)
  par.replaceChild(svgGlob, svg)
  svgGlob.appendChild(svg)
  svgGlob.setAttribute('id', 'Glob' + idDoc)
  if (this.useLens) {
    const circleClip = cens('circle', {
      cx: '0',
      cy: '0',
      r: String(radiusLens / ratioLens)
    })
    // On va devoir modifier de façon dynamique circleCip et on ne peut pas y accéder par un id
    // donc en le stocke comme objet du mtgAppLecteur
    this['circleClip' + idDoc] = circleClip
    const clip = cens('clipPath', {
      id: idDoc + 'clipLoupe'
    })
    clip.appendChild(circleClip)
    svgGlob.appendChild(clip)
    const svgLens = cens('use', {
      href: '#' + idDoc,
      id: idDoc + 'Lens'
    })
    svgLens.style.clipPath = 'url(#' + idDoc + 'clipLoupe)'
    svgLens.style.opacity = svgLensOpacity
    svgLens.setAttribute('display', 'none')
    svgGlob.appendChild(svgLens)
  }

  const doc = new CMathGraphDoc(idDoc, displayOnLoad, isActive, this.decimalDot)
  this.docs.push(doc)
  const ba = base64Decode(chdoc)
  const inps = new DataInputStream(ba, chdoc)
  doc.read(inps)
  const winit = parseInt(svg.getAttribute('width'))
  const hinit = parseInt(svg.getAttribute('height'))
  doc.dimf = new Dimf(winit, hinit)
  // On a besoin de connaitre les dimensions de la zone de travail quand on affiche les
  // panneaux éventuels associés à des variables
  // On les mémorise dans le svg de la figure pour être compatible avec le mtgAppLecteur qui peut gérer plusieurs figures
  svg.dimWork = doc.dimf
  // Version 9 : il faut si nécessaire adapter la taille des svg au document si celui-ci réclame des dimensions
  // minimales autres que 0 et dans ce cas adapter le div conteneur en lui permettant de rajouter des ascenseurs
  const widthMin = doc.dimMinFig.x
  const heightMin = doc.dimMinFig.y
  if (widthMin > winit || heightMin > hinit) {
    svg.containerDiv.style.overflow = 'auto'
    const w = Math.max(winit, widthMin)
    const h = Math.max(hinit, heightMin)
    const sizeStyle = { width: `${w}px`, height: `${h}px` }
    const sizeAttrs = { width: String(w), height: String(h) }
    setAttrs(svg, sizeAttrs)
    setAttrs(svgGlob, sizeAttrs)
    setStyle(svg, sizeStyle)
    setStyle(svgGlob, sizeStyle)
    doc.dimf = new Dimf(w, h)
  }
  // C'est là qu'on regarde si la figure utilise le CLatex et on met sur la pile d'appel
  // la fonction qui va charger les fonctions utilisant MathJax si nécessaire
  if (doc.listePr.useLatex) {
    // On a du LaTeX, faut charger MathJax et ajouter les méthodes CLatex à CaffLiePt
    addQueue(addLatex, { doNotCatch: true, stopOnError: true })
      .catch((error) => {
        console.error(error)
        // ça va virer le svg mis dedans
        par.innerHTML = `<p class="error">${error.message}</p>`
      })
    // pour tester le addLatex de CAffLiePt (un fallback en cas d'oubli de useLatex),
    // commenter l'appel précédent et le remplacer par le suivant
    // addQueue(addLatex)
  }
  this.prepareTracesEtImageFond(svg, doc)
  const liste = new CListeObjets()
  liste.ajoutePointsPunaises(doc.listePr)
  doc.listeARecalculer = new CListeObjets()
  // Spécial JavaScript. Chaque document aura un membre pointCapture
  doc.listeExclusion = liste
  // On crée un div destiné à contenir le svg servant à des affichages auxiliaires, unique entre les différentes figures (et entre player/éditeur)
  // (destiné à afficher provisoirement les affichages de texte pour récupérer leur taille)
  let svgAux = document.getElementById('mtgSvgAux')
  if (svgAux === null) {
    // on crée un div en fin de body pour y mettre le svgAux, en absolute et hidden, avec z-index -1 pour ne rien modifier visuellement
    // (taille fixe petite et overflow hidden pour ne jamais provoquer de scroll)
    // ATTENTION, ce code est aussi dans MtgAppBase
    const divSvgAux = ce('div', {
      style: 'font-family:Roboto; position:absolute; left:0; top:0; pointer-events:none; z-index:-1; visibility:hidden; overflow:hidden; width:100px; height:100px;'
    })
    // on passe par la propriété fontFamily plutôt que la string précédente pour des questions de quoting (ici pas de question à se poser)
    // divSvgAux.style.fontFamily = getComputedStyle(document.body).fontFamily
    document.body.appendChild(divSvgAux)

    svgAux = cens('svg', {
      id: 'mtgSvgAux',
      position: 'absolute',
      top: 0,
      left: 0,
      width: winit,
      height: hinit,
      visibility: 'hidden'
    })
    divSvgAux.appendChild(svgAux)
  } else {
    const w = parseInt(svgAux.getAttribute('width'))
    const h = parseInt(svgAux.getAttribute('height'))
    if (w < winit || h < hinit) {
      svgAux.setAttribute('width', Math.max(w, winit))
      svgAux.setAttribute('height', Math.max(h, hinit))
    }
  }
  // Version 8.4.0 : c'est le svgGlob qui va écouter les événements globaux sur la figure
  // car un svg vide ne déclenche pas d'événement quand on clique ou boue la souris dessus.
  // Le svgGlob n'est pas vide puisqu'il contient le svg de la figure.
  // Pour cette raison il n'y a plus besoin de rectangle svgRect dans la version 8.4.0
  const activeListenerOpts = { capture: false, passive: false }
  svgGlob.addEventListener('mousedown', this.onmdown, false)
  svgGlob.addEventListener('mousemove', this.onmmove, false)
  svgGlob.addEventListener('mouseup', this.onmup, false)
  svgGlob.addEventListener('touchstart', this.ontstart, activeListenerOpts)
  // lui semble passif dans notre code, mais l'api pourrait ajouter un listener actif sur un doc (à priori sans intérêt, on devrait pouvoir préciser passif ici)
  // au 2024-10-02 on le marque actif mais on pourrait le mettre passif (ça rendrait inopérant un preventDefault fait dans un listener ajouté par addSvgListener de l'api)
  svgGlob.addEventListener('touchmove', this.ontmove, activeListenerOpts)
  svgGlob.addEventListener('touchend', this.ontend, false)
  svgGlob.addEventListener('touchcancel', this.ontcancel, false)
  if (this.zoomOnWheel) addZoomListener(doc, svg, svgGlob)
}
/**
 *
 * @param {SVGElement} svg
 * @param {CMathGraphDoc} doc
 */
MtgAppLecteur.prototype.prepareTracesEtImageFond = function prepareTracesEtImageFond (svg, doc) {
  const rect = cens('rect', {
    width: '100%',
    height: '100%',
    fill: doc.couleurFond.rgb()
  })
  // Ligne suivante importante : Ce rectangle ne doit pas réagir aux événements souris
  // Car sinon il y a problème lors de l'appel de display
  rect.style.pointerEvents = 'none'
  svg.appendChild(rect)

  doc.gTraces = cens('g', {
    id: doc.idDoc + 'Traces'
  })
  svg.appendChild(doc.gTraces)
  if (doc.imageFond !== null) {
    const g = cens('image', {
      x: '0',
      y: '0',
      width: doc.widthImageFond,
      height: doc.heightImageFond,
      'pointer-events': 'none' // Ajout version 6.3.4
    })
    g.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'data:image/png;base64,' + base64Encode(doc.imageFond, true))
    svg.insertBefore(g, doc.gTraces)
  }
}

/**
 * Fonction retirant le document d'id idDoc, retirant les gestionnaires d'événements qui lui sont associés
 * et effaçant touts les éléments graphiques du svg associé
 * @param {string} idDoc  L'id du document à retirer.
 * @returns {void}
 */
MtgAppLecteur.prototype.removeDoc = function removeDoc (idDoc) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) {
    const list = doc.listePr
    const svg = document.getElementById(idDoc)
    if ((svg !== null) && (svg.localName === 'svg')) {
      const svgGlob = svg.parentElement
      if (svgGlob) {
        // Modification version 6.3.5 : On met d'abord la variable hasgElement de tous les objets graphiques à false car
        // une fonction de callback peut encore être appelée demandant un update des éléments graphiques
        for (const el of list.col) {
          if (el.estDeNature(NatObj.NTtObj)) {
            el.hasgElement = false
          }
        }
        while (svg.childNodes.length !== 0) svg.removeChild(svg.childNodes[0])
        svgGlob.removeEventListener('mousedown', this.onmdown, false)
        svgGlob.removeEventListener('mousemove', this.onmmove, false)
        svgGlob.removeEventListener('mouseup', this.onmup, false)
        svgGlob.removeEventListener('touchstart', this.ontstart, false)
        svgGlob.removeEventListener('touchmove', this.ontmove, false)
        svgGlob.removeEventListener('touchend', this.ontend, false)
        svgGlob.removeEventListener('touchcancel', this.ontcancel, false)
      }
    }
    list.retireTout()
    this.docs = this.docs.filter(doc => doc.idDoc !== idDoc)
    // Si le svg a disparu on ne fai pas la suite
    if (!svg) return
    const svgGlob = svg.parentElement
    // Le svg contenant la figure a été déplacé dans le svgGlob. Il faut le retirer de ce svg global,
    // retirer le svg global de son div parent et remettre le svg de la figure à la place
    // de ce svg global dans son parent
    // Si le parent n'est pas un svg c'est que le svg a été recréé et il ne faut pas exécuter les lignes ci-dessous
    if (svgGlob?.localName !== 'svg') return
    const divParent = svgGlob.parentElement
    svgGlob.removeChild(svg)
    divParent.replaceChild(svg, svgGlob)
    this['circleClip' + idDoc] = null
    this['circleLens' + idDoc] = null
  }
}

/**
 * Appellera cb quand tous les rendus seront terminés
 * @param {function} [cb] Si non fourni, ça retourne une promesse qui sera résolue quand l'appli est prête (tous les rendus lancés terminés)
 * @returns {Promise<void>|undefined}
 */
MtgAppLecteur.prototype.ready = function ready (cb) {
  if (!cb) return new Promise(resolve => addQueue(resolve))
  addQueue(cb)
}

/**
 * Fonction retirant tous les documents et effaçant le contenu de tous les svg contenant des figures.
 * @returns {void}
 */
MtgAppLecteur.prototype.removeAllDoc = function removeAllDoc () {
  // this.docs.forEach(doc => this.removeDoc(doc.idDoc))
  // Corrigé par Yves. Le ForEach ici ne marche pas car la fonction removeDoc retire l'élement du tableau.
  // Si, par exemple, on a deux documents dans la liste il en reste un au retour...
  while (this.docs.length > 0) this.removeDoc(this.docs[0].idDoc)
}

// Modifié version 6.4.5, puis 7.3.3 (promesses)
/**
 * Recalcule toutes les figures et les affiche
 * @param {boolean} [brandom=false]  Passer true pour relancer les calculs aléatoires avec rand()
 * @returns {Promise<boolean>} Résoud toujours avec true (les erreurs éventuelles sont en console)
 */
MtgAppLecteur.prototype.calculateAndDisplayAll = async function (brandom) {
  const promises = []
  for (const { idDoc } of this.docs) {
    this.calculateFirstTime(idDoc, brandom)
    promises.push(this.display(idDoc))
  }
  return Promise.all(promises).then(() => true)
}

/**
 * Fonction de callback appelée lorsque MathJax a traité toues les formules
 * en LaTeX et que la figure est prête pour affichage.
 * @param {SVGElement} svg  Le svg contenant la figure.
 * @param {CMathGraphDoc} doc  le document à afficher.
 * @returns {void}
 */
MtgAppLecteur.prototype.afficheTout = function afficheTout (svg, doc) {
  const liste = doc.listePr
  liste.afficheTout(0, svg, true)
}
/**
 * Fonction demandant la validation de tous les éditeurs de formule de la figure associée
 * au document d'id idDoc.
 * Si la formule qu'ils contiennent est incorrecte ils se trouvent encadrés de rouge.
 * Renvoie true uniquement si aucun éditeur de formule ne contient de faute de syntaxe.
 * @param {string} idDoc
 * @returns {boolean}
 */
MtgAppLecteur.prototype.fieldsValidation = function fieldsValidation (idDoc) {
  return this.getDoc(idDoc).listePr.fieldsValidation()
}
/**
 * Fonction renvoyant true si le premier champ d'édition de la figure associée au document d'id idDoc
 * associé au calcul nomCalcul est non vide.
 * @param {string} idDoc  l'id du document contenant la figure interrogée.
 * @param {string} nomCalcul  Le nom du calcul auquel est associé l'éditeur.
 * @returns {boolean}
 */
MtgAppLecteur.prototype.fieldValidation = function fieldValidation (idDoc, nomCalcul) {
  return this.getDoc(idDoc).listePr.fieldValidation(nomCalcul)
}
/**
 * Fonction renvoyant le contenu du premier éditeur de formule asssocié au calcul nomCalcul
 * dans le dcument d'id idDoc.
 * @param {string} idDoc
 * @param {string} nomCalcul
 * @returns {string}
 */
MtgAppLecteur.prototype.getFieldValue = function getFieldValue (idDoc, nomCalcul) {
  return this.getDoc(idDoc).listePr.getFieldValue(nomCalcul)
}
/**
 * Fonction activant le premier éditeur de formule contenant une
 * formule qui n'est pas correcte sur le plan syntaxique dans le document d'id idDoc.
 * @param {string} idDoc
 * @returns {void}
 */
MtgAppLecteur.prototype.activateFirstInvalidField = function activateFirstInvalidField (idDoc) {
  this.getDoc(idDoc).listePr.activateFirstInvalidField()
}
/**
 * Fonction activant le premier éditeur de formule vide ou contenant une
 * formule qui n'est pas correcte sur le plan syntaxique dans le document d'id idDoc
 * @param {string} idDoc
 * @returns {void}
 */
MtgAppLecteur.prototype.activateFirstInvalidOrEmptyField = function activateFirstInvalidOrEmptyField (idDoc) {
  this.getDoc(idDoc).listePr.activateFirstInvalidOrEmptyField()
}
/**
 * Fonction donnant le focus au premier éditeur de formule qui ne contient rien
 * dans le document d'id idDoc
 * @param {string} idDoc
 * @returns {void}
 */
MtgAppLecteur.prototype.activateFirstEmptyField = function activateFirstEmptyField (idDoc) {
  this.getDoc(idDoc).listePr.activateFirstEmptyField()
}
/**
 * Fonction donnant le focus au premierr éditeur de formule asscoié au calcul
 * ou à la fonction nommé nomCalcul dans le document d'id idDoc.
 * @param {string} idDoc
 * @param {string} nomCalcul
 * @returns {void}
 */
MtgAppLecteur.prototype.activateField = function activateField (idDoc, nomCalcul) {
  this.getDoc(idDoc).listePr.activateField(nomCalcul)
}

/**
 * Fonction servant à rendre visible ou masquer l'élément graphique du document d'id idDoc et dont le n° d'identification html est
 * ind
 * @param {string} idDoc
 * @param {string|number} ind N° d'identification html de l'élément (entier) ou chaîne de caractères
 * commençant par # et suivie du tag de l'élément
 * @param {boolean} [bVisible=false] true pour rendre l'élément visible, false pour le masquer
 * @param {boolean} [bImmediat=true] Si true, réaffichage ou masquage immédiat de l'objet
 * @returns {boolean} true si tout s'est bien passé, false sinon
 */
MtgAppLecteur.prototype.setVisible = function setVisible (idDoc, ind, bVisible, bImmediat = true) {
  const doc = this.getDoc(idDoc)
  if (doc === null) return false
  const liste = doc.listePr
  const el = liste.getById(ind)
  if (el === null || !el.existe || !el.estDeNature(NatObj.NTtObj)) return false
  el.masque = !bVisible
  if (bImmediat) {
    // Attention : depuis la version 6.7.4, les affichages se font dans des blocs de queue séparés
    // il faut donc englober l'appel de  addQueue dans un autre appel
    addQueue(function () {
      addQueue(function () {
        const svg = document.getElementById(idDoc)
        if (svg) liste.callBack(el, svg, doc.couleurFond, true)
      })
    })
  }
  return true
}

/**
 * Fonction donnant à l'élément d'indice html ind dans le document d'id idDoc le texte txt.
 * Cet élément peut être soit un CLatex soit un CCommentaire
 * @param {string} idDoc
 * @param {string|number} ind N° d'identification html de l'élément (entier) ou chaîne de caractères
 * commençant par # et suivie du tag de l'élément
 * @param {string} txt
 * @param {boolean} [bImmediat=true] Passer false pour ne pas réafficher idDoc
 * @returns {boolean} true si tout s'est bien passé, false sinon
 */
MtgAppLecteur.prototype.setText = function setText (idDoc, ind, txt, bImmediat = true) {
  const doc = this.getDoc(idDoc)
  if (doc === null) {
    console.error(Error('Aucun document d’identifiant ' + idDoc))
    return false
  }
  if (typeof txt === 'number') txt = String(txt)
  if (typeof txt !== 'string') {
    console.error(Error('Appel de setText avec un 3ème argument non string'))
    return false
  }
  const list = doc.listePr
  const el = list.getById(ind)
  if (el === null || !el.estDeNature(Nat.or(NatObj.NCommentaire, NatObj.NLatex))) return false
  if (/^\$.*\$$/.test(txt) && !list.useLatex) {
    addQueue(addLatex, { doNotCatch: true, stopOnError: true })
      .catch((error) => {
        console.error(error)
        const svg = ge(idDoc, true)
        const parent = svg?.parentElement
        if (parent) {
          // ça va virer le svg mis dedans
          parent.innerHTML = `<p class="error">${error.message}</p>`
        }
      })
    list.useLatex = true
  }
  if (bImmediat) {
    // Attention : depuis la version 6.7.4, les affichages se font dans des blocs de queue séparés
    // il faut donc englober l'appel de  addQueue dans un autre appel
    // faut passer par addQueue pour passer après l'éventuel addLatex précédent (txt doit être affecté après ce chargement)
    addQueue(() => {
      el.chaineCommentaire = txt
      el.positionne(false)
      // setReady4MathJax doit être dans ce addQueue pour passer après l'éventuel addLatex précédent
      // (sinon ça throw en sync dans CAffLiePt en cas de latex)
      el.setReady4MathJax()
      // et ce setReady4MathJax a pu mettre des trucs sur la pile (par exemple CLatex fait tu typeset), faut passer après
      addQueue(function () {
        // important de faire le test dans le addQueue, el.g a pu changer depuis
        if (el.g) {
          const svg = document.getElementById(idDoc)
          if (svg) el.replaceg(svg, doc.couleurFond)
        }
      })
    })
  } else {
    el.chaineCommentaire = txt
  }
  return true
}

/**
 * Fonction zoomant tous les éléments de la figure d'id idDoc par rapport au point de coordonnées (x; y) avec le rapport de zoom ratio
 * @param {string} idDoc L'id de la figure
 * @param {number} x abscisse du centre du zoom
 * @param {number} y ordonnée du centre du zomm
 * @param {number} ratio rapport du zoom
 * @param {boolean} [bImmediat=true] Passer false pour ne pas lancer le réaffichage de l'objet dont on a changé la couleur (attention, c'est async, utiliser app.ready() pour savoir quand c'est fini)
 * @returns {boolean} true si tout s'est bien passé, false sinon
 */
MtgAppLecteur.prototype.zoom = function zoom (idDoc, x, y, ratio, bImmediat = true) {
  const doc = this.getDoc(idDoc)
  if (doc === null || ratio <= 0) return false
  const list = doc.listePr
  list.zoom(x, y, ratio)
  if (bImmediat) {
    // Attention : depuis la version 6.7.4, les affichages se font dans des blocs de queue séparés
    // il faut donc englober l'appel de  addQueue dans un autre appel
    addQueue(() => {
      const svg = document.getElementById(idDoc)
      if (svg) {
        const dimf = new Dimf(svg)
        list.positionne(false, dimf)
        list.update(svg, doc.couleurFond, true, true)
      }
    })
  }
  return true
}

/**
 * Fonction translatant tous les objets de la figure d'id idDoc d'un vecteur (decx, decy)
 * @param {string} idDoc L'id de la figure
 * @param {number} decx Première coordonnnée du vecteur de la translation
 * @param {number} decy Deuxième coordonnnée du vecteur de la translation
 * @param {boolean} [bImmediat=true] Passer false pour ne pas lancer le réaffichage de l'objet dont on a changé la couleur (attention, c'est async, utiliser app.ready() pour savoir quand c'est fini)
 * @returns {boolean} : true si tout s'est bien passé, false sinon
 */
MtgAppLecteur.prototype.translate = function translate (idDoc, decx, decy, bImmediat = true) {
  const doc = this.getDoc(idDoc)
  if (doc === null) return false
  const list = doc.listePr
  const modif = list.translateDe(decx, decy)
  if (bImmediat && modif) {
    // Attention : depuis la version 6.7.4, les affichages se font dans des blocs de queue séparés
    // il faut donc englober l'appel de  addQueue dans un autre appel
    addQueue(() => {
      const svg = document.getElementById(idDoc)
      if (svg) {
        const dimf = new Dimf(svg)
        list.positionne(false, dimf)
        list.update(svg, doc.couleurFond, true, true)
      }
    })
  }
  return true
}

/**
 * Remet à jour la figure du document idDoc après avoir modifié certains de ses objets
 * directement (par exemple en utilisant translatePoint()
 * @param {string} idDoc L'id du document à réafficher
 * @returns {boolean} : true si tout s'est bien passé, false sinon
 */
MtgAppLecteur.prototype.updateFigure = function updateFigure (idDoc) {
  const doc = this.getDoc(idDoc)
  if (doc === null) return console.error(Error(`Aucun document d’id ${idDoc}`))
  // Attention : Depuis  la version 6.7.4, display est appelé dans un bloc de queue séparé
  // et pour que updateFigure ne soit pas appelé avant un display il faut que lui aussi soit dans un bloc de queue
  addQueue(() => {
    addQueue(() => {
      if (!doc.isDisplayed) {
        throw Error('Il faut appeler display avant update')
      }
      const list = doc.listePr
      const svg = document.getElementById(idDoc)
      if (svg) {
        const dimf = new Dimf(svg)
        list.positionne(false, dimf)
        list.update(svg, doc.couleurFond, true, true)
      }
    })
  })
  return true
}

/**
 * Fonction déplaçant un point libre aux coordonnées (x;y) dans le svg du document d'id idDoc
 * @param {string} idDoc
 * @param {string|number} name Le nom du point ou # suivi du tag du point ou son indice html (entier)
 * @param {number} x Nouvelle abscisse à donner au point
 * @param {number} y Nouvelle ordonnée à donner au point
 * @param {boolean} [bImmediat] Si true la figure est réaffichée (et cette fct retourne une promesse)
 * @returns {boolean|Promise<undefined>} false en cas de pb, une promesse si bImmediat vaut true
 */
MtgAppLecteur.prototype.setPointPosition = function setPointPosition (idDoc, name, x, y, bImmediat = true) {
  // cette méthode est exposée et parfois appelée avec n'importe quoi, faut râler pour le dire et ne rien faire (pour éviter de planter)
  if (typeof idDoc !== 'string') {
    console.error(Error('idDoc doit être une string'))
    return false
  }
  if (typeof name !== 'string' && typeof name !== 'number') {
    console.error(Error('name doit être une string'))
    return false
  }
  if (typeof x !== 'number') {
    console.error(Error('x doit être un nombre'))
    return false
  }
  if (typeof y !== 'number') {
    console.error(Error('y doit être un nombre'))
    return false
  }
  const doc = this.getDoc(idDoc)
  // on laisse ce retour synchrone comme avant, il peut y avoir du code existant qui le teste
  if (doc === null) return false
  // Version 7.3.5 on ajoute ça dans un addQueue pour passer après un addLatex éventuel (updateDependants appelle du setReady qui planterait si Latex n'était pas encore là)
  const list = doc.listePr
  let pt
  if (typeof name === 'number') {
    pt = list.getById(name)
  } else {
    // c'est une string
    if (name.charAt(0) === '#') {
      pt = list.getByTag(name.substring(1))
    } else {
      pt = list.getPointByName(name)
    }
  }
  if (pt === null || !pt.estDeNature(NatObj.NPointBase)) return false
  pt.x = x
  pt.y = y
  if (bImmediat) {
    const svg = document.getElementById(idDoc)
    if (svg) {
      const dimf = new Dimf(svg)
      list.positionneDependantsDe(false, dimf, pt)
      return addQueue(() => {
        list.updateDependants(pt, svg, doc.couleurFond, true)
      })
    } else return false
  }
  return true
}

/**
 * Fonction translatant un point libre du vecteur de coordonnées (deltax; deltay) dans le svg du document d'id idDoc
 * @param {string} idDoc
 * @param {string|number} name Le nom du point ou # suivi du tag du point ou son indice html (entier)
 * @param {number} deltax Valeur à ajouter à l'abscisse du point
 * @param {number} deltay Valeur à ajouter à l'ordonnée du point
 * @param {boolean} [bImmediat] Si true la figure est tout de suite réaffichée
 * @returns {boolean} : true si tout s'est bien passé, false sinon
 */
MtgAppLecteur.prototype.translatePoint = function translatePoint (idDoc, name, deltax, deltay, bImmediat = true) {
  const doc = this.getDoc(idDoc)
  if (doc === null) return false
  const list = doc.listePr
  let pt
  if (typeof name !== 'string') {
    pt = list.getById(parseInt(name))
  } else {
    if (name.charAt(0) === '#') {
      pt = list.getByTag(name.substring(1))
    } else {
      pt = list.getPointByName(name)
    }
  }
  if (pt === null || !pt.estDeNature(NatObj.NPointBase)) return false
  pt.x += deltax
  pt.y += deltay
  if (bImmediat) {
    const svg = document.getElementById(idDoc)
    if (svg) {
      const dimf = new Dimf(svg)
      list.positionne(false, dimf)
      list.update(svg, doc.couleurFond, true, true)
    } else return false
  }
  return true
}

/**
 * Fonction renvoyant les coordonnées actuelles du point nommé name relativement au SVG
 * du document d'id idDoc
 * @param {string} idDoc L'id du document
 * @param {string|number} name Le nom du point ou # suivi du tag du point ou son indice html (entier)
 * @returns {null|Point}
 */
MtgAppLecteur.prototype.getPointPosition = function getPointPosition (idDoc, name) {
  const doc = this.getDoc(idDoc)
  if (doc === null) return null
  const list = doc.listePr
  let pt
  if (typeof name !== 'string') {
    pt = list.getById(parseInt(name))
  } else {
    if (name.charAt(0) === '#') {
      pt = list.getByTag(name.substring(1))
    } else {
      pt = list.getPointByName(name)
    }
  }
  if (pt === null || !pt.estDeNature(NatObj.NTtPoint)) return null
  return { x: pt.x, y: pt.y }
}

// Fonction ajoutée version 6.5.2 pour utilisation externe
/**
 * Fonction donnant à l'élément d'id ind dans le document d'id idDoc le style de trait
 * style et l'épaisseur thickness
 * @param {string} idDoc
 * @param {string|number} ind N° d'identification html de l'élément (entier) ou chaîne de caractères
 * commençant par # et suivie du tag de l'élément
 * @param {string|number|null} style entier de 0 à 5. O pour trait continu, 1 pour pointillés etc Voir palette de couleurs de mtg32
 *                         ou chaine vide ou null si on ne veut changer que l'épaisseur de l'objet
 * @param {string|number|null} [thickness] entier de 1 à 12 donnant l'épaisseur du trait
 *                         ou chaine vide ou null ou undefined si on ne veut changer que le style
 * @param {boolean} [bImmediat=true]  Si true, le réaffichage est immédiat
 * @returns {boolean}
 */
MtgAppLecteur.prototype.setLineStyle = function setLineStyle (idDoc, ind, style, thickness, bImmediat = true) {
  const doc = this.getDoc(idDoc)
  if (doc === null) return false
  const list = doc.listePr
  const el = list.getById(ind)
  if (el === null || !el.existe || !el.estDeNature(NatObj.NObjLigne)) return false
  const st = (style === null || style === '') ? el.style.style : parseInt(style)
  const th = (thickness == null || thickness === '') ? el.style.strokeWidth : parseInt(thickness)
  if (st < 0 || st > 5 || th <= 0 || th > 12) return false
  el.setLineStyle(new StyleTrait(list, st, th), bImmediat)
}

// Fonction ajoutée version 6.5.2
// Version 6.9.1 : On rajoute un dernier paramètre opacity
/**
 * Fonction donnant à l'élément d'id ind dans le document d'id idDoc la couleur de composantes r, v, b
 * style et l'épaisseur thickness
 * @param {string} idDoc
 * @param {string|number} ind N° d'identification html de l'élément (entier) ou chaîne de caractères
 * commençant par # et suivie du tag de l'élément
 * @param {number} r entier donnant la composante rouge de la couleur
 * @param {number} v entier donnant la composante verte de la couleur
 * @param {number} b entier donnant la composante bleue de la couleur
 * @param {boolean} [bImmediat=true]  Si true, le réaffichage est immédiat
 * @param {number} [opacity=1] nombre entre 0 et 1 donnant l'opacité de l'élément graphique
 * @returns {boolean}
 */
MtgAppLecteur.prototype.setColor = function setColor (idDoc, ind, r, v, b, bImmediat = true, opacity = 1) {
  const color = new Color(r, v, b, opacity)
  const doc = this.getDoc(idDoc)
  if (doc === null) return false
  const liste = doc.listePr
  const el = liste.getById(ind)
  if (el === null || !el.existe || !el.estDeNature(NatObj.NTtObj)) return false
  const svg = document.getElementById(idDoc)
  if (svg) {
    el.setColor(color, svg, bImmediat)
    return true
  }
  return false
}

/**
 * Fonction renvoyant le composant SVG  de l'élément d'id ind dans le document d'id idDoc
 * Renvoie null s'il n'y a pas d'élément d'indice ind ou s'il n'existe pas où n'est pas affiché
 * @param {string} idDoc
 * @param {string|number} ind N° d'identification html de l'élément (entier) ou chaîne de caractères
 * commençant par # et suivie du tag de l'élément
 * @returns {null|SVGElement}
 C:\Users\yvesb\.gradle
 C:\Projets_JavaScript\MathGraphJS\mathgraph_js
 C:\Users\yvesb\.WebStorm2019.2\system
 */
MtgAppLecteur.prototype.getSVGElement = function getSVGElement (idDoc, ind) {
  const doc = this.getDoc(idDoc)
  if (doc === null) return null
  const el = doc.listePr.getById(ind)
  if (el === null || !el.estDeNature(NatObj.NTtObj) || !el.g) return null
  return el.g
}

/**
 * Associe un eventListener au svg Element représentant l'objet d'indice html ind
 * dans la figure d'id idDoc
 * @param {string} idDoc L'id de la figure
 * @param {string|number} ind N° d'identification html de l'élément (entier) ou chaîne de caractères
 * commençant par # et suivie du tag de l'élément
 * @param {string} eventName Le nom de l'événement (par exemple mousemove)
 * @param {function} callBack La fonction de callBack de paramètre l'événement appelant
 * @returns {boolean} : true si tout s'est bien passé, false sinon
 */
MtgAppLecteur.prototype.addEventListener = function addEventListener (idDoc, ind, eventName, callBack) {
  // Il faut employer la pile de MathJax car quand on affiche la figure les svg elements de la figure
  // ont par défaut un attribut pointer-events à 'none'
  // Ce n'est qu'uen fois tout affiché que l'on peut modifier l'attribut pointer-events ce qui permet
  // ensuite d'affecter un event listener à cet objet SVG
  const doc = this.getDoc(idDoc)
  if (doc === null) return false
  const el = doc.listePr.getById(ind)
  if (el === null || !el.estDeNature(NatObj.NTtObj)) return false
  // Attention : depuis la version 6.7.4, les affichages se font dans des blocs de queue séparés
  // il faut donc englober l'appel de  addQueue dans un autre appel
  addQueue(() => {
    addQueue(function () {
      const gel = el.g
      if (gel) {
        gel.setAttribute('pointer-events', 'all')
        el.pointerevents = 'all'
        // Si le svg element de l'objet est un g element contenant d'autres objets il faut aussi qu'ils réagissent
        // aux événements souris
        for (let i = 0; i < gel.childNodes.length; i++) {
          gel.childNodes[i].setAttribute('pointer-events', 'all')
        }
        if (!el.cbmap) el.cbmap = new Map()
        else {
          const oldcb = el.cbmap.get(eventName)
          if (oldcb) {
            gel.removeEventListener(eventName, oldcb)
          }
        }
        const cb = function (ev) {
          let pos
          const id = el.listeProprietaire.id
          const svg = document.getElementById(id).parentElement // Pour pointer sur le svg global introduit avec la version 8.4
          if (eventName.startsWith('touch')) {
            pos = getTouchPositionToParent(ev, svg)
          } else if (eventName.startsWith('mouse')) {
            pos = getMousePositionToParent(ev, svg)
          } else {
            // on pourrait avoir d'autres listener, on dit rien mais x & y ci-dessous seront undefined
            pos = {}
          }
          callBack(ev, pos.x, pos.y)
        }
        el.cbmap.set(eventName, cb)
        gel.addEventListener(eventName, cb)
      }
    })
  })
  return true
}

/**
 * Fonction retirant l'eventListener associé à svg element représentant l'objet d'indice html ind
 * dans le document d'id idDoc
 * @param {string} idDoc L'id du document
 * @param {string|number} ind N° d'identification html de l'élément (entier) ou chaîne de caractères
 * commençant par # et suivie du tag de l'élément
 * @param {string} eventName Le nom de l'événement (par exemple mousemove)
 * @returns {boolean} : true si tout s'est bien passé, false sinon
 */
MtgAppLecteur.prototype.removeEventListener = function removeEventListener (idDoc, ind, eventName) {
  const doc = this.getDoc(idDoc)
  if (doc === null) return false
  const el = doc.listePr.getById(ind)
  if (el === null || !el.estDeNature(NatObj.NTtObj) || !el.g || !el.cbmap || !el.cbmap.get(eventName)) return false
  const callBack = el.cbmap.get('eventName')
  el.cbmap.delete(eventName)
  const gel = el.g
  if (el.cbmap.size === 0) {
    el.pointerevents = 'none'
    gel.setAttribute('pointer-events', 'none')
    // Si le svg element de l'objet est un g element contenant d'autres objets il faut aussi qu'ils ne réagissent pas
    // aux événements souris
    for (let i = 0; i < gel.childNodes.length; i++) {
      gel.childNodes[i].setAttribute('pointer-events', 'none')
    }
  }
  try {
    gel.removeEventListener(eventName, callBack)
  } catch (e) {
    return false
  }
  return true
}

/**
 * Ajoute un listener sur le doc
 * (jamais utilisé dans notre code mais utilisé par des sections sesaparcours)
 * @param {string} idDoc
 * @param {string} eventName
 * @param {function} callBack
 * @returns {boolean}
 */
MtgAppLecteur.prototype.addCallBackToSVGListener = function addCallBackToSVGListener (idDoc, eventName, callBack) {
  const doc = this.getDoc(idDoc)
  if (doc === null) return false
  // L'objet doc peut contenir un objet map formé d'entrées dont le premier élément est un nom d'événement souris
  // et le deuxième une fonction de callBack à appeler une fois exécuté le processus normal du player mtg32
  if (!doc.cbmap) {
    doc.cbmap = new Map()
  }
  doc.cbmap.set(eventName, callBack)
  return true
}

/**
 * Retire un listener sur le doc
 * (jamais utilisé dans notre code mais utilisé par des sections sesaparcours)
 * @param idDoc
 * @param eventName
 * @returns {boolean}
 */
MtgAppLecteur.prototype.removeCallBackToSVGListener = function removeCallBackToSVGListener (idDoc, eventName) {
  const doc = this.getDoc(idDoc)
  if (doc === null || !doc.cbmap) return false
  return doc.cbmap.delete(eventName)
}

/**
 * Fonction vidant tous les éditeurs de formule de la figure d'id idDoc
 * @param {string} idDoc
 * @returns {void}
 */
MtgAppLecteur.prototype.setEditorsEmpty = function setEditorsEmpty (idDoc) {
  this.getDoc(idDoc).listePr.setEditorsEmpty()
}
/**
 * Fonction mettant dans l'éditeur la chaîne de caractères st et mettant à jour
 * en conséquence l'affichage de formule LaTeX s'il est activé, dans le document d'id idDoc
 * @param {string} idDoc
 * @param {string} nomCalcul
 * @param {string} st
 * @returns {void}
 */
MtgAppLecteur.prototype.setEditorValue = function setEditorValue (idDoc, nomCalcul, st) {
  this.getDoc(idDoc).listePr.setEditorValue(nomCalcul, st)
}
/**
 * Fonction attribuant à un éditeur de formule une chaîne de caractères contenant
 * les caractères autorisés.
 * Si cette chaîne est vide, tous les caractères seront autorisés.
 * @param {string} idDoc
 * @param {string} nomCalcul
 * @param {string} st
 * @returns {void}
 */
MtgAppLecteur.prototype.setEditorCharset = function setEditorCharset (idDoc, nomCalcul, st) {
  const liste = this.getDoc(idDoc).listePr
  for (const elb of liste.col) {
    if (elb.estDeNature(NatObj.NEditeurFormule) && (elb.calculAssocie.nomCalcul === nomCalcul)) {
      elb.charset = st
      break
    }
  }
}
/**
 * Fonction associant, dans le document d'id idDoc, au premier éditeur associé à nomCalcul
 * une fonction de callBack qui sera appelée quand l'utilisateur valide par OK le contenu de l'éditeur.
 * @param {string} idDoc
 * @param {string} nomCalcul
 * @param {function} f  La fonction de callBack
 * @returns {void}
 */
MtgAppLecteur.prototype.setEditorCallBackOK = function setEditorCallBackOK (idDoc, nomCalcul, f) {
  this.getDoc(idDoc).listePr.setEditorCallBackOK(nomCalcul, f)
}
/**
 * Renvoie la valeur actuelle du calcul réel nommé nomCalcul dans le document d'id idDoc.
 * Renvoie -1 si le calcul n'existe pas.
 * @param {string} idDoc
 * @param {string} nomCalcul
 * @param {boolean} [bNoCase=false] passer true pour ne pas tenir compte de la casse (majuscule ou minuscule) dans la recherche de nomCalcul
 * @returns {number}
 */
MtgAppLecteur.prototype.valueOf = function valueOf (idDoc, nomCalcul, bNoCase = false) {
  return this.getDoc(idDoc).listePr.valueOf(nomCalcul, bNoCase)
}
/**
 * Fonction changeant, dans le document d'id idDoc, la formule du calcul ou de
 * la fonction (réelle ou complexe) de nom nomCalcul.
 * La nouvelle formule est contenue dans la chaîne de caractères formule.
 * Renvoie true si la formule était valide et false sinon.
 * @param {string} idDoc
 * @param {string} nomCalcul
 * @param {string} formule
 * @returns {void}
 */
MtgAppLecteur.prototype.giveFormula2 = function giveFormula2 (idDoc, nomCalcul, formule) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) this.getDoc(idDoc).listePr.giveFormula2(nomCalcul, formule)
}
/**
 * Change l'arbre de calcul du calcul complexe nomCalcul pour le remplacer par
 * un calcul dans lequel les carrés de vecteurs sont remplacés par des carrés scalaires.
 * Ce remplacement de formule doit être fait une fois que la figure a déjà été calculée
 * @param {string} idDoc Le nom du document contenant du calcul
 * @param {string} nomCalcul Le nom du calcul
 * @param {string[]} tabNames : Tableau contenant les noms des calculs complexes considérés comme des vecteurs
 */
MtgAppLecteur.prototype.setFormula4Prosca = function setFormula4Prosca (idDoc, nomCalcul, tabNames) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) this.getDoc(idDoc).listePr.setFormula4Prosca(nomCalcul, tabNames)
}
/**
 * Renvoie la formule en ligne (avec des *) du calcul ou de la fonction nommé nomCalcul
 * contenue dans le document d'id idDoc.
 * @param {string} idDoc
 * @param {string} nomCalcul
 * @param {boolean} [bNocase] passer true pour ne pas tenir compte de la casse (majuscule ou minuscule) dans la recherche de nomCalcul
 * @returns {string}
 */
MtgAppLecteur.prototype.getFormula = function getFormula (idDoc, nomCalcul, bNocase = false) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) return this.getDoc(idDoc).listePr.getFormula(nomCalcul, bNocase)
  return ''
}
// Ajout version 4.9.3
/**
 * Fonction renvoyant la formule LaTeX représentant le calcul ou la fonction
 * dont le nom est nomCalcul dans le document d'id idDoc.
 * @param {string} idDoc
 * @param {string} nomCalcul
 * @returns {string}
 */
MtgAppLecteur.prototype.getLatexFormula = function getLatexFormula (idDoc, nomCalcul) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) return doc.listePr.getLatexFormula(nomCalcul)
  return ''
}

/**
 * Fonction renvoyant la formule LaTeX représentant le calcul ou la fonction
 * dont le nom est nomCalcul dans le document d'id idDoc, mais avec une formule simplifiée
 * comme elle le serait dans un appel de \ForSimp{nomCalcul} dans un affichage LaTeX
 * @param {string} idDoc
 * @param {string} nomCalcul
 * @returns {string}
 */
MtgAppLecteur.prototype.getSimplifiedLatexFormula = function getSimplifiedLatexFormula (idDoc, nomCalcul) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) return doc.listePr.getSimplifiedLatexFormula(nomCalcul)
  return ''
}
/**
 * Fonction donnant à tous les éditeur de formule de la fiure d'id idDoc
 * la taille size.
 * Utilisé dans j3p.
 * @param {string} idDoc
 * @param {string} size
 * @returns {void}
 */
MtgAppLecteur.prototype.setEditorsSize = function setEditorsSize (idDoc, size) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) {
    const liste = this.getDoc(idDoc).listePr
    for (const el of liste.col) {
      if (el.estDeNature(NatObj.NEditeurFormule)) {
        // Version 7.9.2 : les éditeurs sont créés plus tard qu'avant
        // Il gaut maintenant utiliser la queue d'affichage
        addQueue(function () {
          el.editeur.style.fontSize = size
          el.latex.xNom = el.xNom + el.editeur.clientWidth
          el.latex.yNom = el.yNom + el.editeur.clientHeight / 2
        })
      }
    }
  }
}
/**
 * Recalcule la figure d'identifiant idDoc
 * @param {string} idDoc
 * @param {boolean} brandom
 * @returns {void}
 */
MtgAppLecteur.prototype.calculate = function calculate (idDoc, brandom) {
  const doc = this.getDoc(idDoc)
  const svg = document.getElementById(idDoc)
  if (!svg) return // Suite retour BugSnag. Si le svg n'est plus là rien à recalculer
  const dimf = new Dimf(svg)
  // On appelle positionneFull pour que les tests d'équivalences et de factorisation soient recalculés
  if (doc !== null) doc.listePr.positionneFull(brandom, dimf)
}

/**
 * Fonction devant être appelée quand on calcule la figure pour la première fois avant de l'afficher
 * Dans le  cas où la figure contient une macro de démarrage qui doit elle même construire des objets supplémentaires, cette macro
 * est d'abord exécutée
 * @param {string} idDoc
 * @param {boolean} brandom
 */
MtgAppLecteur.prototype.calculateFirstTime = function calculateFirstTime (idDoc, brandom) {
  if (typeof brandom !== 'boolean') brandom = false
  const doc = this.getDoc(idDoc)
  if (doc !== null) {
    const liste = doc.listePr
    const svg = document.getElementById(idDoc)
    const dimf = new Dimf(svg)
    const macroDem = liste.macroDemarrage
    if (macroDem !== null) {
      // Ajout version 5.1
      macroDem.setMacroLanceuse(null)
      //
      if (macroDem.className === 'CMacroSuiteMacros') {
        for (let j = 0; j < macroDem.listeAssociee.longueur(); j++) {
          macroDem.listeAssociee.get(j).execute(svg, dimf, doc.couleurFond, false)
        }
      } else {
        // Version 4.9.7 : Ajout d'un dernier paramètre pour que la macro ne crée pas d'élements graphiques
        macroDem.execute(svg, dimf, doc.couleurFond, false)
      }
    }
    // Modifié version 5.0.1 pour éviter des erreurs aléatoires sur les tests d'équivalences dans les exercices de calcul
    // doc.listePr.positionne(brandom, dimf)
    doc.listePr.positionneFull(brandom, dimf)
  }
}

// Si la figure utilise MathJax; la fonction addLaTex a été rajoutée sur la pile
// tout le contenu de display doit êre exécuté dans un bloc de la pile après cet appel
/**
 * Fonction affichant la figure d'identifiant idDoc après avoir retiré tous
 * les éléments graphiques du svg de la figure.
 * @param {string} idDoc
 * @returns {Promise<boolean>} promesse qui sera résolue lorsque l'affichage sera terminé
 */
MtgAppLecteur.prototype.display = function display (idDoc) {
  return new Promise((resolve, reject) => {
    addQueue(() => {
      const doc = this.getDoc(idDoc)
      if (doc === null) return console.error(Error(`Aucun document d’id ${idDoc}`))
      // On retire d'abord tous les enfants du svg
      const liste = doc.listePr
      const svg = document.getElementById(idDoc)
      if (!svg) {
        console.warn(`Le svg ${idDoc} n’existe plus`)
        this.removeDoc(idDoc)
        return
      }
      // Attention il faut garder le defs servant à stocker les styles de hachures
      const defs = document.getElementById('mtg32_patterns')
      const defsParentNode = defs && defs.parentElement
      while (svg.lastChild) {
        svg.removeChild(svg.lastChild)
      }
      if (defs) {
        if (defsParentNode !== svg) defsParentNode.removeChild(defs) // Version 6.4.5 : on met toujours le defs dans la dernière figure ajoutée
        svg.appendChild(defs)
      }
      this.prepareTracesEtImageFond(svg, doc)
      // c'est pas encore affiché mais on l'affecte à true tout de suite pour qu'un update appelé juste après un display ne plante pas
      doc.isDisplayed = true

      // il ne faut pas passer ici par addQueue, car son exécution ajoute typeset en queue,
      // donc si cette exécution est faite via la queue cet ajout de typeset sera mis sur la pile après l'ajout de affichetout
      liste.setReady4MathJax()
      // important de passer sur la pile juste après setReady4MathJax => mettre le dernier param à true
      // (sinon afficheTout va remettre ça à la fin de la pile, ce qui sera éventuellement trop tard (si appel d'update d'ici là)
      addQueue(() => liste.afficheTout(0, svg, true, doc.couleurFond, true))
      // on veut résoudre la promesse lorsque afficheTout aura fini
      addQueue(function () {
        liste.creePaneVariables()
      })
      addQueue(resolve)
    }, { doNotCatch: true, stopOnError: true })
      .catch(reject)
  })
}

/**
 * Fonction mettant à jour les éléments graphiques de la figure d'idDoc.
 * @param {string} idDoc
 * @returns {void}
 */
MtgAppLecteur.prototype.updateDisplay = function updateDisplay (idDoc) {
  const doc = this.getDoc(idDoc)
  if (doc === null) return console.error(Error(`Aucun document d’id ${idDoc}`))
  addQueue(() => {
    if (!doc.isDisplayed) {
      throw Error('Il faut appeler display avant update')
    }
    const liste = doc.listePr
    const svg = document.getElementById(idDoc)
    liste.update(svg, doc.couleurFond, true)
  })
}
/**
 * Fonction exécutant la macro d'intitulé nameMacro dans la
 * figure d'id idDoc.
 * @param {string} idDoc
 * @param {string} nameMacro
 * @returns {void}
 */
MtgAppLecteur.prototype.executeMacro = function executeMacro (idDoc, nameMacro) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) doc.listePr.executeMacro(nameMacro)
}
/**
 * Renvoie le document d'id idDoc du tableau this.docs.
 * S'il n'y en a pas, renvoie null.
 * @param {string} idDoc
 * @returns {CMathGraphDoc|null}
 */
MtgAppLecteur.prototype.getDoc = function getDoc (idDoc) {
  return this.docs.find(doc => doc.idDoc === idDoc) ?? null
}
/**
 * Renvoie la liste CListeObjets contenant les objets du document d'id idDoc.
 * @param {string} idDoc
 * @returns {CListeObjets}
 */
MtgAppLecteur.prototype.getList = function getList (idDoc) {
  const doc = this.getDoc(idDoc)
  if (!doc) throw Error(`Aucun document ${idDoc}`)
  return doc.listePr
}
/**
 * Fonction renvoyant le code LaTeX de l'affichage LaTex d'indice ind dans la liste
 * des objets créés (les indices commençant à zéro) dans le document d'id idDoc
 * @param {string} idDoc
 * @param {number} ind
 * @returns {string}
 */
MtgAppLecteur.prototype.getLatexCode = function getLatexCode (idDoc, ind) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) return doc.listePr.getLatexCode(ind)
  return ''
}

/**
 * Fonction utilisée pour les exercices en ligne et qui, s'il existe un affichage LaTeX commençant par la chaîne startString
 * renvoie le contenu cette chaîne tronqué de startString
 * @param {string} idDoc
 * @param {string} startString
 * @returns {string}
 */
MtgAppLecteur.prototype.getLatex = function getLatex (idDoc, startString) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) {
    const listePr = doc.listePr
    for (const el of listePr.col) {
      if (el.estDeNature(NatObj.NLatex)) {
        const ch = el.chaineCommentaire
        if (ch.indexOf(startString) !== -1) return ch.substring(startString.length)
      }
    }
  }
  return ''
}

/**
 * Rend la figure d'id idDoc réactive ou inactive aux événements souris et clavier
 * suivant la valeur du boolean ba.
 * @param {string} idDoc
 * @param {boolean} ba passer true pour activer et false pour désactiver
 * @returns {void}
 */
MtgAppLecteur.prototype.setActive = function setActive (idDoc, ba) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) {
    doc.isActive = ba
    // Il faut aussi activer ou désactiver les champs d'édition de formule
    const liste = doc.listePr
    for (const el of liste.col) {
      if (el.estDeNature(NatObj.NEditeurFormule)) {
        el.editeur.readOnly = !ba
      } else {
        if (el.getNatureCalcul() === NatCal.NVariable) {
          if (el.dialogueAssocie) {
            el.buttonplus.setAttribute('disabled', !ba)
            el.buttonmoins.setAttribute('disabled', !ba)
            el.buttonegal.setAttribute('disabled', !ba)
          }
        }
      }
    }
  }
}

MtgAppLecteur.prototype.deviceMove = function deviceMove (type, evt) {
  const fonc = (type === 'mouse') ? getMousePositionToParent : getTouchPositionToParent
  const id = this.getIdDocFromEvent(evt)
  const doc = this.getDoc(id)
  const svgFig = ge(id, true)
  // on peut avoir encore un doc mais plus de svgFig si un pb de chargement latex l'a viré
  if (!doc || !svgFig) return
  const svg = svgFig.parentElement
  const dimf = doc.dimf
  const list = doc.listePr
  if (type === 'mouse') doc.hasMouse = true // Sert pour les éditeurs de formule
  // if (doc.isActive && doc.pointCapture != null) {
  if (doc.isActive) {
    const { x, y } = fonc(evt, svg)
    if (doc.pointCapture === null) {
      if (this.isTranslating) {
        const decx = x - this.xInit
        const decy = y - this.yInit
        if ((decx !== 0) || (decy !== 0)) {
          const modif = list.translateDe(decx, decy)
          if (modif) {
            this.xInit = x
            this.yInit = y
            list.positionne(false, dimf)
            list.update(svgFig, doc.couleurFond, true, true) // Modifié version 6.4.8
          }
        }
      } else {
        const info = new InfoProx()
        const nbObjetsProches = doc.listePr.procheDePourCapture(NatObj.NPointMobile,
          { x, y }, info, doc.listeExclusion, true, 'mouse')
        document.body.style.cursor = (nbObjetsProches > 0) ? 'pointer' : (doc.defaultCursor ? doc.defaultCursor : 'default')
      }
    } else {
      const couleurFond = doc.couleurFond
      if ((Math.abs(x - doc.pointCapture.x) >= 1) || (Math.abs(y - doc.pointCapture.y) >= 1)) {
        if (this.useLens) {
          const svgLens = document.getElementById(id + 'Lens')
          svgLens.setAttribute('display', 'block')
          let circleLens = this['circleLens' + id]
          if (!circleLens) {
            circleLens = cens('circle', {
              cx: '0',
              cy: '0',
              r: String(radiusLens),
              style: `fill:#fff000; fill-opacity:${circleLensOpacity};`
            })
            // On met le cercle de couleur rempli servant à matérialiser la loupe dans le svg global
            svg.appendChild(circleLens)
            this['circleLens' + id] = circleLens
          }
          this.setLensPosition(id, x, y)
        }
        const point = { x: 0, y: 0 }
        const abs = new Pointeur()
        const b = doc.pointCapture.testDeplacement(dimf, x, y, point, abs)
        if (b) {
          if (doc.pointCapture.estDeNature(NatObj.NPointCapturableNonLie)) {
            doc.pointCapture.placeEn(point.x, point.y)
          } else if (doc.pointCapture.estDeNature(NatObj.NPointLie)) {
            doc.pointCapture.donneAbscisse(abs.getValue())
          }
        }
        doc.listeARecalculer.positionne(false, dimf)
        doc.listeARecalculer.update(svgFig, couleurFond, true)
      }
      preventDefault(evt)
      evt.stopPropagation()
    }
    // Ajout version 6.5.2
    // Si l'utilisateur a demandé d'affecter une action supplémentaire à onmousemove ou on touchmove
    const eventType = (type === 'mouse') ? 'mousemove' : 'touchmove'
    if (doc.cbmap && doc.cbmap.has(eventType)) {
      const svg = ge(id).parentElement
      const { x, y } = fonc(evt, svg)
      doc.cbmap.get(eventType)(evt, x, y)
    }
  }
}

/**
 * Fonction de callBack appelée lors des événements mouseMove.
 * @param {MouseEvent} evt  evt.id contient l'id de la figure sur laquelle agit l'événement.
 * @param {string} id L'id du document sur lequel agit l'événement
 * @param {CMathGraphDoc} doc Le document sur lequel agit la figure
 * @returns {void}
 */
MtgAppLecteur.prototype.mousemove = function mousemove (evt, id, doc) {
  const list = doc.listePr
  const dimf = doc.dimf
  // const svg = evt.target.parentElement
  const svgFig = document.getElementById(id)// Le svg de la figure
  const svg = svgFig.parentElement // Le svg global qui contient la figure
  /*
  var tab = getMousePosition(evt)
  var par = svg.parentElement
  var posdiv = getPosition2(par)
  var x = tab[0] - posdiv[0]//  + par.offsetParent.scrollLeft;
  var y = tab[1] - posdiv[1]// + par.offsetParent.scrollTop;
   */
  const { x, y } = getMousePositionToParent(evt, svg)

  if (doc.pointCapture === null) {
    if (this.isTranslating) {
      const decx = x - this.xInit
      const decy = y - this.yInit
      if ((decx !== 0) || (decy !== 0)) {
        const modif = list.translateDe(decx, decy)
        if (modif) {
          this.xInit = x
          this.yInit = y
          list.positionne(false, dimf)
          list.update(svgFig, doc.couleurFond, true, true) // Modifié version 6.4.8
        }
      }
    } else {
      const info = new InfoProx()
      const nbObjetsProches = doc.listePr.procheDePourCapture(NatObj.NPointMobile,
        { x, y }, info, doc.listeExclusion, true, 'mouse')
      document.body.style.cursor = (nbObjetsProches > 0) ? 'pointer' : (doc.defaultCursor ? doc.defaultCursor : 'default')
    }
  } else {
    const couleurFond = doc.couleurFond
    if ((Math.abs(x - doc.pointCapture.x) >= 1) || (Math.abs(y - doc.pointCapture.y) >= 1)) {
      const point = { x: 0, y: 0 }
      const abs = new Pointeur()
      const b = doc.pointCapture.testDeplacement(dimf, x, y, point, abs)
      if (b) {
        if (doc.pointCapture.estDeNature(NatObj.NPointCapturableNonLie)) {
          doc.pointCapture.placeEn(point.x, point.y)
        } else if (doc.pointCapture.estDeNature(NatObj.NPointLie)) {
          doc.pointCapture.donneAbscisse(abs.getValue())
        }
      }
      doc.listeARecalculer.positionne(false, dimf)
      doc.listeARecalculer.update(svgFig, couleurFond, true)
    }
  }
}
/**
 * Fonction de callBack appelée lors des événements mouseUp.
 * @param {MouseEvent} evt  evt.id contient l'id de la figure sur laquelle agit l'événement.
 * @returns {void}
 */
MtgAppLecteur.prototype.ondeviceup = function ondeviceup (evt) {
  const id = this.getIdDocFromEvent(evt)
  const svg = document.getElementById(id)
  const doc = this.getDoc(id)
  if (doc === null || !doc.isActive) return
  // Par précaution, si on a pas capturé au touch on exécute quand même le test suivant
  const circleLens = this['circleLens' + id]
  if (circleLens) {
    const svgLens = document.getElementById(id + 'Lens')
    svgLens.setAttribute('display', 'none')
    // Le parent du svg de la figure est le svg global. C'est là qu'est le cercle matérialisant la loupe
    svg.parentNode.removeChild(circleLens)
    this['circleLens' + id] = null
  }

  if (doc.pointCapture !== null) {
    doc.pointCapture = null
    doc.listeARecalculer.retireTout()
    // Modifié version 5.0.3
    // doc.listePr.update(svg, doc.couleurFond, doc.opacity, true);
    doc.listeARecalculer.update(svg, doc.couleurFond, true)
    document.body.style.cursor = 'default'
  }
}

/**
 * Fonction appelée lors des événements mouseDown et touchstart sur la figure.
 * @param {string} type : 'mouse' pour gérer le mousedown et 'touch' pour gérer le ontouchstart
 * @param {MouseEvent} evt  evt.id contient l'id de la figure sur laquelle agit l'événement.
 * @returns {void}
 */
MtgAppLecteur.prototype.deviceDown = function deviceDown (type, evt) {
  let mac
  const fonc = (type === 'mouse') ? getMousePositionToParent : getTouchPositionToParent
  const id = this.getIdDocFromEvent(evt)
  const doc = this.getDoc(id)
  if (doc === null || !doc.isActive) return
  const svgFig = document.getElementById(id)
  const svg = svgFig.parentElement
  // Ajout version 6.5.2 : Si l'utilisateur a demandé d'affecter une action supplémentaire à onmousedown
  const eventName = (type === 'touch') ? 'touchstart' : 'mousedown'
  if (doc.cbmap && doc.cbmap.has(eventName)) {
    const { x, y } = fonc(evt, svg)
    doc.cbmap.get(eventName)(evt, x, y)
  }
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // Abandonné version MtgApp pour qu'on puisse sur PC tactile utiliser mouse et touch
  if (type === 'mouse' && doc.type === 'touch') return
  doc.type = type
  const liste = doc.listePr
  const dimf = doc.dimf
  const couleurFond = doc.couleurFond
  if (doc.pointCapture !== null) {
    doc.pointCapture = null
    doc.listeARecalculer.retireTout()
    return
  }
  if (liste.macroEnCours !== null) {
    mac = liste.macroEnCours.macroEnCours()
    if ((mac.className === 'CMacroPause') && (mac.dureePause === 0)) {
      mac.passageMacroSuiv(svgFig, dimf, couleurFond)
      return
    }
    if (mac.className === 'CMacroApparition' && mac.executionPossible()) {
      mac.execute(svgFig, dimf, couleurFond, true)
      // Attention mac ne pointe plus forcément sur la macro en cours
      if (!liste.macroEnCours.macroEnCours().executionEnCours) {
        liste.macroEnCours.passageMacroSuiv(svgFig, dimf, couleurFond)
      }
      return
    }
  }
  const info = new InfoProx()
  const coord = fonc(evt, svg)
  // Les deux lignes suivantes pour le cas où la figure est translatable à la souris ou au touch
  this.xInit = coord.x
  this.yInit = coord.y

  const nbObjetsProches = liste.procheDePourCapture(Nat.or(NatObj.NPointMobile, NatObj.NMacro),
    coord, info, doc.listeExclusion, true, 'touch')
  if (nbObjetsProches > 0) {
    if ((mac = info.infoParType[NatObj.indiceMacro].premierVoisin) !== null) {
      if (mac.executionEnCours) {
        mac.macroEnCours().termineAction(svgFig, dimf, couleurFond)
      } else {
        if (liste.macroEnCours !== null) return
        if (!doc.modeTraceActive) liste.deleteTraces()
        liste.macroEnCours = mac
        mac.initialise()
        mac.execute(svgFig, dimf, couleurFond, true)
      }
    } else {
      if (!doc.modeTraceActive) liste.deleteTraces()
      doc.pointCapture = info.dernierPointVoisin
      // liste.heapReset(mtg32.heapSizeMobile); // Plus utilisé version 4.9.9.4
      // var ch = evt.target.id.substring(this.liste.id.length);
      // doc.pointCapture = this.liste.get(ch);
      doc.listeARecalculer.retireTout()
      doc.listeARecalculer.ajouteObjetsDependantsSauf(doc.pointCapture, liste, null)
      // Utilité des lignes suivantes à vérifier
      if (type === 'touch') {
        preventDefault(evt)
        evt.stopPropagation()
      }
    }
  } else {
    if (liste.macroEnCours !== null) {
      if (liste.macroEnCours.className === 'CMacroSuiteMacros') {
        mac = liste.macroEnCours.macroEnCours()
        if (mac.arretParClic()) {
          mac.termineAction(svgFig, dimf, couleurFond)
          liste.macroEnCours.passageMacroSuiv(svgFig, dimf, couleurFond)
        }
        // passageMacroSuiv redonne éventuellement un ordre paint() suivant la nature de la macro suivante
      } else {
        // Si la macro en cours est une macro d'apparition avec clic pour objet suivant
        // on ne la désactive que si on est au dernier objet
        mac = liste.macroEnCours.macroEnCours()
        if ((mac.className === 'CMacroApparition') && mac.executionEnCours) {
          // mac.actionDansPaint(cadre);
          // cadre.paneFigure.repaint();
          liste.update(svgFig, couleurFond, true)
        } else {
          if (mac.arretParClic()) {
            mac.termineAction(svgFig, dimf, couleurFond)
            // this.liste.macroEnCours = null;
          }
        }
      }
    } else {
      if (this.translatable) this.isTranslating = true
    }
  }
}

/**
 * Fonction de callBack appelée lors des événements touchEnd.
 * @param {TouchEvent} evt  evt.id contient l'id de la figure sur laquelle agit l'événement.
 * @returns {void}
 */
MtgAppLecteur.prototype.ontouchend = function ontouchend (evt) {
  /*
  doc.type = ""; // On autorise à nouveau tous les événements
  */
  this.ondeviceup(evt)
  // Ajout version 6.5.2 : Si l'utilisateur a demandé d'affecter une action supplémentaire à onmousedown
  const id = this.getIdDocFromEvent(evt)
  const doc = this.getDoc(id)
  if (doc !== null && doc.cbmap && doc.cbmap.has('touchend')) doc.cbmap.get('touchend')(evt)
  this.isTranslating = false
}
/**
 * Fonction de callBack appelée lors des événements touchCancel.
 * @param {TouchEvent} evt  evt.id contient l'id de la figure sur laquelle agit l'événement.
 * @returns {void}
 */
MtgAppLecteur.prototype.ontouchcancel = function ontouchcancel (evt) {
  this.ondeviceup(evt)
  // Ajout version 6.5.2 : Si l'utilisateur a demandé d'affecter une action supplémentaire à onmousedown
  const id = this.getIdDocFromEvent(evt)
  const doc = this.getDoc(id)
  if (doc !== null && doc.cbmap && doc.cbmap.has('touchcancel')) doc.cbmap.get('touchcancel')(evt)
}

// Quand il y a à la fois des éléments mouse et touch générés, les événements touch sont toujours en premier
// et les mouse en derniers
// On met doc.type à "" pour autoriser à nouveau tous les types d'événements sur un mouseup
MtgAppLecteur.prototype.onmouseup = function onmouseup (evt) {
  this.ondeviceup(evt)
  const id = this.getIdDocFromEvent(evt)
  const doc = this.getDoc(id)
  if (doc !== null) {
    doc.type = '' // On autorise à nouveau tous les événements // Test ajouté version 6.5.2
    // Ajout version 6.5.2 : Si l'utilisateur a demandé d'affecter une action supplémentaire à onmouseup
    if (doc.cbmap && doc.cbmap.has('mouseup')) doc.cbmap.get('mouseup')(evt)
    this.isTranslating = false
  }
}
/**
 * Renvoie un objet de type CListeObjets créé à partir d'une chaîne base64 d'une figure.
 * Sert à gérer des objets de type calcul sans gérer une figure.
 * @since 4.9.7
 * @param {string} code Le code Base64 de la figure obtenu dans mtg32 par
 *                      Edition - Copier le code de la figure.
 * @returns {CListeObjets}
 */
MtgAppLecteur.prototype.createList = function createList (code) {
  const doc = new CMathGraphDoc(null, false, false, this.decimalDot)
  const ba = base64Decode(code)
  const inps = new DataInputStream(ba, code)
  doc.read(inps)
  return doc.listePr
}

/**
 * Fonction destinée à être appelée de façon externe et remplaçant le nom
 * du point ou de la droite nommé oldName par newName, à condition qu'aucun point
 * n'ait déjà le nom newName
 * @param {string} idDoc L'id du svg contenant la figure
 * @param {string} oldName Le nom du point ou la droite à renommer
 * @param {string} newName Le nouveau nom
 */
MtgAppLecteur.prototype.rename = function rename (idDoc, oldName, newName) {
  const svg = document.getElementById(idDoc)
  if (svg === null) return
  if (svg.localName !== 'svg') return
  const doc = this.getDoc(idDoc)
  if (doc !== null) {
    doc.listePr.rename(oldName, newName, svg)
  }
}

/**
 * Fonction vérifiant si, dans le document d'id idDoc on peut affecter au calcul (ou à la fonction)
 * nommée calcName la formule contenue dans la chaîne de caractères formula
 * @param {string} idDoc
 * @param {string} calcName
 * @param {string} formula
 * @param [bSignesMultImplicit] true si la formule a des signes de multiplication implicite (et donc n'utilise
 * que des variables et calculs à 1 caractère) et false sinon
 * @returns {boolean}
 */
MtgAppLecteur.prototype.syntaxValidation = function syntaxValidation (idDoc, calcName, formula, bSignesMultImplicit = true) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) {
    return doc.listePr.syntaxValidation(calcName, formula, bSignesMultImplicit)
  }
  return false
}

/**
 * Fonction renvoyant une chaîne de caractères correspondant à la formule contenue dans formula mais où
 * les signes de multiplications implicites sont rajoutés en supposant que la formule ne contient
 * pas de calculs ou de fonctions avace un nom de plus de un caractère.
 * @param {string} idDoc  L'id du comument à traiter
 * @param {string} formula La formule à traiter
 * @returns {string}
 */
MtgAppLecteur.prototype.addImplicitMult = function addImplicitMult (idDoc, formula) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) {
    return doc.listePr.addImplicitMult(formula)
  }
  return formula
}
/**
 * Retourne la liste des ids des documents
 * @returns {string[]}
 */
MtgAppLecteur.prototype.getDocsIds = function getDocsIds () {
  return this.docs.map(({ idDoc }) => idDoc)
}

/**
 * Fonction renvoyant true si chCalcul représente un calcul complexe correct syntaxiquement dans le doc d'idDoc et si ce calcul
 * représente un calcul pouvant être interprété comme un calcul vectoriel sachant que le tableau tabNames
 * contient des chaînes de caractères représentant les noms de calculs complexes pouvant être considérés comme des vecteurs
 * @param {string} idDoc
 * @param {string} chCalcul
 * @param {string[]} tabNames
 * @returns {{syntaxOK: boolean, syntaxVecOK: boolean, isVec: boolean}|boolean}
 */
MtgAppLecteur.prototype.calcVectOK = function calcVectOK (idDoc, chCalcul, tabNames) {
  const doc = this.getDoc(idDoc)
  if (doc === null) return false
  const listePr = doc.listePr
  const indErr = new Pointeur(0)
  const syntaxOK = CalcC.verifieSyntaxeComplexe(listePr, chCalcul, indErr, listePr.longueur() - 1, null)
  let syntaxVecOK = false
  let isVec = false
  if (syntaxOK) {
    const calc = CalcC.ccbComp(chCalcul, listePr, 0, chCalcul.length - 1, null)
    syntaxVecOK = calc.isCalcOK4Vect(tabNames)
    isVec = calc.isCalcVect(tabNames)
  }
  return { syntaxOK, syntaxVecOK, isVec }
}

/**
 * Retourne l'id du SVG de la figure à partir d'un événement déclenché sur un des éléments SVG de la figure
 * ou sur le svg de la figure lui-même
 * @param {MouseEvent|TouchEvent} evt
 * @returns {string}
 */
MtgAppLecteur.prototype.getIdDocFromEvent = function getIdDocFromEvent (evt) {
  let id
  let target = evt.target
  // Ligne ci-dessous, si est sur un éditeur de formule apr exemple avec un mouse move pn ne gère pas
  // de façon à par exemple ne pas déplacer un point libre sous un éditeur
  if (target.localName === 'input') return ''
  if (target.id === '') { // Version 6.5.2 : Si on est dans un enfant du svg element représentant l'objet graphique on remonte jusqu'au parent
    // Les deux lignes suivantes modifiées version 8.0.1 suite rapport bugsnag : target.id undefined
    // Tous les objets graphiques svg créés par MathGraph32 ont une id qui est l'id du document suivi de #
    // suivi d'un entier (leur numéro html)
    while (target.parentElement && !target.id?.includes('#')) target = target.parentElement
    if (!target.id) return ''
    id = target.id
    const ind = id.indexOf('#')
    id = id.substring(0, ind)
  } else {
    id = target.id
    if (id.startsWith('Glob')) return id.substring(4) // L'événement vien directement du svg global
    // Les 2 lignes suivantes ajoutées version 6.5.2 car on peut avoir rajouté des écouteurs sur des éléments de la figure
    const ind = id.indexOf('#')
    if (ind !== -1) id = id.substring(0, ind)
  }
  return id
}
/**
 * Fonction destinée à mettre une fonction sur la pile des appels.
 * A utiliser de façon externe pour être sûr qu'une action soit faite après les affichages en cours
 * @param {function} f
 */
MtgAppLecteur.prototype.addFunctionToQueue = function addFunctionToQueue (f) {
  if (typeof f !== 'function') console.warn('Appel de addQueue avec un paramètre qui n’est pas une fonction')
  else {
    addQueue(f)
  }
}

/**
 * Fonction donnant, dans le doc d'id idDoc, à l'élément d'id html id le tag tag
 * @param {string} idDoc l'id du document oùse trouve l'élément cherché
 * @param {string} id l'id html de l'élément recherché
 * @param {string} tag le tag à affecter à cet élément
 * @returns {CElementBase|null} Renvoie null si idDoc n'est pas une id de document valide
 * ou s'il n'y a pas d'élément graphique d'id id dans le document
 * ou si l'élément graphique d'id id a déjà un tag.
 * Sinon renvoie un pointeur sur l'objet auquel le tag a été affecté
 */
MtgAppLecteur.prototype.setTag = function (idDoc, id, tag) {
  const doc = this.getDoc(idDoc)
  if (doc !== null) {
    return doc.listePr.setTag(id, tag)
  } else return null
}
