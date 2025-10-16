/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Vect from '../types/Vect'
import { zeroAngle } from '../kernel/kernel'
import CDroite from './CDroite'

export default CBissectrice

/**
 * Classe bissectrice donnée par les trois sommes de l'angle.
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
 * @param {StyleTrait} style  Le style de trait utilisé
 * @param {number} abscisseNom  Abscisse du nom par rapport à la droite.
 * @param {CPt} b  Le premier point de l'angle.
 * @param {CPt} a  Le sommet de l'angle.
 * @param {CPt} c  Le troisième point de l'angle.
 * @returns {CBissectrice}
 */
function CBissectrice (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, style, abscisseNom, b, a, c) {
  if (arguments.length === 1) CDroite.call(this, listeProprietaire)
  else {
    CDroite.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      nomMasque, decX, decY, masque, nom, tailleNom, style, abscisseNom)
    this.b = b
    this.a = a
    this.c = c
  }
  this.longueurVecteurDirecteur = 0.1
}
CBissectrice.prototype = new CDroite()
CBissectrice.prototype.constructor = CBissectrice
CBissectrice.prototype.superClass = 'CDroite'
CBissectrice.prototype.className = 'CBissectrice'

CBissectrice.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.b)
  const ind2 = listeSource.indexOf(this.a)
  const ind3 = listeSource.indexOf(this.c)
  const ind4 = listeSource.indexOf(this.impProto)
  return new CBissectrice(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom, this.tailleNom,
    this.style.getClone(), this.abscisseNom, listeCible.get(ind1, 'CPt'),
    listeCible.get(ind2, 'CPt'), listeCible.get(ind3, 'CPt'))
}
CBissectrice.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.b)
  liste.add(this.a)
  liste.add(this.c)
}
CBissectrice.prototype.positionne = function (infoRandom, dimfen) {
  const u = new Vect()
  const v = new Vect()
  const u1 = new Vect()
  const v1 = new Vect()

  this.existe = (this.a.existe) && (this.b.existe) && (this.c.existe) && (!this.a.egal(this.b)) && (!this.a.egal(this.c))
  if (!this.existe) return
  this.point_x = this.a.x
  this.point_y = this.a.y
  u.setVecteur(this.a, this.b)
  v.setVecteur(this.a, this.c)
  // Correction d'un bug figurant jusque dans la version 2.5 du C++
  if (zeroAngle(Math.abs(u.mesureAngleVecteurs(v)) - Math.PI)) {
    u.tourne(Math.PI / 2, v)
    v.vecteurColineaire(this.longueurVecteurDirecteur, this.vect)
  } else {
    u.vecteurColineaire(1, u1)
    v.vecteurColineaire(1, v1)
    const w = new Vect()
    w.x = u1.x + v1.x
    w.y = u1.y + v1.y
    w.vecteurColineaire(this.longueurVecteurDirecteur, this.vect)
  }
  CDroite.prototype.positionne.call(this, infoRandom, dimfen)
}
CBissectrice.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return ((this.b === p.b) && (this.a === p.a) && (this.c === p.c)) ||
            ((this.b === p.c) && (this.a === p.a) && (this.c === p.b))
  } else return false
}
CBissectrice.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CDroite.prototype.depDe.call(this, p) ||
    this.b.depDe(p) || this.a.depDe(p) || this.c.depDe(p))
}
CBissectrice.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.b.dependDePourBoucle(p) || this.a.dependDePourBoucle(p) || this.c.dependDePourBoucle(p))
}
CBissectrice.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.a === ancienPoint) this.a = nouveauPoint
  if (this.b === ancienPoint) this.b = nouveauPoint
  if (this.c === ancienPoint) this.c = nouveauPoint
}
CBissectrice.prototype.read = function (inps, list) {
  CDroite.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  const ind3 = inps.readInt()
  this.b = list.get(ind1, 'CPt')
  this.a = list.get(ind2, 'CPt')
  this.c = list.get(ind3, 'CPt')
}
CBissectrice.prototype.write = function (oups, list) {
  CDroite.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.b)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.a)
  oups.writeInt(ind2)
  const ind3 = list.indexOf(this.c)
  oups.writeInt(ind3)
}
