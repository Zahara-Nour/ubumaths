// Ce script ne sert que pour le dev, utilisé par webpack-dev-server, chargé comme dev.js (cf webpack.config.js)
import { addElement, empty } from 'sesajstools/dom'
import iepLoadPromise from '../src/iepLoadPromise'

function displayError (error) {
  console.log('displayError avec', error)
  console.error(error)
  const pre = document.createElement('pre')
  const txt = document.createTextNode(error.toString())
  pre.appendChild(txt)
  errorsContainer.appendChild(pre)
}
function load (fig) {
  // on veut chopper les erreurs pour le signaler sur la page
  const consoleError = console.error
  let nbErrors = 0
  console.error = function () {
    consoleError.apply(console, arguments)
    nbErrors++
  }
  iepLoadPromise(container, fig, { debug: true, zoom: true }).then((app) => {
    iepApp = app
    iepApp.docs[0].goFast(50, () => {
      // fini, on remet la bonne fct
      console.error = consoleError
      if (nbErrors) {
        displayError(`figure chargée et animation à la fin mais il y a eu ${nbErrors} erreur${nbErrors ? 's' : ''} (voir la console pour les détails)`)
      }
    })
  }).catch(displayError)
}
function loadFixture (num) {
  const { host, protocol } = window.location
  const url = `${protocol}//${host}/fixtures/${num}.xml`
  load(url)
}
function loadBibIep (id) {
  const url = `https://ressources.sesamath.net/coll_docs/bibliotheque_iep/valide/scr_iep_${id}.xml`
  load(url)
}
function loadBibli (id) {
  return fetch(`https://bibliotheque.sesamath.net/api/public/${id}`).then(response => {
    if (!response.ok) throw Error(`HTTP error ${response.status} ${response.statusText}`)
    return response.json()
  }).then(({ data: ress }) => {
    if (iepApp) iepApp.flush()
    load(ress.parametres.xml || ress.parametres.url)
  }).catch(displayError)
}

function onHashChange () {
  empty(container)
  empty(errorsContainer)
  const chunks = /^#([a-z]+)([0-9]+)$/.exec(window.location.hash)
  if (chunks) {
    if (chunks[1] === 'xml') return loadFixture(chunks[2])
    if (chunks[1] === 'bibiep') return loadBibIep(chunks[2])
    if (chunks[1] === 'sesabibli') return loadBibli(chunks[2])
    displayError(`hash ${window.location.hash} non géré, affichage du sommaire`)
  }
  // ni l'un ni l'autre, on affiche le sommaire
  let li, i
  const ul = addElement(container, 'ul')
  for (i = 0; i < 8; i++) {
    li = addElement(ul, 'li')
    addElement(li, 'a', { href: `#xml${i}` }, `script fixtures/${i}.xml`)
  }
  // qq scripts pris au hasard
  ;['001', '042', '055', '176'].forEach(id => {
    li = addElement(ul, 'li')
    addElement(li, 'a', { href: `#bibiep${id}` }, `bibiep${id}`)
  })
  // et qq id de la bibli
  ;['12147'].forEach(id => {
    li = addElement(ul, 'li')
    addElement(li, 'a', { href: `#sesabibli${id}` }, `sesabibli${id}`)
  })
  addElement(container, 'p', {}, '(vous pouvez ensuite changer le n° XXX de #bibiepXXX à la main pour charger un autre xml https://ressources.sesamath.net/coll_docs/bibliotheque_iep/valide/scr_iep_XXX.xml)')
}

try {
  module.hot.accept()
} catch (error) {
  console.error(error)
  // pas la peine d'aller plus loin
  throw Error('Ce module ne fait rien en dehors de webpack-dev-server en local')
}

// on est en dev avec webpack-dev-server
const container = document.getElementById('iepRoot')
if (!container) throw Error('Il manque le conteneur #iepRoot')
const errorsContainer = document.getElementById('errors')
let iepApp

window.onhashchange = onHashChange
// faut le lancer au chargement
onHashChange()
