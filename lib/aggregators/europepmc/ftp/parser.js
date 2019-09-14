var fs = require('fs')
var convert = require('xml-js')

module.exports = parse

function parse (filepath) {
  var xml = fs.readFileSync(filepath)

  var result = convert.xml2js(xml, {
    ignoreComment: true,
    compact: true,
    trim: true
  })

  console.log(Object.keys(convert))
}

parse('/home/rik/.getpreprints/data/archives/europepmc/PreprintAbstractsXML_201908.xml')