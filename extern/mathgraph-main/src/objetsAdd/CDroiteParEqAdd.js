/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroiteParEq from '../objets/CDroiteParEq'
import CalcR from '../kernel/CalcR'
import EqDroiteDlg from '../dialogs/EqDroiteDlg'
import CDroite from '../objets/CDroite'
import { getStr } from '../kernel/kernel'

export default CDroiteParEq

CDroiteParEq.prototype.info = function () {
  const parametre = new Array(2)
  parametre[0] = 'x'
  parametre[1] = 'y'
  return this.nom + ' : ' + getStr('chinfo175') + ' ' + this.equation.chaineCalculSansPar(parametre)
}

CDroiteParEq.prototype.infoHist = function () {
  return this.info() + '\n' + getStr('chinfo32') + ' ' + this.rep.getNom()
}

CDroiteParEq.prototype.verifieFormules = function (cheq, indiceErreur) {
  let nbegal, par, i, car
  // On regarde d'abord si la syntaxe est correcte comme fonction de deux variables x et y
  const parametre = new Array(2)
  parametre[0] = 'x'
  parametre[1] = 'y'
  let indiceMax = this.listeProprietaire.indexOf(this)
  if (indiceMax === -1) indiceMax = this.listeProprietaire.longueur() - 1
  const synt = CalcR.verifieSyntaxe(this.listeProprietaire, cheq, indiceErreur, indiceMax, parametre)
  if (!synt) return false
  // Si la syntaxe est correcte il faut vérifier qu'il n'y a qu'un seul signe d'égalité
  nbegal = 0
  par = 0
  for (i = 0; i < cheq.length; i++) {
    car = cheq.charAt(i)
    if (car === '(') par++
    else if (car === ')') par--
    else if ((car === '=') && (par === 0)) nbegal++
    if (nbegal > 1) {
      indiceErreur.setValue(i)
      break
    }
  }
  if (nbegal !== 1) return false
  // La syntaxe est correcte. On crée la fonction qui sera de la forme ax+by+c en replaçant
  // l'égalité par une soustraction
  let chfon = cheq
  par = 0
  for (i = 0; i < chfon.length; i++) {
    car = chfon.charAt(i)
    if (car === '(') par++
    else if (car === ')') par--
    else if ((car === '=') && (par === 0)) {
      chfon = chfon.substring(0, i) + '-(' + chfon.substring(i + 1) + ')'
      break
    }
  }
  const fonction1 = CalcR.ccb(chfon, this.listeProprietaire, 0, chfon.length - 1, parametre)
  // Il faut vérifier si fonction1 dépend bien de au moins une des deux variables x et y
  //  if (!(fonction1.dependDeVariable(0) || fonction1.dependDeVariable(1))) return false;
  // Il faut vérifier que c'est bien une équation de droite qui a été entrée.
  // Pour cela on crée les dérivées partielles de fonction1 par rapport à x et y et on vérifie que ces dérivées
  // partielles ne dépendent ni de x ni de y
  const calcula1 = CalcR.creeDerivee(fonction1, 0) // Dérivée partielle par rapport à x
  // if (calcula1.dependDeVariable(0) || calcula1.dependDeVariable(1)) return false;
  const calculb1 = CalcR.creeDerivee(fonction1, 1) // Dérivée partielle par rapport à y
  // if (calculb1.dependDeVariable(0) || calculb1.dependDeVariable(1)) return false;
  this.equation = CalcR.ccb(cheq, this.listeProprietaire, 0, cheq.length - 1, parametre)
  this.fonction = fonction1
  this.calcula = calcula1
  this.calculb = calculb1
  this.bEquationValide = this.equationValide()
  return this.bEquationValide
}

CDroiteParEq.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CDroiteParEq.prototype.modifDlg = function (app, callBack1, callBack2) {
  new EqDroiteDlg(app, this, true, callBack1, callBack2)
}

CDroiteParEq.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CDroite.prototype.depDe4Rec.call(this, p) ||
    this.rep.depDe4Rec(p) || this.equation.depDe4Rec(p))
}

/**
 * Sert à savoir si un objet est défini uniquement par des objets figurant dans une liste
 * Attention : cette fonction est spéciale pour cet objet
 * En effet, un objet calcul descendant de CCAlculBase ne faisant référence
 * qu'à des constantes renvoie true dans EstDefiniParObjetDans
 * Il faut donc qu'en plus le calcul dépende d'au moins un des objets sources
 * @param listeOb
 * @returns {boolean}
 */
CDroiteParEq.prototype.estDefiniParObjDs = function (listeOb) {
  const res = this.rep.estDefPar(listeOb) || this.dependDeAuMoinsUn(listeOb)
  return res && this.equation.estDefiniParObjDs(listeOb)
}
