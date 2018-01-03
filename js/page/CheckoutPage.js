/**
 * Страница оформления заказа.
 * @constructor
 */
var CheckoutPage = function() {
    /**
     * Объект курьерской компании.
     * @type {CourierGlavPunkt}
     */
    this.Courier = null;

    /**
     * Объект карты.
     * @type {GlavpunktMap}
     */
    this.Map = null;

    /**
     * Данные текущего заказа.
     * @type {{amount: number, weight: number, delivery: number}}
     */
    this.order = {
        amount: 0,
        weight: 0,
        delivery: 0,
    };

    /**
     * Данные заказа. Заполняются по ходу прохождения "визарда"
     * @type {{name: string, phone: string, email: string, city: string, deliveryId: string, address: string, paymentId: string, comment: string, d_2_street: string, d_2_house: string, d_2_block: string, d_2_apartment: string, d_3_region: string, d_3_street: string, d_3_house: string, d_3_block: string, d_3_apartment: string, d_3_post: string, deliveryCostPvz: {}, deliveryCostCourier: {}, deliveryCostPost: {}, d_1_points: Array, d_1_id: number}}
     */
    this.state = {
        name: '',
        phone: '',
        email: '',
        city: '',
        deliveryId: '',
        address: '',
        paymentId: '',
        comment: '',
        // далее поля разбитые на составляющие для удобства, но соединяемые в одно из верхних, например, адресс
        d_2_street: '', // улица
        d_2_house: '', // дом
        d_2_block: '', // корпус
        d_2_apartment: '', // квартира
        d_3_region: '', // область
        d_3_street: '', // улица
        d_3_house: '', // дом
        d_3_block: '', // корпус
        d_3_apartment: '', // квартира
        d_3_post: '', // почтовый индекс
        deliveryCostPvz: {}, // информация по стоимости доставки в пункты самовывоза
        deliveryCostCourier: {}, // информация по стоимости доставки курьером
        deliveryCostPost: {}, // информация по стоимости доставки почтой
        d_1_points: [], // пункты самовывоза в городе
        d_1_id: -1, // выбранный индекс пункта самовывоза из списка d_1_points
    };

    /**
     * Ид полей.
     * @type {{userName: string, phone: string, email: string, city: string, address: string, d2street: string, d2house: string, d2block: string, d2apartment: string, d3region: string, d3street: string, d3house: string, d3block: string, d3apartment: string, d3post: string}}
     */
    this.fieldIds = {
        userName: 'order-fld-4',
        phone: 'order-fld-1',
        email: 'order-fld-6',
        city: 'order-fld-8',
        address: 'order-fld-2',
        d2street: 'js_d_2_street',
        d2house: 'js_d_2_house',
        d2block: 'js_d_2_block',
        d2apartment: 'js_d_2_apartment',
        d3region: 'js_d_3_region',
        d3street: 'js_d_3_street',
        d3house: 'js_d_3_house',
        d3block: 'js_d_3_block',
        d3apartment: 'js_d_3_apartment',
        d3post: 'js_d_3_post',
    };

    /**
     * Кеш
     * @type {{cities: {}}}
     */
    this.cache = {
        cities: {},
    };

    /**
     * Инициализация.
     */
    this.init = function() {
        this.Courier = new CourierGlavPunkt();
        this.Map = new GlavpunktMap();

        // выставим выбранный переключатель варианта доставки
        this.state.deliveryId = $('.delivery-item:checked').val();
        // выставим выбранный переключатель варианта оплаты
        this.state.paymentId = $('.payment-item:checked').val();

        this.bindEvents();
        this.run();
    };

    /**
     * Установка данных заказа.
     * @param {number} weight
     * @param {number} amount
     */
    this.setOrderInfo = function(weight, amount) {
        this.order.weight = weight;
        this.order.amount = amount;
    };

    /**
     * Установка статуса поля.
     * @param {jQuery|HTMLElement} $field jQuery объект поля.
     */
    this.setState = function($field) {
        switch ($field.attr('id')) {
            case this.fieldIds.userName:
                this.state.name = $field.val();
                break;
            case this.fieldIds.phone:
                this.state.phone = $field.val();
                break;
            case this.fieldIds.email:
                this.state.email = $field.val();
                break;
            case this.fieldIds.city:
                this.state.city = $field.val();
                break;
            case this.fieldIds.d3region:
                this.state.d_3_region = $field.val();
                break;
            case this.fieldIds.d2street:
                this.state.d_2_street = $field.val();
                break;
            case this.fieldIds.d3street:
                this.state.d_3_street = $field.val();
                break;
            case this.fieldIds.d2house:
                this.state.d_2_house = $field.val();
                break;
            case this.fieldIds.d3house:
                this.state.d_3_house = $field.val();
                break;
            case this.fieldIds.d2block:
                this.state.d_2_block = $field.val();
                break;
            case this.fieldIds.d3block:
                this.state.d_3_block = $field.val();
                break;
            case this.fieldIds.d2apartment:
                this.state.d_2_apartment = $field.val();
                break;
            case this.fieldIds.d3apartment:
                this.state.d_3_apartment = $field.val();
                break;
            case this.fieldIds.d3post:
                this.state.d_3_post = $field.val();
                break;
            default:
                console.error('No set state for ' . $field.attr('id'));
        }
    };

    /**
     * Возвращает объект поля по его ид.
     * @param {string} id
     * @return {jQuery|HTMLElement}
     */
    this.getField = function(id) {
        return $('#' + id);
    };

    /**
     * Запуск
     */
    this.run = function() {
        var t = this;

        // автокомплит по полю город
        this.Courier.getAvailableCities(function(cityList) {
            var count = cityList.length;
            for (var i = 0; i < count; i++) {
                t.cache.cities[cityList[i].toLowerCase()] = cityList[i];
            }

            t.getField(t.fieldIds.city).autocomplete({
                source: cityList,
                autoFocus: true,
                delay: 0,
            });
        });

        // обнуляем стоимость доставки
        this.addCustomDeliveryTax(0);

        // открываем 1й пункт - контактную информацию.
        this.accordionPanelToggle('ch_contact');
    };

    /**
     * Биндинг событий на странице.
     */
    this.bindEvents = function() {
        var t = this;

        $('.delivery-item').on({
            change: function(event) {
                // При выборе способа доставки
                t.onDeliveryChange($(event.target).val());
            },
        });

        $('.payment-item').on({
            change: function(event) {
                // При выборе способа оплаты
                t.onPaymentChange($(event.target).val());
            },
        });
    };

    /**
     * Обработка выбора способа доставки.
     * @param {string} deliveryId
     */
    this.onDeliveryChange = function(deliveryId) {
        // 1 запомним текущий выбор
        this.state.deliveryId = deliveryId;

        // 2 переключим нужную форму для адреса
        $('.delivery_address').hide();
        $('#delivery-' + deliveryId).show();

        // 3 обнулим стоимость доставки
        this.addCustomDeliveryTax(0);

        // 4 скроем недоступные варианты оплаты
        // @todo
    };

    /**
     * Обработка выбора способа оплаты.
     * @param {string} paymentId
     */
    this.onPaymentChange = function(paymentId) {
        // 1 запомним текущий выбор
        this.state.paymentId = paymentId;
    };

    /**
     * Обработка выбора пункта вывоза.
     * @param {Event} event
     */
    this.onPickupPointSelect = function(event) {
        var $item = $(event.target);
        this.state.d_1_id = $item.data('id');

        var Point = this.state.d_1_points[this.state.d_1_id];
        var cost;
        if (Point.operator === 'Cdek') {
            cost = this.state.deliveryCostPvz.cost.Cdek.text;
        } else if (Point.operator === 'Boxberry') {
            cost = this.state.deliveryCostPvz.cost.Boxberry.text;
        } else {
            cost = this.state.deliveryCostPvz.cost.text;
        }

        $('#pickup_address').text(Point.address);
        $('#pickup_work_time').text(Point.work_time);
        $('#pickup_phone').text(Point.phone);
        $('#pickup_delivery_cost').text(cost);
        $('#pickedPoint').show();
    };

    /**
     * Выставляем стоимость доставки в заказ сразу.
     * @param {number} cost
     */
    this.addCustomDeliveryTax = function(cost) {
        this.order.delivery = cost;
        console.log('addCustomDeliveryTax', cost);

        // запись стоимости доставки в поле custom_delivery_tax
        $('input[name="custom_delivery_tax"]').val(cost);

        // обновим стоимость доставки в информационном поле
        if (cost === 0) {
            // скрываю стоимость доставки
            $('#deliveryAmount').hide();
            // меняю текст про стоимость заказа
            // $('.order_total_pay_title').hide();
            // $('.order_total_pay_title_no_delivery').show();
        } else {
            // ставлю сумму в интерфейсе подтверждения заказа
            var text = cost + '.00 руб.';
            if (this.order.weight > 10) {
                // если вес больше 10 то сумма доставки будет отличаться.
                text = 'Посылки общим весом более 10кг уточняется менеджером';
                $('input[name="custom_delivery_tax"]').val(0);
            }
            $('#deliveryAmount .order_tax').text(text);
            // показываю стоимость доставки
            $('#deliveryAmount').show();
            // меняю текст про стоимость заказа
            // $('.order_total_pay_title').show();
            // $('.order_total_pay_title_no_delivery').hide();
        }
    };

    /**
     * Возвращает результат валидации поля.
     * @param {jQuery|HTMLElement} $field jQuery объект поля.
     * @return {boolean}
     */
    this.validate = function($field) {
        var result;

        $field.removeClass('error');

        switch ($field.attr('id')) {
            case this.fieldIds.userName:
                result = this.validateUserName($field.val());
                break;
            case this.fieldIds.phone:
                result = this.validatePhone($field.val());
                break;
            case this.fieldIds.email:
                result = this.validateEmail($field.val());
                break;
            case this.fieldIds.city:
                result = this.validateCity($field.val());
                break;
            case this.fieldIds.d3region:
                result = this.validateRegion($field.val());
                break;
            case this.fieldIds.d2street:
            case this.fieldIds.d3street:
                result = this.validateStreet($field.val());
                break;
            case this.fieldIds.d2house:
            case this.fieldIds.d3house:
                result = this.validateHouse($field.val());
                break;
            case this.fieldIds.d2block:
            case this.fieldIds.d3block:
                result = this.validateBlock($field.val());
                break;
            case this.fieldIds.d2apartment:
            case this.fieldIds.d3apartment:
                result = this.validateApartment($field.val());
                break;
            case this.fieldIds.d3post:
                result = this.validatePost($field.val());
                break;
            default:
                console.error('No validate method for ' . $field.attr('id'));
                // @todo мб false...
                return true;
        }

        if (!result) {
            $field.addClass('error');
        }

        return result;
    };

    /**
     * Валидирует фио
     * @param {string} name
     * @return {boolean}
     */
    this.validateUserName = function(name) {
        return !!name.length;
    };

    /**
     * Валидирует email
     * @param {string} email
     * @return {boolean}
     */
    this.validateEmail = function(email) {
        var validateReg = /^.*@.*\.\w{2,}$/;
        return !!email.length && validateReg.test(email);
    };

    /**
     * Валидирует телефон
     * @param {string} phone
     * @return {boolean}
     */
    this.validatePhone = function(phone) {
        return !!phone.length;
    };

    /**
     * Валидирует город
     * @param {string} city
     * @return {boolean}
     */
    this.validateCity = function(city) {
        return !!city.length;
    };

    /**
     * Валидирует область
     * @param {string} region
     * @return {boolean}
     */
    this.validateRegion = function(region) {
        return true;
    };

    /**
     * Валидирует улицу
     * @param {string} street
     * @return {boolean}
     */
    this.validateStreet = function(street) {
        return !!street.length;
    };

    /**
     * Валидирует дом
     * @param {string} house
     * @return {boolean}
     */
    this.validateHouse = function(house) {
        return !!house.length;
    };

    /**
     * Валидирует корпус
     * @param {string} block
     * @return {boolean}
     */
    this.validateBlock = function(block) {
        return true;
    };

    /**
     * Валидирует квартиру
     * @param {string} apartment
     * @return {boolean}
     */
    this.validateApartment = function(apartment) {
        return true;
    };

    /**
     * Валидирует почтовый индекс
     * @param {string} post
     * @return {boolean}
     */
    this.validatePost = function(post) {
        return !!post.length && post.length == 6 && parseInt(post) == post;
    };

    /**
     * Выполняет требуемые действия перед переходом в блок по выбору варианта доставки.
     * @param {function} callback
     */
    this.beforeShowDeliveryBlock = function(callback) {
        var t = this;

        // нормализация города

        var lowerCaseCity = this.state.city.toLowerCase();
        if (!t.cache.cities[lowerCaseCity]) {
            // введенного города просто нет, ну ладно - значит посчитает правильно.
        } else if (t.cache.cities[lowerCaseCity] && t.cache.cities[lowerCaseCity] != this.state.city) {
            // город есть, но введен в поле не так, как понимает главпункт,
            // например "нижний новгород" вместо "Нижний Новгород"
            // в таком случае заберем правильно название
            this.state.city = t.cache.cities[lowerCaseCity];
        }

        // вывод предупреждения по предоплате.
        var currentDate = new Date();
        // месяц с 0 по 11
        // начиная с 18 декабря
        if (currentDate.getMonth() === 11 && currentDate.getDate() >= 18) {
            // для всех городов кроме спб, мск
            if (this.state.city !== 'Москва' && this.state.city !== 'Санкт-Петербург') {
                $('.new_year_restriction').show();
            }
        }

        this.Courier.getInfoForCity(this.state.city, this.order, function(deliveryInfo) {
            // прячу все варианты с доставкой и показываю те, которые есть
            $('.delivery-row').hide();
            $('.delivery-row.not-available').show();

            var prefix = t.order.weight > 10 ? 'от ' : '';

            $.each(deliveryInfo, function(delivery, info) {
                $('#delivery-block-' + delivery).show();
                $('#delivery-block-no-' + delivery).hide();

                switch (delivery) {
                    case 'pvz':
                        // скрываю цену всех операторов.
                        $('.operator-cost').hide();
                        // скрываю период доставки всех операторов.
                        $('.operator-period').hide();

                        // условие ниже - это спб или москва
                        if (info.cost.raw) {
                            info.cost.text = prefix + info.cost.text;
                            $('#raw_cost').text(info.cost.text);
                            $('#raw_period').text(info.period.text);
                            $('.operator-raw').show();
                        } else if (info.cost.Gp) {
                            info.cost.Gp.text = prefix + info.cost.Gp.text;
                            $('#raw_cost').text(info.cost.Gp.text);
                            $('#raw_period').text(info.period.Gp.text);
                            $('.operator-raw').show();
                        } else {
                            // а тут остальные города.
                            if (info.cost.Boxberry) {
                                info.cost.Boxberry.text = prefix + info.cost.Boxberry.text;
                                $('#boxberry_cost').text(info.cost.Boxberry.text);
                                $('#boxberry_period').text(info.period.Boxberry.text);
                                $('.operator-boxberry').show();
                            }
                            if (info.cost.Cdek) {
                                info.cost.Cdek.text = prefix + info.cost.Cdek.text;
                                $('#cdek_cost').text(info.cost.Cdek.text);
                                $('#cdek_period').text(info.period.Cdek.text);
                                $('.operator-cdek').show();
                            }
                        }

                        t.state.deliveryCostPvz = info;
                        break;
                    case 'courier':
                        info.cost.text = prefix + info.cost.text;
                        $('#courier_cost').text(info.cost.text);
                        $('#courier_period').text(info.period.text);
                        t.state.deliveryCostCourier = info;
                        break;
                    case 'post':
                        $('#post_cost').text(info.cost.text);
                        t.state.deliveryCostPost = info;
                        break;
                }
            });

            // когда передадим в доставку
            var nowDate = new Date();
            var shippingDateText = 'завтра';
            if (nowDate.getDay() === 6 || (nowDate.getDay() === 5 && nowDate.getHours() > 11)) {
                shippingDateText = 'понедельник';
            } else if (nowDate.getHours() <= 11 && nowDate.getDay() !== 0) {
                shippingDateText = 'сегодня';
            }
            $('.delivery-shipping-date').text(shippingDateText);

            callback();
        });
    };

    /**
     * Выполняет требуемые действия перед переходом в блок по указанию адреса доставки.
     * @param {function} callback
     */
    this.beforeShowAddressBlock = function(callback) {
        // Прячу все адреса доставки
        $('.delivery_address').hide();
        // показываю нужную
        $('#address-delivery-' + this.state.deliveryId).show();

        // если доставка не самовывозом - можно уже перейти дальше
        if (this.state.deliveryId != 1) {
            callback();
            return;
        }

        // а тут доставка самовывозом - надо показать карту с точками пвз в выбранном городе
        var t = this;
        this.Map.init(function() {
            // инит закончен по идеи карта вставлена...
            // получим нужные точки и покажем

            t.Courier.getPickupPoints(t.state.deliveryCostPvz.code, function(points) {
                t.state.d_1_points = points;
                t.Map.showPoints(points, t.state.deliveryCostPvz);
                callback();
            });
        }, $.proxy(t.onPickupPointSelect, t));
    };

    /**
     * Выполняет требуемые действия перед переходом в блок по выбору способа оплаты.
     * @param {function} callback
     */
    this.beforeShowPaymentBlock = function(callback) {
        // сформируем адрес
        switch (this.state.deliveryId) {
            case '1':
                // самовывоз
                if (this.state.d_1_id < 0) {
                    // еще не выбрали пункт
                    return;
                }
                var Point = this.state.d_1_points[this.state.d_1_id];
                this.state.address = Point.address;
                break;
            case '2':
                // курьер
                this.state.address = [
                    this.state.d_2_street + ', ',
                    'д. ' + this.state.d_2_house + ', ',
                    this.state.d_2_block ? ('к. ' + this.state.d_2_block + ', ') : '',
                    this.state.d_2_apartment ? ('кв. ' + this.state.d_2_apartment) : '',
                ].join('');
                break;
            case '3':
                // почта рф
                this.state.address = [
                    this.state.d_3_post ? (this.state.d_3_post + ', ') : '',
                    this.state.d_3_region ? (this.state.d_3_region + ', ') : '',
                    this.state.d_3_street + ', ',
                    'д. ' + this.state.d_3_house + ', ',
                    this.state.d_3_block ? ('к. ' + this.state.d_3_block + ', ') : '',
                    this.state.d_3_apartment ? ('кв. ' + this.state.d_3_apartment) : '',
                ].join('');
                break;
        }

        // поставим в поле формы адрес
        this.getField(this.fieldIds.address).val(this.state.address);
        
        // @todo посчитать стоимость доставки почтой... ? и то если выбрано почтой
        // https://otpravka.pochta.ru/specification#/nogroup-rate_calculate
        // и возмонжо можно посчитать на этапе выбора города...

        // если не почта или вес более 10 кг - сразу дальше
        if (this.state.deliveryId != '3' || this.order.weight > 10) {
            callback();
            return;
        }

        var t = this;
        // а если почта - считаем доставку
        this.Courier.getPostDeliveryCost({
            index: this.state.d_3_post,
            address: this.state.address,
            weight: this.order.weight || 0,
            price: this.order.amount || 0,
        }, function(info) {
            // посчитали
            t.state.deliveryCostPost.cost.raw = info.price;
            callback();
        }, function() {
            // ошибка - будет выставлена сумма 0
            callback();
        });
    };

    /**
     * Выполняет требуемые действия перед переходом в финальный блок оформления заказа.
     * @param {function} callback
     */
    this.beforeShowTotalBlock = function(callback) {
        // выставляю в состояние заказа и форму стоимость доставки
        switch (this.state.deliveryId) {
            case '1':
                var Point = this.state.d_1_points[this.state.d_1_id];
                if (Point.operator === 'Cdek') {
                    this.addCustomDeliveryTax(this.state.deliveryCostPvz.cost.Cdek.raw);
                } else if (Point.operator === 'Boxberry') {
                    this.addCustomDeliveryTax(this.state.deliveryCostPvz.cost.Boxberry.raw);
                } else if (Point.operator === 'Gp') {
                    this.addCustomDeliveryTax(this.state.deliveryCostPvz.cost.Gp.raw);
                } else {
                    this.addCustomDeliveryTax(this.state.deliveryCostPvz.cost.raw);
                }
                break;
            case '2':
                this.addCustomDeliveryTax(this.state.deliveryCostCourier.cost.raw);
                break;
            case '3':
                this.addCustomDeliveryTax(this.state.deliveryCostPost.cost.raw);
                break;
        }

        callback();
    };

    /**
     * Переключение панели аккордиона из свернутого в развернутое состояние и обратно.
     * @param {string} panelId
     * @param {function} callback
     */
    this.accordionPanelToggle = function(panelId, callback) {
        var $element = $('#' + panelId);
        $element.toggleClass('active');
        $element.next('.panel').slideToggle(200, function() {
            if (_tmpl_isMobile) {
                $('html, body').animate({
                    scrollTop: $element.offset().top
                }, 300);
            }

            typeof callback === 'function' && callback();
        });
    };

    /**
     * Переход из указания контактной информации к способам доставки
     * @return {boolean}
     */
    this.nextDelivery = function() {
        var t = this;
        var result = true;

        // валидируем поля контактных данных
        this.getField('ch_contact').next('.panel').find('input:visible').each(function() {
            t.setState($(this));
            result = t.validate($(this)) && result;
        });

        if (!result) {
            return false;
        }

        this.beforeShowDeliveryBlock(function() {
            t.accordionPanelToggle('ch_contact');
            t.accordionPanelToggle('ch_delivery', function() {
                if (!t.state.deliveryId) {
                    // необходимо именно затригерить событие, ибо на это завязана логика другая
                    $('.delivery-item:visible').eq(0).click();
                }
            });
        });

        return false;
    };

    /**
     * Переход из выбора способа доставки к указанию адреса.
     * @return {boolean}
     */
    this.nextAddress = function() {
        if (!this.state.deliveryId) {
            return false;
        }

        var t = this;

        this.beforeShowAddressBlock(function() {
            t.accordionPanelToggle('ch_delivery');
            t.accordionPanelToggle('ch_address');
        });
        return false;
    };

    /**
     * Переход из указания адреса к выбору способа оплаты.
     * @return {boolean}
     */
    this.nextPayment = function() {
        var t = this;

        if (this.state.deliveryId != 1) {
            var result = true;

            // валидируем поля адреса
            this.getField('ch_address').next('.panel').find('input:visible').each(function() {
                t.setState($(this));
                result = t.validate($(this)) && result;
            });

            if (!result) {
                return false;
            }
        }

        this.beforeShowPaymentBlock(function() {
            if (!t.state.address) {
                return;
            }

            t.accordionPanelToggle('ch_address');
            t.accordionPanelToggle('ch_payment');
        });
        return false;
    };

    /**
     * Переход из выбора способа оплаты к подтверждению и оформлению.
     * @return {boolean}
     */
    this.nextTotal = function() {
        if (!this.state.paymentId) {
            return false;
        }

        var t = this;

        this.beforeShowTotalBlock(function () {
            t.accordionPanelToggle('ch_payment');
            t.accordionPanelToggle('ch_total');
        });

        return false;
    };

    this.backPayment = function() {
        this.accordionPanelToggle('ch_total');
        this.accordionPanelToggle('ch_payment');
        return false;
    };

    this.backAddress = function() {
        this.accordionPanelToggle('ch_payment');
        this.accordionPanelToggle('ch_address');
        return false;
    };

    this.backDelivery = function() {
        this.accordionPanelToggle('ch_address');
        this.accordionPanelToggle('ch_delivery');
        return false;
    };

    this.backContact = function() {
        this.accordionPanelToggle('ch_delivery');
        this.accordionPanelToggle('ch_contact');
        return false;
    };
};

/**
 * Карта пунктов самовывоза главпункта.
 * @constructor
 */
var GlavpunktMap = function() {
    /**
     * Объект карты.
     * @type {ymaps.Map}
     */
    this.Map = null;

    /**
     * Колекция точек на карте.
     * @type {ymaps.GeoObjectCollection}
     */
    this.GeoCollection = null;

    /**
     * Флаг выполненной инициализации.
     * @type {boolean}
     * @private
     */
    this._inited = false;

    /**
     * Инитим карту.
     * @param {function} callback
     * @param {function} onPointSelected
     */
    this.init = function(callback, onPointSelected) {
        if (this._inited) {
            typeof callback === 'function' && callback();
            return;
        }

        var t = this;

        // навесим обработчик выбора пвз
        $(document).delegate('.js-gp-select-point', 'click', function(event) {
            t.Map.balloon.close();
            onPointSelected(event);
        });

        window.ymaps.ready(function() {
            t.Map = new window.ymaps.Map('glavPunktMap', {
                center: [59.94, 30.32], // Спб
                controls: ['zoomControl', 'searchControl'],
                // controls: ['zoomControl'],
                zoom: 10
            });

            t.GeoCollection = new window.ymaps.GeoObjectCollection();

            t._inited = true;
            typeof callback === 'function' && callback();
        });
    };

    /**
     * Показывает точки на карте.
     * @todo Добавить список пунктов отдельно от карты (рядом с ней) Пример: https://tech.yandex.ru/maps/jsbox/2.1/object_list
     * @param {Array} deliveryPoints массив объектов, описывающий точки.
     * @param {object} deliveryInfo Объект с общей информацией для точек.
     */
    this.showPoints = function(deliveryPoints, deliveryInfo) {
        var t = this;

        // удаляем все метки.
        this.GeoCollection.removeAll();

        $.each(deliveryPoints, function(index, deliveryPoint) {
            t.GeoCollection.add(t._createMapPlacemark(index, deliveryPoint, deliveryInfo));
        });

        // обычно зума 10 достаточно, если точек мало - скорее всего город маленький и зум надо побольше
        // var newZoom = deliveryInfo.code === 'spb' ? 7 : 10;
        var newZoom = 10;
        if (this.GeoCollection.getLength() === 1) {
            newZoom = 13;
        }

        // Установить границы карты по объектам
        this.Map.geoObjects.add(this.GeoCollection);
        this.Map.setBounds(this.GeoCollection.getBounds(), {
            checkZoomRange: true,
        }).then(function() {
            t.Map.setZoom(newZoom);
        });
    };

    /**
     * Создает метку, для размещения на карте.
     * @param {number} id Ид метки.
     * @param {object} Point Точка карты
     * @param {object} deliveryInfo
     * @return {window.ymaps.Placemark}
     * @private
     */
    this._createMapPlacemark = function(id, Point, deliveryInfo) {
        var params = {
            balloonContentHeader: this._getBalloonHeader(Point, id),
            balloonContentBody: this._getBalloonBody(Point, id, deliveryInfo),
            balloonContentFooter: this._getBalloonFooter(Point, id, deliveryInfo),
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

        return new window.ymaps.Placemark(
            [Point.geo_lat, Point.geo_lng],
            params,
            options
        );
    };

    /**
     * Возвращает html заголовка балуна.
     * @param {object} Point
     * @param {number} id Ид метки.
     * @return {string}
     * @private
     */
    this._getBalloonHeader = function(Point, id) {
        return [
            '<h3 class="pointInfo">',
            Point.address,
            '</h3>',
        ].join('');
    };

    /**
     * Возвращает html тела балуна.
     * @param {object} Point
     * @param {number} id Ид метки.
     * @param {object} deliveryInfo
     * @return {string}
     * @private
     */
    this._getBalloonBody = function(Point, id, deliveryInfo) {
        var body = [
            '<input type="button" value="Заберу здесь" data-id="' + id + '" class="js-gp-select-point" />',
        ];

        if (Point.operator === 'Cdek') {
            body.push('<p>Пункт выдачи <strong>CDEK</strong></p>');
        } else if (Point.operator === 'Boxberry') {
            body.push('<p>Пункт выдачи <strong>Boxberry</strong></p>');
        }

        body.push('<p>');
        body.push('<strong>Доставка ');
        if (Point.operator === 'Cdek') {
            body.push(deliveryInfo.cost.Cdek.text);
        } else if (Point.operator === 'Boxberry') {
            body.push(deliveryInfo.cost.Boxberry.text);
        } else {
            body.push(deliveryInfo.cost.text);
        }
        body.push('</strong>');
        body.push('</p>');

        body.push('<p>');
        body.push('Время работы: ');
        body.push(Point.work_time);
        body.push('<br/>');
        body.push('Телефон: ');
        body.push(Point.phone);
        body.push('</p>');

        return body.join('');
    };

    /**
     * Возвращает html футера балуна.
     * @param {object} Point
     * @param {number} id Ид метки.
     * @param {object} deliveryInfo
     * @return {string}
     * @private
     */
    this._getBalloonFooter = function(Point, id, deliveryInfo) {
        return '';
    }
};

window.Page = new CheckoutPage();

$(document).ready(function() {
    Page.init();
});
