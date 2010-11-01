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
    self.imgWidth = 157/self.conf.transform.scale;
    self.imgHeight = 157/self.conf.transform.scale;
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

  this.slot = document.createElementNS("http://www.w3.org/2000/svg", "g");
  this.slot.setAttribute("class", "composition-slot");
  this.slot.setAttribute("transform", "translate("+ this.conf.x +","+ this.conf.y 
                                  +") rotate("+this.conf.rotate+")");
  // Copy the composition slots to the page:
  while ( dom.documentElement.hasChildNodes() ) {
    this.slot.appendChild( dom.documentElement.firstChild );
  };
  albumLayer.appendChild(this.slot);

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
      this.slot.appendChild(slotG);
    }
  }

}

Composition.prototype.hideHandles = function(){
  var use = this.front.getElementsByTagName("use")[0];
  use.setAttribute("visibility", "hidden");
  this.imageControls.setAttribute("visibility", "hidden");
  this.compositionControls.setAttribute("visibility", "hidden");

  Composition.selectedComposition = null;
}

Composition.prototype.showHandles = function(){
  //TODO: why do we need it?
  this.updateControls();
  
  if (Composition.selectedComposition){
    Composition.selectedComposition.hideHandles();
  }
  Composition.selectedComposition = this;  
  
  switch(stickerCanary.editMode){
    case stickerCanary.imageEditMode:
      var use = this.front.getElementsByTagName("use")[0];
      use.setAttribute("visibility", "visible");
      this.imageControls.setAttribute("visibility", "visible");
      break;
    case stickerCanary.compositionEditMode:
      this.compositionControls.setAttribute("visibility", "visible");
      break;
    case stickerCanary.backgroundImageEditMode:
      alert("background mode");
      break;
    default:
      alert("default");
      break;
  }

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

  ang = this.conf.rotate * 2*PI/360;

  var cXLeft = scale*(this.conf.x);
  var cXRight = scale*(this.conf.x + this.width);
  var cXMid = (cXLeft+cXRight)/2;
  var cYTop = scale*(this.conf.y);
  var cYBottom = scale*(this.conf.y + this.height);
  var cYMid = (cYTop + cYBottom)/2;
  
  p = rotatedTranslateTransform(cXLeft,cYMid, ang, x0,y0);
  transforms.compositionRotateLeft = "translate("+ p[0] + ","+ p[1] +") "+
                                  "rotate("+ this.conf.rotate +")";

  p = rotatedTranslateTransform(cXMid,cYTop, ang, x0,y0);
  transforms.compositionRotateTop = "translate("+ p[0] + ","+ p[1] +") "+
                                  "rotate("+ (this.conf.rotate + 90) +")";

  p = rotatedTranslateTransform(cXRight,cYMid, ang, x0,y0);
  transforms.compositionRotateRight = "translate("+ p[0] + ","+ p[1] +") "+
                                  "rotate("+ (this.conf.rotate + 180) +")";

  p = rotatedTranslateTransform(cXMid,cYBottom, ang, x0,y0);
  transforms.compositionRotateBottom = "translate("+ p[0] + ","+ p[1] +") "+
                                  "rotate("+ (this.conf.rotate - 90) +")";
                                  
  return transforms;
}

Composition.prototype.updateCompositionTransform = function(){
  var transform = "translate(" + (this.conf.x + this.width/2) + "," + (this.conf.y + this.height/2) + ")"+
         "rotate("+this.conf.rotate+") "+
         "translate(" + (-this.width/2) + "," + (-this.height/2) + ") ";

  this.front.setAttribute("transform", transform);
  this.slot.setAttribute("transform", transform);  
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
  
  this.compositionRotateHandleTop.setAttribute("transform", transforms.compositionRotateTop);
  this.compositionRotateHandleRight.setAttribute("transform", transforms.compositionRotateRight);
  this.compositionRotateHandleBottom.setAttribute("transform", transforms.compositionRotateBottom);
  this.compositionRotateHandleLeft.setAttribute("transform", transforms.compositionRotateLeft);
}

Composition.prototype.generateControls = function(){
  this.imageControls = createEl("g", {
    class: "controls",
    parent: stickerCanary.ctrlLayer
  });
  this.imageControls.setAttribute("visibility", "hidden");

  this.compositionControls = createEl("g", {
    class: "controls",
    parent: stickerCanary.ctrlLayer
  });
  this.compositionControls.setAttribute("visibility", "hidden");

  var self = this;
  ajaxGet(
    "icons/controls.svg",
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

        self.compositionRotateHandleTop = stickerRotateIcon.cloneNode(true);
        self.compositionRotateHandleRight = stickerRotateIcon.cloneNode(true);
        self.compositionRotateHandleBottom = stickerRotateIcon.cloneNode(true);
        self.compositionRotateHandleLeft = stickerRotateIcon.cloneNode(true);
        
        self.imageControls.appendChild( self.imgResizeHandleTopL );
        self.imageControls.appendChild( self.imgResizeHandleTopR );
        self.imageControls.appendChild( self.imgResizeHandleBottomL );
        self.imageControls.appendChild( self.imgResizeHandleBottomR );
        self.imageControls.appendChild( self.imgRotateHandleTop );
        self.imageControls.appendChild( self.imgRotateHandleRight );
        self.imageControls.appendChild( self.imgRotateHandleBottom );
        self.imageControls.appendChild( self.imgRotateHandleLeft );
        self.compositionControls.appendChild( self.compositionRotateHandleTop );
        self.compositionControls.appendChild( self.compositionRotateHandleRight );
        self.compositionControls.appendChild( self.compositionRotateHandleBottom );
        self.compositionControls.appendChild( self.compositionRotateHandleLeft );

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
            var angle = 360*Math.atan2(dy,dx)/(2*PI);
            self.conf.transform.rotate += angle - self.initialAngle;
            self.initialAngle = angle;
          }

          if(self.dragComposition){
            var ang = self.conf.rotate * 2*PI/360;
            dx = (e.pageX - self.initialDragX)/stickerCanary.currentScale;
            dy = (e.pageY - self.initialDragY)/stickerCanary.currentScale;
            delta = rotatedTranslateTransform(dx,dy,-ang, 0,0);
            self.conf.x += delta[0];
            self.conf.y += delta[1];
            self.initialDragX = e.pageX;
            self.initialDragY = e.pageY;
            self.updateCompositionTransform();
          }

          if(self.rotateComposition){
            var p = pointerSVGCoordinates(e);
            var dx = (p.x - (self.conf.x + self.width/2))/stickerCanary.currentScale;
            var dy = (p.y - (self.conf.y + self.height/2))/stickerCanary.currentScale;
            var angle = 360*Math.atan2(dy,dx)/(2*PI);
            self.conf.rotate += angle - self.initialAngle;
            self.initialAngle = angle;
            self.updateCompositionTransform();
          }

          self.updateControls();

          img.setAttribute("transform",
            self.serialize_transform(self.conf.transform, self.width, self.height));
        }, false);
        
        document.addEventListener("mouseup", function(e){
          self.resizeImage = false;
          self.dragImage = false;
          self.rotateImage = false;
          self.rotateComposition = false;
          self.dragComposition = false;
        }, false);

        self.front.getElementsByTagName("use")[0].onmousedown = function(e){
          self.resizeImage = false;
          self.dragImage = true;
          self.rotateImage = false;
          self.initialDragX = e.pageX;
          self.initialDragY = e.pageY;
        }

        self.front.onmousedown = function(e){
          if (stickerCanary.compositionEditMode){
            self.dragComposition = true;
            self.initialDragX = e.pageX;
            self.initialDragY = e.pageY;
          }
        }

        self.imgResizeHandleTopL.onmousedown = 
        self.imgResizeHandleTopR.onmousedown = 
        self.imgResizeHandleBottomL.onmousedown = 
        self.imgResizeHandleBottomR.onmousedown = function(e){
          self.resizeImage = true;
          self.dragImage = false;
          self.rotateImage = false;
        }

        self.imgRotateHandleRight.onmousedown =
        self.imgRotateHandleTop.onmousedown =
        self.imgRotateHandleLeft.onmousedown =
        self.imgRotateHandleBottom.onmousedown =  function(e){
          self.resizeImage = false;
          self.dragImage = false;
          self.rotateImage = true;
          var p = pointerSVGCoordinates(e);
          var dx = (p.x - (self.conf.x + self.width/2))/stickerCanary.currentScale;
          var dy = (p.y - (self.conf.y + self.height/2))/stickerCanary.currentScale;
          self.initialAngle = 360*Math.atan2(dy,dx)/(2*PI);
        }

        self.compositionRotateHandleRight.onmousedown =
        self.compositionRotateHandleTop.onmousedown =
        self.compositionRotateHandleLeft.onmousedown =
        self.compositionRotateHandleBottom.onmousedown =  function(e){
          self.dragComposition = false;
          self.rotateComposition = true;
          var p = pointerSVGCoordinates(e);
          var dx = (p.x - (self.conf.x + self.width/2))/stickerCanary.currentScale;
          var dy = (p.y - (self.conf.y + self.height/2))/stickerCanary.currentScale;
          self.initialAngle = 360*Math.atan2(dy,dx)/(2*PI);
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
  });

  this.updateCompositionTransform();

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
