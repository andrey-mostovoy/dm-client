var Courier = function() {
};

// курьерская служба "проффесионал"
var CourierProfessional = function() {
};
CourierProfessional.prototype = new Courier();

// главпункт - пункты самовывоза и курьеры.
var CourierGlavPunkt = function() {
    this.baseUrl = '//glavpunkt.ru/';
    this.login = 'domikm';
    this.token = '9ddca6f6080010662606d00766b3a0a3';
    this.serv = {
        pvz: 'выдача',
        pvzRU: 'выдача по РФ',
        courier: 'курьерская доставка',
        pochta: 'почта',
    };
    this._city = {
        msc: 'Москва',
        spb: 'Санкт-Петербург',
    };
    /**
     * Пункты самовывоза.
     * Код города: массив пунктов
     * @type {Array}
     */
    this.pickupPoints = [];
    /**
     * Города с пунктами самовывоза.
     * @type {{}}
     */
    this.cityList = {};
    this.cityListForCourier = [];
    this.pickupPointsCacheKey = 'gpd';
    this.courierCitiesCacheKey = 'gcc';
    this.cacheTtl = 1440; // сутки
    /**
     * @type {Array} Стек колбеков для сетевых ошибок отправки запросов.
     */
    this.failCallbackStack = [];

    /**
     * Это спб?
     * @param {string} city
     * @return {boolean}
     */
    this.isSpb = function(city) {
        return this._city.spb === city;
    };

    /**
     * Это мск?
     * @param {string} city
     * @return {boolean}
     */
    this.isMsc = function(city) {
        return this._city.msc === city;
    };

    /**
     * спб или мск?
     * @param {string} city
     * @return {boolean}
     */
    this.isSpbOrMsc = function(city) {
        return this.isSpb(city) || this.isMsc(city);
    };

    /**
     * Отправляет запрос на api главпункта
     * @param {String} method путь к методу, например api/punkts
     * @param {Object} params данные для запроса.
     * @param {Function} onDone Callback при успехе. Аргументы: data
     * @param {Function} onFail Callback при сетевой ошибке. Аргументы: jqXHR, textStatus, errorThrown
     */
    this.send = function(method, params, onDone, onFail) {
        var t = this;
        params = params || {};
        onDone = onDone || function() {};
        onFail = function(jqXHR, textStatus, errorThrown) {
            typeof onFail === 'function' && onFail(jqXHR, textStatus, errorThrown);
            $.each(t.failCallbackStack, function(index, onFailCallback) {
                onFailCallback(jqXHR, textStatus, errorThrown);
            });
        };
        $.getJSON(this.baseUrl + method, params).done(onDone).fail(onFail);
    };

    /**
     * Добавляет колбек на ошибку отправки запроса в главпункт
     * @param {Function} onFail Callback при сетевой ошибке. Аргументы: jqXHR, textStatus, errorThrown
     */
    this.addFailCallback = function(onFail) {
        this.failCallbackStack.push(onFail);
    };

    /**
     * Возвращает список доступных городов с пунктами самовывоза.
     * @param {function} callback
     */
    this.getCityList = function(callback) {
        if (!$.isEmptyObject(this.cityList)) {
            typeof callback === 'function' && callback(this.cityList);
            return;
        }

        var t = this;

        this.getPickupPoints('spb', function() {
            typeof callback === 'function' && callback(t.cityList);
        });
    };

    /**
     * Возвращает пункты самовывоза по выбранному городу
     * @param {string} cityCode Код города
     * @param {function} callback Колбек для вызова и передачи ему пунктов самовывоза по городу.
     */
    this.getPickupPoints = function(cityCode, callback) {
        if (!$.isEmptyObject(this.pickupPoints)) {
            typeof callback === 'function' && callback(this.pickupPoints[cityCode]);
            return;
        }

        // сначала посмотрим в кеш, и заберем из него если там есть
        // @todo возможно это и не нужно
        // var data = DataStorage.get(this.pickupPointsCacheKey);
        // if (data && !$.isEmptyObject(data.points) && !$.isEmptyObject(data.cities)) {
        //     this.pickupPoints = data.points;
        //     this.cityList = data.cities;
        //
        //     typeof callback === 'function' && callback(this.pickupPoints[cityCode]);
        //     return;
        // }

        // если нет в кеше - получим данные
        var t = this;
        var doneRequestCount = 0;
        var onDone = function () {
            doneRequestCount++;
            // у нас пока 2 запроса
            if (doneRequestCount === 2) {
                // отсортируем
                t.cityList = t._sortCityList(t.cityList);

                // и занесем данные в кеш
                // DataStorage.set(t.pickupPointsCacheKey, {
                //     points: t.pickupPoints,
                //     cities: t.cityList,
                // }, t.cacheTtl);

                typeof callback === 'function' && callback(t.pickupPoints[cityCode]);
            }
        };

        this.pickupPoints = {};
        this.cityList = {};

        this._getSpbAndMscPickupPoints(onDone);
        this._getRussianPickupPoints(onDone);
    };

    /**
     * Возвращает пункты выдачи в Спб и Мск
     * @param {function} callback
     */
    this._getSpbAndMscPickupPoints = function(callback) {
        var t = this;

        this.send('api/punkts', {}, function(response) {
            var count = response.length;
            var cityCode = '';
            for (var i = 0; i < count; i++) {
                if (t.isMsc(response[i].city)) {
                    cityCode = 'msc';
                } else {
                    cityCode = 'spb';
                }
                t._addCity(cityCode, response[i].city);
                if (cityCode === 'spb' && !t.isSpb(response[i].city)) {
                    // так отрежем все пункты, которые не в спб, а в ленобласти. Но приходят одной пачкой с спб
                    continue;
                }
                t._addPickupPoint(cityCode, response[i]);
            }

            typeof callback === 'function' && callback(t.pickupPoints);
        });
    };

    /**
     * Возвращает все пункты выдачи по России кроме Спб, Мск
     * @param callback
     */
    this._getRussianPickupPoints = function(callback) {
        var t = this;
        this.send('punkts-rf.json', {}, function(response) {
            var count = response.length;
            var cityString = '';
            for (var i = 0; i < count; i++) {
                cityString = response[i].city;
                if (response[i].region !== 'Санкт-Петербург' && response[i].region !== 'Москва') {
                    cityString += (response[i].region ? (', ' + response[i].region) : '');
                }
                t._addCity(response[i].city_id, cityString);
                t._addPickupPoint(response[i].city_id, response[i]);
            }

            typeof callback === 'function' && callback(t.pickupPoints);
        });
    };

    /**
     * Возвращает города с доставкой курьером.
     * @param {function} callback Колбек для вызова и передачи ему доступных городов доставки курьером.
     */
    this.getCourierCities = function(callback) {
        // может уже получали - вернем локальный кеш
        if (!$.isEmptyObject(this.cityListForCourier)) {
            typeof callback === 'function' && callback(this.cityListForCourier);
            return;
        }

        // посмотрим в кеш, и заберем из него если там есть
        // @todo возможно это и не нужно
        // var data = DataStorage.get(this.courierCitiesCacheKey);
        // if (data && !$.isEmptyObject(data.list)) {
        //     this.cityListForCourier = data.list;
        //
        //     typeof callback === 'function' && callback(this.cityListForCourier);
        //     return;
        // }

        var t = this;

        this.send('api/get_courier_cities', {}, function(response) {
            var count = response.length;
            var cityString = '';
            for (var i = 0; i < count; i++) {
                cityString = response[i].name;
                if (response[i].area !== 'Санкт-Петербург' && response[i].area !== 'Москва') {
                    cityString += (response[i].area ? (', ' + response[i].area) : '');
                }
                t.cityListForCourier[response[i].code] = cityString;
            }

            // и занесем данные в кеш
            DataStorage.set(t.courierCitiesCacheKey, {
                list: t.cityListForCourier,
            }, t.cacheTtl);

            typeof callback === 'function' && callback(t.cityListForCourier);
        });
    };

    /**
     * Возвращает все доступные города для транспортной кампании.
     * @param {function} callback
     */
    this.getAvailableCities = function(callback) {
        var t = this;

        t.getCityList(function(pickupCityList) {
            t.getCourierCities(function(courierCityList) {
                var cityList = [];

                for (var i in pickupCityList) {
                    if (!pickupCityList.hasOwnProperty(i)) {
                        continue;
                    }
                    if (courierCityList.hasOwnProperty(i)) {
                        cityList.push(courierCityList[i]);
                        continue
                    }
                    courierCityList[i] = pickupCityList[i];
                    cityList.push(pickupCityList[i]);
                }

                var uniqueCityList = cityList.filter(function(value, index, self) {
                    return self.indexOf(value) === index;
                });

                uniqueCityList.sort();

                typeof callback === 'function' && callback(uniqueCityList);
            });
        });
    };

    /**
     * Добавляет город в список доступных городов.
     * @param {string} cityCode Код города
     * @param {string} name Имя города
     * @private
     */
    this._addCity = function(cityCode, name) {
        if (!this.cityList.hasOwnProperty(cityCode)) {
            this.cityList[cityCode] = name;
        }
    };

    /**
     * Добавляет пункт самовывоза в список, разделенный по городам.
     * @param {string} cityCode
     * @param {object} pickupPoint
     * @private
     */
    this._addPickupPoint = function(cityCode, pickupPoint) {
        if (!this.pickupPoints.hasOwnProperty(cityCode)) {
            this.pickupPoints[cityCode] = [];
        }

        this.pickupPoints[cityCode].push(pickupPoint);
    };

    /**
     * Выполняет сортировку списка городов.
     * @param {object} obj
     * @returns {object} Отсортированный по значениям свойств объект
     */
    this._sortCityList = function(obj) {
        var sortable=[];
        for(var key in obj) {
            if(obj.hasOwnProperty(key)) {
                sortable.push([key, obj[key]]);
            }
        }

        // будет массив в формате [ [ key1, val1 ], [ key2, val2 ], ... ]
        sortable.sort(function(a, b) {
            var x = a[1].toLowerCase();
            var y = b[1].toLowerCase();
            return x < y ? -1 : x > y ? 1 : 0;
        });

        var count = sortable.length;
        var newObj = {};
        for (var i = 0; i < count; i++) {
            newObj[sortable[i][0]] = sortable[i][1];
        }

        return newObj;
    };

    /**
     * @see http://glavpunkt.ru/apidoc/gettarif.html
     * @param {Object} params
     * @param {String} params.serv выдача по РФ | выдача | курьерская доставка
     * @param {String} params.cityFrom
     * @param {String} params.cityTo
     * @param {String} params.punktId
     * @param {Number} params.weight
     * @param {Number} params.price
     * @param {String} params.paymentType
     * @param {Function} callback
     * @param {Function} errback
     */
    this.getDeliveryCost = function(params, callback, errback) {
        var t = this;
        var defaultParams = {
            serv: this.serv.pvzRU,
            cityFrom: this._city.spb,
            cityTo: '',
            punktId: '',
            weight: window.TOTAL_WEIGHT || 0,
            price: window.TOTAL_SUM || 0,
            paymentType: 'cash'
        };
        if (typeof params.serv === 'undefined' && this.isSpbOrMsc(params.cityTo)) {
            defaultParams.serv = t.serv.pvz;
        }
        var options = $.extend({}, defaultParams, params || {});
        this.send('api/get_tarif', options, function(response) {
            if (response.result === 'ok') {
                var tarif = response.tarif;
                var cost = tarif;
                if (options.serv == t.serv.pvz) {
                    cost = t.addServicesCost(cost, options.price);
                }
                cost = t.setMinCost(options, cost);
                cost = t.setMaxCost(options, cost);
                // до конца октября акция
                if (options.serv !== t.serv.pvz || !t.isSpbOrMsc(options.cityTo) || new Date() > new Date('2019-10-25')) {
                    cost = t.round(cost);
                }
                console.log('Тариф', options.cityTo, '(' + options.serv + '):', 'Тариф:', tarif, 'Цена:', cost);
                if (typeof callback === 'function') {
                    callback({
                        price: cost,
                        period: response.period
                    }, options.punktId);
                }
            } else if (response.result === 'error') {
                console.log('Ошибка подсчета тарифа', options.cityTo, '(' + options.serv + ')', response.message);
                if (typeof errback === 'function') {
                    errback(response);
                }
            } else {
                console.log('Ошибка подсчета тарифа', options.cityTo, '(' + options.serv + ') (неверный ответ от сервера)', response);
                if (typeof errback === 'function') {
                    errback(response);
                }
            }
        }, function(jqXHR, textStatus, errorThrown) {
            console.log('Ошибка подсчета тарифа', options.cityTo, '(' + options.serv + ') (неверный ответ от сервера)', textStatus);
            if (typeof errback === 'function') {
                errback(textStatus);
            }
        });
    };

    /**
     * @see http://glavpunkt.ru/apidoc/gettarif.html
     * @param {Object} params
     * @param {String} params.address
     * @param {Number} params.weight
     * @param {Number} params.price
     * @param {String} params.paymentType
     * @param {Function} callback
     * @param {Function} errback
     */
    this.getPostDeliveryCost = function(params, callback, errback) {
        var t = this;
        var defaultParams = {
            index: '',
            address: '',
            weight: window.TOTAL_WEIGHT || 0,
            price: window.TOTAL_SUM || 0,
            paymentType: 'cash'
        };
        var options = $.extend({}, defaultParams, params || {});
        this.send('api/get_pochta_tarif', options, function(response) {
            if (response.result === 'ok') {
                var cost = t.addServicesCost(response.tarifTotal, options.price);
                cost = t.round(cost);
                console.log('Тариф', options.address, '(доставка почтой):', response.tarifTotal, 'Цена:', cost);
                var callbackParams = {
                    price: cost,
                    period: response.period
                };
                typeof callback === 'function' && callback(callbackParams);
            } else if (response.result === 'error') {
                console.log('Ошибка подсчета тарифа', options.address, '(доставка почтой)', response.message);
                typeof errback === 'function' && errback(response);
            } else {
                console.log('Ошибка подсчета тарифа', options.address, '(доставка почтой) (неверный ответ от сервера)', response);
                typeof errback === 'function' && errback(response);
            }
        }, function(jqXHR, textStatus, errorThrown) {
            console.log('Ошибка подсчета тарифа', options.address, '(доставка почтой) (неверный ответ от сервера)', textStatus);
            typeof errback === 'function' && errback(textStatus);
        });
    };

    /**
     * Добавляет процент на кассовое обслуживание и еще на что-то 3 процента.
     * @param {number} cost сумма доставки
     * @param {number} price сумма заказа
     * @return {number}
     */
    this.addServicesCost = function(cost, price) {
        // var percent = 3.5; // 0.95% уже накидывается в стоимости по апи в отличии от показываемой в интерфейсе создания заказа в ГП
        var percent = 2.55;
        var servicePrice = price * percent / 100;
        return cost + servicePrice;
    };

    /**
     * Округляет стоиость до целого кратного 10.
     * @param {number} cost
     * @return {number}
     */
    this.round = function(cost) {
        return Math.round(Math.round(cost) / 10) * 10;
    };

    /**
     * Ставим нашу минимальную сумму в случае если курьерская служба говорит слишком низкую цену.
     * @param {object} options
     * @param {number} cost
     */
    this.setMinCost = function(options, cost) {
        var minPrice = 0;

        if (options.serv === this.serv.courier) {
            if (this.isSpb(options.cityTo)) {
                minPrice = 300;
            }
        } else if (options.serv === this.serv.pvz && this.isSpbOrMsc(options.cityTo) && new Date() < new Date('2019-10-25')) {
            // до конца октября акция
            minPrice = 99;
        } else {
            if (this.isMsc(options.cityTo)) {
                minPrice = 230;
            } else if (this.isSpb(options.cityTo)) {
                minPrice = 150;
            }
        }

        return cost >= minPrice ? cost : minPrice;
    };

    /**
     * Ставим нашу максимальную цену в определенных случаях
     * @param {object} options
     * @param {number} cost
     */
    this.setMaxCost = function(options, cost) {
        var spbMaxPrice = 270;
        var mskMaxPrice = 350;

        if (options.serv === this.serv.pvz) {
            // до конца октября акция
            if (this.isSpbOrMsc(options.cityTo) && new Date() < new Date('2019-10-25')) {
                spbMaxPrice = 99;
                mskMaxPrice = 99;
            }
            if (this.isMsc(options.cityTo) && cost > mskMaxPrice) {
                cost = mskMaxPrice;
            } else if (this.isSpb(options.cityTo) && cost > spbMaxPrice) {
                cost = spbMaxPrice;
            }
        }

        return cost;
    };

    /**
     * Возвращает полную информацию по доставке для указанного города.
     *
     * <pre>
     * {
     *    pvz: {
     *      code: 'msk',
     *      cost: {
     *        text: '120 - 160 руб.',
     *        raw: 0, // будет значение в том случае, если только 1 оператор
     *        Cdek: {
     *          text: '120 руб.',
     *          raw: 120,
     *        },
     *        Boxberry: {
     *          text: '160 руб.',
     *          raw: 160,
     *        },
     *        Hermes: {
     *          text: '100 руб.',
     *          raw: 100,
     *        },
     *      },
     *      period: {
     *        text: '3 - 6 дней.',
     *        Cdek: '3 - 4 дня.',
     *        Boxberry: '4 - 6 дней.',
     *        Hermes: '3 - 4 дня.',
     *      },
     *    },
     *    courier: {
     *    ...
     *    },
     *    post: {
     *    ...
     *    }
     * }
     * </pre>
     *
     *
     * @param {string} city Город
     * @param {{amount: number, weight: number}} order Информация о заказе - сумма, вес.
     * @param {function} callback Функция, в которую будет передан результат.
     */
    this.getInfoForCity = function(city, order, callback) {
        var result = {};
        var doneCount = 0;
        var onDone = function(info) {
            $.extend(result, info);

            doneCount += 1;
            if (doneCount === 3) {
                typeof callback === 'function' && callback(result);
            }
        };

        this._getPvzInfoByCity(city, order, onDone);
        this._getCourierInfoByCity(city, order, onDone);
        this._getPostInfoByCity(city, order, onDone);
    };

    /**
     * Возвращает информацию по доставке в пункты самовывоза для указанного города.
     * @param {string} city Город
     * @param {{amount: number, weight: number}} order Информация о заказе - сумма, вес.
     * @param {function} callback Функция, в которую будет передан результат.
     * @private
     */
    this._getPvzInfoByCity = function(city, order, callback) {
        var result = {
            pvz: {
                code: '',
                cost: {
                    text: '',
                    raw: 0,
                },
                period: {
                    text: '',
                },
            },
        };
        var t = this;

        t.getCityList(function (cityList) {
            var cityCode;
            for (var i in cityList) {
                if (cityList.hasOwnProperty(i) && cityList[i] === city) {
                    cityCode = i;
                    break;
                }
            }

            if (!cityCode) {
                callback({});
                return;
            }

            // нужен только выбранный город.
            result.pvz.code = cityCode;

            t.getPickupPoints(cityCode, function (pickupPointList) {
                if (city === 'Санкт-Петербург') {
                    t.getDeliveryCost({
                        punktId: pickupPointList[0].id,
                        cityTo: city,
                        weight: order.weight,
                        price: order.amount,
                    }, function (info) {
                        result.pvz.cost.text = t._getDeliveryCostString(info.price);
                        result.pvz.cost.raw = info.price;
                        result.pvz.period.text = t._getDeliveryPeriodString(info.period);
                        callback(result);
                    }, function () {
                        // если ошибка или еще что-то
                        callback({});
                    });
                } else {
                    var mapByOperator = [];
                    var mapForDelivery = [];
                    $.each(pickupPointList, function (index, pickupPoint) {
                        if (!mapByOperator[pickupPoint['operator']]) {
                            mapByOperator[pickupPoint['operator']] = pickupPoint['id'];
                            mapForDelivery.push(pickupPoint);
                        }
                    });

                    var pvzCosts = [];
                    var pvzMinPeriods = [];
                    var pvzMaxPeriods = [];
                    var doneCount = 0;
                    var onDone = function () {
                        doneCount += 1;
                        if (doneCount === mapForDelivery.length) {
                            var minCost = Math.min.apply(null, pvzCosts);
                            var maxCost = Math.max.apply(null, pvzCosts);
                            result.pvz.cost.text = t._getDeliveryCostString(minCost, maxCost);

                            var minLength = Math.min.apply(null, pvzMinPeriods);
                            var maxLength = Math.max.apply(null, pvzMaxPeriods);
                            result.pvz.period.text = t._getDeliveryPeriodString(minLength, maxLength);

                            typeof callback === 'function' && callback(result);
                        }
                    };

                    $.each(mapForDelivery, function (index, pickupPoint) {
                        t.getDeliveryCost({
                            punktId: pickupPoint['id'],
                            cityTo: cityCode,
                            weight: order.weight,
                            price: order.amount,
                        }, function (info, punktId) {
                            result.pvz.cost[pickupPoint['operator']] = {
                                text: t._getDeliveryCostString(info.price),
                                raw: info.price,
                            };
                            result.pvz.period[pickupPoint['operator']] = {
                                text: t._getDeliveryPeriodString(info.period),
                            };

                            pvzCosts.push(info.price);
                            var parsedPeriod = t._parsePeriod(info.period);
                            pvzMinPeriods.push(parsedPeriod.min);
                            pvzMaxPeriods.push(parsedPeriod.max);

                            onDone();
                        }, function () {
                            onDone();
                        });
                    });
                }
            });
        });
    };

    /**
     * Возвращает информацию по доставке курьером для указанного города.
     * @param {string} city Город
     * @param {{amount: number, weight: number}} order Информация о заказе - сумма, вес.
     * @param {function} callback Функция, в которую будет передан результат.
     * @private
     */
    this._getCourierInfoByCity = function(city, order, callback) {
        var result = {
            courier: {
                code: '',
                cost: {
                    text: '',
                    raw: 0,
                },
                period: {
                    text: '',
                },
            },
        };
        var t = this;

        this.getCourierCities(function(cityList) {
            var cityCode;
            for (var i in cityList) {
                if (cityList.hasOwnProperty(i) && cityList[i] === city) {
                    cityCode = i;
                    break;
                }
            }

            if (!cityCode) {
                callback({});
                return;
            }

            // нужен только выбранный город.
            result.courier.code = cityCode;

            t.getDeliveryCost({
                serv: t.serv.courier,
                cityTo: (t.isSpbOrMsc(city) ? city : cityCode),
                weight: order.weight,
                price: order.amount,
            }, function (info) {
                result.courier.cost.text = t._getDeliveryCostString(info.price);
                result.courier.cost.raw = info.price;
                result.courier.period.text = t._getDeliveryPeriodString(info.period);

                callback(result);
            }, function () {
                callback({});
            });
        });
    };

    /**
     * Возвращает информацию по доставке почтой РФ для указанного города.
     * @param {string} city Город
     * @param {{amount: number, weight: number}} order Информация о заказе - сумма, вес.
     * @param {function} callback Функция, в которую будет передан результат.
     * @private
     */
    this._getPostInfoByCity = function(city, order, callback) {
        var result = {
            post: {
                cost: {
                    raw: 0,
                    text: 'от 350 руб.',
                },
            },
        };
        callback(result);
    };

    /**
     * Возвращает плюральную форму слова день.
     * @param {number} dayCount
     * @return {string}
     * @private
     */
    this._pluralDayName = function(dayCount) {
        if (dayCount === 1) {
            return 'раб. день';
        } else if (dayCount > 1 && dayCount <= 4) {
            return 'раб. дня';
        } else {
            return 'раб. дней';
        }
    };

    /**
     * Парсит период доставки
     * @param {string} period
     * @return {{min: *, max: *}}
     * @private
     */
    this._parsePeriod = function(period) {
        var splited = period.toString().split('-');
        var min = splited[0];
        var max = splited[1];
        if (parseInt(min) > parseInt(max)) {
            min = splited[1];
            max = splited[0];
        }
        return { min: min, max: max };
    };

    /**
     * Возвращает строку стоимости в зависимости от количества переданных параметров.
     * @return {string}
     * @private
     */
    this._getDeliveryCostString = function() {
        var costString;
        if (arguments.length === 1) {
            costString = arguments[0];
        } else {
            var min = arguments[0];
            var max = arguments[1];
            if (min === max) {
                costString = min;
            } else {
                costString = min + ' - ' + max;
            }
        }
        return costString + ' руб.';
    };

    /**
     * Возвращает строку периода доставки в зависимости от количества переданных параметров.
     * @return {string}
     * @private
     */
    this._getDeliveryPeriodString = function() {
        var min;
        var max;
        var lengthString;
        if (arguments.length === 1) {
            if (isNaN(arguments[0])) {
                // строка
                var parsed = this._parsePeriod(arguments[0]);
                parsed.min = parseInt(parsed.min) + 1;
                parsed.max = parseInt(parsed.max) + 1;
                lengthString = parsed.min + ' - ' + parsed.max;
                max = parsed.max;
            } else {
                lengthString = arguments[0];
                lengthString = parseInt(lengthString) + 1;
                max = lengthString;
            }
        } else {
            min = arguments[0];
            max = arguments[1];
            if (parseInt(min) > parseInt(max)) {
                min = arguments[1];
                max = arguments[0];
            }
            lengthString = min + ' - ' + max;
        }
        return lengthString + ' ' + this._pluralDayName(max);
    };

    /**
     * https://glavpunkt.ru/apidoc/takepkgs.html#id2
     */
    this.createOrder = async function(orderInfoResponse) {
        var orders = [];
        var requestCounts = orderInfoResponse.orders.length;
        for (var i in orderInfoResponse.orders) {
            var orderInfo = orderInfoResponse.orders[i];

            var order = {
                sku: orderInfo.nom,
                weight: orderInfo.weight,
                buyer_fio: orderInfo.fields[4],
                buyer_phone: orderInfo.fields[1].indexOf('8') === 0 ? (7 + orderInfo.fields[1].substr(1)) : orderInfo.fields[1],
                // buyer_email: (orderInfo.fields[6] !== 'domik-mechti@yandex.ru') ? orderInfo.fields[6] : '',
                comment: orderInfo.fields[5],
                items_count: 1, // Количество мест в заказе
            };

            switch (orderInfo.delivery.id) {
                case '1':
                    // if (this.isSpbOrMsc(orderInfo.fields[8])) {
                        order.serv = this.serv.pvz;
                        order.pvz_id = orderInfo.fields[11]; // код пункта
                    // } else {
                    //     order.serv = this.serv.pvzRU;
                    //     order.delivery_rf = {
                    //         city_id: orderInfo.fields[10], // код города
                    //         pvz_id: orderInfo.fields[11], // код пункта
                    //     };
                    // }
                    break;
                case '2':
                    var comment = orderInfo.fields[5] || '';
                    var splited = comment.substr(comment.indexOf('Доставка') + 9).trim().split(' с ');
                    var splitedDate = splited[0].split('.');
                    var date = {
                        d: splitedDate[0],
                        m: splitedDate[1] || (new Date().getMonth() + 1),
                        y: splitedDate[2] || (new Date().getFullYear()),
                        toString: function() {
                            if (!this.y || !this.m || !this.d) {
                                return '';
                            }
                            return this.y + '-' + this.m + '-' + this.d;
                        },
                    };
                    var time = splited[1] || '';
                    var splitedTime = time.split(' до ');

                    order.serv = this.serv.courier;
                    order.delivery = {
                        city: orderInfo.fields[10], // код города
                        address: orderInfo.fields[8] + ', ' + orderInfo.fields[2],
                        date: date.toString(),
                        time_from: (splitedTime[0] || '10') + ':00',
                        time_to: (splitedTime[1] || '18') + ':00',
                    };
                    break;
                case '3':
                    order.serv = this.serv.pochta;
                    order.pochta = {
                        address: orderInfo.fields[2],
                    };
                    break;
                default:
                    console.error('NO CASE FOR DELIVERY');
                    continue;
            }

            orders.push(order);

            // получим части
            $.ajax({
                method: 'post',
                url: '/php/order/glavpunkt/GlavpunktOrder.php',
                data: {
                    method: 'orderUrl',
                    orderHash: orderInfo.order_hash,
                },
                success: function(requestUrl) {
                    $.ajax({
                        method: 'get',
                        url: requestUrl,
                        success: function(response) {
                            requestCounts -= 1;
                            console.log('order process 2', response);

                            if (!response.success) {
                                alert('ERROR: no success');
                                return;
                            }

                            for (var ii in orders) {
                                if (orders[ii].sku == response.success.order_nom) {
                                    // orders[ii].price = response.success.order_data.order_amount.amount_raw + response.success.order_data.order_discount.discount_raw;
                                    orders[ii].price = response.success.order_data.order_topay.topay_raw;
                                    orders[ii].insurance_val = response.success.order_data.order_amount.amount_raw + response.success.order_data.order_discount.discount_raw;

                                    orders[ii]['parts'] = [];
                                    for (var j in response.success.order_goods.goods) {
                                        orders[ii]['parts'].push({
                                            name: response.success.order_goods.goods[j].name.replace(/"/g, "'"),
                                            price: response.success.order_goods.goods[j].price.price_raw,
                                            insurance_val: response.success.order_goods.goods[j].price.price_raw,
                                            num: response.success.order_goods.goods[j].cnt,
                                        });
                                    }

                                    orders[ii]['parts'].push({
                                        name: 'Стоимость доставки',
                                        price: response.success.order_data.order_delivery.tax.tax_raw,
                                        insurance_val: 0,
                                        // num: 1
                                    });


                                    if (requestCounts == 0) {
                                        // все получили номенклатуру... отправим уже наконец в главпункт
                                        var orderData = {
                                            shipment_options: {
                                                method: 'self_delivery', // Метод отгрузки self_delivery - самопривоз, или pickup - забор.
                                                punkt_id : 'Mezhdunarodnaia-B6k1', // Пункт отгрузки заказов, если вы сами привозите их на ПВЗ
                                            },
                                            orders : orders,
                                        };

                                        console.log('order process 3', orderData);

                                        $.ajax({
                                            method: 'post',
                                            url: '/php/order/glavpunkt/GlavpunktOrder.php',
                                            data: {
                                                method: 'order',
                                                orderData: JSON.stringify(orderData),
                                            },
                                            success: function(response) {
                                                response = JSON.parse(response);
                                                if (response.result == 'error') {
                                                    alert('ERROR: ' + response.message);
                                                }
                                                if (response.result == 'ok') {
                                                    alert('OK: https://glavpunkt.ru/zayavka-zakaz.html?id=' + response.docnum);
                                                }
                                            },
                                            error: function(jqXHR, textStatus, errorThrown) {
                                                alert('ERROR: ' + errorThrown + ' ' + textStatus);
                                            },
                                        });
                                    }
                                    break;
                                }
                            }
                        }
                    });
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    alert('ERROR: ' + errorThrown + ' ' + textStatus);
                },
            });

            // что бы сервер uCoz не отрезал слишком частые запросы
            await new Promise(r => setTimeout(r, 500));
        }
    };
};
CourierGlavPunkt.prototype = new Courier();
