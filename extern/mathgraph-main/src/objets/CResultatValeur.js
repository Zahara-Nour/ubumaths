/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'
import CConstante from './CConstante'
import CMoinsUnaire from './CMoinsUnaire'
import COperation from './COperation'
import Ope from '../types/Ope'
import { fracCont } from '../kernel/kernel'

export default CResultatValeur

/**
 * Classe repésentant dans un arbre binaire le résultat d'un calcul ou d'une mesure réelle existant
 * ou (depuis la version 6.7) le résultat d'un calcul matriciel ou une matrice utilisateur
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CValDyn} valeurAssociee  La valeur dont c'est le résultat.
 * @returns {CResultatValeur}
 */
function CResultatValeur (listeProprietaire, valeurAssociee) {
  if (arguments.length === 0) return // Ajout version WebPack
  CCb.call(this, listeProprietaire)
  if (arguments.length !== 1) this.valeurAssociee = valeurAssociee
}
CResultatValeur.prototype = new CCb()
CResultatValeur.prototype.constructor = CResultatValeur
CResultatValeur.prototype.superClass = 'CCb'
CResultatValeur.prototype.className = 'CResultatValeur'

CResultatValeur.prototype.nature = function () {
  return CCbGlob.natResultatValeur
}
CResultatValeur.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.valeurAssociee)
  return new CResultatValeur(listeCible, listeCible.get(ind1, 'CValDyn'))
}
CResultatValeur.prototype.existe = function () {
  return this.valeurAssociee.existe
}
CResultatValeur.prototype.resultat = function (infoRandom) {
  return this.valeurAssociee.rendValeur(infoRandom)
}
// Ajout version 6.7
// this.valeurAssociee peut aussi maintenant pointer sur une CMatrice
CResultatValeur.prototype.resultatMat = function (infoRandom) {
  if (this.valeurAssociee.estMatriceBase()) return this.valeurAssociee.mat
  else {
    if (this.valeurAssociee.estMatrice()) return this.valeurAssociee.resultat // Cas d'un calcul matriciel
    else return this.resultat(infoRandom)
  }
}
CResultatValeur.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCb.prototype.depDe.call(this, p) ||
    this.valeurAssociee.depDe(p))
}
CResultatValeur.prototype.dependDePourBoucle = function (p) {
  return this.valeurAssociee.dependDePourBoucle(p)
}
CResultatValeur.prototype.getCopie = function () {
  return new CResultatValeur(this.listeProprietaire, this.valeurAssociee)
}
CResultatValeur.prototype.chaineCalcul = function () {
  return this.valeurAssociee.getNom()
}
CResultatValeur.prototype.chaineLatex = function () {
  if (this.valeurAssociee.getNom() === 'pi') return '\\pi ' // Espace à la fin nécesssaire
  else return this.valeurAssociee.getNom()
}
CResultatValeur.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.valeurAssociee = list.get(ind1, 'CValDyn')
}
CResultatValeur.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.valeurAssociee)
  oups.writeInt(ind1)
}

CResultatValeur.prototype.estConstant = function () {
  return this.valeurAssociee.className === 'CCalcConst'
}

CResultatValeur.prototype.calculAvecValeursRemplacees = function (bfrac) {
  const d = this.valeurAssociee.rendValeur(false)
  const list = this.listeProprietaire
  // Version 6.7 : Si le paramètre bfrac esr false, on procède comme avant et s'il est true
  // on remplace, s'il n'est pas entier, le résultat par un quotient dont le numérateur
  // et le dénominateur correspondent à la fraction continue approchant le nombre à 10^(-12) près
  if (d === Math.floor(d) || !bfrac) {
    if (d < 0) return new CMoinsUnaire(list, new CConstante(list, -d))
    else return new CConstante(list, d)
  } else {
    const fraccont = fracCont(d)
    if (fraccont[1] === 1) return new CConstante(list, d) // Dépassement de capacité d'approximation par fraction continue
    const fraction = new COperation(list, new CConstante(list, Math.abs(fraccont[0])),
      new CConstante(list, fraccont[1]), Ope.Divi)
    if (d < 0) return new CMoinsUnaire(list, fraction)
    else return fraction
  }
}
CResultatValeur.prototype.membreGauche = function () {
  return this.valeurAssociee.membreGauche()
}
CResultatValeur.prototype.membreDroit = function () {
  return this.valeurAssociee.membreDroit()
}
// Déplacé ici version 6.4.7
CResultatValeur.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac) {
  if (rempval) return new CConstante(this.listeProprietaire, this.valeurAssociee.rendValeur())
  else return this
}
