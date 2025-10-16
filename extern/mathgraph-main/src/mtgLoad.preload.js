/* Charge mtgLoad en version es5 ou module suivant le navigateur
 * ATTENTION, ce fichier doit rester en es5, car il ne passe pas par babel ni webpack
 * (même s'il est minifié par terser puis copié dans docroot à chaque compil vite)
 */
/* eslint-env browser */

/**
 * Un "preLoader" qui chargera display en version es5 ou module suivant les capacités du navigateur,
 * puis l'appellera quand il sera chargé
 * Attention, ce preloader ne fonctionne qu'avec callback, ce n'est qu'après le premier appel que window.mtgLoad pourra retourner une promesse
 * @param {HTMLElement} container
 * @param {SvgOptions} svgOptions
 * @param {MtgOptions} mtgOptions
 * @param {mtgLoadCallback} [cb]
 * @returns Promise<MtgApp|MtgAppPlayer>|undefined (undefined si cb fournie)
 */
function mtgLoad (container, svgOptions, mtgOptions, cb) {
  'use strict'
  // on ne cherche pas à détecter le cas "local", car avec pnpm start on passe pas ici
  // (la détection pourrait amener à chercher mathgraph en local quand on utilise mathgraph
  // dans une autre appli testée localement)
  // ATTENTION à modifier aussi src/mathgraphElements.js si ce test change
  var src = window.mtgPublicPath || (
    /(local(host)?|\.sesamath.dev|dev.mathgraph32.org)$/.test(window.location.hostname)
      ? 'https://dev.mathgraph32.org/js/mtgLoad/' // dev
      : 'https://www.mathgraph32.org/js/mtgLoad/' // prod
  )

  var script = document.createElement('script')
  if ('noModule' in script) {
    // le navigateur gère les modules es6
    script.type = 'module'
    src += 'module' // ne pas modifier cette ligne
  } else {
    script.type = 'application/javascript'
    src += 'es5' // ne pas modifier cette ligne
  }

  // ça c'est dans tous les cas
  script.crossOrigin = 'anonymous'

  // on essaie de ne pas inclure deux fois le script js dans la page
  var found = false
  if (document.querySelectorAll) {
    var scripts = document.querySelectorAll('script')
    var i = 0
    while (!found && i < scripts.length) {
      if (scripts[i].src === src) found = true
      i++
    }
  }

  var loadingPromise
  if (typeof cb === 'function') {
    if (cb.length < 1) {
      console.error(Error('La callback passée à mtgLoad est invalide, elle doit prendre un ou deux arguments, l’éventuelle erreur en premier et l’appli instanciée en 2e'))
    }
  } else {
    // pas de cb, on retourne une promesse
    if (typeof Promise === 'function') {
      loadingPromise = new Promise(function (resolve, reject) {
        cb = function (error, app) {
          if (error) return reject(error)
          resolve(app)
        }
      })
    } else {
      // sinon c'est un très vieux nagigateur qui gère pas les promesses,
      // et on a pas encore chargé le polyfill => tant pis l'utilisateur ne récupèrera pas
      // l'instance de l'appli, mais ça affichera quand même sa figure
      console.error(Error('Ce navigateur n’implémente pas "Promise", il faut passer une callback à mtgLoad'))
    }
  }

  if (found) {
    // console.log('on a déjà un chargement en cours, on attend qu’il se termine pour appeler mtgLoad')
    // on peut pas mettre de listener, on ajoute un setInterval pour attendre que ce soit chargé
    var nbWait = 0
    var delay = 200
    var timeout = 10000
    var timerId = setInterval(function () {
      if (window.mtgLoad.isPreLoader) {
        nbWait++
        if (nbWait * delay > timeout) {
          clearTimeout(timerId)
          cb(Error('mathgraph n’est toujours pas chargé après ' + Math.round(timeout / 1000) + 's d’attente.'))
        }
      } else {
        clearTimeout(timerId)
        window.mtgLoad(container, svgOptions, mtgOptions, cb)
      }
    }, delay)
  } else {
    // apparemment c'est mieux de faire dans cet ordre pour une meilleure compatibilité avec tous les navigateurs
    // (ajout dans le dom puis ajout du listener puis affectation de src)
    document.body.appendChild(script)
    script.addEventListener('load', function onLoadRealLoader () {
      // la fct globale mtgLoad est maintenant le vrai loader, mais on vérifie quand même
      if (window.mtgLoad.isPreLoader || typeof window.mtgLoad !== 'function') {
        return cb(Error('Le chargement de mathgraph a échoué'))
      }
      window.mtgLoad(container, svgOptions, mtgOptions, cb)
    })
    script.src = src
  }

  // undefined si on a fourni cb
  return loadingPromise
}

// on met notre préloader en global, en attendant que le vrai s'y mette
window.mtgLoad = mtgLoad
// pour marquer notre préloader et vérifier qu'il a bien été écrasé par le mtgLoad original
window.mtgLoad.isPreLoader = true
