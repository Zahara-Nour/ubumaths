/*
 * Created by yvesb on 12/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @version 5.1.2
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Opef from '../types/Opef'
import Opef2v from '../types/Opef2v'
import Opef3v from '../types/Opef3v'
import Opef4v from '../types/Opef4v'
import Opef5v from '../types/Opef5v'
import Ope from '../types/Ope'

/**
 * Le set des noms de fonctions, affecté au 1er appel de tabNomsFoncPred
 * @type {null|Set<string>}
 */
let nomsFoncPred = null

/**
 * Fonction renvoyant un set formé de tous les noms de fonctions réelles ou complexes prédéfinies
 * Utilisé dans les CEditeurFonction pour ajouter les opérations implicites et dans CListeObjets
 * @returns {Set<string>}
 */
function tabNomsFoncPred () {
  if (nomsFoncPred) return nomsFoncPred
  const res = new Set()
  let i
  // Version 7.0 : Il faut rechercher à la fois dans les noms de fonctions réelles et complexes
  // car certains différent comme dotmult
  // De toute façon add ne rajoute pas ce qui est déjà dans le Set
  for (i = 0; i < Opef.nomsFoncs.length; i++) {
    // Les toLowerCase sont rajoutés par précaution car normalement les noms de fonctions
    // traduits dans les fichiers de traduction doivent être en minuscules
    res.add(Opef.nomsFonctions(i).toLowerCase())
  }
  for (i = 0; i < Opef.nomsFoncsComplexes.length; i++) {
    res.add(Opef.nomsFonctionsComplexes(i).toLowerCase())
  }
  for (i = 0; i < Opef2v.nomsFoncs2Var.length; i++) {
    res.add(Opef2v.nomsFonctions2Var(i).toLowerCase())
  }
  for (i = 0; i < Opef2v.nomsFoncsComplexes2Var.length; i++) {
    res.add(Opef2v.nomsFonctionsComplexes2Var(i).toLowerCase())
  }
  for (i = 0; i < Opef3v.nomsFoncs3Var.length; i++) {
    res.add(Opef3v.nomsFonctions3Var(i).toLowerCase())
  }
  for (i = 0; i < Opef3v.nomsFoncsComplexes3Var.length; i++) {
    res.add(Opef3v.nomsFonctionsComplexes3Var(i).toLowerCase())
  }
  for (i = 0; i < Opef4v.nomsFoncs4Var.length; i++) {
    res.add(Opef4v.nomsFonctions4Var(i).toLowerCase())
  }
  for (i = 0; i < Opef4v.nomsFoncsComplexes4Var.length; i++) {
    res.add(Opef4v.nomsFonctionsComplexes4Var(i).toLowerCase())
  }
  for (i = 0; i < Opef5v.nomsFoncs5Var.length; i++) {
    res.add(Opef5v.nomsFonctions5Var(i).toLowerCase())
  }
  for (i = 0; i < Opef5v.nomsFoncsComplexes5Var.length; i++) {
    res.add(Opef5v.nomsFonctionsComplexes5Var(i))
  }
  if (res.has('')) {
    console.error(Error('Un des noms de fonction n’a pas été trouvé (textes non chargés ?)'))
    res.delete('')
  }
  if (res.size) nomsFoncPred = res
  else console.error(Error('Aucun nom de fonction chargé'))
  return res
}

/**
 * Fonction appelée dans le cas ou pRecherche est l'indice dans chaine d'une
 * parenthèse fermante et renvoyant l'indice de la parenthèse
 * ouvrante correspondante. La recherche se fait donc de la fin de la chapine vers le début.
 * Elle ne doit être appelée que si pdebut<=pRecherche et si pRecherche pointe sur une
 * parenthèse fermante et si la syntaxe est correcte au point de vue parenthèses.
 * @param {string} chaine  La chaîne dans laquelle se fait la recherche
 * @param {number} pdebut  L'indice d'arrêt de la recherhce dans la chaîne..
 * @param {number} pRecherche  L'indice de début de recherche dans la chaîne qui doit
 * être l'indice d'une parenthèse fermante.
 * @returns {number}
 */
function parentheseOuvrante (chaine, pdebut, pRecherche) {
  let p
  let ch
  let somme

  somme = 0
  p = pRecherche
  do {
    ch = chaine.charAt(p)
    if (ch === ')') { somme-- } else {
      if (ch === '(') { somme++ }
    }
    p = p - 1
  } while ((somme !== 0) && (p >= pdebut))
  return p + 1
}
/**
 * Fonction appelée dans le cas ou pDebut est l'indice dans chaine d'une
 * parenthèse ouvrante et renvoyant l'indice de la parenthèse
 * fermante correspondante.
 * @param {string} chaine  La chaîne dans laquelle se fait la recherche
 * @param {number} pdebut  l'indice de début de la racherche dans la chaîne.
 * @returns {number}
 */
function parentheseFermante (chaine, pdebut) {
  let p
  let ch
  let somme

  somme = 1
  p = pdebut + 1
  while (p < chaine.length) {
    ch = chaine.charAt(p)
    if (ch === '(') { somme++ } else {
      if (ch === ')') { somme-- }
    }
    if (somme === 0) break
    p++
  }
  if (somme === 0) return p
  else return -1 // On renvoie -1 si pas trouvé
}
/**
 * Fonction renvoyant l'indice de la parenthèse fermante correspondant à une
 * virgule. Avant appel pDebut pointe sur le caractère suivant la virgule.
 * La chaîne doit être correcte sur le plan syntaxique acant appel
 * @param {string} chaine  La chaîne dans laquelle se fait la recherche
 * @param {number} pDebut  Indice du début de la recherche.
 * @returns {number}
 */
function parentheseFermanteApresVirgule (chaine, pDebut) {
  let car
  let somme = 1
  let i
  for (i = pDebut; i < chaine.length; i++) {
    car = chaine.charAt(i)
    if (car === '(') somme++
    else if (car === ')') {
      somme--
      if (somme === 0) { return i }
    }
  }
  return i // Pour satisfaire le compilateur mais on ne doit pas arriver ici
}
/**
 * Fonction renvoyant l'indice dans la chaîne ch du caractère suivant la virgule n° i
 * @param {string} ch  La chaîne dans laquelle se fait la recherche
 * @param {number} inddeb  L'indice dans la chaîne du début de la recherche
 * @param {number} virg  L'indice de la virguel recherchée.
 * @returns {number}
 */
function indiceCaractereVirgule (ch, inddeb, virg) {
  let i = inddeb
  let nbvirg = 0
  if ((virg === 0) || (i > ch.length)) return ch.length - 1
  let parentheses = 1
  while ((i < ch.length) && (parentheses >= 1) && (nbvirg <= virg)) {
    const car = ch.charAt(i)
    if (car === '(') { parentheses++ }
    if (car === ')') { parentheses-- }
    if ((car === ',') && (parentheses === 1)) { nbvirg++ }
    i++
  }
  return i
}
/**
 * Fonction renvoyant l'indice du premier caractère dans ch étant un opérateur logique & ou |
 * Renvoie dans retour.x l'indice du caractère précédent l'opérateur logique
 * et dans retour.y l'opérateur associé à cette inégalité (Ope.Or ou Ope.And).
 * La recherche se fait de la fin de la chaine vers le début en sautant les parenthèses.
 *  @param {string} chop  La chaîne représentant l'opérateur ("|# ou "&").
 * @param {string} ch  La chaîne dans laquelle se fait la recherche.
 * @param {number} pdeb  Indice du début de la recherche.
 * @param {number} pfin  Indice de la fin de la recherche.
 * @param {Object} retour Voir ci-dessus.
 * @returns {number} : -1 si n'a pas trouvé d'opérateur logique sinon son indice dans ch.
 */
function premierOperateurLogique (chop, ch, pdeb, pfin, retour) {
  let ptch
  let car
  let resultat

  ptch = pfin
  do {
    car = ch.charAt(ptch)
    resultat = ptch
    if (car === ')') { ptch = CCbGlob.parentheseOuvrante(ch, pdeb, ptch) }
    ptch = ptch - 1
  } while ((ptch >= pdeb) && (car !== chop))
  switch (car) {
    case '&':
      retour.x = resultat - 1
      retour.y = Ope.And
      return resultat
    case '|':
      retour.x = resultat - 1
      retour.y = Ope.Or
      return resultat
    default:
      return -1
  } // switch car
}

/**
 * Renvoie le nombre de virgules trouvées pour un appel de paramètre.
 * Fonction appelée dans VerifieSyntaxe pour un appel de fonctions à plusieurs
 * variables.
 * @param {string} ch  La chaîne dans laquelle se fait la recherche.
 * @param {number} inddeb  L'inidce du début de la recherche dans ch.
 * @returns {number} : -1 si indeb >= ch.length sinon renvoie le nombre de virgules trouvées.
 */
function NombreVirgules (ch, inddeb) {
  let i = inddeb
  let nbvirg = 0
  if (i >= ch.length) { return -1 }
  let parentheses = 1
  while ((i < ch.length) && (parentheses >= 1)) {
    const car = ch.charAt(i)
    if (car === '(') { parentheses++ }
    if (car === ')') { parentheses-- }
    if ((car === ',') && (parentheses === 1)) { nbvirg++ }
    i++
  }
  return nbvirg
}
/**
 * Fonction vérifiant si item peut être suivi de itemSuivant
 * sur le plan syntaxique.
 * @param {number} item  le type de calcul actuel
 * @param {number} itemSuivant  Le type de calcul dont on teste s'il peut suivre item
 * @returns {boolean}
 */
function autorisationSyntaxe (item, itemSuivant) {
  switch (item) {
    case CCbGlob.Nombre:
      switch (itemSuivant) {
        case CCbGlob.Addition:
        case CCbGlob.Multiplication:
        case CCbGlob.Puissance:
        case CCbGlob.Carre:
        case CCbGlob.ParFermante:
        case CCbGlob.Inegalite:
        case CCbGlob.Blanc:
        case CCbGlob.Virgule:
          return true
        default:
          return false
      }
    case CCbGlob.Addition:
    case CCbGlob.Multiplication:
      switch (itemSuivant) {
        case CCbGlob.Nombre:
        case CCbGlob.ParOuvrante:
        case CCbGlob.Valeur:
        case CCbGlob.Fonction:
        case CCbGlob.Blanc:
          return true
        default:
          return false
      }
    case CCbGlob.Puissance:
      switch (itemSuivant) {
        case CCbGlob.Nombre:
        case CCbGlob.Valeur:
        case CCbGlob.ParOuvrante:
        case CCbGlob.Fonction:
        case CCbGlob.Blanc:
          return true
        default:
          return false
      }
    case CCbGlob.Fonction:
      switch (itemSuivant) {
        case CCbGlob.ParOuvrante:
        case CCbGlob.Blanc:
          return true
        default:
          return false
      }
    case CCbGlob.Valeur:
    case CCbGlob.Carre:
      switch (itemSuivant) {
        case CCbGlob.Addition:
        case CCbGlob.Multiplication:
        case CCbGlob.Puissance:
        case CCbGlob.Carre:
        case CCbGlob.ParFermante:
        case CCbGlob.Inegalite:
        case CCbGlob.Blanc:
        case CCbGlob.Virgule:
          return true
        default:
          return false
      }
    case CCbGlob.ParOuvrante:
      switch (itemSuivant) {
        case CCbGlob.Addition:
        case CCbGlob.ParOuvrante:
        case CCbGlob.Nombre:
        case CCbGlob.Valeur:
        case CCbGlob.Fonction:
        case CCbGlob.Blanc:
          return true
        default:
          return false
      }
    case CCbGlob.ParFermante:
      switch (itemSuivant) {
        case CCbGlob.ParFermante:
        case CCbGlob.Addition:
        case CCbGlob.Multiplication:
        case CCbGlob.Puissance:
        case CCbGlob.Carre:
        case CCbGlob.Inegalite:
        case CCbGlob.Blanc:
        case CCbGlob.Virgule:
          return true
        default:
          return false
      }
    case CCbGlob.Inegalite:
      switch (itemSuivant) {
        case CCbGlob.Addition:
        case CCbGlob.Nombre:
        case CCbGlob.ParOuvrante:
        case CCbGlob.Valeur:
        case CCbGlob.Fonction:
        case CCbGlob.Blanc:
          return true
        default:
          return false
      }
    case CCbGlob.Virgule:
      switch (itemSuivant) {
        case CCbGlob.Addition:
        case CCbGlob.Nombre:
        case CCbGlob.ParOuvrante:
        case CCbGlob.Valeur:
        case CCbGlob.Fonction:
        case CCbGlob.Blanc:
          return true
        default:
          return false
      }
    default:
      return false // / normalement inutile
  } // switch Item
}
/**
 * Fonction renvoyant l'indice dans la chaine ch de la première inégalité
 * rencontrée et -1 s'il n'y en a pas.
 * La recherche se fait de la fin de la chaine vers le début en sautant les parenthèses.
 * @param {string} ch La chaîne dans laquelle se fait la recherche
 * @param {number} pdeb L'indice du début de la recherche dans ch.
 * @param {number} pfin L'indice de la fin de la recherche dans ch
 * @param {Object} retour Objet qui sera modifié
 * @param {number} retour.x indice du caractère précédent l'inégalité
 * @param {number} retour.y opérateur associé à cette inégalité (défini dans COperateur)
 * @returns {number} :-1 si n'a pas trouvé d'inégalité sinon son indice dans ch
 */
function premiereInegalite (ch, pdeb, pfin, retour) {
  let ptch
  let car, carPrecedent
  let resultat

  ptch = pfin
  do {
    car = ch.charAt(ptch)
    resultat = ptch
    if (car === ')') { ptch = CCbGlob.parentheseOuvrante(ch, pdeb, ptch) }
    ptch = ptch - 1
  } while ((ptch >= pdeb) && (car !== '=') && (car !== '>') && (car !== '<'))
  switch (car) {
    case '<':
      retour.x = resultat - 1
      retour.y = Ope.Inf
      return resultat

    case '>':
      retour.x = resultat - 1
      retour.y = Ope.Sup
      if (ptch > pdeb) {
        ptch = resultat - 1
        carPrecedent = ch.charAt(ptch)
        if (carPrecedent === '<') {
          retour.x = ptch - 1
          retour.y = Ope.Diff
        }
      }
      return resultat

    case '=':
      if (ptch >= pdeb) {
        ptch = resultat - 1
        carPrecedent = ch.charAt(ptch)
        switch (carPrecedent) {
          case '<':
            retour.x = ptch - 1
            retour.y = Ope.InfOuEgal
            return resultat
          case '>':
            retour.x = ptch - 1
            retour.y = Ope.SupOuEgal
            return resultat
          default:
            retour.x = ptch
            retour.y = Ope.Egalite
            return resultat
        } // switch CarPrecedent
      }
      return -1 // Ajout version 6.4.1 pour expliciter le retour par défaut

    default:
      return -1
  } // switch car
}
/**
 * Fonction renvoyant l'indice du premier caractère dans ch étant un + ou  un -
 * La recherche se fait de la fin de la chaine vers le début en sautant les parenthèses.
 * @param {string} ch  La chaîne dans laquelle se fait la recherche.
 * @param {number} pdeb  L'indice du début de la recherche dans ch.
 * @param {number} pfin  L'indice de la fin de la recherche dans ch.
 * @returns {number} : -1 si n'a pas trouvé de + ou - ou sinon l'indice du caractère.
 */
function premiereSomme (ch, pdeb, pfin) {
  let ptch
  let car
  let resultat

  ptch = pfin
  do {
    car = ch.charAt(ptch)
    resultat = ptch
    if (car === ')') ptch = CCbGlob.parentheseOuvrante(ch, pdeb, ptch)
    ptch--
  } while ((ptch >= pdeb) && (car !== '+') && (car !== '-'))
  if ((car === '+') || (car === '-')) { return resultat } else { return -1 }
}
/**
 * Fonction renvoyant l'indice du premier caractère qui soit un * ou un / dans la chaîne ch.
 * La recherche se fait de la fin de la chaine vers le début en sautant les parenthèses.
 * @param {string} ch  La chaîne dans laquelle se fait la recherche.
 * @param {number} pdeb  L'indice du début de recherche dans ch.
 * @param {number} pfin  L'indice de la fin de recherche dans ch.
 * @returns {number} : -1 si aucun * ou / n'a été trouvé, sinon l'indice de premier carcatère trouvé.
 */
function premierProduit (ch, pdeb, pfin) {
  let ptch
  let car
  let resultat

  ptch = pfin
  do {
    car = ch.charAt(ptch)
    resultat = ptch
    if (car === ')') { ptch = CCbGlob.parentheseOuvrante(ch, pdeb, ptch) }
    ptch--
  } while ((ptch >= pdeb) && (car !== '*') && (car !== '/'))
  if ((car === '*') || (car === '/')) { return resultat } else { return -1 }
}
/**
 * Fonction renvoyantl'indice du premier signe ^ou ² renontré dans la chaîne ch.
 * La recherche se fait de la fin de la chaine vers le début en sautant les parenthèses.
 * @param {string} ch  La chaîne dans laquelle se fait la recherche.
 * @param {number} pdeb  L'indice du début de la recherche dans ch.
 * @param {number} pfin  L'indice de la fin de la recherche dans ch.
 * @returns {number} : -1 si n'a pas trouvé de ^ou  de ², sinon l'indice du caractère.
 */
function premierePuissance (ch, pdeb, pfin) {
  let ptch
  let car
  let resultat

  ptch = pfin
  do {
    car = ch.charAt(ptch)
    resultat = ptch
    if (car === ')') ptch = CCbGlob.parentheseOuvrante(ch, pdeb, ptch)
    ptch--
  } while ((ptch >= pdeb) && (car !== '^') && (car !== '²'))
  if ((car === '^') || (car === '²')) { return resultat } else { return -1 }
}
/**
 * Fonction renvoyant l'indice de la première virgule suivant une parenthèse
 * ouvrante dan la chaîne chaine.
 * Avant appel pDebut pointe sur le caractère suivant la parenthèse ouvrante.
 * @param {string} chaine  La chaîne dans laquelle se fait la recherche.
 * @param {number} pDebut  L'indice de début de la recherche.
 * @returns {number} : chaine.length si pas de virgule trouvée, sinon l'indice de la première virgule.
 */
function premiereVirgule (chaine, pDebut) {
  let car
  let somme = 1
  let i
  for (i = pDebut; i < chaine.length; i++) {
    car = chaine.charAt(i)
    if (car === '(') { somme++ } else if (car === ')') { somme-- } else if ((car === ',') && (somme === 1)) { return i }
  }
  return i // Pour satisfaire le compilateur mais on ne doit pas arriver ici
}
/**
 * Fonction élevant un nombre à la puissance n sans utiiser d'exponentielle
 * mais avec un algorithme optimisé n'utilisant que des multiplications.
 * @param {number} c1  L'opérande
 * @param {number} exposant  l'exposant (compris entre 1 et 255)
 * @returns {number} : Le résultat.
 */
function puisExpEnt (c1, exposant) {
  let tampon = c1
  let res = 1
  // Version n'utilisant que des décalages de bits pour optimisation
  let b = 128
  let indfin = 7
  while ((b & exposant) === 0) {
    indfin--
    b = b >> 1
  }
  for (let i = 0; i <= indfin; i++) {
    if ((exposant % 2) !== 0) {
      res = res * tampon
    }
    exposant >>= 1
    tampon = tampon * tampon
  }
  return res
}
/**
 * Fonction calculant le sinus de x en se ramenant à un opérande compris entre 0 et 2pi
 * pour une meilleure précision.
 * @param {number} x
 * @returns {number} : Le résultat.
 */
function sinus (x) {
  return Math.sin(x - Math.floor(x / (2 * Math.PI)) * 2 * Math.PI)
}
/**
 * Fonction calculant le cosinus de x en se ramenant à un opérande compris entre 0 et 2pi
 * pour une meilleure précision.
 * @param {number} x
 * @returns {number} : Le résultat.
 */
function cosinus (x) {
  return Math.cos(x - Math.floor(x / (2 * Math.PI)) * 2 * Math.PI)
}
/**
 * Fonction calculant la tangente de x en se ramenant à un opérande compris entre 0 et 2pi
 * pour une meilleure précision.
 * @param {number} x
 * @returns {number} : Le résultat.
 */
function tangente (x) {
  return Math.tan(x - Math.floor(x / (2 * Math.PI)) * 2 * Math.PI)
}
/**
 * Calcul d'une intégrale par la méthode de Simpson.
 * @param {CCb} f  un Ccb représentant une fonction de n variables, la
 * dernière étant la variable d'intégration.
 * @param {string[]} va  un tableau représentant les paramètres passés à la fonction
 * (le dernier sera en fait affecté dans la fonction).
 * @param {number} a  la borne inférieure d'intégration.
 * @param {number} b  la borne supérieure d'intégration.
 * @param {boolean} infoRandom  true si les caclusl aléatoires avec rand
 * doivent être réactualisés.
 * @returns {number} : Le résultat arrpoché de l'intégrale.
 */
function integrale (f, va, a, b, infoRandom) {
  let s1, s2
  let t1, t2
  const n = va.length
  let k
  if (a === b) return 0
  const nb = CCbGlob.nombreSubdivisionsPourSimpson // Le nombre de subdivisions
  const pas = (b - a) / nb
  // s = f.resultatFonction(infoRandom, a) + f.resultatFonction(infoRandom, b)
  va[n - 1] = a
  const ima = f.resultatFonction(infoRandom, va)
  va[n - 1] = b
  const s = ima + f.resultatFonction(infoRandom, va)
  t1 = a
  t2 = a - pas / 2
  s1 = 0
  s2 = 0
  for (k = 1; k < nb; k++) {
    t1 = t1 + pas
    va[n - 1] = t1
    s1 = s1 + f.resultatFonction(infoRandom, va)
  }
  for (k = 1; k <= nb; k++) {
    t2 = t2 + pas
    va[n - 1] = t2
    s2 = s2 + f.resultatFonction(infoRandom, va)
  }
  return (b - a) * (s + 2 * s1 + 4 * s2) / (6 * nb)
}
/**
 * Fonction recherchant si la chaîne ch commence par le nom d'une fonction réelle
 * prédéfinie.
 * Si oui, renvoie la longeur du nom de la fonction,  résultat.getValeur() renvoie l'indice
 * du nom de la fonction dans le tableau définissant les noms de fonctions et
 * combreVariables.getValeur() renvoie le nombre de variabels de la fonction.
 * @param {string} ch  La chaîne à analyser.
 * @param {Pointeur} resultat getValue() L'indice du nom de la fonction si un nom a été trouvé
 * sinon 0.
 * @param {Pointeur} nombreVariables  Le nombre de variables de la fonction si une fonction a été trouvée.
 * @returns {number} : La longueur du nom de la fonction si une fonction a été trouvée.
 */
function commenceParNomFonctionReellePredefinie (ch, resultat, nombreVariables) {
  // Fonction optimisée version 7.0 en utilisant une regexp
  // On regarde d'abord si ch commence bien par des caractères alphanumériques suivis d'une parenthèse ouvrante
  const chunks = /(^[a-z]+)\(/.exec(ch.toLowerCase())
  if (!chunks) return 0
  const deb = chunks[1] // Contient ce qui a été capturé par l'expression régulière (les caractères alpha sans la parenthèse)
  let i
  for (i = 0; i < Opef.nomsFoncs.length; i++) {
    const st = Opef.nomsFonctions(i).toLowerCase()
    if (deb === st) {
      nombreVariables.setValue(1) // Nombre de variables de la fonction
      resultat.setValue(i) // Indice de la fonction
      return st.length
    }
  }
  for (i = 0; i < Opef2v.nomsFoncs2Var.length; i++) {
    const st = Opef2v.nomsFonctions2Var(i).toLowerCase()
    if (deb === st) {
      nombreVariables.setValue(2)
      resultat.setValue(i)
      return st.length
    }
  }
  for (i = 0; i < Opef3v.nomsFoncs3Var.length; i++) {
    const st = Opef3v.nomsFonctions3Var(i).toLowerCase()
    if (deb === st) {
      nombreVariables.setValue(3)
      resultat.setValue(i)
      return st.length
    }
  }
  for (i = 0; i < Opef4v.nomsFoncs4Var.length; i++) {
    const st = Opef4v.nomsFonctions4Var(i).toLowerCase()
    if (deb === st) {
      nombreVariables.setValue(4)
      resultat.setValue(i)
      return st.length
    }
  }
  for (i = 0; i < Opef5v.nomsFoncs5Var.length; i++) {
    const st = Opef5v.nomsFonctions5Var(i).toLowerCase()
    if (deb === st) {
      nombreVariables.setValue(5)
      resultat.setValue(i)
      return st.length
    }
  }
  return 0
}
/**
 * Fonction recherchant si la chaîne ch commence par le nom d'une fonction complexe
 * prédéfinie.
 * Si oui, renvoie la longeur du nom de la fonction,  résultat.getValeur() renvoie l'indice
 * du nom de la fonction dans le tableau définissant les noms de fonctions et
 * combreVariables.getValeur() renvoie le nombre de variabels de la fonction.
 * @param {string} ch  La chaîne à analyser.
 * @param {Pointeur} resultat  La longueur du nom de la fonction si un nom a été trouvé
 * sinon 0.
 * @param {Pointeur} nombreVariables  Le nombre de vraiables de la fonction si une fonction a été trouvée.
 * @returns {number} : La longueur du nom de la fonction si une fonction a été trouvée.
 */
function commenceParNomFonctionComplexePredefinie (ch, resultat, nombreVariables) {
  // Fonction optimisée version 7.0 en utilisant une regexp
  // On regarde d'abord si ch commence bien par des caractères alphanumériques suivis d'une parenthèse ouvrante
  const chunks = /(^[a-z]+)\(/.exec(ch.toLowerCase())
  if (!chunks) return 0
  const deb = chunks[1] // Contient ce qui a été capturé par l'expression régulière (les caractères alpha sans la parenthèse)
  let i
  for (i = 0; i < Opef.nomsFoncsComplexes.length; i++) {
    const st = Opef.nomsFonctionsComplexes(i).toLowerCase()
    if (deb === st) {
      nombreVariables.setValue(1)
      resultat.setValue(i + Opef.indPremiereFoncComplexe)
      return st.length
    }
  }
  for (i = 0; i < Opef2v.nomsFoncsComplexes2Var.length; i++) {
    const st = Opef2v.nomsFonctionsComplexes2Var(i).toLowerCase()
    if (deb === st) {
      nombreVariables.setValue(2)
      resultat.setValue(i + Opef2v.indicePremiereFonctionComplexe)
      return st.length
    }
  }
  for (i = 0; i < Opef3v.nomsFoncsComplexes3Var.length; i++) {
    const st = Opef3v.nomsFonctionsComplexes3Var(i).toLowerCase()
    if (deb === st) {
      nombreVariables.setValue(3)
      resultat.setValue(i + Opef3v.indicePremiereFonctionComplexe)
      return st.length
    }
  }
  for (i = 0; i < Opef4v.nomsFoncsComplexes4Var.length; i++) {
    const st = Opef4v.nomsFonctionsComplexes4Var(i).toLowerCase()
    if (deb === st) {
      nombreVariables.setValue(4)
      resultat.setValue(i + Opef4v.indicePremiereFonctionComplexe)
      return st.length
    }
  }
  for (i = 0; i < Opef5v.nomsFoncsComplexes5Var.length; i++) {
    const st = Opef5v.nomsFonctionsComplexes5Var(i).toLowerCase()
    if (deb === st) {
      nombreVariables.setValue(5)
      resultat.setValue(i + Opef5v.indicePremiereFonctionComplexe)
      return st.length
    }
  }
  return 0
}
/**
 * Fonction renvoyant true si chaine est le nom d'une fonction réelle ou
 * complexe prédéfinie
 * @param {string} chaine
 * @returns {boolean}
 */
function egalNomFonctionReelleOuComplexePredefinie (chaine) {
  const set = tabNomsFoncPred()
  return set.has(chaine)
}
/**
 * Fonction renvoyant true si la chaine ch commence par le nom d'une fonction
 * prédéfinie (réelle ou complexe) suivi d'une parenthèse.
 * Si oui, longNom.getValue() renvoie la longueur du nom.
 * La recherche commence à l'indice indstart
 * @param {string} pChaine  La chaîne dans laquelle se fait la recherche.
 * @param {number} indstart
 * @param {Pointeur} longNom
 * @returns {boolean}
 */
function commenceParNomFonctionPredefinieSuivieParOuvr (pChaine, indstart, longNom) {
  const set = tabNomsFoncPred()
  const ch = pChaine.substring(indstart).toLowerCase()
  // On regarde d'abord si ch commence bien par des caractères alphanumériques suivis d'une parenthèse ouvrante
  const chunks = /(^[a-z]+)\(/.exec(ch)
  if (!chunks) return false
  const deb = chunks[1] // Contient ce qui a été capturé par l'expression régulière (les caractères alpha sans la parenthèse)
  if (!set.has(deb)) return false
  longNom.setValue(deb.length)
  return true
}

const CCbGlob = {
  nombreMaxiIterations: 200000, // Nombre maxi d'itérations total dans les boucles
  nombreMaxObj: 250000, // Nombre maxi d'objets qu'on peut créer pour les impémentations de constructions récursives et itératives
  nombreSubdivisionsPourSimpson: 200, // Pour calcul intégrale par Simpson
  nombreMaxParentheses: 64, // Nombre maxi de parenthèses imbriquées
  // Constantes définissant les opérations de base
  Nombre: 0,
  Addition: 1,
  Multiplication: 2,
  Puissance: 3,
  Fonction: 4,
  Valeur: 5,
  ParOuvrante: 6,
  ParFermante: 7,
  // CCb.Inferieur = 8; // Inutile
  Inegalite: 9,
  Blanc: 10,
  Carre: 11,
  Virgule: 12,
  // Constantes ajoutées version 4.6 pour éviter des appels à getClass
  // Ces constantes définissent mes natures des objets de type CCb
  natAppelFonction: 1,
  natAppelFonctionInterne: 1 << 1,
  natAppelFonctionInterneNVar: 1 << 2,
  natAppelFonctionNVar: 1 << 3,
  natConstante: 1 << 4,
  natConstantei: 1 << 5,
  natFonction: 1 << 6,
  natFonction2Var: 1 << 7,
  natFonction3Var: 1 << 8,
  natIntegraleDansFormule: 1 << 9,
  natMoinsUnaire: 1 << 10,
  natOperation: 1 << 11,
  // natPointeurFonction  :  1 << 12, Supprimé version mtgApp. Inutile
  natPuissance: 1 << 13,
  natResultatValeur: 1 << 14,
  natResultatValeurComplexe: 1 << 15,
  natSommeDansFormule: 1 << 16,
  natProduitDansFormule: 1 << 17,
  natVariableFormelle: 1 << 18,
  natPrimitive: 1 << 19,
  natMat: 1 << 19, // Ajout version 4.7 : matrice réelle
  natTermMat: 1 << 21, // Ajout version 4.7 : Terme d'une matrice réelle
  parentheseOuvrante,
  parentheseFermante,
  parentheseFermanteApresVirgule,
  indiceCaractereVirgule,
  premierOperateurLogique,
  NombreVirgules,
  autorisationSyntaxe,
  premiereInegalite,
  premiereSomme,
  premierProduit,
  premierePuissance,
  premiereVirgule,
  puisExpEnt,
  sinus,
  cosinus,
  tangente,
  integrale,
  commenceParNomFonctionReellePredefinie,
  commenceParNomFonctionComplexePredefinie,
  egalNomFonctionReelleOuComplexePredefinie,
  commenceParNomFonctionPredefinieSuivieParOuvr
}

export default CCbGlob
