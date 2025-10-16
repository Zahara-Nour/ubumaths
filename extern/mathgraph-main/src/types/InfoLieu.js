/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
export default InfoLieu
/**
 * Classe contenant des informations sur un lieu de points.
 * @constructor
 * @param {number} nombreDePoints  Le nombre de points du lieu
 * @param {boolean} fermeOuNon  true si le lieu est déclaré comme fermé
 * @param {boolean} gestionDiscontinuite  true si une gestion auto des discontinuités du lieu est activée
 * @returns {InfoLieu}
 */
function InfoLieu (nombreDePoints, fermeOuNon, gestionDiscontinuite) {
  if (arguments.length === 1) { // Construction à partir d'un autre InfoLieu'
    this.nombreDePoints = arguments[0].nombreDePoints
    this.fermeOuNon = arguments[0].fermeOuNon
    this.gestionDiscontinuite = arguments[0].gestionDiscontinuite
  } else {
    this.nombreDePoints = nombreDePoints
    this.fermeOuNon = fermeOuNon
    this.gestionDiscontinuite = gestionDiscontinuite
  }
}
/**
 * Fait de this une copie de infoLieu
 * @param {InfoLieu} infoLieu
 * @returns {void}
 */
InfoLieu.prototype.setCopy = function (infoLieu) {
  this.nombreDePoints = infoLieu.nombreDePoints
  this.fermeOuNon = infoLieu.fermeOuNon
}
/**
 * Lit l'objet depuis un flux de données  binaire.
 * @param {DataInputStream} inps  le flux
 * @returns {void}
 */
InfoLieu.prototype.read = function (inps) {
  this.nombreDePoints = inps.readInt()
  this.fermeOuNon = inps.readBoolean()
  this.gestionDiscontinuite = inps.readBoolean()
}
/**
 * Enregistre l'objet dans un flux de données binaire.
 * @param {DataOutputStream} oups
 * @returns {void}
 */
InfoLieu.prototype.write = function (oups) {
  oups.writeInt(this.nombreDePoints)
  oups.writeBoolean(this.fermeOuNon)
  oups.writeBoolean(this.gestionDiscontinuite)
}
