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

function Composition(cName, dPage) {
  this.name = cName;
  this.dPage = dPage;
  this.conf = dPage.compositions[cName];  
  this.compositionLayout = stickerCanary.currentAlbum.compositionLayout;
  this.stickerLayout = stickerCanary.currentAlbum.stickerLayout;
  this.stickerLayout.width = stickerCanary.toUserUnit(this.stickerLayout.width);
  this.stickerLayout.height = stickerCanary.toUserUnit(this.stickerLayout.height);
}

Composition.prototype.serialize_transform = function(t, w, h){
  var result = "translate(" + (t.x - w/2) + "," + (t.y - h/2) + ") ";
  if (t.scale) result += "scale("+t.scale+") ";
  result += "rotate("+t.rotate+") "+
            "translate(" + w/2 + "," + h/2 + ")";
  return result;
}

Composition.prototype.serialize_transform = function(t, w, h){
  if (!t.scale) t.scale=1;
  return "translate(" + (t.x + w/2) + "," + (t.y + h/2) + ")"+
         "scale("+t.scale+") "+
         "rotate("+t.rotate+") "+
         "translate(" + (-w/2)/t.scale + "," + (-h/2)/t.scale + ") ";
}

Composition.prototype.evalCompositionFrontCode = function(code) {
  var clipId = "#composition-clip-"+this.conf.matrix.rows+"-"+this.conf.matrix.cols;
  var width = stickerCanary.toUserUnit( this.stickerLayout.width ) * this.conf.matrix.cols;
  var height = stickerCanary.toUserUnit( this.stickerLayout.height ) * this.conf.matrix.rows;
  var currentCompositionImage =
      "<g clip-path='url("+ clipId +")'>"+
           "<image xlink:href='"+ this.conf.img + "'"+
                 " width='100%' height='100%'"+
                 " preserveAspectRatio='xMinYMin meet'"+
                 " transform='"+ this.serialize_transform(this.conf.transform, width, height) +"'/>"+
      "</g>" +
      "<g style='opacity:0.3'>"+
           "<image xlink:href='"+ this.conf.img + "'"+
                 " width='100%' height='100%'"+
                 " preserveAspectRatio='xMinYMin meet'"+
                 " transform='"+ this.serialize_transform(this.conf.transform, width, height) +"'/>"+
      "</g>"

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
  var svg = stickerCanary.svg;
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
  var svg = stickerCanary.svg;
  var self = this;
  var svgCode = this.compositionLayout.front.replace( /<%(.*?)%>/g,
    function(match, code){
      return self.evalCompositionFrontCode(code);
    });
  var parser = new DOMParser();
  var dom = parser.parseFromString('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">'+svgCode+"</svg>", "text/xml");

  const SVG_NS = "http://www.w3.org/2000/svg";
  var group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("class", "composition-front");
  group.setAttribute("transform", "rotate("+this.conf.rotate+") translate("+ this.conf.x +","+ this.conf.y+")");
  // Copy the composition front elements to the page:
  while ( dom.documentElement.hasChildNodes() ) {
    group.appendChild( dom.documentElement.firstChild );
  };
  svg.appendChild(group);
  
  var self = this;
  var img = group.getElementsByTagName("image");
  
  var width = stickerCanary.toUserUnit( this.stickerLayout.width ) * this.conf.matrix.cols;
  var height = stickerCanary.toUserUnit( this.stickerLayout.height ) * this.conf.matrix.rows;

  //add controls:
  var inc_scale = document.createElementNS(SVG_NS, "rect");
  inc_scale.setAttribute("fill", "green");
  inc_scale.setAttribute("x", 10);
  inc_scale.setAttribute("y", 10);
  inc_scale.setAttribute("width", 10);
  inc_scale.setAttribute("height", 10);
  group.appendChild(inc_scale);
  inc_scale.onclick= function(){
    self.conf.transform.rotate+=1;
    img[0].setAttribute("transform",
        self.serialize_transform(self.conf.transform, width, height));
    img[1].setAttribute("transform",
        self.serialize_transform(self.conf.transform, width, height));
  };

  var dec_scale = document.createElementNS(SVG_NS, "rect");
  dec_scale.setAttribute("fill", "red");
  dec_scale.setAttribute("x", 10);
  dec_scale.setAttribute("y", 20);
  dec_scale.setAttribute("width", 10);
  dec_scale.setAttribute("height", 10);
  group.appendChild(dec_scale);
  dec_scale.onclick= function(){
    self.conf.transform.rotate-=1;
    img[0].setAttribute("transform",
        self.serialize_transform(self.conf.transform, width, height));
    img[1].setAttribute("transform",
        self.serialize_transform(self.conf.transform, width, height));
  }
}

Composition.prototype.generateBack = function() {
  // TODO
}
