/**
 * Génère les 3 fichiers qui importent bcp de classes :
 * src/factory pour src/objets/*
 * src/mtgLoad.dependencies.js pour src/objetsAdd/*
 *
 * Cf versions avant 2024-03-27 pour un fonctionnement cjs des mtgLoad.dependencies*
 * (avec du requireAll sur objetsAdd et outilsWithoutElectron)
 *
 * Ce fichier est lancé au début de chaque appel de vite (build ou pas)
 * Il y a également buildElements et buildLoader lancés par vite en post-build
 * @fileOverview
 */

// execFile semble plus adapté à notre cas, mais ça marche pas chez Yves, son antivirus bloque le spawn du process et ça lance du `Error: spawn UNKNOWN`
// Avec exec tout court, ça spawn un shell d'abord puis lance l'exécutable dedans,
// c'est un peu moins performant mais tant pis, ça règle le pb
// Cf https://nodejs.org/docs/latest-v20.x/api/child_process.html#child_processexecfilefile-args-options-callback
// The child_process.execFile() function is similar to child_process.exec() except that it does not spawn a shell by default. Rather, the specified executable file is spawned directly as a new process making it slightly more efficient than child_process.exec().
import { exec } from 'node:child_process'
import { access, readdir, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
// le dossier de ce fichier
const rootDir = dirname(dirname(__filename))

const factoryFile = join(rootDir, 'src', 'factory.js')
const pythonBuilder = resolve(rootDir, 'scripts', 'refreshMtgPyLib.sh')
const brythonPkgDir = resolve(rootDir, 'src/uiCommands/brython/mathgraph_package')
const brythonPkg = resolve(rootDir, 'src/uiCommands/brython/scripts/mathgraph.brython.js')

const factoryFn = `/**
 * Renvoie un objet instancié
 * @module
 * @param {string} className Le nom de la classe, il doit y avoir un fichier du même nom dans le dossier objets
 * @param {Object} [values] L'argument à passer au constructeur
 * @returns {COb} Objet de la classe className instancié avec values
 */
export default function factory (className, values) {
  try {
    if (!objets[className]) throw Error(className + ' n’est pas un objet connu dans mathgraph')
    return new objets[className](values)
  } catch (error) {
    console.error(error)
    return null
  }
}
`

const getHeader = () => `// Fichier généré automatiquement par ${basename(__filename)}\n// ${new Date()}\n\n`

// ce fichier contenait un require dynamique de tous les objets/*.js
// => ça les mettait tous dans le le même chunk js, ça revient au même que de mettre
// tous les imports statiques dans le fichier avec une fct qui retourne le bon objet
/**
 * Génère factory.js
 * @returns {Promise<void>}
 */
async function buildFactory () {
  let content = getHeader()
  const files = await readdir(resolve(rootDir, 'src', 'objets'))
  const classes = []
  for (const file of files) {
    if (!file.endsWith('.js')) return
    const className = basename(file, '.js')
    classes.push(className)
    content += `import ${className} from './objets/${file}'\n`
  }
  content += `\nconst objets = { ${classes.join(', ')} }\n\n`
  await writeFile(factoryFile, content + factoryFn)
}

/**
 * Retourne une string avec tous les imports des js de srcDir
 * @param {string} srcDir
 * @returns {Promise<string>}
 */
async function buildImports (srcDir) {
  const files = await readdir(resolve(rootDir, 'src', srcDir))
  const modules = files.filter(file => file.endsWith('.js'))
  let content = ''
  for (const module of modules) {
    content += `import './${srcDir}/${module}'\n`
  }
  return content
}

/**
 * Génère le fichier mtgLoad.dependencies.js
 * @returns {Promise<void>}
 */
async function buildDeps () {
  const objetsAddImports = await buildImports('objetsAdd')
  const content = getHeader() + objetsAddImports
  await writeFile(join(rootDir, 'src', 'mtgLoad.dependencies.js'), content)
}

/**
 * Génère brythonPkg s'il est plus vieux que les .py de brythonPkgDir
 * @returns {Promise<unknown>}
 */
async function buildPythonDeps () {
  const pkgFiles = await readdir(brythonPkgDir)
  let isTooOld = false
  try {
    await access(brythonPkg)
    // cf https://nodejs.org/docs/latest-v20.x/api/fs.html#class-fsstats
    const { mtimeMs } = await stat(brythonPkg)
    for (const pkgFile of pkgFiles) {
      const s = await stat(resolve(brythonPkgDir, pkgFile))
      if (s.mtimeMs > mtimeMs) {
        isTooOld = true
        break
      }
    }
    if (!isTooOld) return
  } catch (error) {
    if (error.code !== 'ENOENT') console.error(error)
    // ça existe pas, on continue
  }
  // si on est toujours là faut re-générer le fichier
  return new Promise((resolve, reject) => {
    exec(pythonBuilder, { cwd: rootDir }, (error, stdout, stderr) => {
      if (stdout) console.log(stdout)
      if (error) return reject(error)
      if (stderr) console.error(pythonBuilder, 'has error(s):\n', stderr)
      resolve()
    })
  })
}

async function buildDependencies () {
  try {
    await buildFactory()
    await buildDeps()
    await buildPythonDeps()
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

export default buildDependencies
