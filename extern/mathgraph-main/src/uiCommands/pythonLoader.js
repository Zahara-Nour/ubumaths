import { loadScript } from 'src/kernel/dom'

let pendingPromise

const type = 'application/javascript'
// retourne la promesse de chargement du js sous forme de blob
const getLoadedPromise = (module) => {
  const blob = new Blob([module.default], { type })
  const url = URL.createObjectURL(blob)
  // une fois le script exécuté on devrait pouvoir faire du
  return loadScript(url, { type }).then(() => {
    URL.revokeObjectURL(url)
  })
}

/**
 * Charge les js brython et résoud la promesse retournée
 * @returns {Promise<unknown>}
 */
export async function addBrythonScripts () {
  // si on a déjà été appelé dans ce dom (possible avec plusieurs appels de mtgLoad pour plusieurs figures) on ne fait rien
  if (!pendingPromise) {
    const contentPromises = [
      import('./brython/scripts/brython.min.js?raw'),
      // on ne peut pas trop se passer de ça, notre runner.py utilise des trucs qui sont dedans
      // (et les élèves comprendraient pas de ne pas avoir les modules python de base)
      import('./brython/scripts/brython_stdlib.js?raw'),
      import('./brython/scripts/mathgraph.brython.js?raw')
    ]

    pendingPromise = new Promise((resolve, reject) => {
      // timeout déjà géré par loadScript, pas besoin d'en ajouter un ici
      Promise.all(contentPromises)
        .then(([main, stdLib, mtgLib]) => {
          // il faut charger en séquentiel, brython puis stdlib puis mtgLib
          getLoadedPromise(main)
            .then(() => getLoadedPromise(stdLib))
            .then(() => getLoadedPromise(mtgLib))
            .then(resolve)
        })
        .catch(reject)
    })
  }

  return pendingPromise
}

/*
HISTORIQUE

Ce fichier a un historique assez chargé, avec pas mal de tentatives infructueuses.

1) Chargement de brython.min.js + brython_stdlib.js sur le site de mathgraph via
   insertion de <script src="…">, avec du src = getBaseUrl() + 'externals/brython/…
=> ça oblige à mettre ces fichiers manuellement dans le dossier js/ du site, en
   espérant que ça fonctionne pour charger ensuite runner.py et mathgraph.py
   (qui eux doivent être à la racine du site), mais on est pas très sûr que ça
   fonctionne bien en cross-domain (avec un mtgLoad.js chargé depuis un domaine
   quelconque)
(cf avant 2024-04-04, par ex commit 87b0e258)

2) commit 1f5d5d8e
Pour régler le pb des fichiers *.py à la racine, on construit un package brython
 qui les contient (cf src/uiCommands/brython/README.md), et on importe les 3 js
 ici avec du ?url (pour récupérer l'url construite au build), .
=> Ça fonctionne bien avec un vrai build, mais pas avec un pnpm start (car dans
 ce cas il faut que les js concernés soient des modules js, ce qui n'est pas le
  cas ici). Tentative pour modifier les js afin qu'il puissent être chargés avec
   du <script type="module"> infructueuse (bcp trop de modifs à faire, à cause
    notamment de bcp de fcts redéfinies plusieurs fois suivant le contexte)

3) commit aa972346
On tente un import avec du ?raw (pour récupérer le contenu du js), que l'on
 injecte dans un tag script sans src.
- il faut bricoler un truc pour savoir quand les scripts sont interprétés
  (ce n'est pas le cas lorsque le appendChild rend la main, on ajoute en fin de
   script l'incrément d'une var globale pour le savoir)
- il faut bricoler un truc pour feinter brython, qui init des trucs d'après le
  src= de son tag <script>, ça fonctionne avec mise en global préalable de
  `window.__BRYTHON__ = { brython_path: getBaseUrl() }`
=> ça marche au build comme au pnpm start, mais la stacktrace affichée en console
   en cas d'erreur dans le script python devient inintelligible

4) Idem 3, mais avec du src= et du Blob
 */
