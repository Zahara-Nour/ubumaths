/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import * as kernel from '../global'
import Droite from '../objets/Droite'
import Vect from '../types/Vect'
export default DemiDroite

/**
 * Classe représentant une demi-droite dans la figure InstrumenPoche
 * @extends ObjetBase
 * @constructor
 * @param {IepDoc} doc le document propriétaire de la figure
 * @param {string} id id de l'objet dans le fichier XML
 * @param {number} x1 abscisse du premier point
 * @param {number} y1 ordonnée du premier point
 * @param {number} x2 abscisse du second point
 * @param {number} y2 ordonnée du premier point
 * @param {string} couleur couelur de la demi-droite
 * @param {string} epaisseur Epaisseur du trait
 * @param {string} opacite Opacité du trait
 * @param {string} styleTrait "tiret" pour avoir des pointillés
 */
function DemiDroite (doc, id, x1, y1, x2, y2, couleur, epaisseur, opacite, styleTrait) {
  Droite.call(this, doc, id, x1, y1, x2, y2, couleur, epaisseur, opacite, styleTrait)
}
DemiDroite.prototype = new Droite()
// Inutile de redéfinir creeg()
/**
 * Fonction calculant les coordonnées des points à la limite de la figure
 * (xext1,yext1) et (xext2,yext2) pour le tracé réel
 */
DemiDroite.prototype.calcule = function () {
  Droite.prototype.calcule.call(this)
  const v1 = new Vect(this.x1, this.y1, this.x2, this.y2) // Vecteur directeur de la demi-droite
  // Si la droite est hors-fenêtre, la demi-droite l'est aussi
  if (this.horsFenetre) return
  // Dans IEP l'origine est toujours dans la fenêtre
  const u = new Vect(this.x1, this.y1, this.xext1, this.yext1)
  if (u.presqueNul()) {
    const v = new Vect(this.x1, this.y1, this.xext2, this.yext2)
    if (kernel.colineairesMemeSens(v, v1)) {
      this.xext1 = this.x1
      this.yext1 = this.y1
    } else {
      this.xext2 = this.xext1
      this.yext2 = this.yext1
      this.xext1 = this.x1
      this.yext1 = this.y1
    }
  } else {
    if (kernel.colineairesMemeSens(u, v1)) {
      this.xext2 = this.xext1
      this.yext2 = this.yext1
      this.xext1 = this.x1
      this.yext1 = this.y1
    } else {
      this.xext1 = this.x1
      this.yext1 = this.y1
    }
  }
}
