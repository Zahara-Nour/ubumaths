/*
 * Created by yvesb on 22/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import Nat from './Nat'

/**
 * Liste des natures d'objets
 * @type {NatObj}
 */
const NatObj = {
  indiceMacro: 8,
  NAucunObjet: new Nat(0, 0),
  /**
 * Point libre (construit par l'utilisateur et non déduit d'autres objets) *
 * @type {Nat}
 */
  NPointBase: new Nat(1, 0),
  /**
 * Point libre ou lié, mais pas déduit d'autres objets *
 * @type {Nat}
 */
  NPoint: new Nat(1 << 1, 0), // 2 puissance1=2
  NPointLie: new Nat(1 << 2, 0),
  NBarycentre: new Nat(1 << 3, 0),
  NPointDansRepere: new Nat(1 << 4, 0),
  NPointBaseEnt: new Nat(1 << 5, 0),
  NPointParAffixe: new Nat(1 << 6, 0),
  NPointLiePoint: new Nat(1 << 7, 0),
  NMacro: new Nat(1 << 8, 0),
  NDroite: new Nat(1 << 9, 0),
  NVecteur: new Nat(1 << 10, 0),
  NSegment: new Nat(1 << 11, 0),
  NDemiDroite: new Nat(1 << 12, 0),
  NCercle: new Nat(1 << 13, 0),
  NMarqueAngle: new Nat(1 << 14, 0),
  NArc: new Nat(1 << 15, 0),
  NPolygone: new Nat(1 << 16, 0),
  NSurface: new Nat(1 << 17, 0),
  NLieu: new Nat(1 << 18, 0),
  NLieuDiscret: new Nat(1 << 19, 0),
  NLigneBrisee: new Nat(1 << 20, 0),
  NLieuObjet: new Nat(1 << 21, 0),
  NImage: new Nat(1 << 22, 0),
  NGrapheSuiteRec: new Nat(1 << 23, 0),
  NGrapheSuiteRecComplexe: new Nat(1 << 24, 0),
  NCommentaire: new Nat(1 << 25, 0),
  NValeurAffichee: new Nat(1 << 26, 0),
  NMarqueSegment: new Nat(1 << 27, 0),
  NObjetDuplique: new Nat(1 << 28, 0),
  NDemiPlan: new Nat(1 << 29, 0),
  // Attention : Dans la version java, le repère est non graphique
  // Il est considéré comme non graphique car dans les constructions il est choisi en premier dans
  // les objets non graphiques
  NRepere: new Nat(1 << 30, 0), // 2^30
  // Version 6.7  On peut remarquer que 2^31 n'a pas été utilisé
  // Version 6.7.2 : Justement il ne faut pas l'utiliser car alors le nombre est considéré comme négatif !
  NTransformation: new Nat(0, 1), // 2^32 JavaScript pas plus de 31 bits pour entier non signé
  NBipoint: new Nat(0, 1 << 1), // 2^33. Pas de décalages de plus de 32 bits en javascript
  NImpProto: new Nat(0, 1 << 2), // 2^34
  NPointInterieurPolygone: new Nat(0, 1 << 3), // 2^35
  NLatex: new Nat(0, 1 << 4), // 2^36
  NPointInterieurCercle: new Nat(0, 1 << 5),
  NEditeurFormule: new Nat(0, 1 << 6), // Ajout version 4.5.2
  /* Version 6.9.1 : Les cinq natures suivantes sont supprimées car inutiles
  NPointClone: new Nat(0, 1 << 7),
  NDroiteClone: new Nat(0, 1 << 8),
  NDemiDroiteClone: new Nat(0, 1 << 9),
  NSegmentClone: new Nat(0, 1 << 10),
  NCercleClone: new Nat(0, 1 << 11),
   */
  // nombreTypesObjetsGraphiques: 47 // Change version 6.9.1
  nombreTypesObjetsGraphiques: 42
}
/**
 * Tout point autre que libre (donc lié ou construit à partir d'autres objets) *
 * @type {Nat}
 */
NatObj.NTtPointSaufPointBase = Nat.or(
  NatObj.NPoint,
  NatObj.NPointLie,
  NatObj.NBarycentre,
  NatObj.NPointDansRepere,
  NatObj.NPointBaseEnt,
  NatObj.NPointParAffixe,
  NatObj.NPointLiePoint,
  NatObj.NPointInterieurPolygone,
  NatObj.NPointInterieurCercle
)
/**
 * Tout point *
 * @type {Nat}
 */
NatObj.NTtPoint = Nat.or(NatObj.NPointBase, NatObj.NTtPointSaufPointBase)

// NatObj.NToutPointSaufPointLie = Nat.or(NatObj.NPointBase, NatObj.NPoint, NatObj.NBarycentre,  NatObj.NPointDansRepere, NatObj.NPointBaseEnt, NatObj.NPointParAffixe, NatObj.NPointLiePoint,  NatObj.NPointInterieurPolygone, NatObj.NPointInterieurCercle);

/**
 * Tout objet graphique *
 * @type {Nat}
 */
NatObj.NTtObj = Nat.or(NatObj.NTtPoint, NatObj.NMacro, NatObj.NDroite, NatObj.NVecteur,
  NatObj.NSegment, NatObj.NDemiDroite, NatObj.NCercle
  , NatObj.NMarqueAngle, NatObj.NArc, NatObj.NPolygone, NatObj.NSurface
  , NatObj.NLieu, NatObj.NLieuDiscret, NatObj.NLigneBrisee, NatObj.NLieuObjet, NatObj.NImage
  , NatObj.NGrapheSuiteRec, NatObj.NGrapheSuiteRecComplexe, NatObj.NCommentaire, NatObj.NLatex
  , NatObj.NValeurAffichee, NatObj.NMarqueSegment, NatObj.NObjetDuplique, NatObj.NDemiPlan
  , NatObj.NRepere, NatObj.NEditeurFormule)

/**
 * Tout objet graphique excepté les dupliqués *
 * @type {Nat}
 */
NatObj.NTtObjSaufDuplique = Nat.or(NatObj.NTtPoint, NatObj.NMacro, NatObj.NDroite
  , NatObj.NVecteur, NatObj.NSegment, NatObj.NDemiDroite, NatObj.NCercle
  , NatObj.NMarqueAngle, NatObj.NArc, NatObj.NPolygone, NatObj.NSurface, NatObj.NLieu
  , NatObj.NLieuDiscret, NatObj.NLigneBrisee, NatObj.NLieuObjet, NatObj.NImage
  , NatObj.NGrapheSuiteRec, NatObj.NGrapheSuiteRecComplexe, NatObj.NCommentaire, NatObj.NLatex
  , NatObj.NValeurAffichee, NatObj.NMarqueSegment, NatObj.NDemiPlan, NatObj.NRepere
  , NatObj.NEditeurFormule)

/**
 * Toute droite ou portion de droite (même partielle, donc y compris segment et vecteur) *
 * @type {Nat}
 */
NatObj.NTteDroite = Nat.or(NatObj.NDroite, NatObj.NSegment, NatObj.NDemiDroite, NatObj.NVecteur)

/**
 * Toute droite (même partielle, donc y compris segment) sauf vecteur) *
 * @type {Nat}
 */
NatObj.NTteDroiteSaufVect = Nat.or(NatObj.NDroite, NatObj.NSegment, NatObj.NDemiDroite)

/**
 * Toute objet représenté par un trait *
 * @type {Nat}
 */
NatObj.NObjLigne = Nat.or(NatObj.NTteDroite, NatObj.NCercle, NatObj.NMarqueAngle
  , NatObj.NArc, NatObj.NPolygone, NatObj.NLieu, NatObj.NLigneBrisee, NatObj.NGrapheSuiteRec
  , NatObj.NGrapheSuiteRecComplexe)

/**
 * Cercle complet ou partiel (arc) *
 * @type {Nat}
 */
NatObj.NTtCercle = Nat.or(NatObj.NCercle, NatObj.NArc)

/**
 * Objet pouvant avoir un nom (point ou droite) *
 * @type {Nat}
 */
NatObj.NObjNommable = Nat.or(NatObj.NTtPoint, NatObj.NDroite)

/**
 * Objet mobile *
 * @type {Nat}
 */
NatObj.NPointMobile = Nat.or(NatObj.NPointBase, NatObj.NPointLie, NatObj.NPointBaseEnt
  , NatObj.NPointInterieurPolygone, NatObj.NPointInterieurCercle)

/**
 * Élément affiché lié à un point *
 * @type {Nat}
 */
NatObj.NAffLieAPoint = Nat.or(NatObj.NCommentaire, NatObj.NLatex, NatObj.NValeurAffichee
  , NatObj.NMacro, NatObj.NImage, NatObj.NEditeurFormule)

/**
 * Élément affiché lié à un point, sauf les images et éditeurs de formules *
 * @type {Nat}
 */
NatObj.NAffLieAPointSaufImEd = Nat.or(NatObj.NCommentaire, NatObj.NLatex, NatObj.NValeurAffichee
  , NatObj.NMacro)

/**
 * Tout élément pouvant être un lieu de point *
 * @type {Nat}
 */
NatObj.NTtObjPourLieu = Nat.or(NatObj.NTteDroite, NatObj.NCercle, NatObj.NArc
  , NatObj.NLieu, NatObj.NLieuDiscret, NatObj.NPolygone, NatObj.NLigneBrisee
  , NatObj.NValeurAffichee, NatObj.NCommentaire, NatObj.NLatex
  , NatObj.NTtPointSaufPointBase, NatObj.NLieuObjet)

// NatObj.NObjGraphiqueSourcePourConst = Nat.or(NatObj.NTtPoint, NatObj.NSegment, NatObj.NDroite, NatObj.NDemiDroite, NatObj.NCercle, NatObj.NArc, NatObj.NPointDansRepere, NatObj.NPointLiePoint, NatObj.NVecteur, NatObj.NPolygone, NatObj.NLigneBrisee, NatObj.NPointParAffixe, NatObj.NLieu

/**
 * Point pouvant être capturé et non lié à un autre objet *
 * @type {Nat}
 */
NatObj.NPointCapturableNonLie = Nat.or(NatObj.NPointBase, NatObj.NPointBaseEnt,
  NatObj.NPointInterieurCercle, NatObj.NPointInterieurPolygone)

/**
 * commentaire ou texte LaTeX *
 * @type {Nat}
 */
NatObj.NComouLatex = Nat.or(NatObj.NCommentaire, NatObj.NLatex)

// Après le rajout des macros qui sont des objets graphiques, il a
// fallu créer un tableau de conversion qui, à la nature d'un objet
// associe son numéro d'objet graphique, compris entre 0 et
// NombreTypesDesignables - 1

/**
 * Liste de natures d'objets (pour les récupérer d'après un index de nature) *
 * @type {Nat}
 */
NatObj.conversionNumeroNature = [
  NatObj.NPointBase, // 0
  NatObj.NPoint,
  NatObj.NPointLie,
  NatObj.NBarycentre,
  NatObj.NPointDansRepere,
  NatObj.NPointBaseEnt, // 5
  NatObj.NPointParAffixe,
  NatObj.NPointLiePoint,
  NatObj.NMacro,
  NatObj.NDroite,
  NatObj.NVecteur, // 10
  NatObj.NSegment,
  NatObj.NDemiDroite,
  NatObj.NCercle,
  NatObj.NMarqueAngle,
  NatObj.NArc, // 15
  NatObj.NPolygone,
  NatObj.NSurface,
  NatObj.NLieu,
  NatObj.NLieuDiscret,
  NatObj.NLigneBrisee, // 20
  NatObj.NLieuObjet,
  NatObj.NImage,
  NatObj.NGrapheSuiteRec,
  NatObj.NGrapheSuiteRecComplexe,
  NatObj.NCommentaire, // 25
  NatObj.NValeurAffichee,
  NatObj.NMarqueSegment,
  NatObj.NObjetDuplique,
  NatObj.NDemiPlan,
  NatObj.NPointInterieurPolygone, // 30
  NatObj.NLatex,
  NatObj.NPointInterieurCercle,
  NatObj.NEditeurFormule // 33
]

/**
 * Nombre de types indexés dans NatObj.conversionNumeroNature (longueur du tableau) *
 * @type {Nat}
 */
NatObj.nombreTypesDesignables = NatObj.conversionNumeroNature.length

/**
 * Retourne l'indice de la nature de l'objet dont la nature est nat
 * @param {Nat} nat
 * @return {number}
 */
NatObj.indiceDeNature = function (nat) {
  const indnat = nat.indice()
  if (indnat < 30) return indnat
  // A noter qu'il faut retrancher 4 car il n'y a pas d'élement correspondant à Nat{low:31, high:0} c'est-à-dire
  // à 2^31
  return indnat - 4
}

export default NatObj

/**
 * @typedef NatObj
 * @property {Nat} NAffLieAPoint
 * @property {Nat} NAffLieAPointSaufImEd
 * @property {Nat} NArc
 * @property {Nat} NAucunObjet
 * @property {Nat} NBarycentre
 * @property {Nat} NBipoint
 * @property {Nat} NCercle
 * @property {Nat} NCercleClone
 * @property {Nat} NCommentaire
 * @property {Nat} NComouLatex
 * @property {Nat} NDemiDroite
 * @property {Nat} NDemiDroiteClone
 * @property {Nat} NDemiPlan
 * @property {Nat} NDroite
 * @property {Nat} NDroiteClone
 * @property {Nat} NEditeurFormule
 * @property {Nat} NGrapheSuiteRec
 * @property {Nat} NGrapheSuiteRecComplexe
 * @property {Nat} NImage
 * @property {Nat} NImpProto
 * @property {Nat} NLatex
 * @property {Nat} NLieu
 * @property {Nat} NLieuDiscret
 * @property {Nat} NLieuObjet
 * @property {Nat} NLigneBrisee
 * @property {Nat} NMacro
 * @property {Nat} NMarqueAngle
 * @property {Nat} NMarqueSegment
 * @property {Nat} NObjetDuplique
 * @property {Nat} NObjLigne
 * @property {Nat} NObjNommable
 * @property {Nat} NPoint
 * @property {Nat} NPointBase
 * @property {Nat} NPointBaseEnt
 * @property {Nat} NPointCapturableNonLie
 * @property {Nat} NPointClone
 * @property {Nat} NPointDansRepere
 * @property {Nat} NPointInterieurCercle
 * @property {Nat} NPointInterieurPolygone
 * @property {Nat} NPointLie
 * @property {Nat} NPointLiePoint
 * @property {Nat} NPointMobile
 * @property {Nat} NPointParAffixe
 * @property {Nat} NPolygone
 * @property {Nat} NRepere
 * @property {Nat} NSegment
 * @property {Nat} NSegmentClone
 * @property {Nat} NSurface
 * @property {Nat} NToutPointSaufPointLie
 * @property {Nat} NTransformation
 * @property {Nat} NTtCercle
 * @property {Nat} NTteDroite
 * @property {Nat} NTteDroiteSaufVect
 * @property {Nat} NTtObj
 * @property {Nat} NTtObjPourLieu
 * @property {Nat} NTtObjSaufDuplique
 * @property {Nat} NTtPoint
 * @property {Nat} NTtPointSaufPointBase
 * @property {Nat} NValeurAffichee
 * @property {Nat} NVecteur
 * @property {number} indiceMacro
 * @property {number} nombreTypesDesignables
 * @property {number} nombreTypesObjetsGraphiques
 * @property {Nat[]} conversionNumeroNature
 * @property {indiceDeNature} indiceDeNature
 */
/**
 * @callback indiceDeNature
 * @param {Nat}
 * @return {number}
 */
