/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMathGraphDoc from '../objets/CMathGraphDoc'
import CListeObjets from '../objets/CListeObjets'
import NatObj from '../types/NatObj'
import { chaineNombre } from '../kernel/kernel'
import Dimf from '../types/Dimf'

export default CMathGraphDoc

/**
 * Fonction changeant les outils autorisés
 * @param {MtgApp} app L'application propriétaire
 * @param itemsCochesInterdits true si les outil sont les outils interdits et false sinon
 * @param {number[]} itemsArray  Les toolIndex des outils autorisés.
 * @param nivFilter Le niveau pour filtrer les outils.
 * Dans le cas où itemCochesInterdits est true, il faut rajouter à la liste des outils interdits les outils
 * qui ne sont pas permis dans ce niveau
 */
CMathGraphDoc.prototype.setIdMenus = function (app, itemsCochesInterdits, itemsArray, nivFilter) {
  let i, tabTool, ind, eb, tab, size, tool
  this.itemsCochesInterdits = itemsCochesInterdits
  this.listeIdMenus = []
  for (i = 0; i < itemsArray.length; i++) {
    this.listeIdMenus.push(itemsArray[i]) // à revoir
  }
  if ((itemsCochesInterdits) && nivFilter !== 3) {
    tabTool = ['Points', 'Droites', 'Segments', 'Cercles', 'Polys', 'Marques', 'Lieux', 'Transf', 'Mes', 'Disp', 'Calculs', 'Surfaces']
    for (ind = 0; ind < tabTool.length; ind++) {
      eb = app['bar' + tabTool[ind]]
      tab = eb.tab
      size = tab.length
      for (i = 0; i < size; i++) {
        tool = app['outil' + tab[i]]
        if (!app.levels[nivFilter].toolDispo(tool.toolIndex)) this.listeIdMenus.push(tool.toolIndex)
      }
    }
  }
}

/**
 * Fonction changeant les outils autorisés à partir du docuent doc
 * @param {CMathGraphDoc} doc
 */
CMathGraphDoc.prototype.setIdMenusFromDoc = function (doc) {
  this.itemsCochesInterdits = doc.itemsCochesInterdits
  this.listeIdMenus = []
  const lim = doc.listeIdMenus
  for (let i = 0; i < lim.length; i++) {
    this.listeIdMenus.push(lim[i])
  }
}
/**
 * Fonction renvoyant true si la figure a des outils spécifiés.
 * Utilisé dans OptionsFigDlgs
 * @returns {boolean}
 */
CMathGraphDoc.prototype.hasOwnTools = function () {
  return (!this.itemsCochesInterdits || this.listeIdMenus.length !== 0)
}

/**
 * Fonction renvoyant le code Tikz de la figure sans les déclarations
 * @param {MtgApp} app L'application
 * @param coefMult Coefficient multiplicateur pour la taille
 * @param {boolean} bu Si true, la longueur unité de la figure est utilisée
 * @param {boolean}isCommented Si true, des commentaires sont ajoutés pour décrire chaque objet graphique
 * @returns {string}
 */
CMathGraphDoc.prototype.getTikzCodeOnly = function (app, coefMult, bu, isCommented) {
  let i; let elb; let ch; let stb
  const doc = app.doc
  const avecCadre = app.cadre !== null

  const dimf = avecCadre ? new Dimf(app.widthCadre, app.heightCadre) : doc.dimf
  // Il faut cloner la liste principale car sinon certains elements avec nom masque se verront avec un nom
  // masqué et il y aura des pbs de rafraichissement
  const list = new CListeObjets(this.listePr)
  app.listePr.setCopy(list)
  // list.positionne(false, doc.dimf);
  list.positionneTikz(false, dimf)
  // sc = (coefMult !== 1) ? "[scale = " + chaineNombre(coefMult, 4) +"]" : "";
  stb = '\\begin{tikzpicture}' + '\n'
  // stb.append("\\linespread{1.2}" + sc + "\n");
  // On recherche d'abord toutes les couleurs du document et on leur affecte un code dérivé de l'hexadécimal
  const vect = []
  for (i = 0; i < list.longueur(); i++) {
    elb = list.get(i)
    if (elb.existe && !elb.estElementIntermediaire() && elb.estDeNature(NatObj.NTtObj)) {
      if (!elb.masque) stb = elb.addTikzColors(stb, vect)
    }
  }
  // On fait un clipping du rectangle d'affichage
  const clipx = chaineNombre(list.tikzLongueur(dimf.x, dimf, bu), 2)
  const clipy = chaineNombre(list.tikzLongueur(dimf.y, dimf, bu), 2)
  stb += '\\clip (' + clipx + ',0) rectangle (0,' + clipy + ');' + '\n'
  for (i = 0; i < list.longueur(); i++) {
    elb = list.get(i)
    if (elb.existe && !elb.estElementIntermediaire() && elb.estDeNature(NatObj.NTtObj)) {
      if (!elb.masque) {
        ch = elb.tikz(dimf, true, coefMult, bu)
        if (ch !== '') {
          if (isCommented) stb += '% ' + elb.infoHist().replace('\n', ' ') + '\n'
          stb += ch + '\n'
        }
      }
    }
  }
  stb += '\\end{tikzpicture}' + '\n'
  return stb.replace('°', '\\degres')
}

CMathGraphDoc.prototype.getTikz = function (app, coefMult, bu, isCommented) {
  let stb = '\\documentclass[10pt,a4paper]{article}' + '\n'
  stb += '\\usepackage{tikz}' + '\n'
  stb += '\\usetikzlibrary{patterns}' + '\n'
  stb += '\\usepackage{amsfonts}' + '\n'
  stb += '\\usepackage{amsmath}' + '\n'
  stb += '\\usepackage{amssymb}' + '\n'
  stb += '\\usepackage{fix-cm}' + '\n'
  stb += '\\usepackage[utf8]{inputenc}' + '\n'
  stb += '\\usepackage[T1]{fontenc}' + '\n'
  // Ajout version 4.9.3 pour gérer le symbole degré
  stb += '\\usepackage[french]{babel}' + '\n'
  stb += '\\usepackage{textcomp}' + '\n'
  // Fin ajout
  stb += '\\begin{document}' + '\n'
  stb += this.getTikzCodeOnly(app, coefMult, bu, isCommented)
  stb += '\\end{document}' + '\n'
  return stb
}
