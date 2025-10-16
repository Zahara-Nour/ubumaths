/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroite from './CDroite'
import CalcR from '../kernel/CalcR'
export default CDroiteParEq

/**
 * Droite définie par une équation cartésienne dans un repère.
 * @constructor
 * @extends CDroite
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} nomMasque  true si le nom de l'objet est masqué
 * @param {number} decX  Décalage en abscisses du nom.
 * @param {number} decY  Décalage en ordonnées du nom.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {string} nom  Le nom de l'objet. Seules les droites peuvent être nommées,
 * pas les segments ni demi-droites.
 * @param {number} tailleNom  Indice donnant la taille du nom.
 * @param {StyleTrait} style  Le style de trait utilisé.
 * @param {number} abscisseNom  Abscisse du nom par rapport à la droite.
 * @param {CRepere} rep  Le repère dans lequel l'équation est donnée.
 * @param {CCb} equation  Un calcul représentant l'équation de la droite (avec un test d'égalité).
 * Ce calcul n'est pas forcément simplifié. Il est enregistré dans le flux binaire.
 * @param {CCb} fonction  Une fonction de deux variables x et y avec une formule de
 * la forme a*x+b*y+c = 0.Ce calcul est enregistré dans le flux binaire.
 * @returns {CDroiteParEq}
 */
function CDroiteParEq (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, style, abscisseNom, rep, equation, fonction) {
  if (arguments.length === 1) CDroite.call(this, listeProprietaire)
  else {
    CDroite.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      nomMasque, decX, decY, masque, nom, tailleNom, style, abscisseNom)
    this.rep = rep
    this.equation = equation
    this.fonction = fonction
  }
}
CDroiteParEq.prototype = new CDroite()
CDroiteParEq.prototype.constructor = CDroiteParEq
CDroiteParEq.prototype.superClass = 'CDroite'
CDroiteParEq.prototype.className = 'CDroiteParEq'

CDroiteParEq.prototype.numeroVersion = function () {
  return 2
}

CDroiteParEq.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.rep)
  const ind2 = listeSource.indexOf(this.impProto)
  const equationClone = this.equation.getClone(listeSource, listeCible)
  const fonctionClone = this.fonction.getClone(listeSource, listeCible)
  const ptelb = new CDroiteParEq(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY,
    this.masque, this.nom, this.tailleNom, this.style.getClone(), this.abscisseNom, listeCible.get(ind1, 'CRepere'),
    equationClone, fonctionClone)
  if (listeCible.className !== 'CPrototype') {
    ptelb.calcula = CalcR.creeDerivee(fonctionClone, 0)
    ptelb.calculb = CalcR.creeDerivee(fonctionClone, 1)
    ptelb.bEquationValide = ptelb.equationValide()
  }
  return ptelb
}

CDroiteParEq.prototype.metAJour = function () {
  this.calcula = CalcR.creeDerivee(this.fonction, 0)
  this.calculb = CalcR.creeDerivee(this.fonction, 1)
  this.bEquationValide = this.equationValide()
}

CDroiteParEq.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CDroite.prototype.depDe.call(this, p) || this.rep.depDe(p) || this.equation.depDe(p))
}

CDroiteParEq.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.rep.dependDePourBoucle(p) || this.equation.dependDePourBoucle(p))
}

CDroiteParEq.prototype.positionne = function (infoRandom, dimfen) {
  let nor, unitex, unitey, x1, y1, param, d, par
  if (!this.bEquationValide) {
    this.existe = false
    return
  }
  this.existe = this.rep.existe && this.equation.existe()
  if (this.existe) {
    try {
      this.listeProprietaire.initialiseNombreIterations()
      // calcula et calculb sont des fonctions de deux variables
      par = new Array(2)
      par[0] = 1
      par[1] = 0
      this.a = this.calcula.resultatFonction(infoRandom, par)
      par[0] = 0
      par[1] = 1
      this.b = this.calculb.resultatFonction(infoRandom, par)
      if ((this.a === 0) && (this.b === 0)) {
        this.existe = false
        return
      }
      // Le coefficient c est calculé comme l'image par la fonction de deux variables du couple (0;0)
      param = new Array(2)
      param[0] = 0
      param[1] = 0
      this.c = this.fonction.resultatFonction(infoRandom, param)
    } catch (e) {
      this.existe = false
      return
    }
    if (!isFinite(this.a) || !isFinite(this.b) || !isFinite(this.c) || ((this.a === 0) && (this.b === 0))) {
      this.existe = false
      return
    }
    nor = Math.sqrt(this.a * this.a + this.b * this.b)
    unitex = this.rep.unitex
    unitey = this.rep.unitey
    x1 = -this.b / nor / unitex
    y1 = this.a / nor / unitey
    this.vect.x = this.rep.u.x * x1 + this.rep.v.x * y1
    this.vect.y = this.rep.u.y * x1 + this.rep.v.y * y1
    if (this.b !== 0) {
      d = -this.c / this.b / unitey
      if ((Math.abs(d) > 1e5) && (this.a !== 0)) { // Droite quasi parallèle à l'axe des ordonnées
        // On cherche alors le point d'intersection avec l'axe des abscisses
        d = -this.c / this.a / unitex
        this.point_x = this.rep.origine.x + d * this.rep.u.x
        this.point_y = this.rep.origine.y + d * this.rep.u.y
      } else {
        // Sinon point d'intersection avec l'axe des ordonnées
        this.point_x = this.rep.origine.x + d * this.rep.v.x
        this.point_y = this.rep.origine.y + d * this.rep.v.y
      }
    } else {
      d = -this.c / this.a / unitex
      this.point_x = this.rep.origine.x + d * this.rep.u.x
      this.point_y = this.rep.origine.y + d * this.rep.u.y
    }
    CDroite.prototype.positionne.call(this, infoRandom, dimfen)
  }
}

/**
 * Fonction renvoyant true si l'équation de la droite est valide.
 * @returns {boolean}
 */
CDroiteParEq.prototype.equationValide = function () {
  return (this.fonction.dependDeVariable(0) || this.fonction.dependDeVariable(1)) &&
      !this.calcula.dependDeVariable(0) && !this.calcula.dependDeVariable(1) &&
      !this.calculb.dependDeVariable(0) && !this.calculb.dependDeVariable(1)
}

CDroiteParEq.prototype.read = function (inps, list) {
  CDroite.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.rep = list.get(ind1, 'CRepere')
  this.equation = inps.readObject(list)
  this.fonction = inps.readObject(list)
  if (list.className !== 'CPrototype') {
    this.calcula = CalcR.creeDerivee(this.fonction, 0) // Dérivée partielle par rapport à x
    this.calculb = CalcR.creeDerivee(this.fonction, 1) // Dérivée partielle par rapport à y
    this.bEquationValide = this.equationValide()
  }
}

CDroiteParEq.prototype.write = function (oups, list) {
  CDroite.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.rep)
  oups.writeInt(ind1)
  oups.writeObject(this.equation)
  oups.writeObject(this.fonction)
}
