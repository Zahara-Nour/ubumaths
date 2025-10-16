const throwAbordedError = () => {
  const error = Error('Abandon du chargement ou de l’affichage')
  error.userFriendly = true
  throw error
}

/**
 * Pile d'exécution de fonctions, qui seront lancée en séquentiel, qu'elles soient sync ou async
 */
class Queue {
  constructor () {
    /**
     * La pile de promesse
     * @type {Promise<void>}
     * @private
     */
    this._stack = Promise.resolve()
    /**
     * Un flag pour savoir si la pile a été annulée
     * @type {boolean}
     * @private
     */
    this._aborted = false
  }

  /**
   * Ajoute une fonction à la pile d'exécution
   * @param {function|Promise<unknown>} fn
   * @param {Object|boolean} [options] Si c'est un booléen il sera utilisé comme valeur de doNotCatch
   * @param [options.doNotCatch=false] passer true pour que l'erreur soit retournée (promesse échouée) plutôt que gérée ici
   * @param [options.stopOnError=false] passer true pour que la queue soit bloquée en cas d'erreur de fn (on ne pourra plus faire de add ensuite)
   * @this {MtgApp}
   * @returns {Promise<unknown>} qui sera résolue avec la valeur retournée par fn (ou undefined en cas de plantage de fn géré ici)
   * @throws {AbortedQueueError} en sync si la queue est annulée lors de l'appel de add, en async si elle est annulée au moment où fn allait être lancée
   */
  add (fn, options) {
    if (typeof options === 'boolean') {
      options = { doNotCatch: options }
    } else if (!options || typeof options !== 'object') {
      options = {}
    }
    const { doNotCatch = false, stopOnError = false } = options
    if (fn instanceof Promise) fn = () => fn
    if (typeof fn !== 'function') throw TypeError('Queue ne gère que des fonctions ou des Promise')
    // si la pile est aborted, il fauth throw pour que le code parent soit informé
    // (sinon il utilise la valeur de résolution, que serait undefined, et continuerait comme si de rien n'était)
    if (this._aborted) {
      console.error(Error('Task added in aborted queue => canceled'))
      throwAbordedError()
    }

    // on enrobe fn pour gérer _aborted (qui peut changer entre l'appel de add et l'exécution de fn)
    const step = () => {
      if (this._aborted) {
        console.error(Error('Current queue was aborted since this task was added => task canceled'))
        throwAbordedError()
      }
      return fn()
    }

    const promise = this._stack.then(step)
    if (doNotCatch) {
      // on va retourner une promesse éventuellement rejetée, on ne garde ce rejet
      // dans la pile que si on le demande explicitement (et dans ce cas on pourra plus rien ajouter ensuite)
      this._stack = promise.catch(() => {
        // on affiche pas l'erreur puisque l'appelant est sensé la gérer
        // mais on marque la pile comme annulée si on le demande
        if (stopOnError) this._aborted = true
      })
      return promise
    }
    // sinon on empile et retourne le tout
    this._stack = promise.catch((error) => {
      console.error(error)
      if (stopOnError) this._aborted = true
    })
    return this._stack
  }

  /**
   * Annule la pile courante (qui ne pourra plus être utilisée)
   */
  abort () {
    this._aborted = true
  }
}

export default Queue
