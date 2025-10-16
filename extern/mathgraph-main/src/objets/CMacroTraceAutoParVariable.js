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
export default CMacroTraceAutoParVariable

/**
 * Macro faisant apparaître une trace des objets contenus dans listeAssociee
 * générée par les déplacements d'une variable, sans animation.
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
 * @param {CVariableBornee} variableAssociee  La variable dont les valeurs génèrent la trace.
 * @param {number} nombrePointsPourTrace  Le nombre de positions du point lié pour générer la trace.
 * @param {number} frequenceAnimationMacro  Donne la fréquence d'animation en millièmes de deconde.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroTraceAutoParVariable}
 */
function CMacroTraceAutoParVariable (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, listeAssociee, variableAssociee, nombrePointsPourTrace,
  frequenceAnimationMacro, fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacroAvecListe.call(this, listeProprietaire)
    else {
      CMacroAvecListe.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, listeAssociee, fixed)
      this.variableAssociee = variableAssociee
      this.nombrePointsPourTrace = nombrePointsPourTrace
      this.frequenceAnimationMacro = frequenceAnimationMacro
      this.listeDep = new CListeObjets(listeProprietaire)
    }
  }
}
CMacroTraceAutoParVariable.prototype = new CMacroAvecListe()
CMacroTraceAutoParVariable.prototype.constructor = CMacroTraceAutoParVariable
CMacroTraceAutoParVariable.prototype.superClass = 'CMacroAvecListe'
CMacroTraceAutoParVariable.prototype.className = 'CMacroTraceAutoParVariable'

CMacroTraceAutoParVariable.prototype.getClone = function (listeSource, listeCible) {
  const listeAssocieeClone = new CSousListeObjets()
  listeAssocieeClone.setImage(this.listeAssociee, listeSource, listeCible)
  const ind1 = listeSource.indexOf(this.variableAssociee)
  const ind2 = listeSource.indexOf(this.pointLie)
  const ind3 = listeSource.indexOf(this.impProto)
  const ptelb = new CMacroTraceAutoParVariable(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind2, 'CPt'), this.taillePolice, this.effacementFond, this.couleurFond,
    this.alignementHorizontal, this.alignementVertical, this.intitule, this.commentaireMacro,
    listeAssocieeClone, listeCible.get(ind1, 'CVariableBornee'),
    this.frequenceAnimationMacro, this.fixed)
  ptelb.listeDep = new CListeObjets(listeCible.uniteAngle, listeCible.pointeurLongueurUnite)
  return ptelb
}
CMacroTraceAutoParVariable.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CMacroAvecListe.prototype.depDe.call(this, p) || this.variableAssociee.depDe(p))
}
CMacroTraceAutoParVariable.prototype.dependDePourBoucle = function (p) {
  return CMacroAvecListe.prototype.dependDePourBoucle.call(this, p) || this.variableAssociee.dependDePourBoucle(p)
}
CMacroTraceAutoParVariable.prototype.executionPossible = function () {
  return this.variableAssociee.existe
}
CMacroTraceAutoParVariable.prototype.etablitListesInternes = function () {
  this.listeDep.retireTout()
  this.listeDep.ajouteObjetsDependantsSauf(this.variableAssociee, this.listeProprietaire, this)
}
CMacroTraceAutoParVariable.prototype.metAJour = function () {
  CMacroAvecListe.prototype.metAJour.call(this)
  this.etablitListesInternes()
}
CMacroTraceAutoParVariable.prototype.typeAnimation = function () {
  if (this.frequenceAnimationMacro === 0) return CMacro.sansAnimation
  else return CMacro.animationParTimer
}
CMacroTraceAutoParVariable.prototype.ajouteAntecedents = function (liste) {
  liste.ajouteElementsDe(this.listeAssociee)
}
CMacroTraceAutoParVariable.prototype.execute = function (svg, dimf, couleurFond) {
  this.listeProprietaire.initialiseTraces()
  this.pas = this.variableAssociee.valeurPas
  this.valeurMini = this.variableAssociee.valeurMini
  this.valeurMaxi = this.variableAssociee.valeurMaxi
  this.valeurInitiale = this.variableAssociee.valeurActuelle
  this.executionEnCours = true
  if (this.frequenceAnimationMacro === 0) {
    this.valeur = this.valeurMini
    while (this.valeur <= this.valeurMaxi) {
      this.variableAssociee.donneValeur(this.valeur)
      this.listeDep.positionne(false, dimf)
      this.listeProprietaire.addTraces(this.listeAssociee)
      this.valeur = this.valeur + this.pas
    }
    this.termineAction(svg, dimf, couleurFond)
  } else {
    this.valeur = this.valeurMini - this.pas
    const t = this
    this.timer = setInterval(function () {
      CMacroTraceAutoParVariable.executePourTimer.call(t, svg, dimf, couleurFond)
    }, this.frequenceAnimationMacro)
  }
}
CMacroTraceAutoParVariable.executePourTimer = function (svg, dimf, couleurFond) {
  this.valeur = this.valeur + this.pas
  if (this.valeur > this.valeurMaxi) this.valeur = this.valeurMaxi
  this.variableAssociee.donneValeur(this.valeur)
  this.listeDep.positionne(false, dimf)
  this.listeProprietaire.addTraces(this.listeAssociee)
  this.listeDep.update(svg, couleurFond, true)
  if (this.valeur >= this.valeurMaxi) this.termineAction(svg, dimf, couleurFond)
}
CMacroTraceAutoParVariable.prototype.termineAction = function (svg, dimf, couleurFond) {
  if (this.timer !== null) clearInterval(this.timer)
  this.executionEnCours = false
  this.variableAssociee.donneValeur(this.valeurInitiale)
  this.listeDep.positionne(false, dimf)
  this.listeDep.update(svg, couleurFond, true)
  this.passageMacroSuiv(svg, dimf, couleurFond, true)
}
CMacroTraceAutoParVariable.prototype.read = function (inps, list) {
  CMacroAvecListe.prototype.read.call(this, inps, list)
  this.frequenceAnimationMacro = inps.readInt()
  const ind1 = inps.readInt()
  this.variableAssociee = list.get(ind1, 'CVariableBornee')
  if (list.className !== 'CPrototype') this.listeDep = new CListeObjets(this.listeProprietaire)
}
CMacroTraceAutoParVariable.prototype.write = function (oups, list) {
  CMacroAvecListe.prototype.write.call(this, oups, list)
  oups.writeInt(this.frequenceAnimationMacro)
  const ind1 = list.indexOf(this.variableAssociee)
  oups.writeInt(ind1)
}
