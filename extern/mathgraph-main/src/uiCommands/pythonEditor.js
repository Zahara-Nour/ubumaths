import ace from 'ace-builds/src-noconflict/ace'
// lui est nécessaire pour nos options
import aceLangTools from 'ace-builds/src-noconflict/ext-language_tools'
// avec ça on a pas besoin d'autres imports, ils fonctionneront dynamiquement
// import 'ace-builds/webpack-resolver'
// mais la ligne qui précède ne fonctionne qu'avec webpack, pas vite
// faut donc préciser ça
import 'ace-builds/src-noconflict/mode-python'
import 'ace-builds/src-noconflict/ext-prompt'
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright'

import { stringify } from 'sesajstools'

import { ceIn, addText, empty, ge, getNewId } from 'src/kernel/dom'
import { getStr } from 'src/kernel/kernel'
import { initDom } from './common'
import { mtgCompleter } from './autocomplete'
import { addBrythonScripts } from './pythonLoader'

// pour le mode python
// import 'ace-builds/src-noconflict/mode-python'
// import 'ace-builds/src-noconflict/snippets/python'
// le theme
// import 'ace-builds/src-noconflict/theme-twilight'

// ça peut pas être une constante, faut appeler getStr au runtime
// car dans la version locale (tous les js ensemble) ce fichier est importé
// avant que les textes ne soient chargés.
const getDefaultContent = () => `
# ${getStr('apiCodeInfo2')}
# A = addPointXY(3, 3, 'A')
`

const exemple1 = `
A = addPointXY(-3, 2, 'A', 'red', 'X')\nB = addPointXY(3, -5, 'B', 'blue', 'O')\nd = addLineAB(A, B, 'd', 'green', '.', 3)
`

// brython ne supporte pas qu'on l'appelle deux fois avec le même id,
// même si entre temps le script avec cet id a disparu du dom
let i = 1
const getNewBrythonId = () => `mtgBrython${i++}`

/**
 * Ajoute une console python pour piloter mtgAppLecteurApi dans container
 * @param {MtgAppLecteurApi} mtgAppLecteurApi
 * @param {MtgOptions} mtgOptions
 * @param {HTMLElement} mtgOptions.mtgContainer Le conteneur pour la figure
 * @param {HTMLElement} mtgOptions.commandsContainer Le conteneur pour la console de commandes
 * @param {Array<string|FigDef>} [mtgOptions.commandsFigs] Une liste éventuelle de figures initiales (sinon ce sera figure vide et repère orthonormé)
 */
async function loadPythonEditor (mtgAppLecteurApi, mtgOptions) {
  // on met mtgAppLecteurApi en global pour que brython puisse le récupérer, mais il peut y en avoir déjà un
  let i = 1
  while (window[`mtgApp${i}`]) i++
  const appId = [`mtgApp${i}`]
  window[appId] = mtgAppLecteurApi

  // init du dom
  const { divEditorRmq, divEditor, divEditorActions, divEditorOutput, hideFig, resetFig, showFig } = await initDom(mtgAppLecteurApi, mtgOptions)
  // on met un message d'attente
  await hideFig({ message: 'Chargement Python en cours…' })
  await addBrythonScripts()
  if (typeof window.brython !== 'function') return console.error(Error('brython n’est pas chargé'))
  showFig()

  // on init le coté code
  divEditorRmq.innerHTML = getStr('apiCodeInfo1')
  let { commandsContainer, pythonCode, pythonCodeId } = mtgOptions
  if (!commandsContainer) throw Error('commandsContainer n’a pas été construit')
  if (pythonCodeId) {
    const elt = ge(pythonCodeId, true)
    if (elt) {
      pythonCode = elt.textContent
    } else {
      console.error(`Aucun élément #${pythonCodeId} => option pythonCodeId ignorée`)
    }
  }

  addText(divEditorOutput, getStr('apiCodeOutput'))
  ceIn(divEditorOutput, 'br')
  const pythonOutput = ceIn(divEditorOutput, 'div')
  pythonOutput.id = getNewId('mtgPythonOutput')
  pythonOutput.classList.add('mtgUiCommandsOutput')

  // on fake la console pour que les error/warning de mtgApp s'affichent sur la page
  const addContextInfo = (error) => {
    if (error.stack) {
      console.log(error.stack)
      const lines = error.stack.split('\n')
      // on regarde si on trouve getDefault, dans ce cas c'est la fonction qui suit qui nous intéresse
      const index = lines.findIndex(l => l.includes('at getDefault '))
      console.log(`on a trouvé ${index} parmi`, lines)
      if (index !== -1) {
        const chunks = /at \w+\.([^ ]+) /.exec(lines[index + 1])
        if (chunks) return ` (function ${chunks[1]})`
      }
    }
    return ''
  }
  const output = (name, ...args) => {
    for (const arg of args) {
      const content = arg instanceof Error
        ? String(arg)
        : (typeof arg === 'string' ? arg : stringify(arg, 2))
      ceIn(pythonOutput, 'p', content + addContextInfo(new Error('justForTracing')))
    }
    // et on sort aussi dans la vraie console
    realConsole[name](...args)
  }
  // const realConsole = console // marchera pas car on réaffecte console[m]
  const realConsole = {}
  const fakedConsole = {}
  for (const name of ['warn', 'error']) {
    realConsole[name] = console[name]
    fakedConsole[name] = output.bind(null, name)
  }
  const stubConsole = () => {
    for (const name of ['warn', 'error']) {
      console[name] = fakedConsole[name]
    }
  }
  const restoreConsole = () => {
    for (const name of ['warn', 'error']) {
      console[name] = realConsole[name]
    }
  }
  const restoreDelay = 3000 // un peu pifométrique…

  const initialPythonCode = pythonCode || getDefaultContent()

  // bouton reset exemple
  const resetLabel = pythonCode ? getStr('apiCodeReset') : getStr('apiCodeResetEx')
  const resetCode = pythonCode ?? getDefaultContent() + exemple1
  const confirmMsg = pythonCode ? getStr('apiCodeResetInitConfirm') : getStr('apiCodeResetExConfirm')
  const exButton = ceIn(divEditorActions, 'button')
  exButton.appendChild(document.createTextNode(resetLabel))
  exButton.addEventListener('click', () => {
    if (confirm(confirmMsg)) {
      editor.setValue(resetCode)
    }
  })

  if (!pythonCode) {
    // bouton reset
    const resetButton = ceIn(divEditorActions, 'button')
    resetButton.appendChild(document.createTextNode(getStr('apiErase')))
    resetButton.addEventListener('click', () => {
      if (confirm(getStr('apiCodeResetConfirm'))) {
        editor.setValue(initialPythonCode)
      }
    })
  }

  // bouton exec
  const execButton = ceIn(divEditorActions, 'button')
  execButton.appendChild(document.createTextNode(getStr('apiCodeExec')))
  execButton.addEventListener('click', async () => {
    try {
      empty(pythonOutput)
      await hideFig({ delay: 500 })
      await resetFig()
      stubConsole()
      window.brython(brythonOpts)
      setTimeout(() => { restoreConsole() }, restoreDelay)
    } catch (error) {
      console.error(error)
    }
  })

  // éditeur
  const editor = ace.edit(divEditor)
  // penser à changer l'import si on change ce theme
  editor.setTheme('ace/theme/tomorrow_night_bright')
  const session = editor.getSession()
  session.setMode('ace/mode/python')
  editor.setOptions({
    enableBasicAutocompletion: true,
    // enableSnippets: true,
    enableLiveAutocompletion: true,
    wrap: 'free'
  })
  // pour l'autocompletion
  aceLangTools.addCompleter(mtgCompleter)

  editor.setValue(initialPythonCode)
  // on donne le focus
  editor.focus()
  // il faut aller à la fin du fichier sinon tout reste sélectionné et taper qqchose remplace le tout
  editor.navigateFileEnd()

  // et il faut le mettre en global pour que brython puisse l'utiliser
  let editorName = 'aceEditor'
  if (window.aceEditor) {
    // faut ajouter un suffixe
    let i = 2
    while (window[`aceEditor${i}`]) i++
    editorName = `aceEditor${i}`
  }
  window[editorName] = editor

  // le tag script pour brython, on lui met un id pour ne lancer que celui-là
  const brythonScript = ceIn(commandsContainer, 'script')
  brythonScript.id = getNewBrythonId()
  brythonScript.setAttribute('type', 'text/python')
  // faut mettre le contenu après le type sinon c'est interprété comme du js
  brythonScript.textContent = `
from runner import setOutput, runAce
setOutput("${pythonOutput.id}")
runAce("${appId}", "${editorName}")
`
  // retirer l'espace de "* /" pour ajouter du débug brython dans la console
  const brythonOpts = { ids: [brythonScript.id] /* * /, debug: 2 /* */ }

  // et si on a fourni pythonCode on lance un 1er rendu
  if (pythonCode) {
    // mais faut attendre qu'il ait chargé sa figure initiale
    await mtgAppLecteurApi.ready()
    try {
      stubConsole()
      window.brython(brythonOpts)
      setTimeout(() => { restoreConsole() }, restoreDelay)
    } catch (error) {
      console.error(error)
    }
  }
}

export default loadPythonEditor
