#!/bin/bash

# Slice all the epubs

# ./bin/slice-epubs.sh <path-to-folder-containing-epubs> <path-to-output-folder>

EPUB_FOLDER_PATH=$1
OUTPUT_FOLDER_PATH=$2

if [ -z "$EPUB_FOLDER_PATH" ]; then
	echo "Missing parameter: path to epub folder"
	exit 1
fi

if [ -z "$OUTPUT_FOLDER_PATH" ]; then
	echo "Missing parameter: path to output folder"
	exit 1
fi

mkdir -p $OUTPUT_FOLDER_PATH

for f in $EPUB_FOLDER_PATH/*.epub
do
	echo Converting $f

	node epub2twpub/index.js --epub "$f" --output "$OUTPUT_FOLDER_PATH/$(basename "$f" .epub).json" || exit 1

done
