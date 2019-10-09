var pump = require('pump')
var pumpify = require('pumpify')
var through = require('through2')
var BatchStream = require('batch-stream')

var db = require('./local-db')

// opts:
// .infile (text file, one JSON entry per line)
// .identifiername (e.g. 'doi')
// .transform (optional, function to transform entry objects)
// .cb (optional, callback function called once import is complete)
module.exports = function (opts) {
  var read = opts.sourcedb.createReadStream()
  var convert = through.obj(converter)
  var prepfordb = through.obj(wrapop)
  var batch = new BatchStream({ size : 200000 })
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
    setImmediate(() => this.push(data))
    process.nextTick(next)
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
  
  return pump(read, pumpify(convert, prepfordb, batch, check, write), done)
}

