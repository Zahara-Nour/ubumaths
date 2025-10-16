/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import Fonte from '../types/Fonte'
import CElementBase from './CElementBase'
import CListeObjets from './CListeObjets'
import CNoeudPointeurSurPoint from './CNoeudPointeurSurPoint'
import CSousListeObjets from './CSousListeObjets'

export default CImplementationProto

/**
 * Classe reprétentant une implémentation de construction.
 * this.listeSources contient des pointeurs sur les objets surces utilisés.
 * @constructor
 * @extends CElementBase
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {string} nomProto  Le nom de la construction.
 * @param {number} nbIntermediaires  Le nombre d'objets intermédiares servant à construire
 * les objets finaux.
 * @param {number} nbFinaux  Le nombre d'objets finaux de la construction.
 * @param {CListeObjets} listeSourcesInit  Liste contenant des pointeurs sur tous les objets sources.
 * @returns {CImplementationProto}
 */
function CImplementationProto (listeProprietaire, nomProto, nbIntermediaires, nbFinaux, listeSourcesInit) {
  if (arguments.length === 1) CElementBase.call(this, listeProprietaire)
  else {
    if (arguments.length === 2) { // Constructeur utilisé lors de l'implémentation
      CElementBase.call(this, listeProprietaire, null, false)
      this.listeSources = new CSousListeObjets()
      const proto = arguments[1] // Le prototype associé
      const nbSources = proto.nbObjSources
      for (let i = 0; i < nbSources; i++) this.listeSources.add(proto.get(i).elementAssocie)
      this.nomProto = proto.nom
      this.nbFinaux = proto.nbObjFinaux
      this.nbIntermediaires = proto.longueur() - nbSources - this.nbFinaux
    } else {
      CElementBase.call(this, listeProprietaire, null, false)
      this.nomProto = nomProto
      this.nbIntermediaires = nbIntermediaires
      this.nbFinaux = nbFinaux
      this.listeSources = listeSourcesInit
    }
  }
}
CImplementationProto.prototype = new CElementBase()
CImplementationProto.prototype.constructor = CImplementationProto
CImplementationProto.prototype.superClass = 'CElementBase'
CImplementationProto.prototype.className = 'CImplementationProto'

CImplementationProto.prototype.getClone = function (listeSource, listeCible) {
  const listeSourcesClone = new CSousListeObjets()
  listeSourcesClone.setImage(this.listeSources, listeSource, listeCible)
  return new CImplementationProto(listeCible, this.nomProto, this.nbIntermediaires, this.nbFinaux, listeSourcesClone)
}
CImplementationProto.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CElementBase.prototype.depDe.call(this, p) || this.listeSources.depDe(p))
}
CImplementationProto.prototype.getNature = function () {
  return NatObj.NImpProto
}
CImplementationProto.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  this.listeSources.remplacePoint(ancienPoint, nouveauPoint)
}
CImplementationProto.prototype.read = function (inps, list) {
  CElementBase.prototype.read.call(this, inps, list)
  this.nomProto = inps.readUTF()
  this.nbIntermediaires = inps.readInt()
  this.nbFinaux = inps.readInt()
  this.listeSources = new CSousListeObjets()
  this.listeSources.read(inps, list)
}
CImplementationProto.prototype.write = function (oups, list) {
  CElementBase.prototype.write.call(this, oups, list)
  oups.writeUTF(this.nomProto)
  oups.writeInt(this.nbIntermediaires)
  oups.writeInt(this.nbFinaux)
  this.listeSources.write(oups, this.listeProprietaire)
}
/**
 * Fonction implémentant le prototype proto dans la la liste propriétaire de this
 * @param dimf Dimf : Contient les dimensions de la figure
 * @param proto CPrototype
 * un nouveau nom
 */
CImplementationProto.prototype.implemente = function (dimf, proto) {
  let i; let ptgen; let elb; let ptp; let val; let gen; let ancienNom; let nouveauNom; let clone; let nomClone; let res
  const listeProprietaire = this.listeProprietaire
  const app = listeProprietaire.documentProprietaire.app
  const listeEltsAjoutes = new CListeObjets()
  const listePointsOuDroitesARenommer = new CListeObjets()
  const listeCalculsARenommer = new CListeObjets()
  const tabNewNames = [] // Contiendra les nouveaux noms à attribuer aux points et droites nommés
  const tabNewNamesCal = [] // Contiendra les nouveaux noms à attribuer aux calculs ommés
  proto.setListePourImplementation(listeProprietaire)
  listeProprietaire.add(this)
  proto.indicePremierObjetPourImplementation = listeProprietaire.longueur()
  // en recherchant dans la liste des éléments sources les points et droites qui ont un nom
  // dans le prototype et on leur génère un nom pour que les éventuelles mesures
  // et calculs l'utilisant aient leur formules réactualisées
  for (i = 0; i < proto.nbObjSources; i++) {
    ptgen = proto.get(i) // Renvoie un CElementGenerique
    elb = ptgen.elementAssocie
    if (elb.estDeNature(NatObj.NObjNommable)) {
      // CElementGraphique ptp = (CElementGraphique) elb;
      const nomGen = ptgen.nom
      // On regarde si l'élément correspondant était nommé.
      // Si oui on rajoute cet élément à la liste des points devant être
      // nommés
      if ((nomGen !== '') && (elb.nom === '')) {
        nouveauNom = listeProprietaire.genereNomPourPointOuDroite(nomGen.charAt(0), false)
        elb.donneNom(nouveauNom)
        if (!elb.nomMasque) elb.updateName(app.svgFigure, true) // Modifié version 6.2.0
      }
    }
  }
  // On implémente la liste d'objets sources gérée par l'implémentation de
  // prototype
  // Puis on ajoute des clones des objets intermédiaires et finaux du
  // prototype
  for (i = proto.nbObjSources; i < proto.longueur(); i++) {
    elb = proto.get(i)
    // Version 8.7.3 : On passe un troisième paramètre supplémentaire qui sera la nouvelle implémentation
    // de prototype de façon à pouvoir optimiser CCommmentaire.prototype.determineDependances qui pourra
    // utiliser cette implémentation de prototype dans la fonctionCCommentaire.prototype.pointeur
    clone = elb.getClone(proto, this.listeProprietaire, this)
    clone.estElementFinal = elb.estElementFinal
    clone.impProto = this // Important
    // Version 7.5.0 : On affecte au clone le tag de l'élément clone si celui-ci en a un
    // et si ce tag existe déjà on lui rajoute l'id de l'élément
    if (elb.tag && elb.tag !== '') {
      if (listeProprietaire.hasElementOfTag(elb.tag, null)) {
        clone.tag = elb.tag + '#' + elb.index
      } else {
        clone.tag = elb.tag
      }
    }
    listeProprietaire.add(clone)
    listeEltsAjoutes.add(clone)
    if (clone.estDeNature(NatObj.NObjNommable)) {
      // CPointAncetre ptp = (CPointAncetre) clone;
      nomClone = clone.nom
      if (nomClone !== '') {
        if (listeProprietaire.existeMemeNomNonIntermediaire(clone, nomClone)) {
          tabNewNames.push(nomClone)
          clone.nom = ''
          listePointsOuDroitesARenommer.add(clone)
        }
      }
      // On donne la taille de nom par défaut aux points finaux
      if (clone.estElementFinal) clone.tailleNom = app.getTaillePoliceNom()
    } else {
      if (clone.estDeNatureCalcul(NatCal.NTtCalcNomme)) {
        // CValeurDynamique vald = (CValeurDynamique) clone;
        nomClone = clone.getNom()
        if (listeProprietaire.existeCalculOuVariableOuFonctionOuParametreMemeNom(clone, nomClone, false)) {
          tabNewNamesCal.push(nomClone)
          clone.nomCalcul = ''
          listeCalculsARenommer.add(clone)
        }
      } else {
        // Si la liste n'a pas de longueur unité et qu'on implémente une longueur ce sra cette longueur
        // qui sera la longueur unité de la figure
        if ((listeProprietaire.pointeurLongueurUnite === null) && clone.estDeNatureCalcul(NatCal.NMesureLongueur)) {
          listeProprietaire.pointeurLongueurUnite = clone
        }
      }
    }
  }
  listeEltsAjoutes.positionne(true, dimf)

  // On renomme maintenant les points ou droites qui ont besoin d'être renommés
  for (i = 0; i < listePointsOuDroitesARenommer.longueur(); i++) {
    ptp = listePointsOuDroitesARenommer.get(i)
    ancienNom = tabNewNames[i]
    nouveauNom = listeProprietaire.genereNomPourPointOuDroite(ancienNom.charAt(0), false)
    ptp.donneNom(nouveauNom)
    // if (!ptp.estElementIntermediaire()) ptp.updateName(app.svgFigure, true);
  }
  // On renomme les calculs intermédiaires qui ont besoin d'être renommés
  // en mettant à jour les affichages de commentaires dynamiques qui en
  // dépendent
  // Correction version 7.4.4 : Il ne faut pas choisir un nom qui a déjà été choisi pour un calcul implémenté
  // On crée un tableau de nouveaux noms utilisés pour ne pas les utiliser à nouveau et la fonction
  // genereNomPourCalcul prend un dernier paramètre qui est une liste de noms interdits
  const nouveauxNoms = []
  for (i = 0; i < listeCalculsARenommer.longueur(); i++) {
    val = listeCalculsARenommer.get(i)
    ancienNom = tabNewNamesCal[i]
    // On génére un nouveau nom avec
    // seulement les premiers caractères qui ne sont pas des chiffres
    nouveauNom = listeProprietaire.genereNomPourCalcul(Fonte.premiersCaracteresNonChiffres(ancienNom), false, nouveauxNoms)
    nouveauxNoms.push(nouveauNom)
    listeEltsAjoutes.remplaceNomValeurDynamiqueDansCommentairesOuLatex(ancienNom, nouveauNom)
    val.donneNom(nouveauNom)
  }
  // On reconstitue les formules des calculs ou fonctions intermédiaires et
  // finaux dépendant des objets sources
  for (i = 0; i < listeEltsAjoutes.longueur(); i++) {
    elb = listeEltsAjoutes.get(i)
    if (elb.estDeNatureCalcul(NatCal.NCalcOuFoncNonConstante)) {
      // CCalcul calc = (CCalcul) elb;
      elb.reconstruitChaineCalcul()
    }
  }
  for (i = 0; i < proto.nbObjSources; i++) {
    elb = proto.get(i).elementAssocie
    if (elb.estDeNatureCalcul(NatCal.NTteValPourComDyn)) {
      gen = proto.get(i)
      // CValeurDynamique val = (CValeurDynamique) elb;
      listeEltsAjoutes.remplaceNomValeurDynamiqueDansCommentairesOuLatex(gen.nom, elb.getNom())
    }
  }
  // On met à jour les commentaires des éléments rajoutés au cas où ils
  // contiendraient
  // des affichages de valeurs dynamiques
  listeEltsAjoutes.determineDependancesCommentaires()
  listeEltsAjoutes.metAJourEtPositionne(true, dimf) // Modifié version 4.8. True car on permet les calculs aléatoires dans les objets
  // On regarde si un des éléments finaux ajoutés au moins est une variable avec apnneau d'affichage avec boutons +, -, =
  res = false
  for (i = 0; i < listeEltsAjoutes.longueur(); i++) {
    const el = listeEltsAjoutes.get(i)
    if (el.estElementFinal && el.estDeNatureCalcul(NatCal.NVariable) && (el.dialogueAssocie)) {
      res = true
      break
    }
  }
  if (res) {
    listeProprietaire.removePaneVariables()
    listeProprietaire.creePaneVariables()
  }
}
/**
 * Fonction implémentant la construction dans listePourImp pour une implémentation
 * itérative. Appelé depuis CMacroConstructionIterative.
 * @param {Dimf} dimf  Dimensions du svg contenant la figure.
 * @param {CListeObjets} listePourImp  La liste dans laquelle se fait l'implémentation.
 * @param {CPrototype} proto  La construction à implémenter.
 * @returns {void}
 */
CImplementationProto.prototype.implementePourIter = function (dimf, listePourImp, proto) {
  let i, elb, clone
  const listeEltsAjoutes = new CListeObjets()
  // nomProto = proto.nom; Supprimé version 4.8. Inutile
  proto.setListePourImplementation(this.listeProprietaire)
  // On ajoute l'objet implementationPrototype à la liste
  this.listeProprietaire.add(this)
  // Important que que les indices soient corrects
  proto.indicePremierObjetPourImplementation = this.listeProprietaire.longueur()
  // On implémente la liste d'objets sources gérée par l'implémentation de
  // prototype
  // Puis on ajoute des clones des objets intermédiaires et finaux du
  // prototype
  for (i = proto.nbObjSources; i < proto.longueur(); i++) {
    elb = proto.get(i)
    clone = elb.getClone(proto, this.listeProprietaire)
    clone.estElementFinal = elb.estElementFinal
    clone.impProto = this // Important
    listePourImp.add(clone)
    listeEltsAjoutes.add(clone)
  }
  listeEltsAjoutes.positionne(true, dimf)
}
/**
 * Implémente la construction proto de façon récursive dans listePourImp.
 * Utilisé pour les implémentations récursives
 * @param {Dimf} dimf  Les dimensiosn du svg contenant la figure.
 * @param {CListeObjets} listePourImp  La lsite dans laquelle se fait l'implémentation.
 * @param {CPrototype} proto  La construction à implémenter.
 * @param {number} nbFinaux  Le nombre d'objets finaux de la construction (entier).
 * @returns {void}
 */
CImplementationProto.prototype.implementePourRecur = function (dimf, listePourImp, proto, nbFinaux) {
  let i, elb, ptgen, nomGen, clone
  const listeEltsAjoutes = new CListeObjets()
  // nomProto = proto.nom; Supprimé version 4.8. Inutile
  proto.setListePourImplementation(this.listeProprietaire)
  // On ajoute l'objet implementationPrototype à la liste
  const imp = this.getClone(this.listeProprietaire, this.listeProprietaire)
  imp.nomProto = proto.nom
  this.listeProprietaire.add(imp) // A revoir version logiciel : utiliser un clone
  // Important que que les indices soient corrects
  proto.indicePremierObjetPourImplementation = this.listeProprietaire.longueur()
  // On implémente la liste d'objets sources gérée par l'implémentation de
  // prototype
  // en recherchant dans la liste des éléments sources les points et droites qui ont un nom
  // dans le prototype et on leur génère un nom pour que les éventuelles mesures
  // et calculs l'utilisant aient leur formules réactualisées
  for (i = 0; i < proto.nbObjSources; i++) {
    elb = proto.get(i).elementAssocie
    // listeSources.add(elb);
    if (elb.estDeNature(NatObj.NObjNommable)) {
      ptgen = proto.get(i)
      nomGen = ptgen.nom
      // On regarde si l'élément correspondant était nommé.
      if ((nomGen !== '') && (elb.nom === '')) {
        elb.donneNom(nomGen)
      }
    }
  }
  // Puis on ajoute des clones des objets intermédiaires et finaux du
  // prototype à concurrence de nbFinaux
  let nbFinauxTotal = 0
  let nbIntermTotal = 0
  for (i = proto.nbObjSources; (i < proto.longueur()) && (nbFinauxTotal < nbFinaux); i++) {
    elb = proto.get(i)
    clone = elb.getClone(proto, this.listeProprietaire)
    const b = elb.estElementFinal
    clone.estElementFinal = b
    if (b) nbFinauxTotal++
    else nbIntermTotal++
    clone.impProto = imp // Important
    listePourImp.add(clone)
    listeEltsAjoutes.add(clone)
  }
  // Si le nombre d'objets finaux n'est pas le même que celui par défaut pour le prototype
  // il faut le modifier dans l'implémentation de prototype et modifier aussi le nombre d'objets intermédiaires
  // Cela n'arrive que pour les implémentations récursives avec création seulement des objets finaux
  // de dernière génération (autres que ceux servant pour les implémentations suivantes)
  imp.nbFinaux = nbFinaux
  imp.nbIntermediaires = nbIntermTotal
  listeEltsAjoutes.determineDependancesCommentaires() // Spécial version mtgApp
  listeEltsAjoutes.positionne(true, dimf)
}

/**
 * Fonction impémentant la construction de façon récursive dans listePourImp
 * @param {Dimf} dimf
 * @param {CListeObjets} listePourImp  La liste dans laquelle se fait limplémentation.
 * @param {CPrototype[]} tableProto  Un tableau contenant la construction à utiliser suivant
 * la profondeur de récursion.
 * @param {CListeObjets} listeSourcesConst  La liste des objets sources communs à toutes
 * les implémentations.
 * @param {CListeObjets} listeSourcesVar ; liste des objets sources qui seront reconstruits à chaque
 * implémentation.
 * @param {number} pasRec  le pas de récursion qui est le nombre d'objets à sauter
 * avant de réimplémenter la construction.
 * @param {number} nbImp  Le nombre de fois que la construction doit être itérée pour un même niveau.
 * @param {boolean} creationNiveauMax  Si true suels les objets finaux de dernière génération sont créés en dehors
 * de ceux servant pour la genération suivante.
 * @param {number} profond  Le niveau de récursion (entier, 1 pour le niveau initial)
 * @param {number} profondMax  Le niveau maximum de récursion autorisé (entier)
 * @param {CListeObjets} listePoints  Lz liste des poiints finaux créés (our qu'on puisse si demandé les joindre)<.
 * @returns {void}
 */
CImplementationProto.prototype.implementeRecursif = function (dimf, listePourImp, tableProto, listeSourcesConst,
  listeSourcesVar, pasRec, nbImp, creationNiveauMax, profond, profondMax, listePoints) {
  let i, j, k, elb, newlisteSourcesVar
  // On commence par implémenter une première fois la construction
  const proto = tableProto[profond]
  const ls = listeSourcesConst.longueur()
  const sizeInit = listePourImp.longueur()
  for (i = 0; i < ls; i++) proto.get(i).elementAssocie = listeSourcesConst.get(i)
  j = 0
  for (i = ls; i < proto.nbObjSources; i++) {
    proto.get(i).elementAssocie = listeSourcesVar.get(j)
    j++
  }
  const nbObjFinaux = creationNiveauMax ? ((profond === profondMax) ? proto.nbObjFinaux : listeSourcesVar.longueur() + pasRec * (nbImp - 1)) : proto.nbObjFinaux
  this.implementePourRecur(dimf, listePourImp, proto, nbObjFinaux)
  if (profond === profondMax) {
    if (listePoints !== null) {
      // On rajoute à listePoints les points de génération ultime
      for (i = sizeInit; i < listePourImp.longueur(); i++) {
        elb = listePourImp.get(i)
        if (elb.estElementFinal && elb.estDeNature(NatObj.NTtPoint)) {
          listePoints.push(new CNoeudPointeurSurPoint(listePourImp, elb))
        }
      }
    }
    return
  }
  // On crée une liste formée de tous les éléments finaux créés par la première implémentation
  const listef = new CListeObjets()
  for (i = sizeInit; i < listePourImp.longueur(); i++) {
    elb = listePourImp.get(i)
    if (elb.estElementFinal && (elb.estDeNature(NatObj.NTtObj) ||
        !elb.estDeNatureCalcul(NatCal.NAucunCalcul))) listef.add(elb)
  }
  // On applique la récursion
  for (k = 0; k < nbImp; k++) {
    j = 0
    newlisteSourcesVar = new CListeObjets()
    for (i = ls; i < proto.nbObjSources; i++) {
      newlisteSourcesVar.add(listef.get(j + pasRec * k))
      j++
    }
    this.implementeRecursif(dimf, listePourImp, tableProto, listeSourcesConst, newlisteSourcesVar,
      pasRec, nbImp, creationNiveauMax, profond + 1, profondMax, listePoints)
  }
}
