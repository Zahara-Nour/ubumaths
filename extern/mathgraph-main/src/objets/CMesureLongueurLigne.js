/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Vect from '../types/Vect'
import CCalculAncetre from './CCalculAncetre'
export default CMesureLongueurLigne

/**
 * Classe représentant une mesure de longueur d'une ligne : ligne brisée ou polygone.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom du calcul.
 * @param {CLignePolygonaleAncetre} ligneAssociee  La ligne brisée ou le polygone dont on mesure la longueur.
 */
function CMesureLongueurLigne (listeProprietaire, impProto, estElementFinal, nomCalcul, ligneAssociee) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
    this.ligneAssociee = ligneAssociee
  }
  this.u = new Vect()
  this.longueur = 0
}
CMesureLongueurLigne.prototype = new CCalculAncetre()
CMesureLongueurLigne.prototype.constructor = CMesureLongueurLigne
CMesureLongueurLigne.prototype.superClass = 'CCalculAncetre'
CMesureLongueurLigne.prototype.className = 'CMesureLongueurLigne'

CMesureLongueurLigne.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.ligneAssociee)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CMesureLongueurLigne(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CLignePolygonaleAncetre'))
}
CMesureLongueurLigne.prototype.nomIndispensable = function (el) {
  for (let i = 0; i < this.ligneAssociee.colPoints.length; i++) {
    const nd = this.ligneAssociee.colPoints[i] // Corrigé suite rapport bugsnag (exercices de construction)
    if (nd.pointeurSurPoint === el) return true
  }
  return false
}
CMesureLongueurLigne.prototype.getNatureCalcul = function () {
  return NatCal.NMesureLongueurLigne
}
CMesureLongueurLigne.prototype.setClone = function (ptel) {
  this.longueur = ptel.longueur
}
CMesureLongueurLigne.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.ligneAssociee)
}
CMesureLongueurLigne.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) || this.ligneAssociee.depDe(p) ||
  this.listeProprietaire.pointeurLongueurUnite.depDe(p))
}
CMesureLongueurLigne.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.ligneAssociee.dependDePourBoucle(p) || this.listeProprietaire.pointeurLongueurUnite.dependDePourBoucle(p)
}
CMesureLongueurLigne.prototype.rendValeur = function () {
  return this.longueur
}
CMesureLongueurLigne.prototype.positionne = function (infoRandom, dimfen) {
  const pLongUnite = this.listeProprietaire.pointeurLongueurUnite
  this.existe = this.ligneAssociee?.existe && pLongUnite.existe
  if (!this.existe) return
  const longueurUnite = pLongUnite.rendLongueur()
  // Si la longueur unité est nulle, pLongUnite n'existe pas
  this.longueur = 0
  const array = this.ligneAssociee.colPoints
  for (let i = 0; i < array.length - 1; i++) {
    const ptp1 = array[i].pointeurSurPoint
    const ptp2 = array[i + 1].pointeurSurPoint
    this.u.x = ptp2.x - ptp1.x
    this.u.y = ptp2.y - ptp1.y
    this.longueur += this.u.norme()
  }
  this.longueur /= longueurUnite
}
CMesureLongueurLigne.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return this.ligneAssociee === p.ligneAssociee
  } else return false
}
CMesureLongueurLigne.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.ligneAssociee = list.get(ind1, 'CLignePolygonaleAncetre')
}
CMesureLongueurLigne.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.ligneAssociee)
  oups.writeInt(ind1)
}
