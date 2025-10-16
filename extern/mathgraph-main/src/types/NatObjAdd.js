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
import NatObj from './NatObj'

// on enrichi NatObj

NatObj.NTteDteSaufVecteur = Nat.or(NatObj.NDroite, NatObj.NSegment, NatObj.NDemiDroite)

/*
NatObj.NTtObjSaufRep = Nat.or(NatObj.NTtPoint , NatObj.NMacro , NatObj.NDroite
  , NatObj.NVecteur , NatObj.NSegment, NatObj.NDemiDroite  , NatObj.NCercle
  , NatObj.NMarqueAngle , NatObj.NArc, NatObj.NPolygone , NatObj.NSurface , NatObj.NLieu
  , NatObj.NLieuDiscret , NatObj.NLigneBrisee, NatObj.NLieuObjet , NatObj.NImage
  , NatObj.NGrapheSuiteRec , NatObj.NGrapheSuiteRecComplexe , NatObj.NCommentaire , NatObj.NLatex
  , NatObj.NValeurAffichee , NatObj.NMarqueSegment, NatObj.NObjetDuplique , NatObj.NDemiPlan
  , NatObj.NEditeurFormule);
*/

// Utilisé pour créer des constructions
/*
NatObj.NObjGraphiqueSourcePourConst = Nat.or(NatObj.NTtPoint , NatObj.NSegment , NatObj.NDroite
  , NatObj.NDemiDroite , NatObj.NCercle , NatObj.NArc , NatObj.NPointDansRepere
  , NatObj.NPointLiePoint , NatObj.NVecteur
  , NatObj.NPolygone , NatObj.NLigneBrisee , NatObj.NPointParAffixe , NatObj.NLieu);
  */

NatObj.NTtObjPourDup = Nat.or(NatObj.NTtPoint, NatObj.NDroite, NatObj.NVecteur,
  NatObj.NSegment, NatObj.NDemiDroite, NatObj.NCercle
  , NatObj.NMarqueAngle, NatObj.NArc, NatObj.NPolygone
  , NatObj.NLieu, NatObj.NLieuDiscret, NatObj.NLigneBrisee, NatObj.NLieuObjet, NatObj.NImage
  , NatObj.NGrapheSuiteRec, NatObj.NGrapheSuiteRecComplexe, NatObj.NCommentaire, NatObj.NLatex
  , NatObj.NValeurAffichee, NatObj.NMarqueSegment, NatObj.NDemiPlan
  , NatObj.NRepere, NatObj.NEditeurFormule)

NatObj.NTtObjPourTransf = Nat.or(NatObj.NTtPoint, NatObj.NTteDroiteSaufVect,
  NatObj.NCercle, NatObj.NArc, NatObj.NPolygone, NatObj.NLigneBrisee, NatObj.NLieu,
  NatObj.NLieuDiscret)

NatObj.NComOuLatexOuAffVal = Nat.or(NatObj.NCommentaire, NatObj.NLatex, NatObj.NValeurAffichee)

NatObj.NLigneOuPoly = Nat.or(NatObj.NLigneBrisee, NatObj.NPolygone)

NatObj.NObjGraphPourSourcesProto = Nat.or(NatObj.NTtPoint, NatObj.NSegment, NatObj.NDroite,
  NatObj.NDemiDroite, NatObj.NCercle, NatObj.NArc, NatObj.NPointDansRepere, NatObj.NPointLiePoint,
  NatObj.NVecteur, NatObj.NPolygone, NatObj.NLigneBrisee, NatObj.NPointParAffixe, NatObj.NLieu)

// ça sert probablement à rien de l'exporter, ceux qui font du import NatObj from './NatObj'
// ont maintenant l'objet augmenté
export default NatObj
