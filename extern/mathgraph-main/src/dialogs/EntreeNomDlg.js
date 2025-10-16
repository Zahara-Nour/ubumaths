/*
 * Created by yvesb on 01/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
import ListeTailles from './ListeTailles'
import EditeurNomPtOuDte from './EditeurNomPtOuDte'
import MtgInputWithCharSpe from './MtgInputWithCharSpe'
import AvertDlg from './AvertDlg'
import NatObj from '../types/NatObj'
export default EntreeNomDlg

/**
 * Boîte de dialogue permettant d'entrer ou modifier le nom d'un point ou une droite
 * @param {MtgApp} app L'application propriétaire
 * @param obj Le point ou la droite dont le nom doit être modifié
 * @constructor
 */
function EntreeNomDlg (app, obj) {
  MtgDlg.call(this, app, 'nomDlg')
  this.obj = obj
  const tabPrincipal = ce('table', {
    cellspacing: 10
  })
  this.appendChild(tabPrincipal)
  const trPrincipal = ce('tr')
  tabPrincipal.appendChild(trPrincipal)
  let td = ce('td')
  trPrincipal.appendChild(td)
  // Un tableau représentant la partie gauche du la boîte de dialogue
  const tabGauche = ce('table', {
    cellspacing: 10
  })
  td.appendChild(tabGauche)
  let tr = ce('tr')
  tabGauche.appendChild(tr)

  let label = ce('label')
  $(label).html(getStr('Nom') + ' : ')
  tr.appendChild(label)
  this.inputName = new MtgInputWithCharSpe(app, {}, ['grec'], false, this, true)
  $(this.inputName).val(obj.nom)
  this.inputName.size = 4
  // Pour valider par la touche OK
  const self = this
  this.inputName.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }

  tr.appendChild(this.inputName)
  tr = ce('tr')
  tabGauche.appendChild(tr)
  label = ce('label', {
    for: 'mtgcb'
  })
  $(label).html(getStr('NomMasque') + ' : ')
  tr.appendChild(label)
  const inp = ce('input', {
    id: 'mtgcb',
    type: 'checkbox'
  })
  if (obj.nomMasque) inp.setAttribute('checked', 'checked')
  tr.appendChild(inp)
  // Dans la partie de droite on met la liste des tailles de polices disponibles
  td = ce('tr')
  trPrincipal.appendChild(td)
  this.listeTailles = new ListeTailles(obj.tailleNom)
  td.appendChild(this.listeTailles.getComponent())
  this.editeurNom = new EditeurNomPtOuDte(app, this.inputName)
  this.create('EntreeNom', 320)
}

EntreeNomDlg.prototype = new MtgDlg()

EntreeNomDlg.prototype.OK = function OK () {
  const app = this.app
  const self = this
  const list = app.listePr
  const nomMasque = $('#mtgcb').prop('checked')
  // Modification version 6.3.5 : Pour les macs ou Ipad on remplace les apostrophes courbes qui
  // sont générées par le clavier Français par des apostrophes droites
  const rep = $(this.inputName).val().replace(/’/g, "'")
  const valide = this.editeurNom.validate(this.obj)

  if (valide) {
    // Il faut annuler le clignotement dun point ou de la droite pour qu'il ne soit pas considéré comme masqué
    app.outilActif.annuleClignotement()
    if (rep === '' && app.listePr.nomIndispensable(this.obj)) {
      new AvertDlg(app, 'ErrNomInd', function () {
        self.inputName.marquePourErreur()
        self.inputName.focus()
      })
    } else {
      this.obj.nomMasque = nomMasque
      this.obj.nom = rep
      const taille = this.listeTailles.getTaille()
      this.obj.tailleNom = taille
      app.pref_TaillePoliceNom = taille
      this.obj.updateName(app.svgFigure, true)
      this.obj.updateRectName()
      // Si il existe des objets dupliqués de cet objet il faut mettre à jout leur affichage de nom
      for (const el of list.col) {
        if (el.estDeNature(NatObj.NObjetDuplique) && (el.elementDuplique === this.obj)) { el.update(app.svgFigure, app.doc.couleurFond) }
      }
      app.outilNommer.reselect()
      app.outilNommer.saveFig()
      this.destroy()
    }
  }
}

EntreeNomDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.inputName)
}

EntreeNomDlg.prototype.onCancel = function () {
  // const time = Date.now();
  // if (time - this.timeStart < MtgDlg.delay) return; // Moins d'une seconde dans doute mauvais endroit de clic sur un bouton
  this.app.outilNommer.deselect()
  this.app.outilNommer.select()
  this.destroy()
}
