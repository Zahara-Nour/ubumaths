/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatArc from '../types/NatArc'
import Pointeur from '../types/Pointeur'
import Vect from '../types/Vect'
import CArcDeCercleAncetre from './CArcDeCercleAncetre'
import CArcDeCercleDirect from './CArcDeCercleDirect'
import CArcDeCercleIndirect from './CArcDeCercleIndirect'
import CArcDeCercle from './CArcDeCercle'
import CGrandArcDeCercle from './CGrandArcDeCercle'
import CPointBase from './CPointBase'
import { zeroAngle } from 'src/kernel/kernel'
export default CArcDeCercleImage

/**
 * Classe représentant un arc de cercle image d'un autre arc par une transformation.
 * @constructor
 * @extends CArcDeCercleAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  le style de tracé.
 * @param {CArcDeCercleAncetre} antecedent  l'arc dont this est l'image.
 * @param {CTransformation} transformation  La transformation utilisée.
 * @returns {CArcDeCercleImage}
 */
function CArcDeCercleImage (listeProprietaire, impProto, estElementFinal, couleur, masque, style, antecedent, transformation) {
  if (arguments.length === 1) CArcDeCercleAncetre.call(this, listeProprietaire)
  else {
    CArcDeCercleAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, style)
    this.antecedent = antecedent
    this.transformation = transformation
    this.ptCentre = new CPointBase()
    this.ptOrigine = new CPointBase()
    this.ptExtremite = new CPointBase()
    this.creeArcInterne()
  }
}
CArcDeCercleImage.prototype = new CArcDeCercleAncetre()
CArcDeCercleImage.prototype.constructor = CArcDeCercleImage
CArcDeCercleImage.prototype.superClass = 'CArcDeCercleAncetre'
CArcDeCercleImage.prototype.className = 'CArcDeCercleImage'

CArcDeCercleImage.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.antecedent)
  const ind2 = listeSource.indexOf(this.transformation)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CArcDeCercleImage(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CArcDeCercleAncetre'),
    listeCible.get(ind2, 'CTransformation'))
}
CArcDeCercleImage.prototype.creeArcInterne = function () {
  if (this.transformation.className === 'CSymetrieAxiale') {
    switch (this.antecedent.natureArc()) {
      case NatArc.PetitArc:
        this.arc = new CArcDeCercle(this.listeProprietaire, null, false,
          this.couleur, this.masque, this.style, this.ptCentre, this.ptOrigine, this.ptExtremite, null)
        break
      case NatArc.GrandArc:
        this.arc = new CGrandArcDeCercle(this.listeProprietaire, null, false,
          this.couleur, this.masque, this.style, this.ptCentre, this.ptOrigine, this.ptExtremite, null)
        break
      case NatArc.ArcDirect:
        this.arc = new CArcDeCercleIndirect(this.listeProprietaire, null, false, this.couleur,
          this.masque, this.style, this.ptCentre, this.ptOrigine, this.ptExtremite, null)
        break
      case NatArc.ArcIndirect:
        this.arc = new CArcDeCercleDirect(this.listeProprietaire, null, false,
          this.couleur, this.masque, this.style, this.ptCentre, this.ptOrigine, this.ptExtremite, null)
    }
  } else {
    // Conservation des angles orientés
    switch (this.antecedent.natureArc()) {
      case NatArc.PetitArc:
        this.arc = new CArcDeCercle(this.listeProprietaire, null, false, this.couleur,
          this.masque, this.style, this.ptCentre, this.ptOrigine, this.ptExtremite, null)
        break
      case NatArc.GrandArc:
        this.arc = new CGrandArcDeCercle(this.listeProprietaire, null, false, this.couleur,
          this.masque, this.style, this.ptCentre, this.ptOrigine, this.ptExtremite, null)
        break
      case NatArc.ArcDirect:
        this.arc = new CArcDeCercleDirect(this.listeProprietaire, null, false, this.couleur,
          this.masque, this.style, this.ptCentre, this.ptOrigine, this.ptExtremite, null)
        break
      case NatArc.ArcIndirect:
        this.arc = new CArcDeCercleIndirect(this.listeProprietaire, null, false, this.couleur,
          this.masque, this.style, this.ptCentre, this.ptOrigine, this.ptExtremite, null)
    }
  }
}
CArcDeCercleImage.prototype.path = function () {
  return this.arc.path()
}
CArcDeCercleImage.prototype.setClone = function (ptel) {
  CArcDeCercleAncetre.prototype.setClone.call(this, ptel)
  this.arc.setClone(ptel.arc)
}
CArcDeCercleImage.prototype.donneCouleur = function (coul) {
  CArcDeCercleAncetre.prototype.donneCouleur.call(this, coul)
  this.arc.donneCouleur(coul)
}
CArcDeCercleImage.prototype.donneStyle = function (nouveauStyle) {
  CArcDeCercleAncetre.prototype.donneStyle.call(this, nouveauStyle)
  this.arc.donneStyle(nouveauStyle)
}
CArcDeCercleImage.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CArcDeCercleAncetre.prototype.depDe.call(this, p) ||
    this.antecedent.depDe(p) || this.transformation.depDe(p))
}
CArcDeCercleImage.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.antecedent.dependDePourBoucle(p) || this.transformation.dependDePourBoucle(p)
}
CArcDeCercleImage.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.transformation.existe && this.antecedent.existe
  if (!this.existe) return
  const pointim = {}
  this.transformation.transformePoint(this.antecedent.centreX, this.antecedent.centreY, pointim)
  const x = pointim.x
  const y = pointim.y
  this.ptCentre.placeEn(x, y)
  this.transformation.transformePoint(this.antecedent.origine_x, this.antecedent.origine_y, pointim)
  this.ptOrigine.placeEn(pointim.x, pointim.y)
  const pointeur = new Pointeur(0)
  this.transformation.transformeAngle(this.antecedent.valeurAngleAuCentre, pointeur)
  let ang = pointeur.getValue()
  // Correction version 7.2.2 pour l'image d'un petit arc de cercle qui est plat et donc tracé dans le sens direct
  // Ou un grand arc de cercle qui est plat et donc tracé dans le sens indirect
  const natArc = this.arc.natureArc()
  if ((this.transformation.className === 'CSymetrieAxiale') && ((natArc === NatArc.PetitArc) || (natArc === NatArc.GrandArc)) &&
    zeroAngle(ang + Math.PI)) {
    ang = ang + 0.5e-6
  }
  const u = new Vect(this.ptCentre, this.ptOrigine)
  const v = new Vect()
  u.tourne(ang, v)
  this.ptExtremite.placeEn(x + v.x, y + v.y)
  this.arc.positionne(infoRandom, dimfen)
  // L'arc doit refléter les membres de l'arc interne qu'il maintient
  this.centreX = this.arc.centreX
  this.centreY = this.arc.centreY
  this.origine_x = this.arc.origine_x
  this.origine_y = this.arc.origine_y
  this.rayon = this.arc.rayon
  this.valeurAngleAuCentre = ang
  // this.arc.valeurAngleAuCentre = ang;
}
CArcDeCercleImage.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.antecedent === p.antecedent) && (this.transformation.confonduAvec(p.transformation))
  } else return false
}
CArcDeCercleImage.prototype.abscisseMaximale = function () {
  return this.arc.abscisseMaximale()
}
CArcDeCercleImage.prototype.abscisseMinimale = function () {
  return this.arc.abscisseMinimale()
}
CArcDeCercleImage.prototype.abscisseCurviligne = function (ang) {
  return this.arc.abscisseCurviligne(ang)
}
CArcDeCercleImage.prototype.surArc = function (xt, yt) {
  return this.arc.surArc(xt, yt)
}
CArcDeCercleImage.prototype.natureArc = function () {
  return this.arc.natureArc()
}
CArcDeCercleImage.prototype.cache = function () {
  CArcDeCercleAncetre.prototype.cache.call(this)
  this.arc.cache()
}
CArcDeCercleImage.prototype.montre = function () {
  CArcDeCercleAncetre.prototype.montre.call(this)
  this.arc.montre()
}
CArcDeCercleImage.prototype.createg = function () {
  return this.arc.createg()
}
CArcDeCercleImage.prototype.hasg = function (masquage, memeMasque = false) {
  return this.existe && (memeMasque || !(this.masque && masquage)) && !this.arc.horsFenetre
}
CArcDeCercleImage.prototype.horsCadre = function () {
  return this.arc.horsFenetre
}
CArcDeCercleImage.prototype.trace = function (svg) {
  const g = this.arc.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CArcDeCercleImage.prototype.update = function () {
  const g = this.g
  g.removeAttribute('d')
  g.setAttribute('d', this.arc.path())
}
CArcDeCercleImage.prototype.ajouteAntecedents = function (liste, app) {
  liste.add(this.antecedent)
  this.transformation.ajouteAntecedents(liste, app)
}
CArcDeCercleImage.prototype.read = function (inps, list) {
  CArcDeCercleAncetre.prototype.read.call(this, inps, list)
  this.ptCentre = new CPointBase()
  this.ptOrigine = new CPointBase()
  this.ptExtremite = new CPointBase()
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.transformation = list.get(ind1, 'CTransformation')
  this.antecedent = list.get(ind2, 'CArcDeCercleAncetre')
  this.creeArcInterne()
}
CArcDeCercleImage.prototype.write = function (oups, list) {
  CArcDeCercleAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.transformation)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.antecedent)
  oups.writeInt(ind2)
}
