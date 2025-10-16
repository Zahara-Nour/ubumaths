/*
 * Created by yvesb on 06/03/2017.
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
import PaneAlignement from './PaneAlignement'
import PaneTaillePolice from './PaneTaillePolice'
import PaneModeAffichage from './PaneModeAffichage'
import { getMtgInput } from './dom'
export default LieuObjetDlg

/**
 * Dialogue de choix d'un lieu d'objets par point lié
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param lieu Le lieu dont le nombre d'objets doit être changé
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 * @param callBackOK null ou fonction de callBack à appeler après OK
 * @param callBackCancel null ou fonction de callBack à appeler après annumlation
 */
function LieuObjetDlg (app, lieu, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'LieuObjetDlg', callBackOK, callBackCancel)
  const self = this
  this.lieu = lieu
  this.modification = modification
  this.estElementFinal = this.lieu.estElementFinal
  const list = app.listePr
  // Un CValeur pour stocker la valeur choisie avant vérification
  this.valeur = new CValeur(list, this.lieu.nombreTraces.valeur)
  const tab = ce('table')
  this.appendChild(tab)
  let tr = ce('tr')
  tab.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  const tr2 = ce('tr')
  tabHaut.appendChild(tr2)
  let td = ce('td')
  tr2.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('lieuObjetDlg1'))
  td.appendChild(label)
  td = ce('td')
  tr2.appendChild(td)
  const input = getMtgInput({
    id: 'mtginput'
  })
  $(input).val(this.valeur.valeur)
  td.appendChild(input)
  input.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  this.input = input
  const indmax = modification ? list.indexOf(lieu) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, input, true, indmax)
  tabHaut.appendChild(paneBoutonsValFonc)
  //
  this.editor = new EditeurvaleurReelle(app, input, indmax, this.valeur, null)
  if (modification) {
    $(input).val(replaceSepDecVirg(app, lieu.nombreTraces.calcul))
  }
  if (this.estElementFinal) {
    $(input).attr('disabled', true)
    $(paneBoutonsValFonc).css('visibility', 'hidden')
  }
  // Si on modifie un lieu d'objets d'ffichage (graduationde repère par exemple) on donne la possibilité de
  // changer certaines caractéristiques de l'affichage
  this.hasLowerPane = modification && lieu.estCapturableSouris()
  if (this.hasLowerPane) {
    const el = lieu.elementAssocie // C'est forcément un affichage de texte
    this.paneAlign = new PaneAlignement(app, el.alignementHorizontal, el.alignementVertical)
    tr = ce('tr')
    tab.appendChild(tr)
    const tableBas = ce('table')
    tr.appendChild(tableBas)
    td = ce('td', {
      valign: 'top'
    })
    tableBas.appendChild(td)
    td.appendChild(this.paneAlign.container)
    td = ce('td', {
      valign: 'top'
    })
    tableBas.appendChild(td)
    this.paneTaillePolice = new PaneTaillePolice(el.taillePolice)
    tableBas.appendChild(this.paneTaillePolice.container)
    td = ce('td', {
      valign: 'top'
    })
    tableBas.appendChild(td)
    this.angleIsModif = !el.estFinalEtAngleEstDynamique() // true si on peut modifier l'
    const indmax = list.indexOf(el) - 1
    this.paneModeAffichage = new PaneModeAffichage(this, false, el.effacementFond, el.encadrement,
      el.couleurFond, el.angText.chaineInfo(), indmax, null, this.angleIsModif)
    td.appendChild(this.paneModeAffichage.container)
  }
  this.create('LieuObj', 500)
}

LieuObjetDlg.prototype = new MtgDlg()

LieuObjetDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? null : 'mtginput')
  // if (this.hasLowerPane) this.paneModeAffichage.init(); Doit être appelé avant qu'on donne le focus
  // et l'appel du focus soit être décalé via un setTimeout
  if (this.hasLowerPane) this.paneModeAffichage.init()
}

LieuObjetDlg.prototype.OK = function () {
  if (this.estElementFinal || this.editor.validate($('#mtginput').val())) {
    const self = this
    const va = this.valeur.valeur
    if ((va < 2) || (va > 100000) || (va !== Math.floor(va))) { new AvertDlg(this.app, 'Incorrect', function () { $('#mtginput').focus(); self.input.marquePourErreur() }) } else {
      if (!this.estElementFinal) this.lieu.nombreTraces = this.valeur
      // Si on modifie un lieu d'objets d'affichage (graduationde repère par exemple) on donne la possibilité de
      // changer certaines caractéristiques de l'affichage
      const el = this.lieu.elementAssocie // C'est un affichage
      if (this.hasLowerPane) {
        if (this.angleIsModif && this.paneModeAffichage.validate()) {
          const app = this.app
          if (this.paneModeAffichage.valeurAngle.calcul.depDe(el.impProto)) {
            new AvertDlg(app, 'AvertAngInvalide')
            this.paneModeAffichage.input.focus()
            return
          } else {
            el.angText = this.paneModeAffichage.getAng()
          }
        }
        const elh = this.paneAlign.getHorAlign()
        const elv = this.paneAlign.getVerAlign()
        const taille = this.paneTaillePolice.getTaille()
        const effFond = this.paneModeAffichage.getEffFond()
        const encadrement = this.paneModeAffichage.getStyleEnc()
        const coulFond = this.paneModeAffichage.getColor()
        // On recrée le lieu d'objet entièrement
        el.alignementHorizontal = elh
        el.alignementVertical = elv
        el.taillePolice = taille
        el.effacementFond = effFond
        el.encadrement = encadrement
        el.couleurFond = coulFond
        this.lieu.metAJour()
      }
      if (this.callBackOK !== null) this.callBackOK()
      if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
      this.destroy()
    }
  }
}
