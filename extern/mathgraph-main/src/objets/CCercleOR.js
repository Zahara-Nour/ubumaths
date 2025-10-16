/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CElementLigne from './CElementLigne'
import CCercle from './CCercle'
import CValeur from './CValeur'
export default CCercleOR

/**
 * Cercle défini par son centre et un calcul donnant son rayon.
 * @constructor
 * @extends CCercle
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la consruction proprietaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur
 * @param {boolean} masque  true si l'objet est masqué
 * @param {StyleTrait} style  le style de tracé.
 * @param {CPt} o  Le centre du cercle.
 * @param {CValeur} r  Calcul donnant le rayon.
 * @param {boolean} [inPixels=false]  Si true le rayon est en pixels et n'utilise pas la longueur unité de la figure.
 * @returns {CCercleOR}
 */
function CCercleOR (listeProprietaire, impProto, estElementFinal, couleur,
  masque, style, o, r, inPixels) {
  if (arguments.length === 1) CElementLigne.call(this, listeProprietaire)
  else {
    CCercle.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, style)
    this.o = o
    this.r = r
    this.inPixels = inPixels
  }
  this.coefMult = 1
}
CCercleOR.prototype = new CCercle()
CCercleOR.prototype.constructor = CCercleOR
CCercleOR.prototype.superClass = 'CCercle'
CCercleOR.prototype.className = 'CCercleOR'

CCercleOR.prototype.numeroVersion = function () {
  return 2
}
CCercleOR.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.o)
  const ind2 = listeSource.indexOf(this.impProto)
  const rClone = this.r.getClone(listeSource, listeCible)
  return new CCercleOR(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CPt'), rClone, this.inPixels)
}
CCercleOR.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.o)
}
CCercleOR.prototype.initialisePourDependance = function () {
  CCercle.prototype.initialisePourDependance.call(this)
  this.r.initialisePourDependance()
}
CCercleOR.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  // Modification version 6.4.9
  /*
  return this.memDep(CCercle.prototype.depDe.call(this, p) ||
    this.o.depDe(p) || this.r.depDe(p) || this.listeProprietaire.pointeurLongueurUnite.depDe(p))
  */
  const ret = CCercle.prototype.depDe.call(this, p) || this.o.depDe(p) || this.r.depDe(p)
  if (this.inPixels) return this.memDep(ret)
  else return this.memDep(ret || this.listeProprietaire.pointeurLongueurUnite.depDe(p))
}
CCercleOR.prototype.dependDePourBoucle = function (p) {
  // Modification version 6.4.9
  /*
  return ((p === this) || this.o.dependDePourBoucle(p) || this.r.dependDePourBoucle(p)) ||
    this.listeProprietaire.pointeurLongueurUnite.dependDePourBoucle(p)
  */
  const ret = (p === this) || this.o.dependDePourBoucle(p) || this.r.dependDePourBoucle(p)
  if (this.inPixels) return ret
  else return ret || this.listeProprietaire.pointeurLongueurUnite.dependDePourBoucle(p)
}
CCercleOR.prototype.positionne = function (infoRandom, dimfen) {
  this.r.positionne(infoRandom, dimfen)
  const plongUnite = this.listeProprietaire.pointeurLongueurUnite
  // Modification version 4.6.3
  this.existe = this.o.existe && this.r.existe
  if (!this.inPixels) this.existe = this.existe && plongUnite.existe
  if (this.existe) {
    this.centreX = this.o.x
    this.centreY = this.o.y
    if (this.inPixels) this.rayon = this.r.rendValeur() * this.coefMult
    else this.rayon = this.r.rendValeur() * this.listeProprietaire.pointeurLongueurUnite.rendLongueur()
    CCercle.prototype.positionne.call(this, infoRandom, dimfen)
  }
}
// Ajout version 6.3.0
CCercleOR.prototype.positionneFull = function (infoRandom, dimfen) {
  this.r.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
CCercleOR.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.o === p.o) && this.r.confonduAvec(p.r)
  } else return false
}
CCercleOR.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.o === ancienPoint) this.o = nouveauPoint
}
CCercleOR.prototype.read = function (inps, list) {
  CCercle.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.o = list.get(ind1, 'CPt')
  this.r = new CValeur()
  this.r.read(inps, list)
  if (this.nVersion >= 2) this.inPixels = inps.readBoolean()
  else this.inPixels = false
}
CCercleOR.prototype.write = function (oups, list) {
  CCercle.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.o)
  oups.writeInt(ind1)
  this.r.write(oups, list)
  oups.writeBoolean(this.inPixels)
}
