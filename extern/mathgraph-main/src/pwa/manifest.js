/**
 * @fileOverview
 * Ce module injecte dans la page html le manifest.webmanifest dans la bonne langue
 * @see https://developer.samsung.com/internet/blog/en/2021/08/10/multiple-language-installable-web-apps-using-a-single-manifest-file)
 * Attention, l'article précédent parle de génération en amont, pas au runtime une fois la page chargée, c'est pour ça qu'on met d'abord le manifest fr dans la page puis on le modifie ici pour éventuellement changer la langue
 *
 * Concernant le manifest.json :
 * @see https://developer.mozilla.org/fr/docs/Web/Manifest
 * - screenshots
 *     visiblement chrome veut des screenshots sinon il propose pas d'installer…
 *     pourtant c'est sensé être facultatif :
 *     https://developer.mozilla.org/en-US/docs/Web/Manifest/Reference/screenshots
 *
 * - display_override
 *     cf https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/window-controls-overlay#enable-the-window-controls-overlay-in-your-app
 */
import manifestFr from './public/manifest.webmanifest' with { type: 'json' }

const descriptions = {
  es: 'Programa libre de geometria, análisis y simulación',
  en: 'Open source software of geometry, analysis and simulation',
  de: 'Open-Source-Software für Geometrie, Analyse und Simulation',
  // lui est inutile, il est déjà dans le manifest par défaut
  // fr: 'Logiciel libre de géométrie dynamique, d’analyse et de simulation',
}

/**
 * Injecte le manifest dans la page
 * @param lang
 */
function injectManifest (lang) {
  if (lang === 'fr') return // c'est déjà le bon manifest dans la page
  if (!descriptions[lang]) {
    return console.error(Error(`langue ${lang} non gérée => fr imposée`))
  }
  // on récupère l'élément link existant
  const link = document.head.querySelector('link[rel="manifest"]')
  if (!link) return console.error(Error('Pas trouvé le link manifest'))
  // et on lui change son contenu
  const description = descriptions[lang]
  const manifest = { ...manifestFr, description, lang }
  link.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }))
}

export default injectManifest
