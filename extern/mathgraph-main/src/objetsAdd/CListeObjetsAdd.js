/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CListeObjets from '../objets/CListeObjets'
import Pointeur from '../types/Pointeur'
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import Nat from '../types/Nat'
import CPointBase from '../objets/CPointBase'
import CPointLieDroite from '../objets/CPointLieDroite'
import Color from '../types/Color'
import MotifPoint from '../types/MotifPoint'
import CDroite from '../objets/CDroite'
import CDroiteDirectionFixe from '../objets/CDroiteDirectionFixe'
import CDroiteAB from '../objets/CDroiteAB'
import CDroitePerpendiculaire from '../objets/CDroitePerpendiculaire'
import CCercleOA from '../objets/CCercleOA'
import CIntDroiteCercle from '../objets/CIntDroiteCercle'
import CPointLieBipoint from '../objets/CPointLieBipoint'
import CRepere from '../objets/CRepere'
import CLongueur from '../objets/CLongueur'
import StyleTrait from '../types/StyleTrait'
import StyleFleche from '../types/StyleFleche'
import CLatex from '../objets/CLatex'
import StyleEncadrement from '../types/StyleEncadrement'
import CAffLiePt from '../objets/CAffLiePt'
import CPointLieCercle from '../objets/CPointLieCercle'
import CVecteur from '../objets/CVecteur'
import CCalcConst from '../objets/CCalcConst'
import { getStr, zero } from '../kernel/kernel'
import PositionDroites from '../types/PositionDroites'
import PositionDroiteCercle from '../types/PositionDroiteCercle'
import PositionCercleCercle from '../types/PositionCercleCercle'
import CSegment from '../objets/CSegment'
import CCommentaire from '../objets/CCommentaire'
import CDemiDroiteOA from '../objets/CDemiDroiteOA'
import CTranslation from '../objets/CTranslation'
import CMesureX from '../objets/CMesureX'
import CAppelFonction from '../objets/CAppelFonction'
import CPointDansRepere from '../objets/CPointDansRepere'
import CResultatValeur from '../objets/CResultatValeur'
import InfoLieu from '../types/InfoLieu'
import CLieuDePoints from '../objets/CLieuDePoints'
import CCalcul from '../objets/CCalcul'
import CValeur from '../objets/CValeur'
import CPointImage from '../objets/CPointImage'
import CConstante from '../objets/CConstante'
import COperation from '../objets/COperation'
import CHomothetie from '../objets/CHomothetie'
import Ope from '../types/Ope'
/// //////////////////////////////////////////////////////////
// Constantes importées pour le protocole de la figure
import CAbscisseOrigineRep from '../objets/CAbscisseOrigineRep'
import COrdonneeOrigineRep from '../objets/COrdonneeOrigineRep'
import CUnitexRep from '../objets/CUnitexRep'
import CUniteyRep from '../objets/CUniteyRep'
import CArcDeCercleAncetre from '../objets/CArcDeCercleAncetre'
import CCercle from '../objets/CCercle'
import CDemiDroite from '../objets/CDemiDroite'
import CDemiPlan from '../objets/CDemiPlan'
import CEditeurFormule from '../objets/CEditeurFormule'
import CGrapheSuiteRec from '../objets/CGrapheSuiteRec'
import CGrapheSuiteRecComplexe from '../objets/CGrapheSuiteRecComplexe'
import CImage from '../objets/CImage'
import CLieuDeBase from '../objets/CLieuDeBase'
import CLieuDiscretDeBase from '../objets/CLieuDiscretDeBase'
import CLieuObjetAncetre from '../objets/CLieuObjetAncetre'
import CMacro from '../objets/CMacro'
import CMarqueAngleAncetre from '../objets/CMarqueAngleAncetre'
import CMarqueSegment from '../objets/CMarqueSegment'
import CPt from '../objets/CPt'
import CDroiteAncetre from '../objets/CDroiteAncetre'
import CSurface from '../objets/CSurface'
import CValeurAffichee from '../objets/CValeurAffichee'
import ConfirmDlg from '../dialogs/ConfirmDlg'

import { intersection, intersectionCercleCercle, intersectionDroiteCercle } from 'src/kernel/kernelVect'
import addQueue from 'src/kernel/addQueue'
import CImplementationProto from 'src/objets/CImplementationProto'

export default CListeObjets

CListeObjets.prototype.depDe4Rec = function (el) {
  for (const elb of this.col) {
    if (elb.depDe4Rec(el)) return true
  }
  return false
}

CListeObjets.prototype.detruitDerniersElements = function (n) {
  for (let i = 0; i < n; i++) {
    this.detruitDernierObjet()
  }
}

/**
 * Fonction ajoutant la courbe de la fonction f sur droiteIntervalle (qui peut être une droite, un segment ou uen demi-droite)
 * @param {CRepere} repere le repère dans lequel est tracée la courbe
 * @param {CDroite|CDemiDroite} droiteIntervalle
 * @param {CFonc} fonction la fonction réelle d'une variable dont on trace la courbe
 * @param {string} nomPointLieAxe
 * @param {string} nomCalculAbscisse
 * @param {string} nomCalculOrdonnee
 * @param {number} nombrePoints Nombre de points de la courbe (lieu de points)
 * @param {boolean} pointLieCache true si le point lié de la corube est caché
 * @param {boolean} pointCourbeCache true si le point gnérant la courbe est cahcé
 * @param {boolean} gestionAutoDiscontinuite true pour une gestion auto des discontinuités
 * @param {Color} couleur couleur de la courbe
 * @param {StyleTrait} lineStyle le style de trait
 * @param {number} taillePoliceNom taille de la police pour les noms des points créés
 * @param {MtgApp|null} app si null appel depuis l'API
 * @returns {boolean} renvoie true si la courbe est visible. Si app est non nul, return non utilisé.
 */
CListeObjets.prototype.ajouteCourbe = function (repere, droiteIntervalle, fonction,
  nomPointLieAxe, nomCalculAbscisse, nomCalculOrdonnee, nombrePoints,
  pointLieCache, pointCourbeCache, gestionAutoDiscontinuite,
  couleur, lineStyle, taillePoliceNom, app = null) {
  // On génère une abscisse aléatoire pour le point lié à l'axe des
  // abscisses

  let abs1 = droiteIntervalle.abscisseMinimale()
  let abs2 = droiteIntervalle.abscisseMaximale()
  const d = abs2 - abs1
  const bl = Color.black
  abs1 = abs1 + d / 10
  abs2 = abs2 - d / 10
  const abs = abs1 + (abs2 - abs1) * Math.random()
  // var pointLieDroite = new CPointLieDroite(listePr, null, false, Color.black, false, 0d, 0d,
  //  pointLieCache, nomPointLieAxe, frame.pref_indiceTaillePoliceNom, MotifPoint.PetitRond, true, abs,
  //  droiteIntervalle, false);
  const pointLieDroite = new CPointLieDroite(this, null, false, bl, false, 0, 3, pointLieCache, '', taillePoliceNom,
    MotifPoint.petitRond, false, false, abs, droiteIntervalle)
  pointLieDroite.donneNom(nomPointLieAxe)
  this.add(pointLieDroite)
  // On crée la mesure de l'abscisse du point qu'on vient de créer
  // Modifié version 5.0
  const calculAbscisse = new CMesureX(this, null, false, nomCalculAbscisse, repere, pointLieDroite)
  this.add(calculAbscisse)
  const ordonnee = new CAppelFonction(this, fonction, new CResultatValeur(this, calculAbscisse))
  const calculOrdonnee = new CCalcul(this, null, false, nomCalculOrdonnee, ordonnee.chaineCalculSansPar(null), ordonnee)
  this.add(calculOrdonnee)
  // Il faut maintenant créer le point repéré de la courbe dont
  // les positions successives généreront cette courbe
  const pointCourbe = new CPointDansRepere(this, null, false, bl, false, 0, 3, pointCourbeCache, '', taillePoliceNom,
    MotifPoint.petitRond, false, repere, new CValeur(this, new CResultatValeur(this, calculAbscisse)),
    new CValeur(this, new CResultatValeur(this, calculOrdonnee)))
  this.add(pointCourbe)
  // Il faut maintenant créer la courbe comme un lieu de points
  const infoLieu = new InfoLieu(nombrePoints, false, gestionAutoDiscontinuite)
  const lieu = new CLieuDePoints(this, null, false, couleur, false, lineStyle, pointCourbe,
    infoLieu, pointLieDroite)
  this.add(lieu)
  lieu.etablitListeElementsAncetres()
  // On regarde si le lieu créé est visible
  const dimf = this.documentProprietaire.dimf
  this.positionne(false, dimf)
  const ret = lieu.dansFen(dimf)
  if (!ret) {
    if (app) {
      new ConfirmDlg(app, 'Lieuhf', null, function () {
        app.detruitDerniersElements(6) // A appeler  sur app au lieu de this à cause gestiond es constructions
      })
    } else {
      this.detruitDerniersElements(6)
    }
  }
  return ret // Sert pour appel depuis l'API
}

/**
 * Ajoute dans le repère repere la courbe d'une fonction sur la partie visible de l'axe des abscisses
 * @param repere Le repère dans lequel la courbe doit être tracée
 * @param fonction La fonction dont la courbe doit être tracée
 * @param nomPointLieAxe Le nom du point lié à l'axe (qui doit êgtre ici un segment)
 * @param nomCalculAbscisse Le nom de la mesure de l'abscisse de ce point lié
 * @param nomCalculOrdonnee Le nom de l'image de l'abscisse par la fonction
 * @param nombrePoints Le nomnbre de points de la courbe
 * @param pointLieCache true si le point lié doit être caché
 * @param pointCourbeCache true su le point générateur de la courbe doit être caché
 * @param gestionAutoDiscontinuite true pour une gestion auto des discontinuités de la courbe
 * @param {Color} color couleur de la courbe
 * @param {StyleTrait} lineStyle le style de trait de la courbe
 * @param {number} taillePoliceNom la taille de police utilisée pour les noms créés
 * @param {MtgApp} app L'application propriétaire. Si nul l'appel se fait depuis l'API
 * @return {boolean} true si la courbe (lieu de points) est visible
 */
CListeObjets.prototype.ajouteCourbeSurR = function (repere, fonction, nomPointLieAxe, nomCalculAbscisse,
  nomCalculOrdonnee, nombrePoints, pointLieCache, pointCourbeCache, gestionAutoDiscontinuite,
  color, lineStyle, taillePoliceNom, app = null) {
  // On regarde si le repère possède déjà un axe des abscisses
  let axe = this.existeDroiteABDefiniePar(repere.o, repere.i)
  if (axe === null) {
    // axe = new CDroiteAB(frame.cadreActif().listePr, null, false, Color.black, StyleTrait.traitFin, repere.O, repere.I,
    //  frame.pref_indiceTaillePoliceNom);
    axe = new CDroiteAB(this, null, false, Color.black, false, 0, 0, false, '', taillePoliceNom, lineStyle,
      CDroite.abscisseNomParDefaut, repere.o, repere.i)
    this.add(axe)
  }
  return this.ajouteCourbe(repere, axe, fonction, nomPointLieAxe, nomCalculAbscisse, nomCalculOrdonnee, nombrePoints,
    pointLieCache, pointCourbeCache, gestionAutoDiscontinuite, color, lineStyle, taillePoliceNom, app)
}

/**
 * Ajoute dans le repère repere la courbe d'une fonction sur l'intervalle [a;b]
 * @param repere Le repère dans lequel la courbe doit être tracée
 * @param fonction La fonction dont la courbe doit être tracée
 * @param nomPointLieAxe Le nom du point lié à l'axe (qui doit êgtre ici un segment)
 * @param nomCalculAbscisse Le nom de la mesure de l'abscisse de ce point lié
 * @param nomCalculOrdonnee Le nom de l'image de l'abscisse par la fonction
 * @param nombrePoints Le nomnbre de points de la courbe
 * @param pointLieCache true si le point lié doit être caché
 * @param pointCourbeCache true su le point générateur de la courbe doit être caché
 * @param gestionAutoDiscontinuite true pour une gestion auto des discontinuités de la courbe
 * @param a Un CValeur contenant la valeur de a
 * @param b Un CValeur contenant la valeur de b
 * @param {Color} color couleur de la courbe
 * @param {StyleTrait} lineStyle le style de trait de la courbe
 * @param {number} taillePoliceNom la taille de police utilisée pour les noms créés
 * @param {MtgApp} app L'application propriétaire. Si nul l'appel se fait depuis l'API
 * @return {boolean} true si la courbe (lieu de points) est visible
 */
CListeObjets.prototype.ajouteCourbeSurab = function (repere, fonction, nomPointLieAxe, nomCalculAbscisse,
  nomCalculOrdonnee, nombrePoints, pointLieCache, pointCourbeCache, gestionAutoDiscontinuite, a, b,
  color, lineStyle, taillePoliceNom, app = null) {
  // On regarde si le repère possède déjà un axe des abscisses

  let pta = a.existePtAbs(this, repere)
  if (pta === null) {
    pta = new CPointDansRepere(this, null, false, Color.black, false, 3, 0, false, '', taillePoliceNom,
      MotifPoint.petitRond, false, repere, a, new CValeur(this, 0))
    this.add(pta)
  }
  let ptb = b.existePtAbs(this, repere)
  if (ptb === null) {
    ptb = new CPointDansRepere(this, null, false, Color.black, false, 3, 0, false, '', taillePoliceNom,
      MotifPoint.petitRond, false, repere, b, new CValeur(this, 0))
    this.add(ptb)
  }
  const seg = new CSegment(this, null, false, Color.black, false, lineStyle, pta, ptb)
  this.add(seg)
  return this.ajouteCourbe(repere, seg, fonction, nomPointLieAxe, nomCalculAbscisse, nomCalculOrdonnee, nombrePoints,
    pointLieCache, pointCourbeCache, gestionAutoDiscontinuite, color, lineStyle, taillePoliceNom, app)
}

/**
 * Fonction ajoutant dans le repère repere la courbe d'une fonction sur l'intervalle [a;+infini[
 * @param {CRepere} repere  Le repère dans lequel la courbe doit être tracée
 * @param {CFonc} fonction  La fonction dont la courbe doit être tracée
 * @param {string} nomPointLieAxe  Le nom du point lié à l'axe (qui doit être ici un segment)
 * @param {string} nomCalculAbscisse  Le nom de la mesure de l'abscisse de ce point lié
 * @param {string} nomCalculOrdonnee  Le nom de l'image de l'abscisse par la fonction
 * @param {number} nombrePoints  Le nombre de points de la courbe
 * @param {boolean} pointLieCache  true si le point lié doit être caché
 * @param {boolean} pointCourbeCache  true su le point générateur de la courbe doit être caché
 * @param {boolean} gestionAutoDiscontinuite  true pour une gestion auto des discontinuités de la courbe
 * @param {CValeur} a  Un CValeur contenant la valeur de a
 * @param {Color} color couleur de la courbe
 * @param {StyleTrait} lineStyle le style de trait de la courbe
 * @param {number} taillePoliceNom la taille de police utilisée pour les noms créés
 * @param {MtgApp} [app] L'application propriétaire. Si nul l'appel se fait depuis l'API
 * @return {boolean} true si la courbe (lieu de points) est visible
 */
CListeObjets.prototype.ajouteCourbeSuraInf = function (repere, fonction, nomPointLieAxe, nomCalculAbscisse,
  nomCalculOrdonnee, nombrePoints, pointLieCache, pointCourbeCache, gestionAutoDiscontinuite, a,
  color, lineStyle, taillePoliceNom, app = null) {
  // On regarde si le repère possède déjà un axe des abscisses
  let pta = a.existePtAbs(this, repere)
  if (pta === null) {
    pta = new CPointDansRepere(this, null, false, Color.black, false, 3, 0, false, '', taillePoliceNom,
      MotifPoint.petitRond, false, repere, a, new CValeur(this, 0))
    this.add(pta)
  }
  const trans = new CTranslation(this, null, false, repere.o, repere.i)
  this.add(trans)
  const ptim = new CPointImage(this, null, false, Color.black, false, 3, 0, false, '', taillePoliceNom,
    MotifPoint.petitRond, false, pta, trans)
  this.add(ptim)
  const ddte = new CDemiDroiteOA(this, null, false, Color.black, false, StyleTrait.stfc(this), pta, ptim)
  this.add(ddte)
  return this.ajouteCourbe(repere, ddte, fonction, nomPointLieAxe, nomCalculAbscisse, nomCalculOrdonnee, nombrePoints,
    pointLieCache, pointCourbeCache, gestionAutoDiscontinuite, color, lineStyle, taillePoliceNom, app)
}

/**
 * Fonction ajoutant dans le repère repere la courbe d'une fonction sur l'intervalle ]-infini;a]
 * @param repere Le repère dans lequel la courbe doit être tracée
 * @param fonction La fonction dont la courbe doit être tracée
 * @param nomPointLieAxe Le nom du point lié à l'axe (qui doit êgtre ici un segment)
 * @param nomCalculAbscisse Le nom de la mesure de l'abscisse de ce point lié
 * @param nomCalculOrdonnee Le nom de l'image de l'abscisse par la fonction
 * @param nombrePoints Le nomnbre de points de la courbe
 * @param pointLieCache true si le point lié doit être caché
 * @param pointCourbeCache true su le point générateur de la courbe doit être caché
 * @param gestionAutoDiscontinuite true pour une gestion auto des discontinuités de la courbe
 * @param a Un CValeur contenant la valeur de a
 * @param {Color} color couleur de la courbe
 * @param {StyleTrait} lineStyle le style de trait de la courbe
 * @param {number} taillePoliceNom la taille de police utilisée pour les noms créés
 * @param {MtgApp} [app] L'application propriétaire. Si nul l'appel se fait depuis l'API
 * @return {boolean} true si la courbe (lieu de points) est visible
 */
CListeObjets.prototype.ajouteCourbeSurInfa = function (repere, fonction, nomPointLieAxe, nomCalculAbscisse,
  nomCalculOrdonnee, nombrePoints, pointLieCache, pointCourbeCache, gestionAutoDiscontinuite, a,
  color, lineStyle, taillePoliceNom, app = null) {
  // On regarde si le repère possède déjà un axe des abscisses
  let pta = a.existePtAbs(this, repere)
  if (pta === null) {
    pta = new CPointDansRepere(this, null, false, Color.black, false, 3, 0, false, '', taillePoliceNom,
      MotifPoint.petitRond, false, repere, a, new CValeur(this, 0))
    this.add(pta)
  }
  const trans = new CTranslation(this, null, false, repere.i, repere.o)
  this.add(trans)
  const ptim = new CPointImage(this, null, false, Color.black, false, 3, 0, false, '', taillePoliceNom,
    MotifPoint.petitRond, false, pta, trans)
  this.add(ptim)
  const ddte = new CDemiDroiteOA(this, null, false, Color.black, false, StyleTrait.stfc(this), pta, ptim)
  this.add(ddte)
  return this.ajouteCourbe(repere, ddte, fonction, nomPointLieAxe, nomCalculAbscisse, nomCalculOrdonnee, nombrePoints,
    pointLieCache, pointCourbeCache, gestionAutoDiscontinuite, color, lineStyle, taillePoliceNom, app)
}

/**
 * Fonction renvoyant un objet formé d'éléments de la liste du type d'objet graphique nat
 * qui ne sont pas des objest intermédiaires de construction
 * pointeurs : tableau contenant des pointeurs sur les objets trouvés
 * noms : tableau contenant les noms des onjets correspondant
 * @param {MtgApp} app L'application MtgApp propriétaire
 * @param nat Nature des objets à afficher
 * @param indmax Indice du dernier objet à afficher (-1 pour afficher tous les objets compatibles)
 * @param exclu éventuel objet à ne pas faire figurer dans la liste
 * @returns {{pointeurs: CElementBase[], noms: string[]}}
 */
CListeObjets.prototype.listeParNatCal = function (app, nat, indmax, exclu = null) {
  let i; let el; let valide
  const pointeurs = []
  const noms = []
  const indfin = indmax === -1 ? this.longueur() - 1 : indmax
  for (i = 0; i <= indfin; i++) {
    el = this.get(i)
    valide = (el !== exclu) && !el.estElementIntermediaire() && el.estDeNatureCalcul(nat)
    if (app.estExercice) valide = (valide && (app.listePourConst.indexOf(el) !== -1)) || app.calculOKForConst(el)
    if (valide) {
      pointeurs.push(el)
      noms.push(el.getNom())
    }
  }
  return { pointeurs, noms }
}

/**
 * Fonctions renvoyant un objet formé de deux arrays contenant des pointeurs vers les macros pouvant être une macro de démarrage
 * et leurs intitulés respectifs. Le premier élément de la liste est un pointeur null
 * @returns {{pointeurs: CElementBase, noms: string[]}}
 */
CListeObjets.prototype.listeMacPourDem = function () {
  const pointeurs = [null]
  const noms = [getStr('NoMac')]
  for (const el of this.col) {
    if (el.estDeNature(NatObj.NMacro) && el.utilisablePourDemarrage()) {
      pointeurs.push(el)
      noms.push(el.intitule)
    }
  }
  return { pointeurs, noms }
}

CListeObjets.prototype.listePourHist = function (indstart, objetsInterm, nbObj) {
  const pointeurs = []
  const noms = []
  // var masked = []; // Contiendra l'état de masquage de chaque objet. Il doit être mémorisé
  const maskedNames = [] // Contiendra l'état de masquage du nom de chaque point ou droite
  // car lors du clignotement des objets en cours, leur statut peut changer, masqué ou non
  for (let i = indstart; i <= nbObj; i++) {
    const el = this.get(i)
    if ((!el.estElementIntermediaire() || objetsInterm) && el.estVisibleDansHist()) {
      pointeurs.push(el)
      const info = el.info()
      // if (el.estElementIntermediaire() && el.getNatureCalcul().isNotZero()) info = "*" + info;
      noms.push(info)
      // masked.push(el.estDeNature(NatObj.NTtObj) ? el.masque : null);
      maskedNames.push(el.estDeNature(NatObj.NObjNommable) ? el.nomMasque : null)
    }
  }
  return { pointeurs, noms, namemaskstate: maskedNames }
}

CListeObjets.prototype.contientDeriveeDe = function (fonc) {
  for (const elb of this.col) {
    if (elb.estDeNatureCalcul(NatCal.NDerivee) && !elb.estElementIntermediaire()) {
      if (elb.fonctionAssociee === fonc) return true
    }
  }
  return false
}

CListeObjets.prototype.listeFonctionsReellesSansDerivees = function (indmax, fonctionARajouter) {
  const pointeurs = []
  const noms = []
  const indfin = indmax === -1 ? this.longueur() - 1 : indmax
  for (let i = 0; i <= indfin; i++) {
    const el = this.get(i)
    if (el.estDeNatureCalcul(NatCal.NFoncR1Var) && !el.estElementIntermediaire()) {
      if ((!this.contientDeriveeDe(el) && el.calcul.deriveePossible(0)) || (el === fonctionARajouter)) {
        pointeurs.push(el)
        noms.push(el.getNom())
      }
    }
  }
  return { pointeurs, noms }
}

CListeObjets.prototype.detruitDernierObjet = function () {
  const ind = this.longueur() - 1
  if (ind >= 0) {
    this.remove(ind)
  }
}

/**
 * Fonction retirant l'objet el de la liste
 * @param el
 */
CListeObjets.prototype.removeObject = function (el) {
  const ind = this.indexOf(el)
  if (ind !== -1) this.col.splice(ind, 1)
}

CListeObjets.prototype.removeByInd = function (ind) {
  this.col.splice(ind, 1)
}

/**
 * Fonction retirant l'objet el de la liste sans utiliser this.get
 * Utilisé dans la reclassement d'objet
 * @param el
 */
/*
Version 6.8.0 : Cette fonction était redéfinie dans CListeObjetsAddPlus donc à priori pas utilisée
Je la supprime donc, la retire de CListeObjetsAddPLus et met la définition ici
CListeObjets.prototype.removeObj = function (el) {
  for (let i = 0; i < this.longueur(); i++) {
    if (this.col[i] === el) this.col.splice(i, 1)
  }
}
 */

/**
 * Fonction retirant de la liste l'objet obj
 * @param obj
 */
CListeObjets.prototype.removeObj = function (obj) {
  const ind = this.indexOf(obj)
  // Version 6.8.0 : Cette fonction étant appelée lors du reclassement d'objet ou dans OutilFinirConst
  // pour des objets sans composant associé, on ne détruit pas le composant associé car l'élément va ^tre déplacé et non détruit
  // if (ind !== -1) this.remove(this.indexOf(obj))
  if (ind !== -1) this.remove(this.indexOf(obj), false)
}

/**
 * Fonction retirant de la liste l'objet el
 * @param el
 */
CListeObjets.prototype.detruitObjet = function (el) {
  const ind = this.indexOf(el)
  if (ind >= 0) {
    this.remove(ind)
  }
}

/**
 * Fonction insérant l'objet el à l'index index
 * A noter qu'après appel à cette fontion il faut appeler updateindexes
 * @param index
 * @param elb
 */
CListeObjets.prototype.insert = function (index, elb) {
  if (elb.estDeNatureCalcul(NatCal.NMesureLongueur) && (this.pointeurLongueurUnite === null)) this.pointeurLongueurUnite = elb
  this.col.splice(index, 0, elb)
}

/**
 * Procedure utilisée lors de la création de la liaison entre un point libre
 * et un objet dans le cas où le point libre a été créé avant l'objet. Il faut
 * alors décaler (du dernier au premier) tous les objets créés entre le point
 * libre d'indice IndObj1 et l'objet d'indice indObj2 auquel il faut le lier
 */
CListeObjets.prototype.decaleDependants = function (indObj1, indObj2) {
  let indiceObjet2, indiceDebut, imp, nb
  const el2 = this.get(indObj2)
  if (el2.estElementFinal) {
    indiceDebut = this.indexOf(el2.impProto) - 1
    indiceObjet2 = this.indexOf(el2.impProto.dernierObjetFinal())
  } else {
    indiceDebut = indObj2 - 1
    indiceObjet2 = indObj2
  }
  const objet1 = this.get(indObj1)
  let i = indiceDebut
  while (i >= indObj1) {
    const element = this.get(i)
    if (element.appartientABlocDependantPourReclassement(objet1)) {
      if (indiceObjet2 === this.longueur() - 1) this.add(element)
      else this.insert(indiceObjet2 + 1, element)
      this.removeByInd(i)
      indiceObjet2--
      i--
      // Si l'objet qu'on vient de reclasser est le dernier objet final d'une
      // implémentation de construction
      // il aut recoller lo corps de la construction avec lui
      if (element.estElementFinal) {
        imp = element.impProto
        nb = imp.nbFinaux + imp.nbIntermediaires
        for (let k = 0; k < nb; k++) {
          const el1 = this.get(i)
          this.insert(indiceObjet2 + 1, el1)
          this.removeByInd(i)
          indiceObjet2--
          i--
        }
      }
    } else {
      if (element.estElementFinal) {
        // Il ne faut pas désolidariser le dernier élément final de son
        // implémentation de prototype
        imp = element.impProto
        nb = imp.nbFinaux + imp.nbIntermediaires + 1
        i -= nb
      } else { i-- }
    }
  }
  // Ajout version 4.8.0
  this.updateIndexes()
  //
}

/**
 * Fonction recherchant si la liste contient une transformation équivalente à la transformation trans
 * Si oui renvoie un pointeur sur cette transformation
 * Si non, renvoir null
 * @param trans
 */
CListeObjets.prototype.transformationConfondueAvec = function (trans) {
  for (const elb of this.col) {
    if (elb.estDeNature(NatObj.NTransformation)) {
      if (elb.confonduAvec(trans)) return elb
    }
  }
  return null
}

/**
 * Fonction ajoutant à this les objets graphiques de list qui sont de nature nature, sont visibles, ne sont pas des objets
 * intermédiaitres de construction et qui dépendent de el
 * @param {CListeObjets} list
 * @param {NatObj} nature
 * @param el L'objet dont les objets ajoutés doivent dépendre
 * @param {boolean} bOnlySurfLieuObj  si true, pour les surfaces, ne les rajoute que si elles peuvent générer un lieu d'objets
 * @returns {void}
 */
CListeObjets.prototype.ajouteObjetsParNatureDependantDe = function (list, nature, el, bOnlySurfLieuObj) {
  for (const elb of list.col) {
    let elbok = elb.estDeNature(nature) && !elb.masque && !elb.estElementIntermediaire() && elb.depDe(el)
    if (bOnlySurfLieuObj) elbok = elbok && (!elb.estDeNature(NatObj.NSurface) || elb.peutGenererLieuObjet())
    if (elbok) this.add(elb)
  }
}

CListeObjets.prototype.metAJourParNatureObjet = function (nat) {
  for (const elb of this.col) {
    if (elb.estDeNature(nat)) elb.metAJour()
  }
}

/**
 * Fonction renvoyant true si la liste contient au moins un objet qui dépend
 * des positions générées pas les déplacements du point lié point lié
 *
 * @param pointLie
 * @returns {boolean}
 */

CListeObjets.prototype.contientObjetGenereParPointLie = function (pointLie) {
  for (const elb of this.col) {
    if (elb.estGenereParPointLie(pointLie)) return true
  }
  return false
}

/**
 * Fonction ajoutant à this les éléments de list de nature graphique nature qui ne sont pas masqués
 * @param {CListeObjets} list
 * @param {Nat} nature
 * @returns {void}
 */
CListeObjets.prototype.ajouteObjetsParNatureNonMasques = function (list, nature) {
  for (const el of list.col) {
    if (!el.masque && el.estDeNature(nature)) this.add(el)
  }
}

/**
 * Fonction renvoyant un pointeur sur la valeur réelle ou complexe de nom nomValeur.
 * Si indiceMaxi vaut -1 ou est absent la recherche se fait jusqu'à la fin de la liste.
 * Les éléments intermédiares de construction sont sautés.
 * Sinon, si l'élément est trouév mais son indice supérieur à indiceMaix,
 * definiApres.getValue() renvoie true.
 * Si l'élément n'est pas trouvé, rencovie null.
 * @param {string} nomValeur
 * @param {number} indiceMaxi
 * @param {Pointeur} definiApres
 * @returns {CElementBase}
 */
CListeObjets.prototype.pointeurValeurReelleOuComplexe = function (nomValeur, indiceMaxi, definiApres) {
  let defap
  if (arguments.length <= 2) defap = new Pointeur()
  else defap = definiApres
  if (arguments.length === 1) indiceMaxi = this.longueur() - 1
  else if (indiceMaxi === -1) indiceMaxi = this.col.longueur() - 1
  defap.setValue(false)
  let i = 0
  let elb = null
  let trouve = false
  while ((!(trouve)) && (i <= indiceMaxi)) {
    elb = this.get(i)
    if (!elb.estElementIntermediaire() && elb.estDeNatureCalcul(NatCal.NTteValROuC)) {
      if (elb.chaineEgaleANom(nomValeur)) trouve = true
      else i++
    } else i++
  }
  if (trouve) return elb
  else {
    i = indiceMaxi + 1
    while (!trouve && (i < this.longueur())) {
      elb = this.get(i)
      if (elb.estDeNatureCalcul(NatCal.NTteValROuC)) {
        if (elb.chaineEgaleANom(nomValeur)) trouve = true
        else i++
      } else i++
    }
    if (trouve) defap.setValue(true)
    return null
  }
}

/**
 * Fonction renvoyant le nombre d'objets de la liste dépendant de pt
 * @param {CElementBase} pt
 * @returns {number}
 */
CListeObjets.prototype.nombreDependants = function (pt) {
  let res = 0
  for (const el of this.col) {
    if (el.depDe(pt)) res++
  }
  return res
}

/**
 * Retire de la liste les n derniers éléments.
 * @param {number} n (entier)
 * @returns {void}
 */
CListeObjets.prototype.retireNDerniersElements = function (n) {
  for (let i = 0; i < n; i++) this.col.pop()
}

/**
 * Fonction renvoyant le nombre d'objets de type calcul compatible avec nat
 * @param nat La nature de calcul recherchée
 * @param binterm Si true on recherche aussi dans les objets intermédiaires de construction. false si paramètre absent.
 * @returns {number}
 */

CListeObjets.prototype.nombreObjetsCalcul = function (nat, binterm = false) {
  let nb = 0
  for (const el of this.col) {
    if (el.estDeNatureCalcul(nat) && (binterm || !el.estElementIntermediaire())) nb++
  }
  return nb
}

CListeObjets.prototype.utiliseLongueurUnite = function () {
  for (const el of this.col) {
    if (el.utiliseLongueurUnite()) return true
  }
  return false
}

/**
 * Fonction renvoyant un pointeur vers le premier objet de classe className qui soit confondu avec obj
 * Renvoie null si aucun élément n'est trouvé
 * @param {string} className
 * @param {CElementBase} obj
 * @returns {CElementBase|null}
 */
CListeObjets.confonduAvec = function (className, obj) {
  for (const el of this.col) {
    if (!el.estElementIntermediaire() && (el.className === className) && el.confonduAvec(obj)) return el
  }
  return null
}

/**
 * Fonction renvoyant null si la liste ne contient pas de point image de pt
 * par la transformation transf et sinon un pointeur sur ce point image.
 * @param {CPt} pt
 * @param {CTransformation} transf
 * @returns {CPointImage}
 */
CListeObjets.prototype.pointImageDePar = function (pt, transf) {
  for (const elb of this.col) {
    if (elb.estDeNature(NatObj.NPoint)) {
      if (elb.estPointImage()) {
        if ((elb.transformation === transf) && (elb.antecedent === pt)) return elb
      }
    }
  }
  return null
}
/**
 * Fonction renvoyant le premier élémnet graphique après l'élément d'indice ind
 * Si aucun objet graphique n'est trouvé, renvoie null
 * @param ind
 * @returns {COb|null}
 */
CListeObjets.prototype.getFirstGraphicEltAfter = function (ind) {
  for (let i = ind + 1; i < this.longueur(); i++) {
    const el2 = this.get(i)
    if (el2.estDeNature(NatObj.NTtObj) && el2.g !== null) return el2
  }
  return null
}
/**
 * Fonction insérant dans la liste l'objet el à l'indice el
 * Si le paramètre svg n'est pas null, on retire du svg le svg element de el pour le remettre
 * au bon endroit
 * @param {CElementBase} el
 * @param {number} indice
 * @param {SVGElement|null} svg
 */
CListeObjets.prototype.insereElement = function (el, indice, svg = null) {
  this.col.splice(indice, 0, el)
  if (svg && el.estDeNature(NatObj.NTtObj) && el.g !== null) {
    const nextelt = this.getFirstGraphicEltAfter(indice)
    if (nextelt !== null) {
      svg.removeChild(el.g)
      svg.insertBefore(el.g, nextelt.g)
    }
  }
}

CListeObjets.prototype.removegElements = function (svg, bMemeInterm = false, indStart = 0, indMax = null) {
  const indFin = (indMax === null) ? this.longueur() - 1 : indMax
  for (let i = indStart; i <= indFin; i++) {
    const el = this.get(i)
    try {
      if ((!el.estElementIntermediaire() || bMemeInterm) && el.estDeNature(NatObj.NTtObj)) {
        svg.removeChild(el.g)
        el.g = null
        if ((el.estDeNature(NatObj.NObjNommable) || (el.estDeNature(NatObj.NObjetDuplique))) && el.gname) {
          svg.removeChild(el.gname)
          el.gname = null
        } else {
          // Dans les versions précédent la 8.4.2 on avait le test ci-dessous et
          // si on changeait un éditeur de formule via le protocole en demandant un affichage LaTeX temps réel
          // on se retrouvait avec deux affichages LaTeX de la formule
          // if (el.estDeNature(NatObj.NEditeurFormule) && !el.masque && el.affichageFormule && el.glatex)
          if (el.estDeNature(NatObj.NEditeurFormule) && !el.masque && el.glatex) {
            if (svg.contains(el.glatex)) svg.removeChild(el.glatex)
          }
        }
      }
    } catch (e) {
      el.g = null
      if ((el.estDeNature(NatObj.NObjNommable) || (el.estDeNature(NatObj.NObjetDuplique))) && el.gname) el.gname = null
    }
  }
}

CListeObjets.prototype.nombreImagesParTransformation = function (transf) {
  const ind = transf.index
  let res = 0
  for (let i = ind + 1; i < this.longueur(); i++) {
    const elb = this.get(i)
    const elb2 = elb.antecedentDirect()
    if ((elb2 !== elb) && (elb2 === transf)) res++
  }
  return res
}

/**
 * Fonctions envoyant le nombre d'imagespar la tansformation transf autres que exclu
 * @param transf
 * @param exclu
 * @returns {number}
 */
CListeObjets.prototype.nombreImagesParTransformationNonDepDe = function (transf, exclu) {
  // var ind = indexOf(transf);
  const ind = transf.index
  let res = 0
  for (let i = ind + 1; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (!elb.depDe(exclu)) {
      const elb2 = elb.antecedentDirect()
      // if ((elb2 != elb) && (elb2.getNature() == NatObj.NTransformation) && (elb2 == transf))
      if ((elb2 !== elb) && (elb2 === transf)) res++
    }
  }
  return res
}

/**
 * Fonction retirant de la liste les objets qui dépendent de pt
 * Nommée retireDependants dans la version Java
 * @param {CElementBase} pt
 * @param svg Le svg contenant la figure
 * @param {boolean} bRemovegElements Si true en retire du SVG les g Elements de chaque objet détruit
 * Ce paramètre sera false quand on détruit un objet dans l'historique
 * @returns {void}
 */

CListeObjets.prototype.detruitDependants = function (pt, svg, bRemovegElements = true) {
  // Ajout version 3.4.2
  this.initialiseDependances()
  let existeImplementationsProtoATraiter = false
  let index = this.col.length - 1
  while (index >= 0) {
    const elb = this.get(index)
    if (elb.depDe(pt) || ((elb.impProto !== null) && elb.impProto.depDe(pt))) {
      if (elb === this.pointeurLongueurUnite) this.pointeurLongueurUnite = null
      const impProto = elb.impProto
      if (impProto !== null) {
        existeImplementationsProtoATraiter = true
        if (elb.estElementFinal) {
          impProto.nbFinaux--
        } else {
          impProto.nbIntermediaires--
        }
      }
      // Ligne suivante modifié pour simplification
      // this.remove(elb.index); // Attention : ce remove(CObject obj) est redéfini pour détruire aussi le composant MtgFormulaEditor
      this.remove(index) // Attention : ce remove(CObject obj) est redéfini pour détruire aussi le composant MtgFormulaEditor
      if (bRemovegElements && elb.estDeNature(NatObj.NTtObj)) {
        addQueue(function () {
          elb.removegElement(svg)
        })
      } // On retire le gElement qui représente l'objet
      // associé à un CEditeurFormule
    }
    if (elb === pt) break
    index--
  }
  if (existeImplementationsProtoATraiter) this.traiteImplementationsProto()
  this.updateIndexes()
}

/**
 * Fonction retirant de la liste les CImplementationProto qui sont orphelines (tous
 * les éléments finaux de la construction ont été détruits) ou retirant de ces CImplementationProto
 * les objets intermédiaires de fin qui ne sont plus utiles (arrive quand l'utilisateur a supprimé
 * certains objets finaux.
 * @returns {void}
 */
CListeObjets.prototype.traiteImplementationsProto = function () {
  // for (var i = 0; i < this.longueur(); i++) {
  let i = 0; let j
  while (i < this.longueur()) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NImpProto)) {
      if (elb.nbFinaux === 0) {
        // this.detruitDependants(elb, svg);
        // i = 0; // On recommence depuis le début
        for (j = 0; j <= elb.nbIntermediaires; j++) this.remove(i)
      } else {
        const deb = i + elb.nbFinaux + elb.nbIntermediaires
        // Attention : quand on exécute certaines macros d'implémentatio récursive de macro
        // on peut demander de ne créer que les objets finaux de dernière génération
        // dans ce cas le nombbre réel d'objets finaux n'est pas elb.nbFinaux
        // Pour éviter d'y toucher il faut vérifier que l'élement d'indice deb
        // appartient bien à l'impémentation proto elb
        const lastelt = this.get(deb)
        if (lastelt.impProto === elb && lastelt.estElementIntermediaire()) {
          // Si le dernier élément d'une CImplémentationProto est un objet intermédiaire
          // Il faut détruire tous les objets intermédiaires finaux.
          for (j = deb; j > i; j--) {
            if (this.get(j).estElementIntermediaire()) {
              this.remove(j)
              elb.nbIntermediaires--
            } else break
          }
        }
        i += elb.nbFinaux + elb.nbIntermediaires + 1
      }
    } else i++
  }
}

/**
 * Fonction renvoyant le premier objet de la liste qui existe (si bMustExist = true) et qui est un repère
 * qui n'est pas un objet intermédiaire de construction.
 * @param {boolean} bMustExist Si true le repère doit exister, sinon il peut ne pas exister (utiliser pour la création
 * d'une figure avec papier millimétré)
 * @returns {CElementBase|null}
 */
CListeObjets.prototype.premierRepVis = function (bMustExist = true) {
  for (const elb of this.col) {
    if ((elb.getNatureCalcul() === NatCal.NRepere) && (bMustExist ? elb.existe : true) && !elb.estElementIntermediaire()) return elb
  }
  return null
}

CListeObjets.prototype.ajouteRepereOrthonormal = function (dimf, quadrillageHor,
  quadrillageVer, pointille, nomO, nomI, nomJ, nomVecteuri,
  nomVecteurj, originex, originey, unitex, unitey, nomsIJmasques) {
  // var stfp = StyleTrait.stfp(this);
  const stfc = StyleTrait.stfc(this)
  const petitRond = MotifPoint.petitRond
  const res = dimf.y / 20 // Arbitraire version js
  const absnom = CDroite.abscisseNomParDefaut
  const bl = Color.black
  const o = new CPointBase(this, null, false, bl, false, -12, 0, false, nomO, 16, petitRond,
    false, false, dimf.x / 2, dimf.y / 2)
  this.add(o)
  // Ensuite une droite horizontale passant par ce point cachée
  const ptdh = new CDroiteDirectionFixe(this, null, false, bl, false, 0, 0, true, '', 16, stfc,
    absnom, o, true, 1)
  this.add(ptdh)
  // On ajoute un point nommé lié à la droite horizontale
  const i = new CPointLieDroite(this, null, false, bl, nomsIJmasques, -6, 0, false, nomI, 16, petitRond,
    false, false, res, ptdh)
  this.add(i)
  // Une droite représentant l'axe des abscisses.
  const ptd = new CDroiteAB(this, null, false, bl, false, 0, 0, false, '', 16, stfc, absnom, o, i)
  this.add(ptd)
  // On crée une perpendiculaire
  const perp = new CDroitePerpendiculaire(this, null, false, bl, false, 0, 0, false, '', 16, stfc, absnom, o, ptd)
  this.add(perp)
  // On crée un cercle de centre O et passant par I
  const cercle = new CCercleOA(this, null, false, bl, true, stfc, o, i)
  this.add(cercle)
  // On crée l'intersection de ce cercle avec la perpendiculaire
  const inter = new CIntDroiteCercle(this, null, false, perp, cercle)
  this.add(inter)
  // Puis deux points représentant les deux points d'intersection
  // Le premier point est caché sans nom
  const k = new CPointLieBipoint(this, null, false, bl, false, 0, 0, true, '', 16,
    petitRond, false, inter, 1)
  this.add(k)
  const j = new CPointLieBipoint(this, null, false, bl, nomsIJmasques, -12, -4, false, nomJ, 16,
    petitRond, false, inter, 2)
  this.add(j)
  // puis le repère
  this.finitRep(o, i, j, nomVecteuri, nomVecteurj, originex, originey, quadrillageVer, quadrillageHor,
    pointille, unitex, unitey)
}

CListeObjets.prototype.ajouteRepereOrthogonal = function (dimf, quadrillageHor,
  quadrillageVer, pointille, nomO, nomI, nomJ, nomVecteuri,
  nomVecteurj, originex, originey, unitex, unitey, nomsIJmasques) {
  // var stfp = StyleTrait.stfp(this);
  const stfc = StyleTrait.stfc(this)
  const petitRond = MotifPoint.petitRond
  const resx = dimf.x / 20 // Arbitraire version js
  const resy = dimf.y / 15 // Arbitraire version js
  const absnom = CDroite.abscisseNomParDefaut
  const bl = Color.black
  const o = new CPointBase(this, null, false, bl, false, -12, 0, false, nomO, 16, petitRond,
    false, false, dimf.x / 2, dimf.y / 2)
  this.add(o)
  // Ensuite une droite horizontale passant par ce point cachée
  const ptdh = new CDroiteDirectionFixe(this, null, false, bl,
    false, 0, 0, true, '', 16, stfc, absnom, o, true, 1)
  this.add(ptdh)
  // On ajoute un point nommé lié à la droite horizontale
  const i = new CPointLieDroite(this, null, false, bl, nomsIJmasques, -6, 0, false, nomI, 16,
    petitRond, false, false, resx, ptdh)
  this.add(i)
  // Une droite représentant l'axe des abscisses.
  const ptd = new CDroiteAB(this, null, false, bl, false,
    0, 0, false, '', 16, stfc, absnom, o, i)
  this.add(ptd)
  // On crée une perpendiculaire
  const perp = new CDroitePerpendiculaire(this, null, false, bl,
    false, 0, 0, true, '', 16, stfc, absnom, o, ptdh)
  this.add(perp)
  const j = new CPointLieDroite(this, null, false, bl, nomsIJmasques, -11, 0, false, nomJ, 16,
    petitRond, false, false, -resy, perp)
  this.add(j)
  const axeOrd = new CDroiteAB(this, null, false, bl, false,
    0, 0, false, '', 16, stfc, absnom, o, j)
  this.add(axeOrd)
  // puis le repère
  this.finitRep(o, i, j, nomVecteuri, nomVecteurj, originex, originey, quadrillageVer, quadrillageHor,
    pointille, unitex, unitey)
}

CListeObjets.prototype.ajouteRepereOblique = function (dimf, quadrillageHor,
  quadrillageVer, pointille, nomO, nomI, nomJ, nomVecteuri,
  nomVecteurj, originex, originey, unitex, unitey, nomsIJmasques) {
  // var stfp = StyleTrait.stfp(this);
  const stfc = StyleTrait.stfc(this)
  const petitRond = MotifPoint.petitRond
  const resx = dimf.x / 20 // Arbitraire version js
  const resy = dimf.y / 15 // Arbitraire version js
  const absnom = CDroite.abscisseNomParDefaut
  const bl = Color.black
  // res contient la résolution de l'écran en points par cm
  const o = new CPointBase(this, null, false, bl, false, -17, 0, false, nomO, 16, petitRond,
    false, false, dimf.x / 2, dimf.y / 2)
  this.add(o)
  // Ensuite une droite horizontale passant par ce point cachée
  const ptdh = new CDroiteDirectionFixe(this, null, false, bl,
    false, 0, 0, true, '', 16, stfc, absnom, o, true, 1)
  this.add(ptdh)
  // On ajoute un point nommé lié à la droite horizontale
  const i = new CPointLieDroite(this, null, false, bl, nomsIJmasques, -10, 0, false, nomI, 16, petitRond,
    false, false, resx, ptdh)
  this.add(i)
  // Une droite représentant l'axe des abscisses.
  const ptd = new CDroiteAB(this, null, false, bl, false,
    0, 0, false, '', 16, stfc, absnom, o, i)
  this.add(ptd)
  const j = new CPointBase(this, null, false, bl, nomsIJmasques, -11, -4, false, nomJ, 16, petitRond,
    false, false, dimf.x / 2 + resx / 4, dimf.y / 2 - resy / 2)
  this.add(j)
  const axeOrd = new CDroiteAB(this, null, false, bl, false,
    0, 0, false, '', 16, stfc, absnom, o, j)
  this.add(axeOrd)
  // puis le repère
  this.finitRep(o, i, j, nomVecteuri, nomVecteurj, originex, originey, quadrillageVer, quadrillageHor,
    pointille, unitex, unitey)
}

CListeObjets.prototype.ajouteRepereObliqueNorme = function (dimf, quadrillageHor,
  quadrillageVer, pointille, nomO, nomI, nomJ, nomVecteuri,
  nomVecteurj, originex, originey, unitex, unitey, nomsIJmasques) {
  // var stfp = StyleTrait.stfp(this);
  const stfc = StyleTrait.stfc(this)
  const petitRond = MotifPoint.petitRond
  const resx = dimf.x / 20 // Arbitraire version js
  const absnom = CDroite.abscisseNomParDefaut
  const bl = Color.black
  // res contient la résolution de l'écran en points par cm
  const o = new CPointBase(this, null, false, bl, false, -17, 0, false, nomO, 16, petitRond,
    false, false, dimf.x / 2, dimf.y / 2)
  this.add(o)
  // Ensuite une droite horizontale passant par ce point cachée
  const ptdh = new CDroiteDirectionFixe(this, null, false, bl,
    false, 0, 0, true, '', 16, stfc, absnom, o, true, 1)
  this.add(ptdh)
  // On ajoute un point nommé lié à la droite horizontale
  const i = new CPointLieDroite(this, null, false, bl, nomsIJmasques, -10, 0, false, nomI, 16,
    petitRond, false, false, resx, ptdh)
  this.add(i)
  // Une droite représentant l'axe des abscisses.
  const ptd = new CDroiteAB(this, null, false, bl, false,
    0, 0, false, '', 16, stfc, absnom, o, i)
  this.add(ptd)
  ptd.tag = 'xaxis'
  // On crée un cercle de centre O et passant par I
  const cercle = new CCercleOA(this, null, false, bl, true, stfc, o, i)
  this.add(cercle)
  const j = new CPointLieCercle(this, null, false, bl, nomsIJmasques, -12, 0, false, nomJ, 16,
    MotifPoint.petitRond, false, false, Math.PI / 3, cercle)
  this.add(j)
  const axeOrd = new CDroiteAB(this, null, false, bl, false,
    0, 0, false, '', 16, stfc, absnom, o, j)
  this.add(axeOrd)
  axeOrd.tag = 'yaxis'
  // puis le repère
  this.finitRep(o, i, j, nomVecteuri, nomVecteurj, originex, originey, quadrillageVer, quadrillageHor,
    pointille, unitex, unitey)
}

/**
 * Fonction finissant la création d'un repère ajouté à une nnouvelle figure
 * @param o L'origine
 * @param i Le point de coordonnées (1;0)
 * @param j Le point de coordonnées (1;0)
 * @param nomVecteuri Le nom du vecteur i ("" si pas de vecteur)
 * @param nomVecteurj Le nom du vecteur j ("" si pas de vecteur)
 * @param originex L'abscisse à l'origine
 * @param originey L'ordonnée à l'origine
 * @param quadrillageVer true si quadriallage vertical
 * @param quadrillageHor true si quadrillage horizontal
 * @param pointille true si pointillés
 * @param unitex L'unité sur l'axe des x
 * @param unitey L'unité sur l'axe des y
 */
CListeObjets.prototype.finitRep = function (o, i, j, nomVecteuri, nomVecteurj, originex, originey,
  quadrillageVer, quadrillageHor, pointille, unitex, unitey) {
  const bl = Color.black
  // var stfp = StyleTrait.stfp(this);
  const stfc = StyleTrait.stfc(this)

  const rep = new CRepere(this, null, false, (pointille && !quadrillageHor && !quadrillageVer)
    ? new Color(164, 164, 164)
    : new Color(230, 230, 230), false, stfc, o, i, j, originex, originey, quadrillageVer, quadrillageHor, pointille, unitex, unitey)
  this.add(rep)
  // On donne par défaut au repère le tag rep pour qu'on puisse utiliser les apiTools dessus
  rep.tag = 'rep'
  // On crée la longueur OI qu'on établit comme longueur unité de la liste
  // this, null, false, O, I);
  const unitexrep = new CUnitexRep(this, null, false, 'unit', rep)
  this.add(unitexrep)
  const hom = new CHomothetie(this, null, false, o, new CValeur(this, new COperation(this, new CConstante(this, 1),
    new CResultatValeur(this, unitexrep), Ope.Divi)))
  this.add(hom)
  const ptim = new CPointImage(this, null, false, bl, false, 0, 0, true, 'W"', 16, MotifPoint.rond, false, i, hom)
  this.add(ptim)
  const lon = new CLongueur(this, null, false, o, ptim)
  this.pointeurLongueurUnite = lon
  this.add(lon)
  if (nomVecteuri.length !== 0) {
    const vecti = new CVecteur(this, null, false, bl, false, stfc, o, i, StyleFleche.FlecheCourtePleine)
    this.add(vecti)
    const commi = new CLatex(this, null, false, bl, 0, 0, -10, 2, false, i, 16, StyleEncadrement.Sans, false,
      Color.white, CAffLiePt.alignHorRight,
      CAffLiePt.alignVerTop, '\\vec{' + nomVecteuri + '}')
    // commi.creeFormule();
    // commi.setReady4MathJax();
    this.add(commi)
  }
  if (nomVecteurj.length !== 0) {
    const vectj = new CVecteur(this, null, false, bl, false, stfc, o, j, StyleFleche.FlecheCourtePleine)
    this.add(vectj)
    const commj = new CLatex(this, null, false, bl, 0, 0, -8, 5, false, j, 16, StyleEncadrement.Sans, false,
      Color.white, CAffLiePt.alignHorRight,
      CAffLiePt.alignVerTop, '\\vec{' + nomVecteurj + '}')
    //  commj.creeFormule();
    // commj.setReady4MathJax();
    this.add(commj)
  }
}

/**
 * Fonction renvoyant le premier objet de nature calcul nat qui n'est pas un objet intermédiaire de construciton
 * @param {Nat} nat
 * @returns {CElementBase|null}
 */
CListeObjets.prototype.premierParNatCal = function (nat) {
  for (const elb of this.col) {
    if ((elb.estDeNatureCalcul(nat)) && !elb.estElementIntermediaire()) return elb
  }
  return null
}

/**
 * Fonction renvoyant l'objet d'indice index (l'objet n° index - 1) de nature nat
 * @param {Nat} nat
 * @param {number} index
 * @param {boolean} bInterm Si true on cherche aussi dans les objets intermédiaires de construction
 * @returns {CElementBase|null}
 */
CListeObjets.prototype.premierParNat = function (nat, index = 0, bInterm = false) {
  let ind = 0
  for (const elb of this.col) {
    if ((elb.estDeNature(nat)) && (bInterm || !elb.estElementIntermediaire())) {
      if (ind === index) return elb
      else ind++
    }
  }
  return null
}

// Modifié version 6.8.0
CListeObjets.prototype.ajouteConstantePi = function () {
  const ptCalc = new CCalcConst(this, null, false, 'pi', '3.14159265358979323846', new CConstante(this, Math.PI))
  this.add(ptCalc)
}

/**
 * Renvoie true si la liste contient un point dont les coordonnées sont
 * "presque" égales à x et y et qui soit sur les el1 et el2
 * Dans la version JavaScript el1 et el2 peuvent pointer indifféremmen sur une droite ou un cercle
 * Si oui renvoit un pointeur sur ce point, sinon renvoie null
 * @param {number} x
 * @param {number} y
 * @param {CElementBase} el1
 * @param {CElementBase} el2
 * @param {boolean} bEstExercice true si on est en mode exercice de construction Dans ce cas on n'utilise pas de technique intelligente
 * d'appartenance à el1 et el2 et on considère que le point existe déjà s'il est très proche d'un point déjà créé.
 * @returns {CElementBase|null}
 */
CListeObjets.prototype.existePointConfonduPourIntersection = function (x, y, el1, el2, bEstExercice) {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NTtPoint)) {
      // Modification version 3.9 : Si l'intersection a déjà été créée pour un objet intermédiaire de construction
      // on crée de nouveau l'objet
      if (!elb.estElementIntermediaire() && elb.existe) {
        const presqueEgaux = zero(elb.x - x) && zero(elb.y - y)
        if (bEstExercice) {
          if (presqueEgaux) return elb
        } else {
          if (presqueEgaux && elb.appartientParDefinition(el1) && elb.appartientParDefinition(el2)) {
            return elb
          }
        }
      }
    }
  }
  return null
}

/**
 * Etudie l'intersection de el1 et el2 a déjà été créé.
 * si el1 et el2 sont deux droites, renvoie true si le point d'intersection
 * existe déjà dans la figure.
 * S'il s'agit d'une droite et un cercle ou de deux cercles, dejaCree.getValue()
 * renvoie true quand les deux points d'intersection ont déjà été créés et false sinon.
 * et si un des deux points d'intersection a déjà été créé, renvoie un
 * pointeur sur ce point. Sinon renvoit null.
 * @param {boolean} bEstExercice  true si on est en mode exercice de construction
 * @param {CElementGraphique} el1  droite ou cercle
 * @param {CElementGraphique} el2  droite ou cercle
 * @param {Pointeur} dejaCree  Renvoie true quand les deux points d'intersection
 * ont déjà été créés et false sinon.
 * @returns {CPt}
 */
CListeObjets.prototype.pointIntersectionDejaCree = function (bEstExercice, el1, el2, dejaCree) {
  let positionRelative, pointInt2, ptPoint1, ptPoint2
  const pointInt1 = {}
  if (arguments.length === 3) { // : Cas de deux droites. Renvoie un booléen}
    positionRelative = intersection(el1.point_x, el1.point_y, el1.vect, el2.point_x,
      el2.point_y, el2.vect, pointInt1)
    if (positionRelative !== PositionDroites.Paralleles) { return this.existePointConfonduPourIntersection(pointInt1.x, pointInt1.y, el1, el2, bEstExercice) } else return null
  } else {
    if (el1.estDeNature(NatObj.NTteDroite) && el2.estDeNature(NatObj.NTtCercle)) {
      pointInt2 = {}
      dejaCree.setValue(false)
      positionRelative = intersectionDroiteCercle(el1.point_x, el1.point_y, el1.vect,
        el2.centreX, el2.centreY, el2.rayon, pointInt1, pointInt2)
      ptPoint1 = this.existePointConfonduPourIntersection(pointInt1.x, pointInt1.y, el1, el2, bEstExercice)
      ptPoint2 = this.existePointConfonduPourIntersection(pointInt2.x, pointInt2.y, el1, el2, bEstExercice)
      if (positionRelative === PositionDroiteCercle.Secants) {
        dejaCree.setValue((ptPoint1 !== null) && (ptPoint2 !== null))
        if (dejaCree.getValue()) return null
        else {
          if (ptPoint1 !== null) return ptPoint1
          else {
            if (ptPoint2 !== null) return ptPoint2
            else return null
          }
        }
      } else {
        if (positionRelative === PositionDroiteCercle.Tangents) {
          dejaCree.setValue(ptPoint1 !== null)
          if (dejaCree.getValue()) return ptPoint1
          else return null
        } else return null
      }
    } else { // Cas de deux cercles
      pointInt2 = { x: 0, y: 0 }
      dejaCree.setValue(false)
      positionRelative = intersectionCercleCercle(el1.centreX, el1.centreY, el1.rayon,
        el2.centreX, el2.centreY, el2.rayon, pointInt1, pointInt2)
      ptPoint1 = this.existePointConfonduPourIntersection(pointInt1.x, pointInt1.y, el1, el2, bEstExercice)
      ptPoint2 = this.existePointConfonduPourIntersection(pointInt2.x, pointInt2.y, el1, el2, bEstExercice)
      if (positionRelative === PositionCercleCercle.Secants) {
        dejaCree.setValue((ptPoint1 !== null) && (ptPoint2 !== null))
        if (dejaCree.getValue()) return null
        else {
          if (ptPoint1 !== null) return ptPoint1
          else {
            if (ptPoint2 !== null) return ptPoint2
            else return null
          }
        }
      } else {
        if (positionRelative === PositionCercleCercle.Tangents) {
          dejaCree.setValue(ptPoint1 !== null)
          if (dejaCree.getValue()) return ptPoint1
          else return null
        } else return null
      }
    }
  }
}

CListeObjets.prototype.ajouteLongueurUnite = function (app) {
  // On charge la construction qui est contenue dans this.app.docConst
  const proto = app.docCons.getPrototype('LongUnit')
  const impProto = new CImplementationProto(this, proto)
  impProto.implemente(app.dimf, proto)
  const pt1 = this.get(2) // Le point libre de gauche
  pt1.tailleNom = 14
  const pt2 = this.get(4) // Le point libre de gauche
  pt2.tailleNom = 14
  impProto.nomProto = getStr('LongUnite')
  // La longueur unité est le dernier objet implémenté par la macro construction
  this.pointeurLongueurUnite = this.get(this.longueur() - 1)
}

/**
 * Fonction renvoyant un pointeur sur la droite passant par a et b si elle existe et null sinon
 * @param {CPt} a
 * @param {CPt} b
 * @returns {CElementBase|null}
 */
CListeObjets.prototype.existeDroiteABDefiniePar = function (a, b) {
  for (const el of this.col) {
    if (el.className === 'CDroiteAB') {
      if (((el.a === a) && (el.b === b)) || ((el.b === a) && (el.a === b))) return el
    }
  }
  return null
}

/**
 *
 * @param {CElementBase} el
 * @returns {boolean}
 */
CListeObjets.prototype.nomIndispensable = function (el) {
  for (const elb of this.col) {
    if (elb.nomIndispensable(el)) return true
  }
  return false
}

/**
 *
 * @param {Nat} typeCherche
 * @param {number} x
 * @param {number} y
 * @param {string} type si touch on prend une distance de 32 (sinon 16)
 * @param listeExclusion
 * @returns {null|CElementBase}
 */
CListeObjets.prototype.premierObjetNomProcheDe = function (typeCherche, x, y, type, listeExclusion) {
  // lorsque la liste est vide, aucun objet n'est proche
  for (const el of this.col) {
    if (el.estDeNature(typeCherche) && (listeExclusion.indexOf(el) === -1) && !(el.masque || el.nomMasque)) {
      const dis = el.distanceNom(x, y, type === 'touch' ? 32 : 16)
      if (dis === 0) return el // On est à l'intérieur de l'affichage du nom de l'objet
    }
  }
  return null // Aucun nom d'objet proche
}

/**
 * Fonction demandant à chaque objet pour lequel c'est nécéssaire de se préparer
 * pour le traitement par MathJax qui sera fait via une fonction de callback.
 * Appelée quand pn utilise l'outil Rideau.
 * @returns {void}
 */
CListeObjets.prototype.setReady4MathJaxEvenMasked = function () {
  for (const el of this.col) {
    if (el.existe && !el.estElementIntermediaire()) el.setReady4MathJaxEvenMasked()
  }
}

CListeObjets.prototype.updateEvenMasked = function (svg, couleurFond) {
  this.setReady4MathJaxEvenMasked()
  const self = this
  for (const elb of this.col) {
    addQueue(function () {
      self.callBack(elb, svg, couleurFond, false)
    })
  }
}

/**
 * Fonction ajoutant à this les points de la liste listeSource dont l'étatt de masquage est basque
 * @param listeSource
 * @param bmarque
 */
CListeObjets.prototype.ajoutePointsMarquesPourTrace = function (listeSource, bmarque) {
  for (const elb of listeSource.col) {
    if (elb.estDeNature(NatObj.NTtPoint) && !elb.estElementIntermediaire() && !elb.masque) {
      if (elb.marquePourTrace === bmarque) this.add(elb)
    }
  }
}

CListeObjets.prototype.remplaceObjet = function (oldObj, newObj) {
  const ind = this.indexOf(oldObj)
  this.col[ind] = newObj
  newObj.index = ind
}

/**
 * Fonction ajoutant à this les points mobiles non intermédiaires dont l'état de liberté est égal à libres
 * @param listeSource
 * @param blibres
 */
CListeObjets.prototype.ajoutePointsLibresVisibles = function (listeSource, blibres) {
  for (const elb of listeSource.col) {
    if (elb.estDeNature(NatObj.NPointMobile) && !elb.estElementIntermediaire()) {
      if (!elb.masque) {
        if (elb.fixed !== blibres) { this.add(elb) }
      }
    }
  }
}
/**
 * Fonction ajoutant à this les objets de listeSource qui sont de nature graphique nat, qui sont visibles
 * et dont le membre fixed est bFixed
 * @param {CListeObjets} listeSource
 * @param {Nat} nat
 * @param {boolean} bFixed
 */
CListeObjets.prototype.addVisibleObjetsFixedOrNot = function (listeSource, nat, bFixed) {
  for (const elb of listeSource.col) {
    if (elb.estDeNature(nat) && elb.existe && !elb.estElementIntermediaire() && !elb.masque) {
      if (elb.fixed === bFixed) { this.add(elb) }
    }
  }
}
/**
 * Fonction renvoyant le nombre d'objets visibles de nature nat et dont la propriété fixed
 * est égale à bFixed et qui ne sont pas masqués ou qui sont masqués si bEvenMasked est à true
 * @param {Nat} nat
 * @param {boolean} bFixed
 * @param {boolean} bEvenMasked
 * @returns {number}
 */
CListeObjets.prototype.nbVisibleObjectsFixedOrNot = function (nat, bFixed, bEvenMasked = false) {
  let res = 0
  for (const elb of this.col) {
    if (elb.estDeNature(nat) && elb.existe && !elb.estElementIntermediaire() && (bEvenMasked || !elb.masque)) {
      if (elb.fixed === bFixed) res++
    }
  }
  return res
}
CListeObjets.prototype.ajoutePointsLiesVisiblesDontDepend = function (listeSource, elb) {
  const indelb = listeSource.indexOf(elb)
  for (let i = 0; i <= indelb; i++) {
    const el = listeSource.get(i)
    if (el.estDeNature(NatObj.NPointLie)) {
      if (!el.masque && elb.depDe(el) && !this.contains(el)) this.add(el)
    }
  }
}

/**
 * Fonction rajoutant à this les objets de list qui sont des affichages :
 * liés à un point si blie ets true
 * non liés à un point si blie est false
 * @param {CListeObjets} list
 * @param {boolean} blie
 */
CListeObjets.prototype.ajouteAffichagesLiesAPointVisibles = function (list, blie) {
  for (const el of list.col) {
    if (!el.estElementFinal && el.estDeNature(NatObj.NAffLieAPoint)) {
      if (!el.masque && (blie ? (el.pointLie !== null) : (el.pointLie === null))) this.add(el)
    }
  }
}

/**
 * Fonction ajoutant à this les points liés non punaisés contenus dans list
 * @param {CListeObjets} list
 */
CListeObjets.prototype.ajoutePointsLiesNonPun = function (list) {
  for (const el of list.col) {
    if (el.estDeNature(NatObj.NPointLie)) {
      if (!el.masque && !el.fixed) this.add(el)
    }
  }
}

/**
 * Fonction retirant du svg de la figuure tous les foreign Elements servant à modifier, incrémenter ou décrémenter une variable
 */
CListeObjets.prototype.removePaneVariables = function () {
  for (let i = this.longueur() - 1; i >= 0; i--) {
    const el = this.get(i)
    // Lors des implémentations de proto il peut y avoir des variables ajoutées avec panneau associé
    // mais pas encore créées, et dans ce cas el.foreignElt est undefined
    const foreignElt = el.foreignElt
    if (el.getNatureCalcul() === NatCal.NVariable && el.dialogueAssocie && foreignElt) {
      foreignElt.parentNode.removeChild(foreignElt)
      // @todo dire pourquoi on ne remet pas el.foreignElt à null
    }
  }
}

CListeObjets.prototype.metAJourSurfacesAyantPourBord = function (lieu) {
  for (const el of this.col) {
    if (el.estDeNature(NatObj.NSurface) && el.aPourBord(lieu)) el.metAJourTableaux()
  }
}

/**
 * Fonction renvoyant le nombre d'objet dont la nature graphique est une des natures
 * contenues dans nat (par un et binaire). Les natures cherchées eoivent être graphiques.
 * @param {Nat} nat
 * @returns {number}
 */
CListeObjets.prototype.nombreObjetsParNatureVisibles = function (nat) {
  let compt = 0
  for (const elb of this.col) {
    if (!elb.estElementIntermediaire() && elb.estDeNature(nat) && !elb.masque) compt++
  }
  return compt
}

/**
 * Fonction renvoyant :
 * Si blie est true le nombre d'affichages liés à un point visibles (non éléments finaux de construction
 * Si blie est false, le nombre d'affichages non liés à un point visibles
 * @param blie
 * @returns {number}
 */
CListeObjets.prototype.nombreAffichagesLiesAPointVisibles = function (blie) {
  let res = 0
  for (const elb of this.col) {
    if (!elb.estElementFinal && elb.estDeNature(NatObj.NAffLieAPoint)) {
      if (!elb.masque && (blie ? elb.pointLie !== null : elb.pointLie === null)) res++
    }
  }
  return res
}

/**
 * Spécial version mtgApp
 * Remplace dans les CCommentaire et CLatex utilisant des affichages dynamiques dépendant de el ancienNom par nouveauNom
 * @param ancienNom
 * @param nouveauNom
 * @param el l'élément dont le commentaire ou le Clatex doit dépendre pour que le remplacement soit effectué
 */
CListeObjets.prototype.remplaceNomValeurDynamiqueDansCommentairesOuLatexDepDe = function (ancienNom, nouveauNom, el) {
  for (const elb of this.col) {
    if (elb.estDeNature(NatObj.NComouLatex) && elb.depDe(el)) elb.remplaceNomValeurDynamique(ancienNom, nouveauNom)
  }
}

/**
 * Fonction reconstruisant les chaînes de calcul de tous les calculs ou
 * fonctions utilisateur dépendant de el.
 * @returns {void}
 */
CListeObjets.prototype.reconstruitChainesCalculDepDe = function (el) {
  for (const elb of this.col) {
    if (elb.estDeNatureCalcul(NatCal.NCalcOuFoncNonConstante) && elb.depDe(el)) { elb.reconstruitChaineCalcul() }
  }
}

/**
 * Fonction renvoyant l'indice du premier objet qui ne soit pas une variable
 * ou un calcul constant. Est utilisé pour le reclassement d'objets en début
 * de liste
 * @returns {number}
 */
CListeObjets.prototype.indicePremierElementNonVariable = function () {
  let i
  for (i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    const nat = elb.getNatureCalcul()
    if ((nat !== NatCal.NVariable) && (elb.className !== 'CCalcConst')) break
  }
  return i
}
/**
 * Fonction reclassant au maximum l'objet elb vers le début de l liste des objets
 * @param {CElementBase} elb l'objet à reclasser
 * @param {SVGElement|null} svg Si svg n'est pas nul on reclasse aussi les SVG elements des objets
 * @returns {boolean}
 */
CListeObjets.prototype.reclasseVersDebutAvecDependants = function (elb, svg = null) {
  const indiceMiniDebut = this.indicePremierElementNonVariable()
  const indiceItem = this.indexOf(elb)
  if (indiceItem === indiceMiniDebut) return false
  // On recherche à partir du début de la liste la position
  // du premier item dont elb ne dépend pas
  // On ne commence qu'au deuxième objet car le premier est la constante pi
  let indiceMiniGauche = 1
  let dependant = true
  let i = indiceMiniDebut
  while ((i <= indiceItem) && dependant) {
    const el = this.get(i)
    if (el.estDeNature(NatObj.NImpProto)) {
      // CImplementationProto imp = (CImplementationProto) el;
      dependant = elb.depDe4Rec(el)
      const nb = el.nbFinaux + el.nbIntermediaires
      if (dependant) i += nb + 1
      else indiceMiniGauche = i
    } else {
      if (elb.depDe4Rec(el)) { i++ } else {
        dependant = false
        indiceMiniGauche = i
      }
    }
  }
  if (dependant) return false // elb qu'on veut reclasser dépend de tous les objets
  // précédents
  i = indiceMiniGauche + 1
  while (i <= indiceItem) {
    const el = this.get(i)
    // Il ne faut pas séparer les éléments d'une implémentation de prototype
    if (el.estDeNature(NatObj.NImpProto)) {
      // CImplementationProto imp = (CImplementationProto) el;
      const nb = el.nbFinaux + el.nbIntermediaires + 1
      if (elb.depDe4Rec(el)) {
        for (let k = 0; k < nb; k++) {
          const el1 = this.get(i + k)
          this.removeByInd(i + k)
          this.insereElement(el1, indiceMiniGauche + k, svg)
        }
        indiceMiniGauche += nb
        i += nb
      } else {
        i += nb
      }
    } else {
      if (elb.depDe4Rec(el)) {
        this.removeByInd(i)
        this.insereElement(el, indiceMiniGauche, svg)
        indiceMiniGauche++
      }
      i++
    }
  }
  this.updateIndexes()
  this.determineDependancesCommentaires()
  // Version 7.9.2 : plus de div plaqués sur le figure pour les éditeurs de formule et les variables
  // auxquelles est associée un pane d'affichage avec bouton + - = mais un foreignElt (foreign object)
  // dont on reclasse l'affichage au-dessus à chaque ajoute d'objet
  // cela dot être mis sur la queue d'affichage
  addQueue(() => {
    this.reclassForeignElts()
  })
  return true
}

/**
 * Fonction reclassant si c'est possible l'objet elb avant l'objet avant (ainsi que les objets dont dépend elb
 * et situés entre avant et elb.
 * @param {CElementBase} elb l'objet à reclasser
 * @param avant l'objet avant lequel doit être reclassé elb
 * @param {SVGElement|null} svg Si svg n'est pas nul on reclasse aussi les SVG elements des objets
 * @returns {boolean} renvoie true si le reclassement a été possible et false sinon.
 */
CListeObjets.prototype.reclasseVersDebutAvant = function (elb, avant, svg = null) {
  const indiceMiniDebut = this.indicePremierElementNonVariable()
  const indiceItem = elb.index
  // ON ne reclasse pas avant la dernière variable et elb doit être après avant
  if (avant.index <= indiceMiniDebut || indiceItem <= avant.index) return false
  // On recherche à partir du début de la liste la position
  // du premier item dont elb ne dépend pas
  // On ne commence qu'au deuxième objet car le premier est la constante pi
  let indiceMiniGauche
  if (avant.estElementFinal) {
    // CImplementationProto imp = (CImplementationProto) el;
    if (elb.appartientABlocDependantPourReclassement(avant)) return false
    indiceMiniGauche = avant.impProto.index
  } else {
    if (elb.depDe4Rec(avant)) return false
    indiceMiniGauche = avant.index
  }
  let i = indiceMiniGauche + 1
  while (i <= indiceItem) {
    const el = this.get(i)
    // Il ne faut pas séparer les éléments d'une implémentation de prototype
    if (el.estDeNature(NatObj.NImpProto)) {
      // CImplementationProto imp = (CImplementationProto) el;
      const nb = el.nbFinaux + el.nbIntermediaires + 1
      if (elb.depDe4Rec(el)) {
        for (let k = 0; k < nb; k++) {
          const el1 = this.get(i + k)
          this.removeByInd(i + k)
          this.insereElement(el1, indiceMiniGauche + k, svg)
        }
        indiceMiniGauche += nb
        i += nb
      } else {
        i += nb
      }
    } else {
      if (elb.depDe4Rec(el)) {
        this.removeByInd(i)
        this.insereElement(el, indiceMiniGauche, svg)
        indiceMiniGauche++
      }
      i++
    }
  }
  this.updateIndexes()
  this.determineDependancesCommentaires()
  // Version 7.9.2 : plus de div plaqués sur le figure pour les éditeurs de formule et les variables
  // auxquelles est associée un pane d'affichage avec bouton + - = mais un foreignElt (foreign object)
  // dont on reclasse l'affichage au-dessus à chaque ajoute d'objet
  // cela dot être mis sur la queue d'affichage
  addQueue(() => {
    this.reclassForeignElts()
  })
  return true
}

/**
 * Fonction décalant le plus possible vers la fin de la liste l'élément elb
 * @param {CElementBase} elb
 * @param {SVGElement|null} svg Si svg n'est pas nul on reclasse aussi les SVG elements des objets
 * @returns {boolean} true si le décalage est possible et 0 sinon
 */
CListeObjets.prototype.reclasseVersFinAvecDependants = function (elb, svg = null) {
  // Si l'élément à reclasser est un élément final d'une implémentation de
  // prototype, c'est le dernier élément final
  // qu'il faut reclasser vers la fin
  let i, indexItem, indexFin, element, imp, nb
  let indDebut = 0
  if (elb.estElementFinal) {
    indexItem = this.indexOf(elb.impProto)
    indexFin = this.indexOf(elb.impProto.dernierObjetFinal())
  } else {
    indexItem = this.indexOf(elb)
    indexFin = indexItem
  }
  if (indexFin === this.longueur() - 1) return false
  // On recherche à partir de la fin de la liste la position
  // du premier item qui ne dépende pas de elb
  let indMaxiDroite = this.longueur() - 1
  let dependant = true
  for (i = this.longueur() - 1; (i !== indexFin) && dependant; i--) {
    element = this.get(i)
    if (element.estElementFinal) {
      imp = element.impProto
      if (!element.appartientABlocDependantPourReclassement(elb)) {
        dependant = false
        indDebut = i - imp.nbFinaux - imp.nbIntermediaires - 1
        indMaxiDroite = i
      }
      // Modifié version 5.4 : Il ne faut pas soustraire 1 car cela va être fait en revenant au début de la boucle
      // i = i - imp.nbFinaux - imp.nbIntermediaires - 1;
      i = i - imp.nbFinaux - imp.nbIntermediaires
    } else {
      if (!element.dependDeBlocPourReclassement(elb)) {
        dependant = false
        indDebut = i - 1
        indMaxiDroite = i
      }
    }
  }
  if (dependant) return false
  // indMaxiDroite est l'indice du premier élément qui ne dépend pas de elb à
  // partir de la fin de la liste
  i = indDebut
  while (i >= indexItem) {
    element = this.get(i)
    if (element.appartientABlocDependantPourReclassement(elb)) {
      if (indMaxiDroite === this.longueur() - 1) this.add(element, svg)
      else this.insereElement(element, indMaxiDroite + 1, svg)
      this.removeByInd(i)
      indMaxiDroite--
      i--
      // Si l'objet qu'on vient de reclasser est le dernier objet final d'une
      // implémentation de construction
      // il faut recoller le corps de la construction avec lui
      if (element.estElementFinal) {
        imp = element.impProto
        nb = imp.nbFinaux + imp.nbIntermediaires
        for (let k = 0; k < nb; k++) {
          const el1 = this.get(i)
          if (indMaxiDroite === this.longueur() - 1) this.add(el1, svg)
          else this.insereElement(el1, indMaxiDroite + 1, svg)
          this.removeByInd(i)
          indMaxiDroite--
          i--
        }
      }
    } else {
      if (element.estElementFinal) {
        // Il ne faut pas désolidariser le dernier élément final de son
        // implémentation de prototype
        imp = element.impProto
        nb = imp.nbFinaux + imp.nbIntermediaires + 1
        i -= nb
      } else { i-- }
    }
  }
  this.updateIndexes()
  this.determineDependancesCommentaires()
  // Version 7.9.2 : plus de div plaqués sur le figure pour les éditeurs de formule et les variables
  // auxquelles est associée un pane d'affichage avec bouton + - = mais un foreignElt (foreign object)
  // dont on reclasse l'affichage au-dessus à chaque ajoute d'objet
  // cela dot être mis sur la queue d'affichage
  addQueue(() => {
    this.reclassForeignElts()
  })
  return true
}

/**
 * Fonction reclassant l'objet elb après l'objet apres
 * @param elb l'objet à reclasser ainsi que ceux qui en dépendent et situés avant apres
 * @param apres l'objet après lequel il faut reclasser elb et ses dépendants
 * @param {SVGElement|null} svg Si svg n'est pas nul on reclasse aussi les SVG elements des objets
 * @returns {boolean} renvoie true si le reclassement a été possible et false sinon
 */
CListeObjets.prototype.reclasseVersFinApres = function (elb, apres, svg = null) {
  // Si l'élément à reclasser est un élément final d'une implémentation de
  // prototype, c'est le dernier élément final
  // qu'il faut reclasser vers la fin
  let indDebut
  // Si les deux objets ne sont pas rangés dans le bon ordre ou sont deux objets
  // finaux d'une même implémentation de construction c'est imopossible
  if ((apres.index <= elb.index) || ((elb.impProto !== null) && (elb.impProto === apres.impProto))) return false
  const indexItem = elb.estElementFinal ? elb.impProto.index : elb.index
  // Si apres est un objet final de construction on reclasse après le dernier objet final de la construction
  let indMaxiDroite
  if (apres.estElementFinal) {
    const imp = apres.impProto
    if (apres.appartientABlocDependantPourReclassement(elb)) return false
    else {
      indDebut = imp.index - 1
      // indMaxiDroite = imp.index + imp.nbFinaux + imp.nbIntermediaires
      indMaxiDroite = imp.dernierObjetFinal().index
    }
  } else {
    if (apres.dependDeBlocPourReclassement(elb)) return false
    else {
      indDebut = apres.index - 1
      indMaxiDroite = apres.index
    }
  }
  // indMaxiDroite est l'indice du premier élément qui ne dépend pas de elb à
  // partir de la fin de la liste
  let i = indDebut
  while (i >= indexItem) {
    const element = this.get(i)
    if (element.appartientABlocDependantPourReclassement(elb)) {
      if (indMaxiDroite === this.longueur() - 1) this.add(element, svg)
      else this.insereElement(element, indMaxiDroite + 1, svg)
      this.removeByInd(i)
      indMaxiDroite--
      i--
      // Si l'objet qu'on vient de reclasser est le dernier objet final d'une
      // implémentation de construction
      // il faut recoller le corps de la construction avec lui
      if (element.estElementFinal) {
        const imp = element.impProto
        const nb = imp.nbFinaux + imp.nbIntermediaires
        for (let k = 0; k < nb; k++) {
          const el1 = this.get(i)
          if (indMaxiDroite === this.longueur() - 1) this.add(el1, svg)
          else this.insereElement(el1, indMaxiDroite + 1, svg)
          this.removeByInd(i)
          indMaxiDroite--
          i--
        }
      }
    } else {
      if (element.estElementFinal) {
        // Il ne faut pas désolidariser le dernier élément final de son
        // implémentation de prototype
        const imp = element.impProto
        const nb = imp.nbFinaux + imp.nbIntermediaires + 1
        i -= nb
      } else { i-- }
    }
  }
  this.updateIndexes()
  this.determineDependancesCommentaires()
  // Version 7.9.2 : plus de div plaqués sur le figure pour les éditeurs de formule et les variables
  // auxquelles est associée un pane d'affichage avec bouton + - = mais un foreignElt (foreign object)
  // dont on reclasse l'affichage au-dessus à chaque ajoute d'objet
  // cela dot être mis sur la queue d'affichage
  addQueue(() => {
    this.reclassForeignElts()
  })
  return true
}

/**
 * Fonction remontant d'un cran vers le début dans la liste l'objet elb et ceux dont il dépend
 * @param elb
 * @returns {boolean} renvoie false si le reclassement n'est pas possible
 */
CListeObjets.prototype.reclassUpOneStep = function (elb) {
  let el = null
  // var indicemini = 0;
  // var indDebut = 0;
  let indDebut
  for (indDebut = 0; indDebut < this.longueur(); indDebut++) {
    const elt = this.get(indDebut)
    if (!elt.estDeNatureCalcul(Nat.or(NatCal.NCalculReelConstant, NatCal.NVariable))) break
  }
  const indicemini = indDebut
  // Si l'élément à remonter est un élément final de construction ou une CImplementationProto il faut remonter tout le bloc.
  const imp = elb.estElementFinal ? elb.impProto : (elb.estDeNature(NatObj.NImpProto) ? elb : null)
  const indelb = (imp !== null) ? this.indexOf(imp) : this.indexOf(elb)
  // On recherche vers le début à partir de elb l'indice du premier élément dont ne dépend pas elb;
  // int i = indelb;
  let trouve = false
  const inddest = (imp === null) ? indelb : indelb + imp.nbFinaux + imp.nbIntermediaires
  let i = indelb
  while (!trouve && (i > indicemini)) {
    i--
    el = this.get(i)
    if (el.estElementFinal) {
      const imp2 = el.impProto
      if (!elb.appartientABlocDependantPourReclassement(el)) {
        trouve = true
        indDebut = i - imp2.nbFinaux - imp2.nbIntermediaires
        el = imp2
        break
      }
      i = i - imp2.nbFinaux - imp2.nbIntermediaires
    } else {
      if (!elb.dependDeBlocPourReclassement(el)) {
        trouve = true
        indDebut = i
        break
      }
    }
  }
  if (!trouve) return false
  if (el.estDeNature(NatObj.NImpProto)) {
    for (let j = 0; j <= el.nbFinaux + el.nbIntermediaires; j++) {
      const e = this.get(indDebut)
      this.removeByInd(indDebut)
      if (inddest === this.longueur()) this.add(e)
      else this.insert(inddest, e)
    }
  } else {
    this.removeObj(el)
    if (inddest === this.longueur()) this.add(el)
    else this.insert(inddest, el)
  }
  this.updateIndexes()
  this.determineDependancesCommentaires()
  // Version 7.9.2 : plus de div plaqués sur le figure pour les éditeurs de formule et les variables
  // auxquelles est associée un pane d'affichage avec bouton + - = mais un foreignElt (foreign object)
  // dont on reclasse l'affichage au-dessus à chaque ajoute d'objet
  // cela dot être mis sur la queue d'affichage
  addQueue(() => {
    this.reclassForeignElts()
  })
  return true
}

/**
 * Fonction remontant d'un cran verls la fin dans la liste l'objet elb et ceux dont il dépend
 * @param elb
 * @returns {boolean} renvoie false si le reclassement n'est pas possible
 */
CListeObjets.prototype.reclassDownOneStep = function (elb) {
  let i, imp
  let el = null
  // Si l'élément à remonter est un élément final de construction il faut remonter tout le bloc.
  const indelb = elb.estElementFinal ? this.indexOf(elb.impProto) : this.indexOf(elb)
  // if (indelb == 0) return false; // On ne peut pas reclasser la constante pi vers la fin
  if (elb.estElementFinal || elb.estDeNature(NatObj.NImpProto)) {
    imp = elb.estElementFinal ? elb.impProto : elb
    i = this.indexOf(imp) + imp.nbFinaux + imp.nbIntermediaires
    if (i + 1 === this.longueur()) return false
  } else if (indelb === this.longueur() - 1) return false
  else i = indelb
  let trouve = false
  while (!trouve && (i < this.longueur() - 1)) {
    i++
    el = this.get(i)
    if (el.estDeNature(NatObj.NImpProto)) {
      i++
      el = this.get(i)
    }
    if (!el.appartientABlocDependantPourReclassement(elb)) trouve = true
    else {
      if (el.impProto !== null) {
        imp = el.impProto
        i = this.indexOf(imp) + imp.nbFinaux + imp.nbIntermediaires
      }
    }
  }
  if (!trouve) return false
  if (el.impProto !== null) {
    imp = el.impProto
    i = this.indexOf(imp)
    for (let j = 0; j <= imp.nbFinaux + imp.nbIntermediaires; j++) {
      const e = this.get(i + j)
      // remove(e);
      this.removeByInd(i + j)
      this.insert(indelb + j, e)
    }
  } else {
    this.removeObj(el)
    this.insert(indelb, el)
  }
  this.updateIndexes()
  this.determineDependancesCommentaires()
  // Version 7.9.2 : plus de div plaqués sur le figure pour les éditeurs de formule et les variables
  // auxquelles est associée un pane d'affichage avec bouton + - = mais un foreignElt (foreign object)
  // dont on reclasse l'affichage au-dessus à chaque ajoute d'objet
  // cela dot être mis sur la queue d'affichage
  addQueue(() => {
    this.reclassForeignElts()
  })
  return true
}

/**
 * Fonction retirant du svg de la figure tous les gElements représentant les éléments graphiques
 * et les recréant en rajoutant aussi les gElements représentant les objets ùmasqués si bMemeMasque
 * est true et ceux représentant les objets intermédiaires de constructions
 * @param svg
 * @param couleurFond
 * @param bMemeMasques
 * @param bInterm
 * @param inddeb L'inide de début de traitement
 * @param nbObjMax Le nombre d'objets à utiliser
 * @returns {void}
 */
CListeObjets.prototype.prepareForProtocol = function (svg, couleurFond, bMemeMasques, bInterm, inddeb, nbObjMax) {
  this.setReady4MathJax(bMemeMasques, bInterm)
  const self = this
  addQueue(function () {
    for (let i = inddeb; i <= nbObjMax; i++) {
      const elb = self.get(i)
      if (elb.estDeNature(NatObj.NTtObj) && (!elb.estElementIntermediaire() || bInterm)) {
        elb.creeAffichage(svg, !bMemeMasques, couleurFond)
        // Au départ tous les gElements représentant les objets graphiques sont masqué
        elb.showgElt(false)
      }
    }
  })
}

/**
 * Fonction montrant ou cachant les gElements des objets graphiques de la figure pour la boîte de dialogue
 * de protocole de la figure depuis l'indice indstart jusqu'à l'indice indFin
 * @param indStart
 * @param indFin
 * @param bMemeMasques Si true, on montre aussi les éléments cachés
 * @param bInterm Si true on montre aussi les objets intermédiares de construction
 * @param {number} indMax L'indice maxi permis dans la liste d'objets
 */
CListeObjets.prototype.displayForProtocol = function (indStart, indFin, bMemeMasques, bInterm, indMax) {
  for (let i = indStart; i <= indMax; i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NTtObj) && (!elb.estElementIntermediaire() || bInterm)) {
      if (i <= indFin) {
        /*
         $(elb.g).attr("visibility", b ? "visible" : "hidden");
         if (elb.estDeNature(NatObj.NObjNommable)) $(elb.gname).attr("visibility", b ? "visible" : "hidden");
         */
        elb.showgElt(bMemeMasques || !elb.masque)
      } else elb.showgElt(false)
    }
  }
}

CListeObjets.prototype.listeNoms = function () {
  const s = this.longueur()
  let ch = ''
  for (let i = 0; i < s; i++) {
    const el = this.get(i)
    const st = el.getNom()
    ch += (st === '') ? el.nom : st
    if (i !== s - 1) ch += ', '
  }
  return ch
}

/**
 * Fonction utiliée pour la boîte de dialogue de protocole
 * Génére des noms pour les objets créés à partir de l'indice inddeb jusqu'à l'indice indmax
 * @param inddeb
 * @param indmax
 * @param list
 */
CListeObjets.prototype.genereNoms = function (inddeb, indmax, list) {
  let i, el
  CAbscisseOrigineRep.ind = 0
  COrdonneeOrigineRep.ind = 0
  CUnitexRep.ind = 0
  CUniteyRep.ind = 0
  CArcDeCercleAncetre.ind = 0
  CCercle.ind = 0
  CSegment.ind = 0
  CCommentaire.ind = 0
  CDemiDroite.ind = 0
  CDemiPlan.ind = 0
  CEditeurFormule.ind = 0
  CGrapheSuiteRec.ind = 0
  CGrapheSuiteRecComplexe.ind = 0
  CImage.ind = 0
  CLatex.ind = 0
  CLieuDeBase.ind = 0
  CLieuDiscretDeBase.ind = 0
  CLieuObjetAncetre.ind = 0
  CMacro.ind = 0
  CMarqueAngleAncetre.ind = 0
  CMarqueSegment.ind = 0
  CPt.ind = 0
  CDroiteAncetre.ind = 0
  CSurface.ind = 0
  CValeurAffichee.ind = 0
  // On regarde combien a figure contient de points ou de droites qu'il faut nommer. Si ce nombre est nférieur à 50
  // On génère des noms construits de façon générique pour les points et droites, ce ui oblige pour chacun à faire une génération
  // aléatoire et peut être chronophage sur les figures très lourdes obtenues par récursion par exemple.
  // Sinon les points auront un nom commençant par Pt et le sdroites par dt
  let compteur = 0
  for (i = inddeb; i <= indmax; i++) {
    el = this.get(i)
    if (el.getNom() === '') compteur++
  }
  const nomsDynamiques = (compteur <= 100) && (this.longueur() <= 500)
  for (i = inddeb; i <= indmax; i++) {
    el = this.get(i)
    if (el.getNom() === '') {
      list.add(el)
      if (nomsDynamiques) el.nom = el.genereNom()
      else {
        if (el.estDeNature(NatObj.NDroite)) el.nom = el.genereNom(getStr('rdt'))
        else if (el.estDeNature(NatObj.NSegment)) el.nom = el.genereNom(getStr('seg'))
        else if (el.estDeNature(NatObj.NTtPoint)) el.nom = el.genereNom(getStr('rpt'))
        else el.nom = el.genereNom()
      }
      if (el.estDeNature(NatObj.NTtObj)) {
        el.nomMasque = false
        el.tailleNom = 13
      }
    } else {
      if (el.estDeNature(NatObj.NObjNommable)) el.nomMasque = false
    }
  }
}

/**
 * Fonction remettant le champ nom de tous les objets à ""
 * @param taille La taille à affecter aux noms de points ou droites
 */
CListeObjets.prototype.effaceNoms = function (taille) {
  for (const el of this.col) {
    el.nom = ''
    if (el.estDeNature(NatObj.NObjNommable)) {
      el.tailleNom = taille
    }
  }
}

/**
 * Fonction renvoyant le nombre de points liés l'objet el qui soient visibles et ne soient pas
 * des objets intermediaires de construction
 * @param el
 * @returns {number}
 */
CListeObjets.prototype.nombrePointsLiesAVisibles = function (el) {
  let compteur = 0
  for (const elb of this.col) {
    if (elb.estDeNature(NatObj.NPointLie)) {
      if (elb.existe && !elb.masque && (elb.lieA() === el) && !el.estElementIntermediaire()) { compteur++ }
    }
  }
  return compteur
}

CListeObjets.prototype.nombreFonctionsDerivables = function () {
  let res = 0
  for (const elb of this.col) {
    if (!elb.estElementIntermediaire() && elb.getNatureCalcul() === NatCal.NFonction) {
      if (elb.deriveePossible(0)) res++
    }
  }
  return res
}

/**
 * Fonction supprimant les implémentations de construction de la figure et remplaçant les objets
 * intermédiaires et finaux par de vrais objets en renommant si nécessaire.
 * @param {MtgApp} app L'application
 */
CListeObjets.prototype.fusionImpConst = function (app) {
  // Passé à 5000 version 8.7.3 après optimisation du code de la fonction pointeur dans CCOmmentaire
  const tropObjets = this.longueur() > 5000
  let nbPtsRenommes = 0
  let nbDtesRenommees = 0
  let nbCalculsRenommes = 0
  const debutNomsPts = this.genereDebutNomPourPoint('')
  const debutNomsDtes = this.genereNomPourPointOuDroite('d', false)
  const debutNomsCalculs = this.genereDebutNomPourCalcul('calc', this.longueur() - 1, [])
  // On retire d'abord toutes les implémentations de constructions
  let i = 0
  let elb
  while (i < this.longueur()) {
    elb = this.get(i)
    if (elb.estDeNature(NatObj.NImpProto)) { this.remove(i) } else i++
  }
  for (const elb of this.col) {
    if (elb.estElementIntermediaire()) {
      if (elb.estDeNature(NatObj.NTtObj)) elb.creeAffichage(app.svgFigure, true, app.doc.couleurFond)
      // On renomme les points ou droites intermédiaires si leur nom existe déjà
      if (elb.estDeNature(NatObj.NObjNommable)) {
        const ancienNom = elb.nom
        if (ancienNom !== '') {
          if (tropObjets) {
            if (elb.estDeNature(NatObj.NTtPoint)) {
              nbPtsRenommes++
              elb.donneNom(debutNomsPts + nbPtsRenommes)
            } else { // Cas d'une droite
              nbDtesRenommees++
              elb.donneNom(debutNomsDtes + nbDtesRenommees)
            }
          } else {
            const ancienNom = elb.nom
            if (this.existePointOuDroiteMemeNom(elb, ancienNom)) {
              const nouveauNom = this.genereNomPourPointOuDroite(ancienNom.charAt(0))
              elb.donneNom(nouveauNom)
            }
          }
        }
      } else {
        // Il faut renommer aussi les calculs intermédiaires ayant même
        // nom que d'autres calculs créés après implémentation de la construction
        if (elb.estDeNatureCalcul(NatCal.NTtCalcNomme)) {
          let nouveauNom
          const ancienNom = elb.getNom()
          if (tropObjets) {
            nbCalculsRenommes++
            nouveauNom = debutNomsCalculs + nbCalculsRenommes
            // On n'exécute pas la ligne ci-dessous car le temps d'exécution peut devenir exponentiel
            // Inconvénient si on veut modifier un affichage LaTeX dynamique il risque de contenir
            // des noms de calculs incorrects
            // this.remplaceNomValeurDynamiqueDansCommentairesOuLatexDepDe(ancienNom, nouveauNom, elb)
            elb.nomCalcul = nouveauNom
          } else {
            if (this.existeCalculOuVariableOuFonctionOuParametreMemeNom(elb, ancienNom, true)) {
              nouveauNom = this.genereNomPourCalcul(ancienNom, false)
              this.remplaceNomValeurDynamiqueDansCommentairesOuLatexDepDe(ancienNom, nouveauNom, elb)
              elb.nomCalcul = nouveauNom
            }
          }
        }
      }
      elb.impProto = null
      elb.estElementFinal = false
    } else {
      if (elb.estElementFinal) {
        elb.impProto = null
        elb.estElementFinal = false
      }
    }
  }
  // Ajout version 4.8.0
  this.updateIndexes()
  //
  // On reconstruit toutes les formules de la figure
  this.reconstruitChainesCalcul()
}

CListeObjets.prototype.fusionImpConstByName = function (app, name) {
  // Passé à 5000 version 8.7.3 après optimisation du code de la fonction pointeur dans CCOmmentaire
  const tropObjets = this.longueur() > 5000
  let nbPtsRenommes = 0
  let nbDtesRenommees = 0
  let nbCalculsRenommes = 0
  const debutNomsPts = this.genereDebutNomPourPoint('')
  const debutNomsDtes = this.genereNomPourPointOuDroite('d', false)
  const debutNomsCalculs = this.genereDebutNomPourCalcul('calc', this.longueur() - 1, [])
  // On retire d'abord toutes les implémentations de constructions
  let i = 0
  let el
  while (i < this.longueur()) {
    el = this.get(i)
    if (el.estDeNature(NatObj.NImpProto) && (el.nomProto === name)) {
      this.remove(i) // Comme la liste a diminué de taille on n'incrémente pas i
      const nb = el.nbIntermediaires + el.nbFinaux
      for (let j = i; j < i + nb; j++) {
        const elb = this.get(j)
        if (elb.estElementFinal) {
          elb.impProto = null
          elb.estElementFinal = false
        } else {
          if (elb.estDeNature(NatObj.NTtObj)) elb.creeAffichage(app.svgFigure, true, app.doc.couleurFond)
          // On renomme les points ou droites intermédiaires si leur nom existe déjà
          if (elb.estDeNature(NatObj.NObjNommable)) {
            const ancienNom = elb.nom
            if (ancienNom !== '') {
              if (tropObjets) {
                if (elb.estDeNature(NatObj.NTtPoint)) {
                  nbPtsRenommes++
                  elb.donneNom(debutNomsPts + nbPtsRenommes)
                } else { // Cas d'une droite
                  nbDtesRenommees++
                  elb.donneNom(debutNomsDtes + nbDtesRenommees)
                }
              } else {
                const ancienNom = elb.nom
                if (this.existePointOuDroiteMemeNom(elb, ancienNom)) {
                  const nouveauNom = this.genereNomPourPointOuDroite(ancienNom.charAt(0))
                  elb.donneNom(nouveauNom)
                }
              }
            }
          } else {
            // Il faut renommer aussi les calculs intermédiaires ayant même
            // nom que d'autres calculs créés après implémentation de la construction
            if (elb.estDeNatureCalcul(NatCal.NTtCalcNomme)) {
              let nouveauNom
              const ancienNom = elb.getNom()
              if (tropObjets) {
                nbCalculsRenommes++
                nouveauNom = debutNomsCalculs + nbCalculsRenommes
                // On n'exécute pas la ligne ci-dessous car le temps d'exécution peut devenir exponentiel
                // Inconvénient si on veut modifier un affichage LaTeX dynamique il risque de contenir
                // des noms de calculs incorrects
                // this.remplaceNomValeurDynamiqueDansCommentairesOuLatexDepDe(ancienNom, nouveauNom, elb)
                elb.nomCalcul = nouveauNom
              } else {
                if (this.existeCalculOuVariableOuFonctionOuParametreMemeNom(elb, ancienNom, true)) {
                  nouveauNom = this.genereNomPourCalcul(ancienNom, false)
                  this.remplaceNomValeurDynamiqueDansCommentairesOuLatexDepDe(ancienNom, nouveauNom, elb)
                  elb.nomCalcul = nouveauNom
                }
              }
            }
          }
          elb.impProto = null
          elb.estElementFinal = false
        }
      }
      i += nb
    } else i++
  }
  this.updateIndexes()
  //
  // On reconstruit toutes les formules de la figure
  this.reconstruitChainesCalcul()
}

/**
 * Fonction recalculant les éléments de la liste de nature nat
 * @param nat
 * @param {boolean} infoRandom Si true les calculs aléatoires par rand() sont réinitialisés
 * @param {Dimf} dimfen les dimensions de la fenêtre
 */
CListeObjets.prototype.positionneParNat = function (nat, infoRandom, dimfen) {
  for (const el of this.col) {
    if (el.estDeNature(nat)) el.positionne(infoRandom, dimfen)
  }
}

CListeObjets.prototype.positionneTikz = function (infoRandom, dimfen) {
  for (const el of this.col) {
    el.positionneTikz(infoRandom, dimfen)
  }
}

CListeObjets.prototype.tikzXcoord = function (x, dimf, bu) {
  // Si la figure a une longueur unité et qu'on a choisi de l'utiliser, bu.infoLength contient
  // la longueur en cm de la longueur unité
  // Sinon bu.infoLength contient la largeur en com de la figure
  if (bu.useFigUnity) return x / this.pointeurLongueurUnite.rendLongueur() * bu.infoLength
  else return x * bu.infoLength / dimf.x
  // double res = (double) Toolkit.getDefaultToolkit().getScreenResolution() / 2.54;
  // On suppose que la largeur de la figure sera de 12 cm
}

CListeObjets.prototype.tikzYcoord = function (y, dimf, bu) {
  if (bu.useFigUnity) return (dimf.y - y) / this.pointeurLongueurUnite.rendLongueur() * bu.infoLength
  else return (dimf.y - y) * bu.infoLength / dimf.x
}

CListeObjets.prototype.tikzLongueur = function (lon, dimf, bu) {
  if (bu.useFigUnity) {
    return lon / this.pointeurLongueurUnite.rendLongueur() * bu.infoLength
  } else return lon * bu.infoLength / dimf.x
}

/**
 * Fonction augmentant la taille de police de tous les affichages de la figure et de tous les noms
 * @returns {boolean} renvoie true si des affichages ont été modifiés en augmentant leur taille de police
 */
CListeObjets.prototype.taillePlus = function () {
  let done = false
  for (const el of this.col) {
    if (el.estDeNature(NatObj.NAffLieAPoint)) {
      if (el.taillePolice < 80) {
        el.taillePolice++
        done = true
      }
    } else {
      if (el.estDeNature(NatObj.NObjNommable)) {
        if (el.tailleNom < 80) {
          el.tailleNom++
          done = true
        }
      }
    }
  }
  return done
}

/**
 * Fonction décrémentant la taille de police de tous les affichages de la figure et de tous les noms
 * @returns {boolean} renvoie true si des affichages ont été modifiés en diminuant leur taille de police
 * */
CListeObjets.prototype.tailleMoins = function () {
  let done = false
  for (const el of this.col) {
    if (el.estDeNature(NatObj.NAffLieAPointSaufImEd)) {
      if (el.taillePolice > 10) {
        el.taillePolice--
        done = true
      }
    } else {
      if (el.estDeNature(NatObj.NObjNommable)) {
        if (el.tailleNom > 10) {
          el.tailleNom--
          done = true
        }
      }
    }
  }
  return done
}

/**
 * Fonction appelée quand on augmente ou diminue la taille de toutes les polices pour remettre à jour
 * tous les affichages dont la taille a été modifiée
 * @param svg
 * @param couleurFond
 * @param masquage
 * @returns {void}
 */
CListeObjets.prototype.updateDisplays = function (svg, couleurFond, masquage) {
  this.setReady4MathJax()
  const self = this
  addQueue(function () {
    for (const elb of self.col) {
      // Il faut mettre à jour aussi les lieux d'objets dont l'objet générant le lieu est un affichage
      if (elb.existe && (elb.estDeNature(NatObj.NAffLieAPointSaufImEd) ||
          (elb.estDeNature(NatObj.NLieuObjet) && elb.elementAssocie.estDeNature(NatObj.NAffLieAPoint))) &&
          (elb.hasg(masquage))) {
        const oldg = elb.g
        const newg = elb.createg(svg, couleurFond)
        svg.replaceChild(newg, oldg)
        elb.g = newg
      } else {
        if (elb.estDeNature(NatObj.NObjNommable) && !elb.estElementIntermediaire() && elb.hasg(masquage)) elb.updateName(svg, true)
      }
    }
  })
}

CListeObjets.prototype.depunaiseTout = function () {
  let done = false
  for (const el of this.col) {
    if (el.estDeNature(NatObj.NTtObj)) {
      if (el.fixed) {
        done = true
        el.fixed = false
      }
    }
  }
  return done
}

/**
 * Fonction renvoyant true si une des macros de construction itérative ou récusive éventuelle de la figure
 * dépend du prototype proto
 * @param {CPrototype} proto
 * @returns {boolean}
 */
CListeObjets.prototype.depDeProto = function (proto) {
  for (const el of this.col) {
    if (el.depDeProto(proto)) return true
  }
  return false
}
