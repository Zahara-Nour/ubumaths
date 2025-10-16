/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroite from './CDroite'
export default CDroiteDirectionFixe

/**
 * Classe représentant une droite horizontale ou verticale et définie par un point.
 * @constructor
 * @extends CDroite
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} nomMasque  true si le nom de l'objet est masqué
 * @param {number} decX  Décalage en abscisses du nom.
 * @param {number} decY  Décalage en ordonnées du nom.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {string} nom  Le nom de l'objet. Seules les droites peuvent être nommées,
 * pas les segments ni demi-droites.
 * @param {number} tailleNom  Indice donnant la taille du nom.
 * @param {StyleTrait} style  Le style de trait utilisé
 * @param {number} abscisseNom  Abscisse du nom par rapport à la droite.
 * @param {CPt} a  Le point par lequel la droite
 * @param {boolean} droiteHorizontale  true pour une droite horizontale, fausse pour une verticale.
 * @param {number} longueurVecteur  Longueur du vecteur directeur.
 * @returns {CDroiteDirectionFixe}
 */
function CDroiteDirectionFixe (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, style, abscisseNom, a, droiteHorizontale, longueurVecteur) {
  if (arguments.length === 1) CDroite.call(this, listeProprietaire)
  else {
    CDroite.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      nomMasque, decX, decY, masque, nom, tailleNom, style, abscisseNom)
    this.a = a
    this.droiteHorizontale = droiteHorizontale
    this.longueurVecteur = longueurVecteur
    if (droiteHorizontale) {
      this.vect.x = longueurVecteur
      this.vect.y = 0
    } else {
      this.vect.x = 0
      this.vect.y = longueurVecteur
    }
  }
}
CDroiteDirectionFixe.prototype = new CDroite()
CDroiteDirectionFixe.prototype.constructor = CDroiteDirectionFixe
CDroiteDirectionFixe.prototype.superClass = 'CDroite'
CDroiteDirectionFixe.prototype.className = 'CDroiteDirectionFixe'

CDroiteDirectionFixe.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.a)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CDroiteDirectionFixe(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom, this.tailleNom,
    this.style.getClone(), this.abscisseNom, listeCible.get(ind1, 'CPt'), this.droiteHorizontale, this.longueurVecteur)
}

CDroiteDirectionFixe.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.droiteHorizontale === p.droiteHorizontale) && (this.a === p.A)
  } else return false
}

CDroiteDirectionFixe.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CDroite.prototype.depDe.call(this, p) || this.a.depDe(p))
}

CDroiteDirectionFixe.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.a.dependDePourBoucle(p))
}

CDroiteDirectionFixe.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.a.existe
  if (!this.existe) return
  this.point_x = this.a.x
  this.point_y = this.a.y
  CDroite.prototype.positionne.call(this, infoRandom, dimfen)
}

CDroiteDirectionFixe.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.a)
}

CDroiteDirectionFixe.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.a === ancienPoint) this.a = nouveauPoint
}

/**
 * @param {number} rapport
 * @param {number} xcentre
 * @param {number} ycentre
 * @returns {void}
 */
CDroiteDirectionFixe.prototype.zoom = function (rapport) {
  this.longueurVecteur = this.longueurVecteur * rapport
  if (this.droiteHorizontale) this.vect.x = this.longueurVecteur
  else this.vect.y = this.longueurVecteur
}

CDroiteDirectionFixe.prototype.read = function (inps, list) {
  CDroite.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.a = list.get(ind1, 'CPt')
  this.droiteHorizontale = inps.readBoolean()
  this.longueurVecteur = inps.readDouble()
  if (this.droiteHorizontale) {
    this.vect.x = this.longueurVecteur
    this.vect.y = 0
  } else {
    this.vect.x = 0
    this.vect.y = this.longueurVecteur
  }
}

CDroiteDirectionFixe.prototype.write = function (oups, list) {
  CDroite.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.a)
  oups.writeInt(ind1)
  oups.writeBoolean(this.droiteHorizontale)
  oups.writeDouble(this.longueurVecteur)
}
