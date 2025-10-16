/*
 * Created by yvesb on 09/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import AvertDlg from './AvertDlg'
import Fonte from '../types/Fonte'
import NatObj from '../types/NatObj'
import $ from 'jquery'
export default EditeurNomPtOuDte

/**
 * Objet associé à un input d'une boîte de dialogue et chargé de regarder si
 * la syntaxe du contenu de l'éditeur est correcte pour un nom de point ou de droite
 * et si la listePr de l'application ne contient pas déjà un point ou une droite
 * non intermédiaire ayant ce nom.
 * @param {MtgApp} app L'application mtgApp propriétaire
 * @param input Le input associé
 * @constructor
 */
function EditeurNomPtOuDte (app, input) {
  this.app = app
  this.input = input
}

EditeurNomPtOuDte.prototype.validate = function (ob) {
  // Modification version 6.3.5 : Pour les macs ou Ipad on remplace les apostrophes courbes qui
  // sont générées par le clavier Français par des apostrophes droites
  const ch = $(this.input).val().replace(/’/g, "'")
  if (ch === '') return true
  const self = this
  const app = this.app
  let valide = ob.estDeNature(NatObj.NTtPoint) ? Fonte.validationNomPoint(ch) : Fonte.validationNomDroite(ch)
  if (valide) {
    // Si on est dans un exercice de construction, on refuse un nom d'une point ou une droite faisant partie de la figure initiale
    // qui n'est pas masqué
    if (app.estExercice) {
      const list = app.listePr
      for (let i = 0; valide && (i < list.longueur()); i++) {
        const el = list.get(i)
        if ((el !== ob) && el.estDeNature(NatObj.NObjNommable) && !el.masque && (el.nom === ch)) valide = false
      }
    }
    if (!valide || app.listePourConst.existePointOuDroiteMemeNom(ob, ch)) {
      valide = false
      new AvertDlg(app, 'ExisteMemeNom', function () {
        self.input.focus()
        // Test ligne suivante des fois que j'aie oublié de déclarer un éditeur comme getMtgInput
        self.input.marquePourErreur()
      })
    }
  } else {
    new AvertDlg(this.app, 'NomInvalide', function () {
      self.input.focus()
      // Test ligne suivante des fois que j'aie oublié de déclarer un éditeur comme getMtgInput
      self.input.marquePourErreur()
    })
  }
  return valide
}
