#!/usr/bin/env node

/*
Make a plugin library containing all of the twpub plugins

node ./bin/make-twpub-library.js <path-to-directory-of-twpub-json-files> <path-to-output-folder>
*/

const fs = require("fs"),
	path = require("path");
const { formatWithOptions } = require("util");

// Check arguments

const twpubPath = process.argv[2],
	outputPath = process.argv[3];

if(!twpubPath) {
	throw "Missing twpub directory path";
}

if(!outputPath) {
	throw "Missing output path";
}

// Get the pathnames of all of the twpub plugins

const twpubPluginFilepaths = fs.readdirSync(twpubPath)
	.map(filename => path.resolve(twpubPath,filename))
	.filter(filepath => !fs.statSync(filepath).isDirectory() && filepath.endsWith(".json"));

// Process each plugin in turn, writing it to the output path and collecting the metadata

const pluginMetadata = [];

for(const filepath of twpubPluginFilepaths) {
	const outputFilePath = path.resolve(outputPath,"recipes","library","tiddlers");
	fs.mkdirSync(outputFilePath,{recursive:true});
	const pluginData = JSON.parse(fs.readFileSync(filepath,"utf8"));
	const coverImageTitle = pluginData["cover-image"];
	const payloadData = JSON.parse(pluginData.text);
	const coverImageTiddler = payloadData.tiddlers[coverImageTitle];
	if(coverImageTiddler) {
		const coverImageExtension = coverImageTiddler.type.split("/")[1];
		const coverImageFilename = path.resolve(outputFilePath,encodeURIComponent(pluginData.title) + "." + coverImageExtension);
		fs.writeFileSync(coverImageFilename,coverImageTiddler.text,"base64");
		pluginData["cover-image-url"] = encodeURIComponent(path.relative(outputPath,coverImageFilename));
	}
	pluginMetadata.push(Object.assign({},pluginData,{text: undefined}));
	fs.writeFileSync(path.resolve(outputFilePath,encodeURIComponent(pluginData.title) + ".json"),JSON.stringify(pluginData));

}

// Write the metadata JSON file

fs.writeFileSync(path.resolve(outputPath,"recipes","library","index.json"),JSON.stringify(pluginMetadata,null,4));

// Write the library index file

const htmlTemplate = fs.readFileSync(path.resolve(__dirname,"empty-library","index.html"),"utf8");

const insertMarker = "var assetList =";
const insertPos = htmlTemplate.indexOf(insertMarker) + insertMarker.length;
const html = htmlTemplate.slice(0,insertPos) + JSON.stringify(pluginMetadata,null,4) + htmlTemplate.slice(insertPos);

fs.writeFileSync(path.resolve(outputPath,"index.html"),html,"utf8");
