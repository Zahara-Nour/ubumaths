/**
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CFonction from 'src/objets/CFonction'
import Opef from 'src/types/Opef'
import mathjs from '../kernel/mathjs'
const { det } = mathjs

export default CFonctionMat

/**
 * Classe utilisée pour créer une calcul réel dans lequel on demande directement doit deter(mt)
 * soit nbrow(mat) soit nbcol(mat).
 * Aucun autre calcul réel aute que ceux là n'est possible.
 * Pas possible par exemple de créer un calcul réel avec comme formule deter(A)+1
 * Classe ajoutée version 7.0 pour contourner le fait qu'un calcul réel ne peut utiliser une matrice A
 * que via un appel du type A(1,3) par exemple.
 * @param listeProprietaire
 * @param {Opef} opef l'indice d'un des 3 opérateurs dans l'objet Opef
 * @param {CResultatValeur} operande Un CResultatValeur d'une matrice
 * @constructor
 */
function CFonctionMat (listeProprietaire, opef, operande) {
  if (arguments.length === 1) CFonction.call(this, listeProprietaire)
  else CFonction.call(this, listeProprietaire, opef, operande)
}

CFonctionMat.prototype = new CFonction()
CFonctionMat.prototype.constructor = CFonctionMat
CFonctionMat.prototype.superClass = 'CFonction'
CFonctionMat.prototype.className = 'CFonctionMat'

CFonctionMat.prototype.getClone = function (listeSource, listeCible) {
  const cloneOperande = this.operande.getClone(listeSource, listeCible)
  return new CFonctionMat(listeCible, this.opef, cloneOperande)
}

CFonctionMat.prototype.resultat = function (infoRandom) {
  const mat = this.operande.valeurAssociee
  switch (this.opef) {
    case Opef.Nbrow:
      return mat.n
    case Opef.Nbcol:
      return mat.p
    case Opef.Deter:
    {
      const op = this.operande.resultatMat(infoRandom)
      return det(op)
    }
  }
}
