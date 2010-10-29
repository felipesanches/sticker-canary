
window["$"] = function(id) {
  return document.getElementById(id);
}

window["$tag"] = function(tagName) {
  return document.getElementsByTagName(tagName);
}

window["$class"] = function(className) {
  return document.getElementsByClassName(className);
}
