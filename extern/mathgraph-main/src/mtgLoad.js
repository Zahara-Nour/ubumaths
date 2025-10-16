/*!
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 * @version 5.7.0
 */

import addShortcuts from './addShortcuts'
import addLatex from './kernel/addLatex'
import { ceIn, empty, fixSvgContainer, ge } from './kernel/dom'
import { figVide } from './kernel/figures'
import { notify, setLanguage } from './kernel/kernel'
import Queue from './kernel/Queue'
import CAffLiePt from './objets/CAffLiePt'
import CLatex from './objets/CLatex'

import spinnerImg from './images/spinner.gif'

/**
 * Pour stocker une seule instance du player (il peut gérer plusieurs figures).
 * (pour l'éditeur c'est une instance par figure à éditer, il peut y en avoir plusieurs sur une page)
 * @type {Object<string, Promise<MtgAppLecteur>>}
 */
const appPlayerPromiseByLang = {}

// nos queues de chargement, une par conteneur, pour gérer les chargements concurrents
const loadingQueues = new Map()

// retourne la queue de chargement pour ce conteneur
const getQueue = (container) => {
  // si y'a pas de conteneur on peut avoir plein de chargement concurrents (core only)
  // => on génère une queue par appel de mtgLoad
  if (!container) return new Queue()
  // sinon une par conteneur, mais on lui ajoute un id car le test sur les objets container === lastContainer retourne false pour les mtgElements !!!
  if (!container.id) {
    let i = 0
    while (ge(`mtg${i}`, true)) i++
    container.id = `mtg${i}`
  }
  const existingQueue = loadingQueues.get(container.id)
  if (existingQueue) {
    console.info('On avait déjà une pile de chargement pour ', container, '=> abort (pour laisser le nouvel appel continuer)')
    existingQueue.abort()
  }
  const queue = new Queue()
  loadingQueues.set(container.id, queue)
  return queue
}

// en attendant d'avoir chargé les textes, on en a qq uns
const texts = {
  fr: {
    loading: 'Chargement en cours',
    loadingPython: 'Chargement du langage Python en cours',
    loadingJavascript: 'Chargement des commandes Javascript en cours',
    invalidFig: 'option fig incorrecte, le player mathgraph ne peut prendre que des figures encodées en base64, ce sera une figure vide'
  },
  de: {
    loading: 'Wird geladen',
    loadingPython: 'Python-Sprache wird geladen',
    loadingJavascript: 'JavaScript-Befehle werden geladen',
    invalidFig: 'Ungültige Option "fig". Der mathgraph-Player unterstützt nur Base64-kodierte Figuren. Daher wird eine leere Figur erzeugt.'
  },
  en: {
    loading: 'Loading in progress',
    loadingPython: 'Loading Python language in progress',
    loadingJavascript: 'Loading Javascript commands in progress',
    invalidFig: 'invalid fig option, mathgraph player only can load base64 encoded figures, it will be an empty figure'
  },
  es: {
    loading: 'Carga en curso',
    loadingPython: 'Carga del lenguaje Python en curso',
    loadingJavascript: 'Carga de comandos Javascript en curso',
    invalidFig: 'fig opción incorrecta, el player mathgraph sólo puede tomar figuras codificadas en base64, entonces será una figura vacía.'
  }
}
// il sera réinitialisé par mtgLoad
let getText = (id) => texts.fr[id]

/** @type {HTMLDivElement} */
let waitingDiv
// affecte waitingDiv avec un message d'attente
const setWaitingDiv = (ct, message) => {
  if (waitingDiv) {
    while (waitingDiv.lastChild) waitingDiv.removeChild(waitingDiv.lastChild)
    // on le remet dans ct au cas où ça aurait changé
    ct.appendChild(waitingDiv)
  } else {
    waitingDiv = ceIn(ct, 'div')
    waitingDiv.style.position = 'absolute'
    waitingDiv.style.top = '0'
    waitingDiv.style.right = '0'
    waitingDiv.style.bottom = '0'
    waitingDiv.style.left = '0'
    waitingDiv.style.backgroundColor = 'hsla(0 0% 100% / 85%)'
    // on centre verticalement et horizontalement
    waitingDiv.style.display = 'flex'
    waitingDiv.style.justifyContent = 'center'
    waitingDiv.style.alignItems = 'center'
  }
  const img = ceIn(waitingDiv, 'img')
  img.setAttribute('alt', '')
  img.setAttribute('src', spinnerImg)
  img.style.margin = '10px'
  ceIn(waitingDiv, 'span', message)
}

/**
 * Retourne un id non existant dans le dom (de la forme svgMtgXX où on incrémente XX jusqu'à en trouver un inutilisé)
 * @private
 * @returns {string}
 */
function getSvgNewId () {
  let i = 0
  while (document.getElementById(`svgMtg${i}`)) i++
  return `svgMtg${i}`
}

/**
 * Retourne le svg, créé s'il n'existait pas, avec les bonnes options
 * @private
 * @param {HTMLElement} container
 * @param {Object} [svgOptions]
 * @param {string} [svgOptions.idSvg=svgMtg]
 * @param {number} [svgOptions.height=650]
 * @param {number} [svgOptions.width=900]
 * @returns {SVGElement} le svg
 */
function getSvg (container, svgOptions) {
  if (!svgOptions) svgOptions = {}
  const width = svgOptions.width || (document.documentElement.clientWidth - 30) || (window.innerWidth - 30) || 1200
  const height = svgOptions.height || document.documentElement.clientHeight || window.innerHeight || 675

  // on peut passer au svg
  let idSvg = svgOptions.idSvg || getSvgNewId()
  let svg
  if (idSvg) {
    svg = document.getElementById(idSvg)
    if (svg && String(svg) !== '[object SVGSVGElement]') {
      console.error(Error(`L’élément #${idSvg} n’est pas un élément <svg> => ignoré`))
      svg = null
      idSvg = getSvgNewId()
    }
  }
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('id', idSvg)
    container.appendChild(svg)
  } else if (svg.parentElement !== container) {
    console.warn('Attention, appel de mtgLoad avec un svg dont le parent n’est pas le conteneur fourni, c’est déconseillé et peut occasionner des problèmes d’affichage du LaTeX')
  }
  // on impose nos styles et tailles sur container & svg
  fixSvgContainer({ container, width, height, svg })
  return svg
}

/**
 * Charge les textes d'après la langue demandée (ça va écraser les textes précédents s'ils avaient déjà été chargés dans une autre langue)
 * @private
 * @param language
 * @param isForEditor
 * @return {Promise<void>}
 */
async function loadTextes (language, isForEditor) {
  // ici on ne met pas le résultat de la promesse dans une variable car on pourrait être appelé plusieurs fois avec des options différentes
  // (pas très grave, le js ne sera chargé qu'une fois, et l'exécution de loadTextes n'aura rien à charger si c'est pour la même configuration)
  const { default: txtLoader } = await import('src/kernel/loadTextes.js')
  await txtLoader(language, isForEditor)
}

/**
 * Initialise le container (ajoutera un mtgOptions.commandsContainer s'il n'y est pas)
 * @private
 * @param {HTMLElement} container
 * @param {MtgOptions} mtgOptions
 * @return {HTMLElement} Le conteneur (pas forcément le même si on a ajouté un div pour les commandes)
 */
function initDom (container, mtgOptions) {
  if (!container || !/(SVG|HTML)\w*Element/.test(String(container))) throw TypeError('Il faut fournir un conteneur')
  // on le vide
  while (container.firstChild) container.removeChild(container.firstChild)
  // par défaut c'est le même
  mtgOptions.mtgContainer = container
  let figContainer = container

  // ça semblerait plus logique de faire ça dans le initDom de src/uiCommands/common.js
  // mais on en a besoin d'instancier app pour l'appeler
  if (mtgOptions.loadPython || mtgOptions.loadJavascript) {
    // on traite le cas string d'abord
    if (typeof mtgOptions.commandsContainer === 'string') {
      const elt = ge(mtgOptions.commandsContainer, true)
      if (elt) {
        mtgOptions.commandsContainer = elt
      } else {
        console.error(Error(`Aucun élément #${mtgOptions.commandsContainer} dans la page pour y mettre la console de commande`))
        delete mtgOptions.commandsContainer
      }
    }
    if (mtgOptions.commandsContainer) {
      // on nous fourni le conteneur pour les commandes
      // on vérifie qu'il est bien dans le dom
      if (!document.body.contains(mtgOptions.commandsContainer)) {
        console.warn('l’option commandsContainer est fournie mais il n’est pas dans le dom, on le remet à la fin de body')
        document.body.appendChild(mtgOptions.commandsContainer)
      }
      // faut quand même un div pour wrapper la figure
      // (uiCommands/loadXx ajoutera des boutons dedans)
      figContainer = ceIn(container, 'div')
    } else if (mtgOptions.hideCommands) {
      mtgOptions.commandsContainer = null
    } else {
      // on ajoute une classe sur le conteneur parent
      // (pour régler la disposition des deux divs qui suivent)
      container.classList.add('mtgUiCommandsContainer')
      // et faut créer deux divs dedans, un pour l'éditeur de commandes
      mtgOptions.commandsContainer = ceIn(container, 'div')
      container.appendChild(mtgOptions.commandsContainer)
      // et l'autre pour la figure et ses boutons
      mtgOptions.mtgContainer = ceIn(container, 'div')
      // le div de la figure
      figContainer = ceIn(mtgOptions.mtgContainer, 'div')
    }
  }
  // fin python/js

  // on met un message d'attente
  setWaitingDiv(container, getText('loading'))

  // Pour que MathJax ne traite pas le contenu automatiquement
  figContainer.classList.add('text2jax_ignore')
  /*
  Avant 2025-03-18 on imposait la police de document.body sur le conteneur, avec l'option `mtextInheritFont: true`,
  car lors d'un `MathJax.tex2svgPromise()` MathJax ne sait pas où le svg sera inséré et il utilise la police de body par défaut,
  (cf https://github.com/mathjax/MathJax/issues/2257)
  Depuis, on impose la police Roboto partout, en précisant mtextInheritFont: false, mTextFont: 'Roboto'
   */
  // on charge le css de la police roboto en tâche de fond
  import('roboto-fontface/css/roboto/roboto-fontface.css')
    .catch((error) => console.error(error))
  figContainer.style.fontFamily = 'Roboto'
  // il y aura d'autres modifs du style du conteneur dans getSvg (plus pratique de styler div & svg au même endroit)
  return figContainer
}

/**
 * Charge l'éditeur mathgraph et toutes ses dépendances (MathJax & textes inclus)
 * @private
 * @param {MtgOptions} mtgOptions
 * @param {addQ} addQ
 * @returns {Promise<FunctionConstructor>} Retourne la classe MtgApp (pas l'objet instancié)
 */
async function fetchMtgApp (mtgOptions, addQ) {
  // ATTENTION il faut importer jquery avant l'import de loadJqueryDialog.js (même pas son lancement)
  // car son import dynamique suffit à lancer le chargement de widget.js,
  // avant même d'exécuter loadJqueryDialog()
  // ça se produisait pour electron, cf commit 5c71a5cf du 2024-03-29
  // et il faut attendre la fin de loadJqueryDialog avant d'importer MtgApp
  // (même plantage avec vite, pas seulement pour electron)
  const { default: $ } = await addQ(() => import('jquery'))
  // noinspection JSConstantReassignment
  window.jQuery = window.$ = $
  // @ts-ignore TS7016: Could not find a declaration file for module …
  const { default: loadJqueryDialog } = await addQ(() => import('src/global/loadJqueryDialog.js'))
  await addQ(loadJqueryDialog)

  const { default: MtgApp } = await addQ(() => import('./MtgApp.js'))
  await addQ(() => loadTextes(mtgOptions.language, true))
  // @ts-ignore TS7016: Could not find a declaration file for module …
  await addQ(() => import('src/mtgLoad.dependencies.js'))
  // Pour la version appli on charge toujours le LaTe X
  await addQ(() => addLatex(mtgOptions.mathjax3Base))
  // sinon latex sera chargé quand y'en aura besoin
  return MtgApp
}

/**
 * Chargement et instanciation du player (hors Api ça retourne la même instance que l'appel précédent si c'est la même langue)
 * @param {MtgOptions} mtgOptions
 * @param {addQ} addQ
 * @private
 * @returns {Promise<MtgAppLecteur>}
 */
async function fetchMtgAppLecteurInstance (mtgOptions, addQ) {
  // une instance par langue seulement (auto sera forcément une des 3, mais ici on ne sait pas encore laquelle), même si de fait toutes les instances auront la même langue (la dernière écrase les précédentes).
  // (on pourrait avoir simplement une var globale, mais ça serait alors le premier appel qui fixe la langue, ici le classement par langue permet de savoir quell).
  // au pire il y aura deux instances pour la même langue si on nous appelle plusieurs fois
  // en n'imposant la langue seulement pour certains appels et pas d'autres, pas bien grave)
  if (!mtgOptions.loadApi && appPlayerPromiseByLang[mtgOptions.language]) {
    return appPlayerPromiseByLang[mtgOptions.language]
  }
  const { default: MtgAppLecteur } = await addQ(() => import('./MtgAppLecteur.js'))
  await addQ(() => loadTextes(mtgOptions.language, false))
  const appPlayer = new MtgAppLecteur(mtgOptions.zoomOnWheel, mtgOptions.decimalDot,
    mtgOptions.translatable, mtgOptions.useLens)
  // pour l'api on retourne toujours une instance par appel de mtgLoad (à cause de sa gestion du doc par défaut)
  if (!mtgOptions.loadApi) {
    appPlayerPromiseByLang[mtgOptions.language] = appPlayer
  }
  return appPlayer
}

/**
 * Chargement core only (pas de figure donc pas de svg)
 * @private
 * @param {MtgOptions} mtgOptions
 * @param {addQ} addQ
 * @returns {Promise<MtgAppLecteur>}
 */
async function loadMtgCore (mtgOptions, addQ) {
  const app = await fetchMtgAppLecteurInstance(mtgOptions, addQ)
  // il faut faire ça ici et pas dans fetchMtgAppLecteurInstance pour que ça fonctionne
  // même si on avait déjà appelé précédemment mtgLoad sans cette option
  if (mtgOptions.loadCoreWithMathJax) {
    await addQ(() => addLatex(mtgOptions.mathjax3Base))
  }
  return app
}

/**
 * Retourne une promesse résolue avec MtgApp (mis dans le container et prêt à servir)
 * @private
 * @param {string|HTMLElement} container
 * @param {Object} svgOptions
 * @param {Object} mtgOptions
 * @param {addQ} addQ
 * @returns {Promise<MtgApp>}
 */
async function loadMtgEditor (container, svgOptions, mtgOptions, addQ) {
  const MtgApp = await fetchMtgApp(mtgOptions, addQ)
  const svg = getSvg(container, svgOptions)
  const app = new MtgApp(svg, mtgOptions)
  if (!mtgOptions.noShortcuts) addShortcuts(app)
  return app
}

/**
 * Retourne une promesse résolue avec le player
 * @private
 * @param {HTMLElement|string} container
 * @param {Object} svgOptions
 * @param {MtgOptions} mtgOptions
 * @param {addQ} addQ
 * @returns {Promise<MtgAppLecteur>}
 */
async function loadMtgPlayer (container, svgOptions, mtgOptions, addQ) {
  const mtgAppLecteur = await fetchMtgAppLecteurInstance(mtgOptions, addQ)
  // true par défaut
  if (mtgOptions.isInteractive !== false) mtgOptions.isInteractive = true
  if (mtgOptions.displayOnLoad !== false) mtgOptions.displayOnLoad = true
  if (mtgOptions.fig && typeof mtgOptions.fig !== 'string') {
    console.error(Error(getText('invalidFig')), mtgOptions.fig)
    // l'utilisateur s'attend à démarrer avec une figure, on lui en colle une vide
    mtgOptions.fig = figVide
  }
  if (mtgOptions.fig && typeof mtgOptions.fig === 'string') {
    const svg = getSvg(container, svgOptions)
    // pas de displayOnLoad car on le gère plus bas (pour récupérer un pb de display)
    mtgAppLecteur.addDoc(svg.id, mtgOptions.fig, false, mtgOptions.isInteractive)
    mtgAppLecteur.calculateFirstTime(svg.id, Boolean(mtgOptions.randomOnInit))
    // il faut un await car display utilise addQueue (il peut avoir besoin de charger mathjax) et nous retourne une promesse
    if (mtgOptions.displayOnLoad) await addQ(() => mtgAppLecteur.display(svg.id))
  }
  return mtgAppLecteur
}

// cf https://jsdoc.app/about-tutorials.html et https://jsdoc.app/about-configuring-jsdoc.html

/**
 * Charge MtgApp ou MtgAppLecteur (si mtgOptions.isEditable ou mtgOptions.loadCoreOnly ou mtgOptions.loadCoreWithMathJax)
 * Renverra l'instance de l'application à la callback ou dans une promesse
 * Voir les tutoriels {@tutorial loadEditor}, {@tutorial loadPlayer}, {@tutorial loadCore} pour quelques exemples
 * Attention, l'appel sans callback qui retourne une promesse ne fonctionne que si on importe cette fonction,
 * la fct globale window.mtgLoad ne le fait pas (c'est un preloader sans gestion de promesse pour cause de compatibilité legacy)
 * @param {HTMLElement|string} container Le conteneur pour y mettre le SVG (interface de l'appli), ou son id
 * @param {Object} svgOptions Pour le svg à créer dans le dom
 * @param {number} [svgOptions.width=900] Largeur du SVG contenant l'appli
 * @param {number} [svgOptions.height=650] Hauteur du SVG contenant l'appli
 * @param {string} [svgOptions.idSvg=svgMtg] id html du svg à créer (ou à prendre dans le DOM s'il y est déjà)
 * @param {MtgOptions} mtgOptions Les informations pour l'initialisation de l'application
 * @param {mtgLoadCallback} [cb] Il vaut mieux ne pas la fournir, mtgLoad retournera alors une promesse qui sera résolue avec l'instance de l'appli
 * @throws {Error} si cb est fournie et n'est pas une fct
 * @returns {undefined|Promise<MtgApp|MtgAppLecteur>}
 */
function mtgLoad (container, svgOptions, mtgOptions, cb) {
  // console.debug('mtgLoad', container, svgOptions, mtgOptions, cb)
  if (cb && typeof cb !== 'function') throw Error('Si un 4e argument est passé à mtgLoad ça doit être une fonction')
  // on clone mtgOptions, car on va le modifier et on ne veut pas perturber l'appelant
  const opts = (mtgOptions && typeof mtgOptions === 'object') ? { ...mtgOptions } : {}
  // "edition" est l'ancien nom de l'option editionConstruction, on veut garder la compatibilité ascendante
  if ('edition' in opts) {
    if (opts.edition === true && typeof opts.editionConstruction !== 'boolean') {
      // on ne surcharge que si ça vaut true et que editionConstruction n'est pas précisé
      opts.editionConstruction = true
    }
    delete opts.edition
  }
  // le conteneur de la figure, qui ne sera pas forcément container
  let figContainer
  try {
    // on fixe la langue en 1er
    opts.language = setLanguage(opts.language)
    getText = (id) => texts[opts.language][id]
    if (container && typeof container === 'string') container = document.getElementById(container)
    if (typeof svgOptions !== 'object') svgOptions = {}
    // le cas code python|js
    if (opts.pythonCode || opts.pythonCodeId) {
      opts.loadPython = true
      opts.loadJavascript = false
    } else if (opts.javascriptCode || opts.javascriptCodeId) {
      opts.loadJavascript = true
      opts.loadPython = false
    }
    // python|js => api avec figure non éditable
    if (opts.loadPython || opts.loadJavascript) {
      opts.loadApi = true
      opts.isEditable = false
    }

    if (opts.loadCoreOnly || opts.loadCoreWithMathJax) {
      figContainer = null
      opts.mtgContainer = null
    } else {
      figContainer = initDom(container, opts)
    }
  } catch (error) {
    // un plantage dans le code sync ci-dessus
    if (cb) return cb(error)
    return Promise.reject(error)
  }

  let app
  // attention, faut surtout pas de await avant cet appel à getQueue, pour gérer les appels concurrents
  const loadingQueue = getQueue(container)
  // et ensuite tout le code async doit passer par ce addQ (pour pouvoir être annulé)
  // (il sera transmis à toutes les autres fcts async définies dans ce fichier)
  const addQ = (fn) => loadingQueue.add(fn, { doNotCatch: true, stopOnError: true })

  const errorDisplayed = new Set()

  // On emballe le reste dans une promesse (on gèrera le cas cb à la fin)
  // => TOUS les await doivent attendre addQ
  // (pas de await import() car ça ne pourrait pas être annulé par un appel concurrent)
  const loadedPromise = Promise.resolve().then(async () => {
    // on peut utiliser await
    // on commence par filer la factory à CListeObjets qui en aura besoin
    // (et ne peut pas l'importer car ça créerait des imports cycliques,
    // cf vite.md dans le commit 67a5e911)
    const [{ default: factory }, { default: CListeObjets }] = await addQ(() => Promise.all([import('./factory.js'), import('./objets/CListeObjets.js')]))
    CListeObjets.setFactory(factory)
    // idem pour CLatex et CAffLiePt
    CAffLiePt.setLatex(CLatex)

    let isEditeur = false

    // on peut charger mathgraph, app est l'appli qui sera retournée à la fin du chargement
    if (opts.loadCoreOnly || opts.loadCoreWithMathJax) {
      app = await loadMtgCore(opts, addQ)
    } else if (opts.isEditable === false) {
      app = await loadMtgPlayer(figContainer, svgOptions, opts, addQ)
    } else {
      isEditeur = true
      app = await loadMtgEditor(figContainer, svgOptions, opts, addQ)
    }

    // à partir de là, app est définie, on crée un div dans container
    // pour laisser un message de chargement tant que tout n'est pas terminé
    // (la création de l'instance a viré notre message précédent, et le chargement de python peut être long)

    if (opts.loadApi) {
      if (!isEditeur) {
        // pour l'api il faut ajouter les méthodes d'intersection au Lecteur,
        // => on cherche pas à trier on ajoute tous les objetsAdd (mieux vaut charger trop de choses pour MtgAppLecteurApi (rare)
        // plutôt que d'ajouter à tous les MtgAppLecteur les méthodes nécessaires aux intersections, qui ne servent que pour l'api
        // Et il faut charger jquery d'abord (comme dans fetchMtgApp)
        const { default: $ } = await addQ(() => import('jquery'))
        // noinspection JSConstantReassignment
        window.jQuery = window.$ = $
        await addQ(() => import('src/mtgLoad.dependencies.js'))
      }
      const { default: addApi } = await addQ(() => import('src/api/addApi.js'))
      addApi(app, opts)
      // Modification faite par Yves : L'éditeur charge toujours MathJax et pour utiliser l'api
      // le lecteur doit aussi charger MathJax car on ne sait pas si l'utilisateur utilisera ou pas du LaTeX
      // Or addLaTeX doit être appelé avant d'ajouter des CLatex à la figure sous peine de voir les objets créés
      // dans un ordre différent de l'ordre voulu
      // @todo voir si on peut fix ce pb d'ordre de création (créer les CLatex en sync et lancer loadLatex ensuite via addQueue pour le rendu), pour éviter de charger ça ici
      await addQ(() => addLatex(opts.mathjax3Base))
      if (!isEditeur && opts.fig) {
        app.setApiDoc()
      }
    }
    if (opts.loadPython || opts.loadJavascript) {
      // on charge ça dynamiquement pour ne pas alourdir le build de base
      const msg = opts.loadPython
        ? getText('loadingPython')
        : getText('loadingJavascript')
      setWaitingDiv(container, msg)
      const module = opts.loadPython
        ? opts.hideCommands
          ? await addQ(() => import('src/uiCommands/pythonDriver.js'))
          : await addQ(() => import('src/uiCommands/pythonEditor.js'))
        : opts.hideCommands
          ? await addQ(() => import('src/uiCommands/javascriptDriver.js'))
          : await addQ(() => import('src/uiCommands/javascriptEditor.js'))
      await addQ(() => module.default(app, opts))
    }

    // la queue est arrivée à son terme, on pourrait la virer mais ça sert à rien, si elle existait un appel suivant éventuel ferait un abort + nouvelle queue

    // on peut virer notre waitingDiv (la variable peut pointer sur un elt qui a déjà été viré du dom, faut regarder s'il a un parentElement)
    if (waitingDiv?.parentElement) {
      waitingDiv.parentElement.removeChild(waitingDiv)
    }

    // on a fini, si y'a un opts.callBackAfterReady dans le cas lecteur, on l'appelle ici
    if (typeof opts.callBackAfterReady === 'function' && !isEditeur) {
      app.ready(() => opts.callBackAfterReady(app))
    }
    if (!cb) return app
    // on veut pas retomber dans notre .catch() ci-dessous si cb plante => try/catch dédié
    try {
      cb(null, app)
    } catch (error) {
      console.error(error)
    }
  })
    .catch(error => {
      // si on a déjà instancié app, on annule tout ce qui est déjà lancé
      if (app) app.abort()
      if (error.userFriendly) {
        // un pb de chargement, probablement mathJax
        console.error(error)
        if (figContainer) {
          // on vide le conteneur s'il y a un svg dedans
          // pour virer la figure mais aussi d'autres trucs éventuels comme un spinner de chargement
          if (figContainer.querySelector('svg')) {
            empty(figContainer)
          }
          // on affiche pas plusieurs fois le même message (pour éviter un paquet de "Chargement annulé" par ex)
          if (!errorDisplayed.has(error.message)) {
            errorDisplayed.add(error.message)
            const p = ceIn(figContainer, 'p', error.message)
            p.classList.add('error')
          }
        } else {
          // on fait suivre…
          if (cb) cb(error)
          else throw error
        }
      } else {
        // pas normal que notre code de chargement plante
        notify(error)
        // et on fait suivre
        if (cb) cb(error)
        else throw error
      }
    })

  if (!cb) return loadedPromise
}

// en 2 lignes pour jsdoc (car export default function foo () {} est valable en js mais jsdoc aime pas)
export default mtgLoad

/**
 * L'objet à passer à la place du code base64 d'une figure pour initialiser une figure vide
 * @typedef NewFigOptions
 * @property {string} [type=unity] simple|unity|orthonormal|orthogonal
 *    simple pour une figure sans longueur unité sans repère
 *    unity pour une figure avec segment longueur unité et sans repère
 *    orthonormal pour une figure avec repère orthonormal
 *    orthogonal pour un figure avec repère orthogonal
 * @property {Object} datarep objet pour initialiser le repère
 * @property {boolean} datarep.quadver true si on veut que le repère soit quadrillé verticalement
 * @property {boolean} datarep.quadhor true si on veut que le repère soit quadrillé horizontalement
 * @property {boolean} datarep.withvect true si le repère doit avoir des vecteurs directeurs sur chaque axe
 * @property {boolean} datarep.grid true si on veut que le repère ait des pointillés aux coordonnées entières
 * @property {string} datarep.grad no|simple|trig, avec
 *                                no si on ne veut pas de graduations sur les axes
 *                                simple si on veut des graduations usuelles
 *                                trig si on veut des graduations trigo sur l'axe des abscisses
 *                                  (dans ce cas le paramètre unity de datfig n'est pas pris en
 *                                   compte et l'unité de la figure est le radian)
 */
/**
 * Callback functionOnSave (passée via MtgOptions)
 * @callback functionOnSave
 * @param {Object} result
 * @param {string} result.fig La figure en base64
 * @param {number|undefined} result.score Un éventuel score (0 ou 1, pour les exercices de construction)
 */

/**
 * Définition d'une figure, il faut fournir fig ou figRef
 * @typedef FigDef
 * @property {string} name Le nom de la figure
 * @property {string} [fig] Le code base64 de la figure
 * @property {string} [figRef] La référence à une figure prééxistante dans mathgraph (cf kernel/figures.js)
 */
/**
 * Options pour initialiser l'application
 * @typedef MtgOptions
 * @property {string|NewFigOptions} [fig] La figure base64 à afficher au chargement
 * @property {number|string} level entier de 0 à 3 pour le niveau de fonctionnement du logiciel
 *                                              (ou une chaine de caractères Base64 donnant
 *                                              les outils permis ou interdits,
 *                                              mais cette option est plutôt à usage interne)
 *                                            0 : sélection d'outils pour le niveau élémentaire
 *                                            1 : collège
 *                                            2 : lycée (sans nombres complexes)
 *                                            3 : lycée avec nombres complexes
 * @property {boolean|string} [local=false] Si l'application fonctionne en local hors-ligne,
 *                            passer true ou une chaîne de caractères donnant le chemin relatif de
 *                            mtgLoad.js par rapport à la page qui a lancé l'application
 * @property {boolean} [displayOnLoad=true] Passer false pour ne pas afficher la figure
 *                            automatiquement dès qu'elle est prête (il faudra utiliser les méthodes
 *                            du player pour l'afficher plus tard)
 * @property {boolean} [displayMeasures=true] Passer false pour ne pas afficher automatiquement les mesures de longueur et d'angles (éditeur only)
 * @property {boolean} [isInteractive=true] Passer false pour ne pas permettre de bouger les points (player only)
 * @property {boolean} [isEditable=true] Passer false pour afficher la figure avec le player (ni menu ni bouton)
 * @property {boolean} [loadApi=false] Passer true pour ajouter les méthodes de l'api à l'application qui sera retournée
 * @property {boolean} [isPromiseMode=false] Passer true pour que les méthodes de l'api retournent des promesses (résolues lorsque l'affichage est fait) plutôt que les objets créés en synchrone
 * @property {boolean} [loadCoreOnly=false] Passer true pour ne charger que le core (ça retourne un mtgAppLecteur instancié sans figure, pas de svg créé ni de MathJax chargé)
 * @property {boolean} [loadCoreWithMathJax=false] Passer true pour ne charger que le core et MathJax (ça retourne un mtgAppLecteur instancié sans figure ni de svg créé), pour faire ensuite des addDoc dans des svg que l'appelant devra créer
 * @property {string} [mathjax3Base] Url du dossier MathJax3 où prendre mathjax3 (sinon ce sera sur le site mathgraph32.org)
 * @property {boolean} [loadJavascript=false] Passer true pour ajouter une console javascript (impliquera loadApi, param commandsContainer facultatif)
 * @property {boolean} [loadPython=false] Passer true pour ajouter une console javascript (impliquera loadApi, param commandsContainer facultatif)
 * @property {boolean} [preview=false] Ce param est à true lorsque la bibli affiche une ressource mathgraph editable (voir ou apercevoir, pour distinguer de la modification)
 * @property {string} [pythonCode] Pour passer du code python à lancer au démarrage
 * @property {string} [pythonCodeId] Passer l'id d'un tag &lt;script> (ou textarea ou autre) contenant le code python à lancer au démarrage
 * @property {string} [javascriptCode] Pour passer du code javascript à lancer au démarrage
 * @property {string} [javascriptCodeId] Passer l'id d'un tag &lt;script> (ou textarea ou autre) contenant le code javascript à lancer au démarrage
 * @property {boolean} [pointsAuto=false] Passer true pour créer automatiquement un point quand on clique sur un endroit vide (avec certains outils)
 * @property {boolean} [randomOnInit=false] passer true pour lancer l'aléatoire à l'initialisation de la figure (lecteur seulement)
 * @property {boolean} [stylePointCroix=false] Passer true pour que le style de point au démarrage soit la grande croix (éditeur seulement).
 * @property {boolean} [open=true] Passer false pour retirer l'outil permettant d'ouvrir une figure
 * @property {FigDef[]} [commandsFigs] Une liste de figures à proposer dans l'éditeur de commandes
 * @property {HTMLElement|string} [commandsContainer] Conteneur pour la console de commandes (facultatif si non fourni avec loadPython|loadJavascript on en créera un à coté de la figure)
 * @property {HTMLElement} [mtgContainer] À ne pas fournir, il sera affecté par mtgLoad
 * @property {boolean} [hideCommands=false] Passer true pour cacher la console de commande (ignoré s'il n'y a pas de code de départ fourni)
 * @property {boolean} [forceProtocol=false] Passer true pour que l'outil protocole de la figure soit imposé
 * @property {boolean} [save=true] Passer false pour retirer l'outil permettant de sauvegarder une figure
 * @property {boolean} [newFig=true] Passer false pour retirer l'outil permettant de créer une nouvelle figure
 * @property {boolean} [options=true] Passer false pour retirer l'outil permettant de changer les options de la figure (ajouter ou retirer des outils)
 * @property {boolean} [onlyPoints=false] Passer true pour que les outils de transformation ne s'appliquent qu'à des points
 * @property {boolean} [dys=false] Passer true pour démarrer l'interface avec un affichage adapté aux utilisateurs "dys" (traits épais, points en grande croix, taille des noms plus grande)
 * @property {functionOnSave} [functionOnSave] callBack appelée au clic sur le bouton d'enregistrement (sera appelée avec {figure, result}, pour le moment sans arguments)
 * @property {boolean} [avertOnSave=true] si functionOnSave est présent et si avertOnSave est false, il n'y aura pas de message d'avertissement quand on clique sur le bouton d'enregistrement (true par défaut)
 * @property {function} [callBackAfterReady] callBack appelée lorsque la figure est chargée, les méthodes de MtgApp peuvent alors être utilisées (inutile pour player et coreOnly)
 * @property {boolean} [bplayer=false] Passer true pour ajouter une propriété player (de type MtgAppLecteur) à l'objet MtgApp retourné (utile pour les exercices de construction)
 * @property {string} [language=''] Passer fr|en|es|de (ou fra|eng|spa|deu) pour forcer la langue (sinon détection automatique d'après les headers envoyés par le navigateur)
 * @property {boolean} [electron=false] Editeur only: passer true si destiné à fonctionner avec la version electron
 * @property {boolean} [editionConstruction=false] Si on édite un exercice de construction il faut que ce paramètre soit true pour le prof, qui doit pouvoir modifier l'exo de construction lui-même, sinon ne pas le préciser pour l'élève (qui ne pourra pas modifier l'existant, seulement ajouter des objets)
 * @property {boolean} [zoomOnWheel=true] Si on utilise la molette de la souris sur le svg de la figure, on zoome ou dézoome automatiquement
 * @property {boolean} [decimalDot=true] true Si le séparateur décimal est le point décimal, sinon c'est la virgule
 * @property {boolean} [useLens = true] true si, quand on capture un point avec un écran tactile, uen loupe apparaît
 * @property {boolean} [translatable=false] true si on veut qu'on puisse faire glisser la figure entière.
 * @property {boolean} [autoComplete=false] true si on veut que des marques de segments soient automatiquement ajoutées, par exemple pour une médiatrice.
 * Pour le mtgAppLecteur, si translatable est undefined la figure n'est pas translatable
 * Pour la version application, si translatable est undefined on le met à true (comportement par défaut de l'appli)
 * @property {boolean} [noShortcuts=false] Passer true pour ne pas ajouter de raccourcis clavier (si l'on ne veut pas interférer avec d'autres applis dans le même DOM)
 */

/**
 * @callback mtgLoadCallback
 * @deprecated
 * @param {Error|null} error
 * @param {MtgApp|MtgAppLecteur|MtgAppApi|MtgAppLecteurApi} [mtgApp] L'appli instanciée (mais le rendu de la figure peut être en cours)
 */

/**
 * @typedef SvgOptions
 * @property {number} [width=900] Largeur du SVG contenant l'appli
 * @property {number} [height=650] Hauteur du SVG contenant l'appli
 * @property {string} [idSvg=svgMtg] id html du svg à créer (ou à prendre dans le DOM s'il y est déjà)
 */

/**
 * @callback addQ
 * @param {Function} fn
 * @returns {Promise<void>}
 */
