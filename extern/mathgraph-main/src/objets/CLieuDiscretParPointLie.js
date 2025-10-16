/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { testToile } from '../kernel/kernel'
import CLieuDiscretDeBase from './CLieuDiscretDeBase'
export default CLieuDiscretParPointLie

/**
 * Classe représentant un lieu de points non reliés généré par un point lié.
 * @constructor
 * @extends CLieuDiscretDeBase
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la liste propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} masque  true si l'objet est masqué
 * @param {CPt} pointATracer  Le point qui laisse une trace.
 * @param {number} nombreDePoints  Le nombre de points du lieu
 * @param {MotifPoint} motif  Le motif utilisé pour la trace des points.
 * @param {CPointLie} pointLieGenerateur  Le point lié dont les positions génèrent le lieu.
 * @returns {CLieuDiscretParPointLie}
 */
function CLieuDiscretParPointLie (listeProprietaire, impProto, estElementFinal, couleur, masque,
  pointATracer, nombreDePoints, motif, pointLieGenerateur) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CLieuDiscretDeBase.call(this, listeProprietaire)
    else {
      CLieuDiscretDeBase.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        masque, pointATracer, nombreDePoints, motif)
      this.pointLieGenerateur = pointLieGenerateur
    }
  }
}
CLieuDiscretParPointLie.prototype = new CLieuDiscretDeBase()
CLieuDiscretParPointLie.prototype.constructor = CLieuDiscretParPointLie
CLieuDiscretParPointLie.prototype.superClass = 'CLieuDiscretDeBase'
CLieuDiscretParPointLie.prototype.className = 'CLieuDiscretParPointLie'

CLieuDiscretParPointLie.prototype.numeroVersion = function () {
  return 2
}

CLieuDiscretParPointLie.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.pointATracer)
  const ind2 = listeSource.indexOf(this.pointLieGenerateur)
  const ind3 = listeSource.indexOf(this.impProto)
  const ptelb = new CLieuDiscretParPointLie(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, listeCible.get(ind1, 'CPt'),
    this.nombreDePoints, this.motif, listeCible.get(ind2, 'CPointLie'))
  if (listeCible.className !== 'CPrototype') {
    ptelb.listeElementsAncetres.setImage(this.listeElementsAncetres, this.listeProprietaire, ptelb.listeProprietaire)
  }
  return ptelb
}
CLieuDiscretParPointLie.prototype.metAJour = function () {
  CLieuDiscretDeBase.prototype.metAJour.call(this)
  this.etablitListeElementsAncetres()
}
CLieuDiscretParPointLie.prototype.dependDePourCapture = function (p) {
  // Un lieu de points n'a pas à être redessiné si on bouge le point
  // lié qui l'a engendré}
  return ((p === this) || (this.pointATracer.depDe(p) && (p !== this.pointLieGenerateur)))
}
CLieuDiscretParPointLie.prototype.positionne = function (infoRandom, dimfen) {
  let abscisseMini, abscisseMaxi, abscisse, pas, abscisseFinale, i, d, nbValeurs
  if (!this.pointLieGenerateur.existe) {
    this.existe = false
    return
  }
  abscisseMini = this.pointLieGenerateur.abscisseMinimale()
  abscisseMaxi = this.pointLieGenerateur.abscisseMaximale()
  if (abscisseMini === abscisseMaxi) {
    this.existe = false
    return
  } else {
    // On range dans l'ordre croissant
    if (abscisseMini > abscisseMaxi) {
      d = abscisseMini
      abscisseMini = abscisseMaxi
      abscisseMaxi = d
    }
  }
  const abscisseInitiale = this.pointLieGenerateur.abscisse
  // Modification pour la version 1.9.5
  if (this.pointLieGenerateur.lieALigneFermee()) {
    nbValeurs = this.nombreDePoints
    pas = (abscisseMaxi - abscisseMini) / nbValeurs
    abscisseFinale = abscisseMaxi - pas
  } else {
    nbValeurs = this.nombreDePoints - 1
    pas = (abscisseMaxi - abscisseMini) / nbValeurs
    abscisseFinale = abscisseMaxi
  }
  abscisse = abscisseMini - pas
  this.indiceDernierPointTrace = -1
  const nb = this.nombreDePoints - 1
  for (i = 0; i < this.nombreDePoints; i++) {
    abscisse = (i === 0) ? abscisseMini : ((i === nb) ? abscisseFinale : abscisse + pas)
    this.pointLieGenerateur.donneAbscisse(abscisse)
    this.listeElementsAncetres.positionne(infoRandom, dimfen)
    if (this.pointATracer.existe) {
      if (testToile(this.pointATracer.x, this.pointATracer.y)) {
        this.indiceDernierPointTrace++
        this.absPoints[this.indiceDernierPointTrace] = this.pointATracer.x
        this.ordPoints[this.indiceDernierPointTrace] = this.pointATracer.y
      }
    }
  }
  // On  remet le point ancêtre à sa position initiale
  this.pointLieGenerateur.donneAbscisse(abscisseInitiale)
  this.listeElementsAncetres.positionne(infoRandom, dimfen)
  this.existe = (this.indiceDernierPointTrace >= 0)
}
CLieuDiscretParPointLie.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.pointATracer === p.pointATracer) && (this.pointLieGenerateur === p.pointLieGenerateur)
  } else return false
}
/**
 * Fonction mettant dans this.listeElementsAncetres la liste de tous les objets de la liste
 * propriétaire qui doivent être calculés lorsque le lieu est calculé.
 * @returns {void}
 */
CLieuDiscretParPointLie.prototype.etablitListeElementsAncetres = function () {
  if (this.listeProprietaire.className !== 'CPrototype') {
    const indicePointATracer = this.listeProprietaire.indexOf(this.pointATracer)
    const indicePointLieGenerateur = this.listeProprietaire.indexOf(this.pointLieGenerateur)
    this.listeElementsAncetres.retireTout()
    this.listeElementsAncetres.add(this.pointLieGenerateur)
    this.listeElementsAncetres.add(this.pointLieGenerateur)
    for (let i = indicePointLieGenerateur + 1; i < indicePointATracer; i++) {
      const ptelb = this.listeProprietaire.get(i)
      if ((this.pointATracer.depDe(ptelb)) && (ptelb.depDe(this.pointLieGenerateur))) { this.listeElementsAncetres.add(ptelb) }
    }
    this.listeElementsAncetres.add(this.pointATracer)
  }
}
CLieuDiscretParPointLie.prototype.read = function (inps, list) {
  CLieuDiscretDeBase.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.pointLieGenerateur = list.get(ind1, 'CPointLie')
  if (this.nVersion === 1) this.etablitListeElementsAncetres()
  else this.listeElementsAncetres.read(inps, list)
}
CLieuDiscretParPointLie.prototype.write = function (oups, list) {
  CLieuDiscretDeBase.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.pointLieGenerateur)
  oups.writeInt(ind1)
  this.listeElementsAncetres.write(oups, this.listeProprietaire)
}
