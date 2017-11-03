console.log('-2-');

// Настройки виджета:
// Если объект map_config не задан, настройки будут использованы 'по умолчанию':
/**
 * @deprecated
 * @type {{target: string, city: string, onload: map_default.onload, onselect: map_default.onselect, oncancel: map_default.oncancel, show_price: boolean, show_button: boolean, price: map_default.price}}
 */
var map_default = {
    'target': 'map_button', // id кнопки - по умолчанию map_button
    'city': '44', // id_city - по умолчанию 137 - Санкт-Петербург, можно использовать функцию
    'onload': function() { // функция вызываемая по загрузке виджета - по умолчанию ничего не вызывается
        console.log('Map on load');
        $('#lk_select_city option[value=137]').remove();
    },
    'onselect': function(info) { // функция выбора ПВЗ - по умолчанию только console.log(info);
        console.log(info);
    },
    'oncancel': function() { // функиця отмены выбора - по умолчанию только console.log(message)
        console.log('Map select cancel');
    },
    'show_price': true, // показывать поле стоимость - по умолчанию true
    'show_button': true, // показывать кнопку 'Заберу отсюда'
    'price': function(value) { // функция вызываемая при формировании строки стоимости - по умолчанию return value;
        return value;
        // return value + ' Ваши данные (например доп сбор 150р.)'
    }
};

/**
 * @deprecated
 * @param id
 * @param showButton
 */
function deliverySpb(id, showButton) {
    var params = {
        target: id,
        city: 137
    };
    if (!showButton) {
        params.show_button = false;
    }
    window.map_config = $.extend({}, map_default, params);
}

/**
 * @deprecated
 * @param id
 * @param showButton
 */
function deliveryMsc(id, showButton) {
    var params = {
        target: id,
        city: 44
    };
    if (!showButton) {
        params.show_button = false;
    }
    window.map_config = $.extend({}, map_default, params);
}

var map = new DeliveryMapGlavPunkt();
map.setDeliveryFieldSelector('#js-spb-delivery_map');
map.isButtonRequired = false;
var originalText = '';
$(body).delegate('#spbMapToggler', 'click', function() {
    if ($('#js-spb-delivery_map').is(':visible')) {
        $('#js-spb-delivery_map').hide();
        map.hide();
        $(this).text(originalText);
    } else {
        map.show();
        $('#js-spb-delivery_map').show();
        originalText = $(this).text();
        $(this).text('Скрыть карту');
        // SpbMap.container.fitToViewport();
    }
});
