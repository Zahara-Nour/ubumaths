/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacro from './CMacro'
export default CMacroPause

/**
 * Macro faisant une pause dans un animation. La durée est dureePause en secondes.
 * @constructor
 * @etends CMacro
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si l'objet est un élément final de construction.
 * @param {Color} couleur  La couleur d'éciture de l'éditeur (et du cadre éventuel).
 * @param {number} xNom  L'abscisse d'affichage de la macro
 * @param {number} yNom  L'ordonnée d'affichage de la macro
 * @param {number} decX  Décalage horizontal du nom
 * @param {number} decY  Décalage vertical du nom
 * @param {boolean} masque  true si l'éditeur est masqué
 * @param {CPt} pointLie  null ou pointe sur un point auquel l'affichage est lié.
 * @param {number} taillePolice  Indice de la taiile de police utilisée
 * @param {boolean} effacementFond  true si on efface le fond de l'en-tête.
 * @param {Color} couleurFond  La couleur de fond de l'en-tête.
 * @param {number} alignementHorizontal  0 pour alignement gauche, 1 pour centre, 2 pour droite.
 * @param {number} alignementVertical  0 pour alignement vers le haut, 1 pour centré, 2 pour bas.
 * @param {string} intitule  Le titre de la macro
 * @param {string} commentaireMacro  Eventuel commentaire explicatif.
 * @param {number} dureePause  La durée de la pause en secondes.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroPause}
 */
function CMacroPause (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, dureePause, fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacro.call(this, listeProprietaire)
    else {
      CMacro.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, fixed)
      this.dureePause = dureePause
    }
  }
}
CMacroPause.prototype = new CMacro()
CMacroPause.prototype.constructor = CMacroPause
CMacroPause.prototype.superClass = 'CMacro'
CMacroPause.prototype.className = 'CMacroPause'

CMacroPause.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.pointLie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CMacroPause(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind1, 'CPt'), this.taillePolice, this.effacementFond, this.couleurFond,
    this.alignementHorizontal, this.alignementVertical, this.intitule, this.commentaireMacro,
    this.dureePause, this.fixed)
}
CMacroPause.prototype.typeAnimation = function () {
  return (this.dureePause !== 0) ? CMacro.animationParTimer : CMacro.sansAnimation
}
CMacroPause.prototype.arretParClic = function () {
  return false
}
CMacroPause.prototype.termineAction = function (svg, dimf, couleurFond) {
  clearInterval(this.timer)
  this.executionEnCours = false
  this.passageMacroSuiv(svg, dimf, couleurFond, true)
}
CMacroPause.prototype.execute = function (svg, dimf, couleurFond) {
  this.executionEnCours = true
  if (this.dureePause !== 0) {
    const timeDebut = Date.now()
    this.timeFin = timeDebut + this.dureePause * 1000 // La durée est en secondes
    const t = this
    this.timer = setInterval(function () {
      CMacroPause.executePourTimer.call(t, svg, dimf, couleurFond)
    }, 50) // Timer au 5 centième de seconde
  }
}
/**
 * Fonction de callBack appelée par un timer dans execute()
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fonc de la figure.
 * @returns {void}
 */
CMacroPause.executePourTimer = function (svg, dimf, couleurFond) {
  if (!this.executionEnCours) return
  const time = Date.now() // Raccourci pour (new Date()).getTime()
  if (time > this.timeFin) this.termineAction(svg, dimf, couleurFond)
}
CMacroPause.prototype.read = function (inps, list) {
  CMacro.prototype.read.call(this, inps, list)
  this.dureePause = inps.readInt()
}
CMacroPause.prototype.write = function (oups, list) {
  CMacro.prototype.write.call(this, oups, list)
  oups.writeInt(this.dureePause)
}
