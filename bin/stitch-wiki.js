#!/usr/bin/env node

/*
Stitch multiple TWPub or other JSON files into a TW5 HTML file

node ./bin/stitch-wiki.js <path-to-input-wiki> <path-to-output-wiki> <path-to-twpub-file> <path-to-twpub-file> ...

e.g.:

node ./bin/stitch-wiki.js ./tmp/empty.html ./tmp/index.html mytwpub.json anothertiddler.json
*/

const fs = require("fs");

// Get arguments
const pathInputWiki = process.argv[2],
	pathOutputWiki = process.argv[3],
	arrayPathJson = process.argv.slice(4);

	console.log(pathInputWiki,pathOutputWiki,arrayPathJson)

// Check arguments are not missing/empty
if(!arrayPathJson || !arrayPathJson[0] || !pathInputWiki || !pathOutputWiki) {
	throw "Missing arguments";
}

// Insertion marker for the wiki file
const marker = "<script class=\"tiddlywiki-tiddler-store\" type=\"application/json\">[\n";

// Get the existing wiki file and split it by the marker
const templateParts = fs.readFileSync(pathInputWiki,"utf8").split(marker);

// Get the text of the JSON files and assemble the payload
var payload = "";
for(const pathJson of arrayPathJson) {
	const text = fs.readFileSync(pathJson,"utf8"),
		json = JSON.parse(text);
	if(Array.isArray(json)) {
		// If it is an array of tiddlers, flatten them down to individual tiddlers
		for(const item of json) {
			payload += JSON.stringify(item) + ",\n";
		}
	} else {
		payload += text + ",\n";
	}
}

// Assemble the new wiki file
const html = templateParts[0] + marker + payload + templateParts[1];

// Save the file
fs.writeFileSync(pathOutputWiki,html,"utf8");
