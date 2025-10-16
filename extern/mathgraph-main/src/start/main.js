// Le js chargé par index.html au pnpm start
import { ceIn, empty, ge } from 'src/kernel/dom'
import { figRepOrthonorm } from 'src/kernel/figures'
import { getOptsApiEditeur, getOptsApiLecteur, getOptsApiLecteurBis } from 'src/start/api'
import { addMtgElt, playerMultEltAction } from 'src/start/others'
import { getOptsJavascriptCode, getOptsJavascriptCodeId, getOptsJs, getOptsPython, getOptsPythonCode, getOptsPythonCodeId } from 'src/start/uiCommands'
import { fig1, fig2 } from './figures'

const container = ge('main')
const infos = ge('infos')
const choices = ge('testList')

// pour provoquer un pb de chargement mathjax
// window.mathjax3Base = 'http://localhost/foo'

function getTime () {
  const d = new Date()
  return `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}.${d.getMilliseconds()}`
}

function callBackAfterReady (app) {
  console.info(getTime(), 'app is ready', app)
  // on ajoute ce comportement de resize automatique au pnpm start,
  // mais pas dans tous les cas
  if (['#playerMultElt'].includes(location.hash)) return
  function resize () {
    const width = document.documentElement.clientWidth
    const height = document.documentElement.clientHeight
    app.resize(width, height)
  }
  if (app.addQueue) {
    app.addQueue(() => {
      resize()
    })
    window.addEventListener('resize', () => app.addQueue(function () {
      resize()
    }))
  }
}

// nos options par défaut, qui seront surchargées suivant les cas
/** @type {MtgOptions} */
const mtgOptions = {
  level: 3,
  translatable: true,
  dys: false,
  newFig: true,
  open: true,
  options: true,
  stylePointCroix: true,
  save: true, // pour que l'outil permettant d'enregistrer une figure soit présent
  zoomOnWheel: true,
  useLens: true,
  callBackAfterReady
}

// les exemples proposés
const samples = {
  player: {
    desc: 'figure de test avec le player',
    opts: {
      fig: fig1,
      isEditable: false
    }
  },
  fig1: {
    desc: 'figure de test 1 avec l’éditeur',
    opts: { fig: fig1 }
  },
  fig1PlayerElt: {
    desc: 'figure de test 1 avec <mathgraph-player>',
    action: () => addMtgElt(container, { fig: fig1 })
  },
  fig1EditorElt: {
    desc: 'figure de test 1 avec <mathgraph-editor>',
    action: () => addMtgElt(container, { fig: fig1 }, true)
  },
  fig2: {
    desc: 'figure de test 2 avec l’éditeur',
    opts: { fig: fig2 }
  },
  editeur: {
    desc: 'Éditeur sans figure avec un repère',
    opts: {
      fig: {
        type: 'orthonormal',
        datarep: {
          quadhor: false,
          quadver: false,
          grid: true,
          withvect: false,
          grad: 'simple'
        },
        unity: 'rad'
      }
    }
  },
  apiEditeur: {
    desc: 'test api sur une figure vide de l’éditeur',
    action: (mtgOptions) => Object.assign(mtgOptions, getOptsApiEditeur())
  },

  apiLecteur: {
    desc: 'test api sur une figure du player',
    action: (mtgOptions) => Object.assign(mtgOptions, getOptsApiLecteur())
  },

  apiLecteurBis: {
    desc: 'test api sur une figure vide du player avec objets retournés',
    action: (mtgOptions) => Object.assign(mtgOptions, getOptsApiLecteurBis())
  },

  python: {
    desc: 'test de l’éditeur de commande python',
    action: (mtgOptions) => Object.assign(mtgOptions, getOptsPython())
  },
  pythonCode: {
    desc: 'test du chargement via du code python',
    action: (mtgOptions) => Object.assign(mtgOptions, getOptsPythonCode())
  },
  pythonCodeId: {
    desc: 'test du chargement via du code python par id',
    action: (mtgOptions) => Object.assign(mtgOptions, getOptsPythonCodeId())
  },
  pythonCodeIdElt: {
    desc: 'test du chargement via <mathgraph-player code-python-id="">',
    action: async () => {
      const { pythonCodeId } = getOptsPythonCodeId()
      await addMtgElt(container, { 'python-code-id': pythonCodeId, fig: figRepOrthonorm })
    }
  },
  hiddenPythonCodeIdElt: {
    desc: 'test du chargement via <mathgraph-player code-python-id=""> sans l’éditeur python',
    action: async () => {
      const { pythonCodeId } = getOptsPythonCodeId()
      await addMtgElt(container, { 'python-code-id': pythonCodeId, fig: figRepOrthonorm, 'hide-commands': true })
    }
  },
  // avec le suffixe Elt mtgLoad se lance pas tout seul
  playerMultElt: {
    desc: 'test avec plusieurs figures (player) chargées différemment (mtgLoad, tag mathgraph player avec fig et tag avec python-code-id)',
    action: playerMultEltAction
  },
  javascript: {
    desc: 'test de l’éditeur de commande javascript',
    action: (mtgOptions) => Object.assign(mtgOptions, getOptsJs())
  },
  javascriptCode: {
    desc: 'test du chargement via du code javascript',
    action: (mtgOptions) => Object.assign(mtgOptions, getOptsJavascriptCode())
  },
  javascriptCodeId: {
    desc: 'test du chargement via du code javascript par id',
    action: (mtgOptions) => Object.assign(mtgOptions, getOptsJavascriptCodeId())
  },
  javascriptCodeIdElt: {
    desc: 'test du chargement via <mathgraph-player code-javascript-id="">',
    action: async () => {
      const { javascriptCodeId } = getOptsJavascriptCodeId()
      await addMtgElt(container, { 'javascript-code-id': javascriptCodeId, fig: figRepOrthonorm })
    }
  },
  hiddenJavascriptCodeIdElt: {
    desc: 'test du chargement via <mathgraph-player code-javascript-id=""> sans l’éditeur javascript',
    action: async () => {
      const { javascriptCodeId } = getOptsJavascriptCodeId()
      await addMtgElt(container, { 'javascript-code-id': javascriptCodeId, fig: figRepOrthonorm, 'hide-commands': true })
    }
  }
}

async function init () {
  const module = await import('src/mtgLoad.js')
  // faut le mettre en global pour que les custom elts l'utilise (au lieu d'en charger un en dev)
  window.mtgLoad = module.default

  // on ajoute les li dans le html
  for (const [name, { desc }] of Object.entries(samples)) {
    const li = ceIn(choices, 'li')
    const a = ceIn(li, 'a', desc)
    a.setAttribute('href', `#${name}`)
  }
}

async function reload () {
  try {
    // le hash sans son préfixe #
    const hash = window.location.hash.substring(1)
    empty(container)
    // faut aussi virer d'éventuels scripts python mis dans le dom
    for (const script of document.querySelectorAll('script[type="text/mtgPython"]')) {
      script.parentNode.removeChild(script)
    }
    // idem pour les scripts js
    for (const script of document.querySelectorAll('script[type="text/mtgJavascript"]')) {
      script.parentNode.removeChild(script)
    }

    console.debug('reload avec', hash || ' la liste des exemple')
    let showInfos = true
    let isLoadedWithElement = false

    // on permet de charger différents cas suivant le hash passé à la page
    if (samples[hash]) {
      showInfos = false
      isLoadedWithElement = hash.endsWith('Elt')
      const { desc, opts, action } = samples[hash]
      console.info(desc)
      if (opts) Object.assign(mtgOptions, opts)
      if (action) {
        const result = action(mtgOptions)
        if (result instanceof Promise) await result
      }
    } else {
      // les cas génériques où on passe une figure base64 dans le hash
      const chunks = /^(player|fixed|editor|playerElt|editorElt)(.+)$/.exec(hash)
      if (chunks) {
        showInfos = false
        const [, type, fig] = chunks
        if (type.endsWith('Elt')) {
          // via un custom tag
          await addMtgElt(container, { fig }, type === 'editorElt')
          isLoadedWithElement = true
        } else {
          console.info(`figure de test avec ${type} et la figure base64 passée en argument`)
          // on charge la figure base64 passée en hash avec le player
          mtgOptions.fig = fig
          mtgOptions.isEditable = type === 'editor'
          if (type === 'fixed') mtgOptions.isInteractive = false
        }
      }
    }

    // si on nous file qqchose à afficher on le fait
    if (showInfos) {
      // on affiche les choix
      infos.style.display = 'block'
    } else {
      infos.style.display = 'none'
      // faut lancer mtgLoad, sauf si on a mis un custom elt
      if (!isLoadedWithElement) {
        console.info('on lance mtgLoad avec les options', mtgOptions)
        const app = await window.mtgLoad(container, {}, mtgOptions)
        console.info(getTime(), 'mtgLoad a chargé l’appli (pas forcément ready)', app)
      }
    }
  } catch (error) {
    console.error(error)
  }
} // reload

init().then(() => {
  window.addEventListener('hashchange', reload)
  // au clic sur page précédente, les liens devenaient inactifs (le clic sur un lien ne modifiait pas le hash)
  // on cherche pas trop à comprendre, on recharge tout
  window.addEventListener('popstate', () => window.location.reload())
  // premier lancement
  return reload()
}).catch(error => console.error(error))
