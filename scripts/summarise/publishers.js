var path = require('path')
var fs = require('fs')

var pump = require('pump')
var db = require('../../lib/utils/local-db')
var to = require('flush-write-stream')

var read = db.createReadStream()
var collate = to.obj(collater)

function collater (nodes, enc, next) {
  var doc = nodes[0].value
  console.log(doc.publisher)
  return next()
}

function done (err) {
  if (err) throw err
  console.log('END')
}

pump(read, collate, done)
