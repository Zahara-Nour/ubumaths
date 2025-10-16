/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ce, empty } from '../kernel/dom'
import { getStr, preventDefault } from '../kernel/kernel'
import { natObjCalPourProto } from '../kernel/kernelAdd'
import NatCal from '../types/NatCal'
import MtgDlg from './MtgDlg'
import AvertDlg from './AvertDlg'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import { getMtgInput } from './dom'
import CalcR from '../kernel/CalcR'
import CalcC from '../kernel/CalcC'
import Pointeur from '../types/Pointeur'
import $ from 'jquery'
export default ConstImpSrcNumDlg

/**
 * Boîte de dialogue proposant une liste formé de tous les objets de type calcul
 * qui peuvent être des objets sources pour le prototype proto.
 * @constructor
 * @param {MtgApp} app L'application MtgApp propriétaire
 * @param {CPrototype} proto
 * @param callBackOK Fonction de callBack à appeler après validation par OK.
 * Cette fonction de callBack prend un paramètre tab qui est un array de longuer le nombre
 * d'éléments sources du prototype qu'on implémente, chaque élément du tableau étant soit un pointeur
 * sur l'objet à affecter à l'élément source soit une chaine de caractères représentant un calcul valide
 * réel ou complexe, calcul qu'il faudra créer et affecter comme élément source.
 */
function ConstImpSrcNumDlg (app, proto, callBackOK) {
  // On met dans un tableau this.tab de longueur le nombre d'objets sources numériques
  // soit un entier correspondant à l'élément sélectionné dans la liste de droite soit une
  // chaine de caractères correspondant à la formule entrée par l'utilisateur
  // soit un pointeur sur l'objet sélectionné dans la liste de gauche
  MtgDlg.call(this, app, 'SrcNumDlg', callBackOK)
  this.proto = proto
  const nbSources = proto.nbSrcCal()
  this.nbSources = nbSources
  const self = this
  this.tab = []
  for (let j = 0; j < nbSources; j++) this.tab[j] = ''
  const tabPrincipal = ce('table', {
    cellspacing: 3
  })
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  let label = ce('label')
  $(label).html(getStr('SrcNumDlg2'))
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table', {
    cellspacing: 5
  })
  tr.appendChild(tabHaut)
  // A gauche une première colonne pour contenir les numéros des éléments sources
  let td = ce('td')
  $(td).css('vertical-align', 'top')
  tabHaut.appendChild(td)
  let caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:80px'
  })
  $(caption).html(getStr('SrcNumDlg3'))
  td.appendChild(caption)
  this.selectLeft = ce('select', {
    size: 12, // Le nombre de lignes visibles par défaut
    style: 'width:80px'
  })
  td.appendChild(this.selectLeft)
  for (let i = 0; i < nbSources; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    $(option).html(i + 1)
    if (i === 0) $(option).attr('selected', 'selected')
    this.selectLeft.appendChild(option)
  }
  this.selectLeft.onchange = function () {
    self.onSelectLeftChange()
  }
  // Au milieu une première colonne pour contenir les éléments qu'on peut associer au n° choisi
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tabHaut.appendChild(td)
  caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:160px'
  })
  $(caption).html(getStr('SrcNumDlg4'))
  td.appendChild(caption)

  this.selectRight = ce('select', {
    size: 12,
    style: 'width:160px'
  })
  td.appendChild(this.selectRight)
  this.selectRight.onchange = function () {
    self.onSelectRightChange()
  }

  // A droite des deux listes un panel qui contiendra un éditeur qui pourra être caché si l'élément associé n'est pas
  // compatible avec un calcul réel ou complexe et dessous un textarea donnant des infos sur l'élément slécionné
  // dans la liste de droite
  td = ce('td')
  tabHaut.appendChild(td)
  const tabRight = ce('panel', {
    cellspacing: 1
  })
  td.appendChild(tabRight)
  tr = ce('tr')
  tabRight.appendChild(tr)
  label = ce('label')
  $(label).html(' ' + getStr('SrcNumDlg6'))
  tr.appendChild(label)
  // Dessous un panel qui contiendra un label et au-dessous un éditeur avec les boutons Valeurs et Fonctions
  tr = ce('tr')
  tabRight.appendChild(tr)
  const tabEdit = ce('table', {
    id: 'tabedit',
    cellspacing: 3
  })
  tr.appendChild(tabEdit)
  tr = ce('tr')
  tabEdit.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('SrcNumDlg7'))
  tr.appendChild(label)
  // Ligne suivante pour l'éditeur. Elle doit commencer par un td vide car dessous il y aura des boutons Valeurs et Fonctions
  tr = ce('tr')
  tabEdit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  this.input = getMtgInput({
    id: 'inputfor',
    size: 36
  })
  td.appendChild(this.input)
  // Si le input contient autre chose qu'une chaine vide, il faut désélectionner la liste de droite et cacher le panel d'info
  // sur la valeur sélectionnée
  this.input.onkeyup = function (ev) {
    this.demarquePourErreur()
    self.unselect()
    if (ev.keyCode === 13) self.tab[self.selectLeft.selectedIndex] = $('#inputfor').val()
  }
  this.input.onkeydown = function (ev) {
    if (ev.keyCode === 9) { // Tab key
      if (self.selectLeft.selectedIndex < self.selectLeft.options.length - 1) {
        self.selectLeft.selectedIndex++
        self.onSelectLeftChange()
        preventDefault(ev)
      }
    }
  }
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.input, true, app.listePr.longueur() - 1, false)
  tabEdit.appendChild(paneBoutonsValFonc)
  tr = ce('tr')
  tabRight.appendChild(tr)
  const tabInfoSel = ce('table', {
    id: 'tabinfosel',
    cellspacing: 5
  })
  tr.appendChild(tabInfoSel)
  tr = ce('tr')
  tabInfoSel.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('SrcNumDlg8'))
  tr.appendChild(label)
  tr = ce('tr')
  tabInfoSel.appendChild(tr)
  const inputinfosel = ce('textarea', {
    id: 'infosel',
    disabled: 'true',
    cols: 40,
    rows: 4
  })
  tr.appendChild(inputinfosel)

  // En bas un panel avec l'info sur l'élément source attendu et au-dessous un etxtarea d'infos
  // sur le prototype
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabBas = ce('table', {
    cellspacing: 5
  })
  tr.appendChild(tabBas)
  tr = ce('tr')
  tabBas.appendChild(tr)
  const div = ce('div')
  tr.appendChild(div)
  label = ce('label')
  $(label).html(getStr('SrcNumDlg5') + ' ')
  div.appendChild(label)
  const inputinf = ce('input', {
    type: 'text',
    id: 'infosource',
    size: 56,
    disabled: true
  })
  div.appendChild(inputinf)
  tr = ce('tr')
  tabBas.appendChild(tr)
  const inputinfconst = ce('textarea', {
    id: 'infoconst',
    disabled: 'true',
    cols: 75,
    rows: 6
  })
  tr.appendChild(inputinfconst)
  // On met dans infoProto la chaîne d'aide à l'exception de la partie affichée pour aider à la désignation
  // c'est à dire ce qui suit le premier # s'il y en a un
  const ch = proto.commentaire
  const k = ch.indexOf('#')
  if (k !== -1) $(inputinfconst).val(ch.substring(0, k))
  else $(inputinfconst).val(ch)
  this.oldLeftSelIndex = 0 // Pour pouvoir quand on change la sélection de gauche affecter le contenu de l'éditeur de formule
  this.initSelection()
  this.onSelectLeftChange()

  this.create('SrcNumDlg1', 650)
}

ConstImpSrcNumDlg.prototype = new MtgDlg()

/**
 * Fonction qui préselectionne dans la liste de droite les élléments qui ne sont pas des calculs éditables
 * et qui sont les seuls disponibles
 */
ConstImpSrcNumDlg.prototype.initSelection = function () {
  let i; let inf
  const app = this.app
  const list = app.listePr
  for (i = 0; i < this.nbSources; i++) {
    inf = list.listeParNatCal(app,
      natObjCalPourProto(this.proto.get(i).getNatureCalcul()), list.longueur() - 1)
    if (!this.isCalc(i) && (inf.pointeurs.length === 1)) this.tab[i] = inf.pointeurs[0]
  }
}

ConstImpSrcNumDlg.prototype.onSelectLeftChange = function () {
  // On regarde si au moment où on a changé la sélection dans la liste de gauche si le conenu de l'éditeur n'était pas vide
  // Si c'est le cas on affecte son contenu à this.tab[this.oldSeelectedIndex]
  const oldind = this.oldLeftSelIndex
  const oldsel = this.tab[oldind]
  const sel = $('#inputfor')
  const str = sel.val()
  if (this.isCalc(oldind) && (typeof oldsel === 'string') && (str !== '')) this.tab[oldind] = str
  this.updateList()
  const index = this.selectLeft.selectedIndex
  $('#infosource').val(this.proto.chIndSourceNum(index))
  const editVisible = this.isCalc(index)
  $('#tabedit').css('visibility', editVisible ? 'visible' : 'hidden')
  this.oldLeftSelIndex = index
  const ch = this.tab[index]
  if (ch !== '') {
    if (typeof ch === 'string') sel.val(ch)
    else {
      sel.val('')
      this.selectRight.selectedIndex = this.inf.pointeurs.indexOf(ch)
      $('#infosel').val(ch.infoHist())
    }
  } else {
    $('#infosel').val('')
    sel.val('')
    if (!editVisible && this.inf.pointeurs.length === 1) {
      this.selectRight.selectedIndex = 0
      this.tab[index] = this.inf.pointeurs[0]
    }
  }
  // if (editVisible) sel.focus();
}

/**
 * Fonction qui désélectionne la liste de droite et vide le textarea d'info sur l'élément sélectionné
 */
ConstImpSrcNumDlg.prototype.unselect = function () {
  this.tab[this.selectLeft.selectedIndex] = ''
  this.selectRight.selectedIndex = -1
  $('#tabinfosel').css('visibility', 'hidden')
}

ConstImpSrcNumDlg.prototype.onSelectRightChange = function () {
  $('#inputfor').val('')
  $('#tabinfosel').css('visibility', 'visible')
  const el = this.inf.pointeurs[this.selectRight.selectedIndex]
  this.tab[this.selectLeft.selectedIndex] = el
  $('#infosel').val(el.infoHist())
}

ConstImpSrcNumDlg.prototype.updateList = function () {
  const app = this.app
  const list = app.listePr
  empty(this.selectRight)
  this.inf = list.listeParNatCal(app,
    natObjCalPourProto(this.proto.get(this.selectLeft.selectedIndex).getNatureCalcul()), list.longueur() - 1)
  for (let i = 0; i < this.inf.pointeurs.length; i++) {
    const option = ce('option', {
      class: 'mtgOption'
    })
    $(option).html(this.inf.noms[i])
    this.selectRight.appendChild((option))
  }
}

ConstImpSrcNumDlg.prototype.onCancel = function () {
  this.app.activeOutilCapt()
  this.destroy()
}

ConstImpSrcNumDlg.prototype.OK = function () {
  let valide
  const app = this.app
  const list = app.listePr
  const proto = this.proto
  const nbSources = proto.nbSrcCal()
  const inderr = new Pointeur(0)
  const indmax = list.longueur() - 1
  const index = this.selectLeft.selectedIndex
  // On regarde d'abord si on était en train d'éditer une formule
  if (this.isCalc(index) && (typeof this.tab[index] === 'string')) this.tab[index] = $('#inputfor').val()

  for (let i = 0; i < nbSources; i++) {
    const ch = this.tab[i] // Peut être un pointeur ou une chaîne de caractères
    if (typeof ch === 'string') {
      // On vérifie si la syntaxe est correcte suivant que c'est un calcul réel ou complexe
      if (proto.get(i).getNatureCalcul() === NatCal.NCalculReel) { valide = CalcR.verifieSyntaxe(list, ch, inderr, indmax, null) } else { valide = CalcC.verifieSyntaxeComplexe(list, ch, inderr, indmax, null) }
      if (!valide) {
        this.selectLeft.selectedIndex = i
        this.onSelectLeftChange()
        this.input.marquePourErreur()
        new AvertDlg(app, 'Incorrect', function () {
          $('#inputfor').focus()
        })
        return
      }
    }
  }
  // Si tout est correct on appelle this.callBackOK avec comme paramètre this.tab
  this.callBackOK(this.tab)
  this.destroy()
}

/**
 * Fonction renvoyant true seulement si l'élément source numérique n° ind de this.proto
 * est un calcul réel ou complexe
 * @param ind
 */
ConstImpSrcNumDlg.prototype.isCalc = function (ind) {
  return natObjCalPourProto(this.proto.get(ind).getNatureCalcul()).isOfNature(NatCal.NCalcRouC)
}
