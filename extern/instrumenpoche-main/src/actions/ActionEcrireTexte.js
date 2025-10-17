/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { analyseExposantOuIndice, getTaille, getMaths, indiceFinBalise, necessiteLatex, remplaceBalises, remplaceCarSpe, traiteBalise } from '../global'
import { caracteresGrecs, svgns } from '../global/constantes'
import InfoBalise from '../global/InfoBalise'
import ActionAncetre from '../actions/ActionAncetre'
import loadMathJax from '../loadMathJax'

export default ActionEcrireTexte

// Modification version MathJax3 : plus besoin de créer un div auxiliaire (cf rev477 pour la version précédente)

/**
 * Action d'écriture d'un texte. Le texte doit avoir été créé auparavant.
 * @constructor
 * @extends ActionAncetre
 * @param {iepDoc} doc            le document propriétaire
 * @param {string} id             l'id du texte sur lequel écrire
 * @param {string} couleur        la couleur du texte
 * @param {string} taille         la taille du texte
 * @param {string} texte          Le texte à afficher
 * @param {string} style          'texte' si non fourni
 * @param {string} couleurFond
 * @param {number} opaciteFond
 * @param {string} couleurCadre
 * @param {number} epaisseurCadre
 * @param {string} marge          la marge éventuelle
 * @param {string} margeGauche    la marge gauche éventuelle
 * @param {string} margeDroite    la marge droite éventuelle
 * @param {string} margeHaut      la marge haute éventuelle
 * @param {string} margeBas       la marge basse éventuelle
 * @param {string} tempo          le tempo
 */
function ActionEcrireTexte (doc, id, couleur, taille, texte, style, couleurFond,
  opaciteFond, couleurCadre, epaisseurCadre, marge, margeGauche, margeDroite, margeHaut, margeBas, tempo) {
  ActionAncetre.call(this, doc, tempo)
  this.txt = this.doc.getElement(id, 'texte')
  this.id = id
  this.couleur = couleur
  // On remplace dans la taille les lettres O mises par les étourdis à la place de 0
  this.taille = (taille == null) ? '20' : taille.replace(/O/g, '0')
  /* @todo voir si on peut pas caster this.taille en number ici avec getTaille (pour imposer un min/max) */

  // Traitement des accents plus nécessaire avec version MathJax 3
  // this.texte = kernel.remplaceAccentsHtml(kernel.remplaceBalises(kernel.remplaceCarSpe(texte)))
  this.style = (style === null) ? 'texte' : style
  this.couleurFond = couleurFond
  this.opaciteFond = (opaciteFond == null) ? '0.6' : parseFloat(opaciteFond) / 100
  // Modification version 5.0.2. Causait des problèmes avec explorer
  // this.couleurCadre = (couleurCadre == null) ? couleur : couleurCadre
  this.couleurCadre = couleurCadre
  if ((epaisseurCadre !== null) && (couleurCadre === null)) this.couleurCadre = couleur
  //
  this.epaisseurCadre = (epaisseurCadre != null) ? epaisseurCadre : ((couleurCadre == null) ? 0 : 1)
  this.marge = (marge == null) ? 0 : parseFloat(marge)
  this.margeGauche = (margeGauche == null) ? 0 : parseFloat(margeGauche)
  this.margeDroite = (margeDroite == null) ? 0 : parseFloat(margeDroite)
  this.margeHaut = (margeHaut == null) ? 0 : parseFloat(margeHaut)
  this.margeBas = (margeBas == null) ? 0 : parseFloat(margeBas)
  this.texte = texte
  this.estLatex = this.estAffichageLatex()
  // si c'est du LaTeX demandé par l'utilisateur on y touche pas
  if (!this.estLatex) {
    // mais sinon on fait les remplacements
    this.texte = remplaceBalises(remplaceCarSpe(this.texte))
    this.texte = this.traduitCaracteresGrecs(this.texte)
    // et on regarde si y'a pas besoin de LaTeX quand même
    this.texte = this.texte.replace(/\*/g, '×')
    if (necessiteLatex(texte)) {
      // faut mettre les $ pour que prepare charge MathJax (il les vire avant de filer la string à MathJax)
      this.texte = '$' + this.traiteMaths(this.texte) + '$'
      this.estLatex = true
    }
  }
  // console.log(`constructeur ActionEcrireTexte avec \n${texte}\n =>\n ${this.texte}`)
}

ActionEcrireTexte.prototype = new ActionAncetre()
/**
 * Action écrivant le contenu du texte sur la figure
 * @param {Boolean} immediat
 * @returns {undefined}
 */
ActionEcrireTexte.prototype.execute = function (immediat) {
  if (this.txt != null) { // Pour éviter les erreurs des auteurs
    this.angle = 0 // Car on peut dans la version js faire tourner un texte
    const txt = this.txt
    txt.couleur = this.couleur
    txt.taille = this.taille
    txt.texte = this.texte
    txt.couleurFond = this.couleurFond
    txt.couleurCadre = this.couleurCadre
    txt.epaisseurCadre = this.epaisseurCadre
    txt.updateg(this.g)
    txt.positionne()
  }
  if (!immediat) this.doc.actionSuivante(immediat)
}

/**
 * Retourne true si l'affichage de texte utilise le LaTeX de façon délibérée
 * en encadrant alors le code LaTeX par deux caractères $
 * @returns {boolean}
 */
ActionEcrireTexte.prototype.estAffichageLatex = function () {
  return ((this.texte.charAt(0) === '$') && (this.texte.charAt(this.texte.length - 1) === '$'))
}

/**
 * Fonction remplaçant les codes du type £...£ représentant des caractères grecs
 * par les caractères UTF8 correspondants
 * @param {string} ch
 * @returns {string}
 */
ActionEcrireTexte.prototype.traduitCaracteresGrecs = function (text) {
  if (!text.includes('£')) return text
  // on éclate la chaîne sur £ et on regarde les morceaux impair (0 est celui qui précède le premier £)
  // Attention, par rapport au traitement précédent qui passaient toutes les regex £pattern£,
  // avec ce fonctionnement si jamais on a un nb impair de £,
  // le dernier morceau va se retrouver fermé avec le £ manquant
  // 'bla bla £pi£ bla bla £portnawak' => 'bla bla π bla bla £portnawak£'
  const strTraduite = text.split('£').map((fragment, i) => {
    // si impair, faut regarder si c'est un caractère connu
    if (i % 2) return caracteresGrecs[fragment] || `£${fragment}£`
    return fragment
  }).join('')
  // on vire le dernier £ si on l'a ajouté
  if ((text.length - text.replace(/£/g, '').length) % 2) {
    console.warn(`Il y a un nombre impair de £ dans cette chaîne : ${text}`)
    return strTraduite.substr(0, strTraduite.length - 1)
  }
  return strTraduite
}
/**
 * Fonction traitant la chaîne ch pour la transcrire en code LaTeX
 * Renvoie la chaîne LaTeX correspondante.
 * Si la chaîne contient des balises <br>, un tableau LaTeX est utilisé pour rendre le contenu
 * @param {string} ch la chaîne à traiter
 * @returns {string} la chaîne LaTeX correpondante une fois ch traduite
 */
ActionEcrireTexte.prototype.traiteMaths = function (ch) {
  let i
  const ch2 = ch
  const bStyletTexte = this.style === 'texte'
  // On recherche les codes <br> et on remplace les lignes par une matrice
  // avant c'était new RegExp('<br>|</br>', 'gi'),
  // donc on laisse le cas </br> complètement invalide en html,
  // mais on gère le bon qui est <br/> ou <br />
  const a = ch2.split(/<\/?br *\/?>/gi)
  // if (a.length <= 1) return traiteAccents(getMaths(ch, bStyletTexte)) // True pour mode texte par défaut
  // Modif version MathJax 3
  if (a.length <= 1) return getMaths(ch, bStyletTexte) // True pour mode texte par défaut
  let res = '\\begin{array}{l}'
  for (i = 0; i < a.length; i++) {
    if (i !== 0) res += '\\\\'
    // Modif version MathJax 3
    // res += traiteAccents(getMaths(a[i], bStyletTexte)) // true pour mode texte par défaut
    res += getMaths(a[i], bStyletTexte) // true pour mode texte par défaut
  }
  res += '\\end{array}'
  return res
}

/**
 * Fonction appelée lors de l'appel de iepDoc.creeActions()
 * Si l'écriture du texte ne nécessite pas l'emploi du LaTeX, on crée l'élément grapique qui sera
 * démasqué quand l'action sera exécutée
 * Sinon, on charge mathjax si besoin et on demande à MathJax via sa pile d'appels
 * de traiter le texte pour en faire du svg et appeler setReady quand ce sera terminé
 */
ActionEcrireTexte.prototype.prepare = function () {
  let latexString
  if (this.estLatex) {
    latexString = this.texte.replace(/^\$(.*)\$$/, '$1')
    if (!latexString) {
      console.error(Error('texte latex mais pas enveloppé de $, ignoré'), this.texte)
      this.estLatex = false
    }
  }
  if (this.estLatex) {
    const self = this
    loadMathJax().then(() => {
      /* global MathJax */
      const width = self.doc.getWidth()
      // const taille = getTaille(self) - 2
      const taille = self.taille
      const ch = self.prelatex() + latexString
      // self.ex = taille / 2
      self.ex = taille * 0.45
      const options = {
        em: taille,
        ex: self.ex,
        containerWidth: width,
        display: false
      }
      if (self.doc.debug) console.log('On passe à MathJax la string', ch)
      return MathJax.tex2svgPromise(ch, options)
    }).then((html) => {
      // MathJax retourne du html avec un svg dedans, du genre
      // <mjx-container …><svg xmlns="http://www.w3.org/2000/svg" …>…</svg></mjx-container>
      // console.log('MathJax retourne ce svg', html)
      self.html = html
      self.creegLatex()
      self.setReady()
    }).catch(error => {
      console.error(error)
      alert('Pb Mathjax, impossible d’afficher le LaTeX correctement')
    })
  } else {
    this.creeg()
    this.setReady()
  }
}

/**
 * Retourne l'en-tête à rajouter pour que, dans le cas d'utilisation du
 * LaTeX, l'affichage soit de la bonne couleur.
 */
ActionEcrireTexte.prototype.prelatex = function () {
  return '\\color{' + this.couleur + '}'
}

/**
 * Fonction appelée par prepare() qui récupère l'élement svg représentant
 * la formule dans la propriété html (car y'a un conteneur html <mjx-container>)
 * Rajoute les éléments graphiques correspondant à un cadre si une couleur de fond
 * et un cadre ont été demandés
 */
ActionEcrireTexte.prototype.creegLatex = function () {
  try {
    const s = this.html.firstChild
    // clonage profond du svg créé par MathJax dans le html,
    // ça vire les attributs non standard qu'il ajoute (<g data-mml-node="…" par ex)
    const svg = s.cloneNode(true)
    // on wrap le svg dans un tag g
    const g = document.createElementNS(svgns, 'g')
    g.appendChild(svg)

    // on lui ajoute les attributs imposés par l'action courante, MathJax donne des attributs width et height à ses svg
    const w = parseFloat(s.getAttribute('width')) * this.ex
    const h = parseFloat(s.getAttribute('height')) * this.ex
    const svgVa = svg.style['vertical-align']
    const va = (svgVa ? parseFloat(svgVa) || 1 : 1) * this.ex
    svg.setAttribute('width', w + 'px')
    svg.setAttribute('height', h + 'px')
    svg.style['vertical-align'] = `${va}px`
    svg.setAttribute('x', '0')
    const taille = getTaille(this)
    svg.setAttribute('y', String(-taille)) // Différent de MathGraph32
    g.setAttribute('visibility', 'hidden') // A revoir version MathJax 3
    // g.setAttribute("id",this.id)
    if ((this.couleurFond !== null) || (this.couleurCadre !== null)) {
      g.setAttribute('visibility', 'hidden')
      this.doc.svg.appendChild(g)
      this.rectAff = {}
      const epc = parseFloat(this.epaisseurCadre)
      const { x, y, width, height } = g.getBBox()
      this.rectAff.height = height + 2 * epc + 4 + 2 * this.marge + this.margeHaut + this.margeBas
      this.rectAff.width = width + 2 * epc + 2 + 2 * this.marge + this.margeGauche + this.margeDroite
      this.rectAff.x = x - epc - 1 - this.marge - this.margeGauche
      this.rectAff.y = y - epc - 1 - this.marge - this.margeHaut
      g.setAttribute('visibility', 'visible')
      this.doc.svg.removeChild(g)
      this.creeRectangle(g, (this.couleurFond == null) ? 'white' : this.couleurFond)
    }
    // et on affecte ça à la propriété g
    this.g = g
  } catch (error) {
    console.error('Erreur dans ActionEcrireTexte.creegLatex (on remplace par un <g> vide) :', error)
    this.g = document.createElementNS(svgns, 'g') // Crée un g vide en cas de problème
  }
}

/**
 * Retourne l'élément graphique associé dans le cas où l'affichage n'utilise pas le LaTeX
 * Avant appel, this.text doit voir été affecté
 */
ActionEcrireTexte.prototype.creeg = function () {
  let indbalise, tspan, ch, ch2, style, txt, ind, indexp, indind, mini, bexp, tailleind, stylespan,
    y, sp, i, debutLigne, an
  let dy = 0 // Le baselineshift de chaque tspan
  const inf = '<' // Equivalent du symbole <
  const debexp = '£e('
  const debind = '£i('
  const g = document.createElementNS(svgns, 'g')
  const taille = getTaille(this)
  const hautlig = taille + 2
  let decblp = 0 // Décalage vers le bas de la ligne précédente
  const decalage = taille * 0.4 // Décalage vers le bas ou le haut en cas d'indice ou d'exposant

  if (this.texte !== '') {
    txt = document.createElementNS(svgns, 'text')
    txt.setAttribute('pointer-events', 'none')
    txt.setAttribute('x', 0)
    txt.setAttribute('y', 0)
    style = 'text-anchor:left;font-size:' + taille + 'px;' + 'fill:' + this.couleur + ';'
    txt.setAttribute('style', style)
    // On remplace les espaces par des espaces insécables
    ch2 = this.texte.replace(/ /g, '\u00A0')
    // Affecter une longueur ne peut être efficace que pour du texte simpel sans balise
    if ((this.texte.indexOf(inf) === -1) && (this.texte.indexOf(debexp) === -1) && (this.texte.indexOf(debind) === -1) &&
      (this.texte.indexOf('<br>') === -1)) {
      txt.appendChild(document.createTextNode(ch2))
    } else {
      sp = ch2.split(/<br>/gi)
      y = -hautlig
      for (i = 0; i < sp.length; i++) {
        debutLigne = true
        ch = sp[i]
        while (ch !== '') {
          indbalise = ch.indexOf(inf)
          indexp = ch.indexOf(debexp)
          indind = ch.indexOf(debind)
          if (debutLigne) y += hautlig + decblp
          if (indexp !== -1) y += decalage
          if ((indbalise === -1) && (indexp === -1) && (indind === -1)) {
            // txt.appendChild(document.createTextNode(this.texte))
            tspan = document.createElementNS(svgns, 'tspan')
            tspan.setAttribute('pointer-events', 'none')
            tspan.setAttribute('dy', dy)
            if (debutLigne) {
              tspan.setAttribute('x', 0)
              tspan.setAttribute('y', y)
              debutLigne = false
            }
            dy = 0 // On est revenu au niveau 0
            tspan.appendChild(document.createTextNode(ch))
            txt.appendChild(tspan)
            break
          } else {
            while ((ch.indexOf(inf) !== -1) || (ch.indexOf(debexp) !== -1) ||
                    (ch.indexOf(debind) !== -1)) {
              indbalise = ch.indexOf(inf)
              indexp = ch.indexOf(debexp)
              indind = ch.indexOf(debind)
              if (indbalise === -1) {
                if (indexp === -1) mini = indind
                else mini = (indind === -1) ? indexp : Math.min(indind, indexp)
              } else {
                if (indexp === -1) mini = (indind === -1) ? indbalise : Math.min(indbalise, indind)
                else {
                  if (indind === -1) mini = Math.min(indbalise, indexp)
                  else mini = Math.min(indbalise, indind, indexp)
                }
              }
              if (mini > 0) { // Il y a du texte avant les balises
                tspan = document.createElementNS(svgns, 'tspan')
                tspan.setAttribute('pointer-events', 'none')
                tspan.setAttribute('dy', dy)
                if (debutLigne) {
                  tspan.setAttribute('x', 0)
                  tspan.setAttribute('y', y)
                  debutLigne = false
                }
                dy = 0 // On est revenu au niveau 0
                tspan.appendChild(document.createTextNode(ch.substring(0, mini)))
                txt.appendChild(tspan)
                ch = ch.substring(mini)
              } else {
                if (indbalise === 0) {
                  const infoBalise = new InfoBalise(false, false, false, this.couleur, '', taille)
                  ind = indiceFinBalise(ch)
                  if (ind === -1) traiteBalise(ch, infoBalise, txt, debutLigne, y)
                  else traiteBalise(ch.substring(0, ind), infoBalise, txt, debutLigne, y)
                  debutLigne = false
                  if (ind !== -1) ch = ch.substring(ind); else ch = ''
                  dy = 0 // On est revenu au niveau 0
                } else { // mini est égal à 0
                  bexp = mini === indexp
                  an = analyseExposantOuIndice(ch)
                  tspan = document.createElementNS(svgns, 'tspan')
                  tspan.setAttribute('pointer-events', 'none')
                  tspan.setAttribute('dy', dy + 'px')
                  if (debutLigne) {
                    tspan.setAttribute('x', 0)
                    tspan.setAttribute('y', y)
                    debutLigne = false
                  }
                  if (an.erreur) tspan.appendChild(document.createTextNode(ch))
                  else {
                    tspan.appendChild(document.createTextNode(an.operande))
                    txt.appendChild(tspan)
                    tspan = document.createElementNS(svgns, 'tspan')
                    tspan.setAttribute('pointer-events', 'none')
                    tspan.appendChild(document.createTextNode(an.exposant))
                    dy = decalage
                    if (bexp) dy = -dy
                    else decblp = dy
                    tspan.setAttribute('dy', dy + 'px')
                    tailleind = taille * 0.6
                    stylespan = 'font-size:' + tailleind + 'px;'
                    tspan.setAttribute('style', stylespan)
                    txt.appendChild(tspan)
                    dy = -dy // Car sinon la suite sera décalée aussi en hauteur
                  }
                  ch = an.texte
                }
              }
            }
          }
        }
      }
    }
    g.appendChild(txt)
  }
  g.setAttribute('visibility', 'hidden')
  // g.setAttribute("id",this.id)
  if ((this.couleurFond != null) || (this.couleurCadre != null)) {
    g.setAttribute('visibility', 'hidden')
    this.doc.svg.appendChild(g)
    this.rectAff = {}
    const epc = parseFloat(this.epaisseurCadre)
    this.rectAff.height = g.getBBox().height + 2 * epc + 3 + 2 * this.marge + this.margeHaut + this.margeBas
    this.rectAff.width = g.getBBox().width + 2 * epc + 2 + 2 * this.marge + this.margeGauche + this.margeDroite
    this.rectAff.x = g.getBBox().x - epc - 1 - this.marge - this.margeGauche
    this.rectAff.y = g.getBBox().y - epc - 1 - this.marge - this.margeHaut
    g.setAttribute('visibility', 'visible')
    this.doc.svg.removeChild(g)
    this.creeRectangle(g, (this.couleurFond == null) ? 'white' : this.couleurFond)
  }
  this.g = g
}

/**
 * Renvoie true si la chaîne ch contient des balises &lt;u\> ou \<i\>
 * @param {string} ch
 * @returns {boolean}
 */
ActionEcrireTexte.prototype.contientBalisesItaliqueOuUnderlineOuFontOuBold = function (ch) {
  return (/<(u|b|i|font[^>]+)>/gi).test(ch)
}

/**
 * Fonction appelée dans le cas où l'affihcage de texte a une couleur de fond ou doit être encadrée.
 * Elle rajoute le rectangle au g élément avant l'affichage correspondant au texte (de façon à pouvoir
 * le cas échéant effacer le fond avant l'affichage du texte)
 * @param {SVGGElement} g l'élément g qui contient l'affichage de texte (<g> normal ou <svg> dans le cas du LaTeX)
 */
ActionEcrireTexte.prototype.creeRectangle = function (g, coulFond) {
  const r = document.createElementNS(svgns, 'rect')
  const style = 'stroke-width:' + this.epaisseurCadre + 'px;' + 'stroke:' + this.couleurCadre + ';' +
    'fill:' + coulFond + ';fill-opacity:' + this.opaciteFond + ';'
  r.setAttribute('style', style)
  r.setAttribute('x', this.rectAff.x)
  r.setAttribute('y', this.rectAff.y)
  r.setAttribute('width', this.rectAff.width)
  r.setAttribute('height', this.rectAff.height)
  r.setAttribute('pointer-events', 'none')
  g.insertBefore(r, g.childNodes[0])
}
