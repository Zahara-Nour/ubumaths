/**
 * Compresse le fichier mathgraphElements.js dans build, mais sans passer par vite ni babel (même si on est appelé par vite en post-build)
 *
 * Pour n'appeler que ce fichier c'est `node ./scripts/compressMathgraphElements.mjs`
 * (le mjs récupère l'import par défaut du js et le lance)
 *
 * L'utilisation de customElement ne fonctionnera pas sur les vieux navigateurs, inutile de s'embêter,
 * et surtout d'alourdir le fichier (3.2ko comme ça, 47ko avec webpack/babel en version module)
 * Faut juste faire attention à ne pas mettre de code trop moderne dans ce js, jusqu'à ES2017 ça devrait aller)
 * @fileOverview
 */

/* eslint-env node */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { minify } from 'terser'

const __filename = fileURLToPath(import.meta.url)
// le dossier de ce fichier
const rootDir = dirname(dirname(__filename))

const buildPath = 'docroot/build'
const buildDir = resolve(rootDir, buildPath)
const srcDir = resolve(rootDir, 'src')

const elementFile = 'mathgraphElements.js'

/**
 * Compresse mathgraphElements dans build, avec fichier map, sans autre transformation
 * @return {Promise<void>}
 */
async function compressMathgraphElements () {
  try {
    console.log(`Lancement de la compression de ${elementFile}`)
    const srcFile = resolve(srcDir, elementFile)
    const srcContent = readFileSync(srcFile, { encoding: 'utf8' }) // faut préciser encoding pour récupérer une string
    const dstFile = resolve(buildDir, elementFile)

    const { code, map } = await minify(srcContent, {
      output: {
        comments: false
      },
      sourceMap: {
        filename: elementFile,
        url: elementFile + '.map'
      }
    })
    if (!existsSync(buildDir)) mkdirSync(buildDir)
    await writeFileSync(dstFile, code)
    await writeFileSync(dstFile + '.map', map)
    console.log(`Compression de ${elementFile} dans ${dstFile} ok`)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

export default compressMathgraphElements
