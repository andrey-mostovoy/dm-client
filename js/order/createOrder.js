console.log('-3-');
// @deprecated удалить
// Самовывоз можно только выбрать на карте без указания адреса
var DELIVERY_OPTION = 1;
function orderHide() {
    var $textarea = $('#order-fld-2');
    if ($('input[name=delivery]:checked').val() == DELIVERY_OPTION) {
        $textarea.attr('disabled', 'disabled').val('');
    } else {
        $textarea.removeAttr('disabled');
    }
}

$('input[name=delivery]').click(function () {
    orderHide();
});

orderHide();
// --------

// Отмечаю обязательные поля
var requiredNames = [
    'order-fld-4',
    'order-fld-1',
    'order-fld-6',
    'order-fld-2'
];
for (var i = 0; i < requiredNames.length; i++) {
    var $label = $('#' + requiredNames[i]).siblings('.label');
    $label.text($label.text().replace(':', '')).after('<span class="field_required">*</span>:');
}
// --------
