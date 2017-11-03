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
            this.hide(true);
        }
    }
}());
