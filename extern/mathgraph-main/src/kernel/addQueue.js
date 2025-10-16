import Queue from 'src/kernel/Queue'

// notre queue unique (pour toutes les applis|lecteurs du dom)
let queue

// Pour mtgAppLecteur on a tenté d'avoir une Queue par idDoc dans le commit a5e743ef du 2025-06-11,
// mais fragilise trop l'ensemble, car s'il y a un addQueue sans id qq part (notamment avec l'api)
// ça casse tout avec des opérations qui ne se font plus dans le bon ordre
// (exécutions concurrentes en parallèle alors qu'il faut que ce soit séquentiel)
// on revient donc à une queue unique.
// L'inconvénient est que si un chargement d'une figure plante alors celui de toutes les autres
// plantera aussi.
// à tester avec http://localhost:8082/#playerMultElt

/**
 * Ajoute fn à une pile d'exécution unique (gère un singleton pour garantir l'unicité de la pile)
 * (pile qui sera créée au premier appel)
 * Ça passera à l'élément suivant de la pile quand fn aura terminé (ou sera résolue si c'est une promesse).
 *
 * Si fn() retourne une promesse, ça passera à l'élément suivant de la pile lorsque cette promesse sera résolue ou rejetée.
 *
 * IMPORTANT : on peut faire du addQueue dans fn, ça va remettre du code à la fin de la pile au moment de l'exécution de fn,
 * mais il ne faut surtout pas faire dans fn du `return addQueue(autreFct)` car cette promesse ne serait jamais résolue !
 * (il faut attendre la résolution du premier `addQueue(fn)` avant de passer à l'élément suivant, si cette
 * résolution dépend de l'exécution d'un élément plus loin sur la pile elle n'arrivera jamais)
 * @param {function|Promise<unknown>} fn
 * @param {Object|boolean} [options] si boolean ce sera interprété comme options.doNotCatch
 * @param {boolean} [options.doNotCatch=false] passer true pour que l'erreur soit retournée (promesse échouée) plutôt que gérée par la pile
 * @param {boolean} [options.stopOnError=false] passer true pour que la pile soit bloquée en cas d'erreur levée à l'exécution de fn()
 */
export function addQueue (fn, options) {
  if (typeof fn !== 'function') throw TypeError('il faut passer une fonction')
  if (!queue) queue = new Queue()
  return queue.add(fn, options)
}

/**
 * Annule la pile courante et en génère une nouvelle
 */
export function abort () {
  if (queue) {
    queue.abort()
    queue = new Queue()
  } else {
    console.error(Error('abort() appelée alors qu’il n’y avait pas eu d’appel de addQueue()'))
  }
}

export default addQueue
