import { fixSvgContainer } from 'src/kernel/dom'
import MtgApp from 'src/MtgApp'
import CAffLiePt from 'src/objets/CAffLiePt'
import CArcDeCercle from 'src/objets/CArcDeCercle'
import CCercleOA from 'src/objets/CCercleOA'
import CCercleOR from 'src/objets/CCercleOR'
import CCommentaire from 'src/objets/CCommentaire'
import CDemiDroiteOA from 'src/objets/CDemiDroiteOA'
import CDroiteAB from 'src/objets/CDroiteAB'
import CDroiteParallele from 'src/objets/CDroiteParallele'
import CDroitePerpendiculaire from 'src/objets/CDroitePerpendiculaire'
import CGrandArcDeCercle from 'src/objets/CGrandArcDeCercle'
import CLatex from 'src/objets/CLatex'
import CPointBase from 'src/objets/CPointBase'
import CPointDansRepere from 'src/objets/CPointDansRepere'
import CSegment from 'src/objets/CSegment'
import CValeur from 'src/objets/CValeur'
import CValeurAngle from 'src/objets/CValeurAngle'
import CVecteur from 'src/objets/CVecteur'
import { rgbToColor } from 'src/types/Color'
import NatObj from 'src/types/NatObjAdd'
import StyleEncadrement from 'src/types/StyleEncadrement'
import StyleFleche from 'src/types/StyleFleche'
import StyleTrait from 'src/types/StyleTrait'
import CIntDroiteDroite from 'src/objets/CIntDroiteDroite'
import CIntDroiteCercle from 'src/objets/CIntDroiteCercle'
import Pointeur from 'src/types/Pointeur'
import CAutrePointIntersectionDroiteCercle from 'src/objets/CAutrePointIntersectionDroiteCercle'
import CPointLieBipoint from 'src/objets/CPointLieBipoint'
import CAutrePointIntersectionCercles from 'src/objets/CAutrePointIntersectionCercles'
import CIntCercleCercle from 'src/objets/CIntCercleCercle'
import CMesureX from 'src/objets/CMesureX'
import CMesureY from 'src/objets/CMesureY'
import CNoeudPointeurSurPoint from 'src/objets/CNoeudPointeurSurPoint'
import CPolygone from 'src/objets/CPolygone'
import CSurfaceDisque from 'src/objets/CSurfaceDisque'
import CSurfaceSecteurCirculaire from 'src/objets/CSurfaceSecteurCirculaire'
import StyleRemplissage from 'src/types/StyleRemplissage'
import CSurfacePolygone from 'src/objets/CSurfacePolygone'
import CPointLieCercle from 'src/objets/CPointLieCercle'
import CPointLieDroite from 'src/objets/CPointLieDroite'
import addQueue from 'src/kernel/addQueue'
import { figVide } from 'src/kernel/figures'
import CArcDeCercleDirect from 'src/objets/CArcDeCercleDirect'
import CArcDeCercleIndirect from 'src/objets/CArcDeCercleIndirect'
import StyleMarqueAngle from 'src/types/StyleMarqueAngle'
import CMarqueAngleGeometrique from 'src/objets/CMarqueAngleGeometrique'
import StyleMarqueSegment from 'src/types/StyleMarqueSegment'
import CMarqueSegment from 'src/objets/CMarqueSegment'
import CPointLiePoint from 'src/objets/CPointLiePoint'
import Nat from 'src/types/Nat'
import CCalcul from 'src/objets/CCalcul'
import CLongueur from 'src/objets/CLongueur'
import CalcR from 'src/kernel/CalcR'
import CTranslation from 'src/objets/CTranslation'
import CPointImage from 'src/objets/CPointImage'
import CRotation from 'src/objets/CRotation'
import CHomothetie from 'src/objets/CHomothetie'
import CSymetrieCentrale from 'src/objets/CSymetrieCentrale'
import CSymetrieAxiale from 'src/objets/CSymetrieAxiale'
import CMilieu from 'src/objets/CMilieu'
import CObjetDuplique from 'src/objets/CObjetDuplique'
import NatCal from 'src/types/NatCal'
import { mousePosition, touchPosition } from 'src/kernel/kernelAdd'
import CRepere from 'src/objets/CRepere'
import CLieuDePoints from 'src/objets/CLieuDePoints'
import InfoLieu from 'src/types/InfoLieu'
import CMesureAffixe from 'src/objets/CMesureAffixe'
import CCalculComplexe from 'src/objets/CCalculComplexe'
import CalcC from 'src/kernel/CalcC'
import CPointParAffixe from 'src/objets/CPointParAffixe'
import CValeurComp from 'src/objets/CValeurComp'
import CResultatValeur from 'src/objets/CResultatValeur'
import CResultatValeurComplexe from 'src/objets/CResultatValeurComplexe'
import CSurfaceLieu from 'src/objets/CSurfaceLieu'
import CFonc from 'src/objets/CFonc'
import CFoncComplexe from 'src/objets/CFoncComplexe'
import CPointLieLieuParPtLie from 'src/objets/CPointLieLieuParPtLie'
import CDerivee from 'src/objets/CDerivee'
import CDroiteOm from 'src/objets/CDroiteOm'
import { uniteAngleDegre, uniteAngleRadian } from 'src/kernel/kernel'
import CMediatrice from 'src/objets/CMediatrice'
import CAppelFonction from 'src/objets/CAppelFonction'
import CConstante from 'src/objets/CConstante'
import CCbGlob from 'src/kernel/CCbGlob'
import CBissectrice from 'src/objets/CBissectrice'
import CTestExistence from 'src/objets/CTestExistence'
import CSimilitude from 'src/objets/CSimilitude'
import CDroiteImage from 'src/objets/CDroiteImage'
import CDemiDroiteImage from 'src/objets/CDemiDroiteImage'
import CCercleImage from 'src/objets/CCercleImage'
import CArcDeCercleImage from 'src/objets/CArcDeCercleImage'
import natObj from 'src/types/NatObj'
// @ts-ignore TS7016: Could not find a declaration file for module …
import CMatrice from 'src/objets/CMatrice'
// @ts-ignore TS7016: Could not find a declaration file for module …
import CCalcMat from 'src/objets/CCalcMat'
// @ts-ignore TS7016: Could not find a declaration file for module …
import CTranslationParCoord from 'src/objets/CTranslationParCoord'
import CLieuObjetParPtLie from 'src/objets/CLieuObjetParPtLie'
import CLigneBrisee from 'src/objets/CLigneBrisee'
import CMesureAbscisse from 'src/objets/CMesureAbscisse'
import CVariableBornee from 'src/objets/CVariableBornee'
import { defaultSurfOpacity } from 'src/objets/CMathGraphDoc'
import CDroiteDirectionFixe from 'src/objets/CDroiteDirectionFixe'
// @ts-ignore TS7016: Could not find a declaration file for module …

// on veut que les méthodes décrites ici se retrouvent dans le types.d.ts généré par tsd-jsdoc, pour simplifier leur usage dans d'autres applications.
// On a fait différents tests pour arriver à ce que le mixin (cf https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Classes#les_mix-ins
// et https://jsdoc.app/tags-mixes.html) se retrouve dedans.

// Passer par une vraie classe MtgApi avec ses propriétés svg & list complique plutôt le merge dans MtgApp|MtgAppLecteur,
// on opte finalement pour ajouter les "méthodes" comme propriété (de type fonction) à l'appli), en précisant pour chacune les tags name & memberOf MtgApi
// afin que le mixin/mixes soit correctement interprétés par tsd-jsdoc
// les tentatives pour se passer de @mixes et @mixin (avec des interfaces) ont échouées (ça plaît pas au ts de sesaparcours)

// @todo vérifier si l'on peut créer plusieurs svg dans la même page avec un mtgAppLecteurApi
//  (car en appelant plusieurs fois mtgLoad ça retourne la même instance du lecteur)

/**
 * MtgAppLecteur avec les méthodes de l'api ajoutées
 * @class MtgAppLecteurApi
 * @extends MtgAppLecteur
 * @mixes MtgApi
 */
/**
 * MtgApp avec les méthodes de l'api ajoutées
 * @class MtgAppApi
 * @extends MtgApp
 * @mixes MtgApi
 */
const avertIntExisteDeja = 'The intersection asked for already exists'
const avertErreurNomCalc = 'This calculation name is incorrect : '
const avertCalcExist = 'A calculation with this name already exists : '
const avertErreurFormula = 'This  calculation formula is not valid : '
const avertPoly = 'A polygon must be defined with an array containing names of existing points or points'
const avertNoUnity = 'The figure has no unity length'
const avertUnity = 'The figure has already an unity length'
const avertPtLocus = 'Point locus error'
const avertPtLocusx = avertPtLocus + ' : x must a constant and integer value, at least 4'
const avertObLocus = 'Object locus error'
const avertNotLine = 'Parameter elt is not a line object'
const avertTest = " must not be  numrical value but a dynamic value (or it's name)"
const avertVarName = 'Invalid variable name if param varName of function definition'
const avertPointByName = 'Argument of getPointByName must be a string (already existing point name or tag)'
const avertIncorrectMat = 'Matrix argument incorrect: '
const avertnoFinite = ' is not a finite number'
const avertVariable = 'Variable creation error : '

/**
 * Returns the arrow style associated with string style
 * @private
 * @param {string} style
 * @returns {number}
 */
function getArrowStyle (style) {
  switch (style) {
    case 'short': return StyleFleche.FlecheCourteSimple
    case 'long': return StyleFleche.FlecheLongueSimple
    case 'shortfull': return StyleFleche.FlecheCourtePleine
    case 'longfull': return StyleFleche.FlecheLonguePleine
    default :
      if (style) console.warn(Error(`style "${style}" not accounted for an arrow => default "longfull" style will be used`))
      return StyleFleche.FlecheLonguePleine
  }
}

/**
 * Returns the frame style associated to the string style
 * @private
 * @param {string} style
 * @returns {number}
 */
function getFrameStyle (style) {
  switch (style) {
    case 'none': return StyleEncadrement.Sans
    case 'simple': return StyleEncadrement.Simple
    case '3D' : return StyleEncadrement.Effet3D
    default :
      if (style) console.warn(Error(`style ${style} not accounted for a frame => default "none" style will be used`))
      return StyleEncadrement.Sans
  }
}

/**
 * Returns the segment mark style associated to the string style
 * @private
 * @param {string} style
 * @returns {number}
 */
function getSegmentMarkStyle (style) {
  switch (style) {
    case '-': return StyleMarqueSegment.marqueSimple
    case '--': return StyleMarqueSegment.marqueDouble
    case '---': return StyleMarqueSegment.marqueTriple
    case 'x': return StyleMarqueSegment.marqueCroix
    default:
      if (style) console.warn(Error(`style "${style}" not accounted for a segment mark => default "-" will be used`))
      return StyleMarqueSegment.marqueSimple
  }
}

/**
 * Returns the angle mark style associated to the sting style
 * @private
 * @param {string} style
 * @returns {number}
 */
function getAngleMarkStyle (style) {
  switch (style) {
    case 'simple': return StyleMarqueAngle.marqueSimple
    case 'simple-': return StyleMarqueAngle.marqueSimple1Trait
    case 'simple--': return StyleMarqueAngle.marqueSimple2Traits
    case 'simple---': return StyleMarqueAngle.marqueSimple3Traits
    case 'simplex': return StyleMarqueAngle.marqueSimpleCroix
    case 'full': return StyleMarqueAngle.marquePleine
    case 'full-': return StyleMarqueAngle.marquePleine1Trait
    case 'full--': return StyleMarqueAngle.marquePleine2Traits
    case 'full---': return StyleMarqueAngle.marquePleine3Traits
    case 'fullx': return StyleMarqueAngle.marquePleineCroix
    default:
      if (style) console.warn(Error(`angle mark style ${style} not accounted for, replaced by full`))
      return StyleMarqueAngle.marquePleine
  }
}

/**
 * Returns the surface filling style associated to the string style
 * @private
 * @param {string} style
 * @returns {number}
 */
function getFillStyle (style) {
  switch (style) {
    case 'vert' : return StyleRemplissage.vertical
    case 'hor' : return StyleRemplissage.horizontal
    case '/' : return StyleRemplissage.haut45
    case '\\' : return StyleRemplissage.bas45
    case 'fill' : return StyleRemplissage.plein
    case 'transp' : return StyleRemplissage.transp
    default:
      if (style) console.warn(Error(`style "${style}" not accounted for a filling => default "transp" will be used`))
      return StyleRemplissage.transp
  }
}

/**
 * Returns the line style associated to string style
 * @private
 * @param {string} style
 * @returns {number}
 */
function getLineStyle (style) {
  switch (style) {
    case 'line':
    case '-':
      return StyleTrait.styleTraitContinu
    case 'dot':
    case '.':
      return StyleTrait.styleTraitPointille
    case 'dashdash':
    case '--':
      return StyleTrait.styleTraitTrait
    case 'dashdotdot':
    case '-..':
      return StyleTrait.styleTraitPointPoint
    case 'dashdotdotdot':
    case '-...':
      return StyleTrait.styleTraitPointPointPoint
    case 'dashdashdash':
    case '---':
      return StyleTrait.styleTraitTraitLongTrait
    default:
      if (style) console.warn(Error(`style "${style}" not accounted for a line => default "-" will be used`))
      return StyleTrait.styleTraitContinu
  }
}
/**
 * Ensures that object options contains the properties props defined (not null neither undefined)
 * @private
 * @param {ApiOptions} options the options (object)
 * @param {Object} values the values calculated from the options
 * @param {string[]} props The list of the properties thad need to be defined
 * @throws {TypeError} sinon
 */
const ensureDef = (options, values, props) => {
  for (const prop of props) {
    if (options[prop] == null) throw TypeError(`Option ${prop} is mandatory`)
    if (values[prop] == null) throw TypeError(`Option ${prop} is mandatory, ${options[prop]} was provided but does not match an object of the figure`)
  }
}

/**
 * Ensures that values is a finite number and not nullish
 * @private
 * @param {string} prop
 * @param {number} value
 * @param {Object} [options]
 * @param {boolean} [options.isInt]
 * @param {number} [options.min]
 * @param {number} [options.max]
 * @throws {TypeError} sinon
 */
const ensureUndefOrNumber = (prop, value, { isInt, min, max } = {}) => {
  if (value == null) return // on accepte null ou undefined
  if (!Number.isFinite(value)) throw Error(`Option ${prop} invalid, not a finite number (${typeof value} : ${value})`)
  if (isInt && !Number.isInteger(value)) throw Error(`Option ${prop} invalid, not an integer (${value})`)
  if (min && value < min) throw TypeError(`Option ${prop} invalid, ${value} < ${min}`)
  if (max && value > max) throw TypeError(`Option ${prop} invalid, ${value} < ${max}`)
}
/**
 * Ensures that value is a string or a number if value is not null
 * If value is a string, ensures that the string contains a formula that is valid for mtg32
 * @private
 * @param {CListeObjets} list the current object list
 * @param {string} prop
 * @param {number|string|CValDyn} value
 * @param {boolean} complex true if the number must be a complex number
 * @return {number|string|null|CValDyn}
 */
const ensureUndefOrNumberOrStringOrCalc = (list, prop, value, complex) => {
  if (value == null) return null // on accepte null ou undefined
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw Error(`Option ${prop} invalid: (${typeof value} : ${value}) ${avertnoFinite}`)
    }
    return value
  }
  if (typeof value.estDeNatureCalcul === 'function' && value.estDeNatureCalcul(complex ? NatCal.NTteValC : NatCal.NTteValR)) {
    return value
  }
  if (typeof value === 'string') {
    if (value === '') {
      throw Error(`Option ${prop} invalid, neither a number nor a formula (empty string)`)
    }
    const isSyntaxOk = complex
      ? list.verifieSyntaxeComplexe(value)
      : list.verifieSyntaxe(value)
    if (!isSyntaxOk) {
      throw Error(`Syntax error in formula : ${value}`)
    }
    return value
  }
  throw Error(`Option ${prop} invalid, not a number neither a string nor a calculation (${typeof value})`)
}

/**
 * Ensures that value is an array of arrays of the same length and each element of the array
 * is either a finite number, a dynamic real object or a valid formula
 * @private
 * @param {CListeObjets} list the list containing the object value
 * @param {null|undefined|Array<string[]|number[]|CElementBase[]>} value
 */
const ensureUndefOrArrayOfNumberOrStringOrCalc = (list, value) => {
  if (value == null) return null // on accepte null ou undefined
  if (!Array.isArray(value)) throw Error(`${avertIncorrectMat} not an array`)
  const p = value[0].length
  for (const line of value) {
    if (!Array.isArray(line)) throw Error(`${avertIncorrectMat} not an array of array`)
    if (line.length !== p) throw Error(`${avertIncorrectMat} not an array of same size arrays`)
    for (const elt of line) {
      if (typeof elt === 'number') {
        if (!Number.isFinite(elt)) throw Error(`${avertIncorrectMat} ${elt} ${avertnoFinite}`)
      } else if (typeof elt === 'string') {
        if (!list.verifieSyntaxe(elt)) throw Error(`${avertIncorrectMat} ${elt} is not a valid formula`)
      } else if (!elt || typeof elt !== 'object' || typeof elt.estDeNatureCalcul !== 'function' || !elt.estDeNatureCalcul(NatCal.NTteValR)) {
        throw Error(`${avertIncorrectMat} ${elt} is not a number neither a string nor a calculation`)
      }
    }
  }
}

/**
 * Ensures that value passed in parameter prop is an empty string or the name of a calculation or function or a calculation or function
 * @private
 * @param {CListeObjets} list the current object list
 * @param {string} prop
 * @param {number|string|CCalculAncetre} value
 * @param {boolean} noDer if true parameter calc may not be a derivative
 * @returns {string|CElementBase|null}
 */
const ensureUndefOrStringOrCalc = (list, prop, value, noDer) => {
  if (value == null) return null // on accepte null ou undefined
  const nat = noDer ? NatCal.NTtCalcouFoncRouC : Nat.or(NatCal.NTtCalcouFoncRouC, NatCal.NDerivee)
  if (typeof value !== 'string' && value?.estDeNatureCalcul(nat)) {
    return value
  } else {
    if (typeof value === 'string') {
      if (value === '') throw Error(`Parameter ${prop} invalid (empty string)`)
      const cal = list.pointeurParNatureCalcul(nat, value)
      if (cal === null) throw Error(`Error in parameter ${prop} : ${value} is not the name of a calculation or a function`)
      return cal
    } else {
      if (!value?.estDeNatureCalcul(nat)) throw Error(`Object passed in parameter ${prop} is neither a calculation nor a function`)
      else return value
    }
  }
}

/**
 * If value is not a string or an array of strings that may be the name of a formal variable in a function
 * throws an exception. Only used for a param named varName.
 * @private
 * @param {CListeObjets} list the current object list
 * @param {string|string[]} value
 * @returns {null|string|string[]}
 */
function ensureUndefOrValidNameVar (list, value) {
  if (!value) return null
  if (typeof value === 'string') {
    if (!list.validationNomVariableOuCalcul(value)) throw Error(avertVarName)
  } else {
    if (Array.isArray(value)) {
      for (const elt of value) {
        if (typeof elt !== 'string' || !list.validationNomVariableOuCalcul(value)) throw Error(avertVarName)
      }
    }
  }
  return value
}

/**
 * Ensures that value, if defined, is a string (not empty)
 * @private
 * @param {string} prop
 * @param {string} value
 * @throws {TypeError} sinon
 */
function ensureUndefOrString (prop, value) {
  if (value == null) return // on accepte null ou undefined
  if (typeof value !== 'string') throw Error(`Option ${prop} invalide, not a string (${typeof value})`)
  if (!value) throw TypeError(`Option ${prop} invalid, empty string`)
}

/**
 * Ensures that the name value for property prop is valid and is not already in use
 * @private
 * @param {CListeObjets} list
 * @param {string} prop The property name (name or name2)
 * @param {String} value The name to be assigned as property prop
 * @param {boolean} nameForLine if true the name value is meant to be a name for a line otherwise a name for a point
 */
function ensureNameIsValidOrUndef (list, prop, value, nameForLine) {
  if (value == null) return // on accepte null|undefined

  /* Abandonné car Tommy a donné des noms de points non valides.
  const ch = 'name for a ' + (nameForLine ? 'line' : 'point')
  if ((value !== undefined) && (value !== '') && ((typeof value !== 'string') ||
    !(nameForLine ? Fonte.validationNomDroite(value) : Fonte.validationNomPoint(value)))) {
    throw Error(`Parameter ${prop} of value ${value} is an incorrect name ${ch}`)
  }
  if (value && list.existePointOuDroiteMemeNom(null, value, false)) {
    throw Error(`Parameter ${prop} is incorrect : the name ${value} is already used`)
  }
   */
  const ch = 'name for a ' + (nameForLine ? 'line' : 'point')
  if (typeof value !== 'string') {
    throw Error(`Parameter ${prop} has an incorrect type (${ch} must be a string)`)
  }
  // FIXME ça tolère la string vide, il faudrait pas plutôt throw dans ce cas ?
  if (value && list.existePointOuDroiteMemeNom(null, value, false)) {
    throw Error(`Parameter ${prop} is incorrect : the name ${value} is already used`)
  }
}

/**
 * Ensures that names is an array of strings containing the name of already existing points
 * @private
 * @param {CListeObjets} list
 * @param {string} prop
 * @param {string[]|CPt[]} names
 */
const ensurePointArray = (list, prop, names) => {
  const getError = (detail) => `Option ${prop} invalid (${detail}) : ${avertPoly}`
  if (!names) return
  if (!Array.isArray(names)) throw Error(getError('not an array'))
  for (const [i, name] of names.entries()) {
    if (!name) throw Error(getError('empty point'))
    if (typeof name === 'string') {
      const pt = list.getPointByName(name)
      if (pt === null) throw Error(getError(`${name} is not an existing point name`))
      names[i] = pt
    } else {
      if (!name?.estDeNature(NatObj.NTtPoint)) throw Error(getError(`${name?.name ?? `point at index ${i}`} is not a valid point`))
    }
  }
}

/**
 * Function returning the index of a point style associated to the string pointStyle
 * @private
 * @param {string} pointstyle the point style identifier (square|round|cross|…)
 * @returns {number}
 */
const getPointStyle = (pointstyle) => {
  if (typeof pointstyle !== 'string') return 1
  switch (pointstyle) {
    case 'square':
    case '[]':
      return 0
    case 'round':
    case 'O':
      return 1
    case 'cross':
    case '+':
      return 2
    case 'mult':
    case 'x':
      return 3
    case 'littleround':
    case 'o':
      return 5
    case 'diamond':
    case '<>':
      return 6
    case 'pixel':
    case '.':
      return 7
    case 'biground':
    case 'OO':
      return 8
    case 'bigmult':
    case 'X':
      return 9
    default : return 1
  }
}

/**
 * Returns a real calculation representing the string for the object list list
 * Before calling this function, it is necessary to verify that string contains a valid formula via list.verifieSyntaxe
 * @private
 * @param {CListeObjets} list
 * @param {string} ch
 * @returns {CCb}
 */
const getCalcFromString = (list, ch) => {
  return CalcR.ccb(ch, list, 0, ch.length - 1, null, list)
}

/**
 * Returns a complex calculation representing the string for the object list list
 * Before calling this function, it is necessary to verify that string contains a valid formula via list.verifieSyntaxe
 * @private
 * @param {CListeObjets} list
 * @param {string} ch
 * @returns {CCb}
 */
const getCalcCompFromString = (list, ch) => {
  return CalcC.ccbComp(ch, list, 0, ch.length - 1, null, list)
}

// on crée une classe pour notre mixin api, cf https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Classes#les_mix-ins
// et https://jsdoc.app/tags-mixes.html

// les deux classes MtgAppApi et MtgAppLecteurApi sont simplement là pour décrire cela, jamais instanciées directement

/**
 * Add the api methods on our application
 * @param {MtgApp|MtgAppLecteur} app
 * @param {MtgOptions} [options]
 * @param {boolean} [options.isPromiseMode=false] Passer true pour que les méthodes de l'api retournent des promesses (résolues lorsque l'affichage est fait) plutôt que les objets créés en synchrone
 * @returns {MtgAppApi|MtgAppLecteurApi}
 */
function addApi (app, { isPromiseMode } = {}) {
  /** @type {CListeObjets} */
  let listApi
  /** @type {SVGElement} */
  let svgApi
  const isEditor = app instanceof MtgApp
  if (isEditor) {
    // c'est un MtgApp
    listApi = app.doc.listePr
    svgApi = app.svgFigure
  } else if (app.docs.length > 1) {
    // y'a au moins une figure, on prend la première par défaut
    listApi = app.docs[0].listePr
    svgApi = /** @type {SVGElement} */ document.getElementById(app.docs[0].idDoc)
  }
  app.listApi = listApi
  app.svgApi = svgApi
  // Sinon c'est un player, on peut pas prendre le premier doc car il n'existe pas encore,
  // il faudra utiliser setApiDoc pour changer de doc en cours de route (sera fait au premier appel de getDefault si list n'existe pas).

  /**
   * Matrix
   * @typedef Matrix
   * @type {Array<Array<number|string|CValDyn>>}
   */
  /**
   * Array of two numbers
   * @typedef Dim
   * @type {Array}
   * @property {number} 0
   * @property {number} 1
   */

  /**
   * The available options for the api methods
   * @typedef ApiOptions
   * @property {string} [name] Name to be associated the the created object
   * @property {CPt|string} [a] point or name of point a
   * @property {CPt|string} [b] point or name of point b
   * @property {CPt|string} [o] point or name of point o
   * @property {CDroite|string} [d] line or line name or line tag
   * @property {string} [d2] line or line name or line tag
   * @property {string} [c] circle or circle tag
   * @property {string} [c2] circle or circle tag
   * @property {CElementLigne|string} [edge] edge of a surface
   * @property {CPolygone|string} [poly] polygon or tga of a polygon
   * @property {CElementGraphique|string} [elt] graphical object of the figure (or tag of the object)
   * @property {string} [elt2] raphical object of the figure (or tag of the object)
   * @property {Matrix} [mat]
   * @property {boolean} [hidden] true to get the created element masked
   * @property {boolean} [hiddenName] true to get the name of the created element masked
   * @property {boolean} [smartIntersect=true] Set to false to re-create points seen as already existing in circle intersection (with circle or line)
   * @property {string} [color] Color (with syntax '#rrggbb' or '#rgb' or 'rgb(r, g, b)' or basic color name like 'red' or 'black')
   * @property {number} [opacity] Opacity of a graphic element
   * @property {number} [thickness] Thickness of the stroke
   * @property {string} [arrowStyle=longfull] Arrow style (short|long|shortfull|longfull)
   * @property {string} [pointStyle=round] Point style (square|round|cross|mult|littleround|diamond|pixel|biground|bigmult)
   * @property {string} [lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
   * @property {string} [fillStyle=transp] Filling style (transp|fill|-|vert|hor|/|\)
   * @property {number|string|CValDyn} [r] Radius, Ratio of dilation
   * @property {number|string|CValDyn} [x] x-coordinate (absolute in the svg or relative to frame rep)
   * @property {number|string|CValDyn} [y] y-coordinate (absolute in the svg or relative to frame rep)
   * @property {number|string|CValDyn} [z] z affix (relative to frame rep)
   * @property {number} [min] min value of a variable
   * @property {number} [max] max value of a variable
   * @property {number} [step] min value of a variable
   * @property {boolean} [dialog] true if dialog is associated to a variable
   * @property {CTransformation} [transf] geometrical transformation (translation, rotation, dilation, axial symmetry, central symmetry or similitude)
   * @property {number} [offsetX] x-shift of the name of a point, text or latex display
   * @property {number} [offsetY] y-shift of the name of a point, text or latex display
   * @property {string|null|CRepere} [rep] Tag of the frame coordinates [x, y] refer to if present
   * @property {boolean} [absCoord] if true, initial coordinates for free points and linked poins are in svg coordinates, otherwise if parameter rep is present, a frame of tag 'rep' is used if present, if parameter rep is not present and the figure contains only one frame, this frame is used
   * @property {number} [fontSize] Font size for the name of a point or a line or font size for a text or LaTeX display
   * @property {string} [border] Border of a LaTeX or Text display (none|simple|3D)
   * @property {string} [backgroundColor] Background color (css like, #rrvvbb or basic color)
   * @property {string} [hAlign] Horizontal alignment for a text or LaTeX display left|center|right
   * @property {string} [vAlign] Vertical alignment for a text or LaTeX display top|middle|bottom
   * @property {string} [text] Text to be displayed
   * @property {string} [latex] Text to be displayed in LaTeX (without the surrounding $)
   * @property {string} [nameCalc] Name of a calculation to be created or to be modified
   * @property {string|string[]} [varName] formal variable name or array of formal variable names
   * @property {string|CCalculAncetre} [calc] Name of a calculation (real or complex) to be used or calculation itself
   * @property {string} [formula] Formula of a calculation to be created
   * @property {string[]} [points] Array elements of which are name of points for the creation of a polygon or a borken line
   * @property {boolean} [verticalGrid] true to get a  system of axis with a vertical grid
   * @property {boolean} [horizontalGrid] true to get a  system of axis with an horizontal grid
   * @property {boolean} [dottedGrid] true to get a  system of axis with a dotted grid
   * @property {boolean} [closed] true create a point locus closed
   * @property {string} [tag] Tag to be associated to the object created
   * @property {string} [tag2] Tag to be associated to the second created object in the case of an intersection line-circle or circle-circle
   * @property {string} [eventName] Name of an event (to be added or removed)
   * @property {EventSvgCallback} [callBack] CallBack function to associated to an event on a graphical object
   */

  /**
   * @typedef ApiDefaultValues
   * @property {string} [name]
   * @property {string} [name2]
   * @property {CPt|null} a
   * @property {CPt|null} b
   * @property {CPt|null} o
   * @property {CDroite|null} d a line
   * @property {CDroite|null} d2 a line
   * @property {CCercle|null} c a circle
   * @property {CCercle|null} c2 a circle
   * @property {CPolygone|CCercle|CArcDeCercleAncetre|null} edge a polygon or a circle or an arc of circle
   * @property {CPolygone|null} poly a polygon
   * @property {CElementGraphique|string|null} elt the tag of a graphical object of the figure
   * @property {CElementGraphique|string|null} elt2 the tag of a second graphical object of the figure
   * @property {boolean} hidden
   * @property {boolean} hiddenName
   * @property {boolean} smartIntersect
   * @property {Color} color
   * @property {boolean} opaque
   * @property {number} opacity
   * @property {number} thickness
   * @property {number} arrowStyle
   * @property {number} lineStyle
   * @property {number} pointStyle
   * @property {number} fillStyle
   * @property {number|string|CValDyn} [r]
   * @property {number|string|CValDyn} [k]
   * @property {number|string|CValDyn} [x]
   * @property {number|string|CValDyn} [y]
   * @property {number|string|CValDyn} [z]
   * @property {CTransformation} [transf]
   * @property {number} [offsetX]
   * @property {number} [offsetY]
   * @property {CRepere} [rep]
   * @property {boolean} [absCoord]
   * @property {number} [fontSize]
   * @property {number} [border]
   * @property {Color} [backgroundColor]
   * @property {string} [hAlign]
   * @property {string} [vAlign]
   * @property {string} [text] Text to display
   * @property {string} [latex] Text to display in LaTeX (without the surrounding $)
   * @property {string} [formula] Formula of a calculation to be created
   * @property {string} [nameCalc] Name of a calculation to be created
   * @property {string|string[]} [varName] Formal variable name or array of formal variable names
   * @property {string|CCalculAncetre} [calc] name of a calculation (real or complex) to be used or calculation itself
   * @property {string[]|CPt[]} [points] Array elements of which are name of points for the creation of a polygon or a broken line
   * @property {boolean} [verticalGrid] true to set a vertical grid on a system of axis
   * @property {boolean} [horizontalGrid] true to set a horizontal grid on a system of axis
   * @property {boolean} [dottedGrid] true to set a horizontal grid on a system of axis
   * @property {boolean} [closed] true to make a point locus closed
   * @property {string} [tag] Tag to be associated to the object created
   * @property {string} [tag2] Tag to be associated to the second created object in the case of an intersection line-circle or circle-circle
   * @property {string} [eventName] Name of an event associated to a graphical object(to be added or removed)
   * @property {EventSvgCallback} [callBack] CallBack function to associated to an event on a graphical object.
   */
  /**
   * returns the point of name name or name if name is a point object. If there is no such point, looks for a point with tag name
   * if found returns the point elt, else returns null
   * @private
   * @param {CListeObjets} list
   * @param name
   * @returns {CPt|null}
   */
  const getPointByNameOrTag = (list, name) => {
    if (name === '') return null
    if ((typeof name !== 'string') && name?.estDeNature) {
      if (name.estDeNature(NatObj.NTtPoint)) return name
      else throw Error('Incorrect object instead of point')
    }
    let pt = list.getPointByName(name)
    if (pt) return pt
    pt = list.getByTag(name)
    if (pt?.estDeNature(NatObj.NTtPoint)) return pt
    return null
  }

  /**
   * returns the polygon or circle (or arc) of tag name or name if name is a polygon or circle
   * @private
   * @param {CListeObjets} list
   * @param {string|CElementLigne} name
   * @returns {CElementLigne|null}
   */
  const getEdge = (list, name) => {
    if (name === '') return null
    const nat = Nat.or(NatObj.NTtCercle, NatObj.NPolygone, NatObj.NLieu)
    if ((typeof name !== 'string') && name?.estDeNature) {
      if (name.estDeNature(nat)) return name
      else throw Error('Incorrect object edge in surface')
    }
    const pt = list.getByTag(name)
    if (pt?.estDeNature(NatObj.NTteDroite)) return pt
    return null
  }

  /**
   * returns the line of tag name or name if name is a line object
   * @private
   * @param {CListeObjets} list
   * @param name
   * @returns {CElementGraphique|*|null}
   */
  const getLineByTag = (list, name) => {
    if (name === '') return null
    if ((typeof name !== 'string') && name?.estDeNature) {
      if (name.estDeNature(NatObj.NTteDroite)) return name
      else throw Error('Incorrect object for line parameter')
    }
    const pt = list.getByTag(name)
    if (pt?.estDeNature(NatObj.NTteDroite)) return pt
    else return null
  }

  /**
   * returns the circle of tag name or name if name is a circle object
   * @private
   * @param {CListeObjets} list
   * @param name
   * @returns {CElementGraphique|*|null}
   */
  const getCircleByTag = (list, name) => {
    if (name === '') return null
    if ((typeof name !== 'string') && name?.estDeNature(NatObj.NTtCercle)) return name
    const pt = list.getByTag(name)
    if (pt?.estDeNature(NatObj.NTtCercle)) return pt
    else return null
  }

  /**
   * returns the graphic object of tag name or name if name is a graphical object
   * @private
   * @param {CListeObjets} list
   * @param {string|null|undefined} name
   * @returns {CElementGraphique|undefined|null} undefined if name was falsy, name if it's already a CElementGraphique object, null if name doesn't exist in actual graphics objects list or the graphic object corresponding to the name
   * @throws {Error} if name isn't a string neigher a mathgraph graphical object
   */
  const getObjectByTagOrPointName = (list, name) => {
    if (!name) return
    if (typeof name === 'string') {
      const el = list.getByTag(name)
      if (el?.estDeNature(NatObj.NTtObj)) return el
      const pt = list.getPointByName(name)
      if (pt) return pt
      return null
    }
    // si ce n'est pas une string, on check le cas objet mtg valide pour le retourner
    if (typeof name?.estDeNature === 'function' && name.estDeNature(NatObj.NTtObj)) return name
    // sinon KO
    throw Error('Incorrect object as parameter (not a graphical element neither a name or tag)')
  }

  /**
   * if absCoord is false, set options.rep to a system of axis.
   * @private
   * @param {CListeObjets} list
   * @param {ApiOptions} options
   * @returns {CRepere|null}
   */
  const ensureRep = (list, options) => {
    const { absCoord, rep } = options
    if (absCoord) {
      options.rep = null
    } else {
      // Si absCoord est false, on doit travailler dans un repère
      if (typeof rep === 'string') {
        const repere = list.getByTag(rep)
        if (repere?.className === 'CRepere') {
          options.rep = repere
        } else {
          throw Error(`There is no frame of tag ${rep} in the figure`)
        }
      } else if (rep) {
        if (typeof rep.estDeNature !== 'function' || !rep.estDeNature(NatObj.NRepere)) {
          throw Error('rep prop is not a valid frame')
        }
        // sinon on a déjà un objet Repere et rien à faire
      } else {
        // On regarde si la figure ne comporte qu'un seul repère
        // (sauf si on a déjà un objet Repere)
        const nbrep = list.nombreObjetsParNatureVisibles(NatObj.NRepere)
        if (nbrep > 1) {
          throw Error('There is more than one frame in the figure. Specify in parameter rep the tag of the choses rep')
        } else {
          options.rep = list.premierRepVis()
        }
      }
    }
  }

  /**
   * Returns the default options (and verify type|value of the provided options)
   * @private
   * @param {CListeObjets} list
   * @param {ApiOptions} options
   * @param {string[]} mandatoryProps The mandatory properties (if it is an object tag, we verify an object with this tag exists)
   * @param {string[]} otherProps Other props than mandatories that can be used with separates args
   * @param {object} [optionsAdd]
   * @param {boolean} [optionsAdd.useRep] if true a frame is required (the svg if absCoord is true) and coordinates x and y will be used
   * @param {boolean} [optionsAdd.useRepOrSVG] if option absCoord is true, the svg coordinates are used, if not, if only a frame is present, this frame is used otherwise the parameter 'rep' must be specified
   * @param {string} [optionsAdd.defaultColor] if true and if parameter color is absent, set color to defaultColor
   * @param {boolean} [optionsAdd.noDer] if true parameter calc is not allowed to be a function derivative
   * @param {boolean} [optionsAdd.nameForLine] true if parameter nam or name2 is meant to be the name of a line
   * @param {boolean} [optionsAdd.useBackgroundColor] true if parameter backgroundColor is used
   * @returns {ApiDefaultValues}
   */
  const getDefault = (list, options, mandatoryProps = [], otherProps = [], optionsAdd = {}) => {
    // avec les appels python on nous passe un array en 1er arg
    if (Array.isArray(options) && Array.isArray(options[0])) {
      // appel python
      const op00 = options[0][0]
      options = (typeof op00 === 'object' && !op00?.getNature && !op00?.getNatureCalcul) // un objet non mtg32
        ? options[0][0] // python nous passe un seul argument objet non mtg32
        : options[0] // python ou js nous passe une liste d'argument (et on passera dans le if suivant)
    }
    if (Array.isArray(options)) {
      const op0 = options[0]
      if (options.length === 1 && typeof op0 === 'object' && !op0?.getNature && !op0?.getNatureCalcul) {
        // un seul objet non mtg32
        options = options[0]
      } else {
        // plusieurs éléments ou bien un objet mg32
        // => on les affecte aux variables de mandatoryProps dans le même ordre
        const args = options
        options = {}
        let i = 0
        for (const prop of mandatoryProps.concat(otherProps)) {
          if (i < args.length) options[prop] = args[i++]
          else break
        }
        // console.debug('on a construit options', options, 'avec', args)
      }
    }
    // si y'a pas de list, probablement le 1er appel, on tente de la récupérer
    if (!list) app.setApiDoc()
    if (!list) throw Error('You must call setApiDoc(idDoc) before using the api methods on a MtgApp player')
    // les strings
    const tab1 = ['color', 'arrowStyle', 'pointStyle', 'lineStyle', 'fillStyle', 'angleMarkStyle', 'segmentMarkStyle', 'tag', 'tag2', 'text', 'latex', 'border', 'backgroundColor', 'hAlign', 'vAlign', 'nameCalc', 'formula', 'eventName']
    for (const prop of tab1) ensureUndefOrString(prop, options[prop])
    options.absCoord = Boolean(options.absCoord)
    options.dialog = Boolean(options.dialog) // Pour la création de variable
    if (optionsAdd.useRepOrSVG) {
      ensureRep(list, options)
    } else {
      if (optionsAdd.useRep) {
        options.absCoord = false
        ensureRep(list, options)
      }
    }
    // les numbers
    for (const prop of ['k', 'offsetX', 'offsetY']) ensureUndefOrNumber(prop, options[prop])
    ensureUndefOrNumber('opacity', options.opacity, { isInt: false, min: 0, max: 1 })
    // x, y ou r peuvent être des nombres ou des strings contenant une formule dynamique

    for (const prop of ['x', 'y', 'r', 'val', 'min', 'max', 'step']) {
      options[prop] = ensureUndefOrNumberOrStringOrCalc(list, prop, options[prop], false)
    }
    ensureUndefOrArrayOfNumberOrStringOrCalc(list, options.mat) // mat doit être un array représentant une matrice de nombres, objets numériques ou string contenant une formule valide
    options.z = ensureUndefOrNumberOrStringOrCalc(list, 'z', options.z, true) // Dernier paramètre true car on vut un complexe
    options.calc = ensureUndefOrStringOrCalc(list, 'calc', options.calc, optionsAdd.noDer)
    options.varName = ensureUndefOrValidNameVar(list, options.varName)
    ensureUndefOrNumber('thickness', options.thickness, { isInt: true, min: 1, max: 12 })
    ensureUndefOrNumber('fontSize', options.fontSize, { isInt: true, min: 10, max: 80 })
    // pour les booléens on cast, on vérifie pas
    let { color, opacity, name, name2, hidden, hiddenName, absCoord, smartIntersect, arrowStyle, pointStyle, lineStyle, fillStyle, angleMarkStyle, segmentMarkStyle, thickness, a, b, o, x, y, k, r, z, val, min, max, step, dialog, mat, offsetX, offsetY, d, d2, c, c2, poly, rep, elt, elt2, edge, tag, tag2, text, latex, fontSize, border, opaque, transparent, backgroundColor, hAlign, vAlign, nameCalc, varName, calc, formula, points, transf, verticalGrid, horizontalGrid, dottedGrid, closed, eventName, callBack } = options
    for (const prop of ['name', 'name2']) {
      ensureNameIsValidOrUndef(list, prop, options[prop], optionsAdd.nameForLine)
    }
    if (poly != null) {
      if (typeof poly === 'string') {
        const el = list.getByTag(poly)
        if (!el || !el.estDeNature(NatObj.NPolygone)) throw Error(`There is no polygon with tag ${poly}`)
        poly = el
      } else {
        if (!poly?.estDeNature(NatObj.NPolygone)) {
          throw Error('argument for polygone is not a polygon object')
        }
      }
    }
    if (tag != null) {
      if (list.getByTag(tag)) throw Error(`tag ${tag} is already associated to an object`)
    }
    if (tag2 != null) {
      if (list.getByTag(tag2)) throw Error(`tag ${tag2} is already associated to an object`)
    }
    if (points) {
      ensurePointArray(list, 'points', points)
    }
    if (transf) {
      if (!transf?.estDeNature(NatObj.NTransformation)) throw Error('Invalid transf parameter : must be a transformation object')
    }
    if (callBack && typeof callBack !== 'function') throw Error('Unvalid callback function')
    if (!color && optionsAdd.defaultColor) color = optionsAdd.defaultColor
    // Ligne suivante pour assurer la compatibilité avec les anciennes versions où les affichages de texte avaient un paramètre transparent au lieu de opaque
    if (typeof transparent === 'boolean') opaque = !transparent

    // Les valeurs par défaut
    const values = {
      hidden: Boolean(hidden),
      absCoord,
      color: rgbToColor(color, opacity ?? 1),
      name: name ?? '',
      name2: name2 ?? '',
      fontSize: fontSize ?? 16,
      hiddenName: Boolean(hiddenName),
      smartIntersect: Boolean(smartIntersect ?? true),
      arrowStyle: getArrowStyle(arrowStyle),
      lineStyle: getLineStyle(lineStyle),
      pointStyle: getPointStyle(pointStyle),
      fillStyle: getFillStyle(fillStyle),
      angleMarkStyle: getAngleMarkStyle(angleMarkStyle),
      segmentMarkStyle: getSegmentMarkStyle(segmentMarkStyle),
      thickness: thickness ?? 1,
      a: getPointByNameOrTag(list, a),
      b: getPointByNameOrTag(list, b),
      o: getPointByNameOrTag(list, o),
      rep,
      d: getLineByTag(list, d),
      d2: getLineByTag(list, d2),
      c: getCircleByTag(list, c),
      c2: getCircleByTag(list, c2),
      edge: getEdge(list, edge),
      elt: getObjectByTagOrPointName(list, elt),
      elt2: getObjectByTagOrPointName(list, elt2),
      poly,
      x,
      y,
      r,
      k,
      z,
      val,
      min,
      max,
      step,
      dialog,
      mat,
      offsetX: offsetX ?? 0,
      offsetY: offsetY ?? 3,
      tag,
      tag2,
      text,
      latex,
      nameCalc,
      varName,
      calc,
      formula,
      points,
      transf,
      verticalGrid: Boolean(verticalGrid),
      horizontalGrid: Boolean(horizontalGrid),
      dottedGrid: Boolean(dottedGrid),
      closed: Boolean(closed),
      eventName,
      callBack
    }

    if (text || latex || optionsAdd.useBackgroundColor) {
      if (optionsAdd.useBackgroundColor) {
        values.opaque = true
      } else values.opaque = Boolean(opaque ?? false)
      const figBackgroundColor = list.documentProprietaire.couleurFond
      values.backgroundColor = values.opaque ? (backgroundColor ? rgbToColor(backgroundColor) : figBackgroundColor) : figBackgroundColor
    }
    if (text || latex) {
      // on ajoute des trucs quand y'a du texte
      values.border = getFrameStyle(border)
      const hAlignPossibles = {
        left: CAffLiePt.alignHorRight,
        center: CAffLiePt.alignHorCent,
        right: CAffLiePt.alignHorLeft
      }
      values.hAlign = hAlignPossibles[hAlign] ?? hAlignPossibles.right
      const vAlignPossibles = {
        top: CAffLiePt.alignVerLow,
        middle: CAffLiePt.alignVerCent,
        bottom: CAffLiePt.alignVerTop
      }
      values.vAlign = vAlignPossibles[vAlign] ?? vAlignPossibles.bottom
    }

    // on teste les propriétés obligatoires après leur éventuelles affectations
    // (dans le cas où on a passé une string et ça doit retourner qqchose trouvé dans la figure)
    if (mandatoryProps.length) ensureDef(options, values, mandatoryProps)
    return values
  } // getDefault

  /**
   * Prépare la promesse ou la valeur à retourner (suivant isPromiseMode)
   * @private
   * @param {CListeObjets} list
   * @param {SVGElement} svg
   * @param value La valeur à retourner sans isPromiseMode
   * @param {Object[]} [objToDisplay] Le tableau d'objet à passer à addAndDisplayElts s'il est différent de value ou [value] (suivant que value est un array ou pas)
   * @throws {Error} si list contient plus d'éléments que le max autorisé
   * @return {Promise<undefined>|undefined}
   */
  const formatReturn = (list, svg, value, objToDisplay) => {
    const valuesToDisplay = objToDisplay ?? Array.isArray(value) ? value : [value]
    if (list.col.length >= CCbGlob.nombreMaxObj) throw Error(`Le nombre maxi d'objets de ${CCbGlob.nombreMaxObj} est dépassé`)
    const promise = list.addAndDisplayElts(valuesToDisplay, svg)
    if (isPromiseMode) return promise
    // sinon faut ajouter un catch sur la promise, au cas où
    promise.catch(error => console.error(error))
    return value
  }

  /**
   * Ajoute un objet de type calcul en vérifiant que le nombre total maxi d'obejst n'est pas dépassé
   * @private
   * @param {CListeObjets}list
   * @param obj
   */
  const addObjectCalc = (list, obj) => {
    if (list.col.length >= CCbGlob.nombreMaxObj) throw Error(`Le nombre maxi d'objets de ${CCbGlob.nombreMaxObj} est dépassé`)
    list.add(obj)
  }

  /**
   * The api methods added to the application ({@link MtgApp} or {@link MtgAppLecteur}, becoming {@link MtgAppApi} or {@link MtgAppLecteurApi}
   * @mixin MtgApi
   */
  const MtgApi = {
    /**
     * Change the current figure (the figure  the following api methods will apply on), only for the {@link MtgAppLecteurApi}
     * @memberOf MtgApi
     * @param {string} [idDoc] If idDoc is not given, the first doc is taken
     * @returns {void}
     */
    setApiDoc: (idDoc) => {
      if (isEditor) return console.error(Error('setApiDoc doesn’t exist in MtgAppApi, only in the MathGraph player api'))
      const doc = idDoc ? app.getDoc(idDoc) : app.docs[0]
      if (!doc) throw Error('No doc' + (idDoc ? ` with id ${idDoc}` : ''))
      /** @type {SVGElement} */
      app.svgApi = document.getElementById(doc.idDoc)
      if (!app.svgApi) throw Error(`Aucun svg #${idDoc}`)
      app.listApi = doc.listePr
    },

    /**
     * Load a new figure (empty if not provided)
     * @memberOf MtgApi
     * @param {Object} [options]
     * @param {HTMLElement} [options.container] The container bound to contain the created svg (mandatory for the mtgApp player if id isn't given, when there is not yet any document, ignored otherwise)
     * @param {string} [options.id] id (MtgApp player only) id of the figure to be replaced or created
     * @param {string} [options.fig] The base 64 code of the figure
     * @param {boolean} [options.removeAllDoc=false] true to delete all the alredy existing figures of a MtgAp player before the creation of this one (nor accounted for in case of an MtgApp)
     * @param {number} [options.width=500]
     * @param {number} [options.height=300]
     * @returns {Promise<void>} Promise that will be resolved when the new figure is displayed
     */
    setFig: ({ container, id, fig, width, height, removeAllDoc = false } = {}) => {
      if (isEditor) {
        return app.setFigByCode(fig ?? figVide, true)
          .then(() => {
            // et reset de nos var globales
            app.listApi = app.doc.listePr
            app.svgApi = app.svgFigure // probablement inutile
          })
      }
      // cas lecteur
      let hasExistingSvg = false
      if (id) {
        if (app.getDoc(id)) {
          // y'en a déjà un, on va remplacer donc faut d'abord le virer (ça vide le svg sans le supprimer)
          app.removeDoc(id)
          app.svgApi = document.getElementById(id)
          if (app.svgApi) {
            hasExistingSvg = true
          } else {
            // on le signale mais on plante pas, ce sera comme s'il n'avait jamais existé
            console.error(Error(`Le doc #${id} était bien référencé dans le lecteur mais le svg a disparu du DOM`))
          }
        }
      } else {
        // si on nous passe pas d'id on en génère un
        let i = 1
        while (document.getElementById(`svgMtg${i}`)) i++
        id = `svgMtg${i}`
      }
      if (hasExistingSvg) {
        // on change la taille si demandé (sinon le svg garde la sienne)
        if (width) app.svgApi.setAttribute('width', String(width))
        if (height) app.svgApi.setAttribute('height', String(height))
      } else {
        if (!container) throw Error('You must provide a container if you don’t give the id of an existing svg')
        // idem création du svg dans mtgLoad (getSvg)
        app.svgApi = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        app.svgApi.id = id
        if (!width) width = 500
        if (!height) height = 300
        container.appendChild(app.svgApi)
        fixSvgContainer({ container, width, height, svg: app.svgApi })
      }
      if (removeAllDoc) app.removeAllDoc()
      app.addDoc(id, fig ?? figVide)
      // faut mettre à jour list
      const doc = app.getDoc(id)
      app.listApi = doc.listePr
      app.calculateFirstTime(id, true)
      return app.display(id)
    },

    /**
     * Re-displays the elements of the figure.
     * @memberOf MtgApi
     * @return {void}
     */
    updateFigDisplay: () => {
      const doc = app.listApi.documentProprietaire
      app.listApi.update(app.svgApi, doc.couleurFond, true)
    },

    /**
     * Erases all the element of the svg containing the figure then re-displays the figure in the svg
     * Must be called after a reclassment of graphical objects
     * @memberOf MtgApi
     * @returns {Promise<boolean>|Promise<unknown>}
     */
    reDisplay: () => {
      const listApi = app.listApi
      const svgApi = app.svgApi
      if (app instanceof MtgApp) {
        return new Promise((resolve) => {
          addQueue(() => {
            const doc = listApi.documentProprietaire
            app.removeSurfacePatterns()
            listApi.removegElements(svgApi)
            listApi.setReady4MathJax()
            // Double appel de pile pour l'affichage car pas de dernier paramètre
            listApi.afficheTout(0, svgApi, true, doc.couleurFond)
            // La ligne précédente a rajouté un affichage sur la pile
            addQueue(resolve) // Pour que la promesse soit résolue une fois tous les affichages réalisés.
          })
        })
      } else {
        return app.display(app.listApi.documentProprietaire.idDoc)
      }
    },

    /**
     * Re-displays the figure elements depending on elt
     * @memberOf MtgApi
     * @param {CElementBase} obj
     */
    updateDependantDisplay: (obj) => {
      if (!obj || !obj.estDeNature || !obj.estDeNatureCalcul) throw (Error('updateDependantDisplay parameter must be a MathGraph32 object'))
      const doc = app.listApi.documentProprietaire
      app.listApi.positionneDependantsDe(false, doc.dimf, obj)
      app.listApi.updateDependants(obj, app.svgApi, doc.couleurFond, true)
    },

    /**
     * Destroys all objets form elt, including display of the destroyed objects
     * syntax `deleteAfter(elt)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt Tag of the element objects following will be destroyed
     * @param {number|string|CValDyn} [options.x] optional delay (in seconds) in the display before destroying the elements
     * @returns {Promise<undefined>|void}
     */
    deleteAfter: (...options) => {
      const listApi = app.listApi
      const { elt } = getDefault(listApi, options, ['elt'])
      const index = elt.index
      const nbelts = listApi.col.length - index - 1 // On efface et retire ce qui suit elt mais pas elt
      for (let i = 0; i < nbelts; i++) {
        const el = listApi.get(listApi.col.length - 1 - i)
        if (el.estDeNature(natObj.NTtObj)) {
          addQueue(function () {
            el.removegElement(app.svgApi)
            el.existe = false // Pour qu'un éventuel affichage dans la queue soit ignoré
          })
        }
      }
      listApi.col.splice(index + 1)
    },

    /**
     * Recalculates the figure
     * @memberOf MtgApi
     * @param {boolean} [bRandom = false] if true random calculations are reset
     */
    recalculate: (bRandom = false) => {
      const listApi = app.listApi
      listApi.positionne(bRandom, listApi.getDimf())
    },

    /**
     * Pause sec seconds in the display before going on
     * @param {number} sec the sleep delay in seconds
     * @memberOf MtgApi
     * @returns {Promise<void>}
     */
    sleep: (sec) => {
      return addQueue(() => new Promise(resolve => {
        setTimeout(resolve, sec * 1000)
      }))
    },

    /**
     * Returns the dimension of the SVG containing the figure
     * @memberOf MtgApi
     * @returns {Dim} array formed of [with, height] of the SVG containing the figure
     */
    getFigDim: () => {
      const dimf = app.listApi.getDimf()
      return [dimf.x, dimf.y]
    },

    /**
     * Set the angle unity of the figure.
     * @memberOf MtgApi
     * @param {string} unity 'degree' or 'radian'
     */
    setAngleUnity: (unity) => {
      const listApi = app.listApi
      if (!unity || (typeof unity !== 'string') || !['degree', 'degre', 'degré', 'radian'].includes(unity)) throw Error('Bas angle unity argument: must be \'radian\' or \'degree\'')
      const newUnity = (unity.toLowerCase() === 'radian') ? uniteAngleRadian : uniteAngleDegre
      if (newUnity !== listApi.uniteAngle) {
        listApi.uniteAngle = (unity.toLowerCase() === 'radian') ? uniteAngleRadian : uniteAngleDegre
        app.recalculate(false)
        app.updateFigDisplay()
      }
    },

    /**
     * returns the graphical object with tag elt and, if not present, the point or line with name elt. If no object matches the name elt returns null
     * Syntax `getElement(elt)` allowed where elt is a string
     * @memberOf MtgApi
     * @param {string } options.elt Tag of the object or name of the point that is to be returned
     * @returns {CElementGraphique}
     */
    getElement: (...options) => {
      const {
        elt
      } = getDefault(app.listApi, options, ['elt'])
      return elt
    },

    /**
     * Add a free point
     * Syntax `addFreePoint(x, y)`, `addFreePoint(x, y, name)`, `addFreePoint(x, y, name, color)`, `addFreePoint(x, y, name, color, pointStyle)` or `addFreePoint(x, y, name, color, pointStyle, rep)` allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {number|string|CValDyn} options.x starting x-coordinate when the point is created
     * @param {number|string|CValDyn} options.y starting y-coordinate when the point is created
     * @param {string} [options.name] Name of the point (if present)
     * @param {string} [options.color=black] Color, black by default
     * @param {string} [options.pointStyle=O] Point style (o|O|OO|x|X|+|<>|[]|.) or (littleround|round|biground|mult|bigmult|cross|diamond|square|pixel|)
     * @param {number} [options.offsetX] x-shift of the name
     * @param {number} [options.offsetY] y-shift of the name
     * @param {boolean} [options.absCoord=false] set to true if x,y should be considered absolute in the svg (in that case rep is ignored), useless if there is no frame (in that case x,y will be considered absolute regardless of this property)
     * @param {string} [options.rep] tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the point masked
     * @param {boolean} [options.hiddenName] true to get the name point masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the point (if present)
     * @returns {Promise<undefined>|CPointBase} The created point if isPromiseMode is false else promise that will be resolved when the point is displayed
     */
    addFreePoint: (...options) => {
      const listApi = app.listApi
      let {
        x,
        y,
        name,
        offsetX,
        offsetY,
        rep,
        color,
        pointStyle,
        hidden,
        hiddenName,
        fontSize,
        tag
      } = getDefault(listApi, options, ['x', 'y'], ['name', 'color', 'pointStyle', 'rep'], { useRepOrSVG: true })
      if (typeof x === 'string' || typeof y === 'string') throw Error('x and y parameters of addFreePoint must be numbers, not strings')
      if (rep) [x, y] = rep.getAbsCoord(x, y)
      const pt = new CPointBase(listApi, null, false, color, hiddenName, offsetX, offsetY, hidden, name, fontSize, pointStyle, false, false, x, y)
      if (tag) pt.tag = tag
      return formatReturn(listApi, app.svgApi, pt)
    },

    /**
     * Adds a point defined by (x; y) coordinates in a frame rep (system of axis). For a free point use addFreePoint and specify options.rep)
     * syntaxes `addPointXY(x, y)`, `addPointXY(x, y, name)`, `addPointXY(x, y, name, color)`, `addPointXY(x, y, name, color, pointStyle)` and `addPointXY(x, y, name, color, pointStyle, rep)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {number|string|CValDyn} options.x x-coordinate of the point : number or valid formula
     * @param {number|string|CValDyn} options.y y-coordinate of the point : number or valid formula
     * @param {string} [options.name] Name of the point to be created
     * @param {string} [options.rep] tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     * @param {number} [options.offsetX] x-shift of the name
     * @param {number} [options.offsetY] y-shift of the name
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.pointStyle=O] Point style (o|O|OO|x|X|+|<>|[]|.) or (littleround|round|biground|mult|bigmult|cross|diamond|square|pixel|)
     * @param {boolean} [options.hidden] true to get the created point masked
     * @param {boolean} [options.hiddenName] true to get the created point name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the point (if present)
     * @returns {Promise<undefined>|CPointDansRepere} The created point if isPromiseMode is false else promise that will be resolved when the point is displayed
     */
    addPointXY: (...options) => {
      const listApi = app.listApi
      let {
        x,
        y,
        rep,
        name,
        offsetX,
        offsetY,
        color,
        pointStyle,
        hidden,
        hiddenName,
        fontSize,
        tag
      } = getDefault(listApi, options, ['x', 'y'], ['name', 'color', 'pointStyle', 'rep'], { useRep: true }) // Ici 'rep' n'est pas mandatory
      if (!rep) throw Error('Call of addPointXY without frame')
      // on prendra pour rep un repère de tag 'rep' s'il y en a un
      if (typeof x === 'string') {
        x = getCalcFromString(listApi, x)
      } else {
        if (typeof x !== 'number') { // x est un calcul ou une mesure qui a été créé
          x = new CResultatValeur(listApi, x)
        }
      }
      if (typeof y === 'string') {
        y = getCalcFromString(listApi, y)
      } else {
        if (typeof y !== 'number') { // x est un calcul ou une mesure qui a été créé
          y = new CResultatValeur(listApi, y)
        }
      }
      const pt = new CPointDansRepere(listApi, null, false, color, hiddenName, offsetX, offsetY,
        hidden, name, fontSize, pointStyle, false, rep, new CValeur(listApi, x), new CValeur(listApi, y))
      if (tag) pt.tag = tag
      return formatReturn(listApi, app.svgApi, pt)
    },

    /**
     * Adds a point defined by its complex affix in a frame rep (system of axis).
     * syntaxes `addPointZ(z)`, `addPointZ(z, name)`, `addPointZ(z, name, color)` and `addPointZ(z, name, coland, pointStyle)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {number|string|CValDyn} options.z affix of the point : number or valid formula or complex calculation
     * @param {string} [options.name] Name of the point to be created
     * @param {boolean} [options.absCoord=false] set to true if x,y should be considered absolute in the svg (in that case rep is ignored), useless if there is no frame (in that case x,y will be considered absolute regardless of this property)
     * @param {string} [options.rep] tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     * @param {number} [options.offsetX] x-shift of the name
     * @param {number} [options.offsetY] y-shift of the name
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.pointStyle=O] Point style (o|O|OO|x|X|+|<>|[]|.) or (littleround|round|biground|mult|bigmult|cross|diamond|square|pixel|)
     * @param {boolean} [options.hidden] true to get the created point masked
     * @param {boolean} [options.hiddenName] true to get the created point name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the point (if present)
     * @returns {Promise<undefined>|CPointParAffixe} The created point if mtgOptions.isPromiseMode is false else promise that will be resolved when the point is displayed
     */
    addPointZ: (...options) => {
      const listApi = app.listApi
      let {
        z,
        rep,
        name,
        offsetX,
        offsetY,
        color,
        pointStyle,
        hidden,
        hiddenName,
        fontSize,
        tag
      } = getDefault(listApi, options, ['z'], ['name', 'color', 'pointStyle'], { useRep: true }) // Ici 'rep' n'est pas mandatory
      // on prendra pour rep un repère de tag 'rep' s'il y en a un
      if (typeof z === 'string') {
        z = getCalcCompFromString(listApi, z)
      } else {
        if (typeof z !== 'number') {
          z = new CResultatValeurComplexe(listApi, z)
        }
      }
      const pt = new CPointParAffixe(listApi, null, false, color, hiddenName, offsetX, offsetY,
        hidden, name, fontSize, pointStyle, false, rep, new CValeurComp(listApi, z))
      if (tag) pt.tag = tag
      return formatReturn(listApi, app.svgApi, pt)
    },

    /**
     * Adds the midpoint of [a; b]
     * syntaxes `addMidpoint(a, b)`, `addMidpoint(a, b, name)`, `addMidpoint(a, b, name, color)` and `addMidpoint(a, b, name, color, pointStyle)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a First point a or point name (or tag if name is empty) (to create midpoint of [a; b])
     * @param {CPt|string} options.b Second point b or point name (or tag if name is empty) (to create midpoint of [a; b])
     * @param {string} [options.name] Name of the midpoint to be created
     * @param {number} [options.offsetX] x-shift of the point name
     * @param {number} [options.offsetY] y-shift of the point name
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.pointStyle=round] Point style (square|round|cross|mult|littleround|diamond|pixel|biground|bigmult)
     * @param {boolean} [options.hidden] true to get the created point masked
     * @param {boolean} [options.hiddenName] true to get the created point name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created point (if present)
     * @returns {Promise<undefined>|CMilieu} The created point if isPromiseMode is false or promise that will be resolved when the point is displayed
     */
    addMidpoint: (...options) => {
      const listApi = app.listApi
      const {
        a,
        b,
        name,
        offsetX,
        offsetY,
        color,
        pointStyle,
        hidden,
        hiddenName,
        fontSize,
        tag
      } = getDefault(listApi, options, ['a', 'b'], ['name', 'color', 'pointStyle'])
      const pt = new CMilieu(listApi, null, false, color, hiddenName, offsetX, offsetY, hidden, name, fontSize, pointStyle, false, a, b)
      if (tag) pt.tag = tag
      return formatReturn(listApi, app.svgApi, pt)
    },

    /**
     * Adds a point linked to a circle (or a circle arc)
     * syntaxes `addLinkedPointCircle(c, x, y)`, `addLinkedPointCircle(c, x, y, name)`, `addLinkedPointCircle(c, x, y, name, color)`, `addLinkedPointCircle(c, x, y, name, color, pointStyle)` and `addLinkedPointCircle(c, x, y, name, color, pointStyle, rep)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.c The tag of the circle the created point is to be linked to
     * @param {number|string|CValDyn} options.x x-coordinate of the point that is to be joined from the circle center to get the starting position of the linked point
     * @param {number|string|CValDyn} options.y y-coordinate of the point that is to be joined from the circle center to get the starting position of the linked point
     * @param {boolean} [options.absCoord=false] set to true if x,y should be considered absolute in the svg (in that case rep is ignored), useless if there is no frame (in that case x,y will be considered absolute regardless of this property)
     * @param {string} [options.rep] tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     * @param {string} [options.pointStyle=round] Points style (square|round|cross|mult|littleround|diamond|pixel|biground|bigmult)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the created linked point mased
     * @param {string} [options.name] Name of the linked point to be created
     * @param {number} [options.offsetX] x-shift of the linked point name
     * @param {number} [options.offsetY] y-shift of the linked point name
     * @param {number} [options.fontSize=16] Size of the font used for the point name
     * @param {boolean} [options.hiddenName] true to get the linked point name masked
     * @param {string} [options.tag] Tag to be applied on the created point (if present)
     * @returns {Promise<undefined>|CPointLieCercle} The created point if isPromiseMode is false or promise that will be resolved when the point is displayed
     */
    addLinkedPointCircle: (...options) => {
      const listApi = app.listApi
      let {
        c,
        x,
        y,
        rep,
        pointStyle,
        color,
        hidden,
        name,
        offsetX,
        offsetY,
        fontSize,
        hiddenName,
        tag
      } = getDefault(listApi, options, ['c', 'x', 'y'], ['name', 'color', 'pointStyle', 'rep'], { useRepOrSVG: true })
      if (rep) [x, y] = rep.getAbsCoord(x, y)
      if (x === c.centreX && y === c.centreY) throw Error('Point linked to circle error : starting point is at the circle center')
      const ptl = new CPointLieCercle(listApi, null, false, color, hiddenName, offsetX, offsetY, hidden, name, fontSize, pointStyle, false, false, 1, c)
      const point = { x: 0, y: 0 }
      const abs = new Pointeur()
      const dimf = listApi.getDimf()
      ptl.testDeplacement(dimf, x, y, point, abs)
      if (!ptl.testDeplacement(dimf, x, y, point, abs)) throw Error('Point linked to circle error : stating point invalid')
      ptl.donneAbscisse(abs.getValue())
      if (tag) ptl.tag = tag
      return formatReturn(listApi, app.svgApi, ptl)
    },

    /**
     * Adds a point linked to a line (or ray or segment)
     * syntaxes `addLinkedPointLine(d, x, y)`, `addLinkedPointLine(d, x, y, name)`, `addLinkedPointLine(d, x, y, name, color)`, `addLinkedPointLine(d, x, y, name, color, pointStyle)` and `addLinkedPointLine(d, x, y, name, color, pointStyle, rep)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.d Tag of the line (or ray or segment) the point is to be linked to
     * @param {number|string|CValDyn} options.x x-coordinate of the point used to establish the starting position of the linked point ((by orthogonal projection on the line)
     * @param {number|string|CValDyn} options.y y-coordinate of the point used to establish the starting position of the linked point ((by orthogonal projection on the line)
     * @param {string} [options.name] Name of the linked point to be created
     * @param {string} [options.color=black] Color, black by default
     * @param {string} [options.pointStyle=round] Point style (square|round|cross|mult|littleround|diamond|pixel|biground|bigmult)
     * @param {string} [options.rep] tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     * @param {boolean} [options.absCoord=false] set to true if x,y should be considered absolute in the svg (in that case rep is ignored), useless if there is no frame (in that case x,y will be considered absolute regardless of this property)
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the created point masked
     * @param {number} [options.offsetX] x-shift of the linked point name
     * @param {number} [options.offsetY] y-shift of the linked point name
     * @param {number} [options.fontSize=16] Size of the font used for the point name
     * @param {boolean} [options.hiddenName] true to get the linked point name masked
     * @param {string} [options.tag] Tag to be applied on the created point (if present)
     * @returns {Promise<undefined>|CPointLieCercle} The created point if isPromiseMode is false or promise that will be resolved when the point is displayed
     */
    addLinkedPointLine: (...options) => {
      const listApi = app.listApi
      let {
        d,
        x,
        y,
        rep,
        pointStyle,
        color,
        hidden,
        name,
        offsetX,
        offsetY,
        fontSize,
        hiddenName,
        tag
      } = getDefault(listApi, options, ['d', 'x', 'y'], ['name', 'color', 'pointStyle', 'rep'], { useRepOrSVG: true })
      if (rep) [x, y] = rep.getAbsCoord(x, y)
      const ptl = new CPointLieDroite(listApi, null, false, color, hiddenName, offsetX, offsetY, hidden, name, fontSize, pointStyle, false, false, 1, d)
      const point = { x: 0, y: 0 }
      const abs = new Pointeur()
      if (!ptl.testDeplacement(listApi.getDimf(), x, y, point, abs)) throw Error('Point linked to line error : starting point not valid')
      ptl.donneAbscisse(abs.getValue())
      if (tag) ptl.tag = tag
      return formatReturn(listApi, app.svgApi, ptl)
    },

    /**
     * Adds a point linked to a line (or ray or segment)
     * syntaxes `addLinkedPointLocus(elt, x, y)`, `addLinkedPointLocus(elt, x, y, name)`, `addLinkedPointLocus(elt, x, y, name, color)` , `addLinkedPointLocus(elt, x, y, name, color, pointStyle)` and `addLinkedPointLocus(elt, x, y, name, color, pointStyle, rep)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string|CLieuDePoints} options.elt point locus the point is to be linked to (or its tag)
     * @param {number} options.x x-coordinate of the point used to establish the starting position of the linked point ((by orthogonal projection on the line)
     * @param {number} options.y y-coordinate of the point used to establish the starting position of the linked point ((by orthogonal projection on the line)
     * @param {boolean} [options.absCoord=false] set to true if x,y should be considered absolute in the svg (in that case rep is ignored), useless if there is no frame (in that case x,y will be considered absolute regardless of this property)
     * @param {string} [options.rep] tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     * @param {string} [options.pointStyle=round] Point style (square|round|cross|mult|littleround|diamond|pixel|biground|bigmult)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the created point masked
     * @param {string} [options.name] Name of the linked point to be created
     * @param {number} [options.offsetX] x-shift of the linked point name
     * @param {number} [options.offsetY] y-shift of the linked point name
     * @param {number} [options.fontSize=16] Size of the font used for the point name
     * @param {boolean} [options.hiddenName] true to get the linked point name masked
     * @param {string} [options.tag] Tag to be applied on the created point (if present)
     * @returns {Promise<undefined>|CPointLieCercle} The created point if isPromiseMode is false or promise that will be resolved when the point is displayed
     */
    addLinkedPointLocus: (...options) => {
      const listApi = app.listApi
      let {
        elt,
        x,
        y,
        rep,
        pointStyle,
        color,
        hidden,
        name,
        offsetX,
        offsetY,
        fontSize,
        hiddenName,
        tag
      } = getDefault(listApi, options, ['elt', 'x', 'y'], ['name', 'color', 'pointStyle', 'rep'], { useRepOrSVG: true })
      if (!elt.estDeNature(NatObj.NLieu)) throw Error('Error i addLinkedPointLocus : parameter elt is not a point locus')
      if (rep) [x, y] = rep.getAbsCoord(x, y)
      const ptl = new CPointLieLieuParPtLie(listApi, null, false, color, hiddenName,
        offsetX, offsetY, hidden, name, fontSize, pointStyle, false, false, 0, elt)
      const point = { x: 0, y: 0 }
      const abs = new Pointeur()
      if (!ptl.testDeplacement(listApi.getDimf(), x, y, point, abs)) throw Error('Point linked to locus error : starting point not valid')
      ptl.donneAbscisse(abs.getValue())
      if (tag) ptl.tag = tag
      return formatReturn(listApi, app.svgApi, ptl)
    },

    /**
     * Adds the line going through points a and b
     * syntaxes `addLineAB(a, b)`, `addLineAB(a, b, name)`, `addLineAB(a, b, name, color)`, `addLineAB(a, b, name, color, lineStyle)` and `addLineAB(a, b, name, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a First point or point name (or tag if name is empty) the line is going through
     * @param {CPt|string} options.b Second poinnt or point name (or tag if name is empty) the line is going through
     * @param {string} [options.name] Name of the line to be created (if present)
     * @param {string} [options.color=black] Color, black by default
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created line masked
     * @param {boolean} [options.hiddenName] true to get the created line name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created line (if present)
     * @returns {Promise<undefined>|CDroiteAB} The created line if isPromiseMode is false or romise that will be resolved when the line is displayed
     */
    addLineAB: (...options) => {
      const listApi = app.listApi
      const {
        a,
        b,
        tag,
        lineStyle,
        color,
        thickness,
        name,
        fontSize,
        hidden,
        hiddenName
      } = getDefault(listApi, options, ['a', 'b'], ['name', 'color', 'lineStyle', 'thickness'], { nameForLine: true })
      const line = new CDroiteAB(listApi, null, false, color, hiddenName,
        0, 0, hidden, name, fontSize, new StyleTrait(listApi, lineStyle, thickness), 0.9, a, b)
      if (tag) line.tag = tag
      return formatReturn(listApi, app.svgApi, line)
    },

    /**
     * Adds the horizontal line going through point a
     * syntaxes `addLineHor(a)`, `addLineHor(a, name)`, `addLineHor(a, name, color)`, `addLineHor(a, name, color, lineStyle)` and `addLineHor(a, name, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a First point or point name (or tag if name is empty) the line is going through
     * @param {string} [options.name] Name of the line to be created (if present)
     * @param {string} [options.color=black] Color, black by default
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden=false] true to get the created line masked
     * @param {boolean} [options.hiddenName] true to get the created line name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created line (if present)
     * @returns {Promise<undefined>|CDroiteDirectionFixe} The created line if isPromiseMode is false or romise that will be resolved when the line is displayed
     */
    addLineHor: (...options) => {
      const listApi = app.listApi
      const {
        a,
        tag,
        lineStyle,
        color,
        thickness,
        name,
        fontSize,
        hidden,
        hiddenName
      } = getDefault(listApi, options, ['a'], ['name', 'color', 'lineStyle', 'thickness'], { nameForLine: true })
      const line = new CDroiteDirectionFixe(listApi, null, false, color, hiddenName,
        0, 0, hidden, name, fontSize, new StyleTrait(listApi, lineStyle, thickness), 0.9, a, true, 1)
      if (tag) line.tag = tag
      return formatReturn(listApi, app.svgApi, line)
    },

    /**
     * Adds the vertical line going through point a
     * syntaxes `addLineVer(a)`, `addLineVer(a, name)`, `addLineVer(a, name, color)`, `addLineVer(a, name, color, lineStyle)` and `addLineVer(a, name, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a First point or point name (or tag if name is empty) the line is going through
     * @param {string} [options.name] Name of the line to be created (if present)
     * @param {string} [options.color=black] Color, black by default
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden=false] true to get the created line masked
     * @param {boolean} [options.hiddenName] true to get the created line name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created line (if present)
     * @returns {Promise<undefined>|CDroiteDirectionFixe} The created line if isPromiseMode is false or romise that will be resolved when the line is displayed
     */
    addLineVer: (...options) => {
      const listApi = app.listApi
      const {
        a,
        tag,
        lineStyle,
        color,
        thickness,
        name,
        fontSize,
        hidden,
        hiddenName
      } = getDefault(listApi, options, ['a'], ['name', 'color', 'lineStyle', 'thickness'], { nameForLine: true })
      const line = new CDroiteDirectionFixe(listApi, null, false, color, hiddenName,
        0, 0, hidden, name, fontSize, new StyleTrait(listApi, lineStyle, thickness), 0.9, a, false, 1)
      if (tag) line.tag = tag
      return formatReturn(listApi, app.svgApi, line)
    },

    /**
     * Adds the parallel line to d going through a
     * syntaxes `addLinePar(a, d)`, `addLinePar(a, d, name)`, `addLinePar(a, d, name, color)`, `addLinePar(a, d, name, color, lineStyle)` and `addLinePar(a, d, name, coland, lineStyle, thickness)`  are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a First point or point name (or tag if name is empty) the line is going through
     * @param {string} options.d line (or segment or ray) (or tag) the created line must be parallel to
     * @param {string} [options.name] Name of the line to be created (if present)
     * @param {string} [options.color=black] Color, black by default
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden=false] true to get the created line masked
     * @param {boolean} [options.hiddenName] true to get the created line name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created line (if present)
     * @returns {Promise<undefined>|CDroiteParallele} The created line if isPromiseMode is false or promise that will be resolved when the line is displayed
     */
    addLinePar: (...options) => {
      const listApi = app.listApi
      const {
        a,
        d,
        lineStyle,
        color,
        thickness,
        hidden,
        name,
        fontSize,
        hiddenName,
        tag
      } = getDefault(listApi, options, ['a', 'd'], ['name', 'color', 'lineStyle', 'thickness'], { nameForLine: true })
      const line = new CDroiteParallele(listApi, null, false, color, hiddenName, 0, 0, hidden, name, fontSize, new StyleTrait(listApi, lineStyle, thickness), 0.9, a, d)
      if (tag) line.tag = tag
      return formatReturn(listApi, app.svgApi, line)
    },

    /**
     * Adds the line perpendicular to d going through a
     * syntaxes `addLinePerp(a, d)`, `addLinePerp(a, d, name)`, `addLinePerp(a, d, name, color)`, `addLinePerp(a, d, name, color, lineStyle)` and `addLinePerp(a, d, name, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Point or point name the line is going through
     * @param {string} options.d line (or segment or ray) the created line must be perpendicular to
     * @param {string} [options.name] Name of the line to be created (if present)
     * @param {string} [options.color=black] Color, black by default
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created line masked
     * @param {boolean} [options.hiddenName] true to get the created line name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created line (if present)
     * @returns {Promise<undefined>|CDroitePerpendiculaire} The created line if isPromiseMode is false or promise that will be resolved when the line is displayed
     */
    addLinePerp: (...options) => {
      const listApi = app.listApi
      const {
        a,
        d,
        name,
        color,
        lineStyle,
        thickness,
        hidden,
        hiddenName,
        fontSize,
        tag
      } = getDefault(listApi, options, ['a', 'd'], ['name', 'color', 'lineStyle', 'thickness'], { nameForLine: true })
      const line = new CDroitePerpendiculaire(listApi, null, false, color, hiddenName, 0, 0, hidden, name, fontSize, new StyleTrait(listApi, lineStyle, thickness), 0.9, a, d)
      if (tag) line.tag = tag
      return formatReturn(listApi, app.svgApi, line)
    },

    /**
     * Adds the line going through points a and with line slope x
     * syntaxes `addLineAx(a, x)`, `addLineAx(a, x, name)`, `addLineAx(a, x, name, color)`, `addLineAx(a, x, name, color, lineStyle)` and `addLineAx(a, x, name, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Point or point name the line is going through
     * @param {number|string|CValDyn} options.x slope of the line (number or valid formula)
     * @param {string} [options.name] Name of the line to be created (if present)
     * @param {string} [options.color=black] Color, black by default
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden=false] true to get the created line masked
     * @param {boolean} [options.hiddenName] true to get the created line name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created line (if present)
     * @returns {Promise<undefined>|CDroiteOm} The created line if isPromiseMode is false or romise that will be resolved when the line is displayed
     */
    addLineAx: (...options) => {
      const listApi = app.listApi
      let {
        a,
        x,
        rep,
        lineStyle,
        color,
        thickness,
        name,
        fontSize,
        hidden,
        hiddenName,
        tag
      } = getDefault(listApi, options, ['a', 'x'], ['name', 'color', 'lineStyle', 'thickness'], { nameForLine: true, useRep: true })
      if (typeof x === 'string') {
        x = getCalcFromString(listApi, x)
      } else {
        if (typeof x !== 'number') { // x est un calcul ou une mesure qui a été créé
          x = new CResultatValeur(listApi, x)
        }
      }
      const line = new CDroiteOm(listApi, null, false, color, hiddenName, 0, 0, hidden, name, fontSize, new StyleTrait(listApi, lineStyle, thickness), 0.9, rep, a, new CValeur(listApi, x))
      if (tag) line.tag = tag
      return formatReturn(listApi, app.svgApi, line)
    },

    /**
     * Adds the mediator line of segment [a, b]
     * syntaxes `addLineMedAB(a, b)`, `addLineMedAB(a, b, name)`, `addLineMedAB(a, b, name, color)`, `addLineMedAB(a, b, name, color, lineStyle)` and `addLineMedAB(a, b, name, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a First point (or point name) line is mediator of
     * @param {CPt|string} options.b Second point (or point name) line is mediator of
     * @param {string} [options.name] Name of the line to be created (if present)
     * @param {string} [options.color=black] Color, black by default
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden=false] true to get the created line masked
     * @param {boolean} [options.hiddenName] true to get the created line name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created line (if present)
     * @returns {Promise<undefined>|CDroiteAB} The created line if isPromiseMode is false or romise that will be resolved when the line is displayed
     */
    addLineMedAB: (...options) => {
      const listApi = app.listApi
      const {
        a,
        b,
        tag,
        lineStyle,
        color,
        thickness,
        name,
        fontSize,
        hidden,
        hiddenName
      } = getDefault(listApi, options, ['a', 'b'], ['name', 'color', 'lineStyle', 'thickness'], { nameForLine: true })
      const line = new CMediatrice(listApi, null, false, color, hiddenName,
        0, 0, hidden, name, fontSize, new StyleTrait(listApi, lineStyle, thickness), 0.9, a, b)
      if (tag) line.tag = tag
      return formatReturn(listApi, app.svgApi, line)
    },

    /**
     * Adds the bisector line of angle a o b
     * syntaxes `addLineBisAOB(a, o, b)`, `addLineBisAOB(a, o, b, name)`, `addLineBisAOB(a, o, b, name, color)`, `addLineBisAOB(a, o, b, name, color, lineStyle)` and `addLineBisAOB(a, o, b, name, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Point a or point name for bisector of angle a o b
     * @param {CPt|string} options.o Point o or point name for bisector of angle a o b (starting point of the bisector)
     * @param {CPt|string} options.b Point b or point name for bisector of angle a o b
     * @param {string} [options.name] Name of the line to be created (if present)
     * @param {string} [options.color=black] Color, black by default
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden=false] true to get the created line masked
     * @param {boolean} [options.hiddenName] true to get the created line name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created line (if present)
     * @returns {Promise<undefined>|CDroiteAB} The created line if isPromiseMode is false or romise that will be resolved when the line is displayed
     */
    addLineBisAOB: (...options) => {
      const listApi = app.listApi
      const {
        a,
        o,
        b,
        tag,
        lineStyle,
        color,
        thickness,
        name,
        fontSize,
        hidden,
        hiddenName
      } = getDefault(listApi, options, ['a', 'o', 'b'], ['name', 'color', 'lineStyle', 'thickness'], { nameForLine: true })
      const line = new CBissectrice(listApi, null, false, color, hiddenName, 0, 0, hidden, name, fontSize, new StyleTrait(listApi, lineStyle, thickness), 0.0, a, o, b)
      if (tag) line.tag = tag
      return formatReturn(listApi, app.svgApi, line)
    },

    /**
     * @typedef ApiAddSegmentParams
     * @property {CPt|string} a Point or point name of the first extremity of the segment
     * @property {CPt|string} b Point or point name of the second extremity of the segment
     * @property {string} [lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @property {string} [color=black] Color
     * @property {number} [opacity=1] opacity (0 to 1)
     * @property {number} [thickness=1] Stroke thickness
     * @property {boolean} [hidden=false] true set the created segment masked
     * @property {string} [tag] Tag to be applied on the created segment (if present)
     */
    /**
     * Adds the segment of extremities a et b
     * syntaxes `addSegment(a, b)`, `addSegment(a, b, color)`, `addSegment(a, b, color, lineStyle)` and `addSegment(a, b, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiAddSegmentParams|CPt|string} params All params or first point
     * @param {CPt|string} [b] Point or point name of the second extremity of the segment (mandatory if first arg is the first point, ignored if it's a params object)
     * @param {string} [color=black] Color, ignored if first arg is a params object
     * @param {string} [lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---), ignored if first arg is a params object
     * @param {number} [thickness=1] Stroke thickness, ignored if first arg is a params object
     * @param {number} [opacity] opacity (0 to 1), ignored if first arg is a params object
     * @param {boolean} [hidden] true to get the created segment masked, ignored if first arg is a params object
     * @param {string} [tag] Tag to be applied on the created segment (if present), ignored if first arg is a params object
     * @returns {Promise<undefined>|CSegment} The created segment if isPromiseMode is false or promise that will be resolved when the segment is displayed
     */
    addSegment: (...args) => {
      const listApi = app.listApi
      const {
        a,
        b,
        lineStyle,
        color,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, args, ['a', 'b'], ['color', 'lineStyle', 'thickness'])
      const seg = new CSegment(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), a, b)
      if (tag) seg.tag = tag
      return formatReturn(listApi, app.svgApi, seg)
    },

    /**
     * Adds vector ab
     * syntaxes `addVector(a, b)`, `addVector(a, b, color)`, `addVector(a, b, color, lineStyle)` and `addVector(a, b, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Point or point name of the origin of the vector
     * @param {CPt|string} options.b Point or point name of the extremety of the vector
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.arrowStyle=longfull] Arrox style (short|long|shortfull|longfull)
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created vector masked
     * @param {string} [options.tag] Tag to be applied on the created vector (if present)
     * @returns {Promise<undefined>|CVecteur} The created point if isPromiseMode is false or promise that will be resolved when the vector is displayed
     */
    addVector: (...options) => {
      const listApi = app.listApi
      const {
        a,
        b,
        color,
        arrowStyle,
        lineStyle,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['a', 'b'], ['color', 'lineStyle', 'thickness'])
      const vec = new CVecteur(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), a, b, arrowStyle)
      if (tag) vec.tag = tag
      return formatReturn(listApi, app.svgApi, vec)
    },

    /**
     * Adds the ray [o,a)
     * syntaxes `addRay(o, a)`, `addRay(o, a, color)`, `addRay(o, a, color, lineStyle)` and `addRay(o, a, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o Point or point name of the starting edge of the ray
     * @param {CPt|string} options.a Point or point name the ray is going through
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created ray masked
     * @param {string} [options.tag] Tag to be applied on the created vector (if present)
     * @returns {Promise<undefined>|CDemiDroite} The created ray if isPromiseMode is false or promise that will be resolved when the ray is displayed
     */
    addRay: (...options) => {
      const listApi = app.listApi
      const {
        o,
        a,
        lineStyle,
        color,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['o', 'a'], ['color', 'lineStyle', 'thickness'])
      const ray = new CDemiDroiteOA(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), o, a)
      if (tag) ray.tag = tag
      return formatReturn(listApi, app.svgApi, ray)
    },

    /**
     * Adds the circle of center o and going through a
     * syntaxes `addCircleOA(o, a)`, `addCircleOA(o, a, color)`, `addCircleOA(o, a, color, lineStyle)` and `addCircleOA(o, a, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o Point or point name of the center
     * @param {CPt|string} options.a Point or point name of the point the circle is going through
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created circle masked
     * @param {string} [options.tag] Tag to be applied on the created circle (if present)
     * @returns {Promise<undefined>|CCercleOA} The created circle if isPromiseMode is false or promise that will be resolved when the circle is displayed
     */
    addCircleOA: (...options) => {
      const listApi = app.listApi
      const {
        o,
        a,
        lineStyle,
        color,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['o', 'a'], ['color', 'lineStyle', 'thickness'])
      const cercle = new CCercleOA(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), o, a)
      if (tag) cercle.tag = tag
      return formatReturn(listApi, app.svgApi, cercle)
    },

    /**
     * Adds the circle of center o and radius r
     * The figure must have a unity length
     * syntaxes `addCircleOr(o, r)`, `addCircleOr(o, r, color)`, `addCircleOr(o, r, color, lineStyle)` and `addCircleOr(o, r, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o Name (or tag if name is empty) of the center
     * @param {number|string} options.r Radius of the circle or string giving a valid formula for the radius
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, blck by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created circle masked
     * @param {string} [options.tag] Tag to be applied on the created circle (if present)
     * @returns {Promise<undefined>|CCercleOR} The created circle if isPromiseMode is false or promise that will be resolved when the circle is displayed
     */
    addCircleOr: (...options) => {
      const listApi = app.listApi
      if (listApi.pointeurLongueurUnite === null) throw Error('A unity length is required to create a circle by radius')
      let {
        o,
        r,
        lineStyle,
        color,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['o', 'r'], ['color', 'lineStyle', 'thickness'])
      if (typeof r === 'string') {
        r = getCalcFromString(listApi, r)
      } else {
        if (typeof r !== 'number') { // x est un calcul ou une mesure qui a été créé
          r = new CResultatValeur(listApi, r)
        }
      }
      const cercle = new CCercleOR(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), o, new CValeur(listApi, r))
      if (tag) cercle.tag = tag
      return formatReturn(listApi, app.svgApi, cercle)
    },

    /**
     * Adds the minor circle arc of center o starting from point a and ending at the intersection point of ray [o;b) and the circle
     * syntaxes `addArcOAB(o, a, b)`, `addArcOAB(o, a, b, color)`, `addArcOAB(o, a, b, color, lineStyle)` and `addArcOAB(o, a, b, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o Point or point name of the center of the arc
     * @param {CPt|string} options.a Point or point name of the starting point of the arc
     * @param {CPt|string} options.b Point or point name of the point providing the final extremity of the arc (by intersection of ray of origin o with the circle)
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created arc masked
     * @param {string} [options.tag] Tag to be applied on the created arc (if present)
     * @returns {Promise<undefined>|CArcDeCercle} The created arc if isPromiseMode is false or promise that will be resolved when the arc is displayed
     */
    addArcOAB: (...options) => {
      const listApi = app.listApi
      const {
        o,
        a,
        b,
        lineStyle,
        color,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['o', 'a', 'b'], ['color', 'lineStyle', 'thickness'])
      const arc = new CArcDeCercle(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), o, a, b, null)
      if (tag) arc.tag = tag
      return formatReturn(listApi, app.svgApi, arc)
    },

    /**
     * Adds the minor circle arc of center o, starting from a and angle x
     * syntaxes `addArcOAx(o, a, x)`, `addArcOAx(o, a, x, color)`, `addArcOAx(o, a, x, color, ineStyle)` and `addArcOAx(o, a, x, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o Point or point name of the center point of the arc
     * @param {CPt|string} options.a Point or point name of the starting point of the arc
     * @param {number|string|CValDyn} options.x Angle of the arc in the unity angle of the figure (number or valid formula)
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created arc masked
     * @param {string} [options.tag] Tag to be applied on the created arc (if present)
     * @returns {Promise<undefined>|CArcDeCercle} The created arc if isPromiseMode is false or promise that will be resolved when the arc is displayed
     */
    addArcOAx: (...options) => {
      const listApi = app.listApi
      let {
        o,
        a,
        x,
        lineStyle,
        color,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['o', 'a', 'x'], ['color', 'lineStyle', 'thickness'])
      if (typeof x === 'string') {
        x = getCalcFromString(listApi, x)
      } else {
        if (typeof x !== 'number') { // x est un calcul ou une mesure qui a été créé
          x = new CResultatValeur(listApi, x)
        }
      }
      const arc = new CArcDeCercle(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), o, a, null, new CValeurAngle(listApi, x))
      if (tag) arc.tag = tag
      return formatReturn(listApi, app.svgApi, arc)
    },

    /**
     * Adds the major circle arc of center o starting from point a and ending at the intersection point of ray [o;b) and the circle
     * syntaxes `addArcMajorOAB(o, a, b)`, `addArcMajorOAB(o, a, b, color)`, `addArcMajorOAB(o, a, b, coland, lineStyle)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o Point or point name of the center point of the arc
     * @param {CPt|string} options.a Point or point name of the starting point of the arc
     * @param {CPt|string} options.b Point or point name of the point providing the final extremity of the arc (by intersection of ray of origin o with the circle)
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created arc masked
     * @param {string} [options.tag] Tag to be applied on the created arc (if present)
     * @returns {Promise<undefined>|CGrandArcDeCercle} The created arc if isPromiseMode is false or promise that will be resolved when the arc is displayed
     */
    addArcMajorOAB: (...options) => {
      const listApi = app.listApi
      const {
        o,
        a,
        b,
        lineStyle,
        color,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['o', 'a', 'b'], ['color', 'lineStyle', 'thickness'])
      const arc = new CGrandArcDeCercle(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), o, a, b, null)
      if (tag) arc.tag = tag
      return formatReturn(listApi, app.svgApi, arc)
    },

    /**
     * Adds the major circle arc of center o starting from point a and angle x
     * syntaxes `addArcMajorOAx(o, a, x)`, `addArcMajorOAx(o, a, x, color)`, `addArcMajorOAx(o, a, x, color,  and `addArcMajorOAx(o, a, x, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o Point or point name  of the center point of the arc
     * @param {CPt|string} options.a Point or point name  of the starting  point of the arc
     * @param {number|string|CValDyn} options.x Angle of the arc in the unity angle of the figure (number or valid formula)
     * @param {string} [options.lineStyle=line] line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created arc masked
     * @param {string} [options.tag] Tag to be applied on the created arc (if present)
     * @returns {Promise<undefined>|CGrandArcDeCercle} The created arc if isPromiseMode is false or promise that will be resolved when the arc is displayed
     */
    addArcMajorOAx: (...options) => {
      const listApi = app.listApi
      let {
        o,
        a,
        x,
        lineStyle,
        color,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['o', 'a', 'x'], ['color', 'lineStyle', 'thickness'])
      if (typeof x === 'string') {
        x = getCalcFromString(listApi, x)
      } else {
        if (typeof x !== 'number') { // x est un calcul ou une mesure qui a été créé
          x = new CResultatValeur(listApi, x)
        }
      }
      const arc = new CGrandArcDeCercle(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), o, a, null, new CValeurAngle(listApi, x))
      if (tag) arc.tag = tag
      return formatReturn(listApi, app.svgApi, arc)
    },

    /**
     * Adds the direct circle arc of center o starting from point a and ending at the intersection point of ray [o;b) and the circle
     * syntaxes `addArcDirectOAB(o, a, b)`, `addArcDirectOAB(o, a, b, color)`, `addArcDirectOAB(o, a, b, color, lineStyle)` and `addArcDirectOAB(o, a, b, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o Point or point name of the center point of the arc
     * @param {CPt|string} options.a Point or point name of the starting point of the arc
     * @param {CPt|string} options.b Point or point name of the point providing the final extremity of the arc (by intersection of a ray of origin o with the circle)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created arc masked
     * @param {string} [options.tag] Tag to be applied on the created arc (if present)
     * @returns {Promise<undefined>|CArcDeCercleDirect} The created arc if isPromiseMode is false or promise that will be resolved when the arc is displayed
     */
    addArcDirectOAB: (...options) => {
      const listApi = app.listApi
      const {
        o,
        a,
        b,
        color,
        lineStyle,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['o', 'a', 'b'], ['color', 'lineStyle', 'thickness'])
      const arc = new CArcDeCercleDirect(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), o, a, b, null)
      if (tag) arc.tag = tag
      return formatReturn(listApi, app.svgApi, arc)
    },

    /**
     * Adds the indirect circle arc of center o starting from point a and ending at the intersection point of ray [o;b) and the circle
     * syntaxes `addArcIndirectOAB(o, a, b)`, `addArcIndirectOAB(o, a, b, color)`, `addArcIndirectOAB(o, a, b, color, lineStyle)` and `addArcIndirectOAB(o, a, b, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o Point or point name of the center point of the arc
     * @param {CPt|string} options.a Point or point name of the starting point of the arc
     * @param {CPt|string} options.b Point or point name of the point providing the final extremity of the arc (by intersection of a ray of origin o with the circle)
     * @param {string} [options.color] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created arc masked
     * @param {string} [options.tag] Tag to be applied on the created arc (if present)
     * @returns {Promise<undefined>|CArcDeCercleIndirect} The created arc if isPromiseMode is false or promise that will be resolved when the arc is displayed
     */
    addArcIndirectOAB: (...options) => {
      const listApi = app.listApi
      const {
        o,
        a,
        b,
        color,
        lineStyle,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['o', 'a', 'b'], ['color', 'lineStyle', 'thickness'])
      const arc = new CArcDeCercleIndirect(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), o, a, b, null)
      if (tag) arc.tag = tag
      return formatReturn(listApi, app.svgApi, arc)
    },

    /**
     * Adds an image point of o through a translation of vector ab
     * syntaxes `addImPointTranslation(o, a, b)`, `addImPointTranslation(o, a, b, name)`, `addImPointTranslation(o, a, b, name, color)` and `addImPointTranslation(o, a, b, name, color, pointStyle)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o Point (or point name) that is to be transformed by the translation
     * @param {CPt|string} options.a Point (or point name) origin of the translation vector
     * @param {CPt|string} options.b Point (or point name) extremity of the translation vector
     * @param {string} [options.name] The name of the point to be created (image point)
     * @param {number} [options.offsetX] x-shift of the point name
     * @param {number} [options.offsetY] y-shift of the point name
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.pointStyle=O] Point style (o|O|OO|x|X|+|<>|[]|.) or (littleround|round|biground|mult|bigmult|cross|diamond|square|pixel|)
     * @param {boolean} [options.hidden] true to get the created point masked
     * @param {boolean} [options.hiddenName] true to get the created point name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created point (if present)
     * @returns {Promise<undefined>|CPointImage} The created point if isPromiseMode is false or promise that will be resolved when the point is displayed
     */
    addImPointTranslation: (...options) => {
      const listApi = app.listApi
      const {
        o,
        a,
        b,
        name,
        offsetX,
        offsetY,
        color,
        pointStyle,
        hidden,
        hiddenName,
        fontSize,
        tag
      } = getDefault(listApi, options, ['o', 'a', 'b'], ['name', 'color', 'pointStyle'])
      const trans = new CTranslation(listApi, null, false, a, b)
      trans.positionne()
      listApi.add(trans)
      const ptim = new CPointImage(listApi, null, false, color, hiddenName, offsetX, offsetY, hidden, name, fontSize, pointStyle, false, o, trans)
      if (tag) ptim.tag = tag
      return formatReturn(listApi, app.svgApi, ptim)
    },

    /**
     * Adds an image point of a through a translation of vector with coordinates  (x, y)
     * syntaxes `addImPointTranslation(a, x, y)`, `addImPointTranslation(a, x, y, name)`, `addImPointTranslation(a, x, y, name, color)` and `addImPointTranslation(a, x, y, name, color, pointStyle)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Point (or point name) that is to be transformed by the translation
     * @param {number|string|CValDyn} options.x the first coordinate of the translation vector
     * @param {number|string|CValDyn} options.y the second coordinate of the translation vector
     * @param {string} [options.name] The name of the point to be created (image point)
     * @param {string} [options.rep] tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     * @param {number} [options.offsetX] x-shift of the point name
     * @param {number} [options.offsetY] y-shift of the point name
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.pointStyle=O] Point style (o|O|OO|x|X|+|<>|[]|.) or (littleround|round|biground|mult|bigmult|cross|diamond|square|pixel|)
     * @param {boolean} [options.hidden] true to get the created point masked
     * @param {boolean} [options.hiddenName] true to get the created point name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created point (if present)
     * @returns {Promise<undefined>|CPointImage} The created point if isPromiseMode is false or promise that will be resolved when the point is displayed
     */
    addImPointTranslationxy: (...options) => {
      const listApi = app.listApi
      let {
        a,
        x,
        y,
        rep,
        name,
        offsetX,
        offsetY,
        color,
        pointStyle,
        hidden,
        hiddenName,
        fontSize,
        tag
      } = getDefault(listApi, options, ['a', 'x', 'y'], ['name', 'color', 'pointStyle', 'rep'], { useRep: true })
      if (!rep) throw Error('Call of addPointXY without frame')
      // on prendra pour rep un repère de tag 'rep' s'il y en a un
      if (typeof x === 'string') {
        x = getCalcFromString(listApi, x)
      } else {
        if (typeof x !== 'number') { // x est un calcul ou une mesure qui a été créé
          x = new CResultatValeur(listApi, x)
        }
      }
      if (typeof y === 'string') {
        y = getCalcFromString(listApi, y)
      } else {
        if (typeof y !== 'number') { // x est un calcul ou une mesure qui a été créé
          y = new CResultatValeur(listApi, y)
        }
      }
      // const trans = new CTranslation(list, null, false, a, b)
      const trans = new CTranslationParCoord(listApi, null, false, new CValeur(listApi, x), new CValeur(listApi, y), rep)
      trans.positionne()
      listApi.add(trans)
      const ptim = new CPointImage(listApi, null, false, color, hiddenName, offsetX, offsetY, hidden, name, fontSize, pointStyle, false, a, trans)
      if (tag) ptim.tag = tag
      return formatReturn(listApi, app.svgApi, ptim)
    },

    /**
     * Adds the image point of a through a rotation of center o and angle x
     * syntaxes `addImPointRotation(a, o, x)`, `addImPointRotation(a, o, x, name)`, `addImPointRotation(a, o, x, name, color)` and `addImPointRotation(a, o, x, name, color, pointStyle)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a point that is to be transformed by the rotation
     * @param {CPt|string} options.o The rotation center (or point name)
     * @param {number|string|CValDyn} options.x Angle of rotation : number or valid formula
     * @param {string} [options.name] The name of the point to be created
     * @param {number} [options.offsetX] x-shift of the name
     * @param {number} [options.offsetY] y-shift of the name
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.pointStyle=O] Point style (o|O|OO|x|X|+|<>|[]|.) or (littleround|round|biground|mult|bigmult|cross|diamond|square|pixel|)
     * @param {boolean} [options.hidden] true to get the created point masked
     * @param {boolean} [options.hiddenName] true to get the created point name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created point (if present)
     * @returns {Promise<undefined>|CPointImage} The created point if isPromiseMode is false or promise that will be resolved when the point is displayed
     */
    addImPointRotation: (...options) => {
      const listApi = app.listApi
      let {
        o,
        a,
        x,
        name,
        offsetX,
        offsetY,
        color,
        pointStyle,
        hidden,
        hiddenName,
        fontSize,
        tag
      } = getDefault(listApi, options, ['a', 'o', 'x'], ['name', 'color', 'pointStyle'])
      if (typeof x === 'string') {
        x = getCalcFromString(listApi, x)
      } else {
        if (typeof x !== 'number') { // x est un calcul ou une mesure qui a été créé
          x = new CResultatValeur(listApi, x)
        }
      }
      const rot = new CRotation(listApi, null, false, o, new CValeurAngle(listApi, x))
      rot.positionne()
      listApi.add(rot)
      const ptim = new CPointImage(listApi, null, false, color, hiddenName, offsetX, offsetY, hidden, name, fontSize, pointStyle, false, a, rot)
      if (tag) ptim.tag = tag
      return formatReturn(listApi, app.svgApi, ptim)
    },

    /**
     * Adds an image point of a through a dilation of center o and ratio x
     * syntaxes `addImPointDilation(a, o, x)`, `addImPointDilation(a, o, x, name)`, `addImPointDilation(a, o, x, name, color)`, `addImPointDilation(a, o, x, name, coland, pointStyle)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a point that is to be transformed by the dilation (or point name)
     * @param {CPt|string} options.o center point of the dilation (or point name)
     * @param {number|string|CValDyn} options.x Ratio of the dilation : number or vaid formula
     * @param {string} [options.name] The name of the point to be created
     * @param {number} [options.offsetX] x-shift of the name
     * @param {number} [options.offsetY] y-shift of the name
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.pointStyle=O] Point style (o|O|OO|x|X|+|<>|[]|.) or (littleround|round|biground|mult|bigmult|cross|diamond|square|pixel|)
     * @param {boolean} [options.hidden] true to get the created point masked
     * @param {boolean} [options.hiddenName] true to get the created point name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created point (if present)
     * @returns {Promise<undefined>|CPointImage} The created point if isPromiseMode is false or promise that will be resolved when the point is displayed
     */
    addImPointDilation: (...options) => {
      const listApi = app.listApi
      let {
        o,
        a,
        x,
        name,
        offsetX,
        offsetY,
        color,
        pointStyle,
        hidden,
        hiddenName,
        fontSize,
        tag
      } = getDefault(listApi, options, ['a', 'o', 'x'], ['name', 'color', 'pointStyle'])
      if (typeof x === 'string') {
        x = getCalcFromString(listApi, x)
      } else {
        if (typeof x !== 'number') { // x est un calcul ou une mesure qui a été créé
          x = new CResultatValeur(listApi, x)
        }
      }
      const hom = new CHomothetie(listApi, null, false, o, new CValeur(listApi, x))
      hom.positionne()
      listApi.add(hom)
      const ptim = new CPointImage(listApi, null, false, color, hiddenName, offsetX, offsetY, hidden, name, fontSize, pointStyle, false, a, hom)
      if (tag) ptim.tag = tag
      return formatReturn(listApi, app.svgApi, ptim)
    },

    /**
     * Adds an image point of a through the central symmetry of center o
     * syntaxes `addImPointSymCent(a, o)`, `addImPointSymCent(a, o, name)`, `addImPointSymCent(a, o, name, color)` and `addImPointSymCent(a, o, name, color, pointStyle)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o center of the symmetry (or point name)
     * @param {CPt|string} options.a point that is to be transformed by the dilation (or point name)
     * @param {string} [options.name] The name of the point to be created
     * @param {number} [options.offsetX] x-shift of the name
     * @param {number} [options.offsetY] y-shift of the name
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.pointStyle=O] Point style (o|O|OO|x|X|+|<>|[]|.) or (littleround|round|biground|mult|bigmult|cross|diamond|square|pixel|)
     * @param {boolean} [options.hidden] true to get the created point masked
     * @param {boolean} [options.hiddenName] true to get the created point name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created point (if present)
     * @returns {Promise<undefined>|CPointImage} The created point if isPromiseMode is false or promise that will be resolved when the point is displayed
     */
    addImPointSymCent: (...options) => {
      const listApi = app.listApi
      const {
        o,
        a,
        name,
        offsetX,
        offsetY,
        color,
        pointStyle,
        hidden,
        hiddenName,
        fontSize,
        tag
      } = getDefault(listApi, options, ['a', 'o'], ['name', 'color', 'pointStyle'])
      const sym = new CSymetrieCentrale(listApi, null, false, o)
      sym.positionne()
      listApi.add(sym)
      const ptim = new CPointImage(listApi, null, false, color, hiddenName, offsetX, offsetY, hidden, name, fontSize, pointStyle, false, a, sym)
      if (tag) ptim.tag = tag
      return formatReturn(listApi, app.svgApi, ptim)
    },

    /**
     * Adds an image point of a through an axial symmetry of axis d
     * syntaxes `addImPointSymAx(a, d)`, `addImPointSymAx(a, d, name)`, `addImPointSymAx(a, d, name, color)` and `addImPointSymAx(a, d, name, color, pointStyle)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a point that is to be transformed by the symmetry (or point name)
     * @param {string} options.d The symmetry axis (line, segment or ray)
     * @param {string} [options.name] The name of the point to be created
     * @param {number} [options.offsetX] x-shift of the name
     * @param {number} [options.offsetY] y-shift of the name
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.pointStyle=O] Point style (o|O|OO|x|X|+|<>|[]|.) or (littleround|round|biground|mult|bigmult|cross|diamond|square|pixel|)
     * @param {boolean} [options.hidden] true to get the created point masked
     * @param {boolean} [options.hiddenName] true to get the created point name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created point (if present)
     * @returns {Promise<undefined>|CPointImage} The created point if isPromiseMode is false or promise that will be resolved when the point is displayed
     */
    addImPointSymAx: (...options) => {
      const listApi = app.listApi
      const {
        d,
        a,
        name,
        offsetX,
        offsetY,
        color,
        pointStyle,
        hidden,
        hiddenName,
        fontSize,
        tag
      } = getDefault(listApi, options, ['a', 'd'], ['name', 'color', 'pointStyle'])
      const sym = new CSymetrieAxiale(listApi, null, false, d)
      sym.positionne()
      listApi.add(sym)
      const ptim = new CPointImage(listApi, null, false, color, hiddenName, offsetX, offsetY, hidden, name, fontSize, pointStyle, false, a, sym)
      if (tag) ptim.tag = tag
      return formatReturn(listApi, app.svgApi, ptim)
    },

    /**
     * adds the translation of vector a b
     * syntax `addTranslation(a, b)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a origin point of the translation vector
     * @param {CPt|string} options.b ending point of the translation vector
     * @returns {CTranslation}
     */
    addTranslation: (...options) => {
      const listApi = app.listApi
      const {
        a,
        b
      } = getDefault(listApi, options, ['a', 'b'])
      const trans = new CTranslation(listApi, null, false, a, b)
      trans.positionne()
      listApi.add(trans)
      return trans
    },

    /**
     * adds the translation of vector with coordinates (x, y)
     * syntaxes `addTranslation(x, y)` and `addTranslation(x, y, rep)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {number|string|CValDyn} options.x x-coordinate of the translation vector
     * @param {number|string|CValDyn} options.y y-coordinate of the translation vector
     * @param {string} [options.rep] frame (system of coordinates) or tag of the frame, mandatory only if the figure contains several frames
     * @returns {CTranslation}
     */
    addTranslationxy: (...options) => {
      const listApi = app.listApi
      let {
        x,
        y,
        rep
      } = getDefault(listApi, options, ['x', 'y'], ['rep'], { useRep: true })
      if (typeof x === 'string') {
        x = getCalcFromString(listApi, x)
      } else {
        if (typeof x !== 'number') { // x est un calcul ou une mesure qui a été créé
          x = new CResultatValeur(listApi, x)
        }
      }
      if (typeof y === 'string') {
        y = getCalcFromString(listApi, y)
      } else {
        if (typeof y !== 'number') { // x est un calcul ou une mesure qui a été créé
          y = new CResultatValeur(listApi, y)
        }
      }
      const trans = new CTranslationParCoord(listApi, null, false, new CValeur(listApi, x), new CValeur(listApi, y), rep)
      trans.positionne()
      listApi.add(trans)
      return trans
    },

    /**
     * adds the rotation of center o and angle x
     * syntax `addRotation(o, x)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o center of the rotation
     * @param {number|string|CValDyn} options.x the angle of the rotation (number, object or string containing a valid formula)
     * @returns {CRotation}
     */
    addRotation: (...options) => {
      const listApi = app.listApi
      let {
        o,
        x
      } = getDefault(listApi, options, ['o', 'x'])
      if (typeof x === 'string') {
        x = getCalcFromString(listApi, x)
      } else {
        if (typeof x !== 'number') { // x est un calcul ou une mesure qui a été créé
          x = new CResultatValeur(listApi, x)
        }
      }
      const rot = new CRotation(listApi, null, false, o, new CValeurAngle(listApi, x))
      rot.positionne()
      listApi.add(rot)
      return rot
    },

    /**
     * adds the dilation of center o and ratio x
     * syntax `addDilation(o, x)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o center of the dilation
     * @param {number|string|CValDyn} options.x the ratio of the dilation (number, object or string containing a valid formula)
     * @returns {CHomothetie}
     */
    addDilation: (...options) => {
      const listApi = app.listApi
      let {
        o,
        x
      } = getDefault(listApi, options, ['o', 'x'])
      if (typeof x === 'string') {
        x = getCalcFromString(listApi, x)
      } else {
        if (typeof x !== 'number') { // x est un calcul ou une mesure qui a été créé
          x = new CResultatValeur(listApi, x)
        }
      }
      const hom = new CHomothetie(listApi, null, false, o, new CValeur(listApi, x))
      hom.positionne()
      listApi.add(hom)
      return hom
    },

    /**
     * adds the central symmetry of center o
     * syntax `addSymCent(o)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o center of the dilation
     * @returns {CSymetrieCentrale}
     */
    addSymCent: (...options) => {
      const listApi = app.listApi
      const {
        o
      } = getDefault(listApi, options, ['o'])
      const sym = new CSymetrieCentrale(listApi, null, false, o)
      sym.positionne()
      listApi.add(sym)
      return sym
    },

    /**
     * adds the axial symmetry of center o
     * syntax `addSymAx(d)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CDroite|string} options.d symmetry axis
     * @returns {CSymetrieAxiale}
     */
    addSymAx: (...options) => {
      const listApi = app.listApi
      const {
        d
      } = getDefault(listApi, options, ['d'])
      const sym = new CSymetrieAxiale(listApi, null, false, d)
      sym.positionne()
      listApi.add(sym)
      return sym
    },

    /**
     * adds the direct similitude of center o, angle x and ratio y
     * syntax `addSimilitude(o, x, y)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o center of the similitude
     * @param {number|string|CValDyn} options.x the angle of the similitude (number, object or string containing a valid formula)
     * @param {number|string|CValDyn} options.y the ration of the similitude (number, object or string containing a valid formula)
     * @returns {CSimilitude}
     */
    addSimilitude: (...options) => {
      const listApi = app.listApi
      let {
        o,
        x,
        y
      } = getDefault(listApi, options, ['o', 'x', 'y'])
      if (typeof x === 'string') {
        x = getCalcFromString(listApi, x)
      } else {
        if (typeof x !== 'number') { // x est un calcul ou une mesure qui a été créé
          x = new CResultatValeur(listApi, x)
        }
      }
      if (typeof y === 'string') {
        y = getCalcFromString(listApi, y)
      } else {
        if (typeof y !== 'number') { // x est un calcul ou une mesure qui a été créé
          y = new CResultatValeur(listApi, y)
        }
      }
      const sim = new CSimilitude(listApi, null, false, o, new CValeurAngle(listApi, x), new CValeur(listApi, y))
      // const rot = new CRotation(list, null, false, o, new CValeurAngle(list, x))
      sim.positionne()
      listApi.add(sim)
      return sim
    },

    /**
     * adds the image of point a by transformation transf
     * syntaxes `addPointIm(a, transf)`, `addPointIm(a, transf, name)`, `addPointIm(a, transf, name, color)` and `addPointIm(a, transf, name, color, pointStyle)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CDroiteAncetre} options.d the line that is to be transformed
     * @param {CTransformation} options.transf the transformation to aplly on line d
     * @param {string} [options.name] The name of the point to be created
     * @param {number} [options.offsetX] x-shift of the name
     * @param {number} [options.offsetY] y-shift of the name
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.pointStyle=O] Point style (o|O|OO|x|X|+|<>|[]|.) or (littleround|round|biground|mult|bigmult|cross|diamond|square|pixel|)
     * @param {boolean} [options.hidden] true to get the created point masked
     * @param {boolean} [options.hiddenName] true to get the created point name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created point (if present)
     * @returns {Promise<undefined>|CPointImage} The created point if isPromiseMode is false or promise that will be resolved when the point is displayed
     */
    addPointIm: (...options) => {
      const listApi = app.listApi
      const {
        a,
        transf,
        name,
        offsetX,
        offsetY,
        color,
        pointStyle,
        hidden,
        hiddenName,
        fontSize,
        tag
      } = getDefault(listApi, options, ['a', 'transf'], ['name', 'color', 'pointStyle'])
      const ptim = new CPointImage(listApi, null, false, color, hiddenName, offsetX, offsetY, hidden, name, fontSize, pointStyle, false, a, transf)
      if (tag) ptim.tag = tag
      return formatReturn(listApi, app.svgApi, ptim)
    },

    /**
     * adds the image of line d by transformation transf
     * syntaxes `addLineIm(d, transf)`, `addLineIm(d, transf, name)`, `addLineIm(d, transf, name, color)`, `addLineIm(d, transf, name, color, lineStyle)` and `addLineIm(d, transf, name, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CDroiteAncetre} options.d the line that is to be transformed
     * @param {CTransformation} options.transf the transformation to aplly on line d
     * @param {string} [options.name] Name of the line to be created (if present)
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created line masked
     * @param {boolean} [options.hiddenName] true to get the created line name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created line (if present)
     * @returns {Promise<undefined>|CDroiteAB} The created line if isPromiseMode is false or romise that will be resolved when the line is displayed
     */
    addLineIm: (...options) => {
      const listApi = app.listApi
      const {
        d,
        transf,
        lineStyle,
        color,
        thickness,
        name,
        fontSize,
        hidden,
        hiddenName,
        offsetX,
        offsetY,
        tag
      } = getDefault(listApi, options, ['d', 'transf'], ['name', 'color', 'lineStyle', 'thickness'], { nameForLine: true })
      if (!d.estDeNature(NatObj.NDroite)) throw Error('Argument of addLineIm must be line, not a ray, segment of vector')
      const dtim = new CDroiteImage(listApi, null, false, color, hiddenName, offsetX, offsetY, hidden, name, fontSize, new StyleTrait(listApi, lineStyle, thickness), 0.9, d, transf)
      if (tag) dtim.tag = tag
      return formatReturn(listApi, app.svgApi, dtim)
    },

    /**
     * adds the image of ray d by transformation transf
     * syntaxes `addRayIm(d, transf)`, `addRayIm(d, transf, name)`, `addRayIm(d, transf, name, color)`, `addRayIm(d, transf, name, color, lineStyle)` and `addRayIm(d, transf, name, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CDemiDroite} options.d the ray that is to be transformed
     * @param {CTransformation} options.transf the transformation to aplly on ray d
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created line masked
     * @param {boolean} [options.hiddenName] true to get the created line name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created line (if present)
     * @returns {Promise<undefined>|CDroiteAB} The created line if isPromiseMode is false or romise that will be resolved when the line is displayed
     */
    addRayIm: (...options) => {
      const listApi = app.listApi
      const {
        d,
        transf,
        lineStyle,
        color,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['d', 'transf'], ['color', 'lineStyle', 'thickness'])
      if (!d.estDeNature(NatObj.NDemiDroite)) throw Error('Argument of addRayIm must be a ray, not a line, segment of vector')
      const rayim = new CDemiDroiteImage(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), d, transf)
      if (tag) rayim.tag = tag
      return formatReturn(listApi, app.svgApi, rayim)
    },

    /**
     * adds the image of circle (or circle arc) c by transformation transf
     * syntaxes `addCircleIm(c, transf)`, `addCircleIm(c, transf, name)`, `addCircleIm(c, transf, name, color)`, `addCircleIm(c, transf, name, color, lineStyle)` and `addCircleIm(c, transf, name, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CCercle} options.c the circle (or circle arc) that is to be transformed
     * @param {CTransformation} options.transf the transformation to aplly on line d
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the created line masked
     * @param {boolean} [options.hiddenName] true to get the created line name masked
     * @param {number} [options.fontSize=16] Font size of the name
     * @param {string} [options.tag] Tag to be applied on the created line (if present)
     * @returns {Promise<undefined>|CDroiteAB} The created line if isPromiseMode is false or romise that will be resolved when the line is displayed
     */
    addCircleIm: (...options) => {
      const listApi = app.listApi
      const {
        c,
        transf,
        lineStyle,
        color,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['c', 'transf'], ['color', 'lineStyle', 'thickness'])
      let Cl
      if (c.estDeNature(NatObj.NCercle)) Cl = CCercleImage
      else {
        if (c.estDeNature(NatObj.NArc)) Cl = CArcDeCercleImage
      }
      const cim = new Cl(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), c, transf)
      if (tag) cim.tag = tag
      return formatReturn(listApi, app.svgApi, cim)
    },

    /**
     * Adds a text diplay located at [x,y]
     * syntaxes `addText(text, x, y)` and `addText(text, x, y, color)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.text The text to be displayed
     * @param {number} options.x x-coordinate of the location the text is to be displayed at
     * @param {number|string|CValDyn} options.y y-coordinate of the location the text is to be displayed at
     * @param {number} [options.offsetX] x-shift oof the text display
     * @param {number} [options.offsetY] y-shift oof the text display
     * @param {boolean} [options.absCoord=false] set to true if x,y should be considered absolute in the svg (in that case rep is ignored), useless if there is no frame (in that case x,y will be considered absolute regardless of this property)
     * @param {string} [options.rep] tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the created text display masked
     * @param {number} [options.fontSize=16] Size of the font used for the display (in pixels)
     * @param {string} [options.border=none] The border style (none|simple|3D)
     * @param {boolean} [options.opaque=false] true if the text or LaTeX displays erases its background. If true the color used to erase the background is the backgroundColor if present, else the background color of the figure
     * @param {string} [options.backgroundColor] Background color, white by default
     * @param {string} [options.hAlign] Horizontal alignment left|center|right
     * @param {string} [options.vAlign] Vertical alignement top|middle|bottom
     * @param {string} [options.tag] Tag to be applied on the created text display (if present)
     * @returns {Promise<undefined>} Promise that will be resolved when the text is displayed
     */
    addText: (...options) => {
      const listApi = app.listApi
      let {
        text,
        x,
        y,
        offsetX,
        offsetY,
        rep,
        color,
        hidden,
        fontSize,
        border,
        opaque,
        backgroundColor,
        hAlign,
        vAlign,
        tag
      } = getDefault(listApi, options, ['text', 'x', 'y'], ['color'], { useRepOrSVG: true })
      ensureUndefOrNumber('x', x) // x ne peut pas être dynamique
      ensureUndefOrNumber('y', y) // y ne peut pas être dynamique
      if (rep) [x, y] = rep.getAbsCoord(x, y)
      const com = new CCommentaire(listApi, null, false, color, x, y, offsetX, offsetY, hidden, null,
        fontSize, border, opaque, backgroundColor, hAlign, vAlign, text, new CValeurAngle(listApi, 0))
      if (tag) com.tag = tag
      com.determineDependances()
      return formatReturn(listApi, app.svgApi, com)
    },

    /**
     * Adds a LaTeX diplay located at [x,y]
     * syntaxes `addLatex(latex, x, y)` and `addLatex(latex, x, y, color)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.latex The LaTeX code to be displayed
     * @param {number} options.x x-coordinate of the location the text is to be displayed at
     * @param {number|string|CValDyn} options.y y-coordinate of the location the text is to be displayed at
     * @param {number} [options.offsetX] x-shift of the LaTeX display
     * @param {number} [options.offsetY] xy-shift oof the LaTeX display
     * @param {boolean} [options.absCoord=false] set to true if x,y should be considered absolute in the svg (in that case rep is ignored), useless if there is no frame (in that case x,y will be considered absolute regardless of this property)
     * @param {string} [options.rep] tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the created LaTeX display masked
     * @param {number} [options.fontSize=16] Size of the font used for the display (in pixels)
     * @param {string} [options.border=none] The border style (none|simple|3D)
     * @param {boolean} [options.opaque=false] true if the text or LaTeX displays erases its background. If true the color used to erase the background is the backgroundColor if present, else the background color of the figure
     * @param {string} [options.backgroundColor] Background color if opaque is true
     * @param {string} [options.hAlign] Horizontal alignment left|center|right
     * @param {string} [options.vAlign] Vertical alignment top|middle|bottom
     * @param {string} [options.tag] Tag to be applied on the created LaTeX display (if present)
     * @returns {Promise<undefined>} Promise that will be resolved when the LaTeX is displayed
     */
    addLatex: (...options) => {
      const listApi = app.listApi
      let {
        latex,
        x,
        y,
        offsetX,
        offsetY,
        rep,
        color,
        hidden,
        fontSize,
        border,
        opaque,
        backgroundColor,
        hAlign,
        vAlign,
        tag
      } = getDefault(listApi, options, ['latex', 'x', 'y'], ['color'], { useRepOrSVG: true })
      ensureUndefOrNumber('x', x) // x ne peut pas être dynamique
      ensureUndefOrNumber('y', y) // y ne peut pas être dynamique
      if (rep) [x, y] = rep.getAbsCoord(x, y)
      // on utilise la syntaxe .then ici, sans marquer notre méthode async, pour qu'un éventuel plantage de getDefault (options malformées ou manquantes) soit sync
      // pour la plupart des utilisateurs qui ne récupèrent pas ce qu'on retourne et ne font pas de catch dessus, ça leur évitera pas mal de Unhandled rejection in Promise…
      const lat = new CLatex(listApi, null, false, color, x, y, offsetX, offsetY, hidden, null,
        fontSize, border, opaque, backgroundColor, hAlign, vAlign, latex, new CValeurAngle(listApi, 0))
      if (tag) lat.tag = tag
      lat.determineDependances()
      return formatReturn(listApi, app.svgApi, lat)
    },

    /**
     * Adds a text display linked to a point a
     * syntaxes `addLinkedText(text, a)` and `addLinkedText(text, a, color)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.text The text to be displayed
     * @param {CPt|string} options.a Name (or tag if name is empty) of the point the text display must be linked to
     * @param {number} [options.offsetX] x-shift of the text display
     * @param {number} [options.offsetY] y-shift of the text display
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the created text display masked
     * @param {number} [options.fontSize=16] Size of the font used for the display (in pixels)
     * @param {string} [options.border=none] The border style (none|simple|3D)
     * @param {boolean} [options.opaque=false] true if the text or LaTeX displays erases its background. If true the color used to erase the background is the backgroundColor if present, else the background color of the figure
     * @param {string} [options.backgroundColor] Background color if opaque is true
     * @param {string} [options.hAlign] Horizontal alignment left|center|right
     * @param {string} [options.vAlign] Vertical alignment top|middle|bottom
     * @param {string} [options.tag] Tag to be applied on the created text display (if present)
     * @returns {Promise<undefined>} Promise that will be resolved when the text is displayed
     */
    addLinkedText: (...options) => {
      const listApi = app.listApi
      const {
        text,
        a,
        offsetX,
        offsetY,
        color,
        hidden,
        fontSize,
        border,
        opaque,
        backgroundColor,
        hAlign,
        vAlign,
        tag
      } = getDefault(listApi, options, ['text', 'a'], ['color'])
      const com = new CCommentaire(listApi, null, false, color, 0, 0, offsetX, offsetY, hidden, a,
        fontSize, border, opaque, backgroundColor, hAlign, vAlign, text, new CValeurAngle(listApi, 0))
      if (tag) com.tag = tag
      com.determineDependances()
      return formatReturn(listApi, app.svgApi, com)
    },

    /**
     * Adds a LaTeX display linked to a point a
     * syntaxes `addLinkedLatex(latex, a)` and `addLinkedLatex(latex, a, color)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.latex The LaTeX code to be displayed
     * @param {CPt|string} options.a Name (or tag if name is empty) of the point the text display is linked to
     * @param {number} [options.offsetX] x-shift of the LaTeX display
     * @param {number} [options.offsetY] y-shift of the LaTeX display
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the created LaTeX display masked
     * @param {number} [options.fontSize=16] Size of the font used for the display (in pixels)
     * @param {string} [options.border=none] The border style (none|simple|3D)
     * @param {boolean} [options.opaque=false] true if the text or LaTeX displays erases its background. If true the color used to erase the background is the backgroundColor if present, else the background color of the figure
     * @param {string} [options.backgroundColor] Background color if opaque is true     * @param {string} [options.hAlign] Horizontal alignment left|center|right
     * @param {string} [options.vAlign] Vertical alignment top|middle|bottom
     * @param {string} [options.tag] Tag to be applied on the created LaTeX display (if present)
     * @returns {Promise<undefined>} Promise that will be resolved when the LaTeX is displayed
     */
    addLinkedLatex: (...options) => {
      const listApi = app.listApi
      const {
        latex,
        a,
        offsetX,
        offsetY,
        color,
        hidden,
        fontSize,
        border,
        opaque,
        backgroundColor,
        hAlign,
        vAlign,
        tag
      } = getDefault(listApi, options, ['latex', 'a'], ['color'])
      const lat = new CLatex(listApi, null, false, color, 0, 0, offsetX, offsetY, hidden, a,
        fontSize, border, opaque, backgroundColor, hAlign, vAlign, latex, new CValeurAngle(listApi, 0))
      if (tag) lat.tag = tag
      lat.determineDependances()
      return formatReturn(listApi, app.svgApi, lat)
    },

    /**
     * Adds the intersection of 2 lines
     * syntaxes `addIntLineLine(d, d2)`, `addIntLineLine(d, d2, name)`, `addIntLineLine(d, d2, name, color)` and `addIntLineLine(d, d2, name, color, pointStyle)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.d Tag of the first intersection line (or ray or segment)
     * @param {string} options.d2 Tag of the second intersection line (or ray or segment)
     * @param {string} [options.pointStyle=round] Point style (square|round|cross|mult|littleround|diamond|pixel|biground|bigmult)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the intersection point masked
     * @param {string} [options.name] The name of the intersection point
     * @param {number} [options.fontSize=16] Size of the font used for the intersection point name
     * @param {boolean} [options.hiddenName] true to get the intersection point name hidden
     * @param {string} [options.tag] Tag to be applied on the created LaTeX display (if present)
     * @returns {Promise<undefined>|CIntDroiteDroite} The created point if isPromiseMode is false or promise that will be resolved when the intersection point is displayed
     */
    addIntLineLine: (...options) => {
      const listApi = app.listApi
      const {
        d,
        d2,
        pointStyle,
        color,
        hidden,
        name,
        fontSize,
        hiddenName,
        tag
      } = getDefault(listApi, options, ['d', 'd2'], ['name', 'color', 'pointStyle'])
      const ptint = new CIntDroiteDroite(listApi, null, false, color, hiddenName, 0, 0, hidden, name,
        fontSize, pointStyle, false, d, d2)
      if (tag) ptint.tag = tag
      return formatReturn(listApi, app.svgApi, ptint)
    },

    /**
     * Adds the intersection between a line and a circle without re-creating an intersection point already created
     * syntaxes `addIntLineCircle(d, c)`, `addIntLineCircle(d, c, name)`, `addIntLineCircle(d, c, name, name2)`, `addIntLineCircle(d, c, name, name2, color)` and `addIntLineCircle(d, c, name, name2, color, pointStyle)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.d Tag of the first intersection line (or ray or segment)
     * @param {string} options.c Tag of the intersection circle (or circle arc)
     * @param {boolean} [options.smartIntersect=true] Set to false to re-create points seen as already existing in circle intersection (with circle or line)
     * @param {string} [options.pointStyle=round] Point style (square|round|cross|mult|littleround|diamond|pixel|biground|bigmult)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the intersection points masked
     * @param {string} [options.name] Name of the first intersection point created
     * @param {string} [options.name2] Name of the second intersection point created (if not already present in the figure)
     * @param {number} [options.fontSize=16] Size of the font used for the created intersection points
     * @param {boolean} [options.hiddenName] true to get the intersection points name hidden
     * @returns {Promise<undefined>|Array<CPointLieBipoint,CPointLieBipoint>} [point1, point2] where point1 and point2 are the intersection points if isPromiseMode is false or promise that will be resolved when the intersection points are displayed. If one of the intersection point exists, point1 is the new created point
     */
    addIntLineCircle: (...options) => {
      const listApi = app.listApi
      const {
        d,
        c,
        smartIntersect,
        pointStyle,
        color,
        hidden,
        name,
        name2,
        fontSize,
        hiddenName,
        tag,
        tag2
      } = getDefault(listApi, options, ['d', 'c'], ['name', 'name2', 'color', 'pointStyle'])
      if (smartIntersect) {
        const intersectionInutile = new Pointeur(false)
        const pointDejaCree = listApi.pointIntersectionDejaCree(app.estExercice, d, c, intersectionInutile)
        if (intersectionInutile.getValue()) throw TypeError(avertIntExisteDeja)
        if (pointDejaCree) {
          const intpoint = new CAutrePointIntersectionDroiteCercle(listApi, null, false, color, hiddenName, 0, 3, hidden,
            name, fontSize, pointStyle, false, c, d, pointDejaCree)
          // On retourne en premier le nouveau point
          return formatReturn(listApi, app.svgApi, [intpoint, pointDejaCree], [intpoint])
        }
      }
      const dimf = listApi.getDimf()
      const inter = new CIntDroiteCercle(listApi, null, false, d, c)
      inter.positionne(false, dimf)
      listApi.add(inter)
      const ptpl1 = new CPointLieBipoint(listApi, null, false, color, hiddenName, 0, 3, hidden, name, fontSize, pointStyle, false, inter, 1)
      if (tag) ptpl1.tag = tag
      const ptpl2 = new CPointLieBipoint(listApi, null, false, color, hiddenName, 0, 3, hidden, name2, fontSize, pointStyle, false, inter, 2)
      if (tag2) ptpl2.tag = tag2
      return formatReturn(listApi, app.svgApi, [ptpl1, ptpl2])
    },

    /**
     * Adds the intersection between two circles without re-creating an intersection point already created
     * syntaxes `addIntCircleCircle(c, c2)`, `addIntCircleCircle(c, c2, name)`, `addIntCircleCircle(c, c2, name, name2)`, `addIntCircleCircle(c, c2, name, name2, color)` and `addIntCircleCircle(c, c2, name, name2, color, pointStyle)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.c Tag of the first intersection circle (or circle arc)
     * @param {string} options.c2 Tag of the second intersection circle (or circle arc)
     * @param {boolean} [options.smartIntersect=true] Set to false to re-create points seen as already existing in circle intersection (with circle or line)
     * @param {string} [options.pointStyle=round] Point style (square|round|cross|mult|littleround|diamond|pixel|biground|bigmult)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the intersection points masked
     * @param {string} [options.name] Name of the first intersection point created
     * @param {string} [options.name2] Name of the second intersection point created (if not already present in the figure)
     * @param {number} [options.fontSize=16] Size of the font used for the created intersection points
     * @param {boolean} [options.hiddenName] true to get the intersection points name hidden
     * @returns {Promise<undefined>|Array<CPointLieBipoint,CPointLieBipoint>} [point1, point2] where point1 and point2 are the intersection points if isPromiseMode is false or promise that will be resolved when the intersection points are displayed. If one of the intersection point exists, point1 is the new created point
     */
    addIntCircleCircle: (...options) => {
      const listApi = app.listApi
      const {
        c,
        c2,
        smartIntersect,
        pointStyle,
        color,
        hidden,
        name,
        name2,
        fontSize,
        hiddenName,
        tag,
        tag2
      } = getDefault(listApi, options, ['c', 'c2'], ['name', 'name2', 'color', 'pointStyle'])
      if (smartIntersect) {
        const intersectionInutile = new Pointeur(false)
        const pointDejaCree = listApi.pointIntersectionDejaCree(app.estExercice, c, c2, intersectionInutile)
        if (intersectionInutile.getValue()) {
          throw TypeError(avertIntExisteDeja)
        }
        if (pointDejaCree) {
          const intpoint = new CAutrePointIntersectionCercles(listApi, null, false, color, hiddenName, 0, 3, hidden,
            name, fontSize, pointStyle, false, c, c2, pointDejaCree)
          if (tag) intpoint.tag = tag
          return formatReturn(listApi, app.svgApi, [intpoint, pointDejaCree], [intpoint])
        }
      }
      const dimf = listApi.getDimf()
      const inter = new CIntCercleCercle(listApi, null, false, c, c2)
      inter.positionne(false, dimf)
      listApi.add(inter)
      const ptpl1 = new CPointLieBipoint(listApi, null, false, color, hiddenName, 0, 3, hidden, name, fontSize, pointStyle, false, inter, 1)
      if (tag) ptpl1.tag = tag
      const ptpl2 = new CPointLieBipoint(listApi, null, false, color, hiddenName, 0, 3, hidden, name2, fontSize, pointStyle, false, inter, 2)
      if (tag2) ptpl2.tag = tag2
      return formatReturn(listApi, app.svgApi, [ptpl1, ptpl2])
    },

    getPointByName: (name) => {
      if (typeof name !== 'string') throw Error(avertPointByName)
      const a = app.listApi.getPointByName(name)
      if (a === null) throw Error(avertPointByName)
      return a
    },

    /* Pour la génération de dist/types.d.ts (avec tsd-jsdoc) on a essayé de faire
     * deux blocs de jsdoc, un avec la surcharge
     *
     * @function getPointPosition
     * @name getPointPosition
     * @memberOf MtgApi
     * @overload
     * @param {CPt|string} a
     * @param {string} [rep]
     * @returns {Point}
     *
     * et l'autre avec la syntaxe objet, mais ça donne pas le résultat escompté
     * (on se retrouve avec la signature overload en double dans MtgApi et
     * celle objet dans MtgAppApi et MtgAppLecteurApi)
     *
     * => on opte pour une syntaxe unique avec du "ou", c'est moins bien car on ne voit pas
     *  que le 2e param en string n'est pris en compte que si le 1er n'est pas un objet,
     *  mais ça va arrêter de râler sur l'usage de la syntaxe alternative
     */
    /**
     * @typedef ApiGetPointPositionParams
     * @type {Object}
     * @property {string} a
     * @property {string} [rep] tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     */
    /**
     * returns (sync) the coordinates of point a in the frame rep (system of coordinates) if provided, otherwise in the svg coordinate system
     * @memberOf MtgApi
     * @param {string|ApiGetPointPositionParams} params allParams or the point
     * @param {string} [rep] Same as params.rep when first parameter is a string. This second parameter is ignored if the first one is a params object.
     * @returns {Point}
     */
    getPointPosition: (...args) => {
      const { a, rep } = getDefault(app.listApi, args, ['a'], ['rep'], { useRepOrSVG: true })
      let { x, y } = a
      if (rep) [x, y] = rep.getCoord(x, y)
      return { x, y }
    },

    /**
     * Adds an angle mark
     * syntaxes `addAngleMark(o, a, b, r)`, `addAngleMark(o, a, b, r, color)`, `addAngleMark(o, a, b, r, color, angleMarkStyle)` and `addAngleMark(o, a, b, r, color, angleMarkStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o o point of arc oab (name or tag if name is empty)
     * @param {CPt|string} options.a a point of arc oab (name or tag if name is empty)
     * @param {CPt|string} options.b b point of arc oab (name or tag if name is empty)
     * @param {number} options.r arc radius in pixels
     * @param {string} [options.color] Color, black by default
     * @param {string} [options.angleMarkStyle=full] Angle mark style (simple|simple-|simple--|simple---|simplex|full|full-|full--|full---|fullx)
     * @param {number} [options.thickness=1] Thickness of the stroke
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the angle mark masked
     * @param {string} [options.tag] Tag to be applied on the angle mark (if present)
     * @returns {Promise<undefined>}
     */
    addAngleMark: (...options) => {
      const listApi = app.listApi
      const {
        o,
        a,
        b,
        r,
        color,
        angleMarkStyle,
        lineStyle,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['o', 'a', 'b', 'r'], ['color', 'angleMarkStyle', 'thickness'])
      const mark = new CMarqueAngleGeometrique(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), angleMarkStyle, r, a, o, b)
      if (options.tag) mark.tag = tag
      return formatReturn(listApi, app.svgApi, mark)
    },

    /**
     * Add a segment mark
     * syntaxes `addSegmentMark(elt, color)`, `addSegmentMark(elt, color, segmentMarkStyle)` and `addSegmentMark(elt, color, segmentMarkStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt The tag of the segment the mark will be applied on
     * @param {string} [options.color] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {string} [options.segmentMarkStyle] Angle mark style (-|--|---|x)
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.thickness=1] thickness of the stroke
     * @param {boolean} [options.hidden] true to get the mark masked
     * @param {string} [options.tag] Tag to be applied on the mark (if present)
     * @returns {Promise<undefined>} The created point if isPromiseMode is false else promise that will be resolved when the mark is displayed
     */
    addSegmentMark: (...options) => {
      const listApi = app.listApi
      const {
        elt,
        color,
        segmentMarkStyle,
        lineStyle,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, options, ['elt'], ['color', 'segmentMarkStyle', 'thickness'])
      if (elt === null || !elt.estDeNature(NatObj.NSegment)) throw Error('tag incorrect dans AddSegmentMark')
      const mark = new CMarqueSegment(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), segmentMarkStyle, elt)
      if (tag) mark.tag = tag
      return formatReturn(listApi, app.svgApi, mark)
    },

    /**
     * Adds the x-coordinate measure of point a in frame rep (system of coordinates)
     * syntax `addXMeasure(a, nameCalc, rep)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Name (or tag if name is empty) of the point the x-coordinate is wanted from
     * @param {string} options.rep tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     * @param {string} options.nameCalc Name of the created calculation (the x-coordinate measure))
     * @returns {CMesureX} the created measure
     */
    addXMeasure: (...options) => {
      const listApi = app.listApi
      // Pour cet outil, on autorise de ne pas donner de paramètre rep
      // Dans le cas où rep est absent, si la figure contient un repère de tag rep, il est affecté à rep
      // et sinon on lance une erreur
      const { a, rep, nameCalc } = getDefault(listApi, options, ['a', 'nameCalc', 'rep'], [], { useRep: true })
      if (!listApi.validationNomVariableOuCalcul(nameCalc)) throw Error(avertErreurNomCalc + nameCalc)
      if (!listApi.validationNomCalculSansMessage(nameCalc)) throw Error(avertCalcExist + nameCalc)
      const mesabs = new CMesureX(listApi, null, false, nameCalc, rep, a)
      addObjectCalc(listApi, mesabs)
      mesabs.positionne(false)
      return mesabs
    },

    /**
     * Adds the y-coordinate measure of point a in frame rep (system of coordinates)
     * syntaxes `addYMeasure(a, nameCalc) and addYMeasure(a, nameCalc, rep)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Name (or tag if name is empty) of the point  the y-coordinate is wanted from
     * @param {string} options.nameCalc Name of the created calculation (the y-coordinate measure))
     * @param {string} [options.rep] tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     * @returns {CMesureY} the created measure
     */
    addYMeasure: (...options) => {
      const listApi = app.listApi

      // Pour cet outil, on autorise de ne pas donner de paramètre rep
      // Dans le cas où rep est absent, si la figure contient un repère de tag rep, il est affecté à rep
      // et sinon on lance une erreur
      const { a, rep, nameCalc } = getDefault(listApi, options, ['a', 'nameCalc', 'rep'], [], { useRep: true })
      if (!listApi.validationNomVariableOuCalcul(nameCalc)) throw Error(avertErreurNomCalc + nameCalc)
      if (!listApi.validationNomCalculSansMessage(nameCalc)) throw Error(avertCalcExist + nameCalc)
      const mesord = new CMesureY(listApi, null, false, nameCalc, rep, a)
      addObjectCalc(listApi, mesord)
      mesord.positionne(false)
      return mesord
    },

    /**
     * Adds the affix measure of point a in frame rep (system of coordinates)
     * syntaxes `addZMeasure(a, nameCalc, rep)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Name (or tag if name is empty) of the point the affix is wanted from
     * @param {string} options.nameCalc Name of the created calculation (the affix measure))
     * @param {string} options.rep tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     * @returns {CMesureAffixe} the created measure
     */
    addZMeasure: (...options) => {
      const listApi = app.listApi
      // Pour cet outil, on autorise de ne pas donner de paramètre rep
      // Dans le cas où rep est absent, si la figure contient un repère de tag rep, il est affecté à rep
      // et sinon on lance une erreur
      const { a, rep, nameCalc } = getDefault(listApi, options, ['a', 'nameCalc', 'rep'], [], { useRep: true })
      if (!listApi.validationNomVariableOuCalcul(nameCalc)) throw Error(avertErreurNomCalc + nameCalc)
      if (!listApi.validationNomCalculSansMessage(nameCalc)) throw Error(avertCalcExist + nameCalc)
      const mesaff = new CMesureAffixe(listApi, null, false, rep, a, nameCalc)
      addObjectCalc(listApi, mesaff)
      mesaff.positionne(false)
      return mesaff
    },

    /**
     * Adds the measure of length measure ab (distance between two points a and  b)
     * For this, the figure must have a unity length
     * syntax `addLengthMeasure(a, b)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a point a (or point name) (Measure of length ab)
     * @param {CPt|string} options.b point b (or point name) (measure of length ab)
     * @returns {CLongueur} the created measure
     */
    addLengthMeasure: (...options) => {
      const listApi = app.listApi
      const { a, b } = getDefault(listApi, options, ['a', 'b'])
      if ((a.nom === '') || (b.nom === '')) throw Error('For a length measure, the two points must have a name')
      if (listApi.pointeurLongueurUnite === null) throw Error(avertNoUnity)
      const mes = new CLongueur(listApi, null, false, a, b)
      mes.positionne()
      addObjectCalc(listApi, mes)
      return mes
    },

    /**
     * Adds the abscissa measure of point b in (o, a) (the three points must be aligned)
     * syntax `addAbsMeasure(b, o, a, nameCalc)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.b point b the abscissa is wanted from
     * @param {CPt|string} options.o origin (abscissa of b in (O, a))
     * @param {CPt|string} options.a extremity (abscissa of b in (O, a))
     * @param {string} options.nameCalc Name of the created calculation (the x-coordinate measure))
     * @returns {CMesureAbscisse} the created measure
     */
    addAbsMeasure: (...options) => {
      const listApi = app.listApi
      const { b, o, a, nameCalc } = getDefault(listApi, options, ['b', 'o', 'a', 'nameCalc'])
      if ((b.nom === '') || (o.nom === '') || (a.nom === '')) throw Error('For an abscisse measure, the three points must have a name')
      const mes = new CMesureAbscisse(listApi, null, false, o, a, b, nameCalc)
      mes.positionne()
      addObjectCalc(listApi, mes)
      return mes
    },

    /**
     * Adds a unity length to the figure (throws an error if a unity length is already present in the figure)
     * Once a unity length is present in the figure, you can create length measures, circles by radius
     * syntax `setUnity(a, b)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Name (or tag if name is empty) of point a (first extremity of the unity length)
     * @param {CPt|string} options.b Name (or tag if name is empty) of point b (second extremity of the unity length)
     */
    setUnity: (...options) => {
      const listApi = app.listApi
      const { a, b } = getDefault(listApi, options, ['a', 'b'])
      if (listApi.pointeurLongueurUnite !== null) throw Error(avertUnity)
      const mes = new CLongueur(listApi, null, false, a, b)
      addObjectCalc(app.listApi, mes)
      listApi.pointeurLongueurUnite = mes
      mes.positionne()
    },

    /**
     * Adds a real calculation of name nameCalc from formula contained in string formula
     * syntax `addCalc(nameCalc, fandmula)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.nameCalc Name of the real calculation to be created
     * @param {string} options.formula Formula of the calculation to be created
     * @returns {CCalcul} the created measure
     */
    addCalc: (...options) => {
      const listApi = app.listApi
      const { nameCalc, formula } = getDefault(listApi, options, ['nameCalc', 'formula'])
      if (!listApi.validationNomVariableOuCalcul(nameCalc)) throw Error(avertErreurNomCalc + nameCalc)
      if (!listApi.validationNomCalculSansMessage(nameCalc)) throw Error(avertCalcExist + nameCalc)
      if (!listApi.verifieSyntaxe(formula)) throw Error(avertErreurFormula + formula)
      const calc = new CCalcul(listApi, null, false, nameCalc, formula)
      addObjectCalc(listApi, calc)
      calc.positionne(true)
      return calc
    },

    /**
     * Adds a complex calculation of name nameCalc from formula contained in string formula
     * syntax `addCalcComp(nameCalc, formula)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.nameCalc Name of the complex calculation to be created
     * @param {string} options.formula Formula of the complex calculation to be created
     * @returns {CCalculComplexe} the created measure
     */
    addCalcComp: (...options) => {
      const listApi = app.listApi
      const { nameCalc, formula } = getDefault(listApi, options, ['nameCalc', 'formula'])
      if (!listApi.validationNomVariableOuCalcul(nameCalc)) throw Error(avertErreurNomCalc + nameCalc)
      if (!listApi.validationNomCalculSansMessage(nameCalc)) throw Error(avertCalcExist + nameCalc)
      if (!listApi.verifieSyntaxeComplexe(formula)) throw Error(avertErreurFormula + formula)
      const calc = new CCalculComplexe(listApi, null, false, nameCalc, formula)
      addObjectCalc(listApi, calc)
      calc.positionne(true)
      return calc
    },

    /**
     * Adds a matricial calculation of name nameCalc from formula contained in string formula
     * syntax `addCalcMat(nameCalc, formula)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.nameCalc Name of the matricial calculation to be created
     * @param {string} options.formula Formula of the matricial calculation to be created
     * @returns {CCalcul} the created measure
     */
    addCalcMat: (...options) => {
      const listApi = app.listApi
      const { nameCalc, formula } = getDefault(listApi, options, ['nameCalc', 'formula'])
      if (!listApi.validationNomVariableOuCalcul(nameCalc)) throw Error(avertErreurNomCalc + nameCalc)
      if (!listApi.validationNomCalculSansMessage(nameCalc)) throw Error(avertCalcExist + nameCalc)
      if (!listApi.verifieSyntaxeMat(formula)) throw Error(avertErreurFormula + formula)
      const calc = new CCalcMat(listApi, null, false, nameCalc, formula)
      addObjectCalc(listApi, calc)
      calc.positionne(true)
      return calc
    },

    /**
     * adds a variable of name nameCalc
     * syntaxes `addVariable(nameCalc, val, min, max, step)` and `addVariable(nameCalc, val, min, max, step, dialog) are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.nameCalc Name of the variable to be created
     * @param {number} options.val current value of the variable
     * @param {number} options.min mini value of the variable
     * @param {number} options.max maxi value of the variable
     * @param {number} options.step step value of the variable
     * @param {boolean} [options.dialog] true to associate to the variable a pane with buttons +, - and =
     * @returns {CVariableBornee}
     */
    addVariable: (...options) => {
      const listApi = app.listApi
      const { nameCalc, val, min, max, step, dialog } = getDefault(listApi, options, ['nameCalc', 'val', 'min', 'max', 'step'], ['dialog'])
      const tab = [val, min, max, step]
      for (let i = 0; i < tab.length; i++) {
        if (typeof tab[i] !== 'number') throw Error(avertVariable + ': val, min, max and step values must be constant values')
      }
      if ((min >= max) || (step > max - min) || (step <= 0) || (val < min) || (val > max)) throw Error(avertVariable + ': incorrect values')
      const va = new CVariableBornee(listApi, null, false, nameCalc, val, min, max, step, String(min), String(max), String(step), dialog)
      addObjectCalc(listApi, va)
      va.positionne(true)
      if (dialog) {
        listApi.removePaneVariables()
        listApi.creePaneVariables()
      }
      return va
    },

    /**
     * Adds a real fonction of variable x named nameCalc from formula contained in string formula
     * syntaxes `addFunc(nameCalc, formula)` or `addFunc(nameCalc, formula, varName)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.nameCalc Name of the function to be created
     * @param {string} options.formula Formula of the function to be created (with x as variable)
     * @param {string} options.varName Formal variable name used in the formula of the function. 'x' by default.
     * @returns {CCalcul} the created measure
     */
    addFunc: (...options) => {
      const listApi = app.listApi
      let { nameCalc, formula, varName } = getDefault(listApi, options, ['nameCalc', 'formula'], ['varName'])
      if (!listApi.validationNomVariableOuCalcul(nameCalc)) throw Error(avertErreurNomCalc + nameCalc)
      if (!listApi.validationNomCalculSansMessage(nameCalc)) throw Error(avertCalcExist + nameCalc)
      if (varName && (typeof varName !== 'string')) throw Error(avertVarName)
      if (!varName) varName = 'x'
      if (!listApi.verifieSyntaxe(formula, varName)) throw Error(avertErreurFormula + formula)
      const fonc = new CFonc(listApi, null, false, nameCalc, formula, varName, null)
      addObjectCalc(listApi, fonc)
      fonc.positionne(true)
      return fonc
    },

    /**
     * Adds a real fonction of variable z named nameCalc from formula contained in string formula
     * syntaxes `addFuncComp(nameCalc, fandmula)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.nameCalc Name of the complex function to be created
     * @param {string} options.formula Formula of the calculation to be created (with z as variable)
     * @param {string} options.varName Formal variable name used in the formula of the function. 'z' by default.
     * @returns {CCalcul} the created measure
     */
    addFuncComp: (...options) => {
      const listApi = app.listApi
      let { nameCalc, formula, varName } = getDefault(listApi, options, ['nameCalc', 'formula'], ['varName'])
      if (!listApi.validationNomVariableOuCalcul(nameCalc)) throw Error(avertErreurNomCalc + nameCalc)
      if (!listApi.validationNomCalculSansMessage(nameCalc)) throw Error(avertCalcExist + nameCalc)
      if (varName && (typeof varName !== 'string')) throw Error(avertVarName)
      if (!varName) varName = 'z'
      if (!listApi.verifieSyntaxeComplexe(formula, varName)) throw Error(avertErreurFormula + formula)
      const fonc = new CFoncComplexe(listApi, null, false, nameCalc, formula, varName, null)
      addObjectCalc(listApi, fonc)
      fonc.positionne(true)
      return fonc
    },

    /**
     * Adds the derivative function of function calc (function name or function)
     * syntax `addDerivative(calc, nameCalc)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.nameCalc Name of the derivative function to be created
     * @param {string} options.calc Name of the function to be derivated
     * @returns {CCalcul} the created measure
     */
    addDerivative: (...options) => {
      const listApi = app.listApi
      const { calc, nameCalc } = getDefault(listApi, options, ['calc', 'nameCalc'], [], { noDer: true })
      if (!listApi.validationNomVariableOuCalcul(nameCalc)) throw Error(avertErreurNomCalc + nameCalc)
      if (!listApi.validationNomCalculSansMessage(nameCalc)) throw Error(avertCalcExist + nameCalc)
      const der = new CDerivee(listApi, null, false, nameCalc, calc)
      addObjectCalc(listApi, der)
      der.positionne(true)
      return der
    },

    /**
     * Adds a existence test of a MathGraph32 dynamic real value x. This object will return 1 if x exists and 0 otherwise
     * syntax `addTest(x, nameCalc)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CValDyn|string} options.x The numerical object existence of is to tested
     * @param {string} options.nameCalc Name of the existence test to be created
     * @returns {CTestExistence} the created measure
     */
    addTest: (...options) => {
      const listApi = app.listApi
      const { x, nameCalc } = getDefault(listApi, options, ['x', 'nameCalc'])
      if (typeof x === 'number') throw Error('addTest' + avertTest)
      const test = new CTestExistence(listApi, null, false, nameCalc, x)
      addObjectCalc(listApi, test)
      test.positionne(true)
      return test
    },

    /**
     * Adds a existence test of a MathGraph32 dynamic complex value z. This object will return 1 if x exists and 0 otherwise
     * syntax `addTest(z, nameCalc)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CValDyn|string} options.z The numerical complex object existence of is to tested
     * @param {string} options.nameCalc Name of the existence test to be created
     * @returns {CTestExistence} the created measure
     */
    addTestComp: (...options) => {
      const listApi = app.listApi
      const { z, nameCalc } = getDefault(listApi, options, ['z', 'nameCalc'])
      if (typeof z === 'number') throw Error('addTestComp' + avertTest)
      const test = new CTestExistence(listApi, null, false, nameCalc, z)
      addObjectCalc(listApi, test)
      test.positionne(true)
      return test
    },

    /**
     * adds a real matrix of name calc
     * syntax `addMatrix(nameCalc, mat)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {Array<string[]|number[]|CElementBase[]>} options.mat array containing the lines of the matrix, each line beeing an array containing either a number, a dynamic real object
     * or a string containing a valid formula
     * @returns {CMatrice}
     */
    addMatrix: (...options) => {
      const listApi = app.listApi
      const { nameCalc, mat } = getDefault(listApi, options, ['nameCalc', 'mat'])
      const tab = []
      for (const line of mat) {
        const lig = []
        tab.push(lig)
        for (let elt of line) {
          if (typeof elt === 'string') {
            elt = getCalcFromString(listApi, elt)
          } else {
            if (typeof elt !== 'number') { // x est un calcul ou une mesure qui a été créé
              elt = new CResultatValeur(listApi, elt)
            }
          }
          lig.push(new CValeur(listApi, elt))
        }
      }
      const matrix = new CMatrice(listApi, null, false, nameCalc, tab.length, tab[0].length, tab)
      addObjectCalc(listApi, matrix)
      matrix.positionne(true)
      return matrix
    },

    /**
     * Returns the image of number x through function calc
     * syntax `getFuncImage(calc, x)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.x Value the image of is to be returned (lust be a number)
     * @param {string} options.calc Name of the function used to calculate the iamge of x
     * @returns {number} the iage of x through function calc
     */
    getFuncImage: (...options) => {
      const listApi = app.listApi
      const { calc, x } = getDefault(listApi, options, ['calc', 'x'], [], { noDer: false })
      if (!calc.estDeNatureCalcul(Nat.or(NatCal.NFonction, NatCal.NDerivee))) throw Error('Argument calc of getFuncValue must be a real function')
      if (typeof x !== 'number') throw Error('Argument x of getFuncValue must be a number')
      const appelFonc = new CAppelFonction(listApi, calc, new CConstante(listApi, x))
      return appelFonc.resultat()
    },

    /**
     * Adds a polygon vertexes of which are given in the array points (array of the vertexes points names)
     * syntaxes `addPolygon(points)`, `addPolygon(points, color)`, `addPolygon(points, color, lineStyle)` and `addPolygon(points, color, lineStyle, thickness)` are allowed too, where points is an array of points or name of points
     * @memberOf MtgApi
     * @param {Object} options
     * @param {string[]} options.points array of the vertexes points names of the polygon
     * @param {string} [options.color=black] Color, black by default
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {number} [options.thickness=1] Stroke thickness
     * @returns {Promise<undefined>|CPolygone} the created polygon if isPromiseMode is false else promise that will be resolved when the object is displayed
     */
    addPolygon: (...options) => {
      const listApi = app.listApi
      // attention, ici la propriété points est un array, faut trier avant l'appel de getDefault
      let opts = options
      let param
      if (opts.length === 1) {
        opts = opts[0]
      }
      if (opts.length) {
        if (Array.isArray(opts) && (opts.length === 1) && !Array.isArray(opts[0])) {
          // un array avec un objet en 1er argument
          param = opts[0]
        } else {
          param = { points: opts[0] }
          if (opts.length > 1) param.color = opts[1]
          if (opts.length > 2) param.lineStyle = opts[2]
          if (opts.length > 3) param.thickness = opts[3]
        }
      } else {
        // on a un objet passé en JavaScript
        param = opts
      }
      const {
        points,
        lineStyle,
        color,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, param, ['points'], ['color', 'lineStyle', 'thickness'])
      const ar = []
      for (const pt of points) {
        ar.push(new CNoeudPointeurSurPoint(listApi, pt))
      }
      ar.push(ar[0])
      const poly = new CPolygone(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), ar)
      if (tag) poly.tag = tag
      return formatReturn(listApi, app.svgApi, poly)
    },

    /**
     * Adds a broken line vertexes of which are given in the array points (array of the vertexes points names)
     * syntaxes `addBrokenLine(points)`, `addBrokenLine(points, color)`, `addBrokenLine(points, color, lineStyle)` and `addBrokenLine(points, color, lineStyle, thickness)` are allowed too, where points is an array of points or name of points
     * @memberOf MtgApi
     * @param {Object} options
     * @param {string[]} options.points array of the vertexes points names of the polygon
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {number} [options.thickness=1] Stroke thickness
     * @param {boolean} [options.hidden=false] true to get the polygon masked
     * @param {string} [options.tag] Tag to be applied on the created broken line (if present)
     * @returns {Promise<undefined>|CLigneBrisee} the created polygon if isPromiseMode is false else promise that will be resolved when the object is displayed
     */
    addBrokenLine: (...options) => {
      const listApi = app.listApi
      // attention, ici la propriété point est un array, faut trier avant l'appel de getDefault
      let opts = options
      let param
      if (opts.length === 1) opts = opts[0]
      if (opts.length) {
        if (Array.isArray(opts) && (opts.length === 1) && !Array.isArray(opts[0])) {
          param = opts[0]
        } else {
          param = { points: opts[0] }
          if (opts.length > 1) param.color = opts[1]
          if (opts.length > 2) param.lineStyle = opts[2]
          if (opts.length > 3) param.thickness = opts[3]
        }
      } else {
        // on a un objet passé en JavaScript
        param = opts
      }
      const {
        points,
        lineStyle,
        color,
        thickness,
        hidden,
        tag
      } = getDefault(listApi, param, ['points'], ['color', 'lineStyle', 'thickness'])
      const ar = []
      for (const pt of points) {
        ar.push(new CNoeudPointeurSurPoint(listApi, pt))
      }
      const ligne = new CLigneBrisee(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), ar)
      if (tag) ligne.tag = tag
      return formatReturn(listApi, app.svgApi, ligne)
    },

    /**
     * Adds a surface delimited by a circle or a circle arc (slice of pie)
     * syntaxes `addSurfaceCircle(c)`, `addSurfaceCircle(c, color)`, `addSurfaceCircle(c, color, fillStyle)` and `addSurfaceCircle(c, color, fillStyle, opacity)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.c Tag of the circle (or the circle arc)
     * @param {string} [options.color=black] Color, black by default
     * @param {string} [options.fillStyle=transp] Filling style (transp|fill|-|vert|hor|/|\)
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden=false] true to get the created surface masked
     * @param {string} [options.tag] The tag to be applied on the created surface
     * @returns {Promise<undefined>|CSurfaceDisque|CSurfaceSecteurCirculaire} the created surface if isPromiseMode is false else promise that will be resolved when the object is displayed
     */
    addSurfaceCircle: (...options) => {
      const listApi = app.listApi
      const {
        c,
        fillStyle,
        color,
        hidden,
        tag
      } = getDefault(listApi, options, ['c'], ['color', 'fillStyle', 'opacity'])
      // Si on a demandé un remplissage transparent et pas spécifié d'opacité, getDefault a renvoyé une
      // couleur avec une opacité de 1. Il faut corriger avec l'opacité par défaut.
      if ((fillStyle === StyleRemplissage.transp) && (color.opacity === 1)) {
        color.opacity = defaultSurfOpacity
      }
      let surf
      if (c.estDeNature(NatObj.NCercle)) {
        surf = new CSurfaceDisque(listApi, null, false, color, hidden, fillStyle, c)
      } else {
        surf = new CSurfaceSecteurCirculaire(listApi, null, false, color, hidden, fillStyle, c)
      }
      if (tag) surf.tag = tag
      return formatReturn(listApi, app.svgApi, surf)
    },

    /**
     * Adds a surface delimited by a polygon
     * syntaxes `addSurfacePoly(poly)`, `addSurfacePoly(poly, color)`, `addSurfacePoly(poly, color, fillStyle)` and `addSurfacePoly(poly, color, fillStyle, opacity)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.poly Tag of the polygon
     * @param {string} [options.color=black] Color, black by default
     * @param {string} [options.fillStyle=transp] Filling style (transp|fill|-|vert|hor|/|\)
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden=false] true to get the created surface masked
     * @param {string} [options.tag] The tag to be applied on the created surface
     * @returns {Promise<undefined>|CSurfacePolygone} the created surface if isPromiseMode is false else promise that will be resolved when the object is displayed
     */
    addSurfacePoly: (...options) => {
      const listApi = app.listApi
      const {
        poly,
        fillStyle,
        color,
        hidden,
        tag
      } = getDefault(listApi, options, ['poly'], ['color', 'fillStyle', 'opacity'])
      // Si on a demandé un remplissage transparent et pas spécifié d'opacité, getDefault a renvoyé une
      // couleur avec une opacité de 1. Il faut corriger avec l'opacité par défaut.
      if ((fillStyle === StyleRemplissage.transp) && (color.opacity === 1)) {
        color.opacity = defaultSurfOpacity
      }
      const surf = new CSurfacePolygone(listApi, null, false, color, hidden, fillStyle, poly)
      if (tag) surf.tag = tag
      return formatReturn(listApi, app.svgApi, surf)
    },

    /**
     * Adds a surface delimited by a polygon, a circle or an arc of circle
     * syntaxes `addSurface(edge)`, `addSurface(edge, color)`, `addSurface(edge, color, fillStyle)` and `addSurface(edge, color, fillStyle, opacity)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.edge Tag or object (polygon, circle or circle arc or point locus)
     * @param {string} [options.fillStyle=transp] Filling style (transp|fill|-|vert|hor|/|\)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden=false] true to get the created surface masked
     * @param {string} [options.tag] The tag to be applied on the created surface
     * @returns {Promise<undefined>|CSurfacePolygone} the created surface if isPromiseMode is false else promise that will be resolved when the object is displayed
     */
    addSurface: (...options) => {
      const listApi = app.listApi
      const {
        edge,
        fillStyle,
        color,
        hidden,
        tag
      } = getDefault(listApi, options, ['edge'], ['color', 'fillStyle', 'opacity'])
      let Cl
      if (edge.estDeNature(NatObj.NPolygone)) {
        Cl = CSurfacePolygone
      } else if (edge.estDeNature(NatObj.NCercle)) {
        Cl = CSurfaceDisque
      } else if (edge.estDeNature(NatObj.NLieu)) {
        Cl = CSurfaceLieu
      } else {
        // On laisse la suite planter si NatObj n'est pas ok
        Cl = CSurfaceSecteurCirculaire
      }
      // Si on a demandé un remplissage transparent et pas spécifié d'opacité, getDefault a renvoyé une
      // couleur avec une opacité de 1. Il faut corriger avec l'opacité par défaut.
      if ((fillStyle === StyleRemplissage.transp) && (color.opacity === 1)) {
        color.opacity = defaultSurfOpacity
      }
      const surf = new Cl(listApi, null, false, color, hidden, fillStyle, edge)
      if (tag) surf.tag = tag
      return formatReturn(listApi, app.svgApi, surf)
    },

    /**
     * Adds the duplicated object of object elt
     * syntax `addDuplicatedObject(elt)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt Tag of the object to be duplicated
     * @param {boolean} [options.hidden] true to get the duplicated object masked
     * @returns {Promise<undefined>|CObjetDuplique} the created object if isPromiseMode is false else promise that will be resolved when the duplicated object is displayed
     */
    addDuplicatedObject: (...options) => {
      const listApi = app.listApi
      const { elt, hidden, tag } = getDefault(listApi, options, ['elt'])
      if (!elt.estDeNature(NatObj.NTtObjPourDup)) throw Error('Object type incorrect for a duplicate')
      const dup = new CObjetDuplique(listApi, null, false, hidden, elt)
      if (tag) dup.tag = tag
      return formatReturn(listApi, app.svgApi, dup)
    },

    /**
     * Adds a system of axis defined by points o, a and b (the origin will be o)
     * syntaxes `addSystemOfAxis(o, a, b)`, `addSystemOfAxis(o, a, b, color)`, `addSystemOfAxis(o, a, b, color, lineStyle)`, `addSystemOfAxis(o, a, b, color, lineStyle, verticalGrid)`, `addSystemOfAxis(o, a, b, color, lineStyle, verticalGrid, horizontalGrid)`, `addSystemOfAxis(o, a, b, , color, lineStyle, verticalGrid, handizontalGrid, hidden)`,  are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.o Name (or tag if name is empty) of the point origin of the system of axis
     * @param {CPt|string} options.a Name (or tag if name is empty) of the point of coordinates (1; 0) in the system of axis
     * @param {CPt|string} options.b Name (or tag if name is empty) of the point of coordinates (0; 1) in the system of axis
     * @param {number} [options.thickness] Thickness of the stroke
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the system of axis masked
     * @param {string} [options.tag] Tag to be associated to the object created
     * @returns {Promise<undefined>|CRepere} the created object if isPromiseMode is false else promise that will be resolved when the duplicated object is displayed
     */
    addSystemOfAxis: (...options) => {
      const listApi = app.listApi
      const {
        o,
        a,
        b,
        color,
        lineStyle,
        thickness,
        verticalGrid,
        horizontalGrid,
        dottedGrid,
        hidden,
        tag
      } = getDefault(listApi, options, ['o', 'a', 'b'], ['verticalGrid', 'horizontalGrid', 'hidden'], { defaultColor: '#e6e6e6' })
      const rep = new CRepere(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), o, a, b, new CValeur(listApi, 0), new CValeur(listApi, 0), verticalGrid, horizontalGrid, dottedGrid, new CValeur(listApi, 1), new CValeur(listApi, 1))
      if (tag) rep.tag = tag
      return formatReturn(listApi, app.svgApi, rep)
    },

    /**
     * Adds the point locus of point a generated by the positions of linked point b
     * syntaxes `addPointLocus(a, b, x)`, `addPointLocus(a, b, x, color)`, `addPointLocus(a, b, x, color, lineStyle)` and `addPointLocus(a, b, x, color, lineStyle, thickness)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Point (or point name) traces of which will generate the point locus
     * @param {CPt|string} options.b Linked point (or point name) positions of which will generate the point locus
     * @param {number} options.x number of the positions of point a generating the point locus
     * @param {number} [options.thickness] Thickness of the stroke
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the point locus masked
     * @param {boolean} [options.closed] true to set the point locus closed
     * @property {string} [tag] Tag to be associated to the object created
     * @returns {Promise<undefined>|CLieuDePoints} the created object locus if isPromiseMode is false else promise that will be resolved when the duplicated object is displayed
     */
    addPointLocus: (...options) => {
      const listApi = app.listApi
      const {
        a,
        b,
        x,
        color,
        lineStyle,
        thickness,
        hidden,
        closed,
        tag
      } = getDefault(listApi, options, ['a', 'b', 'x'], ['color', 'lineStyle', 'thickness'])
      if (!b.estDeNature(NatObj.NPointLie)) throw Error(avertPtLocus + ' : parameter  ' + b.nom + ' is not a linked point')
      if (!a.depDe(b)) throw Error(avertPtLocus + ' : parameter a ' + a.nom + ' does not depend on point ' + b.nom)
      if (typeof x !== 'number') throw Error(avertPtLocusx)
      else {
        if (x < 4) throw Error(avertPtLocusx)
      }
      const loc = new CLieuDePoints(listApi, null, false, color, hidden, new StyleTrait(listApi, lineStyle, thickness), a, new InfoLieu(x, closed, true), b)
      if (tag) loc.tag = tag
      loc.metAJour()
      return formatReturn(listApi, app.svgApi, loc)
    },

    /**
     * Adds the oject locus of elt generated by the positions of linked point a
     * syntaxes `addObjectLocus(elt, a, x)` and `addObjectLocus(elt, a, x, color)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CElementGraphique} options.elt the graphical element traces are generated from
     * @param {CPt|string} options.a linked point (or point name) positions of which will generate the point locus
     * @param {string} [options.color=black] Color, black by default
     * @returns {Promise<undefined>|CLieuObjetParPtLie}
     */
    addObjectLocus: (...options) => {
      const listApi = app.listApi
      let {
        elt,
        a,
        x,
        color,
        hidden,
        tag
      } = getDefault(listApi, options, ['elt', 'a', 'x'], ['color'])
      if (!a.estDeNature(NatObj.NPointLie)) throw Error(avertObLocus + ' : parameter a ' + a.nom + ' is not a linked point')
      if (!elt.depDe(a)) throw Error(avertObLocus + ' : parameter elt does not depend on the linked point a')
      if (typeof x === 'string') {
        x = getCalcFromString(listApi, x)
      } else {
        if (typeof x !== 'number') { // x est un calcul ou une mesure qui a été créé
          x = new CResultatValeur(listApi, x)
        }
      }
      const loc = new CLieuObjetParPtLie(listApi, null, false, color, hidden, elt, new CValeur(listApi, x), a)
      if (tag) loc.tag = tag
      loc.metAJour()
      return formatReturn(listApi, app.svgApi, loc)
    },

    /**
     * Adds the curve of a function in the system of axis frame
     * syntaxes `addCurve(calc, x)`, `addCurve(calc, x, color)`, `addCurve(calc, x, color, lineStyle)`, `addCurve(calc, x, color, lineStyle, thickness)` and `addCurve(calc, x, color, lineStyle, thickness, rep)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CFonc} options.calc name of the function of function curve is to be created of
     * @param {number} options.x number of points used to create the curve (point locus)
     * @param {number} [options.thickness] Thickness of the stroke
     * @param {string} [options.lineStyle=line] Line style (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     * @param {string} [options.color=black] Color, black by default
     * @param {number} [options.opacity] opacity (0 to 1), 1 by default
     * @param {boolean} [options.hidden] true to get the point locus masked
     * @param {boolean} [options.closed] true to set the point locus closed
     * @property {string} [tag] Tag to be associated to the object created     * @returns {*}
     */
    addCurve: (...options) => {
      const listApi = app.listApi
      const {
        calc,
        x,
        color,
        lineStyle,
        thickness,
        rep,
        tag
      } = getDefault(listApi, options, ['calc', 'x'], ['color', 'lineStyle', 'thickness', 'rep'], { useRep: true })
      if (!calc.estDeNatureCalcul(Nat.or(NatCal.NFonction, NatCal.NDerivee))) throw Error('Error in addCurve: argument must be a real function')
      if (typeof x !== 'number') throw Error(avertPtLocusx)
      else {
        if (x < 4) throw Error(avertPtLocusx)
      }
      const nomx = listApi.genereNomPourCalcul('x', true)
      const nomy = listApi.genereNomPourCalcul('y', true)
      const nompt = listApi.genereNomPourPointOuDroite('x', true)
      listApi.ajouteCourbeSurR(rep, calc, nompt, nomx, nomy, x, true, true, true,
        color, new StyleTrait(listApi, lineStyle, thickness), 15)
      // La courbe est le dernier objet créé (lieu de points)
      const loc = listApi.get(listApi.longueur() - 1)
      if (tag) loc.tag = tag
      loc.metAJour()
      return formatReturn(listApi, app.svgApi, loc)
    },

    /**
     * Event callback
     * @callback EventSvgCallback
     * @param {Event} event The trigger event
     * @param {number} [x] x-coordinate of the mouse pointer in the svg (not provided on touchend & touchcancel event)
     * @param {number} [y] y-coordinate of the mouse pointer in the svg (not provided on touchend & touchcancel event)
     */

    /**
     * Adds an event listener to a graphical object of the figure
     * The callBack function accepts three parameters (event, x, y) where x and y are the coordinates of the event relative to the svg containing the figure
     * syntax `addEltListener(elt, eventName, callBack)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt Tag of the graphical object the listener is to be added on
     * @param {string} options.eventName Name of the event to be listened to
     * @param {EventSvgCallback} options.callBack function to be launched when the event is triggered.
     */
    addEltListener: (...options) => {
      const listApi = app.listApi
      const svgApi = app.svgApi
      const { elt, eventName, callBack } = getDefault(listApi, options, ['elt', 'eventName', 'callBack'])
      addQueue(function () {
        const gel = elt.g
        if (gel) {
          gel.setAttribute('pointer-events', 'all')
          elt.pointerevents = 'all'
          // Si le svg element de l'objet est un g element contenant d'autres objets il faut aussi qu'ils réagissent
          // aux événements souris
          for (let i = 0; i < gel.childNodes.length; i++) {
            gel.childNodes[i].setAttribute('pointer-events', 'all')
          }
          if (!elt.cbmap) elt.cbmap = new Map()
          else {
            const oldcb = elt.cbmap.get(eventName)
            if (oldcb) {
              gel.removeEventListener(eventName, oldcb)
            }
          }
          const cb = function (ev) {
            let pos
            if (['touchend', 'touchcancel'].includes(eventName.toLowerCase())) {
              callBack((ev))
            } else {
              // inutile de tester isEditor, si this.zoomFactor est undefined les fonctions utiliseront leur valeur par défaut
              if (eventName.startsWith('touch')) {
                pos = touchPosition(svgApi, ev, this.zoomFactor)
              } else if (eventName.startsWith('mouse')) {
                pos = mousePosition(svgApi, ev, this.zoomFactor)
              } else {
                // on a le droit d'écouter autre chose (load/unload/whatever), mais faut pas planter, ce sera simplement undefined
                pos = {}
              }
              callBack(ev, pos.x, pos.y)
            }
          }
          elt.cbmap.set(eventName, cb)
          gel.addEventListener(eventName, cb)
        }
      })
    },

    /**
     * Removes an event listener from a graphical object of the figure
     * syntax `removeEltListener(elt, eventName)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt Tag of the graphical object the listener is to be removed from
     * @param {string} options.eventName Name of the event
     */
    removeEltListener: (...options) => {
      const listApi = app.listApi

      const { elt, eventName } = getDefault(listApi, options, ['elt', 'eventName'])
      if (!elt.cbmap) {
        throw Error(`Call of removeEltListener on element ${elt} that has no Listener`)
      }
      const callBack = elt.cbmap.get('eventName')
      elt.cbmap.delete(eventName)
      const gel = elt.g
      if (elt.cbmap.size === 0) {
        elt.pointerevents = 'none'
        gel.setAttribute('pointer-events', 'none')
        // Si le svg element de l'objet est un g element contenant d'autres objets il faut aussi qu'ils ne réagissent pas
        // aux événements souris
        for (let i = 0; i < gel.childNodes.length; i++) {
          gel.childNodes[i].setAttribute('pointer-events', 'none')
        }
      }
      try {
        gel.removeEventListener(eventName, callBack)
      } catch (e) {
        throw Error('Call of removeEventListener failed')
      }
    },

    /**
     * Adds a listener on the doc (svg) owning the figure
     * The callBack function accepts three parameters (event, x, y) where x and y are the coordinates of the event relative to the svg containing the figure
     * syntax `addSvgListener(eventName, callBack)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.eventName Name of the event the listener is to be created on
     * @param {EventSvgCallback} options.callBack Function to be launched when the event is triggered
     */
    addSvgListener: (...options) => {
      const listApi = app.listApi
      const { eventName, callBack } = getDefault(listApi, options, ['eventName', 'callBack'])
      // L'objet doc peut contenir un objet map formé d'entrées sont le premier élément est un nom d'événement souris
      // et le deuxième une fonction de callBack à appeler une fois exécuté le processus normal du player mtg32
      const doc = listApi.documentProprietaire
      if (!doc.cbmap) {
        doc.cbmap = new Map()
      }
      doc.cbmap.set(eventName, callBack)
    },

    /**
     * Removes a listener from the doc (svg) owning the figure
     * syntax `removeSvgListener(eventName)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.eventName Name of the event the listener is to be removed from
     */
    removeSvgListener: (...options) => {
      const listApi = app.listApi
      const { eventName } = getDefault(listApi, options, ['eventName'])
      const doc = listApi.documentProprietaire
      // L'objet doc peut contenir un objet map formé d'entrées sont le premier élément est un nom d'événement souris
      // et le deuxième une fonction de callBack à appeler une fois exécuté le processus normal du player mtg32
      if (doc.cbmap) doc.cbmap.delete(eventName)
    },

    /**
     * @typedef ApiSetColorParams
     * @type {Object}
     * @property {CElementGraphique|string} elt object (or tag) color must be applied on
     * @property {Color} color The color to be applied on the object
     * @property {number} [options.opacity=1] opacity (0 to 1) @deprecated
     */
    /**
     * Assigns a color to an object
     * syntaxes `setColor(elt, color)` and `setColor(elt, color, opacity)` are allowed too
     * @memberOf MtgApi
     * @param {ApiSetColorParams|CElementGraphique|string} options All params or graphic element onto color should be applied
     * @param {string} [color] The color to be applied on the object (ignored if first arg is a params object, either mandatory)
     * @param {number} [opacity=1] opacity (0 to 1, ignored with options syntax) @deprecated
     */
    setColor: (...args) => {
      const listApi = app.listApi
      const { elt, color } = getDefault(listApi, args, ['elt', 'color'], ['opacity'])
      elt.setColor(color, app.svgApi, true)
    },

    /**
     * Assigns a background color to a text or LaTeX display
     * syntaxes `setBackgroundColor(elt, backgroundColand)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt object (or tag) backgroundColor is to be applied on
     * @param {Color} options.backgroundColor The background color to be applied on the object
     */
    setBackgroundColor: (...options) => {
      const listApi = app.listApi
      const svgApi = app.svgApi
      const { elt, backgroundColor } = getDefault(listApi, options, ['elt', 'backgroundColor'], [], { useBackgroundColor: true })
      if (!elt.estDeNature(NatObj.NAffLieAPoint)) throw Error('setBackgroundColor can only be applied on a text or LaReX display')
      addQueue(() => {
        elt.couleurFond = backgroundColor
        const doc = listApi.documentProprietaire
        elt.updategElt(svgApi, doc.couleurFond, true)
      })
    },

    /**
     * @typedef ApiSetLineStyleParams
     * @property {CElementGraphique|string} elt Graphic object (or its name or tag)
     * @param {string} lineStyle Line style to be applied on the object (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---)
     */
    /**
     * Assigns a line style to an object
     * syntax `setLineStyle(elt, lineStyle)` is also allowed
     * @memberOf MtgApi
     * @param {ApiSetLineStyleParams} params All params or the graphic object
     * @param {string} lineStyle Line style to be applied on the object (line|-|dot|.|dashdash|--|dashdotdot|-..|dashdotdotdot|-...|dashdashdash|---), ignored if first arg is a params object, mandatory either
     */
    setLineStyle: (...args) => {
      const listApi = app.listApi
      const { elt, lineStyle } = getDefault(listApi, args, ['elt', 'lineStyle'])
      if (!elt.estDeNature(NatObj.NObjLigne)) throw Error(avertNotLine)
      const style = new StyleTrait(listApi, lineStyle, elt.style.strokeWidth)
      elt.setLineStyle(style, true)
    },

    /**
     * Assigns a stroke thickness to an object
     * syntax `setThickness(elt, thickness)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt Tag of the object thickness of which is to be changed
     * @param {number} options.thickness Stroke thickness to be applied on the object
     */
    setThickness: (...options) => {
      const listApi = app.listApi
      const { elt, thickness } = getDefault(listApi, options, ['elt', 'thickness'])
      if (!elt.estDeNature(NatObj.NObjLigne)) throw Error(avertNotLine)
      const style = new StyleTrait(listApi, elt.style.style, thickness)
      elt.setLineStyle(style, true)
    },

    /**
     * Gives to the free point named a the coordinates x, y
     * syntax `setFreePointPosition(a, x, y)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Name of the free point coordinates are to be changed
     * @param {number} options.x Value of the new x coordinate of the free point in the svg
     * @param {number|string|CValDyn} options.y Value of the new y coordinate of the free point in the svg
     */
    setFreePointPosition: (...options) => {
      const listApi = app.listApi
      const { a, x, y } = getDefault(listApi, options, ['a', 'x', 'y'])
      if (!a.estDeNature(NatObj.NPointBase)) throw Error('setFreePointPosition called on a point that is not a free point')
      ensureUndefOrNumber('x', x) // x ne peut pas être dynamique
      ensureUndefOrNumber('y', y) // y ne peut pas être dynamique
      a.x = x
      a.y = y
      const doc = listApi.documentProprietaire
      listApi.positionneDependantsDe(false, doc.dimf, a)
      listApi.updateDependants(a, app.svgApi, doc.couleurFond, true)
    },

    /**
     * modify the name position of point a (the default position is under the point, the right and under the point
     * syntax `setPointNameOffset(a, offsetX, offsetY)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a name (or tag if name is empty) of the point name of which is to be repositionned
     * @param {number} options.offsetX new x-shift of the name
     * @param {number} options.offsetY new x-shift of the name
     */
    setPointNameOffset: (...options) => {
      const listApi = app.listApi
      const svgApi = app.svgApi
      const { a, offsetX, offsetY } = getDefault(listApi, options, ['a', 'offsetX', 'offsetY'])
      a.decX = offsetX
      a.decY = offsetY
      addQueue(function () {
        a.update(svgApi)
      })
    },

    /**
     * gives to point a the point style point style
     * syntax `setPointStyle(a, pointStyle)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a name (or tag if name is empty) of the point pointStyle is to be assigned to
     * @param {string} [options.pointStyle=O] the point style (o|O|OO|x|X|+|<>|[]|.) or (littleround|round|biground|mult|bigmult|cross|diamond|square|pixel|)
     */
    setPointStyle: (...options) => {
      const listApi = app.listApi
      const svgApi = app.svgApi
      const { a, pointStyle } = getDefault(listApi, options, ['a', 'pointStyle'])
      a.donneMotif(pointStyle)
      addQueue(function () {
        a.update(svgApi)
      })
    },

    /**
     * once executed, point a will leave a trace of its positions (if trace mode is acivated)
     * syntax `setMarked(a)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Point (or point name) that is bound to leave a trace of its positions
     */
    setMarked: (...options) => {
      const { a } = getDefault(app.listApi, options, ['a'])
      a.marquePourTrace = true
    },

    /**
     * once executed point a will stop leave a trace of its positions
     * syntax `setUnmarked(a)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Point (or point name) that will no longer leave a trace of its positions
     */
    setUnmarked: (...options) => {
      const { a } = getDefault(app.listApi, options, ['a'])
      a.marquePourTrace = false
    },

    /**
     * activates or deactivates trace mode on the figure
     * syntax `activates(true|false)` is also allowed
     * @memberOf MtgApi
     * @param {boolean} bActivate true to activate trace mode, false to deactivate trace mode
     */
    activateTraceMode: (bActivate) => {
      const listApi = app.listApi
      listApi.deleteTraces()
      app.updateFigDisplay()
      listApi.documentProprietaire.modeTraceActive = bActivate
    },

    /**
     * Replaces a free point by a point linked to another existing point
     * syntax `setLinkPointPoint(a, b)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Name (or tag if name is empty) of the free point that is to be linked to another point
     * @param {CPt|string} options.b Name (or tag if name is empty) of the point the free point is to be linked to
     */
    setLinkPointPoint: (...options) => {
      const listApi = app.listApi
      const svgApi = app.svgApi
      const { a, b } = getDefault(listApi, options, ['a', 'b'])
      if (!a.estDeNature(NatObj.NPointBase)) throw Error('Attempt of using setLinkPointPoint on a point that is not a free point')
      if (b.appartientABlocDependantPourReclassement(a)) {
        throw Error('Impossible link attempt in setLinkPointPoint')
      }
      const indicePointRemplace = listApi.indexOf(a)
      const indiceObjetCible = b.estElementFinal ? listApi.indexOf(b.impProto.dernierObjetFinal()) : listApi.indexOf(b)
      const ptLie = new CPointLiePoint(listApi, null, false, a.couleur, a.nomMasque,
        a.decX, a.decY, a.masque, a.nom, a.tailleNom,
        a.motif, a.marquePourTrace, b)
      listApi.remplaceObjet(a, ptLie)
      listApi.remplacePoint(a, ptLie)
      ptLie.tag = b.tag // Ajout version 6.6.0

      // Si l'objet auquel on doit lier le point a été créé après le
      // point, il faut décaler le point ainsi que tous les objets en
      // dépendant et ayant été créés entre ce point et l'objet
      // immédiatement après cet objet}
      if (indicePointRemplace < indiceObjetCible) listApi.decaleDependants(indicePointRemplace, indiceObjetCible)

      // Ajout version 4.8.0 : Il faut remettre à jour les index de chaque élément de la liste (CElementBase.index)
      listApi.updateIndexes()
      const doc = listApi.documentProprietaire
      const coulFond = doc.couleurFond
      const dimf = listApi.getDimf()
      ptLie.positionne(false, dimf)
      addQueue(function () {
        a.removegElement(svgApi)
        ptLie.creeAffichage(svgApi, false, coulFond)
      })
      listApi.metAJour() // Ajout version 6.3.0
      listApi.positionne(false, dimf)
      listApi.update(svgApi, coulFond, true)
    },

    /**
     * Withdraw the link of linked point a (thus a become a free point)
     * syntax `removePointLink(a)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Name (or tag if name is empty) of the point to be unlinked
     */
    removePointLink: (...options) => {
      const listApi = app.listApi
      const svgApi = app.svgApi
      const { a } = getDefault(listApi, options, ['a'])
      if (!a.estDeNature(Nat.or(NatObj.NPointLie, NatObj.NPointLiePoint))) throw Error(`Point ${options.a} is not a linked point`)
      if (listApi.contientObjetGenereParPointLie(a)) throw Error(`Impossible to remove ink of point ${options.a} because other objects depend on it`)
      const ptBase = new CPointBase(listApi, null, false, a.couleur, a.nomMasque, a.decX,
        a.decY, a.masque, a.nom, a.tailleNom, a.motif, a.marquePourTrace,
        false, a.x, a.y)
      ptBase.tag = a.tag // Ajout version 6.6.0
      listApi.remplaceObjet(a, ptBase)
      listApi.remplacePoint(a, ptBase)
      listApi.updateIndexes()
      const doc = listApi.documentProprietaire
      const coulFond = doc.couleurFond
      listApi.metAJour() // Ajout version 6.3.0
      const dimf = listApi.getDimf()
      ptBase.positionne(false, dimf)
      addQueue(function () {
        a.removegElement(svgApi)
        ptBase.creeAffichage(svgApi, true, coulFond)
      })
      listApi.positionne(false, dimf)
      listApi.update(svgApi, coulFond, true)
    },

    /**
     * Modifies the framing of the figure (by zooming from a point with a given ratio)
     * syntax `zoom(x, y, k)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {number} options.x x-coordinate of the center for zooming-unzooming
     * @param {number|string|CValDyn} options.y y-coordinate of the center for zooming-unzooming
     * @param {number} options.k zoom ratio
     * @param {boolean} [options.absCoord=false] set to true if x,y should be considered absolute in the svg (in that case rep is ignored), useless if there is no frame (in that case x,y will be considered absolute regardless of this property). Useless if the figure has no frame.
     * @param {string} [options.rep] tag of the frame (system of coordinates), mandatory only if the figure contains several frames
     */
    zoomFig: (...options) => {
      const listApi = app.listApi
      let { x, y, k, rep } = getDefault(listApi, options, ['x', 'y', 'k'], [], { useRepOrSVG: true })
      if (!Number.isFinite(k) || k <= 0) throw Error('Zoom factor k invalid')
      if (rep) [x, y] = rep.getAbsCoord(x, y)
      listApi.zoom(x, y, k)
      listApi.positionne(false, listApi.getDimf())
      const doc = listApi.documentProprietaire
      listApi.update(app.svgApi, doc.couleurFond, true)
    },

    /**
     * Translates all the figure with a vector of coordinates (x; y)
     * syntax `translateFig(x, y)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {number} options.x x-coordinate of the translation (svg coordinates)
     * @param {number|string|CValDyn} options.y y-coordinate of the translation (svg coordinates)
     */
    translateFig: (...options) => {
      const listApi = app.listApi
      const { x, y } = getDefault(listApi, options, ['x', 'y'])
      listApi.translateDe(x, y)
      listApi.positionne(false, listApi.getDimf())
      const doc = listApi.documentProprietaire
      listApi.update(app.svgApi, doc.couleurFond, true)
    },

    /**
     * @typedef ApiSetVisibleParams
     * @property {CElementGraphique|string} options.elt Object (or its name or tag) to set visible
     */
    /**
     * Set the object of tag elt visible (if not already visible)
     * syntax `setVisible(elt)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {ApiSetVisibleParams|CElementGraphique|string} options.elt Tag of the object taht is to become visible
     */
    setVisible: (...options) => {
      const listApi = app.listApi
      const { elt } = getDefault(listApi, options, ['elt'])
      elt.montre()
      if (elt.existe) {
        elt.updategElt(app.svgApi, listApi.documentProprietaire.couleurFond, true)
      }
    },

    /**
     * Set the object of tag elt masked (if not already masked)
     * syntax `setHidden(elt)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt Tag of the object taht is to become massked
     */
    setHidden: (...options) => {
      const listApi = app.listApi
      const { elt } = getDefault(listApi, options, ['elt'])
      elt.cache()
      if (elt.existe) {
        const doc = listApi.documentProprietaire
        elt.updategElt(app.svgApi, doc.couleurFond, true)
      }
    },

    /**
     * Reclasses object of tag elt as far as possible towards the end of the list of created objects
     * syntax `reclassMax(elt)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt object (or tag) to be reclassed
     * @returns {Promise<unknown>}
     */
    reclassMax: (...options) => {
      const listApi = app.listApi
      const svgApi = app.svgApi
      const { elt } = getDefault(listApi, options, ['elt'])
      return new Promise((resolve) => {
        // Le reclassement doit être mis sur la pile car on reclasse aussi les éléments associés du svg
        addQueue(() => {
          const res = listApi.reclasseVersFinAvecDependants(elt, svgApi)
          if (!res) console.error(Error('Reclassifying max toward end impossible'))
        })
        addQueue(resolve)
      })
    },

    /**
     * Reclasses object of tag elt as far as possible towards the beginning of the list of created objects
     * syntax `reclassMin(elt)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt Tobject (or tag) to be reclassed
     * @returns {Promise<unknown>}
     */
    reclassMin: (...options) => {
      const listApi = app.listApi
      const svgApi = app.svgApi
      const { elt } = getDefault(listApi, options, ['elt'])
      return new Promise((resolve) => {
        // Le reclassement doit être mis sur la pile car on reclasse aussi les éléments associés du svg
        addQueue(() => {
          const res = listApi.reclasseVersDebutAvecDependants(elt, svgApi)
          if (!res) console.error(Error('Reclassifying max toward beginning impossible'))
        })
        addQueue(resolve)
      })
    },

    /**
     * Reclasses object elt before object elt2 (if the reclassement is possible)
     * elt must be defined after elt2
     * syntaxes `reclassBefande(elt, elt2)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt object (or tag) to be reclassed before elt2
     * @param {string} options.elt2 object (or tag) elt ist to be reclassed before
     * @returns {Promise<unknown>}
     */
    reclassBefore: (...options) => {
      const listApi = app.listApi
      const svgApi = app.svgApi
      const { elt, elt2 } = getDefault(listApi, options, ['elt', 'elt2'])
      return new Promise((resolve) => {
        // Le reclassement doit être mis sur la pile car on reclasse aussi les éléments associés du svg
        addQueue(() => {
          const res = listApi.reclasseVersDebutAvant(elt, elt2, svgApi)
          if (!res) console.error(Error('Reclassifying before impossible'))
        })
        addQueue(resolve)
      })
    },

    /**
     * Reclasses object elt after object elt2 (if the reclassement is possible)
     * elt must be defined before elt2
     * syntax `reclassAfter(elt, elt2)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt object (or tag) to be reclassed after elt2
     * @param {string} options.elt2 object (or tag) that is to be reclassed after
     * @returns {Promise<unknown>}
     */
    reclassAfter: (...options) => {
      const listApi = app.listApi
      const svgApi = app.svgApi
      const { elt, elt2 } = getDefault(listApi, options, ['elt', 'elt2'])
      return new Promise((resolve) => {
        addQueue(() => {
          const res = listApi.reclasseVersFinApres(elt, elt2, svgApi)
          if (!res) console.error(Error('Reclassifying after impossible'))
        })
        addQueue(resolve)
      })
    },

    /**
     * Reclasses the graphic representation on elt at the top of the displayed elements
     * syntax `displayOnTop(elt)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt object (or tag) display si to be reclassed on top
     * @returns {Promise<void>}
     */
    displayOnTop: (...options) => {
      const listApi = app.listApi
      const svgApi = app.svgApi
      const { elt } = getDefault(listApi, options, ['elt'])
      return addQueue(() => {
        const g = elt.g
        svgApi.removeChild(g)
        svgApi.appendChild(g)
      })
    },

    /**
     * Destroys the graphical object of tag elt (along with objects depending on it)
     * syntax `deleteElt(elt)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.elt Tag of the graphical object to be destroyed
     */
    deleteElt: (...options) => {
      const listApi = app.listApi
      const svgApi = app.svgApi
      const { elt } = getDefault(listApi, options, ['elt'])
      // La destruction doit se faire dns la pile car il faut que l'élément détruit ait été affiché
      listApi.detruitDependants(elt, svgApi, true)
    },

    /**
     * destroys object obj alons with its dependant objects and their graphical implementation
     * syntax `deleteObj(obj)` is also allowed
     * @memberOf MtgApi
     * @param obj the ojject to be destroyed (an object created via MathGraph32 API)
     */
    deleteObj: (obj) => {
      if (!obj || (typeof obj !== 'object') || !(obj?.estDeNature || obj.estDeNatureCalcul())) {
        throw Error('deleteObj must be called on an object created by the API')
      }
      app.listApi.detruitDependants(obj, svgApi, true)
    },

    /**
     * Pins (fixes) point a so that this point is no longer movable with the mouse
     * syntax `fixPoint(a)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Name (or tag if name is empty) of the point to be pinned
     */
    fixPoint: (...options) => {
      const listApi = app.listApi
      const { a } = getDefault(listApi, options, ['a'])
      if (!a.estDeNature(NatObj.NPointMobile)) {
        console.error(Error('Attempt to fix a point that is not moveable'))
        return
      }
      a.fixed = true
      if (app instanceof MtgApp && app.outilActif === app.outilCapt) app.activeOutilCapt()
      else {
        const doc = listApi.documentProprietaire
        const listExclusion = doc.listeExclusion
        if (!listExclusion.contains(a)) listExclusion.add(a)
      }
    },
    /**
     * Releases a point that was pinned before (so the point can be captured with the mouse)
     * syntax `releasePoint(a)` is also allowed
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {CPt|string} options.a Name (or tag if name is empty) of the point to be unpinned
     */
    releasePoint: (...options) => {
      const listApi = app.listApi
      const { a } = getDefault(listApi, options, ['a'])
      if (!a.estDeNature(NatObj.NPointMobile)) {
        console.error(Error('Tentative de libérer un point qui n’est pas mobile'))
        return
      }
      a.fixed = false
      if (app instanceof MtgApp && app.outilActif === app.outilCapt) app.activeOutilCapt()
      else {
        const doc = listApi.documentProprietaire
        const listExclusion = doc.listeExclusion
        const ind = listExclusion.indexOf(a)
        if (ind !== -1) listExclusion.col.splice(ind, 1)
      }
    },

    /**
     * give to the calculation (or function) of name nameCalc the formula formula
     * syntaxes `giveFormulaTo(calc, fandmula)` are allowed too
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.calc Name of the calculation or function formula is to be modified or calculation itself
     * @param {string} options.formula formula to be given to calculation (or function) nameCal
     * @return {Promise<void>} the promise executed once the objects dependant on the calculation are redisplayed
     */
    giveFormulaTo: (...options) => {
      const listApi = app.listApi
      const { calc, formula } = getDefault(listApi, options, ['calc', 'formula'])
      if (calc === null) throw Error('Error in giveFormulaTo : Parameter calc is missing')
      if (calc.estDeNatureCalcul(NatCal.NDerivee)) throw Error('Impossible to change a derivative function')
      if (!listApi.giveFormula2Calc(calc, formula)) throw Error(`Incorrect formula in giveFormulaTo: ${formula}`)
      const doc = listApi.documentProprietaire
      listApi.positionneDependantsDe(false, doc.dimf, calc)
      listApi.updateDependants(calc, app.svgApi, doc.couleurFond, true)
    },

    /**
     * returns the value of the real value x (calculation or measure or other real value of the figure)
     * @memberOf MtgApi
     * @param {string|{x: number|string|CValDyn}} calcObjOrName The object of a real calculation or measure, or its name
     * @returns {number}
     */
    getValue: (...calcObjOrName) => {
      const listApi = app.listApi
      const { x: calc } = getDefault(listApi, calcObjOrName, ['x'])
      // calc est nullish ou number ou string ou CValDyn
      if (!calc) {
        throw Error(`Incorrect parameter for a calculation or measure (type ${typeof calc} and value "${calc}")`)
      }
      if (typeof calc === 'number') {
        throw Error('Error in getValue, parameter calc must be a string or a calculation object')
      }
      if (typeof calc === 'string') {
        const val = listApi.pointeurObjetCalcul(calc, NatCal.NTtCalcRNommeSaufConst) // Attention par exemple les mesures de longueur n'ont pas de nom
        if (val === null) throw Error(`Error in getValue : ${calc} is not a real calculation or measure name`)
        return val.rendValeur()
      }
      // ça devrait être un CValDyn (d'après le contrôle de nature fait dans  ensureUndefOrNumberOrStringOrCalc)
      // mais on vérifie quand même ça
      if (typeof calc.rendValeur !== 'function') {
        throw Error('invalid calculation Object (without "rendValeur" method)')
      }
      return calc.rendValeur()
    },

    /**
     * syntax `getValue(x)` is also allowed
     * @memberOf MtgApi
     * @param mat a MathGraph32 matrix object
     * @returns {number[][]} an array of array of numbers representing the matrix value
     */
    getMatValue: (mat) => {
      if (!mat || (typeof mat !== 'object') || !mat.estDeNatureCalcul(NatCal.NTteMatrice)) {
        throw Error('getMatValue must be called on a MathGraph32 matrix object')
      }
      const res = mat.resultat
      const tab = [] // Sera le tableau des valeurs calculées de la matrice
      for (let i = 0; i < mat.n; i++) {
        const lig = []
        tab.push(lig)
        for (let j = 0; j < mat.p; j++) {
          lig.push(res.get([i, j]))
        }
      }
      return tab
    },
    /**
     * returns the name of a calculation, measure or function calc
     * @memberOf MtgApi
     * @param {Object} calc The calculation, measure or function object (not a string)
     * @return {string} the name of the calculation, measure or function
     */
    getCalcName: (calc) => {
      if (calc && calc?.estDeNatureCalcul && calc.estDeNatureCalcul(NatCal.NTtCalcNomme)) return calc.nomCalcul
      else {
        throw Error('Error in getCalcName: argument is not a named calculation or function')
      }
    },

    /**
     * adds to the top right corner of the figure two zoom buttons
     * syntax `addZoomButtons(k)` allowed where k is the increase ratio (k > 1)
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.k Increase zoom ratio (k > 1)
     */
    addZoomButtons: (...options) => {
      const listApi = app.listApi
      let { k, x, y } = getDefault(listApi, options, ['k'], ['x', 'y]'], { })
      const kinv = 1 / k
      const dimf = listApi.getDimf()
      const width = dimf.x
      const height = dimf.y
      const xZoom = width / 2
      const yZoom = height / 2
      if (!x || !y) { // Coordonnées absolues du bouton du haut si non précisées
        x = width - 70
        y = 10
      }
      const textZoomPlus = app.addText({ text: 'Zoom +', absCoord: true, x, y, opaque: true, border: '3D', backgroundColor: 'yellow' })
      const textZoomMoins = app.addText({ text: 'Zoom -', absCoord: true, x, y: y + 30, opaque: true, border: '3D', backgroundColor: 'yellow' })
      app.addEltListener({
        elt: textZoomPlus,
        eventName: 'mousedown',
        callBack: () => {
          app.zoomFig({ absCoord: true, x: xZoom, y: yZoom, k })
        }
      })
      app.addEltListener({
        elt: textZoomMoins,
        eventName: 'mousedown',
        callBack: () => {
          app.zoomFig({ absCoord: true, x: xZoom, y: yZoom, k: kinv })
        }
      })
    },

    /**
     * adds to the top right corner of the figure two zoom buttons
     * syntaxes `addTimerButton(callBack, k)` and `addTimerButton(callBack, k, x, y)` are allowed too where k is the increase ratio (k > 1) and callBack the used function
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {function} options.callBack function to be called by the timer
     * @param {string} options.k Frequency of the timer to be set (in seconds)
     * @param {number|string|CValDyn} [options.x] x coordinate of the top button zoom in svg coordinates
     * @param {number|string|CValDyn} [options.y] y coordinate of the top button zoom in svg coordinates
     * @param {string} [options.tag] Tag to be applied on the created text display (if present)
     * returns {CCommentaire}
     */
    addTimerButton: (...options) => {
      const listApi = app.listApi
      let { callBack, k, x, y } = getDefault(listApi, options, ['callBack', 'k'], ['x', 'y'])
      if (!x || !y) { // Coordonnées absolues du bouton du haut si non précisées
        x = 10
        y = 10
      }
      if (k < 0.001 || k > 120) throw Error('Wrong timer value in addTimerButton')
      const text = app.addText({ text: 'Start - Stop', absCoord: true, x, y, opaque: true, border: '3D', backgroundColor: 'yellow' })
      // Par précaution on regarde si un timer n'est pas déjà actif
      if (app.timerMtgApi) {
        clearInterval(app.timerMtgApi)
        app.timerMtgApi = null
      }
      const startstop = () => {
        if (app.timerMtgApi) {
          clearInterval(app.timerMtgApi)
          app.timerMtgApi = null
        } else {
          app.timerMtgApi = setInterval(callBack, k * 1000)
        }
      }
      app.addEltListener({
        elt: text,
        eventName: 'mousedown',
        callBack: () => {
          startstop()
        }
      })
      return text
    },

    /**
     * adds a button on the figure launching function callBack when clicked on
     * syntaxes `addActionButton(text, callBack)`, `addActionButton(text, callBack, x, y)` and `addActionButton(text, callBack, x, y, tag)` are allowed too where callBack is the launched function when the  button is clicked
     * @memberOf MtgApi
     * @param {ApiOptions} options
     * @param {string} options.text The text displayed by the button
     * @param {function} options.callBack function to be called when clicked on the button
     * @param {number|string|CValDyn} [options.x] x coordinate of the top button zoom in svg coordinates or 10 if absent
     * @param {number|string|CValDyn} [options.y] y coordinate of the top button zoom in svg coordinates or 50 if absent
     * @param {string} [options.tag] Tag to be applied on the created text display (if present)
     * returns {CCommentaire}
     */
    addActionButton: (...options) => {
      const listApi = app.listApi
      let { text, callBack, x, y, tag } = getDefault(listApi, options, ['text', 'callBack'], ['x', 'y', 'tag'])
      if (!x || !y) { // Coordonnées absolues du bouton du haut si non précisées
        x = 10
        y = 50
      }
      const textDisp = app.addText({ text, absCoord: true, x, y, opaque: true, border: '3D', backgroundColor: 'yellow' })
      app.addEltListener({
        elt: textDisp,
        eventName: 'mousedown',
        callBack: () => callBack()
      })
      if (tag) textDisp.tag = tag
      return textDisp
    },

    /**
     * Returns the Base 64 code of the current figure
     * For the player use setApiDoc if more than one figure is used
     * @memberOf MtgApi
     * @returns {string}
     */
    getBase64Code: () => {
      return app.listApi.documentProprietaire.getBase64Code()
    }
  } // MtgApi

  return Object.assign(app, MtgApi)
}

export default addApi
