/*
Run tests of getPageText() from HTML files in the ./fixtures/html/ directory
*/

const inputDir = "./fixtures/html/";

const fs = require("fs"),
	path = require("path"),
	{promisify} = require("util"),
	readFileAsync = promisify(fs.readFile),
	writeFileAsync = promisify(fs.writeFile),
	{TextExtractor} = require("./text-extractor"),
	flattenTree = require("./flatten-tree").flattenTree;

async function main() {
	// Collect up paths of .HTML files in the input directory
	const filepaths = [];
	function scanDirectory(pathname) {
		const files = fs.readdirSync(pathname);
		files.forEach(function(filename) {
			const p = path.resolve(pathname,filename),
				s = fs.lstatSync(p),
				x = path.extname(filename);
			if(s.isDirectory()) {
				scanDirectory(p);
			} else if(x === ".html") {
				filepaths.push(p);
			}
		});
	}
	scanDirectory(inputDir);
	// Accumulate test failures
	const failures = [];
	// Test each page in turn
	for(const filepath of filepaths) {
		const results = await testPage(filepath);
		// Compare the results
		if(!compareResults(results)) {
			failures.push(results);
		}
	}
	// Check for failures
	return failures;
}

async function testPage(filepath) {
	// Setup the text extractor
	const textExtractor = new TextExtractor({
		getFile: async fileHref => {
			if(fileHref === "index.html") {
				return {
					type: "text/html",
					contents: await readFileAsync(filepath,"utf8")
				}
			} else {
				return {
					type: null,
					contents: null
				}
			}
		},
		logError: msg => {
			console.log("Text extractor error: " + msg)
		}
	});
	// Get the text of the page 
	const results = await textExtractor.getPageText("index.html");
	// Flatten the nodes of the results
	for(const chunk of results.chunks) {
		chunk.text = flattenTree(chunk.nodes);
		delete chunk.nodes;
	}
	results.filepath = filepath;
	return results;
}

function compareResults(results) {
	if(results.chunks.length === results.expectedResults.length) {
		for(let index = 0; index < results.chunks.length; index++) {
			let r = results.chunks[index],
				e = results.expectedResults[index];
			if(r.text !== e.text || (r.anchorIds || []).join(",") !== (e.anchorIds || []).join(",")) {
				 return false;
			}
		}
		return true;
	}
	return false;
};

main().then(results => {
	// Check for failures
	if(results.length === 0) {
		process.exit(0);		
	} else {
		console.error("Tests failed");
		console.error(JSON.stringify(results,null,4));
		process.exit(1);
	}
}).catch(err => {
	console.error(err);
	process.exit(1);
});

