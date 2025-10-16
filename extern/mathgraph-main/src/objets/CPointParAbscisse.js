/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Vect from '../types/Vect'
import CPt from './CPt'
import CValeur from './CValeur'
export default CPointParAbscisse

/**
 * Point défini par son abscisse relative à deux points distincts
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
 * @param {CPt} origine  Le point origine
 * @param {CPt} extremite  Le point d'abscisse 1
 * @param {CValeur} abscisse  L'abscisse du point
 * @returns {void}
 */
function CPointParAbscisse (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, origine, extremite, abscisse) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.origine = origine
    this.extremite = extremite
    this.abscisse = abscisse
  }
}
CPointParAbscisse.prototype = new CPt()
CPointParAbscisse.prototype.constructor = CPointParAbscisse
CPointParAbscisse.prototype.superClass = 'CPt'
CPointParAbscisse.prototype.className = 'CPointParAbscisse'

CPointParAbscisse.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.origine)
  const ind2 = listeSource.indexOf(this.extremite)
  const ind3 = listeSource.indexOf(this.impProto)
  const abscisseClone = this.abscisse.getClone(listeSource, listeCible)
  return new CPointParAbscisse(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, listeCible.get(ind1, 'CPt'), listeCible.get(ind2, 'CPt'),
    abscisseClone)
}

CPointParAbscisse.prototype.nomIndispensable = function (el) {
  return ((el === this.origine) || (el === this.extremite))
}

CPointParAbscisse.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.origine)
  liste.add(this.extremite)
}

CPointParAbscisse.prototype.initialisePourDependance = function () {
  CPt.prototype.initialisePourDependance.call(this)
  this.abscisse.initialisePourDependance()
}

CPointParAbscisse.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) ||
    this.origine.depDe(p) || this.extremite.depDe(p) || this.abscisse.depDe(p))
}

CPointParAbscisse.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.origine.dependDePourBoucle(p) || this.extremite.dependDePourBoucle(p) ||
  this.abscisse.dependDePourBoucle(p))
}

CPointParAbscisse.prototype.positionne = function (infoRandom, dimfen) {
  this.abscisse.positionne(infoRandom, dimfen)
  this.existe = this.abscisse.existe && this.origine.existe && this.extremite.existe
  if (!this.existe) return
  const u = new Vect(this.origine, this.extremite)
  const k1 = this.abscisse.rendValeur()
  const vec = new Vect()
  vec.x = k1 * u.x
  vec.y = k1 * u.y
  this.x = this.origine.x + vec.x
  this.y = this.origine.y + vec.y
  CPt.prototype.positionne.call(this, infoRandom, dimfen)
}

// Ajout version 6.3.0
CPointParAbscisse.prototype.positionneFull = function (infoRandom, dimfen) {
  this.abscisse.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}

CPointParAbscisse.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.origine === p.origine) && (this.extremite === p.extremite) && this.abscisse.confonduAvec(p.abscisse)
  } else return false
}

CPointParAbscisse.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.origine === ancienPoint) this.origine = nouveauPoint
  if (this.extremite === ancienPoint) this.extremite = nouveauPoint
}

CPointParAbscisse.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.origine = list.get(ind1, 'CPt')
  const ind2 = inps.readInt()
  this.extremite = list.get(ind2, 'CPt')
  this.abscisse = new CValeur(list)
  this.abscisse.read(inps, list)
}

CPointParAbscisse.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.origine)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.extremite)
  oups.writeInt(ind2)
  this.abscisse.write(oups, list)
}
