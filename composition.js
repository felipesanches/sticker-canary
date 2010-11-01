var compositions_visible=true;
function toggle_compositions_display(){
  var groups = document.getElementsByTagName("g");
  for (var g in groups){
    g = groups[g];
    if (g.className && g.className.baseVal == "composition-front")
      g.setAttribute("visibility", compositions_visible ? "hidden":"visible");
  }

  if (Composition.selectedComposition){
    if (compositions_visible) {
      Composition.selectedComposition.hideHandles();
    }else {
      Composition.selectedComposition.showHandles();
    }
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
  this.width = stickerCanary.toUserUnit( this.stickerLayout.width ) * this.conf.matrix.cols;
  this.height = stickerCanary.toUserUnit( this.stickerLayout.height ) * this.conf.matrix.rows;
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
  return "translate(" + (w/2) + "," + (h/2) + ")"+
         "scale("+t.scale+") "+
         "rotate("+t.rotate+") "+
         "translate(" + (t.x - w/2)/t.scale + "," + (t.y - h/2)/t.scale + ") ";
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
  this.controls.setAttribute("visibility", "hidden");

  Composition.selectedComposition = null;
}

Composition.prototype.showHandles = function(){
  //TODO: why do we need it?
  this.updateControls();
  
  if (Composition.selectedComposition){
    if (Composition.selectedComposition == this) return false;
    Composition.selectedComposition.hideHandles();
  }
  
  Composition.selectedComposition = this;
  
  var use = this.front.getElementsByTagName("use")[0];
  use.setAttribute("visibility", "visible");  
  this.controls.setAttribute("visibility", "visible");

  return true;
}

function rotatedTranslateTransform(x,y, ang, x0,y0){
  var px = Math.cos(ang)*(x - x0) - Math.sin(ang)*(y-y0) + x0;
  var py = Math.sin(ang)*(x - x0) + Math.cos(ang)*(y-y0) + y0;
  return [px, py];
}

const PI = 3.1415;
Composition.prototype.serializeControlsTransform = function(scale){
  var x0 = scale*(this.conf.x + this.width/2);
  var y0 = scale*(this.conf.y + this.height/2);
  var ang = this.conf.transform.rotate * 2*PI/360;
  var transforms = {};

  var XLeft = scale*(this.conf.x + this.conf.transform.x);
  var XRight = scale*(this.conf.x + this.conf.transform.x + this.conf.transform.scale*this.imgWidth);
  var XMid = (XLeft+XRight)/2;
  var YTop = scale*(this.conf.y + this.conf.transform.y);
  var YBottom = scale*(this.conf.y + this.conf.transform.y + this.conf.transform.scale*this.imgHeight);
  var YMid = (YTop + YBottom)/2;

  var p = rotatedTranslateTransform(XLeft,YTop, ang, x0,y0);
  transforms.imageResizeTopL = "translate("+ p[0] + ","+ p[1] +") " +
                            "rotate("+ this.conf.transform.rotate +") ";

  p = rotatedTranslateTransform(XRight,YTop, ang, x0,y0);
  transforms.imageResizeTopR = "translate("+ p[0] + ","+ p[1] +") " +
                            "rotate("+ (this.conf.transform.rotate+90) +") ";

  p = rotatedTranslateTransform(XLeft,YBottom, ang, x0,y0);
  transforms.imageResizeBottomL = "translate("+ p[0] + ","+ p[1] +") " +
                            "rotate("+ (this.conf.transform.rotate-90) +") ";

  p = rotatedTranslateTransform(XRight,YBottom, ang, x0,y0);
  transforms.imageResizeBottomR = "translate("+ p[0] + ","+ p[1] +") " +
                            "rotate("+ (this.conf.transform.rotate+180) +") ";
  
  p = rotatedTranslateTransform(XMid,YTop, ang, x0,y0);
  transforms.imageRotateTop = "translate("+ p[0] + ","+ p[1] +") " +
                            "rotate("+ this.conf.transform.rotate +")";

  p = rotatedTranslateTransform(XRight,YMid, ang, x0,y0);
  transforms.imageRotateRight = "translate("+ p[0] + ","+ p[1] +") " +
                            "rotate("+ (this.conf.transform.rotate + 90) +")";

  p = rotatedTranslateTransform(XMid,YBottom, ang, x0,y0);
  transforms.imageRotateBottom = "translate("+ p[0] + ","+ p[1] +") " +
                            "rotate("+ (this.conf.transform.rotate + 180) +")";

  p = rotatedTranslateTransform(XLeft,YMid, ang, x0,y0);
  transforms.imageRotateLeft = "translate("+ p[0] + ","+ p[1] +") " +
                            "rotate("+ (this.conf.transform.rotate - 90) +")";

/*
  p = rotatedTranslateTransform(x,y, ang, x0,y0);
  transforms.compositionRotate1 = "translate("+ p[0] + ","+ p[1] +") "+
                                  "rotate("+ this.conf.transform.rotate +")";
*/                                  
  return transforms;
}

Composition.prototype.updateControls = function(){
  var transforms = this.serializeControlsTransform(stickerCanary.currentScale);
  this.imgResizeHandleTopL.setAttribute("transform", transforms.imageResizeTopL);
  this.imgResizeHandleTopR.setAttribute("transform", transforms.imageResizeTopR);
  this.imgResizeHandleBottomL.setAttribute("transform", transforms.imageResizeBottomL);
  this.imgResizeHandleBottomR.setAttribute("transform", transforms.imageResizeBottomR);
  this.imgRotateHandleTop.setAttribute("transform", transforms.imageRotateTop);
  this.imgRotateHandleRight.setAttribute("transform", transforms.imageRotateRight);
  this.imgRotateHandleBottom.setAttribute("transform", transforms.imageRotateBottom);
  this.imgRotateHandleLeft.setAttribute("transform", transforms.imageRotateLeft);
  this.stickerRotateHandle.setAttribute("transform", transforms.compositionRotate1);
}

Composition.prototype.generateControls = function(){
  this.controls = createEl("g", {
    class: "controls",
    parent: stickerCanary.ctrlLayer
  });
  this.controls.setAttribute("visibility", "hidden");

  var self = this;
  ajaxGet(
    "file:///home/felipe/devel/sticker-canary/icons/controls.svg",
    function(success, req){
      if ( success ) {
        var img = self.front.getElementsByTagName("image")[0];
        var imgResizeIcon = req.responseXML.getElementById("img-resizer");
        var imgRotateIcon = req.responseXML.getElementById("img-rotate");
        var stickerRotateIcon = req.responseXML.getElementById("sticker-rotate");

        self.imgResizeHandleTopL = imgResizeIcon.cloneNode(true);
        self.imgResizeHandleTopR = imgResizeIcon.cloneNode(true);
        self.imgResizeHandleBottomL = imgResizeIcon.cloneNode(true);
        self.imgResizeHandleBottomR = imgResizeIcon.cloneNode(true);
        self.imgRotateHandleTop = imgRotateIcon.cloneNode(true);
        self.imgRotateHandleRight = imgRotateIcon.cloneNode(true);
        self.imgRotateHandleBottom = imgRotateIcon.cloneNode(true);
        self.imgRotateHandleLeft = imgRotateIcon.cloneNode(true);
        self.stickerRotateHandle = stickerRotateIcon;
        
        self.controls.appendChild( self.imgResizeHandleTopL );
        self.controls.appendChild( self.imgResizeHandleTopR );
        self.controls.appendChild( self.imgResizeHandleBottomL );
        self.controls.appendChild( self.imgResizeHandleBottomR );
        self.controls.appendChild( self.imgRotateHandleTop );
        self.controls.appendChild( self.imgRotateHandleRight );
        self.controls.appendChild( self.imgRotateHandleBottom );
        self.controls.appendChild( self.imgRotateHandleLeft );
        self.controls.appendChild( stickerRotateIcon );

        function pointerSVGCoordinates(e){
          var CTM = stickerCanary.albumLayer.getScreenCTM();
          var p = stickerCanary.svg.createSVGPoint();
          p.x = e.pageX;
          p.y = e.pageY;
          return p.matrixTransform(CTM.inverse());
        }

        document.addEventListener("mousemove", function(e){
          if(self.dragImage){
            var ang = self.conf.transform.rotate * 2*PI/360;
            dx = (e.pageX - self.initialDragX)/stickerCanary.currentScale;
            dy = (e.pageY - self.initialDragY)/stickerCanary.currentScale;
            delta = rotatedTranslateTransform(dx,dy,-ang, 0,0);
            self.conf.transform.x += delta[0];
            self.conf.transform.y += delta[1];
            self.initialDragX = e.pageX;
            self.initialDragY = e.pageY;
          }

          if(self.resizeImage){
            var p = pointerSVGCoordinates(e);
            var ang = self.conf.transform.rotate * 2*PI/360;
            var dx = p.x - (self.conf.x + self.width/2);
            var dy = p.y - (self.conf.y + self.height/2);
            var d = Math.sqrt(dx*dx+dy*dy);
            var diagonal = Math.sqrt(
                  (self.imgWidth)*(self.imgWidth)+
                  (self.imgHeight)*(self.imgHeight));
            self.conf.transform.scale = d/(diagonal/2);
          }

          if(self.rotateImage){
            var p = pointerSVGCoordinates(e);
            var dx = (p.x - (self.conf.x + self.width/2))/stickerCanary.currentScale;
            var dy = (p.y - (self.conf.y + self.height/2))/stickerCanary.currentScale;
            self.conf.transform.rotate = 360*Math.atan2(dy,dx)/(2*PI);
          }

          self.updateControls();
          img.setAttribute("transform",
            self.serialize_transform(self.conf.transform, self.width, self.height));
        }, false);
        
        document.addEventListener("mouseup", function(e){
          self.resizeImage = false;
          self.dragImage = false;
          self.rotateImage = false;
        }, false);

        self.front.getElementsByTagName("use")[0].onmousedown = function(e){
          self.resizeImage = false;
          self.dragImage = true;
          self.rotateImage = false;
          self.initialDragX = e.pageX;
          self.initialDragY = e.pageY;
        }

        self.imgResizeHandleTopL.onmousedown = 
        self.imgResizeHandleTopR.onmousedown = 
        self.imgResizeHandleBottomL.onmousedown = 
        self.imgResizeHandleBottomR.onmousedown = function(e){
          self.resizeImage = true;
          self.dragImage = false;
          self.rotateImage = false;
        }

        self.imgRotateHandleTop.onmousedown = 
        self.imgRotateHandleRight.onmousedown = 
        self.imgRotateHandleBottom.onmousedown = 
        self.imgRotateHandleLeft.onmousedown = function(e){
          self.resizeImage = false;
          self.dragImage = false;
          self.rotateImage = true;
        }
      } else {
        alert("error while loading graphics for the control handles.");
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

  this.front.addEventListener("click", function(){self.showHandles()}, false);
}

Composition.prototype.generateBack = function() {
  // TODO
}
