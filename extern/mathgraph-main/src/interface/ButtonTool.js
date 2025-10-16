/*
 * Created by yvesb on 04/10/2016.
 */
import { cens } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Button from './Button'
import constantes from '../kernel/constantes'

export default ButtonTool

/**
 * Création d'un objet ButtonTool qui représente un bouton associé à un outil
 * @param {MtgApp} app L'application propriétaire
 * @param {string} toolName Le nom de l'outil
 * @param {string} target "left" pour un outil de barre flottante, "top" pour un outil de la barre d'outils supérieure
 * @param {boolean} bIsCaptTool true pour l'outil de capture
 * @param {number} row Le numéro de colonne du bouton ou -1 pour un bouton qui n'est pas affiché (il faut quand même
 * créer le bouton car son icône doit être disponible lorsqu'on choisit les outils actilfs pour la figure)
 * @param {string} tip l'indication à afficher au survol du bouton
 * @constructor
 * @extends Button
 */
function ButtonTool (app, toolName, target, bIsCaptTool = false, row, tip) {
  if (arguments.length === 0) return // Pour ButtonToolAdd
  const left = target === 'left'
  const top = target === 'top'
  const float = target === 'float'
  const zoomFactor = app.zoomFactor
  const dim = left ? constantes.leftIconSize : constantes.topIconSize
  Button.call(this, app, 'outil' + toolName, tip ?? toolName, dim, dim) // Icônes des outils carrées
  // Attention la ligne suivante est à appeler après Button.call car celui-co met activable à true
  this.activable = !(top && (row === -1))
  this.toolName = toolName
  this.expandableBar = null // Modifié quand on crée les expandableBar
  this.isActivated = false // Changé quand l'outil correspondant est activé
  app.buttons.push(this)
  this.tipDisplayed = false
  // this.tool = app["outil" + toolName];
  const isCaptTool = bIsCaptTool
  this.target = target
  const tool = app['outil' + toolName]
  if (!app.estExercice || (app.estExercice && app['outil' + toolName] && (tool.always || app.doc.toolDispo(tool.toolIndex)))) {
    this.build()
    const g = this.container // Crée dans le constructeur de Button
    g.setAttribute('id', toolName)
    // Nécessaire pour chaque bouton de lui affecter un transform qui est une translation
    g.setAttribute('transform', left
      ? 'translate(0,2)'
      : 'translate(' +
      String(row * ((constantes.topIconSize + 2) * zoomFactor)) + ',0)')
    if (row !== -1) {
      // Initialement les boutons de la barre de gauche ne sont pas visibles.
      // Ils sont rendus visibles quand on crée les expandableBar
      g.setAttribute('visibility', (top || float || isCaptTool) ? 'visible' : 'hidden')
      if (left) app.svgPanel.appendChild(g)
      else app.toolBar.appendChild(g)
    }
  } else {
    this.container = cens('g')
    this.container.setAttribute('visibility', 'hidden')
  }
}
ButtonTool.prototype = new Button()
ButtonTool.prototype.constructor = ButtonTool // Utile car ButtonToolAdd est un descendant
/**
 * Appelé au simple clic sur un bouton d'outil
 */
ButtonTool.prototype.singleClickAction = function () {
  const nameEditor = this.app.nameEditor
  // Si un input de nom de point ou droite est visible on le masque
  if (nameEditor.isVisible) nameEditor.montre(false)
  const eb = this.expandableBar
  if (eb !== null) {
    if (eb && eb.expanded) {
      eb.activeToolName = this.toolName
      eb.updateActiveIcon(eb.row)
    } else {
      if (this.app.hasBarExpanded()) {
        this.app.unFoldExpandableBars()
        this.app.updateActiveIcons()
      }
    }
  } else {
    this.app.unFoldExpandableBars()
  }
  this.app.selectTool(this.toolName)
}
/**
 * Fonction appelée lors d'un double clic sur le bouton
 */
ButtonTool.prototype.doubleClickAction = function () {
  const bar = this.expandableBar
  if (bar === null) {
    this.singleClickAction()
    return
  }
  if (bar.expanded) {
    bar.updateActiveIcon(bar.row)
  } else {
    this.app.unFoldExpandableBars()
    this.expandableBar.expand()
  }
}
