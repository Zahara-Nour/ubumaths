/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacro from './CMacro'
import CSousListeObjets from './CSousListeObjets'
export default CMacroAvecListe

/**
 * Macro ancêtre de toutes les macros utilisant une liste d'objets de façon intene.
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
 * @param {CListeObjets} listeAssociee  La liste interne utilisée.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroAvecListe}
 */
function CMacroAvecListe (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, listeAssociee,
  fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacro.call(this, listeProprietaire)
    else {
      CMacro.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, fixed)
      this.listeAssociee = listeAssociee
    }
  }
}
CMacroAvecListe.prototype = new CMacro()
CMacroAvecListe.prototype.constructor = CMacroAvecListe
CMacroAvecListe.prototype.superClass = 'CMacro'
CMacroAvecListe.prototype.className = 'CMacroAvecListe'

CMacroAvecListe.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CMacro.prototype.depDe.call(this, p) || this.listeAssociee.depDe(p))
}
CMacroAvecListe.prototype.dependDePourBoucle = function (p) {
  return CMacro.prototype.dependDePourBoucle.call(this, p) || this.listeAssociee.dependDePourBoucle(p)
}
CMacroAvecListe.prototype.executionPossible = function () {
  return this.listeAssociee.existeAuMoinsUnElement()
}
CMacroAvecListe.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  this.listeAssociee.remplacePoint(ancienPoint, nouveauPoint)
}
CMacroAvecListe.prototype.read = function (inps, list) {
  CMacro.prototype.read.call(this, inps, list)
  this.listeAssociee = new CSousListeObjets()
  this.listeAssociee.read(inps, list)
}
CMacroAvecListe.prototype.write = function (oups, list) {
  CMacro.prototype.write.call(this, oups, list)
  this.listeAssociee.write(oups, this.listeProprietaire)
}
