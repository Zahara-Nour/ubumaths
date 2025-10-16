/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Complexe from '../types/Complexe'
import Ope from '../types/Ope'
import CCbGlob from '../kernel/CCbGlob'
import CConstantei from './CConstantei'
import CMoinsUnaire from './CMoinsUnaire'
import CResultatValeur from './CResultatValeur'
import { fracCont } from '../kernel/kernel'
import CConstante from './CConstante'
import COp from './COperation'

export default CResultatValeurComplexe

/**
 * Classe représentant le résultat d'un calcul ou d'une mesure complexe existant.
 * @constructor
 * @extends CResultatValeur
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CValDyn} valeurAssociee  La valeur complexe dont c'est le résultat.
 * @returns {CResultatValeurComplexe}
 */
function CResultatValeurComplexe (listeProprietaire, valeurAssociee) {
  CResultatValeur.call(this, listeProprietaire)
  if (arguments.length !== 1) this.valeurAssociee = valeurAssociee
}
CResultatValeurComplexe.prototype = new CResultatValeur()
CResultatValeurComplexe.prototype.constructor = CResultatValeurComplexe
CResultatValeurComplexe.prototype.superClass = 'CResultatValeur'
CResultatValeurComplexe.prototype.className = 'CResultatValeurComplexe'

CResultatValeurComplexe.prototype.nature = function () {
  return CCbGlob.natResultatValeurComplexe
}
CResultatValeurComplexe.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.valeurAssociee)
  return new CResultatValeurComplexe(listeCible, listeCible.get(ind1, 'CValDyn'))
}
CResultatValeurComplexe.prototype.resultatComplexe = function (infoRandom, zRes) {
  // this.valeurAssociee.rendValeurComplexe(infoRandom, zRes);
  this.valeurAssociee.rendValeurComplexe(zRes)
}
CResultatValeurComplexe.prototype.calculAvecValeursRemplacees = function (bfrac) {
  const list = this.listeProprietaire
  const z = new Complexe()
  this.valeurAssociee.rendValeurComplexe(z)
  const x = z.x
  const y = z.y
  let xcal, ycal
  if (x === Math.floor(x) || !bfrac) {
    if (x >= 0) {
      xcal = new CConstante(list, x)
    } else {
      xcal = new CMoinsUnaire(list, new CConstante(list, Math.abs(x)))
    }
  } else {
    const fraccont = fracCont(x)
    if (fraccont[1] === 1) xcal = new CConstante(list, x) // Dépassement du  nombre de boucles maxi pour fracCont
    else {
      const fraction = new COp(list, new CConstante(list, Math.floor(Math.abs(fraccont[0]))),
        new CConstante(list, fraccont[1]), Ope.Divi)
      if (x >= 0) xcal = fraction
      else xcal = new CMoinsUnaire(list, fraction)
    }
  }
  if (x === Math.floor(x) || !bfrac) {
    if (y >= 0) ycal = new CConstante(list, y)
    else ycal = new CMoinsUnaire(list, new CConstante(list, Math.abs(y)))
  } else {
    const fraccont = fracCont(y)
    if (fraccont[1] === 1) ycal = new CConstante(list, y) // Dépassement du  nombre de boucles maxi pour fracCont
    else {
      const fraction = new COp(list, new CConstante(list, Math.floor(Math.abs(fraccont[0]))),
        new CConstante(list, fraccont[1]), Ope.Divi)
      if (y >= 0) ycal = fraction
      else ycal = new CMoinsUnaire(list, fraction)
    }
  }
  if (y === 0) return xcal
  if (x === 0) return new COp(list, ycal, new CConstantei(list), Ope.Mult)
  return new COp(list, xcal, new COp(list, ycal,
    new CConstantei(list), Ope.Mult), Ope.Plus)
}

CResultatValeurComplexe.prototype.isCalcVect = function (tabNames) {
  return ((this.valeurAssociee.className === 'CCalculComplexe' || this.valeurAssociee.className === 'CMesureAffixe') &&
    (tabNames.indexOf(this.valeurAssociee.nomCalcul) !== -1)) || this.isVectNul()
}

CResultatValeurComplexe.prototype.isVectNul = function () {
  return this.valeurAssociee.className === 'CCalculComplexe' && this.valeurAssociee.nomCalcul === 'vect0'
}

// Déplacé ici version 6.4.7
CResultatValeurComplexe.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac) {
  const liste = this.listeProprietaire
  if (rempval) {
    const z = new Complexe()
    this.resultatComplexe(false, z)
    if (z.y === 0) return new CConstante(liste, this.valeurAssociee.rendValeur())
    else {
      return new COp(liste, new CConstante(liste, z.x),
        new COp(liste, new CConstante(liste, z.y),
          new CConstantei(liste), Ope.Mult), Ope.Plus)
    }
  } else { return this }
}
