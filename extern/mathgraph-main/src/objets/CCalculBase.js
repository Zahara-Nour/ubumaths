/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Nat from '../types/Nat'
import CCalculAncetre from './CCalculAncetre'
import CalcR from '../kernel/CalcR'
import { getLeft, getRight } from 'src/objets/CCb.js'

export default CCalcul

/**
 * Classe représentant un calcul réel
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire
 * @param {boolean} estElementFinal  true si l'objet est un objet intermédiaire de construction
 * @param {string} nomCalcul  Le nom du calcul
 * @param {string} chaineCalcul  La chaîne repréentant le calcul
 * @param {CCb} calcul  L'arbre binaire contenant le calcul proprement dit
 * @returns {void}
 */
function CCalcul (listeProprietaire, impProto, estElementFinal, nomCalcul,
  chaineCalcul, calcul) {
  if (arguments.length === 0) CCalculAncetre.call(this) // Rajouté version WebPack
  else {
    if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
    else {
      if (arguments.length === 3) CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal)
      else {
        CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
        this.chaineCalcul = chaineCalcul
        if (arguments.length === 5) this.calcul = CalcR.ccb(chaineCalcul, this.listeProprietaire, 0, chaineCalcul.length - 1, null)
        else this.calcul = calcul
      }
    }
    this.resultat = 0 // Le résultat fourni par le calcul
  }
}
CCalcul.prototype = new CCalculAncetre()
CCalcul.prototype.constructor = CCalcul
CCalcul.prototype.superClass = 'CCalculAncetre'
CCalcul.prototype.className = 'CCalcul'

CCalcul.prototype.getNatureCalcul = function () {
  return NatCal.NCalculReel
}
/**
 * Retourne le nom du calcul
 * @returns {string}
 */
CCalcul.prototype.getNom = function () {
  return this.nomCalcul
}

/**
 * Fonction reconstruisant la chaîne représentant le calcul à partir de son arbre
 * binaire de calcul
 * @returns {void}
 */
CCalcul.prototype.reconstruitChaineCalcul = function () {
  this.chaineCalcul = this.calcul.chaineCalculSansPar(null)
}

CCalcul.prototype.rendValeur = function () {
  return this.resultat
}

CCalcul.prototype.positionne = function (infoRandom) {
  this.existe = this.calcul.existe()
  if (!this.existe) return
  // A revoir en java pour la gestion des erreurs de calcul
  // AnnuleErreurDeCalcul();  // Pour détecter une éventuelle erreur de
  //                         // calcul lors de l'appel
  try {
    this.listeProprietaire.initialiseNombreIterations()
    this.resultat = this.calcul.resultat(infoRandom)
  } catch (e) {
    this.existe = false
    // this.resultat = 0;
    this.resultat = -1 // Modificaton version 6.0
  }
  if (!isFinite(this.resultat)) {
    this.existe = false
  }
}

CCalcul.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) || this.calcul.depDe(p))
}

CCalcul.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.calcul.dependDePourBoucle(p)
}

/** A revoir version JavaScript
CCalcul.prototype.modifiableParMenu = function() {
CCalcul.prototype.dialogueModification = function(frame) {
*/
/**
 * Fonction creant l'arbre binaire de calcul pour l'objet
 * @returns {void}
 */
CCalcul.prototype.creeCalcul = function () {
  this.calcul = CalcR.ccb(this.chaineCalcul, this.listeProprietaire, 0,
    this.chaineCalcul.length - 1, null)
}

CCalcul.prototype.estConstant = function () {
  if (this.calcul === null) return false
  return this.calcul.estConstant()
}

CCalcul.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  this.chaineCalcul = inps.readUTF()
  this.calcul = inps.readObject(list)
}

CCalcul.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  oups.writeUTF(this.chaineCalcul)
  oups.writeObject(this.calcul)
}
/**
 * Fonction lisant l'objet dans le flux inps sans lire l'arbre binaire de calcul
 * @param {DataInputStream} inps
 * @param {CListeObjets} list  La liste propriétaire en cours de construction
 * @returns {void}
 */
CCalcul.prototype.readSansCalcul = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
}
/**
 * Fonction enrengistrant l'objet dans le flux oups sans lire l'arbre binaire de calcul
 * @param {DataOutputStream} oups
 * @param {CListeObjets} list  La liste propriétaire en cours de construction
 * @returns {void}
 */
CCalcul.prototype.writeSansCalcul = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
}
/**
 * Renvoie true si on peut calculer la dérivée du calcul par rapport
 * à la variable d'indice indiceVariable (dans le cas d'une fonction réelle)
 * @param {number|null} indiceVariable Entier inidce de la variable formelle éventuelle
 * @returns {boolean}
 */
CCalcul.prototype.deriveePossible = function (indiceVariable) {
  return this.calcul.deriveePossible(indiceVariable)
}

/**
 * Renvoie le membre de gauche de la formule du calcul
 * Utilisée dans la fonction globale getLeft de CCbGlob
 * @returns {CCb}
 */
CCalcul.prototype.membreGauche = function () {
  return getLeft(this.calcul)
}

/**
 * Renvoie le membre de droite de la formule du calcul
 * Utilisée dans la fonction globale getRight de CCbGlob
 * @returns {CCb}
 */
CCalcul.prototype.membreDroit = function () {
  return getRight(this.calcul)
}
/**
 * Spécial JavaScript : Renvoie la chaîne LaTeX de la formule du calcul
 * @returns {string}
 */
CCalcul.prototype.chaineLatex = function () {
  return this.calcul.chaineLatexSansPar(null)
}
/**
 * Fonction renvoyant un tableau formé des noms des variables formelles d'une fonction de une ou plusieurs variables
 * Utilisé seulement pour les fonctions réelles ou complexes d'une ou plusieurs variables
 * @returns {string[]|null} :Le tableau renvoyé
 */
CCalcul.prototype.variableFormelle = function () {
  if (this.estDeNatureCalcul(Nat.or(NatCal.NFonction, NatCal.NFonctionComplexe))) {
    return [this.nomsVariables]
  }
  if (this.estDeNatureCalcul(Nat.or(NatCal.NFoncPlusieursVar, NatCal.NFoncCPlusieursVar))) {
    return [...this.nomsVariables]
  }
  return null
}
