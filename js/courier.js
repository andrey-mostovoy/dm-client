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
     * Отправляет запрос на api главпункта
     * @param {String} method путь к методу, например api/punkts
     * @param {Object} params данные для запроса.
     * @param {Function} onDone Callback при успехе. Аргументы: data
     * @param {Function} onFail Callback при сетевой ошибке. Аргументы: jqXHR, textStatus, errorThrown
     */
    this.send = function(method, params, onDone, onFail) {
        params = params || {};
        onDone = onDone || function() {};
        onFail = onFail || function() {};
        $.getJSON(this.baseUrl + method, params).done(onDone).fail(onFail);
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

        const t = this;

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
        // сначала посмотрим в кеш, и заберем из него если там есть
        var data = DataStorage.get(this.pickupPointsCacheKey);
        if (data) {
            this.pickupPoints = data.points;
            this.cityList = data.cities;

            if (typeof callback == 'function') {
                callback(this.pickupPoints[cityCode]);
            }
            return;
        }

        // если нет в кеше - получим данные
        var t = this;
        var doneRequestCount = 0;
        var onDone = function () {
            doneRequestCount++;
            // у нас пока 2 запроса
            if (doneRequestCount == 2) {
                // отсортируем
                t.cityList = t._sortCityList(t.cityList);

                // и занесем данные в кеш
                DataStorage.set(t.pickupPointsCacheKey, {
                    points: t.pickupPoints,
                    cities: t.cityList,
                }, t.cacheTtl);

                if (typeof callback == 'function') {
                    callback(t.pickupPoints[cityCode]);
                }
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
                if (response[i].city == 'Москва') {
                    cityCode = 'msc';
                } else {
                    cityCode = 'spb';
                }
                t._addCity(cityCode, response[i].city);
                t._addPickupPoint(cityCode, response[i]);
            }

            if (typeof callback == 'function') {
                callback(t.pickupPoints);
            }
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
            for (var i = 0; i < count; i++) {
                t._addCity(response[i].city_id, response[i].city);
                t._addPickupPoint(response[i].city_id, response[i]);
            }

            if (typeof callback == 'function') {
                callback(t.pickupPoints);
            }
        });
    };

    /**
     * Возвращает города с доставкой курьером.
     * @param {function} callback Колбек для вызова и передачи ему доступных городов доставки курьером.
     */
    this.getCourierCities = function(callback) {
        // сначала посмотрим в кеш, и заберем из него если там есть
        const data = DataStorage.get(this.courierCitiesCacheKey);
        if (data) {
            this.cityListForCourier = data.list;

            typeof callback === 'function' && callback(this.cityListForCourier);
            return;
        }

        const t = this;

        this.send('api/get_courier_cities', {}, function(response) {
            const count = response.length;
            for (var i = 0; i < count; i++) {
                t.cityListForCourier.push(response[i].name);
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
        const t = this;

        t.getCityList(function(pickupCityList) {
            t.getCourierCities(function(courierCityList) {
                for (var i in pickupCityList) {
                    if (!pickupCityList.hasOwnProperty(i)) {
                        continue;
                    }
                    courierCityList.push(pickupCityList[i]);
                }

                const uniqueCityList = courierCityList.filter(function(value, index, self) {
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
            serv: 'выдача по РФ',
            cityFrom: 'Санкт-Петербург',
            cityTo: '',
            punktId: '',
            weight: window.TOTAL_WEIGHT || 0,
            price: window.TOTAL_SUM || 0,
            paymentType: 'cash'
        };
        if (typeof params.serv == 'undefined' &&
            (params.cityTo == 'Санкт-Петербург' || params.cityTo == 'Москва')
        ) {
            defaultParams.serv = 'выдача';
        }
        var options = $.extend({}, defaultParams, params || {});
        this.send('api/get_tarif', options, function(response) {
            if (response.result == 'ok') {
                var tarif = response.tarif;
                var cost = tarif;
                if (options.serv != 'выдача') {
                    cost = t.addServicesCost(cost);
                }
                cost = t.round(cost);
                console.log('Тариф (' + options.serv + '):', tarif, 'Цена:', cost);
                if (typeof callback == 'function') {
                    callback({
                        price: cost,
                        period: response.period
                    }, options.punktId);
                }
            } else if (response.result == 'error') {
                console.log('Ошибка подсчета тарифа (' + options.serv + ')', response.message);
                if (typeof errback == 'function') {
                    errback(response);
                }
            } else {
                console.log('Ошибка подсчета тарифа (' + options.serv + ') (неверный ответ от сервера)', response);
                if (typeof errback == 'function') {
                    errback(response);
                }
            }
        }, function(jqXHR, textStatus, errorThrown) {
            console.log('Ошибка подсчета тарифа (' + options.serv + ') (неверный ответ от сервера)', textStatus);
            if (typeof errback == 'function') {
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
        var defaultParams = {
            address: '',
            weight: window.TOTAL_WEIGHT || 0,
            price: window.TOTAL_SUM || 0,
            paymentType: 'cash'
        };
        var options = $.extend({}, defaultParams, params || {});
        this.send('api/get_pochta_tarif', options, function(response) {
            if (response.result == 'ok') {
                console.log('Тариф (доставка почтой):', response.tarifTotal);
                if (typeof callback == 'function') {
                    callback({
                        price: response.tarifTotal,
                        period: response.period
                    });
                }
            } else if (response.result == 'error') {
                console.log('Ошибка подсчета тарифа (доставка почтой)', response.message);
                if (typeof errback == 'function') {
                    errback(response);
                }
            } else {
                console.log('Ошибка подсчета тарифа (доставка почтой) (неверный ответ от сервера)', response);
                if (typeof errback == 'function') {
                    errback(response);
                }
            }
        }, function(jqXHR, textStatus, errorThrown) {
            console.log('Ошибка подсчета тарифа (доставка почтой) (неверный ответ от сервера)', textStatus);
            if (typeof errback == 'function') {
                errback(textStatus);
            }
        });
    };

    /**
     * Добавляет процент на кассовое обслуживание и еще на что-то 3 процента.
     * @param {number} cost
     * @return {number}
     */
    this.addServicesCost = function(cost) {
        var percent = 3.5;
        var servicePrice = cost * percent / 100;
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
     * Возвращает полную информацию по доставке для указанного города.
     *
     * <pre>
     * {
     *    pvz: {
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
     *      },
     *      period: {
     *        text: '3 - 6 дней.',
     *        Cdek: '3 - 4 дня.',
     *        Boxberry: '4 - 6 дней.',
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
        this._getPostInfoByCity(city, onDone);
    };

    this._getPvzInfoByCity = function(city, order, callback) {
        var result = {
            pvz: {
                cost: {
                    text: '',
                    raw: 0,
                },
                period: {
                    text: '',
                },
            },
        };
        const t = this;

        if (city === 'Санкт-Петербург') {
            if (order.weight <= 1) {
                result.pvz.cost.text = t._getDeliveryCostString(120);
                result.pvz.cost.raw = 120;
            } else if (order.weight >= 7) {
                result.pvz.cost.text = t._getDeliveryCostString(230);
                result.pvz.cost.raw = 230;
            } else {
                result.pvz.cost.text = t._getDeliveryCostString(150);
                result.pvz.cost.raw = 150;
            }
            result.pvz.period.text = t._getDeliveryPeriodString(1, 2);
            callback(result);
        } else {
            t.getCityList(function(cityList) {
                for (var cityCode in cityList) {
                    if (cityList.hasOwnProperty(cityCode) && cityList[cityCode] === city) {
                        t.getPickupPoints(cityCode, function(pickupPointList) {
                            if (city === 'Москва') {
                                t.getDeliveryCost({
                                    punktId: pickupPointList[0].id,
                                    cityTo: city
                                }, function (info) {
                                    result.pvz.cost.text = t._getDeliveryCostString(info.price);
                                    result.pvz.cost.raw = info.price;
                                    result.pvz.period.text = t._getDeliveryPeriodString(info.period);
                                    callback(result);
                                }, function() {
                                    // если ошибка или еще что-то
                                    callback({});
                                });
                            } else {
                                const pointIds = [];
                                const operatorById = [];
                                var pickupPoint;
                                const receivedInfo = [];

                                // @todo увы нужно 2 цикла, сначала собрать точки по оператору, а затем стоимость
                                // считать. Иначе теряем доставку с 1м пунктом в городе

                                for (var ppIndex in pickupPointList) {
                                    if (!pickupPointList.hasOwnProperty(ppIndex)) {
                                        continue;
                                    }
                                    pickupPoint = pickupPointList[ppIndex];
                                    if (pointIds[pickupPoint['operator']]) {
                                        continue;
                                    }

                                    pointIds[pickupPoint['operator']] = pickupPoint['id'];
                                    operatorById[pickupPoint['id']] = pickupPoint['operator'];

                                    t.getDeliveryCost({
                                        punktId: pickupPoint['id'],
                                        cityTo: city,
                                    }, function (info, punktId) {
                                        receivedInfo.push(info);

                                        var additionalInfo = {
                                            text: t._getDeliveryCostString(info.price),
                                            raw: info.price,
                                        };
                                        result.pvz.cost[operatorById[punktId]] = additionalInfo;
                                        result.pvz.period[operatorById[punktId]] = t._getDeliveryPeriodString(info.period);

                                        // на случай, если будет всего 1 пункт
                                        result.pvz.cost.text = t._getDeliveryCostString(info.price);
                                        result.pvz.cost.raw = info.price;
                                        result.pvz.period.text = t._getDeliveryPeriodString(info.period);

                                        if (receivedInfo.length === 2) {
                                            var minCost = receivedInfo[0].price;
                                            var maxCost = receivedInfo[1].price;
                                            if (minCost > maxCost) {
                                                minCost = receivedInfo[1].price;
                                                maxCost = receivedInfo[0].price;
                                            }

                                            const period1 = t._parsePeriod(receivedInfo[0].period);
                                            const period2 = t._parsePeriod(receivedInfo[1].period);
                                            const minLength = period1.min < period2.min ? period1.min : period2.min;
                                            const maxLength = period1.max > period2.max ? period1.max : period2.max;

                                            result.pvz.cost.text = t._getDeliveryCostString(minCost, maxCost);
                                            result.pvz.period.text = t._getDeliveryPeriodString(minLength, maxLength);

                                            callback(result);
                                        }
                                    }, function() {
                                        callback({});
                                    });

                                    if (pointIds.length === 2) {
                                        break;
                                    }
                                }

                                if (pointIds.length === 0) {
                                    // нет пвз...
                                    callback({});
                                } else if (pointIds.length === 1) {
                                    // всего 1 пункт в городе
                                    callback(result);
                                }
                            }
                        });
                        break;
                    }
                }
            });
        }
    };

    this._getCourierInfoByCity = function(city, order, callback) {
        var result = {
            courier: {
                cost: {
                    text: '',
                    raw: 0,
                },
                period: {
                    text: '',
                },
            },
        };
        const t = this;

        if (city === 'Санкт-Петербург') {
            if (order.weight <= 1) {
                result.courier.cost.text = t._getDeliveryCostString(250);
                result.courier.cost.raw = 250;
            } else {
                result.courier.cost.text = t._getDeliveryCostString(280);
                result.courier.cost.raw = 280;
            }
            result.courier.period.text = t._getDeliveryPeriodString(1, 2);

            callback(result);
        } else {
            this.getDeliveryCost({
                serv: 'курьерская доставка',
                cityTo: city,
            }, function (info) {
                result.courier.cost.text = t._getDeliveryCostString(info.price);
                result.courier.cost.raw = info.price;
                result.courier.period.text = t._getDeliveryPeriodString(info.period);

                callback(result);
            }, function () {
                callback({});
            });
        }
    };

    this._getPostInfoByCity = function(city, callback) {
        var result = {
            post: {
                cost: {
                    text: 'Уточняйте у менеджера',
                },
            },
        };
        callback(result);
    };

    this._pluralDayName = function(dayCount) {
        if (dayCount === 1) {
            return 'день';
        } else if (dayCount > 1 && dayCount <= 4) {
            return 'дня';
        } else {
            return 'дней';
        }
    };

    this._parsePeriod = function(period) {
        const splited = period.split('-');
        var min = splited[0];
        var max = splited[1];
        if (min > max) {
            min = splited[1];
            max = splited[0];
        }
        return { min: min, max: max };
    };

    this._getDeliveryCostString = function() {
        var costString;
        if (arguments.length === 1) {
            costString = arguments[0];
        } else {
            const min = arguments[0];
            const max = arguments[1];
            costString = min + ' - ' + max;
        }
        return costString + ' руб.';
    };

    this._getDeliveryPeriodString = function() {
        var min;
        var max;
        var lengthString;
        if (arguments.length === 1) {
            if (isNaN(arguments[0])) {
                // строка
                const parsed = this._parsePeriod(arguments[0]);
                lengthString = parsed.min + ' - ' + parsed.max;
                max = parsed.max;
            } else {
                lengthString = arguments[0];
                max = arguments[0];
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
        return lengthString + ' ' + this._pluralDayName(max) + '.';
    };
};
CourierGlavPunkt.prototype = new Courier();
