var path = require('path')

var indir = path.join(__dirname, '../../sources/2019-07-02')
var arxivfile = path.join(indir, 'arxiv/records_clean.json')

var streamToDb = require('../../lib/utils/stream-file-to-db')

var chalk = require('chalk')
var katex = require('katex')

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
    .replace(/ *\([^()]*\)/g, '')
    .replace(/ *\([^()]*\)/g, '') // doubling this strips out the pesky nested brackets
    .replace(', and ', ', ')
    .replace(' and ', ', ')
    .split(', ')
    .map(parseAuthor)

  var title
  
  try {
    title = katex.renderToString(data.title)
  } catch (e) {
    title = data.title
  }

  console.log(title, data.title)
  process.exit(1)

  var abstract = katex.renderToString(data.abstract, {
    throwOnError: false
  })

  return {
    arxivid: data.id,
    title: title || data.title,
    abstract: abstract || data.abstract,
    source: 'ArXiv',
    publisher: 'ArXiv',
    authors: authors,
    date_created: new Date(v.date),
    date_published: new Date(v.date),
    date_indexed: new Date(Date.now()),
    authorstring: authors.map(a => a.fullName).join(' '),
  }
}
