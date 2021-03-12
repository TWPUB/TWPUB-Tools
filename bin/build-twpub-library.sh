#!/bin/bash

# Create a TiddlyWiki plugin library from a directory of twpub JSON files

# ./bin/build-twpub-library.sh <path-to-directory-of-twpub-json-files> <path-to-output-directory>

TWPUB_FOLDER_PATH=$1
OUTPUT_FOLDER_PATH=$2

if [ -z "$TWPUB_FOLDER_PATH" ]; then
	echo "Missing parameter: path to twpub folder"
	exit 1
fi

if [ -z "$OUTPUT_FOLDER_PATH" ]; then
	echo "Missing parameter: path to output folder"
	exit 1
fi

# Build the library plugin
./bin/make-twpub-library-plugin.js $TWPUB_FOLDER_PATH ./tmp/twpub-library.json || exit 1

# Make the plugin library

npx tiddlywiki ./node_modules/tiddlywiki/editions/pluginlibrary \
	--load ./tmp/twpub-library.json \
	--output $OUTPUT_FOLDER_PATH \
	--savelibrarytiddlers '$:/TWPUBLibrary' '[prefix[$:/]] -[[$:/plugins/tiddlywiki/upgrade]] -[[$:/plugins/tiddlywiki/translators]] -[[$:/plugins/tiddlywiki/pluginlibrary]] -[[$:/plugins/tiddlywiki/jasmine]]' 'recipes/library/tiddlers/' '$:/UpgradeLibrary/List' \
	--savetiddler '$:/UpgradeLibrary/List' 'recipes/library/tiddlers.json' \
	--rendertiddler '$:/plugins/tiddlywiki/pluginlibrary/library.template.html' 'index.html' 'text/plain' || exit 1

