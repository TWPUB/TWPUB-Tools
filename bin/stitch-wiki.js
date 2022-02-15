#!/usr/bin/env node

/*
Stitch a TWPub file into a TW5 HTML file

node ./bin/stitch-wiki.js <path-to-twpub-file> <path-to-input-wiki> <path-to-output-wiki>
*/

const fs = require("fs");

// Get arguments
const pathTWPub = process.argv[2],
	pathInputWiki = process.argv[3],
	pathOutputWiki = process.argv[4];

// Check arguments are not missing/empty
if(!pathTWPub || !pathInputWiki || !pathOutputWiki) {
	throw "Missing arguments";
}

// Insertion marker for the wiki file
const marker = "<script class=\"tiddlywiki-tiddler-store\" type=\"application/json\">[\n";

// Get the existing wiki file and split it by the marker
const templateParts = fs.readFileSync(pathInputWiki,"utf8").split(marker);

// Get the text of the TWPub file
const textTWPub = fs.readFileSync(pathTWPub,"utf8");

// Assemble the payload 
const payload = textTWPub + ",\n";

// Assemble the new wiki file
const html = templateParts[0] + marker + payload + templateParts[1];

// Save the file
fs.writeFileSync(pathOutputWiki,html,"utf8");
