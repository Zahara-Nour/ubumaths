// script inclus par index.html pour electron
let mtgApp

// Pour communiquer avec le main process (ou récupérer son Buffer, qui est node only)
// Attention, les arguments passé à send doit être des objets js natifs (comme pour postMessage)
// Cf https://www.electronjs.org/docs/latest/api/ipc-renderer#ipcrenderersendchannel-args
const { send } = window.ipc // cf preload

const isDebug = /(^|\?|&)debug=1(&|$)/.test(window.location.search)
const logDebug = isDebug
  ? console.debug.bind(console)
  : () => undefined

// La fonction suivante est appelée par main.js pour les enregistrements
function save () { // eslint-disable-line no-unused-vars
  send('save', mtgApp.getByteArrayCode())
}
// Cette fonction est appelée par OutilSave
// Une fois ce message reçu, main.js va ouvrir une boîte de dialogue de choix de dossier et nom de fichier
// puis enverra à index.js un message qui executera save de index qui lui-même enverra un message save à main.js
// qui alors enregistrera la figure réellement via save()
function saveForIcon () { // eslint-disable-line no-unused-vars
  send('saveForIcon')
}
// Fonction appelée par choixConstFigDlg quand on enregistre une construction de la figure pour la version electron
function saveProto (ind) { // eslint-disable-line no-unused-vars
  send('saveproto', mtgApp.getProtoByteArrayCode(ind), mtgApp.doc.tablePrototypes[ind].nom)
}
// La fonction suivante est appelée par main.js pour ouvrir un fichier
// ch est une chaîne de caractères utf8 dont chaque caractère représente le flux binaire de la figure
function openFig (ch) { // eslint-disable-line no-unused-vars
  mtgApp.resetFromString(ch, null)
}

/**
 * Fonction appelée après qu'on ait ouvert via electron une figure valide de façon à établir le chamin
 * d'accès et changer le titre de la figure
 * @param {string} path Le chemin d'accès ou une chaîne vide si le chemin d'accès est déjà établi.
 */
function setNewPath (path) { // eslint-disable-line no-unused-vars
  send('setnewpath', path)
}

// Fonction appelée depuis l'outil OutilOpen quand on a compilé avec l'option electron
function openFile () { // eslint-disable-line no-unused-vars
  send('open')
}

/**
 * Appelé quand la fenêtre change de dimensions
 */
function resize () { // eslint-disable-line no-unused-vars
  // on peut être appelé avant le retour de mtgLoad
  if (mtgApp && typeof mtgApp.resize === 'function') {
    mtgApp.resize(window.innerWidth - 22, window.innerHeight - 22)
    // if (isDebug) mtgApp.ready(() => console.log('resize done'))
  } else {
    console.error(Error('resize avant chargement, ignoré'))
  }
}

function setDocumentDirty () { // eslint-disable-line no-unused-vars
  send('setdocumentdirty')
}

function help () { // eslint-disable-line no-unused-vars
  window.open('./' + mtgApp.language + '/MathGraph32Help.htm')
}
/**
 * Cette fonction est appelée par OutilSavePNG
 * Une fois ce message reçu, main.js va ouvrir une boîte de dialogue de choix de dossier et nom de fichier
 * puis enregistrera les données dans le fichier
 * @param data La figure en png en Base64
 */
function savePNG (data) { // eslint-disable-line no-unused-vars
  send('savepng', data)
}

/**
 * Cette fonction est appelée par OutilSaveJPG
 * Une fois ce message reçu, main.js va ouvrir une boîte de dialogue de choix de dossier et nom de fichier
 * puis enregistrera les données dans le fichier
 * @param data La figure en jpeg en Base64
 */
function saveJPG (data) { // eslint-disable-line no-unused-vars
  send('savejpg', data)
}
/**
 * Cette fonction est appelée par OutilSaveSVG
 * Une fois ce message reçu, main.js va ouvrir une boîte de dialogue de choix de dossier et nom de fichier
 * puis enregistrera les données dans le fichier
 * @param data La figure en png en Base64
 */
function saveSVG (data) { // eslint-disable-line no-unused-vars
  send('savesvg', data)
}
/**
 * Cette fonction est appelée par OutilExportHTML
 * Une fois ce message reçu, main.js va ouvrir une boîte de dialogue de choix de dossier et nom de fichier
 * puis enregistrera les données dans le fichier
 * @param {string} code Le code HTML de la page exportée
 */
function saveHTML (code) { // eslint-disable-line no-unused-vars
  send('savehtml', code)
}

// Fonction appelée après validation du dialogue d'options de la figure
function setLevel (level) { // eslint-disable-line no-unused-vars
  send('level', level)
}

// Fonction appelée après validation du dialogue d'options de la figure
function setDysMode (bdysmode) { // eslint-disable-line no-unused-vars
  send('dysmode', bdysmode)
}

// Fonction appelée après validation du dialogue d'options de la figure
function setDecimalDot (bdecimaldot) { // eslint-disable-line no-unused-vars
  send('decimalDot', bdecimaldot)
}

// Fonction appelée après validation du dialogue d'options de la figure
function setAutoComplete (autoComplete) { // eslint-disable-line no-unused-vars
  send('autoComplete', autoComplete)
}

// Fonction appelée après la validation du dialogue d'options de la figure
// startFig est une chaîne de caractères décrivant la figure de démarrage
// Valeurs possibles : "unity", "frameGrid", "frameDotted"
function setStartFig (startFig) { // eslint-disable-line no-unused-vars
  send('startFig', startFig)
}

// Fonction appelée après validation du dialogue d'options de la figure
function setDisplayMeasures (bdisplay) { // eslint-disable-line no-unused-vars
  send('displaymeasures', bdisplay)
}

function setPointsAuto (bPointsAuto) { // eslint-disable-line no-unused-vars
  send('pointsAuto', bPointsAuto)
}

function setZoomOnWheel (zoomOnWheel) { // eslint-disable-line no-unused-vars
  send('zoomOnWheel', zoomOnWheel)
}

function setUseLens (useLens) { // eslint-disable-line no-unused-vars
  send('useLens', useLens)
}

function resetDocument () { // eslint-disable-line no-unused-vars
  send('resetdoc')
}

/**
 * Fonction permettant de changer la langue pour le prochain démarrage
 * @param lang : "fr", "en" ou "es"
 */
function setLang (lang) { // eslint-disable-line no-unused-vars
  send('setlang', lang)
}

/**
 * Fonction appelée depuis main.js quand on a appuyé sur la touche échappement
 * et qui sélectionne l'outil de capture quand auoune boîte de dialogue n'est ouverte
 */
function selectCaptTool () { // eslint-disable-line no-unused-vars
  if (mtgApp.dlg.length === 0) mtgApp.activeOutilCapt()
}

/**
 * Fonction appelée depuis main.js quand on a utilisé un raccourci clavier pour lancer un outil
 * @param toolName
 */
function activateTool (toolName) { // eslint-disable-line no-unused-vars
  if (mtgApp.dlg.length === 0) mtgApp.activateTool(toolName)
}

/**
 * Fonction appelée depuis main.js et réaffichant la dernière indication fugitive
 */
function lastIndication () { // eslint-disable-line no-unused-vars
  mtgApp.lastIndication()
}

function activeOutilPrec () { // eslint-disable-line no-unused-vars
  mtgApp.activeOutilPrec()
}

// appelé par main.js pour démarrer le chargement
function start ({ language, width, height, level, displayMeasures, pointsAuto, dysmode, startFig, zoomOnWheel, useLens, decimalDot, autoComplete }) { // eslint-disable-line no-unused-vars
  if (typeof window.mtgLoad === 'function') {
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
    const svgOptions = { width, height }

    const mtgOptions = {
      fig: dataFig,
      electron: true,
      language,
      local: './',
      mathjax3Base: 'MathJax3', // pour prendre notre version locale
      level,
      displayMeasures,
      pointsAuto,
      dys: dysmode,
      zoomOnWheel,
      useLens,
      decimalDot,
      autoComplete,
      functionOnSave: null,
      callBackAfterReady: () => send('mtgAppReady')
    }

    logDebug('mtgLoad avec', svgOptions, mtgOptions, 'construits avec les args', arguments)
    window.mtgLoad('main', svgOptions, mtgOptions, function (error, app) {
      if (error) {
        console.error(error)
        alert(`Il y a eu une erreur au chargement : ${error.message}`)
        return
      }
      mtgApp = app
    })
  } else {
    alert('mathgraph n’est pas chargé correctement (pas de fct globale mtgLoad)')
  }
}

// on prévient main que le js est chargé (ce sera mtgAppReady quand mtgApp sera instancié)
if (isDebug) send('jsLoaded')
