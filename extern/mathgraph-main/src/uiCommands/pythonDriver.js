import { ceIn, getNewId } from 'src/kernel/dom'
import { addBrythonScripts } from 'src/uiCommands/pythonLoader'

/**
 * Charge brython pour exécuter du python sans console python
 * @param {MtgAppLecteurApi} mtgAppLecteurApi
 * @param {MtgOptions} mtgOptions
 * @param {MtgOptions} mtgOptions.mtgContainer Le conteneur pour la figure
 * @param {MtgOptions} mtgOptions.pythonCode Le code python a exécuter
 * @param {Array<string|FigDef>} [mtgOptions.commandsFigs] Une liste éventuelle de figures initiales (sinon ce sera figure vide et repère orthonormé)
 */
async function loadPythonDriver (mtgAppLecteurApi, mtgOptions) {
  const { mtgContainer, pythonCode, pythonCodeId } = mtgOptions
  if (!mtgContainer) throw Error('mtgContainer manquant')
  if (!pythonCode && !pythonCodeId) throw Error('Code python manquant')
  // console.log('loadPythonDriver avec', mtgOptions.pythonCode)
  // mtgOptions.pythonCode = `print("début du script python")\n${mtgOptions.pythonCode}\nprint("fin du script python")\n`
  // on masque le svg
  const svg = mtgContainer.querySelector('svg')
  if (!svg) throw Error('figure manquante')
  svg.style.display = 'none'
  const waitingElt = ceIn(mtgContainer, 'p', 'Chargement python en cours…')
  await addBrythonScripts()
  if (typeof window.brython !== 'function') return console.error(Error('brython n’est pas chargé'))
  mtgContainer.removeChild(waitingElt)
  svg.style.display = 'unset'

  // on met mtgAppLecteurApi en global pour que brython puisse le récupérer, mais il peut y en avoir déjà un
  let i = 1
  while (window[`mtgApp${i}`]) i++
  const appId = [`mtgApp${i}`]
  window[appId] = mtgAppLecteurApi

  const pythonOutput = ceIn(mtgOptions.mtgContainer, 'pre')
  pythonOutput.id = 'pythonOutput'
  pythonOutput.style.display = 'none'

  // récupère ce qui sort dans pythonOutput pour le mettre en console
  let lastOutputSize = 0
  const consoleWrapper = () => {
    // on debounce d'après la taille du <pre>, si ça a bougé en 0.3s on attendra 0.3s de plus
    const size = pythonOutput.textContent.length
    if (size === lastOutputSize || size > 20_000) {
      const text = pythonOutput.textContent
      pythonOutput.textContent = ''
      lastOutputSize = 0
      console.warn('Python commands output', text)
    } else {
      setTimeout(consoleWrapper, 300)
    }
  }
  pythonOutput.addEventListener('input', () => {
    lastOutputSize = pythonOutput.textContent.length
    setTimeout(consoleWrapper, 300)
  })

  // le tag script pour brython
  const brythonScript = ceIn(mtgOptions.mtgContainer, 'script')
  brythonScript.id = getNewId('mtgPython')
  brythonScript.setAttribute('type', 'text/python')
  // faut mettre le contenu après avoir précisé le type sinon c'est interprété comme du js
  if (pythonCode) {
    const escapedCode = pythonCode
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
    brythonScript.textContent = `\nfrom runner import runCode\nrunCode("${appId}", "${escapedCode}")\n`
  } else {
    brythonScript.textContent = `\nfrom runner import runById\nrunById("${appId}", "${pythonCodeId}")\n`
  }

  // retirer l'espace de "* /" pour ajouter du débug brython dans la console
  const brythonOpts = { ids: [brythonScript.id] /* * /, debug: 2 /* */ }

  await mtgAppLecteurApi.ready()
  try {
    // window.brython()
    window.brython(brythonOpts)
  } catch (error) {
    console.error(error)
  }
}

export default loadPythonDriver
