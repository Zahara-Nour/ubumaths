/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CListeObjets from './CListeObjets'
import CElementGenerique from '../objets/CElementGenerique'
import NatObj from '../types/NatObjAdd'
import NatCal from '../types/NatCal'
// Attention : chaque numéro de version du logiciel doit être associé à un numéro de version de prototype
// Pour les versions 19 et 20 elles ont partagé le même numéro de version de prototype 6 ce qui était une erreur
// et a dû être corrigé dans un try ... catch de la fonction read
// Pour la version 9.0.O (numéro de version de liste 23) pas de nouvelle version de prototype car la version 22
// s'enregistrait de la même façon avec enregistrement de la largeur et la hauteur de la figure qui, à l'époque, ne servaient pas
// const numeroVersionPrototypes = 7 // Passage à la version 7 pour le n° de version 20 de document (version 8.0)
// const numeroVersionPrototypes = 8 // Passage à la version 8 pour le n° de version 21 de document (version 8.1)
const numeroVersionPrototypes = 9 // Passage à la version 9 pour le n° de version 22 de document (version 8.8.0)

export default CPrototype

/**
 * Classe représentant une macro construction.
 * Les éventuels prototypes de la figure sont enregistrés par CMathGraphDoc.
 * @constructor
 * @extends CListeObjets
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @returns {CPrototype}
 */
/**
 * Classe représentant une macro construction
 * @param {CListeObjets} listeProprietaire La liste d'objets contenant le prototype
 * @param {number} natureSources La nature du prototype
 * @param {number} nbObjSources  Le nombre d'objets sources
 * @param {CListeObjets} listeElements La liste formée de tous les objets de listeProprietaire qui sont des objets sources,
 * intermédiaires ou finaux du prototype
 * @param {CListeObjets} listeElementsFinaux La liste formée de tous les objets de listeProprietaire qui sont des objets finaux
 * @constructor
 */
function CPrototype (listeProprietaire, natureSources, nbObjSources, listeElements,
  listeElementsFinaux) {
  CListeObjets.call(this)
  this.listeProprietaire = listeProprietaire
  if (arguments.length > 1) {
    this.nom = ''
    this.commentaire = ''
    this.natureSources = natureSources
    this.numeroVersionPrototype = numeroVersionPrototypes
    this.setListePourImplementation(null)
    this.nbObjSources = nbObjSources
    this.nbObjFinaux = listeElementsFinaux.longueur()
    let i; let ptgen; let elb; let elbClone
    const nombreTotal = listeElements.longueur()
    for (i = 0; i < nbObjSources; i++) {
      ptgen = new CElementGenerique()
      elb = listeElements.get(i)
      const natureGraphique = elb.getNature()
      const natureCalcul = elb.getNatureCalcul()
      if (elb.estDeNatureCalcul(NatCal.NObjCalcPourSourcesProtoSaufRep)) { ptgen.nom = elb.getNom() } else {
        // Les points ou droites ayant un nom indispensable doivent voir aussi un nom lors de l'implémentation
        // Ce nom est sauve dans l'élément générique
        if (elb.estDeNature(NatObj.NObjNommable)) {
          if (listeElements.nomIndispensable(elb)) ptgen.nom = elb.nom
        }
      }
      ptgen.estElementFinal = false
      // if (natureGraphique.isNotZero()) ptgen.natureGraphique = natureGraphique;
      ptgen.natureGraphique = natureGraphique
      // Attention pas de else car les repères sont à la fois graphiques et non graphiques
      ptgen.natCal = natureCalcul
      this.add(ptgen)
    }
    for (i = nbObjSources; i < nombreTotal; i++) {
      elb = listeElements.get(i)
      elbClone = elb.getClone(listeElements, this)
      elbClone.estElementFinal = listeElementsFinaux.contains(elb)
      if (elbClone.estElementFinal && elb.estDeNature(NatObj.NTtObj)) elbClone.tag = elb.tag
      this.add(elbClone)
    }
  }
}
CPrototype.prototype = new CListeObjets()
CPrototype.prototype.constructor = CPrototype
CPrototype.prototype.superClass = 'CListeObjets'
CPrototype.prototype.className = 'CPrototype'

CPrototype.prototype.indexOf = function (o) {
  let elb = o
  if (elb === null) return -1
  if (elb.elementGeneriqueAssocie !== null) elb = elb.elementGeneriqueAssocie
  const ind = CListeObjets.prototype.indexOf.call(this, elb)
  const liste = this.listePourImplementation
  if (liste === null) return ind
  if (ind < this.nbObjSources) {
    const eltbase = elb.elementAssocie
    return liste.indexOf(eltbase)
  } else return this.indicePremierObjetPourImplementation + ind - this.nbObjSources
}
// Modifié version 5.2. On passe un paramètre nVersion qui représente le N° de version de la liste à partir de laquelle le prototype est chargé
CPrototype.prototype.read = function (inps, nVersion) {
  this.setListePourImplementation(null)
  this.numeroVersionPrototype = inps.readInt()
  if (this.numeroVersionPrototype < 3) this.numeroVersion = 7 // Version 4.4
  else if (this.numeroVersionPrototype === 4) this.numeroVersion = 11
  else if (this.numeroVersionPrototype === 5) this.numeroVersion = 15
  else if (this.numeroVersionPrototype === 6) this.numeroVersion = 19
  else if (this.numeroVersionPrototype === 7) this.numeroVersion = 20
  else if (this.numeroVersionPrototype === 8) this.numeroVersion = 21
  else this.numeroVersion = nVersion

  this.nom = inps.readUTF()
  this.commentaire = inps.readUTF()
  this.nbObjSources = inps.readInt()
  this.nbObjFinaux = inps.readInt()
  this.natureSources = inps.readByte()
  const index = inps.indiceEnCours
  try {
    CListeObjets.prototype.readPourProtoDepuisFlux.call(this, inps)
  } catch (e) {
    // Il y a eu une erreur pour la version de numéro 19 qui aurait du avoir un numéro de version
    // de prototype nouveau et l'a partagé avec celle de n° de version 18
    this.col = []
    inps.reset(index) // Il faut réinitialiser le flux
    this.numeroVersion = 18
    CListeObjets.prototype.readPourProtoDepuisFlux.call(this, inps)
  }
}
CPrototype.prototype.write = function (oups) {
  // Important : quand on enregistre le prototype dans un flux il faut que son membre
  // listePourImplementation soit null car sinon ce ne sont pas les bons indices des objets
  // contenus dans le prototype qui vont être enregistrés.
  this.listePourImplementation = null
  oups.writeInt(numeroVersionPrototypes)
  oups.writeUTF(this.nom)
  oups.writeUTF(this.commentaire)
  oups.writeInt(this.nbObjSources)
  oups.writeInt(this.nbObjFinaux)
  oups.writeByte(this.natureSources)
  CListeObjets.prototype.writePourProtoDepuisFlux.call(this, oups)
}
// Ajout vesion 4.8
/**
 * Affecte listePourImplementation à this.listePourImplementation
 * @param {CListeObjets} listePourImplementationInit
 * @returns {void}
 */
CPrototype.prototype.setListePourImplementation = function (listePourImplementationInit) {
  this.listePourImplementation = listePourImplementationInit
}
