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
import CSegment from './CSegment'
export default CGrapheSuiteRec

/**
 * Classe représentant le graphe d'une suite réelle de la formue u(n+1)=f[u(n)]
 * @constructor
 * @extends CElementLigne
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur du graphe
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Le style de trait utilisé pour le tracé.
 * @param {CSuiteRec} suiteAssociee  La suite récurrente dont c'est le graphe
 * @param {CRepere} repereAssocie  Le repère dans lequel est tracé le graphe.
 * @param {boolean} traitsDeRappelSurAbscisses  true si des traits "veticaux" sont utilisés pour le graphe.
 * @returns {CGrapheSuiteRec}
 */
function CGrapheSuiteRec (listeProprietaire, impProto, estElementFinal, couleur, masque, style, suiteAssociee, repereAssocie, traitsDeRappelSurAbscisses) {
  if (arguments.length === 1) CElementLigne.call(this, listeProprietaire)
  else {
    CElementLigne.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      true, 0, 0, masque, '', 16, style)
    this.suiteAssociee = suiteAssociee
    this.repereAssocie = repereAssocie
    this.traitsDeRappelSurAbscisses = traitsDeRappelSurAbscisses
  }

  this.point1 = new CPointDansRepere(null, this.repereAssocie)
  this.point2 = new CPointDansRepere(null, this.repereAssocie)
  this.seg = new CSegment(listeProprietaire, this.point1, this.point2)
}
CGrapheSuiteRec.prototype = new CElementLigne()
CGrapheSuiteRec.prototype.constructor = CGrapheSuiteRec
CGrapheSuiteRec.prototype.superClass = 'CElementLigne'
CGrapheSuiteRec.prototype.className = 'CGrapheSuiteRec'

CGrapheSuiteRec.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.suiteAssociee)
  const ind2 = listeSource.indexOf(this.repereAssocie)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CGrapheSuiteRec(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CSuiteRec'),
    listeCible.get(ind2, 'CRepere'), this.traitsDeRappelSurAbscisses)
}

CGrapheSuiteRec.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CElementLigne.prototype.depDe.call(this, p) || this.suiteAssociee.depDe(p) ||
    this.repereAssocie.depDe(p))
}
CGrapheSuiteRec.prototype.dependDePourBoucle = function (p) {
  return ((p === this)) || this.suiteAssociee.dependDePourBoucle(p) || this.repereAssocie.dependDePourBoucle(p)
}
CGrapheSuiteRec.prototype.getNature = function () {
  return NatObj.NGrapheSuiteRec
}
CGrapheSuiteRec.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.repereAssocie === p.repereAssocie) && (this.suiteAssociee === p.suiteAssociee)
  } else return false
}
CGrapheSuiteRec.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = (this.suiteAssociee.existe) && (this.repereAssocie.existe)
  // Cette classe doit mémoriser dans positionne() la valeur de dimfen
  this.dimf = dimfen
}
CGrapheSuiteRec.prototype.hasg = function (masquage, memeMasque = false) {
  return CElementLigne.prototype.hasg.call(this, masquage, memeMasque) && (this.suiteAssociee.indiceDernierTermeExistant !== 0)
}
CGrapheSuiteRec.prototype.createg = function () {
  let path
  let style = ''
  const stroke = this.style.stroke
  if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
  const strokewidth = this.style.strokeWidth
  style += 'stroke-width:' + strokewidth + ';'
  // style += 'stroke:' + this.color + ';' // Modifié version 6.9.1
  style += 'stroke:' + this.color + ';opacity:' + this.couleur.opacity + ';'
  style += 'fill:none'
  const polyline = cens('polyline', {
    style,
    points: this.getPointsForPolyline()
  })
  const g = cens('g', {
    style,
    // Ligne suivante modifiée version 6.5.2
    // 'pointer-events': 'none'
    'pointer-events': this.pointerevents
  })
  g.appendChild(polyline)
  if (this.traitsDeRappelSurAbscisses) {
    path = cens('path', {
      style,
      d: this.getdForPath()
    })
    g.appendChild(path)
  }
  return g
}
// Modifié version 5.0.3 pour gérer les coordonnées trop grandes
// Et la variable i était globale !
CGrapheSuiteRec.prototype.getPointsForPolyline = function () {
  let p = ''
  let i, x1, y1, x2, y2
  for (i = 1; i <= this.suiteAssociee.indiceDernierTermeExistant; i++) {
    if (i === 1) {
      this.point1.abs.donneValeur(this.suiteAssociee.valeurs[0])
      this.point1.ord.donneValeur(this.suiteAssociee.valeurs[1])
      this.point2.abs.donneValeur(this.suiteAssociee.valeurs[1])
      this.point2.ord.donneValeur(this.suiteAssociee.valeurs[1])
      this.point1.positionne(false, this.dimf)
      this.point2.positionne(false, this.dimf)
      x1 = this.point1.x
      y1 = this.point1.y
      x2 = this.point2.x
      y2 = this.point2.y
      if (!testToile(x1, y1) || !testToile(x2, y2)) return ''
      p += x1 + ',' + y1 + ' ' + x2 + ',' + y2 + ' '
    } else {
      this.point1.abs.donneValeur(this.suiteAssociee.valeurs[i - 1])
      this.point1.ord.donneValeur(this.suiteAssociee.valeurs[i])
      this.point1.positionne(false, this.dimf)
      x1 = this.point1.x
      y1 = this.point1.y
      this.point2.abs.donneValeur(this.suiteAssociee.valeurs[i])
      this.point2.ord.donneValeur(this.suiteAssociee.valeurs[i])
      this.point2.positionne(false, this.dimf)
      x2 = this.point2.x
      y2 = this.point2.y
      if (!testToile(x1, y1) || !testToile(x2, y2)) return p
      p += x1 + ',' + y1 + ' ' + x2 + ',' + y2 + ' '
    }
  }
  return p
}
// Modifié version 5.0.3 pour gérer les coordonnées trop grandes
// Et les variables i et d étaient globale !
CGrapheSuiteRec.prototype.getdForPath = function () {
  let d = ''
  let i, x1, y1, x2, y2
  for (i = 0; i < this.suiteAssociee.indiceDernierTermeExistant; i++) {
    this.point1.abs.donneValeur(this.suiteAssociee.valeurs[i])
    this.point1.ord.donneValeur(0)
    this.point2.abs.donneValeur(this.suiteAssociee.valeurs[i])
    this.point2.ord.donneValeur(this.suiteAssociee.valeurs[i + 1])
    this.point1.positionne(false, this.dimf)
    this.point2.positionne(false, this.dimf)
    x1 = this.point1.x
    y1 = this.point1.y
    x2 = this.point2.x
    y2 = this.point2.y
    if (!testToile(x1, y1) || !testToile(x2, y2)) return d
    d = d + 'M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2
  }
  this.point1.abs.donneValeur(this.suiteAssociee.valeurs[i])
  this.point1.ord.donneValeur(0)
  this.point2.abs.donneValeur(this.suiteAssociee.valeurs[i])
  this.point2.ord.donneValeur(this.suiteAssociee.valeurs[i])
  this.point1.positionne(false, this.dimf)
  this.point2.positionne(false, this.dimf)
  x1 = this.point1.x
  y1 = this.point1.y
  x2 = this.point2.x
  y2 = this.point2.y
  if (!testToile(x1, y1) || !testToile(x2, y2)) return d
  d += 'M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2
  return d
}
CGrapheSuiteRec.prototype.trace = function (svg) {
  const g = this.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CGrapheSuiteRec.prototype.update = function () {
  const g = this.g
  const pol = g.childNodes[0]
  pol.setAttribute('points', this.getPointsForPolyline())
  if (this.traitsDeRappelSurAbscisses) {
    g.childNodes[1].setAttribute('d', this.getdForPath())
  }
}
CGrapheSuiteRec.prototype.chaineDesignation = function () {
  return 'desGrapheSuiteRec'
}
CGrapheSuiteRec.prototype.read = function (inps, list) {
  CElementLigne.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.suiteAssociee = list.get(ind1, 'CSuiteRec')
  this.repereAssocie = list.get(ind2, 'CRepere')
  this.traitsDeRappelSurAbscisses = inps.readBoolean()
  this.point1.rep = this.repereAssocie
  this.point2.rep = this.repereAssocie
}
CGrapheSuiteRec.prototype.write = function (oups, list) {
  CElementLigne.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.suiteAssociee)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.repereAssocie)
  oups.writeInt(ind2)
  oups.writeBoolean(this.traitsDeRappelSurAbscisses)
}

CGrapheSuiteRec.prototype.setgLineStyle = function (style) {
  const g = this.g
  if (g) {
    for (let i = 0; i < g.childNodes.length; i++) {
      const gel = g.childNodes[i]
      gel.style['stroke-dasharray'] = style.getStroke()
      gel.style['stroke-width'] = style.strokeWidth
    }
  }
}

// Fonction ajoutée version 6.5.2 pour permettre de modifier directement des éléments de la figure
CGrapheSuiteRec.prototype.setgColor = function () {
  const g = this.g
  if (g) {
    for (let i = 0; i < g.childNodes.length; i++) {
      g.childNodes[i].style.stroke = this.color
      // Ligne suivante ajoutée version 6.9.1
      g.childNodes[i].style.opacity = this.couleur.opacity
    }
  }
}
