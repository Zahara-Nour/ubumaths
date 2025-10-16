/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// Modifié version 6.3.0
import CValeur from '../objets/CValeur'
import NatObj from '../types/NatObj'
import CCalcul from '../objets/CCalcul'
export default CValeur

CValeur.prototype.depDe4Rec = function (p) {
  return this.calcul.depDe4Rec(p)
}

/**
 * Fonction changeant le calcul de l'objet
 * @param {CCb} calc
 * @returns {void}
 */
CValeur.prototype.donneCalcul = function (calc) {
  this.calcul = calc
  this.dejaPositionne = false
}

/**
 * Fonction rendant true si le calcul associé pointe sur val
 * @param {CValDyn} val
 * @returns {boolean}
 */
CValeur.prototype.pointeSur = function (val) {
  if (this.calcul.className === 'CResultatValeur') {
    return this.calcul.valeurAssociee === val
  } else return false
}

/**
 * Fonction renvoyant un pointeur sur un point ayant pour pour abscisse this
 * dans le cas où this est constant ou se réfère à la même valeur
 * Renvoie null si aucun élément ne répond à la recherhce
 * @param {CListeObjets} list La liste dans laquelle se fait la recherche
 * @param repere Le repère dans lequel on cherche un point de coordonnées (this.valeur, 0)
 * @returns {CPointBase|null} Pointeur sur le point trouvé ou null sinon
 */
CValeur.prototype.existePtAbs = function (list, repere) {
  for (const elb of list.col) {
    if (elb.estDeNature(NatObj.NPointDansRepere) && (elb.rep === repere) &&
      elb.abs.confonduAvec(this) && elb.ord.estConstant() && (elb.ord.valeur === 0)) {
      return elb
    }
  }
  return null
}

CValeur.prototype.estDefiniParObjDs = function (listeOb) { // Modifié version 6.3.0
  // return this.calcul.estDefiniParObjDs(listeOb);
  const calc = this.calcul
  return calc.estConstant() ? true : calc.estDefiniParObjDs(listeOb)
}

/**
 * Fonction servant dans les outils implémentant un prototype
 * Si this.calcul est une référence à une valeur déjà existante, revoie ce pointeur
 * Sinon rajouté à la liste Prinipale de l'application un nouveau calcul dont le nom
 * commence par name
 * @param {MtgApp|MtgAppLecteur} app L'application propriétaire
 * @param {string} name Le début du nom du calcul éventuellement créé
 * @param {boolean} bChiffreImpose i true le nom du calcul généré doit commencer par un chiffre
 * @returns {CCalcul|CValDyn|undefined} pas tres sûr du type…
 */
CValeur.prototype.getCalcForImpProto = function (app, name, bChiffreImpose) {
  let valeur
  const list = app.listePr
  if (this.calcul.className === 'CResultatValeur') {
    valeur = this.calcul.valeurAssociee
  } else {
    const nom = list.genereNomPourCalcul(name, bChiffreImpose)
    const calcul = new CCalcul(list, null, false, nom, this.calcul.chaineCalculSansPar(null), this.calcul)
    app.ajouteElement(calcul)
    valeur = calcul
  }
  return valeur
}
