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
import CMacroAvecListe from './CMacroAvecListe'
import CSurfacePolygone from './CSurfacePolygone'
import CNoeudPointeurSurPoint from './CNoeudPointeurSurPoint'
import CSousListeObjets from './CSousListeObjets'
export default CMacroConstructionIterative

/**
 * Macro lançant une construction itérative.
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
 * pour la première implémentation de prototype.
 * @param {CPrototype} proto La construction à utiliser.
 * @param {number} nbIter  Le nombre d'iérations souhaité.
 * @param {number} nbSourcesPourIter  Le nombre d'éléments sources qui sont communs à
 * toutes les implémentations.
 * @param {boolean} imposerCouleur  si true, tous les objets finaux devront prendre la couleur couleurImp.
 * @param {Color} couleurImp  La couleur des objets finaux si imposerCouleur est true.
 * @param {number} choixLigne  Si 0, les points finaux ne sont pas reliés, si 1 ils sont reliés
 * par un polygone et si 2 reliés par une ligne brisée.
 * @param {StyleTrait} styleLigne  Le style de trait utilisé si choixLigne n'est pas 0.
 * @param {Color} couleurLigne  La couleur utilisé pour la ligne si choixLigne n'est pas 0.
 * @param {boolean} polygoneRempli true si choixLigne vaut 1 et qu'on souhaite que le polygone soit rempli.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroConstructionIterative}
 */
function CMacroConstructionIterative (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, listeAssociee, proto, nbIter, nbSourcesPourIter,
  imposerCouleur, couleurImp, choixLigne, styleLigne, couleurLigne,
  polygoneRempli, fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacroAvecListe.call(this, listeProprietaire)
    else {
      CMacroAvecListe.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, listeAssociee, fixed)
      this.proto = proto
      this.nbIter = nbIter
      this.nbSourcesPourIter = nbSourcesPourIter
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
CMacroConstructionIterative.prototype = new CMacroAvecListe()
CMacroConstructionIterative.prototype.constructor = CMacroConstructionIterative
CMacroConstructionIterative.prototype.superClass = 'CMacroAvecListe'
CMacroConstructionIterative.prototype.className = 'CMacroConstructionIterative'

CMacroConstructionIterative.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.pointLie)
  const ind2 = listeSource.indexOf(this.impProto)
  const listeAssocieeClone = new CSousListeObjets()
  listeAssocieeClone.setImage(this.listeAssociee, listeSource, listeCible)
  return new CMacroConstructionIterative(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind1, 'CPt'), this.taillePolice,
    this.effacementFond, this.couleurFond, this.alignementHorizontal, this.alignementVertical,
    this.intitule, this.commentaireMacro, listeAssocieeClone, this.proto, this.nbIter, this.nbSourcesPourIter,
    this.imposerCouleur, this.couleurImp, this.choixLigne, this.styleLigne,
    this.couleurLigne, this.polygoneRempli, this.fixed)
}
// Version 4.9.7 : On rajoute un paramètre affichage. Les objets ne sont affichés que si le paramètre est présent et true
CMacroConstructionIterative.prototype.execute = function (svg, dimf, couleurFond, affichage) {
  let i, gen, impProto, indiceImp, elb, k, poly, ligne
  // On implémente la construction de façon itérative
  // La liste associée contient les pointeurs sur les objets sources
  // On affecte ces éléments aux objets sources du prototype
  for (i = 0; i < this.proto.nbObjSources; i++) this.proto.get(i).elementAssocie = this.listeAssociee.get(i)
  const liste = this.listeProprietaire
  const listePoints = [] // Utilisé si on veut que les points créés soient reliés.
  if (this.choixLigne !== 0) {
    for (i = 0; i < this.proto.nbObjSources; i++) {
      gen = this.proto.get(i)
      if (gen.estDeNature(NatObj.NTtPoint)) {
        listePoints.push(new CNoeudPointeurSurPoint(liste, gen.elementAssocie))
        break
      }
    }
  }
  // Version 4.8 : Dans le cas où une (ou plusieurs) implémentation itérative de la construction a déjà été faite, lorsque de nouveaux points nommés
  // ou calculs sont créés il faut leur générer un nom. Pour éviter de gros ralentissements lors de l'implémentation, il faut générer ces
  // noms avec un suffixe numérique qui commence au nombre d'implémentations plus 1.
  impProto = new CImplementationProto(liste, this.proto)
  // On implémente la construction une première fois.
  indiceImp = liste.longueur()
  const indiceImpInitial = indiceImp
  impProto.implementePourIter(dimf, liste, this.proto) // Modifié version 4.8
  liste.reconstruitChainesCalcul(indiceImpInitial + 1, indiceImpInitial + this.proto.longueur() - this.proto.nbObjSources)
  if (this.imposerCouleur) {
    for (i = liste.indexOf(impProto) + 1; i < liste.longueur(); i++) {
      elb = liste.get(i)
      if (elb.estElementFinal && (elb.estDeNature(NatObj.NTtObj))) {
        elb.donneCouleur(this.couleurImp)
      }
    }
  }
  for (k = 1; k < this.nbIter; k++) {
    // On implémente avec les objets finaux sauf ceux qui sont communs aux implémentations
    for (i = this.nbSourcesPourIter; i < this.proto.nbObjSources; i++) {
      elb = liste.getFinal(indiceImp, i - this.nbSourcesPourIter)
      gen = this.proto.get(i)
      gen.elementAssocie = elb
    }
    indiceImp = liste.longueur()
    impProto = new CImplementationProto(liste, this.proto)
    impProto.implementePourIter(dimf, liste, this.proto) // Modifié version 4.8
    if (this.choixLigne !== 0) {
      for (i = indiceImp; i < liste.longueur(); i++) {
        elb = liste.get(i)
        if (elb.estElementFinal && elb.estDeNature(NatObj.NTtPoint)) {
          listePoints.push(new CNoeudPointeurSurPoint(liste, elb))
          break
        }
      }
    }
    if (this.imposerCouleur) {
      // On regarde tous les objets finaux et s'ils sont graphiques, on leur donne le style actif
      for (i = liste.indexOf(impProto) + 1; i < liste.longueur(); i++) {
        elb = liste.get(i)
        if (elb.estElementFinal && (elb.estDeNature(NatObj.NTtObj))) {
          elb.donneCouleur(this.couleurImp)
        }
      }
    }
  }
  liste.traiteImplementationsProtoSuccessivesIter(indiceImpInitial, this.proto, this.proto.longueur() - this.proto.nbObjSources)
  // Si demandé dans la boîte de dialogue, on relie tous les points créés par un polygone ou une ligne brisée
  if (this.choixLigne !== 0) {
    if (this.choixLigne === 1) {
      listePoints.push(new CNoeudPointeurSurPoint(liste, listePoints[0].pointeurSurPoint))
      poly = new CPolygone(liste, null, false, this.couleurLigne, false, this.styleLigne, listePoints)
      poly.positionne(false, dimf)
      liste.add(poly)
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
  if ((arguments.length <= 4) || affichage) this.listeProprietaire.afficheTout(indiceImpInitial, svg, true, couleurFond, false) // Pour créer les éléments graphiques
  this.termineAction(svg, dimf, couleurFond)
  this.dejaExecute = true
  // Spécial JavaScript. Dans la version Java c'est fait lors de la sauvegarde de la figure
  this.listeProprietaire.etablitListesInternesMacros()
}

CMacroConstructionIterative.prototype.executionPossible = function () {
  // Modification version 6.4.9 : On regarde s'il reste encore des implémemations de prototype
  // dans la figure. Si la réponse est non c'est que l'utisateur les a toutes détruites et
  // on peut alors à nouveau exécuter la macro.
  const list = this.listeProprietaire
  const nbImpProto = list.nombreImpProto(this.proto.nomProto)
  if (nbImpProto === 0) this.dejaExecute = false
  return !this.dejaExecute
}

CMacroConstructionIterative.prototype.read = function (inps, list) {
  let r, g, b
  CMacroAvecListe.prototype.read.call(this, inps, list)
  const indProto = inps.readInt()
  this.proto = list.documentProprietaire.tablePrototypes[indProto]
  this.nbIter = inps.readInt()
  this.nbSourcesPourIter = inps.readInt()
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
CMacroConstructionIterative.prototype.write = function (oups, list) {
  CMacroAvecListe.prototype.write.call(this, oups, list)
  // On enregistre l'indice du prototype utilisé dans la table des prototype du document
  oups.writeInt(list.documentProprietaire.tablePrototypes.indexOf(this.proto))
  oups.writeInt(this.nbIter)
  oups.writeInt(this.nbSourcesPourIter)
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
