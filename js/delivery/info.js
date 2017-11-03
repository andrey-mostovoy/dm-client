/**
 * Устанавливает общие счетчики
 * @param {number} weight
 * @param {number} sum
 */
function setTotal(weight, sum) {
    window.TOTAL_WEIGHT = weight;
    window.TOTAL_SUM = sum;
}

/**
 * Объект для отображения информации по доставке.
 * Требует подключенного скрипта <script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU" type="text/javascript"></script>
 * или <script src="https://api-maps.yandex.ru/2.1/?load=package.standard&lang=ru-RU" type="text/javascript"></script>
 * Предполагается что была уже использована функция setTotal до вызова этого конструктора, а также был подключен блок
 * $GLOBAL_DELIVEINFO$ (да имя обрезано - ограничение движка на название блока)
 */
const DeliveryInfo = function() {
    /**
     * Объект содержит курьера.
     * @type {CourierGlavPunkt}
     */
    this.Courier = null;

    /**
     * Город юзера.
     * @type {string}
     */
    this.city = '';

    /**
     * Требуется выбор города из доступных.
     * @type {boolean}
     */
    this.citySelectRequired = true;

    /**
     * Флаг, показывающий что города уже заполнены.
     * @type {boolean}
     */
    this.citySelectFilled = false;

    /**
     * Флаг наличия данных.
     * @type {boolean}
     */
    this.hasData = false;

    /**
     * Количество полученных данных по вариантам доставки.
     * @type {number}
     */
    this.doneCount = 0;

    /**
     * Инициализвация.
     */
    this.init = function() {
        const t = this;

        if (!this.Courier) {
            this.Courier = new CourierGlavPunkt();
        }

        if (this.citySelectRequired) {
            $('#uCity').hide();
            $('#uCitySelect').show();
        }

        const onApiLoaded = function() {
            ymaps.ready(function() {
                t.run();
            });
        };

        if (typeof ymaps !== 'undefined') {
            onApiLoaded();
        } else {
            $(document).on('ymapsLoad', function () {
                onApiLoaded();
            });
        }
    };

    /**
     * Запускаем процесс получения информации и рендера его в блок.
     */
    this.run = function() {
        const t = this;
/*
список городов получить от объекта курьера (по пунктам и курьерской доставке сложить вместе и добавить пункт "другой")
на странице с продуктом это только
запомнить в сторедж какой выбран город тут и использовать его
 */
        this.fillAvailableCities(function() {
            t.getCity(function(city) {
                t.city = city;

                if (t.citySelectRequired) {
                    $('#uCitySelect option[value="' + t.city + '"]').prop('selected', true);
                } else {
                    $('#uCity').text(t.city);
                }

// @todo нужен кеш на товар(вес_цена)-город
                t.renderCostForPickupPoint();

                t.renderCostForCourier();

                t.renderCostForPost();
            });
        });
    };

    /**
     * Заполняет дропдаун с выбором города доставки.
     * @param {function} callback
     */
    this.fillAvailableCities = function(callback) {
        if (!this.citySelectRequired || this.citySelectFilled) {
            callback();
            return;
        }

        const t = this;

        this.Courier.getAvailableCities(function(cityList) {
            const $citySelect = $('#uCitySelect');
            var $option;
            $.each(cityList, function(index, cityName) {
                $option = $('<option></option>').attr('value', cityName).text(cityName);
                $citySelect.append($option);
            });

            $citySelect.on({
                change: $.proxy(t.onSelectCity, t),
            });

            t.citySelectFilled = true;

            callback();
        });
    };

    /**
     * Колбек выбора города.
     * @param {Event} event
     */
    this.onSelectCity = function(event) {
        this.city = $(event.target).val();
        this.clear();
        this.init();
    };

    /**
     * Определяем город. Если уже установлен - берем его.
     * @param {function} callback
     */
    this.getCity = function(callback) {
        if (this.city.length) {
            callback(this.city);
        } else {
            window.UserGeo.getCity(callback);
        }
    };

    this.onDone = function() {
        this.doneCount += 1;
        if (this.doneCount === 3 && this.hasData) {
            $('.deliveryInfo').removeClass('hidden');
        }
    };

    this.pluralDayName = function(dayCount) {
        if (dayCount === 1) {
            return 'день';
        } else if (dayCount > 1 && dayCount <= 4) {
            return 'дня';
        } else {
            return 'дней';
        }
    };

    this.parsePeriod = function(period) {
        const splited = period.split('-');
        var min = splited[0];
        var max = splited[1];
        if (min > max) {
            min = splited[1];
            max = splited[0];
        }
        return { min: min, max: max };
    };

    this.getDeliveryCostString = function() {
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

    this.getDeliveryPeriodString = function() {
        var min;
        var max;
        var lengthString;
        if (arguments.length === 1) {
            if (isNaN(arguments[0])) {
                // строка
                const parsed = this.parsePeriod(arguments[0]);
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
        return lengthString + ' ' + this.pluralDayName(max) + '.';
    };

    this.renderCostForPickupPoint = function() {
        const t = this;

        if (t.city === 'Санкт-Петербург') {
            if (window.TOTAL_WEIGHT <= 1) {
                $('#pvzCost').text(t.getDeliveryCostString(120));
            } else if (window.TOTAL_WEIGHT >= 7) {
                $('#pvzCost').text(t.getDeliveryCostString(230));
            } else {
                $('#pvzCost').text(t.getDeliveryCostString(150));
            }
            $('#pvzLength').text(t.getDeliveryPeriodString(1, 2));
            t.hasData = true;
            $('.pvzWrapper').removeClass('hidden');
            t.onDone();
        } else {
            this.Courier.getCityList(function(cityList) {
                for (var cityCode in cityList) {
                    if (cityList.hasOwnProperty(cityCode) && cityList[cityCode] === t.city) {
                        t.Courier.getPickupPoints(cityCode, function(pickupPointList) {
                            if (t.city === 'Москва') {
                                t.Courier.getDeliveryCost({
                                    punktId: pickupPointList[0].id,
                                    cityTo: t.city
                                }, function (info) {
                                    $('#pvzCost').text(t.getDeliveryCostString(info.price));
                                    $('#pvzLength').text(t.getDeliveryPeriodString(info.period));
                                    t.hasData = true;
                                    $('.pvzWrapper').removeClass('hidden');
                                    t.onDone();
                                }, function() {
                                    t.onDone();
                                });
                            } else {
                                const pointIds = [];
                                var pickupPoint;
                                const receivedInfo = [];
                                for (var ppIndex in pickupPointList) {
                                    if (!pickupPointList.hasOwnProperty(ppIndex)) {
                                        continue;
                                    }
                                    pickupPoint = pickupPointList[ppIndex];
                                    if (pointIds[pickupPoint['operator']]) {
                                        continue;
                                    }

                                    pointIds[pickupPoint['operator']] = pickupPoint['id'];

                                    t.Courier.getDeliveryCost({
                                        punktId: pickupPoint['id'],
                                        cityTo: t.city,
                                    }, function (info) {
                                        receivedInfo.push(info);
                                        if (receivedInfo.length === 2) {
                                            var minCost = receivedInfo[0].price;
                                            var maxCost = receivedInfo[1].price;
                                            if (minCost > maxCost) {
                                                minCost = receivedInfo[1].price;
                                                maxCost = receivedInfo[0].price;
                                            }

                                            const period1 = t.parsePeriod(receivedInfo[0].period);
                                            const period2 = t.parsePeriod(receivedInfo[1].period);
                                            const minLength = period1.min < period2.min ? period1.min : period2.min;
                                            const maxLength = period1.max > period2.max ? period1.max : period2.max;

                                            $('#pvzCost').text(t.getDeliveryCostString(minCost, maxCost));
                                            $('#pvzLength').text(t.getDeliveryPeriodString(minLength, maxLength));

                                            t.hasData = true;
                                            $('.pvzWrapper').removeClass('hidden');
                                            t.onDone();
                                        }
                                    }, function() {
                                        t.onDone();
                                    });

                                    if (pointIds.length === 2) {
                                        break;
                                    }
                                }
                            }
                        });
                        break;
                    }
                }
            });
        }
    };

    this.renderCostForCourier = function() {
        const t = this;

        if (this.city === 'Санкт-Петербург') {
            if (window.TOTAL_WEIGHT <= 1) {
                $('#cCost').text(t.getDeliveryCostString(250));
            } else {
                $('#cCost').text(t.getDeliveryCostString(280));
            }
            $('#cLength').text(t.getDeliveryPeriodString(1, 2));

            t.hasData = true;
            $('.cWrapper').removeClass('hidden');
            t.onDone();
        } else {
            this.Courier.getDeliveryCost({
                serv: 'курьерская доставка',
                cityTo: this.city,
            }, function (info) {
                $('#cCost').text(t.getDeliveryCostString(info.price));
                $('#cLength').text(t.getDeliveryPeriodString(info.period));

                t.hasData = true;
                $('.cWrapper').removeClass('hidden');
                t.onDone();
            }, function () {
                t.onDone();
            });
        }
    };

    this.renderCostForPost = function() {
        $('#pCost').text('уточняйте у менеджера.');
        this.hasData = true;
        $('.pWrapper').removeClass('hidden');
        this.onDone();
        return;

        // @todo - тут уже иначе надо
        const address = ymaps.geolocation.country + ', г. ' + /*ymaps.geolocation.region + ', ' +*/ this.city;
        console.log(address);
        this.Courier.getPostDeliveryCost({
            address: address
        }, function(info) {
            debugger
        });
    };

    /**
     * Очищает данные с объекта и с элемента на странице.
     * @param {boolean} [clearCityRequired]
     */
    this.clear = function(clearCityRequired) {
        console.log('clear delivery info');
        this.hasData = false;
        this.doneCount = 0;
        if (clearCityRequired) {
            this.city = '';
        }

        // $('.deliveryInfo').addClass('hidden');

        $('#pvzCost').text('');
        $('#pvzLength').text('');
        $('.pvzWrapper').addClass('hidden');

        $('#cCost').text('');
        $('#cLength').text('');
        $('.cWrapper').addClass('hidden');

        $('#pCost').text('');
        $('.pWrapper').addClass('hidden');
    };
};
