/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import CElementGraphique from './CElementGraphique'
import CPointBase from './CPointBase'
import CSousListeObjets from './CSousListeObjets'
export default CLieuDiscretDeBase

/**
 * Classe ancêtre de tous les lieux discrets (non reliés)
 * @constructor
 * @extends CElementGraphique
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la liste propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} masque  true si l'objet est masqué
 * @param {CPt} pointATracer  Le point qui laisse une trace.
 * @param {number} nombreDePoints  Le nombre de points du lieu
 * @param {MotifPoint} motif  Le motif utilisé pour la trace des points.
 * @returns {CLieuDiscretDeBase}
 */
function CLieuDiscretDeBase (listeProprietaire, impProto, estElementFinal, couleur, masque,
  pointATracer, nombreDePoints, motif) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CElementGraphique.call(this, listeProprietaire)
    else {
      CElementGraphique.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        true, 0, 0, masque, '', 16)
      this.pointATracer = pointATracer
      this.nombreDePoints = nombreDePoints
      this.motif = motif
      this.absPoints = new Array(nombreDePoints)
      this.ordPoints = new Array(nombreDePoints)
      // Il faut créer la liste des éléments dont dépend le point à tracer
      this.listeElementsAncetres = new CSousListeObjets()
    }
    this.point1 = new CPointBase(listeProprietaire)
  }
}
CLieuDiscretDeBase.prototype = new CElementGraphique()
CLieuDiscretDeBase.prototype.constructor = CLieuDiscretDeBase
CLieuDiscretDeBase.prototype.superClass = 'CElementGraphique'
CLieuDiscretDeBase.prototype.className = 'CLieuDiscretDeBase'
/**
 * Fonction chanheant les caractéristiques du lieu
 * @returns {void}
 */
CLieuDiscretDeBase.prototype.setClone = function (ptel) {
  CElementGraphique.prototype.setClone.call(this, ptel)
  this.motif = ptel.motif
  this.indiceDernierPointTrace = ptel.indiceDernierPointTrace
  // Il faut copier toutes les coordonnées
  for (let i = 0; i <= this.indiceDernierPointTrace; i++) {
    this.absPoints[i] = ptel.absPoints[i]
    this.ordPoints[i] = ptel.ordPoints[i]
  }
}
CLieuDiscretDeBase.prototype.depDe = function (p) {
  return CElementGraphique.prototype.depDe.call(this, p) || this.pointATracer.depDe(p)
}
CLieuDiscretDeBase.prototype.createg = function () {
  this.point1.donneMotif(this.motif)
  this.point1.donneCouleur(this.couleur)
  const g = cens('g', {
    // Ligne suivante modifiée version 6.5.2
    // 'pointer-events': 'none'
    'pointer-events': this.pointerevents
  })
  for (let i = 0; i <= this.indiceDernierPointTrace; i++) {
    this.point1.placeEn(this.absPoints[i], this.ordPoints[i])
    g.appendChild(this.point1.createg())
  }
  return g
}
CLieuDiscretDeBase.prototype.trace = function (svg) {
  const g = this.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CLieuDiscretDeBase.prototype.update = function (svg) {
  const oldg = this.g
  const g = this.createg()
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  this.g = g
  if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
}
CLieuDiscretDeBase.prototype.dansFen = function (dimfen) {
  if (!this.existe) return false
  for (let i = 0; i <= this.indiceDernierPointTrace; i++) {
    if (dimfen.dansFenetre(this.absPoints[i], this.ordPoints[i])) return true
  }
  return false
}
CLieuDiscretDeBase.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointATracer === ancienPoint) this.pointATracer = nouveauPoint
}
CLieuDiscretDeBase.prototype.getNature = function () {
  return NatObj.NLieuDiscret
}
CLieuDiscretDeBase.prototype.chaineDesignation = function () {
  return 'desLieuPoint'
}
CLieuDiscretDeBase.prototype.read = function (inps, list) {
  CElementGraphique.prototype.read.call(this, inps, list)
  // this.point1 = new CPointBase(null) // Corrigé version 6.5.0
  const ind1 = inps.readInt()
  this.pointATracer = list.get(ind1, 'CPt')
  this.nombreDePoints = inps.readInt()
  this.motif = inps.readByte()
  // Il faut créer les tableaux de coordonnées
  // On réserve une coordonnée supplémentaire pour le cas d'un lieu fermé
  this.absPoints = new Array(this.nombreDePoints)
  this.ordPoints = new Array(this.nombreDePoints)
  this.listeElementsAncetres = new CSousListeObjets()
}
CLieuDiscretDeBase.prototype.write = function (oups, list) {
  CElementGraphique.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.pointATracer)
  oups.writeInt(ind1)
  oups.writeInt(this.nombreDePoints)
  oups.writeByte(this.motif)
}
