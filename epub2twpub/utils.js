/*
Simple command line argument parser
*/

exports.ArgParser = class ArgParser {
	constructor(args,options) {
		// Collect the arguments into a hashmap
		this.byName = new Object(null);
		let target = options.defaultOption || "";
		args.forEach(arg => {
			if(arg.startsWith("--")) {
				if(arg.length > 2) {
					target = arg.slice(2);
					if(!(target in this.byName)) {
						this.byName[target] = [];
					} else {
						throw "Repeated option " + target + "-" + JSON.stringify(this.byName,null,4);
					}
				} else {
					throw "Missing option name after --";
				}
			} else {
				this.byName[target].push(arg);
			}
		});
		// Check for mandatory arguments
		Object.keys(options.mandatoryArguments || []).forEach(mandatoryArgumentName => {
			const mandatoryArgumentType = options.mandatoryArguments[mandatoryArgumentName];
			switch (mandatoryArgumentType) {
				case "single":
					if(!(mandatoryArgumentName in this.byName)) {
						throw "Missing mandatory argument --" + mandatoryArgumentName;
					}
					if(this.byName[mandatoryArgumentName].length > 1) {
						throw "Option --" + mandatoryArgumentName + " must have a single argument";
					}
					break;
				default:
					throw "Unknown mandatoryArgument type " + mandatoryArgumentType;
			}
		});
	}
}

/*
HTML encode a string (including double quotes so that we can encode attribute values)
*/

exports.htmlEncode = function(str) {
	// Convert & to "&amp;", < to "&lt;", > to "&gt;", " to "&quot;"
	return str.toString().replace(/&/mg,"&amp;").replace(/</mg,"&lt;").replace(/>/mg,"&gt;").replace(/\"/mg,"&quot;");
}

/*
List of tags that TW5 treats as self closing (and will not accept a closing tag)
*/

exports.isTreatedAsSelfClosingTagByTiddlyWiki = function(tagName) {
	return [
		"area","base","br","col","command","embed","hr","img","input","keygen","link","meta","param","source","track","wbr"
	].indexOf(tagName) !== -1;
}

/*
Resolve a path relative to a root filepath
sourcepath: relative filepath
rootpath: absolute filepath
*/
exports.resolvePath = function(sourcepath,rootpath) {
	const src = sourcepath.split("/"),
		root = rootpath.split("/");
	// Remove the filename part of the root
	root.splice(root.length-1,1);
	// If the source path starts with ./ or ../ then it is relative to the root
	if(src[0] === "." || src[0] === ".." ) {
		// Process the source path bit by bit onto the end of the root path
		while(src.length > 0) {
			const c = src.shift();
			if(c === "..") { // Slice off the last root entry for a double dot
				if(root.length > 0) {
					root.splice(root.length-1,1);
				}
			} else if(c !== ".") { // Ignore dots
				root.push(c); // Copy other elements across
			}
		}
		return root.join("/");
	} else {
		// If it isn't relative, just return the path
		if(rootpath) {
			return root.concat(src).join("/");
		} else {
			return src.join("/");
		}
	}
}

/*
Hash a string
*/
const crypto = require("crypto");

exports.hash  = function(text,length) {
	const hash = crypto.createHash("sha256");
	hash.update(text);
	const hashText = hash.digest("hex");
	if(length === undefined) {
		length = hashText.length;
	}
	return hashText.slice(0,length);
}
