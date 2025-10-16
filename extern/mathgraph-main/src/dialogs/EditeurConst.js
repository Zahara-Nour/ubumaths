/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Pointeur from '../types/Pointeur'
import $ from 'jquery'
import 'jquery-textrange'
import CalcR from '../kernel/CalcR'
import AvertDlg from './AvertDlg'
import { nbDecimalesOK } from 'src/kernel/kernelAdd'

export default EditeurConst

/**
 * Objet associé à un input d'une boîte de dialogue et chargé de regarder si
 * la syntaxe du contenu de l'input est correcte.
 * L'input doit contenir une constante ne dépendant d'aucune valeur de la figure
 * @param {MtgApp} app L'application mtgApp propriétaire
 * @param {HTMLInputElement} input L'éditeur associé
 * @param {number} min  La vameur mini permise pour la constante
 * @param {number} max  La valeur maxi permise pour la constante
 * @param {boolean} bint true si on attend un résultat entier
 * @constructor
 */
function EditeurConst (app, input, min, max, bint = true) {
  this.app = app
  this.input = input
  this.min = min
  this.max = max
  this.bint = bint
}

/**
 * Retourne true si le contenu de l'input est valide
 * @return {boolean}
 */
EditeurConst.prototype.validate = function () {
  const app = this.app
  const list = app.listePr
  const inderr = new Pointeur(0)
  const self = this
  const ch = $(this.input).val()
  const syntOK = CalcR.verifieSyntaxe(app.listePourConst, ch, inderr, -1, null)
  const nbDecOK = nbDecimalesOK(ch)
  if (syntOK && nbDecOK) {
    const calc = CalcR.ccb(ch, list, 0, ch.length - 1, null)
    try {
      // list.initialiseNombreIterations();
      const valeur = calc.resultat(false) // Pour pouvoir rajouter une condition sur la veleur entée
      if (valeur < this.min || valeur > this.max || (this.bint ? (valeur !== Math.round(valeur)) : false)) {
        new AvertDlg(app, 'Incorrect', function () {
          self.input.focus()
          // Test ligne suivante des fois que j'aie oublié de déclarer un éditeur comme getMtgInput
          if (self.input.marquePourErreur) self.input.marquePourErreur()
        })
        return false
      }

      // c'est tout bon
      return true
    } catch (e) {
      inderr.setValue(ch.length)
      $(this.input).textrange('setcursor', ch.length)
      new AvertDlg(app, 'ErrCalculNonExist', function () {
        self.input.focus()
        // Test ligne suivante des fois que j'aie oublié de déclarer un éditeur comme getMtgInput
        if (self.input.marquePourErreur) self.input.marquePourErreur()
      })
      return false
    }
  }
  // y'a un pb…
  const msg = nbDecOK ? 'ErrSyntaxe' : 'NbDecMax'
  const col = inderr.getValue()
  $(this.input).textrange('setcursor', col)
  new AvertDlg(app, msg, function () {
    self.input.focus()
    // Test ligne suivante des fois que j'aie oublié de déclarer un éditeur comme getMtgInput
    if (self.input.marquePourErreur) self.input.marquePourErreur()
  })
  return false
}
