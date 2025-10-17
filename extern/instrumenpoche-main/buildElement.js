/**
 * Compresse le fichier src/iepElement.js dans build, mais sans passer par webpack ni babel
 * L'utilisation de customElement ne fonctionnera pas sur les vieux navigateurs, inutile de s'embêter,
 * ni d'alourdir le fichier.
 * @fileOverview
 */

const fs = require('fs')
const path = require('path')
const Terser = require('terser')

const buildPath = 'build'
const buildDir = path.resolve(__dirname, buildPath)
const srcDir = path.resolve(__dirname, 'src')

const elementFile = 'iepElement.js'

// Lui ne passe pas par webpack / babel & co, on le compile directement dans build

console.log(`Lancement de la compression de ${elementFile}`)
const srcFile = path.resolve(srcDir, elementFile)
const srcContent = fs.readFileSync(srcFile, { encoding: 'utf8' }) // faut préciser encoding pour récupérer une string
const dstFile = path.resolve(buildDir, elementFile)
Terser.minify(srcContent, {
  output: {
    comments: false
  },
  sourceMap: {
    filename: elementFile,
    url: elementFile + '.map'
  }
}).then(({ code, map }) => {
  fs.writeFileSync(dstFile, code)
  fs.writeFileSync(dstFile + '.map', map)
}).then(() => {
  console.log(`Compression de ${elementFile} dans ${dstFile} ok`)
  process.exit(0)
}).catch(error => {
  console.error(error)
  process.exit(1)
})
