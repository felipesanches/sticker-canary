const SVGNS = "http://www.w3.org/2000/svg";

function knot(obj, x0,y0,r,fill){
  var svg = document.documentElement;
  if (!r) r=5;
  if (!fill) fill="black";
  this.x = x0;
  this.y = y0;
  this.ctrlElement = document.createElementNS(SVGNS, "circle");
  this.ctrlElement.setAttribute("cx", this.x);
  this.ctrlElement.setAttribute("cy", this.y);
  this.ctrlElement.setAttribute("r", r);
  this.ctrlElement.setAttribute("fill", fill);

  svg.appendChild(this.ctrlElement);
  
  var self = this;
  document.addEventListener("mousemove", function(e){
    if(self.drag){
      self.x = e.pageX;    
      self.y = e.pageY;
      self.ctrlElement.setAttribute("cx", self.x);
      self.ctrlElement.setAttribute("cy", self.y);
    }
  }, false);
  
  document.addEventListener("mouseup", function(e){
    self.drag = false;
    obj.x = self.x;
    obj.y = self.y;
  }, false);
  this.ctrlElement.onmousedown = function(e){self.drag = true;}
}

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
    composition.generateFront();
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

stickerCanary.loadAlbum = function(jsonAlbum) {
  this.currentAlbum = jsonAlbum;
  this.generateStickersNumbering();
}

