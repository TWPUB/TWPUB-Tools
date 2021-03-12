#!/usr/bin/env node

/*
Make a plugin containing all of the twpub plugins

node ./bin/make-twpub-library-plugin.js <path-to-directory-of-twpub-json-files> <path-to-output-file>
*/

const fs = require("fs"),
	path = require("path");

// Check arguments

const twpubPath = process.argv[2],
	outputFilepath = process.argv[3];

if(!twpubPath) {
	throw "Missing twpub directory path path";
}

if(!outputFilepath) {
	throw "Missing output filepath";
}

// Get the JSON of the plugins
const twpubPlugins = fs.readdirSync(twpubPath)
							.map(filename => path.resolve(twpubPath,filename))
							.filter(filepath => !fs.statSync(filepath).isDirectory() && filepath.endsWith(".json"))
							.map(filepath => JSON.parse(fs.readFileSync(filepath,"utf8")));

// Assemble the output tiddler
const outputData = {
	title: "$:/TWPUBLibrary",
	type: "application/json",
	"plugin-type": "library",
	"text": JSON.stringify({
		tiddlers: twpubPlugins.reduce((accumulator,twpubPlugin) => {
			accumulator[twpubPlugin.title] = twpubPlugin;
			return accumulator;
		},{})
	})
};

// Save the output tiddler
fs.writeFileSync(outputFilepath,JSON.stringify(outputData),"utf8");
