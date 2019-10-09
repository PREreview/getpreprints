var path = require('path')
var fs = require('fs')

var pump = require('pump')
var hyperdb = require('hyperdb')
var to = require('flush-write-stream')

var dbpath = path.join(__dirname, '../../../hyperdb')
var db = hyperdb(dbpath, { valueEncoding: 'json' })

var read = db.createReadStream()
var collate = to.obj(collater)

var prefixes = {}

function collater (nodes, enc, next) {
  var doc = nodes[0].value
  var doi = doc.DOI
  var prefix = doi.split('/')[0]
  if (!prefixes[prefix]) {
    prefixes[prefix] = true
    var server = doc['group-title'] || doc.publisher
    console.log(`${server} (${doc.publisher})`)
  }
  next()
}

function done (err) {
  if (err) throw err
  fs.writeFileSync('./prefixes.json', JSON.stringify(Object.keys(prefixes)))
  console.log('END')
}

pump(read, collate, done)
