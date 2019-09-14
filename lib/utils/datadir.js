var path = require('path')
var untildify = require('untildify')
var mkdirp = require('mkdirp')

module.exports = function getDataDir () {
  var datadir = untildify(path.join('~', '.getpreprints', 'data'))
  mkdirp(datadir)
  return datadir
}
