/*
 * Created by yvesb on 2/06/2021.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Pointeur from '../types/Pointeur'
import $ from 'jquery'
import 'jquery-textrange'
import CalcMatR from '../kernel/CalcMatR'
import AvertDlg from './AvertDlg'

export default EditeurMat

/**
 * Objet associé à un input d'une boîte de dialogue et chargé de regarder si
 * la syntaxe du contenu de l'éditeur est correcte.
 * @param {MtgApp} app L'application mtgApp propriétaire
 * @param {HTMLInputElement} input L'éditeur associé
 * @param {number} indfin L'indice de fin de l'analyse de syntaxe dans la liste des objets créés dans l'appli
 * @param {CValeur|CValeurComp} value  La CValeur auquel sera affecté la formule entrée.
 * @constructor
 */
function EditeurMat (app, input, indfin, value) {
  /** @type {MtgApp} */
  this.app = app
  /** @type {HTMLInputElement} */
  this.input = input
  /** @type {number} */
  this.indfin = indfin
  /** @type {CValeur|CValeurComp} */
  this.value = value
}

EditeurMat.prototype.validate = function () {
  const app = this.app
  const list = app.listePr
  const listePourConst = app.listePourConst
  const inderr = new Pointeur(0)
  const self = this
  const ch = $(this.input).val()
  if (CalcMatR.verifieSyntaxe(listePourConst, ch, inderr, this.indfin, null)) {
    const calc = CalcMatR.ccbmat(ch, list, 0, ch.length - 1, null, listePourConst)
    try {
      this.value.donneCalcul(calc)
      list.initialiseNombreIterations()
      // Si on n'édite pas une formule de fonction on calcule le résultat et on le met dans this.value.valeur
      // pour pouvoir rajouter une condition sur le résultat
      if (this.variables === null) this.value.valeur = calc.resultatMat(false) // Pour pouvoir rajouter une condition sur la veleur entée
      return true
    } catch (e) {
      new AvertDlg(app, 'ErrCalculNonExist')
      return true // Version 6.0 : On accepte de créer un calcul qui n'existe pas
    }
  } else {
    const col = inderr.getValue()
    $(this.input).textrange('setcursor', col)
    new AvertDlg(app, 'ErrSyntaxe', function () {
      self.input.focus()
      // Test ligne suivante des fois que j'aie oublié de déclarer un éditeur comme getMtgInput
      if (self.input.marquePourErreur) self.input.marquePourErreur()
    })
    return false
  }
}
