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
import Opef4v from '../types/Opef4v'
import Opef5v from '../types/Opef5v'
import Fonte from '../types/Fonte'
import CAppelFonction from '../objets/CAppelFonction'
import CAppelFonctionNVar from '../objets/CAppelFonctionNVar'
import CTermMat from '../objets/CTermMat'
import CConstante from '../objets/CConstante'
import CFonction from '../objets/CFonction'
import CFonction2Var from '../objets/CFonction2Var'
import CFonction3Var from '../objets/CFonction3Var'
import CIntegraleDansFormule from '../objets/CIntegraleDansFormule'
import CPrimitive from '../objets/CPrimitive'
import CMoinsUnaire from '../objets/CMoinsUnaire'
import CVariableFormelle from '../objets/CVariableFormelle'
import CResultatValeur from '../objets/CResultatValeur'
import COp from '../objets/COperation'
import CPuissance from '../objets/CPuissance'
import CCbNull from '../objets/CCbNull'
import CSommeMatDansForm from 'src/objets/CSommeMatDansForm'
import CProduitMatDansForm from 'src/objets/CProduitMatDansForm'

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
 * @param {string[]} nomsVariablesFormelles  Un tableau donnant les noms des variables
 * formelles dans le cas où le calcul est utilisé à l'intérieur d'une focntion de
 * une ou plusieurs variables.
 * @param {CListeObjets} listeSource  La liste source des objets utilisables (ne diffère de ptListe que pour les exercices de construction)
 * @returns {CCb}
 */
function ccbmat (ch, ptListe, pdebut, pfin, nomsVariablesFormelles, listeSource) {
  if (arguments.length <= 5) listeSource = ptListe
  try {
    // Spécial JavaScript car pas d'erreur levée par charAt si pdebut > pFin
    if (pdebut > pfin) throw new Error()
    const info = { x: 0, y: 0 } // Contiendra dans x l'indice du caractère
    // précédent et dans y l'opérateur trouvé
    let ptr, car, op, indicePremiereVirg, operande1, operande2, indiceParF, indiceDeuxiemeVirg, indiceTroisiemeVirg
    let nomVariableSommation, tabcal, deb, nomVariableFormelle2, fin
    // Int nomF = new Int();
    const nomF = new Pointeur(null)
    let longNom
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
      return new COp(ptListe, CalcMatR.ccbmat(ch, ptListe, pdebut,
        info.x, nomsVariablesFormelles, listeSource), CalcMatR.ccbmat(ch, ptListe, ptr + 1,
        pfin, nomsVariablesFormelles, listeSource), info.y)
    }
    // On recherche ensuite les opérateurs de et logique
    ptr = CCbGlob.premierOperateurLogique('&', ch, pdebut, pfin, info)
    if (ptr !== -1) {
      return new COp(ptListe, CalcMatR.ccbmat(ch, ptListe, pdebut,
        info.x, nomsVariablesFormelles, listeSource), CalcMatR.ccbmat(ch, ptListe, ptr + 1,
        pfin, nomsVariablesFormelles, listeSource), info.y)
    }

    // On recherche d'abord les opérateurs d'inégalités
    ptr = CCbGlob.premiereInegalite(ch, pdebut, pfin, info)
    if (ptr !== -1) {
      return new COp(ptListe, CalcMatR.ccbmat(ch, ptListe, pdebut,
        info.x, nomsVariablesFormelles, listeSource), CalcMatR.ccbmat(ch, ptListe, ptr + 1,
        pfin, nomsVariablesFormelles, listeSource), info.y)
    } else {
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
            return CalcMatR.ccbmat(ch, ptListe, pdebut + 1, pfin,
              nomsVariablesFormelles, listeSource)
          } else {
            return new CMoinsUnaire(ptListe, CalcMatR.ccbmat(ch, ptListe,
              pdebut + 1, pfin, nomsVariablesFormelles, listeSource))
          }
        } else {
          return new COp(ptListe, CalcMatR.ccbmat(ch, ptListe, pdebut,
            ptr - 1, nomsVariablesFormelles, listeSource), CalcMatR.ccbmat(ch, ptListe,
            ptr + 1, pfin, nomsVariablesFormelles, listeSource), op)
        }
      } else {
        // if (ptr !== NULL)
        ptr = CCbGlob.premierProduit(ch, pdebut, pfin)
        if (ptr !== -1) {
          car = ch.charAt(ptr)
          if (car === '*') { op = Ope.Mult } else { op = Ope.Divi }
          return new COp(ptListe, CalcMatR.ccbmat(ch, ptListe, pdebut,
            ptr - 1, nomsVariablesFormelles, listeSource), CalcMatR.ccbmat(ch, ptListe,
            ptr + 1, pfin, nomsVariablesFormelles, listeSource), op)
        } else {
          // Le calcul ne contient ni addition, ni différence, ni produit
          // ni quotient}
          // Attention : par rapport à la version C++ 1.8, autorisation
          // du symbole ² d'élévation au carré.
          ptr = CCbGlob.premierePuissance(ch, pdebut, pfin)
          if (ptr !== -1) {
            if (ch.charAt(ptr) === '²') {
              return new CPuissance(ptListe, CalcMatR.ccbmat(ch, ptListe,
                pdebut, ptr - 1, nomsVariablesFormelles, listeSource), new CConstante(ptListe, 2))
            } else {
              return new CPuissance(ptListe, CalcMatR.ccbmat(ch, ptListe,
                pdebut, ptr - 1, nomsVariablesFormelles, listeSource), CalcMatR.ccbmat(ch, ptListe,
                ptr + 1, pfin, nomsVariablesFormelles, listeSource))
            }
          } else {
            // On regarde si la chaine commence par le nom d'une fonction
            // ou d'une valeur déjà définie
            longNom = listeSource.commenceParNomFonctionOuValeurOuParametre(
              ch.substring(pdebut), nomsVariablesFormelles, ptVa, nomF, parametreTrouve, nombreVar)
            if (longNom > 0) {
              if (parametreTrouve.getValue() !== -1) { return new CVariableFormelle(ptListe, parametreTrouve.getValue()) } else {
                if (ptVa.getValue() === null) {
                  // Modification version 3.0. Il faut regarder si la fonction
                  // est une fonction de plusieurs paramètres ou non
                  // Ajouté version 4.7.4.1
                  if (CCbGlob.parentheseFermante(ch, pdebut + longNom) === -1) throw new Error()

                  if (nombreVar.getValue() === 1) {
                    return new CFonction(ptListe, nomF.getValue(),
                      CalcMatR.ccbmat(ch, ptListe, pdebut + longNom, pfin,
                        nomsVariablesFormelles, listeSource))
                  } else {
                    if (nombreVar.getValue() === 2) {
                      indicePremiereVirg = CCbGlob.premiereVirgule(ch, pdebut +
                        longNom + 1)
                      operande1 = CalcMatR.ccbmat(ch, ptListe,
                        pdebut + longNom + 1, indicePremiereVirg - 1,
                        nomsVariablesFormelles, listeSource)
                      indiceParF = CCbGlob.parentheseFermanteApresVirgule(ch,
                        indicePremiereVirg + 1)
                      // A revoir plus tard si on crée des fonctions de trois
                      // variables ou plus
                      operande2 = CalcMatR.ccbmat(ch, ptListe,
                        indicePremiereVirg + 1, indiceParF - 1,
                        nomsVariablesFormelles, listeSource)
                      return new CFonction2Var(ptListe, nomF.getValue(),
                        operande1, operande2)
                    } else {
                      if (nombreVar.getValue() === 3) { // 3 variables
                        // var operande1;
                        indicePremiereVirg = CCbGlob.premiereVirgule(ch, pdebut +
                          longNom + 1)
                        operande1 = CalcMatR.ccbmat(ch, ptListe, pdebut +
                          longNom + 1, indicePremiereVirg - 1,
                        nomsVariablesFormelles, listeSource)
                        indiceDeuxiemeVirg = CCbGlob.premiereVirgule(ch, indicePremiereVirg + 1)
                        operande2 = CalcMatR.ccbmat(ch, ptListe,
                          indicePremiereVirg + 1, indiceDeuxiemeVirg - 1,
                          nomsVariablesFormelles, listeSource)
                        indiceParF = CCbGlob.parentheseFermanteApresVirgule(ch, indiceDeuxiemeVirg + 1)
                        // A revoir plus tard si on crée des fonctions de trois
                        // variables ou plus
                        const operande3 = CalcMatR.ccbmat(ch, ptListe,
                          indiceDeuxiemeVirg + 1, indiceParF - 1,
                          nomsVariablesFormelles, listeSource)
                        return new CFonction3Var(ptListe, nomF.getValue(),
                          operande1, operande2, operande3)
                      } else {
                        if (nombreVar.getValue() === 4) {
                          // Seules fonctions à 4 variables : Cas d'une intégrale ou calcul de primitive prise entre deux bornes
                          indicePremiereVirg = CCbGlob.premiereVirgule(ch, pdebut + longNom + 1)
                          indiceDeuxiemeVirg = CCbGlob.premiereVirgule(ch, indicePremiereVirg + 1)
                          indiceTroisiemeVirg = CCbGlob.premiereVirgule(ch, indiceDeuxiemeVirg + 1)
                          indiceParF = CCbGlob.parentheseFermanteApresVirgule(ch, indiceTroisiemeVirg + 1)
                          nomVariableSommation = ch.substring(indicePremiereVirg + 1, indiceDeuxiemeVirg)
                          nomVariableSommation = nomVariableSommation.trim()
                          const n = (nomsVariablesFormelles !== null) ? nomsVariablesFormelles.length : 0
                          // String[] nomVariableFormelle2 = new String[n + 1];
                          nomVariableFormelle2 = new Array(n + 1)
                          // Code nettoyé version mtgApp
                          for (let j = 0; j < n; j++) nomVariableFormelle2[j] = nomsVariablesFormelles[j]
                          // nomVariableFormelle2[n+1] = new String(nomVariableSommation);
                          nomVariableFormelle2[n] = nomVariableSommation
                          const Classef4var = (nomF.getValue() === Opef4v.integrale) ? CIntegraleDansFormule : CPrimitive
                          return new Classef4var(
                            ptListe,
                            CalcMatR.ccbmat(ch, ptListe, pdebut + longNom + 1,
                              indicePremiereVirg - 1, nomVariableFormelle2, listeSource),
                            CalcMatR.ccbmat(ch, ptListe,
                              indiceDeuxiemeVirg + 1,
                              indiceTroisiemeVirg - 1, nomsVariablesFormelles, listeSource),
                            CalcMatR.ccbmat(ch, ptListe,
                              indiceTroisiemeVirg + 1, indiceParF - 1,
                              nomsVariablesFormelles, listeSource), nomVariableSommation,
                            false)
                        } else {
                          // fonctions à 5 variables : la somme indicée et
                          // produit indicé
                          indicePremiereVirg = CCbGlob.premiereVirgule(ch, pdebut + longNom + 1)
                          indiceDeuxiemeVirg = CCbGlob.premiereVirgule(ch, indicePremiereVirg + 1)
                          indiceTroisiemeVirg = CCbGlob.premiereVirgule(ch, indiceDeuxiemeVirg + 1)
                          const indiceQuatriemeVirg = CCbGlob.premiereVirgule(ch, indiceTroisiemeVirg + 1)
                          indiceParF = CCbGlob.parentheseFermanteApresVirgule(ch, indiceQuatriemeVirg + 1)
                          nomVariableSommation = ch.substring(indicePremiereVirg + 1, indiceDeuxiemeVirg)
                          nomVariableSommation = nomVariableSommation.trim()
                          const n = (nomsVariablesFormelles !== null) ? nomsVariablesFormelles.length : 0
                          // String[] nomVariableFormelle2 = new String[n + 1];
                          nomVariableFormelle2 = new Array(n + 1)
                          for (let j = 0; j < n; j++) { nomVariableFormelle2[j] = nomsVariablesFormelles[j] }
                          nomVariableFormelle2[n] = nomVariableSommation
                          if (nomF.getValue() === Opef5v.somme) {
                            const calculASommer = CalcMatR.ccbmat(ch, ptListe, pdebut + longNom +
                              1, indicePremiereVirg - 1, nomVariableFormelle2, listeSource)
                            return new CSommeMatDansForm(ptListe, calculASommer, CalcMatR.ccbmat(ch, ptListe,
                              indiceDeuxiemeVirg + 1, indiceTroisiemeVirg - 1,
                              nomVariableFormelle2, listeSource), CalcMatR.ccbmat(ch, ptListe,
                              indiceTroisiemeVirg + 1, indiceQuatriemeVirg - 1,
                              nomVariableFormelle2, listeSource), CalcMatR.ccbmat(ch, ptListe,
                              indiceQuatriemeVirg + 1, indiceParF - 1, nomVariableFormelle2, listeSource),
                            nomVariableSommation)
                          } else {
                            return new CProduitMatDansForm(ptListe,
                              CalcMatR.ccbmat(ch, ptListe, pdebut + longNom +
                                1, indicePremiereVirg - 1,
                              nomVariableFormelle2, listeSource), CalcMatR.ccbmat(ch, ptListe,
                                indiceDeuxiemeVirg + 1, indiceTroisiemeVirg - 1,
                                nomVariableFormelle2, listeSource), CalcMatR.ccbmat(ch, ptListe,
                                indiceTroisiemeVirg + 1, indiceQuatriemeVirg - 1,
                                nomVariableFormelle2, listeSource), CalcMatR.ccbmat(ch, ptListe,
                                indiceQuatriemeVirg + 1, indiceParF - 1, nomVariableFormelle2, listeSource),
                              nomVariableSommation)
                          }
                        }
                      }
                    }
                  }
                } else {
                  if (ptVa.getValue().estFonctionOuSuite()) {
                    // Ajouté version 4.7.4.1
                    if (CCbGlob.parentheseFermante(ch, pdebut + longNom) === -1) {
                      throw new Error()
                    }
                    const calc = ptVa.getValue()
                    const nbvar = calc.nombreVariables()
                    if (nbvar === 1) {
                      return new CAppelFonction(ptListe,
                        ptVa.getValue(), CalcMatR.ccbmat(ch, ptListe, pdebut + longNom, pfin,
                          nomsVariablesFormelles, listeSource))
                    } else {
                      // Ccb[] tabcal = new Ccb[nbvar];
                      tabcal = new Array(nbvar)
                      deb = pdebut + longNom
                      fin = 0
                      for (let i = 0; i < nbvar - 1; i++) {
                        fin = CCbGlob.premiereVirgule(ch, deb + 1)
                        tabcal[i] = CalcMatR.ccbmat(ch, ptListe, deb + 1, fin - 1, nomsVariablesFormelles, listeSource)
                        deb = fin
                      }
                      deb++
                      fin = CCbGlob.parentheseFermanteApresVirgule(ch, deb)
                      tabcal[nbvar - 1] = CalcMatR.ccbmat(ch, ptListe, deb,
                        fin - 1, nomsVariablesFormelles, listeSource)
                      if (ptVa.getValue().estMatrice()) return new CTermMat(ptListe, tabcal[0], tabcal[1], ptVa)
                      else return new CAppelFonctionNVar(ptListe, nbvar, ptVa.getValue(), tabcal)
                    }
                  } else {
                    // Un nom de matrice pas suivi d'une parenthèse est une référence à la matrice elle-même
                    if (ptVa.getValue().estMatrice() && ch.charAt(pdebut + longNom) === '(') {
                      tabcal = new Array(2)
                      deb = pdebut + longNom
                      fin = CCbGlob.premiereVirgule(ch, deb + 1)
                      tabcal[0] = CalcMatR.ccbmat(ch, ptListe, deb + 1, fin - 1, nomsVariablesFormelles, listeSource)
                      deb = fin + 1
                      fin = CCbGlob.parentheseFermanteApresVirgule(ch, deb)
                      tabcal[1] = CalcMatR.ccbmat(ch, ptListe, deb,
                        fin - 1, nomsVariablesFormelles, listeSource)
                      return new CTermMat(ptListe, tabcal[0], tabcal[1], ptVa.getValue())
                    } else {
                      return new CResultatValeur(ptListe, ptVa.getValue())
                    }
                  }
                }
              }
            } else {
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
                else {
                  return CalcMatR.ccbmat(ch, ptListe, pdebut + 1,
                    CCbGlob.parentheseFermante(ch, pdebut) - 1, nomsVariablesFormelles, listeSource)
                }
              } else {
                // Le résultat ne peut être que numérique}
                const chaineNombre = ch.substring(pdebut, pfin + 1)
                if (chaineNombre === '') throw new Error() // Spécial JavaScript
                if (Fonte.estDecimalCorrect(chaineNombre)) {
                  const f = parseFloat(chaineNombre)
                  if (isNaN(f)) throw new Error()
                  else return new CConstante(ptListe, f)
                } else return new CCbNull(chaineNombre)
              }
            }
          }
        }
      }
    }
  } catch (e) {
    // Amélioration version 4.7.4.1 : Même si l'expression est incorrecte, on remplace les * de multiplication par des \times
    // Supprimé version 4.9.3
    const ch1 = ch.substring(pdebut, pfin + 1)
    // Amélioration version 4.9.3
    if ((ch1.charAt(0) === '(') && (ch1.length >= 1)) { // Cas d'une parenthèse ouvrante non fermée
      return CalcMatR.ccbmat(ch, ptListe, pdebut + 1, pfin, nomsVariablesFormelles, listeSource)
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
 * @param {string[]} parametreFormel  Un tableau représentant les noms de la ou des variables formelles
 * d'une fonction de une ou plusieurs variables.
 * @returns {boolean} : true si la syntaxe est correcte, false sinon.
 */
function verifieSyntaxe (ptListe, ch,
  indiceErreur, indiceMaxiDansListe, parametreFormel) {
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
        ch.substring(pdebut), parametreFormel, ptVa, nomF, parametreTrouve, nombreVariables)
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
                    const n = (parametreFormel !== null) ? parametreFormel.length : 0
                    const parametreFormel2 = new Array(n + 1)
                    for (let j = 0; j < n; j++) parametreFormel2[j] = parametreFormel[j]
                    parametreFormel2[n] = nomVariableSommation
                    if (!CalcMatR.verifieSyntaxe(ptListe, chformuleASommer,
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
                  } else itemSuivant = CCbGlob.Valeur
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

const CalcMatR = {
  ccbmat,
  verifieSyntaxe
}

export default CalcMatR
