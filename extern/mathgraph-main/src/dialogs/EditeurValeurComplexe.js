/*
 * Created by yvesb on 30/12/2016.
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
import CalcC from '../kernel/CalcC'
import AvertDlg from './AvertDlg'
import { nbDecimalesOK } from 'src/kernel/kernelAdd'
export default EditeurValeurComplexe

/**
 * Objet associé à un input d'une boîte de dialogue et chargé de regarder si
 * la syntaxe du contenu de l'éditeur est correcte.
 * @param {MtgApp} app L'application mtgApp propriétaire
 * @param input L'éditeur associé
 * @param indfin L'indice de fin de l'analyse de syntaxe dans la liste des objets créés dans l'appli
 * @param {CValeurComp} value Le CValeurComp auquel sera affecté la formule entrée.
 * @param {null|string[]} variables null pour un calcul, variables formelle pour une fonction
 * @constructor
 */
function EditeurValeurComplexe (app, input, indfin, value, variables) {
  this.app = app
  this.input = input
  this.indfin = indfin
  this.value = value
  this.variables = variables
}

EditeurValeurComplexe.prototype.validate = function () {
  const app = this.app
  const list = app.listePr
  const listePourConst = app.listePourConst
  const inderr = new Pointeur(0)
  const self = this
  const ch = $(this.input).val()
  const syntOK = CalcC.verifieSyntaxeComplexe(listePourConst, ch, inderr, this.indfin, this.variables)
  const nbDecOK = nbDecimalesOK(ch)
  if (syntOK && nbDecOK) {
    // var calc = new CalcC.ccbComp(ch, list, 0, ch.length - 1, this.variables, listePourConst) // Corrigé version 6.4.1
    const calc = CalcC.ccbComp(ch, list, 0, ch.length - 1, this.variables, listePourConst)
    this.value.donneCalcul(calc)
    try {
      list.initialiseNombreIterations()
      // Si on n'édite pas une formule de fonction on calcule le résultat et on le met dans this.res
      // pour pouvoir rajouter une condition sur le résultat
      if (this.variables === null) calc.resultatComplexe(false, this.value.valeurComplexe)
      return true
    } catch (e) {
      new AvertDlg(app, 'ErrCalculNonExist')
      return true // Version 6.0 : On accepte de créer un calcul qui n'existe pas
    }
  } else {
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
}
