/*
This script is executed within the context of a web page loaded into Puppeteer to extract the text chunks and stylesheets from a page.

Returns a structure: {chunks: [], stylsheets: [text]}

Each chunk entry is: {nodes: [], anchorIds: [], href:} where nodes is a tree of objects representing DOM nodes and strings representing
text nodes, and anchorIds is an array of anchor IDs associated with each chunk

Each stylsheet entry is the text of the stylesheet

*/

exports.getPageText = function(win,doc) {
	win = win || window;
	doc = doc || document;

	const URL_PREFIX = "https://example.com/";

class ChunkList {
	constructor() {
		this.outputChunks = [];
		this.isWithinChunk = false;
		this.ancestorStack = [];
		this.parentStack = [];
	}
	get stack() {
		return this.ancestorStack;
	}
	findTopmostAncestor(callback) {
		for(let t=this.ancestorStack.length-1; t>=0; t--) {
			if(callback(this.ancestorStack[t])) {
				return this.ancestorStack[t];
			}
		}
		return null;
	}
	startChunk() {
		if(this.isWithinChunk) {
			this.endChunk();
		}
		const chunk = {
			nodes: [],
			anchorIds: [],
			href: doc.location.href.slice(URL_PREFIX.length)
		};
		this.outputChunks.push(chunk);
		this.isWithinChunk = true;
		this.parentStack = [chunk.nodes];
		this.ancestorStack.filter(nodeInfo => isStartOfNewChunk(nodeInfo.tag) || isInterestingPhrasingContent(nodeInfo.tag)).forEach(nodeInfo => {
			const newNode = Object.assign({},nodeInfo);
			this.parentStack[this.parentStack.length - 1].push(newNode);
			delete newNode.private;
			if(Object.keys(newNode.attributes).length === 0) {
				delete newNode.attributes;
			}
			newNode.childNodes = [];
			this.parentStack.push(newNode.childNodes);
		});
	}
	endChunk() {
		this.isWithinChunk = false;
	}
	addText(text) {
		if(!this.isWithinChunk) {
			this.startChunk();
		}
		const nodes = this.parentStack[this.parentStack.length - 1];
		nodes.push(text);
	}
	openTag(nodeInfo) {
		if(!this.isWithinChunk) {
			this.startChunk();
		}
		const nodes = this.parentStack[this.parentStack.length - 1],
			newNode = Object.assign({},nodeInfo);
		nodes.push(newNode);
		delete newNode.private;
		if(Object.keys(newNode.attributes).length === 0) {
			delete newNode.attributes;
		}
		newNode.childNodes = [];
		this.parentStack.push(newNode.childNodes);
	}
	closeTag() {
		this.parentStack.pop();
		if(this.parentStack.length === 0) {
			this.parentStack = [this.outputChunks[this.outputChunks.length - 1].nodes];
		}
	}
	addAnchor(id) {
		if(!this.isWithinChunk) {
			this.startChunk();
		}
		const chunk = this.outputChunks[this.outputChunks.length - 1];
		chunk.anchorIds = chunk.anchorIds || [];
		chunk.anchorIds.push(id);
	}
}

// Main

// Extract the stylesheet text
const stylesheets = [];
for(const styleNode of doc.styleSheets) {
		stylesheets.push(Array.from(styleNode.cssRules).map(rule => rule.cssText).join("\n"));
}
// Visit each node of the document to extract the text
const chunks = new ChunkList();
visitNode(doc.body);
// Filter out blank chunks
const nonBlankChunks = chunks.outputChunks.filter(chunk => {
	return !(chunk.anchorIds.length === 0 && (chunk.nodes.length === 1) && (typeof (chunk.nodes[0]) === "string") && (!(/\S/.test(chunk.nodes[0]))));
})
// Get the expected test results if present
const domExpectedResults = document.getElementsByTagName("script")[0];
var expectedResults;
if(domExpectedResults && domExpectedResults.id === "expectedResults") {
	try {
		expectedResults = JSON.parse(domExpectedResults.textContent);
	} catch(e) {
	}
}
// Return the stylesheets and the chunks
return {
	stylesheets: stylesheets,
	chunks: nonBlankChunks,
	expectedResults: expectedResults
};

// Node iterator
function visitNode(e,options) {
	options = options || {};
	var disableBlockProcessing = !!options.disableBlockProcessing;
	switch(e.nodeType) {
		case 1: // Node.ELEMENT_NODE
			const nodeInfo = {
					tag: e.tagName.toLowerCase(),
					attributes: {
					},
					private: {
					}
				},
				isonc = isStartOfNewChunk(nodeInfo.tag),
				isipc = isInterestingPhrasingContent(nodeInfo.tag);
			if(nodeInfo.tag === "li") {
				const parentListElement = chunks.findTopmostAncestor(function(nodeInfo) {
					return nodeInfo.tag === "ol" || nodeInfo.tag === "ul";
				});
				var count;
				if(e.hasAttribute("value")) {
					count = parseInt(e.getAttribute("value"),10) || 1;
				} else {
					count = (parentListElement.private.count || 0) + 1;
				}
				nodeInfo.attributes.value = count + "";
				parentListElement.private.count = count;
			} else if(nodeInfo.tag === "img") {
				if(e.hasAttribute("src")) {
					nodeInfo.attributes.src = e.src.slice(URL_PREFIX.length);
				}
				if(e.hasAttribute("width")) {
					nodeInfo.attributes.width = e.getAttribute("width");
				}
				if(e.hasAttribute("height")) {
					nodeInfo.attributes.height = e.getAttribute("height");
				}
				if(e.hasAttribute("title")) {
					nodeInfo.attributes.tooltip = e.getAttribute("title");
				}
				if(e.hasAttribute("alt")) {
					nodeInfo.attributes.alt = e.getAttribute("alt");
				}
			} else if(nodeInfo.tag === "a") {
				if(e.href) {
					nodeInfo.attributes.href = e.href;
				}
			}
			if(e.hasAttribute("colspan")) {
				nodeInfo.attributes.colspan = e.getAttribute("colspan");
			}
			if(e.hasAttribute("rowspan")) {
				nodeInfo.attributes.rowspan = e.getAttribute("rowspan");
			}
			if(e.hasAttribute("dir")) {
				nodeInfo.attributes.dir = e.getAttribute("dir");
			}
			if(e.className) {
				nodeInfo.attributes["class"] = e.className;				
			}
			if(e.style && e.style.cssText) {
				nodeInfo.attributes.style = e.style.cssText;
			}
			if(isonc && !options.disableBlockProcessing) {
				// Start new chunk. We do so by ending any current chunk so as to defer the creation of the chunk until we know it is needed
				chunks.endChunk();
			} else if(isipc || (isonc && options.disableBlockProcessing)) {
				chunks.openTag(nodeInfo);
			}
			if(nodeInfo.tag === "table") {
				disableBlockProcessing = true;
			}
			chunks.stack.push(nodeInfo);
			if(e.hasAttribute("id") || e.hasAttribute("name")) {
				chunks.addAnchor(e.getAttribute("id") || e.getAttribute("name"));
			}
			if(e.childNodes) {
				for(let i=0; i<e.childNodes.length; i++) {
					visitNode(e.childNodes[i],{
						disableBlockProcessing: disableBlockProcessing
					});
				}
			}
			chunks.stack.pop();
			if(isonc && !options.disableBlockProcessing) {
				chunks.endChunk();
			} else if(isipc || (isonc && options.disableBlockProcessing)) {
				chunks.closeTag();
			}
			break;
		case 3: // Node.TEXT_NODE
			chunks.addText(e.nodeValue);
			break;
	}
}

// Utilities

function isStartOfNewChunk(tagName) {
	return [
		"div","p","h1","h2","h3","h4","h5","h6","li","center","blockquote","table","address","map","ol","ul"
	].indexOf(tagName) !== -1;
}

function isInterestingPhrasingContent(tagName) {
	return [
		"a",
		"tt","i","b","u","s","strike","big","small","font","em","strong","dfn","code","samp","kbd",
		"var","cite","abbr","acronym","sub","sup","q","span","bdo","a","img","basefont","br","area",
		"tbody","thead","tr","th","td",
		"svg","image"
	].indexOf(tagName) !== -1;
}

};

