/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
'use strict'

// IMPORTANT, lors d'un changement de version d'electron, il faut aller vérifier
// tous les BREAKING CHANGES
// https://github.com/electron/electron/blob/main/docs/breaking-changes.md

// handle setupevents as quickly as possible
/*
const setupEvents = require('./setupEvents')
if (setupEvents.handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return
}
*/

const fs = require('fs')
const path = require('path')
const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron')

const ipc = ipcMain
const Store = require('./store')
const textFr = require('./text/fr')
const textEn = require('./text/en')
const textEs = require('./text/es')
const textDe = require('./text/de')
const mtgFileExtension = 'mgj'

const isDebug = process.argv.includes('--inspect')

const logDebug = isDebug
  ? console.debug.bind(console)
  : () => undefined

// on doit charger un chemin absolu

// eslint-disable-next-line n/no-path-concat
let url = `file://${__dirname}/index.html`

// si on passe du --debug=http://localhost:8081/index.debug.html on ira prendre cette url de départ
if (isDebug) {
  const chunks = /--debug=([^ ]+)/.exec(process.argv)
  const debugUrl = chunks && chunks[1]
  if (debugUrl) url = debugUrl
  // on ajoute du debug=1 en param pour que le index.js soit au courant du mode debug dès son chargement
  // (et qu'il puisse nous dire qu'il est (re)chargé)
  url += (/\?/.test(url) ? '&' : '?') + 'debug=1'
}

let language // Sur Windows getLocale doit être appelé après ready

let filePath = '' // Contiendra le chemin d'accès au fichier lors de la sauvegarde
let newFilePath // Contient le chemin d'accès à une figure à ouvrir en attendant qu'on soit sur que la figure est valide
let mainWindow

let isLoaded = false
let firstLoadingDone = false
let bmayClose = true // Boolean contenant true si la fenêtre a le droit de se fermer et false sinon

const store = new Store({
  // Notre fichier de configuration sera nommé user-preferences
  configName: 'user-preferences',
  defaults: {
    // 900x600 est la taille par défaut de la fenêtre
    // Si l'utilisateur change la taille de la fenêtre celle-ci sera mémorisée et utilisée
    // lors du prochain lancement
    windowSize: {
      width: 900,
      height: 650
    },
    level: '3',
    displayMeasures: 'true',
    pointsAuto: 'true',
    dysmode: 'false',
    isMaximized: false,
    startFig: 'frameGrid', // Autres valeurs possibles : frameDotted, unity,
    zoomOnWheel: true,
    useLens: false,
    decimalDot: true, // Le séparateur décimal par défaut est le point décimal
    autoComplete: false // true si on complète automatiquement avec marques de segment ou d'angle par exemple pour les médiatrices
  }
})

function createWindow (startFigure) {
  const { width, height } = store.get('windowSize')
  const level = store.get('level')
  const dysmode = store.get('dysmode')
  const displayMeasures = store.get('displayMeasures')
  const zoomOnWheel = Boolean(store.get('zoomOnWheel') ?? true)
  const useLens = Boolean(store.get('useLens'))
  const decimalDot = Boolean(store.get('decimalDot') ?? true)
  const pointsAuto = dysmode ? false : store.get('pointsAuto')
  const startFig = arguments.length === 0 ? store.get('startFig') : startFigure
  const autoComplete = Boolean(store.get('autoComplete') ?? false)

  Menu.setApplicationMenu(null) // Avant instance de mainWindow
  // On passe les options
  mainWindow = new BrowserWindow({
    width,
    height,
    title: 'MathGraph32 JavaScript',
    // icon: 'logoMathGraph.png',
    icon: path.resolve(__dirname, 'logoMathGraph.png'),
    center: true,
    show: false, // Pour qu'on puisse appeler resize et bien positionner la barre d'outils de droite
    webPreferences: {
      nativeWindowOpen: true,
      nodeIntegration: true,
      preload: path.join(app.getAppPath(), 'preload.js')
    }
  })

  // createMenu(); // Abandonné car maintenant on peut cliquer sur les icônes du logiciel
  // mainWindow.setMenu(null)

  // Ligne qui doit être présente pour debug (avoir les devTools dans l'appli electron qui s'ouvre)
  if (isDebug) {
    // fut un temps la ligne mainWindow.webContents.openDevTools(),
    // mais le 2023-07-26 ça fonctionnait plus sous linux (avec node 20.5.0)
    // l'ajout d'une nouvelle fenêtre avec ouverture des devTools en mode détaché règle le pb
    // cf https://github.com/electron/electron/issues/20069#issuecomment-614889786
    const devTools = new BrowserWindow()
    mainWindow.webContents.setDevToolsWebContents(devTools.webContents)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.level = level
  mainWindow.displayMeasures = displayMeasures
  mainWindow.pointsAuto = pointsAuto
  mainWindow.dysmode = dysmode
  mainWindow.zoomOnWheel = zoomOnWheel
  mainWindow.useLens = useLens
  mainWindow.decimalDot = decimalDot
  mainWindow.autoComplete = autoComplete
  // mainWindow.startFig = startFig
  // on définit une taille minimale pour notre fenêtre
  mainWindow.setMinimumSize(800, 520)
  mainWindow.loadURL(url)

  // ça c'est l'appel "normal" au 1er chargement
  let startCode = getStartCode({ level, displayMeasures, pointsAuto, dysmode, startFig, zoomOnWheel, useLens, decimalDot, autoComplete })
  logDebug('main.js va lancer ' + startCode)
  mainWindow.webContents.executeJavaScript(startCode)

  // ensuite on gère un éventuel reload en mode debug (possible avec F5 si le focus est sur les devTools)
  if (isDebug) {
    let nbStart = 0
    // on stocke cet appel pour pouvoir recharger la page depuis le navigateur et le rappeler
    ipc.on('jsLoaded', () => {
      // le js vient d'être chargé mais mtgApp n'est pas encore prêt
      isLoaded = false
      nbStart++
      if (nbStart > 1) {
        logDebug(`Reload n°${nbStart} ok, launching start command:\n`)
        startCode = getStartCode({ level, displayMeasures, pointsAuto, dysmode, startFig, zoomOnWheel, useLens, decimalDot, autoComplete })
        mainWindow.webContents.executeJavaScript(startCode)
      }
    })
  }

  if (store.get('isMaximized')) mainWindow.maximize()
  mainWindow.show()

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('close', (ev) => {
    try {
      const { width, height } = mainWindow.getBounds()
      // On enregistre les dimensions de la fenêtre dans les préférences avant de quitter
      store.set('windowSize', { width, height })
      store.set('language', language)
      store.set('level', mainWindow.level)
      store.set('dysmode', mainWindow.dysmode)
      store.set('isMaximized', mainWindow.isMaximized())
      store.set('displayMeasures', mainWindow.displayMeasures)
      store.set('pointsAuto', mainWindow.pointsAuto)
      store.set('zoomOnWheel', mainWindow.zoomOnWheel)
      store.set('useLens', mainWindow.useLens)
      store.set('decimalDot', mainWindow.decimalDot)
      store.set('autoComplete', mainWindow.autoComplete)
      // store.set('startFig', mainWindow.startFig)

      if (!bmayClose) {
        const buttons = [getStr('Yes'), getStr('No')]
        ev.preventDefault()
        dialog.showMessageBox(mainWindow, {
          type: 'warning',
          buttons,
          noLink: true,
          message: getStr('AvertDirty')
        }).then(result => {
          if (result.response === 0) {
            bmayClose = true
            mainWindow.close()
          }
        }).catch(err => {
          console.error(err)
        })
      }
    } catch (error) {
      console.error(error)
    }
  })
}

/**
 * Retourne le code à passer à start avec la taille de la fenêtre courante
 * @param level
 * @param displayMeasures
 * @param pointsAuto
 * @param dysmode
 * @param startFig
 * @param zoomOnWheel
 * @param useLens
 * @param decimalDot true si le séparateur décimal est le point
 * @param autoComplete
 * @returns {string}
 */
function getStartCode ({ level, displayMeasures, pointsAuto, dysmode, startFig, zoomOnWheel, useLens, decimalDot, autoComplete }) {
  const size = mainWindow.getContentSize()
  const width = size[0] - 16
  const height = size[1] - 20
  // ATTENTION, il ne faut surtout pas changer le `startFig: "${startFig}"`, les doubles quotes sont importantes
  // (avec des simples, sous windows le double clic sur une figure ne la lance pas)
  // il y avait eu une tentative avec
  // return `start(${JSON.stringify(startOpts)})`
  // mais le stringify modifie certains octets de la figure base64 (probablement une conversion en \uxxxx de certains octets)
  // et cela ne fonctionne plus
  return `start({language: "${language}",  width: ${width}, height: ${height}, level: "${level}", displayMeasures: ${displayMeasures}, pointsAuto: ${pointsAuto}, dysmode: ${dysmode}, startFig: "${startFig}",
  zoomOnWheel: ${zoomOnWheel}, useLens: ${useLens}, decimalDot: ${decimalDot}, autoComplete: ${autoComplete}})`
}

/**
 * Affecte les raccourci et les listeners une fois l'appli chargée (la 1re fois)
 */
function firstInit () {
  if (firstLoadingDone) return console.error(Error('firstInit ne doit être appelé qu’une seule fois'))
  firstLoadingDone = true
  // les listener pour redimensionner
  for (const ev of ['resize', 'enter-full-screen', 'leave-full-screen', 'maximize', 'restore', 'unmaximize']) {
    mainWindow.on(ev, setSize)
  }
}

/**
 * Appelé dès que l'appli mtg est prête (au 1er chargement et après chaque reload)
 */
function onMtgReady () {
  isLoaded = true
  if (!firstLoadingDone) firstInit()
  setSize()
}

function setSize () {
  // on est listener, faut try/catch
  try {
    if (mainWindow && isLoaded) {
      mainWindow.webContents.executeJavaScript('resize()')
    } else {
      // un resize pendant le chargement on se rappellera dans 200ms
      setTimeout(setSize, 200)
    }
  } catch (error) {
    console.error(error)
  }
}

function start () {
  language = store.get('language') || getLanguage()

  // Check if we are on a MAC
  if (process.platform === 'darwin') {
    // Create our menu entries so that we can use MAC shortcuts
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [
          { label: getStr('quit'), role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { label: getStr('undo'), role: 'undo' },
          { label: getStr('redo'), role: 'redo' },
          { type: 'separator' },
          { label: getStr('cut'), role: 'cut' },
          { label: getStr('copy'), role: 'copy' },
          { label: getStr('paste'), role: 'paste' },
          { label: getStr('delete'), role: 'delete' },
          { label: getStr('selectall'), role: 'selectall' }
        ]
      }
    ]))
  }

  const args = process.argv
  // On recherche si on est en train d'ouvrir une figure par association de fichier (double clic)
  let found = false
  for (let i = 0; (i < args.length) && !found; i++) {
    const ch = args[i]
    if (ch.endsWith(mtgFileExtension)) {
      found = true
      fs.readFile(ch, 'latin1', (err, data) => {
        if (err) {
          console.error(getStr('ErrOpen') + err.message)
          return
        }
        newFilePath = ch
        let startFigure = JSON.stringify(data)
        const len = startFigure.length
        startFigure = startFigure.substring(1, len - 1) // Por éliminer les "" de début et de fin de la chaîne
        createWindow(startFigure)
      })
    }
  }
  if (!found) createWindow()
}

/**
 * Le message suivant est reçu après qu'on a choisi le menu enregistrer
 * et c'est là que l'enregistrement réel se fait
 */
ipc.on('save', (evt, byteArray) => {
  const data = Buffer.from(byteArray)
  fs.writeFile(filePath, data, (err) => {
    if (err) {
      console.error(getStr('ErrSave') + err.message)
    }
  })
  bmayClose = true
})

ipc.on('savepng', (evt, data) => {
  const parentWindow = (process.platform === 'darwin') ? null : BrowserWindow.getFocusedWindow()
  dialog.showSaveDialog(parentWindow, {
    title: getStr('expImPNG'),
    filters: [
      { name: getStr('PNGFiles'), extensions: ['png', 'PNG'] },
      { name: getStr('AllFiles'), extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      fs.writeFile(result.filePath, Buffer.from(data, 'base64'), { encoding: 'base64' }, (err) => {
        if (err) {
          console.error(getStr('ErrSave') + err.message)
        }
      })
    }
  }).catch(err => {
    console.error(err)
  })
})

ipc.on('savejpg', (evt, data) => {
  const parentWindow = (process.platform === 'darwin') ? null : BrowserWindow.getFocusedWindow()
  dialog.showSaveDialog(parentWindow, {
    title: getStr('expImJPG'),
    filters: [
      { name: getStr('JPGFiles'), extensions: ['jpg', 'JPG', 'jpeg', 'JPEG'] },
      { name: getStr('AllFiles'), extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      fs.writeFile(result.filePath, Buffer.from(data, 'base64'), { encoding: 'base64' }, (err) => {
        if (err) {
          console.error(getStr('ErrSave') + err.message)
        }
      })
    }
  }).catch(err => {
    console.error(err)
  })
})

ipc.on('savesvg', (evt, data) => {
  const parentWindow = (process.platform === 'darwin') ? null : BrowserWindow.getFocusedWindow()
  dialog.showSaveDialog(parentWindow, {
    title: getStr('expImSVG'),
    filters: [
      { name: getStr('SVGFiles'), extensions: ['svg', 'SVG'] },
      { name: getStr('AllFiles'), extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      fs.writeFile(result.filePath, data, (err) => {
        if (err) {
          console.error(getStr('ErrSave') + err.message)
        }
      })
    }
  }).catch(err => {
    console.error(err)
  })
})

ipc.on('saveproto', (evt, bytes, title) => {
  const parentWindow = (process.platform === 'darwin') ? null : BrowserWindow.getFocusedWindow()
  dialog.showSaveDialog(parentWindow, {
    title: getStr('SaveProto') + title,
    filters: [
      { name: getStr('MGCFiles'), extensions: ['mgc', 'MGC'] },
      { name: getStr('AllFiles'), extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      fs.writeFile(result.filePath, Buffer.from(bytes), (err) => {
        if (err) {
          console.error(getStr('ErrSave') + err.message)
        }
      })
    }
  }).catch(err => {
    console.error(err)
  })
})

ipc.on('savehtml', (evt, data) => {
  const parentWindow = (process.platform === 'darwin') ? null : BrowserWindow.getFocusedWindow()
  dialog.showSaveDialog(parentWindow, {
    title: getStr('ExpHTML'),
    filters: [
      { name: getStr('HTMLFiles'), extensions: ['html', 'htm'] },
      { name: getStr('AllFiles'), extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      fs.writeFile(result.filePath, data, (err) => {
        if (err) {
          console.error(getStr('ErrSave') + err.message)
        }
      })
    }
  }).catch(err => {
    console.error(err)
  })
})

ipc.on('saveForIcon', () => {
  if (filePath === '') saveAs()
  else {
    const buttons = [getStr('Save'), getStr('SaveAs'), getStr('Discard')]
    dialog.showMessageBox(mainWindow, {
      type: 'none',
      buttons,
      message: getStr('Choice')
    }).then(result => {
      switch (result.response) {
        case 0 :
          save()
          break
        case 1 :
          saveAs()
      }
    }).catch(err => {
      console.error(err)
    })
  }
})

// Ce message est envoyé par index.html quand l'utilisateur a cliqué sur l'icône d'ouverture de fichier
ipc.on('open', open)

ipc.on('resetdoc', () => {
  bmayClose = true
  filePath = ''
  mainWindow.setTitle('MathGraph32JS')
})

ipc.on('setdocumentdirty', () => {
  bmayClose = false
})

ipc.on('level', (evt, level) => {
  mainWindow.level = level
})

ipc.on('dysmode', (evt, bdysmode) => {
  mainWindow.dysmode = bdysmode
})

ipc.on('decimalDot', (evt, bdecimaldot) => {
  mainWindow.decimalDot = bdecimaldot
})

ipc.on('autoComplete', (evt, autoComplete) => {
  mainWindow.autoComplete = autoComplete
})

ipc.on('displaymeasures', (evt, bdisplay) => {
  mainWindow.displayMeasures = bdisplay
})

ipc.on('pointsAuto', (evt, bPointsAuto) => {
  mainWindow.pointsAuto = bPointsAuto
})

ipc.on('zoomOnWheel', (evt, zoomOnWheel) => {
  mainWindow.zoomOnWheel = zoomOnWheel
})

ipc.on('useLens', (evt, useLens) => {
  mainWindow.useLens = useLens
})

ipc.on('startFig', (evt, startFig) => {
  store.set('startFig', startFig)
})

ipc.on('setlang', (evt, lang) => {
  language = lang
})

ipc.on('setnewpath', (evt, path) => {
  filePath = path === '' ? newFilePath : path
  const name = filePath.split('\\').pop().split('/').pop()
  mainWindow.setTitle('MathGraph32JS-' + name)
})

ipc.on('mtgAppReady', onMtgReady)

app.on('ready', start)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

function open () {
  const parentWindow = (process.platform === 'darwin') ? null : BrowserWindow.getFocusedWindow()
  dialog.showOpenDialog(parentWindow, {
    title: getStr('OpenFig'),
    filters: [
      { name: getStr('MtgFiles'), extensions: [mtgFileExtension] },
      { name: getStr('AllFiles'), extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      fs.readFile(result.filePaths[0], 'latin1', (err, data) => {
        if (err) {
          console.error(getStr('ErrOpen') + err.message)
          return
        }
        newFilePath = result.filePaths[0]
        mainWindow.webContents.executeJavaScript('openFig(' + JSON.stringify(data) + ')')
      })
    }
  }).catch(err => {
    console.error(err)
  })
}

function saveAs () {
  const parentWindow = (process.platform === 'darwin') ? null : BrowserWindow.getFocusedWindow()
  dialog.showSaveDialog(parentWindow, {
    title: getStr('SaveFig'),
    filters: [
      { name: getStr('MtgFiles'), extensions: [mtgFileExtension] },
      { name: getStr('AllFiles'), extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      filePath = result.filePath
      const name = filePath.split('\\').pop().split('/').pop()
      mainWindow.setTitle('MathGraph32JS-' + name)
      mainWindow.webContents.executeJavaScript('save()')
    }
  }).catch(err => {
    console.error(err)
  })
}

function save () {
  try {
    mainWindow.webContents.executeJavaScript('save()')
  } catch (error) {
    console.error(error)
  }
}

function getLanguage () {
  language = app.getLocale().substring(0, 2)
  if (!['fr', 'en', 'es', 'de'].includes(language)) language = 'en'
  return language
}

function getStr (ch) {
  switch (language) {
    case 'fr' :
      return textFr[ch]
    case 'en' :
      return textEn[ch]
    case 'es' :
      return textEs[ch]
    case 'de':
      return textDe[ch]
  }
}
