/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import PositionDroites from '../types/PositionDroites'
import CPt from './CPt'
import { intersection } from 'src/kernel/kernelVect'

export default CIntDroiteDroite

/**
 * Classe représentant le point d'intersection de deux droites (ou demi-droites ou segments).
 * @constructor
 * @extends CPt
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
 * @param {CDroiteAncetre} droite1  La première droite (ou demi-droite ou segment)
 * @param {CDroiteAncetre} droite2  La deuxième droite (ou demi-droite ou segment)
 * @returns {CIntDroiteDroite}
 */
function CIntDroiteDroite (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, droite1, droite2) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.droite1 = droite1
    this.droite2 = droite2
    this.pointInt = { x: 0, y: 0 }
  }
}
CIntDroiteDroite.prototype = new CPt()
CIntDroiteDroite.prototype.constructor = CIntDroiteDroite
CIntDroiteDroite.prototype.superClass = 'CPt'
CIntDroiteDroite.prototype.className = 'CIntDroiteDroite'

CIntDroiteDroite.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.droite1)
  const ind2 = listeSource.indexOf(this.droite2)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CIntDroiteDroite(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, listeCible.get(ind1, 'CDroiteAncetre'),
    listeCible.get(ind2, 'CDroiteAncetre'))
}
CIntDroiteDroite.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.droite1)
  liste.add(this.droite2)
}
CIntDroiteDroite.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) ||
    this.droite1.depDe(p) || this.droite2.depDe(p))
}
CIntDroiteDroite.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.droite1.dependDePourBoucle(p) || this.droite2.dependDePourBoucle(p))
}
CIntDroiteDroite.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.droite1.existe && this.droite2.existe
  if (!this.existe) return
  const pos = intersection(this.droite1.point_x, this.droite1.point_y, this.droite1.vect,
    this.droite2.point_x, this.droite2.point_y, this.droite2.vect, this.pointInt)
  if (pos !== PositionDroites.Secantes) {
    this.existe = false
  } else {
    const x = this.pointInt.x
    const y = this.pointInt.y
    if (this.droite1.appartientA(x, y) && this.droite2.appartientA(x, y)) {
      CPt.prototype.placeEn.call(this, x, y)
      CPt.prototype.positionne.call(this, infoRandom, dimfen) // Ajout version 4.6.4
    } else this.existe = false
  }
}
CIntDroiteDroite.prototype.getNature = function () {
  return NatObj.NPoint
}
CIntDroiteDroite.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (((this.droite1 === p.droite1) && (this.droite2 === p.droite2)) ||
    ((this.droite1 === p.droite2) && (this.droite2 === p.droite1)))
  } else return false
}
CIntDroiteDroite.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.droite1 = list.get(ind1, 'CDroiteAncetre')
  this.droite2 = list.get(ind2, 'CDroiteAncetre')
  this.pointInt = { x: 0, y: 0 }
}
CIntDroiteDroite.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.droite1)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.droite2)
  oups.writeInt(ind2)
}
