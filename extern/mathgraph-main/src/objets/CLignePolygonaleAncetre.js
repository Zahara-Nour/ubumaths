/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CElementLigne from './CElementLigne'
import CSegment from './CSegment'
import CNoeudPointeurSurPoint from './CNoeudPointeurSurPoint'
import CPointBase from './CPointBase'
export default CLignePolygonaleAncetre

/**
 * Classe ancetre des lignes brisées et polygones.
 * @constructor
 * @extends CElementLigne
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Le style du tracé.
 * @param {CNoeudPointeurSurPoint[]} colPoints  Tableau de CNoeudPointeurSurPoint qui donne les sommets.
 * @returns {CLignePolygonaleAncetre}
 */
function CLignePolygonaleAncetre (listeProprietaire, impProto, estElementFinal, couleur, masque, style, colPoints) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CElementLigne.call(this, listeProprietaire)
    else {
      CElementLigne.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        true, 0, 0, masque, '', 16, style)
      this.colPoints = colPoints
      this.nombrePoints = colPoints.length
      this.absPoints = new Array(this.nombrePoints)
      this.ordPoints = new Array(this.nombrePoints)
    }
    this.point1 = new CPointBase()
    this.point2 = new CPointBase()
    this.segment = new CSegment(listeProprietaire, this.point1, this.point2)
  }
}
CLignePolygonaleAncetre.prototype = new CElementLigne()
CLignePolygonaleAncetre.prototype.constructor = CLignePolygonaleAncetre
CLignePolygonaleAncetre.prototype.superClass = 'CElementLigne'
CLignePolygonaleAncetre.prototype.className = 'CLignePolygonaleAncetre'

/**
 * Création des tableaux qui contiendront les coordonnées des sommets.
 * @returns {void}
 */
CLignePolygonaleAncetre.prototype.prepareTableauxCoordonnees = function () {
  this.nombrePoints = this.colPoints.length
  this.absPoints = new Array(this.nombrePoints)
  this.ordPoints = new Array(this.nombrePoints)
}
CLignePolygonaleAncetre.prototype.setClone = function (ptel) {
  CElementLigne.prototype.setClone.call(this, ptel)
  this.nombrePoints = ptel.nombrePoints
  for (let i = 0; i < this.colPoints.length; i++) {
    this.absPoints[i] = ptel.absPoints[i]
    this.ordPoints[i] = ptel.ordPoints[i]
  }
}
CLignePolygonaleAncetre.prototype.dependDePourBoucle = function (p) {
  let resultat = (p === this)
  for (let i = 0; (i < this.colPoints.length) && !resultat; i++) {
    const ptp = this.colPoints[i].pointeurSurPoint
    resultat = resultat || ptp.dependDePourBoucle(p)
  }
  return resultat
}
CLignePolygonaleAncetre.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  let resultat = CElementLigne.prototype.depDe.call(this, p)
  for (let i = 0; (i < this.colPoints.length) && !resultat; i++) {
    const ptp = this.colPoints[i].pointeurSurPoint
    resultat = resultat || ptp.depDe(p)
  }
  return this.memDep(resultat)
}
CLignePolygonaleAncetre.prototype.positionne = function (infoRandom, dimfen) {
  // Rajouté pour la version 1.9.5 car Trace ne doit plus faire référence à des pointeurs
  this.existe = true
  for (let i = 0; i < this.nombrePoints; i++) {
    const ptp = this.colPoints[i].pointeurSurPoint
    this.existe = this.existe && ptp.existe
    if (!this.existe) return
    this.existe = this.existe && !ptp.horsEcran
    if (this.existe) {
      // Différence par rapport à Java : coordonnées pas forcément entières
      this.absPoints[i] = ptp.x
      this.ordPoints[i] = ptp.y
    } else return
  } // while
}
CLignePolygonaleAncetre.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  for (let i = 0; i < this.nombrePoints; i++) {
    this.colPoints[i].remplacePoint(ancienPoint, nouveauPoint)
  }
}
CLignePolygonaleAncetre.prototype.read = function (inps, list) {
  CElementLigne.prototype.read.call(this, inps, list)
  this.nombrePoints = inps.readInt()
  this.colPoints = new Array(this.nombrePoints)
  for (let i = 0; i < this.nombrePoints; i++) {
    const noeud = new CNoeudPointeurSurPoint()
    noeud.read(inps, list)
    this.colPoints[i] = noeud
  }
  // Modification pour la version 2.5.
  // Certaines choses pas à faire pour le chargement d'un prototype
  if (list.className !== 'CPrototype') this.prepareTableauxCoordonnees()
}
CLignePolygonaleAncetre.prototype.write = function (oups, list) {
  CElementLigne.prototype.write.call(this, oups, list)
  oups.writeInt(this.nombrePoints)
  for (let i = 0; i < this.nombrePoints; i++) {
    this.colPoints[i].write(oups, list)
  }
}
