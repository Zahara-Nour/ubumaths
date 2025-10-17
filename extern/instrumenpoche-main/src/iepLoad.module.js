/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Association Sésamath
 * @licence AGPL-3.0-or-later
 */
'use strict'
import iepLoadPromise from './iepLoadPromise'

/**
 * Callback iepLoad, appelée avec une erreur éventuelle en 1er argument, ou iepApp en 2e argument lorsque la figure est chargée
 * @callback iepLoadCallback
 * @param {Error} [error] erreur éventuelle
 * @param {IepApp} [iepApp] l'instance IepApp
 */

/**
 * Charge une animation iep
 * @module iepLoad
 * @param {HTMLElement} container
 * @param {string} xml Le script xml ou son url (absolue !)
 * @param {iepLoadOptions} [options]
 * @param {iepLoadCallback} [callback]
 * @return {undefined}
 */
export default function iepLoad (container, xml, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  } else if (typeof options !== 'object') {
    options = {}
  }
  if (typeof callback !== 'function') {
    callback = function iepLoadCallback (error) {
      if (error) console.error(Error(error))
      else (console.log('figure instrumenpoche chargée'))
    }
  }

  iepLoadPromise(container, xml, options)
    .then((iepApp) => callback(undefined, iepApp))
    .catch(callback)
}
