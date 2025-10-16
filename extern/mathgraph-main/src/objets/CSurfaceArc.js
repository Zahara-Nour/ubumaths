import CSurface from './CSurface'
import CPointLieCercle from './CPointLieCercle'
import MotifPoint from '../types/MotifPoint'
import CPointBase from './CPointBase'
import CSegment from './CSegment'
export default CSurfaceArc

const nbPointsSurArc = 200

/**
 * Surface délimitée par un arc de cercle et sa corde.
 * @constructor
 * @extends CSurface
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleRemplissage} styleRemplissage  Entier donnant le style de remplissage.
 * @param {CCercle} bord  Le cercle bord de la surface.
 * @returns {CSurfaceDisque}
 */
function CSurfaceArc (listeProprietaire, impProto, estElementFinal, couleur, masque, styleRemplissage, bord) {
  if (arguments.length === 1) CSurface.call(this, listeProprietaire)
  else {
    CSurface.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, styleRemplissage, bord)
    // Il est indispensable d'instancier this.arc car ce type de surface peut générer un lieu d'objets
    // et quand on veut désigner un tel lieu d'objets c'est cet arc qui est utilisé pour savoir si
    // le pointeur souris est proche ou non du lieu d'objets
    this.arc = bord.getClone(listeProprietaire, listeProprietaire)
    this.pointDebut = new CPointBase()
    this.pointFin = new CPointBase()
    // Le segment sert à pouvoir désigner la surface quand on est sur la corde
    this.segment = new CSegment(listeProprietaire, this.pointDebut, this.pointFin)
    this.pointLieArc = new CPointLieCercle(listeProprietaire, null, false, this.couleur, true, 0, 0,
      true, '', 16, MotifPoint.rond, false, false, 0, bord)
    this.abscisses = new Array(nbPointsSurArc + 1)
    this.ordonnees = new Array(nbPointsSurArc + 1)
  }
}
CSurfaceArc.prototype = new CSurface()
CSurfaceArc.prototype.constructor = CSurfaceArc
CSurfaceArc.prototype.superClass = 'CSurface'
CSurfaceArc.prototype.className = 'CSurfaceArc'

CSurfaceArc.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.bord)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CSurfaceArc(listeCible, listeCible.get(ind2, 'CImplementationProto'), this.estElementFinal, this.couleur, this.masque, this.styleRemplissage, listeCible.get(ind1, 'CArcDeCercle'))
}

CSurfaceArc.prototype.setClone = function (ptel) {
  CSurface.prototype.setClone.call(this, ptel)
  this.arc.setClone(ptel.arc)
  this.segment.setClone(ptel.segment)
  if (ptel.existe) {
    for (let i = 0; i <= nbPointsSurArc; i++) {
      this.abscisses[i] = ptel.abscisses[i]
      this.ordonnees[i] = ptel.ordonnees[i]
    }
  }
}

CSurfaceArc.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.bord)
}

CSurfaceArc.prototype.positionne = function (infoRandom, dimfen) {
  CSurface.prototype.positionne.call(this, infoRandom, dimfen)
  if (!this.existe) return
  this.arc.setClone(this.bord)
  const absMin = this.bord.abscisseMinimale()
  const absMax = this.bord.abscisseMaximale()
  let abs = absMin
  const delta = (absMax - absMin) / (nbPointsSurArc - 1)
  for (let i = 0; i < nbPointsSurArc; i++) {
    this.pointLieArc.donneAbscisse(abs)
    this.pointLieArc.positionne(infoRandom, dimfen)
    this.abscisses[i] = this.pointLieArc.x
    this.ordonnees[i] = this.pointLieArc.y
    if (i === 0) this.pointDebut.placeEn(this.pointLieArc.x, this.pointLieArc.y)
    else {
      if (i === nbPointsSurArc - 1) {
        this.pointFin.placeEn(this.pointLieArc.x, this.pointLieArc.y)
      }
    }
    this.segment.positionne(infoRandom, dimfen)
    abs += delta
  }
  this.abscisses[nbPointsSurArc] = this.abscisses[0]
  this.ordonnees[nbPointsSurArc] = this.ordonnees[0]
}

CSurfaceArc.prototype.creePoints = function () {
  let j; let points = ''
  for (j = 0; j <= nbPointsSurArc; j++) {
    points = points + this.abscisses[j] + ','
    points = points + this.ordonnees[j] + ' '
  }
  return points
}

CSurfaceArc.prototype.read = function (inps, list) {
  CSurface.prototype.read.call(this, inps, list)
  this.arc = this.bord.getClone(this.listeProprietaire, this.listeProprietaire)
  this.pointDebut = new CPointBase()
  this.pointFin = new CPointBase()
  // Le segment sert à pouvoir désigner la surface quand on est sur la corde
  this.segment = new CSegment(list, this.pointDebut, this.pointFin)
  this.pointLieArc = new CPointLieCercle(list, null, false, this.couleur, true, 0, 0,
    true, '', 16, MotifPoint.rond, false, false, 0, this.bord)
  if (list.className !== 'CPrototype') {
    this.abscisses = new Array(nbPointsSurArc + 1)
    this.ordonnees = new Array(nbPointsSurArc + 1)
  }
}
