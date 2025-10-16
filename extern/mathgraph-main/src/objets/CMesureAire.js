/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CValDyn from './CValDyn'
import CCalculAncetre from './CCalculAncetre'
export default CMesureAire

/**
 * Classe représentant la mesure de l'aire d'un polygone.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CPolygone} polygoneAssocie  Le polygone dont on mesure l'aire.
 * @param {string} nomCalcul  Le nom.
 * @returns {CMesureAire}
 */
function CMesureAire (listeProprietaire, impProto, estElementFinal, nomCalcul, polygoneAssocie) {
  if (arguments.length === 1) CValDyn.call(this, listeProprietaire)
  else {
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
    this.polygoneAssocie = polygoneAssocie
    this.aire = 0
  }
}
CMesureAire.prototype = new CCalculAncetre()
CMesureAire.prototype.constructor = CMesureAire
CMesureAire.prototype.superClass = 'CCalculAncetre'
CMesureAire.prototype.className = 'CMesureAire'

CMesureAire.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.polygoneAssocie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CMesureAire(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CPolygone'))
}
CMesureAire.prototype.setClone = function (ptel) {
  this.aire = ptel.aire
}
CMesureAire.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.polygoneAssocie)
}
CMesureAire.prototype.nomIndispensable = function (el) {
  for (let i = 0; i < this.polygoneAssocie.collectionPoints.length; i++) {
    const nd = this.polygoneAssocie.collectionPoints.get(i)
    if (nd.pointeurSurPoint === el) return true
  }
  return false
}
CMesureAire.prototype.getNatureCalcul = function () {
  return NatCal.NMesureAirePolygone
}
CMesureAire.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) || this.polygoneAssocie.depDe(p) ||
  this.listeProprietaire.pointeurLongueurUnite.depDe(p))
}
CMesureAire.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.polygoneAssocie.dependDePourBoucle(p) ||
  this.listeProprietaire.pointeurLongueurUnite.dependDePourBoucle(p)
}
CMesureAire.prototype.rendValeur = function () {
  return this.aire
}
CMesureAire.prototype.positionne = function (infoRandom, dimfen) {
  const pLongUnite = this.listeProprietaire.pointeurLongueurUnite
  this.existe = this.polygoneAssocie.existe && pLongUnite.existe
  if (!this.existe) return
  const longueurUnite = pLongUnite.rendLongueur()
  // Si la longueur unité est nulle, pLongUnite n'existe pas
  let aire = 0
  const array = this.polygoneAssocie.colPoints
  for (let i = 0; i < array.length - 1; i++) {
    const ptp1 = array[i].pointeurSurPoint
    const ptp2 = array[i + 1].pointeurSurPoint
    aire += (ptp1.x * ptp2.y - ptp1.y * ptp2.x) / 2
  }
  this.aire = Math.abs(aire) / (longueurUnite * longueurUnite)
}
CMesureAire.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return this.polygoneAssocie === p.polygoneAssocie
  } else return false
}
CMesureAire.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.polygoneAssocie = list.get(ind1, 'CPolygone')
}
CMesureAire.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.polygoneAssocie)
  oups.writeInt(ind1)
}
