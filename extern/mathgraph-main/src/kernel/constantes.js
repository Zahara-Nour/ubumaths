/*
 * Created by yvesb on 23/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @version 5.1.2
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import StyleTrait from '../types/StyleTrait'

const constantes = {
  pwaBaseUrl: 'https://app.mathgraph32.org/',
  // on met 300 (c'est 500ms par défaut sous windows, mais on réduit sinon les boutons de gauche ne sont plus assez réactifs)
  dblClickDelay: 300,
  topIconSize: 32,
  leftIconSize: 34,
  arrowIconWidth: 16,
  buttonStopWidth: 48,
  buttonBackGroundColor: '#F4F4F5',
  buttonFrameColor: '#BCBCBF',
  buttonActivatedBackGroundColor: '#B8E2E5',
  buttonStroke: '#BCBCBF',
  buttonFill: '#F4F4F5',
  rightPanelWidth: 92, // De préférence un multiple de 4 plus 4
  colorButtonHeight: 18,
  sliderThickness: 1,
  lineStyle: StyleTrait.styleTraitContinu, // Style de trait au démarrage
  sliderColor: 'black',
  sliderButtonColor: 'blue',
  sliderRadius: 4,
  sliderDigitsFontSize: 13,
  sliderGap: 4, // L'espace en pixels entre le segment et le bord gauche
  sliderHeight: 20,
  colorChoicePanelHeight: 24,
  previewFillHeight: 28,
  horGap: 3 // Le saut horizontal entre différents éléments de la vbarre de droite
}
constantes.nbObjMaxProto = 4000
constantes.svgPanelWidth = constantes.leftIconSize + constantes.arrowIconWidth
constantes.toolbarHeight = constantes.topIconSize + 2
constantes.colorButtonWidth = (constantes.rightPanelWidth - 4) / 4
constantes.lineStyleWidth = 0.6 * constantes.rightPanelWidth
constantes.buttonStyleWidth = (constantes.rightPanelWidth - constantes.lineStyleWidth) / 2
constantes.lineStyleButtonHeight = (5 * constantes.buttonStyleWidth) / 6
constantes.buttonMarqueWidth = constantes.rightPanelWidth / 5
constantes.buttonFillWidth = constantes.rightPanelWidth / 3
constantes.buttonFillHeight = 15
constantes.rapportZoomPlus = 1.15
constantes.rapportZoomMoins = 1 / constantes.rapportZoomPlus
constantes.tableStyleTrait = [
  [StyleTrait.styleTraitContinu, 'traitContinu'],
  [StyleTrait.styleTraitPointille, 'traitPointille'],
  [StyleTrait.styleTraitTrait, 'traitTrait'],
  [StyleTrait.styleTraitPointPoint, 'traitPointPoint'],
  [StyleTrait.styleTraitPointPointPoint, 'traitPointPointPoint'],
  [StyleTrait.styleTraitTraitLongTrait, 'traitLongTrait']
]
constantes.colorPalette = [
  ['#FFFFFF', '#FAFAFA', '#F2F2F2', '#E6E6E6', '#D8D8D8', '#BDBDBD', '#A4A4A4', '#848484'],
  ['#FBEFF2', '#F8E0E6', '#F6CED8', '#F5A9BC', '#F7819F', '#FA5882', '#FE2E64', '#FF0040'],
  ['#FBEFFB', '#F8E0F7', '#F6CEF5', '#F5A9F2', '#F781F3', '#FA58F4', '#FE2EF7', '#FF00FF'],
  ['#F5EFFB', '#ECE0F8', '#E3CEF6', '#D0A9F5', '#BE81F7', '#AC58FA', '#9A2EFE', '#8000FF'],
  ['#EFEFFB', '#E0E0F8', '#CECEF6', '#A9A9F5', '#8181F7', '#5858FA', '#2E2EFE', '#0000FF'],
  ['#EFFBFB', '#E0F8F7', '#CEF6F5', '#A9F5F2', '#81F7F3', '#58FAF4', '#2EFEF7', '#00FFFF'],
  ['#F2FBEF', '#F5FBEF', '#ECF8E0', '#E3F6CE', '#D0F5A9', '#BEF781', '#ACFA58', '#9AFE2E'],
  ['#FBFBEF', '#F7F8E0', '#F5F6CE', '#F2F5A9', '#F3F781', '#F4FA58', '#F7FE2E', '#FFFF00'],
  ['#FBF8EF', '#F7F2E0', '#F5ECCE', '#F3E2A9', '#F5DA81', '#F7D358', '#FACC2E', '#FFBF00']
]
export default constantes
