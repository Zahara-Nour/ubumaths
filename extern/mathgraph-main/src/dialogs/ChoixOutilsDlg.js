/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ce } from 'src/kernel/dom'
import { getAbsolutePath, getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import CMathGraphDoc from '../objets/CMathGraphDoc'
import $ from 'jquery'
import 'jstree'
import 'jstree/dist/themes/default/style.min.css'
// attention, jstree fait un require jquery et ajoute des choses dessus sans le renvoyer
// => il faut un resolve.alias.jquery dans webpack.config.cjs pour imposer le module à prendre,
//    histoire que tout le monde récupère la même instance, car il pourrait y avoir plusieurs
//    jquery dans node_modules
// => $.jstree.plugins.types.get_node veut du jQuery en global, on pourrait le mettre via un
//    new webpack.ProvidePlugin({'jQuery': 'jquery'})
//    dans la conf webpack, mais ça ajouterait jquery à tous les builds, on le fait ici
window.jQuery = $

export default ChoixOutilsDlg

/**
 * Boîte de dialogue de choix des outils disponibles pour la figure en cours
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param {CMathGraphDoc} doc Un document dans lequel les choix d'outils seront enregistrés après validation de la boîte de dialogue
 * @param niv Le niveau de filtarge des outils proposés
 * @param {null|CMathGraphDoc} docNiv Un éventuel doc contenant les infos pour les outils à sléectionner ou non
 * @param {boolean} persDispo true si on propose de choisir les outils sélections pour le prochaine démarrage
 */
function ChoixOutilsDlg (app, doc, niv, docNiv, persDispo) {
  let tr, div, label, radio, i, cb
  MtgDlg.call(this, app, 'OutilAddDlg')
  this.doc = doc // Servira lors de la validation
  // docNiv n'est passé en paramètre que si on a choisi d'utiliser un fichier mgj pour sélectionner les outils
  // sinon il est null
  this.docNiv = docNiv || doc
  this.niv = niv
  this.persDispo = persDispo
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  /// //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // En bas, un label et deux boutons radio pour savoir si les outils sohés sont les outils permis ou interdits  //
  /// //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Même pour la version electron, on ne propose pas de choisir les outils sélectionnés pour le prochain démarrage
  // du logiciel dans le cas où, dans la boîte de dialogue d'options, on a coché Utiliser ce niveau pour le prochain démarrage
  if ((app.electron || app.pwa) && persDispo) {
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    div = ce('div')
    tr.appendChild(div)
    cb = ce('input', {
      type: 'checkbox',
      id: 'cb'
    })
    div.appendChild(cb)
    label = ce('label', {
      for: 'cb'
    })
    $(label).html(getStr('ToolsDem'))
    div.appendChild(label)
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)

  label = ce('label')
  $(label).html(getStr('ChoixOutDlg1'))
  tr.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  radio = ce('input', {
    id: 'rad1',
    type: 'radio',
    name: 'rad'
  })
  div.appendChild(radio)

  label = ce('label', {
    for: 'rad1'
  })
  $(label).html(getStr('ChoixOutDlg2'))
  div.appendChild(label)
  radio = ce('input', {
    id: 'rad2',
    type: 'radio',
    name: 'rad',
    style: 'margin-left:20px;'
  })
  div.appendChild(radio)
  label = ce('label', {
    for: 'rad2'
  })
  $(label).html(getStr('ChoixOutDlg3'))
  div.appendChild(label)
  if (this.docNiv.itemsCochesInterdits) $('#rad2').attr('checked', 'checked')
  else $('#rad1').attr('checked', 'checked')
  // Dessous l'arbre dans un div
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div', {
    id: 'div',
    style: 'display:inline-block;width:550px;height:350px;vertical-align:top;overflow:auto;border:1px solid black;margin-top: 5px;'
  })
  tr.appendChild(div)
  $(div).jstree({
    plugins: ['wholerow', 'checkbox', 'types'],
    core: { // types pour pouvoir avoir des user defined icones
      check_callback: true
    }
  })
  this.tree = $(div).jstree(true)
  this.idroot = this.tree.create_node('#', getStr('ChoixOutils'))
  this.addToolsTopBar()
  const tab = ['Points', 'Droites', 'Segments', 'Cercles', 'Polys', 'Marques', 'Lieux', 'Transf', 'Mes', 'Disp', 'Calculs', 'Surfaces']
  for (i = 0; i < tab.length; i++) this.addTools(tab[i])
  this.addTools('Divers', true)

  // Création de la boîte de dialogue par jqueryui
  this.create('ChoixOutils', 600)
  this.tree.open_node(this.idroot)
}

ChoixOutilsDlg.prototype = new MtgDlg()

/**
 * Fonction rajoutant à la racine de l'arbre une nouvelle branche avec comme texte le name de app.expandableBarName
 * et comme noeuds enfants les noms des outils de cette ExpandableBar
 * @param expandableBarName Le name de la barre d'outils
 * @param {boolean} bDivers  true pour le dernier outil proposant des outils divers
 */
ChoixOutilsDlg.prototype.addTools = function (expandableBarName, bDivers = false) {
  let id2, id3, tool
  const app = this.app
  const eb = app['bar' + expandableBarName]
  const tab = eb.tab
  const id = this.tree.create_node(this.idroot, getStr(expandableBarName))
  const size = tab.length
  const itemsCochesInterdits = this.docNiv.itemsCochesInterdits
  for (let i = 0; i < size; i++) {
    tool = app['outil' + tab[i]]
    if (tool.toolName.indexOf('Add') === 0) {
      if (this.hasTools(tool)) {
        if (!bDivers) id2 = this.tree.create_node(id, { text: ' ' + getStr('Add') })
        for (let j = 0; j < tool.toolArray.length; j++) {
          const tool2 = app['outil' + tool.toolArray[j]]
          if (app.levels[this.niv].toolDispo(tool2.toolIndex)) {
            id3 = this.tree.create_node(bDivers ? id : id2, getStr(tool2.toolName))
            const b = this.docNiv.toolDispo(tool2.toolIndex)
            if ((!itemsCochesInterdits && b) || (itemsCochesInterdits && !b)) { this.tree.select_node(id3) } else this.tree.deselect_node(id3)
            this[id3] = tool2.toolIndex
          }
        }
      }
    } else if (app.levels[this.niv].toolDispo(tool.toolIndex)) {
      const tool2 = app['outil' + tab[i]]
      const hasIcon = tool2.hasIcon
      if (hasIcon) {
        const b = this.docNiv.toolDispo(tool2.toolIndex)
        import(`src/images/outil${tab[i]}.png`).then(({ default: img }) => {
          id2 = this.tree.create_node(id, {
            text: ' ' + getStr(tool2.toolName),
            // pour que ça fonctionne en CORS il faut une url absolue
            icon: getAbsolutePath(img)
          })
          if ((!itemsCochesInterdits && b) || (itemsCochesInterdits && !b)) { this.tree.select_node(id2) } else this.tree.deselect_node(id2)
          this[id2] = tool2.toolIndex // Pour pouvoir associer à chaque branche le nom de l'outil correspondant
        }).catch(error => console.error(error))
      } else {
        const b = this.docNiv.toolDispo(tool2.toolIndex)
        id2 = this.tree.create_node(id, getStr(tool2.toolName))
        if ((!itemsCochesInterdits && b) || (itemsCochesInterdits && !b)) { this.tree.select_node(id2) } else this.tree.deselect_node(id2)
        this[id2] = tool2.toolIndex // Pour pouvoir associer à chaque branche le nom de l'outil correspondant
      }
    }
  }
}

ChoixOutilsDlg.prototype.addToolsTopBar = function () {
  const app = this.app
  const id = this.tree.create_node(this.idroot, getStr('ToolsBarHor'))
  const tab = ['ModifObjGraph', 'ZoomPlus', 'ZoomMoins', 'ModifObjNum', 'Palette', 'CopierStyle', 'ModeTrace', 'ModePointsAuto', 'UseLens', 'Recalculer', 'Gomme', 'Rideau',
    'TranslationFigure', 'ModeAutoComplete', 'ExecutionMacro', 'Protocole', 'Help', 'ToggleToolsAdd']
  const size = tab.length
  const itemsCochesInterdits = this.docNiv.itemsCochesInterdits
  for (let i = 0; i < size; i++) {
    const tool2 = app['outil' + tab[i]]
    if (tool2) {
      import(`src/images/outil${tab[i]}.png`)
        .then(({ default: img }) => {
          const id2 = this.tree.create_node(id, {
            text: ' ' + getStr(tool2.toolName),
            // pour que ça fonctionne en CORS il faut une url absolue
            icon: getAbsolutePath(img)
          })
          const b = this.docNiv.toolDispo(tool2.toolIndex)
          if ((!itemsCochesInterdits && b) || (itemsCochesInterdits && !b)) {
            this.tree.select_node(id2)
          } else this.tree.deselect_node(id2)
          this[id2] = tool2.toolIndex // Pour pouvoir associer à chaque branche le nom de l'outil correspondant
        })
        .catch(error => console.error(error))
    }
  }
}
/**
 * Fonction renvoyant true si l'outil addTool de type OutilAdd a au moins un outil à mettre dans la liste
 * @param addTool
 * @returns {boolean}
 */
ChoixOutilsDlg.prototype.hasTools = function (addTool) {
  const app = this.app
  for (let j = 0; j < addTool.toolArray.length; j++) {
    const tool2 = app['outil' + addTool.toolArray[j]]
    if (app.levels[this.niv].toolDispo(tool2.toolIndex)) return true
  }
  return false
}

ChoixOutilsDlg.prototype.OK = function () {
  const app = this.app
  const self = this
  let b; let doc
  const selectedData = []
  const selectedIndexes = this.tree.get_selected(true)

  $.each(selectedIndexes, function (index) {
    b = self[selectedIndexes[index].id] // b est undefined pour les noeuds racines des branches
    if (b) selectedData.push(self[selectedIndexes[index].id])
  })
  const checked = $('#rad2').prop('checked')
  this.doc.setIdMenus(app, checked, selectedData, this.niv)
  // Si on est en mode électron et si la case est cochée, on appelle setLevel de la page index.html
  if ((app.electron || app.pwa) && this.persDispo) {
    if ($('#cb').prop('checked')) {
      doc = new CMathGraphDoc('', false, false)
      doc.dimf = app.dimf
      doc.setIdMenus(app, checked, selectedData, this.niv)
      if (app.electron) setLevel(doc.getBase64Code()) // eslint-disable-line no-undef
      else localStorage.setItem('level', doc.getBase64Code())
      // setLevel est défini dans index.html
      doc = null
    }
  }
  this.destroy()
}
