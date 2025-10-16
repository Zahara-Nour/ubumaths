import ace from 'ace-builds/src-noconflict/ace'
// lui est nécessaire pour nos options
import aceLangTools from 'ace-builds/src-noconflict/ext-language_tools'

// avec ça on a pas besoin d'autres imports, ils fonctionneront dynamiquement
// import 'ace-builds/webpack-resolver'
// mais la ligne qui précède ne fonctionne qu'avec webpack, pas vite
// faut donc préciser ça
// cf https://github.com/ajaxorg/ace/issues/4906#issuecomment-1226721227
import workerJavascriptUrl from 'ace-builds/src-noconflict/worker-javascript?url'
import 'ace-builds/src-noconflict/mode-javascript'
import 'ace-builds/src-noconflict/ext-prompt'
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright'

import { stringify } from 'sesajstools'

import { ceIn, addText, empty } from 'src/kernel/dom'
import { getStr } from 'src/kernel/kernel'
import { mtgCompleter } from 'src/uiCommands/autocomplete'
import { initDom } from 'src/uiCommands/common'
import { getCodeFromDom, safeEval } from 'src/uiCommands/javascriptDriver'

/** Les méthode de console que l'on autorise dans notre éditeur */
const exposedConsoleMethods = ['log', 'debug', 'error', 'info', 'warn']
/** les méthodes de console que l'on affiche dans l'output (si le code de mtgApp fait du console.warn ça ira sur la page mais pas s'il utilise console.log ou console.debug) */
const bindedConsoleMethods = ['error', 'warn']

const defaultContent = `// (les objets globaux Math, Number et console sont disponibles, mais pas window)
const a = addPointXY(3, 3, 'A')
`

const exemple1 = `
addFreePointXY(3, -2, 'A')
`

/**
 * Ajoute une console js pour piloter mtgAppLecteurApi dans container
 * @param {MtgAppLecteurApi} mtgAppLecteurApi
 * @param {MtgOptions} mtgOptions
 */
async function loadJavascriptEditor (mtgAppLecteurApi, mtgOptions) {
  const { divEditorRmq, divEditor, divEditorActions, divEditorOutput, hideFig, resetFig } = await initDom(mtgAppLecteurApi, mtgOptions)

  // on init le coté code
  divEditorRmq.innerHTML = getStr('apiCodeInfo1')
  let { javascriptCode, javascriptCodeId } = mtgOptions
  if (javascriptCodeId) {
    javascriptCode = getCodeFromDom(javascriptCodeId)
  }
  const initialJsCode = javascriptCode || defaultContent
  addText(divEditorOutput, getStr('apiCodeOutput'))
  ceIn(divEditorOutput, 'br')
  const jsOutput = ceIn(divEditorOutput, 'div')
  jsOutput.classList.add('mtgUiCommandsOutput')

  const addLineInfo = (error) => {
    if (error.stack) {
      const line = error.stack.split('\n').find(l => /at safeEval/.test(l))
      const chunks = /<anonymous>:(\d+):(\d+)/.exec(line)
      if (chunks) {
        const lineNb = Number(chunks[1]) - 4
        return ` (at line ${lineNb}:${chunks[2]})`
      }
    }
    return ''
  }
  const output = (name, ...args) => {
    const fakeErr = new Error('trace')
    for (const arg of args) {
      const content = arg instanceof Error
        ? String(arg) + addLineInfo(arg)
        : (typeof arg === 'string' ? arg : stringify(arg, 2)) + addLineInfo(fakeErr)
      ceIn(jsOutput, 'p', content)
    }
    // et on sort aussi dans la vraie console
    realConsole[name](...args)
  }
  // const realConsole = console // marchera pas car on réaffecte console[m]
  const realConsole = {}
  const fakedConsole = {}
  for (const name of exposedConsoleMethods) {
    realConsole[name] = console[name]
    fakedConsole[name] = output.bind(null, name)
  }

  // bouton reset exemple
  const resetLabel = javascriptCode ? getStr('apiCodeReset') : getStr('apiCodeResetEx')
  const resetCode = javascriptCode ?? defaultContent + exemple1
  const confirmMsg = javascriptCode ? getStr('apiCodeResetInitConfirm') : getStr('apiCodeResetExConfirm')
  const exButton = ceIn(divEditorActions, 'button')
  exButton.appendChild(document.createTextNode(resetLabel))
  exButton.addEventListener('click', () => {
    if (confirm(confirmMsg)) {
      editor.setValue(resetCode)
    }
  })

  if (!javascriptCode) {
    // bouton reset
    const resetButton = ceIn(divEditorActions, 'button')
    resetButton.appendChild(document.createTextNode(getStr('apiErase')))
    resetButton.addEventListener('click', () => {
      if (confirm(getStr('apiCodeResetConfirm'))) {
        editor.setValue(initialJsCode)
      }
    })
  }

  // bouton exec
  const execButton = ceIn(divEditorActions, 'button')
  execButton.appendChild(document.createTextNode(getStr('apiCodeExec')))
  execButton.addEventListener('click', async () => {
    try {
      empty(jsOutput)
      await hideFig({ delay: 500 })
      await resetFig()
      const code = editor.getValue()
      // on veut que les appels de console des méthodes de mtgApp causent aussi dans fakeConsole
      for (const m of bindedConsoleMethods) {
        console[m] = fakedConsole[m]
      }
      safeEval(mtgAppLecteurApi, code, fakedConsole)
      // et on restaurera la vraie console quand l'affichage sera terminé
      mtgAppLecteurApi.addFunctionToQueue(function restoreConsole () {
        for (const m of bindedConsoleMethods) {
          console[m] = realConsole[m]
        }
      })
    } catch (error) {
      console.error(error)
    }
  })

  // éditeur
  ace.config.setModuleUrl('ace/mode/javascript_worker', workerJavascriptUrl)
  const editor = ace.edit(divEditor)
  // penser à changer l'import si on change ce theme
  editor.setTheme('ace/theme/tomorrow_night_bright')
  const session = editor.getSession()
  session.setMode('ace/mode/javascript')
  editor.setOptions({
    enableBasicAutocompletion: true,
    // enableSnippets: true,
    enableLiveAutocompletion: true,
    wrap: 'free'
  })
  // on ne veut pas du warning "missing semicolon"
  if (session.$worker) session.$worker.send('changeOptions', [{ asi: true }])
  // pour l'autocompletion
  aceLangTools.addCompleter(mtgCompleter)
  // le code initial
  editor.setValue(initialJsCode)
  // on donne le focus
  editor.focus()
  // il faut aller à la fin du fichier sinon tout reste sélectionné et taper qqchose remplace le tout
  editor.navigateFileEnd()
  // et si on a fourni javascriptCode on lance un 1er rendu
  if (javascriptCode) {
    // mais faut attendre qu'il ait chargé sa figure initiale
    await mtgAppLecteurApi.ready()
    try {
      const code = editor.getValue()
      safeEval(mtgAppLecteurApi, code, fakedConsole)
    } catch (error) {
      console.error(error)
    }
  }
}

export default loadJavascriptEditor
