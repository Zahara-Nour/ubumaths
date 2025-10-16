/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import CAffLiePt from './CAffLiePt'
import { traiteAccents } from 'src/kernel/kernel'

export default CValeurAffichee

/**
 * Classe représentant une valeur affichée sur la figure.
 * @constructor
 * @extends CAffLiePt
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si l'objet est un élément final de construction.
 * @param {Color} couleur  La couleur d'éciture de l'éditeur (et du cadre éventuel).
 * @param {number} xNom  L'abscisse d'affichage de l'éditeur
 * @param {number} yNom  L'ordonnée d'affichage de l'éditeur
 * @param {number} decX  Décalage horizontal du nom
 * @param {number} decY  Décalage vertical du nom
 * @param {boolean} masque  true si l'éditeur est masqué
 * @param {CPt} pointLie  null ou pointe sur un point auquel l'affichage est lié.
 * @param {number} taillePolice  Indice de la taiile de police utilisée
 * @param {boolean} encadrement  true si encadré.
 * @param {boolean} effacementFond  true si on efface le fond de l'en-tête.
 * @param {Color} couleurFond  La couleur de fond de l'en-tête.
 * @param {number} alignementHorizontal  0 pour alignement gauche, 1 pour centre, 2 pour droite.
 * @param {number} alignementVertical  0 pour alignement vers le haut, 1 pour centré, 2 pour bas.
 * @param {CValDyn} valeurAssociee  La valeur à afficher
 * @param {string} enTete  le texte qui doit précéder l'affichage de valeur.
 * Encadrer de deux $ pour avoir un affichage LaTeX.
 * @param {string} postChaine  Le texet qui doit suivre l'affichage de la valeur.
 * @param {number} nombreDecimales  Le nombre de décimales du résultat.
 * @param {CValeurAngle} angText  L'angle du texte par rapport à l'horizontale
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @constructor
 */
function CValeurAffichee (listeProprietaire, impProto, estElementFinal, couleur, xNom, yNom,
  decX, decY, masque, pointLie, taillePolice, encadrement, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, valeurAssociee, enTete, postChaine, nombreDecimales, angText, fixed) {
  if (arguments.length === 1) CAffLiePt.call(this, listeProprietaire)
  else {
    CAffLiePt.call(this, listeProprietaire, impProto, estElementFinal, couleur, xNom, yNom,
      decX, decY, masque, pointLie, taillePolice, encadrement, effacementFond, couleurFond, alignementHorizontal,
      alignementVertical, angText, fixed)
    this.valeurAssociee = valeurAssociee
    this.enTete = enTete
    this.postChaine = postChaine
    this.nombreDecimales = nombreDecimales
  }
}
CValeurAffichee.prototype = new CAffLiePt()
CValeurAffichee.prototype.constructor = CValeurAffichee
CValeurAffichee.prototype.superClass = 'CAffLiePt'
CValeurAffichee.prototype.className = 'CValeurAffichee'

CValeurAffichee.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.valeurAssociee)
  const ind2 = listeSource.indexOf(this.pointLie)
  const ind3 = listeSource.indexOf(this.impProto)
  const angTextClone = this.angText.getClone(listeSource, listeCible)
  const ptelb = new CValeurAffichee(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind2, 'CPt'), this.taillePolice, this.encadrement,
    this.effacementFond, this.couleurFond, this.alignementHorizontal, this.alignementVertical,
    listeCible.get(ind1, 'CValDyn'), this.enTete, this.postChaine, this.nombreDecimales, angTextClone,
    this.fixed)
  // Ligne suivante nécessaire car utilsié pour les exportations tikz
  ptelb.id = this.id
  return ptelb
}

CValeurAffichee.prototype.getNature = function () {
  return NatObj.NValeurAffichee
}

CValeurAffichee.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CAffLiePt.prototype.depDe.call(this, p) || this.valeurAssociee.depDe(p))
}

CValeurAffichee.prototype.dependDePourBoucle = function (p) {
  return CAffLiePt.prototype.dependDePourBoucle.call(this, p) || this.valeurAssociee.dependDePourBoucle(p)
}

CValeurAffichee.prototype.positionne = function (infoRandom, dimf) {
  this.existe = this.valeurAssociee.existe
  if (!this.existe) return
  CAffLiePt.prototype.positionne.call(this, infoRandom, dimf)
}

CValeurAffichee.prototype.rendChaineAffichage = function () {
  if (this.valeurAssociee.estDeNatureCalcul(NatCal.NTteValC)) {
    return this.enTete + this.valeurAssociee.rendChaineValeurComplexe(this.nombreDecimales) + this.postChaine
  } else {
    return this.enTete + this.valeurAssociee.rendChaineValeur(this.nombreDecimales) + this.postChaine
  }
}

CValeurAffichee.prototype.chaineDesignation = function () {
  return 'desAffichageValeur'
}

CValeurAffichee.prototype.read = function (inps, list) {
  CAffLiePt.prototype.read.call(this, inps, list)
  this.enTete = traiteAccents(inps.readUTF())
  this.postChaine = traiteAccents(inps.readUTF())
  this.nombreDecimales = inps.readByte()
  const ind1 = inps.readInt()
  this.valeurAssociee = list.get(ind1, 'CValDyn')
  // Ajout version 6.7.2 : On informe la liste propriétaire si l'affichage est LaTeX donc necessite mathJax
  // Valable uniquement pour le player mtg
  if (this.enTete.startsWith('$') && this.postChaine.endsWith('$')) {
    this.listeProprietaire.useLatex = true
  }
}

CValeurAffichee.prototype.write = function (oups, list) {
  CAffLiePt.prototype.write.call(this, oups, list)
  oups.writeUTF(this.enTete)
  oups.writeUTF(this.postChaine)
  oups.writeByte(this.nombreDecimales)
  const ind1 = list.indexOf(this.valeurAssociee)
  oups.writeInt(ind1)
}
