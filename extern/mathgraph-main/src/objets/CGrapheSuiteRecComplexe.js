/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import { testToile } from '../kernel/kernel'
import CElementLigne from './CElementLigne'
import CPointDansRepere from './CPointDansRepere'
import CValeur from './CValeur'
import CSegment from './CSegment'
export default CGrapheSuiteRecComplexe

/**
 * Graphe d'une suite récurrente complexe.
 * @constructor
 * @extends CElementLigne
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur du graphe
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Le style de trait utilisé pour le tracé.
 * @param {CSuiteRecComplexe} suiteAssociee  La suite récurrente donc c'est le graphe.
 * @param {CRepere} repereAssocie  Le repère dans leque le graphe est tracé.
 * @param {MotifPoint} motif  Le style utilisé par les points du graphe.
 * @param {boolean} pointsRelies  Si true les points sont reliés par des segments.
 * @returns {CGrapheSuiteRecComplexe}
 */
function CGrapheSuiteRecComplexe (listeProprietaire, impProto, estElementFinal, couleur, masque, style, suiteAssociee, repereAssocie, motif, pointsRelies) {
  if (arguments.length === 1) CElementLigne.call(this, listeProprietaire)
  else {
    CElementLigne.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      true, 0, 0, masque, '', 16, style)
    this.suiteAssociee = suiteAssociee
    this.repereAssocie = repereAssocie
    this.motif = motif
    this.pointsRelies = pointsRelies
    this.point1 = new CPointDansRepere(listeProprietaire, null, false, couleur, true, 0, 0, false, '', 16,
      motif, false, repereAssocie, new CValeur(), new CValeur())
    this.point2 = new CPointDansRepere(listeProprietaire, repereAssocie) // Sert pour distancePoint
    this.seg = new CSegment(listeProprietaire, this.point1, this.point2)
  }
}
CGrapheSuiteRecComplexe.prototype = new CElementLigne()
CGrapheSuiteRecComplexe.prototype.constructor = CGrapheSuiteRecComplexe
CGrapheSuiteRecComplexe.prototype.superClass = 'CElementLigne'
CGrapheSuiteRecComplexe.prototype.className = 'CGrapheSuiteRecComplexe'

CGrapheSuiteRecComplexe.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.suiteAssociee)
  const ind2 = listeSource.indexOf(this.repereAssocie)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CGrapheSuiteRecComplexe(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CSuiteRecComplexe'),
    listeCible.get(ind2, 'CRepere'), this.motif, this.pointsRelies)
}

CGrapheSuiteRecComplexe.prototype.donneCouleur = function (coul) {
  CElementLigne.prototype.donneCouleur.call(this, coul)
  this.point1.donneCouleur(coul)
}

CGrapheSuiteRecComplexe.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CElementLigne.prototype.depDe.call(this, p) ||
    this.suiteAssociee.depDe(p) || this.repereAssocie.depDe(p))
}
CGrapheSuiteRecComplexe.prototype.dependDePourBoucle = function (p) {
  return ((p === this)) || this.suiteAssociee.dependDePourBoucle(p) || this.repereAssocie.dependDePourBoucle(p)
}
CGrapheSuiteRecComplexe.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = ((this.suiteAssociee.existe) && (this.repereAssocie.existe))
  this.dimf = dimfen
}
CGrapheSuiteRecComplexe.prototype.hasg = function (masquage, memeMasque = false) {
  return CElementLigne.prototype.hasg.call(this, masquage, memeMasque) && (this.suiteAssociee.indiceDernierTermeExistant !== 0)
}
// Modifié version 5.0.3 pour te,ir compte des points dont les coordonnées sont trop grandes
CGrapheSuiteRecComplexe.prototype.createg = function () {
  let i
  let style = ''
  const stroke = this.style.stroke
  if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
  const strokewidth = this.style.strokeWidth
  style += 'stroke-width:' + strokewidth + ';'
  // style += "stroke:"+this.couleur.rgb()+";"; Modifié version 4.9.9.4
  // style += 'stroke:' + this.color + ';' // Modifié version 6.9.1
  style += 'stroke:' + this.color + ';opacity:' + this.couleur.opacity + ';'
  style += 'fill:none'
  let p = ''
  const g = cens('g')
  for (i = 0; i <= this.suiteAssociee.indiceDernierTermeExistant; i++) {
    this.point1.abs.donneValeur(this.suiteAssociee.valeurs[i].x)
    this.point1.ord.donneValeur(this.suiteAssociee.valeurs[i].y)
    this.point1.positionne(false, this.dimf)
    if (this.point1.hasg(false)) g.appendChild(this.point1.createg())
    if (this.pointsRelies) {
      // Modification version 5.0.3
      const x = this.point1.x
      const y = this.point1.y
      if (!testToile(x, y)) break
      //
      p += x + ',' + y + ' '
    }
  }
  const polyline = cens('polyline', {
    style,
    points: p
  })
  g.appendChild(polyline)
  // Ligne suivante modifiée version 6.5.2
  // g.setAttribute('pointer-events', 'none')
  g.setAttribute('pointer-events', this.pointerevents)
  return g
}
CGrapheSuiteRecComplexe.prototype.trace = function (svg) {
  const g = this.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CGrapheSuiteRecComplexe.prototype.update = function (svg) {
  const oldg = this.g
  const g = this.createg()
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  this.g = g
  if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
}
CGrapheSuiteRecComplexe.prototype.getNature = function () {
  return NatObj.NGrapheSuiteRecComplexe
}
CGrapheSuiteRecComplexe.prototype.confonduAvec = function (p) {
  if (p.className === this.className) { return (this.repereAssocie === p.repereAssocie) && (this.suiteAssociee === p.suiteAssociee) } else return false
}
CGrapheSuiteRecComplexe.prototype.chaineDesignation = function () {
  return 'desGrapheSuiteRec'
}
CGrapheSuiteRecComplexe.prototype.read = function (inps, list) {
  CElementLigne.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.suiteAssociee = list.get(ind1, 'CSuiteRecComplexe')
  this.repereAssocie = list.get(ind2, 'CRepere')
  this.pointsRelies = inps.readBoolean()
  this.motif = inps.readByte()
  // Lignes suivantes ajoutées version 6.3.4 car on ne pouvait plus ouvrir de figures avec graphe de suite récurrente
  this.point1 = new CPointDansRepere(this.listeProprietaire, null, false, this.couleur, true, 0, 0, false, '', 16,
    this.motif, false, this.repereAssocie, new CValeur(), new CValeur())
  this.point2 = new CPointDansRepere(this.listeProprietaire, this.repereAssocie)
  this.seg = new CSegment(this.listeProprietaire, this.point1, this.point2) // Sert pour distancePoint
}

CGrapheSuiteRecComplexe.prototype.write = function (oups, list) {
  CElementLigne.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.suiteAssociee)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.repereAssocie)
  oups.writeInt(ind2)
  oups.writeBoolean(this.pointsRelies)
  oups.writeByte(this.motif)
}
