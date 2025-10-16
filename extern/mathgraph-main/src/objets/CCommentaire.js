/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { traiteAccents } from 'src/kernel/kernel'
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import Pointeur from '../types/Pointeur'
import Nat from '../types/Nat'
import CAffLiePt from './CAffLiePt'
import CListeObjets from './CListeObjets'

export default CCommentaire

/**
 * Classe représentant un affichage de texte sur la figure.
 * Si le texte est encadré de $ ce sera un affichage LaTeX.
 * @constructor
 * @extends CAffLiePt
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si l'objet est un élément final de construction.
 * @param {Color} couleur  La couleur d'éciture de l'éditeur (et du cadre éventuel).
 * @param {number} xNom  L'abscisse d'affichage de l'éditeur
 * @param {number} yNom  L'ordonnée d'affichage de l'éditeur
 * @param {number} decX  Décalage horizontal du nom
 * @param {number} decY  Décalage vertical du nom
 * @param {boolean} masque  true si l'éditeur est masqué
 * @param {CPt} pointLie  null ou pointe sur un point auquel l'affichage est lié.
 * @param {number} taillePolice  Taille de police à utiliser
 * @param {number} encadrement  entier pour le style d'encadrement (0, 1 ou 2, voir CAffLiePt).
 * @param {boolean} effacementFond  Passer true pour rendre le fond transparent
 * @param {Color} couleurFond  La couleur de fond
 * @param {number} alignementHorizontal  0 pour alignement gauche, 1 pour centré, 2 pour droite.
 * @param {number} alignementVertical  0 pour alignement vers le haut, 1 pour centré, 2 pour bas.
 * @param {string} chaineCommentaire  Le texte à afficher. S'il est entouré de $ ce sera un affichage LaTeX.
 * @param {CValeurAngle} angText  L'angle du texte par rapport à l'horizontale
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CCommentaire}
 */
function CCommentaire (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, encadrement, effacementFond,
  couleurFond, alignementHorizontal, alignementVertical, chaineCommentaire,
  angText, fixed) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CAffLiePt.call(this, listeProprietaire)
    else {
      CAffLiePt.call(this, listeProprietaire, impProto, estElementFinal, couleur, xNom, yNom,
        decX, decY, masque, pointLie, taillePolice, encadrement, effacementFond, couleurFond, alignementHorizontal,
        alignementVertical, angText, fixed)
      this.chaineCommentaire = chaineCommentaire
    }
    this.listValDynUsed = new CListeObjets(listeProprietaire.uniteAngle, listeProprietaire.pointeurLongueurUnite)
  }
}
CCommentaire.prototype = new CAffLiePt()
CCommentaire.prototype.constructor = CCommentaire
CCommentaire.prototype.superClass = 'CAffLiePt'
CCommentaire.prototype.className = 'CCommentaire'

CCommentaire.prototype.numeroVersion = function () {
  return 2
}

// Modification version 8.7.3 : on passe un troisième paramètre impProto seulement dans le cas
// où on appelle getClone depuis CImplementationProto.prototype.implemente sur un objet qui
// a été obtenu par proto.getClone où proto est un CPrototype
CCommentaire.prototype.getClone = function (listeSource, listeCible, impProto = null) {
  const ind1 = listeSource.indexOf(this.pointLie)
  const ind2 = listeSource.indexOf(this.impProto)
  const angTextClone = this.angText.getClone(listeSource, listeCible)
  const ptelb = new CCommentaire(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY,
    this.masque, listeCible.get(ind1, 'CPt'), this.taillePolice, this.encadrement,
    this.effacementFond, this.couleurFond, this.alignementHorizontal, this.alignementVertical, this.chaineCommentaire,
    angTextClone, this.fixed)
  if (impProto) ptelb.impProto = impProto
  ptelb.listValDynUsed =
    new CListeObjets(listeCible.uniteAngle, listeCible.pointeurLongueurUnite)
  if (listeCible.className !== 'CPrototype') ptelb.determineDependances()
  // Ligne suivante nécessaire car utilsié pour les exportations tikz
  ptelb.id = this.id
  return ptelb
}

CCommentaire.prototype.getNature = function () {
  return NatObj.NCommentaire
}

CCommentaire.prototype.metAJour = function () {
  this.determineDependances()
}

CCommentaire.prototype.donneChaine = function (chaine) {
  this.chaineCommentaire = chaine
}
/**
 * Fonction plaçant l'affichage de texte aux coordonnées (x,y)
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
CCommentaire.prototype.placeEn = function (x, y) {
  this.xNom = x
  this.yNom = y
}

CCommentaire.prototype.rendChaineAffichage = function () {
  return this.chaineAffichage
}

CCommentaire.prototype.ajouteAntecedents = function (liste) {
  if (this.pointLie !== null) liste.add(this.pointLie)
}
/**
 * Fonction renvoyant -1 si this.chaineCommentaire ne contient pas de soous-chaîne
 * #Val ou \For et sinon renvoie l'indice du premier des deux rencontrés, formule.getValue()
 * renvoyant true si c'est un #For qui a été trouvé et false sinon.
 * @param{number} indDeb L'indice du début de la recherche
 * @param{Pointeur} formule
 **/
CCommentaire.prototype.indicePremierValOuForm = function (indDeb, formule) {
  const indVal = this.chaineCommentaire.indexOf('#Val(', indDeb)
  const indFor = this.chaineCommentaire.indexOf('#For(', indDeb)
  if ((indVal === -1) && (indFor === -1)) return -1
  if (((indVal > indFor) || (indVal === -1)) && (indFor !== -1)) {
    formule.setValue(true)
    return indFor
  } else {
    formule.setValue(false)
    return indVal
  }
}
/**
 * Fonction faisant en sorte que this.listValDynUsed contienne
 * la liste de tous les objets dont dépend le coomentaire par des appels
 * à #Val() ou #For()
 * @param {number} indiceReel  Si présent c'est qu'on est en train d'utiliser un commentaire
 * dans une boîte de dialogue d'aperçu et c'est alors l'indice du vrai commentaire qu'on est en train d'éditer
 * @returns {void}
 */
CCommentaire.prototype.determineDependances = function (indiceReel = -1) {
  let jdeb, j, indparf, indsaut, ch, nomvaleur, indicecommentaire, pValeur
  const bformule = new Pointeur(true)
  this.listValDynUsed.retireTout()
  // On examine la chaine à la recherche de #Val(
  const len = this.chaineCommentaire.length
  j = 0
  if ((this.chaineCommentaire.indexOf('#Val(', j) === -1) && (this.chaineCommentaire.indexOf('#For(', j) === -1)) return
  while (((jdeb = this.indicePremierValOuForm(j, bformule)) !== -1) && j < len) {
    // On recherche la parenthèse fermante correspondante
    indparf = this.chaineCommentaire.indexOf(')', jdeb + 5)
    if (indparf === -1) j = len + 1
    else {
      indsaut = this.chaineCommentaire.indexOf('\n', jdeb + 5)
      if ((indsaut !== -1) && (indsaut < indparf))j = indsaut + 1
      else {
        // On crée une chaine formé de ce qu'il y a entre #Val( et la parenthèse fermante
        ch = this.chaineCommentaire.substring(jdeb + 5, indparf)
        // On retire les éventuels espaces de cete chaine
        ch = ch.trim()
        // On sépare cette chaine avec les virgules
        const st = ch.split(/\s*,\s*/)
        if (st.length === 0) j = indparf + 1
        else {
          nomvaleur = st[0]
          // On recherche si c'est bien le nom d'une valeur valide
          // Il ne faut pas que la valeur ait été définie après l'affichage de valeur
          if (indiceReel !== -1) indicecommentaire = indiceReel
          else indicecommentaire = this.listeProprietaire.indexOf(this)
          // Très important : quand determineDependances est appelé
          // par getClone() de CCommentaire, le commentaire n'a pas encoré été rajouté
          // à la liste clone et ainsi indiceCommentaire renvoie -1.
          // dans ce cas, indiceCommentaire doit valoir le nombre d'éléments actuels
          // de la liste clone qui le possède
          if (indicecommentaire === -1) indicecommentaire = this.listeProprietaire.longueur() - 1
          pValeur = this.pointeur(NatCal.NTteValPourComDyn, nomvaleur, indicecommentaire)
          if (pValeur === null) j = indparf + 1
          else {
            /** Corrigé version mtgApp
            natc = pValeur.getNatureCalcul();
            if ((bformule.getValue() && (Nat.and(natc, NatCal.NCalcRouC |
                NatCal.NTteFoncRouC))) || !bformule.getValue())
             */
            if ((bformule.getValue() && pValeur.estDeNatureCalcul(Nat.or(NatCal.NCalcRouC,
              NatCal.NTteFoncRouC))) || !bformule.getValue()) { this.listValDynUsed.add(pValeur) }
            // Si la valeur n'existe pas, on ne l'inclut pas dans la chaîne à afficher
            j = indparf + 1
          }
        }
      }
    }
  }
}

CCommentaire.prototype.positionne = function (infoRandom, dimf) {
  let jdeb, j, indparf, indsaut, ch, st, nomvaleur, indfin, pValeur, natc, chnombre, chnbdec, nbdecimales, chplus
  const bformule = new Pointeur(true)
  // On examine la chaine à la recherche de #Val(
  const len = this.chaineCommentaire.length
  let bufferAffichage = ''
  j = 0
  if ((this.chaineCommentaire.indexOf('#Val(', j) === -1) && (this.chaineCommentaire.indexOf('#For(', j) === -1)) {
    this.chaineAffichage = this.chaineCommentaire
    CAffLiePt.prototype.positionne.call(this, infoRandom, dimf)
    return
  }
  while (((jdeb = this.indicePremierValOuForm(j, bformule)) !== -1) && j < len) {
    bufferAffichage += this.chaineCommentaire.substring(j, jdeb)
    // On recherche la parenthèse fermante correspondante
    indparf = this.chaineCommentaire.indexOf(')', jdeb + 5)
    if (indparf === -1) {
      bufferAffichage += this.chaineCommentaire.substring(jdeb, len)
      j = len + 1
    } else {
      // On recherche aussi un éventuel retour à la ligne
      indsaut = this.chaineCommentaire.indexOf('\n', jdeb + 5)
      if ((indsaut !== -1) && (indsaut < indparf)) {
        bufferAffichage += this.chaineCommentaire.substring(jdeb, indsaut + 2)
        j = indsaut + 1
      } else {
        // On crée une chaine formé de ce qu'il y a entre #Val( et la parenthèse fermante
        ch = this.chaineCommentaire.substring(jdeb + 5, indparf)
        // On retire les éventuels espaces de cete chaine
        ch = ch.trim()
        // On sépare cette chaine avec les virgules
        st = ch.split(/\s*,\s*/)
        if (st.length === 0) { // Pas de virgule
          bufferAffichage += this.chaineCommentaire.substring(jdeb, indparf + 1)
          j = indparf + 1
        } else {
          nomvaleur = st[0]
          // On recherche si c'est bien le nom d'une valeur valide
          // Il ne faut pas que la valeur ait été définie après l'affichage de valeur
          // Si c'est le nom d'une valeur utilisée, elle est comprise dans la
          // liste listValDynUsed
          indfin = this.listValDynUsed.longueur() - 1
          pValeur = this.listValDynUsed.pointeurParNatureCalcul(NatCal.NTteValPourComDyn,
            nomvaleur, indfin)
          if (pValeur === null) {
            bufferAffichage += this.chaineCommentaire.substring(jdeb, indparf + 1)
            j = indparf + 1
          } else {
            // Si la valeur n'existe pas, on ne l'inclut pas dans la chaîne à afficher
            if (pValeur.existe) {
              if (bformule.getValue()) {
              // L'affichage de formule n'a de sens que pour un calcul ou une fonction
                natc = pValeur.getNatureCalcul()
                if (Nat.and(natc, NatCal.NCalcRouC | NatCal.NTteFoncRouC)) { bufferAffichage += pValeur.chaineCalcul }
              } else {
                chnombre = ''
                if (st.length >= 2) {
                  chnbdec = st[1]
                  if (chnbdec === '+') {
                    chnombre = pValeur.rendChaineValeurPourCommentaire(2)
                    if (chnombre.indexOf('-') !== '0') chnombre = '+ ' + chnombre
                  } else {
                    // nbdec = parseInt(chnbdec);
                    nbdecimales = parseInt(chnbdec)
                    chnombre = pValeur.rendChaineValeurPourCommentaire(nbdecimales)
                    if (st.length >= 3) {
                      chplus = st[2]
                      if (chplus === '+') if (chnombre.indexOf('-') !== 0) chnombre = '+ ' + chnombre
                    }
                  }
                } else {
                  // Si le nombre de décimales n'est pas précisé, on en met deux par défaut
                  chnombre = pValeur.rendChaineValeurPourCommentaire(2)
                }
                bufferAffichage += chnombre
              }
            }
            j = indparf + 1
          }
        }
      }
    }
  }
  if (j < len) bufferAffichage += this.chaineCommentaire.substring(j, len)
  this.chaineAffichage = bufferAffichage
  CAffLiePt.prototype.positionne.call(this, infoRandom, dimf)
}

CCommentaire.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CAffLiePt.prototype.depDe.call(this, p) ||
    this.listValDynUsed.depDe(p))
}

CCommentaire.prototype.dependDePourBoucle = function (p) {
  return CAffLiePt.prototype.dependDePourBoucle.call(this, p) ||
    this.listValDynUsed.dependDePourBoucle(p)
}
/**
 * Fonction renvoyant un pointeur sur l'élément de type calcul de nature nat
 * et ayant pour nom nom si le commentaire utilise ce calcul pour un affichage
 * dynamique de valeur. Renvoie null s'il ne l'utilise pas.
 * @param {Nat} nat
 * @param {string} nom
 * @param {number} indiceMaxi Indice dans la liste de début de la recherchee (vers le début de la liste)
 * @returns {CValDyn}
 */
CCommentaire.prototype.pointeur = function (nat, nom, indiceMaxi) {
  const list = this.listeProprietaire
  // Modifié version 4.5 : Aussi à faire pour les objets intermédiaires car un CLatex ou un CCommentaire peut générer un lieu d'objets.
  // Si le CLatex est un objet final de construction on recherhe d'abord la valeur
  // dans les objets intermédiaires ou finaux de cette construction
  // Important : on ne peut pas utiliser impProto car lors de getClone appelé par CImplementationProto.implemente
  // le membre impProto n'a pas encore été établi
  // Version 7.9.3 : On peut maintenant utiliser this.impProto car dans CImplementationProto.prototype.implemente
  // on appelle getClone sur elb = proto.get(i) avec un troisième paramètre qui est pris en compte
  // dans CCommentaire.prototype.getClone et CLatex.prototype.getClone
  let i = indiceMaxi
  if (this.estElementFinal || this.estElementIntermediaire()) {
    const impProto = this.impProto
    // Si on ne tombe pas sur un return on va forcément tomber sur le break et la recherche continuera
    // au-dessous sur les éléments qui ne sont pas des objets intermédiaires de construction
    while (i >= 0) {
      const elb = list.get(i)
      if (elb === impProto) {
        i--
        // Si on n'a paps trouvé on s'arrête à l'implémentation de prototype
        break // On poursuivra la recherche dans le while suivant à partir de la valeur actuelle de i
      }
      if (elb.estElementFinal || elb.estElementIntermediaire()) {
        if (elb.estDeNatureCalcul(nat)) {
          if (elb.getNom() === nom) return elb
          else i--
        } else i--
      } else i--
    }
  }
  // Sinon on recherche dans tous les objets qui ne sont pas des objets intermédiaires de construction
  // Version 8.7.3 : on continue la recherche vers l'arrière au lieu de vers l'avant dans la liste
  // car il y a plus de chances  que les calculs dynamiques utilisés par l'affichage de texte ou de LaTeX
  // soient plus proche de l'affichage que du début de la figure
  // Cette recherche est nécessaire même si this est un objet final de construction car elle sert
  // lors de l'implémentation d'u prototype
  while (i >= 0) {
    const elb = list.get(i)
    if (elb.estDeNatureCalcul(nat) && !elb.estElementIntermediaire()) {
      if (elb.getNom() === nom) return elb
      else i--
    } else i--
  }
  return null
}

CCommentaire.prototype.chaineDesignation = function () {
  return 'desCommentaire'
}

CCommentaire.prototype.read = function (inps, list) {
  CAffLiePt.prototype.read.call(this, inps, list)
  this.chaineCommentaire = traiteAccents(inps.readUTF())
  // Ajout version 5.0 pour traiter les $$ et ## représentés par un seul caractère
  this.chaineCommentaire = this.chaineCommentaire.replace(/\$\$/g, '$')
  // this.chaineCommentaire = this.chaineCommentaire.replace(/##/g,"#");
  //
  this.listValDynUsed = new CListeObjets(list.uniteAngle, list.pointeurLongueurUnite)
  if (this.listeProprietaire.className !== 'CPrototype') this.determineDependances()
  // Ajout version 6.7.2 pour que le player mtg32 sache si la liste chargée nécessite MathJax ou non
  const ch = this.chaineCommentaire
  if (this.className === 'CCommentaire' && ch.charAt(0) === '$' && ch.charAt(ch.length - 1) === '$') {
    this.listeProprietaire.useLatex = true
  }
}

CCommentaire.prototype.write = function (oups, list) {
  CAffLiePt.prototype.write.call(this, oups, list)
  oups.writeUTF(this.chaineCommentaire)
}
/**
 * Fonction remmplaçant les appels dynamiques de la valeur nommée ancienNom par nouveauNom
 * @param {string} ancienNom
 * @param {string} nouveauNom
 * @returns {boolean}
 */
CCommentaire.prototype.remplaceNomValeurDynamique = function (ancienNom, nouveauNom) {
  // On supprime d'abord tous les caractères espace suivant une ( ou une virgule ou précédant une parenthèse
  let buffer = this.chaineCommentaire
  /* Inutile avec des expressions régulières
  while((ind = buffer.indexOf("#Val( ")) !== - 1) {
    buffer.deleteCharAt(ind+5);
  }
  while((ind = buffer.indexOf("#For( ")) !== - 1) {
    buffer.deleteCharAt(ind+8);
  }
  */
  let ch1 = '#Val\\([ ]*' + ancienNom + '[ ]*\\)'
  let ch2 = '#Val(' + nouveauNom + ')'
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)
  ch1 = '#Val\\([ ]*' + ancienNom + '[ ]*\\,'
  ch2 = '#Val(' + nouveauNom + ','
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)
  ch1 = '#For\\([ ]*' + ancienNom + '[ ]*\\)'
  ch2 = '#For(' + nouveauNom + ')'
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)
  ch1 = '#For\\([ ]*' + ancienNom + '[ ]*\\,'
  ch2 = '#For(' + nouveauNom + ','
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)
  const modif = (buffer !== this.chaineCommentaire)
  this.chaineCommentaire = buffer
  return modif
}
