function ImageControls(imageId){
  this.img = document.getElementById(imageId);
  this.transform = this.img.getAttribute("transform");
}

var compositions_visible=true;
function toggle_compositions_display(){
  var groups = document.getElementsByTagName("g");
  for (var g in groups){
    g = groups[g];
    if (g.className && g.className.baseVal == "composition-front")
      g.setAttribute("visibility", compositions_visible ? "hidden":"visible");
  }
  compositions_visible=!compositions_visible;
}

function Composition(cName, dPage, callBack) {
  this.name = cName;
  this.dPage = dPage;
  this.conf = dPage.compositions[cName];  
  this.compositionLayout = stickerCanary.currentAlbum.compositionLayout;
  this.stickerLayout = stickerCanary.currentAlbum.stickerLayout;
  this.stickerLayout.width = stickerCanary.toUserUnit(this.stickerLayout.width);
  this.stickerLayout.height = stickerCanary.toUserUnit(this.stickerLayout.height);
  this.loadImage(callBack);
}

Composition.prototype.loadImage = function(callBack) {
  var img = new Image();
  var self = this;
  img.onload = function(){
    self.imgWidth = img.width;
    self.imgHeight = img.height;
    self.img = self.conf.img;
    self.imageLoadOk = true;
    callBack(self);
  };
  img.onerror = function(){
    self.imgWidth = 157;
    self.imgHeight = 157;
    self.img = "icons/image-error.png";
    self.imageLoadOk = false;
    callBack(self);
  };
  img.src = this.conf.img;
}

Composition.prototype.serialize_transform = function(t, w, h){
  if (!t.scale) t.scale=1;
  return "translate(" + (t.x + w/2) + "," + (t.y + h/2) + ")"+
         "scale("+t.scale+") "+
         "rotate("+t.rotate+") "+
         "translate(" + (-w/2)/t.scale + "," + (-h/2)/t.scale + ") ";
}

Composition.lastImageId = 0;
Composition.prototype.evalCompositionFrontCode = function(code) {
  var clipId = "#composition-clip-"+this.conf.matrix.rows+"-"+this.conf.matrix.cols;
  var width = stickerCanary.toUserUnit( this.stickerLayout.width ) * this.conf.matrix.cols;
  var height = stickerCanary.toUserUnit( this.stickerLayout.height ) * this.conf.matrix.rows;
  Composition.lastImageId++;
  var currentCompositionImage =
      "<g clip-path='url("+ clipId +")'>"+
           "<image id='composition-image-"+Composition.lastImageId+"' xlink:href='"+ this.img + "'"+
                 " width='"+ this.imgWidth +"' height='"+ this.imgHeight +"'"+
                 " preserveAspectRatio='xMinYMin slice'"+
                 " transform='"+ this.serialize_transform(this.conf.transform, width, height) +"'/>"+
      "</g>" +
      "<use xlink:href='#composition-image-"+Composition.lastImageId+"' visibility='hidden' style='opacity:0.3' />";

  var currentComposition = {
    x: stickerCanary.toUserUnit(this.conf.x),
    y: stickerCanary.toUserUnit(this.conf.y),
    img: currentCompositionImage,
    label: this.conf.label,
    width: width,
    height: height
  };
//  var margin = stickerCanary.toUserUnit( this.compositionLayout.margin );
  return eval(code);
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
  var albumLayer = stickerCanary.albumLayer;
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
  albumLayer.appendChild(group);

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

Composition.prototype.hideHandles = function(){
  var use = this.front.getElementsByTagName("use")[0];
  use.setAttribute("visibility", "hidden");
  //Todo: hide other elements that are used as image composition handles
  
  Composition.selectedComposition = null;
}

Composition.prototype.showHandles = function(){
  if (Composition.selectedComposition){
    if (Composition.selectedComposition == this) return false;
    Composition.selectedComposition.hideHandles();
  }
  
  Composition.selectedComposition = this;
  
  var use = this.front.getElementsByTagName("use")[0];
  use.setAttribute("visibility", "visible");  

  createEl("circle", { cx:100, cy:100, r:20, fill:"red", parent:this.ctrlLayer });

  return true;
}

Composition.prototype.serializeControlsTransform = function(){
  var transforms = {
    imageResize1: "translate("+ (this.conf.x + this.conf.transform.x) + ","+ (this.conf.y + this.conf.transform.y) +")",
    imageRotate1: "translate("+ (this.conf.x + this.conf.transform.x + this.imgWidth/2) +","+ (this.conf.y + this.conf.transform.y) +")",
    compositionRotate1: "translate("+ (this.conf.x + this.conf.transform.x) +","+ (this.conf.y + this.conf.transform.y + this.imgHeight/2) +")"
  }
  return transforms;
}

Composition.prototype.generateControls = function(){
  var self = this;
  ajaxGet(
    "file:///home/felipe/devel/sticker-canary/icons/controls.svg",
    function(success, req){
      if ( success ) {
        var transforms = self.serializeControlsTransform();
        var imgResizeIcon = req.responseXML.getElementById("img-resizer");
        var imgRotateIcon = req.responseXML.getElementById("img-rotate");
        var stickerRotateIcon = req.responseXML.getElementById("sticker-rotate");
        imgResizeIcon.setAttribute("transform", transforms.imageResize1);
        imgRotateIcon.setAttribute("transform", transforms.imageRotate1);
        stickerRotateIcon.setAttribute("transform", transforms.compositionRotate1);
        stickerCanary.ctrlLayer.appendChild( imgResizeIcon );
        stickerCanary.ctrlLayer.appendChild( imgRotateIcon );
        stickerCanary.ctrlLayer.appendChild( stickerRotateIcon );
      } else {
        alert("merda!");
      }
    }
  );

}

Composition.prototype.generateFront = function() {
  var albumLayer = stickerCanary.albumLayer;
  var self = this;
  var svgCode = this.compositionLayout.front.replace( /<%(.*?)%>/g,
    function(match, code){
      return self.evalCompositionFrontCode(code);
    });
  var parser = new DOMParser();
  var dom = parser.parseFromString('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">'+svgCode+"</svg>", "text/xml");

  this.front = createEl("g", {
    class: "composition-front",
    transform: "rotate("+this.conf.rotate+")" +
               "translate("+ this.conf.x +","+ this.conf.y+")"
  });
  
  // Copy the composition front elements to the page:
  while ( dom.documentElement.hasChildNodes() ) {
    this.front.appendChild( dom.documentElement.firstChild );
  };
  albumLayer.appendChild(this.front);

  var self = this;
  this.front.addEventListener("click", function(){self.showHandles()}, false);

  var img = this.front.getElementsByTagName("image")[0];
  
  var width = stickerCanary.toUserUnit( this.stickerLayout.width ) * this.conf.matrix.cols;
  var height = stickerCanary.toUserUnit( this.stickerLayout.height ) * this.conf.matrix.rows;

  //add controls:
  createEl("rect", {
    fill: "green",
    x: 10, y: 10, width: 10, height: 10,
    parent: this.front,
    onclick: function(){
      self.conf.transform.rotate += 1;
      img.setAttribute("transform",
          self.serialize_transform(self.conf.transform, width, height));
    }
  });
  createEl("rect", {
    fill: "red",
    x: 10, y: 20, width: 10, height: 10,
    parent: this.front,
    onclick: function(){
      self.conf.transform.rotate -= 1;
      img.setAttribute("transform",
          self.serialize_transform(self.conf.transform, width, height));
    }
  });
}

Composition.prototype.generateBack = function() {
  // TODO
}
