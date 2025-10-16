/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ce, cens, empty, ge, setAttrs, setStyle } from './kernel/dom'
/**
 * Classe principale de l'application mathGraph32 permettant de créer ou modifier une figure
 * @constructor
 * @param {SVGElement} svg Le svg dans lequel l'application travaille (il doit avoir un id)
 * @param {MtgOptions} mtgOptions Les informations sur l'initialisation de l'application
 */
import MtgApp from './MtgAppBase'
import CListeObjets from './objets/CListeObjets'
import NatObj from './types/NatObjAdd'
import NatCal from './types/NatCal'
import Nat from './types/Nat'
import { addZoomListener, base64Decode, base64Encode, getStr, mtgFileExtension, notify, preventDefault, uniteAngleRadian } from './kernel/kernel'
import DataInputStream from './entreesSorties/DataInputStream'
import DataOutputStream from './entreesSorties/DataOutputStream'
import CMathGraphDoc from './objets/CMathGraphDoc'
import CValeur from './objets/CValeur'
import CCalcul from './objets/CCalcul'
import CConstante from './objets/CConstante'
import CImplementationProto from './objets/CImplementationProto'
import CImage from './objets/CImage'
import CSegment from './objets/CSegment'
import CPolygone from './objets/CPolygone'
import CCommentaire from './objets/CCommentaire'
import CNoeudPointeurSurPoint from './objets/CNoeudPointeurSurPoint'
import CAffLiePt from './objets/CAffLiePt'
import StyleEncadrement from './types/StyleEncadrement'
import Dimf from './types/Dimf'
import constantes from './kernel/constantes'
import { chaineNatGraphPourProto, mousePosition, natObjGraphPourProto, storeFigByCode } from './kernel/kernelAdd'
import ButtonTool from './interface/ButtonTool'
import Color from './types/Color'
import $ from 'jquery'
import AvertDlg from './dialogs/AvertDlg'
import ConfirmDlg from './dialogs/ConfirmDlg'
import CValeurAngle from './objets/CValeurAngle'
import addQueue from 'src/kernel/addQueue'

import '../css/mtgApp.css'
import toast from './interface/toast'
// on exporte MtgAppBase en ajoutant plein de méthodes à son prototype
export default MtgApp

/**
 * Fonction initialisant la variable tipDisplayed de tous les boutons à false;
 */
MtgApp.prototype.annuleTipsButtons = function annuleTipsButtons () {
  for (let i = 0; i < this.buttons.length; i++) this.buttons[i].tipDisplayed = false
}

MtgApp.prototype.updateActiveTools = function updateActiveTools () {
  for (let i = 0; i < this.expandableBars.length; i++) {
    this.expandableBars[i].updateActiveTools()
  }
}

MtgApp.prototype.updateActiveIcons = function updateActiveIcons () {
  let row = 0
  for (let i = 0; i < this.expandableBars.length; i++) {
    if (this.expandableBars[i].tools.length !== 0) this.expandableBars[i].updateActiveIcon(row++)
    else this.expandableBars[i].desactive()
  }
}

MtgApp.prototype.updateToolsToolBar = function updateToolsToolBar () {
  // Il faut d'abord cacher toutes les icônes de tous les outils
  for (let i = 0; i < this.expandableBars.length; i++) this.expandableBars[i].hideAllIcons()
  // Puis on remet à jour les outils actifs et leurs icônes
  this.updateActiveTools()
  this.updateActiveIcons()
}

MtgApp.prototype.unFoldExpandableBars = function unFoldExpandableBars () {
  let row = 0
  for (let i = 0; i < this.expandableBars.length; i++) {
    const b = this.expandableBars[i]
    if (b.tools.length !== 0) {
      if (b.expanded) b.updateActiveIcon(row)
      row++
    }
  }
}

MtgApp.prototype.hasBarExpanded = function hasBarExpanded () {
  let res = false
  for (let i = 0; i < this.expandableBars.length; i++) {
    res = res || this.expandableBars[i].expanded
    if (res) break
  }
  return res
}
/**
 *
 * @returns {ExpandableBar|null}
 */
MtgApp.prototype.getExpandedBar = function getExpandedBar () {
  for (let i = 0; i < this.expandableBars.length; i++) {
    if (this.expandableBars[i].expanded) return this.expandableBars[i]
  }
  return null
}

/**
 * Fonction rajoutant à la figure actuelle des graduations en utilisant la construction nommée nomProto
 * @param {string} nomProto
 */
MtgApp.prototype.creeGrad = function creeGrad (nomProto) {
  const list = this.doc.listePr
  const repere = list.premierParNatCal(NatCal.NRepere)
  const nbgradx = new CCalcul(list, null, false, 'nbgradx', '40', new CConstante(list, 40))
  list.add(nbgradx)
  const nbgrady = new CCalcul(list, null, false, 'nbgrady', '30', new CConstante(list, 30))
  list.add(nbgrady)
  const proto = this.docCons.getPrototype(nomProto)
  const listeSources = new CListeObjets()
  listeSources.add(nbgradx)
  listeSources.add(nbgrady)
  proto.get(0).elementAssocie = repere // Pointe sur le repère
  proto.get(1).elementAssocie = nbgradx
  proto.get(2).elementAssocie = nbgrady
  const impProto = new CImplementationProto(list, proto)
  impProto.implemente(this.dimf, proto)
}

/**
 * Fonction préparant la liste principale pour que la figure possède un segment longueur unité
 * @param {KernelUniteAngle} uniteAngle L'unité d'angle de la figure
 */
MtgApp.prototype.initAvecLongueurUnite = function initAvecLongueurUnite (uniteAngle) {
  const list = this.doc.listePr
  list.uniteAngle = uniteAngle
  list.ajouteConstantePi()
  list.ajouteLongueurUnite(this, this.dimf)
}
/**
 * Fonction préparant la liste principale pour que la figure ne possède pas un segment longueur unité
 * @param {KernelUniteAngle} uniteAngle L'unité d'angle de la figure
 */
MtgApp.prototype.initSansLongueurUnite = function initSansLongueurUnite (uniteAngle) {
  const list = this.doc.listePr
  list.uniteAngle = uniteAngle
  list.ajouteConstantePi()
  list.pointeurLongueurUnite = null
}

/**
 * Fonction préparant la liste principale pour que la figure possède un repère orthonormal avec graduations
 * @param {KernelUniteAngle} uniteAngle L'unité d'angle de la figure
 * @param {boolean} quadhor true si on veut que le repère soit quadrillé horizontalement
 * @param {boolean} quadver true si on veut que le repère soit quadrillé verticalement
 * @param {boolean} grid true si on veut que le repère est des pointilés aux points de coordonnées entières
 * @param {boolean} withvect si true, on rajoute des vecteurs sur les axes
 * @param {string} typegrad String valant "no" pour pas de graduations, "trig" pour une graduation spéciale trigo, "simple"
 */
MtgApp.prototype.initAvecRepereOrthonormal = function initAvecRepereOrthonormal (uniteAngle, quadhor, quadver, grid, withvect, typegrad) {
  const list = this.doc.listePr
  list.uniteAngle = uniteAngle
  list.ajouteConstantePi()
  list.ajouteRepereOrthonormal(this.dimf, quadhor, quadver, grid, 'O', 'I', 'J', withvect ? 'i' : '',
    withvect ? 'j' : '', new CValeur(list, 0), new CValeur(list, 0), new CValeur(list, 1), new CValeur(list, 1),
    typegrad !== 'no')
  if (typegrad !== 'no') { this.creeGrad(typegrad === 'trig' ? 'GraduationReperePourTrigo' : 'GraduationAxesRepere') }
  if (typegrad === 'trig') list.uniteAngle = uniteAngleRadian
}

/**
 * Fonction préparant la liste principale pour que la figure possède un repère orthogonal avec graduations
 * @param {KernelUniteAngle} uniteAngle L'unité d'angle de la figure
 * @param {boolean} quadhor true si on veut que le repère soit quadrillé horizontalement
 * @param {boolean} quadver true si on veut que le repère soit quadrillé verticalement
 * @param {boolean} grid true si on veut que le repère est des pointilés aux points de coordonnées entières
 * @param {boolean} withvect si true, on rajoute des vecteurs sur les axes
 * @param {string} typegrad String valant "no" pour pas de graduations, "trig" pour une graduation spéciale trigo, "simple"
 */
MtgApp.prototype.initAvecRepereOrthogonal = function initAvecRepereOrthogonal (uniteAngle, quadhor, quadver, grid, withvect, typegrad) {
  const list = this.doc.listePr
  list.uniteAngle = uniteAngle
  list.ajouteConstantePi()
  list.ajouteRepereOrthogonal(this.dimf, quadhor, quadver, grid, 'O', 'I', 'J', withvect ? 'i' : '',
    withvect ? 'j' : '', new CValeur(list, 0), new CValeur(list, 0), new CValeur(list, 1), new CValeur(list, 1),
    typegrad !== 'no')
  if (typegrad !== 'no') { this.creeGrad(typegrad === 'trig' ? 'GraduationReperePourTrigo' : 'GraduationAxesRepere') }
  if (typegrad === 'trig') list.uniteAngle = uniteAngleRadian
}
/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////
//          Ce qui suit concerne les exercices de construction en ligne
/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Fonction renvoyant true si la figure chargée est une figure destinée à faire un exercice de construction.
 * Pour cela la figure doit contenir une macro d'apparition d'objets d'intitulé #Solution#.
 * Les objets que cette macro fait apparaître son alors considérés comme les objets que l'élève doit construire.
 * @returns {boolean}
 */
MtgApp.prototype.isExercise = function isExercise () {
  return this.macroPourConst !== null
}

/**
 * Fonction cherchant s'il existe une macro d'apparition d'objets d'intitulé #Solution# ou #SolutionIso# et renvoyant
 * un pointeur sur celle-ci si elle existe et sinon null.
 * Dans le cas #SolutionIso#, la macro d'apparition doit avoir un seul objet qui soit un polygone
 * @returns {CMacroApparition|null}
 */
MtgApp.prototype.getMacroPourConst = function getMacroPourConst () {
  const list = this.listePr
  for (const el of list.col) {
    if (el.className === 'CMacroApparition') {
      if (['#Solution#', '#SolutionIso#'].indexOf(el.intitule) !== -1) {
        // Dans les deux cas d'un exercice de construction isométrique, si un des objets à construire est un polygone, tous ses sommets doivent être nommés
        if (el.intitule === '#Solution#') return el
        else {
          if (el.intitule === '#SolutionIso#') {
            // Pour être valide, la macro de doit gérer que des objets de type Polygone, cercle ou segment
            let valide = true
            const listeAssociee = el.listeAssociee
            for (let j = 0; (j < listeAssociee.longueur()) && valide; j++) {
              const el2 = listeAssociee.get(j)
              // Si demande de construire un polygone, tous ses sommets doivent être nommés dans la figure initiale
              if (el2.estDeNature(NatObj.NPolygone)) {
                const nbp = el2.nombrePoints
                for (let k = 0; (k < nbp) && valide; k++) {
                  valide = valide && el2.colPoints[k].pointeurSurPoint.nom !== ''
                }
              } else {
                // Si on demande de créer un segment, les extrémités doivent être nommées
                if (el2.estDeNature(NatObj.NSegment)) {
                  valide = valide && (el2.point1.nom !== '') && (el2.point2.nom !== '')
                } else {
                  // Si demande de créer un cercle, il faut qu'il soit de type CCercleOA ou CCercleOR ou CCercleOAB
                  if (el2.estCercleParCentre()) {
                    valide = valide && (el2.o.nom !== '')
                  } else valide = false // Pas d'autres types d'objets à construire que polygône, segment ou cercle
                }
              }
              valide = valide &&
                listeAssociee.get(j).estDeNature(Nat.or(NatObj.NPolygone, NatObj.NCercle, NatObj.NSegment))
            }
            if (valide) return el
          }
        }
      }
    }
  }
  return null
}

/**
 * Fonction appelée pour le cas d'un exercice de construction et renvoyant une liste formée de tous les
 * objets (numériques ou non) que l'élève a le droit d'utiliser pour résoudre l'exercice.
 * Pour un exercice de construction, il contient une macro d'apparition d'objets.
 * Pour tous les calculs nommés (saut les constantes comme pi) si le commentaire de cette macro contient
 * une chaine de caractères du type {nomducalcul} alors le calcul ou la fonction nommé nomducalcul peut
 * être utilisée par l'élève
 * @returns {CListeObjets}
 */
MtgApp.prototype.listePourConstruction = function listePourConstruction () {
  if (!this.estExercice) return this.listePr
  const list = this.listePr
  const nbObj = this.nbObjInit // Le nombre initial d'objets de la figure de l'exercice
  // var li = new CListeObjets(list.uniteAngle, list.pointeurLongueurUnite)
  const li = new CListeObjets(list.uniteAngle, '', list.decimalDot) // Corrigé version 6.5.2
  li.associeA(this.doc)
  for (let i = 0; i < list.longueur(); i++) {
    const el = list.get(i)
    if (!el.estElementIntermediaire()) {
      if (i < nbObj) {
        if (el.estDeNature(NatObj.NTtObj) && !el.masque) {
          li.add(el)
        } else {
          if (el.estDeNatureCalcul(NatCal.NCalculReelConstant)) {
            li.add(el) // Pour la constante pi
          } else if (el.estDeNatureCalcul(NatCal.NTtCalcNommeSaufConst)) {
            if (this.calculOKForConst(el)) li.add(el)
          }
        }
      } else {
        li.add(el)
      }
    }
  }
  return li
}

/**
 * Fonction appelée dans le cas d'un exercice de construction/
 * Renvoie true si calc fait partie des calcul que l'élève a le droit d'utiliser
 * @param {CCalculAncetre} calc
 * @returns {boolean}
 */
MtgApp.prototype.calculOKForConst = function calculOKForConst (calc) {
  const mac = this.macroPourConst
  return mac.commentaireMacro.indexOf('{' + calc.nomCalcul + '}') !== -1
}
/**
 * Retourne la liste des index
 * @returns {number[]}
 */
MtgApp.prototype.arrayObjAConstruire = function arrayObjAConstruire () {
  const mac = this.macroPourConst
  const ar = []
  const list = mac.listeAssociee
  // si el.index est l'index de el dans list.col, alors c'est plus rapide de faire
  // return Array.from(list.col.keys()) // retourne un vrai Array
  // ou, si un itérateur suffit
  // return list.col.keys() // retourne un Iterator contenant des nombres
  for (const el of list.col) {
    ar.push(el.index) // el.index contient l'indice de el dans la liste qui le contient
  }
  return ar
}

/**
 * Fonction déplaçant un point libre ou un point lié un tout petit peude façon aléatoire
 * @param {CElementBase} pt Le point libre ou lié à déplacer
 */
MtgApp.prototype.epsilon = function epsilon (pt) {
  let a, b, s1, s2, x1, y1, absmin, absmax, nabs
  if (pt.estDeNature(NatObj.NPointBase)) {
    a = (Math.floor(Math.random() * 5) + 1) * 0.001
    b = (Math.floor(Math.random() * 5) + 1) * 0.001
    s1 = Math.floor(Math.random() * 2)
    s2 = Math.floor(Math.random() * 2)
    x1 = s1 === 0 ? a : -a
    y1 = s2 === 0 ? b : -b
    pt.placeEn(pt.x + x1, pt.y + y1)
  } else { // Cas d'un point lié
    absmin = pt.abscisseMinimale()
    absmax = pt.abscisseMaximale()
    // on décale l'abscisse au maximum de 5% vers la haut ou vers la bas au
    // hasard
    a = Math.floor(Math.random() * 5) + 1
    s1 = Math.floor(Math.random() * 2)
    if (s1 === 0) a = -a
    nabs = pt.abscisse + a * (absmax - absmin) / 10000
    if (nabs > absmax) nabs = absmax
    else if (nabs < absmin) nabs = absmin
    pt.donneAbscisse(nabs)
  }
}
/**
 *
 * @param {CListeObjets} list
 * @returns {boolean}
 */
MtgApp.prototype.validateAnswerOnePass = function validateAnswerOnePass (list) {
  for (let i = 0; i < this.arrayObjAConst.length; i++) {
    const el = list.get(this.arrayObjAConst[i])
    const name = el.estDeNature(NatObj.NObjNommable) ? el.nom : ''
    let conf = false
    for (let j = this.nbObjInit; (j < list.longueur()) && !conf; j++) {
      const e = list.get(j)
      conf = conf || (e.existe && e.coincideAvec(el) && ((name.length !== 0) ? (e.nom === el.nom) : true))
    }
    if (!conf) return false
  }
  return true
}
/**
 *
 * @returns {boolean}
 */
MtgApp.prototype.validateAnswerIso = function validateAnswerIso () {
  const list = this.listePr
  for (let i = 0; i < this.arrayObjAConst.length; i++) {
    const el = list.get(this.arrayObjAConst[i])
    let conf = false
    for (let j = this.nbObjInit; (j < list.longueur()) && !conf; j++) {
      conf = conf || (el.isIsomTo(list.get(j)))
    }
    // Pour le cas particulier d'un polygone on regarde si l'équivalent a été créé avec des segments
    if (!conf && el.estDeNature(NatObj.NPolygone) && this.existePolyEq(el)) {
      // On va créer un polygone provisoire dont les sommets sont les points construits ayant les mêmes noms que les
      // sommets de el
      const col = new Array(el.nombrePoints)
      for (let j = 0; j < el.nombrePoints; j++) {
        const pt1 = el.colPoints[j].pointeurSurPoint
        const pt2 = this.pointParNom(pt1.nom)
        col[j] = new CNoeudPointeurSurPoint(list, pt2)
      }
      const poly = new CPolygone(list, null, false, el.couleur, false, el.style, col)
      poly.positionne()
      conf = conf || el.isIsomTo(poly)
    }
    if (!conf) return false
  }
  return true
}

/**
 * Ne sert que pour les exercices de construction
 * Fonction renvoyant true s'il a été construit un segment, une droite ou une demi droite auquel appatiennent
 * les points construits nommés nom1 et nom2
 * @param {string} nom1
 * @param {string} nom2
 * @returns {boolean}
 */
MtgApp.prototype.existeObjDte = function existeObjDte (nom1, nom2) {
  const list = this.listePr
  const pt1 = this.pointParNom(nom1)
  const pt2 = this.pointParNom(nom2)
  if (pt1 === null || pt2 === null) return false
  // for (var i = this.nbObjInit; i < list.longueur(); i++) { // On accepte aussi les objets lignes présents dans la figure initiale.
  for (let i = 0; i < list.longueur(); i++) {
    const el = list.get(i)
    if (el.estDeNature(NatObj.NTteDroite) && ((i <= this.nbObjInit) ? !el.masque : true)) {
      if (pt1.appartientParDefinition(el) && pt2.appartientParDefinition(el)) return true
    }
  }
  return false
}

/**
 * Fonction utilisée seulement pour les exercices de construction.
 * Renvoie le point ayant pour nom nom sauf si ce point fait partie de la figure initiale et est masque.
 * Renvoie null s'il n'y a pas de tel point.
 * Normalement ne doit pas renvoyer null car n'est appelé que si tous les points ont été nommés comme demandé.
 * @param {string} nom
 * @returns {CElementBase|null}
 */
MtgApp.prototype.pointParNom = function pointParNom (nom) {
  const list = this.listePr
  // for (var i = this.nbObjInit; i < list.longueur(); i++) {
  for (let i = 0; i < list.longueur(); i++) {
    const el = list.get(i)
    if (el.estDeNature(NatObj.NTtPoint) && (el.nom === nom) && ((i <= this.nbObj) ? !el.masque : true)) return el
  }
  return null
}

/**
 * Ne sert que pour les exercices de construction
 * Fonction renvoyant true s'il a été constuit de segments joignant tous les sommets du polygone poly
 * @param {CPolygone} poly
 * @returns {boolean}
 */
MtgApp.prototype.existePolyEq = function existePolyEq (poly) {
  let existe = true
  for (let i = 0; i < poly.nombrePoints - 1; i++) {
    const nom1 = poly.colPoints[i].pointeurSurPoint.nom
    const nom2 = poly.colPoints[i + 1].pointeurSurPoint.nom
    existe = existe && this.existeObjDte(nom1, nom2)
  }
  return existe
}

/*
MtgApp.prototype.getMissingNames = function() {
  var ret = [];
  var list = this.listePr;
  for (var i = 0; i < this.arrayObjAConst.length; i++) {
    var el = list.get(this.arrayObjAConst[i]);
    if (el.estDeNature(NatObj.NObjNommable)) {
      if (el.nom.length !== 0) {
        var valid = false;
        for (var j = this.nbObjInit; (j < list.longueur()) && !valid; j++) {
          var e = list.get(j);
          if (e.estDeNature(NatObj.NObjNommable)) valid = valid || (e.nom === el.nom);
        }
        if (!valid) ret.push(el.nom);
      }
    }
  }
  return ret;
}
*/
/**
 *
 * @returns {string[]}
 */
MtgApp.prototype.getMissingNames = function getMissingNames () {
  let i, j, k, el, ch, valid, noeud, pt, pt1, pt2
  const ret = []
  const list = this.listePr
  // On crée d'abord un tableau formé de tous les noms des points et droites qui doivent être nommés
  const tab = []
  for (i = 0; i < this.arrayObjAConst.length; i++) {
    el = list.get(this.arrayObjAConst[i])
    if (el.estDeNature(NatObj.NObjNommable) && (el.nom !== '')) tab.push(el.nom)
    else {
      if (el.estDeNature(NatObj.NPolygone)) {
        for (k = 0; k < el.nombrePoints - 1; k++) {
          noeud = el.colPoints[k]
          pt = noeud.pointeurSurPoint
          ch = pt.nom
          if (pt.masque && (ch !== '') && (tab.indexOf(ch) === -1)) tab.push(ch)
        }
      } else {
        if (el.className === 'CSegment') {
          pt1 = el.point1
          ch = pt1.nom
          if (pt1.masque && (ch !== '') && (tab.indexOf(ch) === -1)) tab.push(ch)
          pt2 = el.point2
          ch = pt2.nom
          if (pt2.masque && (ch !== '') && (tab.indexOf(ch) === -1)) tab.push(ch)
        } else {
          if (el.estCercleParCentre()) {
            pt = el.o
            ch = pt.nom
            if (pt.masque && (ch !== '') && (tab.indexOf(ch) === -1)) tab.push(ch)
          }
        }
      }
    }
  }
  for (i = 0; i < tab.length; i++) {
    valid = false
    ch = tab[i]
    for (j = this.nbObjInit; (j < list.longueur()) && !valid; j++) {
      const e = list.get(j)
      if (e.estDeNature(NatObj.NObjNommable) && e.existe) valid = valid || (e.nom === ch)
    }
    if (!valid) ret.push(ch)
  }

  return ret
}

/**
 * Fonction utilisée dans les exercices de construction et renvoyant un tableau formé de chaînes de caractères
 * correspondant aux types graphiques d'éléments qui auraient dû être créée et ne l'ont pas été.
 * Renvoie une tableau vide s'il ne manque d'éléments.
 * @returns {string[]}
 */
MtgApp.prototype.getMissingTypes = function getMissingTypes () {
  const ret = []
  const list = this.listePr
  for (let i = 0; i < this.arrayObjAConst.length; i++) {
    const el = list.get(this.arrayObjAConst[i])
    // Pour le exercices de construction isométrique quand on demande un polygone on accepte l'équivalent tracé avec des segments
    if ((this.macroPourConst.intitule === '#Solution#') || (this.macroPourConst.intitule === '#SolutionIso#' && !el.estDeNature(NatObj.NPolygone))) {
      let valid = false
      for (let j = this.nbObjInit; (j < list.longueur()) && !valid; j++) {
        const e = list.get(j)
        valid = e.estDeNature(natObjGraphPourProto(el.getNature())) && e.existe
      }
      const ch = chaineNatGraphPourProto(el.getNature())
      if (!valid && ret.indexOf(ch)) ret.push(ch)
    }
  }
  return ret
}
/**
 *
 * @returns {boolean}
 */
MtgApp.prototype.validateAnswer = function validateAnswer () {
  let i, j
  // On regarde d'abord s'il s'agit de construire un seul objet isométrique à un objet donné
  if (this.macroPourConst.intitule === '#SolutionIso#') return this.validateAnswerIso()
  else {
    // S'il n'existe pas des objets créés par l'utilisateur coincidant avec les objets à construire
    // la construction est fausse
    if (!this.validateAnswerOnePass(this.listePr)) return false
    // Sinon on crée une nouvelle liste formée des clones des objets de la liste principale
    // On déplace de epsilon trois fois de suites tous les points libres ou points liés et on regarde
    // si la réponse est encore valide.
    const list = this.listePr
    const listAux = new CListeObjets(list.uniteAngle, '', list.decimalDot)
    list.setCopy(listAux)
    const listAConstruire = new CListeObjets()
    for (i = 0; i < this.arrayObjAConst.length; i++) listAConstruire.add(list.get(this.arrayObjAConst[i]))
    const nat = Nat.or(NatObj.NPointBase, NatObj.NPointLie)
    for (j = 0; (j < 3); j++) {
      for (i = 0; i < this.nbObjInit; i++) {
        const el = listAux.get(i)
        if (el.estDeNature(nat) && listAConstruire.depDe(el)) this.epsilon(el)
      }
      listAux.positionne(false, this.dimf)
      if (!this.validateAnswerOnePass(listAux)) return false
    }
    return true
  }
}

/**
 * Fonctionrenvoyant, dans le cas d'un exercice, true si l'utilisateur a rajouté des objets
 * à la figure initiale.
 * @returns {boolean}
 */
MtgApp.prototype.objectConstructed = function objectConstructed () {
  return this.listePr.longueur() > this.nbObjInit
}

/**
 * Fonction remplaçant la figure actuelle par la figure dont le code Base64 est code
 * @param {string} code Le code Base64 de la nouvelle figure
 * @param {boolean} [bdisplay=true] Passer false pour ne pas afficher la figure (et être sync, sinon on appelle la callback ou retourne une promesse)
 * @param {VoidCallback} [callBack] éventuelle fonction de callBack à appeler une fois la figure affichée
 * @returns {Promise<void>|void} Une promesse si bdisplay sans callback
 */
MtgApp.prototype.setFigByCode = function setFigByCode (code, bdisplay = true, callBack = null) {
  let doc
  try {
    // doc = new CMathGraphDoc(this.id + "figurePanel", true, true); // Modifié version 6.3.0
    doc = new CMathGraphDoc(this.id, true, true, this.decimalDot)
    const ba = base64Decode(code)
    const inps = new DataInputStream(ba, code)
    doc.read(inps)
  } catch (e) {
    console.error(e)
    new AvertDlg(this, 'Base64Err')
    return
  }
  this.doc = doc
  // Ligne suivante nécessaire pour que les macros d'activation et désactivation du mode trace activent ou non
  // l'icône correspondante
  this.doc.app = this
  const list = this.listePr
  list.retireTout()
  this.retireTout()
  this.prepareTracesEtImageFond()
  doc.dimf = this.dimf
  this.listePr = doc.listePr
  /** @type {CListeObjets} */
  this.listePourConst = this.listePourConstruction()
  this.creeCommentaireDesignation()
  this.listePr.creePaneVariables()
  this.calculate(false)
  this.updateToolsToolBar() // Mise à jour des icônes des barres d'outils de gauche
  this.updateToolbar() // Mise à jour des icônes de la barre horizontale
  // On adapte la dimension des svg si nécessaire (cas où des dimensions minimales ont été demandées)
  this.resizeSvgFig()
  // Ligne ci-dessous modifiée. On appelle this.gestionnaire.initialise(); car cette fonction peut-être appelée depuis j3p
  // et il faut dans ce cas qu'on ne puisse pas annuler ce qui a été fait avant.
  // if (this.electron) this.gestionnaire.initialise(); else this.gestionnaire.enregistreFigureEnCours("NewFig");
  this.gestionnaire.initialise()
  this.reInitConst() // Pour réinitialiser une éventuelle construction en cours
  if (this.zoomOnWheel) addZoomListener(this.doc, this.svgFigure, this.svgGlob) // Ajoute au doc le listener sur le wheel
  // if (doc.modeTraceActive) this.buttonModeTrace.activate(true);
  if (bdisplay) {
    if (!callBack) return this.display()
    this.display(callBack)
  }
}

/**
 * Rend la figure éactive ou inative aux événements souris et clavier
 * suivant la valeur du boolean ba.
 * @param {boolean} ba
 * @returns {void}
 */
MtgApp.prototype.setActive = function setActive (ba) {
  if (this.nameEditor.isVisible) this.nameEditor.montre(false)
  this.activeOutilCapt()
  const doc = this.doc
  if (doc !== null) {
    doc.isActive = ba
    // Il faut aussi activer ou désactiver les champs d'édition de formule
    const liste = doc.listePr
    for (const el of liste.col) {
      if (el.estDeNature(NatObj.NEditeurFormule)) el.editeur.readOnly = !ba
      else {
        if (el.getNatureCalcul() === NatCal.NVariable) {
          if (el.dialogueAssocie) {
            el.buttonplus.setAttribute('disabled', !ba)
            el.buttonmoins.setAttribute('disabled', !ba)
            el.buttonegal.setAttribute('disabled', !ba)
          }
        }
      }
    }
  }
}
/**
 *
 * @returns {Nat}
 */
MtgApp.prototype.natPourImages = function natPourImages () {
  const mac = this.macroPourConst
  let nat = NatObj.NTtPoint
  if (mac === null) {
    return this.onlyPoints
      ? nat
      : NatObj.NTtObjPourTransf
  }
  const com = mac.commentaireMacro
  const tab1 = ['droite', 'segment', 'demidroite', 'cercle', 'arc', 'polygone', 'lignebrisee']
  const tab2 = [NatObj.NDroite, NatObj.NSegment, NatObj.NDemiDroite, NatObj.NCercle, NatObj.NArc, NatObj.NPolygone, NatObj.NLigneBrisee]
  for (let i = 0; i < tab1.length; i++) {
    if (com.indexOf('#' + tab1[i]) !== -1) nat = Nat.or(nat, tab2[i])
  }
  return nat
}

/**
 * Fonction changeant la formule du calcul ou de
 * la fonction (réelle ou complexe) de nom nomCalcul.
 * La nouvelle formule est contenue dans la chaîne de caractères formule.
 * Renvoie true si la formule était valide et false sinon.
 * Utilisé par j3p pour certains exercices de construction
 * @param {string} nomCalcul
 * @param {string} formule
 * @returns {void}
 */
MtgApp.prototype.giveFormula2 = function giveFormula2 (nomCalcul, formule) {
  this.listePr.giveFormula2(nomCalcul, formule)
}

/**
 * Renvoie la valeur actuelle du calcul réel nommé nomCalcul dans la figure.
 * Renvoie -1 si le calcul n'existe pas.
 * @param {string} nomCalcul
 * @param {boolean} bNoCase true si la recherche se fait sans tenir compte de la casse majuscule ou minuscule
 * @returns {number}
 */
MtgApp.prototype.valueOf = function valueOf (nomCalcul, bNoCase = false) {
  return this.listePr.valueOf(nomCalcul, bNoCase)
}

/**
 * Retourne le code LaTeX de l'affichage LaTex d'indice ind dans la liste
 * des objets créés (les indices commençant à zéro)
 * Utilisé par j3p pour certains exercices de construction
 * @param {number|string} ind Si number c'est l'indice de l'affichage LaTeX parmi tous les affichages LaTeX, si string ça doit être un "#" suivi du tag de l'objet du type CLatex (depuis version 6.6).
 * @returns {string}
 */
MtgApp.prototype.getLatexCode = function getLatexCode (ind) {
  return this.listePr.getLatexCode(ind)
}

/**
 * Reconstruit une figure à partir d'un flux binaire
 * @param {number[]} ba Tableau de bytes contenant le flux binaire de la figure
 * @param {function} [callBackOnOK=null] Fonction éventelle de callBack à appeler après chargement de la figrue
 * @param {string} [filePath='']  Le chemin éventuel d'accès à la figure si on ouvre depuis le disque
 */
MtgApp.prototype.resetFromByteArray = function resetFromByteArray (ba, callBackOnOK = null, filePath = '') {
  const self = this
  let doc
  try {
    const inps = new DataInputStream(ba)
    // var doc = new CMathGraphDoc(self.id + "figurePanel", true, true); // Modifié version 6.3.0
    doc = new CMathGraphDoc(self.id, true, true, this.decimalDot)
    doc.read(inps)
  } catch (e) {
    new AvertDlg(self, e.message)
    return
  }
  self.nameEditor.montre(false) // Des fois qu'un nom soit en cours d'édition

  const list = self.listePr
  list.retireTout()
  self.retireTout()
  doc.dimf = self.dimf
  doc.app = self
  self.doc = doc
  // Ligne suivante nécessaire pour que les macros d'activation et désactivation du mode trace activent ou non
  // l'icône correspondante
  self.doc.app = self
  self.prepareTracesEtImageFond()
  self.listePr = doc.listePr
  self.listePourConst = self.listePr
  self.creeCommentaireDesignation()
  self.listePr.creePaneVariables()
  self.calculateAndDisplay(false)
  self.updateToolsToolBar()
  // if (doc.modeTraceActive) self.buttonModeTrace.activate(true);
  self.gestionnaire.initialise()
  self.reInitConst() // Pour réinitialiser une éventuelle construction en cours
  if (this.zoomOnWheel) addZoomListener(this.doc, this.svgFigure, this.svgGlob) // Ajoute au doc le listener sur le wheel
  if (this.electron) {
    doc.setDirty(true, false)
    // On appelle setNewPath qui est une fonction de index.html sert à autoriser main.js à changer le chemin d'accès de la figure
    setNewPath(filePath) // eslint-disable-line no-undef
  }
  this.updateToolbar()
  // On adapte la dimension des svg si nécessaire (cas où des dimensions minimales ont été demandées)
  this.resizeSvgFig()
  self.activeOutilsDem()
  if (callBackOnOK !== null) callBackOnOK()
}

/**
 * Fonction chargeant une figure depuis une chaîne de caractères (en utf-8)
 * Cette fonction est utilisée par la version electron
 * @param {string} ch La chaîne de caractères contenant le code de la figure (chaque caractère a le code Ascii
 * permettant de créer un ByteArray représentant le flux binaire de la figure.
 * @param {function} [callBackOnOK] callback rappelée si ok
 */
MtgApp.prototype.resetFromString = function resetFromString (ch, callBackOnOK) {
  const ba = []
  for (let i = 0; i < ch.length; i++) ba.push(ch.charCodeAt(i))
  this.resetFromByteArray(ba, callBackOnOK)
}

/**
 * Fonction chargeant une figure depuis un objet File
 * @param {Blob} file
 * @param {function} [callBackOnOK] Fonction de callBack à appeler si le chargement a réussi
 */
MtgApp.prototype.resetFromFile = function resetFromFile (file, callBackOnOK) {
  const reader = new FileReader()
  reader.readAsArrayBuffer(file)
  const self = this
  reader.onload = function () {
    try {
      const ba = new Uint8Array(reader.result)
      self.resetFromByteArray(ba, callBackOnOK, file.path)
    } catch (e) {
      new AvertDlg(self, e.message)
    }
  }
}

/**
 * Fonction utilisée par la version electron quand on double-clique sur un fichier pour lancer le logiciel
 * @param {string} ch Contient une chaîne de caractères contenant un flux binaire représentant une figure
 * @returns {CMathGraphDoc|null} Renvoie null si le code n'est pas valide et sinon le CMathGraphDoc correspondant
 */
MtgApp.prototype.getDocFromString = function getDocFromString (ch) {
  try {
    const ba = []
    for (let i = 0; i < ch.length; i++) ba.push(ch.charCodeAt(i))
    const inps = new DataInputStream(ba)
    // var doc = new CMathGraphDoc(this.id + "figurePanel", true, true); // Modifié version 6.3.0
    const doc = new CMathGraphDoc(this.id, true, true, this.decimalDot)
    doc.read(inps)
    return doc
  } catch (e) {
    return null
  }
}

/**
 * Fonction ajoutant un prototype à la figure depuis un tavbeau d'entier ba
 * @param {number[]} ba
 */
MtgApp.prototype.addProtoFromByteArray = function addProtoFromByteArray (ba) {
  const self = this
  try {
    const inps = new DataInputStream(ba)
    this.doc.addPrototype(inps, this.doc.numeroVersion)
  } catch (e) {
    new AvertDlg(self, 'FichierErr')
  }
}
/**
 *
 * @param {string} ch
 */
MtgApp.prototype.addProtoFromString = function addProtoFromString (ch) {
  const ba = []
  for (let i = 0; i < ch.length; i++) ba.push(ch.charCodeAt(i))
  this.addProtoFromByteArray(ba)
}
/**
 *
 * @param {Blob} file
 */
MtgApp.prototype.addProtoFromFile = function addProtoFromFile (file) {
  const reader = new FileReader()
  reader.readAsArrayBuffer(file)
  const self = this
  reader.onload = function () {
    const ba = new Uint8Array(reader.result)
    self.addProtoFromByteArray(ba)
  }
}
/**
 *
 * @param {BlobEvent} ev
 */
MtgApp.prototype.onDropFile = function onDropFile (ev) {
  if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length) {
    this.activeOutilCapt()
    ev.stopPropagation()
    preventDefault(ev)
    const actualBase64Code = this.getBase64Code()
    const file = ev.dataTransfer.files[0]
    let imgType = file.name.split('.')
    imgType = imgType[imgType.length - 1].toLowerCase() // On utilise toLowerCase() pour éviter les extensions en majuscules
    const allowedTypes = [mtgFileExtension, 'png', 'jpg', 'jpeg', 'gif']
    const ind = allowedTypes.indexOf(imgType)
    if (ind !== -1) {
      if (ind === 0) { // Cas d'un fichier mtg32
        if (this.doc.isDirty) {
          const self = this
          new ConfirmDlg(this, 'AvertDirty', function () {
            storeFigByCode(actualBase64Code)
            self.resetFromFile(file, function () {
            })
            // Si on est dans la version electron on remet à zéro le document
            // resetDocument est une fonction de la page index.html de la vesion electron
            if (self.electron) resetDocument() // eslint-disable-line no-undef
          })
        } else {
          this.resetFromFile(file, function () {
          })
        }
      } else { // cas d'un fichier image
        const self = this
        const natImage = DataOutputStream.getNatImage(imgType)
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.addEventListener('load', function () {
          const database64 = reader.result
          const tab = database64.split(',')
          const { x, y } = mousePosition(self.svgFigure, ev, self.zoomFactor) // 3 ième paramètre rajouté version 6.5.2
          // reader.result contient la chaîne Base64 représentant l'image
          const listePr = self.listePr
          const im = new CImage(listePr, null, false, self.getCouleur(), x, y, 0, 0, false, null, 13,
            StyleEncadrement.Sans, false, self.doc.couleurFond, CAffLiePt.alignHorCent,
            CAffLiePt.alignVerCent, natImage, base64Decode(tab[tab.length - 1], true),
            new CValeurAngle(listePr, 0), new CValeur(listePr, 0), false)
          const image = ce('img', {
            src: database64
          })
          image.onload = function () {
            im.width = image.width
            im.height = image.height
            self.ajouteElement(im)
            im.creeAffichage(self.svgFigure, false, self.doc.couleurFond)
            self.outilActif.saveFig()
            self.activeOutilCapt()
          }
        }, false)
      }
    }
  }
}

/**
 * Fonction créant le cadre de sélection (qui commence toujours en haut et à gauche du SVG)
 * en lui donnant les dimensions comprises dans this.widthCadre et this.heightCadre
 */
MtgApp.prototype.createCadre = function createCadre (width, height, bVisible) {
  this.widthCadre = width
  this.heightCadre = height
  this.cadre = cens('rect', {
    x: 2,
    y: 2,
    width: width - 2,
    height: height - 2,
    rx: 4,
    ry: 4,
    style: 'fill:none;stroke:lightgrey;stroke-width:4;'
  })
  this.cadre.style.visibility = bVisible ? 'visible' : 'hidden'
  this.cadreVisible = bVisible
  this.svgFigure.insertBefore(this.cadre, this.doc.gTraces)
}

/**
 * Fonction montrant ou cachant le cadre de sélection
 * @param bVisible : true pour le rendre visible, false pour invisible
 */
MtgApp.prototype.montreCadre = function montreCadre (bVisible) {
  this.cadreVisible = bVisible
  this.cadre.style.visibility = bVisible ? 'visible' : 'hidden'
}

MtgApp.prototype.setCadreDim = function setCadreDim (width, height) {
  this.widthCadre = width
  this.heightCadre = height
  this.cadre.setAttribute('width', width)
  this.cadre.setAttribute('height', height)
}

MtgApp.prototype.deleteCadre = function deleteCadre () {
  this.svgFigure.removeChild(this.cadre)
  this.cadre = null
}

/**
 * Fonction créant la représentation de la figure dans un URI et une fois que c'est prêt appelant
 * la fonction de callBack() callBack avec comme paramètre le blob représentant l'image
 * @param {string} imageType  "png" ou "jpeg"
 * @param svg Le svg dans lequel se fait l'affichage
 * @param callBack La fonction de callBack
 * @param fileName Le nom du fichier pour l'enregistrement
 * @param {number} coefMult Le coefficient multiplicateur utilisé pour gagner (ou perdre ) en définition
 * @param {number}coef Coefficient d'agrandissement-réduction utilisé pour ,'exportation en pNG avec unité
 */
/* Abandonné
MtgApp.prototype.getImageBlobData = function(imageType, svg, fileName, callBack, coefMult, coef) {
  var dimf = this.dimf;
  var avecCadre = this.cadre !== null;
  // var coefMult = this.pref_coefMult; // Le coefficient multiplicateur pour la taille des images
  var w = (avecCadre ? this.widthCadre : dimf.x)*coefMult;
  var h = (avecCadre ? this.heightCadre : dimf.y)*coefMult;

  var canvas = ce("canvas", {
    width : w * coef, // On utilise round pour arrondir à la valeur entière la plus proche
    height : h * coef
    // style : "width:" + w + ";height:" + h
  });

  var ctx = canvas.getContext('2d');
  var data = (new XMLSerializer()).serializeToString(svg);
  var DOMURL = window.URL || window.webkitURL || window;
  var img = new Image();
  var svgBlob = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
  var url = DOMURL.createObjectURL(svgBlob);

  img.onload = function () {
    ctx.drawImage(img, 0, 0);
    DOMURL.revokeObjectURL(url);
    // callBack(canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream'));
    // callBack(fileName, canvas.toDataURL('image/png'));
    canvas.toBlob(
      function(blob) {
        callBack(fileName, blob);
      },
      "image/" + imageType
    )
  };

  img.src = url;
}
*/
/**
 * Fonction appelée par la version electron pour obtenir le codeBase64 correspondant à la figure en PNG
 * @param {string} imageType svg|png|jpeg (ou tout autre format dont le type mime image/{imageType} est géré nativement)
 * @param {number} [options.coefMult=1] Le coefficient multiplicateur utilisé pour gagner (ou perdre) en définition
 * @param {number} [options.coef=1] le coefficient d'agrandissement ou réduction utilisé pour l'exportation en PNG avec unité
 * @param {number} [options.format=base64] Préciser blob pour récupérer le Blob de l'image (du type demandé) ou dataUrl pour le code base64 avec son préfixe data: (qui peut alors être mis en propriété src d'une image). Attention, avec imageType svg blob est le seul format géré, tous les autres sont ignorés et le svg retourné sous sa forme texte
 * @param {function} callBack appelée avec l'image au format demandé
 * @returns {void}
 */
MtgApp.prototype.getBase64ImageData = function getBase64ImageData (imageType, options, callBack) {
  if (typeof options === 'function') {
    callBack = options
    options = {}
  }
  const { coefMult = 1, coef = 1, format = 'base64' } = options
  const doc = this.doc
  const listePr = this.listePr
  // Si un cadre a été choisi dans la figure et si la case à cocher est cochée, on enregistre la figure
  // avec les dimensions du cadre
  const avecCadre = this.cadre !== null
  const w = (avecCadre ? this.widthCadre : doc.dimf.x) * coefMult
  const h = (avecCadre ? this.heightCadre : doc.dimf.y) * coefMult
  const dimf = new Dimf(w, h)
  const svg = cens('svg', {
    width: w * coef,
    height: h * coef,
    viewBox: '0 0 ' + w + ' ' + h
  })
  /// /////////////////////////////////////////////////////////////////////////////////////////////////
  // Très important : Il faut cloner les defs de MathJax contenues dans le document pour que les LaTeX
  // puissent être tracés correctement
  /* Plus nécessaire version 6.4 avec MathJax 3
  var defs = document.getElementById("MathJax_SVG_glyphs");
  svg.appendChild(defs.cloneNode(true));
  */
  // Et il faut aussi cloner les pattern pour les remplissages de surface
  const defs = document.getElementById('mtg32_patterns')
  const defsclone = svg.appendChild(defs.cloneNode(true))
  // On remplace les patterns de remplissage par des deux fois plus gros pour exportation
  const coefarr = (coefMult < 1) ? 1 : Math.round(coefMult) // On arrondit à l'entier le plus proche si >= 1
  const dimRectPattern = String(coefarr * 6)
  for (const el of listePr.col) {
    if (el.estDeNature(NatObj.NSurface) && (el.pattern !== null)) {
      // Modification version 6.3.2 pour rendre le player compatible avec les hachures
      // var pattern = $(defsclone).children("#" + el.index + "mtg32pattern")[0];
      const pattern = $(defsclone).children('#' + listePr.id + el.index + 'mtg32pattern')[0]
      $(pattern).attr('width', dimRectPattern).attr('height', dimRectPattern)
      pattern.childNodes[0].setAttribute('d', el.getPattern(true, coefarr))
    }
  }
  /// /////////////////////////////////////////////////////////////////////////////////////////////////
  // Il faut cloner la liste principale car sinon on a des problèmes de rafraichissement des g elements
  // des objets graphiques
  // FIXME le paramètre listePr ci-dessous semble ne pas servir
  const list = new CListeObjets(listePr)
  list.isForExport = true // Sert à supprimer l'éditeur de l'export.
  this.listePr.setCopy(list)
  list.coefMult = coefMult // Utilisé pour la trace des points et des marques d'angles
  list.adaptRes(coefMult)
  list.positionne(false, dimf)
  // Pour les images dont la largeur ne dépend pas de la longueur unité (largeur nulle pour dimensions initiales
  // ou strictement négative pour des dimensions imposées en pixels, il faut adapter leurs dimensions au coefficient
  // multiplicateur utilisé
  list.adaptDimImagesRes(coefMult)
  list.setReady4MathJax(false, false)
  addQueue(function () {
    svg.appendChild(cens('rect', {
      width: '100%',
      height: '100%',
      fill: doc.couleurFond.rgb()
    }))
    if (doc.imageFond !== null) {
      const g = cens('image', {
        x: '0',
        y: '0',
        width: doc.widthImageFond * coefMult,
        height: doc.heightImageFond * coefMult
      })
      // g.setAttributeNS("http://www.w3.org/1999/xlink", "href", "data:image/png;base64," + base64Encode(doc.imageFond, true));
      g.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'data:image/' + imageType + ';base64,' + base64Encode(doc.imageFond, true))
      svg.appendChild(g)
    }
    const traces = doc.gTraces.cloneNode(true)
    $(traces).attr('transform', 'scale(' + coefMult + ')')
    svg.appendChild(traces)
    list.afficheToutForCopy(svg, doc.couleurFond) // On appelle afficheToutForCopy pour ne pas mettre dans le svg
    // les foreign objects qui ne sont pas acceptés
    // Version 4.6 : Pour que les patterns de remplissages restent les bons il faut les supprimer et les recréer
    empty(defs)
    for (const el of listePr.col) {
      if (el.estDeNature(NatObj.NSurface) && (el.pattern !== null)) el.createPattern()
    }

    // On supprime les pointer-events de la réprésentation de la figure
    const data = (new XMLSerializer())
      .serializeToString(svg)
      .replace(/pointer-events[ ]*=[ ]*(['"])none\1/g, '')
    // Si on veut l'exportation en svg tout est déjà dans data
    if (imageType === 'svg') {
      if (format === 'blob') {
        return callBack(new Blob([data], { type: 'image/svg+xml' }))
      }
      return callBack(data)
    }

    // sinon, on passe par un canvas pour utiliser ses méthodes toBlob ou toDataURL pour récupérer un blob ou le code base64
    const canvas = ce('canvas', {
      width: w * coef, // On utilise round pour arrondir à la valeur entière la plus proche
      height: h * coef
      // style : "width:" + w + ";height:" + h
    })

    const ctx = canvas.getContext('2d')
    const DOMURL = window.URL || window.webkitURL || window
    const img = new Image()
    const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
    const url = DOMURL.createObjectURL(svgBlob)
    img.onload = function () {
      ctx.drawImage(img, 0, 0)
      DOMURL.revokeObjectURL(url)
      if (format === 'blob') return canvas.toBlob(callBack, 'image/' + imageType)
      const dataUrl = canvas.toDataURL('image/' + imageType)
      if (format === 'dataUrl') return callBack(dataUrl)
      // sinon on retourne le code base64 seul
      callBack(dataUrl.replace(/^data:image\/\w+;base64,/, ''))
    }
    img.src = url
  })
}

/**
 * Retourne le blob de l'image
 * @param {string} imageType
 * @param {Object} options
 * @param {number} [options.coefMult=1] Le coefficient multiplicateur utilisé pour gagner (ou perdre) en définition
 * @param {number} [options.coef=1] le coefficient d'agrandissement ou réduction utilisé pour l'exportation en PNG avec unité
 * @returns {Promise<Blob, Error>}
 */
MtgApp.prototype.getBlobImage = function getBlobImage (imageType, options) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, format: 'blob' }
    this.getBase64ImageData(imageType, opts, function (blob) {
      if (blob) resolve(blob)
      reject(Error(getStr('ImageConversionError')))
    })
  })
}

// Les fonctions suivantes sont des fonctions uniquement utiles pour la version electron

/**
 * Fonction utilisée par electron et renvoyant un tableau d'entiers contenant le code binaire de la figure
 * @returns {number[]}
 */
MtgApp.prototype.getByteArrayCode = function getByteArrayCode () {
  const oups = new DataOutputStream()
  // Si un cadre a été choisi dans la figure et si la case à cocher est cochée, on enregistre la figure
  // avec les dimensions du cadre
  const doc = this.doc
  const olddimf = this.dimf
  const avecCadre = (this.cadre !== null)
  if (avecCadre) doc.dimf = new Dimf(this.widthCadre, this.heightCadre)
  doc.write(oups)
  doc.dimf = olddimf
  return oups.ba
}

/**
 * Fonction utilisée pour la version electron et renvoyant un tableau d'entiers contenant le code binaire du prototype n° ind de la figure
 * @param {number} ind
 * @returns {number[]}
 */
MtgApp.prototype.getProtoByteArrayCode = function getProtoByteArrayCode (ind) {
  const oups = new DataOutputStream()
  this.doc.tablePrototypes[ind].write(oups)
  return oups.ba
}

/**
 * Appellera cb quand tous les rendus seront terminés
 * @param {function} [cb] Si non fourni, ça retourne une promesse qui sera résolue quand l'appli est prête (tous les rendus lancés terminés)
 * @returns {Promise<void>|undefined}
 */
MtgApp.prototype.ready = function ready (cb) {
  if (!cb) return new Promise(resolve => addQueue(resolve))
  addQueue(cb)
}

/**
 * Fonction qui remet à jour les barres d'outils.
 * A appeler sur un resize de la fenêtre
 */
MtgApp.prototype.resetToolBars = function resetToolBars () {
  this.updateRightPanel()
  this.creeBoutonsOutils()
  this.creeExpandableBars()
  this.updateToolbar()
  this.updateToolsToolBar()
  this.activeOutilCapt()
}

/**
 * Lance le resize de l'éditeur (utiliser app.ready() pour savoir quand ce sera terminé)
 * @param {number} w Largeur de l'application
 * @param {number} h Hauteur de l'application
 * @param {boolean} force si true on reprend les mêmes dimensions pour l'appli mais
 * on redimensionne les svg en tenant compte de doc.dimMinFig
 * @returns {void}
 */
MtgApp.prototype.resize = function resize (w, h, force = false) {
  if (!force) {
    if (w === this.wr && h === this.hr) return
  } else {
    w = this.wr
    h = this.hr
  }
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 100 || h < 100) return console.error(Error(`valeurs de resize incorrectes (${w}×${h})`))
  // on utilise addQueue pour ne lancer un resize que entre deux rendus LaTeX, jamais pendant
  addQueue(() => {
    // On mémorise les dimensions pour ne pas rappeler la fonction si elles sont les mêmes
    // Cela arrive pour la version electron
    this.wr = w
    this.hr = h
    const doc = this.doc
    const svg = this.svg
    const svgFig = this.svgFigure
    this.setZoomFactor(w, h)
    const zf = this.zoomFactor
    const sizeStyle = { width: `${w}px`, height: `${h}px` }
    const sizeAttrs = { width: String(w), height: String(h) }
    const div = svg.containerDiv // Le div parent
    setStyle(div, sizeStyle)
    // pour le svg il faut fixer les attributs ET le style, sinon ça reste tronqué à droite
    setAttrs(svg, sizeAttrs)
    setStyle(svg, sizeStyle)
    const widthForFig = Math.floor(w - constantes.svgPanelWidth * zf - constantes.rightPanelWidth * zf)
    const heightForFig = Math.floor(h - constantes.topIconSize * zf)
    // Dimensions de la partie visible de la figure
    this.svgFigure.dimWork = new Dimf(widthForFig, heightForFig) // Utilisé pour les barres de boutons + - = assoxciés à des variables
    // On remet à jour le cadre de sélection
    const hasCadre = this.cadreVisible
    if (this.cadre) this.deleteCadre()
    this.widthCadre = svgFig.dimWork.x - 24
    this.heightCadre = svgFig.dimWork.y - 24
    this.createCadre(this.widthCadre, this.heightCadre, hasCadre)
    // On retire 4 pixels à la largeur et hauteur des svg car sinon on a des barres d'ascenseurs
    // inutiles
    const svgWidth = Math.max(widthForFig, doc.dimMinFig.x) - 4
    const svgHeight = Math.max(heightForFig, doc.dimMinFig.y) - 4
    const svgGlob = this.svgGlob
    // Il faut replacer le svgGlobal pour tenir compte du changement de tailles des icônes du bas et du haut
    // Version 9 : c'est le this.foreignElt qu'il faut replacer
    const attrForeignElt = {
      x: String(constantes.svgPanelWidth * zf),
      y: String(constantes.toolbarHeight * zf),
      width: widthForFig,
      height: heightForFig,
      style: 'padding:0px;border:0px;pointer-events:all;overflow:auto;'
    }
    // this.figContainer est un div et son parent est un foreign object
    setAttrs(this.figContainer.parentElement, attrForeignElt)
    const attrDivFigGontainer = {
      width: widthForFig,
      height: heightForFig,
      style: `padding:0px;border:0px;overflow:auto;pointer-events:all;width:${widthForFig}px;height:${heightForFig}px;`
    }
    setAttrs(this.figContainer, attrDivFigGontainer)
    const attrSvg = {
      width: svgWidth,
      height: svgHeight
    }
    setAttrs(svgGlob, attrSvg)
    setAttrs(svgFig, attrSvg)
    const rightPanel = this.rightPanel
    const attrRightPanel = {
      x: String(w - constantes.rightPanelWidth * zf),
      y: String(constantes.toolbarHeight * zf + 26),
      width: String(constantes.rightPanelWidth * zf),
      height: String(h - constantes.topIconSize * zf)
    }
    setAttrs(rightPanel, attrRightPanel)
    setAttrs(this.svgPanel, sizeAttrs)
    const attrToolbar = {
      x: String(constantes.svgPanelWidth * zf),
      y: 0,
      width: w,
      height: constantes.toolbarHeight * zf
    }
    setAttrs(this.toolBar, attrToolbar)
    this.resetToolBars()
    this.dimf = new Dimf(svgWidth, svgHeight)
    doc.dimf = this.dimf
    setStyle(this.divDlg, sizeStyle)
    // Si les outils supplémentaires de la barre horizontale sont visibles
    // il faut recréer les icônes pour les replacer correctement
    if (this.svgToolsAdd !== null) {
      this.svg.removeChild(this.svgToolsAdd)
      this.addToolsSup()
    }
    this.nameEditor.montre(false) // Des fois qu'un nom soit en cours d'édition
    const list = this.listePr
    list.positionne(false, this.dimf)
    list.update(svgFig, doc.couleurFond, true)
    // On met à jour les foreing Objects éventuels associés à des variables.
    list.removePaneVariables()
    list.creePaneVariables()
  })
}

/**
 * Fonction redimensionnant les svg de la figure pour tenir compte des éventuelFmonles dimensions
 * minimales demandées pour la figure
 */
MtgApp.prototype.resizeSvgFig = function () {
  // Si resize n'a pas déjà été appelé il faut déterminer les dimensions du svg global
  // contenant l'interface de l'application
  if (!this.wr || !this.hr) {
    this.wr = Number(this.svg.getAttribute('width'))
    this.hr = Number(this.svg.getAttribute('height'))
  }
  // Quand cette fonction est créée, c'est-à-dure quand on crée une nouvelle figure
  // le cadre de sélection doit être recréé
  this.cadre = null
  this.resize(this.wr, this.hr, true)
}

MtgApp.prototype.addToolsSup = function addToolsSup () {
  // A revoir une fois les constructions au point
  const toolsNameArray = ['CreationConst', 'GestionConst', 'TaillePlus', 'TailleMoins', 'ReclassDebObjGra', 'ReclassFinObjGra']
  // var toolsNameArray = ["CopierStyle", "TaillePlus", "TailleMoins", "ReclassDebObjGra", "ReclassFinObjGra"];
  const svg = this.svg
  const zoomFactor = this.zoomFactor
  const nbIcones = toolsNameArray.length
  const width = parseFloat(svg.getAttribute('width'))
  const iconSize = constantes.topIconSize
  const w = nbIcones * (iconSize + 2) * zoomFactor
  const h = constantes.topIconSize * zoomFactor
  this.svgToolsAdd = cens('svg', {
    id: 'svgToolsAdd',
    width: w,
    height: h,
    x: width - w,
    y: iconSize * zoomFactor + 26
  })
  svg.appendChild(this.svgToolsAdd)
  this.svgToolsAdd.style.cursor = 'default'
  for (let row = 0; row < nbIcones; row++) {
    const toolName = toolsNameArray[row]
    const button = new ButtonTool(this, toolName, 'float', false, row)
    this['button' + toolName] = button
    this.svgToolsAdd.appendChild(button.container)
  }
  this.buttonModePointsAuto.activate(this.pref_PointsAuto)
}

/**
 * Fonction ajoutant à listePr un segment d'extrémités pt1 et pt2 dans les styles actifs
 * à condition qu'un tel objet n'ait pas déjà été défini
 * @param {CPt} pt1
 * @param {CPt} pt2
 */
MtgApp.prototype.addSegment = function addSegment (pt1, pt2) {
  const li = this.listePr
  const seg = new CSegment(li, null, false, this.getCouleur(), false, this.getStyleTrait(), pt1, pt2)
  seg.positionne(false, this.dimf)
  if (!this.existeDeja(seg)) li.add(seg)
}

MtgApp.prototype.addPolygon = function addPolygon () {
  const li = this.listePr
  const colPt = []
  for (let i = 0; i < arguments.length; i++) {
    const pt = arguments[i]
    colPt.push(new CNoeudPointeurSurPoint(li, pt))
  }
  const poly = new CPolygone(li, null, false, this.getCouleur(), false, this.getStyleTrait(), colPt)
  poly.positionne(false, this.dimf)
  if (!this.existeDeja(poly)) li.add(poly)
}

MtgApp.prototype.creeDefs = function creeDefs () {
  // Création du linear  Gradiant pour les boutons
  let defs = cens('defs', {
    id: 'mtg32_defs'
  })
  const lg = cens('linearGradient', {
    id: 'arrowGrad',
    x1: '0%',
    y1: '50%',
    x2: '100%',
    y2: '50%'
  })
  let stop = cens('stop', {
    offset: '0%',
    style: 'stop-color:#0000FF;stop-opacity:0.6'
  })
  lg.appendChild(stop)
  stop = cens('stop', {
    offset: '100%',
    style: 'stop-color:#CEF6F5;stop-opacity:0.4'
  })
  lg.appendChild(stop)
  defs.appendChild(lg)

  let rg = cens('radialGradient', {
    id: 'buttonGrad',
    r: '100%'
  })
  stop = cens('stop', {
    offset: '0%',
    style: 'stop-color:#0000FF;stop-opacity:0'
  })
  rg.appendChild(stop)
  stop = cens('stop', {
    offset: '100%',
    style: 'stop-color:#0000FF;stop-opacity:0.2'
  })
  rg.appendChild(stop)
  defs.appendChild(rg)
  rg = cens('radialGradient', {
    id: 'buttonGradAct',
    r: '100%'
  })
  stop = cens('stop', {
    offset: '2%',
    style: 'stop-color:#0000FF;stop-opacity:0'
  })
  rg.appendChild(stop)
  stop = cens('stop', {
    offset: '100%',
    style: 'stop-color:#0000FF;stop-opacity:0.5'
  })
  rg.appendChild(stop)
  defs.appendChild(rg)
  // Création d'un radial gradiant pour les boutons des sliders
  rg = cens('radialGradient', {
    id: 'sliderGrad',
    r: '100%'
  })
  stop = cens('stop', {
    offset: '0%',
    style: 'stop-color:#9B9EFC;'
  })
  rg.appendChild(stop)
  stop = cens('stop', {
    offset: '100%',
    style: 'stop-color:#0000FF;'
  })
  rg.appendChild(stop)
  defs.appendChild(rg)
  this.svg.appendChild(defs)
  // un defs pour contenir les patterns de remplissages pour les surfaces avec quadrillage
  defs = cens('defs', {
    id: 'mtg32_patterns'
  })
  this.svg.appendChild(defs)
}

/**
 * Fonction servant à relâcher les sliders de la barre de droite s'ils sont ^présents
 */
MtgApp.prototype.releaseSliders = function releaseSliders () {
  if (this.thicknessSlider) this.thicknessSlider.captured = false
  if (this.opacitySlider) this.opacitySlider.captured = false
}

/**
 * Fonction vérifiant si le dernier élément de la liste est confondu avec un objet déjà créé
 * sachant que si c'est le cas il faut retirer les nbOjetsAjoutes derniers objets de la liste.
 * Si on ne trouve pas d'élément confondu, les nbObjetsAjoutes derniers objets sont positioonés
 * @param {number} nbObjetsAjoutes
 * @returns {boolean}
 */
MtgApp.prototype.verifieDernierElement = function verifieDernierElement (nbObjetsAjoutes) {
  const list = this.listePr
  const len = list.longueur()
  const der = list.get(len - 1)
  // Avant la vérification il faut positionner les derniers éléments ajoutés à la liste
  for (let i = 0; i < nbObjetsAjoutes; i++) {
    const ob = list.get(len - nbObjetsAjoutes + i)
    ob.positionne(false, this.dimf)
  }
  if (this.existeDeja(der)) {
    list.retireNDerniersElements(nbObjetsAjoutes)
    if (this.estExercice) this.listePourConst.retireNDerniersElements(nbObjetsAjoutes)
    this.nameEditor.montre(false)
    return false
  }
  return true
}
/**
 *
 * @param {CPt} pt
 * @param {boolean} [bRemovegElements=true]
 */
MtgApp.prototype.detruitDependants = function detruitDependants (pt, bRemovegElements = true) {
  this.listePr.detruitDependants(pt, this.svgFigure, bRemovegElements)
  if (this.estExercice) this.listePourConst = this.listePourConstruction()
}

/**
 * Fonction détruisant les constructions itératives ou récursives de la figure dépendant du prototype prot
 * @param {CPrototype} proto
 */
MtgApp.prototype.detruitDepProto = function detruitDepProto (proto) {
  for (const el of this.listePr.col) {
    if (el.depDeProto(proto)) this.detruitDependants(el, true)
  }
  this.reCreateDisplay()
}

/**
 * Fonction retirant toutes les définitions de quadrillages associés à des surfaces
 */
MtgApp.prototype.removeSurfacePatterns = function removeSurfacePatterns () {
  const defs = ge('mtg32_patterns')
  empty(defs)
  for (const el of this.listePr.col) {
    if (el.estDeNature(NatObj.NSurface)) el.pattern = null
  }
}

/**
 * Retourne l'id de la boite de dialogue courante (celle du dessus)
 * (utile pour avertDialog, pour éviter de réafficher deux fois le même message d'erreur sur un double clic par ex)
 * @returns {string} vide si y'a pas de boite de dialogue ouverte
 */
MtgApp.prototype.lastDlgId = function lastDlgId () {
  if (this.dlg.length > 0) return this.dlg[this.dlg.length - 1]
  return ''
}
/**
 *
 * @param {boolean} bVisible
 */
MtgApp.prototype.showStopButton = function showStopButton (bVisible) {
  $(this.stopButton.container).attr('visibility', bVisible ? 'visible' : 'hidden')
}

/**
 * Lance l'affichage en haut et à droite d'un message d'indication correspondant à getStr(ch), pendant 6s
 * Si le paramètre prech est présent, getStr(prech) est affiché devant getStr(ch) avec : entre les deux
 * Utiliser app.ready() pour savoir quand l'indication est effectivement affichée
 * @param {string} textCode
 * @param {string} [preTextCode='']
 * @param {boolean} [bstraight=false] Si true on n'utilise pas getStr(textCode) et on utilise directement textCode
 * @returns {void}
 */
MtgApp.prototype.indication = function indication (textCode, preTextCode = '', bstraight = false) {
  let st = bstraight ? textCode : getStr(textCode)
  if (st === '') {
    this.lastindch = '' // Pour les outils qui n'ont pas d'indication fugitive
    this.effaceIndication()
    return
  }
  //
  if (preTextCode) st = getStr(preTextCode) + ' : ' + st
  // Sur la version electron, quand on appuie sur F10 cela réaffiche la dernière indication
  // Modifié version 6.9.0 pas besoin de mémoriser prech
  // Quand on appelera lastIndication() ce sera avec bstraight = true et la même chose sera réaffichée.
  this.lastindch = st
  this.effaceIndication()
  const CAlp = CAffLiePt
  // Attention : ci-dessous pour positionner le commentaire d'indication il faut se servir des dimensions
  // de travail de la figure (la partie visible quand les ascenseurs sont au zéro).
  // Ces dimensions sont dans this.svgFigure.dimWork
  const comm = new CCommentaire(this.listePr, null, false, Color.blue, this.svgFigure.dimWork.x - 30, 5, 0, 0, false, null,
    this.dys ? 20 : 15, StyleEncadrement.Simple, true, new Color(204, 204, 255), CAlp.alignHorRight, CAlp.alignVerTop,
    st, new CValeurAngle(this.listePr, 0))
  comm.positionne(false, this.dimf)
  // Version 6.8.1 : On délègue l'affichage de l'indication à la pile d'appels
  // Version 6.9 : Un double appel de addQueue pour que l'affichage se fasse après celui de la figure au démarrage
  addQueue(() => {
    addQueue(() => {
      if (this.comm !== null) this.effaceIndication()
      this.comm = comm
      comm.affiche(this.svgFigure, true, this.doc.couleurFond)
      $(comm.g.childNodes[0]).attr('rx', 10)
      $(comm.g.childNodes[0]).attr('ry', 5)
      // Version 6.8.1 : plus de try catch car removegElement a été sécurisé
      setTimeout(() => comm.removegElement(this.svgFigure), 6000) // on vire l'indication après 6s
    })
  })
}

MtgApp.prototype.lastIndication = function lastIndication () {
  this.indication(this.lastindch, '', true)
}

MtgApp.prototype.effaceIndication = function effaceIndication () {
  if ((this.comm !== null) && this.comm.g) {
    if (this.comm.g.parentElement === this.svgFigure) this.comm.removegElement(this.svgFigure)
  }
  this.comm = null
}
/**
 *
 * @param {string} toolName
 */
MtgApp.prototype.selectTool = function selectTool (toolName) {
  const name = 'outil' + toolName
  // Modification version 6.4.8 pour qu'on en puisse pas activer un outil si la figure a été bloquée
  // par un setAtive(fals)
  const tool = this[name]
  const activationPossible = (this.doc.isActive) || (toolName === 'Capt' || toolName === 'Protocole')
  if (activationPossible && tool.activationValide()) {
    if (tool.isSelectable) this.outilActif.deselect() // Par exemple les outils de zoom ne déscativent pas l'outil actif
    tool.select()
    const eb = tool.expandableBar
    if (eb) {
      eb.activeToolName = name.substring(5) // Ce qui suit outil
      eb.updateActiveTools()
      eb.updateActiveIcon(eb.row)
    }
    this.nameEditor.montre(false) // Des fois qu'un nom soit en cours d'édition
  }
}

/**
 * Fonction appelée par les raccourcis claviers.
 * N'active l'outil que s'il est disponible
 * @param toolName
 */
MtgApp.prototype.selectToolIfAvailable = function selectToolIfAvailable (toolName) {
  const name = 'outil' + toolName
  // Modification version 6.4.8 pour qu'on en puisse pas activer un outil si la figure a été bloquée
  // par un setAtive(fals)
  const tool = this[name]
  if (this.doc.toolDispo(tool.toolIndex) && this.level.toolDispo(tool.toolIndex)) {
    this.selectTool(toolName)
  }
}
/**
 * Active l'outil capture (désactive l'outil actif avant)
 */
MtgApp.prototype.activeOutilCapt = function activeOutilCapt () {
  // Modification version 6.3.3 pour pouvoir activer directement l'outil précédent.
  this.outilActif.deselect()
  this.outilCapt.select()
}
/**
 * Active l'outil précédemment sélectionné
 * @since version 6.3.3
 */
MtgApp.prototype.activeOutilPrec = function activeOutilPrec () {
  // Ne pas appeler si une boîte de dialogue est ouverte !
  if ((this.dlg.length === 0) && this.outilActifPrec.activationValide()) {
    this.outilActif.deselect()
    this.outilActifPrec.select()
  }
}

/**
 * Appelée dans la version electron par les raccourcis clavier
 * Active l'outil ainsi que son icône dans sa barre d'outils
 * @param {string} toolName
 */
MtgApp.prototype.activateTool = function activateTool (toolName) {
  const name = 'outil' + toolName
  if (this[name].activationValide()) {
    this.nameEditor.montre(false) // Des fois qu'un nom soit en cours d'édition
    this.outilActif.deselect() // Par exemple les outils de zoom ne déscativent pas l'outil actif
    this[name].select()
    let row = 0
    for (let i = 0; i < this.expandableBars.length; i++) {
      const b = this.expandableBars[i]
      if (b.tools.length !== 0) {
        if (b.tools.indexOf(toolName) !== -1) {
          b.activeToolName = toolName
          b.updateActiveIcon(row)
          break
        }
        row++
      }
    }

    // this.unFoldExpandableBars();
    // this.updateActiveIcons();
  }
}

/**
 * Fonction testant si un objet équivalent à l'objet el a déja été créé. Si oui renvoie l'objet existant déjà
 * Sinon renvoie null
 * @param {CElementBase} el
 * @returns {CElementBase|null}
 */
MtgApp.prototype.objetDejaCree = function objetDejaCree (el) {
  const list = this.listePr
  for (let i = this.estExercice ? this.nbObjInit : 0; (i < list.longueur()); i++) {
    const elb = list.get(i)
    if ((elb.className === el.className) && !elb.estElementIntermediaire() && (elb !== el) && elb.confonduAvec(el)) { return elb }
  }
  return null
}

/**
 * Fonction renvoyant true si l'objet el a déjà été créé
 * S'il s'agit d'un exercice de construction on autorise la création d'un objet déjà présent
 * dans la figure au début de l'exercice.
 * @param {CElementBase} el
 * @returns {boolean}
 */
MtgApp.prototype.existeDeja = function existeDeja (el) {
  return this.objetDejaCree(el) !== null
}

MtgApp.prototype.copyFig = function copyFig () {
  // pour que la suite fonctionne sous safari|iPad, il faut que toute la chaîne de promesses
  // soit dans le listener d'une "user gesture" (sans callback async au milieu)
  // Visiblement l'important est que le clipboard.write soit appelé en sync avec le click
  // mais on peut passer une promesse de blob plutôt qu'un blob à un new ClipboardItem
  const blobPromised = this.getBlobImage('png')
  // Créer un élément ClipboardItem à partir d'une promesse de Blob
  const clipboardItem = new ClipboardItem({ 'image/png': blobPromised })
  // et on peut copier dans le presse-papiers
  navigator.clipboard.write([clipboardItem])
    .then(() => {
      toast({ title: 'CopyOk' })
    })
    .catch((error) => {
      this._clipboardCopyErrorHandler(clipboardItem, error)
    })
}

/**
 * Affiche une boite de dialogue supplémentaire en cas d'erreur connue sur apple (pb de listener async avec une copie dans le presse papier qui exige un appel sync de clipboard.write)
 * À priori on ne devrait plus en avoir besoin, mais on le laisse (2025-03-05) quelques temps
 * @todo virer cette méthode si y'a pas de notify bugsnag pendant qq semaines
 * @param clipboardItem
 * @param error
 * @private
 */
MtgApp.prototype._clipboardCopyErrorHandler = function _clipboardCopyErrorHandler (clipboardItem, error) {
  // Sous safari (ou iPad/chrome) on récupérait l'erreur
  // The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission
  // dans ce cas faut créer un nouveau listener d'une "user gesture", ici un clic
  if (/not allowed/i.test(error.message) && clipboardItem) {
    notify(Error(`On a une erreur "${error.message} alors qu’on est sensé ne faire que des appels sync de clipboard.write"`))
    toast({ title: 'Après not allowed', message: error.stack })
    const cbOk = () => {
      navigator.clipboard.write([clipboardItem])
        .then(() => {
          toast({ title: 'CopyOk' })
        })
        .catch((error) => {
          toast({ title: 'CopyKo', message: error.message, type: 'error' })
        })
    }
    const cbKo = () => {
      toast({ title: 'CopyCanceled', type: 'info' })
    }
    new ConfirmDlg(this, 'Copy', cbOk, cbKo)
  } else {
    toast({ title: 'CopyKo', message: error.message, type: 'error' })
  }
}

MtgApp.prototype.reInitConst = function reInitConst () {
  if (!this.estExercice) {
    this.listeSrcG.retireTout()
    this.listeSrcNG.retireTout()
    this.listeFinG.retireTout()
    this.listeFinNG.retireTout()
  }
}

/**
 * Fonction recréant un nouveau document
 */
MtgApp.prototype.resetDoc = function resetDoc () {
  // var doc = new CMathGraphDoc(this.id + "figurePanel", true, true); // Modifié version 6.3.0
  const doc = new CMathGraphDoc(this.id, true, true, this.decimalDot)
  this.doc = doc
  // Ligne suivante nécessaire pour que les macros d'activation et désactivation du mode trace activent ou non
  // l'icône correspondante
  doc.app = this
  this.listePr = doc.listePr
  // Pour la figure précédente on peut avoir demandé des dimensions minimales pour la figure.
  // Il faut revenir aux dimensions de base quand on crée une nouvelle figure c'es-à-dire
  // restreinte à la place disponible par défaut
  this.dimf = this.svgFigure.dimWork
  doc.dimf = this.dimf
  this.listePourConst = this.listePourConstruction()
}

MtgApp.prototype.getResult = function getResult () {
  const ch = this.getBase64Code()
  let score
  if (this.estExercice) {
    if (this.validateAnswer()) score = 1
    else score = 0
  }
  return {
    fig: ch,
    score,
    level: this.levelIndex,
    dys: this.dys,
    nbObjInit: this.editionConstruction ? this.listePr.longueur() : this.nbObj
  }
}

/**
 * Fonction enlevant toutes les icones de la barre d'outil supérieure et les remplaçant par des icônes adaptées
 * au niveau d'utilisation en cours
 */
MtgApp.prototype.updateToolbar = function updateToolbar () {
  // const doc = this.doc
  // Si le document a des choix d'outils c'est selon lui qu'on choisit les outils
  // sinon c'est avec le niveau choisi
  /* Rectification version 8.2 on n'a pas à tenir compte du niveau pour les icônes de la barre horizontale et,
  de plus, si on avait coché la case aux outils permis et sélectionné aucun outil tous les outils de la barre
  horizontale étaient présents puisque, dans ce cas this.doc.listeIdMenus.length > 0 est false et dans
  le cas où dans this.level, on a choisi que les outils de la liste sont les outils interdits
  if (this.doc.listeIdMenus.length > 0) {
    doc = this.doc
  } else {
    doc = this.level
  }
   */
  // Version 8.5 : il faut regarder si le doc a dans sa liste des items permis ou interdits un des items
  // qui sont paramétrables dans la barre d'outils horizontale
  // Si oui il faudra en tenir compte sinon on se référera au fichier de niveau pour les outils de la barre horizontale
  const tab = ['ModifObjGraph', 'ZoomPlus', 'ZoomMoins', 'ModifObjNum', 'Palette', 'CopierStyle', 'ModeTrace', 'UseLens', 'ModePointsAuto', 'Recalculer', 'Gomme', 'Rideau',
    'TranslationFigure', 'ModeAutoComplete', 'ExecutionMacro', 'Protocole', 'Help', 'ToggleToolsAdd']
  const size = tab.length
  let nbOutilsParamBarreHor = 0
  for (let i = 0; i < size; i++) {
    // Attention : pour les exercices de construction certains des outils ci-dessus peuvent ne pas exister
    const tool = this['outil' + tab[i]]
    if (tool) {
      const id = tool.toolIndex
      if (this.doc.listeIdMenus.includes(id)) {
        nbOutilsParamBarreHor++
      }
    }
  }
  // Le seul cas où on se réfère au fichier de niveau pour savoir su certains outils sont disponibles ou pas
  // est le cas où le document spécifie qu'aucun outil n'est interdit sinon on se réfère au document actif
  const doc = ((nbOutilsParamBarreHor > 0) || (nbOutilsParamBarreHor === 0 && !this.doc.itemsCochesInterdits)) ? this.doc : this.level
  const toolBar = this.toolBar
  const estExercice = this.estExercice
  // On détruit les icônes précédentes
  while (toolBar.childNodes.length !== 0) toolBar.removeChild(toolBar.childNodes[0])
  //
  let indOutil = 0
  this.buttonLastInd = new ButtonTool(this, 'LastInd', 'top', false, indOutil++)
  this.buttonNew = new ButtonTool(this, 'New', 'top', false, this.newFig ? indOutil++ : -1)
  const b = !estExercice && window.File && window.FileReader && window.FileList && window.Blob
  this.buttonOpen = new ButtonTool(this, 'Open', 'top', false, this.open && b ? indOutil++ : -1)
  // this.buttonSave = new ButtonTool(this, "Save", "top", false, this.save && b ? indOutil++ : -1);
  this.buttonSave = new ButtonTool(this, 'Save', 'top', false, this.save ? indOutil++ : -1)
  this.buttonAnnuler = new ButtonTool(this, 'Annuler', 'top', false, indOutil++)
  this.buttonRefaire = new ButtonTool(this, 'Refaire', 'top', false, indOutil++)
  this.buttonSup = new ButtonTool(this, 'Sup', 'top', false, indOutil++)
  this.buttonModifObjGraph = new ButtonTool(this, 'ModifObjGraph', 'top', false, doc.toolDispo(this.outilModifObjGraph.toolIndex) ? indOutil++ : -1)
  this.buttonZoomPlus = new ButtonTool(this, 'ZoomPlus', 'top', false, doc.toolDispo(this.outilZoomPlus.toolIndex) ? indOutil++ : -1)
  this.buttonZoomMoins = new ButtonTool(this, 'ZoomMoins', 'top', false, doc.toolDispo(this.outilZoomMoins.toolIndex) ? indOutil++ : -1)
  this.buttonTranslationFigure = new ButtonTool(this, 'TranslationFigure', 'top', false, !this.translatable && doc.toolDispo(this.outilTranslationFigure.toolIndex) ? indOutil++ : -1)
  this.buttonModifObjNum = new ButtonTool(this, 'ModifObjNum', 'top', false, doc.toolDispo(this.outilModifObjNum.toolIndex) ? indOutil++ : -1)
  this.buttonPalette = new ButtonTool(this, 'Palette', 'top', false, doc.toolDispo(this.outilPalette.toolIndex) ? indOutil++ : -1)
  this.buttonCopierStyle = new ButtonTool(this, 'CopierStyle', 'top', false, doc.toolDispo(this.outilCopierStyle.toolIndex) ? indOutil++ : -1)
  this.buttonNommer = new ButtonTool(this, 'Nommer', 'top', false, indOutil++)
  this.buttonCaptNom = new ButtonTool(this, 'CaptNom', 'top', false, indOutil++)
  // En mode exercice on n'affiche pas les 3 boutons suivants mais on les crée pour qu'ils soient dispo dans le choix des options
  this.buttonModeTrace = new ButtonTool(this, 'ModeTrace', 'top', false, !estExercice && doc.toolDispo(this.outilModeTrace.toolIndex) ? indOutil++ : -1)
  this.buttonModePointsAuto = new ButtonTool(this, 'ModePointsAuto', 'top', false, !estExercice && doc.toolDispo(this.outilModePointsAuto.toolIndex) ? indOutil++ : -1)
  this.buttonRecalculer = new ButtonTool(this, 'Recalculer', 'top', false, !estExercice && doc.toolDispo(this.outilRecalculer.toolIndex) ? indOutil++ : -1)
  // Fin
  this.buttonUseLens = new ButtonTool(this, 'UseLens', 'top', false, doc.toolDispo(this.outilUseLens.toolIndex) ? indOutil++ : -1)
  this.buttonGomme = new ButtonTool(this, 'Gomme', 'top', false, doc.toolDispo(this.outilGomme.toolIndex) ? indOutil++ : -1)
  this.buttonRideau = new ButtonTool(this, 'Rideau', 'top', false, doc.toolDispo(this.outilRideau.toolIndex) ? indOutil++ : -1)
  // Bouton ci-dessous pas en mode exercice de construction
  this.buttonModeAutoComplete = new ButtonTool(this, 'ModeAutoComplete', 'top', false, !estExercice && doc.toolDispo(this.outilModeAutoComplete.toolIndex) ? indOutil++ : -1)
  this.buttonExecutionMacro = new ButtonTool(this, 'ExecutionMacro', 'top', false, doc.toolDispo(this.outilExecutionMacro.toolIndex) ? indOutil++ : -1)
  // Bouton ci-dessous pas en mode exercice de construction
  this.buttonModeSelectRect = new ButtonTool(this, 'ModeSelectRect', 'top', false, !estExercice ? indOutil++ : -1)
  // En mode exercice on n'active pas le bouton d'exportation
  this.buttonExport = new ButtonTool(this, 'Export', 'top', false, !estExercice ? indOutil++ : -1)
  // this.buttonProtocole = new ButtonTool(this, "Protocole", "top", false, doc.toolDispo(this.outilProtocole.toolIndex) ? indOutil++ : -1);
  this.buttonProtocole = new ButtonTool(this, 'Protocole', 'top', false, this.forceProtocol || this.modeBilan || doc.toolDispo(this.outilProtocole.toolIndex) ? indOutil++ : -1)
  // En mode exercice on n'active pas le bouton d'aide
  // Version 9.3 : On n'active pas l'icône d'aide pour la version electron
  // pour diminuer le nombre d'icônes néanmoins l'aide reste accessible dans la version electron
  // via la touche F1 (qui ne marche pas dans la version en ligne)
  if (!this.electron && !this.pwa) this.buttonHelp = new ButtonTool(this, 'Help', 'top', false, !estExercice ? indOutil++ : -1)
  this.buttonOptionsFig = new ButtonTool(this, 'OptionsFig', 'top', false, this.options ? indOutil++ : -1)
  // En mode exercice on n'affiche pas le bouton Outils supplémentaires
  this.buttonToggleToolsAdd = new ButtonTool(this, 'ToggleToolsAdd', 'top', false, !estExercice ? (doc.toolDispo(this.outilToggleToolsAdd.toolIndex) ? indOutil : -1) : -1)
  if (doc.modeTraceActive) this.buttonModeTrace.activate(true)
  this.buttonModePointsAuto.activate(this.pref_PointsAuto)
  this.buttonModeAutoComplete.activate(this.autoComplete)
  this.buttonUseLens.activate(this.useLens)
}

/**
 * Fonction utilisée pour les corrections d'exercices de construction sous j3P et n'ajoutant que l'outil de protocole
 * dans la barre d'outils horizontale.
 */
MtgApp.prototype.updateToolbarForCor = function updateToolbarForCor () {
  const toolBar = this.toolBar
  // On détruit les icônes précédentes
  while (toolBar.childNodes.length !== 0) toolBar.removeChild(toolBar.childNodes[0])
  this.buttonProtocole = new ButtonTool(this, 'Protocole', 'top', false, 0)
}

/**
 * Fonction qui, si on a un exercice de construction, c'est-à dire une macro d'apparition d'initulé #Solution
 * et si le commentaire de cette macro commence par #Enonce, ce qui signifie que la figure contient un énoncé
 * qui doit être le dernier affichage de texte ou LaTeX de la figure initiale, renvoie un pointeur sur cet
 * affichage LaTeX.
 * Renvoie null s'il n'y en a pas.
 * On s'arrangera pour que le g element de cet affichage soit toujours le dernier à chaque action sur la figure.
 * @returns {CElementBase|null}
 */
MtgApp.prototype.getEnonce = function getEnonce () {
  if (this.estExercice) {
    const mac = this.macroPourConst
    if (mac.commentaireMacro.indexOf('#Enonce') !== -1) {
      const list = this.listePr
      for (let i = list.longueur() - 1; i >= 0; i--) {
        const el = list.get(i)
        if (el.estDeNature(Nat.or(NatObj.NCommentaire, NatObj.NLatex))) {
          return el
        }
      }
    }
  }
  return null
}

/**
 * Fonction utilisée pour la correction des exerices de construction pour que le prof puisse capturer un point mobile
 * et voir comment la figure a été faite par l'élève
 */
MtgApp.prototype.activateForCor = function activateForCor () {
  this.activeOutilCapt()
  this.doc.setIdMenus(this, false, [33023, 32892], 3)
  this.updateToolsToolBar()
  this.updateToolbarForCor()
}

/**
 * Fonction qui, pour un exercice de construction, renvoie le nombre d'objets qu'a créés l'élève.
 * @returns {number}
 */
MtgApp.prototype.getNbObjConst = function getNbObjConst () {
  if (this.estExercice) {
    const list = this.listePr
    let compt = 0
    for (let i = this.nbObjInit; i < list.longueur(); i++) {
      const el = list.get(i)
      if (el.estDeNature(NatObj.NTtObj) && !el.estElementIntermediaire() && !el.masque) compt++
    }
    return compt
  }
  return 0
}

/**
 * Désactive une éventuelle macro en cours d'exécution
 * @since version 6.4
 */
MtgApp.prototype.termineMacroEnCours = function termineMacroEnCours () {
  const list = this.listePr
  const mac = list.macroEnCours
  if (mac !== null) {
    const macEnCours = mac.macroEnCours()
    const doc = this.doc
    if (macEnCours !== null) {
      list.terminerMacros = true // Utilisé dans CMacro.passageMacroSuivante
      macEnCours.termineAction(this.svgFigure, this.dimf, doc.couleurFond)
      macEnCours.executionEnCours = false
      if (mac.macroLanceuse !== null) mac.macroLanceuse.termineAction(this.svgFigure, this.dimf, doc.couleurFond)
    }
    list.macroEnCours = null
  }
}

/**
 * Fonction retirant les éventuels petits div associés à des variables en bas et à droite de la figure
 */
MtgApp.prototype.removePaneVariables = function removePaneVariables () {
  this.listePr.removePaneVariables()
}

/**
 * Renvoie la liste CListeObjets contenant les objets du document.
 * @returns {CListeObjets}
 */
MtgApp.prototype.getList = function getList () {
  return this.doc.listePr
}
/**
 * Fonction destinée à mettre une fonction sur la pile des appels.
 * A utiliser de façon externe pour être sûr qu'une action soit faite après les affichages en cours
 * @param {function} f
 */
MtgApp.prototype.addFunctionToQueue = function addFunctionToQueue (f) {
  if (typeof f !== 'function') console.warn('Appel de addQueue avec un paramètre qui n’est pas une fonction')
  else {
    addQueue(f)
  }
}

MtgApp.prototype.setNewfigWithUnity = function setNewFigWithUnity (uniteAngle) {
  const list = this.listePr
  list.retireTout()
  this.retireTout()
  this.resetDoc()
  this.doc.listePr.uniteAngle = uniteAngle
  this.prepareTracesEtImageFond()
  this.initAvecLongueurUnite(uniteAngle)
  this.creeCommentaireDesignation()
  this.calculateAndDisplay(false)
  this.updateToolsToolBar()
  this.reInitConst() // Pour réinitialiser une éventuelle construction en cours
  this.gestionnaire.initialise()
  if (this.electron) {
    resetDocument() // eslint-disable-line no-undef
    // resetDocument est défini dans index.html
  }
  // On met à jour les icônes de la barre horizontale
  this.updateToolbar()
  // On adapte la dimension des svg si nécessaire (cas où des dimensions minimales ont été demandées)
  this.resizeSvgFig()
  if (this.zoomOnWheel) addZoomListener(this.doc, this.svgFigure, this.svgGlob) // Ajoute au doc le listener sur le wheel
}

MtgApp.prototype.ajouteCourbeSurR = function (repere, fonction, nomPointLieAxe, nomCalculAbscisse,
  nomCalculOrdonnee, nombrePoints, pointLieCache, pointCourbeCache, gestionAutoDiscontinuite) {
  const list = this.listePr
  // Le dernier paramètre n'étant pas null list.ajouteCourbeSurR tiendra compte qu'on est dans une MTgApp
  list.ajouteCourbeSurR(repere, fonction, nomPointLieAxe, nomCalculAbscisse,
    nomCalculOrdonnee, nombrePoints, pointLieCache, pointCourbeCache, gestionAutoDiscontinuite,
    this.getCouleur(), this.getStyleTrait(), this.getTaillePoliceNom(), this)
}

MtgApp.prototype.ajouteCourbeSurab = function (repere, fonction, nomPointLieAxe, nomCalculAbscisse,
  nomCalculOrdonnee, nombrePoints, pointLieCache, pointCourbeCache, gestionAutoDiscontinuite, a, b) {
  const list = this.listePr
  // Le dernier paramètre n'étant pas null list.ajouteCourbeSurR tiendra compte qu'on est dans une MTgApp
  list.ajouteCourbeSurab(repere, fonction, nomPointLieAxe, nomCalculAbscisse,
    nomCalculOrdonnee, nombrePoints, pointLieCache, pointCourbeCache, gestionAutoDiscontinuite, a, b,
    this.getCouleur(), this.getStyleTrait(), this.getTaillePoliceNom(), this)
}

MtgApp.prototype.ajouteCourbeSuraInf = function (repere, fonction, nomPointLieAxe, nomCalculAbscisse,
  nomCalculOrdonnee, nombrePoints, pointLieCache, pointCourbeCache, gestionAutoDiscontinuite, a) {
  const list = this.listePr
  // Le dernier paramètre n'étant pas null list.ajouteCourbeSurR tiendra compte qu'on est dans une MTgApp
  list.ajouteCourbeSuraInf(repere, fonction, nomPointLieAxe, nomCalculAbscisse,
    nomCalculOrdonnee, nombrePoints, pointLieCache, pointCourbeCache, gestionAutoDiscontinuite, a,
    this.getCouleur(), this.getStyleTrait(), this.getTaillePoliceNom(), this)
}

MtgApp.prototype.ajouteCourbeSurInfa = function (repere, fonction, nomPointLieAxe, nomCalculAbscisse,
  nomCalculOrdonnee, nombrePoints, pointLieCache, pointCourbeCache, gestionAutoDiscontinuite, a) {
  const list = this.listePr
  // Le dernier paramètre n'étant pas null list.ajouteCourbeSurR tiendra compte qu'on est dans une MTgApp
  list.ajouteCourbeSurInfa(repere, fonction, nomPointLieAxe, nomCalculAbscisse,
    nomCalculOrdonnee, nombrePoints, pointLieCache, pointCourbeCache, gestionAutoDiscontinuite, a,
    this.getCouleur(), this.getStyleTrait(), this.getTaillePoliceNom(), this)
}

/**
 * Fonction ajoutant au body un input de type file invisible sur lequel on va simuler un clic
 * pour que la boîte de dialogue de navigation dans le système de fichier s'ouvre
 * @param {string} fileType chaîne décrivant le type de fichier à ouvrir ('mgj' pour une figure
 * et ''mgc' pour une macro-construction
 * @param {function} callbackOnOK fonction d'un paramètre file à appeler quand l'utilisateur
 * a validé la boîte de dialogue d'ouverture de fichier
 * @param {function} callBackOnCancel fonction d'un paramètre file à appeler quand l'utilisateur
 * a annulé la boîte de dialogue d'ouverture de fichier
 */
MtgApp.prototype.addInputForOpenDlg = function (fileType, callbackOnOK, callBackOnCancel = null) {
  // On crée un élément input, il doit être cliquable
  // et ne doit pas être en visibility:hidden ni display:none
  // (sinon ça marche pas sur apple)
  const input = ce('input')
  input.type = 'file'
  input.accept = '.' + fileType
  input.style.opacity = '0' // complètement transparent (mais cliquable)
  input.style.position = 'absolute'
  input.style.pointerEvents = 'auto' // Permet quand même les interactions utilisateur
  input.style.zIndex = '-1' // Placé derrière les autres éléments
  document.body.appendChild(input)
  const self = this
  if (callBackOnCancel) {
    input.addEventListener('cancel', () => {
      callBackOnCancel()
    })
  }
  input.addEventListener('change', function () {
    const file = input.files[0]
    if (file) {
      callbackOnOK(file)
    } else new AvertDlg(self, 'FichierErr')
    // et on vire l'input du dom
    document.body.removeChild(input)
  })
  // et on peut déclencher le click dessus
  input.click()
}
