#!/bin/bash

# Slice an epub into a twpub plugin and then stitch it into a prebuilt empty wiki file

# ./bin/slice-and-stitch-wiki.sh <path-to-epub-file>

EPUB_FILEPATH=$1

if [ -z "$EPUB_FILEPATH" ]; then
	echo "Missing parameter: path to epub file"
	exit 1
fi

if [ ! -f "$EPUB_FILEPATH" ]; then
	echo "epub file not found"
	exit 1
fi

mkdir -p tmp || exit 1

# Build an almost empty wiki file, just containing the plugins we need

npx tiddlywiki ++plugins/twpub-tools/ ++twpubs/using-twpub/ ./wikis/twpub-tools.org/ \
	--output tmp \
	--render dummy empty.html text/plain $:/core/templates/tiddlywiki5.html saveTiddlerFilter "$:/config/PageColumns/NewRiver $:/config/PageColumns/Sidebar $:/config/Search/AutoFocus $:/config/stories/main $:/config/TiddlerInfo/Mode $:/core $:/languages/fr-FR $:/plugins/immateriel/twpub-tools $:/plugins/immateriel/using-twpub $:/plugins/tiddlywiki/dynannotate $:/themes/tiddlywiki/snowwhite $:/themes/tiddlywiki/vanilla +[sort[title]]" || exit 1

# Slice the epub

node ./epub2twpub/index.js --epub "$EPUB_FILEPATH" --output ./tmp/twpub.json || exit 1

# Create another couple of JSON files, showing how they can contain arrays or individual tiddlers

echo '{"title":"Build Test","text":"This is a test"}' > ./tmp/tiddler1.json

echo '[{"title":"Build Test 2","text":"This is a test"},{"title":"Build Test 3","text":"This is a test"}]' > ./tmp/tiddler2.json

# Splice the TWPub into the wiki file

node ./bin/stitch-wiki.js ./tmp/empty.html ./tmp/index.html ./tmp/twpub.json ./tmp/tiddler1.json ./tmp/tiddler2.json || exit 1

