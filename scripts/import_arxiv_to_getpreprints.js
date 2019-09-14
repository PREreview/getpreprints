var path = require('path')

var indir = path.join(__dirname, '../sources/2019-07-02')
var arxivfile = path.join(indir, 'arxiv/10_records.json')

var streamToDb = require('../lib/utils/stream-to-db')

streamToDb({
  infile: arxivfile,
  identifiername: 'arxivid',
  transform: transform,
  cb: cb
})

function cb (err, db) {
  if (err) throw err
  console.log('Finished populating hyperDB from arXiv dump :)')

  // db.createReadStream().on('data', d => console.log(d))

  db.get('arxivid/1808.10531', (err, node) => {
    if (err) throw err
    console.log(node)
  })
}

function latestVersion (data) {
  if (!Array.isArray(data.version)) {
    return data.version
  }

  return data.version.map(
    v => {
      v.date = new Date(v.date)
      return v
    }
  ).sort(
    (a, b) => (b.date - a.date)
  )[0]
} 

function parseAuthor (a) {
  return {
    fullName: a.trim(),
    firstName: null,
    lastName: null,
    initials: null,
    orcid: null
  }
}

function transform (data) {
  var v = latestVersion(data)

  var authors = (data.authors || '')
    .replace(/ *\([^)]*\) */g, "")
    .replace(', and ', ', ')
    .replace(' and ', ', ')
    .split(', ')
    .map(parseAuthor)

  return {
    arxivid: data.id,
    title: data.title,
    abstract: data.abstract,
    source: 'ArXiv',
    publisher: 'ArXiv',
    authors: authors,
    date_created: v.date,
    date_published: v.date,
    date_indexed: Date.now(),
    authorstring: authors.map(a => a.fullName).join(' '),
  }
}
