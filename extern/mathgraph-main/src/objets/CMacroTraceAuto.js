/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CListeObjets from './CListeObjets'
import CMacro from './CMacro'
import CMacroAvecListe from './CMacroAvecListe'
import CSousListeObjets from './CSousListeObjets'
export default CMacroTraceAuto

/**
 * Macro faisant apparaître une trace des objets contenus dans listeAssociee
 * générée par les déplacements d'un point lié, sans animation.
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
 * @param {CListeObjets} listeAssociee  Liste contenant les objets qui doivet laisser une trace.
 * @param {CPointLie} pointLieAssocie  Le point lié dont les positions génèrent la trace.
 * @param {number} nombrePointsPourTrace  Le nombre de positions du point lié pour générer la trace.
 * @param {number} frequenceAnimationMacro  Donne la fréquence d'animation en millièmes de deconde.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroTraceAuto}
 */
function CMacroTraceAuto (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, listeAssociee, pointLieAssocie, nombrePointsPourTrace,
  frequenceAnimationMacro, fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacroAvecListe.call(this, listeProprietaire)
    else {
      CMacroAvecListe.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, listeAssociee, fixed)
      this.pointLieAssocie = pointLieAssocie
      this.nombrePointsPourTrace = nombrePointsPourTrace
      this.frequenceAnimationMacro = frequenceAnimationMacro
      this.listeDep = new CListeObjets(listeProprietaire)
    }
  }
}
CMacroTraceAuto.prototype = new CMacroAvecListe()
CMacroTraceAuto.prototype.constructor = CMacroTraceAuto
CMacroTraceAuto.prototype.superClass = 'CMacroAvecListe'
CMacroTraceAuto.prototype.className = 'CMacroTraceAuto'

CMacroTraceAuto.prototype.getClone = function (listeSource, listeCible) {
  const listeAssocieeClone = new CSousListeObjets()
  listeAssocieeClone.setImage(this.listeAssociee, listeSource, listeCible)
  const ind1 = listeSource.indexOf(this.pointLieAssocie)
  const ind2 = listeSource.indexOf(this.pointLie)
  const ind3 = listeSource.indexOf(this.impProto)
  const ptelb = new CMacroTraceAuto(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind2, 'CPt'), this.taillePolice, this.effacementFond, this.couleurFond,
    this.alignementHorizontal, this.alignementVertical, this.intitule, this.commentaireMacro,
    listeAssocieeClone, listeCible.get(ind1, 'CPointLie'), this.nombrePointsPourTrace,
    this.frequenceAnimationMacro, this.fixed)
  ptelb.listeDep = new CListeObjets(listeCible.uniteAngle, listeCible.pointeurLongueurUnite)
  return ptelb
}
CMacroTraceAuto.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CMacroAvecListe.prototype.depDe.call(this, p) || this.pointLieAssocie.depDe(p))
}
CMacroTraceAuto.prototype.dependDePourBoucle = function (p) {
  return CMacroAvecListe.prototype.dependDePourBoucle.call(this, p) || this.pointLieAssocie.dependDePourBoucle(p)
}
CMacroTraceAuto.prototype.executionPossible = function () {
  return this.pointLieAssocie.existe
}
CMacroTraceAuto.prototype.etablitListesInternes = function () {
  this.listeDep.retireTout()
  this.listeDep.ajouteObjetsDependantsSauf(this.pointLieAssocie, this.listeProprietaire, this)
}
CMacroTraceAuto.prototype.metAJour = function () {
  CMacroAvecListe.prototype.metAJour.call(this)
  this.etablitListesInternes()
}
CMacroTraceAuto.prototype.typeAnimation = function () {
  if (this.frequenceAnimationMacro === 0) return CMacro.sansAnimation
  else return CMacro.animationParTimer
}
CMacroTraceAuto.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointLieAssocie === ancienPoint) this.pointLieAssocie = nouveauPoint
}
CMacroTraceAuto.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.pointLieAssocie)
  liste.ajouteElementsDe(this.listeAssociee)
}
CMacroTraceAuto.prototype.execute = function (svg, dimf, couleurFond) {
  this.listeProprietaire.initialiseTraces()
  this.abscisseInitiale = this.pointLieAssocie.abscisse
  this.abscisseMini = this.pointLieAssocie.abscisseMinimale()
  this.abscisseMaxi = this.pointLieAssocie.abscisseMaximale()
  if (this.abscisseMini > this.abscisseMaxi) {
    const d = this.abscisseMini
    this.abscisseMini = this.abscisseMaxi
    this.abscisseMaxi = d
  }
  // Modification pour la version 1.9.5
  let nbValeurs
  // Modification pour la version 1.9.5
  if (this.pointLieAssocie.lieALigneFermee()) nbValeurs = this.nombrePointsPourTrace
  else nbValeurs = this.nombrePointsPourTrace - 1

  this.pas = (this.abscisseMaxi - this.abscisseMini) / nbValeurs
  this.abscisse = this.abscisseMini - this.pas
  this.indicePointEnCours = 0 // Pour le cas où la fréquence est non nulle
  this.executionEnCours = true
  if (this.frequenceAnimationMacro === 0) {
    for (let i = 1; i <= this.nombrePointsPourTrace; i++) {
      this.abscisse = this.abscisse + this.pas
      this.pointLieAssocie.donneAbscisse(this.abscisse)
      this.listeDep.positionne(false, dimf)
      this.listeProprietaire.addTraces(this.listeAssociee)
    }
    this.termineAction(svg, dimf, couleurFond)
  } else {
    const t = this
    this.timer = setInterval(function () {
      CMacroTraceAuto.executePourTimer.call(t, svg, dimf, couleurFond)
    }, this.frequenceAnimationMacro)
  }
}
CMacroTraceAuto.executePourTimer = function (svg, dimf, couleurFond) {
  this.indicePointEnCours++
  if (this.indicePointEnCours >= this.nombrePointsPourTrace) this.abscisse = this.abscisseMaxi
  else this.abscisse = this.abscisse + this.pas
  this.pointLieAssocie.donneAbscisse(this.abscisse)
  this.listeDep.positionne(false.infRand, dimf)
  this.listeProprietaire.addTraces(this.listeAssociee)
  this.listeDep.update(svg, couleurFond, true)
  if (this.indicePointEnCours === this.nombrePointsPourTrace) this.termineAction(svg, dimf, couleurFond)
}
CMacroTraceAuto.prototype.termineAction = function (svg, dimf, couleurFond) {
  if (this.timer !== null) clearInterval(this.timer)
  this.executionEnCours = false
  this.pointLieAssocie.donneAbscisse(this.abscisseInitiale)
  this.listeDep.positionne(false, dimf)
  this.listeDep.update(svg, couleurFond, true)
  this.passageMacroSuiv(svg, dimf, couleurFond, true)
}
CMacroTraceAuto.prototype.read = function (inps, list) {
  CMacroAvecListe.prototype.read.call(this, inps, list)
  this.nombrePointsPourTrace = inps.readInt()
  this.frequenceAnimationMacro = inps.readInt()
  const ind1 = inps.readInt()
  this.pointLieAssocie = list.get(ind1, 'CPointLie')
  if (list.classsName !== 'CPrototype') this.listeDep = new CListeObjets(this.listeProprietaire)
}
CMacroTraceAuto.prototype.write = function (oups, list) {
  CMacroAvecListe.prototype.write.call(this, oups, list)
  oups.writeInt(this.nombrePointsPourTrace)
  oups.writeInt(this.frequenceAnimationMacro)
  const ind1 = list.indexOf(this.pointLieAssocie)
  oups.writeInt(ind1)
}
