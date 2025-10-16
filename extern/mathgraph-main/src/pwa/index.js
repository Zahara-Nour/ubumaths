// indispensable pour que l'auto update fonctionne,
import loadTextes from 'src/kernel/loadTextes'
// cf https://vite-pwa-org.netlify.app/guide/auto-update.html#automatic-reload
import { registerSW } from 'virtual:pwa-register'

import toast from 'src/interface/toast'
import { getLanguage, getStr, strToBool } from 'src/kernel/kernel'
import { isTouchDevice, storeFigByCode } from 'src/kernel/kernelAdd'
import mtgLoad from 'src/mtgLoad'

import injectManifest from './manifest'

const minHeight = 500
const minWidth = 900
const bodyMargin = 4

const defaultOptions = {
  level: 3,
  dys: false,
  // outil nouvelle figure
  newFig: true,
  // outil ouvrir
  open: true,
  // outil options
  options: true,
  // outil enregistrer
  save: true,
  // des croix pour les points
  stylePointCroix: false,
  zoomOnWheel: true,
  useLens: isTouchDevice(),
  displayMeasures: true,
  hideCommands: false,
  pointsAuto: false,
  onlyPoints: false,
  language: getLanguage(),
  editionConstruction: false,
  decimalDot: true,
  autoComplete: false,
  fig: '', // faut la passer avec du #fig=codeBase64
  // pour la pwa on va toujours chercher mathgraph en prod
  mathjax3Base: 'https://www.mathgraph32.org/js/MathJax3/',
  // les options python / js, qu'on peut passer par la querystring
  loadJavascript: false,
  loadPython: false,
  javascriptCode: '',
  pythonCode: '',
  commandsFigs: [],
}

/*
Pour MathJax, c'est loadMathJax (toujours appelé dans le cas éditeur)
qui va appeler les fichiers qui vont bien ce qui les mettra en cache
(cf les règles de runtimeCaching pour lui dans la conf vite)

Ça devrait concerner :
es5/input/tex/extensions/color.js
es5/input/tex/extensions/colortbl.js
es5/input/tex/extensions/noerrors.js
es5/tex-svg.js

Commande `sed -nre 's@.*GET /js/MathJax3/([^ ]+) .*@\1@p' /var/log/nginx/www.mathgraph32.org/access.log|sort -u`
pour avoir cette liste
 */

/**
 * Enregistre les prefs courantes en localStorage lorsque l'on quitte la page
 * @param {MtgApp} app
 */
function onUnload (app) {
  try {
    // sauvegarde des préférences
    const mtgOptions = app.getCurrentOptions()
    localStorage.setItem('mtgOptions', JSON.stringify(mtgOptions))
    // sauvegarde de la figure, faut décaler les anciennes
    storeFigByCode(app.getBase64Code())
  } catch (error) {
    console.error(error)
  }
}

async function init () {
  try {
    // on impose un margin au body (pour que les boutons ne soient pas collés au bord)
    document.body.style.margin = `${bodyMargin}px`
    document.body.style.padding = '0'
    // on ajoute notre div au body
    const container = document.createElement('div')
    container.id = 'mtgEditor'
    document.body.appendChild(container)
    // on file la taille max à notre conteneur
    container.style.width = '100%'
    container.style.height = `calc(100vh - ${2 * bodyMargin}px)`
    // que l'on récupère pour fixer svgOptions
    const { width, height } = container.getBoundingClientRect()
    let lastWidth = Math.max(minWidth, width)
    let lastHeight = Math.max(minHeight, height)
    const svgOptions = {
      width: lastWidth,
      height: lastHeight,
    }

    // les prefs en localStorage
    let prefs = {}
    try {
      const mtgOptions = localStorage.getItem('mtgOptions')
      if (mtgOptions) {
        prefs = JSON.parse(mtgOptions)
        // console.debug('On a récupéré en localStorage les prefs', prefs)
      }
    } catch (error) {
      console.error(error)
    }
    // la querystring
    // Attention : on ne peut pas ici utiliser des URLSearchParams qui ne permettent
    // pas de gérer les chaînes base64 de MathGraph32
    const qs = window.location.search.substring(1).split('&')
    const map = new Map()
    for (const value of qs) {
      if (value) {
        const [k, v] = value.split('=')
        map.set(k, v ? decodeURIComponent(v) : '')
      }
    }
    // on regarde aussi si on nous passe des params via le hash, utile pour filer du
    // #commandsFigs=…&pythonCode=…
    // ça va écraser les params de la querystring s'ils existaient
    const qs2 = window.location.hash.substring(1).split('&')
    for (const value of qs2) {
      if (value) {
        const [k, v] = value.split('=')
        map.set(k, v ? decodeURIComponent(v) : '')
      }
    }
    /** @type {MtgOptions} */
    const mtgOptions = {}
    for (const [key, defValue] of Object.entries(defaultOptions)) {
      mtgOptions[key] = defValue
      const type = typeof defValue
      // on démarre avec les prefs si c'est le bon type
      // eslint-disable-next-line valid-typeof
      if (typeof prefs[key] === type) {
        mtgOptions[key] = prefs[key]
      }
      // la queryString écrase les prefs, et le hash écrase la queryString
      if (map.has(key)) {
      /** @type {string} */
        const value = map.get(key)
        if (type === 'boolean') {
          mtgOptions[key] = ['true', '1', 'on'].includes(value)
        } else if (type === 'number') {
          mtgOptions[key] = Number(value)
        } else if (type === 'object') {
          try {
            const obj = JSON.parse(value)
            if (typeof obj === 'object') {
              mtgOptions[key] = obj
            } else {
              console.error(`Valeur incorrecte pour ${key} => ignorée : ${value}`)
            }
          } catch (error) {
            console.error(error)
          }
        } else {
          mtgOptions[key] = value
        }
      }
    }
    // on impose toujours ça
    mtgOptions.pwa = true
    // console.debug('init donne les opts', mtgOptions, 'à partir des prefs', prefs, 'et de l’url', qs.toString(), qs2.toString())
    setMtgOptionParams(mtgOptions)
    // on ajoute tout de suite notre manifest dans la page
    injectManifest(mtgOptions.language)

    // et on charge
    const app = await mtgLoad(container, svgOptions, mtgOptions)

    if (typeof app.addQueue === 'function') {
      // on ajoute le resize automatique
      const resize = () => {
        try {
          let newWidth = Math.max(minWidth, window.innerWidth - 2 * bodyMargin)
          let newHeight = Math.max(minHeight, window.innerHeight - 2 * bodyMargin)
          // faut retirer 32 pixel à une valeur si elle est supérieure au min mais que l'autre ne l'est pas
          // avec une fenêtre trop étroite mais assez haute, on veut du scroll horizontal mais pas vertical)
          if (newWidth > minWidth && newHeight === minHeight) newWidth -= 32
          else if (newHeight > minHeight && newWidth === minWidth) newHeight -= 32
          // le resize est gourmand, on ne le lance pas si c'est inutile
          if (newWidth !== lastWidth || newHeight !== lastHeight) {
            app.resize(newWidth, newHeight)
            lastWidth = newWidth
            lastHeight = newHeight
          }
        } catch (error) {
          console.error(error)
        }
      }
      app.addQueue(resize)
      window.addEventListener('resize', () => app.addQueue(resize))
    }
    // sinon c'est un lecteur, parce qu'on est en mode js|python,
    // et dans ce cas seule la console se resize

    // l'enregistrement auto des prefs courantes à la fermeture
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        onUnload(app)
      }
    })

    // pour détecter si on est dans une version installée localement ou dans un navigateur sur app.mathgraph32.org (même offline)
    // const isInstalled = Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone)
  } catch (error) {
    console.error(error)
  }
}

function setMtgOptionParams (mtgOptions) {
  const lang = localStorage.getItem('language')
  if (lang) mtgOptions.language = lang
  let level = localStorage.getItem('level')
  if (level) {
    if (level.length === 1) level = Number(level)
    mtgOptions.level = level
  }
  const displayMeasures = localStorage.getItem('displayMeasures')
  if (displayMeasures) mtgOptions.displayMeasures = strToBool(displayMeasures)
  const pointsAuto = localStorage.getItem('pointsAuto')
  if (pointsAuto) mtgOptions.pointsAuto = strToBool(pointsAuto)
  const dysmode = localStorage.getItem('dysmode')
  if (dysmode) mtgOptions.dys = strToBool(dysmode)
  if (!mtgOptions.fig) {
    const startFig = localStorage.getItem('startFig')
    if (startFig) {
      let dataFig
      // Si startFig est d'au moins 16 caractères c'est qu'on lance l'appli par un double clic sur une figure
      // et startFig contient le code Base64 de la figure sinon c'est une des trois figures prédéfinies
      if (startFig.length >= 16) {
        dataFig = startFig
      } else {
        if (startFig === 'unity') {
          dataFig = { type: 'unity', unity: 'deg' }
        } else {
          const dotted = (startFig === 'frameDotted')
          dataFig = {
            type: 'orthonormal',
            datarep: { quadhor: !dotted, quadver: !dotted, grid: dotted, withvect: false, grad: 'simple' },
            unity: 'deg'
          }
        }
      }
      mtgOptions.fig = dataFig
    }
  }
  const zoomOnWheel = localStorage.getItem('zoomOnWheel')
  if (zoomOnWheel) mtgOptions.zoomOnWheel = strToBool(zoomOnWheel)
  const decimalDot = localStorage.getItem('decimalDot')
  if (decimalDot) mtgOptions.decimalDot = strToBool(decimalDot)
  const autoComplete = localStorage.getItem('autoComplete')
  if (autoComplete) mtgOptions.autoComplete = strToBool(autoComplete)
  const useLens = localStorage.getItem('useLens')
  if (useLens) mtgOptions.useLens = strToBool(useLens)
} // setMtgOptionParams

function runAfterTextsLoading (cb) {
  loadTextes(getLanguage(), true)
    .catch((error) => {
      console.error(error)
      toast({ title: 'Loading texts in your language failed', type: 'error', message: error.message })
    })
    .then(() => {
      cb()
    })
    .catch((error) => {
      console.error(error)
    })
}

// cf https://vite-pwa-org.netlify.app/guide/prompt-for-update.html#importing-virtual-modules
// on doit mettre ça et le déclencher dès l'import de ce module pour que le mode prompt fonctionne
const updateSW = registerSW({
  // cf node_modules/vite-plugin-pwa/types/index.d.ts
  onNeedRefresh () {
    // on peut pas encore utiliser AvertDlg car MtgApp pas forcément dispo
    runAfterTextsLoading(() => {
      if (confirm(getStr('SwReloadNeeded'))) {
        // faut pas appeler window.location.reload() mais
        updateSW()
      }
    })
  },
  onOfflineReady () {
    runAfterTextsLoading(() => {
      toast({ title: 'SwOfflineOk', type: 'info' })
    })
  },
  onRegisterError (error) {
    console.error(error)
    runAfterTextsLoading(() => {
      toast({ title: 'SwRegisterKo', type: 'error', message: error.message })
    })
  },
})

init()
