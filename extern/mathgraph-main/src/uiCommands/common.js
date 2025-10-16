import { ceIn, copyToClipBoard, empty } from 'src/kernel/dom'
import { figRepOrthonorm, figVide } from 'src/kernel/figures'

import './uiCommands.css'
import { getStr } from 'src/kernel/kernel'

const defaultFig = figRepOrthonorm
// les figures par défaut proposées au chargement si on n'en précise pas sont plus loin dans le code
// chercher le commentaire "figures par défaut"

/**
 *
 * @param {MtgAppLecteurApi} mtgAppLecteurApi
 * @param {MtgOptions} mtgOptions
 * @param {MtgOptions} mtgOptions.mtgContainer Le conteneur pour la figure
 * @param {MtgOptions} mtgOptions.commandsContainer Le conteneur pour la console de commandes
 * @param {Array<string|FigDef>} [mtgOptions.commandsFigs] Une liste éventuelle de figures initiales (sinon ce sera figure vide et repère orthonormé)
 */
export async function initDom (mtgAppLecteurApi, mtgOptions) {
  /**
   * Affiche cette figure
   * @param fig
   * @returns {Promise<void>}
   */
  const setFig = (fig) => {
    return mtgAppLecteurApi.setFig({ id, fig })
      .then(() => { lastFig = fig })
      .catch(error => console.error(error))
  }
  const { mtgContainer, commandsContainer, commandsFigs } = mtgOptions

  // il faut créer un div en absolute pour ace, sinon on voit rien, on lui crée un parent (relative) pour éditeur + bouton
  commandsContainer.classList.add('mtgUiCommands')
  const divEditorRmq = ceIn(commandsContainer, 'div')
  divEditorRmq.classList.add('mtgRmq')
  const divEditorCt = ceIn(commandsContainer, 'div')
  divEditorCt.classList.add('mtgUiCommandsEditor')
  // et dedans le div qu'on donne à ace
  const divEditor = ceIn(divEditorCt, 'div')
  // et celui qui contiendra les boutons
  const divEditorActions = ceIn(commandsContainer, 'div')
  divEditorActions.classList.add('mtgActions')
  const divEditorOutput = ceIn(commandsContainer, 'div')
  // on passe au conteneur de la figure
  // Version 8.4 et suivantes : le svg de la figure est inclus dans un autre svg global
  let svg = mtgContainer.querySelector('svg')?.querySelector('svg')
  // on lui colle sa classe
  mtgContainer.classList.add('mtgFigCommandedContainer')

  // la liste des figures de réinitialisation possibles
  const figChoices = []
  // on regarde si on nous passe une liste de choix
  if (Array.isArray(commandsFigs)) {
    // on vérifie ce qu'on nous donne
    for (const { name, fig, figRef } of commandsFigs) {
      if (!name) {
        console.error('Il faut fournir un nom pour les figures listées dans l’option commandsFigs')
        continue
      }
      if (fig) {
        figChoices.push({ name, fig })
      } else if (figRef) {
        // pas un pb de mettre cet import dans une boucle, il n'est réellement fait qu'au 1er appel
        const figures = await import('src/kernel/figures.js')
        if (figRef in figures) {
          figChoices.push({ name, fig: figures[figRef] })
        } else {
          console.error(`${figRef} n’est pas un code de figure connu, ignoré (${name})`)
        }
      } else {
        console.error(`Il faut fournir fig ou figRef, name seul ne suffit pas (${name})`)
      }
    }
  } else {
    // les figures par défaut
    figChoices.push({ name: getStr('apiFigEmpty'), fig: figVide })
    figChoices.push({ name: getStr('apiRepOrt'), fig: figRepOrthonorm })
  }

  // on regarde s'il y a déjà une figure dans le dom
  let divSvg, figInitiale, lastFig
  if (svg) {
    if (!svg.parentElement) throw Error('La figure n’est pas insérée comme attendu dans le DOM')
    divSvg = svg.parentElement.parentElement
    figInitiale = mtgAppLecteurApi.getBase64Code()
    lastFig = figInitiale
    // on l'ajoute en premier dans la liste
    figChoices.unshift({ name: getStr('apiFigInit'), fig: figInitiale })
  } else {
    // on initialise avec la première figure de la liste (qui peut être vide,
    // pour ne pas laisser la possibilité de changer la figure de départ)
    // Si elle est vide et que l'utilisateur n'a pas filé de fig, on prend celle par défaut
    lastFig = figChoices[0]?.fig ?? defaultFig
    divSvg = ceIn(mtgContainer, 'div')
    await mtgAppLecteurApi.setFig({ fig: lastFig, container: divSvg, width: 800, height: 600 })
    // Depuis la version 8.4, le svg de la figure est encapsulé dans un svg global dont l'id commence par Glob
    svg = divSvg.querySelector('svg').querySelector('svg')
    // il faut préciser width et height sur le div conteneur car le svg est en absolute, on récupère sa taille
    const { width, height } = getComputedStyle(svg)
    divSvg.style.width = `${width + 2}px` // pour le border
    divSvg.style.height = `${height + 2}px` // pour le border
  }

  // il faut ajouter un div autour de divSvg car il a un border none imposé,
  // pour ses calculs de positionnement
  // ce sera divFig, mais après Rmq
  const divFigRmq = ceIn(mtgContainer, 'div', getStr('apiStartFig'))
  divFigRmq.classList.add('mtgRmq')
  const divFig = ceIn(mtgContainer, 'div')
  divFig.classList.add('mtgFigCommanded')
  // et on déplace le divSvg dedans
  divFig.appendChild(divSvg)

  // div pour les boutons mtg
  const divFigActions = ceIn(mtgContainer, 'div')
  divFigActions.classList.add('mtgActions')
  // on a besoin de l'id du svg pour certaines méthodes de l'api Lecteur
  const { id } = svg

  if (figChoices.length) {
    ceIn(divFigActions, 'span', {}, getStr('apiCodeResetWith'))
    if (figChoices.length < 4) {
      // jusqu'à 3 on laisse des boutons
      for (const { name, fig } of figChoices) {
        const resetBtn = ceIn(divFigActions, 'button', {}, name)
        resetBtn.addEventListener('click', () => {
          setFig(fig)
        })
      }
    } else {
      // un select avec la liste de choix de figures
      const select = ceIn(divFigActions, 'select')
      let i = 0
      for (const { name, fig } of figChoices) {
        const option = ceIn(select, 'option', {}, name)
        option.value = String(i)
        if (fig === lastFig) option.selected = true
        i++
      }
      select.addEventListener('input', (event) => {
        const index = Number(event.target.value)
        const { fig } = figChoices[index]
        if (fig) {
          setFig(fig)
        } else {
          console.error(Error(`selectListener with incorrect value ${index}`))
        }
      })
      // avec le select on ne laisse pas le flex par défaut qui fait flotter le texte
      // Réinitialiser… loin du select
      divFigActions.style.justifyContent = 'center'
    }
  }

  // un div pour afficher la figure ou l'importer, superposé à la figure
  const textAreaCt = ceIn(mtgContainer, 'div')
  textAreaCt.classList.add('mtgFigExchangeCt')
  const textAreaRmq = ceIn(textAreaCt, 'p')
  textAreaRmq.classList.add('mtgRmq')
  // attention, il faut que les textes prennent le même nombre de lignes (à peu près),
  // sinon on pourrait avoir une 2e barre de scroll vertical
  // régler ça dans src/uiCommands/uiCommands.css (.mtgFigExchangeCt textarea height)
  const closeRmq = getStr('apiCodeInfoCopy')
  const importRmq = getStr('apiCodeInfoPaste')
  const textArea = ceIn(textAreaCt, 'textarea')
  const divPrintActions = ceIn(textAreaCt, 'div')
  divPrintActions.classList.add('mtgActions')
  const closeLabel = 'Fermer'
  const importLabel = 'Importer'
  // le bouton pour fermer ce "popup"
  const closeBtn = ceIn(divPrintActions, 'button', {}, closeLabel)
  closeBtn.addEventListener('click', () => {
    textAreaCt.style.display = 'none'
    if (closeBtn.textContent === importLabel) {
      const fig = textArea.value.trim()
      if (fig) setFig(fig)
      // sinon on dit rien, ça correspond à une annulation
    }
    empty(textArea)
    textArea.value = ''
  })

  // un div pour les boutons de récup
  const divFigSave = ceIn(mtgContainer, 'div')
  divFigSave.classList.add('mtgActions')

  // btn import
  ceIn(divFigSave, 'button', getStr('apiCodeImport'))
    .addEventListener('click', () => {
      empty(textArea)
      textArea.value = ''
      closeBtn.textContent = importLabel
      textAreaRmq.textContent = importRmq
      textAreaCt.style.display = 'block'
    })

  // btn copier
  const copyBtn = ceIn(divFigSave, 'button', getStr('apiCodeCopy'))
  copyBtn.addEventListener('click', async () => {
    const fig = mtgAppLecteurApi.getBase64Code()
    if (await copyToClipBoard(fig)) {
      textAreaCt.style.display = 'none'
      alert(getStr('apiCodeClipboardOk'))
    } else {
      alert(getStr('apiCodeClipboardKo'))
    }
  })

  // bouton afficher le code de la figure
  ceIn(divFigSave, 'button', getStr('apiCodeDisplay'))
    .addEventListener('click', () => {
      empty(textArea)
      textArea.value = mtgAppLecteurApi.getBase64Code()
      closeBtn.textContent = closeLabel
      textAreaRmq.textContent = closeRmq
      textAreaCt.style.display = 'block'
    })

  // bouton télécharger
  ceIn(divFigSave, 'button', getStr('apiCodeDownload'))
    .addEventListener('click', () => {
      const doc = mtgAppLecteurApi.getDoc(id)
      doc.saveAs('figure')
    })

  // fcts pour afficher / masquer la figure
  // il faut mémoriser les éléments avec l'attribut visibility: visible
  // contenu dans divFig car il faut les passer à hidden aussi (sinon ils sont
  // visibles même si leur parent est hidden, c'est pas comme display:none)
  let visiblesElts, pMsg
  const showFig = () => {
    if (pMsg?.parentNode) pMsg.parentNode.removeChild(pMsg)
    divFig.style.visibility = 'visible'
    for (const elt of visiblesElts) elt.setAttribute('visibility', 'visible')
  }
  const hideFig = ({ delay = 0, message = '' } = {}) => {
    return new Promise((resolve) => {
      divFig.style.visibility = 'hidden'
      visiblesElts = divFig.querySelectorAll('[visibility=visible]')
      for (const elt of visiblesElts) elt.setAttribute('visibility', 'hidden')
      if (message) {
        pMsg = ceIn(mtgContainer, 'p', message)
      } else if (pMsg?.parentNode) {
        pMsg.parentNode.removeChild(pMsg)
      }
      if (delay) {
        setTimeout(() => {
          showFig()
          resolve()
        }, delay)
      } else {
        resolve()
      }
    })
  }
  // et on retourne nos trucs
  const resetFig = () => setFig(lastFig)
  return { divEditorRmq, divEditor, divEditorActions, divEditorOutput, divFigRmq, divFig, divFigActions, hideFig, resetFig, showFig }
}
