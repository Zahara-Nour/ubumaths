/*!
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 * @version 5.7.0
 */

import { getMathjaxBase } from 'src/kernel/kernel'

export default loadMathJax

const loadDelay = 40 // en s (avec peu de débit ça peut être assez long)

// en local on impose l'url de notre pnpm start avec notre port par défaut, si on veut autre chose faudra
// que l'appelant le précise avec du window.mathjax3Base ou mtgOptions.mathjax3Base
const mathJax3Uri = 'es5/tex-svg.js'

/* la config, on avait en v2 le js
https://www.mathgraph32.org/ftp/js/MathJax/MathJax.js?config=TeX-AMS-MML_SVG-full
avec la config :
 MathJax.Hub.Config({
  tex2jax: {
    inlineMath: [
      ['$', '$'],
      ['\\(', '\\)']
    ]
  },
  SVG: {
    mtextFontInherit: false
  },
  jax: ['input/TeX', 'output/SVG'],
  TeX: {
    extensions: ['color.js']
  },
  messageStyle: 'none'
})
qui donne, via https://mathjax.github.io/MathJax-demos-web/convert-configuration/convert-configuration.html
cette conf v3
 */
const mathJaxConfig = {
  tex: {
    inlineMath: [
      ['$', '$'],
      ['\\(', '\\)']
    ],
    // packages: {'[+]': ['noerrors', 'color']}
    packages: { '[+]': ['color', 'colortbl'] }
  },
  svg: {
    // cf http://docs.mathjax.org/en/latest/options/output/svg.html#the-configuration-block
    mtextInheritFont: false,
    mtextFont: 'Roboto'
  },
  options: {
    ignoreHtmlClass: 'tex2jax_ignore',
    processHtmlClass: 'tex2jax_process'
  },
  loader: {
    // la conversion donnait ça
    // load: ['input/tex', 'output/svg']
    // mais ça marchait pas, c'est bcp mieux avec
    load: ['[tex]/noerrors', '[tex]/color', '[tex]/colortbl']
  }
}

// si on fait deux appels très rapprochés à loadMathJax,
// on peut se retrouver dans le cas où le 2e retourne Promise.resolve() alors que MathJax n'est pas encore ready
let mathJaxLoadingPromise

function enhanceMathJax () {
  // pour la compatibilité on ajoute le MathJax.Hub
  // cf http://docs.mathjax.org/en/latest/upgrading/v2.html#version-2-compatibility-example
  MathJax.Callback = function (args) {
    if (Array.isArray(args)) {
      if (args.length === 1 && typeof (args[0]) === 'function') {
        return args[0]
      } else if (typeof (args[0]) === 'string' && args[1] instanceof Object &&
        typeof (args[1][args[0]]) === 'function') {
        return Function.bind.apply(args[1][args[0]], args.slice(1))
      } else if (typeof (args[0]) === 'function') {
        return Function.bind.apply(args[0], [window].concat(args.slice(1)))
      } else if (typeof (args[1]) === 'function') {
        return Function.bind.apply(args[1], [args[0]].concat(args.slice(2)))
      }
    } else if (typeof (args) === 'function') {
      return args
    }
    throw Error("Can't make callback from given data")
  } // MathJax.Callback

  MathJax.Hub = {
    Queue: function () {
      for (let i = 0, m = arguments.length; i < m; i++) {
        const fn = MathJax.Callback(arguments[i])
        MathJax.startup.promise = MathJax.startup.promise.then(fn)
      }
      // celui qui appelle Queue en v2 s'attend pas à récupérer une promesse,
      // on gère donc les plantages en ajoutant le catch
      // (faut aussi le faire pour pouvoir continuer à utiliser Hub.queue après un éventuel plantage d'une callback)
      return MathJax.startup.promise.catch(error => console.error(error))
    },
    Typeset: () => console.error(Error('Il ne faut plus utiliser MathJax.Hub.Typeset en v3, remplacer par MathJax.typesetPromise() ou MathJax.typeset() (http://docs.mathjax.org/en/latest/upgrading/v2.html#changes-in-the-mathjax-api)'))
  } // MathJax.Hub
}

/**
 * Charge mathjax dans le <head> de la page courante (appelé seulement par addLatex)
 * @param {string} [mathjax3Base] Un éventuel chemin vers le dossier de MathJax3 (qui devra contenir es5/tex-svg.js), sans slash de fin
 * @returns {Promise<undefined>}
 */
function loadMathJax (mathjax3Base) {
  // si on a déjà été appelé y'a rien à faire (c'est peut-être encore en cours ou déjà résolu)
  if (mathJaxLoadingPromise) return mathJaxLoadingPromise

  // faut le charger
  mathJaxLoadingPromise = new Promise((resolve, reject) => {
    // Depuis le 18/3/2025 on impose la fonte 'Roboto' sur tous les conteneurs de svg mtg32

    // si qqun d'autre a déjà chargé MathJax (iep dans un nœud j3p précédent par ex)
    // ça ne devrait pas être la peine de le refaire, mais c'est vraiment compliqué de s'assurer
    // qu'il a les bons packages avec la bonne config.
    // affecter `MathJax.config = mathJaxConfig` puis appeler `MathJax.startup.getComponents()`
    // fonctionne, sauf s'il manque des packages (dans ce cas il faudrait ajouter du
    // `\require(lePackage)` avant le code latex qui l'utilise)
    // Cf commit f1c029df pour une version avec ce fonctionnement
    // (ça fonctionnait pour les packages déjà chargé,
    //   mais l'ajout du package colortbl n'était pas pris en charge,
    //   ça donnait du `Undefined control sequence \columncolor`
    //   à la place d'afficher les commandes inconnues)
    // => on recharge toujours
    let base = mathjax3Base || getMathjaxBase()
    if (!base.endsWith('/')) base += '/'
    const mathJax3Url = base + mathJax3Uri

    if (typeof MathJax === 'object') {
      // si y'a déjà un script on le vire, sinon ça va pas forcément recharger
      for (const elt of document.getElementsByTagName('script')) {
        if (elt.src === mathJax3Url) {
          elt.parentNode.removeChild(elt)
        }
      }
    }

    // faut charger MathJax
    window.MathJax = mathJaxConfig
    // on ajoute la résolution de la promesse quand il sera prêt
    // cf http://docs.mathjax.org/en/latest/web/configuration.html#performing-actions-during-startup
    MathJax.startup = {
      ready: () => {
        // on vire le timeout
        clearTimeout(timeout)
        MathJax.startup.defaultReady()
        MathJax.startup.promise.then(() => {
          enhanceMathJax()
          resolve()
        })
      } // ready
    } // window.MathJax.startup

    // chargement mathjax
    const eltScript = document.createElement('script')
    eltScript.type = 'text/javascript'
    // faut préciser ça sinon ff peut râler (il doit y avoir un bout de code mathjax qui veut lire les cookies)
    eltScript.crossOrigin = 'anonymous'
    eltScript.src = mathJax3Url
    const head = document.getElementsByTagName('head')[0]
    // Modifs Yves pour résoudre le pb de chargement de MathJax en dev
    eltScript.id = 'MathJax-script'
    eltScript.async = true
    // Fin essai Yves
    head.appendChild(eltScript)
    // on ajoute un timeout de chargement
    const timeout = setTimeout(() => {
      const error = Error(`Mathjax non chargé après ${loadDelay}s d’attente`)
      // on ajoute ça pour que celui qui chopera cette erreur puisse l'afficher à l'utilisateur (et éventuellement éviter que ça remonte jusqu'à bugsnag)
      error.userFriendly = true
      reject(error)
    }, loadDelay * 1000)
  })

  return mathJaxLoadingPromise
} // loadMathJax
