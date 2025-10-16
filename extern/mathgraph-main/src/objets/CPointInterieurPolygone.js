/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Pointeur from '../types/Pointeur'
import { zero } from '../kernel/kernel'
import CPointAncetrePointsMobiles from './CPointAncetrePointsMobiles'
export default CPointInterieurPolygone

/**
 * Point intérieur à un polygone
 * @constructor
 * @extends CPointAncetrePointsMobiles
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
 * @param {boolean} fixed  true si le point est punaisé
 * @param {CPolygone} polygoneAssocie  Le polygone auquel le point est lié
 * @param {boolean} estSurCote  true si le point est sur un côté
 * @param {number} indicePremierSommet  L'indice du premier segment sur lequel est le point ou alors l'indice
 * du premier des trois sommets du type BCD tels que le point soit intérieur à BCD et CDE
 * @param {number} alpha  Le coefficient barycentrique normalisé du premier point
 * @param {number} beta  Le coefficient barycentrique normalisé du second point
 * @param {number} gamma  Le coefficient barycentrique normalisé du troisième point
 * @returns {void}
 */
function CPointInterieurPolygone (listeProprietaire, impProto, estElementFinal,
  couleur, nomMasque, decX, decY, masque, nom, tailleNom,
  motif, marquePourTrace, fixed, polygoneAssocie, estSurCote,
  indicePremierSommet, alpha, beta, gamma) {
  if (arguments.length === 1) CPointAncetrePointsMobiles.call(this, listeProprietaire)
  else {
    CPointAncetrePointsMobiles.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace, fixed)
    this.polygoneAssocie = polygoneAssocie
    this.estSurCote = estSurCote
    this.indicePremierSommet = indicePremierSommet
    this.alpha = alpha
    this.beta = beta
    this.gamma = gamma
  }
}
CPointInterieurPolygone.prototype = new CPointAncetrePointsMobiles()
CPointInterieurPolygone.prototype.constructor = CPointInterieurPolygone
CPointInterieurPolygone.prototype.superClass = 'CPointAncetrePointsMobiles'
CPointInterieurPolygone.prototype.className = 'CPointInterieurPolygone'

CPointInterieurPolygone.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.polygoneAssocie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CPointInterieurPolygone(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, this.fixed, listeCible.get(ind1, 'CPolygone'),
    this.estSurCote, this.indicePremierSommet, this.alpha, this.beta, this.gamma)
}

CPointInterieurPolygone.prototype.getNature = function () {
  return NatObj.NPointInterieurPolygone
}

CPointInterieurPolygone.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.polygoneAssocie)
}

CPointInterieurPolygone.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPointAncetrePointsMobiles.prototype.depDe.call(this, p) || this.polygoneAssocie.depDe(p))
}

CPointInterieurPolygone.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.polygoneAssocie.dependDePourBoucle(p)
}
CPointInterieurPolygone.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.polygoneAssocie?.existe
  if (!this.existe) return
  let xn, yn
  let n = this.polygoneAssocie.colPoints[0]
  const a = n.pointeurSurPoint
  n = this.polygoneAssocie.colPoints[this.indicePremierSommet]
  const b = n.pointeurSurPoint
  n = this.polygoneAssocie.colPoints[this.indicePremierSommet + 1]
  const c = n.pointeurSurPoint
  if (this.estSurCote) {
    xn = b.x * this.alpha + c.x * this.beta
    yn = b.y * this.alpha + c.y * this.beta
    CPointAncetrePointsMobiles.prototype.placeEn.call(this, xn, yn)
  } else {
    xn = a.x * this.alpha + b.x * this.beta + c.x * this.gamma
    yn = a.y * this.alpha + b.y * this.beta + c.y * this.gamma
    if (!this.polygoneAssocie.pointInterieur(xn, yn)) {
      const d = this.beta + this.gamma
      xn = (b.x * this.beta + c.x * this.gamma) / d
      yn = (b.y * this.beta + c.y * this.gamma) / d
    }
    CPointAncetrePointsMobiles.prototype.placeEn.call(this, xn, yn)
  }
  CPointAncetrePointsMobiles.prototype.positionne.call(this, infoRandom, dimfen) // Ajouté version 4.6.4
}

CPointInterieurPolygone.prototype.placeEn = function (xn, yn) {
  const estSurCote1 = new Pointeur(false)
  const indicePremierSommet1 = new Pointeur(0)
  const alpha1 = new Pointeur(0)
  const beta1 = new Pointeur(0)
  const gamma1 = new Pointeur(0)
  this.polygoneAssocie.determinePositionInterieure(xn, yn, indicePremierSommet1, estSurCote1, alpha1, beta1, gamma1)
  this.estSurCote = estSurCote1.getValue()
  this.indicePremierSommet = indicePremierSommet1.getValue()
  this.alpha = alpha1.getValue()
  this.beta = beta1.getValue()
  this.gamma = gamma1.getValue()
  CPointAncetrePointsMobiles.prototype.placeEn.call(this, xn, yn)
}

CPointInterieurPolygone.prototype.testDeplacement = function (dimfen, xtest, ytest, pointr, abscr) {
  // On regarde si le point testé est bien intérieur au polygone
  if (this.polygoneAssocie.pointInterieur(xtest, ytest)) {
    pointr.x = xtest
    pointr.y = ytest
    return true
  } else return false
}

CPointInterieurPolygone.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    if (zero(p.x - this.x) && zero(p.y - this.y)) return (this.polygoneAssocie === p.polygoneAssocie)
    else return false
  } else return false
}

CPointInterieurPolygone.prototype.read = function (inps, list) {
  CPointAncetrePointsMobiles.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.polygoneAssocie = list.get(ind1, 'CDroiteAncetre')
  this.estSurCote = inps.readBoolean()
  this.indicePremierSommet = inps.readInt()
  this.alpha = inps.readDouble()
  this.beta = inps.readDouble()
  this.gamma = inps.readDouble()
}

CPointInterieurPolygone.prototype.write = function (oups, list) {
  CPointAncetrePointsMobiles.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.polygoneAssocie)
  oups.writeInt(ind1)
  oups.writeBoolean(this.estSurCote)
  oups.writeInt(this.indicePremierSommet)
  oups.writeDouble(this.alpha)
  oups.writeDouble(this.beta)
  oups.writeDouble(this.gamma)
}
