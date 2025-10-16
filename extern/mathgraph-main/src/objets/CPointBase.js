/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CPointAncetrePointsMobiles from './CPointAncetrePointsMobiles'
import { zero } from '../kernel/kernel'
import CPt from './CPt'
export default CPointBase

/**
 * Classe représentant un point libre sur la figure pouvant être déplacé n'importe où.
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
 * @param {number} x  abscisse du point dans le svg
 * @param {number} y  ordonnee du point sans le svg
 * @returns {void}
 */
function CPointBase (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, fixed, x, y) {
  // Ajout version 4.9.9.4
  if (arguments.length === 0) {
    CPointAncetrePointsMobiles.call(this, null)
  } else {
    //
    if (arguments.length === 1) CPointAncetrePointsMobiles.call(this, listeProprietaire)
    else {
      CPointAncetrePointsMobiles.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
        decX, decY, masque, nom, tailleNom, motif, marquePourTrace, fixed)
      this.x = x
      this.y = y
    }
  }
  // Ligne suivante nécessaire pour les points utilisés de façon interne
  this.dansFenetre = true
}
CPointBase.prototype = new CPointAncetrePointsMobiles()
CPointBase.prototype.constructor = CPointBase
CPointBase.prototype.superClass = 'CPointAncetrePointsMobiles'
CPointBase.prototype.className = 'CPointBase'

CPointBase.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  return new CPointBase(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, this.fixed, this.x, this.y)
}

/**
 * Fonction translatant le point de (decalagex, decalagey)
 * @param {number} decalagex
 * @param {number} decalagey
 * @returns {void}
 */
CPointBase.prototype.translateDe = function (decalagex, decalagey) {
  this.x += decalagex
  this.y += decalagey
}

CPointBase.prototype.getNature = function () {
  return NatObj.NPointBase
}

CPointBase.prototype.positionne = function (infoRandom, dimfen) {
  CPt.prototype.positionne.call(this, infoRandom, dimfen)
  this.existe = true
}

CPointBase.prototype.testDeplacement = function (dimfen, xtest, ytest, pointr, abscr) {
  pointr.x = xtest
  pointr.y = ytest
  return this.testFenetre(dimfen, xtest, ytest)
}

CPointBase.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (zero(p.x - this.x) && zero(p.y - this.y))
  } else return false
}

/**
 * Zoome les coordonnées du point d'un facteur rapport par rapport au point
 * de coordonnées (xcentre, ycentre)
 * @param {number} rapport
 * @param {number} xcentre
 * @param {number} ycentre
 * @returns {void}
 */
CPointBase.prototype.zoom = function (rapport, xcentre, ycentre) {
  this.x = xcentre + rapport * (this.x - xcentre)
  this.y = ycentre + rapport * (this.y - ycentre)
}
// Non adapaté JavaScript : adaptePourHauteResolution(double coef)
// Pour cet objet x et y ne sont pas calculés mais lus dans le flux d'objets

CPointBase.prototype.read = function (inps, list) {
  CPointAncetrePointsMobiles.prototype.read.call(this, inps, list)
  this.x = inps.readDouble()
  this.y = inps.readDouble()
}

CPointBase.prototype.write = function (oups, list) {
  CPointAncetrePointsMobiles.prototype.write.call(this, oups, list)
  oups.writeDouble(this.x)
  oups.writeDouble(this.y)
}
