/*
Flatten a tree into an array of text blocks
*/

const {htmlEncode,isTreatedAsSelfClosingTagByTiddlyWiki} = require("./utils");

exports.flattenTree = function(nodes) {
	const output = [],
		visitNode = function(node) {
			if(typeof node === "string") {
				output.push(htmlEncode(node));
			} else {
				output.push("<" + node.tag);
				const attributes = node.attributes || {},
					attributeNames = Object.keys(attributes);
				if(attributeNames.length > 0) {
					attributeNames.forEach(attributeName => {
						const attributeValue = attributes[attributeName];
						if(typeof attributeValue === "string") {
							output.push(" " + attributeName + "=\"" + htmlEncode(attributeValue) + "\"");
						} else {
							const propertyNames = Object.keys(attributeValue);
							if(propertyNames.length > 0) {
								output.push(" " + attributeName + "=\"");
								propertyNames.forEach(propertyName => {
									output.push(propertyName + ":" + htmlEncode(attributeValue[propertyName]) + ";");
								});
								output.push("\"");
							}
						}
					});
				}
				output.push(">");
				if(!isTreatedAsSelfClosingTagByTiddlyWiki(node.tag)) {
					visitNodes(node.childNodes);
					output.push("</" + node.tag + ">");
				}
			}
		},
		visitNodes = function(nodes) {
			nodes = nodes || [];
			for(const node of nodes) {
				visitNode(node);
			}
		};
	visitNodes(nodes);
	return output.join("");
};
