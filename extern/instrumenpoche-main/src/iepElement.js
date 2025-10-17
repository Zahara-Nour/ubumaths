/**
 * Ce fichier définit le tags html <lecteur-instrumenpoche> permettant d'insérer des animation en indiquant le xml à charger avec par ex
 * `<lecteur-instrumenpoche" xml="https://urlDuScript"></lecteur-instrumenpoche>`
 * @see https://developer.mozilla.org/fr/docs/Web/Web_Components/Using_custom_elements
 * @see https://javascript.info/custom-elements
 * @see https://web.dev/custom-elements-best-practices/
 * @module
 */

// ATTENTION, ce fichier ne passe pas par babel (ni par webpack, il est juste compressé avec Terser)
// ça permet de le conserver léger, mais il faut faire attention à ne pas
// utiliser de code js trop moderne ici (tous les navigateurs qui gèrent customElements doivent au
// moins gérer ES2017.

// on est chargé comme script indépendant, d'où la bonne vieille IIFE
(function iepElement () {
  if (typeof window === 'undefined') throw Error('La définition de ce composant instrumenpoche ne peut être appelée que dans un navigateur')
  const customElements = window.customElements
  if (typeof customElements === 'undefined') throw Error('Ce navigateur ne permet pas d’utiliser les composants html5 personnalisés')

  const isDev = /\.(local|sesamath\.dev)$/.test(location.hostname)
  const iepUrl = `https://instrumenpoche.sesamath.${isDev ? 'dev' : 'net'}/iep/js/iepLoad.min.js`

  /**
   * Alias de document.createElement
   * @param {string} tag
   * @returns {HTMLElement}
   */
  const ce = (tag) => document.createElement(tag)

  const jsAdded = {}
  // let mtgNum = 0

  function addJs (url, { timeout = 30_000 } = {}) {
    if (!jsAdded[url]) {
      jsAdded[url] = new Promise((resolve, reject) => {
        function onLoad () {
          clearTimeout(timerId)
          elt.removeEventListener('load', onLoad)
          resolve()
        }

        /**
         * @private
         * @type {HTMLElement}
         */
        const body = window.document.getElementsByTagName('body')[0]
        const elt = ce('script')
        elt.async = true
        body.appendChild(elt)
        elt.addEventListener('load', onLoad)
        const timerId = setTimeout(() => reject(Error(`Timeout, ${url} n’a pas été chargé en ${Math.round(timeout / 1000)}s`)), timeout)
        elt.src = url
      })
    }
    return jsAdded[url]
  }

  // Par défaut un customElement est de type inline.
  // On veut qu'il soit en block par défaut, mais laisser à l'utilisateur la possibilité de le mettre en inline ou inline-block
  // sans casser le positionnement de nos input (d'où l'ajout d'un div entre notre customElement et le svg)
  // On pourrait hériter de HTMLElement et le forcer en block dans connectedCallback,
  // mais ça interdirait à l'utilisateur d'utiliser une figure en inline.

  class IepPlayer extends HTMLElement {
    // la plupart des exemples de customElements utilisent un shadowRoot attaché à l'élément dans son constructeur
    // ici on en a pas besoin (on ne veut pas isoler les éléments internes de notre élément du reste du dom)
    // le constructeur est donc inutile.

    /**
     * Appelé quand notre tag est mis dans le dom.
     * Attention, son rendu n'est pas fini, à ce stade il n'a aucun child, son innerHTML est null même si y'en avait
     */
    connectedCallback (/* retry = false */) {
      // on doit être sûr que le container filé à mtgLoad soit de type block et position: 'relative'
      this.container = ce('div')
      this.appendChild(this.container)
      // il faut un setTimeout de 0 pour que le display soit lancé quand l'élément ET SON CONTENU (même vide) est vraiment dans le dom
      setTimeout(this.display.bind(this), 0)
    }

    /**
     * Appelé lorsque notre tag est viré du dom
     */
    disconnectedCallback () {
      // console.log(Date.now(), 'disconnected', this.id)
      this.remove()
    }

    /**
     * Retourne la liste des attributs que l'on veut surveiller
     * @return {string[]}
     */
    static get observedAttributes () {
      return ['xml', 'autostart', 'debug', 'zoom']
    }

    attributeChangedCallback (/* name, oldValue, newValue */) {
      // ATTENTION :
      // - on est appelé au 1er chargement juste avant connectedCallback (mais isConnected est déjà true),
      //   il ne faut pas appeler display deux fois (sinon le premier plante parce que le 2e
      //   lui a vidé son container quand il veut mettre qqchose dedans)
      // - this.isConnected est true, mais connectedCallback n'a pas encore rendu la main
      // => on affecte container dans connectedCallback et on ne fait rien ici si cet id n'existe pas
      // console.log(Date.now(), 'attributeChanged', name, this.isConnected, this.id)
      if (!this.isConnected || !this.container) return
      // il faut un setTimeout de 0 pour que le display soit lancé quand l'élément ET SON CONTENU (même vide) est vraiment dans le dom
      const show = () => this.display().catch(this.showError.bind(this))
      setTimeout(show, 0)
    }

    /**
     * Supprime tous les childs de notre élément (efface donc la figure si y'en avait une, et passe notre propriété container à null)
     */
    remove () {
      // console.log('remove sur', this.id)
      for (const child of this.childNodes) this.removeChild(child)
      this.container = null
    }

    /**
     * Affiche l'animation
     * @returns {Promise<void>}
     */
    async display () {
      try {
      // console.log(Date.now(), 'display', this.id)
        if (!this.container) throw Error('L’élément n’a pas été correctement initialisé, impossible d’afficher l’animation')
        const xml = (this.getAttribute('xml') ?? '').trim()
        if (!xml) throw Error('Aucune animation à afficher')
        if (typeof window.iepLoad !== 'function') {
          await addJs(this.getAttribute('iepUrl') || window.iepUrl || iepUrl)
          if (typeof window.iepLoad !== 'function') throw Error('Le chargement d’instrumenpoche a échoué (pas récupéré de fonction iepLoad)')
        }

        return new Promise((resolve, reject) => {
          // on construit nos options d'après les attribut de notre tag
          const iepOptions = {}
          const autostart = this.getAttribute('autostart')
          if (['0', 'false', 'off'].includes(autostart)) iepOptions.autostart = false
          const debug = this.getAttribute('debug')
          if (['1', 'true', 'on'].includes(debug)) iepOptions.debug = true
          const zoom = this.getAttribute('zoom')
          if (['1', 'true', 'on'].includes(zoom)) iepOptions.zoom = true
          window.iepLoad(this.container, xml, iepOptions, (error, iepApp) => {
            if (error) return reject(error)
            if (!iepApp) return reject(Error('Le chargeur de l’application instrumenpoche existe mais il ne retourne pas l’application'))
            resolve(iepApp)
          })
        })
        // console.log('figure chargée dans', this.id, container)
      } catch (error) {
        return Promise.reject(error)
      }
    }

    showError (error) {
      console.error(error)
      // on ajoute quand même un message sur la page
      const p = ce('p')
      p.className = 'error'
      p.innerHTML = 'Il y a eu une erreur au chargement de cette figure Mathgraph&nbsp;:<br>' + error.message
      this.appendChild(p)
    }
  }

  // On définit l'élément (le tiret dans le nom est obligatoire)
  if (!customElements.get('lecteur-instrumenpoche')) {
    customElements.define('lecteur-instrumenpoche', IepPlayer)
  }
})()
