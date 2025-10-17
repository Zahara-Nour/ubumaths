/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import ObjetBase from '../objets/ObjetBase'
import Vect from '../types/Vect'
export default Polygone
/**
 * Classe représentant un polygone de la figure
 * @extends ObjetBase
 * @constructor
 * @param {IepDoc} doc le document propriétaire
 * @param {string} id l'id de l'objet dans le fichier XML de la figure
 * @param {string[]} abs un tableau contenant les abscisses des sommets
 * @param {string[]} ord : un tableau contenant les ordonnées des sommets
 * @param {string} couleur la couleur du polygone
 * @param {number} epaisseur l'épaisseur du tracé
 * @param {string} couleurFond la couelur de onc de l'intérieur du polygone
 * @param {string} opacite l'opacité du remplissage (de 0 à 100)
 */
function Polygone (doc, id, abs, ord, couleur, epaisseur, couleurFond, opacite) {
  ObjetBase.call(this, doc, id, couleur)
  this.abs = abs.split(',')
  this.ord = ord.split(',')
  this.sauveabs = this.abs
  this.sauveord = this.ord
  this.epaisseur = epaisseur
  this.opacite = (opacite == null) ? '60' : opacite
  const op = parseFloat(this.opacite / 100)
  if (couleurFond == null) this.couleurFond = this.couleur; else this.couleurFond = couleurFond
  this.style = 'stroke:' + couleur + ';stroke-width:' + epaisseur +
          ';fill:' + this.couleurFond + ';'
  this.style += 'fill-opacity:' + op + ';'
  this.objet = 'trait'
}
Polygone.prototype = new ObjetBase()
/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
Polygone.prototype.creeg = function () {
  let points, i
  const p = document.createElementNS(svgns, 'polygon')
  points = ''
  for (i = 0; i < this.abs.length; i++) {
    points += ' ' + this.abs[i] + ' ' + this.ord[i]
  }
  p.setAttribute('points', points)
  p.setAttribute('style', this.style)
  p.setAttribute('visibility', 'hidden')
  // p.setAttribute("id",this.id);
  this.g = p
}
/** @inheritDoc */
Polygone.prototype.creationAnimee = function () {
  return true
}
/**
 * Fonction lançant l'animation de visualisation de la ligne continue
 * Utilise un timer et une fonction de callBack
 * Vitesse est le nombre de pixels à parcourir à chaque dixième de seconde
 * @param {number} vitesse
 */
Polygone.prototype.lanceAnimation = function (vitesse) {
  // Dans la version flash, la vitesse n'est pas le nombre de pixels par dixième de seconde
  // mais le nombre de pixlels par seconde semble le double
  this.pix = parseFloat(vitesse / 2)
  this.abs = []
  this.abs[0] = this.sauveabs[0]
  this.ord = []
  this.ord[0] = this.sauveord[0]
  this.ind = 0 // L'indice du sommet en cours dans le tableau des coordonnées
  this.n = 0 // L'indice du pas sur le segment en cours
  const cray = this.doc.crayon
  const v = new Vect(parseFloat(this.sauveabs[0]), parseFloat(this.sauveord[0]),
    parseFloat(this.sauveabs[1]), parseFloat(this.sauveord[1]))
  this.longcote = v.norme() // Longueur du côté en cours
  this.vect = v.vecteurColineaire(this.pix)
  cray.setPosition(parseFloat(this.abs[0]), parseFloat(this.ord[0]), cray.angle)
  const t = this
  this.timer = setInterval(function () { t.actionPourAnimation() }, 25)
}
/**
 * Fonction de callBack appelée par un timer pour l'animation du tracé
 */
Polygone.prototype.actionPourAnimation = function () {
  const cray = this.doc.crayon
  let ind = this.ind
  const x = parseFloat(this.abs[ind])
  const y = parseFloat(this.ord[ind])
  this.n++
  if (this.doc.animationEnCours) {
    if (this.n * this.pix <= this.longcote) {
      const x1 = x + this.n * this.vect.x
      const y1 = y + this.n * this.vect.y
      this.abs[ind + 1] = String(x1)
      this.ord[ind + 1] = String(y1)
      cray.translate(x1, y1)
      this.updateg()
    } else {
      this.ind++
      ind++
      if (ind === this.sauveabs.length - 1) {
        clearInterval(this.timer)
        this.finAction()
        this.doc.actionSuivante()
      } else { // On passe au côté suivant
        this.abs[ind] = this.sauveabs[ind]
        this.ord[ind] = this.sauveord[ind]
        cray.translate(parseFloat(this.abs[ind]), parseFloat(this.ord[ind]))
        const v = new Vect(parseFloat(this.sauveabs[ind]), parseFloat(this.sauveord[ind]),
          parseFloat(this.sauveabs[ind + 1]), parseFloat(this.sauveord[ind + 1]))
        this.longcote = v.norme() // Longueur du côté en cours
        this.vect = v.vecteurColineaire(this.pix)
        this.n = 0
      }
    }
  } else {
    clearInterval(this.timer)
    this.finAction()
    this.doc.actionSuivante()
  }
}
/**
 * extends iep.objetBase.prototype.finAction
 */
Polygone.prototype.finAction = function () {
  this.abs = this.sauveabs
  this.ord = this.sauveord
  const len = this.abs.length
  this.updateg()
  this.doc.crayon.translate(parseFloat(this.abs[len - 1]), parseFloat(this.ord[len - 1]))
}
