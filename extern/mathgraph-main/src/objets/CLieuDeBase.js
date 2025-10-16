/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import InfoLieu from '../types/InfoLieu'
import InfoLigneLieu from '../types/InfoLigneLieu'
import { round3dg } from '../kernel/kernel'
import CElementLigne from './CElementLigne'
import CSousListeObjets from './CSousListeObjets'
export default CLieuDeBase

/**
 * Classe ancêtre de tous les lieux de points reliés.
 * @constructor
 * @extends CElementLigne
 * @param {CListeObjets} listeProprietaire  la liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur de l'objet
 * @param {boolean} masque  true si l'objet est masqué
 * @param {StyleTrait} style  le style de tracé.
 * @param {CPt} pointATracer  Le point qui laisse une trace.
 * @param {InfoLieu} infoLieu
 * @returns {CLieuDeBase}
 */
function CLieuDeBase (listeProprietaire, impProto, estElementFinal, couleur, masque, style, pointATracer, infoLieu) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CElementLigne.call(this, listeProprietaire)
    else {
      CElementLigne.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        true, 0, 0, masque, '', 16, style)
      this.pointATracer = pointATracer
      this.infoLieu = infoLieu
      this.absPoints = new Array(infoLieu.nombreDePoints + 1)
      this.ordPoints = new Array(infoLieu.nombreDePoints + 1)
      const nb = Math.floor(this.infoLieu.nombreDePoints / 2) + 2
      this.infoLignes = new Array(nb)
      // Il faut initialiser chaque élément du tableau
      for (let i = 0; i < nb; i++) {
        this.infoLignes[i] = new InfoLigneLieu()
      }
      // Il faut créer la liste des éléments dont dépend le point à tracer
      this.listeElementsAncetres = new CSousListeObjets()
    }
  }
}
CLieuDeBase.prototype = new CElementLigne()
CLieuDeBase.prototype.constructor = CLieuDeBase
CLieuDeBase.prototype.superClass = 'CElementLigne'
CLieuDeBase.prototype.className = 'CLieuDeBase'

CLieuDeBase.prototype.setClone = function (ptel) {
  CElementLigne.prototype.setClone.call(this, ptel)
  this.nombreLignes = ptel.nombreLignes
  this.infoLieu.setCopy(ptel.infoLieu) // Il faut copier toutes les coordonnées
  for (let j = 0; j < this.nombreLignes; j++) {
    this.infoLignes[j].setCopy(ptel.infoLignes[j])
    for (let k = 0; k < this.infoLignes[j].nombrePoints; k++) {
      this.absPoints[this.infoLignes[j].indicePremierPoint + k] =
        ptel.absPoints[this.infoLignes[j].indicePremierPoint + k]
      this.ordPoints[this.infoLignes[j].indicePremierPoint + k] =
        ptel.ordPoints[this.infoLignes[j].indicePremierPoint + k]
    }
  }
}
CLieuDeBase.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CElementLigne.prototype.depDe.call(this, p) || this.pointATracer.depDe(p))
}
CLieuDeBase.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.pointATracer.dependDePourBoucle(p)
}
// Spécifique JavaScript
CLieuDeBase.prototype.createg = function () {
  let j, nombrePoints, indPremPoint, k, k1
  let style = ''
  let styleRect
  const stroke = this.style.stroke
  if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
  const strokewidth = this.style.strokeWidth
  // var coul = this.couleur.rgb(); // Modifié version 4.9.9.4
  const coul = this.color
  style += 'stroke-width:' + strokewidth + ';'
  // style += 'stroke:' + coul + ';' // Modifié version 6.9.1
  style += 'stroke:' + this.color + ';opacity:' + this.couleur.opacity + ';'
  styleRect = style
  style += 'fill:none'
  styleRect += 'fill:' + coul
  const g = cens('g')
  // g.setAttribute("style", style); // Supprimé version mtgApp. Inutile

  for (j = 0; j < this.nombreLignes; j++) {
    nombrePoints = this.infoLignes[j].nombrePoints
    // Optimisé version 3.9 On trace maintenant les points isolés du lieu
    indPremPoint = this.infoLignes[j].indicePremierPoint
    if (nombrePoints === 1) {
      const r = cens('rect', {
        x: round3dg(this.absPoints[indPremPoint]),
        y: round3dg(this.ordPoints[indPremPoint]),
        width: '1',
        height: '1',
        style: styleRect
      })
      g.appendChild(r)
    } else {
      // Il faut transférer les coordonnées de chaque ligne pour pouvoir la tracer en java
      let points = ''
      for (k = 0; k < nombrePoints; k++) {
        k1 = indPremPoint + k
        points = points + round3dg(this.absPoints[k1]) + ','
        points = points + round3dg(this.ordPoints[k1]) + ' '
      }
      const pol = cens('polyline', {
        style,
        points
      })
      g.appendChild(pol)
    }
  }
  // Ligne suivante modifiée version 6.5.2
  // g.setAttribute('pointer-events', 'none')
  g.setAttribute('pointer-events', this.pointerevents)
  return g
}
CLieuDeBase.prototype.trace = function (svg) {
  const g = this.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CLieuDeBase.prototype.update = function (svg) {
  const oldg = this.g
  const g = this.createg()
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  this.g = g
  if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
}
/**
 * Renvoie true si le lieu de points n'est formé que d'une seule ligne.
 * @returns {boolean}
 */
CLieuDeBase.prototype.contientUneSeuleLigne = function () {
  return (this.nombreLignesDePlusieursPoints === 1)
}
/**
 * Renvoie true si le lieu contient au moins une ligne.
 * @returns {boolean}
 */
CLieuDeBase.prototype.contientAuMoinsUneLigne = function () {
  return (this.nombreLignesDePlusieursPoints >= 1)
}
CLieuDeBase.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointATracer === ancienPoint) this.pointATracer = nouveauPoint
}
CLieuDeBase.prototype.getNature = function () {
  return NatObj.NLieu
}
CLieuDeBase.prototype.dansFen = function (dimfen) {
  if (!this.existe) return false
  let resultat = false
  for (let j = 0; (j < this.nombreLignes) && !resultat; j++) {
    for (let k = this.infoLignes[j].indicePremierPoint; k <= this.infoLignes[j].indicePremierPoint +
        this.infoLignes[j].nombrePoints - 2; k++) {
      resultat = resultat || dimfen.dansFenetre(this.absPoints[k], this.ordPoints[k])
    }
  }
  return resultat
}
CLieuDeBase.prototype.chaineDesignation = function () {
  return 'desLieuPoint'
}
CLieuDeBase.prototype.read = function (inps, list) {
  CElementLigne.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.pointATracer = list.get(ind1, 'CPt')
  this.infoLieu = new InfoLieu()
  this.infoLieu.read(inps)
  // Il faut créer les tableaux de coordonnées
  // On réserve une coordonnée supplémentaire pour le cas d'un lieu fermé
  this.absPoints = new Array(this.infoLieu.nombreDePoints + 1)
  this.ordPoints = new Array(this.infoLieu.nombreDePoints + 1)
  const nb = this.infoLieu.nombreDePoints / 2 + 2
  this.infoLignes = new Array(nb)
  // Il faut initialiser chaque élément du tableau
  for (let i = 0; i < nb; i++) this.infoLignes[i] = new InfoLigneLieu()
  // Il faut créer la liste des éléments dont dépend le point à tracer
  this.listeElementsAncetres = new CSousListeObjets()
}
CLieuDeBase.prototype.write = function (oups, list) {
  CElementLigne.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.pointATracer)
  oups.writeInt(ind1)
  this.infoLieu.write(oups, list)
}

// Fonction ajoutée version 6.5.2 pour permettre de modifier directement des éléments de la figure
/**
 * Fonction donnant directement au svg element représentant l'élément graphique la couleur de l'élément
 */
CLieuDeBase.prototype.setgColor = function () {
  if (this.g) {
    for (let j = 0; j < this.nombreLignes; j++) {
      const nombrePoints = this.infoLignes[j].nombrePoints
      const el = this.g.childNodes[j]
      // Ligne suivante ajoutée version 6.9.1
      el.style.opacity = this.couleur.opacity
      if (nombrePoints === 1) {
        // Cas d'un point isolé
        el.style.fill = this.color
      } else {
        el.style.stroke = this.color
      }
    }
    return true
  } else return false
}
