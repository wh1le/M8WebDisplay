#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/.."
PATH="$PWD/node_modules/.bin:$PATH"
export PATH

case "$(uname -s)" in
Darwin)
	BASE64="base64 -i"
	MD5="md5"
	;;
*)
	BASE64="base64 -w0"
	MD5="md5sum"
	;;
esac

if [ ! -d node_modules ]; then
	echo "Installing node packages"
	pnpm install --frozen-lockfile
fi

mkdir -p build

echo "Building build/shaders.js"
for i in shaders/*.vert shaders/*.frag; do
	printf "export const %s = \`" "$(basename "$i" | tr . _)"
	sed 's/\/\/.*$//g' "$i" |
		perl -0pe 's/([\n;,{}()\[\]=+\-*\/])[ \t\r\n]+/$1/g'
	echo "\`;"
done >build/shaders.js

echo "Building build/font1.js"
printf "export const font1 = 'data:image/png;base64,%s';" "$($BASE64 assets/font1.png)" >build/font1.js

echo "Building build/font2.js"
printf "export const font2 = 'data:image/png;base64,%s';" "$($BASE64 assets/font2.png)" >build/font2.js

echo "Building build/font1.scss"
printf "@font-face {\n    font-family: 'm8stealth57';\n    src: url('data:font/woff2;base64,%s') format('woff2');\n}" "$($BASE64 assets/m8stealth57.woff2)" >build/font1.scss

echo "Building build/font2.scss"
printf "@font-face {\n    font-family: 'm8stealth89';\n    src: url('data:font/woff2;base64,%s') format('woff2');\n}" "$($BASE64 assets/m8stealth89.woff2)" >build/font2.scss

echo "Building build/index.css"
sass --style=compressed css/index.scss >build/index.css

echo "Building build/main.js"
rollup js/main.js | terser --mangle --toplevel --compress >build/main.js

echo "Building build/index.html"
sed "s/BUILDNUM/$(date -u +"%Y-%m-%dT%H:%M:%S") $(git rev-parse --short HEAD)$(test -z "$(git status --porcelain)" || printf X)/" index.html |
	sed -e 's/"build\/index.css"/"index.css"/' |
	sed -e 's/"js\/main.js"/"main.js"/' |
	sed -e "s|\"assets/favicon.png\"|\"data:image/png;base64,$($BASE64 assets/favicon.png)\"|" |
	sed -e 's/^ *//' |
	perl -0pe 's/>[ \t\r\n]+</></g' >build/index.html.tmp
juice --apply-style-tags false --remove-style-tags false build/index.html.tmp build/index.html
rm build/index.html.tmp

echo "Building build/icon.png"
cp icon.png build/icon.png

echo "Building build/worker.js"
sed "s/INDEXHASH/$(cat build/index.html build/icon.png app.webmanifest | $MD5)/" js/worker.js |
	terser --mangle --compress >build/worker.js
