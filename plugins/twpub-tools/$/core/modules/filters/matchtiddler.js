/*\
title: $:/core/modules/filters/matchtiddler.js
type: application/javascript
module-type: filteroperator

Filter operator for finding matching tiddlers

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Export our filter function
*/
exports.matchtiddler = function(source,operator,options) {
	var results = [],
		targetTiddler = options.wiki.getTiddler(operator.operand),
		matchTo = (operator.prefix !== "!");
	// No result if the target tiddler doesn't exist
	if(!targetTiddler) {
		return [];
	}
	// Iterate through the source
	source(function(tiddler,title) {
		// Ignore any titles that aren't tiddlers
		if(tiddler) {
			if(targetTiddler.isEqual(tiddler,["title","created","modified","draft.of","draft.title"]) === matchTo) {
				results.push(title);
			}
		}
	});
	return results;
};

})();
