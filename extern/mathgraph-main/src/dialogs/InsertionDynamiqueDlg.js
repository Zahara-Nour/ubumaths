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
import PaneNombreDecimales from './PaneNombreDecimales'
import $ from 'jquery'
import 'jquery-textrange'
export default InsertionDynamiqueDlg

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
function InsertionDynamiqueDlg (app, textarea, dlg, indmax, blatex) {
  MtgDlg.call(this, app, 'InsDynDlg')
  this.textarea = textarea
  this.dlg = dlg
  this.blatex = blatex
  const self = this
  const list = this.app.listePr
  this.inf = list.listeParNatCal(app, blatex ? NatCal.NTteValPourComDynSaufFonc : NatCal.NTteValRPourComDyn, indmax)
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
  $(caption).html(getStr('ChoixValeur'))
  td.appendChild(caption)
  this.select = ce('select', {
    size: 6, // Le nombre de lignes visibles par défaut
    style: 'width:200px'
  })
  td.appendChild(this.select)
  this.select.onchange = function () {
    self.onSelectChange()
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
  tr = ce('tr')
  tabHautDroit.appendChild(tr)
  this.paneNombreDec = new PaneNombreDecimales(2, function () {
    self.updateCode()
  })
  tr.appendChild(this.paneNombreDec.container)
  // Ajout version 6.7
  // Version 7.2.1 : Pas d'approximation par une fraction si on est dans un affichage de texte
  if (blatex) {
    tr = ce('tr')
    tabHautDroit.appendChild(tr)
    const input = ce('input', {
      type: 'checkbox',
      id: 'cbapproxfrac'
    })
    tr.appendChild(input)
    input.onchange = function () {
      const sel = $(this).prop('checked')
      $(self.paneNombreDec.container).css('visibility', sel ? 'hidden' : 'visible')
      self.updateCode()
    }
    const label = ce('label', {
      for: 'cbapproxfrac',
      id: 'lblapproxfrac'
    })
    $(label).html(getStr('FracRat'))
    tr.appendChild(label)
  }
  // Fin ajout version 6.7
  tr = ce('tr')
  tabHautDroit.appendChild(tr)
  const input = ce('input', {
    type: 'checkbox',
    id: 'cbsigneplus'
  })
  tr.appendChild(input)
  input.onchange = function () { self.updateCode() }
  let label = ce('label', {
    for: 'cbsigneplus',
    id: 'lblsigneplus'
  })
  $(label).html(getStr('InsDynDlg2'))
  tr.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('ChoixValeurDlg3'))
  tr.appendChild(label)
  tr = ce('TR')
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
  this.onSelectChange()
  this.create('InsDynDlg1', 600)
}
InsertionDynamiqueDlg.prototype = new MtgDlg()

InsertionDynamiqueDlg.prototype.onSelectChange = function () {
  const ind = this.select.selectedIndex
  if (ind === -1) return
  const el = this.inf.pointeurs[ind]
  const estReel = this.blatex && el.estDeNatureCalcul(NatCal.NTteValPourComDynSaufFoncSaufComp)
  const estMatriceOuComplexe = el.estMatrice() || el.estDeNatureCalcul(NatCal.NTteValC)
  $('#cbapproxfrac').css('visibility', estReel ? 'visible' : 'hidden')
  $('#lblapproxfrac').css('visibility', estReel ? 'visible' : 'hidden')
  $('#cbsigneplus').css('visibility', estMatriceOuComplexe ? 'hidden' : 'visible')
  $('#lblsigneplus').css('visibility', estMatriceOuComplexe ? 'hidden' : 'visible')
  this.updateCode()
}

InsertionDynamiqueDlg.prototype.updateCode = function () {
  let codeAInserer
  const ind = this.select.selectedIndex
  if (ind === -1) return
  const el = this.inf.pointeurs[ind]
  const estMatriceOuComplexe = el.estMatrice() || el.estDeNatureCalcul(NatCal.NTteValC)
  $(this.textareainfo).text(el.infoHist())
  const nomValeurSelectionnee = el.getNom()
  const selapproxfrac = $('#cbapproxfrac')
  const approxfrac = selapproxfrac.css('visibility') === 'visible' && selapproxfrac.prop('checked')
  const affSignePlus = estMatriceOuComplexe ? false : $('#cbsigneplus').prop('checked')
  const nombreDecimales = approxfrac ? 2 : this.paneNombreDec.getDigits()
  if (nombreDecimales === 2) {
    codeAInserer = this.debutCode() + nomValeurSelectionnee
    if (affSignePlus) codeAInserer = codeAInserer + ',+' + this.finCode()
    else codeAInserer = codeAInserer + this.finCode()
  } else {
    codeAInserer = this.debutCode() + nomValeurSelectionnee + ',' + nombreDecimales
    if (affSignePlus) codeAInserer = codeAInserer + ',+' + this.finCode()
    else codeAInserer = codeAInserer + this.finCode()
  }
  $(this.infoCode).val(codeAInserer)
}

InsertionDynamiqueDlg.prototype.debutCode = function () {
  if (this.blatex) {
    const selapproxfrac = $('#cbapproxfrac')
    const approxfrac = selapproxfrac.css('visibility') === 'visible' && selapproxfrac.prop('checked')
    if (approxfrac) return '\\ValFrac{'
    else return '\\Val{'
  } else return '#Val('
}

InsertionDynamiqueDlg.prototype.finCode = function () {
  return this.blatex ? '}' : ')'
}

InsertionDynamiqueDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.select)
}

InsertionDynamiqueDlg.prototype.OK = function () {
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
