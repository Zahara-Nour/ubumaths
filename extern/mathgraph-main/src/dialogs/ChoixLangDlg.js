/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import loadTextes from 'src/kernel/loadTextes'
import { getStr, languages } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
import { ce } from '../kernel/dom'

export default ChoixLangDlg

/**
 * Permet de changer de langue dans la version electron
 * @param {MtgApp} app
 * @constructor
 */
function ChoixLangDlg (app) {
  // Ici appel avec seulement trois paramètres car fonctionnement spécial
  MtgDlg.call(this, app, 'choixLangDlg')
  this.lang = app.language
  this.select = ce('select', {
    size: 4, // Le nombre de lignes visibles par défaut
    style: 'width:150px'
  })
  this.appendChild(this.select)
  for (let i = 0; i < languages.length; i++) {
    const option = ce('Option')
    if (languages[i] === app.language) option.setAttribute('selected', 'selected')
    $(option).html(getStr(languages[i]))
    this.select.appendChild(option)
  }
  // Création de la boîte de dialogue par jqueryui
  this.create('ChoixLang', 500)
}

ChoixLangDlg.prototype = new MtgDlg()

ChoixLangDlg.prototype.OK = function () {
  const app = this.app
  const newLang = languages[this.select.selectedIndex]
  if (newLang !== this.lang) {
    if (app.electron) {
      // setLang est une fonction de la page index.html de electron
      window.setLang(newLang)
    } else {
      if (app.pwa) localStorage.setItem('language', newLang)
    }
    app.language = newLang
    loadTextes(newLang, true)
      .then(() => {
        this.destroy()
      })
      .catch((error) => {
        console.error(error)
      })
  } else {
    this.destroy()
  }
}
