var DeliveryMap = function() {
    this.inited = false;
    this.Map = null;
    this.GeoCollection = null;
    this.selector = {};
    this.selector.addressField = '';
    this.selector.cityField = '';
    this.selector.deliveryInfo = '';
    this.pointSelectCallback = null;
    this.citySelectCallback = null;

    this.setDeliveryFieldSelector = function(selector) {
        this.selector.addressField = selector;
    };

    this.setCityFieldSelector = function(selector) {
        this.selector.cityField = selector;
    };

    /**
     * Устанавливает колбек на выбор пункта/адреса/прочее доставки.
     * @param {function} callback
     */
    this.setCallbackOnPointSelect = function(callback) {
        this.pointSelectCallback = callback
    };

    /**
     * Устанавливает колбек на выбор города.
     * @param {function} callback
     */
    this.setCallbackOnSelectCity = function(callback) {
        this.citySelectCallback = callback;
    };

    this.loadScript = function(callback) {
        if (!jQuery.cachedScript) {
            jQuery.cachedScript = function( url, options ) {
                options = $.extend(options || {}, {
                    dataType: 'script',
                    cache: true,
                    url: url
                });
                return jQuery.ajax(options);
            };
        }

        $.cachedScript(this.script.url).done(function(script, textStatus) {
            if (typeof callback == 'function') {
                callback();
            }
        });
    };

    this.hide = function() {
        $(this.selector.mapWrapper).hide();
    };

    this.updateDeliveryInfo = function(address) {
        if ($(this.selector.deliveryInfo).length) {
            $(this.selector.deliveryInfo).text(address);
            return;
        }

        var $deliveryInfo = $('<div></div>').addClass(this.selector.deliveryInfo.replace('.', ''));
        $deliveryInfo.text(address);
        $(this.selector.mapWrapper).prepend($deliveryInfo);
    };

    this.syncDeliveryInfo = function() {
        if (!$(this.selector.deliveryInfo).length) {
            return;
        }

        if ($(this.selector.deliveryInfo).text() != $(this.selector.addressField).val()) {
            $(this.selector.deliveryInfo).remove();
        }
    };
};

// тут все плохо - грузит скриптов штуки 2, делает модальное окно в тех скриптах, а тут переносит все в форму заказа...
var DeliveryMapProfessional = function() {
    this.selector.mapWrapper = '.js-lk_map';
    this.selector.deliveryInfo = '.js-lk-delivery-info';
    this.overrideStyle = {
        width: 0, height: 0, padding: 0, margin: 0
    };
    this.script = {};
    this.script.url = '/js/lib/lk_map.js';

    this.init = function(showRequired) {
        if ($(this.selector.mapWrapper).length && this.inited) {
            if (showRequired) {
                this.show();
            }
            return;
        }

        var t = this;

        this.mapConfig();
        this.loadScript(function() {
            var $lkModal = $('#lk_map_modal');
            var $lkPointSelector = $('#lk_point_selector', $lkModal).clone(true, true);
            $('.lk_close', $lkPointSelector).remove();
            $('#lk_loading', $lkPointSelector).css(t.overrideStyle);
            $('#lk_select_city option[value=137]', $lkPointSelector).remove();
            $lkModal.css(t.overrideStyle);
            var $wrapper = $('<div></div>').addClass(t.selector.mapWrapper.replace('.', ''));
            $wrapper.hide();
            $wrapper.html($lkPointSelector);
            $(t.selector.addressField).after($wrapper);

            $('#lk_point_selector', $lkModal).remove();

            if (showRequired) {
                t.show();
                t.showProMap();
            }
        });

        this.inited = true;
    };

    this.mapConfig = function() {
        window.promap_Setting = {
            'target': 'map_button',
            'city': '44', // Москва
            'onload': function() {},  // функция вызываемая по загрузке виджета - по умолчанию ничего не вызывается
            'onselect': $.proxy(this.onSelectPoint, this),
            'oncancel': function() {}, // функиця отмены выбора - по умолчанию только console.log(message)
            'show_price': true, // показывать поле стоимость - по умолчанию true
            'show_button': true, // показывать кнопку 'Заберу отсюда'
            'price': function(value) { // функция вызываемая при формировании строки стоимости - по умолчанию return value;
                return value;
                // return value + ' Ваши данные (например доп сбор 150р.)'
            }
        };
    };

    this.showProMap = function() {
        var t = this;
        if (window.proMap && window.ymaps && window.ymaps.Map) {
            window.proMap.show();
        } else {
            setTimeout(function() {
                t.showProMap();
            }, 50);
        }
    };

    this.show = function() {
        this.syncDeliveryInfo();
        if (!this.inited) {
            this.init(true);
        } else {
            $(this.selector.mapWrapper).show();
        }
    };

    this.onSelectPoint = function(info) {
        var address = [info.city_name, info.point.address].join(', ');
        $(this.selector.addressField).val(address);
        this.updateDeliveryInfo(address);
    };
};
DeliveryMapProfessional.prototype = new DeliveryMap();

// карта для главпункта.
var DeliveryMapGlavPunkt = function() {
    this.Courier = null;
    this.selector.mapWrapper = '.js-glav_punkt_map';
    this.selector.buttonSelectPoint = '.js-gp-select-point';
    this.selector.deliveryInfo = '.js-gp-delivery-info';
    this.isButtonRequired = true;
    this.isAllPointRequired = false;
    this._isClearMapPointsRequired = true;

    this.init = function(showRequired) {
        if (this.Map && this.inited) {
            this.show();
            return;
        }

        var t = this;

        $(document).delegate(this.selector.buttonSelectPoint, 'click', $.proxy(t.onSelectPoint, t));

        showRequired = showRequired || false;

        var mapWrapperId = 'glavPunktMap';
        var selectId = 'glavPunktCitySelect';

        var $wrapper = $('<div></div>').addClass(this.selector.mapWrapper.replace('.', ''));
        var $mapWrapper = $('<div></div>').attr('id', mapWrapperId);
        var $selectWrapper = $('<div></div>');
        var $select = $('<select></select>').attr('id', selectId);
        var $selectLabel = $('<p></p>').text('Выберите город:');
        var $mapLabel = $('<p></p>').text('Выберите пункт выдачи:');

        $wrapper.hide();
        $selectWrapper.append($selectLabel);
        $selectWrapper.append($select);
        $wrapper.html($selectWrapper);
        $wrapper.append($mapLabel);
        $wrapper.append($mapWrapper);
        $(this.selector.addressField).after($wrapper);

        // навесим обработчик выбора города
        $('#' + selectId).on({
            change: $.proxy(t.onSelectCity, t),
        });

        // Дождёмся загрузки API и готовности DOM.
        window.ymaps.ready(function() {
            t.Courier = new CourierGlavPunkt();
            t.Courier.getCityList(function(cityList) {
                var $option;
                for (var i in cityList) {
                    if (cityList.hasOwnProperty(i)) {
                        $option = $('<option></option>').attr('value', i).text(cityList[i]);
                        if (i === 'spb') {
                            $option.attr('selected', 'selected');
                            typeof t.citySelectCallback === 'function' && t.citySelectCallback(cityList[i]);
                        }
                        $select.append($option);
                    }
                }

                // на старте открываем по местоположению
                // @todo https://tech.yandex.ru/maps/jsbox/2.1/geolocation
                // @todo https://tech.yandex.ru/maps/jsbox/2.1/geolocated_map

                t.Map = new ymaps.Map(mapWrapperId, {
                    center: [59.94, 30.32], // Спб
                    controls: ['zoomControl', 'searchControl'],
                    // controls: ['zoomControl'],
                    zoom: 10
                });

                t.GeoCollection = new ymaps.GeoObjectCollection();

                if (t.isAllPointRequired) {
                    t.showAllPoints(function() {
                        if (showRequired) {
                            t.show();
                        }
                    });
                } else {
                    t._showPointsInCity('spb', function() {
                        if (showRequired) {
                            t.show();
                        }
                    });
                }
            });
        });

        this.inited = true;
    };

    /**
     * Отображает точки пунктов самовывоза в указаном городе.
     * @param {string} cityCode
     * @param {object} callback
     * @private
     */
    this._showPointsInCity = function(cityCode, callback) {
        var t = this;
        this.Courier.getPickupPoints(cityCode, function(points) {
            var pointsCount = 0;
            var classString = t.selector.buttonSelectPoint.replace('.', '');
            var button = '<input type="button" value="Заберу отсюда" class="' + classString + '">';

            // удаляем все метки.
            if (t._isClearMapPointsRequired) {
                t.GeoCollection.removeAll();
                // t.Map.geoObjects.removeAll();
            }

            for (var i in points) {
                if (!points.hasOwnProperty(i)) {
                    continue;
                }
                t._createMapPlacemark(points[i]);
                pointsCount++;
            }

            // обычно зума 10 достаточно, если точек мало - скорее всего город маленький и зум надо побольше
            var newZoom = cityCode === 'spb' ? 7 : 10;
            if (pointsCount === 1) {
                newZoom = 13;
            }

            // Установить границы карты по объектам
            t.Map.geoObjects.add(t.GeoCollection);
            t.Map.setBounds(t.GeoCollection.getBounds(), {
                checkZoomRange: true,
            }).then(function() {
                t.Map.setZoom(newZoom);
            });

            typeof callback === 'function' && callback();
        });
    };

    /**
     * Показывает сразу все точки с пунктами самовывоза на карте.
     * @param callback
     */
    this.showAllPoints = function(callback) {
        var t = this;
        this.Courier.getCityList(function(cityList) {
            t._isClearMapPointsRequired = false;

            for (var cityCode in cityList) {
                if (cityList.hasOwnProperty(cityCode)) {
                    t._showPointsInCity(cityCode);
                }
            }

            if (typeof callback == 'function') {
                callback();
            }
        });
    };

    /**
     * Создает на карте точки
     * @param {object} Point Точка карты
     */
    this._createMapPlacemark = function(Point) {
        var params = {
            balloonContentHeader: this._getBalloonHeader(Point),
            balloonContentBody: this._getBalloonBody(Point),
            hintContent: Point.address
        };
        var options = {
            preset: 'islands#darkOrangeIcon',
        };
        if (Point.operator === 'Cdek') {
            options.preset = 'islands#darkGreenIcon';
        } else if (Point.operator === 'Boxberry') {
            options.preset = 'islands#violetIcon';
        }
        if (this.isButtonRequired) {
            var classString = this.selector.buttonSelectPoint.replace('.', '');
            params.balloonContentFooter = '<input type="button" value="Заберу отсюда" class="' + classString + '">';
        }

        // this.Map.geoObjects.add(new window.ymaps.Placemark(
        this.GeoCollection.add(new window.ymaps.Placemark(
            [Point.geo_lat, Point.geo_lng],
            params,
            options
        ));
    };

    /**
     * Формирует балун для точек
     * @param {object} Point
     * @returns {string}
     * @private
     */
    this._makeMapBaloon = function(Point) {
        var address = Point.address;
        var dataAddress = (Point.city + '; ' + Point.address).replace(/"/g, '&quot;');
        return '<strong data-id="' + Point.id + '" data-city="' + Point.city + '" data-address="' + dataAddress + '">' + address + '</strong>' +
            '<br/><span style="display: none">1</span>' +
            '<br/>' + Point.work_time +
            '<br/>Телефон: ' + Point.phone;
    };

    this._getBalloonHeader = function(Point) {
        var dataAddress = (Point.city + '; ' + Point.address).replace(/"/g, '&quot;');
        return [
            '<h3 class="pointInfo" data-id="' + Point.id + '" data-city="' + Point.city + '" data-address="' + dataAddress + '">',
            Point.address,
            '</h3>',
        ].join('');
    };

    this._getBalloonBody = function(Point) {
        var body = [
        ];

        // body.push('<p>');
        // body.push('<b>Доставка</b>');
        // body.push('<br/>');

        body.push('<p>');
        body.push('Время работы: ');
        body.push(Point.work_time);
        body.push('<br/>');
        body.push('Телефон: ');
        body.push(Point.phone);
        body.push('</p>');

        return body.join('');
    };

    this.show = function() {
        this.syncDeliveryInfo();
        if (!this.inited) {
            this.init(true);
        } else {
            $(this.selector.mapWrapper).show();
            // this.Map.container.fitToViewport();
        }
    };

    /**
     * При клике на балуне на карте
     * @param {Event} e
     */
    this.onSelectPoint = function(e) {
        var $item = $(e.target).parent().parent().find('.pointInfo');
        var id = $item.data('id');
        var city = $item.data('city');
        var address = $item.data('address');

        // пишем адрес доставки
        $(this.selector.addressField).val(address);
        this.Map.balloon.close();
        this.updateDeliveryInfo(address);

        // обновляем сумму за доставку
        typeof this.pointSelectCallback === 'function' && this.pointSelectCallback(id, city);
    };

    /**
     * При выборе города.
     * @param {Event} e
     */
    this.onSelectCity = function(e) {
        var cityCode = $(e.target).val();
        this._showPointsInCity(cityCode, function() {});

        typeof this.citySelectCallback === 'function' && this.citySelectCallback($(e.target).find(':selected').text());
    };
};
DeliveryMapGlavPunkt.prototype = new DeliveryMap();

/**
 * Доставка курьером.
 * @constructor
 */
var CourierDelivery = function() {
    this.Courier = null;
    this.selector.mapWrapper = '.js-courier_city_list';

    this.init = function(showRequired) {
        if (this.inited) {
            this.show();
            return;
        }

        var t = this;
        this.Courier = new CourierGlavPunkt();

        showRequired = showRequired || false;

        var selectId = 'courierCitySelect';

        var $wrapper = $('<div></div>').addClass(this.selector.mapWrapper.replace('.', ''));
        var $selectWrapper = $('<div></div>');
        var $select = $('<select></select>').attr('id', selectId);
        var $selectLabel = $('<p></p>').text('Выберите город:');
        var $addressLabel = $('<p></p>').text('Укажите адрес:');

        $wrapper.hide();
        $selectWrapper.append($selectLabel);
        $selectWrapper.append($select);
        $wrapper.html($selectWrapper);
        $wrapper.append($addressLabel);
        $(this.selector.addressField).before($wrapper);

        // навесим обработчик выбора города
        $('#' + selectId).on({
            change: $.proxy(t.onSelectCity, t),
        });

        // ставим тут т.к. код ниже может быть как синхронным так и асинхронным.
        // в первом случае если строчки ниже не будет произойдет бесконечный цикл
        this.inited = true;

        this.Courier.getCourierCities(function(cityList) {
            var currentCity = $(t.selector.cityField).val();
            var count = cityList.length;
            for (var i = 0; i < count; i++) {
                var $option = $('<option></option>').attr('value', cityList[i]).text(cityList[i]);
                $select.append($option)
            }

            if (currentCity.length) {
                $('option[value="' + currentCity + '"]').prop('selected', true);
            } else {
                window.UserGeo.getCity(function(userCity) {
                    $('option[value="' + userCity + '"]').prop('selected', true);
                    t.triggerCallbacks(userCity);
                });
            }

            if (showRequired) {
                t.show();
            }
        });
    };

    this.show = function() {
        if (!this.inited) {
            this.init(true);
        } else {
            // это просто селект городов
            $(this.selector.mapWrapper).show();
            $(this.selector.addressField).show();
        }
    };

    /**
     * При выборе города.
     * @param {Event} e
     */
    this.onSelectCity = function(e) {
        this.triggerCallbacks($(e.target).find(':selected').text());
    };

    /**
     * Выполняем установленные колбеки.
     * @param {string} city
     */
    this.triggerCallbacks = function(city) {
        // обновляем всякое попринятому городу
        typeof this.citySelectCallback === 'function' && this.citySelectCallback(city);
        // обновляем сумму за доставку
        typeof this.pointSelectCallback === 'function' && this.pointSelectCallback(city);
    };
};
CourierDelivery.prototype = new DeliveryMap();

var MapProcessor = function() {
    this.delivery = {};
    this.delivery.current = 0;
    this.delivery.id = {};
    this.delivery.id.glavpunkt = 1;
    this.delivery.id.courier = 2;
    this.delivery.id.mail = 3;
    this.delivery.id.pointOther = 4;

    this.mapByDelivery = {};

    this.selector = {};
    this.selector.addressField = '#order-fld-2';
    this.selector.cityField = '#order-fld-8';

    /**
     *
     * @param {number} deliveryId
     * @param {function} onPointSelect
     * @param {function} onCitySelect
     */
    this.setMapByDelivery = function(deliveryId, onPointSelect, onCitySelect) {
        deliveryId = parseInt(deliveryId);
        if (deliveryId == this.delivery.current) {
            return;
        }

        $(this.selector.addressField).hide();

        var oldDeliveryId = this.delivery.current;
        if (this.mapByDelivery[oldDeliveryId]) {
            this.mapByDelivery[oldDeliveryId].hide();
        }

        if ((oldDeliveryId == this.delivery.id.glavpunkt && deliveryId == this.delivery.id.pointOther) ||
            (oldDeliveryId == this.delivery.id.pointOther && deliveryId == this.delivery.id.glavpunkt)
        ) {
            $(this.selector.addressField).val('');
        }

        this.delivery.current = deliveryId;

        switch (deliveryId) {
            case this.delivery.id.glavpunkt:
            case this.delivery.id.pointOther:
            case this.delivery.id.courier:
                var Map = this.getMapByDeliveryId(deliveryId, onPointSelect, onCitySelect);
                Map.show();
                break;
            case this.delivery.id.mail:
                $(this.selector.addressField).show();
                // $(this.selector.cityField).val('');
                break;
            default:
                console.log('unknown delivery id', deliveryId);
                return;
        }
    };

    /**
     * Вернет объект карты по ид доставки.
     * @param {number} deliveryId
     * @param {function} onPointSelect
     * @param {function} onCitySelect
     * @returns {DeliveryMap}
     */
    this.getMapByDeliveryId = function(deliveryId, onPointSelect, onCitySelect) {
        if (this.mapByDelivery[deliveryId]) {
            return this.mapByDelivery[deliveryId];
        }

        switch (deliveryId) {
            case this.delivery.id.glavpunkt:
                this.mapByDelivery[deliveryId] = new DeliveryMapGlavPunkt();
                break;
            case this.delivery.id.pointOther:
                this.mapByDelivery[deliveryId] = new DeliveryMapProfessional();
                break;
            case this.delivery.id.courier:
                this.mapByDelivery[deliveryId] = new CourierDelivery();
                break;
            default:
                console.log('unknown delivery id', deliveryId);
                return;
        }

        this.mapByDelivery[deliveryId].setDeliveryFieldSelector(this.selector.addressField);
        this.mapByDelivery[deliveryId].setCityFieldSelector(this.selector.cityField);
        if (typeof onCitySelect === 'function') {
            this.mapByDelivery[deliveryId].setCallbackOnSelectCity(onCitySelect);
        }
        if (typeof onPointSelect === 'function') {
            this.mapByDelivery[deliveryId].setCallbackOnPointSelect(onPointSelect);
        }

        return this.mapByDelivery[deliveryId];
    };
};
