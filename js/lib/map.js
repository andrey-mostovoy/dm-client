if (typeof window.promap_var == "undefined"){
    var promap_var = 21845, promap_timerId;
    window.promap_Setting = {
        "target" : "map_button",
        "city" : "137",
        "onload" : null,
        "onselect" : function(value){console.log(value);},
        "oncancel" : function(){console.log('map select cancel');},
        "show_price" : true,
        "show_button" : true,
        "price" : function(value){return value;},
    };
    function loadScript(path){
        var sc = document.getElementsByTagName("script");
        var iA = sc[0];
        var se = document.createElement("script");
        se.type = "text/javascript";
        se.async = true;
        se.charset="UTF-8";
        iA.parentNode.insertBefore(se, iA).src = path;
    }
    function addStyle(){
        var css = '#lk_map_modal{position:fixed;font-family:Arial,Helvetica,sans-serif;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.8);-webkit-transition:opacity 400ms ease-in;-moz-transition:opacity 400ms ease-n;transition:opacity 400ms ease-in;display:none;pointer-events:none;padding:20px;z-index:11111}#lk_map_modal:target{display:block;pointer-events:auto;}#lk_point_selector{width:80%;height:90%;/*min-width:740px;min-height:440px;*/position:relative;margin:auto;padding:20px;background:#fff;pointer-events:auto;}#lk_point_list{position:absolute;width:30%;height:100%;}#lk_points_info{width:90%;height:85%;overflow-y:auto;}#lk_point_map{left:31%;position:absolute;width:68%;height:95%;}#lk_select_city{width:90%;padding:5px;}.lk_city_point{padding:5px;font-size:13px;}.lk_city_point:hover{background-color:#eeeeee;cursor:pointer;}.lk_point_name{font-size:16px;font-weight:bold;}.lk_close{background:#606061;cursor:pointer;color:#FFFFFF;line-height:25px;position:absolute;right:-12px;text-align:center;top:-10px;width:24px;text-decoration:none;font-weight:bold;-webkit-border-radius:12px;-moz-border-radius:12px;border-radius:12px;-moz-box-shadow:1px 1px 3px #000;-webkit-box-shadow:1px 1px 3px #000;box-shadow:1px 1px 3px #000;}.lk_close:hover{background:#b12215;}.lk_select{font-weight:700;color:white;text-decoration:none;padding:.4em 1em calc(.4em + 3px);border-radius:3px;background:#b12215;box-shadow:0 -3px #912215 inset;transition:0.2s;}.lk_select:hover{background:#912215;}.lk_select:active{background:#b12215;box-shadow:0 3px #912215 inset;}#lk_loading{display:none;left:50%;top:50%;position:absolute;margin-top:-64px;margin-left:-64px;}',head = document.head || document.getElementsByTagName('head')[0],style = document.createElement('style');
        style.type = 'text/css';
        if (style.styleSheet){style.styleSheet.cssText = css;} else {style.appendChild(document.createTextNode(css));}
        head.appendChild(style);
    }
    var extend = function () {
        var extended = {};
        var deep = false;
        var i = 0;
        var length = arguments.length;
        if ( Object.prototype.toString.call( arguments[0] ) === '[object Boolean]' ) {
            deep = arguments[0];
            i++;
        }
        var merge = function (obj) {
            for ( var prop in obj ) {
                if ( Object.prototype.hasOwnProperty.call( obj, prop ) ) {
                    if ( deep && Object.prototype.toString.call(obj[prop]) === '[object Object]' ) {
                        extended[prop] = extend( true, extended[prop], obj[prop] );
                    } else {
                        extended[prop] = obj[prop];
                    }
                }
            }
        };
        for ( ; i < length; i++ ) {
            var obj = arguments[i];
            merge(obj);
        }
        return extended;
    };
    (function(){
        if(typeof map_config !== "undefined") {promap_Setting = extend(promap_Setting,map_config);}
        document.getElementById(promap_Setting.target).disabled = true;
        if(typeof window.ymaps == "undefined"){loadScript("https:\/\/api-maps.yandex.ru\/2.1\/?lang=ru_RU");}
        loadScript("\/\/lk.pro-cour.ru/map_widget.js");
        addStyle();
        var div = document.createElement('div'); div.id = 'lk_map_modal';
        div.innerHTML = '<div id="lk_point_selector"><a title="Закрыть" class="lk_close" onclick="proMap.hide()">X</a><div id="lk_loading"><img src="//lk.pro-cour.ru/img/ajax_loader.gif"></div><div id="lk_point_list"></div><div id="lk_point_map"></div></div>';document.body.appendChild(div);
        promap_timerId = setTimeout(function () {
            if (typeof window.proMap === "undefined") {
                console.log("Map widget dont load! Time is out!");
            }
        }, 5000);
    })();
};
