#!/bin/bash

# Slice an epub into a twpub plugin and then stitch it into a prebuilt empty wiki file

# ./bin/slice-and-stitch-wiki.sh <path-to-input-epub-file> [<path-to-tiddlywiki-edition-template>]

EPUB_FILEPATH=$1
EDITION_FILEPATH=$2

if [ -z "$EPUB_FILEPATH" ]; then
	echo "Missing parameter: path to epub file"
	exit 1
fi

if [ ! -f "$EPUB_FILEPATH" ]; then
	echo "epub file not found"
	exit 1
fi

if [ -z "$EDITION_FILEPATH" ]; then
	EDITION_FILEPATH=./wikis/twpub-tools.org/
fi

mkdir -p tmp || exit 1

# Build an almost empty wiki file, just containing the plugins we need

npx tiddlywiki ++plugins/twpub-tools/ ++twpubs/using-twpub/ $EDITION_FILEPATH \
	--output tmp \
	--render dummy empty.html text/plain $:/core/templates/tiddlywiki5.html saveTiddlerFilter "[is[tiddler]] -[[$:/boot/boot.css]] -[type[application/javascript]library[yes]] -[[$:/boot/boot.js]] -[[$:/boot/bootprefix.js]] +[sort[title]]" || exit 1

# Slice the epub to make a TWPub JSON file

node ./epub2twpub/index.js --epub "$EPUB_FILEPATH" --output ./tmp/twpub.json || exit 1

# Create another couple of JSON files, showing how they can contain arrays or individual tiddlers

echo '{"title":"Build Test","text":"This is a test"}' > ./tmp/tiddler1.json

echo '[{"title":"Build Test 2","text":"This is a test"},{"title":"Build Test 3","text":"This is a test"}]' > ./tmp/tiddler2.json

# Splice the JSON files into the wiki file

node ./bin/stitch-wiki.js ./tmp/empty.html ./tmp/index.html ./tmp/twpub.json ./tmp/tiddler1.json ./tmp/tiddler2.json || exit 1

