/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import StyleMarqueAngle from '../types/StyleMarqueAngle'
import Vect from '../types/Vect'
import { zeroAngle } from '../kernel/kernel'
import CCercle from './CCercle'
import CMarqueSegment from './CMarqueSegment'
import CSegment from './CSegment'
import CPointBase from './CPointBase'
import { defaultSurfOpacity } from '../objets/CMathGraphDoc'
export default CMarqueAngleAncetre

/**
 * Classe ancêtre de toutes les marques d'angle.
 * @constructor
 * @extends CCercle
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Donne le style trait utilisé.
 * @param {StyleMarqueAngle} styleMarque  Donne le style de la marque.
 * @param {number} rayon  Le rayon de l'arc.
 * @param {boolean} fixed true si la marque d'angle est punaisée et ne peut pas être capturé à la souris
 * @returns {CMarqueAngleAncetre}
 */
function CMarqueAngleAncetre (listeProprietaire, impProto, estElementFinal, couleur, masque,
  style, styleMarque, rayon, fixed = false) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CCercle.call(this, listeProprietaire)
  else {
    CCercle.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, style)
    this.styleMarque = styleMarque
    this.rayon = rayon
  }
  this.u = new Vect()
  this.v = new Vect()
  this.point1 = new CPointBase()
  this.point2 = new CPointBase()
  this.pointc = new CPointBase()
  this.segment1 = new CSegment(listeProprietaire, this.point2, this.pointc)
  this.marqueSegment = new CMarqueSegment(listeProprietaire, null, false, null, false, style,
    StyleMarqueAngle.styleMarqueSegment(styleMarque), this.segment1)
  this.fixed = fixed
}
CMarqueAngleAncetre.prototype = new CCercle()
CMarqueAngleAncetre.prototype.constructor = CMarqueAngleAncetre
CMarqueAngleAncetre.prototype.superClass = 'CCercle'
CMarqueAngleAncetre.prototype.className = 'CMarqueAngleAncetre'

CMarqueAngleAncetre.prototype.numeroVersion = function () {
  return 2
}

CMarqueAngleAncetre.prototype.setClone = function (ptel) {
  CCercle.prototype.setClone.call(this, ptel)
  ptel.u.setCopy(this.u)
  ptel.v.setCopy(this.v)
  this.point1.placeEn(ptel.point1)
  this.point2.placeEn(ptel.point2)
  this.pointc.placeEn(ptel.pointc)
  this.ang1rad = ptel.ang1rad
  this.ang2rad = ptel.ang2rad
}
CMarqueAngleAncetre.prototype.getNature = function () {
  return NatObj.NMarqueAngle
}
/**
 * Utilisé lorsque l'angle est droit.
 * @returns {void}
 */
CMarqueAngleAncetre.prototype.prepareAngleDroit = function () {
  const u1 = new Vect()
  const v1 = new Vect()
  const normeu = this.u.norme()
  const normev = this.v.norme()
  u1.x = this.u.x / normeu * this.rayon
  u1.y = this.u.y / normeu * this.rayon
  v1.x = this.v.x / normev * this.rayon
  v1.y = this.v.y / normev * this.rayon
  this.point1.x = this.centreX + v1.x
  this.point1.y = this.centreY + v1.y
  this.pointc.x = this.point1.x + u1.x
  this.pointc.y = this.point1.y + u1.y
  this.point2.x = this.centreX + u1.x
  this.point2.y = this.centreY + u1.y
}
/**
 * Renvoie le svg element qui représente la marque d'angle quand l'angle est droit.
 * @returns {SVGElement}
 */
CMarqueAngleAncetre.prototype.creategAngleDroit = function () {
  let line, pol, points
  const g = cens('g', {
    // Ligne suivante modifiée version 6.5.2
    // 'pointer-events': 'none'
    'pointer-events': this.pointerevents
  })
  let style = ''
  const stroke = this.style.stroke
  if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
  const strokewidth = this.style.strokeWidth
  const color = this.couleur.rgbWithoutOpacity()
  style += 'stroke-width:' + strokewidth + ';'
  // style += "stroke:"+this.couleur.rgb()+";"; Modifié version 4.9.9.4
  // style += 'stroke:' + this.color + ';' // Modifié version 6.9.1
  style += 'stroke:' + color + ';opacity:1'
  line = cens('line', {
    x1: this.point1.x,
    y1: this.point1.y,
    x2: this.pointc.x,
    y2: this.pointc.y,
    style
  })
  g.appendChild(line)
  line = cens('line', {
    x1: this.point2.x,
    y1: this.point2.y,
    x2: this.pointc.x,
    y2: this.pointc.y,
    style
  })
  g.appendChild(line)
  if ((this.styleMarque & StyleMarqueAngle.marqueRemplie) !== 0) {
    points = this.centreX + ',' + this.centreY + ' ' + this.point1.x + ',' + this.point1.y + ' ' +
      this.pointc.x + ',' + this.pointc.y + ' ' + this.point2.x + ' ' + this.point2.y
    style = 'stroke:none;'
    style += 'fill-opacity:' + this.couleur.opacity + ';'
    // style += "fill:"+this.couleur.rgb()+";"; Modifié version 4.9.9.4
    style += 'fill:' + color + ';'
    pol = cens('polygon', {
      style,
      points
    })
    g.appendChild(pol)
  }
  return g
}
/**
 * Renvoie le svg element qui représente la marque d'angle quand l'angle n'est pas droit.
 * @param {number} xdeb  Abscisse du point de départ de l'angle.
 * @param {number} ydeb  Ordonnée du point de départ de l'angle.
 * @param {number} xcentre  Abscisse du centre de l'arc.
 * @param {number} ycentre  Ordonnée du centre de l'arc.
 * @param {number} ang  L'angle au centre.
 * @returns {SVGElement}
 */
CMarqueAngleAncetre.prototype.creategMarqueAngle = function (xdeb, ydeb, xcentre, ycentre, ang) {
  let line, xmilieu, ymilieu, xc1, yc1, ang2
  const g = cens('g')
  let style = ''
  const stroke = this.style.stroke
  if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
  const strokewidth = this.style.strokeWidth
  const color = this.couleur.rgbWithoutOpacity()
  style += 'stroke-width:' + strokewidth + ';'
  // style += "stroke:"+this.couleur.rgb()+";"; Modifié version 4.9.9.4
  style += 'stroke:' + color + ';'
  const vec1 = new Vect(xcentre, ycentre, xdeb, ydeb)
  const vec = new Vect()
  const vect2 = new Vect()
  vec1.tourne(ang / 2, vec)
  const nvec = vec.norme()
  vec.x = vec.x / nvec
  vec.y = vec.y / nvec
  // Modification version 8.6 pour tenir compte des figures haute résolution
  const list = this.listeProprietaire
  const coef = list.coefMult ? list.coefMult : 1
  const demilong = 5 * coef
  switch (this.styleMarque) {
    case StyleMarqueAngle.marqueSimple1Trait :
    case StyleMarqueAngle.marquePleine1Trait :
      xmilieu = this.centreX + vec.x * this.rayon
      ymilieu = this.centreY + vec.y * this.rayon
      line = cens('line', {
        x1: xmilieu - vec.x * demilong,
        y1: ymilieu - vec.y * demilong,
        x2: xmilieu + vec.x * demilong,
        y2: ymilieu + vec.y * demilong,
        style
      })
      g.appendChild(line)
      break
    case StyleMarqueAngle.marqueSimple2Traits :
    case StyleMarqueAngle.marquePleine2Traits :
      ang2 = Math.atan(3 / this.rayon) // Environ 10 pixels entre les deux traits
      vec.tourne(ang2, vect2)
      xc1 = this.centreX + vect2.x * this.rayon
      yc1 = this.centreY + vect2.y * this.rayon
      line = cens('line', {
        x1: xc1 - vec.x * demilong,
        y1: yc1 - vec.y * demilong,
        x2: xc1 + vec.x * demilong,
        y2: yc1 + vec.y * demilong,
        style
      })
      g.appendChild(line)
      vec.tourne(-ang2, vect2)
      xc1 = this.centreX + vect2.x * this.rayon
      yc1 = this.centreY + vect2.y * this.rayon
      line = cens('line', {
        x1: xc1 - vec.x * demilong,
        y1: yc1 - vec.y * demilong,
        x2: xc1 + vec.x * demilong,
        y2: yc1 + vec.y * demilong,
        style
      })
      g.appendChild(line)
      break
    case StyleMarqueAngle.marqueSimple3Traits :
    case StyleMarqueAngle.marquePleine3Traits :
      xmilieu = this.centreX + vec.x * this.rayon
      ymilieu = this.centreY + vec.y * this.rayon
      line = cens('line', {
        x1: xmilieu - vec.x * demilong,
        y1: ymilieu - vec.y * demilong,
        x2: xmilieu + vec.x * demilong,
        y2: ymilieu + vec.y * demilong,
        style
      })
      g.appendChild(line)
      ang2 = Math.atan(5 / this.rayon) // Environ 5 pixels entre les deux traits
      vec.tourne(ang2, vect2)
      xc1 = this.centreX + vect2.x * this.rayon
      yc1 = this.centreY + vect2.y * this.rayon
      line = cens('line', {
        x1: xc1 - vec.x * demilong,
        y1: yc1 - vec.y * demilong,
        x2: xc1 + vec.x * demilong,
        y2: yc1 + vec.y * demilong,
        style
      })
      g.appendChild(line)
      vec.tourne(-ang2, vect2)
      xc1 = this.centreX + vect2.x * this.rayon
      yc1 = this.centreY + vect2.y * this.rayon
      line = cens('line', {
        x1: xc1 - vec.x * demilong,
        y1: yc1 - vec.y * demilong,
        x2: xc1 + vec.x * demilong,
        y2: yc1 + vec.y * demilong,
        style
      })
      g.appendChild(line)
      break
    case StyleMarqueAngle.marqueSimpleCroix :
    case StyleMarqueAngle.marquePleineCroix :
      xmilieu = this.centreX + vec.x * this.rayon
      ymilieu = this.centreY + vec.y * this.rayon
      vec.tourne(Math.PI / 4, vect2)
      line = cens('line', {
        x1: xmilieu - vect2.x * demilong,
        y1: ymilieu - vect2.y * demilong,
        x2: xmilieu + vect2.x * demilong,
        y2: ymilieu + vect2.y * demilong,
        style
      })
      g.appendChild(line)
      vec.tourne(-Math.PI / 4, vect2)
      line = cens('line', {
        x1: xmilieu - vect2.x * demilong,
        y1: ymilieu - vect2.y * demilong,
        x2: xmilieu + vect2.x * demilong,
        y2: ymilieu + vect2.y * demilong,
        style
      })
      g.appendChild(line)
  }
  // Ligne suivante modifiée version 6.5.2
  // g.setAttribute('pointer-events', 'none')
  g.setAttribute('pointer-events', this.pointerevents)
  return g
}
CMarqueAngleAncetre.prototype.createg = function (svg, couleurFond) {
  let style
  const n = this.className
  const skipRightAngle = ((n === 'CMarqueAngleOrienteDirecte') && this.angleDroit && (this.angle < 0)) ||
    ((n === 'CMarqueAngleOrienteIndirecte') && this.angleDroit && (this.angle > 0))
  if (this.angleDroit && !skipRightAngle) return CMarqueAngleAncetre.prototype.creategAngleDroit.call(this)
  const mesureAngle = this.anglePourArc()
  const g = cens('g', {
    // Ligne suivante modifiée version 6.5.2
    // 'pointer-events': 'none'
    'pointer-events': this.pointerevents
  })
  const p = this.path(mesureAngle)
  style = ''
  const stroke = this.style.stroke
  const color = this.couleur.rgbWithoutOpacity()
  if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
  const strokewidth = this.style.strokeWidth
  style += 'stroke-width:' + strokewidth + ';'
  // style += "stroke:"+this.couleur.rgb()+";fill:none"; Modifié version 4.9.9.4
  // style += 'stroke:' + this.color + ';fill:none' // Modifié version 6.9.1
  style += 'stroke:' + color + ';fill:none;opacity:1'
  const path = cens('path', {
    d: p,
    style
  })
  g.appendChild(path)
  const p2 = p + 'L' + this.o.x + ',' + this.o.y + 'Z'
  style = 'stroke:none;'
  if ((this.styleMarque & StyleMarqueAngle.marqueRemplie) !== 0) {
    style += 'fill-opacity:' + this.couleur.opacity + ';'
    // style += "fill:"+this.couleur.rgb()+";"; Modifié version 4.9.9.4
    style += 'fill:' + color + ';'
  } else style += 'fill:none'
  const path2 = cens('path', {
    d: p2,
    style
  })
  g.appendChild(path2)
  if ((this.styleMarque & StyleMarqueAngle.marqueAvecTrait) !== 0) {
    g.appendChild(this.creategMarqueAngle(this.a.x, this.a.y, this.o.x, this.o.y, mesureAngle))
  }
  return g
}
/**
 * Renvoie l'angle au centre pour tracer l'arc.
 * @returns {number}
 */
CMarqueAngleAncetre.prototype.anglePourArc = function () {
  let mes = this.u.mesureAngleVecteurs(this.v)
  if (zeroAngle(Math.PI - Math.abs(mes))) mes = Math.PI
  return mes
}
CMarqueAngleAncetre.prototype.chaineDesignation = function () {
  return 'desMarqueAngle'
}
CMarqueAngleAncetre.prototype.read = function (inps, list) {
  CCercle.prototype.read.call(this, inps, list)
  if (this.nVersion === 1) this.styleMarque = 0
  else this.styleMarque = inps.readInt()
  const numeroVersion = list.numeroVersion
  if (numeroVersion < 20) {
    if (list.documentProprietaire) this.couleur.opacity = list.documentProprietaire.opacity
    else this.couleur.opacity = defaultSurfOpacity
    this.color = this.couleur.rgb()
  }
  this.rayon = inps.readDouble()
  // Depuis le n° de version 21 (version 8.1) les marques d'angles peuvent être punaisés
  if (numeroVersion < 21) {
    this.fixed = false
  } else {
    this.fixed = inps.readBoolean()
  }
}
CMarqueAngleAncetre.prototype.write = function (oups, list) {
  CCercle.prototype.write.call(this, oups, list)
  oups.writeInt(this.styleMarque)
  oups.writeDouble(this.rayon)
  oups.writeBoolean(this.fixed)
}

// Fonction ajoutée version 6.5.2 pour permettre de modifier directement des éléments de la figure
CMarqueAngleAncetre.prototype.setgColor = function () {
  const g = this.g
  if (g) {
    g.childNodes[0].style.stroke = this.color
    // Ligne suivante ajoutée version 6.9.1
    g.childNodes[0].style.opacity = this.couleur.opacity
    if ((this.styleMarque & StyleMarqueAngle.marqueRemplie) !== 0) {
      g.childNodes[1].style.fill = this.color
    }
    if ((this.styleMarque & StyleMarqueAngle.marqueAvecTrait) !== 0) {
      const gtraits = g.childNodes[2]
      for (let j = 0; j < gtraits.childNodes.length; j++) {
        gtraits.childNodes[j].style.stroke = this.color
        // Ligne suivante ajouté version 6.9.1
        gtraits.childNodes[j].style.opacity = this.couleur.opacity
      }
    }
    return true
  } else return false
}
