/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CImplementationProto from '../objets/CImplementationProto'
import CElementBase from '../objets/CElementBase'
import { getStr } from '../kernel/kernel'

export default CImplementationProto

CImplementationProto.prototype.info = function () {
  return getStr('Const') + ' ' + this.nomProto
}

CImplementationProto.prototype.infoHist = function () {
  return getStr('chinfo138') + '\n' + this.nomProto
}

CImplementationProto.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CElementBase.prototype.depDe4Rec.call(this, p) ||
    this.listeSources.depDe4Rec(p))
}

CImplementationProto.prototype.dernierObjetFinal = function () {
  const ind = this.listeProprietaire.indexOf(this)
  return this.listeProprietaire.get(ind + this.nbIntermediaires + this.nbFinaux)
}

/**
 * Fonction renvoyant le premier objet ce cette implémentation de prototype qui n'est pas un objet final
 * et qui est de nature nat
 * @param nat
 */
CImplementationProto.prototype.premierFinal = function (nat) {
  const list = this.listeProprietaire
  for (let i = 1; i <= this.nbFinaux + this.nbIntermediaires; i++) {
    const el = list.get(this.index + i)
    if (!el.estElementIntermediaire() && el.estDeNature(nat)) return el
  }
  return null
}

// Ajout version 5.4
/**
 * Fonction renvoyant le premier objet ce cette implémentation de prototype à partir de la fin qui n'est pas un objet finel
 * et qui est de nature nat
 * @param nat
 */
CImplementationProto.prototype.dernierFinal = function (nat) {
  const list = this.listeProprietaire
  for (let i = this.nbFinaux + this.nbIntermediaires; i > 0; i--) {
    const el = list.get(this.index + i)
    if (!el.estElementIntermediaire() && el.estDeNature(nat)) return el
  }
  return null
}
