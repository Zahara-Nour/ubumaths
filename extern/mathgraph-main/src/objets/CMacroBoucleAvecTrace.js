/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import CListeObjets from './CListeObjets'
import CMacro from './CMacro'
import CMacroAvecListe from './CMacroAvecListe'
import CSousListeObjets from './CSousListeObjets'
export default CMacroBoucleAvecTrace

/**
 * Macro animant la figure en donnant des valeurs à une variable allant
 * de sa valeur mini à sa valeur maxi. A cg=haue boucle, les objets de listeAssociee
 * laissent une trace.
 * Avant l'animation, la macro macroAvanatBoucles est exécutée.
 * A la fin de chaque boucle, la macro macroFinBoucle est exécutée.
 * Ce type de macro sert à faire des expériences aléatoires animées.
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
 * @param {CListeObjets} listeAssociee  La liste des objets qui laissent une trace.
 * @param {number} frequenceAnimation  La fréquence d'animation en millièmes de seconde.
 * @param {boolean} animationVisible  si false, on fait les boucles sans réafficher la figure.
 * @param {CVariableBornee} variableAssociee  La variable dont les valeurs génèrent l'animation.
 * @param {CMacro} macroAvantBoucles  La macro d'initialisation avant de commencer les boucles.
 * @param {CMacro} macroFinBoucle  La macro à exécuter à la fin de chaque boucle.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroBoucleAvecTrace}
 */
function CMacroBoucleAvecTrace (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, listeAssociee, frequenceAnimation,
  animationVisible, variableAssociee, macroAvantBoucles,
  macroFinBoucle, fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacroAvecListe.call(this, listeProprietaire)
    else {
      CMacroAvecListe.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, listeAssociee, fixed)
      this.frequenceAnimation = frequenceAnimation
      this.animationVisible = animationVisible
      this.variableAssociee = variableAssociee
      this.macroAvantBoucles = macroAvantBoucles
      this.macroFinBoucle = macroFinBoucle
    }
    this.listeElementsDependants = new CListeObjets(listeProprietaire)
    this.listeElementsDependantMacroFin = new CListeObjets(listeProprietaire)
    this.listeElementsAReafficher = new CListeObjets(listeProprietaire) // Spécial JavaScript
    this.listeVariablesModifiees = new CListeObjets(listeProprietaire)
  }
}

CMacroBoucleAvecTrace.prototype = new CMacroAvecListe()
CMacroBoucleAvecTrace.prototype.constructor = CMacroBoucleAvecTrace
CMacroBoucleAvecTrace.prototype.superClass = 'CMacroAvecListe'
CMacroBoucleAvecTrace.prototype.className = 'CMacroBoucleAvecTrace'

CMacroBoucleAvecTrace.prototype.getClone = function (listeSource, listeCible) {
  let mac2, mac3
  const listeAssocieeClone = new CSousListeObjets()
  listeAssocieeClone.setImage(this.listeAssociee, listeSource, listeCible)
  const ind1 = listeSource.indexOf(this.variableAssociee)
  if (this.macroAvantBoucles === null) { mac2 = null } else {
    const ind2 = listeSource.indexOf(this.macroAvantBoucles)
    mac2 = listeCible.get(ind2, 'CMacro')
  }
  if (this.macroFinBoucle === null) { mac3 = null } else {
    const ind3 = listeSource.indexOf(this.macroFinBoucle)
    mac3 = listeCible.get(ind3, 'CMacro')
  }
  const ind4 = listeSource.indexOf(this.pointLie)
  const ind5 = listeSource.indexOf(this.impProto)
  return new CMacroBoucleAvecTrace(listeCible, listeCible.get(ind5, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind4, 'CPt'), this.taillePolice, this.effacementFond,
    this.couleurFond, this.alignementHorizontal, this.alignementVertical,
    this.intitule, this.commentaireMacro, listeAssocieeClone, this.frequenceAnimation,
    this.animationVisible, listeCible.get(ind1, 'CVariableBornee'), mac2, mac3, this.fixed)
}
CMacroBoucleAvecTrace.prototype.agitSurVariable = function (va) {
  return this.macroAvantBoucles.agitSurVariable(va) || this.macroFinBoucle.agitSurVariable(va)
}
CMacroBoucleAvecTrace.prototype.typeAnimation = function () {
  if ((this.animationVisible) && (this.frequenceAnimation !== 0)) { return CMacro.animationParTimer } else { return CMacro.animationParThread }
}
CMacroBoucleAvecTrace.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  let res = false
  if (this.macroAvantBoucles !== null) { res |= this.macroAvantBoucles.depDe(p) }
  if (this.macroFinBoucle !== null) { res |= this.macroFinBoucle.depDe(p) }
  return this.memDep(res || CMacroAvecListe.prototype.depDe.call(this, p))
}
CMacroBoucleAvecTrace.prototype.dependDePourBoucle = function (p) {
  let res = false
  if (this.macroAvantBoucles !== null) { res |= this.macroAvantBoucles.dependDePourBoucle(p) }
  if (this.macroFinBoucle !== null) { res |= this.macroFinBoucle.dependDePourBoucle(p) }
  return res || CMacroAvecListe.prototype.dependDePourBoucle.call(this, p)
}
CMacroBoucleAvecTrace.prototype.metAJour = function () {
  CMacroAvecListe.prototype.metAJour.call(this)
  this.etablitListesInternes()
}
CMacroBoucleAvecTrace.prototype.etablitListesInternes = function () {
  let i, ptb1, j, ptv2
  const lp = this.listeProprietaire
  this.listeElementsDependants.retireTout()
  this.listeElementsDependantMacroFin.retireTout()
  this.listeVariablesModifiees.retireTout()
  this.listeElementsAReafficher.retireTout() // Ajout version 6.4.1
  for (i = 0; i < lp.longueur(); i++) {
    ptb1 = lp.get(i)
    if (ptb1.dependDePourBoucle(this.variableAssociee)) {
      this.listeElementsDependants.add(ptb1)
    }
    if (this.macroFinBoucle !== null) { // Remanié version 6.4.1
      if (ptb1.getNatureCalcul() === NatCal.NVariable) {
        // CVariableBornee ptv1 = (CVariableBornee) ptb1;
        if ((ptb1 !== this.variableAssociee) && this.macroFinBoucle.agitSurVariable(ptb1)) { this.listeVariablesModifiees.add(ptb1) }
      }
    }
  }
  if (this.macroFinBoucle !== null) {
    // Il faut aussi créer la liste des éléments dépendants
    // d'une variable sur laquelle agit la macro
    // exécutée à la fin de chaque liste
    for (i = 0; i < lp.longueur(); i++) {
      ptb1 = lp.get(i)
      if (ptb1.getNature() !== NatObj.NMacro) {
        for (j = 0; j < this.listeVariablesModifiees.longueur(); j++) {
          ptv2 = this.listeVariablesModifiees.get(j)
          if (ptb1.depDe(ptv2)) {
            if (this.listeElementsDependantMacroFin.indexOf(ptb1) === -1) {
              if (ptb1.estDeNatureCalcul(NatCal.NTteValRSaufConst)) {
                if (!this.macroFinBoucle.affecteValeurAVariable(ptb1)) { this.listeElementsDependantMacroFin.add(ptb1) }
              } else this.listeElementsDependantMacroFin.add(ptb1)
            }
          }
        }
      }
    }
    // this.listeElementsAReafficher.ajouteElementsDe(this.listeElementsDependants) // Modifié version 6.4.1
    for (i = 0; i < this.listeElementsDependants.longueur(); i++) {
      ptb1 = this.listeElementsDependants.get(i)
      // Modification version 6.4.1
      if (ptb1.estDeNature(NatObj.NTtObj) && !ptb1.estDeNature(NatObj.NMacro)) { this.listeElementsAReafficher.add(ptb1) }
    }

    for (i = 0; i < this.listeElementsDependantMacroFin.longueur(); i++) {
      ptb1 = this.listeElementsDependantMacroFin.get(i)
      // if (!this.listeElementsAReafficher.contains(ptb1)) { this.listeElementsAReafficher.add(ptb1) }       // Modification version 6.4.1
      if (ptb1.estDeNature(NatObj.NTtObj) && !this.listeElementsAReafficher.contains(ptb1) &&
          !ptb1.estDeNature(NatObj.NMacro)) this.listeElementsAReafficher.add(ptb1)
    }
  }
}
// Doit renvoyer true car il peut n'y avoir qu'un objet à tracer qui peut ne pas exister au début des boucles
CMacroBoucleAvecTrace.prototype.executionPossible = function () {
  return true
}
/**
 * Lance l'exécution de la macro via un timer et une fonction de callBack.
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fonc de la figure.
 * @returns {void}
 */
CMacroBoucleAvecTrace.prototype.execute = function (svg, dimf, couleurFond) {
  this.listeProprietaire.initialiseTraces()
  if (this.macroAvantBoucles !== null) {
    if (this.macroAvantBoucles.executionPossible()) { this.macroAvantBoucles.executeSimple(dimf) }
  }
  // Control.InvalideControl();
  this.pas = this.variableAssociee.valeurPas
  this.valeurMinimale = this.variableAssociee.valeurMini
  this.valeurMaximale = this.variableAssociee.valeurMaxi
  this.valeurCourante = this.valeurMinimale
  this.executionEnCours = true
  const t = this
  if (this.animationVisible) {
    this.timer = setInterval(function () {
      CMacroBoucleAvecTrace.executePourTimer.call(t, svg, dimf, couleurFond)
    }, this.frequenceAnimation)
  } else {
    this.timer = setInterval(function () {
      CMacroBoucleAvecTrace.executePourTimerSpeed.call(t, svg, dimf, couleurFond)
    }, this.frequenceAnimation)
  }
}
/**
 * Fonction de callBack appelée par un timer dans execute()
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fond de la figure.
 * @returns {void}
 */
CMacroBoucleAvecTrace.executePourTimer = function (svg, dimf, couleurFond) {
  if (!this.executionEnCours) return
  this.variableAssociee.donneValeur(this.valeurCourante)
  this.listeElementsDependants.positionne(true, dimf)
  this.listeProprietaire.addTraces(this.listeAssociee)
  // listeAssociee.afficheToutMemeMasquesPourTrace(cadre.tbuffer, cadre.dimf, doc.couleurFond, doc.opacity,
  //    cadre.frame.pref_antialiasing);
  if ((this.macroFinBoucle !== null) && (this.valeurCourante <= this.valeurMaximale)) {
    if (this.macroFinBoucle.executionPossible()) { this.macroFinBoucle.executeSimple(dimf) }
    // this.listeElementsDependantMacroFin.positionne(false, dimf) // Modifié version 6
    this.listeElementsDependantMacroFin.positionneFull(false, dimf)
    // Ligne suivante modifié version 6.4.8 (ajout du dernier paramètre)
    this.listeElementsAReafficher.update(svg, couleurFond, true, true)
  }
  this.valeurCourante += this.pas
  if (this.valeurCourante > this.valeurMaximale) {
    this.termineAction(svg, dimf, couleurFond)
  }
}
/**
 * Fonction de callBack appelée lors de l'animation sans que les animations intermédiaires soient affichées.
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fond de la figure.
 * @returns {void}
 */
CMacroBoucleAvecTrace.executePourTimerSpeed = function (svg, dimf, couleurFond) {
  if (!this.executionEnCours) return
  while (this.valeurCourante <= this.valeurMaximale) {
    this.variableAssociee.donneValeur(this.valeurCourante)
    this.listeElementsDependants.positionne(true, dimf)
    this.listeProprietaire.addTraces(this.listeAssociee)
    if ((this.macroFinBoucle !== null) && (this.valeurCourante <= this.valeurMaximale)) {
      if (this.macroFinBoucle.executionPossible()) { this.macroFinBoucle.executeSimple(dimf) }
      // this.listeElementsDependantMacroFin.positionne(false, dimf)
      this.listeElementsDependantMacroFin.positionneFull(false, dimf) // Modifié version 6
    }
    this.valeurCourante += this.pas
  }
  if (this.valeurCourante > this.valeurMaximale) {
    this.termineAction(svg, dimf, couleurFond)
    // Ligne suivante modifié version 6.4.8 (ajout du dernier paramètre)
    this.listeElementsAReafficher.update(svg, couleurFond, true, true)
  }
}
CMacroBoucleAvecTrace.prototype.termineAction = function (svg, dimf, couleurFond) {
  clearInterval(this.timer)
  this.executionEnCours = false
  this.passageMacroSuiv(svg, dimf, couleurFond)
}
CMacroBoucleAvecTrace.prototype.ajouteAntecedents = function (liste) {
  liste.ajouteElementsDe(this.listeAssociee)
}
CMacroBoucleAvecTrace.prototype.read = function (inps, list) {
  CMacroAvecListe.prototype.read.call(this, inps, list)
  this.animationVisible = inps.readBoolean()
  this.frequenceAnimation = inps.readInt()
  // Fréquence à vitesse maxi remplacée par 1/1000 de seconde
  // Modifié version 4.7.6.1. Seulement pour l'applet
  // if (frequenceAnimation === 0)
  // frequenceAnimation = 1;
  const ind1 = inps.readInt()
  this.variableAssociee = list.get(ind1, 'CVariableBornee')
  const ind2 = inps.readInt()
  if (ind2 === -1) this.macroAvantBoucles = null
  else this.macroAvantBoucles = list.get(ind2, 'CMacro')
  const ind3 = inps.readInt()
  if (ind3 === -1) this.macroFinBoucle = null
  else this.macroFinBoucle = list.get(ind3, 'CMacro')
  if (list.className !== 'CPrototype') {
    this.listeElementsDependants = new CListeObjets(this.listeProprietaire)
    this.listeElementsDependantMacroFin = new CListeObjets(this.listeProprietaire)
    this.listeElementsAReafficher = new CListeObjets(this.listeProprietaire)
    this.listeVariablesModifiees = new CListeObjets(this.listeProprietaire)
  }
}
CMacroBoucleAvecTrace.prototype.write = function (oups, list) {
  CMacroAvecListe.prototype.write.call(this, oups, list)
  oups.writeBoolean(this.animationVisible)
  oups.writeInt(this.frequenceAnimation)
  const ind1 = list.indexOf(this.variableAssociee)
  oups.writeInt(ind1)
  let ind2
  if (this.macroAvantBoucles === null) ind2 = -1
  else ind2 = list.indexOf(this.macroAvantBoucles)
  oups.writeInt(ind2)
  let ind3
  if (this.macroFinBoucle === null) ind3 = -1
  else ind3 = list.indexOf(this.macroFinBoucle)
  oups.writeInt(ind3)
}
