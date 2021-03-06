/*
 * Copyright 2012 AOL Inc. All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this Software except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*jshint
  browser: true, jquery: true, plusplus: false, curly: true, eqeqeq: true, immed: true, latedef: true, newcap: true, nonew: true, undef: true, strict: true, trailing: true, globalstrict: true
*/
/*global startTime:true, stopTime:true, initialDisplayLength:true*/
"use strict";


//////////////////////////////////////////////////////////////////////////////////
// Utility Functions
//////////////////////////////////////////////////////////////////////////////////
function twoDigitString(value) {
  return (value < 10) ? ("0" + value) : value.toString();
}

function dateString(seconds, sep) {
  var d = new Date(seconds*1000);
  return (d.getMonth()+1) +
         "/" +
         d.getDate() +
         "/" +
         twoDigitString(d.getFullYear()%100) +
         sep +
         twoDigitString(d.getHours()) +
         ":" +
         twoDigitString(d.getMinutes()) +
         ":" +
         twoDigitString(d.getSeconds());
}

function ipString(ip) {
  return (ip>>24 & 0xff) + '.' + (ip>>16 & 0xff) + '.' + (ip>>8 & 0xff) + '.' + (ip & 0xff);
}

function parseUrlParams() {
  var urlParams = {};
  var e,
      a = /\+/g,  // Regex for replacing addition symbol with a space
      r = /([^&=]+)=?([^&]*)/g,
      d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
      q = window.location.search.substring(1);

  while ((e = r.exec(q))) {
     urlParams[d(e[1])] = d(e[2]);
  }

  return urlParams;

}

// From http://stackoverflow.com/a/2901298
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// From http://datatables.net/plug-ins/api#fnLengthChange
$.fn.dataTableExt.oApi.fnLengthChange = function ( oSettings, iDisplay )
{
    oSettings._iDisplayLength = iDisplay;
    oSettings.oApi._fnCalculateEnd( oSettings );
      
    /* If we have space to show extra rows (backing up from the end point - then do so */
    if ( oSettings._iDisplayEnd === oSettings.aiDisplay.length )
    {
        oSettings._iDisplayStart = oSettings._iDisplayEnd - oSettings._iDisplayLength;
        if ( oSettings._iDisplayStart < 0 )
        {
            oSettings._iDisplayStart = 0;
        }
    }
      
    if ( oSettings._iDisplayLength === -1 )
    {
        oSettings._iDisplayStart = 0;
    }
      
    oSettings.oApi._fnDraw( oSettings );
      
    if ( oSettings.aanFeatures.l )
    {
        $('select', oSettings.aanFeatures.l).val( iDisplay );
    }
};

//From http://datatables.net/plug-ins/sorting
jQuery.extend( jQuery.fn.dataTableExt.oSort, {
    "formatted-num-pre": function ( a ) {
        a = (a==="-") ? 0 : a.replace( /[^\d\-\.]/g, "" );
        return parseFloat( a );
    },
 
    "formatted-num-asc": function ( a, b ) {
        return a - b;
    },
 
    "formatted-num-desc": function ( a, b ) {
        return b - a;
    }
} );

// From http://stackoverflow.com/a/8999941
(function ($, undefined) {
    $.fn.getCursorPosition = function() {
        var el = $(this).get(0);
        var pos = 0;
        if('selectionStart' in el) {
            pos = el.selectionStart;
        } else if('selection' in document) {
            el.focus();
            var Sel = document.selection.createRange();
            var SelLength = document.selection.createRange().text.length;
            Sel.moveStart('character', -el.value.length);
            pos = Sel.text.length - SelLength;
        }
        return pos;
    };
}(jQuery));

(function ($, undefined) {
    $.fn.getCurrentWord = function() {
      var val = $(this).val();
      var start, end;
      for (start = $(this).getCursorPosition(); start > 0; start--) {
        if (val[start-1] === " ") {
          break;
        }
      }

      for (end = $(this).getCursorPosition(); end < val.length; end++) {
        if (val[end] === " ") {
          break;
        }
      }

      return val.substring(start, end);
    };
}(jQuery));


function splitExpression(input ) {
  input = input.replace(/ /g, "");
  var output = [];
  var cur = "";

  for (var i = 0; i < input.length; i++) {
      if (/[)(]/.test(input[i])) {
        if (cur !== "") {
          output.push(cur);
        }
        output.push(input[i]);
        cur = "";
      } else if (cur === "") {
        cur += input[i];
      } else if (/[!&|=]/.test(cur)) {
        if (/[&|=]/.test(input[i])) {
          cur += input[i];
        } else {
          output.push(cur);
          cur = input[i];
        }
      } else if (/[!&|=]/.test(input[i])) {
        output.push(cur);
        cur = input[i];
      } else {
        cur += input[i];
      }
  }
  if (cur !== "") {
    output.push(cur);
  }
  return output;
}

//////////////////////////////////////////////////////////////////////////////////
// layout Functions
//////////////////////////////////////////////////////////////////////////////////
$(document).ready(function() {
  $("#connectionsLink").click(function (e) {
    var data;

    if (typeof sessionsTable !== 'undefined') {
      data = sessionsTable.fnSettings().oApi._fnAjaxParameters(sessionsTable.fnSettings());
    } else {
      data = [];
    }

    var params = buildParams();
    params = $.merge(data, params);

    var url = "graph?" + $.param(params);

    window.location = url;
    return false;
  });

  $("#sessionsLink").click(function (e) {
    var data;
    if (typeof sessionsTable !== 'undefined') {
      data = sessionsTable.fnSettings().oApi._fnAjaxParameters(sessionsTable.fnSettings());
    } else {
      data = [];
    }

    var params = buildParams();
    params = $.merge(data, params);

    var url = $("#sessionsLink").attr("href") + "?" + $.param(params);

    window.location = url;
    return false;
  });
});

//////////////////////////////////////////////////////////////////////////////////
// index Functions
//////////////////////////////////////////////////////////////////////////////////
function handleUrlParams() {
  var urlParams = parseUrlParams();

  if (urlParams.date) {
    $("#date").val(urlParams.date);
  } else {
    $("#date").val("");
  }

  if (urlParams.expression) {
    $("#expression").val(urlParams.expression);
  } else {
    $("dexpression").val("");
  }

  initialDisplayLength = urlParams.iDisplayLength || 100;
  $("#graphSize").val(String(initialDisplayLength));
  $("#sessions_length").val(String(initialDisplayLength));

  if (urlParams.startTime && urlParams.startTime) {
    startTime = urlParams.startTime;
    stopTime = urlParams.stopTime;
    $("#date").val("-2");
  }
  
  if (urlParams.useDir=== "0" && urlParams.usePort === "0") {
    $("#graphType").val("useDir=0&usePort=0");
  } else if (urlParams.useDir=== "0" && urlParams.usePort === "1") {
    $("#graphType").val("useDir=0&usePort=1");
  } else if (urlParams.useDir=== "1" && urlParams.usePort === "0") {
    $("#graphType").val("useDir=1&usePort=0");
  } else if (urlParams.useDir=== "1" && urlParams.usePort === "1") {
    $("#graphType").val("useDir=1&usePort=1");
  }

  return urlParams;
}

function addExpression (expression, op) {
  var val = $("#expression").val();
  if (val === "") {
    $("#expression").val(expression);
  } else {
    $("#expression").val(val + (op || " && ") + expression);
  }
  return false;
}

$(document).ready(function() {
  if ($("#expression").length && $("#expression").autocomplete) {
    $("#expression").autocomplete("", {
      useDelimiter: true,
      delimiterChar: ' ',
      minChars: 0,
      maxItemsToShow: 100
    });

    $("#expression").data('autocompleter').fetchRemoteData = function(filter,callback) {
      var cp = $("#expression").getCursorPosition();
      var input = $("#expression").val();

      var spaceCP = (cp > 0 && cp === input.length && input[cp-1] === " ");

      for (var end = cp; end < input.length; end++) {
        if (input[end] === " ") {
          break;
        }
      }

      input = input.substr(0, end);
      var tokens = splitExpression(input);
      if (spaceCP) {
        tokens.push(" ");
      }

      var commands = ["(", "ip", "ip.src", "ip.dst", "ip.dns", "ip.dns.count", "ip.xff", "ip.xff.cnt", "country", "country.src", "country.dst", "country.dns", "country.xff", "asn", "asn.src", "asn.dst", "asn.dns", "asn.xff", "bytes", "databytes", "protocol", "ua", "ua.cnt", "user", "user.cnt", "tags", "tags.cnt", "oldheader", "header", "header.src", "header.src.cnt", "header.dst", "header.dst.cnt", "node", "packets", "port", "port.src", "port.dst", "uri", "uri.cnt", "host", "host.cnt", "cert.issuer.cn", "cert.issuer.on", "cert.subject.cn", "cert.subject.on", "cert.serial", "cert.alt", "cert.alt.cnt", "cert.cnt", "ssh.key", "ssh.key.cnt", "ssh.ver", "ssh.ver.cnt"];

      if (tokens.length <= 1) {
        return callback(commands);
      }

      if (/^(ip)/.test(tokens[tokens.length-2])) {
        return callback(["!=", "=="]);
      }

      if (/^(bytes|databytes|protocol)/.test(tokens[tokens.length-2]) || /\.cnt$/.test(tokens[tokens.length-2])) {
        return callback(["!=", "==" , ">=", "<=", "<", ">"]);
      }

      if (/^(tags|ua|oldheader|header|country|asn|host|node|uri|cert)/.test(tokens[tokens.length-2])) {
        return callback(["!=", "=="]);
      }

      var item = tokens[tokens.length-3];
      if (/^(ip|bytes|databytes|protocol|packets|node|ua|uri|cert)/.test(item)) {
        return callback([]);
      }

      if (/^(country)/.test(item)) {
        return callback(Object.keys($('#world-map').data('mapObject').countries));
      }

      if (/^[!<=>]/.test(item)) {
        return callback(["&&", "||", ")"]);
      }

      if (/^(tags|oldheader|header)/.test(item)) {
        if (filter.length < 1) {
          return callback([]);
        }
        $.ajax( {
            "dataType": 'html',
            "type": "GET",
            "url": 'uniqueValue.json?type=' + item + '&filter=' + filter,
            "success": function(data) {
              return callback(JSON.parse(data));
            }
        } );
        return;
      }

      return callback(commands);
    };
  }
});

function addSessionIPStr (ip) {
  return addExpression("ip == " + ip);
}

function addSessionIP (ip) {
  return addSessionIPStr(ipString(ip));
}

function setSessionStartTime (t) {
  startTime = t;
  $("#date").val("-2");
  return false;
}

function setSessionStopTime (t) {
  stopTime = t;
  $("#date").val("-2");
  return false;
}

function drawGraph(graphData) {
  if (!graphData) {
    return;
  }

  var interval = 60*1000;
  var color = "#000000";
  var plot = $.plot(
  $("#sessionGraph"), [{
    data: graphData
  }], {
    series: {
      lines: {
        show: false,
        fill: true
      },
      bars: {
        show: true,
        fill: 1,
        barWidth: interval / 1.7
      },
      points: {
        show: false
      },
      color: color,
      shadowSize: 0
    },
    xaxis: {
      mode: "time",
      Atimeformat: "%H:%M:%S<br>%m/%d",
      label: "Datetime",
      color: "#000",
      tickFormatter: function(v, axis) {
        return dateString(v/1000, "<br>");
      }
    },
    yaxis: {
      min: 0,
      color: "#000",
      tickFormatter: function(v, axis) {
        return numberWithCommas(v);
      }
    },
    selection: {
      mode: "x",
      color: '#000'
    },
    zoom : {
      interactive: false,
      trigger: "dblclick",
      amount: 2
    },
    pan : {
      interactive: false,
      cursor: "move",
      frameRate: 20
    },
    legend: {
      position: "nw"
    },
    grid: {
      backgroundColor: '#fff',
      borderWidth: 0,
      borderColor: '#000',
      color: "#ddd",
      hoverable: true,
      clickable: true
    }
  });

  // code from flot - add zoom out button
  $('<div class="button" style="right:20px;top:5px">zoom out</div>').appendTo($("#sessionGraph")).click(function (e) {
      e.preventDefault();
      plot.zoomOut();
  });

  function addArrow(dir, right, top, offset) {
      $('<img class="button" src="flot-0.7/examples/arrow-' + dir + '.gif" style="right:' + right + 'px;top:' + top + 'px">').appendTo($("#sessionGraph")).click(function (e) {
        e.preventDefault();
        plot.pan(offset);
      });
  }

  addArrow('left', 115, 5, { left: -100 });
  addArrow('right', 85, 5, { left: 100 });
}

function buildParams() {
  var params = [];

  if ($("#date").length) {
    if ($("#date").val() === "-2") {
      params.push({name:'startTime', value:startTime});
      params.push({name:'stopTime', value:stopTime});
    } else if ($("#date").val()) {
      params.push({name:'date', value:$("#date").val()});
    }
  }

  if ($("#expression").length) {
    if ($("#expression").val()) {
      params.push({name:'expression', value:$("#expression").val()});
    }
  }

  if (typeof sessionsTable === 'undefined') {
    params.push({name: "iDisplayLength", value: initialDisplayLength});
  }

  return params;
}

    // Code from Kibana
function showTooltip(x, y, contents) {
  $('<div id="tooltip">' + contents + '</div>').css({
    position: 'absolute',
    display: 'none',
    top: y - 20,
    left: x - 100,
    color: '#eee',
    padding: '3px',
    'font-size': '8pt',
    'background-color': '#000',
    border: '1px solid #000',
    'font-family': '"Verdana", Geneva, sans-serif'
  }).appendTo("body").fadeIn(200);
}

function setupSessionGraphBinds(sessionsTable) {
  // Pieces from Kibana
  var previousPoint = null;
  $("#sessionGraph").bind("plothover", function (event, pos, item) {
    $("#x").text(pos.x.toFixed(2));
    $("#y").text(pos.y.toFixed(2));

    if (item) {
      if (previousPoint !== item.dataIndex) {
        previousPoint = item.dataIndex;

        $("#tooltip").remove();
        var x = item.datapoint[0].toFixed(0),
            y = Math.round(item.datapoint[1]*100)/100,
            d = dateString(x/1000, " ");

        showTooltip(item.pageX, item.pageY, numberWithCommas(y) + " at " + d.substr(0, d.length-3));
      }
    } else {
      $("#tooltip").remove();
      previousPoint = null;
    }
  });

  $('#sessionGraph').bind("plotselected", function (event, ranges) {
    startTime = Math.floor(ranges.xaxis.from/1000);
    stopTime = Math.floor(ranges.xaxis.to/1000);
    $("#date").val("-2");
    sessionsTable.fnDraw();
  });

  $("#sessionGraph").bind('plotpan plotzoom', function (event, plot) {
      var axes = plot.getAxes();
      startTime = Math.floor(axes.xaxis.min/1000)-1;
      stopTime = Math.ceil(axes.xaxis.max/1000)+1;
      $("#date").val("-2");
      sessionsTable.fnDraw();
  });
}

//////////////////////////////////////////////////////////////////////////////////
// users Functions
//////////////////////////////////////////////////////////////////////////////////
