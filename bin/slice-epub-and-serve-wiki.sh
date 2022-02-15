#!/bin/bash

# Slice an epub into a twpub plugin and serve it in a wiki with the viewer plugin

# ./bin/slice-epub-and-build-wiki.sh <path-to-epub-file>

EPUB_FILEPATH=$1

if [ -z "$EPUB_FILEPATH" ]; then
	echo "Missing parameter: path to epub file"
	exit 1
fi

if [ ! -f "$EPUB_FILEPATH" ]; then
    echo "epub file not found"
    exit 1
fi

mkdir -p tmp

# Slice the epub

node epub2twpub/index.js --epub "$EPUB_FILEPATH" --output ./tmp/twpub.json || exit 1

npx tiddlywiki ++plugins/twpub-tools/ ./wikis/twpub-tools.org/ \
	--load ./tmp/twpub.json \
	--listen host=0.0.0.0 || exit 1
