/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ce, cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import Complexe from '../types/Complexe'
import Dimf from '../types/Dimf'
import Fonte from '../types/Fonte'
import Nat from '../types/Nat'
import Pointeur from '../types/Pointeur'
import StyleEncadrement from '../types/StyleEncadrement'
import { preventDefault, traiteAccents } from '../kernel/kernel'
import CalcR from '../kernel/CalcR'
import CalcC from '../kernel/CalcC'
import CAffLiePt from './CAffLiePt'
import CLatex from './CLatex'
import CValeurAngle from './CValeurAngle'
import addQueue from 'src/kernel/addQueue'
import CCbGlob from 'src/kernel/CCbGlob'

export default CEditeurFormule

/**
 * Classe représentant un éditeur de formule permettant à l'utilisateur de modifier
 * la formule d'un calcul sur la figure.
 * On peut associer à l'éditeur une fonction de callBack nommée callBackOK qui
 * sera appelée quand l'utilisateur aura validé sa réponse.
 * @constructor
 * @extends CAffLiePt
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si l'objet est un élément final de construction.
 * @param {Color} couleur  La couleur d'éciture de l'éditeur (et du cadre éventuel).
 * @param {number} xNom  L'abscisse d'affichage de l'éditeur
 * @param {number} yNom  L'ordonnée d'affichage de l'éditeur
 * @param {number} decX  Décalage horizontal du nom
 * @param {number} decY  Décalage vertical du nom
 * @param {boolean} masque  true si l'éditeur est masqué
 * @param {CPt} pointLie Le pointauquel l'éditeur est lié
 * @param {number} taillePolice  Indice de la taiile de police utilisée
 * @param {boolean} encadrement  true si encadré.
 * @param {boolean} effacementFond  true si on efface le fond de l'en-tête.
 * @param {Color} couleurFond  La couleur de fond de l'en-tête.
 * @param {CCalcul} calculAssocie  Le calcul dont l'éditeur peut changer la formule.
 * @param {string} enTete  Ce qui est affiiché devant l'éditeur proprement dit. Encadrer par des $
 * pour obtenir un affichage LaTeX.
 * @param {number} nbcol  Le nombre de colonnes de l'éditeur.
 * @param {boolean} affichageFormule  true si on affiche la formule à droite de l'éditeur.
 * @param {string} preCodeLaTeX  Donne le code LaTeX de ce qu'il faut afficher entre l'éditeur
 * et l'affichage de la formule quand cet affichage est demandé.
 * @param {boolean} variables1Car  true si on n'utilise que des calculs et variables dont les nomes sont de 1 caractère.
 * Dans ce cas les signes de multiplications sont omis dans l'affichage de formule s'il est demané.
 * @param {boolean} affLaTeXPremierAffichage  true si la formule dit être affichée à droite de l'éditeur
 * immédiatement après le chargement de la figure.
 * @param {boolean} affichageTempsReel  true si l'affichage de formule (en LaTeX) à droite de l'éditeur doit se faire au fur et à mesure que l'utilisateur tape au clavier.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CEditeurFormule}
 */
function CEditeurFormule (listeProprietaire, impProto, estElementFinal, couleur, xNom, yNom,
  decX, decY, masque, pointLie, taillePolice, encadrement, effacementFond, couleurFond, calculAssocie,
  enTete, nbcol, affichageFormule, preCodeLaTeX, variables1Car,
  affLaTeXPremierAffichage, affichageTempsReel, fixed) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) {
      CAffLiePt.call(this, listeProprietaire)
    } else {
      CAffLiePt.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, encadrement, effacementFond, couleurFond,
        CAffLiePt.alignHorRight, CAffLiePt.alignVerTop, null, fixed)
      this.calculAssocie = calculAssocie
      this.enTete = enTete
      this.nbcol = nbcol
      this.affichageFormule = affichageFormule
      // Lorsqu'on exporte la figure il n'a pas d'éditeur affiché et on ne tient pas compte du preCodeLatex
      this.preCodeLaTeX = this.listeProprietaire.isForExport ? '' : preCodeLaTeX
      this.variables1Car = variables1Car
      this.affLaTeXPremierAffichage = affLaTeXPremierAffichage
      this.affichageTempsReel = affichageTempsReel
    }
    this.indErr = new Pointeur(0)
    this.angText = new CValeurAngle(listeProprietaire, 0) // Le seul affichage de texte qui ne peut pas être tourbé. Ajout version 6.3.3
  }
  this.callBackOK = null // Ajout version 4.9.3
}

CEditeurFormule.prototype = new CAffLiePt()
CEditeurFormule.prototype.constructor = CEditeurFormule
CEditeurFormule.prototype.superClass = 'CAffLiePt'
CEditeurFormule.prototype.className = 'CEditeurFormule'

CEditeurFormule.prototype.numeroVersion = function () {
  return 4
}

CEditeurFormule.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.calculAssocie)
  const ind2 = listeSource.indexOf(this.pointLie)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CEditeurFormule(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque, listeCible.get(ind2, 'CPt'),
    this.taillePolice, this.encadrement, this.effacementFond, this.couleurFond,
    listeCible.get(ind1, 'CCalcul'), this.enTete, this.nbcol, this.affichageFormule, this.preCodeLaTeX,
    this.variables1Car, this.affLaTeXPremierAffichage, this.affichageTempsReel, this.fixed)
}

/**
 * Fonction translatant le point de (decalagex, decalagey)
 * @param {number} decalagex
 * @param {number} decalagey
 * @returns {void}
 */
CEditeurFormule.prototype.translateDe = function (decalagex, decalagey) {
  this.placeNom(this.xNom + decalagex, this.yNom + decalagey)
}

CEditeurFormule.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CAffLiePt.prototype.depDe.call(this, p) || this.calculAssocie.depDe(p))
}

CEditeurFormule.prototype.dependDePourBoucle = function (p) {
  return CAffLiePt.prototype.dependDePourBoucle.call(this, p) || this.calculAssocie.dependDePourBoucle(p)
}
/**
 * Fournit la chaîne représentant l'en-tête à afficher devant l'éditeur proprement dit
 * @returns {string}
 */
CEditeurFormule.prototype.rendChaineAffichage = function () {
  let i
  if (this.enTete === '') {
    let ch = this.calculAssocie.nomCalcul
    if (this.calculAssocie.estDeNatureCalcul(Nat.or(NatCal.NFonction, NatCal.NFonctionComplexe))) {
      ch = ch + '(' + this.calculAssocie.nomsVariables + ')'
    } else {
      if (this.calculAssocie.estDeNatureCalcul(NatCal.NTteFoncRouC)) {
        // CFoncNVar fonc = (CFoncNVar) calculAssocie;
        ch = ch + '('
        for (i = 0; i < this.calculAssocie.nbVar; i++) {
          ch = ch + this.calculAssocie.nomsVariables[i]
          if (i !== this.calculAssocie.nbVar - 1) ch = ch + ','
        }
        ch = ch + ')'
      }
    }
    ch = ch + ' = '
    ch = '$' + ch + '$'
    return ch
  } else return this.enTete
}

CEditeurFormule.prototype.getNature = function () {
  return NatObj.NEditeurFormule
}

CEditeurFormule.prototype.montre = function () {
  CAffLiePt.prototype.montre.call(this)
  this.editeur.style.visibility = 'visible'
  if (this.affichageFormule) {
    if (this.glatex === undefined) {
      this.glatex = this.latex.createg()
      const listePr = this.listeProprietaire
      const svgApp = document.getElementById(listePr.id + 'figurePanel')
      const svg = svgApp !== null ? svgApp : document.getElementById(listePr.id) // Modifié version 6.3.0
      svg.appendChild(this.glatex)
    }
    this.glatex.setAttribute('visibility', 'visible')
  }
}

CEditeurFormule.prototype.cache = function () {
  CAffLiePt.prototype.cache.call(this)
  this.editeur.style.visibility = 'hidden'
  if (this.affichageFormule && this.glatex) this.glatex.setAttribute('visibility', 'hidden')
}

/**
 * Fonction appelée pour l'événement onblur de l'éditeur.
 * Attention this pointe sur le composant
 * @returns {void}
 */
CEditeurFormule.prototype.onblur = function () {
  // S'il n'y a plus d'implémentation graphique de l'éditeur il ne faut pas traiter l'événement onblur
  if (this.hasgElement) {
    const b = this.validation(true)
    if (b) this.demarquePourErreur()
    else this.marquePourErreur()
  }
}
/**
 * Fonction appelée par l'événement onkeyup de l'éditeur
 * Attention this pointe sur le composant
 * @param {Event} evt
 * @returns {void}
 */
CEditeurFormule.prototype.onkeyup = function (evt) {
  // Non traité si c'est la touche entrée ou une touche de déplacement de curseur
  const kc = evt.keyCode
  if (kc === 13) { // Touche entrée
    // Version 7.4.2 : pour que l'événement touche Entrée ne remonte pas vers les exos j3P car sinon
    // on va évaluer la réponse de l'élève
    preventDefault(evt)
    evt.stopPropagation()
  }
  // On sort si touche entrée ou déplacement à gauche ou à droite
  if ((evt.charCode === 0) && ((kc === 13) || (kc === 37) || (kc === 39))) return
  // On regarde si un set de caractères autorisés a été spécifié :
  const listePr = this.listeProprietaire
  const svgApp = document.getElementById(listePr.id + 'figurePanel') // Modifié version 6.3.0
  const svg = svgApp !== null ? svgApp : document.getElementById(listePr.id)
  const dimf = new Dimf(svg)
  // var doc = listePr.documentProprietaire;
  const chCalcul = this.variables1Car ? listePr.addImplicitMult(this.editeur.value) : this.editeur.value
  const indErr = this.indErr

  const calculAssocie = this.calculAssocie
  // On autorise d'utiliser un calcul non créé par l'utilisateur
  const indDernier = listePr.indexOf(calculAssocie) - 1
  const varFor = calculAssocie.variableFormelle()
  const bcomplexe = calculAssocie.estDeNatureCalcul(
    Nat.or(NatCal.NCalculComplexe, NatCal.NFonctionComplexe, NatCal.NFoncCPlusieursVar)
  )
  if (bcomplexe
    ? CalcC.verifieSyntaxeComplexe(listePr, chCalcul, indErr,
      indDernier, varFor)
    : CalcR.verifieSyntaxe(listePr, chCalcul, indErr, indDernier, varFor)) {
    this.demarquePourErreur()
  }
  if (this.affichageFormule && this.affichageTempsReel) {
    const calc = bcomplexe
      ? CalcC.ccbComp(chCalcul, listePr, 0,
        chCalcul.length - 1, varFor)
      : CalcR.ccb(chCalcul, listePr, 0, chCalcul.length - 1, varFor)
    // try rajouté version 4.7.3
    // cadre.repaintFigureSansCalcul();

    this.latex.chaineCommentaire = this.preCodeLaTeX + ' ' + calc.chaineLatexSansPar(varFor)
    this.latex.positionne(false, dimf)
    this.latex.setReady4MathJax()
    // Pas de double appel de queue quand on est en train de taper dans le champ d'édition'
    this.callBack(svg)
  }
}

/**
 * Fonction qui, dans le cas où l'éditeur a un affichage associé de la formule à sa droite en Latex,
 * actualise cet affichage LaTeX
 * Cette fonction est appelée quand on modifie la formule d'une fonction via l'outil de modification d'objet
 * numérique
 * @param {SVGElement} svg le svg contenant la figure
 */
CEditeurFormule.prototype.updateLatex = function (svg) {
  if (this.existe && this.affichageFormule) {
    const dimf = new Dimf(svg)
    const calculAssocie = this.calculAssocie
    // On autorise d'utiliser un calcul non créé par l'utilisateur
    const varFor = calculAssocie.variableFormelle()
    this.latex.chaineCommentaire = this.preCodeLaTeX + ' ' + calculAssocie.calcul.chaineLatexSansPar(varFor)
    this.latex.positionne(false, dimf)
    this.latex.setReady4MathJax()
    // Pas de double appel de queue quand on est en train de taper dans le champ d'édition'
    this.callBack(svg)
  }
}

CEditeurFormule.prototype.metAJour = function () {
  const listePr = this.listeProprietaire
  const svgApp = document.getElementById(listePr.id + 'figurePanel') // Modifié version 6.3.0
  const svg = svgApp !== null ? svgApp : document.getElementById(listePr.id)
  this.updateLatex(svg)
}

/**
 * Fonction appelée par l'événement onkeypress de l'éditeur
 * Attention this pointe sur le composant
 * @param {Event} evt
 * @returns {void}
 */
CEditeurFormule.prototype.onkeypress = function (evt) {
  let i, edit, ind, ch, s, b
  const self = this
  if (evt.keyCode === 13) {
    preventDefault(evt) // Pour compatibilité avec j3p
    // Version 7.4.2 : en remet evt.stopPropagation() car sinon ds les exos j3P on appelle l'évaluatio de la réponse
    // après avoir appuyé sur la touche entrée dans l'éditeur
    evt.stopPropagation() // Pour compatibilité avec j3p
    b = this.validation(true)
    if (b) this.demarquePourErreur()
    else this.marquePourErreur()
    // Ajout version 4.9.3
    if ((this.callBackOK !== null) && b && (this.editeur.value.length !== 0)) this.callBackOK.call()
    //  evt.preventDefault(); // Supprimé version 5.2 pour que le clavier des périphériques mobile se replie
    // Sinon avec clavier on garde le focus avec le point d'insertion à l'endroit de la faute
    // Ci-dessous nécessaire d'utiliser la queue de MathJax car sinon on blur peut appeler la fonction
    // validation() trop tôt
    if (!this.listeProprietaire.documentProprietaire.hasMouse) {
      addQueue(function () {
        self.blur()
      })
    }
    return
  }
  // On regarde si un set de caractères autorisés a été spécifié :
  if (this.charset && this.charset !== '') {
    if ((evt.charCode !== 0) && this.charset.indexOf(String.fromCharCode(evt.charCode)) === -1) {
      preventDefault(evt)
      return
    }
  }
  if (evt.charCode === 40) { // On tape une parenthèse ouvrante
    // Si l'expression est correcte au niveau des parenthèses et si le curseur n'est suivi
    // que d'espaces ou de parenthèses fermantes, on rajoute une parenthèse fermante
    edit = this.editeur
    ind = edit.selectionStart
    ch = edit.value
    s = 0
    for (i = 0; i < ch.length; i++) {
      if (ch.charAt(i) === '(') s++
      else if (ch.charAt(i) === ')') s--
    }
    b = true
    for (i = ind; i < ch.length; i++) {
      if ((ch.charAt(i) !== ')') || (ch.charAt(i) !== ')')) b = false
    }
    if ((s === 0) && b) {
      edit.value = edit.value.substring(0, ind) + '()' + edit.value.substring(ind)
      edit.selectionStart = ind + 1
      edit.selectionEnd = ind + 1
      preventDefault(evt)
    }
  }
}

// Modifié version 6.9.1 car quand on modifiait la formule ça ne marchait plus pour l'affichage LaTeX
/**
 * Lance la mise à jour l'affichage LaTeX de la formule si celui-ci est activé.
 * Utiliser ready() pour savoir quand ce sera fini.
 * @param {SVGElement} svg
 * @returns {void}
 */
CEditeurFormule.prototype.callBack = function callBack (svg) {
  addQueue(() => this.updategLatex(svg))
}

// La fonction suivante est appelée par update sans passer par addQueue
/**
 * Met à jour l'affichage LaTeX associé à un éditeur de formule quand il existe
 * @param svg
 */
// Sans l'appel de addQueue, il y a un problème quand on modifie un éditeur de formule via
// la boîte de dialogue de protocole en demandant un affichageLaTeX de la formule
CEditeurFormule.prototype.updategLatex = function (svg) {
  if (svg) {
    addQueue(() => {
      if (this.glatex?.getAttribute('visibility') === 'hidden') return
      const newglatex = this.latex.createg()
      if (this.glatex?.parentElement === svg) svg.replaceChild(newglatex, this.glatex)
      else {
        svg.appendChild(newglatex)
      }
      this.glatex = newglatex
      this.latex.g = newglatex
    })
  }
}

/**
 * Fonction encadrant l'éditeur de rouge en cas de faute de syntaxe
 * @returns {void}
 */
CEditeurFormule.prototype.marquePourErreur = function () {
  // this.form.style.border = "1px solid red"; // Modifié version mtgApp
  this.editeur.style['background-color'] = '#FF9999'
  this.editeur.setSelectionRange(this.indErr.getValue(), this.indErr.getValue())
}
/**
 * Fonction retirant l'éventuel cadre rouge encadrant l'éditeur en cas de
 * faute de syntaxe.
 * @returns {void}
 */
CEditeurFormule.prototype.demarquePourErreur = function () {
  // this.form.style.border = "none" // Modifié version mtgApp
  this.editeur.style['background-color'] = '#FFFFFF'
}

// CEditeurFormule.prototype.creeEditeur = function(svg) { // Rectifié version 6.4
/**
 * Fonction créant un div contenant un formulaire et à l'intérieur de celui-ci
 * un éditeur input contenant l'éditeur de formule.
 * Ce div est rajouté au div propriétaire du svg contenant la figure.
 * @returns {void}
 */
CEditeurFormule.prototype.creeEditeur = function () {
  // Modification version mtgApp : Le parent du svg de la figure est un svg. Il faudra tenir compte
  // de son décalage par rapport au div parent
  const id = this.listeProprietaire.id
  if (id === null) return // Pour les figures servant seulement pour leurs objets de type calcul
  // Version 7.9.2 : L'éditeur est maintenant contenu dans un foreignObject ajouté au svg de la figure
  // this.divi = ce('div')
  this.foreignElt = cens('foreignObject', {
    style: 'overflow:visible;pointer-events:all;'
  })
  // this.divi.setAttribute('focusable', true)
  // this.divi.setAttribute('tabindex', '0')
  this.editeur = ce('input')
  this.editeur.onblur = this.onblur.bind(this)
  // this.form.onsubmit = this.onsubmit;
  if (this.affichageTempsReel) {
    this.editeur.onkeyup = (ev) => this.onkeyup(ev)
  }
  this.editeur.onkeypress = (ev) => this.onkeypress(ev)
  // this.foreignElt.appendChild(this.editeur)
  this.editeur.setAttribute('type', 'text')
  this.editeur.setAttribute('size', this.nbcol)
  // this.editeur.setAttribute("style","fontSize:"+Fonte.taille(this.taillePolice)+"px;")
  this.editeur.style.border = '1px solid grey'
  this.editeur.style.fontSize = this.taillePolice + 'px'
  this.editeur.style.fontFamily = 'Roboto'
  this.editeur.style.padding = '2px'
  this.editeur.id = id + this.calculAssocie.nomCalcul // Pour les échanges avec J3P
  // Version 7.9.2 l'élément contenant l'éditeur est maintenant un foreignObject contenu dans le svg de la figure
  // document.body.appendChild(this.divi)
  const svgFig = document.getElementById(id)
  // Version 7.9.2 l'élément contenant l'éditeur est maintenant un foreignObject contenu dans le svg de la figure
  // document.body.appendChild(this.divi)
  // On affiche provisoiremnt l'éditeur dans le div parent du svg de la figure ou de l'appli car cela ne marche pas correctement si on le met
  // dans le foreign object que l'on met dans le svg de la figure pour les dimensions
  const parentDiv = svgFig.containerDiv
  parentDiv.appendChild(this.editeur)
  // On mémorise les dimensions de l'éditeur
  this.clientHeight = this.editeur.clientHeight
  this.clientWidth = this.editeur.clientWidth
  // Sans les deux lignes ci-dessous, le foreign object n'est pas visible dans FireFox
  this.foreignElt.setAttribute('width', this.clientWidth)
  this.foreignElt.setAttribute('height', this.clientHeight)
  // On retire l'éditeur du body on l'y avait mis seulement pour récupérer ses dimensions
  parentDiv.removeChild(this.editeur)
  this.foreignElt.appendChild(this.editeur)
  // Version 8.4.3 : on met dans l'éditeur la formule du calcul par défaut
  this.editeur.value = this.calculAssocie.chaineCalcul
  // This.foreignElt sera mis dans ma svg dans la fonction trace
  if (this.affichageFormule) {
    this.latex = new CLatex(this.listeProprietaire, null, false, this.couleur,
      this.xNom + this.clientWidth + 3, this.yNom + this.taillePolice / 2 + 4, this.decX, this.decY, false,
      null, this.taillePolice, StyleEncadrement.Sans, this.effacementFond, this.couleurFond,
      CAffLiePt.alignHorLeft, CAffLiePt.alignVerCent,
      this.preCodeLaTeX + ' ' + this.calculAssocie.calcul.chaineLatexSansPar(this.calculAssocie.variableFormelle()))
    // Ligne suivante ajoutée version WebBack pour pouvoir déplacer un éditeur avec l'outil de capture
    // Utilisé dans CEditeurFormule.placeNom()
    this.latex.owner = this
  }
}
CEditeurFormule.prototype.placeEditeur = function () {
  this.foreignElt.setAttribute('x', String(this.xNom + this.decX + 2))
  this.foreignElt.setAttribute('y', String(this.yNom + this.decY + this.taillePolice / 2 - this.clientHeight / 2 + 2))
}

/**
 * Fonction retirant le foreign object contenant le input de l'éditeur
 * Appelée quand on détruit un éditeur de formule
 * @returns {void}
 */
CEditeurFormule.prototype.deleteComponent = function () {
  try {
    this.deleteEditor()
  } catch (e) {
    // on lâche l'affaire, inutile de râler si on voulait supprimer un truc qui n'existe déjà plus
  }
}

CEditeurFormule.prototype.update = function (svg) {
  CAffLiePt.prototype.update.call(this, svg)
  this.placeEditeur()
  // this.placeEditeur() // retiré version 7.3.3 car on appelle de nouveau positionne quand on déplace un affichage
  if (this.affichageFormule) {
    if (this.glatex === undefined) {
      this.glatex = this.latex.createg()
      svg.appendChild(this.glatex)
    } else {
      if (this.latex.g === null) this.latex.g = this.glatex // Ajouté version 6.3.3
      this.placeLatex()
      this.updategLatex(svg)
    }
  }
}

CEditeurFormule.prototype.placeLatex = function () {
  // Version 7.9.2 : on laisse 6 pixels de plus avant le signe = pour l'affichage LaTeX
  // car sinon sous chrome le cadre qui apparaît au focus est tronqué
  this.latex.xNom = this.xNom + (this.listeProprietaire.isForExport ? 2 : this.clientWidth) + 9
  // this.latex.yNom = this.yNom + this.taillePolice / 2 + 2;
  this.latex.yNom = this.yNom + this.taillePolice / 2 + 4
  this.latex.decX = this.decX
  this.latex.decY = this.decY
}

CEditeurFormule.prototype.deleteEditor = function () {
  const id = this.listeProprietaire.id
  if (id === null) return // Pour les figures servant seulement pour leurs objets de type calcul
  let svgFig = document.getElementById(id)
  const svgPanel = document.getElementById(this.listeProprietaire.id + 'figurePanel')
  if (svgPanel !== null) {
    svgFig = svgPanel
  }
  if (this.glatex && svgFig.contains(this.glatex)) {
    svgFig.removeChild(this.glatex)
  }
  if (this.foreignElt && svgFig.contains(this.foreignElt)) {
    svgFig.removeChild(this.foreignElt)
  }
  this.foreignElt = null
  this.isInSvg = false
}

CEditeurFormule.prototype.donneCouleur = function (color) {
  CAffLiePt.prototype.donneCouleur.call(this, color)
  if (this.affichageFormule) this.latex.donneCouleur(color)
}

CEditeurFormule.prototype.setReady4MathJax = function setReady4MathJax () {
  // on appelle la méthode de notre ancêtre (ça va appeler CLatex.setReady4MathJax avec notre intance de CEditeurFormule)
  CAffLiePt.prototype.setReady4MathJax.call(this)
  // mais aussi celle de notre objet latex si y'en a un (ça va appeler CLatex.setReady4MathJax avec notre propriété latex, qui est une instance CLatex)
  if (this.affichageFormule && this.latex) this.latex.setReady4MathJax()
}

// Fonction suivante supprimée car inutime et, quand on déplaçait un éditeur de formule avec affichage LeTeX temps réel;
// provoquait des créations de div d'id 'prov" non détruits
/*
CEditeurFormule.prototype.setReady4MathJaxUpdate = function() {
  CAffLiePt.prototype.setReady4MathJaxUpdate.call(this);
  if (this.affichageFormule && this.latex) {
    this.latex.setReady4MathJax(); // Spécial pour cet objet
  }
};
*/

/**
 * Fonction mettant dans l'éditeur la chaîne de caractères st et mettant à jour
 * en conséquence l'affichage de formule LaTeX s'il est activé.
 * @param {string} st
 * @returns {void}
 */
CEditeurFormule.prototype.setEditorValue = function setEditorValue (st) {
  this.editeur.value = st
  const liste = this.listeProprietaire
  const ch = this.variables1Car ? liste.addImplicitMult(st) : st
  const svg = document.getElementById(liste.id)
  const dimf = new Dimf(svg)
  const varFor = this.calculAssocie.variableFormelle()
  const bcomplexe = this.calculAssocie.estDeNatureCalcul(
    Nat.or(NatCal.NCalculComplexe, NatCal.NFonctionComplexe, NatCal.NFoncCPlusieursVar)
  )
  if (this.affichageFormule) {
    const calc = bcomplexe
      ? CalcC.ccbComp(ch, liste, 0,
        ch.length - 1, varFor)
      : CalcR.ccb(ch, liste, 0, ch.length - 1, varFor)
    this.latex.chaineCommentaire = this.preCodeLaTeX + ' ' + calc.chaineLatexSansPar(varFor)
    this.latex.positionne(false, dimf)
    this.latex.setReady4MathJax()
    // Ici il faut un double appel de addQueue (callBack va faire le 2e) car on est en train de charger la figure
    addQueue(() => this.callBack(svg))
  }
}

CEditeurFormule.prototype.addForeignEltToSvg = function () {
  const id = this.listeProprietaire.id
  if (id === null) return // Pour les figures servant seulement pour leurs objets de type calcul
  let svgFig = document.getElementById(id)
  const svgPanel = document.getElementById(this.listeProprietaire.id + 'figurePanel')
  if (svgPanel !== null) {
    svgFig = svgPanel
  }
  // Version 7.9.2 l'élément contenant l'éditeur est maintenant un foreignObject contenu dans le svg de la figure
  // document.body.appendChild(this.divi)
  svgFig.appendChild(this.foreignElt)
  this.isInSvg = true
}

CEditeurFormule.prototype.positionne = function (infoRandom, dimfen) {
  CAffLiePt.prototype.positionne.call(this, infoRandom, dimfen)
  if (!this.foreignElt) this.creeEditeur()
  if (!this.isInSvg) {
    this.isInSvg = true
    this.addForeignEltToSvg()
  }
  if (this.existe && this.affichageFormule && this.latex) {
    this.placeLatex()
    this.latex.positionne(infoRandom, dimfen)
  }
  if (this.existe) {
    this.editeur.style.visibility = this.masque ? 'hidden' : 'visible' // Modifié version 6.5.2
    // Version 6.5.1 : La ligne suivante est déplacée dans trace()
    // Version 6.5.2 : Ce n'était pas une bonne idée car alors si au cahrgement l'éditeur est masqué il est mal placé
    // quand on veut le démasquer
    this.placeEditeur()
  } else this.editeur.style.visibility = 'hidden'
}

CEditeurFormule.prototype.trace = function (svg, couleurFond) {
  // if (!this.existe) this.editeur.style.visibility = "hidden";
  CAffLiePt.prototype.trace.call(this, svg, couleurFond)
  if (!svg.contains(this.foreignElt)) svg.appendChild(this.foreignElt)
  // this.placeEditeur() // Déplacé ici version 6.5.1 // Supprimé version 6.5.2
  if (this.affichageFormule && this.affLaTeXPremierAffichage) {
    // this.latex.positionne();
    this.glatex = this.latex.createg()
    if (!this.affLaTeXPremierAffichage) this.glatex.setAttribute('visibility', 'hidden')
    svg.appendChild(this.glatex)
  }
}
/**
 * Fonction appelée pour valider ou non sur le plan syntaxique le contenu de l'éditeur.
 * @param {boolean} redraw  Di true on réactualise l'affichage de la formule.
 * @returns {boolean}
 */
CEditeurFormule.prototype.validation = function (redraw) {
  let v, calc
  const listePr = this.listeProprietaire
  const txt = this.editeur.value
  if (txt.length === 0) return true
  // String chCalcul = getText(); // Modifié version 4.6
  const chCalcul = this.variables1Car ? listePr.addImplicitMult(txt) : txt
  // Spécial version Applet !
  const calculAssocie = this.calculAssocie
  // On autorise d'utiliser un calcul non créé par l'utilisateur
  const indDernier = listePr.indexOf(calculAssocie) - 1
  const varFor = calculAssocie.variableFormelle()
  const bcomplexe = calculAssocie.estDeNatureCalcul(
    Nat.or(NatCal.NCalculComplexe, NatCal.NFonctionComplexe, NatCal.NFoncCPlusieursVar)
  )
  if (bcomplexe
    ? CalcC.verifieSyntaxeComplexe(listePr, chCalcul, this.indErr,
      indDernier, varFor)
    : CalcR.verifieSyntaxe(listePr, chCalcul, this.indErr,
      indDernier, varFor)) {
    calc = bcomplexe
      ? CalcC.ccbComp(chCalcul, listePr, 0,
        chCalcul.length - 1, varFor)
      : CalcR.ccb(chCalcul, listePr, 0,
        chCalcul.length - 1, varFor)
    if (calculAssocie.estDeNatureCalcul(Nat.or(NatCal.NCalculReel, NatCal.NCalculComplexe))) {
      try {
        calc.listeProprietaire.initialiseNombreIterations()
        if (bcomplexe) {
          v = new Complexe()
          calc.resultatComplexe(false, v)
        } else {
          calc.resultat(false)
        }
      } catch (e) {
        this.indErr.setValue(txt.length)
        return false
      }
    }
    calculAssocie.calcul = calc
    // Modification version 4.5.2 : Quand la chaîne de calcul sera reconstruite elle pourra être différente de celle ici entrée
    // On la change tout de suite
    calculAssocie.chaineCalcul = calculAssocie.calcul.chaineCalculSansPar(varFor)
    //
    // Modification bug version 4.7.1 : On remet à jour les objets dépendant, en particulier les calculs de dérivées
    // Modifié version 4.7.2
    // Modifié version 4.7.3
    listePr.metAJourObjetsDependantDeSaufEditeursFormule(calculAssocie)
    // On recalcule la figure et on la réaffiche
    if (redraw) {
      const svgApp = document.getElementById(listePr.id + 'figurePanel')
      const svg = svgApp !== null ? svgApp : document.getElementById(listePr.id) // Ajout version 2.6.4
      const dimf = new Dimf(svg)
      // listePr.positionne(false, dimf);
      const doc = listePr.documentProprietaire
      // Ajout version 5.2. Indispensable
      // listePr.setReady4MathJaxUpdate();
      //
      // listePr.update(svg, doc.couleurFond, doc.opacity, true);
      // Version 6.8.0 : On rajoute à la ligen ci-dessous un dernier paramètre à true pour que ce soit
      // positionneFull qui soit appelé oour chaque objet dépendant de façon à recalculer les dérivées et dérivées partielles
      // listePr.positionneDependantsDe(false, dimf, calculAssocie)
      listePr.positionneDependantsDe(false, dimf, calculAssocie, true)
      listePr.updateDependants(calculAssocie, svg, doc.couleurFond, true)
      /* Version 7.6.1 : les lignes suivantes deviennent inutiles car listePr.updateDependants se charge
      // de mettre à jour l'affichage de formule en LaTeX
      if (this.affichageFormule) {
        this.latex.chaineCommentaire = this.preCodeLaTeX + ' ' + this.calculAssocie.calcul.chaineLatexSansPar(varFor)
        this.latex.positionne(false, dimf)
        // Modification version 4.9.2
        this.latex.setReady4MathJax()
        // Ici pas de double appel de addQueue car la figure et déjà chargée
        this.callBack(svg)
      }
       */
    }
    return true
  } else {
    this.adapteIndiceErreur()
    return false
  }
}
/**
 * Fonction renvoyant true si car est une chaine de un caractère contenant soit
 * un chiffre soit un caractère ²
 * @param {string} car
 * @returns {boolean}
 */
CEditeurFormule.prototype.chiffreOuCarre = function (car) {
  return ((car === '²') || Fonte.chiffre(car))
}
/**
 * Fonction renvoyant true si car est une chaine de un caractère contenant soit
 * un chiffre soit le point décimal .
 * @param {string} car
 * @returns {boolean}
 */
CEditeurFormule.prototype.chiffreOuPointDecimal = function (car) {
  return ((car === '.') || Fonte.chiffre(car))
}
/**
 * Fonction renvoyant true si car est une chaine de un caractère contenant soit
 * une lettre soit un caractère ' ou "
 * @param {string} car
 * @returns {boolean}
 */
CEditeurFormule.prototype.lettreOuPrime = function (car) {
  return (Fonte.lettre(car) || (car === '\'') || (car === '"'))
}
/**
 * Fonction mettant, dans le cas d'une erreur de syntaxe, dans this .indErr l'indice
 * de l'erreur dans la chaîne de caractères de l'éditeur, dans le cas où
 * les signes de multiplication implicites sont utilisés.
 * @returns {void}
 */
CEditeurFormule.prototype.adapteIndiceErreur = function () {
  const liste = this.listeProprietaire
  const lon = new Pointeur(0)
  if (this.variables1Car) {
    const ch = this.editeur.value
    let carprecedent = '('
    let k = 0 // Représente l'indice dans la chaîne à laquelle ont été rajoutés des éventuels signs de multiplication
    let i = 0 // Reprsente l'indice dans la chaîe qui a été entrée avec des multiplications implicites.
    const len = ch.length
    while ((k <= this.indErr.getValue()) && (i < len)) {
      const car = ch.charAt(i)
      if (this.chiffreOuPointDecimal(car) || (car === ')') || (car === '+') || (car === '-') ||
        (car === '*') || (car === '/') || (car === '^') || (car === '\'') || (car === '"') || (car === '²')) {
        carprecedent = car
        i++
        k++
      } else {
        if (ch.indexOf('pi', i) === 0) {
          k += 2
          if (!(this.chiffreOuPointDecimal(carprecedent) || this.lettreOuPrime(carprecedent) || (carprecedent === ')'))) k++
          carprecedent = ')'
          i += 2
        } else {
          if (CCbGlob.commenceParNomFonctionPredefinieSuivieParOuvr(ch, i, lon)) {
            k += lon.getValue()
            if (this.chiffreOuPointDecimal(carprecedent) || this.lettreOuPrime(carprecedent) || (carprecedent === ')')) k++
            i += lon.getValue()
            carprecedent = '('
          } else {
            if (liste.commenceParNomFonctionUtilisateurSuivieParOuvr(ch, i, lon)) {
              k += lon.getValue()
              if (this.chiffreOuPointDecimal(carprecedent) || this.lettreOuPrime(carprecedent) || (carprecedent === ')')) k++
              i += lon.getValue()
              carprecedent = '('
            } else {
              k++
              i++
              // Si lettre suivie d'une autre lettre
              if (this.lettreOuPrime(carprecedent) && Fonte.lettre(car)) k++
              // Si chiffre suivi d'une lettre
              else if (this.chiffreOuCarre(carprecedent) && Fonte.lettre(car)) k++
              // Si chiffre ou lettre suivi d'une parenthèse on rajoute un signe de multiplication
              else if ((this.chiffreOuCarre(carprecedent) || this.lettreOuPrime(carprecedent)) && (car === '(')) k++
              // Si parenthèse fermante suivie d'un chiffre ou une lettre ou une parenthèse ouvrante on rajoute un signe de multiplication
              else if ((carprecedent === ')') && (Fonte.lettre(car) || Fonte.chiffre(car) || (car === '('))) k++
              carprecedent = car
            }
          }
        }
      }
    }
    this.indErr.setValue(i)
  }
}

CEditeurFormule.prototype.chaineDesignation = function () {
  return 'desEditeur'
}

CEditeurFormule.prototype.read = function (inps, list) {
  CAffLiePt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.calculAssocie = list.get(ind1, 'CFonc')
  this.enTete = traiteAccents(inps.readUTF())
  this.nbcol = inps.readInt()
  if (this.nVersion < 2) this.variables1Car = false
  else this.variables1Car = inps.readBoolean()
  if (this.nVersion < 3) {
    this.affichageFormule = false
    this.preCodeLaTeX = ''
  } else {
    this.affichageFormule = inps.readBoolean()
    this.preCodeLaTeX = inps.readUTF()
  }
  if (this.nVersion < 4) {
    this.affLaTeXPremierAffichage = true
    this.affichageTempsReel = false
  } else {
    this.affLaTeXPremierAffichage = inps.readBoolean()
    this.affichageTempsReel = inps.readBoolean()
  }
  // Ajout version 4.9.3
  this.callBackOK = null
  const entete = this.enTete
  // Pour un chargement de MathJax optimal du lecteur on renseigne la liste propriétaire du fait
  // que l'objet nécessite ou non MathJax
  this.listeProprietaire.useLatex = (entete.charAt(0) === '$' && entete.charAt(entete.length - 1) === '$') ||
    this.affichageFormule
}

CEditeurFormule.prototype.write = function (oups, list) {
  CAffLiePt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.calculAssocie)
  oups.writeInt(ind1)
  oups.writeUTF(this.enTete)
  oups.writeInt(this.nbcol)
  oups.writeBoolean(this.variables1Car)
  // Ajout version 4.7.2
  oups.writeBoolean(this.affichageFormule)
  oups.writeUTF(this.preCodeLaTeX)
  oups.writeBoolean(this.affLaTeXPremierAffichage)
  oups.writeBoolean(this.affichageTempsReel)
}

/**
 * Fonction à appeler depuis un autre code JavaScript.
 * Quant l'utilisateur validera sa formule dans l'éditeur
 * par la touche Entée, a fonction f possédée par le code appelant sera allors appelée.
 * @param {function} f
 * @returns {void}
 */
CEditeurFormule.prototype.setCallBackOK = function (f) {
  this.callBackOK = f
}
/**
 *
 * @return {boolean}
 */
CEditeurFormule.prototype.hasComponent = function () {
  return true
}

CEditeurFormule.prototype.showComponent = function (bvisible) {
  this.editeur.style.visibility = bvisible ? 'visible' : 'hidden'
  if (this.affichageFormule && this.glatex) {
    this.glatex.setAttribute('visibility', bvisible ? 'visible' : 'hidden')
  }
}
