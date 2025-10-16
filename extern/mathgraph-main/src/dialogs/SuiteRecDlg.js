/*
 * Created by yvesb on 15/04/2017.
 */
/*
 * Created by yvesb on 01/04/2017.
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
import CValeur from '../objets/CValeur'
import CValeurComp from '../objets/CValeurComp'
import NatCal from '../types/NatCal'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import $ from 'jquery'
import 'jquery-textrange'
import EditeurNomCalcul from './EditeurNomCalcul'
import EditeurValeurReelle from './EditeurValeurReelle'
import EditeurValeurComplexe from './EditeurValeurComplexe'
import AvertDlg from './AvertDlg'
import { getMtgInput } from './dom'
export default SuiteRecDlg

/**
 * Boîte de dialogue de création ou modification d'une suite de la forme u(n+1) = f(u(n)) réelle ou complexe
 * @constructor
 * @param {MtgApp} app  L'application propriétaire
 * @param suite  La suité récurrente réelle ou complexe
 * @param {number} type
 *    1 pour suite u(n+1)=f[u(n)]
 *    2 pour une suite u(n+1)=f[n,u(n)]
 *    3 pour une suite u(n+2)=f[n,u(n+1),u(n)]
 * @param {boolean} bReel  true si on édite une suite réelle, false pour une suite complexe
 * @param {boolean} modification true si on modifie une suite déjà existante
 * @param callBackOK  Eventuelle fonction de callBack à appeler après appui sur Cancel
 * @param callBackCancel  Eventuelle fonction de callBack à appeler après appui sur Cancel
 */
function SuiteRecDlg (app, suite, type, bReel, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'DeriveeDlg', callBackOK, callBackCancel)
  let nat
  this.suite = suite
  this.type = type
  this.modification = modification
  const self = this
  const list = app.listePr
  // 2 CValeur pour stocker les valeurs pour les valeurs pour le premier terme et le nombre de termes.
  this.valeurPrem = bReel ? new CValeur(list) : new CValeurComp(list)
  if (type === 3) this.valeurSec = bReel ? new CValeur(list) : new CValeurComp(list)
  this.valeurNb = new CValeur(list)

  const indmax = modification ? list.indexOf(suite) - 1 : list.longueur() - 1

  switch (type) {
    case 1 :
      nat = bReel ? NatCal.NFoncR1Var : NatCal.NFonctionComplexe
      break
    case 2 :
      nat = bReel ? NatCal.NFonction2Var : NatCal.NFonctionComplexe2Var
      break
    case 3 :
      nat = bReel ? NatCal.NFonction3Var : NatCal.NFonctionComplexe3Var
      break
  }
  this.inf = list.listeParNatCal(app, nat, indmax)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneHaut = ce('table')
  tr.appendChild(paneHaut)
  tr = ce('tr')
  $(tr).css('vertical-align', 'top')
  paneHaut.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr('suiteRecDlg1'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputName = getMtgInput({
    size: 4,
    style: 'margin-right:20px'
  })
  td.appendChild(this.inputName)
  td = ce('td')
  tr.appendChild(td)
  const caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:180px'
  })
  $(caption).html(getStr('suiteRecDlg2'))
  td.appendChild(caption)
  this.select = ce('select', {
    size: 6, // Le nombre de lignes visibles par défaut
    style: 'width:180px'
  })
  this.select.onchange = function () {
    self.onSelectChange()
  }
  td.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (modification ? (this.inf.pointeurs[i] === suite.fonctionAssociee) : i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.select.appendChild(option)
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneMilieu = ce('table')
  tr.appendChild(paneMilieu)
  tr = ce('tr')
  paneMilieu.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('InfoFonc'))
  tr.appendChild(label)
  tr = ce('tr')
  paneMilieu.appendChild(tr)
  const inputinf = ce('textarea', {
    id: 'info',
    disabled: 'true',
    cols: 50,
    rows: 2
  })
  tr.appendChild(inputinf)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneBas = ce('table')
  tr.appendChild(paneBas)
  tr = ce('tr')
  paneBas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('PremTerm'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputPrem = getMtgInput({
    size: 30
  })
  td.appendChild(this.inputPrem)
  const paneBoutonsValFoncPrem = new PaneBoutonsValFonc(this.app, this, this.inputPrem, bReel, indmax)
  paneBas.appendChild(paneBoutonsValFoncPrem)
  if (type === 3) {
    tr = ce('tr')
    paneBas.appendChild(tr)
    td = ce('td')
    tr.appendChild(td)
    label = ce('label')
    $(label).html(getStr('chinfo186'))
    td.appendChild(label)
    td = ce('td')
    tr.appendChild(td)
    this.inputSec = getMtgInput({
      size: 30
    })
    td.appendChild(this.inputSec)
    const paneBoutonsValFoncSec = new PaneBoutonsValFonc(this.app, this, this.inputSec, bReel, indmax)
    paneBas.appendChild(paneBoutonsValFoncSec)
  }

  tr = ce('tr')
  paneBas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('NbTerm'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputNbTerm = getMtgInput({
    size: 30
  })
  td.appendChild(this.inputNbTerm)
  const paneBoutonsValFoncNbTerm = new PaneBoutonsValFonc(this.app, this, this.inputNbTerm, true, indmax)
  paneBas.appendChild(paneBoutonsValFoncNbTerm)
  if (modification) {
    $(this.inputName).val(this.suite.nomCalcul)
    $(this.inputName).attr('disabled', true)
    $(this.inputPrem).val(replaceSepDecVirg(app, suite.premierTerme.calcul))
    if (type === 3) {
      $(this.inputSec).val(replaceSepDecVirg(app, suite.deuxiemeTerme.calcul))
    }
    $(this.inputNbTerm).val(replaceSepDecVirg(app, suite.nombreTermes.calcul))
  }

  this.editeurName = new EditeurNomCalcul(app, !this.modification, this.inputName)
  this.editeurPrem = bReel
    ? new EditeurValeurReelle(app, this.inputPrem, indmax, this.valeurPrem, null)
    : new EditeurValeurComplexe(app, this.inputPrem, indmax, this.valeurPrem, null)
  if (type === 3) {
    this.editeurSec = bReel
      ? new EditeurValeurReelle(app, this.inputSec, indmax, this.valeurSec, null)
      : new EditeurValeurComplexe(app, this.inputSec, indmax, this.valeurSec, null)
  }
  this.editeurNbTerm = new EditeurValeurReelle(app, this.inputNbTerm, indmax, this.valeurNb, null)
  this.onSelectChange()
  this.info = 'SuiteRec' + ((type === 1) ? '' : type)
  this.create(this.info, 500)
}

SuiteRecDlg.prototype = new MtgDlg()

SuiteRecDlg.prototype.onSelectChange = function () {
  $('#info').val(this.inf.pointeurs[this.select.selectedIndex].infoHist())
}

SuiteRecDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.inputNbTerm : this.inputName)
}

SuiteRecDlg.prototype.OK = function () {
  if (this.editeurName.validate() && this.editeurPrem.validate() &&
    ((this.type === 3) ? this.editeurSec.validate() : true) && this.editeurNbTerm.validate()) {
    if (!this.modification) this.suite.nomCalcul = $(this.inputName).val()
    const self = this
    const nb = this.valeurNb.valeur
    if ((nb <= 0) || (nb > 100000) || nb !== Math.floor(nb)) {
      new AvertDlg(this.app, 'Incorrect', function () {
        $(self.inputNbTerm).focus()
        self.inputNbTerm.marquePourErreur()
      })
    } else {
      this.suite.fonctionAssociee = this.inf.pointeurs[this.select.selectedIndex]
      this.suite.premierTerme = this.valeurPrem
      if (this.type === 3) this.suite.deuxiemeTerme = this.valeurSec
      this.suite.nombreTermes = this.valeurNb
      const app = this.app
      if (!this.modification) app.ajouteElement(this.suite)
      app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : this.info)
      this.destroy()
      if (this.callBackOK !== null) this.callBackOK()
    }
  }
}
