#!/usr/bin/env node
var program = require('commander')
var fs = require('fs')
var log = require('winston')
var biorxiv = require('../lib/adapters/biorxiv')
var loglevels = require('../lib/loglevels')
var mkdirp = require('mkdirp')
var pjson = require('../package.json')

program
  .version(pjson.version)
  .option('-q, --query <query>',
    'search query (required)')
  .option('-o, --outdir <path>',
    'output directory (required - will be created if ' +
    'not found)')
  // .option('--provider <name>',
  //   'Preprint provider to search [biorxiv] (default: biorxiv)')
  .option('-l, --loglevel <level>',
    'amount of information to log ' +
    '(silent, verbose, info*, data, warn, error, or debug)',
    'info')
  .option('-n, --noexecute',
    "report how many results match the query, but don't actually " +
    'download anything')
  .option('-f, --logfile <filename>',
    'save log to specified file in output directory as well as printing to terminal')
  .option('-k, --limit <int>',
    'limit the number of hits and downloads')
  .option('--filter <filter object>',
    'filter by key value pair, passed straight to the crossref api only')
  .option('-r, --restart',
    'restart file downloads after failure')
  .parse(process.argv)

if (!process.argv.slice(2).length) {
  program.help()
}

if (!program.api) {
  program.api = 'eupmc'
}

// set up logging
var allowedlevels = Object.keys(loglevels.levels)
if (allowedlevels.indexOf(program.loglevel) === -1) {
  console.error('Loglevel must be one of: ',
    'quiet, verbose, data, info, warn, error, debug')
  process.exit(1)
}

log.addColors(loglevels.colors)

log.add(new log.transports.Console({
  level: program.loglevel,
  levels: loglevels.levels,
  colorize: true
}))

if (program.hasOwnProperty('logfile')) {
  var logstream = fs.createWriteStream(program.logfile.toString())
  log.add(log.transports.File, {
    stream: logstream,
    level: 'debug'
  })
  log.info('Saving logs to ./' + program.logfile)
}

// check arguments
if (typeof program.query === 'undefined') {
  log.error('No query given. ' +
    'You must provide the --query argument.')
  process.exit(1)
}

// log.info('Searching using ' + program.provider + ' provider')

// run
var options = {}
options.restart = program.restart
options.hitlimit = parseInt(program.limit)
options.noexecute = program.noexecute
options.filter = program.filter

if (options.noexecute) {
  log.info('Running in no-execute mode, so nothing will be downloaded')
} else {
  if (!program.outdir) {
    log.error('No output directory given. ' +
      'You must provide the --outdir argument.')
    process.exit(1)
  }
  mkdirp.sync(program.outdir)
  process.chdir(program.outdir)
}

// var Chosenapi = api(program.api)
var searchapi = biorxiv(options)
searchapi.search(program.query)