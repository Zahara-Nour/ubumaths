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

import CCbGlob from './CCbGlob'
import Pointeur from '../types/Pointeur'
import Ope from '../types/Ope'
import Opef from '../types/Opef'
import Opef3v from '../types/Opef3v'
import Opef4v from '../types/Opef4v'
import Opef5v from '../types/Opef5v'
import Fonte from '../types/Fonte'
import NatCal from '../types/NatCal'
import { ConvDegRad, ConvRadDeg, uniteAngleRadian } from '../kernel/kernel'
import CAppelFonction from '../objets/CAppelFonctionBase'
import CAppelFonctionNVar from '../objets/CAppelFonctionNVar'
import CTermMat from '../objets/CTermMat'
import CConstante from '../objets/CConstanteBase'
import CFonction from '../objets/CFonction'
import CFonction2Var from '../objets/CFonction2Var'
import CFonction3Var from '../objets/CFonction3Var'
import CIntegraleDansFormule from '../objets/CIntegraleDansFormule'
import CPrimitive from '../objets/CPrimitive'
import CMoinsUnaire from '../objets/CMoinsUnaire'
import CVariableFormelle from '../objets/CVariableFormelle'
import CSommeDansFormule from '../objets/CSommeDansFormule'
import CResultatValeur from '../objets/CResultatValeur'
import COp from '../objets/COperationBase'
import CProduitDansFormule from '../objets/CProduitDansFormule'
import CPuissance from '../objets/CPuissance'
import CCbNull from '../objets/CCbNull'
import CAppelFonctionInterne from '../objets/CAppelFonctionInterne'
import CAppelFonctionInterneNVar from 'src/objets/CAppelFonctionInterneNVar'
import CFonctionMat from 'src/objets/CFonctionMat'
import { getLeft, getRight } from 'src/objets/CCb'

/**
 * Fonction statique récursive créant un arbre binaire de calcul à partir de la chaîne
 * de caractères ch représentant le calcul, la chaîne étant interprétée de pdebut à pfin.
 * nomsVariablesFormelles est un array dont les éléments représentent les noms éventuels des variables
 * formelles quand le calcul évalué représente une fonction.
 * Le calcul renvoie un résultat réel.
 * Fonction appelée creeCalculBase dans la version Java.
 * @param {string} ch  La chaîne décrivant le  calcul.
 * @param {CListeObjets} ptListe  La liste propriétaire du calcul à créer.
 * @param {number} pdebut  L'indice du début de l'interprétationde la chaîne
 * @param {number} pfin  : L'indice de la fin de l'interprétationde la chaîne
 * @param {string[]|null} nomsVariablesFormelles  Un tableau donnant les noms des variables
 * formelles dans le cas où le calcul est utilisé à l'intérieur d'une focntion de
 * une ou plusieurs variables.
 * @param {CListeObjets} listeSource  La liste source des objets utilisables (ne diffère de ptListe que pour les exercices de construction)
 * @returns {CCb}
 */
function ccb (ch, ptListe, pdebut, pfin, nomsVariablesFormelles, listeSource) {
  if (arguments.length <= 5) listeSource = ptListe
  try {
    // Version 7.0 : On autorise un calcul réel du type deter(A) ou nbRow(A) ou nbCol(A) où A est le nom d'une matrice

    // On regarde d'abord si c'est plausible avec une regex générique avant de faire le traitement (car c'est rarement utile)
    // (Attention à revoir cette regex si un nom de fonction pouvait contenir autre chose que des lettres/chiffres/underscore,
    // donc pas d'accent, c'est mis en remarque dans les fichiers de traduction)

    // on cherche :
    // ^ début de la chaîne
    // (deter|nbrow|nbcol) on capture deter ou nbrow ou nbcol (sera dans chunks[1])
    // \( suivi d'une parenthèse ouvrante (antislash car c'est pas une capture)
    // [^() */+-]+ suivi d'une capture d'un ou plusieurs caractères, tous sauf () ou opération ou espace, (sera dans chunks[2])
    // \) suivi d'une parenthèse fermante
    // $ fin de la chaine
    const chunks = /^(deter|nbrow|nbcol)\(([^() */+-]+)\)$/.exec(ch)
    if (chunks) {
      // c'est un calcul matriciel, reste à vérifier le nom de la matrice
      // cf https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
      // on récupère chunks[1] dans nomFn et chunks[2] dans nomMat
      const [, nomFn, nomMat] = chunks
      const mat = ptListe.pointeurMat(nomMat)
      if (mat) {
        // mat est bien le nom d'une matrice
        const idOpef = nomFn === 'deter'
          ? Opef.Deter
          : nomFn === 'nbrow'
            ? Opef.Nbrow
            : Opef.Nbcol
        return new CFonctionMat(ptListe, idOpef, new CResultatValeur(ptListe, mat))
      }
      // else c'était bien une fct de matrice mais avec un nom qui n'existe pas, on laisse la suite du traitement gérer ça
    }

    // si on est toujours là, c'était pas un calcul matriciel (ou pas un nom de matrice connu)

    // Spécial JavaScript car pas d'erreur levée par charAt si pdebut > pFin
    if (pdebut > pfin) throw new Error('Bornes invalides')
    // Contiendra dans x l'indice du caractère précédent et dans y l'opérateur trouvé
    const info = { x: 0, y: 0 }
    const nomF = new Pointeur(null)
    let ptr, car, op, indicePremiereVirg, operande1, operande2, indiceParF, indiceDeuxiemeVirg
    let indiceTroisiemeVirg, nomVariableSommation, nomVariableFormelle2
    const ptVa = new Pointeur(null)
    const parametreTrouve = new Pointeur(0)
    const nombreVar = new Pointeur(0)
    // On élimine les blancs de début
    car = ch.charAt(pdebut)
    while ((car === ' ') && (pdebut < pfin)) {
      pdebut++
      car = ch.charAt(pdebut)
    }
    // Puis de fin
    car = ch.charAt(pfin)
    while ((car === ' ') && (pdebut < pfin)) {
      pfin--
      car = ch.charAt(pfin)
    }
    // On recherche d'abord les opérateurs de ou logique
    ptr = CCbGlob.premierOperateurLogique('|', ch, pdebut, pfin, info)
    if (ptr !== -1) {
      return new COp(
        ptListe,
        CalcR.ccb(ch, ptListe, pdebut, info.x, nomsVariablesFormelles, listeSource),
        CalcR.ccb(ch, ptListe, ptr + 1, pfin, nomsVariablesFormelles, listeSource),
        info.y
      )
    }
    // On recherche ensuite les opérateurs de et logique
    ptr = CCbGlob.premierOperateurLogique('&', ch, pdebut, pfin, info)
    if (ptr !== -1) {
      return new COp(
        ptListe,
        CalcR.ccb(ch, ptListe, pdebut, info.x, nomsVariablesFormelles, listeSource),
        CalcR.ccb(ch, ptListe, ptr + 1, pfin, nomsVariablesFormelles, listeSource),
        info.y
      )
    }

    // On recherche d'abord les opérateurs d'inégalités
    ptr = CCbGlob.premiereInegalite(ch, pdebut, pfin, info)
    if (ptr !== -1) {
      return new COp(
        ptListe,
        CalcR.ccb(ch, ptListe, pdebut, info.x, nomsVariablesFormelles, listeSource),
        CalcR.ccb(ch, ptListe, ptr + 1, pfin, nomsVariablesFormelles, listeSource),
        info.y
      )
    }

    // On recherche ensuite les operateurs d'addition ou soustraction
    ptr = CCbGlob.premiereSomme(ch, pdebut, pfin)
    if (ptr !== -1) {
      // On regarde d'abord si la chaine commence par un signe - ou
      // un signe +
      car = ch.charAt(ptr)
      if (car === '+') { op = Ope.Plus } else { op = Ope.Moin }
      if (ptr === pdebut) {
        car = ch.charAt(ptr)
        if (car === '+') {
          return CalcR.ccb(ch, ptListe, pdebut + 1, pfin, nomsVariablesFormelles, listeSource)
        }
        return new CMoinsUnaire(ptListe, CalcR.ccb(ch, ptListe, pdebut + 1, pfin, nomsVariablesFormelles, listeSource))
      }
      return new COp(
        ptListe,
        CalcR.ccb(ch, ptListe, pdebut, ptr - 1, nomsVariablesFormelles, listeSource),
        CalcR.ccb(ch, ptListe, ptr + 1, pfin, nomsVariablesFormelles, listeSource),
        op
      )
    }

    // if (ptr !== NULL)
    ptr = CCbGlob.premierProduit(ch, pdebut, pfin)
    if (ptr !== -1) {
      car = ch.charAt(ptr)
      if (car === '*') { op = Ope.Mult } else { op = Ope.Divi }
      return new COp(
        ptListe,
        CalcR.ccb(ch, ptListe, pdebut, ptr - 1, nomsVariablesFormelles, listeSource),
        CalcR.ccb(ch, ptListe, ptr + 1, pfin, nomsVariablesFormelles, listeSource),
        op
      )
    }

    // Le calcul ne contient ni addition, ni différence, ni produit
    // ni quotient}
    // Attention : par rapport à la version C++ 1.8, autorisation
    // du symbole ² d'élévation au carré.
    ptr = CCbGlob.premierePuissance(ch, pdebut, pfin)
    if (ptr !== -1) {
      if (ch.charAt(ptr) === '²') {
        return new CPuissance(
          ptListe,
          CalcR.ccb(ch, ptListe, pdebut, ptr - 1, nomsVariablesFormelles, listeSource),
          new CConstante(ptListe, 2)
        )
      }
      return new CPuissance(
        ptListe,
        CalcR.ccb(ch, ptListe, pdebut, ptr - 1, nomsVariablesFormelles, listeSource),
        CalcR.ccb(ch, ptListe, ptr + 1, pfin, nomsVariablesFormelles, listeSource)
      )
    }

    // On regarde si la chaine commence par le nom d'une fonction
    // ou d'une valeur déjà définie
    const longNom = listeSource.commenceParNomFonctionOuValeurOuParametre(ch.substring(pdebut), nomsVariablesFormelles, ptVa, nomF, parametreTrouve, nombreVar)
    if (longNom > 0) {
      if (parametreTrouve.getValue() !== -1) {
        return new CVariableFormelle(ptListe, parametreTrouve.getValue())
      }
      if (ptVa.getValue() === null) {
        // Modification version 3.0. Il faut regarder si la fonction
        // est une fonction de plusieurs paramètres ou non
        // Ajouté version 4.7.4.1
        if (CCbGlob.parentheseFermante(ch, pdebut + longNom) === -1) throw new Error()

        if (nombreVar.getValue() === 1) {
          return new CFonction(
            ptListe,
            nomF.getValue(),
            CalcR.ccb(ch, ptListe, pdebut + longNom, pfin, nomsVariablesFormelles, listeSource)
          )
        }

        if (nombreVar.getValue() === 2) {
          indicePremiereVirg = CCbGlob.premiereVirgule(ch, pdebut + longNom + 1)
          operande1 = CalcR.ccb(ch, ptListe, pdebut + longNom + 1, indicePremiereVirg - 1, nomsVariablesFormelles, listeSource)
          indiceParF = CCbGlob.parentheseFermanteApresVirgule(ch, indicePremiereVirg + 1)
          // A revoir plus tard si on crée des fonctions de trois
          // variables ou plus
          operande2 = CalcR.ccb(ch, ptListe, indicePremiereVirg + 1, indiceParF - 1, nomsVariablesFormelles, listeSource)
          return new CFonction2Var(ptListe, nomF.getValue(), operande1, operande2)
        }
        if (nombreVar.getValue() === 3) { // 3 variables
          indicePremiereVirg = CCbGlob.premiereVirgule(ch, pdebut + longNom + 1)
          operande1 = CalcR.ccb(ch, ptListe, pdebut + longNom + 1, indicePremiereVirg - 1, nomsVariablesFormelles, listeSource)
          indiceDeuxiemeVirg = CCbGlob.premiereVirgule(ch, indicePremiereVirg + 1)
          operande2 = CalcR.ccb(ch, ptListe, indicePremiereVirg + 1, indiceDeuxiemeVirg - 1, nomsVariablesFormelles, listeSource)
          indiceParF = CCbGlob.parentheseFermanteApresVirgule(ch, indiceDeuxiemeVirg + 1)
          // A revoir plus tard si on crée des fonctions de trois
          // variables ou plus
          const operande3 = CalcR.ccb(
            ch,
            ptListe,
            indiceDeuxiemeVirg + 1,
            indiceParF - 1,
            nomsVariablesFormelles,
            listeSource
          )
          return new CFonction3Var(ptListe, nomF.getValue(), operande1, operande2, operande3)
        }
        if (nombreVar.getValue() === 4) {
          // Seules fonctions à 4 variables : Cas d'une intégrale ou calcul de primitive prise entre deux bornes
          indicePremiereVirg = CCbGlob.premiereVirgule(ch, pdebut + longNom + 1)
          indiceDeuxiemeVirg = CCbGlob.premiereVirgule(ch, indicePremiereVirg + 1)
          indiceTroisiemeVirg = CCbGlob.premiereVirgule(ch, indiceDeuxiemeVirg + 1)
          indiceParF = CCbGlob.parentheseFermanteApresVirgule(ch, indiceTroisiemeVirg + 1)
          nomVariableSommation = ch.substring(indicePremiereVirg + 1, indiceDeuxiemeVirg)
          nomVariableSommation = nomVariableSommation.trim()
          const n = nomsVariablesFormelles?.length ?? 0
          // String[] nomVariableFormelle2 = new String[n + 1];
          nomVariableFormelle2 = new Array(n + 1)
          // Code nettoyé version mtgApp
          for (let j = 0; j < n; j++) nomVariableFormelle2[j] = nomsVariablesFormelles[j]
          // nomVariableFormelle2[n+1] = new String(nomVariableSommation);
          nomVariableFormelle2[n] = nomVariableSommation
          const Classef4var = (nomF.getValue() === Opef4v.integrale) ? CIntegraleDansFormule : CPrimitive
          return new Classef4var(
            ptListe,
            CalcR.ccb(ch, ptListe, pdebut + longNom + 1, indicePremiereVirg - 1, nomVariableFormelle2, listeSource),
            CalcR.ccb(ch, ptListe, indiceDeuxiemeVirg + 1, indiceTroisiemeVirg - 1, nomsVariablesFormelles, listeSource),
            CalcR.ccb(ch, ptListe, indiceTroisiemeVirg + 1, indiceParF - 1, nomsVariablesFormelles, listeSource),
            nomVariableSommation,
            false
          )
        }

        // fonctions à 5 variables : la somme indicée et
        // produit indicé
        indicePremiereVirg = CCbGlob.premiereVirgule(ch, pdebut + longNom + 1)
        indiceDeuxiemeVirg = CCbGlob.premiereVirgule(ch, indicePremiereVirg + 1)
        indiceTroisiemeVirg = CCbGlob.premiereVirgule(ch, indiceDeuxiemeVirg + 1)
        const indiceQuatriemeVirg = CCbGlob.premiereVirgule(ch, indiceTroisiemeVirg + 1)
        indiceParF = CCbGlob.parentheseFermanteApresVirgule(ch, indiceQuatriemeVirg + 1)
        nomVariableSommation = ch.substring(indicePremiereVirg + 1, indiceDeuxiemeVirg)
        nomVariableSommation = nomVariableSommation.trim()
        const n = nomsVariablesFormelles?.length ?? 0
        // String[] nomVariableFormelle2 = new String[n + 1];
        nomVariableFormelle2 = new Array(n + 1)
        for (let j = 0; j < n; j++) {
          nomVariableFormelle2[j] = nomsVariablesFormelles[j]
        }
        nomVariableFormelle2[n] = nomVariableSommation
        if (nomF.getValue() === Opef5v.somme) {
          return new CSommeDansFormule(
            ptListe,
            CalcR.ccb(ch, ptListe, pdebut + longNom + 1, indicePremiereVirg - 1, nomVariableFormelle2, listeSource),
            CalcR.ccb(ch, ptListe, indiceDeuxiemeVirg + 1, indiceTroisiemeVirg - 1, nomVariableFormelle2, listeSource),
            CalcR.ccb(ch, ptListe, indiceTroisiemeVirg + 1, indiceQuatriemeVirg - 1, nomVariableFormelle2, listeSource),
            CalcR.ccb(ch, ptListe, indiceQuatriemeVirg + 1, indiceParF - 1, nomVariableFormelle2, listeSource),
            nomVariableSommation
          )
        }
        return new CProduitDansFormule(
          ptListe,
          CalcR.ccb(ch, ptListe, pdebut + longNom + 1, indicePremiereVirg - 1, nomVariableFormelle2, listeSource),
          CalcR.ccb(ch, ptListe, indiceDeuxiemeVirg + 1, indiceTroisiemeVirg - 1, nomVariableFormelle2, listeSource),
          CalcR.ccb(ch, ptListe, indiceTroisiemeVirg + 1, indiceQuatriemeVirg - 1, nomVariableFormelle2, listeSource),
          CalcR.ccb(ch, ptListe, indiceQuatriemeVirg + 1, indiceParF - 1, nomVariableFormelle2, listeSource),
          nomVariableSommation
        )
      }
      if (ptVa.getValue().estFonctionOuSuite()) {
        // Ajouté version 4.7.4.1
        if (CCbGlob.parentheseFermante(ch, pdebut + longNom) === -1) throw new Error()
        const calc = ptVa.getValue()
        const nbvar = calc.nombreVariables()
        if (nbvar === 1) {
          return new CAppelFonction(
            ptListe,
            ptVa.getValue(),
            CalcR.ccb(ch, ptListe, pdebut + longNom, pfin, nomsVariablesFormelles, listeSource)
          )
        }
        // Ccb[] tabcal = new Ccb[nbvar];
        const tabcal = new Array(nbvar)
        let deb = pdebut + longNom
        let fin = 0
        for (let i = 0; i < nbvar - 1; i++) {
          fin = CCbGlob.premiereVirgule(ch, deb + 1)
          tabcal[i] = CalcR.ccb(ch, ptListe, deb + 1, fin - 1, nomsVariablesFormelles, listeSource)
          deb = fin
        }
        deb++
        fin = CCbGlob.parentheseFermanteApresVirgule(ch, deb)
        tabcal[nbvar - 1] = CalcR.ccb(ch, ptListe, deb,
          fin - 1, nomsVariablesFormelles, listeSource)
        return new CAppelFonctionNVar(ptListe, nbvar, ptVa.getValue(), tabcal)
      }
      if (ptVa.getValue().estMatrice() && ch.charAt(pdebut + longNom) === '(') {
        const tabcal = new Array(2)
        let deb = pdebut + longNom
        let fin = CCbGlob.premiereVirgule(ch, deb + 1)
        tabcal[0] = CalcR.ccb(ch, ptListe, deb + 1, fin - 1, nomsVariablesFormelles, listeSource)
        deb = fin + 1
        fin = CCbGlob.parentheseFermanteApresVirgule(ch, deb)
        tabcal[1] = CalcR.ccb(ch, ptListe, deb, fin - 1, nomsVariablesFormelles, listeSource)
        return new CTermMat(ptListe, tabcal[0], tabcal[1], ptVa.getValue())
      }
      return new CResultatValeur(ptListe, ptVa.getValue())
    }

    // Dans le cas où l'expression commence par une parenthèse
    // ouvrante, elle finit par une fermante et il suffit
    // d'évaluer ce que la parenthèse contient
    car = ch.charAt(pdebut)
    // Si le premier caractère est une parenthèse ouvrante
    // il faut faire attention car le dernier peut être
    // un espace.
    // Cela a donné un bug dans la version 16 bits
    if (car === '(') {
      if (CCbGlob.parentheseFermante(ch, pdebut) === -1) throw new Error()
      return CalcR.ccb(ch, ptListe, pdebut + 1, CCbGlob.parentheseFermante(ch, pdebut) - 1, nomsVariablesFormelles, listeSource)
    }

    // Le résultat ne peut être que numérique}
    const chaineNombre = ch.substring(pdebut, pfin + 1)
    if (chaineNombre === '') throw new Error() // Spécial JavaScript
    if (Fonte.estDecimalCorrect(chaineNombre)) {
      const f = parseFloat(chaineNombre)
      if (isNaN(f)) throw new Error()
      return new CConstante(ptListe, f)
    }

    return new CCbNull(chaineNombre)
  } catch (e) {
    // on n'affiche pas cette erreur à chaque fois, y'a plein de cas où c'est "normal" (racine ou log d'un négatif par ex)
    // Amélioration version 4.7.4.1 : Même si l'expression est incorrecte, on remplace les * de multiplication par des \times
    // Supprimé version 4.9.3
    const ch1 = ch.substring(pdebut, pfin + 1)
    // Amélioration version 4.9.3
    if ((ch1.charAt(0) === '(') && (ch1.length >= 1)) { // Cas d'une parenthèse ouvrante non fermée
      return CalcR.ccb(ch, ptListe, pdebut + 1, pfin, nomsVariablesFormelles, listeSource)
    }
    return new CCbNull(ch1)
    // return new CCbNull(stb.toString());
  }
}

/**
 * Fonction récursive vérifiant la syntaxe de l'expression réelle contenue dans ch en
 * tenant compte du fait qu'elle ne doit pas utiliser de valeur dont l'indice
 * dans ptListe est strictement supérieur à indiceMaxiDansListe.
 * Le calcul doit être réel.
 * @param {CListeObjets} ptListe  La liste propriétaire du calcul analysé
 * @param {string} ch  La chaîne dans laquelle se fait la recherche syntaxique.
 * @param {Pointeur} indiceErreur  getValeur renverra l'indice de l'erreur
 * de syntaxe dans la chapine s'il y en a une.
 * @param {number} indiceMaxiDansListe  L'indice maxi d'interprétation dans la chaîne ch.
 * @param {string[]|null} parametresFormels  Un tableau représentant les noms de la ou des variables formelles
 * d'une fonction de une ou plusieurs variables.
 * @returns {boolean} : true si la syntaxe est correcte, false sinon.
 */
function verifieSyntaxe (ptListe, ch,
  indiceErreur, indiceMaxiDansListe, parametresFormels) {
  let i
  let indiceDansListe
  let pdebut
  let car, carSuivant
  let erreur
  let itemPrecedent
  let itemSuivant = 0
  let pointDecimalRencontre
  let sommeParentheses
  let longNom
  const nomF = new Pointeur()
  const ptVa = new Pointeur()
  let queDesBlancs
  const parametreTrouve = new Pointeur(0)
  const nombreVariables = new Pointeur(0)
  let nivPar = 0 // Niveau de parenthèses
  const appelFonction = new Array(CCbGlob.nombreMaxParentheses + 1) // Tableau de booléens 64 niveaux de parenthèses imbriqués maxi
  for (let j = 0; j <= CCbGlob.nombreMaxParentheses; j++) appelFonction[j] = false
  erreur = false
  const longueurCh = ch.length
  // On vérifie d'abord qu'il n'y a pas d'erreur de parenthèse
  if (longueurCh === 0) {
    indiceErreur.setValue(0)
    return false
  }
  i = 0
  sommeParentheses = 0
  while ((i < longueurCh) && (sommeParentheses >= 0)) {
    car = ch.charAt(i)
    switch (car) {
      case '(':
        sommeParentheses++
        break
      case ')':
        sommeParentheses--
    } // switch
    i++
  }
  if (sommeParentheses !== 0) {
    indiceErreur.setValue(i)
    return false
  }
  if (ch === '.') {
    indiceErreur.setValue(0)
    return false
  }
  // Version 7.0 : On autorise un calcul réel du type detr(A) ou nbRow(A) ou nbCol(A)
  // où A est le nom d'une matrice
  const nomsFoncMat = ['deter', 'nbrow', 'nbcol']
  let res = false
  nomsFoncMat.some(function (st) {
    if (ch.startsWith(st) && ch.endsWith(')')) {
      const arg = ch.substring(st.length + 1, ch.length - 1)
      // On regarde si arg est le nom d'une matrice
      if (ptListe.pointeurMat(arg)) {
        res = true
        return true
      } else return false
    } else return false
  })
  if (res) return true
  i = 0
  // Tout se passe au début comme si l'expression était précédée
  // d'une parenthèse ouvrante
  itemPrecedent = CCbGlob.ParOuvrante
  while ((i < longueurCh) && !erreur) {
    car = ch.charAt(i)
    pointDecimalRencontre = false
    if (Fonte.chiffre(car) || (car === '.')) {
      while ((Fonte.chiffre(car) || (car === '.')) && (i < longueurCh) &&
      !erreur) {
        if (car === '.') {
          if (pointDecimalRencontre) {
            erreur = true
            indiceErreur.setValue(i - 1)
            // IndiceMessageErreur = IDE_SYNTAXE1;
          } else { pointDecimalRencontre = true }
        }
        i++
        if (i < longueurCh) { car = ch.charAt(i) }
      } // while
      if (!erreur) { itemSuivant = CCbGlob.Nombre }
    } else {
      // cas où le caractère en cours n'est pas un nombre
      // le caractère en cours n'est pas un chiffre ou un point décimal}
      pdebut = i
      // On regarde si cela commence par le nom d'une fonction ou
      // une valeur déjà définie
      longNom = ptListe.commenceParNomFonctionOuValeurOuParametre(
        ch.substring(pdebut), parametresFormels, ptVa, nomF, parametreTrouve, nombreVariables)
      if (longNom > 0) {
        if (parametreTrouve.getValue() !== -1) {
          itemSuivant = CCbGlob.Valeur
          i = i + longNom
        } else {
          appelFonction[nivPar + 1] = true
          if (ptVa.getValue() === null) {
            if (((i + longNom) < ch.length) &&
              ch.charAt(i + longNom) !== '(') {
              erreur = true
              indiceErreur.setValue(i + longNom)
            } else {
              itemSuivant = CCbGlob.Fonction
              // Ajout version 4.5.2 pour corriger un bug
              if (!CCbGlob.autorisationSyntaxe(itemPrecedent, itemSuivant)) {
                erreur = true
                indiceErreur.setValue(i)
                break
              }
              // Fin ajout
              // Il faut regarder si la fonction est de plusieurs variables
              const nvirg = CCbGlob.NombreVirgules(ch, i + longNom + 1)
              if (nvirg !== nombreVariables.getValue() - 1) {
                if (nvirg <= nombreVariables.getValue() - 1) {
                  indiceErreur.setValue(CCbGlob.indiceCaractereVirgule(ch, i +
                    longNom + 1, nvirg))
                } else {
                  indiceErreur.setValue(CCbGlob.indiceCaractereVirgule(ch, i +
                    longNom + 1, nombreVariables.getValue() - 1) - 1)
                }
                erreur = true
              } else {
                // Si le nombre de variables est supérieur ou égal à 4, il
                // s'agit soit d'un calcul d'intégrale
                // soit d'une somme indicée pour laquelle la syntaxe est la
                // même
                if (nombreVariables.getValue() >= 4) {
                  nivPar++
                  const indicePremVirg = CCbGlob.premiereVirgule(ch, i + longNom + 1)
                  const chformuleASommer = ch.substring(i + longNom + 1, indicePremVirg)
                  const indiceDeuxiemeVirg = CCbGlob.premiereVirgule(ch, indicePremVirg + 1)
                  let nomVariableSommation = ch.substring(indicePremVirg + 1, indiceDeuxiemeVirg)
                  // Il faut retirer les espaces de début et de fin
                  // On vérifie si le nom de variable formelle pour la somme est valable
                  nomVariableSommation = nomVariableSommation.trim()
                  if (!ptListe
                  // Ci-dessous paramètre bAccepNamei à true on accepte i comme variable de sommation
                    .validationNomCalculSansMessage(nomVariableSommation, true) ||
                    ptListe.egalNomValeurOuFonctionOuMesure(nomVariableSommation, -1)) {
                    erreur = true
                    indiceErreur.setValue(indiceDeuxiemeVirg)
                  } else {
                    // On vérifie si la syntaxe du calcul à sommer est
                    // correct.
                    // Pour cela on appelle à nouveau vérifieSyntaxe
                    const indiceErreur2 = new Pointeur(0)
                    const n = (parametresFormels !== null) ? parametresFormels.length : 0
                    const parametreFormel2 = new Array(n + 1)
                    for (let j = 0; j < n; j++) parametreFormel2[j] = parametresFormels[j]
                    parametreFormel2[n] = nomVariableSommation
                    if (!CalcR.verifieSyntaxe(ptListe, chformuleASommer,
                      indiceErreur2, indiceMaxiDansListe, parametreFormel2)) {
                      erreur = true
                      indiceErreur.setValue(i + longNom + 1 + indiceErreur2.getValue())
                    } else {
                      i = indiceDeuxiemeVirg + 1
                      itemPrecedent = CCbGlob.Valeur
                      itemSuivant = CCbGlob.Virgule
                    }
                  }
                } else { i += longNom }
              }
            }
          } else {
            const vd = ptVa.getValue()
            indiceDansListe = ptListe.indexOf(vd)
            if (indiceDansListe > indiceMaxiDansListe) {
              erreur = true
              indiceErreur.setValue(i)
            } else {
              i += longNom
              if (vd.estFonctionOuSuite()) {
                if ((i < ch.length) && ch.charAt(i) !== '(') {
                  erreur = true
                  indiceErreur.setValue(i + longNom)
                } else {
                  itemSuivant = CCbGlob.Fonction
                  const nbvar = vd.nombreVariables()
                  if (nbvar >= 2) {
                    const nvirg = CCbGlob.NombreVirgules(ch, i + 1)
                    if (nvirg !== nombreVariables.getValue() - 1) {
                      if (nvirg <= nombreVariables.getValue() - 1) {
                        indiceErreur.setValue(CCbGlob.indiceCaractereVirgule(ch,
                          i + 1, nvirg))
                      } else {
                        indiceErreur.setValue(CCbGlob.indiceCaractereVirgule(ch,
                          i + 1, nombreVariables.getValue() - 1) - 1)
                      }
                      erreur = true
                    }
                  } else {
                    // Bug corrigé version 4.6 : Il ne faut pas qu'un appel de fonction d'une variable comprenne des virgules
                    if (CCbGlob.NombreVirgules(ch, i + 1) > 0) {
                      indiceErreur.setValue(ch.indexOf(',', i + 1))
                      erreur = true
                    }
                  }
                }
              } else {
                if (vd.estMatrice()) {
                  if ((i < ch.length) && ch.charAt(i) === '(') {
                    // Un nom de matrice suivi de deux paramètres fait référence à un terme de la matrice
                    itemSuivant = CCbGlob.Fonction
                    const nvirg = CCbGlob.NombreVirgules(ch, i + 1)
                    if (nvirg !== 1) {
                      if (nvirg <= 1) {
                        indiceErreur.setValue(CCbGlob.indiceCaractereVirgule(ch,
                          i + 1, nvirg))
                      } else {
                        indiceErreur.setValue(CCbGlob.indiceCaractereVirgule(ch,
                          i + 1, 1) - 1)
                      }
                      erreur = true
                    }
                  } else {
                    erreur = true
                    indiceErreur.setValue(i)
                  }
                } else {
                  itemSuivant = CCbGlob.Valeur
                }
              }
            }
          }
        }
      } else {
        switch (car) {
          case '+':
          case '-':
            itemSuivant = CCbGlob.Addition
            i++
            break
          case '*':
          case '/':
            itemSuivant = CCbGlob.Multiplication
            i++
            break
          case '(':
            if (nivPar >= CCbGlob.nombreMaxParentheses - 1) {
              erreur = true
              indiceErreur.setValue(i)
            } else {
              itemSuivant = CCbGlob.ParOuvrante
              i++
              nivPar++
            }
            break
          case ')':
            appelFonction[nivPar] = false
            nivPar--
            itemSuivant = CCbGlob.ParFermante
            i++
            break
          case '^':
            itemSuivant = CCbGlob.Puissance
            i++
            break
          // Ajout par rapport à la version C++ 1.8, autorisation du carré ²
          case '²':
            itemSuivant = CCbGlob.Carre
            i++
            break
          // ni nombre ni opérateur}
          case '<':
            itemSuivant = CCbGlob.Inegalite
            i++
            if (i <= longueurCh - 2) {
              carSuivant = ch.charAt(i)
              if ((carSuivant === '=') || (carSuivant === '>')) { i++ }
            }
            break
          case '>':
            itemSuivant = CCbGlob.Inegalite
            i++
            if (i <= longueurCh - 2) {
              carSuivant = ch.charAt(i)
              if (carSuivant === '=') { i++ }
            }
            break
          // Ajout version 4.9.5
          case '&':
          case '|':
          case '=':
            itemSuivant = CCbGlob.Inegalite
            i++
            break
          case ' ':
            itemSuivant = CCbGlob.Blanc
            i++
            break
          case ',':
            if (!appelFonction[nivPar]) {
              erreur = true
              indiceErreur.setValue(i)
            } else {
              itemSuivant = CCbGlob.Virgule
              i++
            }
            break
          default: // switch Car
            erreur = true
            indiceErreur.setValue(i - 1)
        } // switch Car
      }// else du if LongNom > 0
    } // else du if Chiffre(Car) || (Car === '.'))
    if (!erreur) {
      if (CCbGlob.autorisationSyntaxe(itemPrecedent, itemSuivant)) {
        if (itemSuivant !== CCbGlob.Blanc) { itemPrecedent = itemSuivant }
      } else {
        erreur = true
        indiceErreur.setValue(i - 1)
      }
    }
  } // while
  // Il faut aussi regarder si la fin de l'expression est correcte
  itemSuivant = CCbGlob.ParFermante
  if (!erreur) {
    if (!CCbGlob.autorisationSyntaxe(itemPrecedent, itemSuivant)) {
      erreur = true
      indiceErreur.setValue(longueurCh)
    }
  }
  if (indiceErreur.getValue() < 0) indiceErreur.setValue(0)
  else if (indiceErreur.getValue() > longueurCh) indiceErreur.setValue(longueurCh)
  // On regarde si la chaîne ne contient que des blancs
  i = 0
  queDesBlancs = true
  while ((i <= longueurCh - 1) && queDesBlancs) {
    car = ch.charAt(i)
    if (car !== ' ') { queDesBlancs = false } else { i++ }
  }
  if (queDesBlancs) {
    erreur = true
    indiceErreur.setValue(longueurCh)
  }
  return !erreur
}

/**
 * Procédure récursive créant l'objet Ccb représentant l'arbre de la
 * dérivée d'une fonction.
 * Sera utilisé au chargement d'un objet du type CDerivee ou CEdriveePartielle.
 * @param {CCb} calc  Le calcul dont on veut calculer la dérivée ou dérivée partielle.
 * @param {number} indiceVar  L'indice de la variable par rapport à laquelle on dérive.
 * @returns {CCb} : L'arbre de calcul binaire représentant la dérivée.
 */
function creeDerivee (calc, indiceVar) {
  let op1dep, op2dep, uder, vder, uCopie, vCopie, fcalcder, appelfder, f, fcalcderu
  let fcalcderv, appelfderu, appelfderv, prod1, prod2, wder, wCopie, fcalcderw
  let appelfderw, sum1
  const li = calc.listeProprietaire
  const natcalc = calc.nature()
  if (natcalc === CCbGlob.natConstante) return new CConstante(li, 0)
  else if (natcalc === CCbGlob.natVariableFormelle) {
    // Si l'indice de la variable formelle est le bon on renvoie 1 sinon 0
    if (calc.indvar === indiceVar) { return new CConstante(li, 1) } else { return new CConstante(li, 0) }
  } else if (natcalc === CCbGlob.natResultatValeur) return new CConstante(li, 0)
  else if (natcalc === CCbGlob.natAppelFonction) {
    // Ici il y a un problème car l'appel de fonction peut être un appel
    // à une suite récurrente. Cet appel est licite s'il ne fait pas appel
    // à la variable formelle.
    // Il faudra le vérifier avant d'autoriser le calcul d'une dérivée.
    // Ici on suppose que c'est la cas
    // Modifié version 4.6
    //  CAppelFonction appfon = (CAppelFonction) calc;
    // if (appfon.fonctionAssociee.getClass() === CSuiteRec.class) {
    if (calc.fonctionAssociee.estDeNatureCalcul(NatCal.NSuiteRecurrenteReelle)) {
      // L'appel de suite sans paramètre est considéré comme une constante
      return new CConstante(li, 0)
    } else {
      // Cas d'une vraie fonction
      f = calc.fonctionAssociee
      // On regarde si l'appel de fonction est seulement de la forme
      // f(paramètre)
      if (calc.operande.nature() === CCbGlob.natVariableFormelle) {
        const va = calc.operande
        if (va.indvar === indiceVar) { return CalcR.creeDerivee(f.calcul, indiceVar) } else {
          uder = CalcR.creeDerivee(calc.operande, indiceVar)
          uCopie = calc.operande.getCopie()
          fcalcder = CalcR.creeDerivee(f.calcul, indiceVar)
          appelfder = new CAppelFonctionInterne(fcalcder, uCopie)
          return new COp(li, uder, appelfder, Ope.Mult)
        }
      } else { // Dans ce cas il faut dériver comme une composée du type fou
        uder = CalcR.creeDerivee(calc.operande, indiceVar)
        uCopie = calc.operande.getCopie()
        fcalcder = CalcR.creeDerivee(f.calcul, indiceVar)
        appelfder = new CAppelFonctionInterne(fcalcder, uCopie)
        return new COp(li, uder, appelfder, Ope.Mult)
      }
    }
  } else if (natcalc === CCbGlob.natOperation) {
    // var op = calc;
    switch (calc.ope) {
      case Ope.Plus:
        op1dep = calc.operande1.dependDeVariable(indiceVar)
        op2dep = calc.operande2.dependDeVariable(indiceVar)
        if (!op1dep) {
          if (!op2dep) return new CConstante(li, 0)
          else return CalcR.creeDerivee(calc.operande2, indiceVar)
        }
        if (!op2dep) return CalcR.creeDerivee(calc.operande1, indiceVar)
        else {
          return new COp(li, CalcR.creeDerivee(calc.operande1, indiceVar),
            CalcR.creeDerivee(calc.operande2, indiceVar), Ope.Plus)
        }
      case Ope.Moin:
        op1dep = calc.operande1.dependDeVariable(indiceVar)
        op2dep = calc.operande2.dependDeVariable(indiceVar)
        if (!op1dep) {
          if (!op2dep) return new CConstante(li, 0)
          else return new CMoinsUnaire(li, CalcR.creeDerivee(calc.operande2, indiceVar))
        }
        if (!op2dep) return CalcR.creeDerivee(calc.operande1, indiceVar)
        return new COp(li, CalcR.creeDerivee(calc.operande1, indiceVar),
          CalcR.creeDerivee(calc.operande2, indiceVar), Ope.Moin)
      case Ope.Mult: {
        // On regarde d'abord si les facteurs du produit dépendent de la
        // variable
        op1dep = calc.operande1.dependDeVariable(indiceVar)
        op2dep = calc.operande2.dependDeVariable(indiceVar)
        if (!op1dep) {
          if (!op2dep) return new CConstante(li, 0)
          else {
            return new COp(li, calc.operande1.getCopie(),
              CalcR.creeDerivee(calc.operande2, indiceVar), Ope.Mult)
          }
        }
        if (!op2dep) {
          return new COp(li, CalcR.creeDerivee(calc.operande1, indiceVar),
            calc.operande2.getCopie(), Ope.Mult)
        } else {
          // Formule u'v + uv'
          return new COp(li, new COp(li, CalcR.creeDerivee(calc.operande1, indiceVar),
            calc.operande2.getCopie(), Ope.Mult), new COp(li,
            CalcR.creeDerivee(calc.operande2, indiceVar),
            calc.operande1.getCopie(), Ope.Mult), Ope.Plus)
        }
      }
      case Ope.Divi: // Formule (u'v-uv')/v²
        // On regarde d'abord si le dénominateur dépend de la variable
        if (!calc.operande2.dependDeVariable(indiceVar)) {
          return new COp(li, CalcR.creeDerivee(calc.operande1, indiceVar),
            calc.operande2.getCopie(), Ope.Divi)
        } else {
          return new COp(li, new COp(li, new COp(li,
            CalcR.creeDerivee(calc.operande1, indiceVar), calc.operande2.getCopie(),
            Ope.Mult), new COp(li, CalcR.creeDerivee(calc.operande2,
            indiceVar), calc.operande1.getCopie(), Ope.Mult),
          Ope.Moin), new CPuissance(li, calc.operande2.getCopie(),
            new CConstante(li, 2)), Ope.Divi)
        }
      case Ope.Inf:
      case Ope.Sup:
      case Ope.InfOuEgal:
      case Ope.SupOuEgal:
      case Ope.Egalite:
      case Ope.Diff:
      case Ope.And:
      case Ope.Or:
        return new CConstante(li, 0)
    }
  } else if (natcalc === CCbGlob.natFonction) {
    // var f = calc;
    switch (calc.opef) {
      case Opef.Abso:
        // La fonction valeur absolue n'étant pas dérivable en 0
        // On va renvoyer comme formule
        // 1/((operande>0)-(Operande<0))*(Operande)'
        return new COp(li, new COp(li, new CConstante(li, 1),
          new COp(li, new COp(li, calc.operande.getCopie(),
            new CConstante(li, 0), Ope.Sup), new COp(li,
            calc.operande.getCopie(), new CConstante(li, 0), Ope.Inf),
          Ope.Moin), Ope.Divi), CalcR.creeDerivee(calc.operande,
          indiceVar), Ope.Mult)
      case Opef.Enti: // la dérivée existe et est nulle sauf en
        // tout entier
        // On renvoie donc comme formule 0/(operande<>int(operande))
        return new COp(li, new CConstante(li, 0), new COp(li,
          calc.operande.getCopie(), new CFonction(li, Opef.Enti,
            calc.operande.getCopie()), Ope.Diff), Ope.Divi)
      case Opef.Raci:
      case Opef.Raci2: // Formule u'/(2Racine(u))
        return new COp(
          li,
          CalcR.creeDerivee(calc.operande, indiceVar),
          new COp(li, new CConstante(li, 2), new CFonction(li,
            Opef.Raci, calc.operande.getCopie()), Ope.Mult),
          Ope.Divi)
      case Opef.Sinu: // La dérivée ne sera correcte que si on est
        // en mode radian
        // On applique la formule u'*cos(u)
        if (li.uniteAngle === uniteAngleRadian) {
          return new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
            new CFonction(li, Opef.Cosi, calc.operande.getCopie()),
            Ope.Mult)
        } else {
          return new COp(li, new CConstante(li, ConvDegRad),
            new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
              new CFonction(li, Opef.Cosi,
                calc.operande.getCopie()), Ope.Mult), Ope.Mult)
        }

      case Opef.Cosi:
        // On applique la formule -u'*sin(u)
        if (li.uniteAngle === uniteAngleRadian) {
          return new COp(li, new COp(li, CalcR.creeDerivee(calc.operande,
            indiceVar), new CFonction(li, Opef.Sinu,
            calc.operande.getCopie()), Ope.Mult), new CConstante(li, -1),
          Ope.Mult)
        } else {
          return new COp(li, new CConstante(li, ConvDegRad),
            new COp(li, new COp(li, CalcR.creeDerivee(calc.operande,
              indiceVar), new CFonction(li, Opef.Sinu,
              calc.operande.getCopie()), Ope.Mult), new CConstante(li,
              -1), Ope.Mult), Ope.Mult)
        }

      case Opef.Tang: // On applique la formule u'/cos²(u)
        if (li.uniteAngle === uniteAngleRadian) {
          return new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
            new CPuissance(li, new CFonction(li, Opef.Cosi,
              calc.operande.getCopie()), new CConstante(li, 2)),
            Ope.Divi)
        } else {
          return new COp(li, new CConstante(li, ConvDegRad),
            new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
              new CPuissance(li, new CFonction(li, Opef.Cosi,
                calc.operande.getCopie()), new CConstante(li, 2)),
              Ope.Divi), Ope.Mult)
        }
      case Opef.Logn: // Formule u'/(u*(u>0))
        return new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
          new COp(li, calc.operande.getCopie(), new COp(li,
            calc.operande.getCopie(), new CConstante(li, 0), Ope.Sup),
          Ope.Mult), Ope.Divi)
      case Opef.Expo: // Formule u'*exp(u)
        return new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
          new CFonction(li, Opef.Expo, calc.operande.getCopie()),
          Ope.Mult)
      case Opef.ATan: // Formule u'/(1+u²)
        if (li.uniteAngle === uniteAngleRadian) {
          return new COp(
            li,
            CalcR.creeDerivee(calc.operande, indiceVar),
            new COp(li, new CConstante(li, 1), new CPuissance(li,
              calc.operande.getCopie(), new CConstante(li, 2)), Ope.Plus),
            Ope.Divi)
        } else {
          return new COp(li, new CConstante(li, ConvRadDeg),
            new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
              new COp(li, new CConstante(li, 1), new CPuissance(li,
                calc.operande.getCopie(), new CConstante(li, 2)),
              Ope.Plus), Ope.Divi), Ope.Mult)
        }
      case Opef.ACos: // Formule -u'/(rac(1-u²))
        if (li.uniteAngle === uniteAngleRadian) {
          return new COp(li, new COp(li, CalcR.creeDerivee(calc.operande,
            indiceVar),
          new CFonction(li, Opef.Raci, new COp(li,
            new CConstante(li, 1), new CPuissance(li, calc.operande
              .getCopie(), new CConstante(li, 2)), Ope.Moin)),
          Ope.Divi), new CConstante(li, -1), Ope.Mult)
        } else {
          return new COp(li, new COp(li, CalcR.creeDerivee(calc.operande,
            indiceVar),
          new CFonction(li, Opef.Raci, new COp(li,
            new CConstante(li, 1), new CPuissance(li, calc.operande
              .getCopie(), new CConstante(li, 2)), Ope.Moin)),
          Ope.Divi), new CConstante(li, -ConvRadDeg),
          Ope.Mult)
        }
      case Opef.ASin: // Formule u'/(rac(1-u²))
        if (li.uniteAngle === uniteAngleRadian) {
          return new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
            new CFonction(li, Opef.Raci, new COp(li,
              new CConstante(li, 1), new CPuissance(li,
                calc.operande.getCopie(), new CConstante(li, 2)),
              Ope.Moin)), Ope.Divi)
        } else {
          return new COp(li, new CConstante(li, ConvRadDeg),
            new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
              new CFonction(li, Opef.Raci, new COp(li,
                new CConstante(li, 1), new CPuissance(li,
                  calc.operande.getCopie(), new CConstante(li, 2)),
                Ope.Moin)), Ope.Divi), Ope.Mult)
        }
      case Opef.Cosh: // Formule u'*Sinh(u)
        return new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
          new CFonction(li, Opef.Sinh, calc.operande.getCopie()),
          Ope.Mult)
      case Opef.Sinh: // Formule u'*Cosh(u)
        return new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
          new CFonction(li, Opef.Cosh, calc.operande.getCopie()),
          Ope.Mult)
      case Opef.Tanh: // Formule u'/Cosh²(u)
        return new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
          new CPuissance(li, new CFonction(li, Opef.Cosh,
            calc.operande.getCopie()), new CConstante(li, 2)), Ope.Divi)
      case Opef.ArgCh: // Formule u'/Rac(u²-1)
        return new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
          new CFonction(li, Opef.Raci,
            new COp(li, new CPuissance(li, calc.operande.getCopie(),
              new CConstante(li, 2)), new CConstante(li, 1),
            Ope.Moin)), Ope.Divi)
      case Opef.ArgSh: // Formule u'/(Rac(1+u²)
        return new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
          new CFonction(li, Opef.Raci,
            new COp(li, new CPuissance(li, calc.operande.getCopie(),
              new CConstante(li, 2)), new CConstante(li, 1),
            Ope.Plus)), Ope.Divi)
      case Opef.ArgTh: // Formule (Abs(u)<1)*u'/(1-u²)
        return new COp(li, new COp(li, new CFonction(li,
          Opef.Abso, calc.operande.getCopie()), new CConstante(li,
          1), Ope.Inf), new COp(li, CalcR.creeDerivee(calc.operande,
          indiceVar), new COp(li, new CConstante(li, 1),
          new CPuissance(li, calc.operande.getCopie(), new CConstante(li, 2)),
          Ope.Moin), Ope.Divi), Ope.Mult)
      case Opef.Rand:
        return new CConstante(li, 0)
      // Rajouté version 4.7.2
      case Opef.Left:
        // return CalcR.creeDerivee(calc.operande.membreGauche(), indiceVar)
        return CalcR.creeDerivee(getLeft(calc.operande), indiceVar)
      case Opef.Right:
        // return CalcR.creeDerivee(calc.operande.membreDroit(), indiceVar)
        return CalcR.creeDerivee(getRight(calc.operande), indiceVar)
      case Opef.Core:
        return CalcR.creeDerivee(calc.operande, indiceVar)
    }
  } else if (natcalc === CCbGlob.natPuissance) {
    // CPuissance pui = (CPuissance) calc;
    // Si l'exposant ne dépend pas de la variable formelle on emploie la
    // formule
    // (u^n)' = nu'u^(n-1)
    if (!calc.exposant.dependDeVariable(indiceVar)) {
      if (!calc.operande.dependDeVariable(indiceVar)) { return new CConstante(li, 0) } else {
        if (calc.exposant.nature() === CCbGlob.natConstante) {
          const co = calc.exposant
          if (co.valeur === 0) return new CConstante(li, 0)
          else if (co.valeur === 1) return CalcR.creeDerivee(calc.operande, indiceVar)
          else {
            return new COp(li,
              new COp(li, calc.exposant.getCopie(), CalcR.creeDerivee(
                calc.operande, indiceVar), Ope.Mult),
              new CPuissance(li, calc.operande.getCopie(), new CConstante(li, co.valeur - 1)),
              Ope.Mult)
          }
        } else {
          return new COp(li,
            new COp(li, calc.exposant.getCopie(), CalcR.creeDerivee(
              calc.operande, indiceVar), Ope.Mult),
            new CPuissance(li, calc.operande.getCopie(), new COp(li,
              calc.exposant.getCopie(), new CConstante(li, 1), Ope.Moin)),
            Ope.Mult)
        }
      }
    } else {
      // Sinon on considère u^v comme exp(v*lnu) de dérivée
      // (v'*lnu+v*u'/u)*u^v
      return new COp(
        li,
        new COp(li, new COp(li, CalcR.creeDerivee(calc.exposant,
          indiceVar), new CFonction(li, Opef.Logn,
          calc.operande.getCopie()), Ope.Mult), new COp(li,
          new COp(li, CalcR.creeDerivee(calc.operande, indiceVar),
            calc.operande.getCopie(), Ope.Divi), calc.exposant
            .getCopie(), Ope.Mult), Ope.Plus),
        new CPuissance(li, calc.operande.getCopie(), calc.exposant.getCopie()),
        Ope.Mult)
    }
  } else if (natcalc === CCbGlob.natMoinsUnaire) {
    // Ajout version 4.6 : Nouvel opérateur moins unaire
    // CMoinsUnaire mun = (CMoinsUnaire) calc;
    return new CMoinsUnaire(li, CalcR.creeDerivee(calc.operande, indiceVar))
  } else if (natcalc === CCbGlob.natAppelFonctionNVar) {
    // Ajout version 3.0 pour le cas d'un appel à une fonction utilisateur de
    // plusieurs variables
    // Pour une fonction du type f(t) = g[u(t),v(t)] on utilise la formule
    // f'(t) = u'(t) g'u(u(t),v(t)) + v'(t) g'v(u(t),v(t))

    // Version 3.0 : seulement des fonctions jutilisateur de 2 à 4 variables
    // peuvent être créées.
    // CAppelFonctionNVar appfon = (CAppelFonctionNVar) calc;
    f = calc.fonctionAssociee
    const nvar = f.nbVar
    uder = CalcR.creeDerivee(calc.operandes[0], indiceVar) // Calcul
    // de
    // u'(t)
    vder = CalcR.creeDerivee(calc.operandes[1], indiceVar) // Calcul
    // de
    // v'(t)
    uCopie = calc.operandes[0].getCopie()
    vCopie = calc.operandes[1].getCopie()
    const tabcal = new Array(nvar)
    tabcal[0] = uCopie
    tabcal[1] = vCopie
    fcalcderu = CalcR.creeDerivee(f.calcul, 0) // Dérivée partielle
    // par rapport à la
    // première variable u
    fcalcderv = CalcR.creeDerivee(f.calcul, 1) // Dérivée partielle
    // par rapport à la
    // deuxième variable v
    appelfderu = new CAppelFonctionInterneNVar(fcalcderu, tabcal)
    appelfderv = new CAppelFonctionInterneNVar(fcalcderv, tabcal)
    /*
    var prod1 = new COp(li, uder, appelfderu, Ope.Mult);
    var prod2 = new COp(li, vder, appelfderv, Ope.Mult);
    var sum1 = new COp(li, prod1, prod2, Ope.Plus);
    */
    if ((uder.nature() === CCbGlob.natConstante) && (uder.valeur === 0)) {
      prod1 = new CConstante(li, 0)
    } else prod1 = new COp(li, uder, appelfderu, Ope.Mult)
    if ((vder.nature() === CCbGlob.natConstante) && (vder.valeur === 0)) {
      prod2 = new CConstante(li, 0)
      // else prod1 = new COp(li, uder, appelfderu, Ope.Mult) // Ligne corrigée version 6
    } else prod2 = new COp(li, vder, appelfderv, Ope.Mult)
    sum1 = new COp(li, prod1, prod2, Ope.Plus)
    if (nvar === 2) return sum1
    // Cas d'une fonction de 3 variables ou plus
    for (let i = 2; i < nvar; i++) {
      wder = CalcR.creeDerivee(calc.operandes[i], indiceVar) // Calcul
      wCopie = calc.operandes[i].getCopie()
      tabcal[i] = wCopie
      fcalcderw = CalcR.creeDerivee(f.calcul, i) // Dérivée partielle
      appelfderw = new CAppelFonctionInterneNVar(fcalcderw, tabcal)
      if (wder.nature() === CCbGlob.natConstante && (wder.valeur === 0)) {
        prod2 = new CConstante(li, 0)
      } else prod2 = new COp(li, wder, appelfderw, Ope.Mult)
      sum1 = new COp(li, sum1, prod2, Ope.Plus)
    }
    return sum1
  } else if (natcalc === CCbGlob.natAppelFonctionInterneNVar) {
    // Version 3.0 : seulement des fonctions jutilisateur de 2 à 4 variables
    // peuvent être créées.
    // var appfon = calc;
    f = calc.fonctionInterne
    const nvar = calc.operandes.length
    uder = CalcR.creeDerivee(calc.operandes[0], indiceVar) // Calcul
    // de
    // u'(t)
    vder = CalcR.creeDerivee(calc.operandes[1], indiceVar) // Calcul
    // de
    // v'(t)
    uCopie = calc.operandes[0].getCopie()
    vCopie = calc.operandes[1].getCopie()
    const tabcal = new Array(nvar)
    tabcal[0] = uCopie
    tabcal[1] = vCopie
    fcalcderu = CalcR.creeDerivee(f, 0) // Dérivée partielle par
    // rapport à la première
    // variable u
    fcalcderv = CalcR.creeDerivee(f, 1) // Dérivée partielle par
    // rapport à la deuxième
    // variable v
    appelfderu = new CAppelFonctionInterneNVar(fcalcderu, tabcal)
    appelfderv = new CAppelFonctionInterneNVar(fcalcderv, tabcal)
    // Test suivany rajouté version 6.8 pour optimisation
    if ((uder.nature() === CCbGlob.natConstante) && (uder.valeur === 0)) {
      prod1 = new CConstante(li, 0)
    } else prod1 = new COp(li, uder, appelfderu, Ope.Mult)
    prod1 = new COp(li, uder, appelfderu, Ope.Mult)
    if ((vder.nature() === CCbGlob.natConstante) && (vder.valeur === 0)) {
      prod2 = new CConstante(li, 0)
    } else prod2 = new COp(li, vder, appelfderv, Ope.Mult)
    sum1 = new COp(li, prod1, prod2, Ope.Plus)
    if (nvar === 2) return sum1
    for (let i = 2; i < nvar; i++) {
      wder = CalcR.creeDerivee(calc.operandes[i], indiceVar) // Calcul
      wCopie = calc.operandes[i].getCopie()
      tabcal[i] = wCopie
      fcalcderw = CalcR.creeDerivee(f, i) // Dérivée partielle par rapport à la i ième variable w
      appelfderw = new CAppelFonctionInterneNVar(fcalcderw, tabcal)
      if (wder.nature() === CCbGlob.natConstante && (wder.valeur === 0)) {
        prod2 = new CConstante(li, 0)
      } else prod2 = new COp(li, wder, appelfderw, Ope.Mult)
      sum1 = new COp(li, sum1, prod2, Ope.Plus)
    }
    return sum1
  } else if (natcalc === CCbGlob.natFonction3Var) {
    // CFonction3Var f = (CFonction3Var) calc;
    switch (calc.opef) {
      // La fonction valeur absolue n'étant pas dérivable en 0
      // On va renvoyer comme formule (operande1=1)*(Operande2)' +
      // (operande1!==1)*(Operande3)'
      case Opef3v.si:
        return new COp(li, new COp(li, new COp(li,
          calc.operande1.getCopie(), new CConstante(li, 1), Ope.Egalite),
        CalcR.creeDerivee(calc.operande2, indiceVar), Ope.Mult),
        new COp(li, new COp(li, calc.operande1.getCopie(),
          new CConstante(li, 1), Ope.Diff), CalcR.creeDerivee(
          calc.operande3, indiceVar), Ope.Mult), Ope.Plus)
      default:
        return new CConstante(li, 0)
    }
  } else if (natcalc === CCbGlob.natSommeDansFormule) {
    // CSommeDansFormule s = (CSommeDansFormule) calc;
    return new CSommeDansFormule(li, CalcR.creeDerivee(calc.calculASommer, indiceVar),
      calc.indiceDebut.getCopie(), calc.indiceFin.getCopie(), calc.pas.getCopie(),
      calc.nomVariable)
  } else
  // Si on a autorisé un produit indicé c'est qu'il ne dépendait pas de la
  // variable de dérivation
  // donc la dérivée est null
    if (natcalc === CCbGlob.natProduitDansFormule) {
      return new CConstante(li, 0)
    }
  // Pour les autres types, on considère le calcul constant (fonction
  // prédifinie de deux variables comme max() par exemple
  return new CConstante(li, 0) // Pour satisfaire le compilateur
}

const CalcR = {
  ccb,
  creeDerivee,
  verifieSyntaxe
}

export default CalcR
