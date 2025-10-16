/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import StyleTrait from '../types/StyleTrait'
import CElementGraphique from './CElementGraphique'
import addQueue from 'src/kernel/addQueue'
export default CElementLigne

/**
 * Classe ancêtre de tous les éléments qui se tracent comme une ligne, fermée ou non.
 * @constructor
 * @extends CElementGraphique
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction proprétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur de tracé
 * @param {boolean} nomMasque  true si le nom est masqué.
 * @param {number} decX  Décalage horizontal du nom
 * @param {number} decY ; Décalage vertical du nom
 * @param {boolean} masque  true si l'objet est masqué
 * @param {string} nom  Le nom.
 * @param {number} tailleNom  Indice donnant la taille du nom.
 * @param {StyleTrait} style  Le style de trait utilisé.
 * @returns {CElementLigne}
 */
function CElementLigne (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, style) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) {
    CElementGraphique.call(this, listeProprietaire)
    // Ajout version 5.0
    this.style = new StyleTrait(listeProprietaire) // Le style de trait doit connaître la liste pour adapter son style aux écarns HD
    //
  } else {
    CElementGraphique.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      nomMasque, decX, decY, masque, nom, tailleNom)
    this.style = style
    // Modification version 4.9.9.4
    /* Modifié version 5.0
    this.stroke = StyleTrait.stroke(this.style);
    this.strokewidth = StyleTrait.strokeWidth(this.style);
    */
    /* Inutile version 5.0
   if (this.style) { // Test àa cause des objets internes non dessiné qui n'ont pas de style
      this.stroke = style.stroke;
      this.strokewidth = style.strokeWidth;
    }
    */
  }
}
CElementLigne.prototype = new CElementGraphique()
CElementLigne.prototype.constructor = CElementLigne
CElementLigne.prototype.superClass = 'CElementGraphique'
CElementLigne.prototype.className = 'CElementLigne'

/**
 * Donne à l'objet le style de trait style
 * @param {StyleTrait} style
 * @returns {void}
 */
CElementLigne.prototype.donneStyle = function (style) {
  this.style = style
}

CElementLigne.prototype.read = function (inps, list) {
  CElementGraphique.prototype.read.call(this, inps, list)
  if (list.numeroVersion < 15) this.style.readOld(inps, list, true)
  else this.style.read(inps, list)
}
CElementLigne.prototype.write = function (oups, list) {
  CElementGraphique.prototype.write.call(this, oups, list)
  this.style.write(oups)
}

// Fonction ajoutée version 6.5.2 pour permettre de modifier directement des éléments de la figure
/**
 * Fonction donnant directement au svg element représentant l'élément graphique la couleur de l'élément
 */
CElementLigne.prototype.setgColor = function () {
  if (this.g) {
    this.g.style.stroke = this.color
    // Ligne suivante ajoutée version 6.9.1
    this.g.style.opacity = this.couleur.opacity
    return true
  } else return false
}

/**
 * Fonction donnant ke style de trait style à l'élément
 * @param {StyleTrait} style
 * @param {boolean} bImmediat si true le changement de style est mis sur la pile d'appels
 */
CElementLigne.prototype.setLineStyle = function (style, bImmediat) {
  this.style = style
  if (bImmediat && !this.masque) {
    // const svg = document.getElementById(idDoc)
    addQueue(() => {
      if (this.g) this.setgLineStyle(style)
    })
  }
}

/**
 * Fonction changeant le style de ligne de l'élément svg représentant l'objet gaphique
 * @param {StyleTrait} style
 */
CElementLigne.prototype.setgLineStyle = function (style) {
  const g = this.g
  if (g) {
    g.style['stroke-dasharray'] = style.getStroke()
    g.style['stroke-width'] = style.strokeWidth
  }
}
