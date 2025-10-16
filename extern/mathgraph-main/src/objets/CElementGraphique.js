/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CElementBase from './CElementBase'
import Color from '../types/Color'
import Fonte from '../types/Fonte'
import Dimf from 'src/types/Dimf'
import addQueue from 'src/kernel/addQueue'
import { cens } from 'src/kernel/dom'
import { correctionRoboto } from 'src/kernel/kernel'
import { insertAfter } from 'src/kernel/kernelAdd'

export default CElementGraphique

/**
 * @constructor
 * @extends CElementBase
 * Objet ancêtre de tous les objets graphiques.
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet
 * @param {boolean} estElementFinal  true si l'objet est un objet inal de construction
 * @param {Color} couleur  La couleur de l'objet
 * @param {boolean} nomMasque  true si le nom de l'objet est masqué
 * @param {number} decX  Le décalage horizontal du nom
 * @param {number} decY  Le décalage vertical du nom
 * @param {boolean} masque  true si l'objet est masque
 * @param {string} nom  le nom éventuel de l'objet
 * @param {number} tailleNom  l'indice donnant la taille du nom
 * @returns {void}
 */
function CElementGraphique (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4 pour constructeur
  if (arguments.length === 1) {
    CElementBase.call(this, listeProprietaire)
    this.nom = '' // Sert pour le protocole de la figure
  } else {
    CElementBase.call(this, listeProprietaire, impProto, estElementFinal)
    this.couleur = couleur
    this.nomMasque = nomMasque
    this.decX = decX
    this.decY = decY
    this.masque = masque
    this.nom = nom
    this.tailleNom = tailleNom
    // Rajout version 4.9.9.4
    if (couleur !== null) this.color = couleur.rgb() // Certains objets inclus dans d'autres
    // peuvent ne pas avoir de couleur quand ils sont créés.
  }
  this.id = '' // Spécial JavaScript
  this.g = null // Idem
  this.gname = null
  // Ajout version 5.0.4 :Sert pour les objets dupliqués de CLatex
  this.hasDuplicate = false
  // Ajout version 6.5.2 : Dans le player on peut donner à l'utilisateur la possibilité d'associer des gestionnaires d'événements
  // sur des éléments svg de la figure
  this.pointerevents = 'none'
  // Version 6.6.0 : On rajoute un tag à chaque élément (chaîne vide par défaut).
  this.tag = ''
}
CElementGraphique.prototype = new CElementBase()
CElementGraphique.prototype.constructor = CElementGraphique
CElementGraphique.prototype.superClass = 'CElementBase'
CElementGraphique.prototype.className = 'CElementGraphique'

/**
 * Fonction renvoyant un clone de l'objet
 * @returns {CElementGraphique}
 */
CElementGraphique.prototype.creeClone = function () {
  return this.getClone(this.listeProprietaire, this.listeProprietaire)
}
/**
 * Fonction faisant de this un objet de mêmes caractéristiques que ptel
 * ptel doit être un élément du même type que this
 * @param {CElementBase} ptel
 * @returns {void}
 */
CElementGraphique.prototype.setClone = function (ptel) {
  CElementBase.prototype.setClone.call(this, ptel)
  this.xNom = ptel.xNom
  this.yNom = ptel.yNom
  this.decX = ptel.decX
  this.decY = ptel.decY
  this.masque = ptel.masque
}

/**
 * Ajout version 5.2 (numéro de version 16). Renverra true si l'objet possède un nom qui doit être enregistré dans le flux
 * @returns {boolean}
 */
CElementGraphique.prototype.hasName = function () {
  return false
}

/**
 * Ajout version 5.2 (numéro de version 16). Renverra true si l'objet possède deux éléments decX et decY doit être enregistré dans le flux
 * Sera redéfini à true dans CAffLiePt
 * @returns {boolean}
 */
CElementGraphique.prototype.hasDec = function () {
  return this.hasName()
}

/**
 * Fonction rendant l'objet masqué
 * @returns {void}
 */
CElementGraphique.prototype.cache = function () {
  this.masque = true
}
/**
 * Fonction rendant l'objet visible
 * @returns {void}
 */
CElementGraphique.prototype.montre = function () {
  this.masque = false
}
/**
 * Fonction donnant à l'objet le nom nomInit
 * @param {string} nomInit
 * @returns {void}
 */
CElementGraphique.prototype.donneNom = function (nomInit) {
  this.nom = nomInit
}
/**
 * Fonction plaçant le point ux coordonnées (x,y)
 * @param {number} xn
 * @param {number} yn
 * @returns {void}
 */
CElementGraphique.prototype.placeNom = function (xn, yn) {
  this.xNom = xn
  this.yNom = yn
}
/**
 * Decale le nom de l'objet de (decXn, decYn)
 * @param {number} decXn
 * @param {number} decYn
 * @returns {void}
 */
CElementGraphique.prototype.decaleNom = function (decXn, decYn) {
  this.decX = decXn
  this.decY = decYn
}
// A revoir svg
/**
 * Fonction créant un élément svg représentant le nom de l'objet
* @returns {SVGTextElement}
 */
CElementGraphique.prototype.createName = function () {
  let indPremierChiffre
  const nom = this.nom
  const taille = this.tailleNom // Modifié version 5.0
  const y = this.yNom + this.decY + taille
  const text = cens('text', {
    x: this.xNom + this.decX,
    y,
    style: 'text-anchor : left;' + 'fill:' + this.couleur.rgb() + ';' + 'font-size:' + taille + 'px;',
    id: this.id + 'name',
    'pointer-events': 'none' // Ne marche pas avec chrome
  })
  // disableSelection(text);
  // On recherche un éventuel indice
  for (indPremierChiffre = 0; indPremierChiffre < nom.length; indPremierChiffre++) {
    if (Fonte.chiffre(nom.charAt(indPremierChiffre))) break
  }
  if (indPremierChiffre === nom.length) {
    // Pas de chifres à écrire en exposant, on écrit tout d'un bloc
    text.innerHTML = nom
  } else {
    const parFinale = nom.endsWith(')')
    const deb = nom.substring(0, indPremierChiffre)
    const indfin = parFinale ? nom.length - 1 : nom.length
    const span1 = cens('tspan')
    const cont1 = document.createTextNode(deb)
    span1.appendChild(cont1)
    text.appendChild(span1)
    const indicesPresents = indPremierChiffre < nom.length
    const decalageIndices = Math.floor(taille / 3)
    if (indicesPresents) {
      const fin = nom.substring(indPremierChiffre, indfin)
      const span2 = cens('tspan', {
        dy: decalageIndices
      })
      span2.style.fontSize = Math.round(2 * taille / 3) + 'px'
      const cont2 = document.createTextNode(fin)
      span2.appendChild(cont2)
      text.appendChild(span2)
    }
    if (parFinale) {
      const spanfin = cens('tspan', {
        dy: indicesPresents ? -decalageIndices : 0
      })
      const contfin = document.createTextNode(')')
      spanfin.appendChild(contfin)
      text.appendChild(spanfin)
    }
  }
  // Ajout version mtgApp car la version mtgApp a besoin de connaître les dimensions d'affichage du nom
  if (this.createNameAdd) this.createNameAdd(text)
  //
  return text
}
/**
 * Fonction ajoutant au svg svg le texte element représentant le nom de l'objet
 * @param {SVGElement} svg
 * @returns {void}
 */
CElementGraphique.prototype.afficheNom = function (svg) {
  this.gname = this.createName()
  svg.appendChild(this.gname)
}

CElementGraphique.prototype.updateNamePosition = function () {
  this.gname.setAttribute('x', this.xNom + this.decX)
  this.gname.setAttribute('y', this.yNom + this.decY + this.tailleNom)
  // Les lignes suivantes ne concernent que la version mtgApp
  if (this.rectName) {
    const bb = this.gname.getBBox()
    this.rectName.x = bb.x
    this.rectName.y = bb.y
    this.rectName.width = bb.width
    this.rectName.height = bb.height
  }
}

/**
 * Fonction mettant à jour le sgv text element représentant le nom de l'objet
 * @param {SVGElement} svg
 * @param {boolean} masquage
 * @returns {void}
 */
CElementGraphique.prototype.updateName = function (svg, masquage) {
  if (this.nom === '') {
    if (this.gname) {
      svg.removeChild(this.gname)
      this.gname = null
    }
  } else {
    const gn = this.createName()
    if (this.gname) {
      try {
        svg.replaceChild(gn, this.gname)
      } catch (e) { // Rajouté suite à rapport BusNag
        this.g.parentNode.insertBefore(gn, this.g.nextSibling)
      }
    } else {
      insertAfter(gn, this.g)
      this.g.parentNode.insertBefore(gn, this.g.nextSibling)
    }
    this.gname = gn
    if (this.masque || (masquage && this.nomMasque)) this.gname.setAttribute('visibility', 'hidden')
  }

  /*
  var oldgname = this.gname;
  var newgname = this.createName();
  svg.replaceChild(newgname, oldgname);
  this.gname = newgname;
  */
  /**
 * Ne marche pas pour une raison que j'ignore. Après le premier affichage, le suivant se décale
  var taille = Fonte.taille(this.tailleNom);
  g.removeAttribute("x");
  g.removeAttribute("y");
  g.setAttribute("x", this.x);
  g.setAttribute("y", this.y + this.decY + taille);
  */
}
/**
 * Fonction donnant la couleur coul à l'objet
 * @param {Color} coul
 * @returns {void}
 */
CElementGraphique.prototype.donneCouleur = function (coul) {
  this.couleur = coul
  this.color = coul.rgb() // Ajout version 4.9.9.5
}
/**
 * Fonction renvoyant la distance entre this et le point de coordonnnées (xp,yp).
 * Si masquage est à true, renvoie la distance même si le point est masqué.
 * A redéfinir pour les descendants
 * @param {number} xp
 * @param {number} yp
 * @param {boolean} masquage
 * @returns {number}
 */
CElementGraphique.prototype.distancePoint = function (xp, yp, masquage) {
  return -1
}
/**
 * Fonction renvoyant la distance entre this et le point de coordonnnées (xp,yp)
 * pour les objest de type surface.
 * Si masquage est à true, renvoie la distance même si le point est masqué.
 * A redéfinir pour les descendants
 * @param {number} xp
 * @param {number} yp
 * @param {boolean} masquage
 * @returns {number}
 */

CElementGraphique.prototype.distancePointPourSurface = function (xp, yp, masquage) {
  return -1
}
/**
 * Fonction renvoyant, pour un point lié à un objet, l'abscisse maximale relative à cet objet
 * @returns {number}
 */
CElementGraphique.prototype.abscisseMaximale = function () {
  return 1
}
/**
 * Fonction renvoyant, pour un point lié à un objet, l'abscisse minimale relative à cet objet
 * @returns {number}
 */
CElementGraphique.prototype.abscisseMinimale = function () {
  return 0
}
/**
 * Fonction ajoutant à svg le svg element représentant l'objet (via trace())
 * et donnant à cet élément l'attribut visible ou masqué suivant que
 * l'objet est masqué ou non
 * @param {SVGElement} svg  Le svg dans lequel est tracée la figure
 * @param {boolean} masquage  true si on cache les objets cachés
 * @param {Color} couleurFond
 * @returns {void}
 */
CElementGraphique.prototype.affiche = function (svg, masquage, couleurFond) {
  // Version 7.9.1 : La ligne suivante a été rajoutée par précaution car normalement à l'appel
  // le svg ne devrait pas contenir la repésentation SVG de l'objet mais cela peut arriver
  // par exemple quand on lance une macro exécutant une suite de macros de constructions récursives
  if (this.g !== null && svg.contains(this.g)) svg.removeChild(this.g)
  this.trace(svg, couleurFond)
  if ((this.g !== null) && masquage && this.masque) this.g.setAttribute('visibility', 'hidden')
}

CElementGraphique.prototype.replaceg = function (svg, couleurFond, opacity) {
  const g = this.createg(svg, couleurFond, opacity)
  svg.replaceChild(g, this.g)
  g.setAttribute('id', this.id)
  this.g = g
}
/**
 * Spécial JavaScript : Renverra true si l'objet est bien représenté graphiquement dans le svg
 * Si le deuxième paramètre est à true, renvoie true même si l'objet est masqué
 * @param {boolean} masquage  true si les obejts masqués ne sont pas affichés
 * @param {boolean} memeMasque  CF ci-dessus
 * @returns {boolean}
 */
CElementGraphique.prototype.hasg = function (masquage, memeMasque = false) {
  return this.existe && (memeMasque || !(this.masque && masquage))
}
/**
 * Fonction qui renverra true si l'objet exsite mas est hors fenêtre.
 * Rajouté par rapport à la version Java car un objet dupliqué a besoin de savoir
 * si l'élément qu'il duplique est ou non représenté dans le DOM par un sgv element.
 * Utilisé dans cObjetDuplique
 * @returns {boolean}
 */
CElementGraphique.prototype.horsCadre = function () {
  return false
}
/**
 * Fonction recréant le svg element représentant l'objet et remplaçant dans le svg
 * svg l'ancien élément par le nouveau.
 * Spécial JavaScript : A redéfinir pour les éléments dont il faut recalculer
 * le svg élément quand ils sont dépacés ou modifiés.
 * @param {SVGElement} svg
 * @returns {void}
 */
CElementGraphique.prototype.update = function (svg) {
}
/**
 * Fonction à redéfinir pour CPt (CPointAncetre en java)
 * Sert pour le tracé des points marqués pour la trace.
 * @param {SVGElement} svg
 * @returns {void}
 */
CElementGraphique.prototype.updateTrace = function (svg) {
}
/**
 * Fonction renvoyant true si l'objet est à l'intérieur de la fenêtre définie par dimfen
 * @param {Dimf} dimfen Donne les dimensions de la fenêtre
 * @returns {boolean}
 */
CElementGraphique.prototype.dansFen = function (dimfen) {
  return true
}
/**
 * Fonction renvoyant le nombre d'objets pour un lieu d'objets
 * Redéfinit pour ls lieux de lieux
 * @returns {number}
 */
CElementGraphique.prototype.nombreObjetsPourLieuObjet = function () {
  return 1
}

/**
 * Spécial version mtgApp : Crée l'élement associé à l'objet dans le DOM
 * @param {SVGElement} svg
 * @param {boolean} masquage true pour que les éléments masqués ne soient pas affichés
 * @param {Color} couleurFond
 */
CElementGraphique.prototype.creeAffichage = function (svg, masquage, couleurFond) {
  if (this.hasg(masquage)) {
    this.affiche(svg, masquage, couleurFond)
    this.hasgElement = true
    if (this.estDeNature(NatObj.NObjNommable) && (this.nom !== '') &&
      !this.nomMasque) this.afficheNom(svg)
    this.updateTrace(svg, couleurFond) // Pour les points marqués pour la trace
  } else {
    const newg = cens('g', {
      id: this.id
    }) // Un g vide
    svg.appendChild(newg)
    this.g = newg
    this.hasgElement = false
    if (this.estDeNature(NatObj.NObjNommable) && (this.nom !== '') &&
      !this.nomMasque) {
      const gname = cens('g') // Un g vide
      this.gname = gname
      svg.appendChild(gname)
    }
  }
  // Ajout version 7.6 pour pouvoir repérer un objet graphique dans le DOM
  if (this.tag !== '') this.g.setAttribute('data-mtg-tag', this.tag)
}

/**
 * Fonction qui met à jour le g elemnt représentant l'objet dans le svg
 * @param svg
 * @param {Color} couleurFond couleur de fond uilisée

 * @param {boolean} masquage true si les objets masqués ne doivent pas être affichés
 */
CElementGraphique.prototype.updategElt = function (svg, couleurFond, masquage) {
  const hasg = this.hasg(masquage)
  const hasComponent = this.hasComponent()
  if (this.hasgElement) { // Si l'objet avait une implémentation graphique dans le svg
    if (hasg) {
      if (this.g.parentElement === svg) { // Test rajouté version 6.3.5 suite à rapports BusNag
        if (hasComponent) this.showComponent(true)
        this.update(svg, couleurFond)
        this.updateTrace(svg, couleurFond) // Pour les points marqués pour la trace
        if (this.estDeNature(NatObj.NObjNommable) && (this.nom !== '') && !this.nomMasque) {
          this.updateNamePosition()
        }
        // this.hasgElement = true; // Supprimé version mtgApp. Inutile
      }
    } else {
      if (hasComponent) this.showComponent(false)
      const newg = cens('g') // Un g vide
      try { // Suite à des erreurs BusNag
        svg.replaceChild(newg, this.g)
      } catch (e) {
        svg.appendChild(newg)
      }
      newg.setAttribute('id', this.id)
      this.g = newg
      this.hasgElement = false
      if (this.estDeNature(NatObj.NObjNommable) && (this.nom !== '') && !this.nomMasque) {
        const gname = cens('g')
        try {
          svg.replaceChild(gname, this.gname)
        } catch (e) { // Suite à des erreurs BusNag
          svg.appendChild(gname)
        }
        this.gname = gname
      }
    }
  } else {
    // this.hasgElement est false
    if (hasg) {
      // Il semble arriver que la fonction de callBack soit appelée après que le svg ait été vidé
      // J'utilise donc un test du parent
      if (this.g?.parentElement === svg) { // Modifié version 6.8.0
        if (hasComponent) this.showComponent(true)
        const g = this.createg(svg, couleurFond)
        try {
          svg.replaceChild(g, this.g)
        } catch (e) { // Suite à des erreurs BusNag
          svg.appendChild(g)
        }
        g.setAttribute('id', this.id)
        this.g = g
        if (this.cbmap) {
          this.resetEventListeners()
        } // Ajouté version 8.0.O
        this.hasgElement = true
        if (this.estDeNature(NatObj.NObjNommable) && (this.nom !== '') && !this.nomMasque) {
          this.updateName(svg, masquage)
        }
        this.updateTrace(svg, couleurFond) // Pour les points marqués pour la trace
      }
    }
  }
}

/**
 * Détruit l'élément et le retire de son composant graphique s'il existe
 * @param svg Le svg de la figure
 */
CElementGraphique.prototype.removegElement = function (svg) {
  // Corrigé version 6.8.1 suite à des rapports Busnag
  // if (this.g !== null) svg.removeChild(this.g)
  if (this.g !== null) {
    if (svg.contains(this.g)) svg.removeChild(this.g)
    this.g = null
  }
  if (this.gname) {
    svg.removeChild(this.gname)
    this.gname = null
  }
}

/**
 * Change la couleur de l'objet dans le svg
 * @param {Color} color la couleur à donner à l'objet
 * @param {SVGElement} svg le svg contenant l'objet
 * @param {boolean} bImmediat si true on lance le changement de couleur
 */
CElementGraphique.prototype.setColor = function (color, svg, bImmediat) {
  this.donneCouleur(color)
  if (bImmediat && !this.masque) {
    const dimf = new Dimf(svg)
    this.positionne(false, dimf)
    addQueue(() => {
      this.setReady4MathJax()
      addQueue(() => {
        if (this.g) this.setgColor()
      })
    })
  }
}

/**
 * Donnant directement au svg element représentant l'élément graphique la couleur de l'élément
 * @since version 6.5.2
 */
CElementGraphique.prototype.setgColor = function () {
  if (this.g) {
    this.g.style.color = this.color
    // Ligne suivante ajoutée version 6.9.1
    this.g.style.opacity = this.couleur.opacity
    return true
  } else return false
}

/**
 * Réaffecte au svg element représentant l'élement graphique les fontions de callBack
 * qui lui avaient été affectées précédemment, au cas où ce svg element a été mis à jour
 * @since version 6.5.2
 */
CElementGraphique.prototype.resetEventListeners = function () {
  if (this.cbmap && this.g) {
    if (this.cbmap.size > 0) {
      this.pointerevents = 'all'
      this.g.setAttribute('pointer-events', 'all')
      for (let i = 0; i < this.g.childNodes.length; i++) {
        this.g.childNodes[i].setAttribute('pointer-events', 'all')
      }
    }
    this.cbmap.forEach((value, key) =>
      this.g.addEventListener(key, value))
  }
}
/**
 * Fonction servant à zoomer sur la figure. Est redéfinie seulement pour certains objets
 * sur lesquels il faut agir pour zoomer sur la figure.
 * @param {number} rapport
 * @param {number} xcentre
 * @param {number} ycentre
 * @returns {void}
 */
CElementGraphique.prototype.zoom = function () {
}

CElementGraphique.prototype.read = function (inps, list) {
  const numeroVersion = list.numeroVersion
  CElementBase.prototype.read.call(this, inps, list)
  this.masque = inps.readBoolean()
  const r = inps.readByte()
  const g = inps.readByte()
  const b = inps.readByte()
  let opacity
  if (numeroVersion >= 20) {
    opacity = inps.readFloat()
  } else opacity = 1
  this.couleur = new Color(r, g, b, opacity)
  // Rajout version 4.9.9.4
  this.color = this.couleur.rgb()
  //
  if (this.hasName() || (numeroVersion < 16)) {
    this.nomMasque = inps.readBoolean()
    this.tailleNom = inps.readByte()
    // Modification version 5.0 : taillePolice est maintenant la taille réelle de la police
    if (numeroVersion < 15) this.tailleNom = Fonte.taille(this.tailleNom)
    // Correction de figures qui ont été mal renregistrées
    this.nom = inps.readUTF()
  }
  // Version 8.8.0 (numéro de version 22) : on corrige un peu la taille de police c
  // Roboto qui prend plus de place en largeur pour une même taille de police en pixels
  if (numeroVersion < 22) this.tailleNom = correctionRoboto(this.tailleNom)
  if (this.hasDec() || (numeroVersion < 16)) {
    if (numeroVersion < 11) {
      this.decX = inps.readDouble()
      this.decY = inps.readDouble()
    } else {
      const by = inps.readByte()
      if (by === 1) {
        this.decX = 0
        this.decY = 0
      } else {
        this.decX = inps.readDouble()
        this.decY = inps.readDouble()
      }
    }
  }
  // Ajout version 6.6.0
  if (numeroVersion < 19) this.tag = ''
  else this.tag = inps.readUTF()
  this.gname = null
}

CElementGraphique.prototype.write = function (oups, list) {
  CElementBase.prototype.write.call(this, oups, list)
  oups.writeBoolean(this.masque)
  oups.writeByte(this.couleur.getRed())
  oups.writeByte(this.couleur.getGreen())
  oups.writeByte(this.couleur.getBlue())
  oups.writeFloat(this.couleur.opacity)
  if (this.hasName()) {
    oups.writeBoolean(this.nomMasque)
    oups.writeByte(this.tailleNom)
    oups.writeUTF(this.nom)
  }
  if (this.hasDec()) {
    if ((this.decX === 0) && (this.decY === 0)) oups.writeByte(1)
    else {
      oups.writeByte(0)
      oups.writeDouble(this.decX)
      oups.writeDouble(this.decY)
    }
  }
  // Ajout version 6.6.0
  oups.writeUTF(this.tag)
}
