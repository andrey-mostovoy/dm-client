/**
 * Страница оформления заказа.
 * @constructor
 */
const CheckoutPage = function () {
    /**
     * Объект курьерской компании.
     * @type {CourierGlavPunkt}
     */
    this.Courier = null;

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
     * Заполняемые данные заказа.
     * @type {{name: string, phone: string, email: string, city: string, deliveryId: string, address: string, paymentId: string, comment: string, d_2_street: string, d_2_house: string, d_2_block: string, d_2_apartment: string, d_3_street: string, d_3_house: string, d_3_block: string, d_3_apartment: string, d_3_post: string}}
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
        d_3_street: '', // улица
        d_3_house: '', // дом
        d_3_block: '', // корпус
        d_3_apartment: '', // квартира
        d_3_post: '', // почтовый индекс
    };

    /**
     * Ид полей.
     * @type {{userName: string, phone: string, email: string, city: string, d2street: string, d2house: string, d2block: string, d2apartment: string, d3street: string, d3house: string, d3block: string, d3apartment: string, d3post: string}}
     */
    this.fieldIds = {
        userName: 'order-fld-4',
        phone: 'order-fld-1',
        email: 'order-fld-6',
        city: 'order-fld-8',
        d2street: 'js_d_2_street',
        d2house: 'js_d_2_house',
        d2block: 'js_d_2_block',
        d2apartment: 'js_d_2_apartment',
        d3street: 'js_d_3_street',
        d3house: 'js_d_3_house',
        d3block: 'js_d_3_block',
        d3apartment: 'js_d_3_apartment',
        d3post: 'js_d_3_post',
    };

    /**
     * Инициализация.
     */
    this.init = function() {
        this.Courier = new CourierGlavPunkt();

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
            t.getField(t.fieldIds.city).autocomplete({
                source: cityList,
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
     * Выставляем стоимость доставки в заказ сразу.
     * @param {number} cost
     */
    this.addCustomDeliveryTax = function(cost) {
        this.order.delivery = cost;
        // @todo не выставляем до разбора полетов.
        console.log('addCustomDeliveryTax', cost);
        return;

        // запись стоимости доставки в поле custom_delivery_tax
        $('input[name="custom_delivery_tax"]').val(cost);

        // обновим стоимость доставки в информационном поле
        if (cost === 0) {
            // скрываю стоимость доставки
            $('#deliveryAmount').hide();
            // меняю текст про стоимость заказа
            $('.order_total_pay_title').hide();
            $('.order_total_pay_title_no_delivery').show();
        } else {
            // показываю стоимость доставки
            $('#deliveryAmount').show();
            // меняю текст про стоимость заказа
            $('.order_total_pay_title').show();
            $('.order_total_pay_title_no_delivery').hide();
        }
    };

    /**
     * Возвращает результат валидации поля.
     * @param {jQuery|HTMLElement} $field jQuery объект поля.
     * @return {boolean}
     */
    this.validate = function($field) {
        switch ($field.attr('id')) {
            case this.fieldIds.userName:
                return this.validateUserName($field.val());
            case this.fieldIds.phone:
                return this.validatePhone($field.val());
            case this.fieldIds.email:
                return this.validateEmail($field.val());
            case this.fieldIds.city:
                return this.validateCity($field.val());
            case this.fieldIds.d2street:
            case this.fieldIds.d3street:
                return this.validateStreet($field.val());
            case this.fieldIds.d2house:
            case this.fieldIds.d3house:
                return this.validateHouse($field.val());
            case this.fieldIds.d2block:
            case this.fieldIds.d3block:
                return this.validateBlock($field.val());
            case this.fieldIds.d2apartment:
            case this.fieldIds.d3apartment:
                return this.validateApartment($field.val());
            case this.fieldIds.d3post:
                return this.validatePost($field.val());
            default:
                console.error('No validate method for ' . $field.attr('id'));
                // @todo мб false...
                return true;
        }
    };

    /**
     * Валидирует фио
     * @param {string} name
     * @return {boolean}
     */
    this.validateUserName = function(name) {
        return true;
    };

    /**
     * Валидирует email
     * @param {string} email
     * @return {boolean}
     */
    this.validateEmail = function(email) {
        return true;
    };

    /**
     * Валидирует телефон
     * @param {string} phone
     * @return {boolean}
     */
    this.validatePhone = function(phone) {
        return true;
    };

    /**
     * Валидирует город
     * @param {string} city
     * @return {boolean}
     */
    this.validateCity = function(city) {
        return true;
    };

    /**
     * Валидирует улицу
     * @param {string} street
     * @return {boolean}
     */
    this.validateStreet = function(street) {
        return true;
    };

    /**
     * Валидирует дом
     * @param {string} house
     * @return {boolean}
     */
    this.validateHouse = function(house) {
        return true;
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
        return true;
    };

    /**
     * Переключение панели аккордиона из свернутого в развернутое состояние и обратно.
     * @param {string} panelId
     */
    this.accordionPanelToggle = function(panelId) {
        const $element = $('#' + panelId);
        $element.toggleClass('active');
        $element.next('.panel').slideToggle(200, function() {
            if (_tmpl_isMobile) {
                $('html, body').animate({
                    scrollTop: $element.offset().top
                }, 300);
            }
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
            result = result && t.validate($(this));
        });

        if (!result) {
            return false;
        }

        // @todo надо считать стоимость доставки всех вариантов в зависимости от выбранного города
        // и скрывать те варианты которые недоступны для указанного города.
        // t.Courier.getInfoForCity
        // и по окончанию получения данных - вставить их на страницу и открыть варианты доставки

        this.accordionPanelToggle('ch_contact');
        this.accordionPanelToggle('ch_delivery');
        return false;
    };

    /**
     * Переход из выбора способа доставки к указанию адреса.
     * @return {boolean}
     */
    this.nextAddress = function() {
        // @todo в зависимости от выбранного варианта доставки действовать -
        // самовывоз - запустить процесс вставки карты с указанным городом (если уже вставлена то ненужно вставлять))
        // для этого надо получить все точки в указанном городе и отобразить...
        // ну и в целом, если выбрана доставка курьером уже даже можно поставить стоимость доставки
        // для других вариантов надо указать адрес или пункт пвз

        this.accordionPanelToggle('ch_delivery');
        this.accordionPanelToggle('ch_address');
        return false;
    };

    /**
     * Переход из указания адреса к выбору способа оплаты.
     * @return {boolean}
     */
    this.nextPayment = function() {
        var t = this;
        var result = true;

        // валидируем поля адреса
        this.getField('ch_address').next('.panel').find('input:visible').each(function() {
            t.setState($(this));
            result = result && t.validate($(this));
        });

        if (!result) {
            return false;
        }

        // @todo если не курьером доставка - выставить стоимость доставки
        // ну или в любом случае тут выставлять стоимость доставки

        this.accordionPanelToggle('ch_address');
        this.accordionPanelToggle('ch_payment');
        return false;
    };

    /**
     * Переход из выбора способа оплаты к подтверждению и оформлению.
     * @return {boolean}
     */
    this.nextTotal = function() {
        // @todo от способа оплаты зависит стоимость доставки?

        this.accordionPanelToggle('ch_payment');
        this.accordionPanelToggle('ch_total');
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


const GlavpunktMap = function() {
    /**
     * Объект карты.
     * @type {null}
     */
    this.Map = null;
};

window.Page = new CheckoutPage();

$(document).ready(function() {
    Page.init();

    // скрываю поле город
    // $('#order-fld-8').parents('div').eq(0).hide();
    // $('#order-fld-8').val('');
    // ---------


    // общая инфа по доставке
    // window.TotalDeliveryInfo = new DeliveryInfo();
    // TotalDeliveryInfo.citySelectRequired = false;
    // ---------

    // window.DeliveryHandler = new MapProcessor();
    // DeliveryHandler.setMapByDelivery($('input[name=delivery]:checked').val(), onDeliveryPointSelect, onCitySelect);
    // $('input[name=delivery]').on({
    //     click: function() {
    //         // @todo а при переключении может надо пересчитать стоимость доставки
    //         DeliveryHandler.setMapByDelivery($(this).val(), onDeliveryPointSelect, onCitySelect);
    //     }
    // });

    // Отмечаю обязательные поля
    // var requiredNames = [
    //     'order-fld-4',
    //     'order-fld-1',
    //     'order-fld-6',
    //     'order-fld-2'
    // ];
    // for (var i = 0; i < requiredNames.length; i++) {
    //     var $label = $('#' + requiredNames[i]).siblings('.label');
    //     $label.text($label.text().replace(':', '')).after('<span class="field_required">*</span>:');
    // }
    // --------

    // для подсчета стоимости доставки при вводе в поле адреса

    // callback: The callback function
    // wait: The number of milliseconds to wait after the the last key press before firing the callback
    // highlight: Highlights the element when it receives focus
    // allowSubmit: Allows a non-multiline element to be submitted (enter key) regardless of captureLength
    // captureLength: Minimum # of characters necessary to fire the callback
    var options = {
        callback: function(value) {
            console.log('Ввели адресс: ' + value);

            var checkedDeliveryId = $('input[name=delivery]:checked').val();
            if (checkedDeliveryId == DeliveryHandler.delivery.id.mail) {
                // доставка почтой
                onMailAddressSelect(value);
            }
        },
        wait: 1000,
        highlight: true,
        allowSubmit: false,
        captureLength: 20
    };

    $("#order-fld-2").typeWatch(options);
    // ---------------

    // Калькулятор
    // @todo поле, куда нужно поставить сумму доставки видно в calculator.js
    // @todo при открытии страницы смотреть на переключатели которые выбраны и считать калькулятор
    // @todo при смене пункта выдачи пересчитывать
});

/**
 * Общий колбек на выбор города доставки.
 */
const onCitySelect = function(city) {
    $('#order-fld-8').val(city);

    TotalDeliveryInfo.clear();
    TotalDeliveryInfo.city = city;
    TotalDeliveryInfo.init();
};

/**
 * Общий колбек на выбор пункта доставки (самовывоз, адрес, прочее)
 */
const onDeliveryPointSelect = function() {
    const checkedDeliveryId = parseInt($('input[name=delivery]:checked').val());
    switch (checkedDeliveryId) {
        case DeliveryHandler.delivery.id.glavpunkt:
            onPickupPointSelect(arguments[0], arguments[1]);
            break;
        case DeliveryHandler.delivery.id.courier:
            // доставка курьером
            onCourierAddressSelect(arguments[0]);
            break;
    }
};

/**
 * Подсчет стоимости доставки при выборе пункта пвз.
 * @param {string} id Ид выбранного пвз
 * @param {string} city Город
 */
var onPickupPointSelect = function(id, city) {
    if (city == 'Санкт-Петербург') {
        if (window.TOTAL_WEIGHT <= 1) {
            addCustomDeliveryTax(120);
        } else if (window.TOTAL_WEIGHT >= 7) {
            addCustomDeliveryTax(230);
        } else {
            addCustomDeliveryTax(150);
        }
    } else {
        var Courier = new CourierGlavPunkt();
        Courier.getDeliveryCost({
            cityTo: city,
            punktId: id
        }, function(info) {
            // done
            addCustomDeliveryTax(info.price);
        }, function() {
            // error
            addCustomDeliveryTax(0);
        });
    }
};

/**
 * Подсчет стоимости доставки курьером при вводе адреса доставки.
 * @param {string} city Город доставки
 */
const onCourierAddressSelect = function(city) {
    console.log('onCourierAddressSelect');
    const Courier = new CourierGlavPunkt();
    Courier.getDeliveryCost({
        serv: 'курьерская доставка',
        cityTo: city
    }, function(info) {
        // done
        addCustomDeliveryTax(info.price);
    }, function() {
        // error
        addCustomDeliveryTax(0);
    });
};

/**
 * Подсчет стоимости доставки почтой РФ при вводе адреса доставки.
 * @param {string} address Адрес доставки
 */
var onMailAddressSelect = function(address) {
    console.log('onMailAddressSelect');
    return;
    var Courier = new CourierGlavPunkt();
    Courier.getPostDeliveryCost({
        address: address
    }, function(info) {
        // done
    }, function() {
        // error
        addCustomDeliveryTax(0);
    });
};
