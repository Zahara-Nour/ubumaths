/*
 * Created by yvesb on 17/12/2016.
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
import EditeurvaleurReelle from './EditeurValeurReelle'
import CValeur from '../objets/CValeur'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import AvertDlg from './AvertDlg'
import { getMtgInput } from './dom'

export default RayonDlg

/**
 * Dialogue de choix du rayon d'un cercle
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param cer Le cercle dont lle rayon doit être changé
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 * @param callBackOK null ou fonction de callBack à appeler après OK
 * @param callBackCancel null ou fonction de callBack à appeler après annumlation
 */
function RayonDlg (app, cer, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'rayonDlg', callBackOK, callBackCancel)
  const self = this
  this.cer = cer
  this.modification = modification
  const list = app.listePr
  // Un CValeur pour stocker la valeur choisie avant vérification
  this.valeurRay = new CValeur(list, 1)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr('Rayon') + ' : ')
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
  const indmax = modification ? list.indexOf(cer) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, input, true, indmax)
  tabHaut.appendChild(paneBoutonsValFonc)
  // On rajoute un checkBox pour savoir si le rayon est en pixels ou non
  // Version 6.9.1 : On ne le mat pas si on est en train de faire un exercice de construction
  if (!app.estExercice) {
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    const inp = ce('input', {
      id: 'mtgcb',
      type: 'checkBox'
    })
    // inp.setAttribute("checked",modification ? cer.inPixels : false);
    if (modification) {
      if (cer.inPixels) inp.setAttribute('checked', 'checked')
      const pointeurLongueurUnite = list.pointeurLongueurUnite
      if (pointeurLongueurUnite === null || (pointeurLongueurUnite.index > cer.index)) inp.setAttribute('disabled', true)
    }
    tr.appendChild(inp)
    label = ce('label', {
      for: 'mtgcb'
    })
    $(label).html(getStr('RayPix'))
    tr.appendChild(label)
  }
  //
  this.editor = new EditeurvaleurReelle(app, input, indmax, this.valeurRay, null)
  if (modification) {
    $(input).val(replaceSepDecVirg(app, cer.r.calcul))
  }
  this.create('RayCer', 400)
}

RayonDlg.prototype = new MtgDlg()

RayonDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}

RayonDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const valid = this.editor.validate($('#mtginput').val())
  if (valid) {
    if (this.valeurRay.valeur <= 0) { new AvertDlg(this.app, 'avRay', function () { $('#mtginput').focus() }) } else {
      this.cer.inPixels = this.app.estExercice ? false : $('#mtgcb').prop('checked')
      this.cer.r = this.valeurRay
      if (this.callBackOK !== null) this.callBackOK()
      if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
      this.destroy()
    }
  }
}
