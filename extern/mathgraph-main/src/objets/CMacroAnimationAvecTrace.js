/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { zero11 } from '../kernel/kernel'
import CListeObjets from './CListeObjets'
import CMacro from './CMacro'
import CSousListeObjets from './CSousListeObjets'
import CMacroAvecListe from './CMacroAvecListe'
export default CMacroAnimationAvecTrace

/**
 * Macro d'animation générée par point lié avec trace.
 * Les objets devant laisser une trace sont contenus dans une liste.
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
 * @param {CListeObjets} listeAssociee  La liste contenant les objets qui laissent une trace.
 * @param {CPointLie} pointLieAssocie  Le point lié dont les positions génèrent la trace.
 * @param {boolean} unCycle  Si true l'animation se fait sur un seul cycle et s'arrête.
 * @param {boolean} effacementFinCycle  si true les traces d'objets sont effacées à la fin de chaque cycle.
 * @param {boolean} animationCyclique  true si animation cyclique (si non cyclique on repart au début).
 * @param {number} frequenceAnimationMacro  La fréquence d'animation en millièmes de seconde.
 * @param {number} nombrePointsPourAnimation
 * @param {number} dureeAnimation  Durée de l'animation en dixièmes de seconde ou null pour une animation
 * continue (dans ce cas un clic sur l'intitulé arrête l'animation).
 * @param {boolean} retourDepart  trus pour que le point lié reviene à son point de départ à la fin de l'animation.
 * @param {boolean} inverserSens  true pour que l'animation se fasse dans l'autre sens (Le sens usuel sur les cercles est
 * le sens trigonométrique direct).
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroAnimationAvecTrace}
 */
function CMacroAnimationAvecTrace (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, listeAssociee, pointLieAssocie, unCycle,
  effacementFinCycle, animationCyclique, frequenceAnimationMacro,
  nombrePointsPourAnimation, dureeAnimation, retourDepart, inverserSens,
  fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacroAvecListe.call(this, listeProprietaire)
    else {
      CMacroAvecListe.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, listeAssociee, fixed)
      this.pointLieAssocie = pointLieAssocie
      this.unCycle = unCycle
      this.effacementFinCycle = effacementFinCycle
      this.animationCyclique = animationCyclique
      this.frequenceAnimationMacro = frequenceAnimationMacro
      this.nombrePointsPourAnimation = nombrePointsPourAnimation
      this.dureeAnimation = dureeAnimation
      this.retourDepart = retourDepart
      this.inverserSens = inverserSens
      this.listeDep = new CListeObjets(listeProprietaire)
    }
  }
}

CMacroAnimationAvecTrace.prototype = new CMacroAvecListe()
CMacroAnimationAvecTrace.prototype.constructor = CMacroAnimationAvecTrace
CMacroAnimationAvecTrace.prototype.superClass = 'CMacroAvecListe'
CMacroAnimationAvecTrace.prototype.className = 'CMacroAnimationAvecTrace'

CMacroAnimationAvecTrace.prototype.numeroVersion = function () {
  return 2
}

CMacroAnimationAvecTrace.prototype.getClone = function (listeSource, listeCible) {
  const listeAssocieeClone = new CSousListeObjets()
  listeAssocieeClone.setImage(this.listeAssociee, listeSource, listeCible)
  const ind1 = listeSource.indexOf(this.pointLieAssocie)
  const ind2 = listeSource.indexOf(this.pointLie)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CMacroAnimationAvecTrace(listeCible,
    listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind2, 'CPt'), this.taillePolice, this.effacementFond,
    this.couleurFond, this.alignementHorizontal, this.alignementVertical,
    this.intitule, this.commentaireMacro, listeAssocieeClone, listeCible.get(ind1, 'CPointLie'),
    this.unCycle, this.effacementFinCycle, this.animationCyclique,
    this.frequenceAnimationMacro, this.nombrePointsPourAnimation, this.dureeAnimation,
    this.retourDepart, this.inverserSens)
}
CMacroAnimationAvecTrace.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CMacroAvecListe.prototype.depDe.call(this, p) || this.pointLieAssocie.depDe(p))
}
CMacroAnimationAvecTrace.prototype.dependDePourBoucle = function (p) {
  return CMacroAvecListe.prototype.dependDePourBoucle.call(this, p) || this.pointLieAssocie.dependDePourBoucle(p)
}
CMacroAnimationAvecTrace.prototype.typeAnimation = function () {
  return CMacro.animationParTimer
}
CMacroAnimationAvecTrace.prototype.arretParClic = function () {
  return (this.dureeAnimation === 0) || this.unCycle
}
CMacroAnimationAvecTrace.prototype.metAJour = function () {
  CMacroAvecListe.prototype.metAJour.call(this)
  this.etablitListesInternes()
}
CMacroAnimationAvecTrace.prototype.etablitListesInternes = function () {
  this.listeDep.retireTout()
  this.listeDep.ajouteObjetsDependantsSauf(this.pointLieAssocie, this.listeProprietaire, this)
}
CMacroAnimationAvecTrace.prototype.executionPossible = function () {
  return this.pointLieAssocie.existe
}
CMacroAnimationAvecTrace.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.pointLieAssocie)
  liste.ajouteElementsDe(this.listeAssociee)
}
CMacroAnimationAvecTrace.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointLieAssocie === ancienPoint) this.pointLieAssocie = nouveauPoint
}
CMacroAnimationAvecTrace.prototype.execute = function (svg, dimf, couleurFond) {
  this.listeProprietaire.initialiseTraces()
  this.abscisseInitiale = this.pointLieAssocie.abscisse
  this.abscisseMini = this.pointLieAssocie.abscisseMinimale()
  this.abscisseMaxi = this.pointLieAssocie.abscisseMaximale()
  if (this.abscisseMini > this.abscisseMaxi) {
    const d = this.abscisseMini
    this.abscisseMini = this.abscisseMaxi
    this.abscisseMaxi = d
  }
  this.pas = (this.abscisseMaxi - this.abscisseMini) / (this.nombrePointsPourAnimation - 1)
  if (this.inverserSens) this.pas = -this.pas
  this.abscisse = this.inverserSens ? this.abscisseMaxi : this.abscisseMini
  this.abscisse -= this.pas
  this.executionEnCours = true
  const timeDebut = Date.now()
  if (this.unCycle) this.timeFin = timeDebut + 100000000
  else if (this.dureeAnimation !== 0) this.timeFin = timeDebut + this.dureeAnimation * 100 // La durée est en dixièmes de secondes
  const t = this
  this.timer = setInterval(function () {
    CMacroAnimationAvecTrace.executePourTimer.call(t, svg, dimf, couleurFond)
  }, this.frequenceAnimationMacro)
}

// Modifié version 5.5.9 en utilisant zero11 au lieu de zero 13 car sinon certaines animations avec un seul cycle ne s'arrêtaient pas
/**
 * Fonction de callBack appelée par un timer dans execute()
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fonc de la figure.
 * @returns {void}
 */
CMacroAnimationAvecTrace.executePourTimer = function (svg, dimf, couleurFond) {
  let d
  if (!this.executionEnCours) return
  this.abscisse = this.abscisse + this.pas
  if (zero11(this.abscisse - this.abscisseMaxi)) this.abscisse = this.abscisseMaxi
  else
    if (zero11(this.abscisse - this.abscisseMini)) this.abscisse = this.abscisseMini
  if (this.unCycle) {
    d = this.inverserSens ? this.abscisse - this.abscisseMini : this.abscisse - this.abscisseMaxi
    if (this.inverserSens) {
      if (d < 0) {
        this.timeFin = 0
        this.abscisse = this.abscisseMini
      }
    } else if (d > 0) {
      this.abscisse = this.abscisseMaxi
      this.timeFin = 0
    }
  } else {
    if (this.animationCyclique) {
      if (this.inverserSens) {
        if (this.abscisse < this.abscisseMini) {
          this.abscisse = this.abscisseMaxi
          if (this.effacementFinCycle) this.effacementTraces = true
        }
      } else if (this.abscisse > this.abscisseMaxi) {
        this.abscisse = this.abscisseMini
        if (this.effacementFinCycle) this.effacementTraces = true
      }
    } else {
      if (this.abscisse < this.abscisseMini) {
        this.pas = -this.pas
        this.abscisse = this.abscisseMini
        if (this.effacementFinCycle) this.effacementTraces = true
      } else if (this.abscisse > this.abscisseMaxi) {
        this.pas = -this.pas
        this.abscisse = this.abscisseMaxi
        if (this.effacementFinCycle) this.effacementTraces = true
      }
    }
  }
  if (this.effacementTraces) {
    this.listeProprietaire.deleteTraces()
    this.effacementTraces = false
  }
  this.pointLieAssocie.donneAbscisse(this.abscisse)
  // On déplace le point lié vers sa nouvelle position
  this.listeDep.positionne(false, dimf)
  this.listeProprietaire.addTraces(this.listeAssociee)
  // this.listeProprietaire.update(svg, couleurFond, transparence, true); // Modifié version 4.9.2
  // Ligne suivante modifié version 6.4.8 (ajout du dernier paramètre)
  this.listeDep.update(svg, couleurFond, true, true)
  const time = Date.now() // Raccourci pour (new Date()).getTime()
  /*
  if ((this.dureeAnimation !== 0) && (time > this.timeFin))
    this.termineAction(svg, dimf, couleurFond, transparence);
    */
  if (this.unCycle) {
    if (this.inverserSens) {
      if (zero11(this.abscisse - this.abscisseMini) || (this.abscisse < this.abscisseMini)) this.termineAction(svg, dimf, couleurFond)
    } else if (zero11(this.abscisse - this.abscisseMaxi) || (this.abscisse > this.abscisseMaxi)) this.termineAction(svg, dimf, couleurFond)
  } else if ((this.dureeAnimation !== 0) && (time > this.timeFin)) this.termineAction(svg, dimf, couleurFond)
}
CMacroAnimationAvecTrace.prototype.termineAction = function (svg, dimf, couleurFond) {
  if (this.timer !== null) clearInterval(this.timer)
  this.executionEnCours = false
  if (this.retourDepart) this.pointLieAssocie.donneAbscisse(this.abscisseInitiale)
  else this.pointLieAssocie.donneAbscisse(this.inverserSens ? this.abscisseMini : this.abscisseMaxi)
  this.listeDep.positionne(false, dimf)
  // Ligne suivante modifié version 6.4.8 (ajout du dernier paramètre)
  this.listeDep.update(svg, couleurFond, true, true)
  this.passageMacroSuiv(svg, dimf, couleurFond)
}
CMacroAnimationAvecTrace.prototype.read = function (inps, list) {
  CMacroAvecListe.prototype.read.call(this, inps, list)
  this.unCycle = inps.readBoolean()
  this.effacementFinCycle = inps.readBoolean()
  this.animationCyclique = inps.readBoolean()
  this.frequenceAnimationMacro = inps.readInt()
  this.nombrePointsPourAnimation = inps.readInt()
  this.dureeAnimation = inps.readInt()
  const ind1 = inps.readInt()
  this.pointLieAssocie = list.get(ind1, 'CPointLie')
  if (this.nVersion < 2) {
    this.retourDepart = true
    this.inverserSens = false
  } else {
    this.retourDepart = inps.readBoolean()
    this.inverserSens = inps.readBoolean()
  }
  // this.listeDep = new CListeObjets(list.uniteAngle, list.pointeurLongueurUnite);
  // Pour arrêter la macro quand elle n'effectue qu'un seul cycle
  // il ne faut pas que dureeAnimation soit nul;
  if (this.unCycle) this.dureeAnimation = 1
  if (list.className !== 'CPrototype') this.listeDep = new CListeObjets(this.listeProprietaire)
}
CMacroAnimationAvecTrace.prototype.write = function (oups, list) {
  CMacroAvecListe.prototype.write.call(this, oups, list)
  oups.writeBoolean(this.unCycle)
  oups.writeBoolean(this.effacementFinCycle)
  oups.writeBoolean(this.animationCyclique)
  oups.writeInt(this.frequenceAnimationMacro)
  oups.writeInt(this.nombrePointsPourAnimation)
  oups.writeInt(this.dureeAnimation)
  const ind1 = list.indexOf(this.pointLieAssocie)
  oups.writeInt(ind1)
  oups.writeBoolean(this.retourDepart)
  oups.writeBoolean(this.inverserSens)
}
