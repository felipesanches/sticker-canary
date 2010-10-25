function Composition(cName, dPage) {
  this.name = cName;
  this.dPage = dPage;
  this.conf = dPage.compositions[cName];  
  this.compositionLayout = stickerCanary.currentAlbum.compositionLayout;
  this.stickerLayout = stickerCanary.currentAlbum.stickerLayout;
  this.stickerLayout.width = stickerCanary.toUserUnit(this.stickerLayout.width);
  this.stickerLayout.height = stickerCanary.toUserUnit(this.stickerLayout.height);
}

Composition.prototype.evalCompositionCode = function(code) {
  var currentComposition = {
    width: stickerCanary.toUserUnit( this.stickerLayout.width ) * this.conf.matrix.cols,
    height: stickerCanary.toUserUnit( this.stickerLayout.height ) * this.conf.matrix.rows
  };
  return eval(code);
}

Composition.prototype.evalStickerCode = function(code, number) {
  var currentSticker = {
    number: number
  };
  
//  alert( "this.stickerLayout.width: " + this.stickerLayout.width)
  var stickerLayout = {
    width: this.stickerLayout.width,
    height: this.stickerLayout.height
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
  group.setAttribute("class", "composition-slot");
  group.setAttribute("transform", "translate("+ this.conf.x +","+ this.conf.y 
                                  +") rotate("+this.conf.rotate+")");
  // Copy the composition slots to the page:
  while ( dom.documentElement.hasChildNodes() ) {
    group.appendChild( dom.documentElement.firstChild );
  };
  svg.appendChild(group);

  // Copy the sticker slots to the page:
  for (var row=0; row<this.conf.matrix.rows; row++){
    for (var col=0; col<this.conf.matrix.cols; col++){  
      var slotG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      slotG.setAttribute("class", "sticker-slot");
  
      svgCode = this.stickerLayout.slot.replace( /<%(.*?)%>/g,
        function(match, code){
          return self.evalStickerCode(code, self.conf.baseNumber + col + row*self.conf.matrix.cols);
        });
      parser = new DOMParser();
      dom = parser.parseFromString('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">'+svgCode+"</svg>", "text/xml");
      //alert(svgCode);
      
      // Copy the sticker slots to the group:
      while ( dom.documentElement.hasChildNodes() ) {
        slotG.appendChild( dom.documentElement.firstChild );
      };
      
      slotG.setAttribute("transform", "translate("+ col*this.stickerLayout.width +","+ row*this.stickerLayout.height +")");
      group.appendChild(slotG);
    }
  }

}

Composition.prototype.generateFront = function() {
  
}

Composition.prototype.generateBack = function() {
  // TODO
}
