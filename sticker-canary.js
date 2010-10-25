const stickerCanary = new Object();

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
  // Resize SVG:
  var svg = this.doc.documentElement;
  var unit = this.getUnit(this.currentAlbum.config.pageWidth);
  svg.setAttribute( "width", parseFloat(this.currentAlbum.config.pageWidth) * 2 + unit );
  svg.setAttribute( "height", this.currentAlbum.config.pageHeight );
  // Parse and translate master content:
  var svgCode = master.replace( /<%(.*?)%>/g,
        function(match, code){ return stickerCanary.evalMasterTemplateCode(code, doublePageIndex) }
      );
  var parser = new DOMParser();
  var dom = parser.parseFromString('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">'+svgCode+"</svg>", "text/xml");
  
  // Copy the master content to the page:
  while ( dom.documentElement.hasChildNodes() ) {
    svg.appendChild( dom.documentElement.firstChild );
  }

  // TODO: Put the dPage.svgExtras on the svg
  
  for ( var cName in dPage.compositions ) {
    // Put the Slots on the page
    var composition = new Composition(cName, dPage);
    composition.generateSlot();
    // Put the Stickers on the page
    //...
  }
}

stickerCanary.generateStickersNumbering = function() {
  var counter = 1;
  for (var dp in this.currentAlbum.doublePages){
    var dp = this.currentAlbum.doublePages[dp];
    for (var composition in dp.compositions){
      var composition = dp.compositions[composition];
      composition.baseNumber = counter;
      counter += composition.matrix.cols * composition.matrix.rows;
    }
  }
}

stickerCanary.loadAlbum = function(jsonAlbum) {
  this.currentAlbum = jsonAlbum;
  this.generateStickersNumbering();  
}

