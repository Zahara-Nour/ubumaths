/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSurface from './CSurface'
export default CSurfaceLieu

/**
 * Surface délimité par un lieu de points.
 * Existe seulement si le lieu est fermé.
 * @constructor
 * @extends CSurface
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleRemplissage} styleRemplissage  Entier donnant le style de remplissage.
 * @param {CLieuDeBase} bord  Le lieu de points bord de la surface.
 * @returns {CSurfaceLieu}
 */
function CSurfaceLieu (listeProprietaire, impProto, estElementFinal, couleur, masque, styleRemplissage, bord) {
  if (arguments.length === 1) CSurface.call(this, listeProprietaire)
  else {
    CSurface.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, styleRemplissage, bord)
    this.abscisses = new Array(this.bord.infoLieu.nombreDePoints + 1)
    this.ordonnees = new Array(this.bord.infoLieu.nombreDePoints + 1)
  }
}
CSurfaceLieu.prototype = new CSurface()
CSurfaceLieu.prototype.constructor = CSurfaceLieu
CSurfaceLieu.prototype.superClass = 'CSurface'
CSurfaceLieu.prototype.className = 'CSurfaceLieu'

CSurfaceLieu.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.bord)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CSurfaceLieu(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.styleRemplissage, listeCible.get(ind1, 'CLieuDeBase'))
}
// Version Jaja : les coordonénes des sommets sont dans le membre points du bord
CSurfaceLieu.prototype.setClone = function (ptel) {
  CSurface.prototype.setClone.call(this, ptel)
  if (ptel.existe) {
    this.nbPointsLigne = ptel.nbPointsLigne
    for (let i = 0; i < this.nbPointsLigne; i++) {
      this.abscisses[i] = ptel.abscisses[i]
      this.ordonnees[i] = ptel.ordonnees[i]
    }
  }
}
CSurfaceLieu.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.bord)
}
CSurfaceLieu.prototype.positionne = function (infoRandom, dimfen) {
  let j, k, k1
  CSurface.prototype.positionne.call(this, infoRandom, dimfen)
  this.existe = this.existe && this.bord.contientAuMoinsUneLigne()
  if (this.existe) {
    this.nbPointsLigne = 0
    for (j = 0; j < this.bord.nombreLignes; j++) {
      const nombrePoints = this.bord.infoLignes[j].nombrePoints
      const indPremPoint = this.bord.infoLignes[j].indicePremierPoint
      for (k = 0; k < nombrePoints; k++) {
        k1 = k + this.nbPointsLigne
        this.abscisses[k1] = this.bord.absPoints[indPremPoint + k]
        this.ordonnees[k1] = this.bord.ordPoints[indPremPoint + k]
      }
      this.nbPointsLigne += nombrePoints
    }
  }
}
/**
 * Fonction renvoyant une chaîne de caractères utilisée dans le svg élément
 * représentant la surface.
 * @returns {string}
 */
CSurfaceLieu.prototype.creePoints = function () {
  let j; let points = ''
  for (j = 0; j < this.nbPointsLigne; j++) {
    points = points + this.abscisses[j] + ','
    points = points + this.ordonnees[j] + ' '
  }
  return points
}
CSurfaceLieu.prototype.read = function (inps, list) {
  CSurface.prototype.read.call(this, inps, list)
  if (list.className !== 'CPrototype') {
    this.abscisses = new Array(this.bord.infoLieu.nombreDePoints + 1)
    this.ordonnees = new Array(this.bord.infoLieu.nombreDePoints + 1)
  }
}
