/*\
title: $:/core/modules/widgets/drawcanvas.js
type: application/javascript
module-type: widget

Draws HTML content to a canvas element.

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var DrawCanvasWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
DrawCanvasWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
DrawCanvasWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();
	// Create the canvas
	var domNode = this.document.createElement("canvas");
	var ctx = domNode.getContext("2d");
	// Adjust the size to match the device pixel ratio
	domNode.width = this.canvasWidth * window.devicePixelRatio;
	domNode.height = this.canvasHeight * window.devicePixelRatio;
	ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	domNode.style.width = this.canvasWidth + "px";
	domNode.style.height = this.canvasHeight + "px";
	// Render the tiddler

	var variables = {};
	var parser = this.wiki.parseTiddler(this.canvasTiddler);
	var renderedDoc = document.implementation.createHTMLDocument(""),
		widgetNode = this.wiki.makeWidget(parser,{variables: variables,document,renderedDoc}),
		container = renderedDoc.createElement("div");
	renderedDoc.body.appendChild(container);
	widgetNode.render(container,null);
	// Draw something
	var x = 0, y = 0;
	renderedDoc.documentElement.setAttribute("xmlns",renderedDoc.documentElement.namespaceURI);
	var xml = (new XMLSerializer).serializeToString(renderedDoc.body);
	xml = xml.replace(/\#/g, "%23");
	var imageDate = [
		"data:image/svg+xml;charset=utf-8,",
		'<svg xmlns="http://www.w3.org/2000/svg" width="',
		this.canvasWidth,
		'" height="',
		this.canvasHeight,
		'">',
		'<foreignObject width="100%" height="100%">',
		xml,
		'</foreignObject>',
		'</svg>'
	].join("");
	var img = new Image();
	img.onload = function () {
		ctx.drawImage(img, x, y);
	}
	img.src = imageDate;
	// Insert element
	parent.insertBefore(domNode,nextSibling);
	this.domNodes.push(domNode);
};

/*
Compute the internal state of the widget
*/
DrawCanvasWidget.prototype.execute = function() {
	// Get our parameters
	this.canvasWidth = this.getAttribute("width","100");
	this.canvasHeight = this.getAttribute("height","100");
	this.canvasTiddler = this.getAttribute("tiddler");
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
DrawCanvasWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	if(changedAttributes.width || changedAttributes.height) {
		this.refreshSelf();
		return true;
	} else {
		return false;
	}
};

exports.drawcanvas = DrawCanvasWidget;

})();
