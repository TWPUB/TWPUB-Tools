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

// Parse the TWPub so that we can access the data within it
const jsonTWPub = JSON.parse(textTWPub);

const twpubTitle = jsonTWPub.title,
	twpubDescription = jsonTWPub["epub-title"],
	twpubHash = jsonTWPub.title.split("/")[3];

// Make the story configuration tiddler
const textStoryConfiguration = JSON.stringify({
	title: "$:/config/Stories/" + twpubHash,
	tags: "$:/tags/Story",
	caption: `Story for ${twpubDescription}`,
	"story-definition": "$:/plugins/immateriel/twpub-tools/twpub-story-definition",
	"story-twpub": twpubTitle
},null,4);

// Make the column configuration tiddler
const textColumnConfiguration = JSON.stringify({
	title: "$:/config/PageColumns/" + twpubHash,
	tags: "$:/tags/PageLayout/MainColumn",
	caption: `Column for ${twpubDescription}`,
	"template": "$:/core/ui/Columns/story",
	"story-configuration": "$:/config/Stories/" + twpubHash
},null,4);

// Assemble the payload 
var payload = textTWPub + ",\n" + textStoryConfiguration + ",\n" + textColumnConfiguration + ",\n";

// Replace "<" with "\u003c" to avoid HTML parsing errors
payload = payload.replace(/</g,"\\u003c");

// Assemble the new wiki file
const html = templateParts[0] + marker + payload + templateParts[1];

// Save the file
fs.writeFileSync(pathOutputWiki,html,"utf8");
