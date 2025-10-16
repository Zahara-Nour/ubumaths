/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacro from './CMacro'
import CMacroAvecListe from './CMacroAvecListe'
import CSousListeObjets from './CSousListeObjets'
import addQueue from 'src/kernel/addQueue'
export default CMacroApparition

/**
 * Macro rendant visibles des objets de la figure.
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
 * @param {CListeObjets} listeAssociee  La liste des objets à démasquer.
 * @param {boolean} clicPourObjetSuivant  Si true, les objets sont démasqués au fur et à mesure des clics de souris.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroApparition}
 */
function CMacroApparition (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, listeAssociee,
  clicPourObjetSuivant, fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacroAvecListe.call(this, listeProprietaire)
    else {
      CMacroAvecListe.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, listeAssociee, fixed)
      this.clicPourObjetSuivant = clicPourObjetSuivant
    }
  }
}
CMacroApparition.prototype = new CMacroAvecListe()
CMacroApparition.prototype.constructor = CMacroApparition
CMacroApparition.prototype.superClass = 'CMacroAvecListe'
CMacroApparition.prototype.className = 'CMacroApparition'

CMacroApparition.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.pointLie)
  const ind2 = listeSource.indexOf(this.impProto)
  const listeAssocieeClone = new CSousListeObjets()
  listeAssocieeClone.setImage(this.listeAssociee, listeSource, listeCible)
  return new CMacroApparition(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind1, 'CPt'), this.taillePolice,
    this.effacementFond, this.couleurFond, this.alignementHorizontal, this.alignementVertical,
    this.intitule, this.commentaireMacro, listeAssocieeClone, this.clicPourObjetSuivant, this.fixed)
}
CMacroApparition.prototype.initialise = function () {
  // Ajout version 5.1 pour que macroEnCours de la liste proprietaite pointe sur this
  CMacro.prototype.initialise.call(this)
  //
  if (this.clicPourObjetSuivant) this.indiceDernierObjetTraite = -1
}
CMacroApparition.prototype.termineAction = function (svg, dimf, couleurFond) {
  if ((this.clicPourObjetSuivant) && (this.indiceDernierObjetTraite !== this.listeAssociee.longueur() - 1)) this.executionEnCours = true
  else {
    // this.executionEnCours = false;
    // this.indiceDernierObjetTraite = -1;
    CMacroAvecListe.prototype.termineAction.call(this, svg, dimf, couleurFond)
  }
}
/**
 * Lance l'exécution de la macro.
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fonc de la figure.
 * @returns {void}
 */
CMacroApparition.prototype.execute = function (svg, dimf, couleurFond) {
  let el
  const list = this.listeProprietaire
  if (!list.documentProprietaire.modeTraceActive) list.deleteTraces() // Ajout version 4.9.2
  // Pas d'apparition pas à pas pour la version JavaScript
  if (this.clicPourObjetSuivant && this.listeAssociee.longueur() !== 1) {
    // Modification par rapport à la version C++. On saute les objets déjà visibles
    this.indiceDernierObjetTraite++
    el = this.listeAssociee.get(this.indiceDernierObjetTraite)
    if (!el.masque) {
      while (this.indiceDernierObjetTraite < this.listeAssociee.longueur()) {
        el = this.listeAssociee.get(this.indiceDernierObjetTraite)
        if (el.masque) break
        else this.indiceDernierObjetTraite++
      }
      if (this.indiceDernierObjetTraite === this.listeAssociee.longueur()) {
        this.indiceDernierObjetTraite--
        this.termineAction(svg, dimf, couleurFond)
        return
      }
    }
    el.montre()
    el.setReady4MathJaxUpdate()
    // el.update(svg, couleurFond, transparence, true);
    /* Modifié version 6.4.1
    addQueue([this.listeProprietaire.callBack, el, svg, couleurFond, transparence, false])
    */
    addQueue(function () {
      list.callBack(el, svg, couleurFond, false)
    })
    if (this.indiceDernierObjetTraite === this.listeAssociee.longueur() - 1) this.termineAction(svg, dimf, couleurFond)
  } else {
    this.listeAssociee.montreTout(true)
    this.executionEnCours = false
    this.listeAssociee.update(svg, couleurFond, true)
    this.termineAction(svg, dimf, couleurFond)
  }
}
/**
 * Fonction appelée pour les CMacroSuiteMacros.
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fonc de la figure.
 * @returns {void}
 */
CMacroApparition.prototype.passageMacroSuiv = function (svg, dimf, couleurFond) {
  if (this.clicPourObjetSuivant && this.listeAssociee.longueur() !== 1) {
    if (this.indiceDernierObjetTraite === this.listeAssociee.longueur() - 1) { CMacro.passageMacroSuiv.call(this, svg, dimf, couleurFond) }
  } else CMacro.passageMacroSuiv.call(this, svg, dimf, couleurFond)
}
CMacroApparition.prototype.ajouteAntecedents = function (liste) {
  liste.ajouteElementsDe(this.listeAssociee)
}
CMacroApparition.prototype.read = function (inps, list) {
  CMacroAvecListe.prototype.read.call(this, inps, list)
  this.clicPourObjetSuivant = inps.readBoolean()
}
CMacroApparition.prototype.write = function (oups, list) {
  CMacroAvecListe.prototype.write.call(this, oups, list)
  oups.writeBoolean(this.clicPourObjetSuivant)
}
