function Composition(cName, dPage) {
  this.name = cName;
  this.dPage = dPage;
  this.conf = {
    x: dPage.compositions[cName].x,
    y: dPage.compositions[cName].y,
    rotate: dPage.compositions[cName].rotate
  };

  var baseConf = stickerCanary.currentAlbum.compositions[cName];
  for (var attr in baseConf){
    this.conf[attr] = baseConf[attr];
  }
  
  this.compositionLayout = stickerCanary.currentAlbum.compositionLayout;
  this.stickerLayout = stickerCanary.currentAlbum.stickerLayout;
}

Composition.prototype.evalCompositionCode = function(code) {
  var currentComposition = {
    width: stickerCanary.toUserUnit( this.stickerLayout.width ) * this.conf.matrix.cols,
    height: stickerCanary.toUserUnit( this.stickerLayout.height ) * this.conf.matrix.rows
  };  
  return eval(code);
}

Composition.prototype.generateSlot = function() {
  var svg = stickerCanary.doc.documentElement;
  var self = this;
  var svgCode = this.compositionLayout.slot.replace( /<%(.*?)%>/g,
    function(match, code){
      return self.evalCompositionCode(code);
    });
  var parser = new DOMParser();
  var dom = parser.parseFromString('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">'+svgCode+"</svg>", "text/xml");

  var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("transform", "translate("+ self.conf.x +","+ self.conf.y 
                                  +") rotate("+self.conf.rotate+")");
  // Copy the sticker sluts to the page:
  while ( dom.documentElement.hasChildNodes() ) {
    group.appendChild( dom.documentElement.firstChild );
  };
  svg.appendChild(group);
}

Composition.prototype.generateFront = function() {
  
}

Composition.prototype.generateBack = function() {
  // TODO
}
