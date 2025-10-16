/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointLie from './CPointLie'
import NatObj from '../types/NatObj'
import { projetteOrtho } from 'src/kernel/kernelVect'

export default CPointLieDroite

/**
 * Point lié à une droite (ou segment ou demi-droite ou vecteur)
 * @constructor
 * @extends CPointLie
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet
 * @param {boolean} nomMasque  true si le nom de l'objet est masqué
 * @param {number} decX  Decalage horizontal du nom
 * @param {number} decY  Decalage vertical du nom
 * @param {boolean} masque  true si l'objet est masque
 * @param {string} nom  Le nom eventuel de l'objet
 * @param {number} tailleNom  Indice de la taille du nom (voir Fonte)
 * @param {MotifPoint} motif  Le motif du point
 * @param {boolean} marquePourTrace  true si le point est marqué pour la trace
 * @param {boolean} fixed  true si punaisé
 * @param {number} abscisse
 * @param {CDroiteAncetre} droiteLiee  objet auquel le point est lié
 * @returns {void}
 */
function CPointLieDroite (listeProprietaire, impProto, estElementFinal,
  couleur, nomMasque, decX, decY, masque, nom, tailleNom,
  motif, marquePourTrace, fixed, abscisse, droiteLiee) {
  if (arguments.length === 1) CPointLie.call(this, listeProprietaire)
  else {
    CPointLie.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace, fixed, abscisse)
    this.droiteLiee = droiteLiee
  }
}
CPointLieDroite.prototype = new CPointLie()
CPointLieDroite.prototype.constructor = CPointLieDroite
CPointLieDroite.prototype.superClass = 'CPointLie'
CPointLieDroite.prototype.className = 'CPointLieDroite'

CPointLieDroite.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.droiteLiee)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CPointLieDroite(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, this.fixed, this.abscisse, listeCible.get(ind1, 'CDroiteAncetre'))
}

CPointLieDroite.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.droiteLiee)
}

CPointLieDroite.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPointLie.prototype.depDe.call(this, p) || this.droiteLiee.depDe(p))
}

CPointLieDroite.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.droiteLiee.dependDePourBoucle(p)
}

CPointLieDroite.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.droiteLiee.existe
  if (!this.existe) return
  const xn = this.droiteLiee.point_x + this.abscisse * this.droiteLiee.vect.x
  const yn = this.droiteLiee.point_y + this.abscisse * this.droiteLiee.vect.y
  CPointLie.prototype.placeEn.call(this, xn, yn)
  CPointLie.prototype.positionne.call(this, infoRandom, dimfen) // Ajout version 4.6.4
}

CPointLieDroite.prototype.testDeplacement = function (dimfen, xtest, ytest, pointr, abscr) {
  projetteOrtho(xtest, ytest, this.droiteLiee.point_x, this.droiteLiee.point_y,
    this.droiteLiee.vect, pointr)
  const dte = this.droiteLiee
  let valable = (dte.appartientA(pointr.x, pointr.y)) && (dimfen.dansFenetre(pointr.x, pointr.y))
  // Amélioration par rapport à la version Java : Si on est proche d'une des extrémités d'un segment on se place dessus
  if (dte.estDeNature(NatObj.NSegment)) {
    if ((Math.abs(dte.point1.x - pointr.x) <= 1) && (Math.abs(dte.point1.y - pointr.y) <= 1)) {
      valable = true
      pointr.x = dte.point1.x
      pointr.y = dte.point1.y
    } else {
      if ((Math.abs(dte.point2.x - pointr.x) <= 1) && (Math.abs(dte.point2.y - pointr.y) <= 1)) {
        valable = true
        pointr.x = dte.point2.x
        pointr.y = dte.point2.y
      }
    }
  }
  if (!valable) return false
  const absx = Math.abs(this.droiteLiee.vect.x)
  const absy = Math.abs(this.droiteLiee.vect.y)
  if ((absx === 0) && (absy === 0)) valable = false
  else {
    if (absx > absy) { abscr.setValue((pointr.x - this.droiteLiee.point_x) / this.droiteLiee.vect.x) } else { abscr.setValue((pointr.y - this.droiteLiee.point_y) / this.droiteLiee.vect.y) }
  }
  return valable
}

CPointLieDroite.prototype.abscisseMinimale = function () {
  return this.droiteLiee.abscisseMinimale()
}

CPointLieDroite.prototype.abscisseMaximale = function () {
  return this.droiteLiee.abscisseMaximale()
}

CPointLieDroite.prototype.confonduAvec = function (p) {
  const res = CPointLie.prototype.confonduAvec.call(this, p)
  if (!res) return false
  return (this.droiteLiee === p.droiteLiee)
}
/**
 * Zoome les coordonnées du point d'un facteur rapport par rapport au point
 * de coordonnées (xcentre, ycentre)
 * @param {number} rapport
 * @param {number} xcentre
 * @param {number} ycentre
 * @returns {void}
 */
CPointLieDroite.prototype.zoom = function (rapport) {
  // Si le point est lié à une droite horizontale ou verticale, on a déjà multiplié
  // le vecteur directeur de la droite par rapport do,c on ne fait rine saut si le poit est punaisé
  // auquel cas il ne doit pas bouger et il faut multiplier son abscisse par 1/rapport
  if ((this.droiteLiee.className === 'CDroiteDirectionFixe') && this.fixed) {
    this.abscisse /= rapport
  }
}

CPointLieDroite.prototype.read = function (inps, list) {
  CPointLie.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.droiteLiee = list.get(ind1, 'CDroiteAncetre')
}

CPointLieDroite.prototype.write = function (oups, list) {
  CPointLie.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.droiteLiee)
  oups.writeInt(ind1)
}
