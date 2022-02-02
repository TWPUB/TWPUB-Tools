/*\
title: $:/core/modules/storyviews/scrollstoryview.js
type: application/javascript
module-type: storyview

Scrolls to newly inserted items

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var ScrollStoryView = function(listWidget) {
    this.listWidget = listWidget;
};

ScrollStoryView.prototype.insert = function(widget) {
    var targetElement = widget.findFirstDomNode();
    // Abandon if the list entry isn't a DOM element (it might be a text node)
    if(!(targetElement instanceof Element)) {
        return;
    }
    var duration = $tw.utils.getAnimationDuration();
    if(duration) {
        // Scroll the node into view
        this.listWidget.dispatchEvent({type: "tm-scroll", target: targetElement});
    } else {
        targetElement.scrollIntoView();
    }
};

exports.scroll = ScrollStoryView;

})();