if (typeof window.promap_var == "undefined"){
    var promap_var = 21845, promap_timerId;
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
        var css = '#lk_map_modal{position:fixed;font-family:Arial,Helvetica,sans-serif;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.8);-webkit-transition:opacity 400ms ease-in;-moz-transition:opacity 400ms ease-n;transition:opacity 400ms ease-in;display:none;pointer-events:none;padding:20px;z-index:11111}#lk_map_modal:target{display:block;pointer-events:auto;}#lk_point_selector{width:80%;height:90%;/*min-width:740px;min-height:440px;*/position:relative;margin:auto;padding:20px;background:#fff;pointer-events:auto;}#lk_point_list{position:absolute;width:30%;height:100%;}#lk_points_info{width:90%;height:85%;overflow-y:auto;}#lk_point_map{left:31%;position:absolute;width:68%;height:100%;}#lk_select_city{width:90%;padding:5px;}.lk_city_point{padding:5px;font-size:13px;}.lk_city_point:hover{background-color:#eeeeee;cursor:pointer;}.lk_point_name{font-size:16px;font-weight:bold;}.lk_close{background:#606061;cursor:pointer;color:#FFFFFF;line-height:25px;position:absolute;right:-12px;text-align:center;top:-10px;width:24px;text-decoration:none;font-weight:bold;-webkit-border-radius:12px;-moz-border-radius:12px;border-radius:12px;-moz-box-shadow:1px 1px 3px #000;-webkit-box-shadow:1px 1px 3px #000;box-shadow:1px 1px 3px #000;}.lk_close:hover{background:#b12215;}.lk_select{font-weight:700;color:white;text-decoration:none;padding:.4em 1em calc(.4em + 3px);border-radius:3px;background:#b12215;box-shadow:0 -3px #912215 inset;transition:0.2s;}.lk_select:hover{background:#912215;}.lk_select:active{background:#b12215;box-shadow:0 3px #912215 inset;}#lk_loading{display:none;left:50%;top:50%;position:absolute;margin-top:-64px;margin-left:-64px;}',head = document.head || document.getElementsByTagName('head')[0],style = document.createElement('style');
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
        addStyle();
        var div = document.createElement('div'); div.id = 'lk_map_modal';
        div.innerHTML = '<div id="lk_point_selector"><a title="Закрыть" class="lk_close" onclick="proMap.hide()">X</a><div id="lk_loading"><img src="//lk.pro-cour.ru/img/ajax_loader.gif"></div><div id="lk_point_list"></div><div id="lk_point_map"></div></div>';document.body.appendChild(div);
    })();
}


var list,keys,options;
var proMap=(function() {
    var myMap = null, cityList = [], select_list, cur_city = 0, keysSorted, cityInfo = null, collection = [],mark = [], timerID;
    var RETRIES_LIMIT = 3, retriesCount = 0;
    var ajax = {};
    ajax.x = function () {
        if (typeof XMLHttpRequest !== 'undefined') {
            return new XMLHttpRequest();
        }
        var versions = [
            "MSXML2.XmlHttp.6.0",
            "MSXML2.XmlHttp.5.0",
            "MSXML2.XmlHttp.4.0",
            "MSXML2.XmlHttp.3.0",
            "MSXML2.XmlHttp.2.0",
            "Microsoft.XmlHttp"
        ];
        var xhr;
        for (var i = 0; i < versions.length; i++) {
            try {
                xhr = new ActiveXObject(versions[i]);
                break;
            } catch (e) {
            }
        }
        return xhr;
    };
    ajax.send = function (url, callback, method, data, async) {
        if (async === undefined) {
            async = true;
        }
        var x = ajax.x();
        x.open(method, url, async);
        x.onreadystatechange = function () {
            if (x.readyState == 4) {
                callback(x.responseText)
            }
        };
        if (method == 'POST') {
            x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        }
        x.send(data)
    };
    ajax.get = function (url, data, callback, async) {
        var query = [];
        for (var key in data) {
            query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
        }
        ajax.send(url + (query.length ? '?' + query.join('&') : ''), callback, 'GET', null, async)
    };
    ajax.post = function (url, data, callback, async) {
        var query = [];
        for (var key in data) {
            query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
        }
        ajax.send(url, callback, 'POST', query.join('&'), async)
    };
    function addEvent(element, evnt, funct){
        if (element.attachEvent)
            return element.attachEvent('on'+evnt, funct);
        else
            return element.addEventListener(evnt, funct, false);
    }
    function makeSelect(){
        keysSorted = Object.keys(cityList).sort(function(a,b){
            return cityList[a].name.localeCompare(cityList[b].name)
        });
        select_list = '<select id="lk_select_city" onchange="proMap.loadCity(this.value)">';
        for (id=0;id<keysSorted.length;++id){
            select_list += '<option value="'+keysSorted[id]+'">'+cityList[keysSorted[id]].name+'</option>';
        }
        select_list += '<option value="-1">Город не из списка</option>';
        select_list += '</select><div id="lk_points_info"/>';
        document.getElementById("lk_point_list").innerHTML = select_list;
        var city = typeof promap_Setting.city == "function" ? promap_Setting.city() : promap_Setting.city;
        document.getElementById("lk_select_city").value = city;
        addEvent(document.getElementById(promap_Setting.target),'click', function () { proMap.show(); });
        document.getElementById(promap_Setting.target).disabled = false;
        if(typeof promap_Setting.onload == "function")
            promap_Setting.onload();
    }
    if((localStorage.getItem("promap_city_time") == null) || (localStorage.getItem("promap_city_time")+604800000 < new Date().getTime() )) {
        ajax.get("//lk.pro-cour.ru/points.php",{"citylist":"1"},function( json ) {
            localStorage.setItem("promap_city_time", new Date().getTime());
            localStorage.setItem("promap_city", json);
            cityList = JSON.parse(json);
            makeSelect();
        });
    }else{
        cityList = JSON.parse(localStorage.getItem("promap_city"));
        makeSelect();
    }

    return {
        show: function () {
            document.getElementById("lk_map_modal").style.display = "block";
            if(!myMap ) {
                myMap = new ymaps.Map("lk_point_map", {center: [55.751574, 37.573856],zoom: 9,controls: ["zoomControl","searchControl"]});
            }
            var city = typeof promap_Setting.city == "function" ? parseInt(promap_Setting.city()) : parseInt(promap_Setting.city);
            if(cur_city != city) {
                this.loadCity(city);
            } else {
                this.showCity();
            }
        },
        hide: function(value) {
            if(myMap) {
                myMap.destroy();
                myMap = null;
            }
            document.getElementById("lk_map_modal").style.display = "none";
            if(!value){
                promap_Setting.oncancel();
            }
        },
        showCity: function() {
            document.getElementById("lk_loading").style.display = "none";
            document.getElementById("lk_point_list").style.display = "block";
            document.getElementById("lk_point_map").style.display = "block";
            document.getElementById("lk_points_info").innerHTML = "";
            if(!Object.keys(cityInfo).length){
                document.getElementById("lk_select_city").value = -1;
                document.getElementById("lk_points_info").innerHTML = "Нет точек самовывоза!";
            }
            else if(!Object.keys(cityInfo[cur_city].points).length) {
                document.getElementById("lk_select_city").value = cur_city;
                document.getElementById("lk_points_info").innerHTML = "Нет точек самовывоза!";
            }
            else {
                myMap.setCenter(cityInfo[cur_city].center);
                collection = new ymaps.GeoObjectCollection(null);
                collection.removeAll();
                myMap.geoObjects.removeAll();
                document.getElementById("lk_select_city").value = cur_city;
                mark = [];
                var keysCity = Object.keys(cityInfo[cur_city].points).sort(function(a,b){
                    return cityInfo[cur_city].points[a].name.localeCompare(cityInfo[cur_city].points[b].name)
                });

                for (var i in cityInfo[cur_city].points){
                    var string = '<strong>'+cityInfo[cur_city].points[i].name+'</strong><br/>' + cityInfo[cur_city].points[i].address + '<br/>' +cityInfo[cur_city].points[i].work;

                    if(cityInfo[cur_city].points[i].way){
                        string += '<br/>Как добраться:' +cityInfo[cur_city].points[i].way
                    };
                    if(cityInfo[cur_city].points[i].phone){
                        string += '<br/>Телефон:' +cityInfo[cur_city].points[i].phone
                    };
                    if(cityInfo[cur_city].points[i].weight){
                        string += '<br/>Максимальный вес:' +cityInfo[cur_city].points[i].weight
                    };
                    if(cityInfo[cur_city].points[i].time){
                        string += '<br/>Доставка:' +cityInfo[cur_city].points[i].time
                    };
                    if(promap_Setting.show_price){
                        var pr = promap_Setting.price(cityInfo[cur_city].points[i].price);
                        if(pr!==false){
                            string += '<br/>Стоимость:' +pr;
                        };
                    }
                    string+='<br/>Частичный выкуп: '+( (cityInfo[cur_city].points[i].partials == 1) ? 'Да':'Нет')+'';
                    if(promap_Setting.show_button){
                        string +='<br/><button class="lk_select" onclick="proMap.select('+i+');">Заберу отсюда</button>';
                    }
                    mark[i] = new ymaps.Placemark(cityInfo[cur_city].points[i].coord, { balloonContent: string}, {balloonShadow: false, hideIconOnBalloonOpen: false,balloonOffset: [3, -40]});
                    collection.add(mark[i]);
                }
                for (var id=0; id<keysCity.length; id++){
                    var string = '<div class="lk_city_point" onclick="proMap.balloon('+keysCity[id]+')"><span class="point_name">'+cityInfo[cur_city].points[keysCity[id]].name+'</span><br/>' + cityInfo[cur_city].points[keysCity[id]].address + '<br/>'+ cityInfo[cur_city].points[keysCity[id]].work + '<br/></div>';
                    document.getElementById("lk_points_info").innerHTML += string;
                }
                myMap.geoObjects.add(collection);
                myMap.setBounds(myMap.geoObjects.getBounds(),{checkZoomRange: true});
            }
        },
        loadCity: function(city) {
            var pro = this;
            cityInfo = null;
            collection = null;
            document.getElementById("lk_point_list").style.display = "none";
            document.getElementById("lk_point_map").style.display = "none";
            document.getElementById("lk_loading").style.display = "block";
            ajax.get("//lk.pro-cour.ru/points.php",{"city_id":city},function( json ) {
                cur_city = city;
                cityInfo = JSON.parse(json);
                pro.showCity();
            });
        },
        balloon: function(id){
            myMap.balloon.close();
            myMap.setCenter(mark[id].geometry.getCoordinates(),16);
            setTimeout(function(){
                mark[id].balloon.open();
            }, 100);
        },
        select: function(id) {
            cur_point = id;
            myMap.balloon.close();
            var out = {};
            out.city_id = cur_city;
            out.id_obl=cityInfo[cur_city].id_obl;
            out.city_name = cityInfo[cur_city].name;
            out.point = cityInfo[cur_city].points[cur_point];
            promap_Setting.onselect(out);
        }
    }
}());
