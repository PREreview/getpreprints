var EuPmc = require('../adapters/rest/eupmc')

module.exports = options => {
  options.SRC = 'PPR'
  options.publisher = 'PeerJ Preprints'
  return new EuPmc(options)
}