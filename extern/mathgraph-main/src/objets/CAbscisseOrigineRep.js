/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CValDyn from './CValDyn'
import CCalculAncetre from './CCalculAncetre'

export default CAbscisseOrigineRep

/**
 * Objet représentant l'abscisse à l'origine d'un repère
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  la liste propriétaire
 * @param {CImplementationProto} impProto  L'implémentation de construction propriétaire (peut être null)
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {string} nomCalcul  Le nom du calcul représentant cette abscisse à l'origine
 * @param {CRepere} rep  Pointe sur le repère associé
 * @returns {void}
 */
function CAbscisseOrigineRep (listeProprietaire, impProto, estElementFinal, nomCalcul, rep) {
  if (arguments.length === 0) return // Ajout version WebPack
  if (arguments.length === 1) CValDyn.call(this, listeProprietaire)
  else {
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
    this.rep = rep
    this.value = 0
  }
}
CAbscisseOrigineRep.prototype = new CCalculAncetre()
CAbscisseOrigineRep.prototype.constructor = CAbscisseOrigineRep
CAbscisseOrigineRep.prototype.superClass = 'CCalculAncetre'
CAbscisseOrigineRep.prototype.className = 'CAbscisseOrigineRep'

/**
 *
 * @param {CListeObjets} listeSource
 * @param {CListeObjets} listeCible
 * @returns {CAbscisseOrigineRep}
 */
CAbscisseOrigineRep.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.rep)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CAbscisseOrigineRep(
    listeCible,
    // ça râle pour pb de type car get dit retourner un Cob et CAbscisseOrigineRep veut du CImplementationProto,
    // ici on indique la classe que l'on veut qu'il retourne donc c'est bon,
    // c'est juste qu'on sait pas décrire ça en jsdoc (comme on le fait en ts)
    // => on le force ici
    /** @type {CImplementationProto} */
    listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal,
    this.nomCalcul,
    /** @type {CRepere} */
    listeCible.get(ind1, 'CRepere')
  )
}

CAbscisseOrigineRep.prototype.getNatureCalcul = function () {
  return NatCal.NValRep
}

CAbscisseOrigineRep.prototype.setClone = function (ptel) {
  this.value = ptel.value
}

CAbscisseOrigineRep.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.rep.o)
  liste.add(this.rep.i)
  liste.add(this.rep.j)
}

CAbscisseOrigineRep.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) || this.rep.depDe(p))
}

CAbscisseOrigineRep.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.rep.dependDePourBoucle(p)
}

CAbscisseOrigineRep.prototype.rendValeur = function () {
  return this.value
}
CAbscisseOrigineRep.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.rep.existe
  this.value = this.rep.valAbscisseOrigine
}
CAbscisseOrigineRep.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return this.rep === p.rep
  } else return false
}

CAbscisseOrigineRep.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  /** @type {CRepere} */
  this.rep = list.get(ind1, 'CRepere')
}
CAbscisseOrigineRep.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.rep)
  oups.writeInt(ind1)
}
