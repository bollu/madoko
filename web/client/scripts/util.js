/*---------------------------------------------------------------------------
  Copyright 2013 Microsoft Corporation.
 
  This is free software; you can redistribute it and/or modify it under the
  terms of the Apache License, Version 2.0. A copy of the License can be
  found in the file "license.txt" at the root of this distribution.
---------------------------------------------------------------------------*/

define(["std_core","std_path","../scripts/promise"],function(stdcore,stdpath,Promise) {

  var Msg = { 
    Normal: "normal", 
    Info: "info", 
    Warning: "warning", 
    Error: "error", 
    Exn: "exception",
    Status: "status",
    Tool: "tool",
    Trace: "trace",
    Prof: "prof",
  };

  var warning;
  var status;
  var consoleOut;
  if (typeof document !== "undefined") {
    warning    = document.getElementById("warning");
    status     = document.getElementById("status");
    consoleOut = document.getElementById("koka-console-out");
  }

  var escapes = {
      '&': '&amp;', // & first!
      '<': '&lt;',
      '>': '&gt;',
      '\'': '&apos;',
      '"': '&quot;',
      '\n': '<br>',
      '\r': '',
      ' ': '&nbsp;',
  };
  var escapes_regex = new RegExp("[" + Object.keys(escapes).join("") + "]", "g");

  function htmlEscape(txt) {
    return txt.replace(escapes_regex, function (s) {
      var r = escapes[s];
      return (r ? r : "");
    });
  }

  function stringEscape(txt) {
    return txt.replace(/["'\\\n\r]/g, function(s) {
      if (s==="\n") return "\\n";
      else if (s==="\r") return "\\r";
      else return "\\" + s;
    });
  }

  // Call for messages
  function message( txt, kind ) {
    if (typeof txt === "object") {
      if (txt.stack) {
        console.log(txt.stack);
      }
      if (txt.message) 
        txt = txt.message;
      else
        txt = txt.toString();
    }
    if (!kind) kind = Msg.Normal;
    // stdcore.println(txt);
    console.log("madoko: " + (kind !== Msg.Normal ? kind + ": " : "") + txt);
    if (kind !== Msg.Trace && consoleOut && status && warning) {
      function span(s,n) {
        if (n && s.length > n-2) {
          s = s.substr(0,n) + "...";
        }
        return "<span class='msg-" + kind + "'>" + htmlEscape(s) + "</span>";
      }

      consoleOut.innerHTML = "<div class='msg-section'>" + span(txt) + "</span></div>" + consoleOut.innerHTML;
      
      if (kind===Msg.Warning || kind===Msg.Error || kind===Msg.Exn) {
        status.innerHTML = span(txt,35);
        removeClassName(warning,"hide");
      }
      else if (kind===Msg.Status) {
        status.innerHTML = span(txt,35);
        addClassName(warning,"hide");
      }
    }
  }

  function assert( pred, msg ) {
    if (!pred) {
      console.log("assertion failed: " + msg);
    }
  }

  // Get the properties of an object.
  function properties(obj) {
    var attrs = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        attrs.push(key);
      }
    } 
    return attrs;
  }

  // extend target with all fields of obj.
  function extend(target, obj) {
    properties(obj).forEach( function(prop) {
      target[prop] = obj[prop];
    });
  }

  function copy(src ) {
    return clone(src,false);
  }

  function clone(src, deep, _visited) 
  {
    deep = (deep===undefined ? true : deep);

    if (src==null || typeof(src)!=="object") {
      return src;
    }
    if (deep) {
      if (typeof _visited===undefined) {
        _visited = [];
      }
      else {
        var i,len = _visited.length;
        for(i=0; i<len; i++) {
          if (_visited[i]===src) return src;
        }
      }
      _visited.push(src);
    }

    if (typeof src.clone === "function") {
      return src.clone(true);
    }
    else if (src instanceof Date){
      return new Date(src.getTime());
    }
    else if(src instanceof RegExp){
      return new RegExp(src);
    }
    else if(src.nodeType && typeof src.cloneNode == 'function'){
      return src.cloneNode(true);
    }
    else {
      var proto = (Object.getPrototypeOf ? Object.getPrototypeOf(src): src.__proto__);
      if (!proto) {
        proto = src.constructor.prototype;
      }
      var dest = Object.create(proto);
      for(var key in src){
        dest[key] = (deep ? clone(src[key],true,_visited) : src[key]);
      }
      return dest;
    }
  }


  var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
  };


  function contains( xs, s ) {
    if (!xs) return false;
    if (!s) return true;
    if (xs instanceof Array) {
      for(var i = 0; i < xs.length; i++) {
        if (xs[i] === s) return true;
      }
    }
    else if (typeof xs === "string") {
      if (xs.indexOf(s) >= 0) return true;
    }
    return false;
  }

  function hasClassName( elem, cname ) {    
    var names = elem.className.split(/\s+/);
    return contains(names,cname);
  }

  function toggleClassName( elem, cname ) {
    if (hasClassName(elem,cname)) {
      removeClassName(elem,cname);
    }
    else {
      addClassName(elem,cname);
    }
  }

  function removeClassName( elem, cname ) {
    var cnames = elem.className;
    var names = cnames.split(/\s+/);
    var newnames = names.filter( function(n) { return (n !== cname); });
    if (names.length !== newnames.length) {
      elem.className = newnames.join(" ");
    }
  }

  function addClassName( elem, cname ) {
    var cnames = elem.className;
    var names = cnames.split(/\s+/);
    if (!contains(names,cname)) {
      elem.className = cnames + " " + cname;
    }    
  }

  function startsWith(s,pre) {
    if (!pre) return true;
    if (!s) return false;
    return (s.substr(0,pre.length).indexOf(pre) === 0);
  }

  function endsWith(s,post) {
    if (!post) return true;
    if (!s) return false;
    var i = s.indexOf(post);
    return (i >= 0 && (s.length - post.length) == i);
  }

  // no ".", "..", ":", or starting with "/"
  function isRelative(fname) {
    return (/^(?![\.\/])([\w\-]|\.\w|\/\w)+$/.test(fname));
  }

  function firstdirname(path) {
    var dir = stdpath.dirname(path);
    if (!dir) return "";
    return dir.replace(/[\/\\].*$/, "");
  }


  var mimeTypes = {    
    mdk: "text/madoko",
    md: "text/markdown",

    txt: "text/plain",
    css: "text/css",
    html:"text/html",
    htm: "text/html",
    xml: "text/html",
    js:  "text/javascript",
    pdf: "application/pdf",
    
    tex: "text/tex",
    sty: "text/tex",
    cls: "text/tex",
    bib: "text/plain",
    bbl: "text/tex",
    aux: "text/tex",
    dimx: "text/plain",

    png:  "image/png",
    jpg:  "image/jpg",
    jpeg: "image/jpg",
    gif:  "image/gif",
    svg:  "image/svg+xml",
  };

  function mimeFromExt( fname ) {
    var ext = stdpath.extname(fname);
    if (ext) {
      var mime = mimeTypes[ext.substr(1)];
      if (mime) return mime;
    }
    return "text/plain";
  }


  function hasImageExt(fname) {
    return startsWith(mimeFromExt(fname),"image/");
  }

  function hasTextExt(fname) {
    return startsWith(mimeFromExt(fname),"text/");
  }

  var embedExts = [".bbl",".js",".css"].join(";");
  function hasEmbedExt(fname) {
    var ext = stdpath.extname(fname);
    if (!ext) return false;
    return (contains(embedExts,ext));
  }

  var generatedExts = [".bbl",".dimx",".aux",".dvi",".pdf",".html"].join(";");
  function hasGeneratedExt(fname) {
    var ext = stdpath.extname(fname);
    if (!ext) return false;
    return (contains(generatedExts,ext) || endsWith(fname,".final.tex") || stdpath.dirname(fname)==="out");
  }

  function toggleButton( elemName, text0, text1, action ) {
    var button = (typeof elemName === "string" ? document.getElementById(elemName) : elemName);
    var toggled = true;
    function toggle() {
      toggled = !toggled;
      if (text0) button.innerHTML = (toggled ? text1 : text0);
    }
    toggle();
    button.onclick = function(ev) {
      toggle();
      action(ev,toggled);
    }
  }


  function decodeBase64Code(c) 
  {
    if (c > 64 && c < 91) return (c - 65);
    else if (c > 96 && c < 123) return (c - 71);
    else if (c > 47 && c < 58)  return (c + 4);
    else if (c===43) return 62;
    else if (c===47) return 63;
    else return 0;
  }

  // convert base64 string to uint8array.
  function decodeBase64( content ) {
    var src = content.replace(/[^A-Za-z0-9\+\/]/g,""); // keep only relevant characters
    var len = src.length; 
    var destlen = (len>>2)*3 + (len&3);
    var dest = new Uint8Array(destlen);

    var acc = 0;
    var desti = 0;
    for( var i = 0; i < len; i++) {
      // accumulate four 6-bit values
      acc |= decodeBase64Code(src.charCodeAt(i)) << (18 - 6 * (i&3));
      if ((i&3) === 3 || i === len-1) {
        // write out accumulator to three 8-bit values
        for(var j = 0; j < 3 && desti < destlen; j++) {
          dest[desti] = (acc >>> ((2-j)*8)) & 255;
          desti++;
        }
        acc = 0; // reset accumulator
      }      
    }
    return dest;
  }

  function px(s) {
    if (typeof s === "number") return s;
    var cap = /^(\d+(?:\.\d+)?)(em|ex|pt|px|pc|in|mm|cm)?$/.exec(s);
    if (!cap) return 0;
    var i = parseInt(cap[1]);
    if (isNaN(i)) return 0;
    if (cap[2] && cap[2] !== "px") {
      var dpi = 96;
      var empx = 12;
      if (cap[2]==="em") {
        i = (i * empx);
      }
      else if (cap[2]==="ex") {
        i = (i * empx * 0.5);
      }
      else if (cap[2]==="pt") {
        i = (i/72) * dpi;
      }
      else if (cap[2]==="pc") {
        i = (i/6) * dpi;
      }
      else if (cap[2]==="in") {
        i = i * dpi;
      }
      else if (cap[2]==="mm") {
        i = (i/25.6) * dpi;
      }
      else if (cap[2]==="cm") {
        i = (i/2.56) * dpi;
      }
    }
    return i;
  }

  function asyncForEach( xs, asyncAction, cont ) {
    if (!xs || xs.length===0) return cont(0,[]);
    var count = xs.length;
    var objs  = [];
    var err   = null;
    xs.forEach( function(x) {
      function localCont(xerr,obj) {
        objs.push(obj);
        if (xerr) err = xerr;
        count--;
        if (count <= 0) cont(err,objs);
      }
      try {
        asyncAction(x, localCont );
      }
      catch(exn) {
        localCont(exn);
      }
    });
  }

  function dispatchEvent( elem, eventName ) {
    var event;
    // we should use "new Event(eventName)" for HTML5 but how to detect that?
    if (document.createEvent) {
        event = document.createEvent('HTMLEvents');
        event.initEvent(eventName,true,true);
    }
    else if (document.createEventObject) { // IE < 9
        event = document.createEventObject();
        event.eventType = eventName;
    }
    event.eventName = eventName;
    if (elem.dispatchEvent) {
        elem.dispatchEvent(event);
    }
    else if (elem.fireEvent) { 
        elem.fireEvent('on' + eventName, event);
    }
    else if (elem[eventName]) {
        elem[eventName]();
    } 
    else if (elem['on' + eventName]) {
        elem['on' + eventName]();
    }
  }

  function getScrollTop( elem ) {
    if (!elem) return 0;
    if (elem.contentWindow) {
      // iframe
      if (elem.contentWindow.pageYOffset) return elem.contentWindow.pageYOffset;
      var doc = elem.contentDocument;
      if (!doc) return 0;
      return (doc.documentElement || doc.body.parentNode || doc.body).scrollTop;
    }
    else if (elem.pageYOffset) {
      return elem.pageYOffset;
    }
    else {
      return elem.scrollTop;
    }
  }

  function setScrollTop( elem, top ) {
    if (!elem) return;
    if (elem.contentWindow) {
      elem = elem.contentWindow;
    }
    if (elem.scroll) {
      elem.scroll( elem.pageXOffset || 0, top );
    }
    else {
      elem.scrollTop = top;
    }
  }

  function animateScrollTop( elem, top, duration, steps ) {
    var top0 = getScrollTop(elem);
    if (top0 === top) return;
    if (duration <= 50 || Math.abs(top - top0) <= 10) {
      duration = 1;
      steps = 1;
    }

    var n = 0;
    var action = function() {
      n++;
      var top1 = top;
      if (n >= steps) {
        if (elem.animate) {
          clearInterval(elem.animate);
          delete elem.animate;
        }
      }
      else {
        top1 = top0 + ((top - top0) * (n/steps));
      }
      setScrollTop(elem,top1);
    };

    var ival = (steps && steps > 0 ? duration / steps : 50);
    steps = (duration / ival) | 0;
    
    action();    
    if (steps > 1) {
      if (elem.animate) {
        clearInterval(elem.animate);
      }    
      elem.animate = setInterval( action, ival);    
    }
  }

  function animate( elem, props, duration, steps ) {
    var ival = (steps ? duration / steps : 50);
    steps = (duration / ival) | 0;
    if (steps <= 0) steps = 1;
    var elem0 = {};
    properties(props).forEach( function(prop) {
      elem0[prop] = elem[prop];
    });
    var n = 0;
    if (elem.animate) {
      clearInterval(elem.animate);
    }
    var action = function() {
      n++;
      if (n >= steps) {
        clearInterval(elem.animate);
        elem.animate = undefined;
        properties(props).forEach(function(prop) {
          elem[prop] = props[prop];
        });
      }
      else {
        properties(props).forEach(function(prop) {
          var x = elem0[prop] + ((props[prop] - elem0[prop]) * (n/steps));
          elem[prop] = x;
        });
      }
    };

    elem.animate = setInterval( action, ival);
    action(); // perform one step right away
  }

  function unpersistMap(obj) {
    var map = new Map();
    properties(obj).forEach( function(prop) {
      map[prop] = obj[prop];
    });
    return map;
  }

  var Map = (function() {
    function Map() { };

    Map.prototype.persist = function() {
      return this;
    };

    Map.prototype.copy = function() {
      var self = this;
      var map = new Map();
      self.forEach( function(name,value) {
        map.set(name,value);
      });
      return map;
    }

    Map.prototype.set = function( name, value ) {
      this["/" + name] = value;
    }

    Map.prototype.get = function( name ) {
      return this["/" + name];
    }

    Map.prototype.contains = function( name ) {
      return (this.get(name) !== undefined);
    }

    Map.prototype.remove = function( name ) {
      delete this["/" + name];
    }

    // apply action to each element. breaks early if action returns "false".
    Map.prototype.forEach = function( action ) {
      var self = this;
      properties(self).every( function(name) {
        if (name.substr(0,1) === "/") {
          var res = action(name.substr(1), self[name]);
          return (res===false ? false : true);
        }
      });
    }

    Map.prototype.elems = function() {
      var self = this;
      var res = [];
      self.forEach( function(name,elem) {
        res.push(elem);
      });
      return res;
    }

    return Map;
  })();

  var ContWorker = (function() {
    function ContWorker( scriptName ) {
      var self = this;
      self.promises = {};
      self.unique = 1;
      
      // collect message while the worker starts up
      self.ready = false;
      self.postqueue = []; 

      self.worker = new Worker("madoko-worker.js");
      self.worker.addEventListener("message", function(ev) {
        var res = ev.data;
        self._onComplete(res);
      });
    }

    ContWorker.prototype._isReady = function() {
      return self.ready;
    }

    ContWorker.prototype.postMessage = function( info ) {
      var self = this;
      var promise = new Promise();
      if (!self.ready) {
        self.postqueue.push( { info: info, promise: promise });
      }
      else {
        var id = self.unique++;
        info.messageId = id; 
        self.promises[id] = promise;
        self.worker.postMessage( info );
      }
      return promise;
    }

    ContWorker.prototype._onComplete = function( info ) {
      var self = this;
      if (!info || typeof info.messageId === "undefined") return;
      if (info.messageId === 0) {
        self.ready = true;
        self.postqueue.forEach( function(elem) {  // post delayed messages
          self.postMessage( elem.info ).then(elem.promise);
        });
      }
      else {
        var promise = self.promises[info.messageId];
        self.promises[info.messageId] = undefined;
        if (!promise) return;
        promise.resolve(info);
      }
    }

    return ContWorker;
  })();


  var AsyncRunner = (function() {
    function AsyncRunner( refreshRate, spinner, isStale, action ) {
      var self = this;
      self.spinner = spinner;
      self.isStale = isStale;
      self.action = action;
      self.ival = 0;
      self.round = 0;
      self.lastRound = 0;
      self.stale = false;
      self.refreshRate = refreshRate || 1000;
      
      self.dynamicRefreshRate = false;
      self.minRefreshRate = 100;
      self.maxRefreshRate = 1000;
      
      self.times = [self.refreshRate];
      self.timesSamples = 10;      
      self.resume(self.refreshRate);
    }
    
    AsyncRunner.prototype.resume = function(refreshRate) {
      var self = this;
      if (self.ival) {
        self.pause();
      }
      self.refreshRate = refreshRate || self.refreshRate;
      message("adjust refresh rate: " + self.refreshRate.toFixed(0) + "ms", Msg.Info);
      self.ival = setInterval( function(){ self.update(); }, self.refreshRate );
    }

    AsyncRunner.prototype.pause = function() {
      var self = this;
      if (self.ival) {
        clearInterval(self.ival);
        self.ival = 0;
      }
    }

    AsyncRunner.prototype.setStale = function() {
      var self = this;
      self.stale = true;
      self.run();
    }

    AsyncRunner.prototype.clearStale = function() {
      var self = this;
      self.stale = false;
    }

    AsyncRunner.prototype.update = function() {
      var self = this;
      if (!self.stale && self.isStale) {
        self.stale = self.isStale();
      }
      self.run();
    }

    AsyncRunner.prototype.run = function(force) {
      var self = this;
      if ((force || self.stale) && self.round <= self.lastRound) {
        self.stale = false;
        self.round++;
        var round = self.round;
        if (self.spinner) self.spinner(true);
        var time0 = Date.now();
        return self.action( self.round ).then( function(msg) {
            var time = Date.now() - time0;
            self.times.push( time );
            if (self.times.length > self.timesSamples) self.times.shift();
            var avg = self.times.reduce( function(prev,t) { return prev+t; }, 0 ) / self.times.length;
            message( (msg ? msg + "\n" : "") + 
              "  avg full: " + avg.toFixed(0) + "ms, this: " + time.toFixed(0) + "ms" +
              "  run rate: " + self.refreshRate.toFixed(0) + "ms", 
              Msg.Prof);
            
            if (self.dynamicRefreshRate) {
              if (avg > 0.66 * self.refreshRate && self.refreshRate < self.maxRefreshRate) {
                self.resume( Math.min( self.maxRefreshRate, 1.5 * self.refreshRate ) );
              }
              else if (avg < 0.33*self.refreshRate && self.refreshRate > self.minRefreshRate) {
                self.resume( Math.max( self.minRefreshRate, 0.66 * self.refreshRate ) );
              }
            }
          },
          function(err) {
            message( err, Msg.Exn );  
          }
          ).always( function() {
            if (self.lastRound < round) {
              self.lastRound = round;          
              if (self.spinner) self.spinner(false);
            }
          });
      }
      else {
        return Promise.resolved();
      }
    }

    return AsyncRunner;
  })();

  function urlEncode( obj ) {
    var vals = [];
    properties(obj).forEach( function(prop) {
      vals.push( encodeURIComponent(prop) + "=" + encodeURIComponent( obj[prop] ? obj[prop].toString() : "") );
    });
    return vals.join("&");
  }

  function requestGET( opts, params ) {
    var reqparam = (typeof opts === "string" ? { url: opts } : opts);
    if (!reqparam.method) reqparam.method = "GET";

    var query = (params ? urlEncode(params) : "");
    if (query) reqparam.url = reqparam.url + "?" + urlEncode(params);
    reqparam.contentType = null;
    
    return requestPOST( reqparam, "" );
  }
  
  function requestPUT( opts, params ) {
    var reqparam = (typeof opts === "string" ? { url: opts } : opts);
    if (!reqparam.method) reqparam.method = "PUT";

    return requestPOST( reqparam, params );
  }

  function requestPOST( opts, params ) {
    var reqparam = (typeof opts === "string" ? { url: opts } : opts);    
    var req = new XMLHttpRequest();
    req.open(reqparam.method || "POST", reqparam.url, true );
    
    var timeout = 0;  // timeout handler id.
    var promise = new Promise();

    function reject() {
      if (timeout) clearTimeout(timeout);
      var msg = req.statusText;
      var res = req.responseText;
      var type = req.getResponseHeader("Content-Type");
      if (req.responseText && startsWith(type,"application/json")) {
        var res = JSON.parse(req.responseText);
        if (res.error && res.error.message) {
          msg = msg + ": " + res.error.message + (res.error.code ? "(" + res.error.code + ")" : "");
        }      
      }
      else {
        msg = msg + ": " + req.responseText;
      }
      //cont(msg, res, req.response);
      console.log(msg + "\n request: " + reqparam.method + ": " + reqparam.url );
      promise.reject(msg);
    }

    req.onload = function(ev) {
      if (req.readyState === 4 && req.status >= 200 && req.status <= 299) {
        if (timeout) clearTimeout(timeout);
        var type = req.getResponseHeader("Content-Type");
        var res;
        if (startsWith(type,"application/json")) {
          res = JSON.parse(req.responseText);
        }
        else {
          res = req.responseText;
        }
        promise.resolve(res,req.response);
      }
      else {
        reject();
      }
    }
    req.reject = function(ev) {
      reject();
    }
    req.onerror = function(ev) {
      reject();
    }
    req.ontimeout = function(ev) {
      reject();
    }
    
    var contentType = "text/plain";
    var content = null;

    if (typeof params === "string") {
      contentType = "text/plain";
      content = params;
    } 
    // object: use url-encoded for GET and json for POST/PUT      
    else if (reqparam.method==="GET") {
      contentType = "application/x-www-form-urlencoded";
      content = urlEncode(params);
    }
    // array
    else if (params instanceof Uint8Array) {
      contentType = "application/octet-stream";
      content = params;
    }
    // json
    else {
      contentType = "application/json";
      content = JSON.stringify(params);
    }
    
    // override content type?
    if (reqparam.contentType !== undefined) {
      contentType = reqparam.contentType;
    }
    // override response type?
    if (reqparam.responseType != null) {
      req.overrideMimeType(reqparam.responseType);
      req.responseType = reqparam.responseType;
    }
    
    if (contentType != null) req.setRequestHeader("Content-Type", contentType);    
    if (reqparam.timeout != null) req.timeout = reqparam.timeout;
    req.send(content);
    
    return promise;
  }

  function downloadText(fname,text) {
    w = window.open();
    doc = w.document;
    doc.open( 'text/html','replace');
    doc.charset = "utf-8";
    doc.write(text);
    doc.close();
    w.scrollTo(0,0);
    //doc.execCommand("SaveAs", null, fname)
  }

  function downloadFile(url) 
  {
    var w = window.open(url, "_newtab", "");    
    if (w) w.focus();
  }
    //var frame = document.getElementById("download-frame");
    //frame.src = url + "?download";
  /*
    var userAgent = navigator.userAgent.toLowerCase();
    //If in Chrome or Safari - download via virtual link click
    if ((contains(userAgent,"chrome") || contains(userAgent,"safari")) && document.createEvent) {
      var link = document.createElement('a');
      link.href = url;

      if (link.download !== undefined){
        //Set HTML5 download attribute. This will prevent file from opening if supported.
        link.download = stdpath.basename(url);
      }

      var ev = document.createEvent('MouseEvents');
      ev.initEvent('click' ,true ,true);
      link.dispatchEvent(ev);
      //link.click();
    }
    else {
      window.open(url + "?download");
    }
  }
*/
  /*
w = window.open();
doc = w.document;
doc.open( mimetype,'replace');
doc.charset = "utf-8";
doc.write(data);
doc.close();
doc.execCommand("SaveAs", null, filename)
*/

   
  
  return {
    properties: properties,
    extend: extend,
    copy: copy,
    message: message,
    assert: assert,
    escape: htmlEscape,
    stringEscape: stringEscape,
    Msg: Msg,
    
    changeExt: stdpath.changeExt,
    extname: stdpath.extname,
    basename: stdpath.basename,
    dirname: stdpath.dirname,
    stemname: stdpath.stemname,
    isRelative: isRelative,
    combine: stdpath.combine,
    firstdirname: firstdirname,

    hasImageExt: hasImageExt,
    hasTextExt: hasTextExt,
    hasEmbedExt: hasEmbedExt,
    hasGeneratedExt: hasGeneratedExt,
    mimeFromExt: mimeFromExt,

    startsWith: startsWith,
    endsWith: endsWith,
    contains: contains,
    decodeBase64: decodeBase64,
    
    hasClassName: hasClassName,
    toggleClassName: toggleClassName,
    removeClassName: removeClassName,
    addClassName:addClassName,    
    toggleButton: toggleButton,
    px: px,
    animate: animate,
    dispatchEvent: dispatchEvent,
    asyncForEach: asyncForEach,

    getScrollTop: getScrollTop,
    setScrollTop: setScrollTop,
    animateScrollTop: animateScrollTop,

    requestPOST: requestPOST,
    requestPUT: requestPUT,
    requestGET: requestGET,
    downloadFile: downloadFile,
    downloadText: downloadText,

    Map: Map,
    unpersistMap: unpersistMap,
    ContWorker: ContWorker,
    AsyncRunner: AsyncRunner,
    Promise: Promise,
  };
});