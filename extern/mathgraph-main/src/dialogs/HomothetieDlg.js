/*
 * Created by yvesb on 14/12/2016.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import CValeur from '../objets/CValeur'
import EditeurvaleurReelle from './EditeurValeurReelle'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import { getMtgInput } from './dom'
export default HomothetieDlg

/**
 * Dialogue de choix de rapport d'homothétie
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param hom L'homothétie dont le rapport doit être changé
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 * @param callBackOK null ou fonction de callBack à appeler après OK
 * @param callBackCancel null ou fonction de callBack à appeler après annumlation
 */
function HomothetieDlg (app, hom, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'homothetieDlg', callBackOK, callBackCancel)
  const self = this
  this.hom = hom
  this.modification = modification
  // Un CValeur pour stocker la valeur choisie avant vérification
  const list = app.listePr
  this.valeurRap = new CValeur(list, 1)
  const tab = ce('table')
  this.appendChild(tab)
  const tr = ce('tr')
  tab.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('Rapport') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input = getMtgInput({
    id: 'mtginput'
  })
  td.appendChild(input)
  input.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  const indmax = modification ? list.indexOf(hom) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, input, true, indmax)
  tab.appendChild(paneBoutonsValFonc)
  this.editor = new EditeurvaleurReelle(app, input, indmax, this.valeurRap, null)
  if (modification) {
    $(input).val(replaceSepDecVirg(app, hom.rapport.calcul))
  }
  this.create('RapportHom', 400)
}

HomothetieDlg.prototype = new MtgDlg()

HomothetieDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}

HomothetieDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  // On regarde si l'entrée est correcte sur le plan syntaxique
  const valid = this.editor.validate($('#mtginput').val())
  // Modifié version 6.4.8. On eccepte une homothétie de rapport nul
  if (valid) {
    this.hom.rapport = this.valeurRap
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
    // if (this.modification) this.app.gestionnaire.enregistreFigureEnCours("ModifObj");
  }
}
