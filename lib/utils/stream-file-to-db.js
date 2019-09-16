var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')

var getDataDir = require('./datadir')

var pump = require('pump')
var pumpify = require('pumpify')
var through = require('through2')
var jsonstream = require('JSONStream')
var BatchStream = require('batch-stream')
var hyperdb = require('hyperdb')

var outdir = path.join(getDataDir(), 'database')
mkdirp(outdir)

var dbpath = path.join(outdir, 'preprints.hyper.db')
var db = hyperdb(dbpath, { valueEncoding: 'json' })

// opts:
// .infile (text file, one JSON entry per line)
// .identifiername (e.g. 'doi')
// .transform (optional, function to transform entry objects)
// .cb (optional, callback function called once import is complete)
module.exports = function (opts) {
  db.put('/check', {
    created: Date.now(),
    name: 'getpreprints metadata export'
  }, err => {
    if (err) throw err
    db.get('/check', (err, nodes) => {
      if (err) throw err

      var result = nodes[0]
      var created = new Date(result.value.created)
      console.log('Database check passed.', `Database "${result.value.name}" created at ${created}.`)
    })
  })
  
  var read = fs.createReadStream(opts.infile)
  var parse = jsonstream.parse()
  var convert = through.obj(converter)
  var prepfordb = through.obj(wrapop)
  var batch = new BatchStream({ size : 500 })
  var check = through.obj(checkop)
  var write = db.createWriteStream()
  
  var done = err => {
    if (opts.cb) {
      opts.cb(err, db)
    } else {
      if (err) throw err
      console.log('Finished populating hyperDB :)')  
    }
  }
  
  function checkop (data, enc, next) {
    // console.log(data)
    this.push(data)
    next()
  }
  
  function wrapop (data, enc, next) {
    var entry = {
      type: 'put',
      key: `/${opts.identifiername}/${data[opts.identifiername]}`,
      value: data
    }
  
    this.push(entry)
    next()
  }
  
  function converter (data , enc, next) {
    var entry = opts.transform ? opts.transform(data) : data
    if (entry) this.push(entry)
    next()
  }
  
  return pump(read, pumpify(parse, convert, prepfordb, batch, check, write), done)
}

