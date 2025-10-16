/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { chaineNombre } from '../kernel/kernel'
import CListeObjets from './CListeObjets'
import CMacro from './CMacro'
import CValeur from './CValeur'
export default CMacroModificationVariable

/**
 * Doc à rédiger (@todo)
 * @constructor
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
 * @param {CValeur} valMin  La valeur mini qu'on donne à la variable.
 * @param {CValeur} valMax  La valeur maxi qu'on donne à la variable.
 * @param {CValeur} valPas  La valeur du pas qu'on donne à la variable.
 * @param {CValeur} valAct  La valeur actuelle qu'on donne à la variable.
 * @param {CVariableBornee} variableAssociee  La variable que la macro modifie.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroModificationVariable}
 */
function CMacroModificationVariable (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, valMin, valMax,
  valPas, valAct, variableAssociee, fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacro.call(this, listeProprietaire)
    else {
      CMacro.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, fixed)
      this.variableAssociee = variableAssociee
      this.valMin = valMin
      this.valMax = valMax
      this.valPas = valPas
      this.valAct = valAct
    }
  }
  this.listeDep = new CListeObjets()
}
CMacroModificationVariable.prototype = new CMacro()
CMacroModificationVariable.prototype.constructor = CMacroModificationVariable
CMacroModificationVariable.prototype.superClass = 'CMacro'
CMacroModificationVariable.prototype.className = 'CMacroModificationVariable'

CMacroModificationVariable.prototype.getClone = function (listeSource, listeCible) {
  const valeurMiniClone = this.valMin.getClone(listeSource, listeCible)
  const valeurMaxiClone = this.valMax.getClone(listeSource, listeCible)
  const valeurPasClone = this.valPas.getClone(listeSource, listeCible)
  const valeurActuelleClone = this.valAct.getClone(listeSource, listeCible)
  const ind1 = listeSource.indexOf(this.variableAssociee)
  const ind2 = listeSource.indexOf(this.pointLie)
  const ind3 = listeSource.indexOf(this.impProto)
  this.listeDep.initialise(listeCible.uniteAngle, listeCible.pointeurLongueurUnite)
  return new CMacroModificationVariable(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind2, 'CPt'), this.taillePolice,
    this.effacementFond, this.couleurFond, this.alignementHorizontal, this.alignementVertical,
    this.intitule, this.commentaireMacro, valeurMiniClone, valeurMaxiClone,
    valeurPasClone, valeurActuelleClone, listeCible.get(ind1, 'CVariableBornee'), this.fixed)
  // On ne peut pas à ce niveau faire une image de la liste ListeDep dans la liste clonée car tous
  // les éléments n'ont pas encoré été chargés.
  // ((CMacroModificationVariable)ptelb).listeDep.setImage(listeDep, listeProprietaire,
  //  ptelb.listeProprietaire);
}
CMacroModificationVariable.prototype.initialisePourDependance = function () {
  CMacro.prototype.initialisePourDependance.call(this)
  this.valMin.initialisePourDependance()
  this.valMax.initialisePourDependance()
  this.valPas.initialisePourDependance()
  this.valAct.initialisePourDependance()
}
CMacroModificationVariable.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CMacro.prototype.depDe.call(this, p) || this.variableAssociee.depDe(p) ||
    this.valMin.depDe(p) || this.valMax.depDe(p) ||
    this.valPas.depDe(p) || this.valAct.depDe(p))
}
CMacroModificationVariable.prototype.dependDePourBoucle = function (p) {
  return CMacro.prototype.dependDePourBoucle.call(this, p) || this.variableAssociee.dependDePourBoucle(p) ||
    this.valMin.dependDePourBoucle(p) || this.valMax.dependDePourBoucle(p) ||
    this.valPas.dependDePourBoucle(p) || this.valAct.dependDePourBoucle(p)
}
CMacroModificationVariable.prototype.positionne = function (infoRandom, dimfen) {
  CMacro.prototype.positionne.call(this, infoRandom, dimfen)
  this.valMin.positionne(infoRandom, dimfen)
  this.valMax.positionne(infoRandom, dimfen)
  this.valPas.positionne(infoRandom, dimfen)
  this.valAct.positionne(infoRandom, dimfen)
  this.existe = this.existe && this.valMin.existe && this.valMax.existe &&
    this.valPas.existe && this.valAct.existe
}
CMacroModificationVariable.prototype.positionneFull = function (infoRandom, dimfen) {
  CMacro.prototype.positionneFull.call(this, infoRandom, dimfen)
  this.valMin.dejaPositionne = false
  this.valMax.dejaPositionne = false
  this.valPas.dejaPositionne = false
  this.valAct.dejaPositionne = false
  this.valMin.positionne(infoRandom, dimfen)
  this.valMax.positionne(infoRandom, dimfen)
  this.valPas.positionne(infoRandom, dimfen)
  this.valAct.positionne(infoRandom, dimfen)
  this.existe = this.existe && this.valMin.existe && this.valMax.existe &&
    this.valPas.existe && this.valAct.existe
}
CMacroModificationVariable.prototype.agitSurVariable = function (va) {
  return (va === this.variableAssociee)
}
CMacroModificationVariable.prototype.affecteValeurAVariable = function (val) {
  return this.valMin.calcul.depDe(val) || this.valMax.calcul.depDe(val) ||
    this.valPas.calcul.depDe(val) || this.valAct.calcul.depDe(val)
}
CMacroModificationVariable.prototype.executionPossible = function () {
  let resultat = this.valMin.existe && this.valMax.existe && this.valPas.existe &&
    this.valAct.existe && this.variableAssociee.existe
  if (resultat) {
    const nouvelleValeurMini = this.valMin.rendValeur()
    const nouvelleValeurMaxi = this.valMax.rendValeur()
    const nouvelleValeurPas = this.valPas.rendValeur()
    const nouvelleValeurActuelle = this.valAct.rendValeur()
    resultat = (nouvelleValeurMini < nouvelleValeurMaxi) && (nouvelleValeurPas < (nouvelleValeurMaxi - nouvelleValeurMini)) &&
      (nouvelleValeurActuelle >= nouvelleValeurMini) && (nouvelleValeurActuelle <= nouvelleValeurMaxi)
  }
  return resultat
}
CMacroModificationVariable.prototype.execute = function (svg, dimf, couleurFond) {
  this.valMin.positionne(false, dimf)
  this.valMax.positionne(false, dimf)
  this.valPas.positionne(false, dimf)
  this.valAct.positionne(false, dimf)
  const resultatValeurActuelle = this.valAct.rendValeur()
  const nouvelleValeurMini = this.valMin.rendValeur()
  this.variableAssociee.valeurMini = nouvelleValeurMini
  if (this.valMin.estConstant) this.variableAssociee.chaineValeurMini = this.valMin.chaineInfo()
  else {
    this.variableAssociee.chaineValeurMini = chaineNombre(nouvelleValeurMini, 12)
  }
  const nouvelleValeurMaxi = this.valMax.rendValeur()
  this.variableAssociee.valeurMaxi = nouvelleValeurMaxi
  if (this.valMax.estConstant) this.variableAssociee.chaineValeurMaxi = this.valMax.chaineInfo()
  else this.variableAssociee.chaineValeurMaxi = chaineNombre(nouvelleValeurMaxi, 12)
  this.variableAssociee.valeurPas = this.valPas.rendValeur(false)
  if (this.valPas.estConstant) this.variableAssociee.chaineValeurPas = this.valPas.chaineInfo()
  else this.variableAssociee.chaineValeurPas = chaineNombre(nouvelleValeurMini, 12)
  this.variableAssociee.donneValeur(resultatValeurActuelle)
  // Modification, version 6.4.8. IL faut appeler positionneFull car des affichages LaTeX peuvent avoir besoin d'être préparés.
  // this.listeDep.positionne(false, dimf)
  this.listeDep.positionneLatexFull(false, dimf)
  this.listeDep.update(svg, couleurFond, true)
  this.variableAssociee.updateDisplay() // Pour les variables auxquelles sont associées un dialogue
  this.termineAction(svg, dimf, couleurFond)
}
CMacroModificationVariable.prototype.executeSimple = function (dimf) {
  this.valMin.positionne(true, dimf)
  this.valMax.positionne(true, dimf)
  this.valPas.positionne(true, dimf)
  this.valAct.positionne(true, dimf)
  const resultatValeurActuelle = this.valAct.rendValeur(false)
  const nouvelleValeurMini = this.valMin.rendValeur(false)
  this.variableAssociee.valeurMini = nouvelleValeurMini
  if (this.valMin.estConstant) this.variableAssociee.chaineValeurMini = this.valMin.chaineInfo()
  else {
    this.variableAssociee.chaineValeurMini = chaineNombre(nouvelleValeurMini, 12)
  }
  const nouvelleValeurMaxi = this.valMax.rendValeur(false)
  this.variableAssociee.valeurMaxi = nouvelleValeurMaxi
  if (this.valMax.estConstant) this.variableAssociee.chaineValeurMaxi = this.valMax.chaineInfo()
  else this.variableAssociee.chaineValeurMaxi = chaineNombre(nouvelleValeurMaxi, 12)
  this.variableAssociee.valeurPas = this.valPas.rendValeur()
  if (this.valPas.estConstant) this.variableAssociee.chaineValeurPas = this.valPas.chaineInfo()
  else this.variableAssociee.chaineValeurPas = chaineNombre(nouvelleValeurMini, 12)
  this.variableAssociee.donneValeur(resultatValeurActuelle)
}
CMacroModificationVariable.prototype.metAJour = function () {
  this.etablitListesInternes()
}
CMacroModificationVariable.prototype.etablitListesInternes = function () {
  this.listeDep = new CListeObjets(this.listeProprietaire.uniteAngle, this.listeProprietaire.pointeurLongueurUnite)
  this.listeDep.ajouteObjetsDependantsSauf(this.variableAssociee, this.listeProprietaire, this)
}
CMacroModificationVariable.prototype.read = function (inps, list) {
  CMacro.prototype.read.call(this, inps, list)
  this.valMin = new CValeur()
  this.valMin.read(inps, list)
  this.valMax = new CValeur()
  this.valMax.read(inps, list)
  this.valPas = new CValeur()
  this.valPas.read(inps, list)
  this.valAct = new CValeur()
  this.valAct.read(inps, list)
  const ind1 = inps.readInt()
  this.variableAssociee = list.get(ind1, 'CVariableBornee')
  // Il faut créer la liste des éléments dépendant de la variable modifiée
  // Pour cette liste, on fait pointer la longueur unité éventuelle sur la lsite mère
  this.listeDep = new CListeObjets(list.uniteAngle, list.pointeurLongueurUnite)
}
CMacroModificationVariable.prototype.write = function (oups, list) {
  CMacro.prototype.write.call(this, oups, list)
  this.valMin.write(oups, list)
  this.valMax.write(oups, list)
  this.valPas.write(oups, list)
  this.valAct.write(oups, list)
  const ind1 = list.indexOf(this.variableAssociee)
  oups.writeInt(ind1)
}
