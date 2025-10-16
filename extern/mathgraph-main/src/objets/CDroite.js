/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroiteAncetre from './CDroiteAncetre'
export default CDroite

/**
 * Classe ancêtre de toutes les droites.
 * @constructor
 * @extends CDroiteAncetre
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
 * @returns {CDroite}
 */
function CDroite (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, style, abscisseNom) {
  if (arguments.length === 0) return
  if (arguments.length === 1) CDroiteAncetre.call(this, listeProprietaire)
  else {
    CDroiteAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      nomMasque, decX, decY, masque, nom, tailleNom, style)
    this.abscisseNom = abscisseNom
  }
}
CDroite.prototype = new CDroiteAncetre()
CDroite.prototype.constructor = CDroite
CDroite.prototype.superClass = 'CDroiteAncetre'
CDroite.prototype.className = 'CDroite'

CDroite.abscisseNomParDefaut = 0.95

CDroite.prototype.positionneNom = function () {
  this.placeNom(this.xext1 + this.abscisseNom * (this.xext2 - this.xext1), this.yext1 + this.abscisseNom * (this.yext2 - this.yext1))
}

CDroite.prototype.chaineDesignation = function () {
  return 'desDroite'
}

CDroite.prototype.read = function (inps, list) {
  CDroiteAncetre.prototype.read.call(this, inps, list)
  // Version 4.7.6.1 : Si le nom est vide on n'enregistre pas abscisseNom
  if (this.listeProprietaire.numeroVersion < 11) this.abscisseNom = inps.readDouble()
  else {
    if (this.nom === '') this.abscisseNom = CDroite.abscisseNomParDefaut
    else this.abscisseNom = inps.readDouble()
  }
}

CDroite.prototype.write = function (oups, list) {
  CDroiteAncetre.prototype.write.call(this, oups, list)
  if (this.nom.length !== 0) oups.writeDouble(this.abscisseNom)
}
