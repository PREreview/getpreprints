var ftp = require('../../../adapters/ftp')
var path = require('path')

var getDataDir = require('../../../utils/datadir')
var mkdirp = require('mkdirp')

var fs = require('fs')
var pump = require('pump')

var archivesDir = path.join(getDataDir(), 'archives', 'europepmc')
mkdirp(archivesDir)

var FTP_SERVER = 'ftp.ebi.ac.uk'
var DUMP_DIR_PATH = '/pub/databases/pmc/preprint_abstracts/'

var getNewest = arr => arr.sort((a, b) => ((new Date(b.date)) - (new Date(a.date))))[0]
var isArchive = filename => filename.startsWith('Preprint') && filename.endsWith('.gz')
var isXml = filename => filename.startsWith('Preprint') && filename.endsWith('.xml')

module.exports = {
  downloadLatestDump,
  extractLatestDump,
  parseDump,
  parseJsonDump
}

// connects to the EuropePMC FTP server
// finds the most recent archive of the PREPRINTS subset
// downloads it to a stable EuropePMC archives directory
// i.e. (~/.getpreprints/data/archives/europepmc)
// returns a promise that resolves with the path to the downloaded archive on the filesystem
// the file is a gzipped XML document
function downloadLatestDump () {

  var ftpserver = ftp()

  var latest
  
  return ftpserver.connect({
    host: FTP_SERVER
  }).then(
    servermsg => ftpserver.list(DUMP_DIR_PATH)
  ).then(
    list => {
      var archives = list.filter(a => isArchive(a.name))

      latest = (archives.length === 1) ?
        archives[0] :
        getNewest(archives)

      return ftpserver.get(DUMP_DIR_PATH + latest.name)
    }
  ).then(
    dlstream => {
      var outpath = path.join(archivesDir, latest.name)
      var writestream = fs.createWriteStream(outpath)

      return new Promise(function(resolve, reject) {
        pump(dlstream, writestream, err => {
          ftpserver.end()
          if (err) reject(err)
          console.log('woohoo we got it')
          resolve(outpath)
        })
      })
    }
  )
}

function findLatestLocalDump () {
  var archives = fs.readdirSync(archivesDir)
    .filter(isXml)
    .map(filename => ({ path: path.join(archivesDir, filename) }))
    .map(archive => {
      var stat = fs.statSync(archive.path)
      archive.date = new Date(stat.mtime)
      return archive
    })

  if (archives.length === 0) return null

  return getNewest(archives)
}

function parseLatestDump () {
  var latest = findLatestLocalDump()

  if (!latest) throw new Error('There are no local dumps to extract')

  
}

extractLatestDump()

function parseDump () {

}

function parseJsonDump (filename) {

}