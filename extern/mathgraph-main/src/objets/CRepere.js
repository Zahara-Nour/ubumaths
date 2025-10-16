/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import StyleTrait from '../types/StyleTrait'
import Vect from '../types/Vect'
import { indiceMiniMaxi, intersectionDroitesSecantes } from '../kernel/kernel'
import CElementLigne from './CElementLigne'
import CDroite from './CDroite'
import CValeur from './CValeur'
import { aligne } from 'src/kernel/kernelVect'

export default CRepere

/**
 * Classe représentant un repère.
 * @constructor
 * @extends CElementLigne
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet
 * @param {boolean} masque  true si le repère est masqué.
 * @param {StyleTrait} style  Le style de trait pour le quadrillage.
 * @param {CPt} o  L'origine du repère.
 * @param {CPt} i  Le point de coordonnées (1;0).
 * @param {CPt} j  Le point de coordonnées (0;1).
 * @param {CValeur} abscisseOrigine  L'abscisse à l'origine.
 * @param {CValeur} ordonneeOrigine  L'ordonnée à l'origine.
 * @param {boolean} quadrillageHorizontal  true pour des droites verticales de quadrillage.
 * @param {boolean} quadrillageVertical  true pour des droites horizontales de quadrillage.
 * @param {boolean} pointilles  true si on veut que les points à coordonnées entières soient représentés
 * par des petits points.
 * @param {CValeur} uniteX  L'unité sur l'axe des abcsisses.
 * @param {CValeur} uniteY  L'unité sur l'axe des ordonnées.
 * @returns {CRepere}
 */
function CRepere (listeProprietaire, impProto, estElementFinal, couleur,
  masque, style, o, i, j, abscisseOrigine, ordonneeOrigine,
  quadrillageHorizontal, quadrillageVertical, pointilles, uniteX, uniteY) {
  if (arguments.length === 1) CElementLigne.call(this, listeProprietaire)
  else {
    CElementLigne.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      false, 0, 0, masque, '', 0, style)

    this.o = o
    this.i = i
    this.j = j
    this.abscisseOrigine = abscisseOrigine
    this.ordonneeOrigine = ordonneeOrigine
    this.quadrillageHorizontal = quadrillageHorizontal
    this.quadrillageVertical = quadrillageVertical
    this.pointilles = pointilles
    this.uniteX = uniteX
    this.uniteY = uniteY
    this.u = new Vect()
    this.v = new Vect()
    this.droiteQuadrillage = new CDroite(listeProprietaire)
    this.droiteQuadrillage.montre()
    this.origine = {}
    this.pointint = new Array(4)
    for (let k = 0; k < 4; k++) {
      this.pointint[k] = {}
    }
  }
  this.vect = new Vect()
}
CRepere.prototype = new CElementLigne()
CRepere.prototype.constructor = CRepere
CRepere.prototype.superClass = 'CElementLigne'
CRepere.prototype.className = 'CRepere'

CRepere.prototype.numeroVersion = function () {
  return 2
}

CRepere.prototype.setClone = function (ptel) {
  CElementLigne.prototype.setClone.call(this, ptel)
  this.absMiniH = ptel.absMiniH
  this.absMaxiH = ptel.absMaxiH
  this.absMiniV = ptel.absMiniV
  this.absMaxiV = ptel.absMaxiV
  this.dimf = ptel.dimf
  this.origine.x = ptel.origine.x
  this.origine.y = ptel.origine.y
  ptel.u.setCopy(this.u)
  ptel.v.setCopy(this.v)
  this.unitex = ptel.unitex
  this.unitey = ptel.unitey
}
CRepere.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.o)
  const ind2 = listeSource.indexOf(this.i)
  const ind3 = listeSource.indexOf(this.j)
  const ind4 = listeSource.indexOf(this.impProto)
  const abscisseOrigineClone = this.abscisseOrigine.getClone(listeSource, listeCible)
  const ordonneeOrigineClone = this.ordonneeOrigine.getClone(listeSource, listeCible)
  const uniteXclone = this.uniteX.getClone(listeSource, listeCible)
  const uniteYClone = this.uniteY.getClone(listeSource, listeCible)

  return new CRepere(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(),
    listeCible.get(ind1, 'CPt'), listeCible.get(ind2, 'CPt'),
    listeCible.get(ind3, 'CPt'), abscisseOrigineClone, ordonneeOrigineClone, this.quadrillageHorizontal,
    this.quadrillageVertical, this.pointilles, uniteXclone, uniteYClone)
}
CRepere.prototype.initialisePourDependance = function () {
  CElementLigne.prototype.initialisePourDependance.call(this)
  this.abscisseOrigine.initialisePourDependance()
  this.ordonneeOrigine.initialisePourDependance()
  this.uniteX.initialisePourDependance()
  this.uniteY.initialisePourDependance()
}
CRepere.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CElementLigne.prototype.depDe.call(this, p) ||
  this.o.depDe(p) || this.i.depDe(p) || this.j.depDe(p) ||
  this.abscisseOrigine.depDe(p) || this.ordonneeOrigine.depDe(p) ||
  this.uniteX.depDe(p) || this.uniteY.depDe(p))
}
CRepere.prototype.dependDePourBoucle = function (p) {
  return (p === this) ||
  this.o.dependDePourBoucle(p) || this.i.dependDePourBoucle(p) || this.j.dependDePourBoucle(p) ||
  this.abscisseOrigine.dependDePourBoucle(p) || this.ordonneeOrigine.dependDePourBoucle(p) ||
  this.uniteX.dependDePourBoucle(p) || this.uniteY.dependDePourBoucle(p)
}
CRepere.prototype.nomIndispensable = function (el) {
  return ((el === this.o) || (el === this.i) || (el === this.j))
}
CRepere.prototype.positionne = function (infoRandom, dimfen) {
  this.uniteX.positionne(infoRandom, dimfen)
  this.uniteY.positionne(infoRandom, dimfen)
  this.unitex = this.uniteX.rendValeur()
  this.unitey = this.uniteY.rendValeur()

  this.abscisseOrigine.positionne(infoRandom, dimfen)
  this.ordonneeOrigine.positionne(infoRandom, dimfen)
  this.existe = (this.o.existe) && (this.i.existe) && (this.j.existe) &&
    this.abscisseOrigine.existe && this.ordonneeOrigine.existe &&
    this.uniteX.existe && this.uniteY.existe &&
    (this.unitex > 0) && (this.unitey > 0) &&
    !(aligne(this.x, this.o.y, this.i.x, this.i.y, this.j.x, this.j.y))
  if (this.existe) {
    // On mémorise les valeurs de l'abscisse à l'origine et de l'ordonnée à l'origine.
    this.valAbscisseOrigine = this.abscisseOrigine.rendValeur()
    this.valOrdonneeOrigine = this.ordonneeOrigine.rendValeur()
    const abs = new Array(4)
    const pointIndices = { x: 0, y: 0 } // Contiendra les indices des valeurs minimalse et maximales
    // Java : différence par rapport au C++. Nécessaire de mémoriser dimfen
    // pour le tracé de la droite servant au quadrillage
    this.dimf = dimfen
    this.u.setVecteur(this.o, this.i)
    this.v.setVecteur(this.o, this.j)
    // On calcule les réelles coordonnées de l'origine
    this.origine.x = this.o.x - this.u.x * this.valAbscisseOrigine / this.unitex - this.v.x * this.valOrdonneeOrigine / this.unitey
    this.origine.y = this.o.y - this.u.y * this.valAbscisseOrigine / this.unitex - this.v.y * this.valOrdonneeOrigine / this.unitey
    // Préparation du quadrillage vertical éventuel;
    if (this.quadrillageVertical || this.pointilles) {
      intersectionDroitesSecantes(0, 0, this.u, this.o.x, this.o.y, this.v, this.pointint[0])
      intersectionDroitesSecantes(0, dimfen.y, this.u, this.o.x, this.o.y, this.v, this.pointint[1])
      intersectionDroitesSecantes(dimfen.x, 0, this.u, this.o.x, this.o.y, this.v, this.pointint[2])
      intersectionDroitesSecantes(dimfen.x, dimfen.y,
        this.u, this.o.x, this.o.y, this.v, this.pointint[3])
      if (this.v.y !== 0) {
        abs[0] = (this.pointint[0].y - this.o.y) / this.v.y
        abs[1] = (this.pointint[1].y - this.o.y) / this.v.y
        abs[2] = (this.pointint[2].y - this.o.y) / this.v.y
        abs[3] = (this.pointint[3].y - this.o.y) / this.v.y
      } else {
        abs[0] = (this.pointint[0].x - this.o.x) / this.v.x
        abs[1] = (this.pointint[1].x - this.o.x) / this.v.x
        abs[2] = (this.pointint[2].x - this.o.x) / this.v.x
        abs[3] = (this.pointint[3].x - this.o.x) / this.v.x
      }
      indiceMiniMaxi(3, abs, pointIndices)
      this.absMiniV = Math.floor(abs[pointIndices.x] + 1)
      this.absMaxiV = Math.floor(abs[pointIndices.y])
    }
    if (this.quadrillageHorizontal || this.pointilles) {
      intersectionDroitesSecantes(0, 0, this.v, this.o.x, this.o.y, this.u, this.pointint[0])
      intersectionDroitesSecantes(0, dimfen.y, this.v, this.o.x, this.o.y, this.u, this.pointint[1])
      intersectionDroitesSecantes(dimfen.x, 0, this.v, this.o.x, this.o.y, this.u, this.pointint[2])
      intersectionDroitesSecantes(dimfen.x, dimfen.y, this.v, this.o.x, this.o.y, this.u, this.pointint[3])
      if (this.u.x !== 0) {
        abs[0] = (this.pointint[0].x - this.o.x) / this.u.x
        abs[1] = (this.pointint[1].x - this.o.x) / this.u.x
        abs[2] = (this.pointint[2].x - this.o.x) / this.u.x
        abs[3] = (this.pointint[3].x - this.o.x) / this.u.x
      } else {
        abs[0] = (this.pointint[0].y - this.o.y) / this.u.y
        abs[1] = (this.pointint[1].y - this.o.y) / this.u.y
        abs[2] = (this.pointint[2].y - this.o.y) / this.u.y
        abs[3] = (this.pointint[3].y - this.o.y) / this.u.y
      }
      indiceMiniMaxi(3, abs, pointIndices)
      this.absMiniH = Math.floor(abs[pointIndices.x] + 1)
      this.absMaxiH = Math.floor(abs[pointIndices.y])
    }
  }
}
CRepere.prototype.createg = function () {
  let p, q, x1, y1, cerc, style, styleCer, path
  const g = cens('g')
  style = ''
  // coul = this.couleur.rgb() Modifié version 4.9.9.4
  const coul = this.color
  const stroke = this.style.stroke
  if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
  let strokewidth = this.style.strokeWidth
  if (strokewidth === 1) strokewidth = 1.25 // Pour que ce soit plus visible sur périphériques mobiles
  style += 'stroke-width:' + strokewidth + ';'
  style += 'stroke:' + coul + ';'
  let d = ''
  if (this.quadrillageVertical) {
    const dteQuad = this.droiteQuadrillage
    dteQuad.donneCouleur(this.couleur)
    dteQuad.donneStyle(this.style) // Contrairement à la version java les repères ont un style
    // if (this.absMaxiV - this.absMiniV <= 200) { // Modifié version 6.3.0 pour gagner en rapidité
    if (this.absMaxiV - this.absMiniV <= 200) {
      dteQuad.vect.x = this.u.x
      dteQuad.vect.y = this.u.y
      for (p = this.absMiniV; p <= this.absMaxiV; p++) {
        if (p !== 0) {
          dteQuad.point_x = this.o.x + p * this.v.x
          dteQuad.point_y = this.o.y + p * this.v.y
          // Les paramètres d'appel ne servent pas.
          dteQuad.positionne(false, this.dimf)
          if (!dteQuad.horsFenetre) {
            d += 'M' + this.droiteQuadrillage.xext1 + ' ' + this.droiteQuadrillage.yext1
            d += 'L' + this.droiteQuadrillage.xext2 + ' ' + this.droiteQuadrillage.yext2
          }
        }
      }
    }
  }
  if (this.quadrillageHorizontal) {
    const dteQuad = this.droiteQuadrillage
    dteQuad.donneCouleur(this.couleur)
    dteQuad.donneStyle(this.style)
    // if (this.absMaxiH - this.absMiniH <= 200) { // Modifié version 6.3.0 pour gagner en rapidité
    if (this.absMaxiH - this.absMiniH <= 200) {
      dteQuad.vect.x = this.v.x
      dteQuad.vect.y = this.v.y
      for (p = this.absMiniH; p <= this.absMaxiH; p++) {
        if (p !== 0) {
          dteQuad.point_x = this.o.x + p * this.u.x
          dteQuad.point_y = this.o.y + p * this.u.y
          dteQuad.positionne(false, this.dimf)
          if (!dteQuad.horsFenetre) {
            d += 'M' + this.droiteQuadrillage.xext1 + ' ' + this.droiteQuadrillage.yext1
            d += 'L' + this.droiteQuadrillage.xext2 + ' ' + this.droiteQuadrillage.yext2
          }
        }
      }
    }
  }
  if (d.length !== 0) {
    path = cens('path', {
      d,
      style
    })
    g.appendChild(path)
  }
  if (this.pointilles) {
    /* Modifié version 5.0
    stroke = StyleTrait.stroke(StyleTrait.traitFin);
    styleCer = "stroke-dasharray:"+stroke+";"+"stroke-width:1"+"stroke:"+coul+";"+"fill:"+coul;
    */
    styleCer = 'stroke-width:1;stroke:' + coul + ';' + 'fill:' + coul + ';'
    // Modifié version 6.3.0 pour gagner en rapidité
    // if ((this.absMaxiH - this.absMiniH <= 200)&& (this.absMaxiV - this.absMiniV <= 200)) {
    if ((this.absMaxiH - this.absMiniH <= 100) && (this.absMaxiV - this.absMiniV <= 100)) {
      for (p = this.absMiniH; p <= this.absMaxiH; p++) {
        for (q = this.absMiniV; q <= this.absMaxiV; q++) {
          x1 = this.o.x + p * this.u.x + q * this.v.x
          y1 = this.o.y + p * this.u.y + q * this.v.y
          cerc = cens('circle', {
            style: styleCer,
            cx: x1,
            cy: y1,
            // r : 1 // Modifié version 5.4
            r: 0.5
          })
          g.appendChild(cerc)
        }
      }
    }
  }
  // Ligne suivante modifiée version 6.5.2
  // g.setAttribute('pointer-events', 'none')
  g.setAttribute('pointer-events', this.pointerevents)
  return g
}
CRepere.prototype.trace = function (svg) {
  const g = this.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CRepere.prototype.update = function (svg) {
  const oldg = this.g
  const g = this.createg()
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  this.g = g
  if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
}
CRepere.prototype.confonduAvec = function (p) {
  if (p.className === this.className) return (this.o === p.o) && (this.i === p.i) && (this.j === p.j)
  else return false
}
CRepere.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.o === ancienPoint) this.o = nouveauPoint
  if (this.i === ancienPoint) this.i = nouveauPoint
  if (this.j === ancienPoint) this.j = nouveauPoint
}
CRepere.prototype.getNatureCalcul = function () {
  return NatCal.NRepere
}
CRepere.prototype.getNature = function () {
  return NatObj.NRepere
}
CRepere.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.o)
  liste.add(this.i)
  liste.add(this.j)
}
/**
 * Fonction renvoyant les coordonnées absolues d'un point de coordonnées (abs, ord) dans le repère
 * @param {number} abs
 * @param {number} ord
 * @returns {number[]} les coordonnées [x, y]
 */
CRepere.prototype.getAbsCoord = function (abs, ord) {
  const vec = new Vect()
  const unitex = this.unitex
  const unitey = this.unitey
  vec.x = abs * this.u.x / unitex + ord * this.v.x / unitey
  vec.y = abs * this.u.y / unitex + ord * this.v.y / unitey
  return [this.origine.x + vec.x, this.origine.y + vec.y]
}
/**
 * Fonction renvoyant les coordonnées dans le repère d'un point de coordonnées absolues (x, y)
 * @param {number}x
 * @param {number} y
 * @returns {number[]}
 */
CRepere.prototype.getCoord = function (x, y) {
  const ux = this.u.x
  const uy = this.u.y
  const vx = this.v.x
  const vy = this.v.y
  const d = ux * vy - uy * vx
  const ox = this.o.x
  const oy = this.o.y
  const x2 = x - ox
  const y2 = y - oy
  return [(vy * x2 - vx * y2) / d, (ux * y2 - uy * x2) / d]
}

CRepere.prototype.read = function (inps, list) {
  CElementLigne.prototype.read.call(this, inps, list)
  this.abscisseOrigine = new CValeur(list, 0)
  this.ordonneeOrigine = new CValeur(list, 0)
  this.u = new Vect()
  this.v = new Vect()
  this.droiteQuadrillage = new CDroite(list)
  this.droiteQuadrillage.donneStyle(StyleTrait.traitPointille)
  this.droiteQuadrillage.montre()
  this.origine = { x: 0, y: 0 }
  this.pointint = new Array(4)
  // Créer le tableau ne suffit pas, il faut instancier chaque membre
  for (let i = 0; i < 4; i++) this.pointint[i] = { x: 0, y: 0 }
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  const ind3 = inps.readInt()
  this.o = list.get(ind1, 'CPt')
  this.i = list.get(ind2, 'CPt')
  this.j = list.get(ind3, 'CPt')
  this.quadrillageVertical = inps.readBoolean()
  this.quadrillageHorizontal = inps.readBoolean()
  this.pointilles = inps.readBoolean()
  this.abscisseOrigine = new CValeur()
  this.abscisseOrigine.read(inps, list)
  this.ordonneeOrigine = new CValeur()
  this.ordonneeOrigine.read(inps, list)
  // Ajout version 3.9.5 : unité sur l'axe des abscisses et l'axe des ordonnées
  if (this.nVersion >= 2) {
    this.uniteX = new CValeur()
    this.uniteX.read(inps, list)
    this.uniteY = new CValeur()
    this.uniteY.read(inps, list)
  } else {
    this.uniteX = new CValeur(list, 1)
    this.uniteY = new CValeur(list, 1)
  }
}
CRepere.prototype.write = function (oups, list) {
  CElementLigne.prototype.write.call(this, oups, list)
  // Créer le tableau ne suffit pas, il faut instancier chaque membre
  // for (var i = 0; i < 4; i++) this.pointint[i] = { x: 0, y: 0 };
  const ind1 = list.indexOf(this.o)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.i)
  oups.writeInt(ind2)
  const ind3 = list.indexOf(this.j)
  oups.writeInt(ind3)
  oups.writeBoolean(this.quadrillageVertical)
  oups.writeBoolean(this.quadrillageHorizontal)
  oups.writeBoolean(this.pointilles)
  this.abscisseOrigine.write(oups, list)
  this.ordonneeOrigine.write(oups, list)
  this.uniteX.write(oups, list)
  this.uniteY.write(oups, list)
}
