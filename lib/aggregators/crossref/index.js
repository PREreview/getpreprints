var path = require('path')

var pump = require('pump')
var pumpify = require('pumpify')
var through = require('through2')
var BatchStream = require('batch-stream')
var jsonstream = require('JSONStream')
var hyperdb = require('hyperdb')

// var indir = path.join(__dirname, '../../../sources/crossref')
var db = hyperdb('/root/hyperdb', { valueEncoding: 'json' })

var read = process.stdin
var parse = jsonstream.parse()
var filter = through.obj(preprintfilter)
var prepfordb = through.obj(wrapop)
var batch = new BatchStream({ size : 100 })
var write = db.createWriteStream()

var n = 0

function preprintfilter (batch, enc, next) {
  var pushifpreprint = item => {
    if (item.type === 'posted-content' && item.subtype === 'preprint') {
      this.push(item)
      n += 1
      if (n % 1000 === 0) {
        console.log(`Found ${n} preprints so far`)
      }
    }
  }

  batch.message.items.forEach(pushifpreprint)
  next()
}

function wrapop (data, enc, next) {
  var entry = {
    type: 'put',
    key: `/doi/${data.DOI}`,
    value: data
  }

  this.push(entry)
  next()
}

function done (err) {
  if (err) throw err
  console.log('END')
}

pump(read, pumpify(parse, filter, prepfordb, batch, write), done)
