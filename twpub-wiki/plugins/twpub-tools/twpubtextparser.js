/*\
title: $:/core/modules/parsers/twpubtextparser.js
type: application/javascript
module-type: parser

Inherits from the base wikitext parser but is forced into inline mode

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var WikiParser = require("$:/core/modules/parsers/wikiparser/wikiparser.js")["text/vnd.tiddlywiki"],
	HtmlParser = $tw.modules.createClassFromModule(require("$:/core/modules/parsers/wikiparser/rules/html.js"),$tw.WikiRuleBase),
	EntityParser = $tw.modules.createClassFromModule(require("$:/core/modules/parsers/wikiparser/rules/entity.js"),$tw.WikiRuleBase);

var TwpubTextParser = function(type,text,options) {
	var parser = new WikiParser(type,text,$tw.utils.extend({},options,{
		parseAsInline: true,
		rules: {
			pragma: [],
			block: [],
			inline: [HtmlParser,EntityParser]
		}
	}));
	this.tree = parser.tree;
	this.prototype = parser.prototype;
};

exports["text/vnd.twpub"] = TwpubTextParser;

})();

