/*
Class representing the Puppeteer-based wrapper for get-page-text.js
*/

const playwright = require("playwright"),
	{getPageText} = require("./injected/get-page-text");

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
		this.browser = await playwright.chromium.launch();
		this.context = await this.browser.newContext({
			javaScriptEnabled: false
		});
		this.page = await this.context.newPage();
		await this.page.route("**/*",async (route) => {
			const request = route.request();
			if(request.method() === "GET" && request.url().startsWith(URL_PREFIX)) {
				const fileHref = request.url().slice(URL_PREFIX.length);
				const {type,contents} = await this.getFile(fileHref);
				if(!type) {
					this.logError(`Missing file \`${fileHref}\``);
					route.fulfill({status: 404, contentType: "text/plain", body: "Not found!"});
				} else  {
					route.fulfill({status: 200, contentType: type, body: contents});
				}
			} else {
				route.abort();
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
