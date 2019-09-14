var path = require('path')

var doiToPublisher = require('../lib/utils/doi-to-publisher')
var indir = path.join(__dirname, '../sources/2019-07-02')
var eupmcfile = path.join(indir, 'eupmc/preprints_stream.json.txt')

var streamToDb = require('../lib/utils/stream-to-db')

streamToDb({
  infile: eupmcfile,
  identifiername: 'doi',
  transform: transform,
  cb: cb
})

function cb (err) {
  if (err) throw err
  console.log('Finished populating hyperDB :)')

  // db.createReadStream().on('data', d => console.log(d))

  db.get('doi/10.26434/chemrxiv.8285594', (err, node) => {
    if (err) throw err
    console.log(node)
  })
}

function transform (data) {
  var authors = (data.authors || []).map(
    a => {
      return {
        fullName: (a.fullName || [null])[0],
        firstName: (a.firstName || [null])[0],
        lastName: (a.lastName || [null])[0],
        initials: (a.initials || [null])[0],
        orcid: (a.authorId ? a.authorId._ : null)
      }
    }
  )

  return {
    doi: data.doi,
    title: data.title,
    abstract: data.abstract,
    source: 'EuropePMC',
    publisher: doiToPublisher(data.doi),
    authors: authors,
    date_created: data.date.created,
    date_published: data.date.published,
    date_indexed: data.date.indexed,
    authorstring: authors.map(
      a => `${a.firstName || ''} ${a.lastName || ''}`.trim()
    ).join(' '),
  }
}


