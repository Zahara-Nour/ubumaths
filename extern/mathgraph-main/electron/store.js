/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
const electron = require('electron')
const path = require('path')
const fs = require('fs')

/**
 * classe chargée d'enregistrer les préférences de l'application
 */
class Store {
  constructor (opts) {
    // Renderer process has to get `app` module via `remote`, whereas the main process can get it directly
    // app.getPath('userData') will return a string of the user's app data directory path.
    const app = electron.app || (electron.remote && electron.remote.app)
    if (app) {
      const userDataPath = app.getPath('userData')
      // We'll use the `configName` property to set the file name and path.join to bring it all together as a string
      this.path = path.join(userDataPath, opts.configName + '.json')
    } else {
      console.error('impossible de retrouver l’app electron, pas de propriété app ni remote.app dans cet objet :', electron)
    }

    this.data = parseDataFile(this.path, opts.defaults)
  }

  // This will just return the property on the `data` object
  get (key) {
    return this.data[key]
  }

  // ...and this will set it
  set (key, val) {
    this.data[key] = val
    try {
      fs.writeFileSync(this.path, JSON.stringify(this.data))
    } catch (error) {
      console.error(error)
    }
  }
}

function parseDataFile (filePath, defaults) {
  // Si le fichier de configuration n'existe pas renvoie defaults
  try {
    return JSON.parse(fs.readFileSync(filePath))
  } catch (error) {
    return defaults
  }
}

// expose the class
module.exports = Store
