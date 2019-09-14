var EuPmc = require('../adapters/rest/eupmc')

module.exports = options => {
  options.SRC = 'PPR'
  options.publisher = 'chemrxiv'
  return new EuPmc(options)
}