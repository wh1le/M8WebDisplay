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
for i in src/shaders/*.vert src/shaders/*.frag; do
	printf "export const %s = \`" "$(basename "$i" | tr . _)"
	sed 's/\/\/.*$//g' "$i" |
		perl -0pe 's/([\n;,{}()\[\]=+\-*\/])[ \t\r\n]+/$1/g'
	echo "\`;"
done >build/shaders.js

echo "Building build/font1.js"
printf "export const font1 = 'data:image/png;base64,%s';" "$($BASE64 src/assets/font1.png)" >build/font1.js

echo "Building build/font2.js"
printf "export const font2 = 'data:image/png;base64,%s';" "$($BASE64 src/assets/font2.png)" >build/font2.js

echo "Building build/font1.scss"
printf "@font-face {\n    font-family: 'm8stealth57';\n    src: url('data:font/woff2;base64,%s') format('woff2');\n}" "$($BASE64 src/assets/m8stealth57.woff2)" >build/font1.scss

echo "Building build/font2.scss"
printf "@font-face {\n    font-family: 'm8stealth89';\n    src: url('data:font/woff2;base64,%s') format('woff2');\n}" "$($BASE64 src/assets/m8stealth89.woff2)" >build/font2.scss

echo "Building build/index.css"
sass --style=compressed src/css/index.scss >build/index.css

echo "Building build/main.js"
rollup src/js/main.js | terser --mangle --toplevel --compress >build/main.js

# Inline index.css and main.js by hand. juice round-trips the document through
# an HTML parser which HTML-escapes text nodes (">" becomes "&gt;", "&&" becomes
# "&amp;&amp;"), corrupting the inlined bundle so it no longer parses.
echo "Building build/index.html"
if [ -n "${M8_BUILD_ID:-}" ]; then
	build_id="$M8_BUILD_ID"
else
	build_id="$(date -u +"%Y-%m-%dT%H:%M:%S") $(git rev-parse --short HEAD 2>/dev/null || printf unknown)"
	if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
		build_id="$build_id"X
	fi
fi
sed "s/BUILDNUM/$build_id/" src/index.html |
	sed -e "s|\"src/assets/favicon.png\"|\"data:image/png;base64,$($BASE64 src/assets/favicon.png)\"|" |
	sed -e 's/^ *//' |
	perl -0pe 's/>[ \t\r\n]+</></g' |
	perl -0777pe '
		BEGIN {
			local $/ = undef;
			open my $css_fh, "<", "build/index.css" or die $!;
			$css = <$css_fh>;
			open my $js_fh, "<", "build/main.js" or die $!;
			$js = <$js_fh>;
		}
		s{<link rel="stylesheet" href="index\.css">}{"<style>$css</style>"}e;
		s{<script type="module" src="main\.js"></script>}{"<script>$js</script>"}e;
	' >build/index.html

echo "Copying public files"
cp public/icon.png public/app.webmanifest build/

echo "Building build/worker.js"
sed "s/INDEXHASH/$(cat build/index.html build/icon.png build/app.webmanifest | $MD5)/" src/js/worker.js |
	terser --mangle --compress >build/worker.js
