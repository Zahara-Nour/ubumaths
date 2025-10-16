/**
 * Ce script prend src/mtgLoad.preload.js et le copie dans docroot/build/mtgLoad.js
 * en y insérant les bons noms des js sortis du build de vite (ils ont un suffixe
 * qui dépend de leur contenu, pour éviter tout pb de cache).
 *
 * Il peut être appelé via `node scripts/postBuild.js` pour le tester.
 *
 * En mode normal c'est inutile car il est appelé à la fin de chaque `vite build`
 * (cf plugin maison qui utilise le hook closeBundle dans vite.config.js)
 *
 * En mode electron (avec ELECTRON=1 dans l'environnement), ça copie simplement mtg.global-*.js en mtgLoad.js
 * @fileOverview
 */

import { cp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { minify } from 'terser'

import compressMathgraphElements from './compressMathgraphElements.js'

const __filename = fileURLToPath(import.meta.url)
const rootDir = dirname(dirname(__filename))
const buildDir = resolve(rootDir, 'docroot', 'build')
const dstPortable = resolve(rootDir, 'dist', 'portable')

const isCli = process.env.CLI === '1'
const isElectron = process.env.ELECTRON === '1'
// const isPortable = isCli || process.env.PORTABLE === '1'
const isPwa = process.env.PWA === '1'
// const isDev = process.env.DEV === '1'
const isOnline = !isPwa && !isCli && !isElectron
const isWatch = process.argv.includes('--watch') || process.argv.includes('-w')

// les strings qu'on va remplacer dans le loader
const modernSearch = 'src += \'module\''
const legacySearch = 'src += \'es5\''

let polyfillsLegacy

/**
 * Retourne le nom des deux fichiers mtgLoad.global-*.js (normal et legacy)
 * @private
 * @return {Promise<string[]>}
 */
async function findJs () {
  // on cherche déjà les noms des 2 js mtgLoad (normal & legacy) du dernier build
  const files = await readdir(buildDir)
  const jsFiles = files.filter(file => /^mtgLoad.global-.+\.js$/.test(file))
  if (!isWatch) {
    if (jsFiles.length !== 2) {
      console.log('files', files.join('\n'), jsFiles)
      throw Error(`On a pas trouvé nos deux mtgLoad*.js dans ${buildDir}`)
    }
    if (!polyfillsLegacy) polyfillsLegacy = files.find(file => /^polyfills-legacy/.test(file))
  }
  return jsFiles
}

/**
 * Cherche build/style-xxxx_.css et le renomme en build/mathgraph.css
 * @private
 * @return {Promise<string[]>}
 */
async function renameCss (dir) {
  // on cherche déjà les noms des 2 js mtgLoad (normal & legacy) du dernier build
  const files = await readdir(dir)
  const cssFiles = files.filter(file => /^style-.+\.css$/.test(file))
  if (cssFiles.length !== 1) {
    console.log(`css files found in ${dir}`, cssFiles)
    throw Error(`On a pas trouvé notre unique style-xxx.css dans ${dir}`)
  }
  const cssFile = cssFiles[0]
  await rename(resolve(dir, cssFile), resolve(dir, 'mathgraph.css'))
  console.log(`${dir}/${cssFile} renommé en ${dir}/mathgraph.css`)
}

/**
 * @private
 * @returns {Promise<void>}
 */
async function copyLoader () {
  const jsFiles = await findJs()
  // et on copie le préloader avec les bonnes infos
  const srcFile = resolve(rootDir, 'src', 'mtgLoad.preload.js')
  const srcContent = await readFile(srcFile, { encoding: 'utf8' }) // faut préciser encoding pour récupérer une string
  let legacyJs, modernJs
  if (isWatch) {
    if (jsFiles.length !== 1) {
      throw Error(`En mode watch on a plusieurs mtgLoad*.js dans ${buildDir} :\n  - ${jsFiles.join('\n  - ')}`)
    }
    modernJs = jsFiles[0]
  } else {
    const indexLegacy = jsFiles.findIndex(f => /^mtgLoad.global-legacy/.test(f))
    if (indexLegacy === -1) throw Error('Pas trouvé de mtgLoad.global-legacy')
    legacyJs = jsFiles[indexLegacy]
    modernJs = jsFiles[indexLegacy === 0 ? 1 : 0]
    // il faut concaténer polyfillsLegacy et indexLegacy dans indexLegacy
    const polyfillLegacyFile = resolve(buildDir, polyfillsLegacy)
    const polyfillContent = await readFile(polyfillLegacyFile, { encoding: 'utf8' })
    const legacyFile = resolve(buildDir, legacyJs)
    const legacyContent = await readFile(legacyFile, { encoding: 'utf8' })
    const content = (polyfillContent + '\n' + legacyContent)
      // faut virer la référence au source.map qui serait foireuse
      .replace(/^\/\/# sourceMappingURL.*\.map/mg, '')
    // on vire ces deux fichiers désormais inutiles
    try {
      await rm(polyfillLegacyFile + '.map')
      await rm(legacyFile + '.map')
    } catch (error) {
      console.error(error)
    }

    await writeFile(resolve(buildDir, legacyJs), content)
  }
  // si on se vautre dans la config eslint il peut remplacer d'office ces var en const,
  // => on check qu'on trouve ce qu'on cherche
  const dstContentTmp = srcContent
    .replace(modernSearch, `src += '${modernJs}'`)
  if (dstContentTmp === srcContent) throw Error(`Pas trouvé la string #${modernSearch}# dans ${srcFile}`)
  const dstContent = dstContentTmp
    .replace(legacySearch, `src += '${legacyJs}'`)
  if (dstContent === dstContentTmp) throw Error(`Pas trouvé la string #${legacySearch}# dans ${srcFile}`)

  // on écrit la version non minifiée, pour ceux qui la chercherait
  await writeFile(resolve(buildDir, 'mtgLoad.js'), dstContent)
  // on minifie, cf https://github.com/terser/terser#api-reference
  const dstName = 'mtgLoad.min.js'
  const dstFile = resolve(buildDir, dstName)
  const { code, map } = await minify(dstContent, {
    output: {
      comments: false
    },
    // cf https://github.com/terser/terser#source-map-options
    sourceMap: {
      filename: dstName,
      url: dstName + '.map'
    }
  })
  await writeFile(dstFile, code)
  await writeFile(dstFile + '.map', map)
  console.log(`${dstName} copié dans ${buildDir} (avec derniers js substitués)`)
}

async function postBuildForPortable () {
  try {
    // rename du css
    await renameCss(resolve(dstPortable, 'build'))
    // copie de MathJax3
    let srcDir = resolve(rootDir, 'electron', 'MathJax3')
    let dstDir = resolve(dstPortable, 'build', 'MathJax3')
    await cp(srcDir, dstDir, { recursive: true, preserveTimestamps: true })
    console.log(`MathJax3 copié dans ${dstDir}`)
    // copie des images
    srcDir = resolve(rootDir, 'src', 'images')
    dstDir = resolve(dstPortable, 'src', 'images')
    await cp(srcDir, dstDir, { recursive: true, preserveTimestamps: true })
    console.log(`images copié dans ${dstDir}`)
    // copie les fichiers html
    srcDir = resolve(rootDir, 'portable-assets')
    const files = await readdir(srcDir)
    let nb = 0
    for (const file of files) {
      await cp(resolve(srcDir, file), resolve(dstPortable, file), { preserveTimestamps: true })
      nb++
    }
    console.log(`${nb} fichiers html copié dans ${dstPortable}`)
    // et faut tripoter le mtgLoad.js pour virer import.meta.url
    const jsFile = resolve(dstPortable, 'build', 'mtgLoad.js')
    const src = await readFile(jsFile, { encoding: 'utf8' })
    const mod = src
      .replace(/import\.meta\.url/g, "'./'")
      .replace(/=import\.meta/g, '=null')
    await writeFile(jsFile, mod, { encoding: 'utf8' })
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

async function postBuildOnline () {
  try {
    await copyLoader()
    if (!isWatch) {
      await compressMathgraphElements()
      await setVersion()
    }
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

async function setVersion () {
  // on peut faire un import json dans node ≥ 17.5 mais eslint gère pas encore assert ou with
  // on fait ça à l'ancienne…
  const packageJson = await readFile(resolve(rootDir, 'package.json'), { encoding: 'utf8' })
  const { version } = JSON.parse(packageJson)
  await writeFile(resolve(buildDir, 'version.txt'), version)
}

/**
 * Vérifie que chaque item de texte existe dans toutes les langues
 * @returns {Promise<void>}
 */
async function checkTexts () {
  const { default: textesFr } = await import('../src/textes/textesFr.js')
  const { default: textesEn } = await import('../src/textes/textesEn.js')
  const { default: textesEs } = await import('../src/textes/textesEs.js')
  for (const p of Object.keys(textesFr)) {
    if (!textesFr[p]) console.error(`${p} vide dans textesFr`)
    if (!textesEn[p]) console.error(`${p} manquant dans textesEn`)
    if (!textesEs[p]) console.error(`${p} manquant dans textesEs`)
  }
  for (const p of Object.keys(textesEn)) {
    if (!textesFr[p]) console.error(`${p} présent dans textesEn mais pas textesFr`)
  }
  for (const p of Object.keys(textesEs)) {
    if (!textesFr[p]) console.error(`${p} présent dans textesEs mais pas textesFr`)
  }
  // et on recommence pour add
  const { default: textesFrAdd } = await import('../src/textes/textesFrAdd.js')
  const { default: textesEnAdd } = await import('../src/textes/textesEnAdd.js')
  const { default: textesEsAdd } = await import('../src/textes/textesEsAdd.js')
  for (const p of Object.keys(textesFrAdd)) {
    if (!textesFrAdd[p]) console.error(`${p} vide dans textesFrAdd`)
    if (!textesEnAdd[p]) console.error(`${p} manquant dans textesEnAdd`)
    if (!textesEsAdd[p]) console.error(`${p} manquant dans textesEsAdd`)
  }
  for (const p of Object.keys(textesEnAdd)) {
    if (!textesFrAdd[p]) console.error(`${p} présent dans textesEnAdd mais pas textesFrAdd`)
  }
  for (const p of Object.keys(textesEsAdd)) {
    if (!textesFrAdd[p]) console.error(`${p} présent dans textesEsAdd mais pas textesFrAdd`)
  }
}

async function postBuild () {
  try {
    // on vérifie les textes à chaque build
    await checkTexts()
    // et on lance le reste du post-build pour le loader et mathgraphElements
    if (process.env.PORTABLE === '1') await postBuildForPortable()
    else if (isOnline) await postBuildOnline()
    // rien à faire dans les autres cas
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

export default postBuild
