/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPt from './CPt'
import { projetteOrtho } from 'src/kernel/kernelVect'

export default CPointProjete

/**
 * Point projeté orthogonal d'un point a sur une droite d (ou segment ou demi-droite)
 * @constructor
 * @extends CPt
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
 * @param {CPt} a  le poit  qu'on projette
 * @param {CDroiteAncetre} d  La droite sur laquelle on projette
 * @returns {CPointProjete}
 */
function CPointProjete (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, a, d) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.a = a
    this.d = d
  }
}
CPointProjete.prototype = new CPt()
CPointProjete.prototype.constructor = CPointProjete
CPointProjete.prototype.superClass = 'CPt'
CPointProjete.prototype.className = 'CPointProjete'

CPointProjete.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.a)
  const ind2 = listeSource.indexOf(this.d)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CPointProjete(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom, this.tailleNom,
    this.motif, this.marquePourTrace, listeCible.get(ind1, 'CPt'), listeCible.get(ind2, 'CDroiteAncetre'))
}

CPointProjete.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.a)
  liste.add(this.d)
}

CPointProjete.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) || this.a.depDe(p) || this.d.depDe(p))
}

CPointProjete.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.a.dependDePourBoucle(p) || this.d.dependDePourBoucle(p))
}

CPointProjete.prototype.positionne = function (infoRandom, dimfen) {
  let point
  this.existe = this.a.existe && this.d.existe
  if (this.existe) {
    point = { x: 0, y: 0 }
    projetteOrtho(this.a.x, this.a.y, this.d.point_x, this.d.point_y, this.d.vect, point)
    const xp = point.x
    const yp = point.y
    this.existe = this.existe && this.d.appartientA(xp, yp)
    if (this.existe) {
      CPt.prototype.placeEn.call(this, xp, yp)
      CPt.prototype.positionne.call(this, infoRandom, dimfen) // Ajouté version 4.6.4
    }
  }
}

CPointProjete.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.a === p.a) && (this.d === p.d)
  } else return false
}

CPointProjete.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.a === ancienPoint) this.a = nouveauPoint
}

CPointProjete.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.a = list.get(ind1, 'CPt')
  this.d = list.get(ind2, 'CDroiteAncetre')
}

CPointProjete.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.a)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.d)
  oups.writeInt(ind2)
}
