/*
 * Created by yvesb on 02/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import EditeurvaleurReelle from './EditeurValeurReelle'
import EditeurValeurComplexe from './EditeurValeurComplexe'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import EditeurNomCalcul from './EditeurNomCalcul'
import CValeur from '../objets/CValeur'
import CValeurComp from '../objets/CValeurComp'
import { getMtgInput } from './dom'

export default CalculDlg

/**
 * Dialogue de création ou modification d'un calcul réel ou complexe
 * @param {MtgApp} app La mtgApp propriétaire
 * @param calc Le calcul dont la formule doit être modifiée
 * @param {boolean} modification true si le dialogue est ouvert pour modifier un calcul déjà existant
 * @param {boolean} bReel true pour un calcul réel et false pour un calcul complexe
 * @param {VoidCallback} [callBackOK] null ou fonction de callBack à appeler après OK
 * @param {VoidCallback} [callBackCancel] null ou fonction de callBack à appeler après annulation
 * @constructor
 * @extends MtgDlg
 */
function CalculDlg (app, calc, modification, bReel, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'calculdlg', callBackOK, callBackCancel)
  const self = this
  this.calc = calc
  this.modification = modification
  this.bReel = bReel
  const list = app.listePr
  // La formule obtenue pour le calcul sera renvoyée dans un CValeur
  this.valeur = bReel ? new CValeur(list) : new CValeurComp(list)
  const tab = ce('table')
  this.appendChild(tab)
  let tr = ce('tr')
  tab.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr('NomCalcul') + ' : ')
  td.appendChild(label)
  td = ce('td')
  this.inputName = getMtgInput()
  td.appendChild(this.inputName)
  tr.appendChild(td)
  tr = ce('tr')
  tab.appendChild(tr)
  td = ce('td')
  label = ce('label')
  $(label).html(getStr('Formule') + ' : ')
  td.appendChild(label)
  tr.appendChild(td)
  td = ce('td')
  tr.appendChild(td)
  this.inputFormula = getMtgInput({
    size: 50
  })
  td.appendChild(this.inputFormula)
  this.inputFormula.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  this.inputName.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      if ($(self.inputFormula).val() === '') self.inputFormula.focus()
      else {
        $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
        self.OK()
      }
    }
  }
  if (modification) {
    $(this.inputName).val(calc.nomCalcul)
    $(this.inputName).attr('disabled', true)
    // Modif version 7.0 : On reconstruit la chaîne de calcul
    // $(this.inputFormula).val(calc.chaineCalcul)
    $(this.inputFormula).val(replaceSepDecVirg(app, calc.calcul))
  }
  const indmax = modification ? list.indexOf(calc) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.inputFormula, bReel, indmax)
  tab.appendChild(paneBoutonsValFonc)
  this.editeurName = new EditeurNomCalcul(app, !modification, this.inputName)
  if (bReel) this.editeurFormule = new EditeurvaleurReelle(app, this.inputFormula, indmax, this.valeur, null)
  else this.editeurFormule = new EditeurValeurComplexe(app, this.inputFormula, indmax, this.valeur, null)
  this.create(this.bReel ? 'CalculReel' : 'CalculComp', 680)
}

CalculDlg.prototype = new MtgDlg()

CalculDlg.prototype.OK = function () {
  // On regarde si l'entrée est correcte sur le plan syntaxique
  if (this.editeurName.validate()) {
    if (this.editeurFormule.validate($(this.inputFormula).val())) {
      if (!this.modification) this.calc.nomCalcul = $(this.inputName).val()
      this.calc.calcul = this.valeur.calcul
      this.calc.chaineCalcul = replaceSepDecVirg(this.app, this.calc.calcul)
      if (!this.modification) this.app.ajouteElement(this.calc)
      this.app.gestionnaire.enregistreFigureEnCours(this.modification
        ? 'ModifObj'
        : this.bReel ? 'CalculReel' : 'CalculComp')
      this.destroy()
      if (this.callBackOK !== null) this.callBackOK()
    } else this.inputFormula.focus()
  }
}

CalculDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.inputFormula : this.inputName)
}
