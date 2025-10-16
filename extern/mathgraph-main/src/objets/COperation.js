/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import COperation from './COperationBase'
import Ope from '../types/Ope'
import CCbGlob from '../kernel/CCbGlob'
import CConstante from './CConstante'
import CMoinsUnaire from './CMoinsUnaire'

export default COperation

// On ajoute cette méthode dans un 2e temps, après la déclaration de cette classe sans cette méthode,
// pour les pbs de dépendances cycliques que pose cette méthode calculNormalise,
// qui instancie un objet CConstante, alors que CConstante.calculNormalise instancie du COperation

COperation.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac, eliminMult1 = true) {
  const liste = this.listeProprietaire
  const calcOperande1 = this.operande1.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  const calcOperande2 = this.operande2.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  const natop1 = calcOperande1.nature()
  const natop2 = calcOperande2.nature()
  let r
  if (this.ope === Ope.Moin) {
    // On remplace les a - 0 par a
    if (rempval) {
      if ((natop2 === CCbGlob.natConstante)) {
        if (calcOperande2.valeur === 0) {
          return calcOperande1
        }
      }
      // On remplace les 0 - a par - a ou par abs(a) si a est un moins unaire
      if ((natop1 === CCbGlob.natConstante)) {
        // CConstante resval = (CConstante) calcOperande1;
        if (calcOperande1.valeur === 0) {
          if (calcOperande2.nature() === CCbGlob.natMoinsUnaire) {
            return calcOperande2.operande
          }
          return new CMoinsUnaire(liste, calcOperande2)
        }
      }
      // On remplace a - (-b) par a + b
      if (natop2 === CCbGlob.natMoinsUnaire) {
        // CMoinsUnaire mun = (CMoinsUnaire) calcOperande2;
        // return new COperation(liste, calcOperande1, mun.operande, Ope.Plus); // Modifié version 4.7.2.5
        return new COperation(liste, calcOperande1, calcOperande2.operande, Ope.Plus).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
      }
    }
    // On remplace les a - b par a + (-b)
    if (sousdivnorm) {
      return new COperation(liste, calcOperande1, new CMoinsUnaire(liste, calcOperande2), Ope.Plus)
    }
    return new COperation(liste, calcOperande1, calcOperande2, Ope.Moin)
  }

  if (this.ope === Ope.Divi) {
    // Si on est en mode remplacement de valeurs et que le dénominateur est un résultat de valeur 1 on simplifie
    if (rempval) {
      if (natop2 === CCbGlob.natConstante) {
        if (calcOperande2.valeur === 1) {
          // Pour 1/1 on renvoie 1
          if (natop1 === CCbGlob.natConstante) {
            if (calcOperande1.valeur === 1) {
              return new CConstante(liste, 1)
            }
          }
          return calcOperande1
        }
      }
      // Si le numérateur est une constante qui vaut 1 on garde le quotient
      if (natop1 === CCbGlob.natConstante) {
        // CConstante resval = (CConstante) calcOperande1;
        r = calcOperande1.valeur
        if (r === 1) {
          if (calcOperande2.nature() === CCbGlob.natMoinsUnaire) {
            return new CMoinsUnaire(liste, new COperation(liste, new CConstante(liste, 1), calcOperande2.operande, Ope.Divi)
              .calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1))
          }
          return new COperation(liste, new CConstante(liste, 1), calcOperande2, Ope.Divi)
        }
        // S'il vaut 0 on renvoie un CResultatValeur contenant 0
        if (r === 0) {
          return new CConstante(liste, 0)
        }
      }

      // Si le numérateur ou le dénominateur sont des moins unaires on simplifie
      if (natop1 === CCbGlob.natMoinsUnaire) {
        // CMoinsUnaire mun1 = (CMoinsUnaire) calcOperande1;
        if (natop2 === CCbGlob.natMoinsUnaire) {
          // CMoinsUnaire mun2 = (CMoinsUnaire) calcOperande2;
          if (sousdivnorm) {
            return new COperation(
              liste,
              calcOperande1.operande,
              new COperation(liste, new CConstante(liste, 1), calcOperande2.operande, Ope.Divi),
              Ope.Mult
            ).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
          } else {
            return new COperation(
              liste,
              calcOperande1.operande,
              calcOperande2.operande,
              Ope.Divi
            ).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
          }
        }
        if (sousdivnorm) {
          return new CMoinsUnaire(
            liste,
            new COperation(
              liste,
              calcOperande1.operande,
              new COperation(
                liste,
                new CConstante(liste, 1),
                calcOperande2,
                Ope.Divi
              ),
              Ope.Mult
            )
          ).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
        } else {
          return new CMoinsUnaire(liste, new COperation(liste, calcOperande1.operande, calcOperande2,
            Ope.Divi).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1))
        }
      }
      if (natop2 === CCbGlob.natMoinsUnaire) {
        // CMoinsUnaire mun2 = (CMoinsUnaire) calcOperande2;
        if (sousdivnorm) {
          return new CMoinsUnaire(liste, new COperation(liste, calcOperande1,
            new COperation(liste, new CConstante(liste, 1),
              calcOperande2.operande, Ope.Divi), Ope.Mult)).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
        } else {
          return new CMoinsUnaire(liste, new COperation(liste, calcOperande1,
            calcOperande2.operande, Ope.Divi).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1))
        }
      }
    }
    // On remplace (-a)/b par - (a/b)
    // Si le numérateur ou le dénominateur sont des moins unaires on simplifie
    if (natop1 === CCbGlob.natMoinsUnaire) {
      // CMoinsUnaire mun1 = (CMoinsUnaire) calcOperande1;
      const natnum = calcOperande1.operande.nature()
      // Si le numérateur est une constante -1 on renvoie -(1/denominateur)
      if (natnum === CCbGlob.natConstante) {
        const c = calcOperande1.operande
        if (c.valeur === 1) {
          return new CMoinsUnaire(liste, new COperation(liste, new CConstante(liste, 1),
            calcOperande2, Ope.Divi))
        }
      }
      if (sousdivnorm) {
        return new CMoinsUnaire(liste, new COperation(liste, calcOperande1.operande,
          new COperation(liste, new CConstante(liste, 1),
            calcOperande2, Ope.Divi), Ope.Mult)).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
      } else {
        return new CMoinsUnaire(liste,
          new COperation(liste, calcOperande1.operande, calcOperande2, Ope.Divi)).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
      }
    }
    // Fin ajout version 4.7.2.5
    // On remplace a / b par a * (1/b) sauf si a est une constante à 1
    if (natop1 === CCbGlob.natConstante) {
      // CConstante cons = (CConstante) calcOperande1;
      if (calcOperande1.valeur === 1) return new COperation(liste, calcOperande1, calcOperande2, Ope.Divi)
    }
    // Si l'opérande de gauche est un produit dont un des facteurs est une constante 1
    // On le remplace par le facteur de gauche
    // La ligne suivante a été modifié version 6.4.7 en rajoutant le test rempval
    // car sinon, en mode non remplacement, (1*a²)/2 et a²/2 étaient considérés comme équivalents
    // Revu version 6.4.7 car avec cette modif, en mode non remplacement, par exemple 1/3*1/3*1/e^3
    // ne sera pas considéré comme équivalent après remplacement à 1/a*1/a*1/e^a avec a = 3.
    // Pour cette raison, si rempval est false, on remplacera pas seulement les produits avec un facteur 1 à
    // gauche
    /*
    if (rempval && (natop1 === CCbGlob.natOperation)) {
      // COperation op1 = (COperation) calcOperande1;
      if (calcOperande1.ope === Ope.Mult) {
        if (calcOperande1.operande1.nature() === CCbGlob.natConstante) {
          if (calcOperande1.operande1.valeur === 1) {
            return new COperation(liste, calcOperande1.operande2, calcOperande2,
              Ope.Divi).calculNormalise(rempval, sousdivnorm, rempDecParFrac, rempDecParFrac)
          }
        }
        if (calcOperande1.operande2.nature() === CCbGlob.natConstante) {
          if (calcOperande1.operande2.valeur === 1) {
            return new COperation(liste, calcOperande1.operande1, calcOperande2,
              Ope.Divi).calculNormalise(rempval, sousdivnorm, rempDecParFrac, rempDecParFrac)
          }
        }
      }
    }
     */
    if (natop1 === CCbGlob.natOperation) {
      if (calcOperande1.ope === Ope.Mult) {
        if (calcOperande1.operande1.nature() === CCbGlob.natConstante) {
          if (calcOperande1.operande1.valeur === 1) {
            return new COperation(liste, calcOperande1.operande2, calcOperande2,
              Ope.Divi).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
          }
        }
        if (calcOperande1.operande2.nature() === CCbGlob.natConstante) {
          if (calcOperande1.operande2.valeur === 1) {
            return new COperation(liste, calcOperande1.operande1, calcOperande2,
              Ope.Divi).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
          }
        }
      }
    }
    if (sousdivnorm) {
      return new COperation(liste, calcOperande1, new COperation(liste,
        new CConstante(liste, 1), calcOperande2, Ope.Divi), Ope.Mult)
    } else return new COperation(liste, calcOperande1, calcOperande2, Ope.Divi)
  }
  if (this.ope === Ope.Plus) {
    if (rempval) {
      if (natop1 === CCbGlob.natConstante) {
        if (calcOperande1.valeur === 0) return calcOperande2
      }
      if (natop2 === CCbGlob.natConstante) {
        if (calcOperande2.valeur === 0) return calcOperande1
      }
    }
    if (sousdivnorm) return new COperation(liste, calcOperande1, calcOperande2, Ope.Plus)
    else {
      // On remplace a + (-b) par a - b
      if (natop2 === CCbGlob.natMoinsUnaire) {
        // CMoinsUnaire mun2 = (CMoinsUnaire) calcOperande2;
        return new COperation(liste, calcOperande1, calcOperande2.operande, Ope.Moin).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
      }
    }
  }
  if (this.ope === Ope.Mult) {
    if (rempval) {
      // Il  faut faire "remonter" les moins unaires le plus haut possible
      if (natop1 === CCbGlob.natMoinsUnaire) {
        if (natop2 === CCbGlob.natMoinsUnaire) {
          return new COperation(liste, calcOperande1.operande, calcOperande2.operande,
            Ope.Mult).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
        } else {
          return new CMoinsUnaire(liste,
            new COperation(liste, calcOperande1.operande, calcOperande2,
              Ope.Mult).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
        } // Modifié version 6.3.4
      } else {
        if (natop2 === CCbGlob.natMoinsUnaire) {
          return new CMoinsUnaire(liste, new COperation(liste, calcOperande1,
            calcOperande2.operande, Ope.Mult).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1) // Modifié version 6.3.4;
        }
      }
      if (natop1 === CCbGlob.natConstante) {
        r = calcOperande1.valeur
        // Modification version 7.7.0 : on n'élimine les rultiplications par 1 que si rempval est true ET eliminMult1 est true
        if (r === 1) {
          if (eliminMult1) {
            return calcOperande2
          }
          return new COperation(liste, calcOperande1, calcOperande2, Ope.Mult)
        }
        if (r === 0) return new CConstante(liste, 0)
      }
      if (natop2 === CCbGlob.natConstante) {
        // Modification version 7.7.0 : on n'élimine les rultiplications par 1 que si rempval est true ET eliminMult1 est true
        r = calcOperande2.valeur
        if (r === 1) {
          if (eliminMult1) return calcOperande1
          return new COperation(liste, calcOperande1, calcOperande2, Ope.Mult)
        }
        if (r === 0) return new CConstante(liste, 0)
      }
      return new COperation(liste, calcOperande1, calcOperande2, Ope.Mult)
    } else {
      if (natop1 === CCbGlob.natMoinsUnaire) {
        const oper1 = calcOperande1.operande
        const natoper1 = oper1.nature()
        if (natoper1 === CCbGlob.natOperation) {
          if (oper1.ope === Ope.Mult) {
            const calc1 = oper1.operande1
            const calc2 = oper1.operande2
            // Lignes suivantes modifiées version 6.3.4 pour accepter par exemple ((-3)/(x+1))*x au lieu de -((3/(x+1))*x)
            if (calc1.nature() === CCbGlob.natConstante) {
              if (calc2.nature() === CCbGlob.natOperation && calc2.ope === Ope.Divi) {
                return new CMoinsUnaire(liste, new COperation(liste, oper1, calcOperande2, Ope.Mult)).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
              }
            }
          } else { // Cas des -1/constante
            if (oper1.ope === Ope.Divi) {
              if (oper1.operande1.nature() === CCbGlob.natConstante && oper1.operande1.valeur === 1 &&
                oper1.operande2.nature() === CCbGlob.natConstante) { return new CMoinsUnaire(liste, new COperation(liste, oper1, calcOperande2, Ope.Mult)) }
            }
          }
        }
      }
    }
  }
  // Autres cas . Rien  à simplifier et on simplifie seulement les opérandes.
  return new COperation(liste, calcOperande1, calcOperande2, this.ope)
}
