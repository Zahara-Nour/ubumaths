/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import Complexe from '../types/Complexe'
import Pointeur from '../types/Pointeur'
import StyleEncadrement from '../types/StyleEncadrement'
import { chaineNombre, codeLatexFracCont, decompPrim, fracCont, MAX_VALUE, pgcd, zero, zero13 } from '../kernel/kernel'
import CAffLiePt from './CAffLiePt'
import CCommentaire from './CCommentaire'
import CListeObjets from './CListeObjets'
import Nat from '../types/Nat'
import $ from 'jquery'

export default CLatex

/**
 * Classe représentant un affichage LaTeX sur la figure.
 * @constructor
 * @extends CCommentaire
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la cosntruction ppropriétaire.
 * @param {boolean} estElementFinal  true si l'objet est un élément final de construction.
 * @param {Color} couleur  La coileur d'écriture
 * @param {number} xNom  L'abscisse d'affichage.
 * @param {number} yNom  L'ordonnée d'affichage.
 * @param {number} decX  Décalage horizontal d'affichage.
 * @param {number} decY  Décalage vertical d'affichage.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {CPt} pointLie  null si l'affichage est libre ou pointe sur le point auquel il est lié.
 * @param {number} taillePolice  Donne la taille de la police utilisée.
 * @param {number} encadrement entier pour le style d'encadrement (0, 1 ou 2, voir CAffLiePt).
 * @param {boolean} effacementFond  true si le fond doit être effacé avant écritrue.
 * @param {Color} couleurFond  La couleur de fond.
 * @param {number} alignementHorizontal  0 pour alignement gauche, 1 pour centre, 2 pour droite.
 * @param {number} alignementVertical  0 pour alignement vers le haut, 1 pour centré, 2 pour bas.
 * @param {string} chaineCommentaire  Contient le code LaTeX.
 * @param {CValeurAngle} angText  L'angle du texte par rapport à l'horizontale
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CLatex}
 */
function CLatex (listeProprietaire, impProto, estElementFinal, couleur, xNom, yNom,
  decX, decY, masque, pointLie, taillePolice, encadrement, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, chaineCommentaire, angText, fixed) {
  if (arguments.length === 1) CCommentaire.call(this, listeProprietaire)
  else {
    CCommentaire.call(this, listeProprietaire, impProto, estElementFinal, couleur, xNom, yNom,
      decX, decY, masque, pointLie, taillePolice, encadrement, effacementFond, couleurFond, alignementHorizontal,
      alignementVertical, chaineCommentaire, angText, fixed)
    this.chaineCommentaire = chaineCommentaire
  }
  // Spécial JavaScript : chaineAffichee = contiendra la chaîne utilisée lors de l'affichage précédent.
  // Si c'est la même, update ne fera pas appel à createg mais on changera simplement des coordonnées d'affichage du composant.
  this.chaineAffichee = ''
  // this.div = null // Supprimé version 6.4.8
}
CLatex.prototype = new CCommentaire()
CLatex.prototype.constructor = CLatex
CLatex.prototype.superClass = 'CCommentaire'
CLatex.prototype.className = 'CLatex'

function codeErreur (code) {
  return '\\textcolor{red}{\\text{' + code + ' error}}'
}

// Modification version 8.7.3 : on passe un troisième paramètre impProto seulement dans le cas
// où on appelle getClone depuis CImplementationProto.prototype.implemente sur un objet qui
// a été obtenu par proto.getClone où proto est un CPrototype
CLatex.prototype.getClone = function (listeSource, listeCible, impProto = null) {
  const ind1 = listeSource.indexOf(this.pointLie)
  const ind2 = listeSource.indexOf(this.impProto)
  const angTextClone = this.angText.getClone(listeSource, listeCible)
  const ptelb = new CLatex(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind1, 'CPt'), this.taillePolice, this.encadrement,
    this.effacementFond, this.couleurFond, this.alignementHorizontal,
    this.alignementVertical, this.chaineCommentaire, angTextClone, this.fixed)
  if (impProto) ptelb.impProto = impProto
  ptelb.listValDynUsed = new CListeObjets(listeCible.uniteAngle, listeCible.pointeurLongueurUnite)
  if (listeCible.className !== 'CPrototype') ptelb.determineDependances()
  // Ligne suivante nécessaire car utilisé pour les exportations tikz
  ptelb.id = this.id
  return ptelb
}

CLatex.prototype.getNature = function () {
  return NatObj.NLatex
}

CLatex.prototype.setClone = function (ptel) {
  CAffLiePt.prototype.setClone.call(this, ptel)
  this.chaineLatex = ptel.chaineLatex
}

CLatex.prototype.rendChaineAffichage = function () {
  return this.chaineLatex
}

/**
 * Fonction déterminant quels sont les calculs ou fonctions dont le commentaire dépend de façon dynamique.
 * @param indiceReel Si présent c'est qu'on est en train d'utiliser un commentaire
 * dans une boîte de dialogue d'aperçu et c'est alors l'indice du vrai commentaire qu'on est en train d'éditer
 */
CLatex.prototype.determineDependances = function (indiceReel = -1) {
  let indicecommentaire, jdeb, j, indparf, ch, st, nomvaleur, pValeur, nomvaleur2, pValeur2
  const chaineAAnalyser = this.chaineCommentaire.replace(/ /g, '')

  this.listValDynUsed.retireTout()
  // Quand on recherche si c'est bien le nom d'une valeur valide
  // Il ne faut pas que la valeur ait été définie après l'affichage de valeur
  let estDansListe = true
  if (indiceReel !== -1) indicecommentaire = indiceReel
  else indicecommentaire = this.listeProprietaire.indexOf(this)
  if (indicecommentaire === -1) {
    indicecommentaire = this.listeProprietaire.longueur() - 1
    estDansListe = false // Le LaTex est en train d'être lu et n'est pas encore dans la liste
  }
  // On examine la chaine à la recherche de #Val(
  const len = chaineAAnalyser.length
  // Ajout version 6.7 : Traitement des codes \ValFrac qui renvoie le code LaTeX de la fraction continue de l'argument à 10^(-12) près
  j = 0
  while (((jdeb = chaineAAnalyser.indexOf('\\ValFrac{', j)) !== -1) && j < len) {
    // On recherche la parenthèse fermante correspondante
    indparf = chaineAAnalyser.indexOf('}', jdeb + 9)
    if (indparf === -1) break
    else {
      // On crée une chaine formé de ce qu'il y a entre \Val( et la parenthèse fermante
      ch = chaineAAnalyser.substring(jdeb + 9, indparf).trim()
      // On retire les éventuels espaces de cete chaine
      // On sépare cette chaine avec les virgules
      st = ch.split(/\s*,\s*/)
      if (st.length === 0) j = indparf + 1
      else {
        nomvaleur = st[0]
        // On recherche si c'est bien le nom d'une valeur valide
        // Il ne faut pas que la valeur ait été définie après l'affichage de valeur
        // Très important : quand determineDependances est appelé
        // par getClone() de CCommentaire, le commentaire n'a pas encoré été rajouté
        // à la liste clone et ainsi indiceCommentaire renvoie -1.
        // dans ce cas, indiceCommentaire doit valoir le nombre d'éléments actuels
        // de la liste clone qui le possède
        pValeur = this.pointeur(NatCal.NTteValPourComDynSaufFoncSaufComp, nomvaleur, indicecommentaire)
        if (pValeur === null) j = indparf + 1
        else {
          this.listValDynUsed.add(pValeur)
          j = indparf + 1
        }
      }
    }
  }

  j = 0
  while (((jdeb = chaineAAnalyser.indexOf('\\Val{', j)) !== -1) && j < len) {
    // On recherche la parenthèse fermante correspondante
    indparf = chaineAAnalyser.indexOf('}', jdeb + 5)
    if (indparf === -1) break
    else {
      // On crée une chaine formé de ce qu'il y a entre \Val( et la parenthèse fermante
      ch = chaineAAnalyser.substring(jdeb + 5, indparf).trim()
      // On retire les éventuels espaces de cete chaine
      // On sépare cette chaine avec les virgules
      st = ch.split(/\s*,\s*/)
      if (st.length === 0) j = indparf + 1
      else {
        nomvaleur = st[0]
        // On recherche si c'est bien le nom d'une valeur valide
        // Il ne faut pas que la valeur ait été définie après l'affichage de valeur
        // Très important : quand determineDependances est appelé
        // par getClone() de CCommentaire, le commentaire n'a pas encoré été rajouté
        // à la liste clone et ainsi indiceCommentaire renvoie -1.
        // dans ce cas, indiceCommentaire doit valoir le nombre d'éléments actuels
        // de la liste clone qui le possède
        // Modifié version 4.7.2
        // CValDyn pValeur = pointeurValeurOuFonction(nomvaleur,indicecommentaire);
        pValeur = this.pointeur(NatCal.NTteValPourComDynSaufFonc, nomvaleur, indicecommentaire)
        if (pValeur === null) j = indparf + 1
        else {
          this.listValDynUsed.add(pValeur)
          j = indparf + 1
        }
      }
    }
  }
  // Version 7.3 : On rajoute un code LaTeX \Decomp qui donne le décomposition en produit de facteurs
  // premiers d'un entier supérieur ou égal à 2 et\DecompFull qui fait la même chose sans exposant
  // en répétant les facteurs premiers
  const tab = ['\\DecompFull{', '\\Decomp{']
  for (let k = 0; k < 2; k++) {
    j = 0
    while (((jdeb = chaineAAnalyser.indexOf(tab[k], j)) !== -1) && j < len) {
      // On recherche la parenthèse fermante correspondante
      const decal = tab[k].length // La longueur de la chaîne recherchée
      indparf = chaineAAnalyser.indexOf('}', jdeb + decal)
      if (indparf === -1) break
      else {
        // On crée une chaine formé de ce qu'il y a entre \Decomp( et la parenthèse fermante
        ch = chaineAAnalyser.substring(jdeb + decal, indparf).trim()
        // On retire les éventuels espaces de cete chaine
        // On sépare cette chaine avec les virgules
        st = ch.split(/\s*,\s*/)
        if (st.length === 0) j = indparf + 1
        else {
          nomvaleur = st[0]
          // On recherche si c'est bien le nom d'une valeur valide
          // Il ne faut pas que la valeur ait été définie après l'affichage de valeur
          // Très important : quand determineDependances est appelé
          // par getClone() de CCommentaire, le commentaire n'a pas encoré été rajouté
          // à la liste clone et ainsi indiceCommentaire renvoie -1.
          // dans ce cas, indiceCommentaire doit valoir le nombre d'éléments actuels
          // de la liste clone qui le possède
          pValeur = this.pointeur(NatCal.NTteValRPourComDyn, nomvaleur, indicecommentaire)
          if (pValeur === null) j = indparf + 1
          else {
            this.listValDynUsed.add(pValeur)
            j = indparf + 1
          }
        }
      }
    }
  }
  j = 0
  while (((jdeb = chaineAAnalyser.indexOf('\\For{', j)) !== -1) && j < len) {
    // On recherche la parenthèse fermante correspondante
    indparf = chaineAAnalyser.indexOf('}', jdeb + 5)
    if (indparf === -1) break
    else {
      // On crée une chaine formé de ce qu'il y a entre \Val( et la parenthèse fermante
      ch = chaineAAnalyser.substring(jdeb + 5, indparf).trim()
      // On sépare cette chaine avec les virgules
      st = ch.split(/\s*,\s*/)
      if (st.length === 0) j = indparf + 1
      else {
        nomvaleur = st[0]
        pValeur = this.pointeur(NatCal.NTteValPourComDyn, nomvaleur, indicecommentaire)
        if (pValeur === null) j = indparf + 1
        else {
          this.listValDynUsed.add(pValeur)
          // Si la valeur n'existe pas, on ne l'inclut pas dans la chaîne à afficher
          j = indparf + 1
        }
      }
    }
  }
  j = 0
  while (((jdeb = chaineAAnalyser.indexOf('\\Calc{', j)) !== -1) && j < len) {
    // On recherche la parenthèse fermante correspondante
    indparf = chaineAAnalyser.indexOf('}', jdeb + 6)
    if (indparf === -1) break
    else {
      // On crée une chaine formé de ce qu'il y a entre \Val( et la parenthèse fermante
      ch = chaineAAnalyser.substring(jdeb + 6, indparf).trim()
      // On sépare cette chaine avec les virgules
      st = ch.split(/\s*,\s*/)
      if (st.length === 0) j = indparf + 1
      else {
        nomvaleur = st[0]
        pValeur = this.pointeur(NatCal.NTteValPourComDyn, nomvaleur, indicecommentaire)
        if (pValeur === null) j = indparf + 1
        else {
          this.listValDynUsed.add(pValeur)
          j = indparf + 1
        }
      }
    }
  }
  // Version 6.7 : Traitement des codes \ForSimpFrac
  j = 0
  while (((jdeb = chaineAAnalyser.indexOf('\\ForSimpFrac{', j)) !== -1) && j < len) {
    // On recherche la parenthèse fermante correspondante
    indparf = chaineAAnalyser.indexOf('}', jdeb + 13)
    if (indparf === -1) break
    else {
      // On crée une chaine formé de ce qu'il y a entre \Val( et la parenthèse fermante
      ch = chaineAAnalyser.substring(jdeb + 13, indparf).trim()
      // On sépare cette chaine avec les virgules
      st = ch.split(/\s*,\s*/)
      if (st.length === 0) j = indparf + 1
      else {
        nomvaleur = st[0]
        pValeur = this.pointeur(NatCal.NTteValPourComDyn, nomvaleur, indicecommentaire)
        if (pValeur === null) j = indparf + 1
        else {
          this.listValDynUsed.add(pValeur)
          // Si la valeur n'existe pas, on ne l'inclut pas dans la chaîne à afficher
          j = indparf + 1
        }
      }
    }
  }
  j = 0
  while (((jdeb = chaineAAnalyser.indexOf('\\ForSimp{', j)) !== -1) && j < len) {
    // On recherche la parenthèse fermante correspondante
    indparf = chaineAAnalyser.indexOf('}', jdeb + 9)
    if (indparf === -1) break
    else {
      // On crée une chaine formé de ce qu'il y a entre \Val( et la parenthèse fermante
      ch = chaineAAnalyser.substring(jdeb + 9, indparf).trim()
      // On sépare cette chaine avec les virgules
      st = ch.split(/\s*,\s*/)
      if (st.length === 0) j = indparf + 1
      else {
        nomvaleur = st[0]
        pValeur = this.pointeur(NatCal.NTteValPourComDyn, nomvaleur, indicecommentaire)
        if (pValeur === null) j = indparf + 1
        else {
          this.listValDynUsed.add(pValeur)
          // Si la valeur n'existe pas, on ne l'inclut pas dans la chaîne à afficher
          j = indparf + 1
        }
      }
    }
  }
  j = 0
  while (((jdeb = chaineAAnalyser.indexOf('\\ForRep{', j)) !== -1) && j < len) {
    // On recherche la parenthèse fermante correspondante
    indparf = chaineAAnalyser.indexOf('}', jdeb + 8)
    if (indparf === -1) break
    else {
      // On crée une chaine formé de ce qu'il y a entre \Val( et la parenthèse fermante
      ch = chaineAAnalyser.substring(jdeb + 8, indparf).trim()
      // On sépare cette chaine avec les virgules
      st = ch.split(/\s*,\s*/)
      if (st.length === 0) j = indparf + 1
      else {
        nomvaleur = st[0]
        pValeur = this.pointeur(NatCal.NTteValPourComDyn, nomvaleur, indicecommentaire)
        if (pValeur === null) j = indparf + 1
        else {
          this.listValDynUsed.add(pValeur)
          // Si la valeur n'existe pas, on ne l'inclut pas dans la chaîne à afficher
          j = indparf + 1
        }
      }
    }
  }
  j = 0
  while (((jdeb = chaineAAnalyser.indexOf('\\CalcSimp{', j)) !== -1) && j < len) {
    // On recherche la parenthèse fermante correspondante
    indparf = chaineAAnalyser.indexOf('}', jdeb + 10)
    if (indparf === -1) break
    else {
      // On crée une chaine formé de ce qu'il y a entre \Val( et la parenthèse fermante
      ch = chaineAAnalyser.substring(jdeb + 10, indparf).trim()
      st = ch.split(/\s*,\s*/)
      if (st.length === 0) j = indparf + 1
      else {
        nomvaleur = st[0]
        pValeur = this.pointeur(NatCal.NTteValPourComDyn, nomvaleur, indicecommentaire)
        if (pValeur === null) j = indparf + 1
        else {
          this.listValDynUsed.add(pValeur)
          // Si la valeur n'existe pas, on ne l'inclut pas dans la chaîne à afficher
          j = indparf + 1
        }
      }
    }
  }
  j = 0
  while (((jdeb = chaineAAnalyser.indexOf('\\FracRed{', j)) !== -1) && j < len) {
    // On recherche la parenthèse fermante correspondante
    indparf = chaineAAnalyser.indexOf('}', jdeb + 9)
    if (indparf === -1) break
    else {
      // On crée une chaine formé de ce qu'il y a entre \FracRed{ et la parenthèse fermante
      ch = chaineAAnalyser.substring(jdeb + 9, indparf).trim()
      st = ch.split(/\s*,\s*/)
      if (st.length === 0) j = indparf + 1
      else {
        nomvaleur = st[0]
        pValeur = this.pointeur(NatCal.NTteValRPourComDyn, nomvaleur, indicecommentaire)
        if (pValeur === null) j = indparf + 1
        else {
          if (st.length === 1) j = indparf + 1
          else {
            nomvaleur2 = st[1]
            pValeur2 = this.pointeur(NatCal.NTteValRPourComDyn, nomvaleur2, indicecommentaire)
            if (pValeur2 !== null) { // Ligne corrigée version 6.4. Faisait référence à pValeur
              this.listValDynUsed.add(pValeur)
              this.listValDynUsed.add(pValeur2)
            }
            j = indparf + 1
          }
        }
      }
    }
  }
  j = 0
  while (((jdeb = chaineAAnalyser.indexOf('\\If{', j)) !== -1) && j < len) {
    // On recherche la parenthèse fermante correspondante
    indparf = chaineAAnalyser.indexOf('}', jdeb + 4)
    if (indparf === -1) break
    else {
      // On crée une chaine formée de ce qu'il y a entre \if{ et la parenthèse fermante
      ch = chaineAAnalyser.substring(jdeb + 4, indparf).trim()
      pValeur = this.pointeur(NatCal.NTteValPourComDynSaufFonc, ch, indicecommentaire)
      if (pValeur === null) j = indparf + 1
      else {
        this.listValDynUsed.add(pValeur)
        j = indparf + 1
      }
    }
  }
  // Version 8.8 : Si on utilise des insertions de code LaTeX venant d'un autre affichage LaTeX
  // via le code LaTeX spécial \Lat{tagLatex} il faut ajouter à la liste des dépendances celles du LaTeX dont on insère le contenu
  j = 0
  while (((jdeb = chaineAAnalyser.indexOf('\\Lat{', j)) !== -1) && j < len) {
    indparf = chaineAAnalyser.indexOf('}', jdeb + 5)
    if (indparf === -1) break
    else {
      ch = chaineAAnalyser.substring(jdeb + 5, indparf).trim()
      const lat = this.listeProprietaire.getLaTeXByTagBefore(ch, indicecommentaire + (estDansListe ? 0 : 1))
      if (lat !== null) {
        // On a trouvé un code \Lat{ch} valide on rajoute les dépendances de l'affichage LaTeX lat
        // à celles de this
        // On ajoute le latex trouvé à la liste des valeurs utilisées bien que ce ne soit pas une valeur
        // Ainsi si le LaTeX dont le code est inséré dépend d'une valeur dynamique this en dépendra aussi
        this.listValDynUsed.add(lat)
      }
      j = indparf + 1
    }
  }
}

CLatex.prototype.positionne = function (infoRandom, dimf) {
  let ch = this.chaineCommentaire
  if (this.listValDynUsed.longueur() !== 0) {
    ch = this.traiteCodesLatex(ch)
    // Ligne suivante modifiée version 6.8.1 pour un meilleur fonctionnement des macros d'apparition d'objets
    // Si c'est un affichage LaTeX qui était masqué et qu'une macro d'apparition a mis son membre
    // masqué à false, il faut que l'affichage soit créé
    // this.isToBeUpdated = (ch !== this.chaineLatex)
    this.isToBeUpdated = (ch !== this.chaineLatex) || !this.hasgElement
    this.chaineLatex = ch
  } else {
    this.chaineLatex = ch
    // Ligne suivante modifiée version 6.8.1 pour un meilleur fonctionnement des macros d'apparition d'objets
    // Si c'est un affichage LaTeX qui était masqué et qu'une macro d'apparition a mis son membre
    // masqué à false, il faut que l'affichage soit créé
    // this.isToBeUpdated = false
    this.isToBeUpdated = !this.hasgElement
  }
  // CAffLiePt.prototype.positionne.call(this, infoRandom, dimf) // Modifié version 6.4.1
  CAffLiePt.prototype.positionnePourIm.call(this, infoRandom, dimf)
}

/**
 * Attention : Version 6.4.1 : Il faut redéfinir positionneFull pour CLaTeX car sinon c'est le positionneFull
 * de CAffLiePt qyi sera appelé
 * @param {boolean} infoRandom
 * @param {Dimf} dimf
 */
CLatex.prototype.positionneFull = function (infoRandom, dimf) {
  this.positionne(infoRandom, dimf)
  if (this.existe) this.isToBeUpdated = true
}

/**
 * Fonction préparant l'affichage par MathJax en créant un div provisoire
 * @param {boolean} bMemeMasque  Si true la préparation se fait même si l'affichage est caché
 *                               (sert dans la boîte de dialogue de protocole)
 * @returns {void}
 */
CLatex.prototype.setReady4MathJax = function (bMemeMasque) {
  // Modifié version 5.0.4 pour tenir compte des objts dupliqués d'un CLaTeX
  // qui est masqué
  const memeMasque = arguments.length === 0 ? false : bMemeMasque
  if (!this.masque || this.hasDuplicate || memeMasque) {
    this.typeset()
  }
}

CLatex.prototype.createg = function () {
  let w, h, va, decHor, decVer, xdisp, ydisp
  const g = cens('g')

  try { // Modifié version mtgApp
    const s = this.html.firstChild
    const svg = s.cloneNode(true)
    g.appendChild(svg)
    w = parseFloat($(s).attr('width')) * this.ex
    h = parseFloat($(s).attr('height')) * this.ex
    va = parseFloat($(svg).css('vertical-align')) * this.ex
    svg.setAttribute('width', w + 'px')
    svg.setAttribute('height', h + 'px')
    $(svg).css('vertical-align', va + 'px')
    // s.setAttribute("width", w + "px");
    // s.setAttribute("height", h + "px");
    // Lignes suivantes supprimées version 6.4.0
    // var t = Fonte.tailleLatex(this.taillePolice); // Modifié 5.0.2
    // if (h < t) h = t;
    switch (this.alignementHorizontal) {
      case CAffLiePt.alignHorCent :
        decHor = w / 2
        break
      case CAffLiePt.alignHorRight :
        decHor = w
        break
      default : decHor = 0
    }
    xdisp = -decHor
    this.rectAff.x = xdisp - 1
    const decalageBas = 3 + h * 0.03
    switch (this.alignementVertical) {
      case CAffLiePt.alignVerCent :
        decVer = h / 2
        break
      case CAffLiePt.alignVerLow :
        decVer = h + decalageBas
        break
      default : decVer = -decalageBas
    }
    ydisp = -decVer
    this.rectAff.y = ydisp - decalageBas + 1
    this.rectAff.width = w + 2
    this.rectAff.height = h + 2 * decalageBas

    /*
    var clone = s.cloneNode(true);
    clone.setAttribute("x", (this.rectAff.x).toString()+"px");
    clone.setAttribute("y", (this.rectAff.y).toString()+"px");
    clone.setAttribute("width", w+"px");
    clone.setAttribute("height",h+"px");
    clone.setAttribute("style","");
    */
    svg.setAttribute('x', (xdisp).toString() + 'px')
    svg.setAttribute('y', (ydisp).toString() + 'px')

    g.appendChild(svg)
    if (this.effacementFond || (this.encadrement !== StyleEncadrement.Sans)) { this.creeRectangle(g, this.couleurFond) }
    // this.deleteDiv(); // Plus utilisé version 6.4
    // Ligne suivante modifiée version 6.5.2
    // g.setAttribute('pointer-events', 'none')
    g.setAttribute('pointer-events', this.pointerevents)
    // Ajout version 5.0.1 pour compatibilité avec l'explorer qui ne clipe pas correctement
    // Supprimé version mtgApp car pour des lieux d'objets de LaTeX liés à un point lié le point lié peut être hors-fenêtre
    /*
    if ((this.pointLie !== null) && !this.pointLie.dansFenetre)
      g.setAttribute("visibility", "hidden");
    else g.setAttribute("visibility", "visible");
    */
    g.setAttribute('visibility', 'visible')
    // Ajout version Version 6.0 //////////////////////////////////////////
    this.positionneAngText(g)
    /// //////////////////////////////////////////////////////////////////////

    // Ajout version MtgApp pour pouvoir déplacer un CEditeurEquation
    if (this.owner !== null) this.g = g

    //
    return g
  } catch (e) {
    // this.deleteDiv(); // PLus utilisé version 6.4 avec MathJax3
    return g // Retourne un g vide en cas de problème
  }
}
/**
 * @returns {void}
 */
CLatex.prototype.setReady4MathJaxUpdate = function setReady4MathJaxUpdate () {
  if (this.isToBeUpdated || (this.g && (this.g.childNodes.length === 0))) this.setReady4MathJax()
}

CLatex.prototype.update = function update (svg) {
  const oldg = this.g
  if (!this.isToBeUpdated) {
    this.positionneAngText(this.g)
  } else {
    const g = this.createg()
    svg.replaceChild(g, oldg)
    g.setAttribute('id', this.id)
    this.g = g
    if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
  }
  // Ajout version 5.0.1
  if ((this.pointLie !== null) && !this.pointLie.dansFenetre) {
    this.g.setAttribute('visibility', 'hidden')
  } else {
    this.g.setAttribute('visibility', 'visible')
  }
}

CLatex.prototype.parametres = function (nbArg, ch, debut, fin) {
  let i, j, codePar, indsuiv
  indsuiv = -1
  const len = ch.length
  // On remplace les retours chariot par des espaces
  // Non il ne faut pas remplacer les retours chariots par des espaces car pour le LaTeX cela revient
  // à rajouter des espaces et pour les affichages de texte ce n'est pas anodin.
  // ch = ch.replace(/\n/g, ' ')
  let chtest = ch
  // On remplace dans ch tous les \\left{ et \\right} pas des espaces car ce sont pas
  // de vraies accolades en respectant le même nombre de caractères (8 pour \right\{ et 7 pour \left\{)
  chtest = chtest.replace(/\\right\\}/g, ' '.repeat(8)).replace(/\\left\\{/g, ' '.repeat(7))
  const chret = new Array(nbArg)
  i = debut
  for (j = 0; j < nbArg; j++) {
    if (i >= len) return null
    if (chtest.substring(i).trim().charAt(0) !== '{') {
      return null
    }
    codePar = 1
    const indparouvdeb = chtest.substring(i).indexOf('{')
    i += indparouvdeb + 1
    indsuiv = i
    let deb = chtest.substring(i)
    let indpar
    while (((indpar = deb.search(/[{}]/g)) !== -1) && codePar > 0) {
      const cardeb = deb.charAt(indpar)
      if (cardeb === '{') {
        codePar++
      } else {
        codePar--
        if (codePar < 0) return null
      }
      deb = deb.substring(indpar + 1)
      indsuiv += indpar + 1
    }
    if (codePar !== 0) return null
    chret[j] = ch.substring(i, indsuiv - 1)
    i = indsuiv
  }
  fin.setValue(indsuiv - 1)
  return chret
}
/**
 * Fonction traitant les codes LaTeX spécifiques à MathGraph32.
 * Pour plus de renseignements sur ces codes spéciaux, voir l'aide en ligne dans MathGraph32 (appuyer sur F1).
 * @param {string} ch  La chaîne contenant les codes.
 * @returns {string}
 */
CLatex.prototype.traiteCodesLatex = function (ch) {
  let ideb, param, chremp
  const fin = new Pointeur(0)
  // Les codes \If peuvent être imbriqués les uns dans les autres. Il faut les rechecher tant
  // qu'il y en a et les traiter depuis le début.
  while ((ideb = ch.indexOf('\\If', 0)) !== -1) {
    param = this.parametres(3, ch, ideb + 3, fin)
    if (param === null) {
      ch = ch.substring(0, ideb) + codeErreur('If')
      break
    } else {
      chremp = this.traiteCodeIf(param)
      ch = ch.substring(0, ideb) + chremp + ch.substring(fin.getValue() + 1)
    }
  }
  // Ajout version 6.7. Traitement des codes \ValFrac. A faire impérativement avant les \Val
  // Renvoie la fraction continue équivalente au résultat de l'argument à 10^(-12) près
  while ((ideb = ch.indexOf('\\ValFrac', 0)) !== -1) {
    param = this.parametres(1, ch, ideb + 8, fin)
    if (param === null) {
      ch = ch.substring(0, ideb) + codeErreur('ValFrac')
      break
    }
    chremp = this.traiteCodeValFrac(param[0].trim())
    ch = ch.substring(0, ideb) + chremp + ch.substring(fin.getValue() + 1)
  }
  // Traitement des codes \Val
  while ((ideb = ch.indexOf('\\Val', 0)) !== -1) {
    param = this.parametres(1, ch, ideb + 4, fin)
    if (param === null) {
      ch = ch.substring(0, ideb) + codeErreur('Val')
      break
    } else {
      chremp = ''
      try {
        chremp = this.traiteCodeVal(param[0].trim())
        ch = ch.substring(0, ideb) + chremp + ch.substring(fin.getValue() + 1)
      } catch (e) {
        ch = ch.substring(0, ideb) + codeErreur('Val')
      }
    }
  }
  // Ajout version 7.3 : Traitement des codes \Decomp et \DecompFull
  const tab = ['\\DecompFull', '\\Decomp'] // Ordre important il faut commencer par le plus long
  for (let k = 0; k < 2; k++) {
    while ((ideb = ch.indexOf(tab[k], 0)) !== -1) {
      param = this.parametres(1, ch, ideb + tab[k].length, fin)
      if (param === null) {
        ch = ch.substring(0, ideb) + codeErreur('Decomp')
        break
      } else {
        chremp = ''
        try {
          chremp = this.traiteCodeDecomp(param[0], k === 0)
          ch = ch.substring(0, ideb) + chremp + ch.substring(fin.getValue() + 1)
        } catch (e) {
          ch = ch.substring(0, ideb) + codeErreur('Decomp')
        }
      }
    }
  }
  // Traitement des codes \FracRed
  while ((ideb = ch.indexOf('\\FracRed', 0)) !== -1) {
    param = this.parametres(1, ch, ideb + 8, fin)
    if (param === null) {
      ch = ch.substring(0, ideb) + codeErreur('FracRed')
      break
    }
    chremp = this.traiteCodeFracRed(param[0])
    ch = ch.substring(0, ideb) + chremp + ch.substring(fin.getValue() + 1)
  }
  // Version 6.7 : Traitement des codes \ForSimpFrac. A faire impérativement avant les \For
  // Fonctionne comme les \ForSimp sauf que les valeurs non entières sont remplacées par
  // des fractions correspondant à la fraction continue équivalente à 10^(-12) près
  while ((ideb = ch.indexOf('\\ForSimpFrac', 0)) !== -1) {
    param = this.parametres(1, ch, ideb + 12, fin)
    if (param === null) {
      ch = ch.substring(0, ideb) + codeErreur('ForSimpFrac')
      break
    }
    chremp = this.traiteCodeForSimpFrac(param[0].trim())
    ch = ch.substring(0, ideb) + chremp + ch.substring(fin.getValue() + 1)
  }

  // Traitement des codes \ForSimp. A faire impérativement avant les \For
  while ((ideb = ch.indexOf('\\ForSimp', 0)) !== -1) {
    param = this.parametres(1, ch, ideb + 8, fin)
    if (param === null) {
      ch = ch.substring(0, ideb) + codeErreur('ForSimp')
      break
    }
    chremp = this.traiteCodeForSimp(param[0].trim())
    ch = ch.substring(0, ideb) + chremp + ch.substring(fin.getValue() + 1)
  }
  // Traitement des codes \ForRep. A faire impérativement avant les \For
  while ((ideb = ch.indexOf('\\ForRep', 0)) !== -1) {
    param = this.parametres(1, ch, ideb + 7, fin)
    if (param === null) {
      ch = ch.substring(0, ideb) + codeErreur('ForRep')
      break
    }
    chremp = this.traiteCodeForRep(param[0].trim())
    ch = ch.substring(0, ideb) + chremp + ch.substring(fin.getValue() + 1)
  }
  // Traitement des codes \For
  while ((ideb = ch.indexOf('\\For', 0)) !== -1) {
    param = this.parametres(1, ch, ideb + 4, fin)
    if (param === null) {
      ch = ch.substring(0, ideb) + codeErreur('For')
      break
    }
    chremp = this.traiteCodeFor(param[0].trim())
    ch = ch.substring(0, ideb) + chremp + ch.substring(fin.getValue() + 1)
    ideb = fin.getValue() + 1
  }
  // Traitement des codes \CalcSimp. A faire impérativement avant les \Calc
  while ((ideb = ch.indexOf('\\CalcSimp', 0)) !== -1) {
    param = this.parametres(1, ch, ideb + 9, fin)
    if (param === null) {
      ch = ch.substring(0, ideb) + codeErreur('CalcSimp')
      break
    }
    chremp = this.traiteCodeCalcSimp(param[0])
    ch = ch.substring(0, ideb) + chremp + ch.substring(fin.getValue() + 1)
  }
  // Traitement des codes \Calc
  while ((ideb = ch.indexOf('\\Calc', 0)) !== -1) {
    param = this.parametres(1, ch, ideb + 5, fin)
    if (param === null) {
      ch = ch.substring(0, ideb) + codeErreur('Calc')
      break
    }
    chremp = this.traiteCodeCalc(param[0])
    ch = ch.substring(0, ideb) + chremp + ch.substring(fin.getValue() + 1)
  }
  // Version 8.8 : On regarde s'il y a des codes \Lat pour insérer le code LaTeX
  // d'un affichage défini avant le code LaTeX étant \Lat{tag} où tag est le tag
  // de l'affichage LaTeX dont le code est à réutiliser
  // Version 8.8 (n° de version 22) : traitement des codes \Lat{tag}
  // qui remplacent par le code LaTeX renvoyé par l'affichage LaTeX de tag tag
  // à condition que cet affichage LaTeX soit défini avant
  const list = this.listeProprietaire
  while ((ideb = ch.indexOf('\\Lat', 0)) !== -1) {
    const param = this.parametres(1, ch, ideb + 4, fin)
    if (param === null) {
      ch = ch.substring(0, ideb) + codeErreur('Lat')
      break
    }
    const indfin = fin.getValue()
    const index = this.index
    // Si this.index est égal à -1 c'est qu'on est en train de créer un nouveau LaTeX
    // provisoire dans l'aperçu de la boîte de dialogue d'édition de LaTeX
    const lat = list.getLaTeXByTagBefore(param[0], index === -1 ? list.longueur() : index)
    if (lat === null) {
      ch = ch.substring(0, ideb) + codeErreur('Lat') + ch.substring(indfin + 1)
    } else {
      const remp = lat.existe ? lat.chaineLatex : ''
      ch = ch.substring(0, ideb) + ' ' + remp + ' ' + ch.substring(indfin + 1)
    }
  }
  return ch
}
/**
 * Fonction traitant les codes \Val permettant d'insérer la représentation décimale
 * d'un calcul réel ou complexe ou d'une variable dans l'affichage.
 * @param {string[]} param  Tableau de chaînes contenant les codes.
 * @returns {string} : La chaîne traitée.
 */
CLatex.prototype.traiteCodeVal = function (param) {
  // On sépare cette chaine avec les virgules
  let nomvaleur, indfin, pValeur, chnbdec, nbdecimales, chplus, signePlusImpose, nombre
  let chnombre = ''
  const st = param.split(/\s*,\s*/)
  if (st.length !== 0) {
    nomvaleur = st[0]
    indfin = this.listValDynUsed.longueur() - 1
    pValeur = this.listValDynUsed.pointeurParNatureCalcul(NatCal.NTteValPourComDynSaufFonc, nomvaleur, indfin)
    if (pValeur !== null) {
      // Si la valeur n'existe pas, on ne l'inclut pas dans la chaîne à afficher
      if (pValeur.existe) {
        if (pValeur.estMatrice()) {
          if (st.length >= 2) chnbdec = st[1]
          else chnbdec = '2'
          nbdecimales = parseInt(chnbdec.trim())
          chnombre = pValeur.latexMat(nbdecimales)
        } else {
          if (st.length >= 2) {
            chnbdec = st[1]
            if (chnbdec === '+') {
              chnombre = pValeur.rendChaineValeurPourCommentaire(2)
              if (chnombre.indexOf('-') === 0) chnombre = ' -' + chnombre.substring(1)
              else chnombre = ' +' + chnombre
            } else {
              // On retire les espaces de début
              chnbdec = chnbdec.trim()
              nbdecimales = parseInt(chnbdec)
              chnombre = pValeur.rendChaineValeurPourCommentaire(nbdecimales)
              // Si le troisième paramètre :
              // commence par + : on impose un signe + devant l'affichage si le nombre est positif ou nul
              // finit par un zéro : on impose un signe + devant l'affichage si le nombre est positif ou nul
              // et on n'affiche rien si le nombre est nul
              // finit par 1 : on n'affiche pas le nombre si le nombre est égal à 1 et on affiche un signe - sil est égal à -1
              if (st.length >= 3) {
                chplus = st[2]
                // On retire les éventuels espaces de début
                chplus = chplus.trim()
                signePlusImpose = chplus.indexOf('+') === 0
                if (signePlusImpose) {
                  if (chnombre.indexOf('-') === -1) chnombre = '+' + chnombre
                }
                if (chplus.indexOf('0') === chplus.length - 1) {
                  nombre = pValeur.rendValeur()
                  if (nombre === 0) return ' '
                } else {
                  nombre = pValeur.rendValeur()
                  if (chplus.indexOf('1') === chplus.length - 1) {
                    if (nombre === 1) return signePlusImpose ? '+' : ' '
                    else if (nombre === -1) return '-'
                  }
                }
              }
            }
          } else {
            // Si le nombre de décimales n'est pas précisé, on en met deux par défaut
            return pValeur.rendChaineValeurPourCommentaire(2)
          }
        }
      }
    }
  } else return codeErreur('Val')
  return chnombre
}
CLatex.prototype.traiteCodeValFrac = function (param) {
  let chnombre = ''
  const st = param.split(/\s*,\s*/)
  if (st.length !== 0) {
    const nomvaleur = st[0]
    const indfin = this.listValDynUsed.longueur() - 1
    const pValeur = this.listValDynUsed.pointeurParNatureCalcul(NatCal.NTteValPourComDynSaufFoncSaufComp, nomvaleur, indfin)
    if (pValeur !== null) {
      if (pValeur.existe) {
        // Si la valeur n'existe pas, on ne l'inclut pas dans la chaîne à afficher
        if (pValeur.estMatrice()) {
          return pValeur.latexMatFrac()
        } else {
          const res = pValeur.rendValeur()
          if (res === Math.floor(res)) chnombre = String(res)
          else {
            chnombre = codeLatexFracCont(fracCont(res))
          }
          if (st.length >= 2) {
            let chplus = st[1]
            // On retire les éventuels espaces de début
            chplus = chplus.trim()
            const signePlusImpose = chplus.indexOf('+') === 0
            if (signePlusImpose) {
              if (chnombre.indexOf('-') === 0) chnombre = ' -' + chnombre.substring(1)
              else chnombre = ' +' + chnombre
            }
            if (chplus.indexOf('0') === chplus.length - 1) {
              if (res === 0) return ' '
            } else {
              if (chplus.indexOf('1') === chplus.length - 1) {
                if (res === 1) return signePlusImpose ? ' + ' : ' '
                else if (res === -1) return ' - '
              }
            }
          }
        }
      }
    } else return codeErreur('ValFrac')
  } else return codeErreur('ValFrac')
  return chnombre
}

/**
 * Fonction traitant les codes \Decomp et \DecompFull et qui fournit la décomposition en produit de facteurs premiers
 * d'un entier au moins égal à 2
 * @param{string} param Doit contenir la nom de la valeur réelle à décomposer
 * @param {boolean} bfull Si true, on répète les facteurs au lieu de mettre des exposants
 * @returns {string}
 */
CLatex.prototype.traiteCodeDecomp = function (param, bfull) {
  let chnombre = ''
  const st = param.split(/\s*,\s*/)
  if (st.length !== 0) {
    const nomvaleur = st[0]
    const indfin = this.listValDynUsed.longueur() - 1
    const pValeur = this.listValDynUsed.pointeurParNatureCalcul(NatCal.NTteValRPourComDyn, nomvaleur, indfin)
    if (pValeur !== null) {
      if (pValeur.existe) {
        // Si la valeur n'existe pas, on ne l'inclut pas dans la chaîne à afficher
        const res = pValeur.rendValeur()
        if (!zero(res - Math.round(res)) || (res > 10000000)) return chaineNombre(res, 12)
        const nb = Math.round(res)
        const neg = nb < 0
        const absnb = Math.abs(nb)
        if (absnb === 1 || nb === 0) return String(nb)
        const decomp = decompPrim(Math.round(absnb)) // Tableau dont le premier élélent est un tableau contenant les facteurs premiers
        // et le second un tableau contenant les exposants
        const factprem = decomp[0]
        const expo = decomp[1]
        const nbfactprem = factprem.length
        if (bfull) {
          let nbfact = 0
          for (let i = 0; i < nbfactprem; i++) {
            for (let k = 0; k < expo[i]; k++) {
              nbfact++
              if (nbfact !== 1) chnombre += '\\times'
              chnombre += String(factprem[i])
            }
          }
        } else {
          for (let i = 0; i < nbfactprem; i++) {
            if (i !== 0) chnombre += '\\times '
            chnombre += String(factprem[i]) + '^{' + String(expo[i]) + '}'
          }
        }
        if (neg) chnombre = '-' + chnombre
      }
    } else return codeErreur('Decomp')
  } else return codeErreur('Decomp')
  return chnombre
}

/**
 * Fonction traitant les codes \FracRed permettant d'insérer une fraction
 * qui est la fraction réduite représentant un quotient de deux entiers.
 * @param {string[]} param  Tableau de chaînes contenant les codes..
 * @returns {string} : La chaîne traitée.
 */
CLatex.prototype.traiteCodeFracRed = function (param) {
  let nomvaleur1, indfin, pValeurNum, num, nomvaleur2, pValeurDen, den, numabs, denabs, signePlusImpose, chsig, g, num1, den1, positif
  // On sépare cette chaine avec les virgules
  let res = ' '
  const st = param.split(/\s*,\s*/)
  if (st.length !== 0) {
    nomvaleur1 = st[0]
    // On recherche si c'est bien le nom d'une valeur valide
    // Il ne faut pas que la valeur ait été définie après l'affichage de valeur
    // Si c'est le nom d'une valeur utilisée, elle est comprise dans la
    // liste listValDynUsed
    indfin = this.listValDynUsed.longueur() - 1
    pValeurNum = this.listValDynUsed.pointeurParNatureCalcul(NatCal.NTteValRPourComDyn, nomvaleur1, indfin)
    if (pValeurNum === null) return codeErreur('FracRed')
    if (pValeurNum.existe) {
      num = pValeurNum.rendValeur(false)
      if (st.length >= 2) {
        nomvaleur2 = st[1]
        pValeurDen = this.listValDynUsed.pointeurParNatureCalcul(NatCal.NTteValRPourComDyn, nomvaleur2, indfin)
        if (pValeurDen === null) return codeErreur('FracRed')
        if (pValeurDen.existe) {
          den = pValeurDen.rendValeur()
          if (den === 0) return codeErreur('FracRed')
          numabs = Math.abs(num)
          denabs = Math.abs(den)
          if ((numabs !== Math.floor(numabs)) || (numabs > MAX_VALUE) ||
            (denabs !== Math.floor(denabs)) || (denabs > MAX_VALUE) || (denabs === 0)) return codeErreur('FracRed')
          else {
            signePlusImpose = false
            chsig = ''
            if (st.length >= 3) {
              chsig = st[2]
              if (chsig.indexOf('+') === 0) signePlusImpose = true
            }
            if ((num === 0) && (chsig !== '') && (chsig.charAt(chsig.length - 1) === '0')) return ' '
            g = pgcd(numabs, denabs)
            num1 = numabs / g
            den1 = denabs / g
            positif = (num * den >= 0)
            if (zero13(den1 - 1)) {
              if (zero13(num1 - 1) && (chsig !== '') && (chsig.charAt(chsig.length - 1) === '1')) {
                if (positif) return signePlusImpose ? ' + ' : ' '
                else return ' - '
              }
              res = chaineNombre(num1, 0)
            } else res = ' \\dfrac{' + chaineNombre(num1, 0) + '}{' + chaineNombre(den1, 0) + '} '
            if (positif && signePlusImpose) res = ' +' + res
            else { if (!positif) res = ' -' + res }
            // Abandonné car on utilise des \dfrac partout : Modification version 6.4. On utilise displaystyle sinon trop petit avec MathJax3
            // return '\\displaystyle ' + res
            return res
          }
        }
      }
    }
  }
  return res
}
/**
 * Fonction traitant les codes \If permettant d'avoir un affichage conditionnel
 * La syntaxe est \If{Test}{Affichage si 1}{Affichage sinon}
 * @param {string} param  Tableau de chaînes contenant les codes.
 * @returns {string} : La chaîne égale au résultat du test .
 */
CLatex.prototype.traiteCodeIf = function (param) {
  let num
  const indfin = this.listValDynUsed.longueur() - 1
  // Modifié version 4.7.2
  // CValDyn pValeurNum = latex.listValDynUsed.pointeurValeurOuFonction(nomvaleur,indfin);
  const pValeurNum = this.listValDynUsed.pointeurParNatureCalcul(NatCal.NTteValPourComDynSaufFonc, param[0], indfin)
  if (pValeurNum === null) return codeErreur('If')
  if (pValeurNum.existe) {
    if (pValeurNum.getNatureCalcul() === NatCal.NCalculComplexe) {
      const z = new Complexe()
      pValeurNum.rendValeurComplexe(z)
      if ((z.x === 1) && (z.y === 0)) return param[1]; else return param[2]
    } else {
      if (pValeurNum.estDeNatureCalcul(NatCal.NTteValRPourComDyn)) {
        num = pValeurNum.rendValeur()
        if (num === 1) return param[1]; else return param[2]
      } else return param[2]
    }
  } else return param[2]
}
/**
 * Fonction traitant les codes \For permettant d'obtenir le codeLaTex d'un calcul ou une fonction.
 * Les calculs ou variables utilisés dans la fonction ne sont pas remplacés par leur valeur.
 * La syntaxe est \For{a} où a est le nom d'une calcul ou d'une fonction.
 * @param {string} param  La chaîne à traiter.
 * @returns {string} : La chaîne contenant le code LaTeX.
 */
CLatex.prototype.traiteCodeFor = function (param) {
  const indfin = this.listValDynUsed.longueur() - 1
  const calcul = this.listValDynUsed.pointeurParNatureCalcul(Nat.or(NatCal.NCalcouFoncParFormule, NatCal.NMatrice), param, indfin)
  if (calcul !== null) {
    if (calcul.className === 'CMatrice') {
      const n = calcul.n
      const p = calcul.p
      let res = '\\begin{matrix}'
      for (let i = 0; i < n; i++) {
        if (i !== 0) res += '\\\\'
        for (let j = 0; j < p; j++) {
          if (j !== 0) res += ' & '
          const val = calcul.tabVal[i][j]
          res += val.calcul.chaineLatexSansPar(null)
        }
      }
      return res + '\\end{matrix}'
    } else {
      const varFor = calcul.variableFormelle()
      return calcul.calcul.chaineLatexSansPar(varFor)
    }
  } else return codeErreur('For')
}
/**
 * Fonction traitant les codes \Calc permettant d'afficher la formule d'un calcul ou une fonction
 * Cette formule est rénvoyée telle qu'elle serait écrite (avec les signes * de multiplication).
 * Le code renvoyé n'est pas un code LaTeX.
 * Les calculs ou variables utilisés dans la formule ne sont pas remplacés par leur valeur.
 * La syntaxe est \Calc{a} où a est le nom d'une calcul ou d'une fonction.
 * @param {string} param  La chaîne contenant les codes.
 * @returns {string} : La chaîne contenant la formule.
 */
CLatex.prototype.traiteCodeCalc = function (param) {
  let varFor, nbv, k, chret, stb, i
  const indfin = this.listValDynUsed.longueur() - 1
  const calcul = this.listValDynUsed.pointeurParNatureCalcul(NatCal.NTteValPourComDyn, param, indfin)
  if (calcul !== null) {
    varFor = null
    if (calcul.estDeNatureCalcul(Nat.or(NatCal.NFonction, NatCal.NFonctionComplexe))) {
      varFor = new Array(1)
      varFor[0] = calcul.nomsVariables
    } else {
      if (calcul.estDeNatureCalcul(Nat.or(NatCal.NFoncPlusieursVar, NatCal.NFoncCPlusieursVar))) {
        nbv = calcul.nbVar
        varFor = new Array(nbv)
        for (k = 0; k < nbv; k++) varFor[k] = calcul.nomsVariables[k]
      }
    }
    // chret = "\\text{" + calcul.calcul.chaineCalculSansPar(varFor) + "}"; //.Modifié version 4.9.2.3
    chret = calcul.calcul.chaineCalculSansPar(varFor)
    // Il faut remplacer les caractères ^ par \^{}
    stb = chret
    for (i = 0; i < stb.length; i++) {
      if (stb.charAt(i) === '^') {
        // stb.replace(i, i+1, "\\;\\^{}\\;");
        // stb = stb.substring(0, i-1) + "\\;\\^{}\\;" + stb.substring(i+1); //.Modifié version 4.9.2.3
        stb = stb.substring(0, i) + ' \\;\\widehat{\\;\\;}\\; ' + stb.substring(i + 1)
        i = i + 8
      }
    }
    return stb.toString()
  } else return codeErreur('Calc')
}
/**
 * Fonction traitant les codes \Calc permettant d'afficher la formule d'un calcul ou une fonction
 * Cette formule est rénvoyée telle qu'elle serait écrite (avec les signes * de multiplication).
 * Le code renvoyé n'est pas un code LaTeX.
 * Les calculs ou variables utilisés dans la formule sont remplacés par leur valeur.
 * L'expression du calcul est simplifiée le plus possible (par exemple les termes nuls d'une somme
 * ne sont pas écrits, 1*x est remplacé par x).
 * La syntaxe est \Calc{a} où a est le nom d'une calcul ou d'une fonction.
 * @param {string} param  La chaîne contenant les codes.
 * @returns {string} : La chaîne contenant la formule.
 */
CLatex.prototype.traiteCodeCalcSimp = function (param) {
  let varFor, chret, stb, i
  const indfin = this.listValDynUsed.longueur() - 1
  const calcul = this.listValDynUsed.pointeurParNatureCalcul(NatCal.NTteValPourComDyn, param.toString(), indfin)
  if (calcul !== null) {
    varFor = calcul.variableFormelle()
    chret = '\\text{' + calcul.calcul.calculAvecValeursRemplacees(false)
      .calculNormalise(true, false, false).chaineCalculSansPar(varFor) + '}'
    // Il faut remplacer les caractères ^ par \^{}
    stb = chret
    for (i = 0; i < stb.length; i++) {
      if (stb.charAt(i) === '^') {
        stb = stb.substring(0, i - 1) + '\\;\\^{}\\;' + stb.substring(i + 1)
        i = i + 8
      }
    }
    return stb.toString()
  } else return codeErreur('CalcSimp')
}
/**
 * Fonction traitant les codes \ForSimp permettant d'obtenir le codeLaTex d'un calcul ou une fonction.
 * Les calculs ou variables utilisés dans la fonction sont remplacés par leur valeur décimale.
 * L'expression du calcul est simplifiée le plus possible (par exemple les termes nuls d'une somme
 * ne sont pas écrits, 1*x est remplacé par x).
 * La syntaxe est \ForSimp{a} où a est le nom d'une calcul ou d'une fonction.
 * @param {string} param  La chaîne à traiter.
 * @returns {string} : La chaîne contenant le code LaTeX.
 */

CLatex.prototype.traiteCodeForSimp = function (param) {
  let varFor
  const indfin = this.listValDynUsed.longueur() - 1
  const calcul = this.listValDynUsed.pointeurParNatureCalcul(Nat.or(NatCal.NCalcouFoncParFormule, NatCal.NMatrice), param, indfin)
  if (calcul !== null) {
    if (calcul.className === 'CMatrice') {
      const n = calcul.n
      const p = calcul.p
      let res = '\\begin{matrix}'
      for (let i = 0; i < n; i++) {
        if (i !== 0) res += '\\\\'
        for (let j = 0; j < p; j++) {
          if (j !== 0) res += ' & '
          const val = calcul.tabVal[i][j]
          res += val.calcul.calculAvecValeursRemplacees(false).calculNormalise(true, false, false).chaineLatexSansPar(null)
        }
      }
      return res + '\\end{matrix}'
    }
    varFor = calcul.variableFormelle()
    // return calcul.calcul.calculAvecValeursRemplacees().calculNormalise(true, false, false).chaineLatexSansPar(varFor);
    // Abandonné car on utilise des \dfrac partout : Modification version 6.4 pour que le résultat avec MathJax3 soit équivalent à celui de l'ancienne version de MathJax
    // return '\\displaystyle ' + calcul.calcul.calculAvecValeursRemplacees(false).calculNormalise(true, false, false).chaineLatexSansPar(varFor)
    return calcul.calcul.calculAvecValeursRemplacees(false).calculNormalise(true, false, false).chaineLatexSansPar(varFor)
  } else return codeErreur('ForSimp')
}
/**
 * Fonction traitant les codes \ForRep permettant d'obtenir le codeLaTex d'un calcul ou une fonction.
 * Les calculs ou variables utilisés dans la fonction sont remplacés par leur valeur décimale.
 * Contrairement au code \ForSimp les multiplications ou divisions par 1, -1 et les sommes avec 0
 * ne sont pas simplifiées
 * La syntaxe est \ForRep{a} où a est le nom d'une calcul ou d'une fonction.
 * @param {string} param  La chaîne à traiter.
 * @returns {string} : La chaîne contenant le code LaTeX.
 */

CLatex.prototype.traiteCodeForRep = function (param) {
  let varFor
  const indfin = this.listValDynUsed.longueur() - 1
  const calcul = this.listValDynUsed.pointeurParNatureCalcul(Nat.or(NatCal.NCalcouFoncParFormule, NatCal.NMatrice), param, indfin)
  if (calcul !== null) {
    if (calcul.className === 'CMatrice') {
      const n = calcul.n
      const p = calcul.p
      let res = '\\begin{matrix}'
      for (let i = 0; i < n; i++) {
        if (i !== 0) res += '\\\\'
        for (let j = 0; j < p; j++) {
          if (j !== 0) res += ' & '
          const val = calcul.tabVal[i][j]
          res += val.calcul.calculAvecValeursRemplacees(false).chaineLatexSansPar(null)
        }
      }
      return res + '\\end{matrix}'
    }
    varFor = calcul.variableFormelle()
    // return calcul.calcul.calculAvecValeursRemplacees().calculNormalise(true, false, false).chaineLatexSansPar(varFor);
    // Abandonné car on utilise des \dfrac partout : Modification version 6.4 pour que le résultat avec MathJax3 soit équivalent à celui de l'ancienne version de MathJax
    // return '\\displaystyle ' + calcul.calcul.calculAvecValeursRemplacees(false).calculNormalise(true, false, false).chaineLatexSansPar(varFor)
    return calcul.calcul.calculAvecValeursRemplacees(false).chaineLatexSansPar(varFor)
  } else return codeErreur('ForSimp')
}
/**
 * Fonction traitant les codes \For permettant d'obtenir le codeLaTex d'un calcul ou une fonction.
 * Les calculs ou variables utilisés dans la fonction sont remplacés par leur valeur s'ils
 * prennent une valeur entière et par une fraction continue équivalente à 10^(-12) sinon.
 * L'expression du calcul est simplifiée le plus possible (par exemple les termes nuls d'une somme
 * ne sont pas écrits, 1*x est remplacé par x).
 * La syntaxe est \For{a} où a est le nom d'une calcul ou d'une fonction.
 * @param {string} param  La chaîne à traiter.
 * @returns {string} : La chaîne contenant le code LaTeX.
 */

CLatex.prototype.traiteCodeForSimpFrac = function (param) {
  let varFor
  const indfin = this.listValDynUsed.longueur() - 1
  const calcul = this.listValDynUsed.pointeurParNatureCalcul(NatCal.NTteValPourComDyn, param, indfin)
  if (calcul !== null) {
    if (calcul.estMatrice()) {
      if (calcul.className === 'CMatrice') {
        const n = calcul.n
        const p = calcul.p
        let res = '\\begin{matrix}'
        for (let i = 0; i < n; i++) {
          if (i !== 0) res += '\\\\'
          for (let j = 0; j < p; j++) {
            if (j !== 0) res += ' & '
            const val = calcul.tabVal[i][j]
            // Ici calculAvecValeursRemplacees remplace les valeurs par leur fraction continue approchée à 10^(-12) près
            res += val.calcul.calculAvecValeursRemplacees(true).calculNormalise(true, false, true).chaineLatexSansPar(null)
          }
        }
        return res + '\\end{matrix}'
      } else return codeErreur('ForSimp')
    }
    varFor = calcul.variableFormelle()
    // return calcul.calcul.calculAvecValeursRemplacees().calculNormalise(true, false, false).chaineLatexSansPar(varFor);
    // Abandonné car on utilise des \dfrac partout : Modification version 6.4 pour que le résultat avec MathJax3 soit équivalent à celui de l'ancienne version de MathJax
    // return '\\displaystyle ' + calcul.calcul.calculAvecValeursRemplacees(true).calculNormalise(true, false, false).chaineLatexSansPar(varFor)
    return calcul.calcul.calculAvecValeursRemplacees(true).calculNormalise(true, false, true).chaineLatexSansPar(varFor)
  } else return codeErreur('ForSimp')
}

/*
CLatex.prototype.read = function(inps, list){
  CCommentaire.prototype.read.call(this, inps, list);
};
*/

/**
 * Fonction remplaçant dans this.commentairre les appels dynamiques de calcul,
 * fonction ou variable nommé ancienNom par nouveauNom.
 * @param {string} ancienNom
 * @param {string} nouveauNom
 * @returns {boolean} : la chaîne traitée.
 */
CLatex.prototype.remplaceNomValeurDynamique = function (ancienNom, nouveauNom) {
  // On supprime d'abord tous les caractères espace suivant un { ou une virgule ou précédant une accolade
  let buffer = this.chaineCommentaire
  const chaineInitiale = buffer
  // Ajout version 6.7 : Traitement des codes \ValFrac
  let ch1 = '\\\\ValFrac{[ ]*' + ancienNom + '[ ]*\\}'
  let ch2 = '\\ValFrac{' + nouveauNom + '}'
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)

  ch1 = '\\\\Val\\{[ ]*' + ancienNom + '[ ]*\\}'
  ch2 = '\\Val{' + nouveauNom + '}'
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)

  // Ajout version 7.3 pour le nouveau code \DecompFull
  ch1 = '\\\\DecompFull\\{[ ]*' + ancienNom + '[ ]*\\}'
  ch2 = '\\DecompFull{' + nouveauNom + '}'
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)

  // Ajout version 7.3 pour le nouveau code \Decomp
  ch1 = '\\\\Decomp\\{[ ]*' + ancienNom + '[ ]*\\}'
  ch2 = '\\Decomp{' + nouveauNom + '}'
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)

  ch1 = '\\\\Val{[ ]*' + ancienNom + '[ ]*,'
  ch2 = '\\Val{' + nouveauNom + ','
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)
  ch1 = '\\\\For{[ ]*' + ancienNom + '[ ]*\\}'
  ch2 = '\\For{' + nouveauNom + '}'
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)
  // Version 6.7 : traitement des nouveaux codes \SimpFor
  ch1 = '\\\\ForSimpFrac{[ ]*' + ancienNom + '[ ]*\\}'
  ch2 = '\\ForSimpFrac{' + nouveauNom + '}'
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)
  ch1 = '\\\\ForSimp{[ ]*' + ancienNom + '[ ]*\\}'
  ch2 = '\\ForSimp{' + nouveauNom + '}'
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)
  ch1 = '\\\\ForRep{[ ]*' + ancienNom + '[ ]*\\}'
  ch2 = '\\ForRep{' + nouveauNom + '}'
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)
  ch1 = '\\\\Calc{[ ]*' + ancienNom + '[ ]*\\}'
  ch2 = '\\Calc{' + nouveauNom + '}'
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)
  ch1 = '\\\\CalcSimp{[ ]*' + ancienNom + '[ ]*\\}'
  ch2 = '\\CalcSimp{' + nouveauNom + '}'
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)
  ch1 = '\\\\FracRed{[ ]*' + ancienNom + '[ ]*,'
  ch2 = '\\FracRed{' + nouveauNom + ','
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)
  ch1 = '\\\\If{[ ]*' + ancienNom + '[ ]*\\}'
  ch2 = '\\If{' + nouveauNom + '}'
  buffer = buffer.replace(new RegExp(ch1, 'g'), ch2)
  this.chaineCommentaire = buffer
  this.remplaceNomValeurDynamiqueApresVirgule('\\FracRed{', ancienNom, nouveauNom)
  return (chaineInitiale !== this.chaineCommentaire)
}
/**
 * Fonction recherchant dans les codes spéciaux utilisant une virgue ancienNom et le replaçant par nouveauNom.
 * @param {string} code  contient  \FracRed qui est pour le moment le seul code avec virgules
 * dont le deuxième argument peut être le nom d'un calcul ou une variable.
 * @param {string} ancienNom  Le nom de calcul, variable ou fonction à remplacer.
 * @param {string} nouveauNom  Le nom du calcul, variable ou fonction qui remplace.
 * @returns {void}
 */
CLatex.prototype.remplaceNomValeurDynamiqueApresVirgule = function (code, ancienNom, nouveauNom) {
  let ind = 0
  while ((ind = this.chaineCommentaire.indexOf(code, ind)) !== -1) {
    // On recherche la première accolade fermante
    const indacf = this.chaineCommentaire.indexOf('}', ind + code.length)
    if (indacf !== -1) {
      const left = this.chaineCommentaire.substring(0, ind + code.length - 1)
      const right = this.chaineCommentaire.substring(indacf + 1)
      let mid = this.chaineCommentaire.substring(ind + code.length - 1, indacf + 1)
      let ch1 = ',' + ancienNom + ' '
      let ch2 = ',' + nouveauNom + ' '
      mid = mid.replace(new RegExp(ch1, 'g'), ch2)
      ch1 = ',' + ancienNom + ','
      ch2 = ',' + nouveauNom + ','
      mid = mid.replace(new RegExp(ch1, 'g'), ch2)
      ch1 = ' ' + ancienNom + ','
      ch2 = ' ' + nouveauNom + ','
      mid = mid.replace(new RegExp(ch1, 'g'), ch2)
      ch1 = ' ' + ancienNom + ' '
      ch2 = ' ' + nouveauNom + ' '
      mid = mid.replace(new RegExp(ch1, 'g'), ch2)
      ch1 = ' ' + ancienNom + '}'
      ch2 = ' ' + nouveauNom + '}'
      mid = mid.replace(new RegExp(ch1, 'g'), ch2)
      ch1 = ',' + ancienNom + '}'
      ch2 = ',' + nouveauNom + '}'
      mid = mid.replace(new RegExp(ch1, 'g'), ch2)
      this.chaineCommentaire = left + mid + right
    }
    ind = ind + code.length - 1
  }
}
CLatex.prototype.chaineDesignation = function () {
  return 'desLatex'
}

// Fonction rajoutée version 6.7.2 pour que quand on lit une lsite d'objets la liste soit au courant
// si elle nécessite d'utiliser MathJax ou non
CLatex.prototype.read = function (inps, list) {
  this.listeProprietaire.useLatex = true
  CCommentaire.prototype.read.call(this, inps, list)
}
