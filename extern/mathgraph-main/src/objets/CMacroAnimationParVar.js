/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { zero11 } from '../kernel/kernel'
import CListeObjets from './CListeObjets'
import CMacro from './CMacro'
export default CMacroAnimationParVar

/**
 * Macro d'animation de la igure par les mouvement d'un point lié.
 * @returns {CMacroAnimationParVar}
 */
/**
 * @constructor
 * @extends CMacro
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
 * @param {boolean} animationCyclique  : true si animation cyclique (si non cyclique on repart au début).
 * @param {number} frequenceAnimationMacro  La fréquence d'animation en millièmes de seconde.
 * @param {number} nombrePointsPourAnimation
 * @param {number} dureeAnimation  Durée de l'animation en dixièmes de seconde ou null pour une animation
 * @param {CVariableBornee} variableAssociee  La variable dont les valeurs génèrent l'animation.
 * @param {boolean} inverserSens  true pour que l'animation se fasse dans l'autre sens (Le sens usuel sur les cercles est
 * le sens trigonométrique direct).
 * @param {boolean} retourDepart  trus pour que le point lié reviene à son point de départ à la fin de l'animation.
 * @param {boolean} unCycle  Si true l'animation se fait sur un seul cycle et s'arrête.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroAnimationParVar}
 */
function CMacroAnimationParVar (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, animationCyclique, frequenceAnimationMacro,
  nombrePointsPourAnimation, dureeAnimation, variableAssociee, inverserSens,
  retourDepart, unCycle, fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacro.call(this, listeProprietaire)
    else {
      CMacro.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, fixed)
      this.animationCyclique = animationCyclique
      this.frequenceAnimationMacro = frequenceAnimationMacro
      this.nombrePointsPourAnimation = nombrePointsPourAnimation
      this.dureeAnimation = dureeAnimation
      this.variableAssociee = variableAssociee
      this.inverserSens = inverserSens
      this.retourDepart = retourDepart
      this.unCycle = unCycle
      this.listeDep = new CListeObjets(listeProprietaire)
    }
  }
}
CMacroAnimationParVar.prototype = new CMacro()
CMacroAnimationParVar.prototype.constructor = CMacroAnimationParVar
CMacroAnimationParVar.prototype.superClass = 'CMacro'
CMacroAnimationParVar.prototype.className = 'CMacroAnimationParVar'

CMacroAnimationParVar.prototype.numeroVersion = function () {
  return 2
}

CMacroAnimationParVar.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.variableAssociee)
  const ind2 = listeSource.indexOf(this.pointLie)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CMacroAnimationParVar(listeCible,
    listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind2, 'CPt'), this.taillePolice, this.effacementFond, this.couleurFond,
    this.alignementHorizontal, this.alignementVertical,
    this.intitule, this.commentaireMacro, this.animationCyclique, this.frequenceAnimationMacro,
    this.nombrePointsPourAnimation, this.dureeAnimation, listeCible.get(ind1, 'CVariableBornee'),
    this.inverserSens, this.retourDepart, this.unCycle, this.fixed)
}
CMacroAnimationParVar.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CMacro.prototype.depDe.call(this, p) || this.variableAssociee.depDe(p))
}
CMacroAnimationParVar.prototype.dependDePourBoucle = function (p) {
  return CMacro.prototype.dependDePourBoucle.call(this, p) || this.variableAssociee.dependDePourBoucle(p)
}
CMacroAnimationParVar.prototype.typeAnimation = function () {
  return CMacro.animationParTimer
}
CMacroAnimationParVar.prototype.frequenceAnimation = function () {
  return this.frequenceAnimationMacro
}
CMacroAnimationParVar.prototype.arretParClic = function () {
  return (this.dureeAnimation === 0)
}
CMacroAnimationParVar.prototype.metAJour = function () {
  CMacro.prototype.metAJour.call(this)
  this.etablitListesInternes()
}
CMacroAnimationParVar.prototype.etablitListesInternes = function () {
  this.listeDep.retireTout()
  this.listeDep.ajouteObjetsDependantsSauf(this.variableAssociee, this.listeProprietaire, this)
}
CMacroAnimationParVar.prototype.executionPossible = function () {
  return true // La variable associée existe toujours
}
/**
 * Lance l'exécution de la macro via un timer et une fonction de callBack.
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fonc de la figure.
 * @returns {void}
 */
CMacroAnimationParVar.prototype.execute = function (svg, dimf, couleurFond) {
  this.valeurInitiale = this.variableAssociee.valeurActuelle
  this.valeurMini = this.variableAssociee.valeurMini
  this.valeurMaxi = this.variableAssociee.valeurMaxi
  this.pas = (this.valeurMaxi - this.valeurMini) / (this.nombrePointsPourAnimation - 1)
  if (this.inverserSens) this.pas = -this.pas
  this.valeur = this.unCycle ? (this.inverserSens ? this.valeurMaxi : this.valeurMini) : this.valeurInitiale
  this.valeur -= this.pas
  // this.dt = new Date();
  const timeDebut = Date.now()
  if (this.dureeAnimation !== 0) this.timeFin = timeDebut + this.dureeAnimation * 100 // La durée est en dixièmes de secondes
  this.executionEnCours = true
  const t = this
  this.timer = setInterval(function () { CMacroAnimationParVar.executePourTimer.call(t, svg, dimf, couleurFond) },
    this.frequenceAnimationMacro)
}

// Modifié version 5.5.9 en utilisant zero11 au lieu de zero 13 car sinon certaines animations avec un seul cycle ne s'arrêtaient pas
/**
 * Fonction de callBack appelée par un timer dans execute()
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fond de la figure.
 * @returns {void}
 */
CMacroAnimationParVar.executePourTimer = function (svg, dimf, couleurFond) {
  if (!this.executionEnCours) return
  this.valeur = this.valeur + this.pas
  if (zero11(this.valeur - this.valeurMaxi)) this.valeur = this.valeurMaxi
  else
    if (zero11(this.valeur - this.valeurMini)) this.valeur = this.valeurMini

  if (this.animationCyclique) {
    if (this.inverserSens) {
      if (this.valeur < this.valeurMini) this.valeur = this.valeurMaxi
    } else if (this.valeur > this.valeurMaxi) this.valeur = this.valeurMini
  } else {
    if (this.valeur > this.valeurMaxi) {
      this.pas = -this.pas
      this.valeur = this.valeurMaxi
    } else {
      if (this.valeur < this.valeurMini) {
        this.pas = -this.pas
        this.valeur = this.valeurMini
      }
    }
  }
  this.variableAssociee.donneValeur(this.valeur)
  this.listeDep.positionne(false, dimf)
  // Ligne suivante modifié version 6.4.8 (ajout du dernier paramètre)
  this.listeDep.update(svg, couleurFond, true, true)
  const time = Date.now() // Raccourci pour (new Date()).getTime()
  if (this.unCycle) {
    if (this.inverserSens) {
      if (zero11(this.valeur - this.valeurMini) || (this.valeur < this.valeurMini)) this.termineAction(svg, dimf, couleurFond)
    } else if (zero11(this.valeur - this.valeurMaxi) || (this.valeur > this.valeurMaxi)) this.termineAction(svg, dimf, couleurFond)
  } else if ((this.dureeAnimation !== 0) && (time > this.timeFin)) this.termineAction(svg, dimf, couleurFond)
}
/**
 * Fonction appelée à la fin de l'animation.
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fonc de la figure.
 * @returns {void}
 */
CMacroAnimationParVar.prototype.termineAction = function (svg, dimf, couleurFond) {
  clearInterval(this.timer)
  this.executionEnCours = false
  if (this.retourDepart) this.variableAssociee.donneValeur(this.valeurInitiale)
  else this.variableAssociee.donneValeur(this.inverserSens ? this.valeurMini : this.valeurMaxi)
  this.listeDep.positionne(false, dimf)
  // Ligne suivante modifié version 6.4.8 (ajout du dernier paramètre)
  this.listeDep.update(svg, couleurFond, true, true)
  this.passageMacroSuiv(svg, dimf, couleurFond)
}
CMacroAnimationParVar.prototype.read = function (inps, list) {
  CMacro.prototype.read.call(this, inps, list)
  this.animationCyclique = inps.readBoolean()
  this.frequenceAnimationMacro = inps.readInt()
  this.nombrePointsPourAnimation = inps.readInt()
  this.dureeAnimation = inps.readInt()
  const ind1 = inps.readInt()
  this.variableAssociee = list.get(ind1, 'CVariable')
  if (this.nVersion < 2) {
    this.inverserSens = false
    this.retourDepart = true
    this.unCycle = false
  } else {
    this.inverserSens = inps.readBoolean()
    this.retourDepart = inps.readBoolean()
    this.unCycle = inps.readBoolean()
  }
  if (list.className !== 'CPrototype') this.listeDep = new CListeObjets(this.listeProprietaire)
}
CMacroAnimationParVar.prototype.write = function (oups, list) {
  CMacro.prototype.write.call(this, oups, list)
  oups.writeBoolean(this.animationCyclique)
  oups.writeInt(this.frequenceAnimationMacro)
  oups.writeInt(this.nombrePointsPourAnimation)
  oups.writeInt(this.dureeAnimation)
  const ind1 = list.indexOf(this.variableAssociee)
  oups.writeInt(ind1)
  oups.writeBoolean(this.inverserSens)
  oups.writeBoolean(this.retourDepart)
  oups.writeBoolean(this.unCycle)
}
