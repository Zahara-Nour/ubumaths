/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Color from '../types/Color'
import CPt from './CPt'
import CValeur from './CValeur'
export default CPointDansRepere

/**
 * Classe représentant un point défini par ses coordonnées dans un repère.
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
 * @param {CRepere} rep  Le repère associé
 * @param {CValeur} abs  L'abscisse
 * @param {CValeur} ord  L'ordonnée
 * @returns {void}
 */
function CPointDansRepere (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, rep, abs, ord) {
  if (arguments.length === 1) {
    CPt.call(this, listeProprietaire)
    this.abs = new CValeur()
    this.ord = new CValeur()
  } else {
    if (arguments.length === 2) { // Spécial objets internes
      CPt.call(this, arguments[0], null, false, Color.black, true, 0, 0, false, '', 2, 0, false)
      this.rep = arguments[1]
      this.abs = new CValeur()
      this.ord = new CValeur()
    } else {
      CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
        decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
      this.rep = rep
      this.abs = abs
      this.ord = ord
    }
  }
}
CPointDansRepere.prototype = new CPt()
CPointDansRepere.prototype.constructor = CPointDansRepere
CPointDansRepere.prototype.superClass = 'CPt'
CPointDansRepere.prototype.className = 'CPointDansRepere'

CPointDansRepere.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.rep)
  const ind2 = listeSource.indexOf(this.impProto)
  const absClone = this.abs.getClone(listeSource, listeCible)
  const ordClone = this.ord.getClone(listeSource, listeCible)
  return new CPointDansRepere(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, listeCible.get(ind1, 'CRepere'), absClone, ordClone)
}

CPointDansRepere.prototype.initialisePourDependance = function () {
  CPt.prototype.initialisePourDependance.call(this)
  this.abs.initialisePourDependance()
  this.ord.initialisePourDependance()
}

CPointDansRepere.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) ||
    this.rep.depDe(p) || this.abs.depDe(p) || this.ord.depDe(p))
}

CPointDansRepere.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.rep.dependDePourBoucle(p) || this.abs.dependDePourBoucle(p) || this.ord.dependDePourBoucle(p)
}

CPointDansRepere.prototype.positionne = function (infoRandom, dimfen) {
  this.abs.positionne(infoRandom, dimfen)
  this.ord.positionne(infoRandom, dimfen)
  this.existe = this.abs.existe && this.ord.existe && this.rep.existe
  if (!this.existe) return
  const k1 = this.abs.rendValeur()
  const k2 = this.ord.rendValeur()
  const coordAbs = this.rep.getAbsCoord(k1, k2)
  this.x = coordAbs[0]
  this.y = coordAbs[1]
  CPt.prototype.positionne.call(this, infoRandom, dimfen)
}

// Ajout version 6.3.0
CPointDansRepere.prototype.positionneFull = function (infoRandom, dimfen) {
  this.abs.dejaPositionne = false
  this.ord.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}

CPointDansRepere.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.rep === p.rep) && this.abs.confonduAvec(p.abs) && this.ord.confonduAvec(p.ord)
  } else return false
}

CPointDansRepere.prototype.getNature = function () {
  return NatObj.NPointDansRepere
}

CPointDansRepere.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.rep.o)
  liste.add(this.rep.i)
  liste.add(this.rep.j)
}

CPointDansRepere.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.rep = list.get(ind1, 'CRepere')
  this.abs.read(inps, list)
  this.ord.read(inps, list)
}

CPointDansRepere.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.rep)
  oups.writeInt(ind1)
  this.abs.write(oups, list)
  this.ord.write(oups, list)
}
