/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// Version 6.0 : ON ajoute un angle d'affichage
import Color from '../types/Color'
import Fonte from '../types/Fonte'
import Pointeur from '../types/Pointeur'
import Rect from '../types/Rect'
import StyleEncadrement from '../types/StyleEncadrement'
import CElementGraphique from './CElementGraphique'
import Vect from '../types/Vect'
import CValeurAngle from './CValeurAngle'
import addLatex from 'src/kernel/addLatex'
import { cens, getFirstHtmlParent } from 'src/kernel/dom'
import { ConvRadDeg, correctionRoboto, notify } from 'src/kernel/kernel'
import addQueue from 'src/kernel/addQueue'

export default CAffLiePt

/**
 * Classe ancêtre de tous les éléments affichant quelque chose sur la figure.
 * Version spéciale mtgApp car on doit pouvoir capturer un affichage même non encadré
 * @constructor
 * @extends CElementGraphique
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si l'objet est un élément final de construction.
 * @param {Color} couleur  La couleur d'éciture de l'éditeur (et du cadre éventuel).
 * @param {number} xNom  L'abscisse d'affichage de l'éditeur
 * @param {number} yNom  L'ordonnée d'affichage de l'éditeur
 * @param {number} decX  Décalage horizontal du nom
 * @param {number} decY  Décalage vertical du nom
 * @param {boolean} masque  true si l'éditeur est masqué
 * @param {CPt} pointLie  null ou pointe sur un point auquel l'affichage est lié.
 * @param {number} taillePolice  Indice de la taiile de police utilisée
 * @param {boolean} encadrement  true si encadré.
 * @param {boolean} effacementFond  true si on efface le fond de l'en-tête.
 * @param {Color} couleurFond  La couleur de fond de l'en-tête.
 * @param {number} alignementHorizontal  0 pour alignement gauche, 1 pour centre, 2 pour droite.
 * @param {number} alignementVertical  0 pour alignement vers le haut, 1 pour centré, 2 pour bas.
 * @param {CValeurAngle} angText  L'angle du texte par rapport à l'horizontale dans l'unité d'angle active
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CAffLiePt}
 */
function CAffLiePt (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, encadrement, effacementFond,
  couleurFond, alignementHorizontal, alignementVertical, angText, fixed) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) {
      CElementGraphique.call(this, listeProprietaire)
    } else {
      // A revoir car les deux derniers éléments qui sont enregistrés dans le flux sont inutiles
      CElementGraphique.call(this, listeProprietaire, impProto, estElementFinal, couleur, false,
        decX, decY, masque, '', 0)
      this.xNom = xNom
      this.yNom = yNom
      this.pointLie = pointLie
      this.taillePolice = taillePolice
      this.encadrement = encadrement
      this.effacementFond = effacementFond
      this.couleurFond = couleurFond
      this.alignementHorizontal = alignementHorizontal
      this.alignementVertical = alignementVertical
      if (angText) this.angText = angText; else { this.angText = new CValeurAngle(listeProprietaire, 0) }
      this.fixed = fixed
    }
  }
  // Pour les LaTeX utilisés dans un CEditeurFormule, pointera sur le CEditeurFormule propriétaire
  this.owner = null
  /**
   * Le rectangle qui englobe le point (pour le manipuler)
   * @type {Rect}
   */
  this.rectAff = new Rect(0, 0, 0, 0)
  this.chaineLatex = ''
  // this.div = null // Inutile depuis version MathJax3
}
CAffLiePt.prototype = new CElementGraphique()
CAffLiePt.prototype.constructor = CAffLiePt
CAffLiePt.prototype.superClass = 'CElementGraphique'
CAffLiePt.prototype.className = 'CAffLiePt'

CAffLiePt.alignHorLeft = 0
CAffLiePt.alignHorCent = 1
CAffLiePt.alignHorRight = 2
CAffLiePt.alignVerTop = 0
CAffLiePt.alignVerCent = 1
CAffLiePt.alignVerLow = 2

/**
 * Supprimé version 6.4. Ne sert plus avec MathJax 3.
CAffLiePt.prototype.getStyleLatex = function() {
  return "top:0px;left:0px;position:absolute;font-family: \"Times New Roman\", Times, serif;font-size:" + Fonte.tailleLatex(this.taillePolice)
    +"px;visibility:hidden;"
}
 */

/** @inheritDoc */
CAffLiePt.prototype.setClone = function (ptel) {
  CElementGraphique.prototype.setClone.call(this, ptel)
  this.chaineAAfficher = ptel.chaineAAfficher
  this.taillePolice = ptel.taillePolice
  this.encadrement = ptel.encadrement
  this.effacementFond = ptel.effacementFond
  this.couleurFond = ptel.couleurFond
  this.angText.valeur = ptel.angText.valeur // Ajout version 6.0
  this.fixed = ptel.fixed
  // Ajout version 6.4.0 pour les lieux d'objets de CCommentaire commençant et finissant par un $
  this.chaineLatex = ptel.chaineLatex
  // this.rectAff.setRec(ptel.rectAff); // Ne pas mettre
}

/**
 * Fonction translatant le point de (decalagex, decalagey)
 * @param {number} decalagex
 * @param {number} decalagey
 * @returns {void}
 */
CAffLiePt.prototype.translateDe = function (decalagex, decalagey) {
  this.xNom += decalagex
  this.yNom += decalagey
}

/**
 * Ajout version 5.2 (numéro de version 16). Renverra true si l'objet possède deux éléments decX et decY doit être enregistré dans le flux
 * Sera redéfini à true dans CAffLiePt
 * @returns {boolean}
 */
CAffLiePt.prototype.hasDec = function () {
  return true
}

CAffLiePt.prototype.ajouteAntecedents = function (liste) {
  if (this.pointLie !== null) liste.add(this.pointLie)
}

CAffLiePt.prototype.depDe = function (p) {
  const dep = CElementGraphique.prototype.depDe.call(this, p) || this.angText.depDe(p)
  if (this.pointLie === null) { return dep } else { return dep || this.pointLie.depDe(p) }
}

CAffLiePt.prototype.dependDePourBoucle = function (p) {
  const dep = (p === this) || this.angText.dependDePourBoucle(p)
  if (this.pointLie === null) return dep
  else return dep || this.pointLie.dependDePourBoucle(p)
}

CAffLiePt.prototype.dependDePourCapture = function (p) {
  return this.depDe(p)
}

/**
 * Cette fonction est appelée par CImage car positionne fait des choses pas nécessaires pour ce type d'objet
 * @param infoRandom
 * @param dimf
 */
CAffLiePt.prototype.positionnePourIm = function (infoRandom, dimf) {
  this.angText.positionne()
  this.existe = this.angText.existe
  // Modification version 7.3.3 : Un affichage n'existe pas si le point auquel il est lié
  // est "hors écran"
  // if (this.pointLie !== null) this.existe = this.existe && this.pointLie.existe
  const pointLie = this.pointLie
  if (pointLie !== null) this.existe = this.existe && pointLie.existe && !pointLie.horsEcran
  if (!this.existe) return
  if (pointLie !== null) {
    /* Modifié version mtgApp à cause des lieux d'objets
    if (this.pointLie.horsEcran) {
      this.existe = false;
      return;
    }
    */
    this.xNom = pointLie.x //
    this.yNom = pointLie.y //
    // Les 3 lignes suivantes supprimées version 6.5.2. Posait problème pour j3p et inutile.
    // De toute façon si un affichage de texte , LaTeX ou image est hors fenêtre son composant graphique
    // SVG doit être considéré comme existant
    /*
    if (!dimf.dansFenetre(this.xNom, this.yNom)) {
      this.existe = false
    }
    */
  }
}

// Modifié version 6.4.1 : N'est plus appelé par CLatex.positionne
CAffLiePt.prototype.positionne = function (infoRandom, dimf) {
  this.positionnePourIm(infoRandom, dimf)
  this.chaineAAfficher = this.rendChaineAffichage()
  const len = this.chaineAAfficher.length
  this.isLatex = /^\$.*\$$/.test(this.chaineAAfficher)
  if (this.isLatex) {
    const ch = this.chaineAAfficher.substring(1, len - 1)
    // Ligne suivante modifié version 6.8.1 pour un meilleur fonctionnement des macros d'apparition d'objets
    // Si c'est un affichage LaTeX qui était masqué et qu'une macro d'apparition a mis son membre
    // masqué à false, il faut que l'affichage soit créé
    // this.isToBeUpdated = (this.chaineLatex !== ch)
    this.isToBeUpdated = (this.chaineLatex !== ch) || !this.hasgElement
    this.chaineLatex = ch
  }
}
/**
 * Ajout version 6.4.1 : Nécessaire pour le cas où une macro d'animation a pour éléments à afficher des affichages LaTeX dynamiques
 * @param {boolean} infoRandom
 * @param {Dimf} dimf
 * @returns {void}
 */
CAffLiePt.prototype.positionneFull = function (infoRandom, dimf) {
  this.positionne(infoRandom, dimf)
  if (this.existe) {
    this.chaineAAfficher = this.rendChaineAffichage()
    const len = this.chaineAAfficher.length
    this.isLatex = /^\$.*\$$/.test(this.chaineAAfficher)
    if (this.isLatex) {
      const ch = this.chaineAAfficher.substring(1, len - 1)
      this.isToBeUpdated = true // A cause du fonctionnement asynchrone
      this.chaineLatex = ch
    }
  }
}

// Plus utilisé version 6.4 avec MathJax3
/**
 * Fonction appelée soit ppour un CLaTeX soit pour un commentaire dont le texte commence et finit pat $
 * et qui détruit this.div quand il est non nul qui est la div provisoirement créé pour être traité parr MathJax
 */
/*
CAffLiePt.prototype.deleteDiv = function() {
  if (this.div !== null) {
    document.body.removeChild(this.div);
    this.div = null;
  }
}
*/

CAffLiePt.prototype.distancePoint = function (xp, yp, masquage) {
  if (!this.existe || (masquage && this.masque)) return -1
  else {
    const rectAff = this.rectAff
    const ang = this.angText.rendValeurRadian()
    if (ang === 0) {
      if (rectAff.contains(xp - this.xNom - this.decX, yp - this.yNom - this.decY)) return 0
      else return -1
    } else {
      const x = xp - this.xNom - this.decX
      const y = yp - this.yNom - this.decY
      const v = new Vect(0, 0, x, y)
      const w = new Vect()
      v.tourne(-ang, w)
      const x1 = w.x
      const y1 = w.y
      if (rectAff.contains(x1, y1)) return 0
      else return -1
    }
  }
}

CAffLiePt.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointLie === ancienPoint) this.pointLie = nouveauPoint
}

/**
 * Prépare l'affichage par MathJax en créant un div provisoire
 * @param {boolean} [bMemeMasque=false] passer true pour le faire même si l'affichage est masqué (sert dans la boîte de dialogue de protocole)
 * @returns {void}
 */
CAffLiePt.prototype.setReady4MathJax = function setReady4MathJax (bMemeMasque) {
  if (this.isLatex) throw TypeError('Il fallait appeler addLatex avant')
}

CAffLiePt.prototype.setReady4MathJaxUpdate = function setReady4MathJaxUpdate () {
  if (this.isLatex) throw TypeError('Il fallait appeler addLatex avant')
}

/**
 * Ajout version 6.0
 * Positionne l'angle du g element
 */
/*
CAffLiePt.prototype.positionneAngText = function(g) {
  // Ajout version Version 6.0 //////////////////////////////////////////
  var ang = -this.angText.rendValeurRadian();
  var ra = this.rectAff;
  var x = ra.x + ra.width/2;
  var y = ra.y + ra.height/2;
  if (ang !== 0) {
    var angs = String(ang*ConvRadDeg);
    var u = new Vect(0, 0, this.xNom + this.decX, this.yNom + this.decY);
    var v = new Vect();
    u.tourne(ang, v);
    var x1 = String(-x + v.x);
    var y1 = String(-y + v.y);

    g.setAttribute("transform", "translate(" + String(x) + "," + String(y) + ") rotate(" + angs + ") translate(" + x1 + "," + y1 + ")");
  }
  else g.setAttribute("transform", "translate(" + String(this.xNom + this.decX) + "," + String(this.yNom + this.decY) + ")");
  /////////////////////////////////////////////////////////////////////////

}
*/
CAffLiePt.prototype.positionneAngText = function (g) {
  // Ajout version Version 6.0 //////////////////////////////////////////
  const ang = -this.angText.rendValeurRadian()
  const x = this.xNom + this.decX
  const y = this.yNom + this.decY
  if (ang !== 0) {
    const angs = String(ang * ConvRadDeg)
    const u = new Vect(0, 0, x, y)
    const v = new Vect()
    u.tourne(ang, v)
    const x1 = String(v.x)
    const y1 = String(v.y)
    g.setAttribute('transform', 'rotate(' + angs + ') translate(' + x1 + ',' + y1 + ')')
  } else g.setAttribute('transform', 'translate(' + String(this.xNom + this.decX) + ',' + String(this.yNom + this.decY) + ')')
}

CAffLiePt.prototype.createg = function () {
  let t, ch, h, anchor, y, ligaf, ch2, v
  const len = this.chaineAAfficher.length
  // Ajout version mtgApp
  if (len === 0) return cens('g')
  if (this.isLatex) return this.cLatexCreateg()

  this.chaineAffichee = this.chaineAAfficher
  // haut = Fonte.taille(this.taillePolice); Modifié version 5.0
  const haut = this.taillePolice
  const g = cens('g')
  // L'élément va être d'abord caché. S'il est encadré ou efface le fond on rajoutera un élément en tête
  switch (this.alignementHorizontal) {
    case CAffLiePt.alignHorLeft :
      anchor = 'start'
      break
    case CAffLiePt.alignHorCent :
      anchor = 'middle'
      break
    case CAffLiePt.alignHorRight :
      anchor = 'End'
  }
  // On compte le nombre de lignes
  let nblig = 1
  let ind = -1
  while ((ind = this.chaineAAfficher.indexOf('\n', ind + 1)) !== -1) nblig++
  h = (nblig === 1) ? haut : haut + (nblig - 1) * (haut + 2)
  // y = this.decY; // Corrigé version 6.0.1
  y = 0
  if (this.chaineAAfficher.search(/#H|#L/) !== -1) {
    v = haut / 3
    h += v
    y += v
  }
  switch (this.alignementVertical) {
    case CAffLiePt.alignVerCent :
      y -= h / 2 + 1
      break
    case CAffLiePt.alignVerLow :
      y -= h + 2
  }
  // Modifié version 4.9.2.3
  // ligaf = y + haut - 1;
  ligaf = y + haut - 2
  // this.rectAff.height = h;
  // Modifié version 4.9.9.4
  // style = "text-anchor:" + anchor + ";font-size:" + haut +"px;" + "fill:" + this.couleur.rgb()+";";
  // Modifié version 5.1.4 : IL faut préciser une fonte pour les textes
  // Version 8.0 : on ne spécifie plus une police ainsi cela sera celle du div contenant la figure
  // qui a un font-family à Roboto ce qui donnera un affichage identique aux affichages LaTX
  // const sty = "font-family:'Times New Roman',Times,serif;text-anchor:" + anchor + ';fill:' + this.color + ';'
  const sty = 'text-anchor:' + anchor + ';fill:' + this.color + ';'
  const style = sty + 'font-size:' + haut + 'px;'
  // Ajout version 5.0
  const styleexp = sty + ';font-size:' + String(Math.round(haut * 2 / 3)) + 'px;'
  // Modification version 5.0 : Une variable globale mémorisant le style d'écriture : italique, gras, souligne ou une combinaison de ces styles
  const st = new Pointeur(Fonte.Normal)
  if (this.chaineAAfficher.indexOf('\n') === -1) {
    t = CAffLiePt.createLine(this.chaineAAfficher, haut, style, styleexp, ligaf, st)
    g.appendChild(t)
  } else {
    ch = this.chaineAAfficher
    // h = haut;
    while ((ind = ch.indexOf('\n')) !== -1) {
      ch2 = ch.substring(0, ind)
      t = CAffLiePt.createLine(ch2, haut, style, styleexp, ligaf, st)
      g.appendChild(t)
      // Modification version 5.0 pour traiter exposants et indices
      ligaf += haut + ((ch2.search(/#H|#L/) !== -1) ? haut / 3 + 2 : 2)
      ch = ch.substring(ind + 1)
    }
    t = CAffLiePt.createLine(ch, haut, style, styleexp, ligaf, st)
    g.appendChild(t)
  }

  g.setAttribute('visibility', 'hidden')
  const svgAux = document.getElementById('mtgSvgAux')
  svgAux.appendChild(g)
  const box = g.getBBox()
  this.rectAff.x = box.x
  this.rectAff.y = y
  /*
    ////////////////////////////////////////////////////////////////////////////
    // Ajout version 6.0 : Quand l'affichage doit être translaté et n'a pas à //
    // être réaffiché; il faut connaître la position relative entre le        //
    // rectangle d'affichage et (xNom, y_no);
    */
  // this.posRel = {x: this.rectAff.x - this.xNom, y : this.rectAff.y - this.yNom};
  /// /////////////////////////////////////////////////////////////////////////
  if (this.effacementFond || (this.encadrement !== StyleEncadrement.Sans)) {
    this.rectAff.width = box.width + 4
    this.rectAff.height = h + 6
    this.creeRectangle(g)
  } else {
    this.rectAff.width = box.width
    this.rectAff.height = h
  }
  svgAux.removeChild(g)
  g.setAttribute('visibility', 'visible')
  // Ligne suivante modifiée version 6.5.2
  g.setAttribute('pointer-events', this.pointerevents)
  // Ajout version Version 6.0
  this.positionneAngText(g)

  /// //////////////////////////////////////////////////////////////////////
  return g
} // createg

CAffLiePt.prototype.cLatexCreateg = function () {
  if (this.isLatex) throw TypeError('Il fallait appeler addLatex avant')
}

/**
 * Fonction créant une ligne de texte dans le cas d'un affichage de plusieurs lignes.
 * Renvoie un élément du type text de svg.
 * @param {string} ch  Le texte de la ligne.
 * @param {number} taille La taille de la police utilisée
 * @param {string} style  le style d'affichage.
 * @param {string} styleexp
 * @param {number} y  L'ordonnée de début d'affichage.
 * @param {Pointeur} st  Contient le style d'écriture actif (combinaison entre normal, italique, gras et souligné)
 * @returns {SVGTextElement}
 */
CAffLiePt.createLine = function createLine (ch, taille, style, styleexp, y, st) {
  let cont, i, tspan, car, ind, diese, affspecial, dy, indpf
  let styleEc = st.getValue()
  const t = cens('text', {
    x: 0,
    y,
    style
  })
  const s = ch.split(/(#)/) // Parenthèses pour que le # soient dans le tableau
  affspecial = false
  diese = false
  dy = 0
  for (i = 0; i < s.length; i++) {
    if (s[i] === '#') {
      if (!diese) {
        affspecial = true
        diese = true
      } else {
        tspan = cens('tspan', {
          style: style + Fonte.styleEcriture(styleEc)
        })
        cont = document.createTextNode('#')
        tspan.appendChild(cont)
        t.appendChild(tspan)
        diese = false
      }
    } else {
      if (s[i].length !== 0) {
        diese = false
        car = s[i].charAt(0)
        ind = 1
        if (affspecial) {
          if ((car === 'I') || (car === 'N') || (car === 'G') || (car === 'U')) {
            if (car === 'I') {
              styleEc |= Fonte.Italique
              ind = 1
            } else if (car === 'N') {
              styleEc = Fonte.Normal
              ind = 1
            } else if (car === 'G') {
              styleEc |= Fonte.Gras
              ind = 1
            } else if (car === 'U') {
              styleEc |= Fonte.Underline
              ind = 1
            }
            if (ind !== s[i].length) {
              tspan = cens('tspan', {
                style: style + Fonte.styleEcriture(styleEc),
                dy: dy + 'px'

              })
              cont = document.createTextNode(s[i].substring(ind))
              tspan.appendChild(cont)
              t.appendChild(tspan)
              affspecial = false
              dy = 0
              // if (dy != 0) dy = -dy; // Un seul niveau d'exposant ou d'indice
            }
          } else {
            if (affspecial && ((car === 'H') || (car === 'L'))) {
              if (s[i].charAt(1) !== '(') {
                ind = 0
                indpf = s[i].length
              } else {
                ind = 2
                indpf = s[i].indexOf(')')
                if (indpf === -1) indpf = s[i].length
                if (car === 'H') dy = -taille / 3
                else dy = taille / 3
              }
              tspan = cens('tspan', {
                style: styleexp + Fonte.styleEcriture(styleEc),
                dy: dy + 'px'
              })

              cont = document.createTextNode(s[i].substring(ind, indpf))
              tspan.appendChild(cont)
              t.appendChild(tspan)
              affspecial = false
              dy = -dy // Un seul niveau d'exposant ou d'indice
              if (indpf < s[i].length - 1) { // Si il reste de caractères après la parenthèse fermante, affichage normal
                tspan = cens('tspan', {
                  style: style + Fonte.styleEcriture(styleEc),
                  dy: dy + 'px'
                })
                cont = document.createTextNode(s[i].substring(indpf + 1))
                tspan.appendChild(cont)
                t.appendChild(tspan)
                affspecial = false
                dy = 0
              }
            } else {
              tspan = cens('tspan', {
                style: style + Fonte.styleEcriture(styleEc),
                dy: dy + 'px'
              })
              cont = document.createTextNode(s[i])
              tspan.appendChild(cont)
              t.appendChild(tspan)
              affspecial = false
              dy = 0
            }
          }
        } else {
          tspan = cens('tspan', {
            style: style + Fonte.styleEcriture(styleEc),
            dy: dy + 'px'
          })
          cont = document.createTextNode(s[i])
          tspan.appendChild(cont)
          t.appendChild(tspan)
          affspecial = false
          dy = 0
        }
      } else affspecial = false
    }
  }
  st.setValue(styleEc)
  t.setAttribute('pointer-events', 'none')
  return t
}

CAffLiePt.prototype.trace = function (svg) {
  // Attention : paramètre svg nécessaire
  const g = this.createg(svg)
  g.setAttribute('id', this.id)
  // g.setAttribute("visibility", "hidden");
  svg.appendChild(g)
  this.g = g
}
/**
 * Dans le cas où l'affichage est encadré, crée un rect de svg qui sera inéséré
 * dans le g element représentant l'objet juste avant l'affichage.
 * @param {SVGRectElement} g
 * @returns {void}
 */
CAffLiePt.prototype.creeRectangle = function (g) {
  // var style = "shape-rendering:crispEdges;stroke-width:1px;";
  let style = 'stroke-width:0.5px;'
  // Modifié version 4.9.9.4
  // style += (this.encadrement === StyleEncadrement.Sans) ? "stroke:none;" : "stroke:" + this.couleur.rgb()+";";
  style += (this.encadrement === StyleEncadrement.Sans) ? 'stroke:none;' : 'stroke:' + this.color + ';'
  if (this.effacementFond) style += 'fill:' + this.couleurFond.rgb() + ';' + 'fill-opacity:' + this.couleur.opacity + ';'
  else style += 'fill:none;'
  const r = cens('rect', {
    style,
    x: this.rectAff.x - 2,
    y: this.rectAff.y - 2,
    width: this.rectAff.width + 3,
    height: this.rectAff.height,
    'pointer-events': 'none'
  })
  g.insertBefore(r, g.childNodes[0])
  if (this.encadrement === StyleEncadrement.Effet3D) { // Ajout d'un effet 3D
    // var pol = document.createElementNS(svgns,"polygon"); // Modifié version mtgApp
    style = 'stroke-width:1px;stroke:' + this.color + ';fill:' + this.color + ';'
    /* Modifié version mtgApp
    pol.setAttribute("style", style);
    */
    const x = this.rectAff.x - 2
    const y = this.rectAff.y - 2
    const w = this.rectAff.width + 3 // Modifié version 4.9.9.4
    const h = this.rectAff.height
    const s1 = String(x + w)
    const s2 = String(y + h)
    const s3 = String(x + w + 1)
    const s4 = String(y + h + 1)
    const pol = cens('polygon', {
      style,
      points: x + ',' + s2 + ' ' + s1 + ',' +
      s2 + ' ' + s1 + ',' + y + ' ' + s3 + ',' + String(y + 1) + ' ' +
      s3 + ',' + s4 + ' ' + String(x + 1) + ',' + s4
    })
    g.insertBefore(pol, g.childNodes[1])
  }
}
/**
 * Fonction retirant de g le rectangle encadrant l'affichage lorsque celui-ci est présent
 * et le remplaçant par un nouveau.
 * @param {SVGElement} g
 * @returns {void}
 */
CAffLiePt.prototype.remplaceRectangle = function (g) {
  g.removeChild(g.childNodes[0])
  if (this.encadrement === StyleEncadrement.Effet3D) g.removeChild(g.childNodes[0])
  this.creeRectangle(g)
}

// Modifié version 5.0 : taille représente maintenant la taille réelle
CAffLiePt.prototype.update = function update (svg) {
  let g
  if (this.isLatex) {
    this.cLatexUpdate(svg)
  } else {
    /*
    decalagex = this.xNom - this.oldxNom + this.decX- this.olddec_x;
    decalagey = this.yNom - this.oldyNom + this.decY - this.olddec_y;
    this.olddec_x = this.decX;
    this.olddec_y = this.decY;
    this.oldxNom = this.xNom;
    this.oldyNom = this.yNom;
    */
    const oldg = this.g
    // if (this.chaineAffichage === this.chaineAffichee) {
    if (this.chaineAAfficher === this.chaineAffichee) {
      // Inutile de recréer le composant on le translate simplement
      /// ///////////////////////////////////////////////////////////////////////
      // Ajout version 6.0 /////////////////////////////////////////////////////
      this.positionneAngText(oldg)
      /// ///////////////////////////////////////////////////////////////////////
      if (this.effacementFond || (this.encadrement !== StyleEncadrement.Sans)) {
        this.remplaceRectangle(oldg)
      }
    } else {
      g = this.createg(svg) // Paramètre nécessaire pour le CLatex
      svg.replaceChild(g, oldg)
      g.setAttribute('id', this.id)
      this.g = g
      if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
    }
  }
  // Ajout version 5.0.1
  const visibility = (this.pointLie !== null && !this.pointLie.dansFenetre) ? 'hidden' : 'visible'
  this.g.setAttribute('visibility', visibility)
}
// cette méthode sera remplacée par CLatex.prototype.update
CAffLiePt.prototype.cLatexUpdate = function cLatexUpdateDummy () {
  if (this.isLatex) throw TypeError('Il fallait appeler addLatex avant')
}

CAffLiePt.prototype.reCreateDisplay = function (svg) {
  const oldg = this.g
  const g = this.createg(svg) // Paramètre nécessaire pour le CLatex
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  this.g = g
}

// Spécial JavaScript
/**
 * Fonction renvoyant le code à rajouter au début du code LaTeX pour qu'un affichage LaTeX
 * ait la couleur désirée.
 * @returns {string}
 */
CAffLiePt.prototype.prelatex = function () {
  // Modifié version 4.9.9.4
  /*
  return "\\color[RGB]{"+Math.floor(this.couleur.red) +"," + Math.floor(this.couleur.green) + "," +
    Math.floor(this.couleur.blue) + "}";
  */
  return '\\color{' + this.color + '}'
}

CAffLiePt.prototype.read = function (inps, list) {
  CElementGraphique.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  if (ind1 === -1) this.pointLie = null
  else this.pointLie = list.get(ind1, 'CPt')
  const numeroVersion = list.numeroVersion
  this.taillePolice = inps.readByte()
  // Modification version 5.0 : taillePolice est maintenant la taille réelle de la police
  if (numeroVersion < 15) this.taillePolice = Fonte.taille(this.taillePolice)
  // Version 8.8.0 (numéro de version 22) : on corrige un peu la taille de police car maintenant on utilise
  // Roboto qui prend plus de place en largeur pour une même taille de police en pixels donnée
  if (numeroVersion < 22) this.taillePolice = correctionRoboto(this.taillePolice)

  if ((numeroVersion < 11)) {
    this.xNom = inps.readDouble()
    this.yNom = inps.readDouble()
  } else {
    if (this.pointLie === null) {
      this.xNom = inps.readDouble()
      this.yNom = inps.readDouble()
    }
  }
  this.encadrement = inps.readByte()
  this.effacementFond = inps.readBoolean()
  // Modification pour le passage en version RVB à partir de la version 2.5 (n°5)
  if (this.effacementFond) {
    const r = inps.readByte()
    const g = inps.readByte()
    const b = inps.readByte()
    this.couleurFond = new Color(r, g, b)
  } else this.couleurFond = Color.white // Ne sert pas
  const tv = this.listeProprietaire.numeroVersion >= 9
  this.alignementHorizontal = tv ? inps.readInt() : CAffLiePt.alignHorLeft
  this.alignementVertical = tv ? inps.readInt() : CAffLiePt.alignVerTop
  this.chaineLatex = '' // Ajout version 4.9.2
  if (numeroVersion >= 18) {
    this.angText = new CValeurAngle()
    this.angText.read(inps, list)
  } else {
    // Ajout version 6.0
    this.angText = new CValeurAngle(list, 0)
  }
  // Depuis le n° de version 21 (version 8.1) les affichages peuvent être punaisés
  if (numeroVersion < 21) {
    this.fixed = false
  } else {
    this.fixed = inps.readBoolean()
  }
}

CAffLiePt.prototype.write = function (oups, list) {
  CElementGraphique.prototype.write.call(this, oups, list)
  let ind1
  if (this.pointLie === null) ind1 = -1
  else ind1 = list.indexOf(this.pointLie)
  oups.writeInt(ind1)
  oups.writeByte(this.taillePolice)
  if (this.pointLie === null) {
    oups.writeDouble(this.xNom)
    oups.writeDouble(this.yNom)
  }
  oups.writeByte(this.encadrement)
  oups.writeBoolean(this.effacementFond)
  if (this.effacementFond) {
    oups.writeByte(this.couleurFond.getRed())
    oups.writeByte(this.couleurFond.getGreen())
    oups.writeByte(this.couleurFond.getBlue())
  }
  oups.writeInt(this.alignementHorizontal)
  oups.writeInt(this.alignementVertical)
  this.angText.write(oups, list) // Ajout version 6.0
  oups.writeBoolean(this.fixed)
}

/**
 * Lance un rendu mathjax
 * @returns {Promise<undefined>} qui sera résolue lorsque le html du rendu mathjax aura été mis dans le dom (ou l'erreur affichée en console)
 */
CAffLiePt.prototype.typeset = function typeset () {
  // la fct à lancer quand on est sûr que MathJax est chargé (fct fléchée pour avoir le bon this)
  const realTypeset = () => {
    const svg = document.getElementById(this.listeProprietaire.id)
    const width = svg.getAttribute('width')
    // var taille = Fonte.tailleLatex(this.taillePolice);
    const taille = this.taillePolice
    // this.ex = taille/2;
    this.ex = taille * 0.45
    const options = { em: taille, ex: this.ex, containerWidth: width, display: false }
    // Pour préserver l'apparence des figures précédentes, quand le code LaTeX contient un seul quotient on passe
    // en mode \displaystyle
    let ch = this.chaineLatex
    const index = ch.indexOf('\\frac{')
    if ((index !== -1) && (index === ch.lastIndexOf('\\frac{'))) ch = '\\displaystyle ' + ch
    return MathJax.tex2svgPromise(this.prelatex() + ch, options)
      .then((html) => {
        this.html = html
      }) // catch inutile car on est dans un addQueue qui le gère
  }

  // faut tester addLatex pour le cas lecteur, au cas où on aurait oublié un useLatex = true sur un des objets,
  // (et donc le chargement du doc a pas fait le addLatex)
  // ou bien si on a appellé setReady4MathJax avant addLatex
  // MAIS ne faut pas de double addQueue ici, car d'autres peuvent faire du addQueue juste après nous,
  // ils auraient donc du code exécuté avant ce realTypeset.
  // Et c'est important de faire le test dans un addQueue, car addLatex peut être déjà lancé mais pas fini
  const missingMathJaxHandler = () => {
    if (typeof MathJax !== 'object' || typeof MathJax.tex2svgPromise !== 'function') {
      // si on a un bugsnag chargé on le signale pour tracer ce cas de figure et le régler en amont
      notify('CAffLiePt.typeset appelé avant la résolution de addLatex() (le pb est rattrapé mais ce serait mieux de le fixer à la source)')
      return addLatex().then(realTypeset)
    } else {
      realTypeset()
    }
  }

  return addQueue(missingMathJaxHandler, { doNotCatch: true, stopOnError: true })
    .catch(() => {
      // pas besoin d'appeler abort puisqu'on a passé stopOnError
      const svg = document.getElementById(this.listeProprietaire.id)
      const message = 'Abandon : le chargement le MathJax (qui affiche les textes mathématiques) a échoué, impossible de continuer.'
      const parent = svg?.containerDiv ?? getFirstHtmlParent(svg)
      if (parent) {
        parent.innerHTML = `<p class="error">${message}</p>`
      }
      // sinon rien, le svg a probablement déjà été remplacé par le message d'erreur
    })
}

// Fonction ajoutée version 6.5.2 pour permettre de modifier directement des éléments de la figure
/**
 * Fonction donnant directement au svg element représentant l'élément graphique la couleur de l'élément
 */
CAffLiePt.prototype.setgColor = function () {
  return false // pas possible de modifier la couleur d'un affichage de texte ou LaTeX directement
}

// ******* Méthodes qui utilisent CLatex (mis en propriété statique) *********
/**
 * Appelle CLatex.createg() avec l'objet courant
 * @returns {SVGElement}
 */
CAffLiePt.prototype.cLatexCreateg = function () {
  return CAffLiePt.CLatex.prototype.createg.call(this)
}
CAffLiePt.prototype.cLatexUpdate = function (svg) {
  CAffLiePt.CLatex.prototype.update.call(this, svg)
}
/**
 * Prépare l'affichage par MathJax en créant un div provisoire
 * @param {boolean} [bMemeMasque=false] passer true pour le faire même si l'affichage est masqué (sert dans la boîte de dialogue de protocole)
 * @returns {void}
 */
CAffLiePt.prototype.setReady4MathJax = function setReady4MathJax (bMemeMasque) {
  if (this.isLatex) CAffLiePt.CLatex.prototype.setReady4MathJax.call(this, bMemeMasque)
}
/**
 * @returns {void}
 */
CAffLiePt.prototype.setReady4MathJaxUpdate = function () {
  if (this.isLatex) CAffLiePt.CLatex.prototype.setReady4MathJaxUpdate.call(this)
}

CAffLiePt.setLatex = (CLatex) => {
  CAffLiePt.CLatex = CLatex
}
