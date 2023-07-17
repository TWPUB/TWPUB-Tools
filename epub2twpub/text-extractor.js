/*
Class representing the jsdom wrapper for get-page-struct.js
*/

const { JSDOM } = require("jsdom");
const { getPageStruct } = require("./get-page-struct");
const URL_PREFIX = "https://example.com/";

class TextExtractor {

  /**
   * Options:
   * @param {*} options 
   * @field getFile: function(href) returns {type:, contents:}
   * @field logError: function(msg)
   */
  constructor(options) {
    this.getFile = options.getFile;
    this.logError = options.logError;
  }


  /**
   * @description 从文件中获取内容，通过JSDOM解析内容获得dom对象。然后通过getStructure传入DOM获得格式化的结构，返回结构。
   * @param {string} href filename: Text/chapter82.xhtml, But the first character cannot be a '/'
   * @returns Return a structure：{chunks: [], stylsheets: [text]}。
   */
  async getPageText(href) {
    const { type, contents } = await this.getFile(href);
    if (!type) {
      this.logError(`Missing file \`${href}\``);
      return "";
    } else {
      var window = new JSDOM(contents, {
        contentType: type,
        url: URL_PREFIX + href,
        runScripts: "dangerously"
      }).window;
      var document = window.document;
      var result = getPageStruct(window, document);
    }
    return result;
  }

}

exports.TextExtractor = TextExtractor;
