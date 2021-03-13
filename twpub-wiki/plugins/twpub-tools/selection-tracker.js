/*\
title: $:/plugins/tiddlywiki/twpub-tools/selection-tracker.js
type: application/javascript
module-type: startup

Background daemon to track the selection

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "selection-tracker";
exports.platforms = ["browser"];
exports.after = ["render"];
exports.synchronous = true;

exports.startup = function() {
	$tw.selectionTracker = new SelectionTracker($tw.wiki,{
		allowBlankSelectionPopup: true
	});
};

function SelectionTracker(wiki,options) {
	options = options || {};
	var self = this;
	this.wiki = wiki;
	var timerId = null;
	document.addEventListener("selectionchange",function(event) {
		if(timerId) {
			clearTimeout(timerId);
		}
		timerId = setTimeout(function() {
			timerId = null;
			self.handleSelectionChange();
		},500);
	});
}

SelectionTracker.prototype.handleSelectionChange = function() {
	var selection = document.getSelection();
	if(selection && selection.type === "Range") {
		// Helper to get the tiddler title corresponding to a chunk container
		var getTitleOfContainer = function(domNode) {
			return domNode.id;
		}
		// Get information about the selection anchor and focus
		var getSelectionInfo = function(targetDomNode,targetOffset) {
			// Find the chunk container node
			var domNode = targetDomNode;
			if(domNode.nodeType === Node.TEXT_NODE) {
				domNode = domNode.parentNode;
			}
			var container = domNode.closest(".twpub-chunk-frame");
			if(!container) {
				return null;
			}
			// Find the index of the container within the child nodes of its parent
			var childNodeIndex = Array.prototype.indexOf.call(container.parentNode.childNodes,container);
			// Walk through the chunk collecting the text before and after the specified domNode and offset
			var beforeText = null, afterText = [];
			var splitTextResult = function() {
					beforeText = afterText;
					afterText = [];
				},
				processNode = function(domNode) {
					// Check for a text node
					if(domNode.nodeType === Node.TEXT_NODE) {
						// If this is the target node then perform the split
						if(domNode === targetDomNode) {
							afterText.push(domNode.textContent.substring(0,targetOffset));
							splitTextResult();
							afterText.push(domNode.textContent.substring(targetOffset));
						} else {
							afterText.push(domNode.textContent);
						}
					} else {
						// Process the child nodes
						$tw.utils.each(domNode.childNodes,function(childNode,childNodeIndex) {
							// Check whether we need to split on this child node
							if(domNode === targetDomNode && childNodeIndex === targetOffset) {
								splitTextResult();
							}
							processNode(childNode);
						});
					}
				};
			processNode(container);
			if(beforeText === null) {
				splitTextResult();
			}
			// Return results
			return {
				container: container,
				childNodeIndex: childNodeIndex,
				beforeText: beforeText.join(""),
				afterText: afterText.join("")
			}

		}
		var anchor = getSelectionInfo(selection.anchorNode,selection.anchorOffset),
			focus = getSelectionInfo(selection.focusNode,selection.focusOffset);
		// Check that the containers share a parent
		if(anchor && focus && anchor.container.parentNode === focus.container.parentNode) {
			// Make sure that the anchor is before the focus
			if((anchor.childNodeIndex > focus.childNodeIndex) || (anchor.container === focus.container && anchor.beforeText.length > focus.beforeText.length)) {
				var temp = anchor; 
				anchor = focus; 
				focus = temp;
			}
			var chunks = [];
			// Check for the selection being all in one chunk
			if(anchor.container === focus.container) {
				chunks.push({
					title: getTitleOfContainer(anchor.container),
					prefix: anchor.beforeText,
					text: anchor.afterText.substring(0,anchor.afterText.length - focus.afterText.length),
					suffix: focus.afterText
				});
			} else {
				// We span two or more chunks
				chunks.push({
					title: getTitleOfContainer(anchor.container),
					prefix: anchor.beforeText,
					text: anchor.afterText
				});
				// Get the titles and text of the intervening tiddlers
				var domNode;
				if(anchor.container !== focus.container) {
					domNode = anchor.container.nextElementSibling;
					while(domNode && domNode !== focus.container) {
						chunks.push({
							title: getTitleOfContainer(domNode),
							text: domNode.textContent
						});
						domNode = domNode.nextElementSibling;
					}					
				}
				chunks.push({
					title: getTitleOfContainer(focus.container),
					text: focus.beforeText,
					suffix: focus.afterText
				});
			}
			// Get the title of the tiddler containing the actions to be executed
			var actionsTiddler = anchor.container.parentNode.getAttribute("data-selection-actions-title");
			// Action the selection
			this.performSelectionActions({
				chunks: chunks,
				actionsTiddler: actionsTiddler
			});
		}
	}
};

SelectionTracker.prototype.performSelectionActions = function(options) {
	// Create the annotated tiddlers and the annotation tiddlers
	var annotatedTiddlerTitles = [];
	for(var index=0; index<options.chunks.length; index++) {
		var chunk = options.chunks[index];
		var existingTiddler = $tw.wiki.getTiddler(chunk.title);
		// Override the chunks to add the dynannotate code if they are still shadow tiddlers
		if(!$tw.wiki.tiddlerExists(chunk.title)) {
			$tw.wiki.addTiddler(new $tw.Tiddler(existingTiddler,$tw.wiki.getModificationFields(),{
				text: $tw.wiki.getTiddlerText("$:/plugins/immateriel/twpub-tools/templates/new-chunk").replace("****INSERTION**POINT****",existingTiddler.fields.text),
				tags: ["$:/tags/TwpubAnnotated"]
			}));
		}
		annotatedTiddlerTitles.push(chunk.title);
		$tw.wiki.addTiddler(new $tw.Tiddler($tw.wiki.getModificationFields(),{
			title: $tw.wiki.generateNewTitle("$:/twpub/annotation"),
			"annotate-tiddler": chunk.title,
			"annotate-text": chunk.text,
			"annotate-prefix": chunk.prefix,
			"annotate-suffix": chunk.suffix,
			tags: ["$:/tags/TwpubAnnotation"]
		}));
	}
	// Create the extract tiddler
	var extractTiddlerTitle = $tw.wiki.generateNewTitle("Extract"),
		draftTiddlerTitle = $tw.wiki.generateNewTitle("Draft of '" + extractTiddlerTitle + "'");
	$tw.wiki.addTiddler(new $tw.Tiddler({
		title: draftTiddlerTitle,
		"draft.of": extractTiddlerTitle,
		"draft.title": extractTiddlerTitle,
		text: "Please type your notes here",
		tags: ["$:/tags/TwpubExtract"],
		list: annotatedTiddlerTitles
	}));
	// Invoke the actions, passing the extract tiddler title as a variable
	if(options.actionsTiddler) {
		var actions = $tw.wiki.getTiddlerText(options.actionsTiddler)
		if(actions) {
			$tw.rootWidget.invokeActionString(actions,undefined,undefined,{
				modifiedTiddler: draftTiddlerTitle
			});
		}
	}
};

})();
