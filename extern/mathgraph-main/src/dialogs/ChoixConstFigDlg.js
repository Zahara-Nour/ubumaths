/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import ModifConstDlg from './ModifConstDlg'
import ConfirmDlg from './ConfirmDlg'
import AvertDlg from './AvertDlg'
import SaveConstDlg from './SaveConstDlg'
import $ from 'jquery'

export default ChoixConstFigDlg

/**
 * Boîte de dialogue de choix d'une construction de la figure
 * La même boîte de dialogue peut servir à implémenter un prototype ou à la modifier
 * suivant la valeur du boolean bModif
 * @param {MtgApp} app Application propriétaire
 * @param {string} sbutton chaîne de caractères indiquant ce que fait le bouton de validation
 * Paut prendre les valeurs "Modifier", "Implem" (pour impémenter) "Supprimer" et "Save"
 * @param callBackOK Fonction de callBack à appeler quand l'utilisateur clique sur OK
 * Dans le cas où sbutton vaut "Implem" ou ", cette fonction prend un paramètre proto qui est le prototype de la figure sélectionné
 * @param callBackCancel Fonction de callBack à appeler si l'utilisateur annule
 * @constructor
 */
function ChoixConstFigDlg (app, sbutton, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'ChoixConstFigDlg', callBackOK, callBackCancel)
  this.sbutton = sbutton
  const self = this
  const tabProto = app.doc.tablePrototypes
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  // En haut une liste des noms des macros constructions présentes dans la figure
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  let label = ce('label')
  $(label).html(getStr('ConstFig'))
  tr.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.select = ce('select', {
    size: 6, // Le nombre de lignes visibles par défaut
    style: 'width:550px',
    id: 'sel'
  })
  tr.appendChild(this.select)
  // C'est là qu'on ajoute tous les types disponibles dans la liste déroulante
  for (let i = 0; i < tabProto.length; i++) {
    const option = ce('Option')
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(tabProto[i].nom)
    this.select.appendChild(option)
    option.ondblclick = function () {
      switch (self.sbutton) {
        case 'Modifier' :
          self.modifier()
          break
        case 'Implem' :
          self.implementer()
      }
    }
  }
  this.select.onchange = function () {
    self.onSelectChange()
  }

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  label = ce('label')
  tr.appendChild(label)
  $(label).html(getStr('Info'))
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const inputinf = ce('textarea', {
    id: 'ta',
    disabled: 'true',
    cols: 65,
    rows: 12
  })
  tr.appendChild(inputinf)

  this.onSelectChange()
  // Attention : Pour cette boîte de dialogue ne pas appeler create
  const buttons = {}

  buttons[getStr(sbutton)] = function (ev) {
    const app = self.app
    switch (self.sbutton) {
      case 'Modifier' :
        self.modifier()
        self.callBackOK()
        break
      case 'Supprimer' :
        self.supprimer()
        self.callBackOK()
        break
      case 'Save' :
        if (app.electron) saveProto(self.select.selectedIndex) // eslint-disable-line no-undef
        // saveProto est une fonction de index.html
        else new SaveConstDlg(app, self.getSelectedProto())
        break
      default : // Cas où sbutton vaut "implem"
        self.implementer()
    }
    self.stopEvent(ev)
  }
  buttons[getStr(self.sbutton !== 'Implem' ? 'Fermer' : 'Cancel')] = function (ev) {
    self.destroy()
    self.stopEvent(ev)
    self.callBackCancel()
  }

  $('#' + self.id).dialog({
    modal: true,
    title: getStr('ConstFig'),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    buttons,
    close: function (ev) {
      self.destroy()
      self.stopEvent(ev)
      self.callBackCancel()
    },
    width: 600,
    closeOnEscape: false,
    // On centre la boîte de dialogue sur le div parent de l'application
    position: { my: 'center', at: 'center', of: this.app.svg.parentElement }
  })
}

ChoixConstFigDlg.prototype = new MtgDlg()

ChoixConstFigDlg.prototype.onSelectChange = function () {
  $('#ta').val(this.getSelectedProto().commentaire)
}

ChoixConstFigDlg.prototype.getSelectedProto = function () {
  return this.app.doc.tablePrototypes[this.select.selectedIndex]
}

ChoixConstFigDlg.prototype.modifier = function () {
  const self = this
  new ModifConstDlg(self.app, self.getSelectedProto(), function () {
    self.onSelectChange()
    $(self.select.childNodes[self.select.selectedIndex]).html(self.getSelectedProto().nom)
  })
}

ChoixConstFigDlg.prototype.supprimer = function () {
  const selectedIndex = this.select.selectedIndex
  const tableProto = this.app.doc.tablePrototypes
  const self = this
  new ConfirmDlg(this.app, 'AvertNonAnnul', function () {
    const list = self.app.listePr
    const proto = tableProto[selectedIndex]
    if (list.depDeProto(tableProto[selectedIndex])) self.app.detruitDepProto(proto)
    tableProto.splice(selectedIndex, 1)
    // S'il n'y a plus de constructions on ferme la fenêtre
    if (tableProto.length === 0) {
      self.destroy()
      self.callBackOK()
    } else {
      // On supprime de la liste la construction choisie
      self.select.removeChild(self.select.childNodes[selectedIndex])
      self.select.selectedIndex = (selectedIndex === 0) ? 0 : selectedIndex - 1
      self.onSelectChange()
    }
  })
}

ChoixConstFigDlg.prototype.implementer = function () {
  // On regarde si l'implémentation du prototype dans la figure est possible
  const proto = this.getSelectedProto()
  const app = this.app
  const ch = proto.implementPossible(app.listePr)
  if (ch !== '') {
    new AvertDlg(app, getStr('ImpImposs') + ch)
    return
  }
  this.destroy()
  // On passe le paramètre en prototype de la fonction de callBack pour une implémentationde prototype
  this.callBackOK(proto)
}
