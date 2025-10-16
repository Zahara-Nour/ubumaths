import { ge } from 'src/kernel/dom'

export function getCodeFromDom (javascriptCodeId) {
  const elt = ge(javascriptCodeId, true)
  if (elt) {
    return elt.textContent
  }
  console.error(`Aucun élément #${javascriptCodeId} => option javascriptCodeId ignorée`)
}

export function safeEval (mtgApp, jsCode, console) {
  if (typeof jsCode !== 'string') throw TypeError(`type ${typeof jsCode} invalide pour safeEval`)
  // on pourrait virer les commentaires, mais ça va fausser le calcul du n° de ligne
  // on regarde si en virant les /* */ il reste un /*,
  // si oui on les vire, sinon on laisse tout
  const tmpCode = jsCode
    // les /* */ en multi-ligne
    .replace(/\/\*.*?\*\//msg, '')
  const tmpCode2 = tmpCode
    // mais aussi après un éventuel /* qui resterait (non fermé ça fait planter notre eval)
    .replace(/\/\*.*$/ms, '')
  if (tmpCode2 !== tmpCode) {
    // il y a un /* non fermé, on garde la version nettoyée
    jsCode = tmpCode2
  }

  // @see https://blog.risingstack.com/writing-a-javascript-framework-sandboxed-code-evaluation/
  // On utilise pas le weakMap qu'il propose car on n'évalue chaque expression qu'une seule fois
  // (son exemple est pour compiler le code d'une fonction qui sera appelée de nombreuses fois)
  // On crée le proxy qui va intercepter tous les appels de variables/fonctions
  const proxyHandler = {
    // si has retourne toujours true, le `in sandbox` sera toujours true et le code évalué ne remontera jamais au scope global
    // car toutes les variables sont vues comme existante dans le scope local (mis avec le with)
    has: () => true,
    // le Symbol.unscopables est là pour les propriétés qui ne sont pas contraintes par le with => on empêche ainsi de remonter au scope global pour celles-là
    get: (target, key) => key === Symbol.unscopables ? undefined : target[key]
  }
  // on autorise mtgApp, Math, Number et console dans le code js évalué, … rien d'autre (pas window)
  const globalProxied = { Math, Number, console, mtgApp }
  // et on ajoute toutes les méthodes de mtgApp
  for (const meth of Object.keys(mtgApp)) {
    if (typeof mtgApp[meth] !== 'function') continue
    globalProxied[meth] = mtgApp[meth].bind(mtgApp)
  }
  const sandboxProxy = new Proxy(globalProxied, proxyHandler)
  // et on wrap l'expression avec un with pour limiter le scope au sandbox qui sera passé à la fct
  const src = `with (sandbox) {
  try {
    ${jsCode}
  } catch (error) {
    console.error(error) 
  } 
}`
  // ça ressemble à de l'eval, mais ici c'est très encadré
  // eslint-disable-next-line no-new-func
  const runner = new Function('sandbox', src)
  runner(sandboxProxy)
}

/**
 * Lance le code js, sans éditeur js
 * @param {MtgAppLecteurApi} mtgAppLecteurApi
 * @param {MtgOptions} mtgOptions
 * @param {MtgOptions} mtgOptions.mtgContainer Le conteneur pour la figure
 * @param {MtgOptions} mtgOptions.javascriptCode Le code javascript a exécuter
 * @param {Array<string|FigDef>} [mtgOptions.commandsFigs] Une liste éventuelle de figures initiales (sinon ce sera figure vide et repère orthonormé)
 */
async function loadJavascriptDriver (mtgAppLecteurApi, mtgOptions) {
  if (!mtgOptions.mtgContainer) throw Error('Il faut fournir un mtgContainer dans les options')
  const code = mtgOptions.javascriptCodeId
    ? getCodeFromDom(mtgOptions.javascriptCodeId)
    : mtgOptions.javascriptCode
  if (!code) throw Error('Il faut fournir du code js dans les options (javascriptCode ou javascriptCodeId)')

  safeEval(mtgAppLecteurApi, code, console)
}

export default loadJavascriptDriver
