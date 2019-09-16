module.exports = doiToPublisher

var prefixmap = {
  '10.1101': 'BiorXiv',
  '10.12688': {
    'amrcopenres': 'AMRC Open Research',
    'f1000research': 'F1000 Research',
    'gatesopenres': 'Gates Open Research',
    'hrbopenres': 'HRB Open Research',
    'wellcomeopenres': 'Wellcome Open Research'
  },
  '10.20944': 'Preprints.org',
  '10.26434': 'ChemrXiv',
  '10.7287': 'PeerJ Preprints'
}

function doiToPublisher (doi) {
  var parts = doi.split('/')
  var provider = prefixmap[parts[0]]
  
  if (typeof provider === 'string') return provider

  subpref = parts[1].split('.')[0]
  return provider[subpref]
}
