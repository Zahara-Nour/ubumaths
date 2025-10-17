/* Ce script se contente de charger le bon iepLoad suivant que le navigateur supporte les modules es6 ou pas
 *
 * Attention, ce script ne passe pas par babel ni webpack (même si c'est dans webpack.config.js qu'on le minifie)
 * Il doit donc rester en ES5 ONLY
 *
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Association Sésamath
 * @licence AGPL-3.0-or-later
 */
'use strict'
/**
 * Un "preLoader" qui chargera iepLoad en version es5 ou module es6 suivant les capacités du navigateur,
 * puis l'appellera quand il sera chargé
 * @param {HTMLElement} container
 * @param {string} xml Le script xml ou son url (absolue !)
 * @param {iepLoadOptions} [options]
 * @param {iepLoadCallback} [callback]
 */
window.iepLoad = function iepPreLoad (container, xml, options, callback) {
  var timeout = Number(options && options.timeout) || 30
  // on ne veut pas faire de require / import pour récupérer la version, qui par ailleurs n'est pas forcément incrémentée à chaque build
  // (idiot d'ajouter tout le bootstrap wepack pour ça alors que ce fichier ne fait que qq octets)
  // c'est un bout de code dans webpack qui viendra modifier cette ligne
  var timestamp = '' // ne pas modifier cette ligne, le timestamp sera mis à la copie dans build/, cf webpack.config.js
  var script = document.createElement('script')
  script.crossOrigin = 'anonymous'
  var isDev = /\.(local|dev)$/.test(location.hostname)
  var src = 'https://instrumenpoche.sesamath.' + (isDev ? 'dev' : 'net') + '/iep/js/iepLoad.'
  if ('noModule' in script) {
    // le navigateur gère les modules es6, pas sûr qu'il gère les imports dynamiques, ça ne coincerait que sur le load mathJax qui est très peu répandu
    // cf https://gist.github.com/ebidel/3201b36f59f26525eb606663f7b487d0
    // et https://stackoverflow.com/questions/60317251/how-to-feature-detect-whether-a-browser-supports-dynamic-es6-module-loading
    script.type = 'module'
    src += 'module'
  } else {
    script.type = 'application/javascript'
    src += 'es5'
  }
  src += '.min.js?' + timestamp

  // apparemment c'est mieux de faire dans cet ordre pour une meilleure compatibilité avec tous les navigateurs
  document.body.appendChild(script)
  script.addEventListener('load', function onLoadIepLoadReal () {
    // la fct globale iepLoad est maintenant le vrai loader
    clearTimeout(timerId)
    window.iepLoad(container, xml, options, callback)
  })
  script.src = src
  // et une gestion de timeout

  var timerId = setTimeout(function () {
    document.body.removeChild(script)
    var error = Error('Instrumenpoche n’est toujours pas chargé après ' + timeout + 's')
    if (typeof callback === 'function') callback(error)
    else console.error(error)
  }, timeout * 1000)
}
