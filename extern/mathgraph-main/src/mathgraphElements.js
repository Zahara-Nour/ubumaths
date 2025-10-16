/**
 * Ce fichier définit les tags html <mathgraph-player> et <mathgraph-editor>, permettant d'insérer des figures avec par ex
 * `<mathgraph-player" fig="le code base 64 de la figure" />`
 * ou
 * `<mathgraph-editor fig="le code base 64 de la figure pour l'ouvrir dans l'éditeur" />`
 * @see https://developer.mozilla.org/fr/docs/Web/Web_Components/Using_custom_elements
 * @see https://javascript.info/custom-elements
 * @see https://web.dev/custom-elements-best-practices/
 * @fileOverview
 */

// ATTENTION, ce fichier ne passe pas par vite, il est juste compressé avec Terser par compressMathgraphElements.js (appelé par postBuild.js)
// Il faut donc faire attention à ne pas utiliser de code js trop moderne ici
// (tous les navigateurs qui gèrent customElements doivent au moins gérer ES2017).

// on est chargé comme script indépendant, d'où la bonne vieille IIFE
(function mathgraphElements () {
  if (typeof window === 'undefined') throw Error('La définition de ce composant mathgraph ne peut être appelée que dans un navigateur')
  const customElements = window.customElements
  if (typeof customElements === 'undefined') throw Error('Ce navigateur ne permet pas d’utiliser les composants html5 personnalisés')

  /**
   * Alias de document.createElement
   * @private
   * @param {string} tag
   * @returns {HTMLElement}
   */
  const ce = (tag) => document.createElement(tag)

  /**
   * Les options de mtgOptions booléens true par défaut
   * @private
   * @type {string[]}
   */
  const optsTrue = ['displayMeasures', 'isInteractive', 'pointsAuto', 'codeBase64', 'open', 'save', 'newFig', 'options']
  const optsFalse = ['randomOnInit', 'stylePointCroix', 'onlyPoints', 'dys', 'construction', 'hideCommands']
  const optsString = ['language']
  const optsNumber = ['level', 'zoomFactor']
  const optsFunction = ['functionOnSave', 'callBackAfterReady']
  const optToAttr = {}
  const attrToOpt = {}
  for (const opt of optsTrue.concat(optsFalse, optsString, optsNumber, optsFunction)) {
    const attr = opt.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())
    optToAttr[opt] = attr
    attrToOpt[attr] = opt
  }
  const o2a = opt => optToAttr[opt]
  const attrsTrue = optsTrue.map(o2a)
  const attrsFalse = optsFalse.map(o2a)
  const attrsString = optsString.map(o2a)
  const attrsNumber = optsNumber.map(o2a)
  const attrsFunction = optsFunction.map(o2a)

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

  /**
   * La classe du custom element mathgraph-player
   * @class
   */
  class MathgraphPlayer extends HTMLElement {
    // la plupart des exemples de customElements utilisent un shadowRoot attaché à l'élément dans son constructeur
    // ici on en a pas besoin (on ne veut pas isoler les éléments internes de notre élément du reste du dom)
    // le constructeur est donc inutile.

    /**
     * Retourne la liste des attributs pour lesquels toute modif devra appeler attributeChangedCallback
     * @type {string[]}
     */
    static get observedAttributes () {
      // les noms d'attributs doivent être lowercase sans underscore (tiret autorisé)
      // cf https://html-validate.org/rules/attr-pattern.html
      return ['fig', 'python-code-id', 'javascript-code-id', 'hide-commands']
    }

    /**
     * Appelé quand notre tag est mis dans le dom.
     * Attention, son rendu n'est pas fini, à ce stade il n'a aucun child, son innerHTML est null même si y'en avait
     */
    connectedCallback (/* retry = false */) {
      // on doit être sûr que le container filé à mtgLoad soit de type block et position: 'relative'
      // console.log('connectedCallback')
      this.mtgContainer = ce('div')
      // pour empêcher une modif via du css on met ça dans l'attribut style
      // pour le modifier l'utilisateur devra le faire en js après injection dans la page, là il fait exprès et c'est à ses risques et périls
      this.mtgContainer.setAttribute('style', 'position: relative;')
      this.appendChild(this.mtgContainer)
      // if (!this.id) this.id = `mtg${mtgNum++}` // à réactiver pour le debug (si on décommente un console.log)
      // console.log( 'connected', this.id)
      // il faut un setTimeout de 0 pour que le display soit lancé quand l'élément ET SON CONTENU (même vide) est vraiment dans le dom
      // sinon mtgLoad met dedans un svg et ne le retrouve pas quand il get son id plus tard avec addDoc
      // mais il ne faut rien lancer s'il n'y a pas encore d'attribut (les ajouter va relancer un display)
      if (this instanceof MathgraphEditor || MathgraphPlayer.observedAttributes.some(attr => this.getAttribute(attr))) {
        setTimeout(this.display.bind(this), 0)
      }
    }

    /**
     * Appelé lorsque notre tag est viré du dom
     */
    disconnectedCallback () {
      // console.trace('disconnected', this.id)
      this.remove()
    }

    attributeChangedCallback (/* name, oldValue, newValue /* */) {
      // console.log('attributeChanged', name, oldValue, 'devenu', newValue)
      // ATTENTION :
      // 1) avec un custom-element déjà dans le html au chargement
      // - on est appelé au 1er chargement juste avant connectedCallback (mais isConnected est déjà true),
      //   il ne faut pas appeler display deux fois (sinon le premier plante parce que le 2e
      //   lui a vidé son container quand il veut mettre qqchose dedans)
      // - this.isConnected est true, mais connectedCallback n'a pas encore rendu la main
      // => on affecte mtgContainer dans connectedCallback et on ne fait rien ici si cet id n'existe pas
      // 2) avec un custom-element mis en js, on peut être appelé juste après connectedCallback
      // => il ne doit pas lancer de display dans ce cas
      if (!this.isConnected || !this.mtgContainer) return
      setTimeout(this.display.bind(this), 0)
    }

    /**
     * Supprime tous les childs de notre élément (efface donc la figure si y'en avait une, et passe notre propriété mtgContainer à null)
     */
    remove () {
      // console.log('remove sur', this.id)
      for (const child of this.childNodes) this.removeChild(child)
      this.mtgContainer = null
      this.app = null
    }

    /**
     * Affiche la figure
     * @param {MtgOptions} mtgOptionsSup les options passées par le display de l'appli (jamais utilisé pour le lecteur)
     * @returns {Promise<void>}
     */
    async display (mtgOptionsSup) {
      // console.log('display', mtgOptionsSup)
      try {
        if (!this.mtgContainer) throw Error('L’élément n’a pas été correctement initialisé, impossible d’afficher la figure')
        // on pourrait boucler sur les attributs observés
        // for (const attr of this.constructor.observedAttributes) { }
        // mais il faudrait ensuite des if pour gérer le type
        // Pour le player y'en a que 4, on gère manuellement
        const fig = (this.getAttribute('fig') ?? '').trim()
        const pythonCodeId = this.getAttribute('python-code-id')
        const javascriptCodeId = this.getAttribute('javascript-code-id')
        // hideCommands plus loin si y'a du code

        // depuis la version 7.3.5 MtgApp accepte une string vide comme figure (et démarre alors avec un repère orthonormal)
        // on ne fait rien si y'a rien à faire (on nous passera p'tet des attributs plus tard)
        if (!fig && !pythonCodeId && !javascriptCodeId && !(this instanceof MathgraphEditor)) return
        const svgId = this.getAttribute('svgid') // éventuellement null, pas gênant
        if (typeof window.mtgLoad !== 'function') {
          // attention à mettre le même test que dans src/mtgLoad.preload.js
          const mtgPublicPath = window.mtgPublicPath || (
            /(local(host)?|\.sesamath.dev|dev.mathgraph32.org)$/.test(window.location.hostname)
              ? 'https://dev.mathgraph32.org/js/mtgLoad/' // dev
              : 'https://www.mathgraph32.org/js/mtgLoad/' // prod
          )
          const mtgUrl = `${mtgPublicPath}mtgLoad.min.js`

          await addJs(this.getAttribute('mtgUrl') || window.mtgUrl || mtgUrl)
          if (typeof window.mtgLoad !== 'function') throw Error('Le chargement de Mathgraph a échoué (pas récupéré de fonction mtgLoad)')
        }

        // on construit svgOptions d'après les attribut de notre tag <mathgraph-xxx>
        const svgOptions = { svgId }
        const widthAttr = this.getAttribute('width')
        if (widthAttr) {
          const width = Number(widthAttr)
          if (Number.isFinite(width) && width > 0) svgOptions.width = width
          else (console.error(Error(`attribut width ${widthAttr} invalide`)))
        }
        const heightAttr = this.getAttribute('height')
        if (heightAttr) {
          const height = Number(heightAttr)
          if (Number.isFinite(height) && height > 0) svgOptions.height = height
          else (console.error(Error(`attribut height ${heightAttr} invalide`)))
        }
        // idem avec mtgOptions
        const mtgOptions = {
          isEditable: false
        }
        // on affecte les attributs récupérés
        if (fig) mtgOptions.fig = fig
        if (pythonCodeId || javascriptCodeId) {
          if (pythonCodeId) mtgOptions.pythonCodeId = pythonCodeId
          else mtgOptions.javascriptCodeId = javascriptCodeId
          // avec du code fourni, on regarde le dernier attribut surveillé
          mtgOptions.hideCommands = this.getAttribute('hide-commands') === 'true'
        }
        // et les éventuelles options de l'éditeur
        if (mtgOptionsSup) {
          Object.assign(mtgOptions, mtgOptionsSup)
        }
        // avant d'afficher il faut attendre que le précédent affichage ait terminé, sinon ça peut se crêper le chignon
        if (this.app) await this.app.abort()
        // on vire les erreurs précédentes éventuelles
        if (this.errorContainer) while (this.errorContainer.lastChild) this.errorContainer.removeChild(this.errorContainer.lastChild)
        // et on affiche
        this.app = await window.mtgLoad(this.mtgContainer, svgOptions, mtgOptions)
      } catch (error) {
        console.error(error)
        // on ajoute quand même un message sur la page (dans notre élément)
        if (!this.errorContainer) this.errorContainer = ce('div')
        // on laisse ce appendChild hors du if précédent au cas où qqun aurait vidé le contenu de notre élément
        // (si errorContainer est déjà dans l'élément ça ne fait que le remettre en dernier child)
        this.appendChild(this.errorContainer)
        const p = ce('p')
        p.style.color = 'red'
        p.appendChild(document.createTextNode('Il y a eu une erreur au chargement de cette figure Mathgraph :'))
        p.appendChild(ce('br'))
        p.appendChild(document.createTextNode(error.message))
        this.errorContainer.appendChild(p)
      }
    }
  }

  /**
   * La classe du custom element mathgraph-editor
   * @class
   */
  class MathgraphEditor extends MathgraphPlayer {
    // il a bcp plus d'attributs
    static get observedAttributes () {
      return [...attrsTrue, ...attrsFalse, attrsString, ...attrsNumber, ...attrsFunction]
    }

    // display est la seule méthode différente pour MathgraphEditor

    /**
     * Affiche l’éditeur avec la figure
     * @returns {Promise<MtgApp>}
     */
    display () {
      // on ajoute simplement les options supplémentaires de l'éditeur
      const mtgOptions = {
        isEditable: true
      }
      for (const attr of attrsTrue) {
        if (this.getAttribute(attr) === 'false') {
          const opt = attrToOpt[attr] ?? attr
          mtgOptions[opt] = false
        }
      }
      // les booléens false par défaut (on ignore local, loadCoreOnly et loadCoreWithMathJax qui n'ont pas de sens dans ce contexte)
      for (const attr of attrsFalse) {
        if (this.getAttribute(attr) === 'true') {
          const opt = attrToOpt[attr] ?? attr
          mtgOptions[opt] = true
        }
      }
      // les string et number
      for (const attr of attrsString.concat(attrsNumber)) {
        const value = this.getAttribute(attr)
        if (value) {
          const opt = attrToOpt[attr] ?? attr
          mtgOptions[opt] = attrsString.includes(opt) ? value : Number(value)
        }
      }
      // les fonctions, qui du coup doivent être globales…
      for (const attr of attrsFunction) {
        const functionName = this.getAttribute(attr)
        if (typeof window[functionName] === 'function') {
          const opt = attrToOpt[attr] ?? attr
          mtgOptions[opt] = window[functionName]
        }
      }
      super.display(mtgOptions)
    }
  }

  // On définit l'élément (le tiret dans le nom est obligatoire)
  if (!customElements.get('mathgraph-player')) {
    customElements.define('mathgraph-player', MathgraphPlayer)
    customElements.define('mathgraph-editor', MathgraphEditor)
  }
})()
