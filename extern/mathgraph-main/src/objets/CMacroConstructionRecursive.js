/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Color from '../types/Color'
import StyleRemplissage from '../types/StyleRemplissage'
import StyleTrait from '../types/StyleTrait'
import CPolygone from './CPolygone'
import CImplementationProto from './CImplementationProto'
import CLigneBrisee from './CLigneBrisee'
import CListeObjets from './CListeObjets'
import CMacroAvecListe from './CMacroAvecListe'
import CSurfacePolygone from './CSurfacePolygone'
import CNoeudPointeurSurPoint from './CNoeudPointeurSurPoint'
import CSousListeObjets from './CSousListeObjets'
export default CMacroConstructionRecursive

/**
 * Macro lançant une construction récursive.
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
 * @param {CListeObjets} listeAssociee  liste contenant les éléments à utiliser comme objets sources
 * pour la première itération.
 * @param {CPrototype[]} tableProto  Array of CPrototype qui donnent la construction à utiliser suivant le
 * niveau de récursion en cours.
 * @param {number} pasRec  Le nombre d'objets à sauter avant de réimpleménter la construction
 * dans un même niveau de récursion.
 * @param {number} nbImp  Le nombre de fois que la construction doit être imlémentée
 * dans un même niveau de récursion.
 * @param {number} nbSourcesPourIter  Le nombre d'objets sources qui sont communs à toules
 * les implémentations de construction.
 * @param {boolean} creationNiveauMax  true si on ne crée les objets finaux que pour le niveau
 * maximum de récursions
 * @param {boolean} imposerCouleur  si true, tous les objets finaux devront prendre la couleur couleurImp.
 * @param {Color} couleurImp  La couleur des objets finaux si imposerCouleur est true.
 * @param {number} choixLigne  Si 0, les points finaux ne sont pas reliés, si 1 ils sont reliés
 * par un polygone et si 2 reliés par une ligne brisée.
 * @param {StyleTrait} styleLigne  Le style de trait utilisé si choixLigne n'est pas 0.
 * @param {Color} couleurLigne  La couleur utilisé pour la ligne si choixLigne n'est pas 0.
 * @param {boolean} polygoneRempli  trus si choixLigne vaut 1 et qu'on souhaite que le polygone soit rempli.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 */
function CMacroConstructionRecursive (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, listeAssociee, tableProto, pasRec,
  nbImp, nbSourcesPourIter, creationNiveauMax, imposerCouleur, couleurImp, choixLigne, styleLigne,
  couleurLigne, polygoneRempli, fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacroAvecListe.call(this, listeProprietaire)
    else {
      CMacroAvecListe.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, listeAssociee, fixed)
      this.tableProto = tableProto
      this.profondMax = tableProto.length - 1
      this.pasRec = pasRec
      this.nbImp = nbImp
      this.nbSourcesPourIter = nbSourcesPourIter
      this.creationNiveauMax = creationNiveauMax
      this.imposerCouleur = imposerCouleur
      this.couleurImp = couleurImp
      this.choixLigne = choixLigne
      this.styleLigne = styleLigne
      this.couleurLigne = couleurLigne
      this.polygoneRempli = polygoneRempli
    }
  }
  this.dejaExecute = false
}
CMacroConstructionRecursive.prototype = new CMacroAvecListe()
CMacroConstructionRecursive.prototype.constructor = CMacroConstructionRecursive
CMacroConstructionRecursive.prototype.superClass = 'CMacroAvecListe'
CMacroConstructionRecursive.prototype.className = 'CMacroConstructionRecursive'

CMacroConstructionRecursive.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.pointLie)
  const ind2 = listeSource.indexOf(this.impProto)
  const listeAssocieeClone = new CSousListeObjets()
  listeAssocieeClone.setImage(this.listeAssociee, listeSource, listeCible)
  return new CMacroConstructionRecursive(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind1, 'CPt'), this.taillePolice,
    this.effacementFond, this.couleurFond, this.alignementHorizontal, this.alignementVertical,
    this.intitule, this.commentaireMacro, listeAssocieeClone, this.tableProto, this.pasRec, this.nbImp,
    this.nbSourcesPourIter, this.creationNiveauMax, this.imposerCouleur, this.couleurImp, this.choixLigne,
    this.styleLigne, this.couleurLigne, this.polygoneRempli, this.fixed)
}
// Version 4.9.7 : On rajoute un paramètre affichage. Les objets ne sont affichés que si le paramètre est présent et true
CMacroConstructionRecursive.prototype.execute = function (svg, dimf, couleurFond, affichage) {
  // On implémente la construction de façon itérative
  // La liste associée contient les pointeurs sur les objets sources
  // On affecte ces éléments aux objets sources du prototype
  let i, j, proto, eg, gen, poly, ligne, elb
  const proto0 = this.tableProto[0]
  for (j = 0; j <= this.profondMax; j++) {
    proto = this.tableProto[j]
    for (i = 0; i < proto.nbObjSources; i++) proto.get(i).elementAssocie = this.listeAssociee.get(i)
  }
  const liste = this.listeProprietaire
  const listePoints = (this.choixLigne === 0) ? null : [] // Pour joindre éventuellement les points de dernière génération
  // Version 4.8 : Dans le cas où une (ou plusieurs) implémentation itérative de la construction a déjà été faite, lorsque de nouveaux points nommés
  // ou calculs sont créés il faut leur générer un nom. Pour éviter de gros ralentissements lors de l'implémentation, il faut générer ces
  // noms avec un suffixe numérique qui commence au nombre d'implémentations plus 1.
  // CLongueur ancienneLongueurUnite = liste.pointeurLongueurUnite;
  const impProto = new CImplementationProto(liste, proto0)
  // On crée une liste formée des objets sources fixes et une autre formée des objets sources variables.
  const listeObjetsSourcesConst = new CListeObjets()
  for (i = 0; i < this.nbSourcesPourIter; i++) {
    eg = proto0.get(i)
    listeObjetsSourcesConst.add(eg.elementAssocie)
  }
  const listeObjetsSourcesVar = new CListeObjets()
  for (i = this.nbSourcesPourIter; i < proto0.nbObjSources; i++) {
    gen = proto0.get(i)
    listeObjetsSourcesVar.add(gen.elementAssocie)
  }
  const indprot = liste.longueur()
  const profond = 0
  impProto.implementeRecursif(dimf, liste, this.tableProto, listeObjetsSourcesConst, listeObjetsSourcesVar,
    this.pasRec, this.nbImp, this.creationNiveauMax, profond, this.profondMax, listePoints)
  liste.traiteImplementationsProtoSuccessivesRecur(indprot, proto0)
  // liste.reconstruitChainesCalcul(indprot + 1, indprot + proto0.longueur() - proto0.nbObjSources);
  if (this.imposerCouleur) {
    for (i = liste.indexOf(impProto) + 1; i < liste.longueur(); i++) {
      elb = liste.get(i)
      if (elb.estElementFinal && (elb.estDeNature(NatObj.NTtObj))) {
        elb.donneCouleur(this.couleurImp)
      }
    }
  }
  // On regarde si on moins un des objets finaux créés existe
  // Si demandé un polygone ou une ligne on joint tous les points créés.
  if (this.choixLigne !== 0) {
    if (this.choixLigne === 1) {
      listePoints.push(new CNoeudPointeurSurPoint(liste, listePoints[0].pointeurSurPoint))
      poly = new CPolygone(liste, null, false, this.couleurLigne, false, this.styleLigne, listePoints)
      liste.add(poly)
      poly.positionne(false, dimf)
      if (this.polygoneRempli) {
        const s = new CSurfacePolygone(liste, null, false, this.couleurLigne, false,
          StyleRemplissage.transp, poly)
        s.positionne(false, dimf)
        liste.add(s)
      }
    } else {
      ligne = new CLigneBrisee(liste, null, false, this.couleurLigne, false, this.styleLigne, listePoints)
      liste.add(ligne)
      ligne.positionne(false, dimf)
    }
  }
  // Correction version 7.3.5 : Le dernier paramètre doit être false pour que l'affichage soit mis sur la pile
  // d'appels sinon le setReady4MathJax n'aura pas eu le temps de s'exécuter pour les affchages LaTeX
  if ((arguments.length <= 4) || affichage) this.listeProprietaire.afficheTout(indprot, svg, true, couleurFond, false) // Pour créer les éléments graphiques
  this.termineAction(svg, dimf, couleurFond)
  this.dejaExecute = true
  // Spécial JavaScript. Dans la version Java c'est fait lors de la sauvegarde de la figure
  this.listeProprietaire.etablitListesInternesMacros()
}

CMacroConstructionRecursive.prototype.executionPossible = function () {
  // Modification version 6.4.9 : On regarde s'il reste encore des implémemations de prototype
  // dans la figure. Si la réponse est non c'est que l'utisateur les a toutes détruites et
  // on peut alors à nouveau exécuter la macro.
  const list = this.listeProprietaire
  let nbImpProto = 0
  for (let i = 0; i < this.tableProto.length; i++) {
    nbImpProto += list.nombreImpProto(this.tableProto[0].nomProto)
  }
  if (nbImpProto === 0) this.dejaExecute = false
  return !this.dejaExecute
}

CMacroConstructionRecursive.prototype.read = function (inps, list) {
  let i, indProto, r, g, b
  CMacroAvecListe.prototype.read.call(this, inps, list)
  this.profondMax = inps.readInt()
  this.tableProto = []
  for (i = 0; i <= this.profondMax; i++) {
    indProto = inps.readInt()
    this.tableProto.push(list.documentProprietaire.tablePrototypes[indProto])
  }
  this.pasRec = inps.readInt()
  this.nbImp = inps.readInt()
  this.nbSourcesPourIter = inps.readInt()
  this.creationNiveauMax = inps.readBoolean()
  this.imposerCouleur = inps.readBoolean()
  if (this.imposerCouleur) {
    r = inps.readByte()
    g = inps.readByte()
    b = inps.readByte()
    this.couleurImp = new Color(r, g, b)
  }
  this.choixLigne = inps.readInt()
  if (this.choixLigne !== 0) {
    r = inps.readByte()
    g = inps.readByte()
    b = inps.readByte()
    this.couleurLigne = new Color(r, g, b)
    this.styleLigne = new StyleTrait(list)
    if (list.numeroVersion < 15) this.styleLigne.readOld(inps, list, false)
    else this.styleLigne.read(inps, list)
    if (this.choixLigne === 1) {
      // Polygone
      this.polygoneRempli = inps.readBoolean()
    }
  }
}
CMacroConstructionRecursive.prototype.write = function (oups, list) {
  CMacroAvecListe.prototype.write.call(this, oups, list)
  oups.writeInt(this.profondMax)
  // On enregistre l'indice du prototype utilisé dans la table des prototype du document
  for (let i = 0; i <= this.profondMax; i++) {
    oups.writeInt(list.documentProprietaire
      .tablePrototypes.indexOf(this.tableProto[i]))
  }
  oups.writeInt(this.pasRec)
  oups.writeInt(this.nbImp)
  oups.writeInt(this.nbSourcesPourIter)
  oups.writeBoolean(this.creationNiveauMax)
  oups.writeBoolean(this.imposerCouleur)
  if (this.imposerCouleur) {
    oups.writeByte(this.couleurImp.getRed())
    oups.writeByte(this.couleurImp.getGreen())
    oups.writeByte(this.couleurImp.getBlue())
  }
  oups.writeInt(this.choixLigne)
  if (this.choixLigne !== 0) {
    oups.writeByte(this.couleurLigne.getRed())
    oups.writeByte(this.couleurLigne.getGreen())
    oups.writeByte(this.couleurLigne.getBlue())
    // oups.writeInt(this.styleLigne) // Correction version 6.4.1
    this.styleLigne.write(oups)
    if (this.choixLigne === 1) oups.writeBoolean(this.polygoneRempli)
  }
}
