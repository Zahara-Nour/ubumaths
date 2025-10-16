/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ce } from 'src/kernel/dom'
import { getStr, zero } from '../kernel/kernel'
import NatObj from '../types/NatObj'
import MtgDlg from './MtgDlg'
import CValeur from '../objets/CValeur'
import CImplementationProto from '../objets/CImplementationProto'
import MtgInputWithCharSpe from './MtgInputWithCharSpe'
import EditeurvaleurReelle from './EditeurValeurReelle'
import EditeurNomCalcul from './EditeurNomCalcul'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import PaneNombreDecimales from './PaneNombreDecimales'
import AvertDlg from './AvertDlg'
import { getMtgInput } from './dom'
import MotifPoint from '../types/MotifPoint'

export default CurseurDlg

/**
 * Dialogue de création d'un curseur
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param pt Le point qui est destiné à être l'extrémité du curseur
 * @param bptCree true si le point pt a été créé en clqiaunt à un endroit vide de la figure, false sinon
 */
function CurseurDlg (app, pt, bptCree) {
  MtgDlg.call(this, app, 'curseurdlg')
  this.pt = pt
  this.bptCree = bptCree
  const self = this
  const list = app.listePr
  // Un CValeur pour stocker la valeur choisie pour l'abscisse avant vérification
  this.valMin = new CValeur(list, 0)
  // Un CValeur pour stocker la valeur choisie pour l'ordonnée avant vérification
  this.valMax = new CValeur(list, 0)
  // Un CValeur pour stocker la valeur choisie pour le pas avant vérification
  this.valPas = new CValeur(list, 0)
  // Un CValeur pour stocker la valeur choisie pour le pas de graduation avant vérification
  this.valPasGrad = new CValeur(list, 0)

  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  // En haut un tableau pour contenir les quatre boutons radios de choix de type de curseur et la
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneButtons = ce('table')
  tr.appendChild(paneButtons)
  tr = ce('tr')
  paneButtons.appendChild(tr)
  // Bouton radio de choix de curseur horizontal
  let td = ce('td')
  tr.appendChild(td)
  let rad = ce('input', {
    id: 'rad1',
    type: 'radio',
    name: 'orient'
  })
  td.appendChild(rad)
  $(rad).attr('checked', 'true')
  let label = ce('label', {
    for: 'rad1'
  })
  $(label).html(getStr('CurHor'))
  td.appendChild(label)
  // Bouton radio de choix de curseur vertical
  td = ce('td')
  tr.appendChild(td)
  rad = ce('input', {
    id: 'rad2',
    type: 'radio',
    name: 'orient'
  })
  td.appendChild(rad)
  label = ce('label', {
    for: 'rad2'
  })
  $(label).html(getStr('CurVer'))
  td.appendChild(label)
  // Ligne suivante.
  tr = ce('tr')
  paneButtons.appendChild(tr)
  // Bouton radio de choix de curseur de petite taille
  td = ce('td')
  tr.appendChild(td)
  rad = ce('input', {
    id: 'rad3',
    type: 'radio',
    name: 'size'
  })
  td.appendChild(rad)
  $(rad).attr('checked', 'true')
  label = ce('label', {
    for: 'rad3'
  })
  $(label).html(getStr('CurSmall'))
  td.appendChild(label)

  // Bouton radio de choix de curseur de grande taille
  td = ce('td')
  tr.appendChild(td)
  rad = ce('input', {
    id: 'rad4',
    type: 'radio',
    name: 'size'
  })
  td.appendChild(rad)
  label = ce('label', {
    for: 'rad4'
  })
  $(label).html(getStr('CurBig'))
  td.appendChild(label)

  // Une ligne pour la checkBox de curseur entier
  tr = ce('tr')
  paneButtons.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  let cb = ce('input', {
    id: 'cbEnt',
    type: 'checkbox'
  })
  td.appendChild(cb)
  cb.onclick = function () {
    self.onCheckPas()
  }
  label = ce('label', {
    for: 'cbEnt'
  })
  $(label).html(getStr('CurEnt'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  cb = ce('input', {
    id: 'cbGrad',
    type: 'checkbox'
  })
  td.appendChild(cb)
  cb.onclick = function () {
    self.onCheckPasGrad()
  }
  label = ce('label', {
    for: 'cbGrad'
  })
  $(label).html(getStr('AvecGrad'))
  td.appendChild(label)

  // Au centre un tableau qui va contenir deux colonnes. Dans la colonne de gauche un tableue pour contenir
  // les éditeurs de valeurs mini et maxi et à droite un panneau de choix de nombre de décimales.
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneCentre = ce('table')
  tr.appendChild(paneCentre)
  td = ce('td')
  paneCentre.appendChild(td)
  const paneCentreGauche = ce('table')
  td.appendChild(paneCentreGauche)
  tr = ce('tr')
  paneCentreGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('ValMin'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputMin = getMtgInput()
  td.appendChild(this.inputMin)
  const paneBoutonsValFoncMin = new PaneBoutonsValFonc(this.app, this, this.inputMin, true, -1)
  paneCentreGauche.appendChild(paneBoutonsValFoncMin)
  this.editeurMin = new EditeurvaleurReelle(app, this.inputMin, list.longueur() - 1, this.valMin, null)

  tr = ce('tr')
  paneCentreGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('ValMax'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputMax = getMtgInput()
  td.appendChild(this.inputMax)
  const paneBoutonsValFoncMax = new PaneBoutonsValFonc(this.app, this, this.inputMax, true, -1)
  paneCentreGauche.appendChild(paneBoutonsValFoncMax)
  this.editeurMax = new EditeurvaleurReelle(app, this.inputMax, list.longueur() - 1, this.valMax, null)

  td = ce('td')
  $(td).css('vertical-align', 'top')
  paneCentre.appendChild(td)
  this.paneDecimales = new PaneNombreDecimales(2)
  td.appendChild(this.paneDecimales.container)

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  // Un tableau pour contenir les composants permettant d'éditeur la valeur du pas si
  // la checkBox correspondante est cochée
  const panePas = ce('table', {
    id: 'panepas'
  })
  tr.appendChild(panePas)
  tr = ce('tr')
  panePas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('PasCur'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputPas = getMtgInput()
  td.appendChild(this.inputPas)
  this.paneBoutonsValPas = new PaneBoutonsValFonc(this.app, this, this.inputPas, true, -1)
  panePas.appendChild(this.paneBoutonsValPas)
  this.editeurPas = new EditeurvaleurReelle(app, this.inputPas, list.longueur() - 1, this.valPas, null)

  // Un tableau pour contenir les composants permettant d'éditeur la valeur du pas de graduation si
  // la checkBox correspondante est cochée
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneGrad = ce('table', {
    id: 'panegrad'
  })
  tr.appendChild(paneGrad)
  tr = ce('tr')
  paneGrad.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('PasGrad'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputPasGrad = getMtgInput()
  td.appendChild(this.inputPasGrad)
  this.paneBoutonsValGrad = new PaneBoutonsValFonc(this.app, this, this.inputPasGrad, true, -1)
  paneGrad.appendChild(this.paneBoutonsValGrad)
  this.editeurPasGrad = new EditeurvaleurReelle(app, this.inputPasGrad, list.longueur() - 1, this.valPasGrad, null)

  // En bas un tableau de quatre lignes pour contenir 3 champs d'édition et un checkBox sur quatre lignes.
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneBas = ce('table')
  tr.appendChild(paneBas)
  tr = ce('tr')
  paneBas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('CurNom'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputNom = getMtgInput()
  td.appendChild(this.inputNom)
  this.editeurNom = new EditeurNomCalcul(app, true, this.inputNom)
  tr = ce('tr')
  paneBas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('EnTete'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // this.inputEnTete = ce("input");
  this.inputEnTete = new MtgInputWithCharSpe(app, {}, ['grec', 'math', 'arrows'], false, this)

  td.appendChild(this.inputEnTete)
  tr = ce('tr')
  paneBas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('SuiviDe'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // this.inputSuiviDe = ce("input");
  this.inputSuiviDe = new MtgInputWithCharSpe(app, {}, ['grec', 'math', 'arrows'], false, this)
  td.appendChild(this.inputSuiviDe)
  tr = ce('tr')
  paneBas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  cb = ce('input', {
    id: 'cbPunaiser',
    type: 'checkbox'
  })
  td.appendChild(cb)
  $(cb).attr('checked', 'true')
  label = ce('label', {
    for: 'cbPunaiser'
  })
  $(label).html(getStr('CurPun'))
  td.appendChild(label)
  this.onCheckPas()
  this.onCheckPasGrad()
  this.create('Curseur', 550)
}

CurseurDlg.prototype = new MtgDlg()

CurseurDlg.prototype.onCheckPas = function () {
  const checked = $('#cbEnt').prop('checked')
  $('#panepas').css('display', checked ? 'inline' : 'none')
  $(this.paneDecimales.container).css('visibility', checked ? 'hidden' : 'visible')
}

CurseurDlg.prototype.onCheckPasGrad = function () {
  const checked = $('#cbGrad').prop('checked')
  $('#panegrad').css('display', checked ? 'inline' : 'none')
}

CurseurDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.inputMin)
}

CurseurDlg.prototype.OK = function () {
  let valaff, seg, pt, ptb
  const discret = $('#cbEnt').prop('checked')
  const gradue = $('#cbGrad').prop('checked')
  if (this.editeurNom.validate() && this.editeurMin.validate() && this.editeurMax.validate() &&
      (discret ? this.editeurPas.validate() : true) &&
      (gradue ? this.editeurPasGrad.validate() : true)) {
    const app = this.app
    const list = app.listePr
    const self = this
    const min = this.valMin.valeur
    const max = this.valMax.valeur
    const hor = $('#rad1').prop('checked')
    const petit = $('#rad3').prop('checked')

    const punaise = $('#cbPunaiser').prop('checked')
    if ((min === max) || (discret && min > max)) {
      new AvertDlg(app, 'ErrMinMax', function () {
        self.inputMin.focus()
      })
      return
    }
    if (discret && ((min !== Math.floor(min)) || (max !== Math.floor(max)))) {
      new AvertDlg(app, 'Incorrect', function () {
        self.inputMin.focus()
      })
      return
    }
    if (discret) {
      const pas = this.valPas.valeur
      const qpas = (max - min) / pas
      if (!zero(qpas - Math.round(qpas))) {
        new AvertDlg(app, getStr('ErrPas'), function () {
          self.inputPas.focus()
        })
        return
      }
    }
    if (gradue) {
      const pasGrad = this.valPasGrad.valeur
      const qpasGrad = (max - min) / pasGrad
      if (!zero(qpasGrad - Math.round(qpasGrad))) {
        new AvertDlg(app, getStr('ErrPas'), function () {
          self.inputPasGrad.focus()
        })
        return
      }
    }
    let nomProto = 'Curseur'
    if (discret) nomProto += 'Discret'
    nomProto += hor ? 'Hor' : 'Ver'
    if (gradue) nomProto += 'Gradue'

    // Si les valeurs choisies pour le minimum et le maximum ne sont pas des références à des valeurs exsitantes
    // on crée de nouveux calculs qu'on ajoute à la figure
    const proto = app.docCons.getPrototype(nomProto)
    let i = 0
    proto.get(i++).elementAssocie = this.valMin.getCalcForImpProto(app, 'mini', true)
    proto.get(i++).elementAssocie = this.valMax.getCalcForImpProto(app, 'maxi', true)
    if (discret) { proto.get(i++).elementAssocie = this.valPas.getCalcForImpProto(app, getStr('step'), true) }

    if (gradue) { proto.get(i++).elementAssocie = this.valPasGrad.getCalcForImpProto(app, getStr('stepGrid'), true) }
    proto.get(i).elementAssocie = this.pt
    const impProto = new CImplementationProto(list, proto)
    impProto.implemente(app.dimf, proto)
    impProto.nomProto = getStr('Curseur')

    // On modifie le dernier objet implémenté qui est un affichage de valeur lié à un point
    // suivant les choix de la boîte de dialogue
    const lon = list.longueur()
    // var affval = list.get(lon - 1);
    const affval = impProto.dernierFinal(NatObj.NValeurAffichee)
    affval.enTete = $(this.inputEnTete).val()
    affval.postChaine = $(this.inputSuiviDe).val()
    affval.couleurFond = app.doc.couleurFond
    affval.effacementFond = true
    affval.taillePolice = 15
    // On donne au calcul représentant le curseur le nom choisi
    const calc = list.get(lon - 2)
    calc.donneNom($(this.inputNom).val())
    // On modifie le style de trait et de couleur des objets finaux
    const col = app.getCouleur()
    const styleTrait = app.getStyleTrait()
    const indImpProto = list.indexOf(impProto)
    if (punaise) {
      if (this.pt.estDeNature(NatObj.NPointMobile)) { this.pt.fixed = true }
    }

    // pt = list.get(indImpProto + 2);
    pt = impProto.premierFinal(NatObj.NPointLie)
    pt.donneCouleur(col)
    // pt.tailleNom = frame.pref_indiceTaillePoliceNom; // A revoir
    pt.tailleNom = app.getTaillePoliceNom()
    pt.fixed = punaise
    // seg = list.get(indImpProto + 3);
    seg = impProto.premierFinal(NatObj.NSegment)
    seg.donneCouleur(col)
    seg.donneStyle(styleTrait)
    // ptb = list.get(indImpProto + 11);
    ptb = impProto.dernierFinal(discret ? NatObj.NPointBaseEnt : NatObj.NPointLie)
    ptb.donneCouleur(col)
    ptb.donneMotif(MotifPoint.rond)
    // ptb.tailleNom = frame.pref_indiceTaillePoliceNom; // Ajout version 4.9.1.1
    ptb.tailleNom = app.getTaillePoliceNom()
    // valaff = list.get(indImpProto + 14);
    valaff = impProto.dernierFinal(NatObj.NValeurAffichee)
    valaff.donneCouleur(col)

    // Si on a demandé un curseur de grande taille, on multiplie l'abscisse du point lié par 2
    if (!petit) {
      pt.donneAbscisse(pt.abscisse * 2)
    }
    if (!discret) affval.nombreDecimales = this.paneDecimales.getDigits()
    list.positionne(false, app.dimf)
    list.setReady4MathJax()
    list.afficheTout(indImpProto, app.svgFigure, true, app.doc.couleurFond)
    this.destroy()
    app.outilCurseur.saveFig()
    app.activeOutilCapt()
  }
}

CurseurDlg.prototype.onCancel = function () {
  const app = this.app
  if (this.bptCree) {
    const list = app.listePr
    list.get(list.longueur() - 1).removegElement(app.svgFigure)
    app.detruitDernierElement()
  }
  this.destroy()
  app.activeOutilCapt()
}
