var path = require('path')

var streamToDb = require('../../lib/utils/stream-db-to-db')

var hyperdb = require('hyperdb')
var sourcedb = hyperdb('/home/rik/c/prereview/hyperdb', { valueEncoding: 'json' })

var publishersToSkip = [
  'Test accounts',
  'Some crazy made up group title'
]


streamToDb({
  sourcedb: sourcedb,
  identifiername: 'doi',
  transform: transform,
  cb: cb
})

function cb (err, db) {
  if (err) throw err
  console.log('Finished populating hyperDB :)')

  // db.createReadStream().on('data', d => console.log(d))

  db.get('doi/10.31220/osf.io/ae8np', (err, node) => {
    if (err) throw err
    console.log(node)
  })
}

function transform (data) {
  var doc = data[0].value
  var publisher = doc['group-title'] || doc.publisher

  if (publishersToSkip.indexOf(publisher) > -1) return

  if (!doc.author) return

  var authors = doc.author.map(a => {
    return {
      orcid: a.ORCID,
      fullName: a.given + ' ' + a.family,
      firstName: a.given,
      lastName: a.family
    }
  })

  var d = {
    doi: doc.DOI,
    title: doc.title[0],
    abstract: doc.abstract,
    source: 'CrossRef',
    publisher: publisher,
    authors: authors,
    date_created: new Date(doc.created.timestamp).toISOString(),
    date_published: new Date(doc.created.timestamp).toISOString(),
    date_indexed: new Date(Date.now()).toISOString(),
    authorstring: authors.map(
      a => a.fullName.trim()
    ).join(' '),
    license: doc.license
  }

  return d
}
