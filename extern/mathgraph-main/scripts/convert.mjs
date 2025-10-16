/**
 * Converti du code base64 en fichier mgj
 * Ce fichier est compilé par vite en mode ssr (`pnpm build-cli`) dans dist/cli/convert.mjs
 * et il peut ensuite être copié n'importe où pour être exécuté par node
 */

// dépendances utilisées
// - minimist pour traiter les arguments de la ligne de commande
// - node-fetch pour récupérer les ressources de la bibli

/* global process */
import { open, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'

import minimist from 'minimist'

let MtgCli

/* eslint-env node */

const basesUrls = {
  sesabibli: 'https://bibliotheque.sesamath.net/',
  sesabidev: 'https://bibliotheque.sesamath.dev/',
  sesacommun: 'https://commun.sesamath.net/',
  sesacomdev: 'https://commun.sesamath.dev/'
}

// cf https://nodejs.org/docs/latest-v20.x/api/process.html#event-uncaughtexceptionmonitor
// (ça englobe uncaughtException et unhandledRejection)
process.on('uncaughtExceptionMonitor', (error, origin) => {
  console.error(error.message)
  console.error(origin)
  console.error(error)
})
// on peut choper la sortie ici, mais ça nous dit pas pourquoi il sort immédiatement après le writeFile
// process.on('exit', () => console.log('fin')) // un console.trace n'ajoute rien

function usage (exitCode = 0) {
  // il faut retrouver notre nom (convert.mjs a pu être renommé)
  const __filename = fileURLToPath(import.meta.url)
  const me = basename(__filename)
  console.log(`Ce script converti une figure mathgraph base64 en fichier mgj.
  
Il prend les options
  --rid Le rid d'une ressource de type mathgraph sur une sesathèque
  --src Le nom du fichier contenant le code base64 de la figure,
        préciser "-" pour prendre l'entrée standard
  --dst Facultatif, le nom du fichier à écrire (l'extension mgj sera ajoutée si elle n'y est pas)
        S'il n'est pas fourni et que la source est un rid d'une sesathèque, le nom sera {baseId}-{id}.mgj
        Sinon ce sera le même que le fichier source en modifiant l'extension (figure.mgj si la source est l'entrée standard)
  --addBibli Facultatif, passer "baseId|baseUrl" pour définir une sésathèque autre que celles de production (et passer un rid l'utilisant)
  -v ou --verbose : facultatif, pour avoir plus d'infos en console
  -h ou --help : affiche cette aide

Exemples :
1) Enregistrer un mgj d'après une ressource de la bibliothèque
  (ça va générer ici un fichier sesabibli-671e21b84e649fe74ef14e25.mgj dans le dossier courant)
node ${me} --src sesabibli/671e21b84e649fe74ef14e25

2) idem en précisant le nom du mgj (génère ici un foo/bar.mgj, le dossier foo doit exister)
node ${me} --src sesabibli/671e21b84e649fe74ef14e25 --dst foo/bar

3) générer un foo.mgj d'après le code base64 en string
echo 'le code base64'|node ${me} --src - --dst foo

4) générer un foo.mgj d'après le code base64 contenu dans le fichier foo.fig
node ${me} --src foo.fig

5) Afficher le code base64 d'un mgj
node ${me} --src foo.mgj

6) Idem en le mettant dans un fichier bar.fig
node ${me} --src foo.mgj --dst bar.fig
`)
  process.exit(exitCode)
}

/**
 * Retourne le code base64 d'une ressource de la bibli
 * @param {string} rid
 * @returns {Promise<string>}
 */
async function fetchFigFromBibli (rid) {
  const { default: fetch } = await import('node-fetch')
  const [baseId, id] = rid.split('/')
  const baseUrl = basesUrls[baseId]
  if (!baseUrl) throw Error(`baseId ${baseId} inconnue`)
  if (!id) throw Error(`rid ${rid} invalide`)
  const url = `${baseUrl}api/public/${id}`
  const response = await fetch(url)
  const ress = await response.json()
  const defaultErrMsg = `${url} ne retourne pas le format attendu`
  if (!ress?.message) throw Error(defaultErrMsg)
  if (ress.message !== 'OK') throw Error(ress?.message)
  if (!ress.data?.type) throw Error(defaultErrMsg)
  if (ress.data.type !== 'mathgraph') throw Error(`${rid} n’est pas une ressource de type mathgraph`)
  if (!ress.data.parametres.content.fig) throw Error(`${rid} est une ressource de type mathgraph mais ne contient pas de figure !`)
  return ress.data.parametres.content.fig
}

/**
 * Lance le traitement (récupérer la figure base64 et écrire le fichier mgj)
 * @returns {Promise<void>}
 */
async function run () {
  // on fait l'import ici pour récupérer un éventuel plantage s'il manque l'option
  // --experimental-loader=extensionless
  try {
    const mod = await import('../src/MtgCli.js')
    MtgCli = mod.default
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error(error, '\nIl faut passer une option à node pour que les imports sans extension fonctionnent\n')
      usage(1)
    } else {
      throw error
    }
  }

  // on regarde d'abord s'il faut ajouter une bibli
  if (addBibli) {
    const chunks = /^([a-zA-Z0-9]+)\|(https?:\/\/.+)$/.exec(addBibli)
    if (!chunks) {
      const msg = `argument addBibli invalide (${addBibli}), il faut passer {baseId}|{baseUrl}, par ex --addBibli sesabibli|https://bibliotheque.sesamath.net/`
      throw Error(msg)
    }
    let [, baseId, baseUrl] = chunks
    if (!baseUrl.endsWith('/')) baseUrl += '/'
    basesUrls[baseId] = baseUrl
  }
  // cas src est un rid de sesathèque
  if (rid) {
    // c'est une ressource de la bibli
    const code = await fetchFigFromBibli(rid)
    if (!dst) dst = rid.replace('/', '-')
    return convert(code)
  }

  // cas src est un mgj
  if (/\.mgj$/.test(src)) {
    // on nous a filé un binaire en source, faut sortir le code base64 en destination ou sur la console
    if (!dst) dst = src.replace(/\.mgj$/, '.fig')
    return convertBack()
  }

  // => on nous file le source en base64, il faut un fichier de destination
  if (!dst) {
    dst = (src === '-')
      ? 'figure.mgj'
      // si y'avait pas d'extension dst n'en aura pas non plus et saveAs l'ajoutera
      : src.replace(/\.[^.]+$/, '.mgj')
  }

  let inputStream
  if (src === '-') {
    logIfVerbose('le code base64 sera lu depuis l’entrée standard')
    inputStream = process.stdin
  } else {
    const fd = await open(src)
    logIfVerbose(`le code base64 sera lu dans le fichier ${src}`)
    // https://nodejs.org/docs/latest-v20.x/api/fs.html#filehandlecreatereadstreamoptions
    inputStream = fd.createReadStream()
  }
  return new Promise((resolve, reject) => {
    let code = ''
    inputStream.on('data', (chunk) => {
      code += chunk
    })
    inputStream.on('end', () => {
      if (!code) reject(Error('Il faut fournir une figure en base64'))
      resolve(convert(code))
    })
  })
}

/**
 * Écrit la figure dans le fichier
 * @param {string} fig Le code base64 de la figure
 * @returns {Promise<void>}
 */
async function convert (fig) {
  const mtgCli = await MtgCli.create({ fig })
  return mtgCli.saveAs(dst)
}

async function convertBack () {
  const mtgCli = await MtgCli.create()
  await mtgCli.open(src)
  const code = mtgCli.getBase64Code()
  if (dst) {
    await writeFile(dst, code)
  } else {
    logIfVerbose(`Code base 64 de la figure ${src} :`)
    console.log(code)
  }
}

let { src, rid, dst, h, help, v, verbose, addBibli } = minimist(process.argv.slice(2))

if (h || help) {
  usage()
}
const isVerbose = Boolean(verbose || v)
const logIfVerbose = (...args) => {
  if (isVerbose) console.log(...args)
}

run()
  .then(() => {
    // pourquoi le process se termine avant d'arriver là ???
    if (dst) logIfVerbose(`Fichier ${dst} écrit`)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
