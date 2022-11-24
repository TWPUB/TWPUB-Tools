/*\
title: $:/core/modules/utils/dom/scroller.js
type: application/javascript
module-type: utils

Module that creates a $tw.utils.Scroller object prototype that manages scrolling in the browser

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Event handler for when the `tm-scroll` event hits the document body
*/
var PageScroller = function() {
	this.currentlyScrollingTo = null;
	this.idRequestFrame = null;
	this.requestAnimationFrame = window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		function(callback) {
			return window.setTimeout(callback, 1000/60);
		};
	this.cancelAnimationFrame = window.cancelAnimationFrame ||
		window.webkitCancelAnimationFrame ||
		window.webkitCancelRequestAnimationFrame ||
		window.mozCancelAnimationFrame ||
		window.mozCancelRequestAnimationFrame ||
		function(id) {
			window.clearTimeout(id);
		};
};

PageScroller.prototype.isScrolling = function() {
	return !!this.currentlyScrollingTo;
}

PageScroller.prototype.cancelScroll = function(srcWindow) {
	if(this.currentlyScrollingTo) {
		this.currentlyScrollingTo.scrollIntoView();
		this.currentlyScrollingTo = null;
	}
};

/*
Handle an event
*/
PageScroller.prototype.handleEvent = function(event) {
	if(event.type === "tm-scroll") {
		if(event.paramObject && event.paramObject.selector) {
			this.scrollSelectorIntoView(null,event.paramObject.selector);
		} else {
			this.scrollIntoView(event.target);			
		}
		return false; // Event was handled
	}
	return true;
};

/*
Handle a scroll event hitting the page document
*/
PageScroller.prototype.scrollIntoView = function(element,callback) {
console.log("Scrolling to",element)
	this.cancelScroll();
	this.currentlyScrollingTo = element;
	element.scrollIntoView({behavior: "smooth"});
	$tw.utils.addClass(element,"tc-navigating");
	setTimeout(function() {
		this.currentlyScrollingTo = null;
		$tw.utils.removeClass(element,"tc-navigating");
		if(callback) {
			callback();
		}
	},300);
};

PageScroller.prototype.scrollSelectorIntoView = function(baseElement,selector,callback) {
	baseElement = baseElement || document.body;
	var element;
	try {
		element = baseElement.querySelector(selector);
	} catch(e) {
		// Ignore bad selectors
	}
	if(element) {
		this.scrollIntoView(element,callback);
	}
};

exports.PageScroller = PageScroller;

})();
