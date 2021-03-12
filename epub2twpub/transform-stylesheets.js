/*
Transform CSS
*/

const css = require("css");

/*
Not accepted CSS properties are omitted and an optional scoping class is added to each selector
*/
function cleanStylesheet(text,scopingClass) {
	const ACCEPTED_PROPERTIES = [
		// "background-color",
		"clear",
		// "color",
		"display",
		"float",
		// "font-size",
		"font-style",
		"font-weight",
		// "height",
		// "line-height",
		"list-style-type",
		"text-align",
		"text-decoration",
		// "text-indent",
		"text-transform"
		// "white-space",
		// "width"
	];
	const obj = css.parse(text,{
		silent: true
	});
	const visitNode = node => {
		if(Array.isArray(node)) {
			node.forEach(node => visitNode(node));
		} else if(typeof node === "object") {
			// Adjust selectors to add a scoping class
			if(node.selectors && scopingClass) {
				node.selectors.forEach((selector,index) => {
					node.selectors[index] =  "." + scopingClass + " " + selector;
				});
			}
			// Remove any properties not on the accept list
			if(node.declarations) {
				for(let d=node.declarations.length-1; d>=0; d--) {
					const declaration = node.declarations[d];
					if(ACCEPTED_PROPERTIES.indexOf(declaration.property) === -1) {
						node.declarations.splice(d,1);
					}
				}
			}
			Object.keys(node).forEach(key => {
				visitNode(node[key]);
			});
		}
	};
	visitNode(obj);
	return css.stringify(obj,{
		compress: true
	});
}

exports.cleanStylesheet = cleanStylesheet;

function cleanStyleAttribute(text) {
	const PREFIX = "html {",
		SUFFIX = "}";
	text = cleanStylesheet(PREFIX + text + SUFFIX);
	return text.slice(5,-1);
}

exports.cleanStyleAttribute = cleanStyleAttribute;
