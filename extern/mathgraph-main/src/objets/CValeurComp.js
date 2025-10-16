/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import COb from './COb'
import Complexe from '../types/Complexe'
export default CValeurComp
// Corrigé version 6.3.O car estConstant était à la fois le nom d'un membre et d'une fonction
/**
 * Classe représentant une valeur dynamique complexe définie par un calcul sur des objets
 * numériques de la figure.
 * Appellée CValeurAssocieeComp dans la version Java.
 * Si le calcul associé est constant (ne dépend d'aucun objet dynamique),
 * le calcul n'est fait qu'une fois et le résultat est stocké dans this.valeur
 * sinon le calcul est refait à chaque recalcul de la figure
 * et le résultat stocké dans this.valeur
 * @constructor
 * @extends COb
 * @param {CListeObjets} listeProprietaire
 * @param {CCb} calcul
 * @returns {void}
 */
function CValeurComp (listeProprietaire, calcul) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) {
      if (arguments[0].className === 'CListeObjets') COb.call(this, listeProprietaire)
      else {
        // Construction à partir d'un autre CValeur
        const cvaav = arguments[0]
        COb.call(this, cvaav.listeProprietaire)
        this.calcul = cvaav.calcul.getClone(listeProprietaire, listeProprietaire)
        this.estConst = cvaav.estConst
        if (this.estConst) this.valeurComplexe = new Complexe(cvaav.valeurComplexe)
        this.existe = cvaav.existe
        this.dejaPositionne = cvaav.dejaPositionne
      }
    } else {
      COb.call(this, listeProprietaire)
      this.calcul = calcul
      this.dejaPositionne = false
    }
  } else {
    this.dejaPositionne = false
  }
  this.valeurComplexe = new Complexe()
}
CValeurComp.prototype = new COb()
CValeurComp.prototype.constructor = CValeurComp
CValeurComp.prototype.superClass = 'COb'
CValeurComp.prototype.className = 'CValeurComp'

/**
 * Fonction renvoyant un clone de l'objet
 * @param {CListeObjets} listeSource
 * @param {CListeObjets} listeCible
 * @returns {CValeurComp}
 */
CValeurComp.prototype.getClone = function (listeSource, listeCible) {
  const calculClone = this.calcul.getClone(listeSource, listeCible)
  const va = new CValeurComp(listeCible, calculClone)
  va.dejaPositionne = this.dejaPositionne
  va.estConst = this.estConst
  va.valeurComplexe.x = this.valeurComplexe.x
  va.valeurComplexe.y = this.valeurComplexe.y
  va.existe = this.existe
  return va
}
CValeurComp.prototype.initialisePourDependance = function () {
  this.calcul.initialisePourDependance()
}
/**
 * Fonction donnant à l'objet une valeur constante
 * @param {Complexe} c
 * @returns {void}
 */
CValeurComp.prototype.donneValeur = function (c) {
  this.valeurComplexe.x = c.x
  this.valeurComplexe.y = c.y
  this.calcul = null
  this.dejaPositionne = true
  this.estConst = true
}
/**
 * Fonction renvoyant une chaîne de caractères représentant le calcul associé
 * @returns {string}
 */
CValeurComp.prototype.chaineInfo = function () {
  return this.calcul.chaineCalculSansPar(null)
}
/**
 *
 * Fonction recalculant le calcul associé et affectant la valeur du résultat à this.valeur
 * this.existe est mis à true si le calcul existe
 * @param {boolean} infoRandom  true pour que les éventuels appels à la fonction
 * rand soient réactualisés.
 * @returns {void}
 */
CValeurComp.prototype.positionne = function (infoRandom) {
  if (!this.dejaPositionne) {
    if (this.calcul.estConstant()) {
      this.estConst = true
      this.existe = this.calcul.existe(infoRandom)
      if (!this.existe) return
      try {
        this.listeProprietaire.initialiseNombreIterations()
        this.calcul.resultatComplexe(infoRandom, this.valeurComplexe)
      } catch (e) {
        this.existe = false
        this.valeurComplexe.x = 0
        this.valeurComplexe.y = 0
      }
      if (!isFinite(this.valeurComplexe.x) || !isFinite(this.valeurComplexe.y)) this.existe = false
    } else this.estConst = false
    this.dejaPositionne = true
  }
  if (!this.estConst) {
    this.existe = this.calcul.existe(infoRandom)
    if (!this.existe) return
    // A revoir en java pour la gestion des erreurs de calcul
    // AnnuleErreurDeCalcul();  // Pour détecter une éventuelle erreur de
    //                         // calcul lors de l'appel
    try {
      this.listeProprietaire.initialiseNombreIterations()
      this.calcul.resultatComplexe(infoRandom, this.valeurComplexe)
    } catch (e) {
      this.existe = false
      this.valeurComplexe.x = 0
      this.valeurComplexe.y = 0
    }
    if (!isFinite(this.valeurComplexe.x) || !isFinite(this.valeurComplexe.y)) this.existe = false
  }
}
/**
 * Fonction renvoyant true si le calcul depend de p
 * @param {CElementBase} p
 * @returns {boolean}
 */
CValeurComp.prototype.depDe = function (p) {
  return this.calcul.depDe(p)
}
/**
 * Fonction renvoyant true ii le calcul depend de p pour les boucles de macro
 * @param {CElementBase} p
 * @returns {boolean}
 */
CValeurComp.prototype.dependDePourBoucle = function (p) {
  return this.calcul.dependDePourBoucle(p)
}
/**
 * Fonction renvoyant dans zRes le résultat complexe du calcul.
 * @param {Complexe} zRes
 * @returns {void}
 */
CValeurComp.prototype.rendValeurComplexe = function (zRes) {
  zRes.set(this.valeurComplexe.x, this.valeurComplexe.y)
}
/**
 * Fonction renvoyant true si p est aussi un CValeurAssoceAVariable
 * constant ayant la même valeur ou si le calcul est un résultat de valeur
 * pointant sur la même valeur que this.
 * @param {COb} p
 * @returns {boolean}
 */
CValeurComp.prototype.confonduAvec = function (p) {
  if (p.nomClasse === this.nomClasse) {
    if (this.estConst) {
      return (this.valeurComplexe.x === p.valeurComplexe.x) &&
      (this.valeurComplexe.y === p.valeurComplexe.y)
    } else return false
  } else return false
}
/**
 * Fonction lisant l'objet depuis un flux de données binaire.
 * @param {DataInputStream} inps
 * @param {CListeObjets} list
 * @returns {void}
 */
CValeurComp.prototype.read = function (inps, list) {
  COb.prototype.read.call(this, inps, list)
  this.calcul = inps.readObject(list)
}
/**
 * Fonction enregistrant l'objet dans un flux de données binaire.
 * @param {DataOutputStream} oups
 * @param {CListeObjets} list
 * @returns {void}
 */
CValeurComp.prototype.write = function (oups, list) {
  COb.prototype.write.call(this, oups, list)
  oups.writeObject(this.calcul)
}
/**
 * Fonction renvoyant true si le calcul associé est constant, c'est à dire ne
 * dépend d'aucun objet dynamique
 * @returns {boolean}
 */
CValeurComp.prototype.estConstant = function () {
  return this.estConst
}
