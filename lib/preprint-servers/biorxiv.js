var EuPmc = require('../adapters/rest/eupmc')

module.exports = options => {
  options.SRC = 'PPR'
  options.publisher = 'biorxiv'
  return new EuPmc(options)
}