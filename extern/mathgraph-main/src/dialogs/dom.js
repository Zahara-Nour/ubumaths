/*
 * Created by yvesb on 04/04/2017.
 */
import { ceIn, ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

/**
 * Crée un input (de type text par défaut) et le retourne (sans l'insérer dans le dom, utiliser addInput pour ça)
 * @param {Object} [attrs] les attributs qui seront mis sur l'input créé
 * @returns {HTMLInputElement}
 * @constructor
 */
export function getMtgInput (attrs = {}) {
  if (!attrs.type) attrs.type = 'text'
  const input = ce('input', attrs)
  input.setAttribute('spellcheck', 'false')
  input.isRed = false
  input.onblur = function () {
    if (input.isRed) {
      input.style.backgroundColor = '#FFFFFF'
    }
  }
  input.marquePourErreur = function () {
    input.style.backgroundColor = '#F5a9BC'
    input.isRed = true
  }
  input.demarquePourErreur = function () {
    if (input.isRed) {
      input.style.backgroundColor = '#FFFFFF'
    }
    input.isRed = false
  }
  input.onkeyup = function () {
    if (input.isRed) {
      input.style.backgroundColor = '#FFFFFF'
    }
    input.isRed = false
  }
  return input
}

/**
 *
 * @param {Object} options
 * @param {HTMLElement} options.container
 * @param {string} [options.label] Si présent ça ajoutera un tag <label> autour de l'input
 * @param {Object<string, string>} [options.attrs] Des attributs à ajouter à l'input
 * @return {HTMLInputElement}
 */
export function addInput ({ container, label, attrs } = {}) {
  if (label) {
    container = ceIn(container, 'label', label)
    // et on ajoute un peu de marges pour éviter de trop coller le label à l'input
    if (typeof attrs.style !== 'string') attrs.style = ''
    attrs.style = 'margin:0.2em 1em;'
  }
  return ceIn(container, 'input', attrs)
}
