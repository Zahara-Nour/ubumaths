/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CPrototype from '../objets/CPrototype'
import NatCal from '../types/NatCal'
import NatObj from '../types/NatObj'
import { chaineNatCalcPourProto, chaineNatGraphPourProto, natObjCalPourProto, natObjGraphPourProto } from '../kernel/kernelAdd'
export default CPrototype

CPrototype.graph = 0 // Constante indiquant que les objets sources du prototype sont tous graphiques
CPrototype.mixtes = 1 // Constante indiquant que les objets sources du prototype sont à la fois graphiques et numériques
CPrototype.calc = 2 // Constante indiquant que les objets sources du prototype sont tous gnumériques

/**
 * Fonction renvoyant le nombre d'objets sources graphiques
 * @returns {number}
 */
CPrototype.prototype.nbSrcCal = function () {
  let res = 0
  for (let i = 0; i < this.nbObjSources; i++) {
    if (this.get(i).estDeNatureCalcul(NatCal.NObjCalcPourSourcesProto)) res++
  }
  return res
}

/**
 * Fonction renvoyant le nolbre d'objets sources graphiques
 * @returns {number}
 */
CPrototype.prototype.nbSrcGraph = function () {
  return this.nbObjSources - this.nbSrcCal()
}

/**
 * Fonction renvoyant une chaîne formée de l'aide pour l'implémentation de l'objet n°i
 * si elle existe. Cette chaîne est contenue dans le commentaire du prototype (si elle
 * a été entrée) et elle est délimitée en début par un caractère # suivi d'une chaîne
 * représentant i suivi d'un caractère : et en fin par un caractère #
 */
CPrototype.prototype.chaineImp = function (i) {
  const com = this.commentaire
  let buf = ''
  const ch = '#' + String(i) + ':'
  const j = com.indexOf(ch)
  const len = ch.length
  if (j !== -1) {
    const k = com.indexOf('#', j + len)
    if (k !== -1) buf = com.substring(j + len, k)
    else buf = com.substring(j + len)
    const p = buf.indexOf('\n')
    if (p !== -1) buf = buf.substring(0, p)
    if (buf.length > 80) buf = buf.substring(0, 80)
  }
  return buf
}

/**
 * Fonction renvoyant pour l'élément source n° ind + 1 la chaîne de caractère donnant des indications sur le choix
 * de l'élément source n° ind dans le cas où c'est un élément graphique.
 * @param ind
 * @returns {string}
 */
CPrototype.prototype.chIndSourceGraph = function (ind) {
  let ch = this.chaineImp(ind + 1)
  if (ch === '') ch = chaineNatGraphPourProto(this.get(ind).getNature())
  return ch
}

/**
 * Fonction renvoyant pour l'élément source n° ind la chaîne de caractère donnant des indications sur le choix
 * de l'élément source n° ind dans le cas où c'est un élément numérique.
 * @param ind
 * @returns {string}
 */
CPrototype.prototype.chIndSourceNum = function (ind) {
  let ch = this.chaineImp(ind + 1)
  if (ch === '') ch = chaineNatCalcPourProto(this.get(ind).getNatureCalcul())
  return ch
}

/**
 * Fonction renvoyant un pointeur sur la première longueur utilisée à condition qu'elle ne soit pas précédée
 * d'un objet utilisant une longueur et qu'elle ne soit pas un objet intermédiaire.
 * Utilisé dans les implémentations de prototypes
 */
CPrototype.prototype.premiereLongueur = function () {
  let res = null
  for (let i = this.nbObjSources; i < this.longueur(); i++) {
    const elb = this.get(i)
    const natCal = elb.getNatureCalcul()
    if (elb.utiliseLongueurUnite() && (!natCal.isOfNature(NatCal.NMesureLongueur))) return null
    else {
      // Ne pas appeler est ElementIntermediaire qui ne marche pas pour les objets d'un prototype
      if (elb.estElementFinal && (natCal.isOfNature(NatCal.NMesureLongueur))) {
        res = elb
        break
      }
    }
  }
  return res
}

/**
 * Fonction renvoyant une chaîne vide si le prototype peut être implanté dans la liste list
 * et sinon renvoie une chaîne formé des noms des types manquants séparés par des virgules
 * @param {CListeObjets} list
 */
CPrototype.prototype.implementPossible = function (list) {
  let res = ''; let ch
  for (let i = 0; i < this.nbObjSources; i++) {
    const gen = this.get(i)
    const natGraph = gen.getNature()
    const natCal = gen.getNatureCalcul()
    if (!natCal.isZero()) {
      // Les calculs réels ou complexes n'ont pas à être cherchés car on peut entrer directement une formule
      // quand on implente un prototype
      if (!natCal.isOfNature(NatCal.NCalculReel) && !natCal.isOfNature(NatCal.NCalculComplexe) &&
        !natCal.isOfNature(NatCal.NTteMatrice) && list.nombreObjetsCalcul(natObjCalPourProto(natCal)) === 0) {
        ch = chaineNatCalcPourProto(natCal)
        res += ch + ','
      }
    } else {
      if (list.nombreObjetsParNatureVisibles(natObjGraphPourProto(natGraph)) === 0) {
        ch = chaineNatGraphPourProto(natGraph)
        res += ch + ','
      }
    }
  }
  if (res.endsWith(',')) res = res.substring(0, res.length - 1)
  return res
}

CPrototype.prototype.estRecursible = function (nbs, nbiter, pasiter) {
  let i; let j; let k; let els; let elf
  const nbObjSources = this.nbObjSources
  const nbObjFinaux = this.nbObjFinaux
  if (nbs >= nbObjSources) return false
  // i contient l'indice du premier objet source pour lequel l'objet final correspondant est compatible
  // On vérifie maintenant qu'à partir de cet indice tous les objets finaux sont compatibles avec les objets initiaux correspondants
  if ((nbObjSources - nbs) > nbObjFinaux) return false // Pas assez d'objets finaux
  for (k = 0; k < nbiter; k++) {
    i = nbs
    j = k * pasiter
    while (i < nbObjSources) {
      if (j >= nbObjFinaux) return false
      els = this.get(i)
      elf = this.getFinalObj(j)
      if (els.estDeNature(NatObj.NAucunObjet)) { // Cas d'un objet numérique
        if (!elf.estDeNatureCalcul(natObjCalPourProto(els.getNatureCalcul()))) return false
      } else {
        if (!elf.estDeNature(natObjGraphPourProto(els.getNature()))) return false
      }
      i++
      j++
    }
  }
  return true
}

/**
 * Ajout version 4.8
 * Renvoie true si la construction est itérable en gardant les nbs premiers objets sources de la construction lors de l'itération.
 */
CPrototype.prototype.estIterable = function (nbs) {
  let els; let elf
  const nbObjSources = this.nbObjSources
  const nbObjFinaux = this.nbObjFinaux
  if (nbs >= this.nbObjSources) return false
  let i = nbs
  let j = 0
  // i contient l'indice du premier objet source pour lequel l'objet final correspondant est compatible
  // On vérifie maintenant qu'à partir de cet indice tous les objets finaux sont compatibles avec les objets initiaux correspondants
  if ((nbObjSources - nbs) > nbObjFinaux) return false // Pas assez d'objets finaux
  // i++;
  while (i < nbObjSources) {
    if (j >= nbObjFinaux) return false
    els = this.get(i)
    elf = this.getFinalObj(j)
    if (els.estDeNature(NatObj.NAucunObjet)) { // Cas d'un objet numérique
      if (!elf.estDeNatureCalcul(natObjCalPourProto(els.getNatureCalcul()))) return false
    } else {
      if (!elf.estDeNature(natObjGraphPourProto(els.getNature()))) return false
    }
    i++
    j++
  }
  return true
}

/**
 * Fonction comptant combien, parmi les objets finaux iou intermédiaires, il y a d'objets avant d'arriver à
 * l'objet final n° nbf (cet objet compirs).
 * @param {number} nbf
 * @returns {number}
 */
CPrototype.prototype.nombreObjetsJusqueFinal = function (nbf) {
  let res = 0
  let i = this.nbObjSources
  let n = 0
  while ((i < this.longueur()) && (n <= nbf)) {
    res++
    if (this.get(i).estElementFinal) n++
    i++
  }
  return res
}

/**
 * Renvoie un pointeur sur l'élément final d'indice ind de la construction
 * Attention : Cette fonction s'appelait getFinal dans la version Java
 * @param {number} ind
 * @returns {CElementBase|null}
 */
CPrototype.prototype.getFinalObj = function (ind) {
  let a = -1
  let i = this.nbObjSources // Indice du premier objet final ou intermédiaire
  while (a !== ind && (i < this.longueur())) {
    const el = this.get(i)
    if (el.estElementFinal) a++
    if (a === ind) return el
    else i++
  }
  return null
}
