/*
 * Created by yvesb on 12/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

export default EditeurChoixValeur

/**
 * Objet associé à un input d'une boîte de dialogue et chargé de regarder si
 * le contenu de l'éditeur contient le nom d'une valeur réelle ou complexe contenue dans la liste list
 * et dont l'indice est inférieur ou égal à indmax
 * @param {CListeObjets} list La liste dans laquelle se fait la recherche
 * @param {number} indmax L'indice max dans la liste pour la recherche, -1 si la recherche se fait dans la liste complète
 * @constructor
 */
function EditeurChoixValeur (list, indmax) {
  this.list = list
  this.indmax = indmax === -1 ? list.longueur() - 1 : indmax
}

EditeurChoixValeur.prototype.validate = function (ch) {
  // Retournera null si aucun élément ne correspond au nom contenu dans ch
  return this.list.pointeurValeurReelleOuComplexe(ch, this.indmax)
}
