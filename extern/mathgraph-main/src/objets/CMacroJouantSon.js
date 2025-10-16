/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ce } from 'src/kernel/dom'
import CMacro from './CMacro'
export default CMacroJouantSon

/**
 * Macro jouant un fichier sonore. Ce constructeur ne peut être appelé que pour cloner un
 * objet déjà chargé par read.
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
 * @param {string} wavePath  Le chemin d'accès au fichier sonore (qui doit être un sous chemin
 * de la page html contenant le svg de la figure.
 * @param {HTMLAudioElement} audio  constuit par document.createElement("audio")
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroJouantSon}
 */
function CMacroJouantSon (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, wavePath,
  audio, fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacro.call(this, listeProprietaire)
    else {
      CMacro.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, fixed)
      this.wavePath = wavePath
      this.audio = audio
    }
  }
}
CMacroJouantSon.prototype = new CMacro()
CMacroJouantSon.prototype.constructor = CMacroJouantSon
CMacroJouantSon.prototype.superClass = 'CMacro'
CMacroJouantSon.prototype.className = 'CMacroJouantSon'

CMacroJouantSon.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.pointLie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CMacroJouantSon(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind1, 'CPt'), this.taillePolice, this.effacementFond, this.couleurFond,
    this.alignementHorizontal, this.alignementVertical, this.intitule, this.commentaireMacro,
    this.wavePath, this.audio, this.fixed)
}
CMacroJouantSon.prototype.executionPossible = function () {
  return (this.audio !== null)
}
CMacroJouantSon.prototype.execute = function (svg, dimf, couleurFond) {
  this.audio.play()
  this.termineAction(svg, dimf, couleurFond)
}
CMacroJouantSon.prototype.prepareAudio = function () {
  let ind
  let ch = this.wavePath
  if ((ind = ch.indexOf('.')) !== 0) ch = ch.substring(0, ind)
  this.audio = ce('audio')
  if (this.audio.canPlayType('audio/mp3') !== '') ch = ch + '.mp3'
  else ch = ch + '.ogg'
  this.audio.setAttribute('src', ch)
}
CMacroJouantSon.prototype.read = function (inps, list) {
  CMacro.prototype.read.call(this, inps, list)
  this.wavePath = inps.readUTF()
  this.prepareAudio()
  this.audio.load()
}
CMacroJouantSon.prototype.write = function (oups, list) {
  CMacro.prototype.write.call(this, oups, list)
  oups.writeUTF(this.wavePath)
}
