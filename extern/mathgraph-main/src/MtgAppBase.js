/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ce, ceIn, cens } from 'src/kernel/dom'
import Dimf from './types/Dimf'
import InfoProx from './types/InfoProx'
import NatObj from './types/NatObj'
import StyleMarqueSegment from './types/StyleMarqueSegment'
import StyleEncadrement from './types/StyleEncadrement'
import StyleFleche from './types/StyleFleche'
import StyleMarqueAngle from './types/StyleMarqueAngle'
import StyleRemplissage from './types/StyleRemplissage'
import StyleTrait from './types/StyleTrait'
import constantes from './kernel/constantes'
import levels from './kernel/levels'
import constructionsBase from './kernel/constructionsBase'
import constructions from './kernel/constructions'
import NatCal from './types/NatCal'
import Color from './types/Color'
import MotifPoint from './types/MotifPoint'
import { addZoomListener, base64Decode, base64Encode, getStr, preventDefault, uniteAngleDegre, getLanguage, ratioLens, radiusLens, svgLensOpacity } from './kernel/kernel'
import { isTouchDevice, mousePosition, touchPosition } from './kernel/kernelAdd'
import OutilAnnuler from './outils/OutilAnnuler'
import OutilCapt from './outils/OutilCapt'
import OutilCaptNom from './outils/OutilCaptNom'
import OutilCarre from './outils/OutilCarre'
import OutilRectangle from './outils/OutilRectangle'
import OutilLosange from './outils/OutilLosange'
import OutilCentreGrav from './outils/OutilCentreGrav'
import OutilCentreCercle from './outils/OutilCentreCercle'
import OutilMilieu from './outils/OutilMilieu'
import OutilCerOA from './outils/OutilCerOA'
import OutilCerOR from './outils/OutilCerOR'
import OutilCerOAB from './outils/OutilCerOAB'
import OutilArcPetit from './outils/OutilArcPetit'
import OutilArcGrand from './outils/OutilArcGrand'
import OutilArcDirect from './outils/OutilArcDirect'
import OutilArcIndirect from './outils/OutilArcIndirect'
import OutilArcPetitParAng from './outils/OutilArcPetitParAng'
import OutilArcGrandParAng from './outils/OutilArcGrandParAng'
import OutilArcDirectParAng from './outils/OutilArcDirectParAng'
import OutilArcIndirectParAng from './outils/OutilArcIndirectParAng'
import OutilDemiDt from './outils/OutilDemiDt'
import DataInputStream from './entreesSorties/DataInputStream'
import ButtonTool from './interface/ButtonTool'
import ButtonToolAdd from './interface/ButtonToolAdd'
import ButtonStyleButton from './interface/ButtonStyleButton'
import MarqueSegmentButton from './interface/MarqueSegmentButton'
import StyleFlecheButton from './interface/StyleFlecheButton'
import MarqueAngleButton from './interface/MarqueAngleButton'
import ColorChoicePanel from './interface/ColorChoicePanel'
import StyleRemplissageButton from './interface/StyleRemplissageButton'
import StopButton from './interface/StopButton'
import ExpandableBar from './interface/ExpandableBar'
import LineStyleButton from './interface/LineStyleButton'
import OneColorButton from './interface/OneColorButton'
import Slider from './interface/Slider'
import ToolbarArrow from './interface/ToolbarArrow'
import Gestionnaire from './Gestionnaire'
import CPointBase from './objets/CPointBase'
import OutilPointageCapture from './pointage/OutilPointageCapture'
import OutilPointageClic from './pointage/OutilPointageClic'
import OutilPointageCre from './pointage/OutilPointageCre'
import OutilPointageObjetClignotant from './pointage/OutilPointageObjetClignotant'
import OutilPointageInt from './pointage/OutilPointageInt'
import OutilPointageRapporteur from './pointage/OutilPointageRapporteur'
import OutilPointageCaptureNom from './pointage/OutilPointageCaptureNom'
import OutilPointageExecMac from './pointage/OutilPointageExecMac'
import OutilPointageClicOuPt from './pointage/OutilPointageClicOuPt'
import OutilAdd from './outils/OutilAdd'
import OutilPtLib from './outils/OutilPtLib'
import OutilMarquerPt from './outils/OutilMarquerPt'
import OutilDemarquerPt from './outils/OutilDemarquerPt'
import OutilPunaiser from './outils/OutilPunaiser'
import OutilDepunaiser from './outils/OutilDepunaiser'
import OutilPunaiserAff from './outils/OutilPunaiserAff'
import OutilDepunaiserAff from './outils/OutilDepunaiserAff'
import OutilPunaiserMarqueAng from './outils/OutilPunaiserMarqueAng'
import OutilDepunaiserMarqueAng from './outils/OutilDepunaiserMarqueAng'
import OutilDtAB from './outils/OutilDtAB'
import OutilDtParCoef from './outils/OutilDtParCoef'
import OutilDtBis from './outils/OutilDtBis'
import OutilDtHor from './outils/OutilDtHor'
import OutilDtMed from './outils/OutilDtMed'
import OutilDtPar from './outils/OutilDtPar'
import OutilDtPer from './outils/OutilDtPer'
import OutilDtVer from './outils/OutilDtVer'
import OutilDtParEq from './outils/OutilDtParEq'
import OutilMarqueAng from './outils/OutilMarqueAng'
import OutilMarqueAngOr from './outils/OutilMarqueAngOr'
import OutilMarqueAngOrSD from './outils/OutilMarqueAngOrSD'
import OutilMarqueAngOrSI from './outils/OutilMarqueAngOrSI'
import OutilMarqueSeg from './outils/OutilMarqueSeg'
import OutilRefaire from './outils/OutilRefaire'
import OutilRot from './outils/OutilRot'
import OutilRapporteur from './outils/OutilRapporteur'
import OutilArcParRapporteur from './outils/OutilArcParRapporteur'
import OutilArcGrandParRapporteur from './outils/OutilArcGrandParRapporteur'
import OutilSymAxiale from './outils/OutilSymAxiale'
import OutilSymCentrale from './outils/OutilSymCentrale'
import OutilTrans from './outils/OutilTrans'
import OutilTransParCoord from './outils/OutilTransParCoord'
import OutilHom from './outils/OutilHom'
import OutilSim from './outils/OutilSim'
import OutilImageInv from './outils/OutilImageInv'
import OutilSup from './outils/OutilSup'
import OutilCurseur from './outils/OutilCurseur'
import OutilTangente from './outils/OutilTangente'
import OutilDtReg from './outils/OutilDtReg'
import OutilCalcul from './outils/OutilCalcul'
import OutilVariable from './outils/OutilVariable'
import OutilSolutionEq from './outils/OutilSolutionEq'
import OutilDerivee from './outils/OutilDerivee'
import OutilDeriveePartielle from './outils/OutilDeriveePartielle'
import OutilMatrice from './outils/OutilMatrice'
import OutilCalculMat from './outils/OutilCalculMat'
import OutilMatriceAleat from './outils/OutilMatriceAleat'
import OutilMatriceParForm from './outils/OutilMatriceParForm'
import OutilMatriceParTxt from './outils/OutilMatriceParTxt'
import OutilMatriceCoord from './outils/OutilMatriceCoord'
import OutilNuagePt from './outils/OutilNuagePt'
import OutilDet from './outils/OutilDet'
import OutilRenommerCalcul from './outils/OutilRenommerCalcul'
import OutilSuiteRec from './outils/OutilSuiteRec'
import OutilSuiteRec2 from './outils/OutilSuiteRec2'
import OutilSuiteRec3 from './outils/OutilSuiteRec3'
import OutilSuiteRecComplexe from './outils/OutilSuiteRecComplexe'
import OutilSuiteRecComplexe2 from './outils/OutilSuiteRecComplexe2'
import OutilSuiteRecComplexe3 from './outils/OutilSuiteRecComplexe3'
import OutilMax from './outils/OutilMax'
import OutilMin from './outils/OutilMin'
import OutilRepere from './outils/OutilRepere'
import OutilCalculComp from './outils/OutilCalculComp'
import OutilSeg from './outils/OutilSeg'
import OutilSegmentParLong from './outils/OutilSegmentParLong'
import OutilTriangleEq from './outils/OutilTriangleEq'
import OutilVect from './outils/OutilVect'
import OutilParallelog from './outils/OutilParallelog'
import OutilPolygone from './outils/OutilPolygone'
import OutilPolygoneReg from './outils/OutilPolygoneReg'
import OutilLigneBrisee from './outils/OutilLigneBrisee'
import OutilProj from './outils/OutilProj'
import OutilModifObjGraph from './outils/OutilModifObjGraph'
import OutilZoomPlus from './outils/OutilZoomPlus'
import OutilZoomMoins from './outils/OutilZoomMoins'
import OutilTaillePlus from './outils/OutilTaillePlus'
import OutilTailleMoins from './outils/OutilTailleMoins'
import OutilModeTrace from './outils/OutilModeTrace'
import OutilModePointsAuto from './outils/OutilModePointsAuto'
import OutilModeAutoComplete from './outils/OutilModeAutoComplete'
import OutilUseLens from './outils/OutilUseLens'
import OutilRecalculer from './outils/OutilRecalculer'
import OutilGomme from './outils/OutilGomme'
import OutilRideau from './outils/OutilRideau'
import OutilTranslationFigure from './outils/OutilTranslationFigure'
import OutilExecutionMacro from './outils/OutilExecutionMacro'
import OutilNew from './outils/OutilNew'
import OutilModifObjNum from './outils/OutilModifObjNum'
import OutilPalette from './outils/OutilPalette'
import OutilNommer from './outils/OutilNommer'
import OutilInt from './outils/OutilInt'
import OutilPtParCoord from './outils/OutilPtParCoord'
import OutilPtParAff from './outils/OutilPtParAff'
import OutilPtLie from './outils/OutilPtLie'
import OutilPtBaseEnt from './outils/OutilPtBaseEnt'
import OutilPtInterieur from './outils/OutilPtInterieur'
import OutilPtParAbs from './outils/OutilPtParAbs'
import OutilBarycentre from './outils/OutilBarycentre'
import OutilPtParMultVec from './outils/OutilPtParMultVec'
import OutilPtParSommeVec from './outils/OutilPtParSommeVec'
import OutilMesLong from './outils/OutilMesLong'
import OutilMesLongOr from './outils/OutilMesLongOr'
import OutilMesAngNor from './outils/OutilMesAngNor'
import OutilMesAngOr from './outils/OutilMesAngOr'
import OutilMesAbs from './outils/OutilMesAbs'
import OutilMesAbsRep from './outils/OutilMesAbsRep'
import OutilMesOrdRep from './outils/OutilMesOrdRep'
import OutilMesAffRep from './outils/OutilMesAffRep'
import OutilMesCoefDir from './outils/OutilMesCoeffDir'
import OutilMesLongLigne from './outils/OutilMesLongLigne'
import OutilMesAire from './outils/OutilMesAire'
import OutilMesProSca from './outils/OutilMesProSca'
import OutilFonc from './outils/OutilFonc'
import OutilFoncComp from './outils/OutilFoncComp'
import OutilFonc2Var from './outils/OutilFonc2Var'
import OutilFonc3Var from './outils/OutilFonc3Var'
import OutilFoncComp2Var from './outils/OutilFoncComp2Var'
import OutilFoncComp3Var from './outils/OutilFoncComp3Var'
import OutilPartieReelle from './outils/OutilPartieReelle'
import OutilPartieImaginaire from './outils/OutilPartieImaginaire'
import OutilModule from './outils/OutilModule'
import OutilArgument from './outils/OutilArgument'
import OutilTestExistence from './outils/OutilTestExistence'
import OutilTestEq from './outils/OutilTestEq'
import OutilTestFact from './outils/OutilTestFact'
import OutilTestEqNatOp from './outils/OutilTestEqNatOp'
import OutilTestDepVar from './outils/OutilTestDepVar'
import OutilSomInd from './outils/OutilSomInd'
import OutilProdInd from './outils/OutilProdInd'
import OutilInteg from './outils/OutilInteg'
import OutilSurface from './outils/OutilSurface'
import OutilSurfaceLieuDroite from './outils/OutilSurfaceLieuDroite'
import OutilSurface2Lieux from './outils/OutilSurface2Lieux'
import OutilSurfaceLieu2Pts from './outils/OutilSurfaceLieu2Pts'
import OutilDemiPlan from './outils/OutilDemiPlan'
import OutilCouronne from './outils/OutilCouronne'
import OutilSurfaceArc from './outils/OutilSurfaceArc'
import OutilLieuParPtLie from './outils/OutilLieuParPtLie'
import OutilLieuDiscretParPtLie from './outils/OutilLieuDiscretParPtLie'
import OutilLieuParVariable from './outils/OutilLieuParVariable'
import OutilLieuDiscretParVariable from './outils/OutilLieuDiscretParVariable'
import OutilLieuObjetParPtLie from './outils/OutilLieuObjetParPtLie'
import OutilLieuObjetParVariable from './outils/OutilLieuObjetParVariable'
import OutilCourbeFonc from './outils/OutilCourbeFonc'
import OutilSegCur from './outils/OutilSegCur'
import OutilCourbeFoncCr from './outils/OutilCourbeFoncCr'
import OutilCourbeAvecTan from './outils/OutilCourbeAvecTan'
import OutilCourbePoly from './outils/OutilCourbePoly'
import OutilGrapheSuiteRec from './outils/OutilGrapheSuiteRec'
import OutilGrapheSuiteRecComp from './outils/OutilGrapheSuiteRecComp'
import OutilAffichageValeur from './outils/OutilAffichageValeur'
import OutilAffichageValeurLiePt from './outils/OutilAffichageValeurLiePt'
import OutilAffichageEq from './outils/OutilAffichageEq'
import OutilAffichageEqLie from './outils/OutilAffichageEqLie'
import OutilAffichageCoord from './outils/OutilAffichageCoord'
import OutilAffichageCoordLie from './outils/OutilAffichageCoordLie'
import OutilLatex from './outils/OutilLatex'
import OutilLatexLiePt from './outils/OutilLatexLiePt'
import OutilCommentaire from './outils/OutilCommentaire'
import OutilCommentaireLiePt from './outils/OutilCommentaireLiePt'
import OutilImageLibre from './outils/OutilImageLibre'
import OutilImageLiee from './outils/OutilImageLiee'
import OutilEditeurFormule from './outils/OutilEditeurFormule'
import OutilCreationLiaison from './outils/OutilCreationLiaison'
import OutilCreationLiaisonAff from './outils/OutilCreationLiaisonAff'
import OutilSuppressionLiaison from './outils/OutilSuppressionLiaison'
import OutilSuppressionLiaisonAff from './outils/OutilSuppressionLiaisonAff'
import OutilObjetDuplique from './outils/OutilObjetDuplique'
import OutilObjetClone from './outils/OutilObjetClone'
import OutilReclassDebObjGra from './outils/OutilReclassDebObjGra'
import OutilReclassFinObjGra from './outils/OutilReclassFinObjGra'
import OutilCopierStyle from './outils/OutilCopierStyle'
import OutilAbsOrRep from './outils/OutilAbsOrRep'
import OutilOrdOrRep from './outils/OutilOrdOrRep'
import OutilUnitexRep from './outils/OutilUnitexRep'
import OutilUniteyRep from './outils/OutilUniteyRep'
import OutilAbsMinRep from './outils/OutilAbsMinRep'
import OutilAbsMaxRep from './outils/OutilAbsMaxRep'
import OutilOrdMinRep from './outils/OutilOrdMinRep'
import OutilOrdMaxRep from './outils/OutilOrdMaxRep'
import OutilOptionsFig from './outils/OutilOptionsFig'
import OutilCodeBase64 from './outils/OutilCodeBase64'
import OutilPermanentUrl from './outils/OutilPermanentUrl'
import OutilCodeTikz from './outils/OutilCodeTikz'
import OutilExportFig from './outils/OutilExportFig'
import OutilSavePNG from './outils/OutilSavePNG'
import OutilSavePNGWithUnity from './outils/OutilSavePNGWithUnity'
import OutilSaveJPG from './outils/OutilSaveJPG'
import OutilSaveSVG from './outils/OutilSaveSVG'
import OutilExportHTML from './outils/OutilExportHTML'
import OutilCopy from './outils/OutilCopy'
import OutilCopyWithUnity from './outils/OutilCopyWithUnity'
import OutilAnimation from './outils/OutilAnimation'
import OutilOpen from './outils/OutilOpen'
import OutilSave from './outils/OutilSave'
import OutilGraduationAxes from './outils/OutilGraduationAxes'
import OutilQuadrillage from './outils/OutilQuadrillage'
import OutilProtocole from './outils/OutilProtocole'
import OutilHelp from './outils/OutilHelp'
import OutilLastInd from './outils/OutilLastInd'
import OutilToggleToolsAdd from './outils/OutilToggleToolsAdd'
import OutilLongUnit from './outils/OutilLongUnit'
import OutilMacApp from './outils/OutilMacApp'
import OutilMacDisp from './outils/OutilMacDisp'
import OutilMacAppParAut from './outils/OutilMacAppParAut'
import OutilMacAnim from './outils/OutilMacAnim'
import OutilMacAnimParVar from './outils/OutilMacAnimParVar'
import OutilMacAnimParVarTr from './outils/OutilMacAnimParVarTr'
import OutilMacDispParAut from './outils/OutilMacDispParAut'
import OutilMacAnimTr from './outils/OutilMacAnimTr'
import OutilMacTraceAuto from './outils/OutilMacTraceAuto'
import OutilMacTraceAutoVa from './outils/OutilMacTraceAutoVa'
import OutilMacAffValVar from './outils/OutilMacAffValVar'
import OutilMacClign from './outils/OutilMacClign'
import OutilMacIncVar from './outils/OutilMacIncVar'
import OutilMacDecVar from './outils/OutilMacDecVar'
import OutilMacModifVar from './outils/OutilMacModifVar'
import OutilMacAffPtLie from './outils/OutilMacAffPtLie'
import OutilMacReaff from './outils/OutilMacReaff'
import OutilMacActTr from './outils/OutilMacActTr'
import OutilMacDesactTr from './outils/OutilMacDesactTr'
import OutilMacPause from './outils/OutilMacPause'
import OutilMacSuiteMac from './outils/OutilMacSuiteMac'
import OutilMacJouantSon from './outils/OutilMacJouantSon'
import OutilMacBoucAnim from './outils/OutilMacBoucAnim'
import OutilMacBoucTr from './outils/OutilMacBoucleTr'
import OutilMacConsRec from './outils/OutilMacConsRec'
import OutilMacConsIter from './outils/OutilMacConsIter'
import OutilAddObjMac from './outils/OutilAddObjMac'
import OutilSupObjMac from './outils/OutilSupObjMac'
import OutilFusionImpConst from './outils/OutilFusionImpConst'
import OutilFusionImpByName from './outils/OutilFusionImpByName'
import OutilModifConst from './outils/OutilModifConst'
import OutilSupConst from './outils/OutilSupConst'
import OutilImpConstFig from './outils/OutilImpConstFig'
import OutilSaveConst from './outils/OutilSaveConst'
import OutilAddConst from './outils/OutilAddConst'
import OutilGestionConst from './outils/OutilGestionConst'
import OutilChoixSrcNumConst from './outils/OutilChoixSrcNumConst'
import OutilChoixSrcGraphConst from './outils/OutilChoixSrcGraphConst'
import OutilChoixFinGraphConst from './outils/OutilChoixFinGraphConst'
import OutilChoixFinNumConst from './outils/OutilChoixFinNumConst'
import OutilFinirConst from './outils/OutilFinirConst'
import OutilReInitConst from './outils/OutilReinitConst'
import OutilCreationConst from './outils/OutilCreationConst'
import CAffLiePt from './objets/CAffLiePt'
import CCommentaire from './objets/CCommentaire'
import CListeObjets from './objets/CListeObjets'
import CMathGraphDoc from './objets/CMathGraphDoc'
import NameEditor from './interface/NameEditor'
import CMacroAnimationFigure from './objetsAdd/CMacroAnimationFigure'
import InfoAnim from './types/InfoAnim'
import $ from 'jquery'
import DataOutputStream from './entreesSorties/DataOutputStream'
import AvertDlg from './dialogs/AvertDlg'
import { idDivDlg } from './dialogs/MtgDlg'
import MtgAppLecteur from './MtgAppLecteur'
import CSousListeObjets from './objets/CSousListeObjets'
import CValeurAngle from './objets/CValeurAngle'
import { addQueue, abort } from './kernel/addQueue'
import OutilMatDecomp from './outils/OutilMatDecomp'
import CNoeudPointeurSurPoint from './objets/CNoeudPointeurSurPoint'
import CPolygone from './objets/CPolygone'
import CSurfacePolygone from './objets/CSurfacePolygone'
import OutilPointageTranslation from './pointage/OutilPointageTranslation'
import OutilRapporteurVirt from './outils/OutilRapporteurVirt'
import OutilRapporteurCircVirt from './outils/OutilRapporteurCircVirt'
import OutilEquerreVirt from './outils/OutilEquerreVirt'
import OutilRegleVirt from './outils/OutilRegleVirt'
import OutilDepunaiserTout from './outils/OutilDepunaiserTout'
import OutilModeSelectRect from './outils/OutilModeSelectRect'

export default MtgApp

/**
 * Classe de l'application mathGraph32 permettant de créer ou modifier une figure
 * @constructor
 * @param {SVGElement} svg Le svg dans lequel l'application travaille (il doit avoir un id)
 * @param {MtgOptions} mtgOptions Les informations sur l'initialisation de l'application
 */
function MtgApp (svg, mtgOptions) {
  this.addQueue = addQueue// Pour pouvoir appeler addQueue via l'application
  if (typeof mtgOptions !== 'object') mtgOptions = {}
  /**
   * Le svg contenant mathgraph
   * @type {SVGElement}
   */
  this.svg = svg
  // Ligne ci-dessous pour qu'un double touch sur les icônes ne provoque pas un zoom
  // sur l'interface
  svg.style.touchAction = 'manipulation'
  // On mémorise dans le svg le div qui le contient
  svg.containerDiv = svg.parentElement
  /**
   * id du svg
   * @type {string}
   */
  this.id = this.svg.id

  // init des propriétés déduites de mtgOptions
  /**
   * True pour un affichage plus adapté aux dys
   * @type {boolean}
   */
  this.dys = Boolean(mtgOptions.dys)
  /**
   * true si on est dans electron
   * @type {boolean}
   */
  this.electron = Boolean(mtgOptions.electron)
  /**
   * True si on est en version pwa (pas forcément installée)
   * Pour savoir si on est dans une pwa installée localement on pourrait faire :
   * `const isInstalled = Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone)`
   * @type {boolean}
   */
  this.pwa = mtgOptions.pwa === true
  if (mtgOptions.bplayer) {
    /**
     * Player éventuel
     * @type {MtgAppLecteur}
     */
    this.player = new MtgAppLecteur(mtgOptions.zoomOnWheel, mtgOptions.decimalDot, mtgOptions.translatable)
  }
  /**
   * Mode aperçu dans Labomep
   * @type {boolean}
   */
  this.preview = Boolean(mtgOptions.preview)
  /**
   * Callback pour envoyer la figure
   * @type {function}
   */
  this.functionOnSave = mtgOptions.functionOnSave
  this.avertOnSave = Boolean(mtgOptions.avertOnSave ?? true)

  // init language
  this.language = getLanguage(mtgOptions.language)

  let ba, inps
  /**
   * Pointe sur le svg contenant les icônes des outils supplémentaires.
   * null quand les outils supplémentaires ne sont pas disponibles,
   * @type {SVGElement}
   */
  this.svgToolsAdd = null
  /**
   * Préférences d'animation
   * @type {InfoAnim}
   */
  this.pref_Anim = new InfoAnim(100, 20, true, false)
  /**
   * Taille de la police des noms d'objets
   * @type {number}
   */
  this.pref_TaillePoliceNom = this.dys ? 22 : 16
  // On charge les 4 figures donnant les niveaux de fonctionnement prédéfinis
  this.loadLevels()

  // On définit le niveau de fonctionnement du logiciel
  // y'a des options en global qui écrasent ce qu'on nous a passé concernant local
  if (typeof window.mtgOptions === 'object') {
    /**
     * Fonctionnement en local
     * @type {boolean}
     */
    this.local = true
  } else if (typeof mtgOptions.local === 'string' && mtgOptions.local) {
    this.local = true
  } else {
    this.local = Boolean(mtgOptions.local)
  }

  /**
     * coefficient multiplicateur pour la taille des images exportées
     * @type {number}
     */
  this.pref_coefMult = 2
  /**
     * Affiche les mesures si true
     * @type {boolean}
     */
  this.displayMeasures = mtgOptions.displayMeasures === undefined ? true : mtgOptions.displayMeasures
  /**
     * Si true des points sont créés automatiquement au clic avec certains outils (dys impose false)
     * @type {boolean}
     */
  this.pref_PointsAuto = this.dys ? false : Boolean(mtgOptions.pointsAuto)
  /**
   * Si on a passé un paramètre useLens à true dans MtgOptions, on activera l'outil loupe par défaut
   * @type {boolean}
   */
  this.useLens = Boolean(mtgOptions.useLens)
  /**
   * si mtgOptions ne comprend pas de paramètre decimalDot on utilise le point décimal
   * @type {boolean|*}
   */
  this.decimalDot = mtgOptions.decimalDot === undefined ? true : Boolean(mtgOptions.decimalDot)
  /**
   * si mtgOptions ne comprend pas de paramètre translatable ou si il est true la figure est translatable (on peut la faire glisser)
   * translatable = true est le comportement par défaut
   * @type {boolean}
   */
  if (this.electron) {
    // Pour la version electron, on fait glisser la figure avec l'outil de capture
    this.translatable = true
  } else {
    const touchDevice = isTouchDevice()
    if (this.pwa) {
      // Pour la version pwa, si on est sur écran tactile, on ne fait pas glisser la figure
      // avec l'outil de capture pour  réserver le glissement du doigt à sa fonction par défaut
      // sur écran tactile
      this.translatable = !touchDevice
    } else {
      this.translatable = mtgOptions.translatable === undefined ? !touchDevice : Boolean(mtgOptions.translatable)
    }
  }
  /**
   * Si mtgOptions comprend un paramètre autocomplete à true on complétera automatiquement certains éléments
   * avec des marques de segments ou d'angle, comme pour la création d'une médiatrice
   * @type {boolean}
   */
  this.autoComplete = Boolean(mtgOptions.autoComplete)

  /**
   * Si true on affiche le bouton ouvrir
   * @type {boolean}
   */
  this.open = mtgOptions.open === undefined ? true : Boolean(mtgOptions.newFig)
  /**
   * Si true on affiche le bouton sauvegarder
   * @type {boolean}
   */
  this.save = Boolean(mtgOptions.save ?? true) // nullish => true
  if (this.functionOnSave) {
    // on attend un résultat, faut le bouton pour l'envoyer
    this.save = true
  }
  this.forceProtocol = Boolean(mtgOptions.forceProtocol ?? false)
  // avant le 2024-10-01 on passait save à false si (!this.estExercice && this.preview), pour retirer le bouton save
  // lors de l'affichage dans la bibli des figures éditables non exercice de construction
  /**
   * ???
   * @type {boolean}
   */
  this.onlyPoints = Boolean(mtgOptions.onlyPoints)

  if (mtgOptions.stylePointCroix) {
    /**
       * Style de point (cf MotifPoint)
       * @type {number}
       */
    this.stylePoint = MotifPoint.grandMult
  }
  /**
   * Flag pour savoir si on est en mode construction
   * @type {boolean}
   */
  this.editionConstruction = Boolean(mtgOptions.editionConstruction)
  if (this.dys) {
    constantes.arrowIconWidth *= 1.5
    constantes.svgPanelWidth += constantes.arrowIconWidth / 4
  }
  if (mtgOptions.level !== undefined) {
    let lev = mtgOptions.level
    // Attention lors de l'appel par la version electron avec un niveau prédéfini
    // mtgOptions.level est passé sous la forme d'une chaîne "0' ou "1" ou "2" ou "3"
    if (typeof lev === 'string' && lev.length === 1) lev = Number(lev)
    if (typeof lev === 'number') {
      if ((lev >= 0) && (lev <= 3)) {
        /**
         * Index du level courant (utilisé dans getResult)
         * @type {number}
         */
        this.levelIndex = lev
        /**
         * Les 4 figures du level courant
         * @type {CMathGraphDoc}
         */
        this.level = this.levels[lev]
      } else {
        this.level = this.levels[3]
      }
    } else {
      if (typeof lev === 'string') {
        const niv = parseInt(lev) // Nécessaire pour la version electron où le niveau est sauvé comme une chaîne de caractères
        if (niv >= 0 && niv < 4) {
          this.levelIndex = niv // Utilisé dans getResult
          this.level = this.levels[niv]
        } else {
          try {
            this.level = this.loadDoc('', lev)
          } catch (e) {
            this.level = this.levels[3]
          }
        }
      }
    }
  } else {
    this.level = this.levels[3]
  }

  /**
     * Si true, la figure s'affiche automatiquement dès qu'elle est prête (sinon faudra appeler calculateAndDisplay)
     * @type {boolean}
     */
  this.displayOnLoad = (mtgOptions.displayOnLoad === undefined) ? true : mtgOptions.displayOnLoad

  const self = this
  // Initialisation des données de la barre de droite
  /**
     * Couleur  au démarrage
     * @type {Color}
     */
  this.couleurActive = Color.black
  /**
   * Style de trait par défaut au démarrage
   * @type {number}
   */
  this.lineStyle = StyleTrait.styleTraitContinu
  /**
     * Largeur de trait par défaut au démarrage
     * @type {number}
     */
  this.thickness = this.dys ? 2 : 1
  if (!this.stylePoint) this.stylePoint = this.dys ? MotifPoint.grandRond : MotifPoint.rond
  /**
   * style de marque de segment par défaut au démarrage
   * @type {number}
   */
  this.styleMarqueSegment = StyleMarqueSegment.marqueSimple
  /**
   * Style de flèche par défaut au démarrage (vecteur, marques d'angle orienté)
   * @type {number}
   */
  this.styleFleche = StyleFleche.FlecheLonguePleine
  /**
   * Style de marque d'angle par défaut au démarrage
   * @type {number}
   */
  this.styleMarqueAngle = StyleMarqueAngle.marqueSimple
  /**
   * Style de remplissage de surface par défaut au démarrage
   * @type {number}
   */
  this.styleRemplissage = StyleRemplissage.transp
  /**
     * Pointeur sur le commentaire d'indication, null au départ
     * @type {null}
     */
  this.comm = null
  //
  const w = parseFloat(svg.getAttribute('width'))
  const h = parseInt(svg.getAttribute('height'))

  // Ajout version mtgApp. Etait auparavant dans CEditeurFormule
  const par = svg.parentElement // Le div parent
  // $(par).css('font-weight', 'normal').css('font-family', '"Times New Roman", Times, serif;'); // Pour que les textes ne prennent pas par défaut le style du parent du div qui peut être bold
  // $(par).css('font-weight', 'normal').css('font-family', 'serif'); // Inutile fait en css par la class  svgMtg
  if (par.style.position === '') par.style.position = 'relative'
  // Modification version 7.3.2 : En ligne l'éditeur peut cohabiter avec un player
  // On crée un div destiné à contenir le svg servant à des affichages auxiliaires, unique entre les différentes figures (et entre player/éditeur)
  // (destiné à afficher provisoirement les affichages de texte pour récupérer leur taille)
  // Version 6.4 : On donne à svgAux la classe svgMtg pour que les affichages de texte utilisent une police serif interne au navigateur
  let svgAux = document.getElementById('mtgSvgAux')
  if (svgAux === null) {
    // on crée un div en fin de body pour y mettre le svgAux, en absolute et hidden, avec z-index -1 pour ne rien modifier visuellement
    // (taille fixe petite et overflow hidden pour ne jamais provoquer de scroll)
    // ATTENTION, ce code est aussi dans MtgAppLecteur
    const divSvgAux = ce('div', {
      style: 'font-family:Roboto; position:absolute; left:0; top:0; pointer-events:none; z-index:-1; visibility:hidden; overflow:hidden; width:100px;height:100px;'
    })
    // on passe par la propriété fontFamily plutôt que la string précédente pour des questions de quoting (ici pas de question à se poser)
    // divSvgAux.style.fontFamily = getComputedStyle(document.body).fontFamily
    document.body.appendChild(divSvgAux)

    // On crée un svg caché qui sera chargé de contenir tous les affichages de textes affichés provisoirement
    // pour connaître leur taille (nécessaire pour compatibilité avec les onglets de spip avec un chargement en display none)
    // Version 6.4 : On donne à svgAux la classe svgMtg pour que les affichages de texte utilisent une police serif interne au navigateur
    svgAux = cens('svg', {
      class: 'svgMtg',
      id: 'mtgSvgAux',
      width: w,
      height: h,
      visibility: 'hidden'
    })
    divSvgAux.appendChild(svgAux)
  } else {
    const waux = parseInt(svgAux.getAttribute('width'))
    const haux = parseInt(svgAux.getAttribute('height'))
    if (waux < w || haux < h) {
      svgAux.setAttribute('width', Math.max(w, waux))
      svgAux.setAttribute('height', Math.max(h, haux))
    }
  }
  /**
   * div centré sur l'écran pour les boîtes de dialogue
   * @type {HTMLDivElement}
   */
  this.divDlg = document.getElementById(idDivDlg) ?? ce('div', {
    id: idDivDlg,
    style: 'position:absolute;align:center;margin-left:auto;margin-right:auto;top:0px;width:' + w + 'px;height:450px;max-height: 80vh;pointer-events:none'
  })
  par.appendChild(this.divDlg)

  this.creeDefs()
  /**
     * Document contenant les macros constructions de base utilisées
     * @type {CMathGraphDoc}
     */
  this.docCons = new CMathGraphDoc('', true, true, this.decimalDot)
  ba = base64Decode(constructionsBase)
  inps = new DataInputStream(ba, constructionsBase)
  this.docCons.read(inps)
  /**
     * Document pour contenir les constructions avancées comme les courbes avec crochet
     * @type {CMathGraphDoc}
     */
  this.docConsAv = new CMathGraphDoc('', true, true, this.decimalDot)
  ba = base64Decode(constructions.constSup)
  inps = new DataInputStream(ba, constructions.constSup)
  this.docConsAv.read(inps)
  /**
   * ??
   * @type {Gestionnaire}
   */
  this.gestionnaire = new Gestionnaire(this)
  /**
     * tableau contenant les id des boîtes de dialogues ouvertes
     * @type {string[]}
     */
  this.dlg = []

  // Chargement du document de la figure
  // this.doc = new CMathGraphDoc(this.id + "figurePanel") // Modifié version 6.3.0
  /**
   * La figure
   * @type {CMathGraphDoc}
   */
  this.doc = new CMathGraphDoc(this.id, true, true, this.decimalDot) // Modifié version 6.2.4
  // Ligne suivante nécessaire pour que les macros d'activation et désactivation du mode trace activent ou non
  // l'icône correspondante
  this.doc.app = this

  // traitement de la figure à charger
  const datafig = ['string', 'object'].includes(typeof mtgOptions.fig) ? mtgOptions.fig : ''
  // Si on a demandé une figure prédéfinie avec un repère, on ne peut pas la créer tout de suite si c'est une
  // figure munie d'un repère car on a besoin de commaître de dimf de la figure et pour le connaître il faut
  // avoir déterminé le zoomFactor et ceci ne peut pas être fait à ce niveau
  let figInit = ''
  let datarep
  if (typeof datafig === 'string') {
    if (datafig === '') {
      // Modification version 7.3.5 : Si one précise rien on démarre avec une figure avec un repère orthonormal pâr défaut
      // this.initAvecRepereOrthonormal()
      figInit = 'repOrthonormal'
      this.doc.listePr.uniteAngle = uniteAngleDegre
    } else {
      if (datafig.indexOf('TWF0aEdy') === 0) {
        // Ça ressemble à une figure en base 64 valide, on la charge
        // this.doc = this.loadDoc(this.id + "figurePanel", datafig); // Modifié version 6.3.0
        this.doc = this.loadDoc(this.id, datafig)
      } else {
        // Sous electron quand on double clique sur un fichier pour l'ouvrir dataFig est une chaîne contenant un flux binaire
        const newdoc = this.getDocFromString(datafig)
        if (newdoc === null) {
          new AvertDlg(this, 'errInvFile')
          // this.initAvecLongueurUnite()
          figInit = 'unite'
          this.doc.listePr.uniteAngle = uniteAngleDegre
          if (this.electron) resetDocument() // eslint-disable-line no-undef
        } else {
          this.doc = newdoc
          // Pour qu'on puisse sauver la figure ouverte par un double clic
          if (this.electron) setNewPath('') // eslint-disable-line no-undef
        }
      }
      // Ligne suivante nécessaire pour que les macros d'activation et désactivation du mode trace activent ou non
      // l'icône correspondante
      this.doc.app = this
    }
  } else {
    // datafig est un object
    datarep = datafig.datarep
    const { type } = datafig

    switch (type) {
      case 'simple' :
        figInit = 'sansUnite'
        break
      case 'orthonormal' :
        figInit = 'repOrthonormal'
        /**
           * Préférence du type de figure au démarrage (frameGrid|frameDotted|unity)
           * @type {string}
           */
        this.pref_StartFig = datarep.quadhor ? 'frameGrid' : 'frameDotted'
        break
      case 'orthogonal' :
        figInit = 'repOrthogonal'
        break
      case 'unity' :
      default :
        figInit = 'unite'
        this.pref_StartFig = 'unity'
    }
  }

  const doc = this.doc
  doc.app = this
  /**
     * Raccourci pour la liste de tous les objets (idem this.doc.listePr)
     * @type {CListeObjets}
     */
  this.listePr = doc.listePr
  /**
   * nombre d'objets de la figure au chargement
   * @type {number}
   */
  this.nbObj = this.listePr.longueur()
  /// //////////////////////////////////////////////////////////////////////////////////////////////////
  // On regarde si c'est un exercice de construction et si on n'est pas en mode édition
  // Si oui this.listePourConst pointera sur une liste contenant les objets pour l'on peut utilier
  // quand l'utilisateur construit de nouveaux objets.
  // S'il s'agit d'un exercice de construction, this.estExercice est true et this.nbObjInit contient
  // le nombre initial d'objets
  /// //////////////////////////////////////////////////////////////////////////////////////////////////
  if (typeof datafig === 'string') {
    /**
     * ???
     * @type {CMacroApparition|null}
     */
    this.macroPourConst = this.getMacroPourConst()
    if (this.isExercise() && !this.editionConstruction) {
      /**
       * True si on est un exercice de construction (mais pas en édition)
       * @type {boolean}
       */
      this.estExercice = true
      // this.nbObjInit = mtgOptions.hasOwnProperty('resultatContenu') ? mtgOptions.resultatContenu.nbObjInit : this.listePr.longueur()
      // this.nbObjInit = mtgOptions.resultatContenu !== undefined ? mtgOptions.resultatContenu.nbObjInit : this.listePr.longueur()
      /**
       * Nb d'objets dans le résultat (passé par mtgOptions.resultatContenu) ou la figure
       * @type {number}
       */
      this.nbObjInit = (mtgOptions.resultatContenu && mtgOptions.resultatContenu.nbObjInit) || this.nbObj
      /**
       * ???
       * @type {CListeObjets}
       */
      this.listePourConst = this.listePourConstruction(this.nbObjInit)
      /**
       * Liste des index des objets à construire (dans la macro) ?
       * @type {number[]}
       */
      this.arrayObjAConst = this.arrayObjAConstruire()
      this.pref_PointsAuto = false
    } else {
      // pas un exo de construction (ou alors on l'édite)
      this.listePourConst = this.listePr
      this.estExercice = false
    }
  } else {
    // pas de figure passée
    this.macroPourConst = null
    this.listePourConst = this.listePr
    this.estExercice = false
  }
  if (mtgOptions.newFig !== undefined) {
    /**
     * Si true on affichera le bouton "nouvelle figure"
     * @type {boolean}
     */
    this.newFig = mtgOptions.newFig
  } else {
    this.newFig = this.electron || !this.estExercice
  }
  if (mtgOptions.options !== undefined) {
    /**
     * Si true on affichera le bouton options
     * @type {boolean}
     */
    this.options = mtgOptions.options
  } else {
    this.options = this.electron || !this.estExercice
  }

  // Création des 4 listes servant à créer une nouvelle construction
  /** @type {CSousListeObjets} */
  this.listeSrcNG = new CSousListeObjets(this.listePr)
  /** @type {CSousListeObjets} */
  this.listeSrcG = new CSousListeObjets(this.listePr)
  /** @type {CSousListeObjets} */
  this.listeFinNG = new CSousListeObjets(this.listePr)
  /** @type {CSousListeObjets} */
  this.listeFinG = new CSousListeObjets(this.listePr)

  /**
   * Panneau ?
   * @type {SVGElement}
   */
  this.svgPanel = cens('svg', {
    x: 0,
    y: 0,
    width: w,
    height: h
  })
  this.svgPanel.style.PointerEvents = 'none'
  this.svgPanel.style.cursor = 'default'

  // Création des outils de création et manipulation d'objets
  this.creeOutils()
  // On détermine le zoomFactor en tenant compte des outils disponiibles
  // Le zoomfactor est utilisé pour agrandir (ou réduire les icônes)
  this.setZoomFactor(w, h)

  /**
   * Dimensions de la fenêtre
   * @type {Dimf}
   */
  const zf = this.zoomFactor

  /**
   * Barre d'outils
   * @type {SVGElement}
   */
  this.toolBar = cens('svg', {
    x: constantes.svgPanelWidth * zf,
    y: 0,
    width: w,
    height: constantes.toolbarHeight * zf
  })
  this.toolBar.style.cursor = 'default'
  svg.appendChild(this.toolBar)

  this.creeBoutonsOutils()

  /// /////////////////////////////////////////////////////////////////////////////////////////////
  // On met à jour les icônes de la barre horizontale en tenant compte du niveau choisi (préfini ou personnalisé)
  this.updateToolbar()
  /// /////////////////////////////////////////////////////////////////////////////////////////////
  // Version 8.4 : On crée un svgGlob qui va contenir à la fois le svgFigure contenant les éléments svg de la figure
  // et un svgLens qui sera une réplique via use du svg de la figure , réplique qu'on utilise pour obtenir
  // une loupe au voisinage d'un point capturé sur écran tactile
  const widthForFig = String(Math.round(w - constantes.svgPanelWidth * zf - constantes.rightPanelWidth * zf))
  const heightForFig = String(Math.round(h - constantes.topIconSize * zf))
  // Le cercle servant à clipper la vue sur la réplique du svgFigure
  this.circleClip = cens('circle', {
    cx: '0',
    cy: '0',
    r: String(radiusLens / ratioLens)
  })
  const clip = cens('clipPath', {
    id: 'clipLoupe'
  })
  clip.appendChild(this.circleClip)
  // On va mettre les svg de la figure dans un foreignObject de façon à pouvoir avoir une
  // figure éventuellement plus grande que le cadre qui lui est alloué dans l'interface
  const foreignObject = cens('foreignObject', {
    x: constantes.svgPanelWidth * zf,
    y: constantes.toolbarHeight * zf,
    width: widthForFig,
    height: heightForFig,
    style: 'border:0px;pointer-events:all;overflow:auto;'
  })
  svg.appendChild(foreignObject)
  // Pour la version 9.0.3 on avait mis directement le svgGlog dans le foreign object
  // cela fonctionnait sur chrome mais pas sur FireFox et pas sur Apple où on n'avait pas de scollbars dans le foreign object
  // Il faut donc mettre dans le foreign object un div qui lui supportera des scrollBars (ou le scrolling par glissement)
  this.figContainer = ceIn(foreignObject, 'div', {
    width: widthForFig,
    height: heightForFig,
    style: `border:0px;overflow:auto;pointer-events:all;width:${widthForFig}px;height:${heightForFig}px;`
  })
  // On retire 4 pixels à la largeur et hauteur des svg car sinon on a des barres d'ascenseurs
  // inutiles
  const svgWidth = Math.max(widthForFig, doc.dimMinFig.x) - 4
  const svgHeight = Math.max(heightForFig, doc.dimMinFig.y) - 4
  this.dimf = new Dimf(svgWidth, svgHeight) // Dimensions de la figure y-compris ce qui est éventuellement hors cadre
  doc.dimf = this.dimf
  this.svgGlob = cens('svg', {
    class: 'svgMtg',
    id: 'svgGlob',
    'shape-rendering': 'geometricPrecision',
    x: 0,
    y: 0,
    width: svgWidth,
    height: svgHeight
  })
  this.figContainer.appendChild(this.svgGlob)
  this.svgGlob.appendChild(clip)

  /**
   * svg de la figure
   * @type {SVGElement}
   */
  this.svgFigure = cens('svg', {
    class: 'svgMtg',
    id: this.id + 'figurePanel',
    'shape-rendering': 'geometricPrecision',
    x: '0',
    y: '0',
    width: svgWidth,
    height: svgHeight
  })
  this.svgFigure.containerDiv = svg.parentElement
  this.svgFigure.figContainer = this.figContainer // Le foreign Object qui contient les svg de la figure
  // On a besoin de connaitre les dimensions de la zone de travail quand on affiche les
  // panneaux éventuels associés à des variables
  // On les mémorise dans le svg de la figure pour être compatible avec le mtgAppLecteur qui peut gérer plusieurs figures
  this.svgFigure.dimWork = new Dimf(widthForFig, heightForFig) // Dimensions de la partie visible de la figure
  this.svgLens = cens('use', {
    href: '#' + this.id + 'figurePanel'
  })
  this.svgLens.style.clipPath = 'url(#clipLoupe)'
  this.svgLens.style.opacity = svgLensOpacity
  this.svgLens.setAttribute('display', 'none')
  this.svgGlob.appendChild(this.svgFigure)
  this.svgGlob.appendChild(this.svgLens)
  this.svgGlob.style.pointerEvents = 'all'
  // Ajout version 6.5.2 : On a besoin de connaître le zoomFactor de l'application quand on positionne
  // les éditeurs de formule et les dialogues associés aux variables
  this.svgFigure.zoomFactor = this.zoomFactor
  this.svgFigure.style.pointerEvents = 'all'
  // Une fois qu'on connaît les dimensions allouées à la figure et si une figure prédéfinie a été demandé
  // on peut la créer à ce niveau
  if (figInit) {
    let quadhor = true
    let quadver = true
    let grid = false
    if (datarep) {
      quadhor = datarep.quadhor
      quadver = datarep.quadver
      grid = datarep.grid
    }
    switch (figInit) {
      case 'repOrthonormal': {
        this.initAvecRepereOrthonormal(uniteAngleDegre, quadhor, quadver, grid, false, 'simple')
        break
      }
      case 'repOrthogonal':
        this.initAvecRepereOrthogonal(uniteAngleDegre, quadhor, quadver, grid, false, 'simple')
        break
      case 'unite':
        this.initAvecLongueurUnite(uniteAngleDegre)
        break
      case 'sansUnite':
        this.initSansLongueurUnite(uniteAngleDegre)
    }
  }
  // On donne la possibilité de faire un drag and drop d'une figure mtg32
  this.svgGlob.addEventListener('drop', function (ev) {
    self.onDropFile(ev)
  })
  this.svgGlob.addEventListener('dragover', function (ev) {
    ev.stopPropagation()
    preventDefault(ev)
    ev.dataTransfer.dropEffect = 'copy'
  })
  svg.appendChild(this.svgPanel) // Le svgPanel doit être au-dessus du svg de la figure pour qu'on voie les barres déroulantes
  /**
   * Panneau de droite avec les styles ?
   * @type {SVGElement}
   */
  this.rightPanel = cens('svg', {
    x: Math.floor(w - constantes.rightPanelWidth * zf),
    // y : 0, // On laisse un peu de place pour les tips
    y: constantes.toolbarHeight * zf + 26,
    width: constantes.rightPanelWidth * zf,
    height: h - constantes.topIconSize * zf
  })
  this.rightPanel.style.cursor = 'default'
  svg.appendChild(this.rightPanel)
  // Création outils de pointage
  this.creeOutilsPointage()

  /**
     * True si on est en mode bilan (à priori dans LaboMep)
     * @type {boolean}
     */
  this.modeBilan = Boolean(mtgOptions.resultatContenu) // True si on est en

  // this.opacity = doc.opacity
  const li = new CListeObjets()
  li.ajoutePointsPunaises(doc.listePr)
  /**
     * ?
     * @type {CListeObjets}
     */
  this.listeARecalculer = new CListeObjets()
  /**
     * ?
     * @type {CListeObjets}
     */
  this.listeObjetsVisuels = new CListeObjets()
  this.listeObjetsVisuels.associeA(doc)
  /**
     * L'éventuel élément capturé
     * @type {null|COb}
     */
  this.elementCapture = null // Spécifique version mtgApp
  /**
     * Objets pour gérer le clignotement utilisé par les outils de création
     * @type {CListeObjets}
     */
  this.listeClignotante = new CListeObjets()
  /**
     * ?
     * @type {boolean}
     */
  this.clignotementPair = true
  /**
     * Point qui servira à suivre les mouvements de la souris
     * @type {CPointBase}
     */
  this.mousePoint = new CPointBase(this.listePr, null, false, Color.black, true, 0, 0, true, '', 13, MotifPoint.petitRond, false, false, 0, 0)
  //
  // Spécial JavaScript. Chaque document aura un membre pointCapture
  /**
     * Les objets qu'on ne peut pas désigner
     * @type {CListeObjets}
     */
  this.listeExclusion = li
  /**
     * ?
     * @type {InfoProx}
     */
  this.infoProx = new InfoProx()
  // Un affichage de texte pour afficher la nature des objets à désigner quand la souris bouge
  this.creeCommentaireDesignation()

  // Modifié version 6.3.0
  /*
    this.commentaireTip = new CCommentaire(li, null, false, Color.black, 0, 0, 0, 6, true, null,
      this.dys ? 16 : 14, StyleEncadrement.Effet3D,
      true, Color.yellow, CAffLiePt.alignHorRight, CAffLiePt.alignVerTop, "", new CValeurAngle(this.listePr, 0))
      */
  /**
     * Un affichage de texte pour afficher une sorte de tipTool quand la souris survole un bouton
     * @type {CCommentaire}
     */
  this.commentaireTip = new CCommentaire(this.listePr, null, false, Color.black, 0, 0, 0, 6, true, null,
    this.dys ? 16 : 14, StyleEncadrement.Effet3D,
    true, Color.yellow, CAffLiePt.alignHorRight, CAffLiePt.alignVerTop, '', new CValeurAngle(this.listePr, 0))

  // Contrairement à la version Java il faut afficher même vide
  this.commentaireTip.positionne()
  this.commentaireTip.affiche(this.svgPanel, false, doc.couleurFond)
  //

  // On mémorise les gestionnaires de souris et de touch pour pouvoir éventuellement les détruire
  this.onmdown = function (evt) {
    if (self.hasBarExpanded()) {
      const eb = self.getExpandedBar()
      if (eb !== null) {
        const { x, y } = mousePosition(self.svgFigure, evt, self.zoomFactor)
        // On regarde si on a cliqué dans le figure et en dehors de la barre déroulée
        // Si oui on replie la barre
        // Ici nécesaire de mettre un setTimeOut car sinon si on clique sur un bouton le temps qu'il
        // réponde la barre sera déjà repliée
        if (x >= constantes.svgPanelWidth * zf && !((x <= eb.right) && (y >= eb.top) && (y <= eb.bottom))) {
          setTimeout(function () {
            self.unFoldExpandableBars()
          }, 500)
        }
      }
    }
    // On ne traite les événements souris que si une boîte de dialogue n'est pas ouverte
    if (self.dlg.length === 0 && self.doc.isActive) {
      self.outilPointageActif.mousedown(evt)
      // Ajout version 7.6
      // Si l'utilisateur a demandé d'affecter une action supplémentaire à onmousemove
      if (doc.cbmap && doc.cbmap.has('mousedown')) {
        const { x, y } = mousePosition(self.svgFigure, evt, self.zoomFactor)
        doc.cbmap.get('mousedown')(evt, x, y)
      }
    }
  }
  this.onmmove = function (evt) {
    // On ne traite les événements souris que si une boîte de dialogue n'est pas ouverte
    const doc = self.doc
    doc.hasMouse = true
    if (self.dlg.length === 0 && self.doc.isActive) {
      self.outilPointageActif.mousemove(evt)
      // Ajout version 7.6
      // Si l'utilisateur a demandé d'affecter une action supplémentaire à onmousemove
      if (doc.cbmap && doc.cbmap.has('mousemove')) {
        const { x, y } = mousePosition(self.svgFigure, evt, self.zoomFactor)
        doc.cbmap.get('mousemove')(evt, x, y)
      }
      document.body.style.cursor = self.outilActif.cursor
    }
  }
  this.onmup = function (evt) {
    // On ne traite les événements souris que si uen boîte de dialogue n'est pas ouverte
    const doc = self.doc
    if (self.dlg.length !== 0 || !self.doc.isActive) return
    self.releaseSliders() // Pour que quand on capture un slider à droite il soit relaché quand on clique en dehors
    self.cacheDesignation() // Pour éviter des affichages qui restent sur  l'écran après création d'objets
    self.outilPointageActif.mouseup(evt)
    // Ajout version 7.6 : Si l'utilisateur a demandé d'affecter une action supplémentaire à onmousedown
    if (doc.cbmap && doc.cbmap.has('mouseup')) {
      const { x, y } = mousePosition(self.svgFigure, evt, self.zoomFactor)
      doc.cbmap.get('mouseup')(evt, x, y)
    }
  }
  /**
   * Listener touchstart (actif, on appelle le touchstart des outils de pointage qui appelle devicedown qui fera du preventDefault)
   * @param evt
   */
  this.ontstart = function (evt) {
    const doc = self.doc
    if (self.hasBarExpanded()) {
      const eb = self.getExpandedBar()
      if (eb !== null) {
        const { x, y } = touchPosition(self.svgFigure, evt, self.zoomFactor)
        // On regarde si on a cliqué dans le figure et en dehors de la barre déroulée
        // Si oui on replie la barre
        // Ici nécesaire de mettre un setTimeOut car sinon si on clique sur un bouton le temps qu'il
        // réponde la barre sera déjà repliée
        if (x >= constantes.svgPanelWidth * zf && !((x <= eb.right) && (y >= eb.top) && (y <= eb.bottom))) {
          setTimeout(() => self.unFoldExpandableBars(), 500)
        }
      }
    }
    // On ne traite les événements souris que si une boîte de dialogue n'est pas ouverte
    if (self.dlg.length === 0 && self.doc.isActive) self.outilPointageActif.touchstart(evt)
    // Ajout version 7.6 : Si l'utilisateur a demandé d'affecter une action supplémentaire à onmousedown
    if (doc.cbmap && doc.cbmap.has('touchstart')) {
      const { x, y } = touchPosition(self.svgFigure, evt, self.zoomFactor)
      doc.cbmap.get('touchstart')(evt, x, y)
    }
  }
  this.ontmove = function (evt) {
    const doc = self.doc
    // On ne traite les événements souris que si uen boîte de dialogue n'est pas ouverte
    if (self.dlg.length !== 0 || !self.doc.isActive) return
    self.outilPointageActif.touchmove(evt)
    // Ajout version 7.6 : Si l'utilisateur a demandé d'affecter une action supplémentaire à ontouchmove
    if (doc.cbmap && doc.cbmap.has('touchmove')) {
      const { x, y } = touchPosition(self.svgFigure, evt, self.zoomFactor)
      doc.cbmap.get('touchmove')(evt, x, y)
    }
    document.body.style.cursor = self.outilActif.cursor
    if (self.outilActif.isWorking()) {
      // Pour éviter que quand on capture un élément on fasse dérouler la figure
      preventDefault(evt)
      evt.stopPropagation()
    }
  }
  this.ontend = function (evt) {
    const doc = self.doc
    self.cacheDesignation() // Pour éviter des affichages qui restent sur  l'écran après création d'objets
    self.releaseSliders() // Pour que quand on capture un slider à droite il soit relaché quand on clique en dehors
    // On ne traite les événements souris que si uen boîte de dialogue n'est pas ouverte
    if (self.dlg.length === 0 && self.doc.isActive) self.outilPointageActif.touchend(evt)
    // Ajout version 7.6 : Si l'utilisateur a demandé d'affecter une action supplémentaire à ontouchend
    if (doc !== null && doc.cbmap && doc.cbmap.has('touchend')) {
      doc.cbmap.get('touchend')(evt)
    }
  }
  this.ontcancel = function (evt) {
    const doc = self.doc
    self.cacheDesignation() // Pour éviter des affichages qui restent sur  l'écran après création d'objets
    self.releaseSliders() // Pour que quand on capture un slider à droite il soit relaché quand on clique en dehors
    // On ne traite les événements souris que si une boîte de dialogue n'est pas ouverte
    if (self.dlg.length === 0 && self.doc.isActive) self.outilPointageActif.touchcancel(evt)
    // Ajout version 7.6 : Si l'utilisateur a demandé d'affecter une action supplémentaire à ontouchcancel
    if (doc !== null && doc.cbmap && doc.cbmap.has('touchcancel')) {
      doc.cbmap.get('touchcancel')(evt)
    }
  }
  const activeListenerOpts = { capture: false, passive: false }
  // Depuis la version 8.4 c'est le svg global  qui répond aux événements souris et plus un rectangle plaqué sur la figure
  this.svgGlob.addEventListener('mousedown', this.onmdown, false)
  this.svgGlob.addEventListener('mousemove', this.onmmove, false)
  this.svgGlob.addEventListener('mouseup', this.onmup, false)
  this.svgGlob.addEventListener('touchstart', this.ontstart, activeListenerOpts)
  this.svgGlob.addEventListener('touchmove', this.ontmove, activeListenerOpts)
  // ces deux là devraient pouvoir être passifs, mais les marquer passifs empêchera qqun qui ajouterait un listener via
  // la méthode addSvgListener de l'api de faire du preventDefault() (c'est ignoré sur les listener passifs)
  this.svgGlob.addEventListener('touchend', this.ontend, false)
  this.svgGlob.addEventListener('touchcancel', this.ontcancel, false)

  this.gestionnaire.initialise()
  /**
     * Éditeur de formule pour entrer les noms de points et droites à la volée
     * @type {NameEditor}
     */
  this.nameEditor = new NameEditor(this)
  /**
     * macro d'animation de point lié qui servira pour les animations directes
     * @type {CMacroAnimationFigure}
     */
  this.macroAnimation = new CMacroAnimationFigure(this)

  this.prepareTracesEtImageFond()
  // Pour chaque variable associée à un affichage de valeur avec boutons plus et moins on crée un div
  this.listePr.creePaneVariables()
  // Au démarrage l'outil actif est l'outil de capture
  /**
     * Outil courant
     * @type {OutilCapt}
     */
  this.outilActif = this.outilCapt
  /**
     *
     * @type {OutilCapt}
     */
  this.outilActifPrec = this.outilCapt
  this.thickness = this.dys ? 2 : 1
  this.updateRightPanel()

  // Sur un exercice de construction, en mode élève ou en mode aperçu,
  // on recalcule aléatoirement la figure
  let brandom = Boolean(mtgOptions.brandom)
  if (this.estExercice && (this.functionOnSave || this.preview)) brandom = true
  const callback = typeof mtgOptions.callBackAfterReady !== 'function'
    ? null
    : mtgOptions.callBackAfterReady.bind(null, this)
  // display est async, on utilise notre
  // Si on a défini unt fonction callBackAfterReady on la passe en paramètre à calculateAndDisplay
  // pour qu'elle soit mise sur la mile après toutes les opérations d'affichage
  // On initialise les dimensions du cadre de sélection.
  // Ces dimensions pourront être modifiées soit en capturant le cadre avec l'outil de capture
  // soit via la boîte de dialogue d'options de la figure
  const widthCadre = Math.floor(Number(widthForFig)) - 24
  const heightCadre = Math.floor(Number(heightForFig)) - 24
  this.createCadre(widthCadre, heightCadre, false) // Cadre caché au départ
  this.calculate(brandom)
  // On crée les barres de menu déroulables horizontales
  // Cela dott être fait après le calcul de la figure pour que les bons outils soient affichés
  // dans les barres d'outils
  this.creeExpandableBars()
  this.updateToolbar()

  if (this.displayOnLoad) {
    // Ne pas utiliser ici une fonction fléchée celà ne marche pas
    addQueue(function () {
      self.display(callback)
    })
  }

  // La figure est maintenant prête pour être modifiée (utile pour les exercices de construction)
  // Si mtgOptions.zoomOnWheel est à true ou si on est dans la version electron, on ajoute un listener
  // sur le SVG de la figure pour zoomer ou dézoomer sur la figure
  // On mémorise le zoomOnWheel qu'on doit pouvoir modifier dans OptionsFigDlg
  this.zoomOnWheel = Boolean(mtgOptions?.zoomOnWheel)
  if (this.zoomOnWheel) addZoomListener(this.doc, this.svgFigure, this.svgGlob) // Ajoute au doc le listener sur le wheel
  addQueue(() => this.activeOutilsDem())
} // MtgApp

/**
 * Annule la pile des actions en cours (affichages et chargements)
 */
MtgApp.prototype.abort = function () {
  abort()
}

/**
 * Fonction sélectionnant l'outil actif au démarrage : L'outil d'exécution de macro si une macro est visible
 * sinon l'outil de capture
 */
MtgApp.prototype.activeOutilsDem = function () {
  if (this.listePr.nombreObjetsParNatureVisibles(NatObj.NMacro) > 0) {
    this.outilActif.deselect()
    this.outilActif = this.outilExecutionMacro
    this.outilActif.select()
  } else this.activeOutilCapt()
  const doc = this.doc
  if (doc.modeTraceActive) this.buttonModeTrace.activate(true)
  this.buttonModeAutoComplete.activate(this.autoComplete)
  this.buttonUseLens.activate(this.useLens)
}

/**
 * @returns {void}
 */
MtgApp.prototype.prepareTracesEtImageFond = function () {
  const doc = this.doc

  // Un rectangle pour la couleur de fond de la figure
  this.svgFigure.appendChild(cens('rect', {
    id: 'coulFond',
    width: '100%',
    height: '100%',
    fill: doc.couleurFond.rgb()
  }))
  doc.gTraces = cens('g', {
    id: doc.idDoc + 'Traces'
  })
  this.svgFigure.appendChild(doc.gTraces)
  if (doc.imageFond !== null) {
    const g = cens('image', {
      x: '0',
      y: '0',
      width: doc.widthImageFond,
      height: doc.heightImageFond,
      'pointer-events': 'none' // Ajout version 6.3.4
    })
    g.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'data:image/png;base64,' + base64Encode(doc.imageFond, true))
    this.gImageFond = g
    this.svgFigure.insertBefore(g, doc.gTraces)
    if (!doc.imageFondVisible) $(g).css('visibility', 'hidden')
  }
}
/**
 * Fonction renvoyant un CmathGraphDoc d'id id et représenté par la chaîne Base64 base64
 * @param {string} id
 * @param {string} base64
 * @returns {CMathGraphDoc}
 */
MtgApp.prototype.loadDoc = function (id, base64) {
  const doc = new CMathGraphDoc(id, true, true, this.decimalDot)
  const ba = base64Decode(base64)
  const inps = new DataInputStream(ba)
  doc.read(inps)
  return doc
}
/**
 * Retourne le code base64 de la figure courante
 * @returns {string}
 */
MtgApp.prototype.getBase64Code = function () {
  return this.doc.getBase64Code()
}

/**
 * Retourne un objet MtgOptions ne comportant que les valeurs indispensables pour la version webapp
 * c'est-à-dire celles qui peuvent etre paramétrées via le menu Options de la figure
 * @returns {MtgOptions}
 */
MtgApp.prototype.getCurrentOptions = function () {
  // pour ce qui est de python/js, ça ne peut pas être ajouté au runtime dans l'appli,
  // et n'est pas stocké dans l'appli, seulement utilisé au chargement
  return {
    autoComplete: this.autoComplete,
    decimalDot: this.decimalDot,
    displayMeasures: this.displayMeasures,
    dys: this.dys,
    language: this.language,
    level: Number.isInteger(this.levelIndex)
      ? String(this.levelIndex) // c'est un niveau prédéterminé, on le retourne
      : String(this.level), // le CMathgraphDoc du niveau (le cast en string le retourne en base64)
    useLens: this.useLens,
    zoomOnWheel: this.zoomOnWheel,
  }
}

/**
 * Retourne l'url permanente de la figure courante dans un éditeur avec les prefs courantes
 * @returns {string}
 */
MtgApp.prototype.getPermanentUrl = function () {
  const opts = this.getCurrentOptions()
  const params = new URLSearchParams(opts)
  return constantes.pwaBaseUrl + '#' + params.toString() + '&fig=' + this.getBase64Code()
}

/**
 * Fonction chargeant dans this.levels[] les 4 documents servant à filtrer les outils suivant le niveau d'utilisation
 * demandé
 */
MtgApp.prototype.loadLevels = function () {
  /** @type {CMathGraphDoc[]} */
  this.levels = []
  for (let i = 0; i < 4; i++) {
    this.levels[i] = this.loadDoc('', levels[i])
  }
}

/**
 * Fonction donnant à this.doc une image de fond contenu dans file et appelant callBackOK en cas de succès
 * @param {Blob} file
 * @param {function} [callBackOnOK=null]
 */
MtgApp.prototype.setImageFond = function (file, callBackOnOK = null) {
  const self = this
  let imgType = file.name.split('.')
  imgType = imgType[imgType.length - 1].toLowerCase() // On utilise toLowerCase() pour éviter les extensions en majuscules
  const allowedTypes = ['png', 'jpg', 'jpeg', 'gif']
  const ind = allowedTypes.indexOf(imgType)
  if (ind !== -1) {
    const natImage = DataOutputStream.getNatImage(imgType)
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.addEventListener('load', function () {
      const database64 = reader.result
      const tab = database64.split(',')
      const image = ce('img', {
        src: database64
      })
      image.onload = function () {
        const doc = self.doc
        doc.widthImageFond = image.width
        doc.heightImageFond = image.height
        doc.natImageFond = natImage
        doc.imageFond = base64Decode(tab[tab.length - 1], true)
        const g = cens('image', {
          x: '0',
          y: '0',
          width: image.width,
          height: image.height
        })
        g.setAttributeNS('http://www.w3.org/1999/xlink', 'href', database64)
        self.svgFigure.insertBefore(g, doc.gTraces)
        self.gImageFond = g
        doc.imageFondVisible = true
        if (callBackOnOK !== null) callBackOnOK()
      }
    })
  } else new AvertDlg(this, 'FichierErr')
}

MtgApp.prototype.deleteImageFond = function () {
  this.svgFigure.removeChild(this.gImageFond)
  this.doc.natImageFond = DataOutputStream.nat_noImage
  this.doc.imageFond = null
}
/**
 * Recalcule la figure et l'affiche
 * @param {boolean} [brandom=false] Passer true pour que tous les calculs avec rand() sont recalculés (pour fournir de nouveaux résultats aléatoires).
 * @param {VoidCallback} [callback] Fonction de callback passée en paramètre à display pour qu'elle
 * soit appelée après toutes les opérations d'affichage
 * @returns {void}
 */
MtgApp.prototype.calculateAndDisplay = function (brandom = false, callback) {
  this.calculate(brandom)
  this.display(callback)
}
/**
 * Lance l'éventuelle macro de démarrage et positionne les éléments
 * @param {boolean} [brandom=false] Passer true pour que tous les calculs avec rand() sont recalculés (pour fournir de nouveaux résultats aléatoires).
 */
MtgApp.prototype.calculate = function (brandom = false) {
  let j
  const doc = this.doc
  const liste = this.listePr
  const svg = this.svgFigure
  const dimf = this.dimf
  const macroDem = liste.macroDemarrage
  if (macroDem !== null) {
    // Ajout version 5.1
    macroDem.setMacroLanceuse(null)
    //
    if (macroDem.className === 'CMacroSuiteMacros') {
      for (j = 0; j < macroDem.listeAssociee.longueur(); j++) {
        macroDem.listeAssociee.get(j).execute(svg, dimf, doc.couleurFond, false)
      }
    } else {
      // Version 4.9.7 : Ajout d'un dernier paramètre pour que la macro ne crée pas d'élements graphiques
      liste.macroDemarrage.execute(svg, dimf, doc.couleurFond, false)
    }
  }
  liste.positionneFull(brandom, dimf)
}
/**
 * Charge MathJax si nécessaire et lance l'affichage (en général il faut appeler calculate avant)
 * @returns {Promise<boolean|undefined>} La promesse résolue quand afficheTout aura fini
 * @param {VoidCallback} [callback] Fonction de callback passée en paramètre à afficheTout pour qu'elle
 * soit appelée après toutes les opérations d'affichage (idem attendre que la promesse retournée soit résolue)
 */
MtgApp.prototype.display = function display (callback) {
  // Pour l'appli le fetchMtgApp a toufours chargé le LaTex qui est donc disponible ici
  this.listePr.setReady4MathJax()
  // ce qui précède est du code sync, mais il a pu mettre des trucs en queue, au cas où on passe ça après
  return addQueue(() => this.afficheTout(callback))
}

MtgApp.prototype.executeMacro = function (nameMacro) {
  const id = this.id
  this.listePr.executeMacro(nameMacro, document.getElementById(id + 'figurePanel'))
}

/**
 * Fonction appelée lors d'un reclassement d'objets.
 * Elle détruit toutes les implémentations graphiques d'objets pour les reconstruire dans le nouvel ordre des objets.
 * @returns {Promise<void>} Promesse qui sera résolue quand l'affichage sera terminé
 */
MtgApp.prototype.reCreateDisplay = function () {
  const list = this.listePr
  const svg = this.svgFigure
  this.removeSurfacePatterns()
  list.removegElements(svg)
  list.setReady4MathJax()
  return addQueue(this.afficheTout.bind(this))
}

/**
 * Utilisée en callback appelée lorsque MathJax a traité toutes les formules
 * en LaTeX et que la figure est prête pour affichage.
 * @param {VoidCallback} [callback] Fonction de callback passée en paramètre à liste.afficheTout pour qu'elle
 * soit appelée après toutes les opérations d'affichage
 */
MtgApp.prototype.afficheTout = function (callback) {
  const doc = this.doc
  const svg = this.svgFigure
  const liste = doc.listePr
  // Dernier paramètre immediat à true rajouté pour version 6.6.4
  // Mis à false version 6.7.2 pour que l'affichage soit rajouté à la pile d'appels
  liste.afficheTout(0, svg, true, doc.couleurFond, false, callback)
}

MtgApp.prototype.creeCommentaireDesignation = function () {
  /** @type {CCommentaire} */
  this.commentaireDesignation = new CCommentaire(this.listePr, null, false, Color.red, 0, 0, 0, 6, true, null,
    this.dys ? 18 : 13, StyleEncadrement.Sans, false, Color.white, CAffLiePt.alignHorRight, CAffLiePt.alignVerTop, '',
    new CValeurAngle(this.listePr, 0))
  // Contrairement à la version Java il faut afficher même vide
  this.commentaireDesignation.positionne()
  this.commentaireDesignation.affiche(this.svgFigure, false, this.doc.couleurFond)
}

MtgApp.prototype.actionClignotement = function () {
  // Version 6.9.0 : Dans Labomep ou la bibli, si on comment à utiliser un outil qui, par exemple,
  // fait clignoter un premier point et qu'on quitte on peut avoir des erreurs qui ne s'arrêtent plus
  // car le timer de clignotement est toujours présent d'où le try catch
  try {
    if (this.outilActif.timer === null) return
    this.clignotementPair = !this.clignotementPair
    this.listeClignotante.montreTout(this.clignotementPair)
    // Version 6.7.2 : Il faut passer un dernier paramètre byBlock à false car sinon il est true pas défaut
    this.listeClignotante.update(this.svgFigure, this.doc.couleurFond, true, false)
  } catch (e) {
    this.outilActif.annuleClignotement()
  }
}
/**
 * Fonction retirant tous
 * les éléments graphiques du svg de la figure.
 * @returns {void}
 */
MtgApp.prototype.retireTout = function () {
  // Modification version 6.3.5 : On met d'abord la variable hasgElement de tous les objets graphiques à false car
  // une fonction de callback peut encore être appelée demandant un update des éléments graphiques
  const list = this.listePr
  for (const el of list.col) {
    if (el.estDeNature(NatObj.NTtObj)) {
      el.hasgElement = false
    }
    // Il faut que le hasgElement soit mis à false avant les 3 ligne suivantes car le deleteEditor
    // va engendrer un événemet onblur sur l''éditeur et celui-ci ne doit pas être traité
    if (el.estDeNature(NatObj.NEditeurFormule)) {
      el.deleteEditor()
    }
  }
  // On retire d'abord tous les enfants du svg
  const svg = this.svgFigure
  const self = this
  // Version 6.4.0 : Pas d'utilisationd e la pile MathJax car alors on retire tout y compris le svg de traces.
  /*
  addQueue(function () {
    while (svg.childNodes.length !== 0) svg.removeChild(svg.childNodes[0])
  })
  */
  while (svg.childNodes.length !== 0) svg.removeChild(svg.childNodes[0])
  self.removeSurfacePatterns()
}

MtgApp.prototype.cacheDesignation = function () {
  if (this.commentaireDesignation.masque) return
  this.commentaireDesignation.cache()
  $(this.commentaireDesignation.g).attr('visibility', 'hidden')
}

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {string} ch
 */
MtgApp.prototype.setDesignation = function (x, y, ch) {
  const com = this.commentaireDesignation
  const svg = this.svgFigure
  if (com.masque) com.montre()
  com.donneChaine(getStr(ch))
  com.placeNom(x, y)
  com.positionne()
  // Pour que le commentaire de désigantion soit bien visible on le met toujours en fin des objets du svg
  try {
    svg.removeChild(com.g)
  } catch (e) {
    console.error(e)
  }
  svg.appendChild(com.g)
  this.commentaireDesignation.update(svg)
}

/**
 * Fonction mettant dans this.commentaireTip le texte contenu dans src.tip
 * src peut être un bouton de la barre de gauche, du haut ou un composant de la barre d'outils de droite
 * Pour les composants de la barre d'outil de droite ils doivent posséder un this.y qui
 * indique la ligne d'affichage du tip.
 * @param {TippedElt} src
 */
MtgApp.prototype.setTip = function (src) {
  let x, y, xg
  const zf = this.zoomFactor
  // Version 6.6.1 : Ajout d'un try-catch suite à rapport BusNag
  try {
    if (this.commentaireTip.masque) this.commentaireTip.montre()
    this.commentaireTip.donneChaine(src.tip)
    const c = src.container
    const tf = c.getAttribute('transform')
    const a = tf.indexOf('(')
    let b = tf.indexOf(',')
    if (b === -1) b = tf.indexOf(' ')
    const nov = b === -1
    if (nov) b = tf.length
    const tx = parseInt(tf.substring(a + 1))
    const ty = nov ? 0 : parseInt(tf.substring(b + 1))
    this.commentaireTip.alignementHorizontal = CAffLiePt.alignHorLeft
    // Sous explorer on peut avoir un attribut du type translate() avec un seul argument
    switch (src.target) {
      case 'left' :
        x = tx + constantes.leftIconSize * zf + 5
        y = ty + constantes.leftIconSize * zf + 2
        break
      case 'top' :
        x = tx + constantes.topIconSize * zf
        y = ty + constantes.topIconSize * zf + 2
        break
      case 'right' :
        this.commentaireTip.alignementHorizontal = CAffLiePt.alignHorRight
        x = parseInt(this.rightPanel.getAttribute('x')) - 10
        y = src.y + constantes.toolbarHeight * zf + 20
        break
      case 'float' : // Outils de la palette d'outils supplémentaire
        this.commentaireTip.alignementHorizontal = CAffLiePt.alignHorRight
        xg = parseInt($('#svgToolsAdd').attr('x'))
        x = xg + tx
        y = ty + constantes.topIconSize * zf
    }
    this.commentaireTip.placeNom(x, y)
    this.commentaireTip.positionne()
    this.commentaireTip.update(this.svgPanel)
    src.tipDisplayed = true
  } catch (error) {
    console.error(error)
  }
}

/**
 *
 * @param {Button} btn
 */
MtgApp.prototype.cacheTip = function (btn) {
  this.annuleTipsButtons()
  const c = this.commentaireTip
  if (arguments.length > 0) {
    btn.tipDisplayed = false
    if (c.chaineAffichage !== btn.tip) return
  }
  if (c.masque) return
  this.commentaireTip.cache()
  $(this.commentaireTip.g).attr('visibility', 'hidden')
}
/**
 *
 * @returns {Color}
 */
MtgApp.prototype.getCouleur = function () {
  const color = this.couleurActive
  return new Color(color.red, color.green, color.blue, this.opacity)
}
/**
 * Retourne le style du point (une des valeurs de MotifPoint)
 * @returns {number}
 */
MtgApp.prototype.getStylePoint = function () {
  return this.stylePoint
}
/**
 *
 * @returns {number}
 */
MtgApp.prototype.getTaillePoliceNom = function () {
  return this.pref_TaillePoliceNom
}
/**
 *
 * @returns {number}
 */
MtgApp.prototype.getStyleMarqueSegment = function () {
  return this.styleMarqueSegment
}

MtgApp.prototype.getStyleMarqueAngle = function () {
  return this.styleMarqueAngle
}
/**
 *
 * @returns {number}
 */
MtgApp.prototype.getStyleFleche = function () {
  return this.styleFleche
}
/**
 *
 * @returns {number}
 */
MtgApp.prototype.getStyleRemplissage = function () {
  return this.styleRemplissage
}

// A revoir après création de l'interface
/**
 *
 * @returns {number}
 */
MtgApp.prototype.getThickness = function () {
  return this.thickness
}

/**
 *
 * @param {number} val
 */
// On n'utilise pas comme nom setThickness qui est réservé pour l'API
MtgApp.prototype.selectThickness = function (val) {
  const slider = this.thicknessSlider
  if ((typeof val === 'number') && Number.isInteger(val) && (val >= slider.min) && (val <= slider.max)) {
    this.thickness = val
    slider.update(val)
  }
}

/**
 *
 * @returns {StyleTrait}
 */
MtgApp.prototype.getStyleTrait = function () {
  return new StyleTrait(this.listePr, this.lineStyle, this.getThickness())
}
/**
 *
 * @param style
 * @param {Button[]} tabButtons
 */
MtgApp.prototype.selectButton = function (style, tabButtons) {
  for (const btn of tabButtons) {
    const isActivated = btn.isActivated
    const isTarget = (btn.style === style)
    if (isTarget) {
      if (!isActivated) {
        btn.activate(true)
      }
    } else if (isActivated) {
      btn.activate(false)
    }
  }
}

/**
 *
 * Fonction sélectionnant dans la palette de style de trait le style style
 * @param {StyleTrait} style
 */
MtgApp.prototype.selectLineStyle = function (style) {
  this.lineStyle = style.style
  this.selectButton(style.style, this.lineStyleButtons)
}

MtgApp.prototype.supprimeObjetsVisuels = function () {
  if (this.listeObjetsVisuels.longueur() !== 0) {
    this.listeObjetsVisuels.montreTout(false)
    // Version 6.7.2 : ON rajoute un dernier paramètre à false pour byBlock (qui est maintenant true par défaut)
    // car la liste d'objets visuels évolue quand on bouge la souris et checun des éléments de ette liste
    // doit être mis à jour même si entre temps la liste a changé
    // this.listeObjetsVisuels.update(this.svgFigure, this.doc.couleurFond, this.doc.opacity, true)
    this.listeObjetsVisuels.update(this.svgFigure, this.doc.couleurFond, true, false)
    this.listeObjetsVisuels.removegElements(this.svgFigure)
    this.listeObjetsVisuels.retireTout()
  }
}

MtgApp.prototype.updateObjetsVisuels = function () {
  if (this.listeObjetsVisuels.longueur() !== 0) {
    this.listeObjetsVisuels.positionne(false, this.dimf)
    // Version 6.7.2 : ON rajoute un dernier paramètre à false pour byBlock (qui est maintenant true par défaut)
    // this.listeObjetsVisuels.update(this.svgFigure, this.doc.couleurFond, this.doc.opacity, true)
    this.listeObjetsVisuels.update(this.svgFigure, this.doc.couleurFond, true, false)
  }
}
/**
 *
 * @param {CElementBase} el
 */
MtgApp.prototype.ajouteObjetVisuel = function (el) {
  el.positionne(false, this.dimf)
  // if (el.estDeNature(NatObj.NTtObj)) el.creeAffichage(this.svgFigure, true, this.doc.couleurFond, this.doc.opacity)
  this.listeObjetsVisuels.add(el)
}

// Ajout version 6.4.4
/**
 * Fonction ajoutant les éléments graphiques de la liste d'objets visuels depuis l'indice inddeb
 * @param {number} inddeb
 */
MtgApp.prototype.afficheObjetVisuels = function (inddeb) {
  const doc = this.doc
  this.listeObjetsVisuels.afficheTout(inddeb, this.svgFigure, true, doc.couleurFond) // Ajout version 6.4.4
}
/**
 *
 * @param {number} x
 * @param {number} y
 * @returns {CPointBase}
 */
MtgApp.prototype.ajoutePoint = function (x, y) {
  const pt = new CPointBase(this.listePourConst, null, false, this.getCouleur(), false, 0, 0, false, '', this.getTaillePoliceNom(), this.getStylePoint(), false, false, x, y)
  // this.ajouteElementSansEditionNom(pt); // A revoir mtgApp
  pt.positionne(false, this.dimf)
  pt.creeAffichage(this.svgFigure, false, this.doc.couleurFond)
  this.ajouteElement(pt)
  return pt
}

MtgApp.prototype.genereNomPourPoint = function () {
  return this.listePr.genereNomPourPoint()
}
/**
 *
 * @param {CPointBase} pt
 * @param {boolean} [bEdit=true]
 */
MtgApp.prototype.ajouteElement = function (pt, bEdit = true) {
  const listePr = this.listePr
  pt.positionne(false, this.dimf)
  if (pt.getNatureCalcul() === NatCal.NVariable) {
    listePr.insert(1, pt)
    if (this.estExercice) this.listePourConst.insert(1, pt)
    // Important version 4.8.0 La variable étant rajoutée en début de liste
    // tous les indices doivent être recalculés
    listePr.updateIndexes()
  } else {
    listePr.add(pt)
    pt.id = listePr.id + '#' + pt.index
    if (this.estExercice) this.listePourConst.add(pt)
  }
  if (bEdit && pt.estDeNature(NatObj.NObjNommable) && (pt.className !== 'CDroiteClone') &&
    (pt.className !== 'CPointClone') && pt.existe && !pt.masque) {
    // Si on est en train d'éditer le nom d'un point ou si on est en mode exercice on n'édite pas le nom d'une droite
    // const el = this.nameEditor.eltAssocie Supprimé version 9.3.1 (voir ci-dessous)
    // if (pt.estDeNature(NatObj.NDroite) && ((el !== null) || this.estExercice)) return; // Modifié version 6.3.0
    // if (pt.estDeNature(NatObj.NDroite) && (el !== null)) return // Supprimé version 9.3.1
    // Version 9.3.1 : quand on crée plusieurs droites successivement, l'éditeir à la volée passe
    // de l'une à l'autre. Avant il restait sur la première droite
    this.nameEditor.associeA(pt)
    this.nameEditor.setPosition()
  }
  pt.metAJour() // A revoir mtgApp
  // Version 7.9.2 : plus de div plaqués sur le figure pour les éditeurs de formule et les variables
  // auxquelles est associée un pane d'affichage avec bouton + - = mais un foreignElt (foreign object)
  // dont on reclasse l'affichage au-dessus à chaque ajoute d'objet
  // cela dot être mis sur la queue d'affichage
  addQueue(function () {
    listePr.reclassForeignElts()
  })
}

/**
 * Fonction insérant dans la liste des objets créés l'objet elAdd à l'indice index
 * @param {CElementBase} elAdd
 * @param {number} index
 */
MtgApp.prototype.insereElement = function (elAdd, index) {
  this.listePr.insereElement(elAdd, index)
  if (this.estExercice) this.listePourConst = this.listePourConstruction()
  this.listePr.updateIndexes()
}

MtgApp.prototype.detruitDernierElement = function () {
  this.listePr.detruitDernierObjet()
  if (this.estExercice) this.listePourConst.detruitDernierObjet()
}

/**
 * Fonction détruisant les n derniers éléments de la liste principale
 * @param {number} n Le nombre d'éléments à détruire
 */
MtgApp.prototype.detruitDerniersElements = function (n) {
  for (let i = 0; i < n; i++) {
    this.detruitDernierElement()
    if (this.estExercice) this.listePourConst.detruitDernierObjet()
  }
}
/**
 *
 * @param {CElementBase} el
 */
MtgApp.prototype.detruitElement = function (el) {
  this.listePr.detruitObjet(el)
  if (this.estExercice) this.listePourConst = this.listePourConstruction()
  this.listePr.updateIndexes()
}

/**
 * Fonction créant les outils de pointage
 */
MtgApp.prototype.creeOutilsPointage = function () {
  /** @type {OutilPointageCapture} */
  this.outilPointageCapture = new OutilPointageCapture(this)
  /** @type {OutilPointageClic} */
  this.outilPointageClic = new OutilPointageClic(this)
  /** @type {OutilPointageCre} */
  this.outilPointageCre = new OutilPointageCre(this)
  /** @type {OutilPointageObjetClignotant} */
  this.outilPointageObjetClignotant = new OutilPointageObjetClignotant(this)
  /** @type {OutilPointageInt} */
  this.outilPointageInt = new OutilPointageInt(this)
  /** @type {OutilPointageRapporteur} */
  this.outilPointageRapporteur = new OutilPointageRapporteur(this)
  /** @type {OutilPointageCaptureNom} */
  this.outilPointageCaptureNom = new OutilPointageCaptureNom(this)
  /** @type {OutilPointageExecMac} */
  this.outilPointageExecMac = new OutilPointageExecMac(this)
  /** @type {OutilPointageClicOuPt} */
  this.outilPointageClicOuPt = new OutilPointageClicOuPt(this)
  /** @type {OutilPointageTranslation} */
  this.outilPointageTranslation = new OutilPointageTranslation((this))
  /** @type {OutilRapporteurVirt} */
  this.outilRapporteurVirt = new OutilRapporteurVirt(this)
  /** @type {OutilRapporteurCircVirt} */
  this.outilRapporteurCircVirt = new OutilRapporteurCircVirt(this)
  /** @type {OutilEquerreVirt} */
  this.outilEquerreVirt = new OutilEquerreVirt(this)
  /** @type {OutilRegleVirt} */
  this.outilRegleVirt = new OutilRegleVirt(this)
  /** @type {OutilDepunaiserTout} */
  this.outilDepunaiserTout = new OutilDepunaiserTout(this)
}

MtgApp.prototype.creeOutils = function () {
  /** @type {OutilCapt} */
  this.outilCapt = new OutilCapt(this)
  /** @type {OutilPtLib} */
  this.outilPtLib = new OutilPtLib(this)
  /** @type {OutilMilieu} */
  this.outilMilieu = new OutilMilieu(this)
  /** @type {OutilCentreGrav} */
  this.outilCentreGrav = new OutilCentreGrav(this)
  /** @type {OutilMarquerPt} */
  this.outilMarquerPt = new OutilMarquerPt(this)
  /** @type {OutilDemarquerPt} */
  this.outilDemarquerPt = new OutilDemarquerPt(this)
  /** @type {OutilPunaiser} */
  this.outilPunaiser = new OutilPunaiser(this)
  /** @type {OutilPunaiserAff} */
  this.outilPunaiserAff = new OutilPunaiserAff(this)
  /** @type {OutilPunaiserMarqueAng} */
  this.outilPunaiserMarqueAng = new OutilPunaiserMarqueAng(this)
  /** @type {OutilDepunaiser} */
  this.outilDepunaiser = new OutilDepunaiser(this)
  /** @type {OutilDepunaiserAff} */
  this.outilDepunaiserAff = new OutilDepunaiserAff(this)
  /** @type {OutilDepunaiserMarqueAng} */
  this.outilDepunaiserMarqueAng = new OutilDepunaiserMarqueAng(this)
  /** @type {OutilDtAB} */
  this.outilDtAB = new OutilDtAB(this)
  /** @type {OutilDtPar} */
  this.outilDtPar = new OutilDtPar(this)
  /** @type {OutilDtPer} */
  this.outilDtPer = new OutilDtPer(this)
  /** @type {OutilDtBis} */
  this.outilDtBis = new OutilDtBis(this)
  /** @type {OutilDtMed} */
  this.outilDtMed = new OutilDtMed(this)
  /** @type {OutilDtHor} */
  this.outilDtHor = new OutilDtHor(this)
  /** @type {OutilDtVer} */
  this.outilDtVer = new OutilDtVer(this)
  /** @type {OutilDtParCoef} */
  this.outilDtParCoef = new OutilDtParCoef(this)
  /** @type {OutilDtParEq} */
  this.outilDtParEq = new OutilDtParEq(this)
  /** @type {OutilDemiDt} */
  this.outilDemiDt = new OutilDemiDt(this)
  /** @type {OutilSeg} */
  this.outilSeg = new OutilSeg(this)
  /** @type {OutilSegmentParLong} */
  this.outilSegmentParLong = new OutilSegmentParLong(this)
  /** @type {OutilVect} */
  this.outilVect = new OutilVect(this)
  /** @type {OutilCerOA} */
  this.outilCerOA = new OutilCerOA(this)
  /** @type {OutilCerOR} */
  this.outilCerOR = new OutilCerOR(this)
  /** @type {OutilCerOAB} */
  this.outilCerOAB = new OutilCerOAB(this)
  /** @type {OutilArcPetit} */
  this.outilArcPetit = new OutilArcPetit(this)
  /** @type {OutilArcGrand} */
  this.outilArcGrand = new OutilArcGrand(this)
  /** @type {OutilArcDirect} */
  this.outilArcDirect = new OutilArcDirect(this)
  /** @type {OutilArcIndirect} */
  this.outilArcIndirect = new OutilArcIndirect(this)
  /** @type {OutilArcPetitParAng} */
  this.outilArcPetitParAng = new OutilArcPetitParAng(this)
  /** @type {OutilArcGrandParAng} */
  this.outilArcGrandParAng = new OutilArcGrandParAng(this)
  /** @type {OutilArcDirectParAng} */
  this.outilArcDirectParAng = new OutilArcDirectParAng(this)
  /** @type {OutilArcIndirectParAng} */
  this.outilArcIndirectParAng = new OutilArcIndirectParAng(this)
  /** @type {OutilMarqueSeg} */
  this.outilMarqueSeg = new OutilMarqueSeg(this)
  /** @type {OutilMarqueAng} */
  this.outilMarqueAng = new OutilMarqueAng(this)
  /** @type {OutilMarqueAngOr} */
  this.outilMarqueAngOr = new OutilMarqueAngOr(this)
  /** @type {OutilMarqueAngOrSD} */
  this.outilMarqueAngOrSD = new OutilMarqueAngOrSD(this)
  /** @type {OutilMarqueAngOrSI} */
  this.outilMarqueAngOrSI = new OutilMarqueAngOrSI(this)
  /** @type {OutilCarre} */
  this.outilCarre = new OutilCarre(this)
  /** @type {OutilLosange} */
  this.outilLosange = new OutilLosange(this)
  /** @type {OutilRectangle} */
  this.outilRectangle = new OutilRectangle(this)
  /** @type {OutilTriangleEq} */
  this.outilTriangleEq = new OutilTriangleEq(this)
  /** @type {OutilParallelog} */
  this.outilParallelog = new OutilParallelog(this)
  /** @type {OutilPolygone} */
  this.outilPolygone = new OutilPolygone(this)
  /** @type {OutilPolygoneReg} */
  this.outilPolygoneReg = new OutilPolygoneReg(this)
  /** @type {OutilLigneBrisee} */
  this.outilLigneBrisee = new OutilLigneBrisee(this)
  /** @type {OutilRot} */
  this.outilRot = new OutilRot(this)
  /** @type {OutilRapporteur} */
  this.outilRapporteur = new OutilRapporteur(this)
  /** @type {OutilArcParRapporteur} */
  this.outilArcParRapporteur = new OutilArcParRapporteur(this)
  /** @type {OutilArcGrandParRapporteur} */
  this.outilArcGrandParRapporteur = new OutilArcGrandParRapporteur(this)
  /** @type {OutilSymAxiale} */
  this.outilSymAxiale = new OutilSymAxiale(this)
  /** @type {OutilSymCentrale} */
  this.outilSymCentrale = new OutilSymCentrale(this)
  /** @type {OutilTrans} */
  this.outilTrans = new OutilTrans(this)
  /** @type {OutilTransParCoord} */
  this.outilTransParCoord = new OutilTransParCoord(this)
  /** @type {OutilHom} */
  this.outilHom = new OutilHom(this)
  /** @type {OutilSim} */
  this.outilSim = new OutilSim(this)
  /** @type {OutilCalcul} */
  this.outilCalcul = new OutilCalcul(this)
  /** @type {OutilCurseur} */
  this.outilCurseur = new OutilCurseur(this)
  /** @type {OutilTangente} */
  this.outilTangente = new OutilTangente(this)
  /** @type {OutilDtReg} */
  this.outilDtReg = new OutilDtReg(this)
  /** @type {OutilVariable} */
  this.outilVariable = new OutilVariable(this)
  /** @type {OutilSolutionEq} */
  this.outilSolutionEq = new OutilSolutionEq(this)
  /** @type {OutilDerivee} */
  this.outilDerivee = new OutilDerivee(this)
  /** @type {OutilSuiteRec} */
  this.outilSuiteRec = new OutilSuiteRec(this)
  /** @type {OutilSuiteRec} */
  this.outilSuiteRec2 = new OutilSuiteRec2(this)
  /** @type {OutilSuiteRec} */
  this.outilSuiteRec3 = new OutilSuiteRec3(this)
  /** @type {OutilSuiteRecComplexe} */
  this.outilSuiteRecComplexe = new OutilSuiteRecComplexe(this)
  /** @type {OutilSuiteRecComplexe} */
  this.outilSuiteRecComplexe2 = new OutilSuiteRecComplexe2(this)
  /** @type {OutilSuiteRecComplexe} */
  this.outilSuiteRecComplexe3 = new OutilSuiteRecComplexe3(this)

  /** @type {OutilMax} */
  this.outilMax = new OutilMax(this)
  /** @type {OutilMin} */
  this.outilMin = new OutilMin(this)
  /** @type {OutilRepere} */
  this.outilRepere = new OutilRepere(this)
  /** @type {OutilCalculComp} */
  this.outilCalculComp = new OutilCalculComp(this)
  /** @type {OutilFonc} */
  this.outilFonc = new OutilFonc(this)
  /** @type {OutilFoncComp} */
  this.outilFoncComp = new OutilFoncComp(this)
  /** @type {OutilSurface} */
  this.outilSurface = new OutilSurface(this)
  /** @type {OutilSurfaceLieuDroite} */
  this.outilSurfaceLieuDroite = new OutilSurfaceLieuDroite(this)
  /** @type {OutilSurface} */
  this.outilSurface2Lieux = new OutilSurface2Lieux(this)
  /** @type {OutilSurfaceLieu2Pts} */
  this.outilSurfaceLieu2Pts = new OutilSurfaceLieu2Pts(this)
  /** @type {OutilDemiPlan} */
  this.outilDemiPlan = new OutilDemiPlan(this)
  /** @type {OutilCouronne} */
  this.outilCouronne = new OutilCouronne(this)
  /** @type {OutilSurfaceArc} */
  this.outilSurfaceArc = new OutilSurfaceArc(this)
  /** @type {OutilLieuParPtLie} */
  this.outilLieuParPtLie = new OutilLieuParPtLie(this)
  /** @type {OutilLieuDiscretParPtLie} */
  this.outilLieuDiscretParPtLie = new OutilLieuDiscretParPtLie(this)
  /** @type {OutilLieuParVariable} */
  this.outilLieuParVariable = new OutilLieuParVariable(this)
  /** @type {OutilLieuDiscretParVariable} */
  this.outilLieuDiscretParVariable = new OutilLieuDiscretParVariable(this)
  /** @type {OutilLieuObjetParPtLie} */
  this.outilLieuObjetParPtLie = new OutilLieuObjetParPtLie(this)
  /** @type {OutilLieuObjetParVariable} */
  this.outilLieuObjetParVariable = new OutilLieuObjetParVariable(this)
  /** @type {OutilSegCur} */
  this.outilSegCur = new OutilSegCur(this)
  /** @type {OutilCourbeFonc} */
  this.outilCourbeFonc = new OutilCourbeFonc(this)
  /** @type {OutilCourbeFoncCr} */
  this.outilCourbeFoncCr = new OutilCourbeFoncCr(this)
  /** @type {OutilCourbeAvecTan} */
  this.outilCourbeAvecTan = new OutilCourbeAvecTan(this)
  /** @type {OutilCourbePoly} */
  this.outilCourbePoly = new OutilCourbePoly(this)
  /** @type {OutilGrapheSuiteRec} */
  this.outilGrapheSuiteRec = new OutilGrapheSuiteRec(this)
  /** @type {OutilGrapheSuiteRecComp} */
  this.outilGrapheSuiteRecComp = new OutilGrapheSuiteRecComp(this)
  /** @type {OutilInt} */
  this.outilInt = new OutilInt(this)
  /** @type {OutilProj} */
  this.outilProj = new OutilProj(this)
  /** @type {OutilPtParCoord} */
  this.outilPtParCoord = new OutilPtParCoord(this)
  /** @type {OutilPtParAff} */
  this.outilPtParAff = new OutilPtParAff(this)
  /** @type {OutilPtLie} */
  this.outilPtLie = new OutilPtLie(this)
  /** @type {OutilPtBaseEnt} */
  this.outilPtBaseEnt = new OutilPtBaseEnt(this)
  /** @type {OutilPtInterieur} */
  this.outilPtInterieur = new OutilPtInterieur(this)
  /** @type {OutilPtParAbs} */
  this.outilPtParAbs = new OutilPtParAbs(this)
  /** @type {OutilBarycentre} */
  this.outilBarycentre = new OutilBarycentre(this)
  /** @type {OutilPtParMultVec} */
  this.outilPtParMultVec = new OutilPtParMultVec(this)
  /** @type {OutilPtParSommeVec} */
  this.outilPtParSommeVec = new OutilPtParSommeVec(this)
  /** @type {OutilMesLong} */
  this.outilMesLong = new OutilMesLong(this)
  /** @type {OutilMesLongOr} */
  this.outilMesLongOr = new OutilMesLongOr(this)
  /** @type {OutilMesAngNor} */
  this.outilMesAngNor = new OutilMesAngNor(this)
  /** @type {OutilMesAngOr} */
  this.outilMesAngOr = new OutilMesAngOr(this)
  /** @type {OutilMesAbs} */
  this.outilMesAbs = new OutilMesAbs(this)
  /** @type {OutilMesAbsRep} */
  this.outilMesAbsRep = new OutilMesAbsRep(this)
  /** @type {OutilMesOrdRep} */
  this.outilMesOrdRep = new OutilMesOrdRep(this)
  /** @type {OutilMesAffRep} */
  this.outilMesAffRep = new OutilMesAffRep(this)
  /** @type {OutilMesCoefDir} */
  this.outilMesCoefDir = new OutilMesCoefDir(this)
  /** @type {OutilMesLongLigne} */
  this.outilMesLongLigne = new OutilMesLongLigne(this)
  /** @type {OutilMesAire} */
  this.outilMesAire = new OutilMesAire(this)
  /** @type {OutilMesProSca} */
  this.outilMesProSca = new OutilMesProSca(this)
  /** @type {OutilAffichageValeur} */
  this.outilAffichageValeur = new OutilAffichageValeur(this)
  /** @type {OutilAffichageEq} */
  this.outilAffichageEq = new OutilAffichageEq(this)
  /** @type {OutilAffichageEqLie} */
  this.outilAffichageEqLie = new OutilAffichageEqLie(this)
  /** @type {OutilAffichageCoord} */
  this.outilAffichageCoord = new OutilAffichageCoord(this)
  /** @type {OutilAffichageCoordLie} */
  this.outilAffichageCoordLie = new OutilAffichageCoordLie(this)
  /** @type {OutilAffichageValeurLiePt} */
  this.outilAffichageValeurLiePt = new OutilAffichageValeurLiePt(this)
  /** @type {OutilLatex} */
  this.outilLatex = new OutilLatex(this)
  /** @type {OutilLatexLiePt} */
  this.outilLatexLiePt = new OutilLatexLiePt(this)
  /** @type {OutilCommentaire} */
  this.outilCommentaire = new OutilCommentaire(this)
  /** @type {OutilCommentaireLiePt} */
  this.outilCommentaireLiePt = new OutilCommentaireLiePt(this)
  /** @type {OutilImageLibre} */
  this.outilImageLibre = new OutilImageLibre(this)
  /** @type {OutilImageLiee} */
  this.outilImageLiee = new OutilImageLiee(this)
  /** @type {OutilEditeurFormule} */
  this.outilEditeurFormule = new OutilEditeurFormule(this)
  /** @type {OutilCreationLiaison} */
  this.outilCreationLiaison = new OutilCreationLiaison(this)
  /** @type {OutilCreationLiaisonAff} */
  this.outilCreationLiaisonAff = new OutilCreationLiaisonAff(this)
  /** @type {OutilSuppressionLiaison} */
  this.outilSuppressionLiaison = new OutilSuppressionLiaison(this)
  /** @type {OutilSuppressionLiaisonAff} */
  this.outilSuppressionLiaisonAff = new OutilSuppressionLiaisonAff(this)
  /** @type {OutilAnimation} */
  this.outilAnimation = new OutilAnimation(this)
  /** @type {OutilObjetDuplique} */
  this.outilObjetDuplique = new OutilObjetDuplique(this)
  /** @type {OutilObjetClone} */
  this.outilObjetClone = new OutilObjetClone(this)
  /** @type {OutilAbsOrRep} */
  this.outilAbsOrRep = new OutilAbsOrRep(this)
  /** @type {OutilOrdOrRep} */
  this.outilOrdOrRep = new OutilOrdOrRep(this)
  /** @type {OutilUnitexRep} */
  this.outilUnitexRep = new OutilUnitexRep(this)
  /** @type {OutilUniteyRep} */
  this.outilUniteyRep = new OutilUniteyRep(this)
  /** @type {OutilAbsMinRep} */
  this.outilAbsMinRep = new OutilAbsMinRep(this)
  /** @type {OutilAbsMaxRep} */
  this.outilAbsMaxRep = new OutilAbsMaxRep(this)
  /** @type {OutilOrdMinRep} */
  this.outilOrdMinRep = new OutilOrdMinRep(this)
  /** @type {OutilOrdMaxRep} */
  this.outilOrdMaxRep = new OutilOrdMaxRep(this)

  /// //////////////////////////////////////////////////////////////////////////////////////////////////////////
  //                                      Outils de la barre horizontale                                     //
  /// //////////////////////////////////////////////////////////////////////////////////////////////////////////
  /** @type {OutilNew} */
  this.outilNew = new OutilNew(this)
  /** @type {OutilOpen} */
  this.outilOpen = new OutilOpen(this)
  /** @type {OutilSave} */
  this.outilSave = new OutilSave(this)
  /** @type {OutilAnnuler} */
  this.outilAnnuler = new OutilAnnuler(this)
  /** @type {OutilRefaire} */
  this.outilRefaire = new OutilRefaire(this)
  /** @type {OutilSup} */
  this.outilSup = new OutilSup(this)
  /** @type {OutilModifObjGraph} */
  this.outilModifObjGraph = new OutilModifObjGraph(this)
  /** @type {OutilZoomPlus} */
  this.outilZoomPlus = new OutilZoomPlus(this)
  /** @type {OutilZoomMoins} */
  this.outilZoomMoins = new OutilZoomMoins(this)
  /** @type {OutilTranslationFigure} */
  this.outilTranslationFigure = new OutilTranslationFigure(this)
  /** @type {OutilModifObjNum} */
  this.outilModifObjNum = new OutilModifObjNum(this)
  /** @type {OutilNommer} */
  this.outilNommer = new OutilNommer(this)
  /** @type {OutilCaptNom} */
  this.outilCaptNom = new OutilCaptNom(this)
  /** @type {OutilPalette} */
  this.outilPalette = new OutilPalette(this)
  /** @type {OutilCopierStyle} */
  this.outilCopierStyle = new OutilCopierStyle(this)
  /** @type {OutilGomme} */
  this.outilGomme = new OutilGomme(this)
  /** @type {OutilRideau} */
  this.outilRideau = new OutilRideau(this)
  /** @type {OutilModeTrace} */
  this.outilModeTrace = new OutilModeTrace(this)
  /** @type {OutilModePointsAuto} */
  this.outilModePointsAuto = new OutilModePointsAuto(this)
  /** @type {OutilModeAutoComplete} */
  this.outilModeAutoComplete = new OutilModeAutoComplete(this)
  /** @type {OutilModeSelectRect} */
  this.outilModeSelectRect = new OutilModeSelectRect(this)
  /** @type {OutilUseLens} */
  this.outilUseLens = new OutilUseLens(this)
  /** @type {OutilRecalculer} */
  this.outilRecalculer = new OutilRecalculer(this)
  /** @type {OutilExecutionMacro} */
  this.outilExecutionMacro = new OutilExecutionMacro(this)
  /** @type {OutilLastInd} */
  this.outilLastInd = new OutilLastInd(this)
  if (!this.estExercice) {
    /** @type {OutilCodeBase64} */
    this.outilCodeBase64 = new OutilCodeBase64(this)
    /** @type {OutilPermanentUrl} */
    this.outilPermanentUrl = new OutilPermanentUrl(this)
    /** @type {OutilCodeTikz} */
    this.outilCodeTikz = new OutilCodeTikz(this)
    /** @type {OutilExportFig} */
    this.outilExport = new OutilExportFig(this)
    /** @type {OutilSavePNG} */
    this.outilSavePNG = new OutilSavePNG(this) // Sera utilisé par l'outil d'exportation
    /** @type {OutilSavePNGWithUnity} */
    this.outilSavePNGWithUnity = new OutilSavePNGWithUnity(this)
    /** @type {OutilSaveJPG} */
    this.outilSaveJPG = new OutilSaveJPG(this) // Sera utilisé par l'outil d'exportation
    /** @type {OutilSaveSVG} */
    this.outilSaveSVG = new OutilSaveSVG(this) // Sera utilisé par l'outil d'exportation
    /** @type {OutilExportHTML} */
    this.outilExportHTML = new OutilExportHTML(this) // Sera utilisé par l'outil d'exportation

    /** @type {OutilCopy} */
    this.outilCopy = new OutilCopy(this)
    /** @type {OutilCopyWithUnity} */
    this.outilCopyWithUnity = new OutilCopyWithUnity(this)
    // Les outils suivants appartiennent à la barre d'outils supplémentaire obtenue en cliquant sur le bouton +/-
    // leurs icônes ne sont créées que quand on clique sur ce bouton
    /** @type {OutilReclassDebObjGra} */
    this.outilReclassDebObjGra = new OutilReclassDebObjGra(this)
    /** @type {OutilReclassFinObjGra} */
    this.outilReclassFinObjGra = new OutilReclassFinObjGra(this)
    /** @type {OutilTaillePlus} */
    this.outilTaillePlus = new OutilTaillePlus(this)
    /** @type {OutilTailleMoins} */
    this.outilTailleMoins = new OutilTailleMoins(this)
    /** @type {OutilHelp} */
    this.outilHelp = new OutilHelp(this)
    /** @type {OutilToggleToolsAdd} */
    this.outilToggleToolsAdd = new OutilToggleToolsAdd(this)

    // Création des 4 listes servant à créer une nouvelle construction
    this.listeSrcNG = new CSousListeObjets(this.listePr)
    this.listeSrcG = new CSousListeObjets(this.listePr)
    this.listeFinNG = new CSousListeObjets(this.listePr)
    this.listeFinG = new CSousListeObjets(this.listePr)
  }
  /** @type {OutilProtocole} */
  this.outilProtocole = new OutilProtocole(this)
  if (this.options) {
    /** @type {OutilOptionsFig} */
    this.outilOptionsFig = new OutilOptionsFig(this)
  }

  /// /////////////////////////////////////////////////////////////////////////////////////////////
  // On met à jour les icônes de la barre horizontale en tenant compte du niveau choisi (préfini ou personnalisé)
  // this.updateToolbar()
  /// /////////////////////////////////////////////////////////////////////////////////////////////
  // Fin de la création des outils de la barre horizontale
  /// ////////////////////////////////////////////////////////////////////////////////////////////
  // Outils supplémentaires disponibles quand on clique sur un bouton + en fin de barre déroulante
  //
  /**
   * Outil pour créer le centre d'un cercle
   * @type {OutilCentreCercle}
   */
  this.outilCentreCercle = new OutilCentreCercle(this)
  /** @type {OutilAdd} */
  this.outilAddPoint = new OutilAdd(this, 'AddPoint', ['CentreCercle'])
  /**
   * Outil pour créer l'image d'un point par une inversion
   * @type {OutilImageInv}
   */
  this.outilImageInv = new OutilImageInv(this)
  /** @type {OutilAdd} */
  this.outilAddTransf = new OutilAdd(this, 'AddTransf', ['ImageInv'])
  /**
   * Outil pour créer des objets numériques supplémentaires
   * @type {OutilFonc2Var}
   */
  this.outilFonc2Var = new OutilFonc2Var(this)
  /** @type {OutilFonc3Var} */
  this.outilFonc3Var = new OutilFonc3Var(this)
  /** @type {OutilFoncComp2Var} */
  this.outilFoncComp2Var = new OutilFoncComp2Var(this)
  /** @type {OutilFoncComp3Var} */
  this.outilFoncComp3Var = new OutilFoncComp3Var(this)
  /** @type {OutilPartieReelle} */
  this.outilPartieReelle = new OutilPartieReelle(this)
  /** @type {OutilPartieImaginaire} */
  this.outilPartieImaginaire = new OutilPartieImaginaire(this)
  /** @type {OutilModule} */
  this.outilModule = new OutilModule(this)
  /** @type {OutilArgument} */
  this.outilArgument = new OutilArgument(this)
  /** @type {OutilTestExistence} */
  this.outilTestExistence = new OutilTestExistence(this)
  /** @type {OutilTestEq} */
  this.outilTestEq = new OutilTestEq(this)
  /** @type {OutilTestFact} */
  this.outilTestFact = new OutilTestFact(this)
  /** @type {OutilTestEqNatOp} */
  this.outilTestEqNatOp = new OutilTestEqNatOp(this)
  /** @type {OutilTestDepVar} */
  this.outilTestDepVar = new OutilTestDepVar(this)
  /** @type {OutilSomInd} */
  this.outilSomInd = new OutilSomInd(this)
  /** @type {OutilProdInd} */
  this.outilProdInd = new OutilProdInd(this)
  /** @type {OutilInteg} */
  this.outilInteg = new OutilInteg(this)
  /** @type {OutilDeriveePartielle} */
  this.outilDeriveePart = new OutilDeriveePartielle(this)
  /** @type {OutilMatrice} */
  this.outilMatrice = new OutilMatrice(this)
  /** @type {OutilCalculMat} */
  this.outilCalculMat = new OutilCalculMat(this)
  /** @type {OutilMatriceAleat} */
  this.outilMatriceAleat = new OutilMatriceAleat(this)
  /** @type {OutilMatriceParForm} */
  this.outilMatriceParForm = new OutilMatriceParForm(this)
  /** @type {OutilMatriceParTxt} */
  this.outilMatriceParTxt = new OutilMatriceParTxt(this)
  /** @type {OutilMatriceCoord} */
  this.outilMatriceCoord = new OutilMatriceCoord(this)
  /** @type {OutilMatDecomp} */
  this.outilMatDecomp = new OutilMatDecomp(this)
  /** @type {OutilNuagePt} */
  this.outilNuagePt = new OutilNuagePt(this)
  /** @type {OutilDet} */
  this.outilDet = new OutilDet(this)
  /** @type {OutilRenommerCalcul} */
  this.outilRenommerCalcul = new OutilRenommerCalcul(this)
  /** @type {OutilGraduationAxes} */
  this.outilGraduationAxes = new OutilGraduationAxes(this)
  /** @type {OutilLongUnit} */
  this.outilLongUnit = new OutilLongUnit(this)
  /** @type {OutilQuadrillage} */
  this.outilQuadrillage = new OutilQuadrillage(this)
  /// ///////////////////////////////////////////////////////////////////////////////////////
  //                                Outils pour créer des macros
  /// ///////////////////////////////////////////////////////////////////////////////////////
  /** @type {OutilMacApp} */
  this.outilMacApp = new OutilMacApp(this)
  /** @type {OutilMacDisp} */
  this.outilMacDisp = new OutilMacDisp(this)
  /** @type {OutilMacAppParAut} */
  this.outilMacAppParAut = new OutilMacAppParAut(this)
  /** @type {OutilMacDispParAut} */
  this.outilMacDispParAut = new OutilMacDispParAut(this)
  /** @type {OutilMacAnim} */
  this.outilMacAnim = new OutilMacAnim(this)
  /** @type {OutilMacAnimParVar} */
  this.outilMacAnimParVar = new OutilMacAnimParVar(this)
  /** @type {OutilMacAnimTr} */
  this.outilMacAnimTr = new OutilMacAnimTr(this)
  /** @type {OutilMacTraceAuto} */
  /** @type {OutilMacAnimParVarTr} */
  this.outilMacAnimParVarTr = new OutilMacAnimParVarTr(this)

  this.outilMacTraceAuto = new OutilMacTraceAuto(this)
  /** @type {OutilMacTraceAutoVa} */
  this.outilMacTraceAutoVa = new OutilMacTraceAutoVa(this)
  /** @type {OutilMacAffValVar} */
  this.outilMacAffValVar = new OutilMacAffValVar(this)
  /** @type {OutilMacClign} */
  this.outilMacClign = new OutilMacClign(this)
  /** @type {OutilMacIncVar} */
  this.outilMacIncVar = new OutilMacIncVar(this)
  /** @type {OutilMacDecVar} */
  this.outilMacDecVar = new OutilMacDecVar(this)
  /** @type {OutilMacModifVar} */
  this.outilMacModifVar = new OutilMacModifVar(this)
  /** @type {OutilMacAffPtLie} */
  this.outilMacAffPtLie = new OutilMacAffPtLie(this)
  /** @type {OutilMacReaff} */
  this.outilMacReaff = new OutilMacReaff(this)
  /** @type {OutilMacActTr} */
  this.outilMacActTr = new OutilMacActTr(this)
  /** @type {OutilMacDesactTr} */
  this.outilMacDesactTr = new OutilMacDesactTr(this)
  /** @type {OutilMacPause} */
  this.outilMacPause = new OutilMacPause(this)
  /** @type {OutilMacSuiteMac} */
  this.outilMacSuiteMac = new OutilMacSuiteMac(this)
  /** @type {OutilMacJouantSon} */
  this.outilMacJouantSon = new OutilMacJouantSon(this)
  /** @type {OutilMacBoucAnim} */
  this.outilMacBoucAnim = new OutilMacBoucAnim(this)
  /** @type {OutilMacBoucTr} */
  this.outilMacBoucTr = new OutilMacBoucTr(this)
  /** @type {OutilMacConsRec} */
  this.outilMacConsRec = new OutilMacConsRec(this)
  /** @type {OutilMacConsIter} */
  this.outilMacConsIter = new OutilMacConsIter(this)
  /** @type {OutilAddObjMac} */
  this.outilAddObjMac = new OutilAddObjMac(this)
  /** @type {OutilSupObjMac} */
  this.outilSupObjMac = new OutilSupObjMac(this)
  /** @type {OutilFusionImpConst} */
  this.outilFusionImpConst = new OutilFusionImpConst(this)
  /** @type {OutilFusionImpByName} */
  this.outilFusionImpByName = new OutilFusionImpByName(this)
  /** @type {OutilModifConst} */
  this.outilModifConst = new OutilModifConst(this)
  /** @type {OutilSupConst} */
  this.outilSupConst = new OutilSupConst(this)
  /** @type {OutilImpConstFig} */
  this.outilImpConstFig = new OutilImpConstFig(this)
  /** @type {OutilSaveConst} */
  this.outilSaveConst = new OutilSaveConst(this)
  /** @type {OutilAddConst} */
  this.outilAddConst = new OutilAddConst(this)
  /** @type {OutilGestionConst} */
  this.outilGestionConst = new OutilGestionConst(this)
  /** @type {OutilChoixSrcNumConst} */
  this.outilChoixSrcNumConst = new OutilChoixSrcNumConst(this)
  /** @type {OutilChoixSrcGraphConst} */
  this.outilChoixSrcGraphConst = new OutilChoixSrcGraphConst(this)
  /** @type {OutilChoixFinGraphConst} */
  this.outilChoixFinGraphConst = new OutilChoixFinGraphConst(this)
  /** @type {OutilChoixFinNumConst} */
  this.outilChoixFinNumConst = new OutilChoixFinNumConst(this)
  /** @type {OutilFinirConst} */
  this.outilFinirConst = new OutilFinirConst(this)
  /** @type {OutilReInitConst} */
  this.outilReInitConst = new OutilReInitConst(this)
  /** @type {OutilCreationConst} */
  this.outilCreationConst = new OutilCreationConst(this)
  /**
   * Cet outil ne sera pas associé à un bouton mais utilisé dans le dialogue d'exportation
   * @type {OutilAdd}
   */
  this.outilAddExport = new OutilAdd(this, '', ['Copy', 'CopyWithUnity', 'SavePNG', 'SaveJPG', 'SaveSVG', 'SavePNGWithUnity', 'CodeTikz', 'CodeBase64', 'ExportHTML', 'PermanentUrl'])
  /**
   * Outil utilisé dans l'outil de gestion des constructions
   * @type {OutilAdd}
   */
  this.outilAddGestionConst = new OutilAdd(this, '', ['AddConst', 'ImpConstFig', 'ModifConst', 'SupConst', 'SaveConst', 'FusionImpConst', 'FusionImpByName'])
  /**
   * Outil utilisé dans l'outil de gestion des constructions
   * @type {OutilAdd}
   */
  this.outilAddCreationConst = new OutilAdd(this, '', ['ChoixSrcNumConst', 'ChoixSrcGraphConst', 'ChoixFinGraphConst',
    'ChoixFinNumConst', 'FinirConst', 'ReInitConst'])

  /// //////////////////////////////////////////////////////////////////////////////////////////////
  /** @type {OutilAdd} */
  this.outilAddCalcul = new OutilAdd(this, 'AddCalcul', ['RenommerCalcul', 'TestExistence', 'Fonc2Var',
    'Fonc3Var', 'FoncComp2Var', 'FoncComp3Var', 'SuiteRec2', 'SuiteRec3', 'SuiteRecComplexe2', 'SuiteRecComplexe3',
    'PartieReelle', 'PartieImaginaire', 'Module', 'Argument', 'DeriveePart', 'Matrice', 'CalculMat', 'MatriceAleat',
    'MatriceParForm', 'MatriceParTxt', 'MatriceCoord', 'MatDecomp', 'Det', 'Integ', 'TestEq', 'TestFact', 'TestEqNatOp', 'TestDepVar', 'SomInd', 'ProdInd',
    'AbsOrRep', 'OrdOrRep', 'UnitexRep', 'UniteyRep', 'AbsMinRep', 'AbsMaxRep', 'OrdMinRep', 'OrdMaxRep'])
  // Outil pour créer des macros
  /** @type {OutilAdd} */
  this.outilAddDisp = new OutilAdd(this, 'AddDisp', ['MacApp', 'MacAppParAut', 'MacDisp', 'MacDispParAut', 'MacAnim', 'MacAnimParVar',
    'MacAnimTr', 'MacAnimParVarTr', 'MacTraceAuto', 'MacTraceAutoVa', 'MacAffValVar', 'MacClign', 'MacIncVar', 'MacDecVar', 'MacModifVar', 'MacAffPtLie', 'MacReaff',
    'MacActTr', 'MacDesactTr', 'MacPause', 'MacSuiteMac', 'MacJouantSon', 'MacBoucAnim', 'MacBoucTr', 'MacConsRec', 'MacConsIter'])
  // Outil pour créer des objets divers
  /** @type {OutilAdd} */
  this.outilAddDivers = new OutilAdd(this, 'AddDivers', ['GraduationAxes', 'Quadrillage', 'LongUnit',
    'RapporteurVirt', 'RapporteurCircVirt', 'EquerreVirt', 'RegleVirt', 'DepunaiserTout', 'ObjetDuplique',
    'ObjetClone', 'NuagePt', 'AddObjMac', 'SupObjMac'])
}

MtgApp.prototype.creeBoutonsOutils = function () {
  if (this.commentaireTip) {
    const gTip = this.commentaireTip.g
    this.svgPanel.removeChild(gTip)
    $(this.svgPanel).empty()
    this.svgPanel.appendChild((gTip))
  } else $(this.svgPanel).empty()
  // On crée un tableau formé de tous les boutons associés à des outils
  this.buttons = [] // Chaque constructeur de bouton l'ajoutera au tableau
  /** @type {ButtonTool} */
  this.buttonCapt = new ButtonTool(this, 'Capt', 'left', true)
  /** @type {ButtonTool} */
  this.buttonPtLib = new ButtonTool(this, 'PtLib', 'left')
  /** @type {ButtonTool} */
  this.buttonMilieu = new ButtonTool(this, 'Milieu', 'left')
  /** @type {ButtonTool} */
  this.buttonCentreGrav = new ButtonTool(this, 'CentreGrav', 'left')
  /** @type {ButtonTool} */
  this.buttonMarquerPt = new ButtonTool(this, 'MarquerPt', 'left')
  /** @type {ButtonTool} */
  this.buttonDemarquerPt = new ButtonTool(this, 'DemarquerPt', 'left')
  /** @type {OutilPunaiser} */
  this.buttonPunaiser = new ButtonTool(this, 'Punaiser', 'left')
  /** @type {ButtonTool} */
  this.buttonPunaiserAff = new ButtonTool(this, 'PunaiserAff', 'left')
  /** @type {ButtonTool} */
  this.buttonPunaiserMarqueAng = new ButtonTool(this, 'PunaiserMarqueAng', 'left')

  /** @type {ButtonTool} */
  this.buttonDepunaiser = new ButtonTool(this, 'Depunaiser', 'left')
  /** @type {ButtonTool} */
  this.buttonDepunaiserAff = new ButtonTool(this, 'DepunaiserAff', 'left')
  /** @type {ButtonTool} */
  this.buttonDepunaiserMarqueAng = new ButtonTool(this, 'DepunaiserMarqueAng', 'left')
  /** @type {ButtonTool} */
  this.buttonDtAB = new ButtonTool(this, 'DtAB', 'left')
  /** @type {ButtonTool} */
  this.buttonDtPar = new ButtonTool(this, 'DtPar', 'left')
  /** @type {ButtonTool} */
  this.buttonDtPer = new ButtonTool(this, 'DtPer', 'left')
  /** @type {ButtonTool} */
  this.buttonDtBis = new ButtonTool(this, 'DtBis', 'left')
  /** @type {ButtonTool} */
  this.buttonDtMed = new ButtonTool(this, 'DtMed', 'left')
  /** @type {ButtonTool} */
  this.buttonDtHor = new ButtonTool(this, 'DtHor', 'left')
  /** @type {ButtonTool} */
  this.buttonDtVer = new ButtonTool(this, 'DtVer', 'left')
  /** @type {ButtonTool} */
  this.buttonDtParCoef = new ButtonTool(this, 'DtParCoef', 'left')
  /** @type {ButtonTool} */
  this.buttonDtParEq = new ButtonTool(this, 'DtParEq', 'left')
  /** @type {ButtonTool} */
  this.buttonDemiDt = new ButtonTool(this, 'DemiDt', 'left')
  /** @type {ButtonTool} */
  this.buttonSeg = new ButtonTool(this, 'Seg', 'left')
  /** @type {ButtonTool} */
  this.buttonSegmentParLong = new ButtonTool(this, 'SegmentParLong', 'left')
  /** @type {ButtonTool} */
  this.buttonVect = new ButtonTool(this, 'Vect', 'left')
  /** @type {ButtonTool} */
  this.buttonCerOA = new ButtonTool(this, 'CerOA', 'left')
  /** @type {ButtonTool} */
  this.buttonCerOR = new ButtonTool(this, 'CerOR', 'left')
  /** @type {ButtonTool} */
  this.buttonCerOAB = new ButtonTool(this, 'CerOAB', 'left')
  /** @type {ButtonTool} */
  this.buttonArcPetit = new ButtonTool(this, 'ArcPetit', 'left')
  /** @type {ButtonTool} */
  this.buttonArcGrand = new ButtonTool(this, 'ArcGrand', 'left')
  /** @type {ButtonTool} */
  this.buttonArcDirect = new ButtonTool(this, 'ArcDirect', 'left')
  /** @type {ButtonTool} */
  this.buttonArcIndirect = new ButtonTool(this, 'ArcIndirect', 'left')
  /** @type {ButtonTool} */
  this.buttonArcPetitParAng = new ButtonTool(this, 'ArcPetitParAng', 'left')
  /** @type {ButtonTool} */
  this.buttonArcGrandParAng = new ButtonTool(this, 'ArcGrandParAng', 'left')
  /** @type {ButtonTool} */
  this.buttonArcDirectParAng = new ButtonTool(this, 'ArcDirectParAng', 'left')
  /** @type {ButtonTool} */
  this.buttonArcIndirectParAng = new ButtonTool(this, 'ArcIndirectParAng', 'left')
  /** @type {ButtonTool} */
  this.buttonMarqueSeg = new ButtonTool(this, 'MarqueSeg', 'left')
  /** @type {ButtonTool} */
  this.buttonMarqueAng = new ButtonTool(this, 'MarqueAng', 'left')
  /** @type {ButtonTool} */
  this.buttonMarqueAngOr = new ButtonTool(this, 'MarqueAngOr', 'left')
  /** @type {ButtonTool} */
  this.buttonMarqueAngOrSD = new ButtonTool(this, 'MarqueAngOrSD', 'left')
  /** @type {ButtonTool} */
  this.buttonMarqueAngOrSI = new ButtonTool(this, 'MarqueAngOrSI', 'left')
  this.buttonCarre = new ButtonTool(this, 'Carre', 'left')
  /** @type {ButtonTool} */
  this.buttonLosange = new ButtonTool(this, 'Losange', 'left')
  /** @type {ButtonTool} */
  this.buttonRectangle = new ButtonTool(this, 'Rectangle', 'left')
  /** @type {ButtonTool} */
  this.buttonTriangleEq = new ButtonTool(this, 'TriangleEq', 'left')
  /** @type {ButtonTool} */
  this.buttonParallelog = new ButtonTool(this, 'Parallelog', 'left')
  /** @type {ButtonTool} */
  this.buttonPolygone = new ButtonTool(this, 'Polygone', 'left')
  /** @type {ButtonTool} */
  this.buttonPolygoneReg = new ButtonTool(this, 'PolygoneReg', 'left')
  /** @type {ButtonTool} */
  this.buttonLigneBrisee = new ButtonTool(this, 'LigneBrisee', 'left')
  /** @type {ButtonTool} */
  this.buttonRot = new ButtonTool(this, 'Rot', 'left')
  /** @type {ButtonTool} */
  this.buttonRapporteur = new ButtonTool(this, 'Rapporteur', 'left')
  /** @type {ButtonTool} */
  this.buttonArcParRapporteur = new ButtonTool(this, 'ArcParRapporteur', 'left')
  /** @type {ButtonTool} */
  this.buttonArcGrandParRapporteur = new ButtonTool(this, 'ArcGrandParRapporteur', 'left')
  /** @type {ButtonTool} */
  this.buttonSymAxiale = new ButtonTool(this, 'SymAxiale', 'left')
  /** @type {ButtonTool} */
  this.buttonSymCentrale = new ButtonTool(this, 'SymCentrale', 'left')
  /** @type {ButtonTool} */
  this.buttonTrans = new ButtonTool(this, 'Trans', 'left')
  /** @type {ButtonTool} */
  this.buttonTransParCoord = new ButtonTool(this, 'TransParCoord', 'left')
  /** @type {ButtonTool} */
  this.buttonHom = new ButtonTool(this, 'Hom', 'left')
  /** @type {ButtonTool} */
  this.buttonSim = new ButtonTool(this, 'Sim', 'left')
  /** @type {ButtonTool} */
  this.buttonCalcul = new ButtonTool(this, 'Calcul', 'left')
  /** @type {ButtonTool} */
  this.buttonCurseur = new ButtonTool(this, 'Curseur', 'left')
  /** @type {ButtonTool} */
  this.buttonTangente = new ButtonTool(this, 'Tangente', 'left')
  /** @type {ButtonTool} */
  this.buttonDtReg = new ButtonTool(this, 'DtReg', 'left')
  /** @type {ButtonTool} */
  this.buttonVariable = new ButtonTool(this, 'Variable', 'left')
  /** @type {ButtonTool} */
  this.buttonSolutionEq = new ButtonTool(this, 'SolutionEq', 'left')
  /** @type {ButtonTool} */
  this.buttonDerivee = new ButtonTool(this, 'Derivee', 'left')
  /** @type {ButtonTool} */
  this.buttonSuiteRec = new ButtonTool(this, 'SuiteRec', 'left')
  /** @type {ButtonTool} */
  this.buttonSuiteRecComplexe = new ButtonTool(this, 'SuiteRecComplexe', 'left')
  /** @type {ButtonTool} */
  this.buttonMax = new ButtonTool(this, 'Max', 'left')
  /** @type {ButtonTool} */
  this.buttonMin = new ButtonTool(this, 'Min', 'left')
  /** @type {ButtonTool} */
  this.buttonRepere = new ButtonTool(this, 'Repere', 'left')
  /** @type {ButtonTool} */
  this.buttonCalculComp = new ButtonTool(this, 'CalculComp', 'left')
  /** @type {ButtonTool} */
  this.buttonFonc = new ButtonTool(this, 'Fonc', 'left')
  /** @type {ButtonTool} */
  this.buttonFoncComp = new ButtonTool(this, 'FoncComp', 'left')
  /** @type {ButtonTool} */
  this.buttonSurface = new ButtonTool(this, 'Surface', 'left')
  /** @type {ButtonTool} */
  this.buttonSurfaceLieuDroite = new ButtonTool(this, 'SurfaceLieuDroite', 'left')
  /** @type {ButtonTool} */
  this.buttonSurface2Lieux = new ButtonTool(this, 'Surface2Lieux', 'left')
  /** @type {ButtonTool} */
  this.buttonSurfaceLieu2Pts = new ButtonTool(this, 'SurfaceLieu2Pts', 'left')
  /** @type {ButtonTool} */
  this.buttonCouronne = new ButtonTool(this, 'Couronne', 'left')
  /** @type {ButtonTool} */
  this.buttonSurfaceArc = new ButtonTool(this, 'SurfaceArc', 'left')
  /** @type {ButtonTool} */
  this.buttonDemiPlan = new ButtonTool(this, 'DemiPlan', 'left')
  /** @type {ButtonTool} */
  this.buttonLieuParPtLie = new ButtonTool(this, 'LieuParPtLie', 'left')
  /** @type {ButtonTool} */
  this.buttonLieuDiscretParPtLie = new ButtonTool(this, 'LieuDiscretParPtLie', 'left')
  /** @type {ButtonTool} */
  this.buttonLieuParVariable = new ButtonTool(this, 'LieuParVariable', 'left')
  /** @type {ButtonTool} */
  this.buttonLieuDiscretParVariable = new ButtonTool(this, 'LieuDiscretParVariable', 'left')
  /** @type {ButtonTool} */
  this.buttonLieuObjetParPtLie = new ButtonTool(this, 'LieuObjetParPtLie', 'left')
  /** @type {ButtonTool} */
  this.buttonLieuObjetParVariable = new ButtonTool(this, 'LieuObjetParVariable', 'left')
  /** @type {ButtonTool} */
  this.buttonSegCur = new ButtonTool(this, 'SegCur', 'left')
  /** @type {ButtonTool} */
  this.buttonCourbeFonc = new ButtonTool(this, 'CourbeFonc', 'left')
  /** @type {ButtonTool} */
  this.buttonCourbeFoncCr = new ButtonTool(this, 'CourbeFoncCr', 'left')
  /** @type {ButtonTool} */
  this.buttonCourbeAvecTan = new ButtonTool(this, 'CourbeAvecTan', 'left')
  /** @type {ButtonTool} */
  this.buttonCourbePoly = new ButtonTool(this, 'CourbePoly', 'left')
  /** @type {ButtonTool} */
  this.buttonGrapheSuiteRec = new ButtonTool(this, 'GrapheSuiteRec', 'left')
  /** @type {ButtonTool} */
  this.buttonGrapheSuiteRecComp = new ButtonTool(this, 'GrapheSuiteRecComp', 'left')
  /** @type {ButtonTool} */
  this.buttonInt = new ButtonTool(this, 'Int', 'left')
  /** @type {ButtonTool} */
  this.buttonProj = new ButtonTool(this, 'Proj', 'left')
  /** @type {ButtonTool} */
  this.buttonPtParCoord = new ButtonTool(this, 'PtParCoord', 'left')
  /** @type {ButtonTool} */
  this.buttonPtParAff = new ButtonTool(this, 'PtParAff', 'left')
  /** @type {ButtonTool} */
  this.buttonPtLie = new ButtonTool(this, 'PtLie', 'left')
  /** @type {ButtonTool} */
  this.buttonPtBaseEnt = new ButtonTool(this, 'PtBaseEnt', 'left')
  /** @type {ButtonTool} */
  this.buttonPtInterieur = new ButtonTool(this, 'PtInterieur', 'left')
  /** @type {ButtonTool} */
  this.buttonPtParAbs = new ButtonTool(this, 'PtParAbs', 'left')
  /** @type {ButtonTool} */
  this.buttonBarycentre = new ButtonTool(this, 'Barycentre', 'left')
  /** @type {ButtonTool} */
  this.buttonPtParMultVec = new ButtonTool(this, 'PtParMultVec', 'left')
  /** @type {ButtonTool} */
  this.buttonPtParSommeVec = new ButtonTool(this, 'PtParSommeVec', 'left')
  /** @type {ButtonTool} */
  this.buttonMesLong = new ButtonTool(this, 'MesLong', 'left')
  /** @type {ButtonTool} */
  this.buttonMesLongOr = new ButtonTool(this, 'MesLongOr', 'left')
  /** @type {ButtonTool} */
  this.buttonMesAngNor = new ButtonTool(this, 'MesAngNor', 'left')
  /** @type {ButtonTool} */
  this.buttonMesAngOr = new ButtonTool(this, 'MesAngOr', 'left')
  /** @type {ButtonTool} */
  this.buttonMesAbs = new ButtonTool(this, 'MesAbs', 'left')
  /** @type {ButtonTool} */
  this.buttonMesAbsRep = new ButtonTool(this, 'MesAbsRep', 'left')
  /** @type {ButtonTool} */
  this.buttonMesOrdRep = new ButtonTool(this, 'MesOrdRep', 'left')
  /** @type {ButtonTool} */
  this.buttonMesAffRep = new ButtonTool(this, 'MesAffRep', 'left')
  /** @type {ButtonTool} */
  this.buttonMesCoefDir = new ButtonTool(this, 'MesCoefDir', 'left')
  /** @type {ButtonTool} */
  this.buttonMesLongLigne = new ButtonTool(this, 'MesLongLigne', 'left')
  /** @type {ButtonTool} */
  this.buttonMesAire = new ButtonTool(this, 'MesAire', 'left')
  /** @type {ButtonTool} */
  this.buttonMesProSca = new ButtonTool(this, 'MesProSca', 'left')
  /** @type {ButtonTool} */
  this.buttonAffichageValeur = new ButtonTool(this, 'AffichageValeur', 'left')
  /** @type {ButtonTool} */
  this.buttonAffichageEq = new ButtonTool(this, 'AffichageEq', 'left')
  /** @type {ButtonTool} */
  this.buttonAffichageEqLie = new ButtonTool(this, 'AffichageEqLie', 'left')
  /** @type {ButtonTool} */
  this.buttonAffichageCoord = new ButtonTool(this, 'AffichageCoord', 'left')
  /** @type {ButtonTool} */
  this.buttonAffichageCoordLie = new ButtonTool(this, 'AffichageCoordLie', 'left')
  /** @type {ButtonTool} */
  this.buttonAffichageValeurLiePt = new ButtonTool(this, 'AffichageValeurLiePt', 'left')
  /** @type {ButtonTool} */
  this.buttonLatex = new ButtonTool(this, 'Latex', 'left')
  /** @type {ButtonTool} */
  this.buttonLatexLiePt = new ButtonTool(this, 'LatexLiePt', 'left')
  /** @type {ButtonTool} */
  this.buttonCommentaire = new ButtonTool(this, 'Commentaire', 'left')
  /** @type {ButtonTool} */
  this.buttonCommentaireLiePt = new ButtonTool(this, 'CommentaireLiePt', 'left')
  /** @type {ButtonTool} */
  this.buttonImageLibre = new ButtonTool(this, 'ImageLibre', 'left')
  /** @type {ButtonTool} */
  this.buttonImageLiee = new ButtonTool(this, 'ImageLiee', 'left')
  /** @type {ButtonTool} */
  this.buttonEditeurFormule = new ButtonTool(this, 'EditeurFormule', 'left')
  /** @type {ButtonTool} */
  this.buttonCreationLiaison = new ButtonTool(this, 'CreationLiaison', 'left')
  /** @type {ButtonTool} */
  this.buttonCreationLiaisonAff = new ButtonTool(this, 'CreationLiaisonAff', 'left')
  /** @type {ButtonTool} */
  this.buttonSuppressionLiaison = new ButtonTool(this, 'SuppressionLiaison', 'left')
  /** @type {ButtonTool} */
  this.buttonSuppressionLiaisonAff = new ButtonTool(this, 'SuppressionLiaisonAff', 'left')
  /** @type {ButtonTool} */
  this.buttonAnimation = new ButtonTool(this, 'Animation', 'left')
  // Fin de la création des outils de la barre horizontale
  /// ////////////////////////////////////////////////////////////////////////////////////////////
  // Outils supplémentaires disponibles quand on clique sur un bouton + en fin de barre déroulante
  //
  /** @type {ButtonToolAdd} */
  this.buttonAddPoint = new ButtonToolAdd(this, false, this.outilAddPoint, 'Add')
  /** @type {ButtonToolAdd} */
  this.buttonAddTransf = new ButtonToolAdd(this, false, this.outilAddTransf, 'Add')
  /** @type {ButtonToolAdd} */
  this.buttonAddCalcul = new ButtonToolAdd(this, true, this.outilAddCalcul, 'Add', 'ChoixOutil', '')
  // Outil pour créer des macros
  /** @type {ButtonToolAdd} */
  this.buttonAddDisp = new ButtonToolAdd(this, true, this.outilAddDisp, 'AddMac', 'NewMac', 'MacroAdd')
  // Outil pour créer des objets divers
  /** @type {ButtonToolAdd} */
  this.buttonAddDivers = new ButtonToolAdd(this, false, this.outilAddDivers, 'Add')
}

MtgApp.prototype.creeExpandableBars = function () {
  /** @type {ExpandableBar[]} */
  this.expandableBars = []
  /** @type {ExpandableBar} */
  this.barPoints = new ExpandableBar(this, 'Points', ['PtLib', 'Int', 'PtLie', 'Milieu', 'PtParCoord', 'PtBaseEnt',
    'Proj', 'PtInterieur', 'CentreGrav', 'PtParAbs', 'PtParMultVec', 'PtParSommeVec', 'Barycentre', 'PtParAff', 'CreationLiaison', 'SuppressionLiaison',
    'Punaiser', 'Depunaiser', 'MarquerPt', 'DemarquerPt', 'Animation', 'AddPoint'])
  this.expandableBars.push(this.barPoints)
  new ToolbarArrow(this, this.barPoints)
  /** @type {ExpandableBar} */
  this.barDroites = new ExpandableBar(this, 'Droites', ['DtAB', 'DtPar', 'DtPer', 'DtBis', 'DtMed', 'DtHor', 'DtVer', 'DtParCoef',
    'DtParEq', 'Tangente', 'DtReg'])
  this.expandableBars.push(this.barDroites)
  new ToolbarArrow(this, this.barDroites)
  /** @type {ExpandableBar} */
  this.barSegments = new ExpandableBar(this, 'Segments', ['Seg', 'DemiDt', 'Vect', 'SegmentParLong'])
  this.expandableBars.push(this.barSegments)
  new ToolbarArrow(this, this.barSegments)
  /** @type {ExpandableBar} */
  this.barCercles = new ExpandableBar(this, 'Cercles', ['CerOA', 'CerOR', 'CerOAB', 'ArcPetit', 'ArcGrand', 'ArcParRapporteur',
    'ArcGrandParRapporteur', 'ArcDirect', 'ArcIndirect', 'ArcPetitParAng', 'ArcGrandParAng', 'ArcDirectParAng', 'ArcIndirectParAng'])
  this.expandableBars.push(this.barCercles)
  new ToolbarArrow(this, this.barCercles)
  /** @type {ExpandableBar} */
  this.barPolys = new ExpandableBar(this, 'Polys', ['Polygone', 'LigneBrisee', 'Carre', 'TriangleEq', 'Rectangle', 'Parallelog', 'Losange', 'PolygoneReg'])
  this.expandableBars.push(this.barPolys)
  new ToolbarArrow(this, this.barPolys)
  /** @type {ExpandableBar} */
  this.barMarques = new ExpandableBar(this, 'Marques', ['MarqueSeg', 'MarqueAng', 'MarqueAngOr', 'MarqueAngOrSD', 'MarqueAngOrSI', 'PunaiserMarqueAng', 'DepunaiserMarqueAng'])
  this.expandableBars.push(this.barMarques)
  new ToolbarArrow(this, this.barMarques)
  /** @type {ExpandableBar} */
  this.barLieux = new ExpandableBar(this, 'Lieux', ['LieuParPtLie', 'LieuParVariable', 'LieuDiscretParPtLie', 'LieuDiscretParVariable',
    'SegCur', 'CourbeFonc', 'CourbeFoncCr', 'CourbeAvecTan', 'CourbePoly', 'GrapheSuiteRec', 'GrapheSuiteRecComp', 'LieuObjetParPtLie', 'LieuObjetParVariable'])
  this.expandableBars.push(this.barLieux)
  new ToolbarArrow(this, this.barLieux)
  /** @type {ExpandableBar} */
  this.barTransf = new ExpandableBar(this, 'Transf', ['Trans', 'SymAxiale', 'SymCentrale', 'Rot', 'Hom', 'Sim', 'Rapporteur',
    'TransParCoord', 'AddTransf'])
  this.expandableBars.push(this.barTransf)
  new ToolbarArrow(this, this.barTransf)
  /** @type {ExpandableBar} */
  this.barMes = new ExpandableBar(this, 'Mes', ['MesLong', 'MesLongOr', 'MesAngNor', 'MesAbsRep', 'MesOrdRep', 'MesAngOr', 'MesAbs',
    'MesCoefDir', 'MesLongLigne', 'MesAire', 'MesProSca', 'MesAffRep'])
  this.expandableBars.push(this.barMes)
  new ToolbarArrow(this, this.barMes)
  /** @type {ExpandableBar} */
  this.barDisp = new ExpandableBar(this, 'Disp', ['AffichageValeur', 'AffichageValeurLiePt', 'Commentaire',
    'CommentaireLiePt', 'Latex', 'LatexLiePt', 'ImageLibre', 'ImageLiee', 'AffichageEq', 'AffichageEqLie', 'AffichageCoord',
    'AffichageCoordLie', 'EditeurFormule', 'CreationLiaisonAff', 'SuppressionLiaisonAff', 'PunaiserAff', 'DepunaiserAff', 'AddDisp'])
  this.expandableBars.push(this.barDisp)
  new ToolbarArrow(this, this.barDisp)
  /** @type {ExpandableBar} */
  this.barCalculs = new ExpandableBar(this, 'Calculs', ['Curseur', 'Calcul', 'Fonc', 'Variable', 'Repere', 'SolutionEq',
    'Max', 'Min', 'Derivee', 'SuiteRec', 'CalculComp', 'FoncComp', 'SuiteRecComplexe', 'AddCalcul'])
  this.expandableBars.push(this.barCalculs)
  new ToolbarArrow(this, this.barCalculs)
  /** @type {ExpandableBar} */
  this.barSurfaces = new ExpandableBar(this, 'Surfaces', ['Surface', 'SurfaceArc', 'SurfaceLieuDroite', 'Surface2Lieux', 'SurfaceLieu2Pts', 'Couronne', 'DemiPlan'])
  this.expandableBars.push(this.barSurfaces)
  new ToolbarArrow(this, this.barSurfaces)
  /** @type {ExpandableBar} */
  this.barDivers = new ExpandableBar(this, 'Divers', ['AddDivers'])
  this.expandableBars.push(this.barDivers)
  new ToolbarArrow(this, this.barDivers)

  this.updateToolsToolBar()
}

/**
 * Fonction mettant à jour la palette de droite en fonction de l'outil actif
 */
MtgApp.prototype.updateRightPanel = function () {
  $(this.rightPanel).empty()
  const outilActif = this.outilActif
  const isPointTool = outilActif.isPointTool()
  const isLineTool = outilActif.isLineTool()
  const isSegmentMarkTool = outilActif.isSegmentMarkTool()
  const isAngleTool = outilActif.isAngleTool()
  const isArrowTool = outilActif.isArrowTool()
  const isSurfTool = outilActif.isSurfTool()
  const self = this
  const horGap = constantes.horGap
  const zf = this.zoomFactor
  // Préparation des composants de la barre d'outil de droite
  // Un g qui va contenir les boutons de choix de couleur prédéfinie
  let yc = constantes.toolbarHeight * zf // Cette variable contiendra successivement les ordonnées des composants de la barre de droite
  const tabls = constantes.tableStyleTrait
  if (isLineTool) {
    /**
     * Style de ligne
     * @type {SVGGElement}
     */
    this.gLineStyle = cens('g', {
      transform: 'translate(' + (isPointTool ? '0' : String(constantes.buttonStyleWidth * zf)) + ',' + yc + ')'
    })
    /*
    this.gLineStyle = cens('g', {
      transform: 'translate(0,' + yc + ')'
    })
     */
    /**
     * boutons de choix de style de ligne
     * @type {LineStyleButton[]}
     */
    this.lineStyleButtons = []
    this.rightPanel.appendChild(this.gLineStyle)
    for (let i = 0; i < tabls.length; i++) {
      const c = tabls[i]
      this.lineStyleButtons.push(new LineStyleButton(this, c[0], c[1], i, yc))
    }
    this.selectButton(this.lineStyle, this.lineStyleButtons)
    if (!isPointTool) yc += horGap + constantes.lineStyleButtonHeight * zf * tabls.length
  }
  if (isPointTool) {
    /**
     * boutons de choix de style de point
     * @type {ButtonStyleButton[]}
     */
    this.buttonStyleButtons = []
    /**
     * Panneau des styles de point
     * @type {SVGGElement}
     */
    this.pointStylePanel = cens('g', {
      transform: 'translate(' + (isLineTool ? constantes.lineStyleWidth * zf : 0) + ',' + yc + ')'
    })
    let ind = 0
    const tab = [[MotifPoint.croix, 'Croix'], [MotifPoint.multi, 'Mult'], [MotifPoint.losange, 'Losange'],
      [MotifPoint.petitRond, 'PetitRond'], [MotifPoint.rond, 'Rond'], [MotifPoint.pave, 'Pave'],
      [MotifPoint.grandRond, 'GrandRond'], [MotifPoint.grandMult, 'GrandMult'], [MotifPoint.pixel, 'Pixel']]
    const nbcol = isLineTool ? 2 : 5
    const nblig = isLineTool ? 4 : 2
    for (let i = 0; i < nbcol; i++) {
      for (let j = 0; j < nblig; j++) {
        if (ind < tab.length) {
          const c = tab[ind]
          this.buttonStyleButtons.push(new ButtonStyleButton(this, c[0], 'stylePoint' + c[1], j, i, yc))
        } else break
        ind++
      }
    }
    this.rightPanel.appendChild(this.pointStylePanel)
    this.selectButton(this.getStylePoint(), this.buttonStyleButtons)
    yc += horGap + (isLineTool ? constantes.lineStyleButtonHeight * zf * tabls.length : constantes.buttonStyleWidth * zf * 2)
    // Fin de la création des boutons de choix de style de point
  }
  if (isLineTool || isSegmentMarkTool) {
    /**
     * slider de choix d'épaisseur de trait
     * @type {Slider}
     */
    this.thicknessSlider = new Slider(this, constantes.rightPanelWidth, constantes.sliderHeight, 1, 12, this.thickness, 2, 1,
      'ChoixEpaisseur', 'translate(0,' + yc + ')', '', yc, (newval) => {
        this.thickness = newval
      })
    this.rightPanel.appendChild(this.thicknessSlider.container)
    yc += horGap + constantes.sliderHeight * zf
    // Fin de l'ajout du slider de choix d'épaisseur de trait
  }

  if (isSegmentMarkTool) {
    /**
     * boutons de choix de style de marque de segment
     * @type {MarqueSegmentButton[]}
     */
    this.marqueSegmentButtons = []
    /**
     * Marque de segment
     * @type {SVGGElement}
     */
    this.marqueSegmentPanel = cens('g', {
      transform: 'translate(' + String(constantes.buttonMarqueWidth / 2 * zf) + ',' + yc + ')'
    })
    let ind = 0
    const tab = [[StyleMarqueSegment.marqueSimple, '1'], [StyleMarqueSegment.marqueDouble, '2'],
      [StyleMarqueSegment.marqueTriple, '3'], [StyleMarqueSegment.marqueCroix, '4']]
    for (let i = 0; i < 4; i++) {
      const c = tab[ind]
      this.marqueSegmentButtons.push(new MarqueSegmentButton(this, c[0], 'styleMarqueSegment' + c[1], 0, i, yc))
      ind++
    }
    this.rightPanel.appendChild(this.marqueSegmentPanel)
    this.selectButton(this.styleMarqueSegment, this.marqueSegmentButtons)
    yc += horGap + constantes.buttonMarqueWidth * zf
    // Fin de la création des boutons de choix de style de marque de segment
  }
  if (isArrowTool) {
    /**
     * boutons de choix de style de flèche
     * @type {StyleFlecheButton[]}
     */
    this.styleFlecheButtons = []
    /**
     * Bouton courant du style de flèche ?
     * @type {SVGGElement}
     */
    this.styleFlechePanel = cens('g', {
      transform: 'translate(' + String(constantes.buttonMarqueWidth / 2 * zf) + ',' + yc + ')'
    })
    let ind = 0
    const tab = [[StyleFleche.FlecheLonguePleine, '1'], [StyleFleche.FlecheCourtePleine, '2'],
      [StyleFleche.FlecheLongueSimple, '3'], [StyleFleche.FlecheCourteSimple, '4']]
    for (let i = 0; i < 4; i++) {
      const c = tab[ind]
      this.styleFlecheButtons.push(new StyleFlecheButton(this, c[0], 'styleFleche' + c[1], 0, i, yc))
      ind++
    }
    this.rightPanel.appendChild(this.styleFlechePanel)
    this.selectButton(this.styleFleche, this.styleFlecheButtons)
    yc += horGap + constantes.buttonMarqueWidth * zf
    // Fin de la création des boutons de choix de style de flèche
  }
  if (isAngleTool) {
    /**
     * boutons de choix de style de marque d'angle
     * @type {MarqueAngleButton[]}
     */
    this.marqueAngleButtons = []
    /**
     * Bouton courant du style de marque d'angle ?
     * @type {SVGGElement}
     */
    this.marqueAnglePanel = cens('g', {
      transform: 'translate(0,' + yc + ')'
    })
    let ind = 0
    const tab = [[StyleMarqueAngle.marqueSimple, '1'], [StyleMarqueAngle.marquePleine, '6'],
      [StyleMarqueAngle.marqueSimple1Trait, '2'], [StyleMarqueAngle.marquePleine1Trait, '7'],
      [StyleMarqueAngle.marqueSimple2Traits, '3'], [StyleMarqueAngle.marquePleine2Traits, '8'],
      [StyleMarqueAngle.marqueSimple3Traits, '4'], [StyleMarqueAngle.marquePleine3Traits, '9'],
      [StyleMarqueAngle.marqueSimpleCroix, '5'], [StyleMarqueAngle.marquePleineCroix, '10']]
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 2; j++) {
        const c = tab[ind]
        this.marqueAngleButtons.push(new MarqueAngleButton(this, c[0], 'styleMarqueAngle' + c[1], j, i, yc))
        ind++
      }
    }
    this.rightPanel.appendChild(this.marqueAnglePanel)
    this.selectButton(this.styleMarqueAngle, this.marqueAngleButtons)
    yc += horGap + constantes.buttonMarqueWidth * zf * 2
    // Fin de la création des boutons de choix de style de marque d'angle
  }
  if (isSurfTool) {
    // On ne met pas la palette de styles de remplissage pour les outils générant des marques d'angle
    if (!isAngleTool) {
      /**
       * boutons de choix de type de remplissage
       * @type {StyleRemplissageButton[]}
       */
      this.styleRemplissageButtons = []
      /**
       * Bouton courant du type de remplissage ?
       * @type {SVGGElement}
       */
      this.styleRemplissagePanel = cens('g', {
        transform: 'translate(0,' + yc + ')'
      })
      let ind = 0
      const tab = [[StyleRemplissage.transp, 'Transp'],
        [StyleRemplissage.haut45, '45Haut'],
        [StyleRemplissage.plein, 'Plein'],
        [StyleRemplissage.horizontal, 'Hor'],
        [StyleRemplissage.bas45, '45Bas'],
        [StyleRemplissage.vertical, 'Ver']]
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
          const c = tab[ind]
          this.styleRemplissageButtons.push(new StyleRemplissageButton(this, c[0], 'styleRemp' + c[1], j, i, yc))
          ind++
        }
      }
      this.rightPanel.appendChild(this.styleRemplissagePanel)
      this.selectButton(this.styleRemplissage, this.styleRemplissageButtons)
      yc += horGap + constantes.buttonFillHeight * zf * 2
    }
    // Version 7.8.1 : On ajoute un rectangle d'aperçu du style de remplissage
    // Pour ça on crée quatre points puis un polygone qu'on remplit du style de surface actif

    const listePreviewSurf = new CListeObjets(uniteAngleDegre, 'previewFill', this.decimalDot)
    const w1 = constantes.rightPanelWidth * zf
    const h1 = constantes.previewFillHeight * zf
    const coord = [[2, yc + 4], [w1 - 2, yc + 4], [w1 - 2, yc + h1], [2, yc + h1]]
    const noeuds = []
    for (let i = 0; i < 4; i++) {
      const pt = new CPointBase(listePreviewSurf, null, false, Color.black, true, 0, 0, true, '', 16, MotifPoint.petitRond, false, true, coord[i][0], coord[i][1])
      noeuds.push(new CNoeudPointeurSurPoint(listePreviewSurf, pt))
      listePreviewSurf.add(pt, this.rightPanel)
    }
    noeuds.push(new CNoeudPointeurSurPoint(listePreviewSurf, noeuds[0].pointeurSurPoint))
    const pol = new CPolygone(listePreviewSurf, null, false, Color.gray, false, new StyleTrait(this.listePreviewSurf, StyleTrait.styleTraitContinu, 2), noeuds)
    listePreviewSurf.add(pol)
    // On mémorise la surface d'aperçu de rempliassgae pour la mettre à jour qund on change la couleur, le style de remplissage ou l'opacité
    this.previewSurf = new CSurfacePolygone(listePreviewSurf, null, false, Color.black, false, StyleRemplissage.transp, pol)
    listePreviewSurf.add(this.previewSurf)
    listePreviewSurf.positionne(false, new Dimf(w1, yc + h1))
    listePreviewSurf.afficheTout(0, this.rightPanel, true, this.doc.couleurFond, true)
    yc += horGap + h1 + 5
  }

  if (outilActif.isGraphicTool()) {
    /**
     *
     * @type {SVGGElement}
     */
    this.colorPanel = cens('g', {
      transform: 'translate(0,' + yc + ')'
    })
    const colorPanelHeight = (4 * constantes.colorButtonHeight) * zf + 2
    this.rightPanel.appendChild(this.colorPanel)
    this.colorPanel.appendChild(cens('rect', {
      x: 0,
      y: 0,
      stroke: constantes.buttonBackGroundColor,
      width: constantes.rightPanelWidth * zf,
      height: colorPanelHeight,
      fill: constantes.buttonFrameColor
    }))
    // Ajout des 16 boutons de choix de couleur
    const tab = [[0, 0, 0], [0, 0, 255], [0, 255, 0], [255, 0, 0], [0, 255, 255], [255, 0, 255], [255, 255, 0], [127, 127, 127],
      [0, 0, 127], [0, 127, 0], [127, 0, 0], [0, 127, 127], [127, 0, 127], [127, 127, 0], [102, 102, 102], [51, 51, 51]]
    let ind = 0
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const c = tab[ind]
        new OneColorButton(this, c[0], c[1], c[2], i, j, yc)
        ind++
      }
    }
    //
    yc += horGap + colorPanelHeight
    // Création des deux ellipses : Une pour lancer un color picker et l'autre pour montrer l'effet de transparence
    /** @type {ColorChoicePanel} */
    this.colorChoicePanel = new ColorChoicePanel(this, yc)
    this.rightPanel.appendChild(this.colorChoicePanel.container)
    yc += horGap + constantes.colorChoicePanelHeight * zf
    /** @type {Slider} */
    this.opacitySlider = new Slider(this, constantes.rightPanelWidth, constantes.sliderHeight, 5, 100, Math.round(this.opacity * 100), 4, 5,
      'ChoixOpacite', 'translate(0,' + yc + ')', '%', yc, function (newval) {
        self.opacity = Math.round(newval * 100) / 10000 // On arrondit l'opacité à 3 chiffres après la virgule
        self.colorChoicePanel.update()
        if (self.outilActif.isSurfTool()) self.updatePreviewSurf()
      })
    this.rightPanel.appendChild(this.opacitySlider.container)
    if (outilActif.isSurfTool()) this.updatePreviewSurf()
    this.colorChoicePanel.update()
    yc += horGap + constantes.sliderHeight * zf
  }

  /**
   * Panneau du bouton stop
   * @type {SVGGElement}
   */
  this.stopPanel = cens('g', {
    transform: 'translate(0,' + yc + ')'
  })
  this.rightPanel.appendChild(this.stopPanel)
  /** @type {StopButton} */
  this.stopButton = new StopButton(this, 'stop', yc)
  this.stopPanel.appendChild(this.stopButton.container)
  this.showStopButton(false)
}

MtgApp.prototype.updatePreviewSurf = function () {
  const surf = this.previewSurf
  surf.styleRemplissage = this.getStyleRemplissage()
  surf.donneCouleur(this.getCouleur())
  surf.update(this.rightPanel, this.doc.couleurFond)
}

/**
 * Fonction renvoyant le nombre de boutons de la barre horizontale
 * @returns {number}
 */
MtgApp.prototype.nbIconesToolbar = function nbIconesToobar () {
  const doc = this.doc

  const estExercice = this.estExercice
  //
  let nbOutil = 6 // Pour l'outil de dernière indication, boutons annuler-refaire, bouton sup
  // boutons nommer et déplacer nom
  if (this.newFig) nbOutil++
  const b = !estExercice && window.File && window.FileReader && window.FileList && window.Blob
  if (this.open && b) nbOutil++
  if (this.save) nbOutil++
  if (doc.toolDispo(this.outilModifObjGraph.toolIndex)) nbOutil++
  if (doc.toolDispo(this.outilZoomPlus.toolIndex)) nbOutil++
  if (doc.toolDispo(this.outilZoomMoins.toolIndex)) nbOutil++
  if (!this.translatable && doc.toolDispo(this.outilTranslationFigure.toolIndex)) nbOutil++
  if (doc.toolDispo(this.outilModifObjNum.toolIndex)) nbOutil++
  if (doc.toolDispo(this.outilPalette.toolIndex)) nbOutil++
  if (doc.toolDispo(this.outilCopierStyle.toolIndex)) nbOutil++
  // En mode exercice on n'affiche pas les 4 boutons suivants mais on les crée pour qu'ils soient dispo dans le choix des options
  if (!estExercice && doc.toolDispo(this.outilModeTrace.toolIndex)) nbOutil++
  if (!estExercice && doc.toolDispo(this.outilModePointsAuto.toolIndex)) nbOutil++
  if (!estExercice && doc.toolDispo(this.outilModeAutoComplete.toolIndex)) nbOutil++
  if (!estExercice && doc.toolDispo(this.outilRecalculer.toolIndex)) nbOutil++
  // Fin
  if (doc.toolDispo(this.outilUseLens.toolIndex)) nbOutil++
  if (doc.toolDispo(this.outilGomme.toolIndex)) nbOutil++
  if (doc.toolDispo(this.outilRideau.toolIndex)) nbOutil++
  if (doc.toolDispo(this.outilExecutionMacro.toolIndex)) nbOutil++
  // En mode exercice on n'active pas le bouton d'exportation ni le bouton de rectangle de sélection
  if (!estExercice) nbOutil += 2 // Pour l'icône de rectangle de sélection et celle d'exportation
  // En mode electron ou pwa, pas de bouton help
  if (!this.electron && !this.pwa) nbOutil++
  if (this.modeBilan || this.forceProtocol || doc.toolDispo(this.outilProtocole.toolIndex)) nbOutil++
  if (this.options) nbOutil++
  // En mode exercice on n'affiche pas le bouton Outils supplémentaires
  if (!estExercice && (doc.toolDispo(this.outilToggleToolsAdd.toolIndex))) nbOutil++
  return nbOutil
}

MtgApp.prototype.setZoomFactor = function (width, height) {
  const nbIcon = this.nbIconesToolbar() // Nombre d'icones de la barre horizontale
  // On a au maximum 27 icônes sur la barre horizontale avec une largeur par défaut d'icône de 32
  // pixels et on rajoute 4 pixels
  // En hauteur on a au maximum 14 rangées de barre déroulables de hauteur 32 pixels plus le padding
  // de la barre plus l'écart entre les rangées en comptant 39 pixels par barre
  const w = nbIcon * 36
  const tailleIconVert = this.electron ? 36 : 37
  const h = 14 * tailleIconVert // 14 est le nombre de toolbars déroulantes
  let zoomFactor = Math.floor(Math.min(width / w, height / h) * 100) / 100
  if (zoomFactor > 1.5) zoomFactor = 1.5
  this.zoomFactor = zoomFactor
}
