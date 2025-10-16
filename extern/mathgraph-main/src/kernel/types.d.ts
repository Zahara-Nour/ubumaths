// fichier qui définit des types génériques utilisable en jsdoc
// (idem @typedef dans le js, mais avec syntaxe ts plus pratique/concise)
// permet aussi de définir le contenu des modules pour limiter les warnings polluant de webstorm

import type Vect from 'src/types/Vect'
import {SVGElement} from "happy-dom";

type Language = 'fr' | 'es' | 'en' | 'de'

type VoidCallback = () => void

interface Point {
  x: number
  y: number
}

interface DecompPrim {
  /** La liste des facteurs premiers */
  0: number[]
  /** La liste des puissances de chaque facteur premier */
  1: number[]
}

declare module 'kernel' {
  export const maxLastFig: number
  export const languages: Language[]
  export const mimeType: string
  export const mtgFileExtension: string
  export const radiusLens: number
  export const decxLens: number
  export const decyLens: number
  export const ratioLens: number
  export const circleLensOpacity: number
  export const svgLensOpacity: number
  export function getAbsolutePath(url: string): string
  export function getMathjaxBase(): void
  export const SHORT_MAX_VALUE: number
  export const version: number
  export const ConvDegRad: number
  export const ConvRadDeg: number
  export const uniteAngleRadian: number
  export const uniteAngleDegre: number
  export const erreurCalculException: string
  export const NombreMaxiTermesSuiteRec: number
  export const MIN_VALUE: number
  export const MAX_VALUE: number
  export const cos30: number
  export const sin30: number
  export const distMinForTouch: number
  export const distMinForMouse: number
  export function cens(name: string, att: string): void
  export function ce(name: string, attrs: Record<string, string>): void
  export function ceIn(parent, name, attrs): void
  export function getLanguage(languageWanted: string): Language
  export const textes: Record<string, string>
  export function getStr(textCode: string, opts?: Record<'lax', boolean>): string
  export function isApple(): boolean
  export function isIphoneOrIpad(): boolean
  export function isAndroidDevice(): boolean
  export function isMobileDevice(): boolean
  export function zero(x: number): boolean
  export function zero11(x: number): boolean
  export function zero13(x: number): boolean
  export function chaineNombre(number: number, digits: number, decimalDot?: boolean): string
  export function base64Encode(ba: string[], bstandard: boolean): string
  export function base64Decode(b64String: string, bstandard: boolean): number[]
  export function pgcd(a: number, b: number): number
  export function ppcm(a: number, b: number): number
  export function ncr(n: number, p: number): number
  export function npr(n: number, p: number): number
  export function zeroAngle(r: number): boolean
  export function mesurePrincipale(angrad: number): number
  export function testToile(x: number, y: number): boolean
  export function colineaires(u: Vect, v: Vect): boolean
  export function colineairesMemeSens(u: Vect, v: Vect): boolean
  export function distancePointPoint(x1: number, y1: number, x2: number, y2: number): number
  export function distancePointPointCarre(x1: number, y1: number, x2: number, y2: number): number
  export function intersectionDroitesSecantes(p1x: number, p1y: number, u1: Vect, p2x: number, p2y: number, u2: Vect, res: Record<string, number>): void
  export function indiceMiniMaxi(c: number, tab: number[], point: Point): void
  export function testAngleDroit(angle1: number, angle2: number): boolean
  export function getMousePositionToParent(event: MouseEvent, par: HTMLElement | SVGElement, decx?: number, decy?: number): Point
  export function getTouchPositionToParent(event: MouseEvent, par: HTMLElement | SVGElement, decx?: number, decy?: number): Point
  export function divComp(z1: Point, z2: Point, zRes: Point): void
  export const descriptionNature: string[]
  export function round3dg(number: number): number
  export function preventDefault(evt: Event): void
  export function accoladeFermante(chaine: string, pdebut: number): number
  export function latexMat(nb: number | MathJsChain, nbdec: number): number | string
  export function latexMatFrac(nb: number | MathJsChain): string
  export function identity(n: number): number[]
  export function fracCont(x: number): number[]
  export function codeLatexFracCont(tab: number[]): string
  export function consoleError(...args: unknown  []): void
  export function traiteAccents(ch: string): string
  export function decompPrim(n: number): DecompPrim
  export function addZoomListener(doc: CMathGraphDoc, svg: SVGElement, target: SVGElement): void
  export function notify(error: Error | string): void
  export function replaceSepDecVirg(app: MtgApp, calc: CCb, parametre?: string[]): string
  export function strToBool(ch: string): boolean
  export function correctionRoboto(taille: number): number
}

declare module 'loadTextes' {
  export default function (language: Language, isForEditor: boolean): Promise<void>
}
