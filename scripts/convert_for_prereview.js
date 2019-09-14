var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')

var doiToPublisher = require('../lib/utils/doi-to-publisher')

var pump = require('pump')
var through = require('through2')
var jsonstream = require('JSONStream')
var BatchStream = require('batch-stream')
var hyperdb = require('hyperdb')

var outdir = path.join('~', '.getpreprints', 'data')
var indir = path.join(__dirname, '../sources/2019-07-02')

mkdirp(outdir)

var dbpath = path.join(outdir, 'preprints.hyper.db')
var db = hyperdb(dboath)

var eupmcfile = path.join(indir, 'eupmc/preprints_stream.json.txt')

var read = fs.createReadStream(eupmcfile)
var parse = jsonstream.parse()
var convert = through.obj(converter)
var prepfordb = through.obj(wrapop)
var batch = new BatchStream({ size : 500 })
var write = db.createWriteStream()

function wrapop (data, enc, next) {
  var entry = {
    type: 'put',
    key: data.doi,
    value: data
  }

  this.push(entry)
  next()
}

function converter (data , enc, next) {
  var entry = {
    doi: data.doi,
    title: data.title,
    abstract: data.abstract,
    source: 'EuropePMC',
    publisher: doiToPublisher(data.doi),
    authors: data.authors || [],
    date_created: date.created,
    date_published: date.published,
    date_indexed: date.indexed,
    authorstring: (data.authors || []).map(
      a => `${a.firstname} ${a.lastname}`
    ).join(' '),
  }

  this.push(entry)
  next()
}

pump(read, parse, convert, prepfordb, batch, write)
