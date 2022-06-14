/*\
title: $:/core/modules/widgets/historytracker.js
type: application/javascript
module-type: widget

historytracker widget

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var HistoryTrackerWidget = function(parseTreeNode,options) {
	// Main initialisation inherited from widget.js
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
HistoryTrackerWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
HistoryTrackerWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.historyTitle = this.getAttribute("history");
	this.elementTag = this.getAttribute("tag");
	this.makeChildWidgets();
	var tag = this.parseTreeNode.isBlock ? "div" : "span";
	if(this.elementTag && $tw.config.htmlUnsafeElements.indexOf(this.elementTag) === -1) {
		tag = this.elementTag;
	}
	var domNode = this.document.createElement(tag);
	domNode.className = "tc-history-tracker";
	this.domNode = domNode;
	parent.insertBefore(domNode,nextSibling);
	this.renderChildren(domNode,null);
	this.domNodes.push(domNode);
	this.navigate();
};

/*
Navigate to the current history entry
*/
HistoryTrackerWidget.prototype.navigate = function() {
	if(this.historyTitle) {
		var historyTiddler = this.wiki.getTiddler(this.historyTitle),
			targetTiddler = historyTiddler.fields["var-currentTiddler"],
			targetAnchor = historyTiddler.fields["var-anchor"];
		if(targetTiddler) {
			var domTargetTiddler = this.domNode.querySelector("[data-tiddler-title='" + $tw.utils.escapeCSS(targetTiddler) + "']");
			if(domTargetTiddler) {
				var domTargetAnchor = domTargetTiddler.querySelector("[id='" + $tw.utils.escapeCSS(targetAnchor) + "']");
			}
			var domTarget = domTargetAnchor || domTargetTiddler;
			$tw.pageScroller.scrollIntoView(domTarget);
		}
	}
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
HistoryTrackerWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	// Refresh ourselves if our tag has changed
	if(changedAttributes.tag) {
		this.refreshSelf();
		return true;
	}
	// Refresh children
	var result = this.refreshChildren(changedTiddlers);
	// Navigate if the history has changed
	if(changedAttributes.history || changedTiddlers[this.historyTitle]) {
		if(changedAttributes.history) {
			this.historyTitle = this.getAttribute("history");
		}
		this.navigate();
	}
	return result
};

exports.historytracker = HistoryTrackerWidget;

})();
