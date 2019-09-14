var path = require('path')

var doiToPublisher = require('../lib/utils/doi-to-publisher')
// to generate this file download the gzipped archive
// then gunzip it, remove the first and last line,
// and use `xml-json archive.xml article > archive.json` 
var eupmcfile = '/home/rik/.getpreprints/data/archives/europepmc/PreprintAbstractsXML_201908.json'

var streamToDb = require('../lib/utils/stream-to-db')

streamToDb({
  infile: eupmcfile,
  identifiername: 'doi',
  transform: transform,
  cb: cb
})

function cb (err, db) {
  if (err) throw err
  console.log('Finished populating hyperDB :)')

  // db.createReadStream().on('data', d => console.log(d))

  db.get('doi/10.26434/chemrxiv.9722576', (err, node) => {
    if (err) throw err
    console.log(node)
  })
}

function transform (data) {
  var hasauthors = data.authorList && data.authorList.author
  var authors = hasauthors ? data.authorList.author : []

  if (!Array.isArray(authors)) {
    // a sole author is not contained in an array
    authors = [authors]
  }

  authors = authors.map(a => {
    a.orcid = (a.authorId && a.authorId._) ? a.authorId._ : null
    delete a.authorId
    return a
  })

  return {
    doi: data.doi,
    title: data.title,
    abstract: data.abstract,
    source: 'EuropePMC',
    publisher: data.bookOrReportDetails.publisher,
    authors: authors,
    date_created: new Date(data.dateOfCreation),
    date_published: new Date(data.firstPublicationDate),
    date_indexed: new Date(Date.now()),
    authorstring: authors.map(
      a => `${a.firstName || ''} ${a.lastName || ''}`.trim()
    ).join(' '),
  }
}
