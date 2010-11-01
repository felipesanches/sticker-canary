
window["$"] = function(id) {
  return document.getElementById(id);
}

window["$tag"] = function(tagName) {
  return document.getElementsByTagName(tagName);
}

window["$class"] = function(className) {
  return document.getElementsByClassName(className);
}

const SVGNS = "http://www.w3.org/2000/svg";

function createEl(tagName, conf) {
  var el = document.createElementNS(SVGNS, tagName);
  if ( !conf ) conf = {};
  for ( var att in conf ) {
    if ( att == "parent" ) {
      if ( typeof(conf.parent) == "string" ) conf.parent = $(conf.parent);
      if ( conf.parent ) conf.parent.appendChild(el);
    } else {
      if ( /^on.+/.test(att) ) el[att] = conf[att];
      else el.setAttribute(att, conf[att]);
    }
  }
  return el;
}

function ajaxGet(url, callBack) {
  // Signature: callBack(success, xmlhttp)
  var req = XMLHttpRequest();
  req.open("GET", url, true);
  req.onreadystatechange = function(){
    if ( req.readyState == 4 ) {
      var success = (req.status == 200) || (req.status == 0);
      callBack( success, req );
    }
  };
  req.send(null);
}

