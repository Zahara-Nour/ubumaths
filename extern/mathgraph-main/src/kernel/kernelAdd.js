/*
 * Created by yvesb on 16/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
// on importe kernel
import { getAbsolutePath, getMousePositionToParent, getStr, getTouchPositionToParent, maxLastFig } from './kernel'
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import constantes from '../kernel/constantes'

export const listeAngleDeg = ['90', '-90', '60', '-60', '30', '-30', '45', '-45', '120', '-120', '135', '-135']
export const listeAngleRad = ['pi/2', '-pi/2', 'pi/3', '-pi/3', 'pi/6', '-pi/6', 'pi/4', '-pi/4', '2*pi/3', '-2*pi/3', '3*pi/4', '-3*pi/4']

/**
 * Fonction renvoyant un Point formé des coordonnées d'un événement touch relatives
 * à un svg dans lequel travaille une mtgApp (version éditeur)
 * @param svg Le svg de l'application
 * @param evt l'événement
 * @param zoomFactor le zoomFactor de l'appli
 * @returns {Point}
 */
export function touchPosition (svg, evt, zoomFactor = 1) {
  const par = svg.containerDiv // Dans le cas de l'appli le parent du svg de la figure est un autre svg
  return getTouchPositionToParent(evt, par, constantes.svgPanelWidth * zoomFactor - svg.figContainer.scrollLeft, constantes.topIconSize * zoomFactor - svg.figContainer.scrollTop)
}

/**
 * Fonction renvoyant un Point formé des coordonnées d'un événement souris relatives
 * à un svg dans lequel travaille une mtgApp
 * @param svg
 * @param evt
 * @param zoomFactor le zoomFactor de l'appli
 * @returns {Point}
 */
export function mousePosition (svg, evt, zoomFactor = 1) {
  // A partir de la version 8.4, il y un autre svg global contenant le svg de la figure
  // et il faut donc remonter deux parents pour avoir le svg contenant toute l'interface et la figure
  const par = svg.containerDiv // Dans le cas de l'appli le parent du svg de la figure est un autre svg
  return getMousePositionToParent(evt, par, constantes.svgPanelWidth * zoomFactor - svg.figContainer.scrollLeft, constantes.topIconSize * zoomFactor - svg.figContainer.scrollTop)
}

// fct setSelectionRange virée le 2025-06-11 car elle ne servait pas

export function insertAfter (newNode, referenceNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling)
}

export function distancePointDroite (xp, yp, xd, yd, u) {
  return Math.abs(u.y * (xd - xp) - u.x * (yd - yp)) / Math.sqrt(u.x * u.x + u.y * u.y)
}

export function getButtonArrow (app, id) {
  const btn = ce('input', {
    class: 'buttonarrow',
    type: 'image',
    id
  })
  import('src/images/menuArrow.png')
    .then(({ default: img }) => {
      btn.setAttribute('src', getAbsolutePath(img))
    })
    .catch(error => console.error(error))
  btn.style.width = '25px'
  btn.style.height = '18px'
  return btn
}

/**
 * remplace dans une chaîne les caractères < et > par leur équivalent html
 * @param {string} ch
 * @returns {string}
 */
export function replaceIneg (ch) {
  let st = ch.replace(/</g, '&lt;')
  st = st.replace(/>/g, '&gt;')
  return st
}

/**
 * Retourne ch avec les caractères % non précédés d'un \ remplacé par \% pour code Tikz
 * @param {string} ch
 * @returns {string}
 */
export function adaptStringTikz (ch) {
  let s = ch.replace(/([^\\]){1}%{1}/, '$1\\%')
  if (s.charAt(0) === '%') s = '\\' + s
  return s
}

// Avant le 2025-02-05 on avait une fct base64toBlob qui utilisait atob() / Uint8Array / Blob pour convertir des images de base64 vers Blob
// C'est ensuite devenu inutile car getBase64ImageData a une option pour retourner le blob directement (plutôt que le code base64)

/**
 * Fonction renvoyant la chaîne de caractères représentant le type d'objet grahique dont la présence est nécessaire
 * pour un objet source de prototype de nature nat.
 * Aussi utilisé dans les exercices de construction.
 * @param {Nat} nat
 * @returns {string}
 */
export function chaineNatGraphPourProto (nat) {
  const ar1 = ['NDroite', 'NDemiDroite', 'NCercle', 'NSegment', 'NArc', 'NPointLie', 'NTtPoint', 'NPolygone', 'NLigneBrisee', 'NLieu']
  const ar2 = ['Dte', 'Ddte', 'Cerc', 'Seg', 'Arc', 'PointLie', 'Point', 'Polygone', 'LigneBrisee', 'LieuPt']
  for (let i = 0; i < ar1.length; i++) {
    if (nat.isOfNature(NatObj[ar1[i]])) return getStr(ar2[i])
  }
  return '' // Par précaution
}

/**
 * Fonction renvoyant la chaîne de caractères représentant le type d'objet non grahique dont la présence est nécessaire
 * pour un objet source de prototype de nature calcul nat.
 * Aussi utilisé dans les exercices de construction.
 * @param {Nat} nat
 * @returns {string}
 */
export function chaineNatCalcPourProto (nat) {
  const ar1 = ['NVariable', 'NTteValR', 'NTteValC', 'NRepere', 'NFonction', 'NFonction2Var', 'NFonction3Var',
    'NFonction4Var', 'NFonction5Var', 'NFonction6Var', 'NFonctionComplexe',
    'NFonctionComplexe2Var', 'NFonctionComplexe3Var', 'NFonctionComplexe4Var', 'NFonctionComplexe5Var', 'NFonctionComplexe6Var',
    'NSuiteRecurrenteReelle', 'NSuiteRecurrenteComplexe',
    'NSuiteRecurrenteReelle2', 'NSuiteRecurrenteReelle3', 'NSuiteRecurrenteComplexe2', 'NSuiteRecurrenteComplexe3',
    'NTteMatrice']
  const ar2 = ['Variable', 'ValR', 'ValC', 'Repere', 'Fonc', 'Fonc2Var', 'Fonc3Var',
    'Fonc3Var', 'Fonc3Var', 'Fonc3Var', 'FoncComp',
    'FoncComp2Var', 'FoncComp3Var', 'FoncComp3Var', 'FoncComp3Var', 'FoncComp3Var',
    'SuiteRec', 'SuiteRecComplexe',
    'SuiteRec2', 'SuiteRec3',
    'SuiteRecComplexe2', 'SuiteRecComplexe3',
    'Matrice']

  for (let i = 0; i < ar1.length; i++) {
    if (nat.isOfNature(NatCal[ar1[i]])) return getStr(ar2[i])
  }
  return '' // Par précaution
}

/**
 * Fonction qui renvoie pour une implémentation de prototype quel est la nature d'objet numérique qui est compatible
 * pour l'implémentation avec la nature nat
 * @param {Nat} nat  la nature de l'objet testé qui est un objet source pour une construction
 * @returns {Nat} Une nature de type Calcul (élément de NatCal)
 */
export function natObjCalPourProto (nat) {
  if (nat.isOfNature(NatCal.NCalculReel)) return NatCal.NTteValR
  if (nat.isOfNature(NatCal.NCalculComplexe)) return NatCal.NTteValC
  // Ligne suivante ajoutée version 6.7 pour les constructions ayant des objest sources de type matrice
  if (nat.isOfNature(NatCal.NTteMatrice)) return NatCal.NTteMatrice
  // Dans les autres cas même nature attendue
  return nat
}

/**
 * Fonction qui renvoie pour une implémentation de prototype quel est la nature d'objet graphique qui est compatible
 * pour l'implémentation avec la nature nat
 * @param {NatObj} nat  la nature de l'objet testé qui est un objet source pour une construction
 * @returns {NatObj}
 */
export function natObjGraphPourProto (nat) {
  if (nat.isOfNature(NatObj.NTtPoint) && !nat.isOfNature(NatObj.NPointLie)) return NatObj.NTtPoint
  else return nat
}

/**
 * Fonction regardant si le calcul contenu dans ch (qui est vérifié correct avant appel) ne contient
 * pas de constantes utilisant plus de 12 décimales
 * @param {string} ch
 * @returns {boolean}
 */
export function nbDecimalesOK (ch) { // Fonction ajoutée version 6.8.0
  let st = ch
  let ind
  while ((ind = st.indexOf('.')) !== -1) {
    st = st.substring(ind + 1)
    let indfin = st.search(/[^\d]/)
    if (indfin === -1) indfin = st.length
    let cha = st.substring(0, indfin)
    while (cha.charAt(cha.length - 1) === '0') cha = cha.substring(0, cha.length - 1)
    if (cha.length > 12) return false // 12 décimales maxi dans les constantes
  }
  return true
}

/**
 * Fonction renvoyant true seulement si on est sur un appareil avec éctan tactile
 * @returns {boolean}
 */
export function isTouchDevice () {
  return ((window.PointerEvent && ('maxTouchPoints' in navigator) && (navigator?.maxTouchPoints > 0)) ||
    (window.PointerEvent && ('msMaxTouchPoints' in navigator) && (Number(navigator?.msMaxTouchPoints) > 0)) ||
    (window.matchMedia && window.matchMedia('(any-pointer:coarse)').matches) ||
    (window.TouchEvent && ('ontouchstart' in window)))
}

/**
 * Fonction qui, pour la version wepapp enregistree le code Base64 de la figure comme dernière
 * figure enregistrée dans le localStorage
 * @param {string} code le code Base64 à enregistrer
 */
export function storeFigByCode (code) {
  if (!code || code === 'null') return
  try {
    // sauvegarde de la figure, faut décaler les anciennes
    let i = maxLastFig
    localStorage.removeItem(`mtgFig${i}`)
    localStorage.removeItem(`mtgFig${i}ts`)
    i--
    while (i) {
      localStorage.setItem(`mtgFig${i + 1}`, localStorage.getItem(`mtgFig${i}`))
      localStorage.setItem(`mtgFig${i + 1}ts`, localStorage.getItem(`mtgFig${i}ts`))
      i--
    }
    // et on sauvegarde la figure courante
    localStorage.setItem('mtgFig1', code)
    localStorage.setItem('mtgFig1ts', Date.now())
  } catch (error) {
    console.error(error)
  }
}
