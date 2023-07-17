/*
Reads an EPUB file and makes the content available via properties
*/

const fs = require("fs"),
	path = require("path"),
	{promisify} = require("util"),
	readFileAsync = promisify(fs.readFile),
	writeFileAsync = promisify(fs.writeFile),
	{DOMParser,XMLSerializer} = require("@xmldom/xmldom"),
	JSZip = require("jszip"),
	{TextExtractor} = require("./text-extractor"),
	{hash,resolvePath} = require("./utils");

const BINARY_MEDIA_TYPES = [
	"image/gif",
	"image/png",
	"image/jpeg",
	"audio/mpeg",
	"audio/mp4"
];

const URL_PREFIX = "https://example.com/";

class EpubReader {

	constructor (app) {
		this.app = app;
		this.metadata = Object.create(null); // Hashmap metadata items
		this.manifest = Object.create(null); // Hashmap by ID of {properties:,id:,href:,media-type:}
		this.spine = []; // Array of IDs of items comprising the publication
		this.chunks = []; // Array of chunks {href:, nodes: [], anchorIds: [], stylesheetIds: []}
		this.toc = []; // Tree of {id:, text:, href:, children: {}}
		this.stylesheets = Object.create(null); // Hashmap by ID of {text:}
		this.images = Object.create(null); // Hashmap by path of {type:, text:}
		this.errors = []; // Array of errors
	}

	logError(message) {
		this.errors.push(message);
	}

	/*
	Load an EPUB from a file path
	*/
	async load(epubFilepath) {
		// Read the ZIP file
		const epubFileData = await readFileAsync(epubFilepath);
		this.epubHash = hash(epubFileData);
		this.zip = await JSZip.loadAsync(epubFileData);
		// Load the container file
		this.containerFileContents = await this.zip.file("META-INF/container.xml").async("string");
		this.containerFileDoc = new DOMParser().parseFromString(this.containerFileContents,"text/xml");
		// Load the package file
		this.packageFilePath = findNodeAndGetAttribute(this.containerFileDoc,["container","rootfiles","rootfile"],"full-path");
		this.packageFileContents = await this.zip.file(this.packageFilePath).async("string");
		this.packageFileDoc = new DOMParser().parseFromString(this.packageFileContents,"text/xml");
		// Read Dublin Core metadata and meta tags
		const nodeMetadata = findNode(this.packageFileDoc,["package","metadata"]);
		Array.from(nodeMetadata.childNodes).forEach(node => {
			const n = (node.tagName || "").toLowerCase();
			if(n.substr(0,3) === "dc:") {
				this.metadata[n] = node.textContent.replace(/\s+/mg," ");
			} else if(n === "meta") {
				const p = node.getAttribute("property"),
					ref = node.getAttribute("refines"),
					id = node.getAttribute("id"),
					scheme = node.getAttribute("scheme"),
					name = node.getAttribute("name"),
					content = node.getAttribute("content");
				if(p) {
					this.metadata[p] = node.textContent.replace(/\s+/mg," ");
				} else if(name && content) {
					this.metadata[name] = content;
				}
			}
		});
		// Read manifest
		const nodeManifest = findNode(this.packageFileDoc,["package","manifest"]);
		Array.from(nodeManifest.childNodes).forEach(node => {
			const n = (node.tagName || "").toLowerCase();
			if(n === "item") {
				const p = node.getAttribute("properties") || "",
					id = node.getAttribute("id"),
					mediaType = node.getAttribute("media-type");
				var href = resolvePath(node.getAttribute("href"),this.packageFilePath);
				// Some books include an extraneous slash in internal URLs
				if(href.startsWith("/")) {
					href = href.slice(1);
				}
				this.manifest[id] = {properties: p.split(" "), id: id, href: href, "media-type": mediaType};
			}
		});
		// Get the spine node
		this.nodeSpine = findNode(this.packageFileDoc,["package","spine"]);
		// Read the spine
		Array.from(this.nodeSpine.childNodes).forEach(node => {
			if((node.tagName || "").toLowerCase() === "itemref") {
				this.spine.push(node.getAttribute("idref"));
			}
		});
		// Load the TOC
		await this.loadToc();
		// Read the text chunks and stylesheets
		await this.loadTextChunks();
		// Load the images
		await this.loadImages();
	}

	/*
	Check for a metadata item
	*/
	hasMetadataItem(name) {
		return name in this.metadata;
	}

	/*
	Get a metadata item
	*/
	getMetadataItem(name,defaultValue) {
		if(name in this.metadata) {
			return this.metadata[name];
		} else {
			return defaultValue;
		}
	}

	/*
	Get a manifest item
	*/
	getManifestItem(id,defaultValue) {
		return this.manifest[id] || defaultValue;
	}

	/*
	Get the media type of a manifest item
	*/
	getMediaTypeOfItem(href) {
		var result;
		for(const id of Object.keys(this.manifest)) {
			const manifestItem = this.manifest[id];
			if(manifestItem.href === href) {
				result = manifestItem["media-type"];
			}
		}
		return result;
	}

	/*
	Load the table of contents
	Returns a tree of {id:, text:, href:, children: {}}
	*/
	async loadToc() {
		this.tocItem = this.manifest[this.nodeSpine.getAttribute("toc")].href;
		// Get the TOC file
		this.tocContents = await this.zip.file(this.tocItem).async("string");
		this.tocDoc = new DOMParser().parseFromString(this.tocContents,"text/xml");
		// Visit each node collecting up the entries
		const visitNodes = nodes => {
			const results = [];
			Array.from(nodes).forEach(node => {
				if(node.nodeType === 1 && node.tagName === "navPoint") {
					results.push(visitNode(node));
				}				
			});
			return results;
		};
		const visitNode = node => {
			const href = findNodeAndGetAttribute(node,["content"],"src");
			return {
				id: node.getAttribute("id"),
				text: findNode(node,["navLabel","text"]).textContent,
				href: resolvePath(href,this.packageFilePath),
				children: visitNodes(node.childNodes)
			};
		};
		// Start at the root
		const navMap = findNode(this.tocDoc,["ncx","navMap"]);
		this.toc = visitNodes(navMap.childNodes);
	}

	/*
	Load the text chunks and stylesheets
	*/
	async loadTextChunks() {
		// Setup the text extractor
		const textExtractor = new TextExtractor({
			getFile: async fileHref => {
				const file = this.zip.file(fileHref);
				return {
					type: this.getMediaTypeOfItem(fileHref),
					contents: file ? await file.async("nodebuffer") : ""
				}
			},
			logError: this.logError.bind(this)
		});
		// Extract each HTML file listed in the spine
		for(const spineItem of this.spine) {
			const manifestItem = this.manifest[spineItem];
			if(manifestItem["media-type"] === "application/xhtml+xml" ) {
				const results = await textExtractor.getPageText(manifestItem.href);
				// Collect the IDs of the stylesheets used in this file
				const stylesheetIds = [];
				for(const stylesheetText of results.stylesheets) {
					// If we just got the text then generate an href
					const id = hash(stylesheetText,6);
					// Save the id
					stylesheetIds.push(id);
					// Save the stylesheet text if we don't already have this ID
					if(!(id in this.stylesheets)) {
						this.stylesheets[id] = stylesheetText;
					}
				}
				// Copy the chunks, adding the stylesheets
				for(const chunk of results.chunks) {
					chunk.stylesheetIds = stylesheetIds;
					this.chunks.push(chunk);
				}
			}
		}
	}

	/*
	Load all the images
	*/
	async loadImages() {
		// Get the image manifest items
		for(const id of Object.keys(this.manifest)) {
			const manifestItem = this.manifest[id];
			if(manifestItem["media-type"].split("/")[0] === "image" ) {
				const file = this.zip.file(manifestItem.href),
					encoding = BINARY_MEDIA_TYPES.includes(manifestItem["media-type"]) ? "base64" : "text";
				if(file) {
					this.images[manifestItem.href] = {
						type: manifestItem["media-type"],
						text: await file.async(encoding)
					};
				} else {
					this.logError(`Missing image: ${manifestItem.href}`);
				}
			}
		}
	}
}

function findNodeAndGetAttribute(rootNode,selectors,attributeName) {
	const node = findNode(rootNode,selectors);
	if(node) {
		return node.getAttribute(attributeName);
	}
	return null;
}

/*
Find an XML node identified by a list of child tag names
rootNode: reference to root node
selectors: array of child tag names
*/
function findNode(rootNode,selectors) {
	let node = rootNode;
	for(selector of selectors) {
		node = Array.from(node.childNodes).find(node => !!node.tagName && node.tagName === selector);
		if(!node) {
			return null;
		}
	}
	return node;
}

exports.EpubReader = EpubReader;
