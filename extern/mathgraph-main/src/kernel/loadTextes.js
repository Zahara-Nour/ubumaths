import { textes, getLanguage } from './kernel'

let lastLanguage, wasForEditor

/**
 * Initialise les textes (exportés par kernel), appelé par le loader
 * @param {string} language
 * @param {boolean} isForEditor
 * @returns {Promise<undefined>}
 */
async function loadTextes (language, isForEditor) {
  const lang = language || getLanguage()
  // attention, si on a déjà été appelé pour le player et qu'on est rappelé pour l'éditeur faut charger ce qu'il manque
  if (lang === lastLanguage && (wasForEditor || !isForEditor)) {
    // on nous demande la dernière langue chargée, c'est déjà fait
    return
  }
  if (lastLanguage && wasForEditor) {
    console.warn(Error(`Language ${lang} will override ${lastLanguage} previously loaded for all mathgraph instances of this page`))
  }
  let promises
  // si on a déjà chargé les textes de l'éditeur, faut le refaire quoi qu'il arrive,
  // sinon on pourrait avoir les textes de l'éditeur dans une langue et ceux du player dans une autre
  if (wasForEditor) {
    isForEditor = true
  } else {
    wasForEditor = isForEditor
  }
  if (lang === 'fr') {
    promises = [import('../textes/textesFr.js')]
    if (isForEditor) promises.push(import('../textes/textesFrAdd.js'))
  } else if (lang === 'de') {
    promises = [import('../textes/textesDe.js')]
    if (isForEditor) promises.push(import('../textes/textesDeAdd.js'))
  } else if (lang === 'es') {
    promises = [import('../textes/textesEs.js')]
    if (isForEditor) promises.push(import('../textes/textesEsAdd.js'))
  } else {
    promises = [import('../textes/textesEn.js')]
    if (isForEditor) promises.push(import('../textes/textesEnAdd.js'))
  }
  // on ajoute les textes chargés à l'objet textes du kernel
  return Promise.all(promises).then(esModules => {
    // on ajoute les textes dans l'ordre du tableau, donc le add en dernier
    for (const esModule of esModules) Object.assign(textes, esModule.default)
    lastLanguage = lang
  })
}

export default loadTextes
