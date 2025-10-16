// la promesse d'ajout, pour gagner en perf à partir du 2e appel
let texPromise

/**
 * Wrapper light de loadMathJax, qui peut donc être importé en statique un peu partout sans pb
 * @param {string} [mathjax3Base]
 * @returns {Promise<void>}
 */
function addLatex (mathjax3Base) {
  if (!texPromise) {
    texPromise = import('./loadMathJax.js')
      .then(({ default: loadMathJax }) => loadMathJax(mathjax3Base))
  }
  return texPromise
}

export default addLatex

/*
HISTORIQUE

Ce addLatex a été ajouté en juin 2021, pour ne charger le code qui gère latex (et surtout MathJax) que si l'on en a vraiment besoin
Cela complique bcp le code (avec du double addQueue nécéssaire par endroit), mais économise le chargement de MathJax dans de nombreux cas (et il est gros)

CLatex dépend de CAffLiePt, donc CAffLiePt ne peut pas l'importer, d'où le fait de lui ajouter les méthodes qui utilisent CLatex ici.

Si on importe dans ce fichier  CAffLiePt & CLatex en statique, et que l'on importe partout addLatex en dynamique, vite build plante, cf commit def56697).

On choisit alors la solution où addLatex ne fait que des imports dynamiques et il est toujours importé en statique.
Ça ne résoud pas des pbs de chargement aléatoire constatés avec chrome quand on désactive le cache
(des erreurs réseau, net::ERR_FAILED ou net::ERR_CONNECTION_RESET)
où visiblement le navigateur n'envoie pas les requêtes (on ne voit rien arriver coté serveur)

On tente alors de démêler l'import cyclique (pourtant dynamique) en mettant CLatex en propriété statique de CAffLiePt, que mtgLoad affecte au chargement (avant l'instanciation de l'appli ou du lecteur).
Ça semble régler le pb, ce fichier ne devient alors qu'un wrapper très léger de loadMathJax
(et conserve donc son utilité, on peut l'inclure un statique un peu partout sans trop alourdir le code s'il ne sert jamais)
 */
