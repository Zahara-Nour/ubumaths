/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CValDyn from './CValDyn'
import CCalculAncetre from './CCalculAncetre'
export default CMesureCoefDir

/**
 * Classe représentant une mesure de coefficient directeur de droite dans un repère.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nom  Le nom du calcul.
 * @param {CRepere} rep  Le repère dans lequel se fait la mesure.
 * @param {CDroite} d  La droite dont on mesure le coefficient directeur.
 * @returns {CMesureCoefDir}
 */
function CMesureCoefDir (listeProprietaire, impProto, estElementFinal, nom, rep, d) {
  if (arguments.length === 1) CValDyn.call(this, listeProprietaire)
  else {
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nom)
    this.rep = rep
    this.d = d
    this.coef = 0
  }
}
CMesureCoefDir.prototype = new CCalculAncetre()
CMesureCoefDir.prototype.constructor = CMesureCoefDir
CMesureCoefDir.prototype.superClass = 'CCalculAncetre'
CMesureCoefDir.prototype.className = 'CMesureCoefDir'

CMesureCoefDir.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.d)
  const ind2 = listeSource.indexOf(this.rep)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CMesureCoefDir(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind2, 'CRepere'), listeCible.get(ind1, 'CDroite'))
}
CMesureCoefDir.prototype.getNatureCalcul = function () {
  return NatCal.NMesureCoefDir
}
CMesureCoefDir.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.d)
}
CMesureCoefDir.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) ||
    this.rep.depDe(p) || this.d.depDe(p))
}
CMesureCoefDir.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.rep.dependDePourBoucle(p) || this.d.dependDePourBoucle(p)
}
CMesureCoefDir.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.rep.existe && this.d.existe
  if (!this.existe) return
  // On calcule les coordonnées du Vect directeur de la droite dans le repère à un coeff près
  const a = this.d.vect.x // Première coordonnée du Vect directeur de la droite
  const b = this.d.vect.y // Deuxième coordonnée
  const x = this.rep.v.y * a - this.rep.v.x * b
  const y = this.rep.u.x * b - this.rep.u.y * a
  if (x === 0) {
    this.existe = false
    return
  }
  this.coef = y / x / this.rep.unitex * this.rep.unitey
}
CMesureCoefDir.prototype.rendValeur = function (infoRandom) {
  return this.coef
}
CMesureCoefDir.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.rep === p.rep) && (this.d === p.d)
  } else return false
}
CMesureCoefDir.prototype.nomIndispensable = function (el) {
  return (el === this.d)
}
CMesureCoefDir.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.rep = list.get(ind1, 'CRepere')
  this.d = list.get(ind2, 'CDroite')
}
CMesureCoefDir.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.rep)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.d)
  oups.writeInt(ind2)
}
