#!/bin/bash

# Slice an epub into a twpub plugin and then stitch it into a prebuilt empty wiki file

# ./bin/slice-and-stitch-wiki.sh <path-to-epub-file> <path-to-wiki-file>

EPUB_FILEPATH=$1
WIKI_FILEPATH=$2

if [ -z "$EPUB_FILEPATH" ]; then
	echo "Missing parameter: path to epub file"
	exit 1
fi

if [ ! -f "$EPUB_FILEPATH" ]; then
	echo "epub file not found"
	exit 1
fi

if [ -z "$WIKI_FILEPATH" ]; then
	echo "Missing parameter: path to wiki file"
	exit 1
fi

mkdir -p tmp || exit 1

# Build an almost empty wiki file, just containing the plugins we need

npx tiddlywiki ++plugins/twpub-tools/ ./wikis/immateriel.fr/ \
	--output tmp \
	--render dummy empty.html text/plain $:/core/templates/tiddlywiki5.html saveTiddlerFilter "$:/core $:/themes/tiddlywiki/snowwhite $:/themes/tiddlywiki/vanilla $:/plugins/immateriel/twpub-tools $:/languages/fr-FR $:/config/Search/AutoFocus $:/config/TiddlerInfo/Mode $:/plugins/tiddlywiki/dynannotate +[sort[title]]" || exit 1

# Slice the epub

node ./epub2twpub/index.js --epub "$EPUB_FILEPATH" --output ./tmp/twpub.json || exit 1

# Splice the TWPub into the wiki file

node ./bin/stitch-wiki.js ./tmp/twpub.json ./tmp/empty.html ./tmp/index.html || exit 1

