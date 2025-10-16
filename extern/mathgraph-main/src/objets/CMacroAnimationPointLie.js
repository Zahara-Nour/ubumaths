/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { zero11 } from '../kernel/kernel'
import CListeObjets from './CListeObjets'
import CMacro from './CMacro'
export default CMacroAnimationPointLie

/**
 * Macro d'animation de la igure par les mouvement d'un point lié.
 * @returns {CMacroAnimationPointLie}
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
 * @param {CPointLie} pointLieAssocie  Le point lié dont le mouvement génère l'animation.
 * @param {boolean} inverserSens  true pour que l'animation se fasse dans l'autre sens (Le sens usuel sur les cercles est
 * le sens trigonométrique direct).
 * @param {boolean} retourDepart  trus pour que le point lié reviene à son point de départ à la fin de l'animation.
 * @param {boolean} unCycle  Si true l'animation se fait sur un seul cycle et s'arrête.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroAnimationPointLie}
 */
function CMacroAnimationPointLie (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, animationCyclique, frequenceAnimationMacro,
  nombrePointsPourAnimation, dureeAnimation, pointLieAssocie, inverserSens,
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
      this.pointLieAssocie = pointLieAssocie
      this.inverserSens = inverserSens
      this.retourDepart = retourDepart
      this.unCycle = unCycle
      this.listeDep = new CListeObjets(listeProprietaire)
    }
  }
}
CMacroAnimationPointLie.prototype = new CMacro()
CMacroAnimationPointLie.prototype.constructor = CMacroAnimationPointLie
CMacroAnimationPointLie.prototype.superClass = 'CMacro'
CMacroAnimationPointLie.prototype.className = 'CMacroAnimationPointLie'

CMacroAnimationPointLie.prototype.numeroVersion = function () {
  return 2
}

CMacroAnimationPointLie.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.pointLieAssocie)
  const ind2 = listeSource.indexOf(this.pointLie)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CMacroAnimationPointLie(listeCible,
    listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind2, 'CPt'), this.taillePolice, this.effacementFond, this.couleurFond,
    this.alignementHorizontal, this.alignementVertical,
    this.intitule, this.commentaireMacro, this.animationCyclique, this.frequenceAnimationMacro,
    this.nombrePointsPourAnimation, this.dureeAnimation, listeCible.get(ind1, 'CPointLie'),
    this.inverserSens, this.retourDepart, this.unCycle, this.fixed)
}
CMacroAnimationPointLie.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CMacro.prototype.depDe.call(this, p) || this.pointLieAssocie.depDe(p))
}
CMacroAnimationPointLie.prototype.dependDePourBoucle = function (p) {
  return CMacro.prototype.dependDePourBoucle.call(this, p) || this.pointLieAssocie.dependDePourBoucle(p)
}
CMacroAnimationPointLie.prototype.typeAnimation = function () {
  return CMacro.animationParTimer
}
CMacroAnimationPointLie.prototype.frequenceAnimation = function () {
  return this.frequenceAnimationMacro
}
CMacroAnimationPointLie.prototype.arretParClic = function () {
  return (this.dureeAnimation === 0)
}
CMacroAnimationPointLie.prototype.metAJour = function () {
  CMacro.prototype.metAJour.call(this)
  this.etablitListesInternes()
}
CMacroAnimationPointLie.prototype.etablitListesInternes = function () {
  this.listeDep.retireTout()
  this.listeDep.ajouteObjetsDependantsSauf(this.pointLieAssocie, this.listeProprietaire, this)
}
CMacroAnimationPointLie.prototype.executionPossible = function () {
  return this.pointLieAssocie?.existe
}
CMacroAnimationPointLie.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.pointLieAssocie)
}
CMacroAnimationPointLie.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointLieAssocie === ancienPoint) this.pointLieAssocie = nouveauPoint
}
/**
 * Lance l'exécution de la macro via un timer et une fonction de callBack.
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fonc de la figure.
 * @returns {void}
 */
CMacroAnimationPointLie.prototype.execute = function (svg, dimf, couleurFond) {
  this.abscisseInitiale = this.pointLieAssocie.abscisse
  this.abscisseMini = this.pointLieAssocie.abscisseMinimale()
  this.abscisseMaxi = this.pointLieAssocie.abscisseMaximale()
  if (this.abscisseMini > this.abscisseMaxi) {
    const d = this.abscisseMini
    this.abscisseMini = this.abscisseMaxi
    this.abscisseMaxi = d
  }
  // Ligne suivante modifiée pour la version 1.8
  this.pas = (this.abscisseMaxi - this.abscisseMini) / (this.nombrePointsPourAnimation - 1)
  if (this.inverserSens) this.pas = -this.pas
  this.abscisse = this.unCycle ? (this.inverserSens ? this.abscisseMaxi : this.abscisseMini) : this.abscisseInitiale
  // Ligne suivante ajoutée version 6.8.1
  this.abscisse -= this.pas
  // this.dt = new Date();
  const timeDebut = Date.now()
  if (this.dureeAnimation !== 0) this.timeFin = timeDebut + this.dureeAnimation * 100 // La durée est en dixièmes de secondes
  this.executionEnCours = true
  const t = this
  this.timer = setInterval(function () { CMacroAnimationPointLie.executePourTimer.call(t, svg, dimf, couleurFond) },
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
CMacroAnimationPointLie.executePourTimer = function (svg, dimf, couleurFond) {
  if (!this.executionEnCours) return
  this.abscisse = this.abscisse + this.pas
  if (zero11(this.abscisse - this.abscisseMaxi)) this.abscisse = this.abscisseMaxi
  else
    if (zero11(this.abscisse - this.abscisseMini)) this.abscisse = this.abscisseMini

  if (this.animationCyclique) {
    if (this.inverserSens) {
      if (this.abscisse < this.abscisseMini) this.abscisse = this.abscisseMaxi
    } else if (this.abscisse > this.abscisseMaxi) this.abscisse = this.abscisseMini
  } else {
    if (this.abscisse > this.abscisseMaxi) {
      this.pas = -this.pas
      this.abscisse = this.abscisseMaxi
    } else {
      if (this.abscisse < this.abscisseMini) {
        this.pas = -this.pas
        this.abscisse = this.abscisseMini
      }
    }
  }
  this.pointLieAssocie.donneAbscisse(this.abscisse)
  this.listeDep.positionne(false, dimf)
  // Ligne suivante modifié version 6.4.8 (ajout du dernier paramètre)
  this.listeDep.update(svg, couleurFond, true, true)
  const time = Date.now() // Raccourci pour (new Date()).getTime()
  if (this.unCycle) {
    if (this.inverserSens) {
      if (zero11(this.abscisse - this.abscisseMini) || (this.abscisse < this.abscisseMini)) this.termineAction(svg, dimf, couleurFond)
    } else if (zero11(this.abscisse - this.abscisseMaxi) || (this.abscisse > this.abscisseMaxi)) this.termineAction(svg, dimf, couleurFond)
  } else if ((this.dureeAnimation !== 0) && (time > this.timeFin)) this.termineAction(svg, dimf, couleurFond)
}
/**
 * Fonction appelée à la fin de l'animation.
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fonc de la figure.
 * @returns {void}
 */
CMacroAnimationPointLie.prototype.termineAction = function (svg, dimf, couleurFond) {
  clearInterval(this.timer)
  this.executionEnCours = false
  if (this.retourDepart) this.pointLieAssocie.donneAbscisse(this.abscisseInitiale)
  else this.pointLieAssocie.donneAbscisse(this.inverserSens ? this.abscisseMini : this.abscisseMaxi)
  this.listeDep.positionne(false, dimf)
  // Ligne suivante modifié version 6.4.8 (ajout du dernier paramètre)
  this.listeDep.update(svg, couleurFond, true, true)
  this.passageMacroSuiv(svg, dimf, couleurFond)
}
CMacroAnimationPointLie.prototype.read = function (inps, list) {
  CMacro.prototype.read.call(this, inps, list)
  this.animationCyclique = inps.readBoolean()
  this.frequenceAnimationMacro = inps.readInt()
  this.nombrePointsPourAnimation = inps.readInt()
  this.dureeAnimation = inps.readInt()
  const ind1 = inps.readInt()
  this.pointLieAssocie = list.get(ind1, 'CPointLie')
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
CMacroAnimationPointLie.prototype.write = function (oups, list) {
  CMacro.prototype.write.call(this, oups, list)
  oups.writeBoolean(this.animationCyclique)
  oups.writeInt(this.frequenceAnimationMacro)
  oups.writeInt(this.nombrePointsPourAnimation)
  oups.writeInt(this.dureeAnimation)
  const ind1 = list.indexOf(this.pointLieAssocie)
  oups.writeInt(ind1)
  oups.writeBoolean(this.inverserSens)
  oups.writeBoolean(this.retourDepart)
  oups.writeBoolean(this.unCycle)
}
