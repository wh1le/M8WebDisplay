#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/.."
PATH="$PWD/node_modules/.bin:$PATH"
export PATH

mkdir -p cert

cat >cert/cert.conf <<EOF
[req]
distinguished_name=dn
req_extensions=ext
prompt=no
[dn]
CN=DevCert
OU=DEV
[ext]
keyUsage=nonRepudiation,digitalSignature,keyEncipherment
basicConstraints=critical,CA:TRUE,pathlen:0
subjectAltName=DNS:localhost,$(ws --list-network-interfaces | grep '^-' | sed -E 's/^- .+: ([0-9.]+)$/IP:\1/g' | sed -E 's/^- .+: (.+)$/DNS:\1/g' | paste -sd ',' -)
EOF

openssl genrsa -out cert/private-key.pem 2048
openssl req -new -nodes -sha256 -key cert/private-key.pem -config cert/cert.conf -out cert/server.csr
openssl x509 -req -sha256 -days 90 -in cert/server.csr -signkey cert/private-key.pem -extfile cert/cert.conf -extensions ext -out cert/server.crt
