/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Vect from '../types/Vect'
import { distancePointPoint } from '../kernel/kernel'
import CPointAncetrePointsMobiles from './CPointAncetrePointsMobiles'
import CValeur from './CValeur'
export default CPointBaseEnt

/**
 * Point libre à coordonnées entières dans un repère.
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
 * @param {CRepere} rep  Le repère associé.
 * @param {boolean} absLibres  true si le point est libre horizontalement
 * @param {boolean} ordLibres  true si le point est libre verticalement
 * @param {CValeur} absMin  abscisse mini quand le point n'est pas libre horizontalement
 * @param {CValeur} absMax  abscisse maxi quand le point n'est pas libre horizontalement
 * @param {CValeur} ordMin  ordonnée mini quand le point n'est pas libre verticalement
 * @param {CValeur} ordMax  Ordonnée maxi quand le point n'est pas libre verticalement
 * @param {number} abs  L'abscisse  (entière)
 * @param {number} ord  L'ordonnée (entière)
 * @returns {void}
 */
function CPointBaseEnt (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace,
  fixed, rep, absLibres, ordLibres,
  absMin, absMax, ordMin, ordMax, abs, ord) {
  if (arguments.length === 1) CPointAncetrePointsMobiles.call(this, listeProprietaire)
  else {
    CPointAncetrePointsMobiles.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace, fixed)
    this.rep = rep
    this.absLibres = absLibres
    this.ordLibres = ordLibres
    this.absMin = absMin
    this.absMax = absMax
    this.ordMin = ordMin
    this.ordMax = ordMax
    this.abs = abs
    this.ord = ord
  }
}
CPointBaseEnt.prototype = new CPointAncetrePointsMobiles()
CPointBaseEnt.prototype.constructor = CPointBaseEnt
CPointBaseEnt.prototype.superClass = 'CPointAncetrePointsMobiles'
CPointBaseEnt.prototype.className = 'CPointBaseEnt'

CPointBaseEnt.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.rep)
  const ind2 = listeSource.indexOf(this.impProto)
  const absMinClone = this.absMin.getClone(listeSource, listeCible)
  const absMaxClone = this.absMax.getClone(listeSource, listeCible)
  const ordMinClone = this.ordMin.getClone(listeSource, listeCible)
  const ordMaxClone = this.ordMax.getClone(listeSource, listeCible)

  return new CPointBaseEnt(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque,
    this.nom, this.tailleNom, this.motif, this.marquePourTrace, this.fixed, listeCible.get(ind1, 'CRepere'),
    this.absLibres, this.ordLibres, absMinClone, absMaxClone, ordMinClone, ordMaxClone, this.abs, this.ord)
}

CPointBaseEnt.prototype.getNature = function () {
  return NatObj.NPointBaseEnt
}

CPointBaseEnt.prototype.initialisePourDependance = function () {
  CPointAncetrePointsMobiles.prototype.initialisePourDependance.call(this)
  if (!this.absLibres) {
    this.absMin.initialisePourDependance()
    this.absMax.initialisePourDependance()
  }
  if (!this.ordLibres) {
    this.ordMin.initialisePourDependance()
    this.ordMax.initialisePourDependance()
  }
}

CPointBaseEnt.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  let res = CPointAncetrePointsMobiles.prototype.depDe.call(this, p) || this.rep.depDe(p)
  if (!this.absLibres) res = res || this.absMin.depDe(p) || this.absMax.depDe(p)
  if (!this.ordLibres) res = res || this.ordMin.depDe(p) || this.ordMax.depDe(p)
  return this.memDep(res)
}

CPointBaseEnt.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.rep.dependDePourBoucle(p)
}

CPointBaseEnt.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.rep?.existe
  if (!this.existe) return
  let min, max, absor, ordor
  if (!this.absLibres) {
    this.absMin.positionne(infoRandom, dimfen)
    this.absMax.positionne(infoRandom, dimfen)
    this.existe = this.existe && this.absMin.existe && this.absMax.existe
    if (this.existe) {
      min = this.absMin.rendValeur()
      max = this.absMax.rendValeur()
      absor = this.rep.abscisseOrigine.rendValeur()
      this.absmin = Math.round((min - absor) / this.rep.unitex)
      this.absmax = Math.round((max - absor) / this.rep.unitex)
      this.existe = (this.absmin <= this.absmax)
      if (this.existe) {
        if (this.abs < this.absmin) this.abs = this.absmin
        else {
          if (this.abs > this.absmax) this.abs = this.absmax
        }
      } else return
    } else return
  }
  if (!this.ordLibres) {
    this.ordMin.positionne(infoRandom, dimfen)
    this.ordMax.positionne(infoRandom, dimfen)
    this.existe = this.existe && this.ordMin.existe && this.ordMax.existe
    if (this.existe) {
      min = this.ordMin.rendValeur()
      max = this.ordMax.rendValeur()
      ordor = this.rep.ordonneeOrigine.rendValeur()
      this.ordmin = Math.round((min - ordor) / this.rep.unitey)
      this.ordmax = Math.round((max - ordor) / this.rep.unitey)
      this.existe = (this.ordmin <= this.ordmax)
      if (this.existe) {
        if (this.ord < this.ordmin) this.ord = this.ordmin
        else {
          if (this.ord > this.ordmax) this.ord = this.ordmax
        }
      } else return
    } else return
  }
  const vec = new Vect()
  vec.x = this.abs * this.rep.u.x + this.ord * this.rep.v.x
  vec.y = this.abs * this.rep.u.y + this.ord * this.rep.v.y
  this.x = this.rep.o.x + vec.x
  this.y = this.rep.o.y + vec.y
  CPointAncetrePointsMobiles.prototype.positionne.call(this, infoRandom, dimfen)
}

CPointBaseEnt.prototype.testDeplacement = function (dimfen, xtest, ytest, pointr) {
  const x1 = new Array(4)
  const y1 = new Array(4)
  let xr, yr

  if (!this.testFenetre(dimfen, xtest, ytest)) return false
  const ux = this.rep.u.x
  const uy = this.rep.u.y
  const vx = this.rep.v.x
  const vy = this.rep.v.y
  const d = ux * vy - uy * vx
  const ox = this.rep.o.x
  const oy = this.rep.o.y

  const x2 = xtest - ox
  const y2 = ytest - oy
  const ab = (vy * x2 - vx * y2) / d
  const or = (ux * y2 - uy * x2) / d
  const abint = Math.floor(ab)
  const orint = Math.floor(or)
  if ((ab - abint) <= 0.5) xr = abint; else xr = abint + 1
  if ((or - orint) <= 0.5) yr = orint; else yr = orint + 1
  const vec = new Vect()
  vec.x = xr * ux + yr * vx
  vec.y = xr * uy + yr * vy
  const xt = ox + vec.x
  const yt = oy + vec.y
  if (!this.testFenetre(dimfen, xt, yt)) {
    x1[0] = abint
    y1[0] = orint
    x1[1] = abint + 1
    y1[1] = orint
    x1[2] = abint + 1
    y1[2] = orint + 1
    x1[3] = abint
    y1[3] = orint + 1
    let dis = 1 // La distance mini est au plus égale à 1
    let ind = 0
    for (let i = 0; i < 4; i++) {
      if (this.testFenetre(dimfen, x1[i], y1[i])) {
        const d1 = distancePointPoint(ab, or, x1[i], y1[i])
        if (d1 < dis) {
          ind = i
          dis = d1
        }
      }
    }
    xr = x1[ind]
    yr = y1[ind]
  }
  if (!this.absLibres) {
    if (xr < this.absmin) xr = this.absmin
    else {
      if (xr > this.absmax) xr = this.absmax
    }
  }
  if (!this.ordLibres) {
    if (yr < this.ordmin) yr = this.ordmin
    else {
      if (yr > this.ordmax) yr = this.ordmax
    }
  }
  pointr.x = xr
  pointr.y = yr
  return true
}

CPointBaseEnt.prototype.placeEn = function (xn, yn) {
  this.existe = true
  this.abs = xn
  this.ord = yn
  this.horsEcran = !(this.testToile())
  this.positionneNom()
}

CPointBaseEnt.prototype.read = function (inps, list) {
  CPointAncetrePointsMobiles.prototype.read.call(this, inps, list)
  this.absMin = new CValeur()
  this.absMax = new CValeur()
  this.ordMin = new CValeur()
  this.ordMax = new CValeur()
  const ind1 = inps.readInt()
  this.rep = list.get(ind1, 'CRepere')
  this.abs = inps.readDouble()
  this.ord = inps.readDouble()
  this.absLibres = inps.readBoolean()
  this.ordLibres = inps.readBoolean()
  if (!this.absLibres) {
    this.absMin.read(inps, list)
    this.absMax.read(inps, list)
  } else {
    this.absMin.donneValeur(-5)
    this.absMax.donneValeur(5)
  }
  if (!this.ordLibres) {
    this.ordMin.read(inps, list)
    this.ordMax.read(inps, list)
  } else {
    this.ordMin.donneValeur(-5)
    this.ordMax.donneValeur(5)
  }
}

CPointBaseEnt.prototype.write = function (oups, list) {
  CPointAncetrePointsMobiles.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.rep)
  oups.writeInt(ind1)
  oups.writeDouble(this.abs)
  oups.writeDouble(this.ord)
  oups.writeBoolean(this.absLibres)
  oups.writeBoolean(this.ordLibres)
  if (!this.absLibres) {
    this.absMin.write(oups, list)
    this.absMax.write(oups, list)
  }
  if (!this.ordLibres) {
    this.ordMin.write(oups, list)
    this.ordMax.write(oups, list)
  }
}
