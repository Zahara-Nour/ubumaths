import { getStr, isApple } from 'src/kernel/kernel'

// délai min entre deux frappes clavier exécutées (attention à rester supérieur
// à une vitesse de répétition de clavier un peu faible)
const minDelay = 500

/** @type {isModOk} */
const isCtrl = (event) => {
  if (isApple) return event.metaKey && !event.shiftKey && !event.altKey && !event.ctrlKey
  return event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey
}
/** @type {isModOk} */
const isCtrlShift = (event) => {
  if (isApple) return event.metaKey && event.shiftKey && !event.altKey && !event.ctrlKey
  return event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey
}
/** @type {isModOk} */
const isCtrlAlt = (event) => {
  if (isApple) return event.metaKey && !event.shiftKey && event.altKey && !event.ctrlKey
  return event.ctrlKey && !event.shiftKey && event.altKey && !event.metaKey
}
/** @type {isModOk} */
const isCtrlShiftAlt = (event) => {
  if (isApple) return event.metaKey && event.shiftKey && event.altKey && !event.ctrlKey
  return event.ctrlKey && event.shiftKey && event.altKey && !event.metaKey
}
/** @type {isModOk} */
const isNoneModifier = (event) => !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey

/**
 * @callback isModOk
 * @param {KeyboardEvent} event
 * @return {boolean}
 */
/**
 * @callback shortcutCb
 * @param {MtgApp} app
 * @return {void}
 */
/**
 * @typedef MtgShortcut
 * @property {shortcutCb} cb La callback qui fera l'action
 * @property {string} desc La clé à passer à getStr pour récupérer la description
 * @property {isModOk} isModOk La fct qui vérifie que les bonnes touches ctrl|shift|alt|meta sont là
 */
/**
 * La liste des raccourcis clavier gérés par mtgApp
 * @type {Object<string, MtgShortcut|MtgShortcut[]>}
 */
const shortcuts = {
  c: [
    // Ctrl + c pour copier la figure en png dans le presse-papiers
    {
      isModOk: isCtrlShift,
      cb: (app) => {
        app.copyFig()
      },
      desc: 'Copy'
    },
    // shift + ctrl + c pour copier avec unité
    {
      isModOk: isCtrlShiftAlt,
      cb: (app) => {
      // @todo gérer ici le cas de la copie en préservant l'unité
        app.outilCopyWithUnity.select()
      },
      // @todo ajouter une autre string en 3 langues pour ce cas
      desc: 'CopyWithUnity'
    },
    // ctrl+alt pour copier l'url pérenne
    {
      isModOk: isCtrlAlt,
      cb: (app) => app.outilPermanentUrl.select(),
      desc: 'PermanentUrl'
    }
  ],
  // F1 pour lancer l'aide dans le navigateur
  f1: {
    isModOk: isNoneModifier,
    cb: (app) => {
      // Depuis la version 9.3, il n'y a plus d'outil d'aide associé à une icône
      // On ne lance l'aide que via ce raccourci clavier
      if (!app.estExercice) {
        let prefix
        if (app.electron) {
          prefix = './'
        } else if (app.pwa) {
          prefix = './aide/'
        } else {
          prefix = 'https://www.mathgraph32.org/aide/'
        }
        // Pas d'aide en Allemand pour l'allemand
        const lang = app.language === 'de' ? 'en' : app.language
        window.open(prefix + lang + '/MathGraph32Help.htm')
      }
    },
    desc: 'Help'
  },
  // F2 pour l'outil précédent
  f2: {
    isModOk: isNoneModifier,
    cb: (app) => app.activeOutilPrec(),
    desc: 'PreviousTool'
  },
  // F10 pour réafficher la dernière indication fugitive
  f10: {
    isModOk: isNoneModifier,
    cb: (app) => app.lastIndication(),
    desc: 'LastInd'
  },
  // Ctrl + o pour ouvrir une figure
  o: {
    isModOk: isCtrl,
    cb: (app) => app.outilOpen.select(),
    desc: 'Open'
  },
  // ctrl + s pour sauvegarder
  s: {
    isModOk: isCtrl,
    cb: (app) => app.outilSave.select(),
    desc: 'Save'
  },
  z: [
    {
      isModOk: isCtrl,
      cb: (app) => {
        if (app.gestionnaire.annulationPossible()) {
          app.gestionnaire.annuleAction()
          app.activeOutilCapt()
          app.nameEditor.montre(false)
        }
      },
      desc: 'Annuler'
    }, {
      isModOk: isCtrlShift,
      cb: (app) => {
        if (app.gestionnaire.refairePossible()) {
          app.gestionnaire.refaitAction()
          app.activeOutilCapt()
        }
      },
      desc: 'Refaire'
    }
  ],
  // F3 pour lancer l'outil de modification d'objet numérique
  f3: {
    isModOk: isNoneModifier,
    cb: (app) => {
      app.outilModifObjNum.select()
    },
    desc: 'ModifObjNum'
  },
  // F4 pour lancer l'outil de nommage
  f4: {
    isModOk: isNoneModifier,
    cb: (app) => {
      app.outilNommer.select()
    },
    desc: 'Nommer'
  },
  // F1 pour lancer l'aide dans le navigateur
  f6: {
    isModOk: isNoneModifier,
    cb: (app) => {
      app.outilGomme.select()
    },
    desc: 'Gomme'
  },
  // F7 pour lancer l'outil d'exécution de macro
  f7: {
    isModOk: isNoneModifier,
    cb: (app) => {
      app.outilExecutionMacro.select()
    },
    desc: 'Rideau'
  },
  // F8 pour lancer l'outil rideau
  f8: {
    isModOk: isNoneModifier,
    cb: (app) => {
      app.outilRideau.select()
    },
    desc: 'ExecutionMacro'
  },
  // F9 pour lancer le protocole
  f9: {
    isModOk: isNoneModifier,
    cb: (app) => {
      app.outilProtocole.select()
    },
    desc: 'Protocole'
  },
  delete: {
    isModOk: isCtrl,
    cb: (app) => {
      app.outilSup.select()
    },
    desc: 'Sup'
  },
  p: [{
    isModOk: isCtrl,
    cb: (app) => app.selectToolIfAvailable('PtLib'),
    desc: 'PtLib'
  },
  {
    isModOk: isCtrlShift,
    cb: (app) => app.selectToolIfAvailable('PtLie'),
    desc: 'PtLie'
  },
  {
    isModOk: isCtrlAlt,
    cb: (app) => app.selectToolIfAvailable('PtParCoord'),
    desc: 'PtParCoord'
  }
  ],
  b: [{
    isModOk: isCtrl,
    cb: (app) => app.selectToolIfAvailable('CerOA'),
    desc: 'CerOA'
  },
  {
    isModOk: isCtrlShift,
    cb: (app) => app.selectToolIfAvailable('CerOR'),
    desc: 'CerOR'
  }
  ],
  d: [{
    isModOk: isCtrl,
    cb: (app) => app.selectToolIfAvailable('DtAB'),
    desc: 'DtAB'
  },
  {
    isModOk: isCtrlShift,
    cb: (app) => app.selectToolIfAvailable('Seg'),
    desc: 'Seg'
  },
  {
    isModOk: isCtrlAlt,
    cb: (app) => app.selectToolIfAvailable('DemiDt'),
    desc: 'DemiDt'
  }
  ],
  e: [{
    isModOk: isCtrl,
    cb: (app) => app.selectToolIfAvailable('Calcul'),
    desc: 'Calcul'
  },
  {
    isModOk: isCtrlShift,
    cb: (app) => app.selectToolIfAvailable('CalculComp'),
    desc: 'CalculComp'
  }
  ],
  f: [{
    isModOk: isCtrl,
    cb: (app) => app.selectToolIfAvailable('Fonc'),
    desc: 'Fonc'
  },
  {
    isModOk: isCtrlShift,
    cb: (app) => app.selectToolIfAvailable('FoncComp'),
    desc: 'FoncComp'
  }
  ],
  g: {
    isModOk: isCtrl,
    cb: (app) => app.selectToolIfAvailable('Trans'),
    desc: 'Trans'
  },
  j: {
    isModOk: isCtrl,
    cb: (app) => app.selectToolIfAvailable('Curseur'),
    desc: 'Curseur'
  },
  k: [{
    isModOk: isCtrl,
    cb: (app) => app.selectToolIfAvailable('Polygone'),
    desc: 'Polygone'
  },
  {
    isModOk: isCtrlShift,
    cb: (app) => app.selectToolIfAvailable('Surface'),
    desc: 'Surface'
  }
  ],
  l: [{
    isModOk: isCtrl,
    cb: (app) => app.selectToolIfAvailable('MesLong'),
    desc: 'MesLong'
  },
  {
    isModOk: isCtrlShift,
    cb: (app) => app.selectToolIfAvailable('MesAngNor'),
    desc: 'MesAngNor'
  }
  ],
  m: [{
    isModOk: isCtrl,
    cb: (app) => app.selectToolIfAvailable('MarqueSeg'),
    desc: 'MarqueSeg'
  },
  {
    isModOk: isCtrlShift,
    cb: (app) => app.selectToolIfAvailable('MarqueAng'),
    desc: 'MarqueAng'
  }
  ],
  n: {
    isModOk: isCtrlAlt,
    cb: (app) => app.selectToolIfAvailable('New'),
    desc: 'New'
  },
  h: [{
    isModOk: isCtrl,
    cb: (app) => app.selectToolIfAvailable('Commentaire'),
    desc: 'Commentaire'
  },
  {
    isModOk: isCtrlShift,
    cb: (app) => app.selectToolIfAvailable('Latex'),
    desc: 'Latex'
  }
  ],
  u: [{
    isModOk: isCtrl,
    cb: (app) => app.selectToolIfAvailable('AffichageValeur'),
    desc: 'AffichageValeur'
  },
  {
    isModOk: isCtrlShift,
    cb: (app) => app.selectToolIfAvailable('AffichageValeurLiePt'),
    desc: 'AffichageValeurLiePt'
  }
  ]
}

const getModifiers = (shortcut) => {
  switch (shortcut.isModOk) {
    case isCtrl: return isApple ? ['cmd'] : ['ctrl']
    case isCtrlShift: return isApple ? ['cmd', 'shift'] : ['ctrl', 'shift']
    case isCtrlAlt: return isApple ? ['cmd', 'alt'] : ['ctrl', 'alt']
    case isCtrlShiftAlt: return isApple ? ['cmd', 'shift', 'alt'] : ['ctrl', 'shift', 'alt']
  }
  return []
}

/**
 * @typedef ShortcutDesc
 * @property {string} key La touche (en minuscule)
 * @property {string[]} modifiers La liste des modifiers qui valident le raccourci (parmi 'ctrl|cmd', 'shift', 'alt', avec cmd pour mac et ctrl pour les autres)
 * @property {string} desc La description du raccourci
 */
/**
 * Retourne la liste des shortcuts pour l'afficher à l'utilisateur
 * @returns {Array}
 */
export function getShortcuts () {
  const list = []
  const add = (key, shortcut) => {
    list.push({
      key,
      modifiers: getModifiers(shortcut),
      desc: getStr(shortcut.desc),
    })
  }
  for (const [key, shortcut] of Object.entries(shortcuts)) {
    if (Array.isArray(shortcut)) {
      for (const s of shortcut) add(key, s)
    } else {
      add(key, shortcut)
    }
  }
  return list
}

const listeners = []

/**
 * Ajoute les raccourcis clavier à l'appli
 * @param mtgApp
 */
function addShortcuts (mtgApp) {
  if (listeners.length > 0) {
    // faut les virer d'abord
    for (const listener of listeners) {
      window.removeEventListener('keydown', listener)
    }
  }
  let lastKeypress = 0
  // notre listener
  const listener = (event) => {
    if (!event.key) return // ça arrive quand on choisi une proposition d'autocomplétion dans un input texte…
    // faut passer en lower sinon avec shift on récupère des majuscules
    const key = event.key.toLowerCase()
    let shortcut = shortcuts[key]
    if (!shortcut) return
    if (Array.isArray(shortcut)) {
      // on prend le premier qui match le modifier
      shortcut = shortcut.find(s => s.isModOk(event))
      if (!shortcut) return
    } else {
      if (!shortcut.isModOk(event)) return
    }
    // on a un shortcut valide, on exécute si c'est pas trop rapide après le précédent
    const delay = Date.now() - lastKeypress
    // on met à jour même si on ignore ensuite, pour qu'une touche laissée enfoncée ne  déclenche pas une action toutes les minDelay ms
    lastKeypress = Date.now()
    if (delay < minDelay) return
    // Si event.target est un input pu un textearea c'est qu'on est dans une boîte de dialoge
    // et on ne traite pas le raccourci
    const target = event.target
    // Si on est en train d'éditer un nom à la volée, on traite les raccourcis claviers comme Ctrl + z ou Ctrl + Shift + z
    // en appelant la callback.
    // Mais si l'événement clavier vient d'un input ou d'un textarea c'est que le raccourci clavier a été
    // généré par un éditeur d'un boîte de dialogue et on n'appelle pas la callback
    if ((target.classList.contains('mtgnameinput')) || !['input', 'textarea'].includes(target.tagName.toLowerCase())) {
      shortcut.cb(mtgApp)
      event.preventDefault()
    }
  }
  // que l'on ajoute (sur window car sur le conteneur ça marche très moyen, et au keydown sinon le navigateur a pris le dessus sur ctrl+c, F1, etc.)
  window.addEventListener('keydown', listener)
  listeners.push(listener)
  // pour débug
  // console.debug('liste des raccourcis clavier : ', getShortcuts())
}

export default addShortcuts
