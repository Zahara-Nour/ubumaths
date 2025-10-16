/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroite from './CDroite'
import CValeur from './CValeur'
export default CDroiteOm

/**
 * Droite définie par un point et son coefficient directeur dans un repère.
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
 * @param {CRepere} rep  Le repère dans lequel la droite est donnée.
 * @param {CPt} o  Un point de la droite
 * @param {CValeur} m  Le coefficient directeur de la droite.
 * @returns {CDroiteOm}
 */
function CDroiteOm (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, style, abscisseNom, rep, o, m) {
  if (arguments.length === 1) CDroite.call(this, listeProprietaire)
  else {
    CDroite.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      nomMasque, decX, decY, masque, nom, tailleNom, style, abscisseNom)
    this.rep = rep
    this.o = o
    this.m = m
  }
}
CDroiteOm.prototype = new CDroite()
CDroiteOm.prototype.constructor = CDroiteOm
CDroiteOm.prototype.superClass = 'CDroite'
CDroiteOm.prototype.className = 'CDroiteOm'

CDroiteOm.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.rep)
  const ind2 = listeSource.indexOf(this.o)
  const ind3 = listeSource.indexOf(this.impProto)
  const mClone = this.m.getClone(listeSource, listeCible)
  return new CDroiteOm(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY,
    this.masque, this.nom, this.tailleNom, this.style.getClone(), this.abscisseNom, listeCible.get(ind1, 'CRepere'),
    listeCible.get(ind2, 'CPt'), mClone)
}

CDroiteOm.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.o)
}

CDroiteOm.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CDroite.prototype.depDe.call(this, p) ||
    this.o.depDe(p) || this.rep.depDe(p) || this.m.depDe(p))
}

CDroiteOm.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.o.dependDePourBoucle(p) || this.rep.dependDePourBoucle(p) || this.m.dependDePourBoucle(p))
}

CDroiteOm.prototype.positionne = function (infoRandom, dimfen) {
  this.m.positionne(infoRandom, dimfen)
  this.existe = this.rep?.existe && this.o?.existe && this.m.existe
  if (this.existe) {
    this.point_x = this.o.x
    this.point_y = this.o.y
    const k = this.m.rendValeur(infoRandom)
    const unitex = this.rep.unitex
    const unitey = this.rep.unitey
    this.vect.x = this.rep.u.x / unitex + k * this.rep.v.x / unitey
    this.vect.y = this.rep.u.y / unitex + k * this.rep.v.y / unitey
    CDroite.prototype.positionne.call(this, infoRandom, dimfen)
  }
}
// Ajout version 6.3.0
CDroiteOm.prototype.positionneFull = function (infoRandom, dimfen) {
  this.m.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
CDroiteOm.prototype.confonduAvec = function (p) {
  if (p.className === this.className) return (this.rep === p.rep) && (this.o === p.o) && this.m.confonduAvec(p.m)
  else return false
}

CDroiteOm.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.o === ancienPoint) this.o = nouveauPoint
}

CDroiteOm.prototype.read = function (inps, list) {
  CDroite.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.rep = list.get(ind1, 'CRepere')
  this.o = list.get(ind2, 'CPt')
  this.m = new CValeur()
  this.m.read(inps, list)
}

CDroiteOm.prototype.write = function (oups, list) {
  CDroite.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.rep)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.o)
  oups.writeInt(ind2)
  this.m.write(oups, list)
}
