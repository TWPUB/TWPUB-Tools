/*
Class representing the Puppeteer-based wrapper for get-page-text.js
*/

const puppeteer = require("puppeteer"),
	{getPageText} = require("./puppeteer/get-page-text");

const URL_PREFIX = "https://example.com/";

class TextExtractor {

	/*
	Options:
	getFile: function(href) returns {type:, contents:}
	logError: function(msg)
	*/
	constructor (options) {
		this.getFile = options.getFile;
		this.logError = options.logError;
	}

	async initialise() {
		this.browser = await puppeteer.launch();
		this.page = await this.browser.newPage();
		await this.page.setJavaScriptEnabled(false);
		await this.page.setRequestInterception(true);
		this.page.on("request", async request => {
			if(request.method() === "GET" && request.url().startsWith(URL_PREFIX)) {
				const fileHref = request.url().slice(URL_PREFIX.length);
				const {type,contents} = await this.getFile(fileHref);
				if(!type) {
					this.logError(`Missing file \`${fileHref}\``);
					return request.respond({status: 404, contentType: "text/plain", body: "Not found!"});
				} else  {
					request.respond({status: 200, contentType: type, body: contents});
				}
			} else {
				request.abort();
			}
		});
	}

	async getPageText(href) {
	// console.log("processing page",href)
		const pageURL = URL_PREFIX + href;
		await this.page.goto(pageURL,{waitUntil: "load"});
		return await this.page.evaluate(getPageText);
	}

	async close() {
		await this.page.close();
		await this.browser.close();
	}

}

exports.TextExtractor = TextExtractor;
