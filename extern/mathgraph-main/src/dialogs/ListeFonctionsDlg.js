/*
 * Created by yvesb on 02/12/2016.
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
import Opef from '../types/Opef'
import Opef2v from '../types/Opef2v'
import Opef3v from '../types/Opef3v'
import Opef4v from '../types/Opef4v'
import Opef5v from '../types/Opef5v'
export default ListeFonctionsDlg

/**
 *
 * @param {MtgApp} app
 * @param input
 * @param reel
 * @constructor
 */
function ListeFonctionsDlg (app, input, reel) {
  let tr, td, i, option, nomf
  MtgDlg.call(this, app, 'choixValeurDlg')
  this.input = input
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
  const label = ce('label')
  $(label).html(getStr('Fonctions'))
  td.appendChild(label)
  td = ce('TD', {
    valign: 'top'
  })
  tr.appendChild(td)
  const listeNoms = []
  this.listeNoms = listeNoms
  const listeInfo = []
  this.listeInfo = listeInfo
  const listeSyntaxe = []
  this.listeSyntaxe = listeSyntaxe
  if (reel) {
    for (i = 0; i < Opef.nomsFoncs.length; i++) {
      nomf = Opef.nomsFonctions(i)
      listeNoms.push(nomf)
      listeInfo.push(Opef.syntaxeNomsFonctions(i))
      listeSyntaxe.push(nomf + '()')
    }
    for (i = 0; i < Opef2v.nomsFoncs2Var.length; i++) {
      nomf = Opef2v.nomsFonctions2Var(i)
      listeNoms.push(nomf)
      listeInfo.push(Opef2v.syntaxeNomsFonctions2Var(i))
      listeSyntaxe.push(nomf + '(,)')
    }
    for (i = 0; i < Opef3v.nomsFoncs3Var.length; i++) {
      nomf = Opef3v.nomsFonctions3Var(i)
      listeNoms.push(nomf)
      listeInfo.push(Opef3v.syntaxeNomsFonctions3Var(i))
      listeSyntaxe.push(nomf + '(,,)')
    }
    for (i = 0; i < Opef4v.nomsFoncs4Var.length; i++) {
      nomf = Opef4v.nomsFonctions4Var(i)
      listeNoms.push(nomf)
      listeInfo.push(Opef4v.syntaxeNomsFonctions4Var(i))
      listeSyntaxe.push(nomf + '(,,,)')
    }
    for (i = 0; i < Opef5v.nomsFoncs5Var.length; i++) {
      nomf = Opef5v.nomsFonctions5Var(i)
      listeNoms.push(nomf)
      listeInfo.push(Opef5v.syntaxeNomsFonctions5Var(i))
      listeSyntaxe.push(nomf + '(,,,,)')
    }
  } else {
    for (i = 0; i < Opef.nomsFoncsComplexes.length; i++) {
      nomf = Opef.nomsFonctionsComplexes(i)
      listeNoms.push(nomf)
      listeInfo.push(Opef.syntaxeNomsFonctionsComplexes(i))
      listeSyntaxe.push(nomf + '()')
    }
    for (i = 0; i < Opef2v.nomsFoncsComplexes2Var.length; i++) {
      nomf = Opef2v.nomsFonctionsComplexes2Var(i)
      listeNoms.push(nomf)
      listeInfo.push(Opef2v.syntaxeNomsFonctionsComplexes2Var(i))
      listeSyntaxe.push(nomf + '(,)')
    }
    for (i = 0; i < Opef3v.nomsFoncsComplexes3Var.length; i++) {
      nomf = Opef3v.nomsFonctionsComplexes3Var(i)
      listeNoms.push(nomf)
      listeInfo.push(Opef3v.syntaxeNomsFonctionsComplexes3Var(i))
      listeSyntaxe.push(nomf + '(,,)')
    }
    for (i = 0; i < Opef4v.nomsFoncsComplexes4Var.length; i++) {
      nomf = Opef4v.nomsFonctionsComplexes4Var(i)
      listeNoms.push(nomf)
      listeInfo.push(Opef4v.syntaxeNomsFonctionsComplexes4Var(i))
      listeSyntaxe.push(nomf + '(,,,)')
    }
    for (i = 0; i < Opef5v.nomsFoncsComplexes5Var; i++) {
      nomf = Opef5v.nomsFonctionsComplexes5Var(i)
      listeNoms.push(nomf)
      listeInfo.push(Opef5v.syntaxeNomsFonctionsComplexes5Var(i))
      listeSyntaxe.push(nomf + '(,,,,)')
    }
  }
  this.select = ce('select', {
    size: 10, // Le nombre de lignes visilbles par défaut
    style: 'width:100px'
  })
  const self = this
  this.select.onchange = function () {
    self.onSelectChange()
  }

  td.appendChild(this.select)
  // C'est là qu'on ajoute tous les types disponibles dans la liste déroulante
  for (i = 0; i < listeNoms.length; i++) {
    option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(listeNoms[i])
    option.ondblclick = function () { self.OK() }
    this.select.appendChild(option)
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.textarea = ce('textarea', {
    cols: 40,
    rows: 5,
    disabled: 'true'
  })
  tr.appendChild(this.textarea)
  this.onSelectChange()
  this.create('ChoixFonction', 400)
}

ListeFonctionsDlg.prototype = new MtgDlg()

ListeFonctionsDlg.prototype.onSelectChange = function () {
  $(this.textarea).text(this.listeInfo[this.select.selectedIndex])
}

// Si l'utilisateur clique sur OK on remplace dans le champ d'édition associé la sélection(s'il y en a une)
// par le nom de la valeur sélectionnée
ListeFonctionsDlg.prototype.OK = function () {
  // time = Date.now();
  // if (time - this.timeStart < MtgDlg.delay) return; // Moins d'une seconde dans doute mauvais endroit de clic sur un bouton
  // On regarde quel est le type d'objets qui a été choisi.
  // Si plusieurs objets de ce type sont proches, on ouvre alors une boîte de dialogue de choix
  // entre premier et dernier objet
  const ind = this.select.selectedIndex
  const ch = $(this.input).val()
  const chadd = this.listeSyntaxe[ind]
  // On regarde si quelque chose est sélectionné dans le input associé
  const info = $(this.input).textrange()
  $(this.input).val(ch.substring(0, info.start) + chadd + ch.substring(info.end))
  $(this.input).textrange('setcursor', info.start + this.listeNoms[ind].length + 1)
  this.destroy()
}

ListeFonctionsDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.select)
}
