/*
 * Created by yvesb on 23/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import constantes from '../kernel/constantes'

export default ExpandableBar

/**
 * Classe représentant une barre d'outils horizontale déroulable
 * @constructor
 * @param {MtgApp} app la mtgApp propriétaire
 * @param name Le nom de la barre. Pex exemple "Points" pour la barre de création de points
 * @param tab Array formé des chaînes identifiant les outils que la barre peut contenir
 */
function ExpandableBar (app, name, tab) {
  this.app = app
  this.name = name
  this.tab = tab
  this.row = -2 // -2 et pas 0 car sinon les ToolbarArraow associées à une barre vide sont au niveau de la barre des points
  // Ainsi les ToolbarArrows non utilisées ne sont pas dans la partie utile de la fenêtre
  // On crée un tableau formé des outils qui sont effectivement autorisés
  this.tools = []
  this.activeToolName = null // Pointera sur l'outil actif de la barre, null si la barre est vide
  this.expanded = false // Contiendra true quand la barre est déroulée
  this.toolbarArrow = null // Modifié quand on crée les ToolbarArrow
}

/**
 * Fonctions mettant à jour la tableau tools dont les éléments sont les noms de tous les outils activables de la barre
 * et mettant dans this.activeToolName null ou le nom de l'outil par défaut de la barre (le premier activable
 * dans le tableau tool)
 */
ExpandableBar.prototype.updateActiveTools = function () {
  const app = this.app
  const tab = this.tab
  this.tools.length = 0 // On vide le tableau
  const outilActif = app['outil' + this.activeToolName]
  if ((this.activeToolName !== null) && (!outilActif.activationValide() || !app.doc.toolDispo(outilActif.toolIndex) ||
      !app.level.toolDispo(outilActif.toolIndex))) { this.activeToolName = null }
  for (let i = 0; i < tab.length; i++) {
    const tool = app['outil' + tab[i]]
    tool.expandableBar = this
    // Important : C'est à ce niveau que chaque bouton d'outil est informé de la barre à laquelle il appartient
    app['button' + tab[i]].expandableBar = this
    if (app.doc.toolDispo(tool.toolIndex) && tool.activationValide() && app.level.toolDispo(tool.toolIndex)) this.tools.push(tab[i])
  }
  if (this.activeToolName === null) this.activeToolName = this.tools.length !== 0 ? this.tools[0] : null
  this.expanded = false
}

/**
 * Fonction cachant toutes les icônes avant qu'elles soient réorganisées
 */
ExpandableBar.prototype.hideAllIcons = function () {
  for (let i = 0; i < this.tab.length; i++) {
    this.app['button' + this.tab[i]].container.setAttribute('visibility', 'hidden')
  }
  this.toolbarArrow.montre(false)
}
/**
 * Fonction cachant les icônes de la barre qui ne sont pas celles de l'outil actif et montrant
 * l'icône de l'outil actif (s'il y en a un)
 * @param row
 */
ExpandableBar.prototype.updateActiveIcon = function (row) {
  const app = this.app
  const zf = app.zoomFactor
  // Il faut d'abord effacer tous les boutons y-compris ceux qui ne sont pas dans this.tools
  // car l'outil qui était précédemment actif peut ne plus l'être
  for (let i = 0; i < this.tab.length; i++) {
    const btnc = app['button' + this.tab[i]].container
    btnc.setAttribute('visibility', 'hidden')
  }
  for (let i = 0; i < this.tools.length; i++) {
    const tool = this.tools[i]
    if (tool === this.activeToolName) {
      const btnc = app['button' + this.activeToolName].container
      btnc.setAttribute('visibility', 'visible')
      btnc.setAttribute('transform', 'translate(0,' + String((row + 1) * (constantes.leftIconSize + 2) + 2) * zf + ')')
    }
  }
  this.row = row
  this.toolbarArrow.montre(this.tools.length >= 2) // On montre la flèche associée
  this.expanded = false
}

ExpandableBar.prototype.desactive = function () {
  this.toolbarArrow.montre(false) // On montre la flèche associée
  this.expanded = false
  this.row = -2
}

ExpandableBar.prototype.expand = function () {
  const app = this.app
  const zf = app.zoomFactor
  let col = 0
  const lpw = constantes.svgPanelWidth * zf
  const lis = constantes.leftIconSize
  for (let i = 0; i < this.tools.length; i++) {
    const tool = this.tools[i]
    if (tool !== this.activeToolName) {
      const btc = app['button' + tool].container
      btc.setAttribute('visibility', 'visible')
      btc.setAttribute('transform',
        'translate(' + String(lpw + col * lis * zf) + ',' + String((this.row + 1) * (lis + 2) + 2) * zf + ')')
      col++
    }
  }
  this.expanded = true
}
