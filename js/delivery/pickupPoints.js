console.log('-1-');
// // @deprecated
// Настройки виджета:
// Если объект map_config не задан, настройки будут использованы 'по умолчанию':
var map_default = {
    'target': 'map_button', // id кнопки - по умолчанию map_button
    'city': '44', // id_city - по умолчанию 137 - Санкт-Петербург, можно использовать функцию
    'onload': function() { // функция вызываемая по загрузке виджета - по умолчанию ничего не вызывается
        console.log('Map on load');
    },
    'onselect': function(info) { // функция выбора ПВЗ - по умолчанию только console.log(info);
        console.log(info);
        var $deliveryAddress = $('#order-fld-2');

        var deliveryPointText = [info.city_name, info.point.address].join(', ');
         // 'Выбрана точка:'
         //    +'\ninfo.city_id: '+info.city_id
         //    +'\ninfo.id_obl: '+info.id_obl
         //    +'\ninfo.city_name: '+info.city_name
         //    +'\ninfo.point.id: '+info.point.id
         //    +'\ninfo.point.address: '+info.point.address
         //    +'\ninfo.point.name: '+info.point.name
         //    +'\ninfo.point.phone: '+info.point.phone
         //    +'\ninfo.point.time: '+info.point.time
         //    +'\ninfo.point.work: '+info.point.work
         //    +'\ninfo.point.weight: '+info.point.weight;

        $deliveryAddress.val(deliveryPointText);

        if ($deliveryAddress.is(':disabled')) {
            $deliveryAddress.removeAttr('disabled');
        }
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
