/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import Vect from '../types/Vect'
import { distancePointPoint } from '../kernel/kernel'
import CPointLie from './CPointLie'
import CSegment from './CSegment'
import CPointBase from './CPointBase'
import { projetteOrtho } from 'src/kernel/kernelVect'

export default CPointLieLigne

/**
 * Point lié à une ligne brisée ou un polygone.
 * @constructor
 * @extends CPointLie
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
 * @param {boolean} fixed  true si punaisé
 * @param {number} abscisse  L'abscisse sur la ligne ou le polygone
 * @param {CLignePolygonaleAncetre} ligneLiee  La ligne brisée ou polygone auquel le point est lié
 * @returns {void}
 */
function CPointLieLigne (listeProprietaire, impProto, estElementFinal,
  couleur, nomMasque, decX, decY, masque, nom, tailleNom,
  motif, marquePourTrace, fixed, abscisse, ligneLiee) {
  if (arguments.length === 1) CPointLie.call(this, listeProprietaire)
  else {
    CPointLie.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace, fixed, abscisse)
    this.ligneLiee = ligneLiee
    if (listeProprietaire.className !== 'CPrototype') this.tableauLongueurs = new Array(ligneLiee.colPoints.length - 1)
  }
  this.point1 = new CPointBase(null)
  this.point2 = new CPointBase(null)
  this.seg = new CSegment(listeProprietaire, null, false, new Color(0, 0, 0), true,
    StyleTrait.traitFin, this.point1, this.point2)
  this.pointres = { x: 0, y: 0 }
}
CPointLieLigne.prototype = new CPointLie()
CPointLieLigne.prototype.constructor = CPointLieLigne
CPointLieLigne.prototype.superClass = 'CPointLie'
CPointLieLigne.prototype.className = 'CPointLieLigne'

CPointLieLigne.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.ligneLiee)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CPointLieLigne(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, this.fixed, this.abscisse,
    listeCible.get(ind1, 'CLignePolygonaleAncetre'))
}

CPointLieLigne.prototype.setClone = function (ptel) {
  CPointLie.prototype.setClone.call(this, ptel)
  // Il faut copier les valeurs du tableau de longueurs et la longueur totale
  this.longueurTotale = ptel.longueurTotale
  for (let i = 0; i < this.tableauLongueurs.length - 1; i++) {
    this.tableauLongueurs[i] = ptel.tableauLongueurs[i]
  }
}

CPointLieLigne.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.ligneLiee)
}

CPointLieLigne.prototype.confonduAvec = function (p) {
  const res = CPointLie.prototype.confonduAvec.call(this, p)
  if (!res) return false
  return (this.ligneLiee === p.ligneLiee)
}

CPointLieLigne.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPointLie.prototype.depDe.call(this, p) || this.ligneLiee.depDe(p))
}

CPointLieLigne.prototype.dependDePourBoucle = function (p) {
  return CPointLie.prototype.dependDePourBoucle.call(this, p) || this.ligneLiee.dependDePourBoucle(p)
}

CPointLieLigne.prototype.positionne = function (infoRandom, dimfen) {
  let i

  this.existe = this.ligneLiee.existe
  if (!this.existe) return
  this.calculeLongueurs()
  if (this.longueurTotale === 0) {
    this.existe = false
    return
  }
  // On cherche maintenant sur quel segment est situé le point lié
  // Java : a été remanié par rapport au C++
  let longueurPartielle = 0
  let longueurJusqueDebSegment = 0
  const nbSommets = this.ligneLiee.colPoints.length
  for (i = 0; i < nbSommets - 1; i++) {
    longueurJusqueDebSegment = longueurPartielle
    longueurPartielle += this.tableauLongueurs[i]
    if (longueurPartielle / this.longueurTotale >= this.abscisse) break
  }
  // Juste par précaution
  if (i === nbSommets - 1) i = nbSommets - 2
  const n1 = this.ligneLiee.colPoints[i]
  const ptp1 = n1.pointeurSurPoint
  const n2 = this.ligneLiee.colPoints[i + 1]
  const ptp2 = n2.pointeurSurPoint
  let abscisseSurSegment
  if (this.tableauLongueurs[i] === 0) abscisseSurSegment = 0
  else abscisseSurSegment = (this.longueurTotale * this.abscisse - longueurJusqueDebSegment) / this.tableauLongueurs[i]
  const xn = ptp1.x + (abscisseSurSegment) * (ptp2.x - ptp1.x)
  const yn = ptp1.y + (abscisseSurSegment) * (ptp2.y - ptp1.y)
  CPointLie.prototype.placeEn.call(this, xn, yn)
  CPointLie.prototype.positionne.call(this, infoRandom, dimfen)
}
/**
 * Renvoie l'abscisse minimale de la ligne auquel le point est lié
 * @returns {number}
 */
CPointLieLigne.prototype.abscisseMinimale = function () {
  return this.ligneLiee.abscisseMinimale()
}
/**
 * Renvoie l'ordonnée minimale de la ligne auquel le point est lié
 * @returns {number}
 */
CPointLieLigne.prototype.abscisseMaximale = function () {
  return this.ligneLiee.abscisseMaximale()
}
/**
 * Fonction calculant les longueurs des côtés de la ligne brisée ou du polygone
 * et les mettant dans this.tableauLongueurs.
 * La longueur totale de laligen est mise dans this.longueurTotale.
 * @returns {void}
 */
CPointLieLigne.prototype.calculeLongueurs = function () {
  this.longueurTotale = 0
  for (let i = 0; i < this.ligneLiee.colPoints.length - 1; i++) {
    const n1 = this.ligneLiee.colPoints[i]
    const n2 = this.ligneLiee.colPoints[i + 1]

    const ptp1 = n1.pointeurSurPoint
    const ptp2 = n2.pointeurSurPoint
    const u = new Vect(ptp1, ptp2)
    const longueurSegment = u.norme()
    this.tableauLongueurs[i] = longueurSegment
    this.longueurTotale += longueurSegment
  }
}

CPointLieLigne.prototype.testDeplacement = function (dimfen, xtest, ytest, pointr, abscr) {
  let ptPointProche = null
  let distMin = 2147483647
  // On calcule les longueurs des côtés et la longueur totale
  // de la ligne polygonale cliquée
  this.calculeLongueurs()

  let indiceDistMin = -1
  let valable = false
  for (let i = 0; i < this.ligneLiee.colPoints.length - 1; i++) {
    const n1 = this.ligneLiee.colPoints[i]
    const n2 = this.ligneLiee.colPoints[i + 1]

    const ptp1 = n1.pointeurSurPoint
    const ptp2 = n2.pointeurSurPoint
    this.point1.placeEn(ptp1.x, ptp1.y)
    this.point1.positionne(false, dimfen) // Spécial JavaScript
    this.point2.placeEn(ptp2.x, ptp2.y)
    this.point2.positionne(false, dimfen) // Spécial JavaScript
    this.seg.positionne()
    projetteOrtho(xtest, ytest, ptp1.x, ptp1.y, this.seg.vect, this.pointres)
    if (this.seg.appartientA(this.pointres.x, this.pointres.y)) {
      valable = true
      const u = new Vect(this.pointres.x, this.pointres.y, xtest, ytest)
      const dist = u.norme()
      if (dist < distMin) {
        ptPointProche = ptp1
        distMin = dist
        indiceDistMin = i
        pointr.x = this.pointres.x
        pointr.y = this.pointres.y
      }
    } else {
      const d1 = distancePointPoint(ptp1.x, ptp1.y, xtest, ytest)
      if (d1 < distMin) {
        valable = true
        ptPointProche = ptp1
        distMin = d1
        indiceDistMin = i
        pointr.x = ptp1.x
        pointr.y = ptp1.y
      }
    }
  }
  if (valable) {
    // Il faut calculer l'abscisse du point
    let longueurDebutLigne = 0
    for (let j = 0; j < indiceDistMin; j++) {
      longueurDebutLigne += this.tableauLongueurs[j]
    }
    const v = new Vect(ptPointProche.x, ptPointProche.y, pointr.x, pointr.y)
    longueurDebutLigne += v.norme()
    abscr.setValue(longueurDebutLigne / this.longueurTotale)
  }
  return valable
}

CPointLieLigne.prototype.read = function (inps, list) {
  CPointLie.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.ligneLiee = list.get(ind1, 'CLignePolygonaleAncetre')
  // Pas de réservation en mémoire pour le chargement des prototypes
  if (list.className !== 'CPrototype') this.tableauLongueurs = new Array(this.ligneLiee.colPoints.length - 1)
}

CPointLieLigne.prototype.write = function (oups, list) {
  CPointLie.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.ligneLiee)
  oups.writeInt(ind1)
}
