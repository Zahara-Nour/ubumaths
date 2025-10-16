/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Complexe from '../types/Complexe'
import Ope from '../types/Ope'
import CCb, { getLeft, getRight } from './CCb'
import CCbGlob from '../kernel/CCbGlob'
import CConstante from './CConstante'

export default CMoinsUnaire

/**
 * @constructor
 * @extends CCb
 * Classe représentant le moins unaire dans un arbre binaire de calcul
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CCb} operande  L'opérande (lui-même un CCb)
 * @returns {CMoinsUnaire}
 */
function CMoinsUnaire (listeProprietaire, operande) {
  CCb.call(this, listeProprietaire)
  if (arguments.length !== 1) {
    this.operande = operande
  }
  this._c1 = new Complexe()
}
CMoinsUnaire.prototype = new CCb()
CMoinsUnaire.prototype.constructor = CMoinsUnaire
CMoinsUnaire.prototype.superClass = 'CCb'
CMoinsUnaire.prototype.className = 'CMoinsUnaire'

CMoinsUnaire.prototype.nature = function () {
  return CCbGlob.natMoinsUnaire
}

CMoinsUnaire.prototype.getClone = function (listeSource, listeCible) {
  const cloneOperande = this.operande.getClone(listeSource, listeCible)
  return new CMoinsUnaire(listeCible, cloneOperande)
}

CMoinsUnaire.prototype.initialisePourDependance = function () {
  CCb.prototype.initialisePourDependance.call(this)
  this.operande.initialisePourDependance()
}

CMoinsUnaire.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCb.prototype.depDe.call(this, p) ||
    this.operande.depDe(p))
}

CMoinsUnaire.prototype.dependDePourBoucle = function (p) {
  return this.operande.dependDePourBoucle(p)
}

CMoinsUnaire.prototype.existe = function () {
  return this.operande.existe()
}

CMoinsUnaire.prototype.resultat = function (infoRandom) {
  return -this.operande.resultat(infoRandom)
}

CMoinsUnaire.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  return -this.operande.resultatFonction(infoRandom, valeurParametre)
}

CMoinsUnaire.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  return -this.operande.resultatFonction(infoRandom, valeurParametre)
}

CMoinsUnaire.prototype.resultatComplexe = function (infoRandom, zRes) {
  this.operande.resultatComplexe(infoRandom, this._c1)
  zRes.x = -this._c1.x
  zRes.y = -this._c1.y
}

CMoinsUnaire.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
  this.operande.resultatFonctionComplexe(infoRandom, valeurParametre, this._c1)
  zRes.x = -this._c1.x
  zRes.y = -this._c1.y
}

CMoinsUnaire.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
  this.operande.resultatFonctionComplexe(infoRandom, valeurParametre, this._c1)
  zRes.x = -this._c1.x
  zRes.y = -this._c1.y
}

CMoinsUnaire.prototype.dependDeVariable = function (ind) {
  return this.operande.dependDeVariable(ind)
}

CMoinsUnaire.prototype.getCopie = function () {
  return new CMoinsUnaire(this.listeProprietaire, this.operande.getCopie())
}

CMoinsUnaire.prototype.getCore = function () {
  return new CMoinsUnaire(this.listeProprietaire, this.operande.getCore())
}

CMoinsUnaire.prototype.chaineCalcul = function (varFor) {
  let ch
  if (this.operande.nature() === CCbGlob.natOperation) {
    const op1 = this.operande.ope
    if ((op1 === Ope.Plus) || (op1 === Ope.Moin) || Ope.estTest(op1)) { ch = this.operande.chaineCalcul(varFor) } else ch = this.operande.chaineCalculSansPar(varFor)
  } else {
    if (this.operande.nature() === CCbGlob.natMoinsUnaire) ch = this.operande.chaineCalcul(varFor)
    else ch = this.operande.chaineCalculSansPar(varFor)
  }
  return '(-' + ch + ')'
}

CMoinsUnaire.prototype.chaineCalculSansPar = function (varFor) {
  let ch
  if (this.operande.nature() === CCbGlob.natOperation) {
    const op1 = this.operande.ope
    if ((op1 === Ope.Plus) || (op1 === Ope.Moin) || Ope.estTest(op1)) { ch = this.operande.chaineCalcul(varFor) } else ch = this.operande.chaineCalculSansPar(varFor)
  } else {
    if (this.operande.nature() === CCbGlob.natMoinsUnaire) ch = this.operande.chaineCalcul(varFor)
    else ch = this.operande.chaineCalculSansPar(varFor)
  }
  return '-' + ch
}

CMoinsUnaire.prototype.chaineLatex = function (varFor, fracSimple = false) {
  let ch
  const parouv = '\\left('
  const parfer = '\\right)'
  if (this.operande.nature() === CCbGlob.natOperation) {
    const op1 = this.operande.ope
    if ((op1 === Ope.Mult) || (op1 === Ope.Divi) || Ope.estTest(op1)) {
      ch = this.operande.chaineLatexSansPar(varFor, fracSimple)
    } else ch = this.operande.chaineLatex(varFor, fracSimple)
  } else {
    if (this.operande.nature() === CCbGlob.natMoinsUnaire) ch = this.operande.chaineLatex(varFor, fracSimple)
    else ch = this.operande.chaineLatexSansPar(varFor, fracSimple)
  }
  return parouv + '-' + ch + parfer
}

CMoinsUnaire.prototype.chaineLatexSansPar = function (varFor, fracSimple = false) {
  let ch
  if (this.operande.nature() === CCbGlob.natOperation) {
    const op1 = this.operande.ope
    if ((op1 === Ope.Mult) || (op1 === Ope.Divi) || Ope.estTest(op1)) {
      ch = this.operande.chaineLatexSansPar(varFor, fracSimple)
    } else ch = this.operande.chaineLatex(varFor, fracSimple)
  } else {
    if (this.operande.nature() === CCbGlob.natMoinsUnaire) ch = this.operande.chaineLatex(varFor, fracSimple)
    else ch = this.operande.chaineLatexSansPar(varFor, fracSimple)
  }
  return '-' + ch
}

CMoinsUnaire.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  this.operande = inps.readObject(list)
}

CMoinsUnaire.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  oups.writeObject(this.operande)
}

CMoinsUnaire.prototype.estConstant = function () {
  return this.operande.estConstant()
}
CMoinsUnaire.prototype.deriveePossible = function (indiceVariable) {
  return this.operande.deriveePossible(indiceVariable)
}
CMoinsUnaire.prototype.calculAvecValeursRemplacees = function (bfrac) {
  return new CMoinsUnaire(this.listeProprietaire, this.operande.calculAvecValeursRemplacees(bfrac))
}

CMoinsUnaire.prototype.membreGauche = function () {
  /*
  if (this.operande.nature() === CCbGlob.natOperation) {
    if ((this.operande.ope === Ope.Mult) || (this.operande.ope === Ope.Divi)) { return new CMoinsUnaire(this.listeProprietaire, this.operande.operande1) }
  }
  return CCb.prototype.membreGauche.call(this)
   */
  return new CMoinsUnaire(this.listeProprietaire, getLeft(this.operande))
}

CMoinsUnaire.prototype.membreDroit = function () {
  /*
  if (this.operande.nature() === CCbGlob.natOperation) {
    if ((this.operande.ope === Ope.Mult) || (this.operande.ope === Ope.Divi)) { return this.operande.operande2 }
  }
  return CCb.prototype.membreDroit.call(this)
   */
  // return new CMoinsUnaire(this.listeProprietaire, CCb.getRight(this.operande))
  return getRight(this.operande)
}

CMoinsUnaire.prototype.isCalcVect = function (tabNames) {
  return this.operande.isCalcVect(tabNames)
}

CMoinsUnaire.prototype.isCalcOK4Vect = function (tabNames) {
  return this.operande.isCalcOK4Vect(tabNames)
}

// Déplacé ici version 6.4.7
CMoinsUnaire.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac, eliminMult1 = true) {
  // On remplace -(-b) par b
  const calcOperande = this.operande.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  const liste = this.listeProprietaire
  if (rempval) {
    const natop1 = calcOperande.nature()
    if (natop1 === CCbGlob.natMoinsUnaire) {
      return calcOperande.operande.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
    }
    if (natop1 === CCbGlob.natConstante) {
      const r = calcOperande.valeur
      if (r === 0) return new CConstante(liste, 0)
    }
  }
  return new CMoinsUnaire(liste, calcOperande)
}

/**
 * Fonction servant uniquement dans les exercices sur le produit scalaire pour rendre un calcul
 * adapté à un calcul de produit scalaire.
 * La seule différence avec un arbre de calcul normal est de remplacer un vecteur élevé au carré par le carré de sa norme
 * @param {string[]} tabNames Tableau contenant les noms des calculs complexes considérés comme des vecteurs
 * @returns {CCb}
 */
CMoinsUnaire.prototype.getCalc4Prosca = function (tabNames) {
  return new CMoinsUnaire(this.listeProprietaire, this.operande.getCalc4Prosca(tabNames))
}
