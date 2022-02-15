#!/bin/bash

# Build the wiki with the TWPUB tools plugin

# ./build-empty-wiki.sh <output-folder>

OUTPUT_FOLDER_PATH=$1

if [ -z "$OUTPUT_FOLDER_PATH" ]; then
	echo "Missing parameter: path to output folder"
	exit 1
fi

npx tiddlywiki ++plugins/twpub-tools/ ./wikis/twpub-tools.org/ \
	--output $OUTPUT_FOLDER_PATH \
	--rendertiddler  $:/core/save/all index.html text/plain || exit 1
