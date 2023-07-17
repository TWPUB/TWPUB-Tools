/*
Class representing a twpub plugin
*/

const {cleanStylesheet,cleanStyleAttribute} = require("./transform-stylesheets"),
	{flattenTree} = require("./flatten-tree"),
	{hash} = require("./utils");

const URL_PREFIX = "https://example.com/";

class TwpubPlugin {

	constructor (app,options) {
		this.app = app;
		this.epubReader = options.epubReader; // EpubReader object instance
		this.fields = {}; // Fields of the plugin tiddler itself
		this.tiddlers = {}; // Payload tiddlers
		this.errors = []; // Array of conversion errors
	}

	logError(message) {
		this.errors.push(message);
	}

	convertEpub() {
		// Get the hash of the epub
		this.hash = this.epubReader.epubHash.slice(0,16);
		// Construct the title of the plugin
		this.titlePrefix = "$:/plugins/twpub/" + this.hash;
		// For text chunks, make a map of href (including anchor) to title
		this.createAnchorToTitleMapping();
		// Convert the text, TOC, stylesheets and images into tiddlers
		this.convertText();
		this.convertToc();
		this.convertStylesheets();
		this.convertImages();
		// Setup the fields of the plugin tiddler
		this.fields.list = "readme errors cover text";
		this.fields.version = "v0.0.1";
		this.fields["plugin-type"] = "plugin";
		this.fields.type = "application/json";
		this.fields["epub-title"] = this.epubReader.getMetadataItem("dc:title","(Untitled)");
		this.fields.name = "TWPUB";
		this.fields.title = this.titlePrefix;
		this.fields.description = this.fields["epub-title"];
		this.fields["converter-version"] = this.app.version.toString();
		this.fields["epub-creator"] = this.epubReader.getMetadataItem("dc:creator","(Unknown)");
		this.fields["conversion-errors"] = this.errors.length.toString();
		this.fields["count-chunks"] = this.epubReader.chunks.length.toString();
		this.fields["count-images"] = Object.keys(this.epubReader.images).length.toString();
		// Cover tab
		if(this.epubReader.hasMetadataItem("cover")) {
			// Use only the file name.
			const href = this.epubReader.getManifestItem(this.epubReader.getMetadataItem("cover")).href;
			if(href) {
				this.fields["cover-image"] = this.titlePrefix + "/images/" + href;
				this.addTiddler({
					title: this.titlePrefix + "/cover",
					type: "text/vnd.tiddlywiki",
					text: "<$transclude tiddler=\"" + this.titlePrefix + "\" subtiddler=\"" + this.fields["cover-image"] + "\"/>" 
				});
			}
		}
		// Readme tab
		this.addTiddler({
			title: this.titlePrefix + "/readme",
			type: "text/vnd.tiddlywiki",
			text: ["epub-title",
					"epub-creator",
					"converter-version",
					"conversion-errors",
					"count-chunks",
					"count-images"
				].filter(field => field in this.fields).map(field => `|${field} |''${this.fields[field]}'' |`).join("\n")
		});
		// Errors tab
		this.addTiddler({
			title: this.titlePrefix + "/errors",
			type: "text/vnd.tiddlywiki",
			text: this.epubReader.errors.concat(this.errors).map(message => "# " + message + "\n").join("\n") || "None"
		});
		// Full text tab
		this.addTiddler({
			title: this.titlePrefix + "/text",
			type: "text/vnd.tiddlywiki",
			text: `\\define link-actions()
<$action-sendmessage $message="tm-scroll" selector={{{ [<navigateTo>escapecss[]addprefix[#]] }}}/>
\\end

<$linkcatcher actions=<<link-actions>>>

<div class="tc-table-of-contents">
<<toc "${this.titlePrefix}/toc">>
</div>

<$list filter="[all[tiddlers+shadows]prefix[${this.titlePrefix}/text/]sort[]]">
<a id=<<currentTiddler>>>
<$transclude mode="inline"/>
</a>
</$list>

</$linkcatcher>`
		});
	}
	
	/**
	 * Create an anchor to title map, chunk.href from the startChunk() function.
	 */
	createAnchorToTitleMapping() {
		this.mapAnchorToTitle = Object.create(null);
		this.epubReader.chunks.forEach((chunk,index) => {
			const title = this.makeTextTiddlerTitle(index);
			// If we've not seen the file before, add a mapping for the file itself, without an anchor ID
			if(!this.mapAnchorToTitle[chunk.href]) {
				this.mapAnchorToTitle[chunk.href] = title;
			}
			// Add mappings for each anchor ID
			chunk.anchorIds.forEach(anchorId => {
				if(!this.mapAnchorToTitle[chunk.href + "#" + anchorId]) {
					this.mapAnchorToTitle[chunk.href + "#" + anchorId] = title;							
				}
			});
		});
	}

	/**
	 * Make text tiddler title
	 * @param {*} index 0-n, integer
	 * @returns Similar: '$:/plugins/twpub/id/text/000000001'
	 */
	makeTextTiddlerTitle(index) {
		return this.titlePrefix + "/text/" + index.toString().padStart(9,"0");
	}

	convertText() {
		this.epubReader.chunks.forEach((chunk,index) => {
			// Construct the title for this chunk
			const title = this.makeTextTiddlerTitle(index);
			// Collect the scoping classes to be wrapped around this chunk
			const scopingClasses = chunk.stylesheetIds.map(id => this.makeStylesheetScopeClass(id));
			// Process some elements and attributes to wikitext
			this.processTextChunk(chunk);
			// Flatten the nodes to text
			const flatText = flattenTree(chunk.nodes);
			// Add the tiddler
			this.addTiddler({
				role: "text",
				title: title,
				type: "text/vnd.twpub",
				text: "<div class=\"" + scopingClasses.join(" ") + "\">" + flatText + "</div>"
			});
		});
	}

	processTextChunk(chunk) {
		// Visit each node to apply our custom processing
		const visitNode = node => {
				if(typeof node !== "string") {
					// Attribute-specific processing
					if(node.attributes && node.attributes.style) {
						// Clean style attributes
						node.attributes.style = cleanStyleAttribute(node.attributes.style);
					}
					// Element-specific processing
					switch(node.tag) {
						// Replace <img> tags with <$image> widgets
						case "img":
							node.tag = "$image";
							node.attributes.source = this.titlePrefix + "/images/" + node.attributes.src;
							delete node.attributes.src;
							break;
						// Replace <a> tags with <$link> widgets
						case "a":
							if(node.attributes && node.attributes.href) {
								if(node.attributes.href.startsWith(URL_PREFIX)) {
									// It's an internal link
									var target = node.attributes.href.slice(URL_PREFIX.length);
									if(target.charAt(0) === "/") {
										target = target.slice(1);
									}
									const anchorId = this.mapAnchorToTitle[target];
									if(anchorId) {
										node.tag = "$link";
										node.attributes.to = anchorId;
										delete node.attributes.href;
										// Provide dummy content if there are no child nodes to avoid the <$link>
										// widget using the target title as the default link text
										if(node.childNodes.length === 0) {
											node.childNodes = [{
												tag: "$text",
												attributes: {
													text: ""
												},
											}];
										}
										return
									} else {
										this.logError(`Missing TOC link to \`${target}\` from \`${chunk.href}\``);
									}
								} else {
									// It's an external link
									node.attributes.rel = "noopener noreferrer";
									node.attributes.target = "_blank";
								}
							}
							break;
					}
				}
				visitNodes(node.childNodes);
			},
			visitNodes = childNodes => {
				childNodes = childNodes || [];
				for(const childNode of childNodes) {
					visitNode(childNode);
				}
			};
		visitNodes(chunk.nodes);
	}

	/**
	 * @description this.mapAnchorToTitle 来自 createAnchorToTitleMapping() 函数创建的映射。
	 */
	convertToc() {
		const visitNodes = (nodes,tag) => {
			const titles = [];
			nodes.forEach(node => {
				titles.push(visitNode(node,tag));
			});
			return titles;
		};
		const visitNode = (node,tag) => {
			const title = this.titlePrefix + "/toc/" + node.id;
			const childTitles = visitNodes(node.children,title);
			var target = node.href;
			if(target.charAt(0) === "/") {
				target = target.slice(1);
			}
			const targetTitle = this.mapAnchorToTitle[target];
			if(!targetTitle) {
				console.log("Missing link to",target)
			}
			this.addTiddler({
				title: title,
				caption: node.text,
				tags: tag,
				target: targetTitle,
				list: stringifyList(childTitles),
				role: "toc"
			});
			return title;
		};
		visitNodes(this.epubReader.toc,this.titlePrefix + "/toc");
	}

	makeStylesheetScopeClass(id) {
		return "twpub-" + this.hash + "-" + id;
	}

	convertStylesheets() {
		const scopingClasses = Object.keys(this.epubReader.stylesheets).map(id => this.makeStylesheetScopeClass(id)),
			makeSelectors = target => scopingClasses.map(className => "." + className + " " + target).join(","),
			cleanText = [];
		cleanText.push(`
			${makeSelectors("blockquote")} {
				border-color: initial;
				border-style: initial;
				margin: initial;
				padding: initial;
				quotes: initial;
			}
		`);
		for(const id in this.epubReader.stylesheets) {
			cleanText.push(cleanStylesheet(this.epubReader.stylesheets[id],this.makeStylesheetScopeClass(id)));
		};
		this.addTiddler({
			role: "stylesheet",
			title: this.titlePrefix + "/stylesheets",
			type: "text/css",
			tags: "$:/tags/Stylesheet",
			text: cleanText.join("\n")
		});
	}

	/**
	 * Convert book images to articles for easy reuse.
	 */
	convertImages() {
		for(const imagePath in this.epubReader.images) {
			const imageInfo = this.epubReader.images[imagePath];
			this.addTiddler({
				role: "image",
				title: this.titlePrefix + "/images/" + imagePath,
				type: imageInfo.type,
				text: imageInfo.text
			});
		};
	}

	addTiddler(fields) {
		this.tiddlers[fields.title] = fields;
	}

	/**
	 * Get the JSON of the entire plugin
	 */
	getPluginText() {
		this.fields.text = JSON.stringify({tiddlers: this.tiddlers},null,4)
		// Replace "<" with "\u003c" to avoid HTML parsing errors when the JSON is embedded in a script tag
		return JSON.stringify(this.fields,null,4).replace(/</g,"\\u003c");
	}

}

function stringifyList(value) {
	if(Array.isArray(value)) {
		const result = new Array(value.length);
		for(const t of value) {
			const entry = value[t] || "";
			if(entry.indexOf(" ") !== -1) {
				result[t] = "[[" + entry + "]]";
			} else {
				result[t] = entry;
			}
		}
		return result.join(" ");
	} else {
		return value || "";
	}
};

exports.TwpubPlugin = TwpubPlugin;
