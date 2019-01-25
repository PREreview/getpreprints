var EuPmc = require('./rest/eupmc')

module.exports = options => {
  options.SRC = 'PPR'
  options.publisher = 'F1000Res'
  return new EuPmc(options)
}