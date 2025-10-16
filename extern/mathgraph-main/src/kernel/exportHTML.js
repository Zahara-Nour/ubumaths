const exportHTML = {
  text: '<!DOCTYPE html>\n' +
    '<html>\n' +
  '  <head>\n' +
  '\t<meta http-equiv="X-UA-Compatible" content="IE=9">\n' +
  '    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n' +
  '\t<meta name="generator" content="MathGraph32" /> <title></title>\n' +
  '</head>\n' +
  '<body>\n' +
  '\t<h2 align="center" class="Style1">*title</h2>\n' +
  '\t<p>*texte1</p>\n' +
  '\t<div id = "mtg32">\n' +
  // '    <svg id ="mtg32svg" *width= *height= xmlns="http://www.w3.org/2000/svg">\n' +
  // '    </svg>\n' +
  '\t</div>\n' +
  '\t<p>*texte2</p>\n' +
  '\t<p><span style="font-size:small">*auteur, *creeAvec <a href="https://www.mathgraph32.org/" target="_blank" >MathGraph32</a></span></p>\n' +
  '\t<script type="text/javascript" src="https://www.mathgraph32.org/js/mtgLoad/mtgLoad.min.js"></script>\n' +
  '\t<script type="application/javascript">' +
  '\n' +
  '\t (function autostart() {' +
  '\n' +
  '\t var svgOptions = {' +
  '\n\t\t idSvg: "mtg32svg", width : "*width", height : "*height"' +
  '\n\t }\n' +
  '\n' +
  '\t var mtgOptions = {\n' +
  '\t\t fig: "*figureData",' +
  '\n\t\t isEditable: false' +
  '\n\t }\n' +
  '\n\t mtgLoad("mtg32", svgOptions, mtgOptions, function (error, mtgAppPlayer) {' +
  '\n\t\t if (error) return console.error(error)' +
  '\n\t\t console.log("mtg32 player loaded", mtgAppPlayer)' +
  '\n\t })' +
  '\n\t })()' +
  '\n\t</script>\n' +
  '  </body>\n' +
  '</html>'
}

export default exportHTML
