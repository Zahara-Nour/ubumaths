/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Association Sésamath
 * @licence AGPL-3.0-or-later
 */
'use strict'

const loadDelay = 60 // en s

// On charge le même MathJax que mathgraph32
const mathJaxUrl = 'https://www.mathgraph32.org/js/MathJax3/es5/tex-svg.js'

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
    packages: { '[+]': ['color'] }
  },
  svg: {
    // cf http://docs.mathjax.org/en/latest/options/output/svg.html#the-configuration-block
    mtextInheritFont: true
  },
  options: {
    ignoreHtmlClass: 'tex2jax_ignore',
    processHtmlClass: 'tex2jax_process'
  },
  loader: {
    // la conversion donnait ça
    // load: ['input/tex', 'output/svg']
    // mais ça marchait pas, c'est bcp mieux avec
    load: ['[tex]/noerrors', '[tex]/color']
  }
}

// si on fait deux appels très rapprochés à loadMathJax,
// on peut se retrouver dans le cas où le 2e retourne Promise.resolve() alors que MathJax n'est pas encore ready
let mathJaxLoadingPromise

/**
 * Charge mathjax dans le <head> de la page courante
 * (appelé par le prepare de ActionEcrireTexte et ActionNommerPoint,
 * donc déclenche le chargement dès que le tableau des actions est construit,
 * seulement si l'une des actions a besoin de Mathjax)
 * @return {Promise}
 */
export default function loadMathJax () {
  // si on a déjà été appelé y'a rien à faire (c'est peut-être encore en cours ou déjà résolu)
  if (mathJaxLoadingPromise) return mathJaxLoadingPromise

  // faut le charger
  mathJaxLoadingPromise = new Promise((resolve, reject) => {
    // si qqun d'autre a déjà chargé MathJax (iep dans un nœud j3p précédent par ex),
    // pas la peine de le refaire si c'est la bonne version
    if (typeof MathJax === 'object' && /^3\./.test(MathJax.version)) {
      // on force notre config, au cas où qqun l'aurait configuré différemment
      // cf http://docs.mathjax.org/en/latest/web/configuration.html#configuring-mathjax-after-it-is-loaded
      MathJax.config = mathJaxConfig
      // c'est tout bon
      return resolve()
    }

    // faut charger MathJax
    window.MathJax = mathJaxConfig
    /* global MathJax */
    // on ajoute la résolution de la promesse quand il sera prêt
    // cf http://docs.mathjax.org/en/latest/web/configuration.html#performing-actions-during-startup
    MathJax.startup = {
      ready: () => {
        // on vire le timeout
        clearTimeout(timeout)
        MathJax.startup.defaultReady()
        MathJax.startup.promise.then(() => {
          // on résoud la promesse que retourne loadMathJax maintenant que MathJax est ready
          resolve()
        })
      } // ready
    } // window.MathJax.startup

    // chargement mathjax
    const eltScript = document.createElement('script')
    eltScript.type = 'text/javascript'
    // sinon ff râle avec du :
    // La demande d’accès aux cookies ou au stockage sur « https://cdn.jsdelivr.net/npm/mathjax@3/es5/input/tex/extensions/noerrors.js » a été bloquée parce que nous bloquons toutes les demandes d’accès au stockage par des sites tiers et que le blocage de contenu est activé.
    // ce qui est curieux car il n'y a aucune demande…
    eltScript.crossOrigin = 'anonymous'
    const url = window.mathJax3BaseUrl
      ? `${window.mathJax3BaseUrl}es5/tex-svg.js`
      : mathJaxUrl
    eltScript.src = url
    const head = document.getElementsByTagName('head')[0]
    head.appendChild(eltScript)
    // on ajoute un timeout de chargement
    const timeout = setTimeout(() => {
      reject(Error(`Mathjax non chargé après ${loadDelay}s d’attente (${url})`))
    }, loadDelay * 1000)
  })

  return mathJaxLoadingPromise
} // loadMathJax
