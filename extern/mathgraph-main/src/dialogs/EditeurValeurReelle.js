/*
 * Created by yvesb on 16/10/2016.
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
import CalcR from '../kernel/CalcR'
import AvertDlg from './AvertDlg'
import { nbDecimalesOK } from 'src/kernel/kernelAdd'

export default EditeurValeurReelle

/**
 * Objet associé à un input d'une boîte de dialogue et chargé de regarder si
 * la syntaxe du contenu de l'éditeur est correcte.
 * @param {MtgApp} app L'application mtgApp propriétaire
 * @param input L'éditeur associé
 * @param indfin L'indice de fin de l'analyse de syntaxe dans la liste des objets créés dans l'appli
 * @param {CValeur|CValeurComp} value CValeur auquel sera affecté la formule entrée.
 * @param {null|string[]} variables null pour un calcul, variables formelle pour une fonction
 * @param {boolean} noMessage true si on ne veut pas de message d'erreur affiché
 * @constructor
 */
function EditeurValeurReelle (app, input, indfin, value, variables, noMessage = false) {
  this.app = app
  this.input = input
  this.indfin = indfin
  this.value = value
  this.variables = variables
  this.noMessage = noMessage
}

EditeurValeurReelle.prototype.validate = function () {
  const app = this.app
  const list = app.listePr
  const listePourConst = app.listePourConst
  const inderr = new Pointeur(0)
  const self = this
  let ch = $(this.input).val()
  if (!app.decimalDot) {
    if (/^[+-]?\d*,\d*$/.test(ch)) {
      ch = ch.replace(',', '.')
    }
  }
  const syntOK = CalcR.verifieSyntaxe(listePourConst, ch, inderr, this.indfin, self.variables)
  const nbDecOK = nbDecimalesOK(ch)
  if (syntOK && nbDecOK) {
    // var calc = new CalcR.ccb(ch, list, 0, ch.length - 1, self.variables, listePourConst) // Corrigé version 6.4.1
    const calc = CalcR.ccb(ch, list, 0, ch.length - 1, self.variables, listePourConst)
    try {
      this.value.donneCalcul(calc)
      list.initialiseNombreIterations()
      // Si on n'édite pas une formule de fonction on calcule le résultat et on le met dans this.value.valeur
      // pour pouvoir rajouter une condition sur le résultat
      if (this.variables === null) this.value.valeur = calc.resultat(false) // Pour pouvoir rajouter une condition sur la valeur entée
      return true
    } catch (e) {
      if (!this.noMessage) new AvertDlg(app, 'ErrCalculNonExist')
      return true // Version 6.0 : On accepte de créer un calcul qui n'existe pas
    }
  } else {
    const msg = nbDecOK ? 'ErrSyntaxe' : 'NbDecMax'
    const col = inderr.getValue()
    $(this.input).textrange('setcursor', col)
    if (!this.noMessage) {
      new AvertDlg(app, msg, function () {
        self.input.focus()
        // Test ligne suivante des fois que j'aie oublié de déclarer un éditeur comme getMtgInput
        if (self.input.marquePourErreur) self.input.marquePourErreur()
      })
    }
    return false
  }
}
