/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CBipoint from '../objets/CBipoint'
export default CBipoint
/**
 * Fonction renvoyant le point CPointDansBipoint qui représente le point d'intersection
 *  contenu dans le bipoint d'indice 1 pour point1 et 2 pour point2.
 * @param {number} ind  1 ou 2 suivant le point demandé point1 ou point2.
 * @returns {CPointLieBipoint}
 */
CBipoint.prototype.pointReelDansListe = function (ind) {
  const inddeb = this.listeProprietaire.indexOf(this)
  for (let i = inddeb + 1; i < this.listeProprietaire.longueur(); i++) {
    const elb = this.listeProprietaire.get(i)
    if (elb.estDeNature(NatObj.NPoint)) {
      if (elb.className === 'CPointLieBipoint') {
        if ((elb.ptBipoint === this) && (elb.indiceDansBipoint === ind)) return elb
      }
    }
  }
  return null // Normalement jamais
}

/**
 * Fonction utilisée dans le protocole de la figure et renvoyant true si l'objet peut figurer
 * dans la boîte de dialogue de protocole de la figure.
 * Seulement redéfini pour CBipoint
 * @returns {boolean}
 */
CBipoint.prototype.estVisibleDansHist = function () {
  return false
}
