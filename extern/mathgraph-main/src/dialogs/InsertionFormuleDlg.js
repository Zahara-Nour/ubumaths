/*
 * Created by yvesb on 16/03/2017.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import NatCal from '../types/NatCal'
import Nat from '../types/Nat'
import $ from 'jquery'
import 'jquery-textrange'
export default InsertionFormuleDlg

const tab = ['InsForDlg3', 'InsForDlg4', 'InsForDlg5']
/**
 * Dialogue appelé par les boîtes de dialogue de création d'un affichageLaTeX ou d'un commentaire
 * quand on clique sur le bouton d'insertion
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param textarea Le textarea dans lequel sera copié le code lors de la validation
 * @param dlg Le dialogue propriétaire du textarea (dialogue d'adition de commentiare ou d'affichage Latex)
 * @param indmax L'indice maximum des objets à résenter dans la liste (-1 pour avoir tous les objets).
 * @param blatex true si on édite un CLaTeX, false pour un CCommentaire
 */
function InsertionFormuleDlg (app, textarea, dlg, indmax, blatex) {
  MtgDlg.call(this, app, 'InsDynDlg')
  let label
  this.textarea = textarea
  this.dlg = dlg
  this.blatex = blatex
  const self = this
  const list = this.app.listePr
  const nat = blatex ? Nat.or(NatCal.NCalcouFoncParFormule, NatCal.NMatrice) : NatCal.NCalcouFoncParFormule
  this.inf = list.listeParNatCal(app, nat, indmax)
  const tabPrincipal = ce('table', {
    cellspacing: 5
  })
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  // En haut un panneau contenant à gauche la liste des valeurs compatibles et à droite une liste de choix
  // pour le nombre d décimales.
  const tabHaut = ce('table', {
    cellspacing: 5
  })
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:200px'
  })
  $(caption).html(getStr('InsForDlg2'))
  td.appendChild(caption)
  this.select = ce('select', {
    size: 6, // Le nombre de lignes visibles par défaut
    style: 'width:200px'
  })
  td.appendChild(this.select)
  this.select.onchange = function () {
    self.updateCode()
  }
  for (let i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.select.appendChild(option)
  }
  td = ce('td')
  tr.appendChild(td)
  const tabHautDroit = ce('table')
  td.appendChild(tabHautDroit)
  if (this.blatex) {
    for (let j = 0; j < tab.length; j++) {
      tr = ce('tr')
      tabHautDroit.appendChild(tr)
      const radio = ce('input', {
        type: 'radio',
        id: tab[j],
        name: 'choice'
      })
      tr.appendChild(radio)
      label = ce('label', {
        for: tab[j]
      })
      $(label).html(getStr(tab[j]))
      tr.appendChild(label)
      if (j === 0) radio.setAttribute('checked', 'checked')
      radio.onchange = function () {
        const btnVis = this.id === 'InsForDlg3'
        $('#cbfrac').css('visibility', btnVis ? 'visible' : 'hidden')
        $('#lblfrac').css('visibility', btnVis ? 'visible' : 'hidden')
        self.updateCode()
      }
    }
    tr = ce('tr')
    tabHautDroit.appendChild(tr)
    tr = ce('tr')
    tabHautDroit.appendChild(tr)
    const input = ce('input', {
      type: 'checkbox',
      id: 'cbfrac'
    })
    // $(input).attr('checked', 'checked')
    tr.appendChild(input)
    input.onchange = function () {
      self.updateCode()
    }
    label = ce('label', {
      for: 'cbfrac',
      id: 'lblfrac'
    })
    $(label).html(getStr('FracRat'))
    tr.appendChild(label)
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('ChoixValeurDlg3'))
  tr.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.textareainfo = ce('textarea', {
    id: 'info',
    cols: 50,
    rows: 5,
    disabled: 'true'
  })
  tr.appendChild(this.textareainfo)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('InsDynDlg3'))
  tr.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.infoCode = ce('input', {
    type: 'text',
    disabled: 'true',
    size: 45
  })
  tr.appendChild(this.infoCode)
  this.updateCode()
  this.create('InsForDlg1', 650)
}
InsertionFormuleDlg.prototype = new MtgDlg()

InsertionFormuleDlg.prototype.updateCode = function () {
  let codeAInserer
  const ind = this.select.selectedIndex
  if (ind === -1) return
  const el = this.inf.pointeurs[ind]
  $(this.textareainfo).text(el.infoHist())
  const nomValeurSelectionnee = el.getNom()
  codeAInserer = this.debutCode() + nomValeurSelectionnee
  codeAInserer += this.blatex ? '}' : ')'
  $(this.infoCode).val(codeAInserer)
}

InsertionFormuleDlg.prototype.debutCode = function () {
  const blatex = this.blatex
  const deb = blatex ? '\\' : '#'
  const parouv = blatex ? '{' : '('
  let form
  if (blatex) {
    const frac = $('#cbfrac').prop('checked')
    for (let j = 0; j < tab.length; j++) {
      if ($('#' + tab[j]).prop('checked')) {
        switch (j) {
          case 0:
            if (frac) form = 'ForSimpFrac'
            else form = 'ForSimp'
            break
          case 1:
            form = 'ForRep'
            break
          case 2:
            form = 'For'
        }
      }
    }
  } else {
    form = 'For'
  }
  return deb + form + parouv
}

InsertionFormuleDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.select)
}

InsertionFormuleDlg.prototype.OK = function () {
  const ind = this.select.selectedIndex
  if (ind !== -1) {
    const st = $(this.textarea).val()
    const deb = $(this.textarea).textrange('get', 'start')
    const fin = $(this.textarea).textrange('get', 'end')
    const code = $(this.infoCode).val()
    $(this.textarea).val(st.substring(0, deb) + code + st.substring(fin))
    $(this.textarea).textrange('setcursor', deb + code.length)
  }
  this.dlg.updatePreview()
  this.destroy()
}
