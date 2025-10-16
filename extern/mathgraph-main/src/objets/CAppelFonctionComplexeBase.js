/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CAppelFonction from './CAppelFonctionBase'

export default CAppelFonctionComplexe

/**
 * Objet d'un arbre binaire de calcul représentant un appel de fonction complexe utilisateur.
 * @constructor
 * @extends CAppelFonction
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CFoncComplexe} fonctionAssociee  Peut pointer sur une fonction ou une suite.
 * @param {CCb} operande  L'opérande dont on cherche l'image.
 * @returns {CAppelFonctionComplexe}
 */
function CAppelFonctionComplexe (listeProprietaire, fonctionAssociee, operande) {
  CAppelFonction.call(this, listeProprietaire, fonctionAssociee, operande)
  // this.z1loc = new mtg32.Complexe(); Version 4.9.7
}
CAppelFonctionComplexe.prototype = new CAppelFonction()
CAppelFonctionComplexe.prototype.constructor = CAppelFonctionComplexe
CAppelFonctionComplexe.prototype.superClass = 'CAppelFonction'
CAppelFonctionComplexe.prototype.className = 'CAppelFonctionComplexe'

CAppelFonctionComplexe.prototype.getClone = function (listeSource, listeCible) {
  const cloneOperande = this.operande.getClone(listeSource, listeCible)
  // à revoir car la fonction a déjà été créée
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  return new CAppelFonctionComplexe(listeCible, listeCible.get(ind1, 'CCalculAncetre'), cloneOperande)
}

CAppelFonctionComplexe.prototype.getCopie = function () {
  return new CAppelFonctionComplexe(this.listeProprietaire, this.fonctionAssociee, this.operande.getCopie())
}
