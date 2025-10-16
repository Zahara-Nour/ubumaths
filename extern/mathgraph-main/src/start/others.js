// 4 figures avec mtgLoad+fig, <mathgraph-player fig>, <mathgraph-player python-code-id>, mtgLoad+pythonCodeId, mtgLoad+jsCode
import { ceIn, ge, loadScript } from 'src/kernel/dom'
import { figRepOrthonorm } from 'src/kernel/figures'
import { arbrePythagorePython, fig1, figArbrePythag0 } from 'src/start/figures'
import { getOptsPythonCodeId } from 'src/start/uiCommands'

let elementsLoaded

// charge les définitions de nos custom tags
async function loadElements () {
  if (!elementsLoaded) {
    // import('../mathgraphElements.js') // marche pas
    elementsLoaded = import('../mathgraphElements.js?url')
      .then(({ default: url }) => loadScript(url))
  }
  return elementsLoaded
}

/**
 * Ajoute un tag <mathgraph-player> ou <mathgraph-editor> dans container
 * @param {HTMLElement} container
 * @param {Object<string, string>} attrs
 * @param {boolean} [isEditor=false]
 * @returns {Promise<void>}
 */
export async function addMtgElt (container, attrs, isEditor = false) {
  await loadElements()
  const elt = ceIn(container, isEditor ? 'mathgraph-editor' : 'mathgraph-player')
  for (const [attr, value] of Object.entries(attrs)) {
    elt.setAttribute(attr, value)
  }
}

/**
 * Ici on mélange tout en chargeant tout le monde en //
 * @param mtgOptions
 * @returns {Promise<void>}
 */
export async function playerMultEltAction (mtgOptions) {
  const main = ge('main')
  ceIn(main, 'p', 'Fig1 via mtgLoad+fig')
  const ct1 = ceIn(main, 'div')
  ceIn(main, 'hr')
  ceIn(main, 'p', 'Fig2 (jongleur) via <mathgraph-player python-code-id="…">')
  const ct2 = ceIn(main, 'div')
  ceIn(main, 'hr')
  ceIn(main, 'p', 'Fig3 via <mathgraph-player fig="…">')
  const ct3 = ceIn(main, 'div')
  ceIn(main, 'hr')
  ceIn(main, 'p', 'Fig4 via mtgLoad et pythonCodeId (arbre de pythagore)')
  const ct4 = ceIn(main, 'div')
  ceIn(main, 'hr')
  ceIn(main, 'p', 'Idem fig4 mais sans l’éditeur de code')
  const ct5 = ceIn(main, 'div')
  ceIn(main, 'hr')
  ceIn(main, 'p', 'Et un éditeur avec un repère ortho vide')
  const ct6 = ceIn(main, 'div')

  // on lance tout en parallèle dans cette liste de promesses
  const promises = []
  // fig1
  const opts1 = { ...mtgOptions, fig: fig1, isEditable: false }
  promises.push(window.mtgLoad(ct1, {}, opts1))
  // fig2
  const { pythonCodeId } = getOptsPythonCodeId()
  promises.push(addMtgElt(ct2, { 'python-code-id': pythonCodeId, fig: figRepOrthonorm, 'hide-commands': true }))
  // fig3
  promises.push(addMtgElt(ct3, { fig: figArbrePythag0, width: 300, height: 250 }))
  // fig4
  const { pythonCodeId: pci } = getOptsPythonCodeId({ pythonCodeId: 'myPythonCode2', pythonCode: arbrePythagorePython })
  const opts4 = { ...mtgOptions, pythonCodeId: pci, fig: figRepOrthonorm }
  promises.push(window.mtgLoad(ct4, {}, opts4))
  promises.push(window.mtgLoad(ct5, {}, { ...opts4, hideCommands: true }))
  // pour l'éditeur en dernièr, on impose une hauteur
  promises.push(window.mtgLoad(ct6, { height: 600 }, mtgOptions))
  // et on attend que tout ça soit chargé pour résoudre notre promesse
  await Promise.all(promises)
}
