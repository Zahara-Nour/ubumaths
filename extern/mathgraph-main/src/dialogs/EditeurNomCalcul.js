/*
 * Created by yvesb on 02/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import AvertDlg from '../dialogs/AvertDlg'
import $ from 'jquery'
export default EditeurNomCalcul

/**
 * Objet associé à un input d'une boîte de dialogue et chargé de regarder si
 * la syntaxe du contenu de l'éditeur est correcte pour un nom de calcul ou de fonction.
 * @param {MtgApp} app L'application mtgApp propriétaire
 * @param bVerif Si true, doit vérifier que la liste ne contient pas déjà un calcul de même nom
 * @param input Le input associé
 * @constructor
 */
function EditeurNomCalcul (app, bVerif, input) {
  this.app = app
  this.bVerif = bVerif
  this.input = input
}

EditeurNomCalcul.prototype.validate = function () {
  const ch = $(this.input).val()
  let res = this.app.listePr.validationNomVariableOuCalcul(ch)
  if (this.bVerif) res = res && this.app.listePr.validationNomCalculSansMessage(ch)
  if (!res) {
    const self = this
    new AvertDlg(this.app, 'NomInvalide', function () {
      self.input.focus()
      // Test ligne suivante des fois que j'aie oublié de déclarer un éditeur comme getMtgInput
      if (self.input.marquePourErreur) self.input.marquePourErreur()
    })
  }
  return res
}
