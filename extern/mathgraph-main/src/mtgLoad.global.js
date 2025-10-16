/*!
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 * @version 9.4.0
 */

// Ce fichier sert simplement à mettre mtgLoad dans window.mtgLoad, pour le build de prod
import mtgLoad from 'src/mtgLoad'

window.mtgLoad = mtgLoad
