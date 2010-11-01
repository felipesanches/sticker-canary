const stickerCanary = new Object();

stickerCanary.init = function() {
  this.svg = $tag("svg")[0];
  this.compositions = [];
  include(jslib_dir)
  include(jslib_dirutils)
  var dirUtils = new DirUtils; 
  chromeDir = new Dir(dirUtils.getChromeDir());
  this.appDir = chromeDir.parent;
  //alert(this.appDir)//.append("xxx") )
}

stickerCanary.getUnit = function(value) {
  var unit = value.toString().replace(/[.0-9 ]/g, "");
  if ( unit == "" ) unit = "px";
  return unit;
}

stickerCanary.userUnitConv = {
  in: 90.0,
  pt: 1.25,
  px: 1,
  mm: 3.5433070866,
  cm: 35.433070866,
  pc: 15.0
};

stickerCanary.toUserUnit = function(value) {
  var unit = this.getUnit(value);
  return parseFloat(value) * this.userUnitConv[unit];
}

stickerCanary.getDoublePageFromIndex = function(doublePageIndex) {
  return this.currentAlbum.doublePages[doublePageIndex];
}
stickerCanary.getMasterFromDoublePage = function(doublePage) {
  return this.currentAlbum.masterPages[doublePage.masterPage];
}

stickerCanary.evalMasterTemplateCode = function(code, doublePageIndex) {
  var dPage = this.getDoublePageFromIndex(doublePageIndex);
  var master = this.getMasterFromDoublePage(dPage);
  var page = {
    width:  this.toUserUnit( this.currentAlbum.config.pageWidth ),
    height: this.toUserUnit( this.currentAlbum.config.pageHeight ),
    left:   { number: 2*doublePageIndex + 1 },
    right:  { number: 2*doublePageIndex + 2 }
  };
  return eval(code);
}

stickerCanary.generateDoublePage = function(doublePageIndex) {
  var dPage = this.getDoublePageFromIndex(doublePageIndex);
  var master = this.getMasterFromDoublePage(dPage);

  // Parse and translate master content:
  var svgCode = master.replace( /<%(.*?)%>/g,
        function(match, code){ return stickerCanary.evalMasterTemplateCode(code, doublePageIndex) }
      );
  var parser = new DOMParser();
  var dom = parser.parseFromString('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">'+svgCode+"</svg>", "text/xml");
  
  // Copy the master content to the page:
  while ( dom.documentElement.hasChildNodes() ) {
    this.albumLayer.appendChild( dom.documentElement.firstChild );
  }

  // TODO: Put the dPage.svgExtras on the svg
  
  for ( var cName in dPage.compositions ) {
    var composition = new Composition(cName, dPage, function(composition){
      // Put the Slots on the page
      composition.generateSlot();
      // Put the Stickers on the page
      composition.generateFront();
      //create control handles on the ctrlLayer
      composition.generateControls();
    });
    
    //TODO: review:
    this.compositions.push(composition);
  }
}

stickerCanary.generateStickersNumbering = function() {
  var clips = {}
  var counter = 1;
  for (var dp in this.currentAlbum.doublePages){
    var dp = this.currentAlbum.doublePages[dp];
    for (var composition in dp.compositions){
      var composition = dp.compositions[composition];
      var cols = composition.matrix.cols;
      var rows = composition.matrix.rows;
      composition.baseNumber = counter;
      counter += cols * rows;
      if (!clips[[cols,rows]]){
        clips[[cols,rows]] = true;
        this.generateClipPath(rows,cols);
      }
    }
  }
}

stickerCanary.generateClipPath = function(rows,cols) {
  const SVGNS = "http://www.w3.org/2000/svg";
  var margin = stickerCanary.toUserUnit( this.currentAlbum.compositionLayout.margin );
  var stickerLayout = this.currentAlbum.stickerLayout;
  var clipId = "composition-clip-"+rows+"-"+cols;
  var clipPath = document.createElementNS(SVGNS, "clipPath");
  clipPath.setAttribute("id", clipId);
  
//  <rect x="0" y="0" width="100" height="100" />
  var path = document.createElementNS(SVGNS, "rect");
  path.setAttribute("x", margin);
  path.setAttribute("y", margin);
  path.setAttribute("width", stickerCanary.toUserUnit(stickerLayout.width)*cols - 2*margin);
  path.setAttribute("height", stickerCanary.toUserUnit(stickerLayout.height)*rows - 2*margin);

  //var path = document.createElementNS(SVGNS, "path");
  //path.setAttribute("d", "M 0,0 h 100 v 100 h -100 v -100");

  clipPath.appendChild(path);
  
  var defs = document.getElementsByTagName("defs")[0];
  defs.appendChild(clipPath);
}

stickerCanary.setSVGSize = function(){
  var unit = this.getUnit(this.currentAlbum.config.pageWidth);
  this.dPageSize = {
      width: this.toUserUnit(this.currentAlbum.config.pageWidth) * 2,
      height: this.toUserUnit(this.currentAlbum.config.pageHeight)
  }
  this.svg.setAttribute( "width", this.dPageSize.width );
  this.svg.setAttribute( "height", this.dPageSize.height );
}

stickerCanary.loadAlbum = function(albumURI, callBack) {
  ajaxGet( albumURI,
    function(success, req){
      if ( success ) {
        try {
          //TODO: Replace eval by native JSON decode.
          eval("var album = "+req.responseText);
          stickerCanary.loadAlbumFromJSON( album, callBack );
        } catch(e) {
          callBack(false, "JSON parsing ERROR:\n"+e);
        }
      } else {
        callBack(false, 'Fail to load Album "'+albumURI+'".');
      }
      return success;
    }
  );
  // This is a option to replace ajaxGet, but is not working
  //var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]  
  //                       .getService(Components.interfaces.mozIJSSubScriptLoader);
  //var album;
  //loader.loadSubScript(albumURI, album);
  //this.loadAlbumFromJSON( album );
}

stickerCanary.loadAlbumFromJSON = function(albumJSON, callBack) {
  this.currentAlbum = albumJSON;
  this.generateStickersNumbering();
  this.setSVGSize();
  this.albumLayer = createEl("g", { id:"album-layer", parent:this.svg });
  this.ctrlLayer = createEl("g", { id:"ctrl-layer", parent:this.svg });  
  this.albumLayer.addEventListener("click", function(e){
    if(e.target.tagName != "image"){ //This may break when we add background images...
      Composition.selectedComposition.hideHandles();
    }
  }, false);
  callBack(true, "No error");
}

stickerCanary.setZoomLevel = function(scale){
  stickerCanary.currentScale = scale;
  this.albumLayer.setAttribute("transform","scale("+scale+")");
  this.svg.setAttribute("width", this.dPageSize.width * scale);
  this.svg.setAttribute("height", this.dPageSize.height * scale);

  for (var c in this.compositions){
    this.compositions[c].updateControls();
  }
}

