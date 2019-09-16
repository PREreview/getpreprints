var path = require('path')

var hyperdb = require('hyperdb')
var datadir = require('./datadir')()

var dbpath = path.join(datadir, 'database', 'preprints.hyper.db')
var dbopts = { valueEncoding: 'json' }

module.exports = hyperdb(dbpath, dbopts)
