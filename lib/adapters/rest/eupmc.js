var fs = require('fs')
var chalk = require('chalk')
var got = require('got')
var mkdirp = require('mkdirp')
var _ = require('lodash')
var ProgressBar = require('progress')
var requestretry = require('requestretry')
var glob = require('matched')
var vc = require('version_compare')
var log = require('winston')

var config = require('../../config')
var urlDl = require('../../download')

var EuPMCVersion = '6.0.3'
var defaultquery = '(SRC:"PPR")'

var EuPmc = function (opts) {
  var eupmc = this
  this.baseurl = 'https://www.ebi.ac.uk/' +
                 'europepmc/webservices/rest/search?'
  this.opts = opts || {}
  eupmc.first = true
  eupmc.hitlimit = eupmc.opts.hitlimit ? eupmc.opts.hitlimit : 0
  eupmc.hitcount = 0
  eupmc.residualhits = 0 
  eupmc.allresults = []
  eupmc.nextCursorMark = '*' // we always get back the first page
  eupmc.pagesize = '1000'
  eupmc.unfilledPage = false
  eupmc.format = 'json'
}

EuPmc.prototype.search = function (query) {
  var eupmc = this

  var options = { resulttype: 'core', pageSize: eupmc.pagesize, format: eupmc.format }
  eupmc.queryurl = eupmc.buildQuery(query, options)

  if (eupmc.opts.restart) {
    fs.readFile('eupmc_results.json', (err, data) => {
      if ((err) && (err.code === 'ENOENT')) {
        log.error('No existing download to restart')
        process.exit(1)
      } else if (err) {
        throw err
      } else {
        log.info('Restarting previous download')
        eupmc.allresults = JSON.parse(data)
        eupmc.addDlTasks()
      }
    })
  } else {
    eupmc.pageQuery()
  }
}

EuPmc.prototype.testApi = function (version) {
  if (!vc.matches(version, EuPMCVersion)) {
    log.warn('This version of getpreprints wasn\'t built with this version of the EuPMC api in mind')
    log.warn(`getpreprints EuPMCVersion: ${EuPMCVersion} vs. ${version} reported by api`)
  }
}

EuPmc.prototype.pageQuery = function () {
  var eupmc = this

  var thisQueryUrl = eupmc.queryurl + ''

  var pageterm = '&cursorMark=' + eupmc.nextCursorMark
  thisQueryUrl += pageterm

  log.debug(thisQueryUrl)

  var retryOnHTTPNetOrEuPMCFailure = function (err, response, body) {
    return requestretry.RetryStrategies.HTTPOrNetworkError(err, response, body)
  }

  var rq = requestretry.get({url: thisQueryUrl,
    maxAttempts: 10,
    retryStrategy: retryOnHTTPNetOrEuPMCFailure,
    headers: {'User-Agent': config.userAgent}
  })
  var handleRequestResponse = function (data) {
    if (data.attempts > 1) {
      log.warn('We had to retry the last request ' + data.attempts + ' times.')
    }
    var cb = eupmc.completeCallback.bind(eupmc, JSON.parse(data.body))
    cb()
  //   convertXML2JSON(data)
  // }
  // var convertXML2JSON = function (data) {
  //   parseString(data.body, function (err, datum) {
  //     if (err) throw err
  //     var cb = eupmc.completeCallback.bind(eupmc, datum)
  //     cb()
  //   })
  }
  rq.then(handleRequestResponse)
  rq.on('timeout', eupmc.timeoutCallback)
}

EuPmc.prototype.completeCallback = function (resp) {
  var eupmc = this

  if (!resp.hitCount || !resp.resultList.result) {
    log.error('Malformed or empty response from EuropePMC. Try running again. Perhaps your query is wrong.')
    process.exit(1)
  }

  if (eupmc.first) {
    eupmc.first = false
    eupmc.hitcount = parseInt(resp.hitCount)
    log.info('Found ' + eupmc.hitcount + ' results')

    eupmc.testApi(resp.version)

    if (eupmc.hitcount === 0 || eupmc.opts.noexecute) {
      process.exit(0)
    }

    // set hitlimit
    if (eupmc.hitlimit && eupmc.hitlimit < eupmc.hitcount) {
      log.info('Limiting to ' + eupmc.hitlimit + ' hits')
    } else { eupmc.hitlimit = eupmc.hitcount }

    // create progress bar
    var progmsg = 'Retrieving results [:bar] :percent' +
                  ' (eta :etas)'
    var progopts = {
      total: eupmc.hitlimit,
      width: 30,
      complete: chalk.green('=')
    }
    eupmc.pageprogress = new ProgressBar(progmsg, progopts)
  }
  var result
  if (eupmc.residualhits) {
    result = resp.resultList.result.slice(0, eupmc.residualhits)
  } else {
    result = resp.resultList.result
    // if less results in this page than page count (and we were expecting an entire page)
    // EuPMC has been lying and we shouldn't keep searching for more results
    if (result.length < eupmc.pagesize) eupmc.unfilledPage = true
  }
  log.debug('In this batch got: ' + result.length + ' results')
  eupmc.allresults = eupmc.allresults.concat(result)
  eupmc.pageprogress.tick(result.length)

  if (eupmc.allresults.length < eupmc.hitlimit) { // we still have more results to get
    if (eupmc.unfilledPage) { // but the last page wasn't full then something is wrong
      log.info('EuPMC gave us the wrong hitcount. We\'ve already found all the results')
      eupmc.handleSearchResults(eupmc)
      return
    }
    if (eupmc.hitlimit - eupmc.allresults.length < eupmc.pagesize) {
      eupmc.residualhits = eupmc.hitlimit - eupmc.allresults.length
    }
    eupmc.nextCursorMark = resp.nextCursorMark[0]
    eupmc.pageQuery()
  } else {
    log.info('Done collecting results')
    eupmc.handleSearchResults(eupmc)
  }
}

EuPmc.prototype.timeoutCallback = function (ms) {
  var eupmc = this
  log.error('Did not get a response from Europe PMC within ' + ms + 'ms')
  if (eupmc.allresults) {
    log.info('Handling the limited number of search results we got.')
    log.warn('The metadata download did not finish so you *will* be missing some results')
    eupmc.handleSearchResults(eupmc)
  }
}

EuPmc.prototype.buildQuery = function (query, options) {
  var eupmc = this

  var queryurl = eupmc.baseurl + 'query=' + defaultquery + ' AND ' + encodeURIComponent(query)
  Object.keys(options).forEach(function (key) {
    var val = options[key]
    if (key.length > 0) {
      queryurl += '&' + key + '=' + val
    }
  })
  return queryurl
}

EuPmc.prototype.formatResult = function (result) {
  return result.authorString +
  ' (' + result.pubYear + '). ' +
  result.title + ' https://doi.org/' + result.DOI
}

EuPmc.prototype.handleSearchResults = function (eupmc) {
  // see how many results were unique
  var originalLength = eupmc.allresults.length
  eupmc.allresults = _.uniq(eupmc.allresults, function (x) {
    return eupmc.getIdentifier(x).id
  })
  if (eupmc.allresults.length < originalLength) {
    log.info('Duplicate records found: ' +
             eupmc.allresults.length +
             ' unique results identified')
  }

  if (eupmc.allresults.length > eupmc.hitlimit) {
    eupmc.allresults = eupmc.allresults.slice(0, eupmc.hitlimit)
    log.info('limiting hits')
  }

  // write the full result set to a file
  log.info('Saving result metadata')
  var pretty = JSON.stringify(eupmc.allresults, null, 2)
  fs.writeFileSync('eupmc_results.json', pretty)
  var resultsFilename = chalk.blue('eupmc_results.json')
  log.info('Full EUPMC result metadata written to ' + resultsFilename)

  // write individual results to their respective directories
  eupmc.allresults.forEach(function (result) {
    eupmc.writeRecord(result, eupmc)
  })
  log.info('Individual EUPMC result metadata records written')

  // write only the url list to file
  log.info('Extracting fulltext HTML URL list (may not be available for all articles)')
  var urls = eupmc.allresults
    .map(eupmc.getFulltextHTMLUrl, eupmc)
    .filter(function (x) { return !(x === null) })

  if (urls.length > 0) {
    fs.writeFileSync(
      'eupmc_fulltext_html_urls.txt',
      urls.concat(['\n']).join('\n')
    )
    var urlFilename = chalk.blue('eupmc_fulltext_html_urls.txt')
    log.info('Fulltext HTML URL list written to ' + urlFilename)
  }

  eupmc.addDlTasks()
}

EuPmc.prototype.downloadUrls = function (urls, type, rename, failed,
  cb, thisArg, fourohfour) {
  // setup progress bar
  var progmsg = 'Downloading files [:bar] :percent' +
                ' (:current/:total) [:elapseds elapsed, eta :eta]'
  var progopts = {
    total: urls.length,
    width: 30,
    complete: chalk.green('=')
  }
  var dlprogress = new ProgressBar(progmsg, progopts)

  urls.forEach(function (urlId) {
    var url = urlId[0]
    var id = urlId[1]
    var base = id + '/'
    log.debug('Creating directory: ' + base)
    mkdirp.sync(base)
    log.debug('Downloading ' + type + ': ' + url)
    var options = {
      timeout: 15000,
      encoding: null
    }
    got(url, options, function (err, data, res) {
      dlprogress.tick()
      if (err) {
        if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
          log.warn('Download timed out for URL ' + url)
        }
        if (!res) {
          failed.push(url)
        } else if ((res.statusCode === 404) && !(fourohfour === null)) {
          fourohfour()
        } else {
          failed.push(url)
        }
        cb()
      } else {
        fs.writeFile(base + rename, data, cb)
      }
    })
  })
}

EuPmc.prototype.getIdentifier = function (result) {
  var types = ['pmcid', 'doi', 'pmid', 'title']
  for (var i = 0; i < types.length; i++) {
    var type = types[i]
    if (result.hasOwnProperty(type) && result[type].length > 0) {
      return {
        type: type,
        id: result[type][0]
      }
    }
  }

  return {
    type: 'error',
    id: 'unknown ID'
  }
}

EuPmc.prototype.urlQueueBuilder = function (urls, type, rename) {
  return urls.map(function (urlId) {
    return { url: urlId[0], id: urlId[1], type: type, rename: rename }
  })
}

EuPmc.prototype.writeRecord = function (record, eupmc) {
  var json = JSON.stringify(record, null, 2)
  var id = eupmc.getIdentifier(record).id
  mkdirp.sync(id)
  fs.writeFileSync(id + '/eupmc_result.json', json)
}

module.exports = EuPmc