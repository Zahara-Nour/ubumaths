/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacro from './CMacro'
export default CMacroAffichantTout

/**
 * Macro recalculant la figure en réinitialisant les caluls aléatoires avec rand()
 * et la réaffichant.
 * @constructor
 * @extends CMacro
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si l'objet est un élément final de construction.
 * @param {Color} couleur  La couleur d'éciture de l'éditeur (et du cadre éventuel).
 * @param {number} xNom  L'abscisse d'affichage de la macro
 * @param {number} yNom  L'ordonnée d'affichage de la macro
 * @param {number} decX  Décalage horizontal du nom
 * @param {number} decY  Décalage vertical du nom
 * @param {boolean} masque  true si l'éditeur est masqué
 * @param {CPt} pointLie  null ou pointe sur un point auquel l'affichage est lié.
 * @param {number} taillePolice  Indice de la taiile de police utilisée
 * @param {boolean} effacementFond  true si on efface le fond de l'en-tête.
 * @param {Color} couleurFond  La couleur de fond de l'en-tête.
 * @param {number} alignementHorizontal  0 pour alignement gauche, 1 pour centre, 2 pour droite.
 * @param {number} alignementVertical  0 pour alignement vers le haut, 1 pour centré, 2 pour bas.
 * @param {string} intitule  Le titre de la macro
 * @param {string} commentaireMacro  Eventuel commentaire explicatif.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroAffichantTout}
 */
function CMacroAffichantTout (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacro.call(this, listeProprietaire)
    else {
      CMacro.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, fixed)
    }
  }
}
CMacroAffichantTout.prototype = new CMacro()
CMacroAffichantTout.prototype.constructor = CMacroAffichantTout
CMacroAffichantTout.prototype.superClass = 'CMacro'
CMacroAffichantTout.prototype.className = 'CMacroAffichantTout'

CMacroAffichantTout.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.pointLie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CMacroAffichantTout(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind1, 'CPt'), this.taillePolice, this.effacementFond, this.couleurFond,
    this.alignementHorizontal, this.alignementVertical, this.intitule, this.commentaireMacro, this.fixed)
}
CMacroAffichantTout.prototype.execute = function (svg, dimf, couleurFond) {
  this.listeProprietaire.deleteTraces()
  this.listeProprietaire.positionne(true, dimf)
  this.listeProprietaire.update(svg, couleurFond, true)
  this.termineAction(svg, dimf, couleurFond)
}
