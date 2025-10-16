/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Complexe from '../types/Complexe'
import Vect from '../types/Vect'
import CPt from './CPt'
import CValeurComp from './CValeurComp'
export default CPointParAffixe

/**
 * Point défini par son affixe dans un repère.
 * @constructor
 * @extends CPt
 * @param {CListeObjets} listeProprietaire La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto null ou pointe sur la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal true si l'objet est un objet final de construction
 * @param {Color} couleur La couleur de l'objet
 * @param {boolean} nomMasque true si le nom de l'objet est masqué
 * @param {number} decX Decalage horizontal du nom
 * @param {number} decY Decalage vertical du nom
 * @param {boolean} masque true si l'objet est masque
 * @param {string} nom Le nom eventuel de l'objet
 * @param {number} tailleNom Indice de la taille du nom (voir Fonte)
 * @param {MotifPoint} motif Le motif du point
 * @param {boolean} marquePourTrace true si le point est marqué pour la trace
 * @param {CRepere} rep Le point dans lequel l'affixe est donnée
 * @param affixe L'affixe
 * @returns {void}
 */
function CPointParAffixe (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, rep, affixe) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.rep = rep
    this.affixe = affixe
  }
  this.z1 = new Complexe()
}
CPointParAffixe.prototype = new CPt()
CPointParAffixe.prototype.constructor = CPointParAffixe
CPointParAffixe.prototype.superClass = 'CPt'
CPointParAffixe.prototype.className = 'CPointParAffixe'

CPointParAffixe.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.rep)
  const ind2 = listeSource.indexOf(this.impProto)
  const affixeClone = this.affixe.getClone(listeSource, listeCible)
  return new CPointParAffixe(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, listeCible.get(ind1, 'CRepere'), affixeClone)
}

CPointParAffixe.prototype.initialisePourDependance = function () {
  CPt.prototype.initialisePourDependance.call(this)
  this.affixe.initialisePourDependance()
}

CPointParAffixe.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) || this.rep.depDe(p) || this.affixe.depDe(p))
}

CPointParAffixe.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.rep.dependDePourBoucle(p) || this.affixe.dependDePourBoucle(p))
}

CPointParAffixe.prototype.positionne = function (infoRandom, dimfen) {
  this.affixe.positionne(infoRandom, dimfen)
  this.existe = this.affixe.existe && this.rep.existe
  if (!this.existe) return
  this.affixe.rendValeurComplexe(this.z1)
  const vec = new Vect()
  const unitex = this.rep.unitex
  const unitey = this.rep.unitey
  vec.x = this.z1.x * this.rep.u.x / unitex + this.z1.y * this.rep.v.x / unitey
  vec.y = this.z1.x * this.rep.u.y / unitex + this.z1.y * this.rep.v.y / unitey
  this.x = this.rep.origine.x + vec.x
  this.y = this.rep.origine.y + vec.y
  CPt.prototype.positionne.call(this, infoRandom, dimfen)
}

// Ajout version 6.3.0
CPointParAffixe.prototype.positionneFull = function (infoRandom, dimfen) {
  this.affixe.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}

CPointParAffixe.prototype.getNature = function () {
  return NatObj.NPointParAffixe
}

CPointParAffixe.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.rep === p.rep) && this.affixe.confonduAvec(p.affixe)
  } else return false
}

CPointParAffixe.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.rep = list.get(ind1, 'CRepere')
  this.affixe = new CValeurComp()
  this.affixe.read(inps, list)
}

CPointParAffixe.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.rep)
  oups.writeInt(ind1)
  this.affixe.write(oups, list)
}
