/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacro from './CMacro'
import CMacroAvecListe from './CMacroAvecListe'
import CSousListeObjets from './CSousListeObjets'
export default CMacroSuiteMacros

/**
 * Macro exécutant à la suite les une des autres une liste de macros.
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
 * @param {CListeObjets} listeAssociee  Liste contenant les macros à exécuter.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroSuiteMacros}
 */
function CMacroSuiteMacros (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, listeAssociee,
  fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacroAvecListe.call(this, listeProprietaire)
    else {
      CMacroAvecListe.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, listeAssociee, fixed)
    }
  }
}
CMacroSuiteMacros.prototype = new CMacroAvecListe()
CMacroSuiteMacros.prototype.constructor = CMacroSuiteMacros
CMacroSuiteMacros.prototype.superClass = 'CMacroAvecListe'
CMacroSuiteMacros.prototype.className = 'CMacroSuiteMacros'

CMacroSuiteMacros.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.pointLie)
  const ind2 = listeSource.indexOf(this.impProto)
  const listeAssocieeClone = new CSousListeObjets()
  listeAssocieeClone.setImage(this.listeAssociee, listeSource, listeCible)
  return new CMacroSuiteMacros(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY,
    this.masque, listeCible.get(ind1, 'CPt'), this.taillePolice,
    this.effacementFond, this.couleurFond, this.alignementHorizontal, this.alignementVertical,
    this.intitule, this.commentaireMacro, listeAssocieeClone, this.fixed)
}
CMacroSuiteMacros.prototype.macroEnCours = function () {
  if (this.indiceMacroEnCours < this.listeAssociee.longueur()) { return this.listeAssociee.get(this.indiceMacroEnCours).macroEnCours() } else return this
}
/**
 * Ajout version 5.1
 * Il faut mettre indiceMacroEnCours à 0 car une macro peut déjà avoir été utilisée dans une autre macro
 * @param {CMacro} mac
 * @returns {void}
 */
CMacroSuiteMacros.prototype.setMacroLanceuse = function (mac) {
  CMacro.prototype.setMacroLanceuse.call(this, mac)
  this.indiceMacroEnCours = 0
}

CMacroSuiteMacros.prototype.initialise = function () {
  const ptMacro = this.listeAssociee.get(0)
  ptMacro.initialise()
  ptMacro.setMacroLanceuse(this)
  this.indiceMacroEnCours = 0
  this.executionEnCours = true
  const mac = this.macroEnCours()
  mac.initialise()
  mac.executionEnCours = true
}
CMacroSuiteMacros.prototype.typeAnimation = function () {
  if (this.indiceMacroEnCours < this.listeAssociee.longueur()) { return this.macroEnCours().typeAnimation() } else return CMacro.sansAnimation
}
/**
 * Fait passer à l'exécution de la macro suivante de la liste.
 * @param {SVGElement} svg  Le svg de la figure.
 * @param {Dimf} dimf  Les dimensions du svg
 * @param {Color} couleurFond  La couleur de fonc de la figure.
 * @returns {void}
 */
CMacroSuiteMacros.prototype.passageMacroSuiv = function (svg, dimf, couleurFond) {
  // Modification java : si la macro en cours est une macro d'apparition d'objets avec clic pour
  // passer à l'objet suivant, on ne passe à la macro suivante qui si le dernier objet a été affiché.
  // Sinon on fait apparaitre l'objet suivant
  /*
  Ajout version 6.4 pour pouvoir décativer un enchainement de macros
   */
  if (this.listeProprietaire.terminerMacros) {
    this.indiceMacroEnCours = 0
    this.executionEnCours = false
    return
  }
  //
  let mac = this.macroEnCours()
  if (mac.className === 'CMacroApparition') {
    if (mac.clicPourObjetSuivant && (mac.indiceDernierObjetTraite < mac.listeAssociee.longueur() - 1)) {
      this.listeProprietaire.update(svg, couleurFond, true)
      return
    }
  }
  // mac.termineAction(svg, dimf, couleurFond, transparence);
  this.indiceMacroEnCours++
  if (this.indiceMacroEnCours < this.listeAssociee.longueur()) {
    mac = this.listeAssociee.get(this.indiceMacroEnCours) // Puet pointer sur une CMacroSuiteMacros
    mac.setMacroLanceuse(this)
    mac.initialise()
    mac = this.macroEnCours()
    if (mac.executionPossible()) {
      mac.initialise()
      // if (macroEnCours().typeAnimation() == CMacro.sansAnimation) cadre.paneFigure.repaint();
      // executionEnCours = true;
      mac.execute(svg, dimf, couleurFond, true)
      return
    }
  }
  this.executionEnCours = false
  if (this.macroLanceuse === null) {
    this.listeProprietaire.macroEnCours = null
  } else {
    this.macroLanceuse.passageMacroSuiv(svg, dimf, couleurFond)
  }
}
CMacroSuiteMacros.prototype.agitSurVariable = function (va) {
  for (let i = 0; i < this.listeAssociee.longueur(); i++) {
    const ptMacro = this.listeAssociee.get(i)
    if (ptMacro.agitSurVariable(va)) return true
  }
  return false
}
CMacroSuiteMacros.prototype.affecteValeurAVariable = function (val) {
  for (let i = 0; i < this.listeAssociee.longueur(); i++) {
    const ptMacro = this.listeAssociee.get(i)
    if (ptMacro.affecteValeurAVariable(val)) return true
  }
  return false
}
CMacroSuiteMacros.prototype.execute = function (svg, dimf, couleurFond) {
  let mac
  // Modification version 5.1 : On informe chaque macro de la liste de la macro qui la lance
  for (let i = 0; i < this.listeAssociee.longueur(); i++) {
    mac = this.listeAssociee.get(i)
    mac.setMacroLanceuse(this)
  }
  //
  mac = this.listeAssociee.get(0)
  mac.execute(svg, dimf, couleurFond)
}
CMacroSuiteMacros.prototype.executeSimple = function (dimf) {
  for (let i = 0; i < this.listeAssociee.longueur(); i++) {
    const mac = this.listeAssociee.get(i)
    mac.executeSimple(dimf)
  }
}
// Fonction optimisée version 6.4.1
// Corrigé version 6.8.1 : Renvoie true si au moins une des macros peut être exécutée
// et pas si elles peuvent l'être toute (certaines macros ne peuvent être exécutables
// qu'après l'exécution d'autres
CMacroSuiteMacros.prototype.executionPossible = function () {
  let res = false
  for (let i = 0; i < this.listeAssociee.longueur(); i++) {
    const ptMacro = this.listeAssociee.get(i)
    res = res || ptMacro.executionPossible()
  }
  return res
}
