/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { caracteresSpeciaux, svgns } from './constantes'
import InfoBalise from './InfoBalise'

// y'en a bcp trop pour tous les revoir (surtout qu'ils sont pas si problématiques,
// même si on pourrait écrire tout ça plus simplement avec des regex)
/* eslint-disable no-unreachable-loop */
/**
 * idem caracteresSpeciaux mais avec toutes les propriétés en minuscules
 * (remplaceCarSpe veut faire une comparaison insensible à la casse, on lui mâche ici le travail)
 * @private
 * @type {object}
 */
const carSpeMin = {}
Object.entries(caracteresSpeciaux).forEach(([nom, char]) => {
  carSpeMin[nom.toLowerCase()] = char
})

/**
 * Retourne true si le nombre x a une valeur absolue inférieue à 10^-9
 * @param {number} x
 * @returns {boolean}
 */
export const zero = (x) => Math.abs(x) < 1e-9
/**
 * Retourne true si la valeur absolue de a est inférieure à 10^-7
 * Utilisé pour tester si un angle est quasi nul.
 * @param {number} a
 * @returns {boolean}
 */
export const zeroAngle = (a) => Math.abs(a) < 1e-7
/**
 * Retourne la mesure principale en degrés de l'angle dont ang est une mesure
 * @param {number} ang
 * @returns {number}
 */
export function mesurePrincDeg (ang) {
  const q = Math.floor((ang + 180) / 360)
  let ret = ang - 360 * q
  if (ret === -180) ret = 180
  return ret
}
/**
 * Fonction servant à parser un fichier xml contenu dans la chaîne txt
 * @param {string} txt
 * @returns {DOMParser}
 */
export function parseXMLDoc (txt) {
  let parser, xmlDoc
  if (window.DOMParser) {
    parser = new DOMParser()
    xmlDoc = parser.parseFromString(txt, 'text/xml')
  } else if (window.ActiveXObject) {
    // Internet Explorer
    /* global ActiveXObject */
    xmlDoc = new ActiveXObject('Microsoft.XMLDOM')
    xmlDoc.async = false
    xmlDoc.loadXML(txt)
  } else {
    console.error(Error('Votre navigateur ne peut pas analyser du XML, impossible d’utiliser instrumenpoche'))
  }
  return xmlDoc
}

/**
 * Retourne true si ch contient le nom d'un instrument.
 * @param {string} ch
 * @returns {boolean}
 */
export const estInstrument = (ch) => ['compas', 'compasLeve', 'crayon', 'equerre', 'rapporteur', 'regle', 'requerre'].includes(ch)

/**
 * Fonction appelée pour une chaîne qui commence par un caractère de balise ouvrante.
 * Avant appel la chaîne doit commencer par une balise ouvrante
 * Renvoie -1 s'il n'y a pas de balise fermante correspondante
 * @param {string} ch
 * @returns {int} Renvoie l'indice du dernier caractère de la balise fermante correspondante
 * augmentée de 1
 */
export function indiceFinBalise (ch) {
  let bal, balf, indf
  let balisefont = false
  if (ch.indexOf('<font') === 0) {
    balf = '</font>'
    balisefont = true
  } else {
    indf = ch.indexOf('>')
    if (indf === -1) return ch.length // Erreur
    bal = ch.substring(0, indf + 1)
    balf = bal.substring(0, 1) + '/' + bal.substring(1)
  }
  const ind = ch.indexOf(balf)
  if (ind === -1) {
    // Il arrive que des gens oublient de fermer une baise font et en ouvrent une autre
    if (balisefont) {
      const ind2 = ch.indexOf('<font', 5)
      if (ind2 !== -1) return ind2
    }
    return -1
  } else {
    // Incorrect. Balise de fn oubliée ?
    return ind + balf.length
  }
}

/**
 * Fonction analysant une chaîne commençant par £e( ou £i(
 * et renvoyant un objet formé de l'opérande et de l'exposant (ou indice)
 * @param {string} chaine
 * @return {{erreur: boolean, operande: string, exposant: string, texte: string}}
 */
export function analyseExposantOuIndice (chaine) {
  const ch = chaine.trim()
  const res = {}
  const indvirg = ch.indexOf(',')
  const indparf = ch.indexOf(')')
  res.erreur = (indvirg === -1) || (indparf === -1)
  if (res.erreur) {
    res.texte = ''
    return res
  }
  res.operande = ch.substring(3, indvirg)
  res.exposant = ch.substring(indvirg + 1, indparf)
  res.texte = ch.substring(indparf + 1)
  return res
}

/**
 * Fonction appelée dans le cas ou pDebut est l'indice dans chaine d'une
 * parenthèse ouvrante et renvoyant l'indice de la parenthèse
 * fermante correspondante dans la chaîne.
 * @return {number}
 */
function indiceParentheseFermante (chaine, deb) {
  let p
  let ch
  let somme = 1
  p = deb + 1
  while (p < chaine.length) {
    ch = chaine.charAt(p)
    if (ch === '(') { somme++ } else {
      if (ch === ')') { somme-- }
    }
    if (somme === 0) break
    p++
  }
  if (somme === 0) {
    return p
  }
  // On renvoie -1 si pas trouvé
  return -1
}

/**
 * Retourne true si char est un chiffre
 * @param {string} char
 * @returns {boolean}
 */
export const estUnChiffre = (char) => typeof char === 'string' && char.length === 1 && /[0-9]/.test(char)

// Fonctions reprises depuis le code source de InstrumentPoche en flash
export function valeur_approchee (nombre, precision) {
  const prec = Math.pow(10, precision)
  return Math.round(nombre / prec) * prec
}

/**
 * Fonction reprise à partir du code de la version Flash et servant pour les
 * repères et quadrillages
 * @param {number} nbr
 * @param {number} borne1
 * @param {number} borne2
 * @param {number} borne_pix1
 * @param {number} borne_pix2
 * @returns {number}
 */
export function mettre_en_pixels (nbr, borne1, borne2, borne_pix1, borne_pix2) {
  const coeff_dir = (borne_pix1 - borne_pix2) / (borne1 - borne2)
  const ordo_orig = borne_pix1 - coeff_dir * borne1
  return coeff_dir * nbr + ordo_orig
}

/** Fonctions éléminant dans le code XML contenu dans la chaîne ch les attributs
 * en doublon en ne gardant que le premier
 * @param {string} ch
 * @returns {string} / La chaîne avec les doublons d'attribut supprimés.
 */
export function elimineDoublonsXML (ch) {
  let res = ''
  const patterns = ['objet', 'mouvement', 'vitesse', 'tempo', 'abscisse', 'ordonnee', 'id', 'couleur', 'pointille', 'echelle',
    'angle', 'cible', 'texte', 'ecrire', 'rotation', 'translation', 'epaisseur', 'opacite', 'masquer', 'montrer',
    'crayon', 'equerre', 'regle', 'compas', 'reglequerre', 'sens', 'hauteur', 'largeur', 'haut', 'gauche',
    'Xmin', 'Ymin', 'Xmax', 'yMax', 'Xgrad', 'Ygrad', 'image', 'police', 'taille',
    'ordonnee_bas_droite', 'abscisse_bas_droite', 'ordonnee_haut_gauche', 'abscisse_haut_gauche']
  ch.split(/<action/gi).forEach((ligne, i) => {
    patterns.forEach(pattern => {
      const r = new RegExp(' ' + pattern + '[^\\w ]*= *"[\\w]*"', 'i')
      const a = ligne.search(r)
      if (a !== -1) {
        const b = ligne.substring(a + 1).search(r)
        if (b !== -1) ligne = ligne.replace(r, '')
      }
    })
    res += (i === 0) ? ligne : '<action' + ligne
  })
  return res
}

/**
 * Fonction remplaçant dans la chaîne ch les accents écrits en code html par leur caractère utf8
 * @param {string} ch La chaîne à traiter
 * @returns {string} : La chaîne avec les caractères remplacès
 */

/*
remplaceAccentsHtml: function (ch) {
  const t1 = ['&agrave;', '&acirc;', '&aelig;', '&egrave;', '&eacute;', '&ecirc;', '&icirc;', '&ocirc;',
    '&ouml;', '&oslash;', '&Oslash;', '&ugrave;', '&ucirc;', '&apos;']
  const t2 = ['à', 'â', 'æ', 'è', 'é', 'ê', 'î', 'ô',
    'ö', 'ø', 'Ø', 'ù', 'û', "'"]
  let i
  for (i = 0; i < t1.length; i++) {
    ch = ch.replace(new RegExp(t1[i], 'g'), t2[i])
  }
  return ch
},
*/
/**
 * Fonction remplaçant dans la chaîne ch toutes les balises écrites avec des caractères spéciaux £
 * par des balises normales du type <...>
 * @param {string} ch La chaîne à traiter contenant les balises spéciales
 * @returns {string} : La chaîne avec les balises normales
 */
export function remplaceBalises (ch) {
  // Certains auteurs ont utilisé les codes £lt; et £gt;
  // Inutile car quand on parse avec getAttribute pour avoir le texte le balises sont déjà remplacées
  /*
  ch = ch.replace(/£lt;/gi,"£lt£");
  ch = ch.replace(/£gt;/gi,"£gt£");
  */
  // Par contre si elles ont déjà été remplacées et utilisaient des majuscules il faut mettre des minuscules
  ch = ch.replace(/<B>/g, '<b>')
  ch = ch.replace(/<\/B>/g, '</b>')
  ch = ch.replace(/<I>/g, '<i>')
  ch = ch.replace(/<\/I>/g, '</i>')
  ch = ch.replace(/<U>/g, '<u>')
  ch = ch.replace(/<\/U>/g, '</u>')

  ch = ch.replace(/£lt£i£gt£/gi, '<i>')
  ch = ch.replace(/£i£/gi, '<i>')
  ch = ch.replace(/£lt£\/i£gt£/gi, '</i>')
  ch = ch.replace(/£\/i£/gi, '</i>')
  ch = ch.replace(/£lt£b£gt£/gi, '<b>')
  ch = ch.replace(/£b£/gi, '<b>')
  ch = ch.replace(/£lt£\/b£gt£/gi, '</b>')
  ch = ch.replace(/£\/b£/gi, '</b>')
  ch = ch.replace(/£lt£u£gt£/gi, '<u>')
  ch = ch.replace(/£u£/gi, '<u>')
  ch = ch.replace(/£lt£\/u£gt£/gi, '</u>')
  ch = ch.replace(/£\/u£/gi, '</u>')
  ch = ch.replace(/£lt£br£gt£/gi, '<br>')
  ch = ch.replace(/£lt£br\/£gt£/gi, '<br>')
  ch = ch.replace(/£br£/gi, '<br>')
  ch = ch.replace(/£br\/£/gi, '<br>')
  ch = ch.replace(/£lt£font/gi, '<font')
  ch = ch.replace(/£lt£\/font£gt£/gi, '</font>')
  // Remplacement de balises exotiques utilisées par certains
  ch = ch.replace(/£lt£bold£gt£/gi, '<b>')
  ch = ch.replace(/£lt£\/bold£gt£/gi, '</b>')
  // remplacement des £lt£ et £gt£ utiliséscomme caractères
  ch = ch.replace(/£lt£/gi, '<')
  ch = ch.replace(/£gt£/gi, '>')
  ch = ch.replace(/£inferieurstrict£/gi, '<')
  ch = ch.replace(/£superieurstrict£/gi, '>')
  // Remplacement des guillemets
  ch = ch.replace(/£guillemet£/gi, '"')
  return ch
}

/**
 * Retourne une chaîne où les caractères spéciaux de Flash de ch sont remplacés par
 * le caractère UTF8 correspondant
 * @param {string} ch La chaîne à traiter
 */
export function remplaceCarSpe (ch) {
  if (!ch.includes('£')) return ch
  // on éclate la chaîne sur £ et on regarde les morceaux impair (0 est celui qui précède le premier £)
  // attention, si jamais y'a un nombre impair de £ faut pas ajouter de dernier £
  const newString = ch.split('£').map((fragment, i) => {
    if (i % 2) {
      // impair, faut regarder si c'est une propriété connue (sans tenir compte de la casse)
      const nom = fragment.toLowerCase()
      return carSpeMin[nom] || `£${fragment}£`
    }
    return fragment
  }).join('')
  if ((ch.length - ch.replace(/£/g, '').length) % 2) {
    console.warn(`Il y a un nombre impair de £ dans cette chaîne : ${ch}`)
    return newString.substr(0, newString.length - 1)
  }
  return newString
  /* pour mémoire, avant on avait une boucle sur la centaine de caractères spéciaux avec regex+replace à chaque fois, avec :
  Object.entries(caracteresSpeciaux).forEach(([nom, char]) => {
    const search = '£' + nom + '£'
    if (ch.includes(search)) ch = ch.replace(new RegExp(cha, 'gi'), char)
  })
  return ch */
}

/**
 * Retourne l'idice dans la chaîne chaine de l'accolade fermante
 * correspondant à l'accolade ouvrante dont l'indice dans la chaîne est pdebut
 * Avant appel,l le caractère d'indice pdebut de la chaîne ch doit contenir
 * une parenthèse ouvrante.
 * @private
 */
function accoladeFermante (chaine, pdebut) {
  let p, ch, somme

  somme = 1
  p = pdebut + 1
  while (p < chaine.length) {
    ch = chaine.charAt(p)
    if (ch === '{') { somme++ } else {
      if (ch === '}') { somme-- }
    }
    if (somme === 0) break
    p++
  }
  if (somme === 0) {
    return p
  } else {
    return -1
  } // On renvoie -1 si pas trouvé
}

/**
 * Retourne true si ch conteint une balise LaTeX : fraction, racine carrée,
 * puissance, indice, chapeau, parenthèses, crochets, valeur abolue, norme,
 * vecteur ou texte
 * @param {string} ch
 * @returns {Boolean}
 */
export function contientBaliseLaTeX (ch) {
  return (ch.indexOf('\\frac') !== -1) || (ch.indexOf('\\sqrt') !== -1) ||
    (ch.indexOf('}^{') !== -1) || (ch.indexOf('}_{') !== -1) ||
    (ch.indexOf('\\widehat{') !== -1) || (ch.indexOf('\\left[') !== -1) ||
    (ch.indexOf('\\left(') !== -1) || (ch.indexOf('\\left|') !== -1) ||
    (ch.indexOf('\\left\\|') !== -1) || (ch.indexOf('\\overrightarrow{') !== -1) ||
    (ch.indexOf('\\text{') !== -1)
}

/**
 * Une couleur css (sous sa forme #xxxxxx ou un nom de couleur black|red|…)
 * @typedef SvgColor
 * @type {string}
 */
/**
 * Retourne une chaîne de caractères représentant la couleur correspondant au contenu de ch (qui peut être une couleur au format Flash ou déjà une couleur css)
 * @param {string} ch
 * @returns {SvgColor}
 */
export function getSvgColor (ch) {
  const trad = {
    noir: 'black',
    rouge: 'red',
    vert: 'green',
    bleu: 'blue',
    blanc: 'white',
    gris: 'grey',
    darkorange: 'maroon'
  }
  if (ch === '0') return 'black'
  if (trad[ch]) return trad[ch]

  // complète avec des 0 à gauche
  const complete = (s) => s.length < 7 ? '#' + '0'.repeat(6 - s.length) + s : s.substr(-6)

  // faut parser la chaîne
  if (/^#/.test(ch)) {
    if (ch.length === 7) return ch
    // #f03 => #ff0033
    if (ch.length === 4) return `#${ch[1]}${ch[1]}${ch[2]}${ch[2]}${ch[3]}${ch[3]}`
    // ça c'est pas très catholique (ni orthodoxe)
    console.error(Error(`couleur ${ch} invalide, on va tronquer ou compléter avec des 0`))
    return complete(ch.substring(1))
  }
  if (/^0x/.test(ch)) {
    return complete(ch.substring(2))
  }
  if (/^[0-9]/.test(ch)) {
    return complete(parseFloat(ch).toString(16))
  }
  // Sinon on suppose que c'est un nom de couleur (ou une couleur valide, comme rvb(r,v,b) ou …
  // cf https://developer.mozilla.org/fr/docs/Web/CSS/color
  return ch
}

/**
 * Retourne true si les vecteurs u et v sont quasi colinéaires
 * @param {Vect} u
 * @param {Vect} v
 * @returns {boolean}
 */
export function colineaires (u, v) {
  const n1 = u.norme()
  const n2 = v.norme()
  if (zero(n1) || zero(n2)) return true
  return zero((u.x * v.y - u.y * v.x) / n1 / n2)
}

/**
 * Retourne true si les vecteurs u et v sont quasi colinéaires
 * de même sens
 * @param {Vect} u
 * @param {Vect} v
 * @returns {boolean}
 */
export const colineairesMemeSens = (u, v) => colineaires(u, v) && (u.x * v.x + u.y * v.y >= 0)

/**
 * Retourne l'indice de la nb ième virgule dans la chaîne ch
 * à partir de l'indice deb en sauta,t le contenu des parenthèses
 * @param {string} chaine
 * @param {number} deb
 * @param {number} nb
 * @returns {number}
 */
export function indiceVirgule (chaine, deb, nb) {
  let ch, indpf
  let k = 0
  let p = deb
  while (p < chaine.length) {
    ch = chaine.charAt(p)
    if (ch === '(') {
      indpf = indiceParentheseFermante(chaine, p)
      if (indpf === -1) {
        return -1
      }
      p = indpf
    } else {
      if (ch === ',') k++
      if (k === nb) return p
    }
    p++
  }
  return -1
}

/**
 * Cette fonction permet de trouver les meilleures graduations a afficher pour un repere.
 * Elle retourne la plus petite de ces graduations, afin que des nombres "ronds" soient affichés.
 * Fonction reprise à partir du code de la version Flash et servant pour les
 * repères et quadrillages
 * @param {number} mini
 * @param {number} maxi
 * @param {number} unite
 * @returns {number}
 */
export function determiner_graduations (mini, maxi, unite) {
  let debut_trace
  // lorsque 0 est entre les bornes, on part de 0 et on cherche le début du tracé
  if (maxi * mini < 0) {
    debut_trace = -Math.floor(-mini / unite) * unite
  } else if (Math.ceil(Math.log(Math.abs(mini)) / Math.LN10) !== Math.ceil(Math.log(Math.abs(maxi)) / Math.LN10)) {
    // en cas de puissance de 10 entre les bornes, on prend
    if (mini < 0) {
      debut_trace = -Math.pow(10, Math.floor(Math.log(Math.abs(mini)) / Math.LN10))
    } else {
      debut_trace = Math.pow(10, Math.ceil(Math.log(Math.abs(mini)) / Math.LN10))
    }
    debut_trace = debut_trace - Math.floor((debut_trace - mini) / unite) * unite
  } else {
    // dans tous les autres cas, on fait ce qu'on peut
    debut_trace = valeur_approchee(mini, Math.floor(Math.log(unite) / Math.LN10))
    if (debut_trace < mini) {
      debut_trace += unite
    }
  }
  return debut_trace
}

/**
 * Fonction récursive appelée lorsque l'affichage de texte n'utilise pas le LaTeX
 * Elle traite les balises u, i, b et font pour ajouter à txt (qui est élément
 * graphique svg text des tspans correspondants.
 * @param {String} : La chaîne contenant le texte avec balises éventuelles
 * @param {InfoBalise} infoBalise un objet qui contient les caractéristiques du texte, à savoir
 * bold ou non, italique ou non, souligné ou non, couleur et fonte utilisée
 * @param {svg.text} txt L'élément text de svg auquel seront rajoutés les tspan créés
 * @param {Boolean} debutLigne true si l'affichage du prochain tspan doit se faire en début de ligne
 * @param {number} y le paramètre y du prochain tspan à créer
 */
export function traiteBalise (ch, infoBalise, txt, debutLigne, y) {
  if (ch === '') return
  let stylespan, indfb, ind1, ind2, fonte, couleur, taille, inddeb, info
  const ind = ch.search(/<b>|<i>|<u>|<font/)
  const tspan = document.createElementNS(svgns, 'tspan')
  tspan.setAttribute('pointer-events', 'none')
  if ((ind === -1) || (ind > 0)) { // Il y a du texte
    stylespan = ''
    // if (infoBalise.couleur !== "") stylespan += "fill:" + infoBalise.couleur+";";
    if (infoBalise.couleur) stylespan += 'fill:' + infoBalise.couleur + ';'
    if (infoBalise.bold) stylespan += 'font-weight:bold;'
    if (infoBalise.italic) stylespan += 'font-style:italic;'
    if (infoBalise.underline) stylespan += 'text-decoration:underline;'
    if (infoBalise.fontface !== '') {
      stylespan += 'font-family:' + infoBalise.fontface + ';'
    } else {
      stylespan += 'font-family: "Times New Roman", Times, serif;'
    }
    stylespan += 'font-size:' + infoBalise.taille + 'px;'
    tspan.setAttribute('style', stylespan)
    if (debutLigne) {
      tspan.setAttribute('x', 0)
      debutLigne = false
    }
    tspan.setAttribute('y', y)
    const ch2 = (ind === -1) ? ch : ch.substring(0, ind)
    tspan.appendChild(document.createTextNode(ch2))
    txt.appendChild(tspan)
    if (ind > 0) traiteBalise(ch.substring(ind), infoBalise, txt, debutLigne, y)
    // else ch = "";
  } else {
    if (ch.indexOf('<b>') === 0) { // Balise bold
      info = new InfoBalise(true, infoBalise.italic, infoBalise.underline, infoBalise.couleur, infoBalise.fontface)
      indfb = indiceFinBalise(ch)
      if (indfb === -1) {
        traiteBalise(ch.substring(3), info, txt, debutLigne, y)
      } else {
        traiteBalise(ch.substring(3, indfb - 4), info, txt, debutLigne, y)
      }
    } else {
      if (ch.indexOf('<i>') === 0) { // Balise italique
        info = new InfoBalise(infoBalise.bold, true, infoBalise.underline, infoBalise.couleur, infoBalise.fontface)
        indfb = indiceFinBalise(ch)
        if (indfb === -1) {
          traiteBalise(ch.substring(3), info, txt, debutLigne, y)
        } else {
          traiteBalise(ch.substring(3, indfb - 4), info, txt, debutLigne, y)
        }
      } else {
        if (ch.indexOf('<u>') === 0) { // Balise souigné
          info = new InfoBalise(infoBalise.bold, infoBalise.italic, true, infoBalise.couleur, infoBalise.fontface)
          indfb = indiceFinBalise(ch)
          if (indfb === -1) {
            traiteBalise(ch.substring(3), info, txt, debutLigne, y)
          } else {
            traiteBalise(ch.substring(3, indfb - 4), info, txt, debutLigne, y)
          }
        } else {
          if (ch.indexOf('<font') === 0) {
            indfb = indiceFinBalise(ch)
            if (indfb === -1) indfb = ch.length
            ind1 = ch.indexOf('face="')
            if (ind1 !== -1) {
              ind2 = ch.indexOf('"', ind1 + 6)
              if (ind2 !== -1) { fonte = ch.substring(ind1 + 6, ind2) } else fonte = ''
            } else {
              fonte = ''
            }
            couleur = ''
            ind1 = ch.indexOf('couleur="')
            if (ind1 !== -1) {
              ind2 = ch.indexOf('"', ind1 + 9)
              if (ind2 !== -1) {
                couleur = getSvgColor(ch.substring(ind1 + 9, ind2))
              }
            } else {
              ind1 = ch.indexOf('color="')
              if (ind1 !== -1) {
                ind2 = ch.indexOf('"', ind1 + 7)
                if (ind2 !== -1) {
                  couleur = getSvgColor(ch.substring(ind1 + 7, ind2))
                }
              }
            }
            ind1 = ch.indexOf('size="')
            if (ind1 !== -1) {
              ind2 = ch.indexOf('"', ind1 + 6)
              if (ind2 !== -1) { taille = ch.substring(ind1 + 6, ind2) } else taille = infoBalise.taille
            }

            info = new InfoBalise(infoBalise.bold, infoBalise.italic, infoBalise.underline, couleur, fonte, taille)
            inddeb = ch.indexOf('>') // Recherche du > de la balise <font>
            if ((/<\/font>/i).test(ch)) {
              traiteBalise(ch.substring(inddeb + 1, indfb - 7), info, txt, debutLigne, y)
            } else {
              traiteBalise(ch.substring(inddeb + 1), info, txt, debutLigne, y)
            }
          }
        }
      }
    }
  }
}

/**
 * Retourne true si la chaîne ch contient des codes spéciaux de maths en flash
 * sauf les £e() et £i() simples.
 * Si les arguments de £e() ou £i() contiennent des appels à des balises ou d'autres
 * appels à £e() et £i() renvoie true car alors il faut utiliser le LaTeX pour représenter la formule.
 * Si expind est true on cherche aussi les puissances et indices
 * @param {string} ch
 * @returns {Boolean}
 */
export function necessiteLatex (ch) {
  // Les codes e (exposant) et i (idice) ne nécessitent pas l'utilisation de MathJax
  if (['a', 'c', 'd', 'f', 'g', 'n', 'p', 'r', 's', 'u', 'v'].some(code => ch.includes(`£${code}(`))) return true
  // Si la formule contient des puissances ou des indices utilisant elle-mêmes des balises
  // puissances, indices ou font il faut passer par le LaTeX donc on renvoie true
  let ind, indparf, s
  let ch1 = ch
  while ((ind = ch1.search(/£e\(|£i\(/g)) !== -1) {
    indparf = indiceParentheseFermante(ch1, ind + 3)
    if (indparf === -1) indparf = ch1.length
    s = ch1.substring(ind, indparf)
    if (s.search(/£e\(|£i\(£lt£font/g) !== -1) return true
    if (indparf === ch1.length) {
      return false
    } else {
      ch1 = s.substring(indparf + 1)
    }
  }
  ch1 = ch
  // Si la formule contient des balise font contenant des indices ou exposants
  // il faut aussi passer par le LaTeX donc on renvoie true
  while ((ind = ch1.search(/£lt£font/g)) !== -1) {
    indparf = indiceFinBalise(ch1.substring(ind))
    if (indparf === -1) {
      indparf = ch1.length
    } else {
      indparf += ind
    }
    s = ch1.substring(ind, indparf)
    if (s.search(/£e\(|£i\(/g) !== -1) return true
    if (indparf === ch1.length) {
      return false
    } else {
      ch1 = s.substring(indparf + 1)
    }
  }
  return false
}

/**
 * Fonction récursive renvoyant une chaîne LaTeX représentant la chaîne contenue dans s
 * @param {string} s la chaîne à traiter (qui représente une ligne dans le cas de plusieurs lignes)
 * @param {boolean} btexte Si true, le contenu renvoyé est encadré par une balise \text
 */
export function getMaths (s, btexte) {
  let ind, indpf, indv, ind1, ind2, inddeb, ch2, couleur, ret, indv1, indv2, indv3, car
  const ch = s
  if (ch === '') return ''
  // Traitement des balises Font
  // On ne traite que les changements de couleur
  while ((ind = ch.indexOf('<font')) !== -1) {
    couleur = null
    ch2 = ch.substring(ind)
    indpf = indiceFinBalise(ch2)
    ind1 = ch2.indexOf('couleur="')
    if (ind1 !== -1) {
      ind2 = ch2.indexOf('"', ind1 + 9)
      if (ind2 !== -1) couleur = getSvgColor(ch2.substring(ind1 + 9, ind2))
    } else {
      ind1 = ch2.indexOf('color="')
      if (ind1 !== -1) {
        ind2 = ch2.indexOf('"', ind1 + 7)
        if (ind2 !== -1) couleur = getSvgColor(ch2.substring(ind1 + 7, ind2))
      }
    }
    if (couleur != null) { // On ne traite que les changements de couleur
      inddeb = ind + ch2.indexOf('>') + 1 // Pointe sur le début concerné par la balise <font
      if (indpf === -1) {
        return getMaths(ch.substring(0, ind) + '\\textcolor{' + couleur + '}{' +
          ch.substring(inddeb) + '}', btexte)
      } else {
        indpf += ind
        return getMaths(ch.substring(0, ind) + '\\textcolor{' + couleur + '}{' +
          ch.substring(inddeb, indpf - 7) + '}' + ch.substring(indpf), btexte)
      }
    } else {
      inddeb = ind + ch2.indexOf('>') + 1
      if (indpf === -1) {
        return getMaths(ch.substring(0, ind) + ch.substring(inddeb), btexte)
      } else {
        indpf += ind
        return getMaths(ch.substring(0, ind) + ch.substring(inddeb, indpf - 7) +
          ch.substring(indpf), btexte)
      }
    }
  }
  // Traitement des caractères par code hexadécimal
  while ((ind = ch.indexOf('£u(')) !== -1) {
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMaths(ch.substring(0, ind), btexte) + '\\unicode{x' + ch.substring(ind + 3, indpf) +
      '}' + getMaths(ch.substring(indpf + 1), btexte)
  }
  // Traitement des fractions
  while ((ind = ch.indexOf('£f(')) !== -1) {
    indv = indiceVirgule(ch, ind + 3, 1) // Recherche de la première virgule
    indpf = indiceParentheseFermante(ch, ind + 2)
    if ((indv === -1) || (indpf === -1) || (indv > indpf)) return ch
    /* Modification version MathJax3 pour que les quotients utilisent display style sinon trop petits
    return getMaths(getMaths(ch.substring(0, ind), btexte) + '\\frac{' +
      getMaths(ch.substring(ind + 3, indv), false) + '}{' +
      getMaths(ch.substring(indv + 1, indpf), false) + '}' + getMaths(ch.substring(indpf + 1), btexte), btexte)
      */
    return getMaths(getMaths(ch.substring(0, ind), btexte) + '\\displaystyle{\\frac{' +
      getMaths(ch.substring(ind + 3, indv), false) + '}{' +
      getMaths(ch.substring(indv + 1, indpf), false) + '}}' + getMaths(ch.substring(indpf + 1), btexte), btexte)
  }
  // Traitement des racines carrées
  while ((ind = ch.indexOf('£r(')) !== -1) {
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMaths(getMaths(ch.substring(0, ind), btexte) + '\\sqrt{' +
      getMaths(ch.substring(ind + 3, indpf), false) +
      '}' + getMaths(ch.substring(indpf + 1), btexte), btexte)
  }
  // Traitement des codes d'angle
  while ((ind = ch.indexOf('£a(')) !== -1) {
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMaths(getMaths(ch.substring(0, ind), btexte) +
      '\\widehat{' + getMaths(ch.substring(ind + 3, indpf), true) + '}' +
      getMaths(ch.substring(indpf + 1), btexte), btexte)
  }
  // Traitement des intégrales
  while ((ind = ch.indexOf('£g(')) !== -1) {
    indv1 = indiceVirgule(ch, ind + 3, 1) // Recherche de la première virgule
    indv2 = indiceVirgule(ch, ind + 3, 2) // Recherche de la première virgule
    indv3 = indiceVirgule(ch, ind + 3, 3) // Recherche de la première virgule
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMaths(getMaths(ch.substring(0, ind), btexte) + '\\int_{' +
      getMaths(ch.substring(indv2 + 1, indv3), false) + '}^{' +
      getMaths(ch.substring(indv3 + 1, indpf), false) +
      '}' + getMaths(ch.substring(ind + 3, indv1), false) +
      ' d' + getMaths(ch.substring(indv1 + 1, indv2), false) +
      getMaths(ch.substring(indpf + 1), btexte), btexte)
  }
  // Traitement des crochets
  while ((ind = ch.indexOf('£c(')) !== -1) {
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMaths(ch.substring(0, ind), btexte) + '\\left[' + getMaths(ch.substring(ind + 3, indpf), btexte) +
      '\\right]' + getMaths(ch.substring(indpf + 1), btexte)
  }
  // Traitement des parenthèses
  while ((ind = ch.indexOf('£p(')) !== -1) {
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMaths(getMaths(ch.substring(0, ind), btexte) + '\\left(' + getMaths(ch.substring(ind + 3, indpf), btexte) +
      '\\right)' + getMaths(ch.substring(indpf + 1), btexte))
  }
  // Traitement des valeurs absolues
  while ((ind = ch.indexOf('£d(')) !== -1) {
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMaths(getMaths(ch.substring(0, ind), btexte) + '\\left|' + getMaths(ch.substring(ind + 3, indpf), false) +
      '\\right|' + getMaths(ch.substring(indpf + 1), btexte), btexte)
  }
  // Traitement des normes
  while ((ind = ch.indexOf('£n(')) !== -1) {
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMaths(getMaths(ch.substring(0, ind), btexte) + '\\left\\|' + getMaths(ch.substring(ind + 3, indpf), false) +
      '\\right\\|' + getMaths(ch.substring(indpf + 1), btexte))
  }
  // Traitement des indices
  while ((ind = ch.indexOf('£i(')) !== -1) {
    indv = indiceVirgule(ch, ind + 3, 1) // Recherche de la première virgule
    indpf = indiceParentheseFermante(ch, ind + 2)
    if ((indv === -1) || (indpf === -1) || (indv > indpf)) return ch
    return getMaths(getMaths(ch.substring(0, ind), btexte) + '{' + getMaths(ch.substring(ind + 3, indv), false) + '}_{' +
      getMaths(ch.substring(indv + 1, indpf), false) + '}' + getMaths(ch.substring(indpf + 1), btexte), btexte)
  }
  // Traitement des exposants
  while ((ind = ch.indexOf('£e(')) !== -1) {
    indv = indiceVirgule(ch, ind + 3, 1) // Recherche de la première virgule
    indpf = indiceParentheseFermante(ch, ind + 2)
    if ((indv === -1) || (indpf === -1) || (indv > indpf)) return ch
    return getMaths(getMaths(ch.substring(0, ind), btexte) + '{' + getMaths(ch.substring(ind + 3, indv), false) + '}^{' +
      getMaths(ch.substring(indv + 1, indpf), false) + '}' + getMaths(ch.substring(indpf + 1), btexte))
  }
  // Traitement des vecteurs
  while ((ind = ch.indexOf('£v(')) !== -1) {
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMaths(getMaths(ch.substring(0, ind), btexte) + '\\overrightarrow{' + getMaths(ch.substring(ind + 3, indpf), false) +
      '}' + getMaths(ch.substring(indpf + 1), btexte), btexte)
  }
  // Traitement des balises <u>
  while ((ind = ch.indexOf('<u>')) !== -1) {
    indpf = indiceFinBalise(ch.substring(ind))
    if (indpf === -1) {
      return ch
    } else {
      indpf += ind
    }
    return getMaths(ch.substring(0, ind), btexte) + '\\underline{' + getMaths(ch.substring(ind + 3, indpf - 4), true) +
      '}' + getMaths(ch.substring(indpf), btexte)
  }
  // Traitement des balises <i>
  while ((ind = ch.indexOf('<i>')) !== -1) {
    indpf = indiceFinBalise(ch.substring(ind))
    if (indpf === -1) {
      return getMaths(ch.substring(0, ind), btexte) +
        '\\textit{' + getMaths(ch.substring(ind + 3), false) + '}'
    } else {
      indpf += ind
      return getMaths(ch.substring(0, ind), btexte) + '\\textit{' +
        getMaths(ch.substring(ind + 3, indpf - 4), false) + '}' +
        getMaths(ch.substring(indpf), btexte)
    }
  }
  // Traitement des balises <b>
  while ((ind = ch.indexOf('<b>')) !== -1) {
    indpf = indiceFinBalise(ch.substring(ind))
    if (indpf === -1) {
      return getMaths(ch.substring(0, ind), btexte) +
        '\\textbf{' + getMaths(ch.substring(ind + 3), false) + '}'
    } else {
      indpf += ind
      return getMaths(ch.substring(0, ind), btexte) + '\\textbf{' +
        getMaths(ch.substring(ind + 3, indpf - 4), false) + '}' +
        getMaths(ch.substring(indpf), btexte)
    }
  }
  if (btexte) {
    car = ch.charAt(0)
    // if ((car === ")") || (car === ",") || (car === "}")) return ch;
    if ((car === ')') || (car === ',') || (car === '}')) {
      return car + getMaths(ch.substring(1), btexte)
    } else {
      // Même si on et en mode texte, on peut avoir au début de ch une balise \textcolor incomplète
      if (contientBaliseLaTeX(ch)) {
        return ch
      } else {
        // Il faut sauter les balises \\textcolor en tenant compte que certaines ne sont pas fermées.
        ind = ch.indexOf('\\textcolor{')
        if (ind !== -1) {
          ret = ''
          ch2 = ch
          while ((ind = ch2.indexOf('\\textcolor{')) !== -1) {
            ind1 = ch2.indexOf('}{')
            indpf = accoladeFermante(ch2, ind1 + 1)
            if (indpf === -1) {
              if (ind === 0) {
                if (ind1 + 2 !== ch2.length) {
                  ret += ch2.substring(0, ind1 + 2) + '\\text{' + ch2.substring(ind1 + 2) + '}'
                } else {
                  ret += ch2
                }
                ch2 = ''
              } else {
                if (ind1 + 2 !== ch2.length) {
                  ret += '\\text{' + ch2.substring(0, ind) + '}' + ch2.substring(ind, ind1 + 2) +
                    '\\text{' + ch2.substring(ind1 + 2) + '}'
                } else {
                  ret += '\\text{' + ch2.substring(0, ind) + '}' + ch2.substring(ind, ind1 + 2)
                }
                ch2 = ''
              }
            } else {
              if (ind === 0) {
                ret += ch2.substring(0, indpf + 1)
                if (indpf < ch2.length - 1) {
                  ch2 = ch2.substring(indpf + 1)
                } else {
                  ch2 = ''
                }
              } else {
                ret += '\\text{' + ch2.substring(0, ind) + '}' + ch2.substring(ind, ind1 + 2) +
                  '\\text{' + ch2.substring(ind1 + 2, indpf + 1) + '}'
                if (indpf < ch2.length - 1) {
                  ch2 = ch2.substring(indpf + 1)
                } else {
                  ch2 = ''
                }
              }
            }
          }
          if (ch2 === '') {
            return ret
          } else {
            return ret + '\\text{' + ch2 + '}'
          }
        } else {
          // Si la chaîne commence par une parenthèse fermante, une accolade fermante ou une virgule
          //  il s'agit d'une formule en cours et pas de mode texte
          // Si le texte commence par des espaces, pour qu'ils soient pris en compte, on rajoute des espaces
          // insécables en mode maths
          let deb = 0
          let k = 0
          while (ch.charAt(k) === ' ') {
            deb++
            k++
          }
          return '~'.repeat(deb) + '\\text{' + ch.substring(k) + '}'
        }
      }
    }
  } else {
    return ch
  }
}

/**
 * Fonction récursive renvoyant une chaîne LaTeX représentant la chaîne contenue dans s
 * Utilisée pour les noms devant utiliser le LaTeX pour être affichés
 * @param {string} s la chaîne à traiter (qui représente une ligne dans le cas de plusieurs lignes)
 * @param {boolean} btexte Si true, le contenut renvoyé est encadré par une balise \text Test
 */
export function getMathsForName (s, btexte) {
  let ind, indpf, indv, ind1, ind2, inddeb, ch2, couleur, ret, car
  let ch = s
  if (ch === '') return ''
  // Traitement des balises Font
  // On ne traite que les changements de couleur
  while ((ind = ch.indexOf('<font')) !== -1) {
    couleur = null
    ch2 = ch.substring(ind)
    indpf = indiceFinBalise(ch2)
    ind1 = ch2.indexOf('couleur="')
    if (ind1 !== -1) {
      ind2 = ch2.indexOf('"', ind1 + 9)
      if (ind2 !== -1) couleur = getSvgColor(ch2.substring(ind1 + 9, ind2))
    } else {
      ind1 = ch2.indexOf('color="')
      if (ind1 !== -1) {
        ind2 = ch2.indexOf('"', ind1 + 7)
        if (ind2 !== -1) couleur = getSvgColor(ch2.substring(ind1 + 7, ind2))
      }
    }
    if (couleur !== null) { // On ne traite que les changements de couleur
      inddeb = ind + ch2.indexOf('>') + 1 // Pointe sur le début concerné par la balise <font
      if (indpf === -1) {
        return getMathsForName(ch.substring(0, ind) + '\\textcolor{' + couleur + '}{' +
          ch.substring(inddeb) + '}', btexte)
      } else {
        indpf += ind
        return getMathsForName(ch.substring(0, ind) + '\\textcolor{' + couleur + '}{' +
          ch.substring(inddeb, indpf - 7) + '}' + ch.substring(indpf), btexte)
      }
    } else {
      inddeb = ind + ch2.indexOf('>') + 1
      if (indpf === -1) {
        return getMathsForName(ch.substring(0, ind) + ch.substring(inddeb), btexte)
      } else {
        indpf += ind
        return getMathsForName(ch.substring(0, ind) + ch.substring(inddeb, indpf - 7) +
          ch.substring(indpf), btexte)
      }
    }
  }
  // Traitement des caractères par code hexadécimal
  while ((ind = ch.indexOf('£u(')) !== -1) {
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMathsForName(ch.substring(0, ind), btexte) + '\\unicode{x' + ch.substring(ind + 3, indpf) +
      '}' + getMathsForName(ch.substring(indpf + 1), btexte)
  }
  // Traitement des racines carrées
  while ((ind = ch.indexOf('£r(')) !== -1) {
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMathsForName(getMathsForName(ch.substring(0, ind), btexte) + '\\sqrt{' +
      getMathsForName(ch.substring(ind + 3, indpf), false) +
      '}' + getMathsForName(ch.substring(indpf + 1), btexte), btexte)
  }
  // Traitement des valeurs absolues
  while ((ind = ch.indexOf('£d(')) !== -1) {
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMathsForName(getMathsForName(ch.substring(0, ind), btexte) + '\\left|' + getMathsForName(ch.substring(ind + 3, indpf), false) +
      '\\right|' + getMathsForName(ch.substring(indpf + 1), btexte), btexte)
  }
  // Traitement des normes
  while ((ind = ch.indexOf('£n(')) !== -1) {
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMathsForName(getMathsForName(ch.substring(0, ind), btexte) + '\\left\\|' + getMathsForName(ch.substring(ind + 3, indpf), false) +
      '\\right\\|' + getMathsForName(ch.substring(indpf + 1), btexte))
  }
  // Traitement des indices
  while ((ind = ch.indexOf('£i(')) !== -1) {
    indv = indiceVirgule(ch, ind + 3, 1) // Recherche de la première virgule
    indpf = indiceParentheseFermante(ch, ind + 2)
    if ((indv === -1) || (indpf === -1) || (indv > indpf)) return ch
    // rrue car il s'agit d'un nom : getMathsForName(ch.substring(ind+3,indv),true)
    return getMathsForName(getMathsForName(ch.substring(0, ind), btexte) + '{' + getMathsForName(ch.substring(ind + 3, indv), true) + '}_{' +
      getMathsForName(ch.substring(indv + 1, indpf), false) + '}' + getMathsForName(ch.substring(indpf + 1), btexte), btexte)
  }
  // Traitement des exposants
  while ((ind = ch.indexOf('£e(')) !== -1) {
    indv = indiceVirgule(ch, ind + 3, 1) // Recherche de la première virgule
    indpf = indiceParentheseFermante(ch, ind + 2)
    if ((indv === -1) || (indpf === -1) || (indv > indpf)) return ch
    // true car il s'agit d'un affichage de nom : getMathsForName(ch.substring(ind+3,indv),true)
    return getMathsForName(getMathsForName(ch.substring(0, ind), btexte) + '{' + getMathsForName(ch.substring(ind + 3, indv), true) + '}^{' +
      getMathsForName(ch.substring(indv + 1, indpf), false) + '}' + getMathsForName(ch.substring(indpf + 1), btexte))
  }
  // Traitement des vecteurs
  while ((ind = ch.indexOf('£v(')) !== -1) {
    indpf = indiceParentheseFermante(ch, ind + 2)
    if (indpf === -1) return ch
    return getMathsForName(getMathsForName(ch.substring(0, ind), btexte) + '\\overrightarrow{' + getMathsForName(ch.substring(ind + 3, indpf), false) +
      '}' + getMathsForName(ch.substring(indpf + 1), btexte), btexte)
  }
  // Traitement des balises <u>
  while ((ind = ch.indexOf('<u>')) !== -1) {
    indpf = indiceFinBalise(ch.substring(ind))
    if (indpf === -1) {
      return ch
    } else {
      indpf += ind
    }
    return getMathsForName(ch.substring(0, ind), btexte) + '\\underline{' + getMathsForName(ch.substring(ind + 3, indpf - 4), true) +
      '}' + getMathsForName(ch.substring(indpf), btexte)
  }
  // Traitement des balises <i>
  while ((ind = ch.indexOf('<i>')) !== -1) {
    indpf = indiceFinBalise(ch.substring(ind))
    if (indpf === -1) {
      return getMathsForName(ch.substring(0, ind), btexte) +
        '\\textit{' + getMathsForName(ch.substring(ind + 3), false) + '}'
    } else {
      indpf += ind
      return getMathsForName(ch.substring(0, ind), btexte) + '\\textit{' +
        getMathsForName(ch.substring(ind + 3, indpf - 4), false) + '}' +
        getMathsForName(ch.substring(indpf), btexte)
    }
  }
  // Traitement des balises <b>
  while ((ind = ch.indexOf('<b>')) !== -1) {
    indpf = indiceFinBalise(ch.substring(ind))
    if (indpf === -1) {
      return getMathsForName(ch.substring(0, ind), btexte) +
        '\\textbf{' + getMathsForName(ch.substring(ind + 3), false) + '}'
    } else {
      indpf += ind
      return getMathsForName(ch.substring(0, ind), btexte) + '\\textbf{' +
        getMathsForName(ch.substring(ind + 3, indpf - 4), false) + '}' +
        getMathsForName(ch.substring(indpf), btexte)
    }
  }
  if (btexte) {
    // Même si on et en mode texte, on peut avoir au début de ch une balise \textcolor incomplète
    if (contientBaliseLaTeX(ch)) {
      return ch
    } else {
      // Il faut sauter les balises \\textcolor en tenant compte que certaines ne sont pas fermées.
      ind = ch.indexOf('\\textcolor{')
      if (ind !== -1) {
        ret = ''
        ch2 = ch
        while ((ind = ch2.indexOf('\\textcolor{')) !== -1) {
          ind1 = ch2.indexOf('}{')
          indpf = accoladeFermante(ch2, ind1 + 1)
          if (indpf === -1) {
            if (ind === 0) {
              if (ind1 + 2 !== ch2.length) {
                ret += ch2.substring(0, ind1 + 2) + '\\text{' + ch2.substring(ind1 + 2) + '}'
              } else {
                ret += ch2
              }
              ch2 = ''
            } else {
              if (ind1 + 2 !== ch2.length) {
                ret += '\\text{' + ch2.substring(0, ind) + '}' + ch2.substring(ind, ind1 + 2) +
                  '\\text{' + ch2.substring(ind1 + 2) + '}'
              } else {
                ret += '\\text{' + ch2.substring(0, ind) + '}' + ch2.substring(ind, ind1 + 2)
              }
              ch2 = ''
            }
          } else {
            if (ind === 0) {
              ret += ch2.substring(0, indpf + 1)
              if (indpf < ch2.length - 1) {
                ch2 = ch2.substring(indpf + 1)
              } else {
                ch2 = ''
              }
            } else {
              ret += '\\text{' + ch2.substring(0, ind) + '}' + ch2.substring(ind, ind1 + 2) +
                '\\text{' + ch2.substring(ind1 + 2, indpf + 1) + '}'
              if (indpf < ch2.length - 1) {
                ch2 = ch2.substring(indpf + 1)
              } else {
                ch2 = ''
              }
            }
          }
        }
        if (ch2 === '') {
          return ret
        } else {
          return ret + '\\text{' + ch2 + '}'
        }
      } else {
        // Si la chaîne commence par une parenthèse fermante, une accolade fermante ou une virgule
        //  il s'agit d'une formule en cours et pas de mode texte
        car = ch.charAt(0)
        if ((car === ')') || (car === ',') || (car === '}')) {
          return ch
        } else {
          // Si on est en modetexte et que la chaîne commence par des espaces, pour qu'ils soient pris en compte
          // on va, pour ces espaces, rester en mode maths et les remplacer par des ~ pour avoir des espaces insécables.
          let deb = ''
          while (ch.indexOf(' ') === 0) {
            deb += '~'
            ch = ch.substring(1)
          }
          return deb + '\\text{' + ch + '}'
        }
      }
    }
  } else {
    return ch
  }
}

/**
 * Retourne obj.taille sous forme d'un number garanti entre min et max,
 * renverra options.defaut si y'a un pb (obj.taille pas un nb dans l'intervalle)
 * @param {Object} obj
 * @param {Object} [options]
 * @param {Object} [options.defaut=20] La valeur qui sera renvoyée si obj.taille n'est pas un entier entre min et max
 * @param {Object} [options.min=5] La taille min acceptable
 * @param {Object} [options.max=199] La taille max acceptable
 * @return {number}
 */
export function getTaille (obj, options = {}) {
  if (!obj || typeof obj !== 'object') throw Error('objet invalide')
  const defaut = options.defaut || 20
  const min = options.min || 5
  const max = options.max || 199 // dans devServer/fixture/0.xml on a une taille de 60
  if (typeof defaut !== 'number' || typeof min !== 'number' || typeof max !== 'number') throw Error('options invalides')
  const taille = Number(obj.taille)
  if (isNaN(taille)) {
    console.error(Error(`taille invalide (${obj.taille}) => ${defaut}`))
    return defaut
  }
  if (taille < min) {
    console.error(Error(`taille trop petite (${obj.taille} < ${min}) => ${defaut}`))
    return defaut
  }
  if (taille > max) {
    console.error(Error(`taille trop grande (${obj.taille} > ${max}) => ${defaut}`))
    return defaut
  }
  return taille
}
