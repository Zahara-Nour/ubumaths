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
 * Une collection de Nat concernant les Calculs
 * @enum {Nat}
 */
const NatCal = {
  NAucunCalcul: new Nat(0, 0),
  NVariable: new Nat(1, 0), // 2^0 = 1. Indice 0
  NCalculReel: new Nat(1 << 1, 0), // 2^1
  NCalculReelConstant: new Nat(1 << 2, 0),
  NSuiteRecurrenteReelle: new Nat(1 << 3, 0),
  NSuiteRecurrenteComplexe: new Nat(1 << 4, 0),
  NSolutionEquation: new Nat(1 << 5, 0),
  NIntegrale: new Nat(1 << 6, 0),
  NTestExistence: new Nat(1 << 7, 0),
  NSommeIndicee: new Nat(1 << 8, 0),
  NPartieReelle: new Nat(1 << 9, 0),
  NPartieImaginaire: new Nat(1 << 10, 0),
  NModule: new Nat(1 << 11, 0),
  NArgument: new Nat(1 << 12, 0),
  NMesureLongueur: new Nat(1 << 13, 0),
  NMesureAngleNonOriente: new Nat(1 << 14, 0),
  NMesureAngleOriente: new Nat(1 << 15, 0),
  NMesureAbscisseSurDroite: new Nat(1 << 16, 0),
  NMesureAbscisseRepere: new Nat(1 << 17, 0),
  NMesureOrdonneeRepere: new Nat(1 << 18, 0),
  NMesureLongueurLigne: new Nat(1 << 19, 0),
  NMesureAirePolygone: new Nat(1 << 20, 0),
  NCalculComplexe: new Nat(1 << 21, 0),
  NFonction: new Nat(1 << 22, 0),
  NDerivee: new Nat(1 << 23, 0),
  NFonctionComplexe: new Nat(1 << 24, 0),
  NMesureAffixe: new Nat(1 << 25, 0),
  NRepere: new Nat(1 << 26, 0),
  NMesureCoefDir: new Nat(1 << 27, 0),
  NMesureProduitScalaire: new Nat(1 << 28, 0),
  NProduitIndice: new Nat(1 << 29, 0),
  NFonction2Var: new Nat(1 << 30, 0), // 2^30
  // Version 6.7 : A noter que le 2^31 n'avait pas été utilisé pas plus que le 2^32
  // Version 6.7.2 : Il ne fallait pas le combler car 2^31 est considéré comme négatif
  NFonction3Var: new Nat(0, 1 << 1), // 2^33 : JavaScript pas plus de 31 bits pour entier non signé
  NFonctionComplexe2Var: new Nat(0, 1 << 2), // 2^34 // Pas de décalages de plus de 32 bits en javascript
  NFonctionComplexe3Var: new Nat(0, 1 << 3), // 2^35
  NMaximumFonction: new Nat(0, 1 << 4), // 2^36
  NMinimumFonction: new Nat(0, 1 << 5), // 2^37
  NValRep: new Nat(0, 1 << 6), // 2^38 Représente une valeur d'un repère : abscisse ou ordonnée à l'origine,
  // unité x ou y de repère, abscisse mini ou maxi de repère, ordonnée mini ou maxi de repère
  // 3 Places libres ici pour de nouveaux types d'objets
  // NOrdonneeOrigineRep: new Nat(0, 1 << 7), // 2^39
  // NUnitexRep: new Nat(0, 1 << 8), // 2^40
  // NUniteyRep: new Nat(0, 1 << 9), // 2^41
  NTestEquivalence: new Nat(0, 1 << 10), // 2^42
  NDeriveePartielle: new Nat(0, 1 << 11), // 2^43
  NTestDependanceVariable: new Nat(0, 1 << 12), // 2^44
  NTestNatureOperateur: new Nat(0, 1 << 13), // 2^45
  NSuiteRecurrenteComplexe2: new Nat(0, 1 << 14), // 2^46
  NSuiteRecurrenteReelle2: new Nat(0, 1 << 15), // 2^47
  NSuiteRecurrenteComplexe3: new Nat(0, 1 << 16), // 2^48
  NSuiteRecurrenteReelle3: new Nat(0, 1 << 17), // 2^49
  // Spécial JavaScript pour fonctions de 4 variables ou plus
  // Abandonné
  /*
  NFonctionNVar             : new Nat(0, 1 << 18), // 2^49)
  NFonctionComplexeNVar     : new Nat(0, 1 << 19), // 2^50)
  // Rajout version 4.7.9
  NTestFact                 : new Nat(0, 1 << 20), // 2^51)

  nombreTypesObjetsCalcul : 50
  */
  // Version 6.7 : On comble le trou de 10^31 qui n'a pas été utilisé
  // Version 6.7.2 : Il na fallait pas combler ce trou car 2^31 est considéré comme un nombre négatif
  // NTestFact: new Nat(1 << 31, 0), // 2^31
  NTestFact: new Nat(0, 1 << 18), // 2^49
  NMatrice: new Nat(0, 1), // 2^32 qui n'avait pas été utilisé
  NCalculMat: new Nat(0, 1 << 19), // 2^50 Ajouté version 6.7 : Calcul matriciel réel
  NMatriceAleat: new Nat(0, 1 << 20), // 2^51 Ajouté version 6.7 : Matrice entière aléatoire
  NMatriceParForm: new Nat(0, 1 << 21), // 2^52 Ajouté version 6.7 : Matrice par formule
  // Ajout version 6.8.0 :
  NFonction4Var: new Nat(0, 1 << 22), // 2^53
  NFonctionComplexe4Var: new Nat(0, 1 << 23), // 2^54
  NFonction5Var: new Nat(0, 1 << 24), // 2^54
  NFonctionComplexe5Var: new Nat(0, 1 << 25), // 2^55
  NFonction6Var: new Nat(0, 1 << 26), // 2^56
  NFonctionComplexe6Var: new Nat(0, 1 << 27), // 2^57
  // Ajout version 7.3 pour les matrices contenant la décomosition primaire d'un entier
  NMatriceDecomp: new Nat(0, 1 << 28), // 2^58
  // Ajout version 9 : Abscisse ou ordonnée mini ou maxi dans repère
  NAbsOrOrdMinMaxRep: new Nat(1 << 29, 0), // 2^59

  nombreTypesObjetsCalcul: 61
}

NatCal.NFoncPlusieursVar = Nat.or(
  NatCal.NFonction2Var,
  NatCal.NFonction3Var,
  NatCal.NFonction4Var,
  NatCal.NFonction5Var,
  NatCal.NFonction6Var
)
NatCal.NFoncCPlusieursVar = Nat.or(
  NatCal.NFonctionComplexe2Var,
  NatCal.NFonctionComplexe3Var,
  NatCal.NFonctionComplexe4Var,
  NatCal.NFonctionComplexe5Var,
  NatCal.NFonctionComplexe6Var
)
NatCal.NFoncR1Var = Nat.or(NatCal.NFonction, NatCal.NDerivee)
NatCal.NTteFoncR = Nat.or(NatCal.NFoncR1Var, NatCal.NFoncPlusieursVar, NatCal.NDeriveePartielle)
NatCal.NTteFoncC = Nat.or(NatCal.NFonctionComplexe, NatCal.NFoncCPlusieursVar)
NatCal.NTteFoncRouC = Nat.or(NatCal.NTteFoncR, NatCal.NTteFoncC)
NatCal.NTteValR = Nat.or(
  NatCal.NVariable,
  NatCal.NCalculReel,
  NatCal.NCalculReelConstant,
  NatCal.NSolutionEquation,
  NatCal.NIntegrale,
  NatCal.NTestExistence,
  NatCal.NSommeIndicee,
  NatCal.NProduitIndice,
  NatCal.NPartieReelle,
  NatCal.NPartieImaginaire,
  NatCal.NModule,
  NatCal.NArgument,
  NatCal.NMesureLongueur,
  NatCal.NMesureAngleNonOriente,
  NatCal.NMesureAngleOriente,
  NatCal.NMesureAbscisseSurDroite,
  NatCal.NMesureAbscisseRepere,
  NatCal.NMesureOrdonneeRepere,
  NatCal.NMesureLongueurLigne,
  NatCal.NMesureAirePolygone,
  NatCal.NMesureCoefDir,
  NatCal.NMesureProduitScalaire,
  NatCal.NMaximumFonction,
  NatCal.NMinimumFonction,
  NatCal.NValRep,
  NatCal.NTestEquivalence,
  NatCal.NTestFact,
  NatCal.NTestDependanceVariable,
  NatCal.NTestNatureOperateur
)
NatCal.NTteValRSaufConst = Nat.or(
  NatCal.NVariable,
  NatCal.NCalculReel,
  NatCal.NSolutionEquation,
  NatCal.NIntegrale,
  NatCal.NTestExistence,
  NatCal.NSommeIndicee,
  NatCal.NProduitIndice,
  NatCal.NPartieReelle,
  NatCal.NPartieImaginaire,
  NatCal.NModule,
  NatCal.NArgument,
  NatCal.NMesureLongueur,
  NatCal.NMesureAngleNonOriente,
  NatCal.NMesureAngleOriente,
  NatCal.NMesureAbscisseSurDroite,
  NatCal.NMesureAbscisseRepere,
  NatCal.NMesureOrdonneeRepere,
  NatCal.NMesureLongueurLigne,
  NatCal.NMesureAirePolygone,
  NatCal.NMesureCoefDir,
  NatCal.NMesureProduitScalaire,
  NatCal.NMaximumFonction,
  NatCal.NMinimumFonction,
  NatCal.NValRep,
  NatCal.NTestEquivalence,
  NatCal.NTestFact,
  NatCal.NTestDependanceVariable,
  NatCal.NTestNatureOperateur
)
// Utilisé seulement dans l'applet :
NatCal.NTtCalcRNommeSaufConst = Nat.or(
  NatCal.NVariable,
  NatCal.NCalculReel,
  NatCal.NSolutionEquation,
  NatCal.NIntegrale,
  NatCal.NTestExistence,
  NatCal.NSommeIndicee,
  NatCal.NProduitIndice,
  NatCal.NPartieReelle,
  NatCal.NPartieImaginaire,
  NatCal.NModule,
  NatCal.NArgument,
  NatCal.NMesureAbscisseRepere,
  NatCal.NMesureOrdonneeRepere,
  NatCal.NMesureAbscisseSurDroite,
  NatCal.NMesureAngleOriente,
  NatCal.NMesureLongueurLigne,
  NatCal.NMesureAirePolygone,
  NatCal.NMesureCoefDir,
  NatCal.NMesureProduitScalaire,
  NatCal.NMaximumFonction,
  NatCal.NMinimumFonction,
  NatCal.NValRep,
  NatCal.NTestEquivalence,
  NatCal.NTestFact,
  NatCal.NTestDependanceVariable,
  NatCal.NTestNatureOperateur
)

NatCal.NTteValC = Nat.or(NatCal.NCalculComplexe, NatCal.NMesureAffixe)
NatCal.NCalcRouC = Nat.or(NatCal.NCalculReel, NatCal.NCalculComplexe)
// Ajout version 6.7
NatCal.NTteMatrice = Nat.or(NatCal.NMatrice, NatCal.NMatriceAleat, NatCal.NMatriceParForm, NatCal.NCalculMat, NatCal.NMatriceDecomp)
NatCal.NTteValOuFoncR = Nat.or(
  NatCal.NTteValR,
  NatCal.NTteFoncR,
  NatCal.NSuiteRecurrenteReelle,
  NatCal.NSuiteRecurrenteReelle2,
  NatCal.NSuiteRecurrenteReelle3,
  NatCal.NTteMatrice
)
NatCal.NTteValROuC = Nat.or(NatCal.NTteValR, NatCal.NTteValC)
/*
NatCal.NTteValRouCouFoncC = Nat.or(NatCal.NTteValROuC
  , NatCal.NTteFoncC , NatCal.NSuiteRecurrenteComplexe
  , NatCal.NSuiteRecurrenteComplexe2 , NatCal.NSuiteRecurrenteComplexe3);
*/
/*
NatCal.NTteValRouCSaufConst = Nat.or(NatCal.NTteValRSaufConst, NatCal.NTteValC);
*/
NatCal.NTteValRPourComDyn = Nat.or(
  NatCal.NVariable,
  NatCal.NCalculReel,
  NatCal.NCalculReelConstant,
  NatCal.NSolutionEquation,
  NatCal.NIntegrale,
  NatCal.NTestExistence,
  NatCal.NSommeIndicee,
  NatCal.NProduitIndice,
  NatCal.NPartieReelle,
  NatCal.NPartieImaginaire,
  NatCal.NModule,
  NatCal.NArgument,
  NatCal.NMesureAngleNonOriente,
  NatCal.NMesureAngleOriente,
  NatCal.NMesureAbscisseSurDroite,
  NatCal.NMesureAbscisseRepere,
  NatCal.NMesureOrdonneeRepere,
  NatCal.NMesureLongueurLigne,
  NatCal.NMesureAirePolygone,
  NatCal.NMesureCoefDir,
  NatCal.NMesureProduitScalaire,
  NatCal.NMaximumFonction,
  NatCal.NMinimumFonction,
  NatCal.NValRep,
  NatCal.NTestEquivalence,
  NatCal.NTestFact,
  NatCal.NTestDependanceVariable,
  NatCal.NTestNatureOperateur
)
NatCal.NTteValPourComDynSaufFoncSaufComp = Nat.or(
  NatCal.NTteValRPourComDyn,
  // Version 6.7 : On rajoute aussi les matrices réelles et les calculs matriciels réels
  NatCal.NTteMatrice
)

NatCal.NTteValPourComDynSaufFonc = Nat.or(
  NatCal.NTteValRPourComDyn,
  NatCal.NCalculComplexe,
  NatCal.NMesureAffixe,
  // Version 6.7 : On rajoute aussi les matrices réelles et les calculs matriciels réels
  NatCal.NTteMatrice
)

NatCal.NTteValPourComDyn = Nat.or(NatCal.NTteValPourComDynSaufFonc, NatCal.NTteFoncRouC)
NatCal.NFoncouSuiteR = Nat.or(
  NatCal.NTteFoncR,
  NatCal.NSuiteRecurrenteReelle,
  NatCal.NSuiteRecurrenteReelle2,
  NatCal.NSuiteRecurrenteReelle3
)
NatCal.NFoncouSuiteC = Nat.or(
  NatCal.NTteFoncC,
  NatCal.NSuiteRecurrenteComplexe,
  NatCal.NSuiteRecurrenteComplexe2,
  NatCal.NSuiteRecurrenteComplexe3
)
NatCal.NAutreCalcul = Nat.or(
  NatCal.NSolutionEquation,
  NatCal.NIntegrale,
  NatCal.NTestExistence,
  NatCal.NSommeIndicee,
  NatCal.NProduitIndice,
  NatCal.NPartieReelle,
  NatCal.NPartieImaginaire,
  NatCal.NModule,
  NatCal.NArgument,
  NatCal.NMesureLongueur,
  NatCal.NMesureAngleNonOriente,
  NatCal.NMesureAngleOriente,
  NatCal.NMesureAbscisseSurDroite,
  NatCal.NMesureAbscisseRepere,
  NatCal.NMesureOrdonneeRepere,
  NatCal.NMesureLongueurLigne,
  NatCal.NMesureAirePolygone,
  NatCal.NMesureAffixe,
  NatCal.NMesureCoefDir,
  NatCal.NMesureProduitScalaire,
  NatCal.NMaximumFonction,
  NatCal.NMinimumFonction,
  NatCal.NValRep,
  NatCal.NTestEquivalence,
  NatCal.NTestFact,
  NatCal.NTestDependanceVariable,
  NatCal.NTestNatureOperateur
)
NatCal.NTtCalcNomme = Nat.or(
  NatCal.NCalculReel,
  NatCal.NCalculReelConstant,
  NatCal.NCalculComplexe,
  NatCal.NTteFoncRouC,
  NatCal.NSuiteRecurrenteReelle,
  NatCal.NSuiteRecurrenteReelle2,
  NatCal.NSuiteRecurrenteReelle3,
  NatCal.NSuiteRecurrenteComplexe,
  NatCal.NSuiteRecurrenteComplexe2,
  NatCal.NSuiteRecurrenteComplexe3,
  NatCal.NVariable,
  NatCal.NSolutionEquation,
  NatCal.NIntegrale,
  NatCal.NTestExistence,
  NatCal.NSommeIndicee,
  NatCal.NProduitIndice,
  NatCal.NPartieReelle,
  NatCal.NPartieImaginaire,
  NatCal.NModule,
  NatCal.NArgument,
  NatCal.NMesureAngleOriente,
  NatCal.NMesureAbscisseSurDroite,
  NatCal.NMesureAbscisseRepere,
  NatCal.NMesureOrdonneeRepere,
  NatCal.NMesureCoefDir,
  NatCal.NMesureLongueurLigne,
  NatCal.NMesureAirePolygone,
  NatCal.NMesureProduitScalaire,
  NatCal.NMaximumFonction,
  NatCal.NMinimumFonction,
  NatCal.NValRep,
  NatCal.NTestEquivalence,
  NatCal.NTestFact,
  NatCal.NTestDependanceVariable,
  NatCal.NTestNatureOperateur,
  NatCal.NTteMatrice
)
NatCal.NCalcOuFoncNonConstante = Nat.or(
  NatCal.NCalculReel,
  NatCal.NCalculComplexe,
  NatCal.NTteFoncR,
  NatCal.NTteFoncC,
  NatCal.NCalculMat
)
// Modification pour la version 3.1.5. On peut aussi choisir une variable comme objet final
// à condition qu'elle ait d'abord été choisie dans les objets sources.
NatCal.NTtCalcouFoncRouC = Nat.or(
  NatCal.NCalculReelConstant,
  NatCal.NCalculReel,
  NatCal.NCalculComplexe,
  NatCal.NFonction,
  NatCal.NFonctionComplexe,
  NatCal.NFoncPlusieursVar,
  NatCal.NFoncCPlusieursVar
)
NatCal.NCalcouFoncParFormule = Nat.or(
  NatCal.NCalcRouC,
  NatCal.NFonction,
  NatCal.NFoncPlusieursVar,
  NatCal.NFonctionComplexe,
  NatCal.NFoncCPlusieursVar
)
NatCal.NTteSuiteRecR = Nat.or(
  NatCal.NSuiteRecurrenteReelle,
  NatCal.NSuiteRecurrenteReelle2,
  NatCal.NSuiteRecurrenteReelle3
)
NatCal.NTteSuiteRecC = Nat.or(
  NatCal.NSuiteRecurrenteComplexe,
  NatCal.NSuiteRecurrenteComplexe2,
  NatCal.NSuiteRecurrenteComplexe3
)
NatCal.NTteSuiteRec = Nat.or(NatCal.NTteSuiteRecR, NatCal.NTteSuiteRecC)
NatCal.NFonctionReelle1Variable = Nat.or(NatCal.NFonction, NatCal.NDerivee)

NatCal.NTtObjNum = Nat.or(NatCal.NTteValR, NatCal.NTteValC
  , NatCal.NFoncouSuiteR, NatCal.NFoncouSuiteC, NatCal.NRepere, NatCal.NTteMatrice)

NatCal.NTteFoncRouCSaufDer = Nat.or(NatCal.NFonction, NatCal.NFoncPlusieursVar
  , NatCal.NFonctionComplexe, NatCal.NFoncCPlusieursVar)

// Version 6.7 : Les matrices peuvent aussi être objets sources numériques
NatCal.NObjCalcPourSourcesProtoSaufRep = Nat.or(NatCal.NCalculReel, NatCal.NCalculComplexe
  , NatCal.NSuiteRecurrenteReelle, NatCal.NSuiteRecurrenteReelle2, NatCal.NSuiteRecurrenteReelle3
  , NatCal.NSuiteRecurrenteComplexe, NatCal.NSuiteRecurrenteComplexe2, NatCal.NSuiteRecurrenteComplexe3
  , NatCal.NVariable, NatCal.NTteFoncRouCSaufDer, NatCal.NTteMatrice
)

NatCal.NObjCalcPourSourcesProto = Nat.or(NatCal.NObjCalcPourSourcesProtoSaufRep, NatCal.NRepere)

NatCal.NTtObjNumSaufConst = Nat.or(NatCal.NTteValRSaufConst
  , NatCal.NTteValC, NatCal.NFoncouSuiteR
  , NatCal.NFoncouSuiteC, NatCal.NRepere, NatCal.NTteMatrice)

NatCal.NFoncRNvar = Nat.or(NatCal.NFoncPlusieursVar, NatCal.NDeriveePartielle)

NatCal.NFoncROuCompNvar = Nat.or(NatCal.NFoncPlusieursVar, NatCal.NFoncCPlusieursVar)
NatCal.NTtCalcNommeSaufConst = Nat.or(NatCal.NCalculReel, NatCal.NCalculComplexe
  , NatCal.NTteFoncRouC, NatCal.NDerivee, NatCal.NSuiteRecurrenteReelle
  , NatCal.NSuiteRecurrenteReelle2, NatCal.NSuiteRecurrenteReelle3, NatCal.NSuiteRecurrenteComplexe
  , NatCal.NSuiteRecurrenteComplexe2, NatCal.NSuiteRecurrenteComplexe3, NatCal.NVariable
  , NatCal.NSolutionEquation, NatCal.NIntegrale, NatCal.NTestExistence
  , NatCal.NSommeIndicee, NatCal.NProduitIndice, NatCal.NPartieReelle
  , NatCal.NPartieImaginaire, NatCal.NModule, NatCal.NArgument
  , NatCal.NMesureAbscisseRepere, NatCal.NMesureOrdonneeRepere
  , NatCal.NMesureAbscisseSurDroite, NatCal.NMesureAffixe, NatCal.NMesureAngleOriente
  , NatCal.NMesureLongueurLigne, NatCal.NMesureAirePolygone
  , NatCal.NMesureCoefDir, NatCal.NMesureProduitScalaire
  , NatCal.NMaximumFonction, NatCal.NMinimumFonction
  , NatCal.NValRep
  , NatCal.NTestEquivalence, NatCal.NTestFact
  , NatCal.NTestDependanceVariable, NatCal.NTestNatureOperateur, NatCal.NTteMatrice)

NatCal.NTteValROuCOuFoncROuC = Nat.or(NatCal.NTteValROuC, NatCal.NTteFoncC, NatCal.NSuiteRecurrenteComplexe,
  NatCal.NSuiteRecurrenteComplexe2, NatCal.NSuiteRecurrenteComplexe3, NatCal.NTteFoncR,
  NatCal.NTteMatrice)

NatCal.NCalculOuFonctionParFormule = Nat.or(NatCal.NCalculReel, NatCal.NCalculComplexe, NatCal.NFonction, NatCal.NFoncPlusieursVar, NatCal.NFonctionComplexe, NatCal.NFoncCPlusieursVar)

export default NatCal
