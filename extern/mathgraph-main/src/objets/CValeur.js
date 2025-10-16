/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// Corrigé version 6.3.0 car estConstant était à la fois le nom d'un membre et d'une fonction
import COb from './COb'
import CConstante from './CConstante'

export default CValeur

/**
 * Classe représentant une valeur dynamique définie par un calcul sur des objets
 * numériques de la figure.
 * Appelée CValeurAssocieeAVariable dans la version Java.
 * Si le cacul associé est constant (ne dépend d'aucun objet dynamique),
 * le calcul n'est fait qu'une fois et le résultat est stocké dans this.valeur
 * sinon le calcul est refait à chaque recalcul de la figure
 * et le résultat stocké dans this.valeur.
 * Par exemple, un cercle défini par centre et rayon a son rayon de type CValeur.
 * @constructor
 * @extends COb
 * @param {CListeObjets} listeProprietaire
 * @param {CCb|number} calcul  pointe sur le calcul donnant le résultat
 * @returns {CValeur}
 */
function CValeur (listeProprietaire, calcul) {
  if (arguments.length !== 0) {
    // Si 0, Constructeur pour chargement depuis flux
    if (arguments.length === 1) {
      // ici ça râle parce qu'un CListeObjets n'a pas de propriété superClass, mais les objets qui en héritent peuvent l'avoir
      // on pourrait contourner ça avec un test `if (listeProprietaire instanceof CListeObjets)` (qui marche aussi pour les classes héritées),
      // mais on laisse comme ça, c'est juste un warning de l'IDE
      if (listeProprietaire.className === 'CListeObjets' || listeProprietaire.superClass === 'CListeObjets') {
        COb.call(this, listeProprietaire)
      } else {
        // Construction à partir d'un autre CValeur
        const cvaav = arguments[0]
        COb.call(this, cvaav.listeProprietaire)
        if (this.calcul !== null) this.calcul = cvaav.calcul.getClone(listeProprietaire, listeProprietaire)
        this.estConst = cvaav.estConst
        if (this.estConst) this.valeur = cvaav.valeur
        this.existe = cvaav.existe
        this.dejaPositionne = cvaav.dejaPositionne
      }
    } else {
      if (typeof calcul === 'number') {
        // Construction par liste et valeur numérique
        const liste = arguments[0]
        const nombre = arguments[1]
        COb.call(this, liste)
        this.calcul = new CConstante(liste, nombre)
        this.valeur = nombre
        // this.dejaPositionne = true; // Modifié version 6.3.0 pcar les CValeur des boîtes de dialogue
        // sont initialisés pas une constante
        this.dejaPositionne = false
        // this.estConst = true; // Supprimé version 6.3.0
        // this.existe = true; // Supprimé version 6.3.0
      } else {
        COb.call(this, listeProprietaire)
        this.calcul = calcul
        this.dejaPositionne = false
      }
    }
  }
}
CValeur.prototype = new COb()
CValeur.prototype.constructor = CValeur
CValeur.prototype.superClass = 'COb'
CValeur.prototype.className = 'CValeur'

/**
 * Fonction donnant à l'objet une valeur constante et créant le calcul
 * constant correspondant
 * @param {number} val
 * @returns {void}
 */
CValeur.prototype.donneValeur = function (val) {
  this.valeur = val
  this.calcul = new CConstante(this.listeProprietaire, this.valeur)
  this.dejaPositionne = true
  this.estConst = true
  this.existe = true
}
CValeur.prototype.initialisePourDependance = function () {
  this.calcul.initialisePourDependance()
}
/**
 * Fonction renvoyant true si le calcul depend de p
 * @param {CElementBase} p
 * @returns {boolean}
 */
CValeur.prototype.depDe = function (p) {
  return this.calcul.depDe(p)
}
/**
 * Fonction renvoyant true ii le calcul depend de p pour les boucles de macro
 * @param {CElementBase} p
 * @returns {boolean}
 */
CValeur.prototype.dependDePourBoucle = function (p) {
  return this.calcul.dependDePourBoucle(p)
}
/**
 * Fonction recalculant le calcul associé et affectant la valeur du résultat à this.valeur
 * this.existe est mis à true si le calcul existe
 * @param {boolean} infoRandom  true pour que les éventuels appels à la fonction
 * rand soient réactualisés.
 * @returns {void}
 */
CValeur.prototype.positionne = function (infoRandom) {
  if (!this.dejaPositionne) {
    if (this.calcul.estConstant()) {
      this.estConst = true
      this.existe = this.calcul.existe(infoRandom)
      if (!this.existe) return
      try {
        this.listeProprietaire.initialiseNombreIterations()
        this.valeur = this.calcul.resultat(infoRandom)
      } catch (e) {
        this.existe = false
        this.valeur = 0
      }
      if (!isFinite(this.valeur)) this.existe = false
    } else this.estConst = false
    this.dejaPositionne = true
  }
  if (!this.estConst) {
    this.existe = this.calcul.existe(infoRandom)
    if (!this.existe) return
    try {
      this.listeProprietaire.initialiseNombreIterations()
      this.valeur = this.calcul.resultat(infoRandom)
    } catch (e) {
      this.existe = false
      this.valeur = 0
    }
    if (!isFinite(this.valeur)) this.existe = false
  }
}
/**
 * Fonction renvoyant true si p est aussi un CValeurAssoceAVariable
 * constant ayant la même valeur ou si le calcul est un résultat de valeur
 * pointant sur la même valeur que this.
 * @param {COb} p
 * @returns {boolean}
 */
CValeur.prototype.confonduAvec = function (p) {
  if (!this.dejaPositionne) this.positionne(false, null)
  if (!p.dejaPositionne) p.positionne(false, null)
  if (this.estConst && p.estConst) {
    return (this.valeur === p.valeur)
  }
  if ((this.calcul.className === 'CResultatValeur') && (p.calcul.className === 'CResultatValeur')) {
    return this.calcul.valeurAssociee === p.calcul.valeurAssociee
  }
  return false
}
/**
 * Renvoie la valeur du calcul associé
 * @returns {number}
 */
CValeur.prototype.rendValeur = function () {
  return this.valeur /// Cas d'une constante
}
/**
 * Fonction renvoyant une chaîne de caractères représentant le calcul associé.
 * @returns {string}
 */
CValeur.prototype.chaineInfo = function () {
  let ch = this.calcul.chaineCalculSansPar(null)
  if (!this?.listeProprietaire.decimalDot) ch = ch.replaceAll(',', '.').replaceAll(';', ',')
  return ch
}
/**
 * Fonction lisant l'objet depuis un flux de données binaire.
 * @param {DataInputStream} inps
 * @param {CListeObjets} list
 * @returns {void}
 */
CValeur.prototype.read = function (inps, list) {
  COb.prototype.read.call(this, inps, list)
  this.calcul = inps.readObject(list)
}
/**
 * Fonction enregistrant l'objet dans un flux de données binaire.
 * @param {DataOutputStream} oups
 * @param {CListeObjets} list
 * @returns {void}
 */
CValeur.prototype.write = function (oups, list) {
  COb.prototype.write.call(this, oups, list)
  oups.writeObject(this.calcul)
}
/**
 * Fonction renvoyant true si le calcul associé est constant, c'est à dire ne
 * dépend d'aucun objet dynamique
 * @returns {boolean}
 */
CValeur.prototype.estConstant = function () {
  return this.estConst
}
/**
 * Fonction renvoyant un clone de l'objet
 * @param {CListeObjets} listeSource
 * @param {CListeObjets} listeCible
 * @returns {CValeur}
 */
CValeur.prototype.getClone = function (listeSource, listeCible) {
  const calculClone = this.calcul.getClone(listeSource, listeCible)
  const va = new CValeur(listeCible, calculClone, this.valeur)
  va.dejaPositionne = this.dejaPositionne
  va.estConst = this.estConst
  va.valeur = this.valeur
  va.existe = this.existe
  return va
}
