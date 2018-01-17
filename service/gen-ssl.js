import { pki, md } from 'node-forge'

if (process.env.SERVICE === 'gen-ssl') {
  IPC.answer('gen-ssl', (domain) => {
    return generateCert(domain)
  })
}

function getRootPair () {
  const rootCA = pki.certificateFromPem(readAssets('rootCA.crt').toString())
  const rootKey = pki.privateKeyFromPem(readAssets('rootCA.key').toString())
  return { rootCA, rootKey }
}

let serialCounter = 0;
function createSerialNumber() {
  serialCounter++;
  const ret = `${serialCounter}`
  if (ret.length & 1) {
    return `0${ret}`
  }
  return ret
}

function generateCert (domain) {
  const { rootCA, rootKey } = getRootPair()
  const keys = pki.rsa.generateKeyPair(1024)
  const cert = pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = createSerialNumber()
  const curYear = new Date().getFullYear()
  cert.validity.notBefore = new Date()
  cert.validity.notBefore.setFullYear(curYear - 1)
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(curYear + 1)
  const attrs = [
    {
      name: 'commonName',
      value: domain,
    },
    {
      name: 'countryName',
      value: 'CN',
    },
    {
      shortName: 'ST',
      value: 'Beijing',
    },
    {
      name: 'localityName',
      value: 'Beijing',
    },
    {
      name: 'organizationName',
      value: 'Zokor',
    },
    {
      shortName: 'OU',
      value: 'ZokorProxy',
    }
  ]
  cert.setSubject(attrs)
  cert.setIssuer(rootCA.subject.attributes)
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: true
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true
    },
    {
      name: 'nsCertType',
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: true,
      emailCA: true,
      objCA: true
    },
    {
      name: 'subjectAltName',
      altNames: [
        {
          type: 2,
          value: domain
        }
      ]
    },
    {
      name: 'subjectKeyIdentifier'
    }
  ])
  cert.sign(rootKey, md.sha256.create())
  const keyString = pki.privateKeyToPem(keys.privateKey)
  const certString = pki.certificateToPem(cert)
  return {
    key: keyString,
    cert: certString,
  }
}
