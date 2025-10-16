/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
/**
 * @typedef TikzColor
 * @type {Object}
 */
const TikzColor = {
  colorString: function (col) {
    const r = col.getRed()
    const g = col.getGreen()
    const b = col.getBlue()
    let rs = r.toString(16)
    if (rs.length === 1) rs = '0' + rs
    let gs = g.toString(16)
    if (gs.length === 1) gs = '0' + gs
    let bs = b.toString(16)
    if (bs.length === 1) bs = '0' + bs

    const ch = rs + gs + bs
    let ch2 = ''
    for (let i = 0; i < 6; i++) {
      const car = ch.charAt(i)
      // var code = (int)car;
      let code = car.charCodeAt(0)
      if ((code >= 48) && (code <= 57)) code += 56
      ch2 += String.fromCharCode(code)
    }
    return ch2
  },
  containsColor: function (vect, col) {
    for (let i = 0; i < vect.length; i++) {
      if (vect[i] === TikzColor.colorString(col)) return true
    }
    return false
  }
}

export default TikzColor
