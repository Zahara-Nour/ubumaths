/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Color from '../types/Color'
import MotifPoint from '../types/MotifPoint'
import CPt from './CPt'
export default CPointDansBipoint

/**
 * Classe représentant un poitn dans un bipoint c'est-à-dire un point
 * dans une intersection de deux cercles ou d'un cercle et une droite
 * @constructor
 * @extends CPt
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet
 * @param {boolean} nomMasque  true si le nom de l'objet est masqué
 * @param {number} decX  Decalage horizontal du nom
 * @param {number} decY  Decalage vertical du nom
 * @param {boolean} masque  true si l'objet est masque
 * @param {string} nom  Le nom eventuel de l'objet
 * @param {number} tailleNom  Indice de la taille du nom (voir Fonte)
 * @param {MotifPoint} motif  Le motif du point
 * @param {boolean} marquePourTrace  true si le point est marqué pour la trace
 * @returns {void}
 */
function CPointDansBipoint (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace) {
  if (arguments.length === 0) {
    CPt.call(this, null, null, false, new Color(0, 0, 0), false, 0, 0, false, '', 2,
      MotifPoint.petitRond, false)
  } else {
    if (arguments.length === 1) CPt.call(this, listeProprietaire)
    else {
      CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
        decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    }
  }
}
CPointDansBipoint.prototype = new CPt()
CPointDansBipoint.prototype.constructor = CPointDansBipoint
CPointDansBipoint.prototype.superClass = 'CPt'
CPointDansBipoint.prototype.className = 'CPointDansBipoint'

CPointDansBipoint.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  return new CPointDansBipoint(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque,
    this.nom, this.tailleNom, this.motif, this.marquePourTrace)
}
