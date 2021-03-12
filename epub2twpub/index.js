/*
Convert an EPUB file into a TWPUB plugin
*/

const fs = require("fs"),
	path = require("path"),
	{promisify} = require("util"),
	readFileAsync = promisify(fs.readFile),
	writeFileAsync = promisify(fs.writeFile),
	{ArgParser} = require("./utils"),
	{EpubReader} = require("./epub-reader"),
	{TwpubPlugin} = require("./twpub-plugin");

class App {

	constructor(args) {
		// Get our app version number
		this.version = require("../package.json").version;
		// Parse arguments
		this.args = new ArgParser(args,{
			defaultOption: "epub",
			mandatoryArguments: {
				epub: "single",
				output: "single"
			}
		});
	}

	async main() {
		// Setup the epub
		this.epubReader = new EpubReader(this);
		await this.epubReader.load(this.args.byName.epub[0]);
		// Create the twpub plugin
		this.twpubPlugin = new TwpubPlugin(this,{epubReader: this.epubReader});
		// Convert the epub
		this.twpubPlugin.convertEpub();
		// Save the twpub plugin
		await writeFileAsync(this.args.byName.output[0],this.twpubPlugin.getPluginText(),"utf8");
	}
}

const app = new App(process.argv.slice(2));

app.main().then(() => {
	process.exit(0);
}).catch(err => {
	console.error(err);
	process.exit(1);
});
