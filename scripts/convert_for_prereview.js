var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')

var pumpify = require('pumpify')
var through = require('through2')
var jsonstream = require('JSONStream')
var BatchStream = require('batch-stream')
var hyperdb = require('hyperdb')

var outdir = path.join('~', '.prereview', 'data')
var indir = path.join(__dirname, '../sources/2019-07-02')

mkdirp(outdir)

var dbpath = path.join(outdir, 'preprints.hyper.db')
var db = hyperdb(dboath)

var eupmcfile = path.join(indir, 'eupmc/preprints_stream.json.txt')

var read = fs.createReadStream(eupmcfile)
var convert = through2.obj(converter)
var batch = new BatchStream({ size : 500 })
var write = db.createWriteStream

function converter (data , enc, next) {
  var entry = {
    doi: data.doi,
    title: data.title,
    abstract: data.abstract,
    source: 'EuropePMC',
    publisher: null,
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