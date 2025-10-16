/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacro from './CMacro'
import CMacroAvecListe from './CMacroAvecListe'
import CSousListeObjets from './CSousListeObjets'
export default CMacroClignotement

/**
 * Macro faisant clignoter des objets sur la figure.
 * @constructor
 * @extends CMacroAvecListe
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
 * @param {CListeObjets} listeAssociee  La liste des objets qui doivent clignoter
 * @param {number} dureeAnimation ; La durée de clignotement en secondes, 0 pour un clignotement
 * jusqu'au prochain clic de souris.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroClignotement}
 */
function CMacroClignotement (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, listeAssociee,
  dureeAnimation, fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacroAvecListe.call(this, listeProprietaire)
    else {
      CMacroAvecListe.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, listeAssociee, fixed)
      this.dureeAnimation = dureeAnimation
    }
  }
}
CMacroClignotement.prototype = new CMacroAvecListe()
CMacroClignotement.prototype.constructor = CMacroClignotement
CMacroClignotement.prototype.superClass = 'CMacroAvecListe'
CMacroClignotement.prototype.className = 'CMacroClignotement'

CMacroClignotement.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const listeAssocieeClone = new CSousListeObjets()
  listeAssocieeClone.setImage(this.listeAssociee, listeSource, listeCible)
  return new CMacroClignotement(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY,
    this.masque, this.pointLie, this.taillePolice, this.effacementFond, this.couleurFond,
    this.alignementHorizontal, this.alignementVertical, this.intitule, this.commentaireMacro,
    listeAssocieeClone, this.dureeAnimation, this.fixed)
}
CMacroClignotement.prototype.typeAnimation = function () {
  return CMacro.animationParTimer
}
CMacroClignotement.prototype.arretParClic = function () {
  return (this.dureeAnimation === 0)
}
CMacroClignotement.prototype.termineAction = function (svg, dimf, couleurFond) {
  clearInterval(this.timer)
  this.executionEnCours = false
  this.listeAssociee.montreTout(true)
  // this.listeAssociee.updateComposants(svg, couleurFond, transparence);
  this.listeAssociee.update(svg, couleurFond, true)
  this.passageMacroSuiv(svg, dimf, couleurFond)
}
CMacroClignotement.prototype.execute = function (svg, dimf, couleurFond) {
  const timeDebut = Date.now()
  if (this.dureeAnimation !== 0) this.timeFin = timeDebut + this.dureeAnimation * 100 // La durée est en dixièmes de secondes
  this.executionEnCours = true
  this.nombrePairClignotements = true
  const t = this
  this.timer = setInterval(function () {
    CMacroClignotement.executePourTimer.call(t, svg, dimf, couleurFond)
  }, 500)
}
/**
 * Fonction de callBack appelée par un timer dans execute()
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fond de la figure.
 * @returns {void}
 */
CMacroClignotement.executePourTimer = function (svg, dimf, couleurFond) {
  // Version 6.9.0 : On met un try catch por que, dans la bibli ou LaboMep si on quitte quand la macro est active
  // on détruise bien le timer
  try {
    if (!this.executionEnCours) return
    this.nombrePairClignotements = !this.nombrePairClignotements
    this.listeAssociee.montreTout(this.nombrePairClignotements)
    this.listeAssociee.update(svg, couleurFond, true)
    const time = Date.now() // Raccourci pour (new Date()).getTime()
    if (time > this.timeFin) this.termineAction(svg, dimf, couleurFond)
  } catch (e) {
    this.termineAction()
  }
}
CMacroClignotement.prototype.ajouteAntecedents = function (liste) {
  liste.ajouteElementsDe(this.listeAssociee)
}
CMacroClignotement.prototype.read = function (inps, list) {
  CMacroAvecListe.prototype.read.call(this, inps, list)
  this.dureeAnimation = inps.readInt()
}
CMacroClignotement.prototype.write = function (oups, list) {
  CMacroAvecListe.prototype.write.call(this, oups, list)
  oups.writeInt(this.dureeAnimation)
}
