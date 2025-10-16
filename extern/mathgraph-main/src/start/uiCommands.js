import { ceIn, ge } from 'src/kernel/dom'
import { jugglingPython } from 'src/start/figures'

const uiOpts = {
  // facultatif, on peut préciser des figures d'initialisations
  // passer une liste vide va retirer la possibilité de changer de figure
  // la première de la liste sera affichée au chargement
  commandsFigs: [
    // cf src/kernel/figures.js
    { figRef: 'figRepOrthonorm', name: 'Repère orthonormé (degré)' },
    { figRef: 'figVideUnite', name: 'Figure sans repère avec longueur unité' },
    { figRef: 'figVide', name: 'Figure sans repère et sans longueur unité' },
    { figRef: 'figRepModif', name: 'Repère modifiable (radian)' },
    { figRef: 'reporthonfr', name: 'Repère 3D' },
    { figRef: 'surffr', name: 'Une jolie surface' }
    /* on peut aussi passer le code base64 d'une figure avec * /
      {
        name: 'ma figure perso',
        fig: 'son code base64'
      } /* */
  ]
}

export function getOptsPython () {
  return {
    ...uiOpts,
    loadPython: true
  }
}

export function getOptsPythonCode () {
  return {
    ...uiOpts,
    loadPython: true,
    pythonCode: 'A = addPointXY(3, 3, "A")\nB = addPointXY(1, 0, "B")'
  }
}

export function getOptsPythonCodeId ({ pythonCode = jugglingPython, pythonCodeId = 'myPythonCode' } = {}) {
  const existingScript = ge(pythonCodeId, true)
  const script = existingScript || ceIn(document.body, 'script')
  script.id = pythonCodeId
  // On met ce type pour que brython ne charge pas automatiquement le contenu
  // Il a du MutationObserver et dans ce cas il injecte le code python contenu dans le script,
  // mais il ne purge pas si le script disparaît, donc quand on le remet il râle avec
  // `Brython error : Found 2 scripts with the same id`
  script.type = 'text/mtgPython'
  script.textContent = pythonCode
  return {
    pythonCodeId,
    commandsFigs: [{ figRef: 'figRepOrthonorm', name: 'Repère orthonormé (degré)' }],
    zoomOnWheel: false
  }
}

export function getOptsJs () {
  return {
    ...uiOpts,
    loadJavascript: true
  }
}

export function getOptsJavascriptCode () {
  return {
    ...uiOpts,
    loadJavascript: true,
    javascriptCode: 'const a = addPointXY(3, 3, "A")\nconst b = addPointXY(1, 0, "B")'
  }
}

export function getOptsJavascriptCodeId () {
  const { javascriptCode } = getOptsJavascriptCode()
  const javascriptCodeId = 'myJavascriptCode'
  const existingScript = ge(javascriptCodeId, true)
  const script = existingScript || ceIn(document.body, 'script')
  script.id = javascriptCodeId
  script.type = 'text/mtgJavascript'
  script.textContent = javascriptCode
  return {
    javascriptCodeId,
    commandsFigs: [{ figRef: 'figRepOrthonorm', name: 'Repère orthonormé (degré)' }],
    zoomOnWheel: false
  }
}
