#!/usr/bin/env node

/*
Download the top 100 epubs from the gutenberg.org website

node ./bin/download-gutenberg-top-100.js
*/

const puppeteer = require("puppeteer"),
	fetch = require("node-fetch"),
	fs = require("fs"),
	path = require("path"),
	http = require("http"),
	https = require("https"),
	{promisify} = require("util"),
	readFileAsync = promisify(fs.readFile),
	writeFileAsync = promisify(fs.writeFile),
	mkdirAsync = promisify(fs.mkdir);

class App {

	constructor(args) {
	}

	async main() {
		await mkdirAsync("./epubs/gutenberg100",{recursive: true});
		const urls = (await getUrls());
		for(const url of urls) {
			const bookNumber = url.split("/").pop();
			const urlEPUB = `${url}.epub.images`;
			console.log(url,urlEPUB);
			const response = await fetch(urlEPUB);
			if(response.status === 200) {
				await writeFileAsync(`./epubs/gutenberg100/${bookNumber}.epub`,await response.buffer());
			} else {
				console.log(`Error ${response.status} reading ${url}`);
			}
		}
		
		async function getUrls() {
			const browser = await puppeteer.launch();
			const page = await browser.newPage();
			await page.setJavaScriptEnabled(false);
			await page.goto("https://www.gutenberg.org/browse/scores/top");
			const urls = await page.evaluate(() => {
				const heading = document.querySelector("#books-last30").parentElement.nextElementSibling;
				const items=heading.querySelectorAll("li");
				return Array.from(items).map(el => el.querySelector("a[href^=\"/\"]").href)
			});
			return urls;
		}
	}
}

const app = new App(process.argv.slice(2));

app.main().then(() => {
	process.exit(0);
}).catch(err => {
	console.error(err);
	process.exit(1);
});


