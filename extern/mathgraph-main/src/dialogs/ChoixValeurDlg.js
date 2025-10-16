/*
 * Created by yvesb on 30/11/2016.
 */
/*
 * Created by yvesb on 20/10/2016.
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
//
import $ from 'jquery'
import 'jquery-textrange'
export default ChoixValeurDlg

/**
 * Boîte de dialogue proposant une liste formé de tous les objets de type calcul
 * qui sont de type compatible avec nat.
 * Quand on clique sur le bouton OK, la valeur sélectionnée est insérée dans le champ input
 * @constructor
 * @param {MtgApp} app La MtgApp Propriétaire
 * @param nat La nature de type NatCal des obejts à proposer dans la liste déroulante.
 * @param input Le champ d'édition dans lequel sera reporté le nom de la valeur choisie
 * @param indmax l'indice maxi des objets à présenter dans la liste
 * @param breplace boolean true s'il faut remplacer le contenu de l'éditeur associé par le nom de la
 * valeur choisie. Sinon on insére le nom au point d'insertion. false si paramètre non présent
 * @param callBack null ou Fonction de callBack à appeler après le choix d'une valeru validé
 */
function ChoixValeurDlg (app, nat, input, indmax, breplace = false, callBack) {
  let tr, td, label, i, option
  MtgDlg.call(this, app, 'choixValeurDlg')
  this.nat = nat
  this.input = input
  this.breplace = breplace
  this.callBack = callBack
  const liste = this.app.listePr
  const self = this
  this.inf = liste.listeParNatCal(app, nat, indmax)
  const tabPrincipal = ce('table', {
    cellspacing: 5
  })
  this.appendChild(tabPrincipal)
  tr = ce('TR')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table', {
    cellspacing: 5
  })
  tr.appendChild(tabHaut)
  tr = ce('TR')
  tabHaut.appendChild(tr)
  td = ce('TD', {
    valign: 'top'
  })
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('ChoixValeurDlg1') + '<br/>' + getStr('ChoixValeurDlg2'))
  td.appendChild(label)
  td = ce('TD', {
    valign: 'top'
  })
  tr.appendChild(td)
  this.select = ce('SELECT', {
    size: 10, // Le nombre de lignes visibles par défaut
    style: 'width:150px'
  })
  this.select.onchange = function () {
    self.onSelectChange()
  }

  td.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (i = 0; i < this.inf.noms.length; i++) {
    option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    // option.innerHTML = this.inf.noms[i];
    $(option).html(this.inf.noms[i])
    option.ondblclick = function () { self.OK() }
    this.select.appendChild(option)
  }
  tr = ce('TR')
  tabPrincipal.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('ChoixValeurDlg3'))
  tr.appendChild(label)
  tr = ce('TR')
  tabPrincipal.appendChild(tr)
  this.textarea = ce('textarea', {
    cols: 40,
    rows: 5,
    disabled: 'true'
  })
  tr.appendChild(this.textarea)
  this.onSelectChange()
  this.create('ChoixValeur', 400)
}

ChoixValeurDlg.prototype = new MtgDlg()

ChoixValeurDlg.prototype.onSelectChange = function () {
  const ind = this.select.selectedIndex
  if (ind === -1) return
  const el = this.inf.pointeurs[ind]
  $(this.textarea).text(el.infoHist())
}

// Si l'utilisateur clique sur OK on remplace dans le champ d'édition associé la sélection(s'il y en a une)
// par le nom de la valeur sélectionnée
ChoixValeurDlg.prototype.OK = function () {
  // var time = Date.now();
  // if (time - this.timeStart < MtgDlg.delay) return; // Moins d'une seconde dans doute mauvais endroit de clic sur un bouton
  const ind = this.select.selectedIndex
  if (ind !== -1) {
    const el = this.inf.pointeurs[ind]
    if (this.breplace) $(this.input).val(el.getNom())
    else {
      const st = $(this.input).val()
      const deb = $(this.input).textrange('get', 'start')
      const fin = $(this.input).textrange('get', 'end')
      const nom = el.getNom()
      $(this.input).val(st.substring(0, deb) + nom + st.substring(fin))
      $(this.input).textrange('setcursor', deb + nom.length)
    }
  }
  if (this.callBack !== null) this.callBack()
  this.destroy()
}

ChoixValeurDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.select)
}
