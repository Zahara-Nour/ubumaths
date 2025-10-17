/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { getTaille } from '../global'
import ActionAncetre from '../actions/ActionAncetre'
import loadMathJax from '../loadMathJax'

// Modification version MathJax3 : plus besoin de créer un div auxiliaire (cf rev477 pour la version précédente)

export default ActionNommerPoint

/**
 * Action donnant un nom à un point
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc le doculent propriétaire
 * @param {NomPoint} objet  l'objet représentant le nom
 * @param {string} tempo le tempk en dixièmes de seconde (ou null)
 */
function ActionNommerPoint (doc, objet, tempo) {
  ActionAncetre.call(this, doc, tempo)
  this.nomPoint = objet
}
ActionNommerPoint.prototype = new ActionAncetre()

/**
 * Appelée par creeActions, précharge Mathjax si besoin et prépare son div de rendu
 */
ActionNommerPoint.prototype.prepare = function () {
  if (this.nomPoint.estLatex) {
    const self = this
    const width = this.doc.getWidth()
    const taille = getTaille(this.nomPoint) - 2
    const ch = this.nomPoint.nom.substring(1)
    this.ex = taille / 2
    const options = {
      em: taille,
      ex: this.ex,
      containerWidth: width,
      display: false
    }
    /* global MathJax */
    if (this.doc.debug) console.log('chargement MathJax dans ActionNommerPoint')
    loadMathJax()
      .then(() => MathJax.tex2svgPromise(ch, options))
      .then((html) => {
        // html est ici du svg, mais on l'ajoute d'abord dans nomPoint.html
        self.nomPoint.html = html
        // et creegLatex va le récupérer pour affecter les bons attributs et mettre ça dans nomPoint.g
        self.nomPoint.creegLatex()
        self.setReady()
      }).catch(error => {
        console.error(error)
        alert('Pb Mathjax, impossible d’afficher le point en LaTeX')
      })
  } else {
    this.nomPoint.creeg()
    this.setReady()
  }
}

/**
 * Exécutant de l'action donnant un nom au point
 * @param {boolean} immediat Si true pas de passage à l'action suivante
 */
ActionNommerPoint.prototype.execute = function (immediat) {
  // if ((this.nomPoint.objet === "point") && !this.nomPoint.nomCree) {
  if (this.nomPoint.objet === 'point') {
    // this.nomPoint.creeg()
    this.nomPoint.positionne()
    const point = this.nomPoint.point
    if (point.nom !== null) {
      this.doc.svg.replaceChild(this.nomPoint.g, point.nom.g)
    } else {
      this.doc.svg.appendChild(this.nomPoint.g)
    }
    point.nom = this.nomPoint
  }
  this.nomPoint.g.setAttribute('visibility', 'visible')
  if (!immediat) this.doc.actionSuivante(immediat)
}

/** @inheritDoc */
ActionNommerPoint.prototype.actionVisible = function () {
  return this.doc.getObjectVisibility(this.nomPoint.point, this.indice - 1)
}
