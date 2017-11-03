var myCalculator = function(day){
    // стоимость доставки
    var cost = 0;
    switch(day) {
        // каждое первое число месяца стоимость равна 100у.е.
        case 1: cost = 100; break
        // каждое двенадцатое число месяца стоимость равна 200у.е.
        case 12: cost = 200; break
        // каждое тридцать первое число месяца доставка бесплатна (таких дней всего 7 в году)
        case 31: cost = 0; break
        // по остальным дням мы не так щедры, доставка 500у.е.
        default: cost = 500;
    }
    // если поле custom_delivery_tax не существует
    if($('input[name="custom_delivery_tax"]').length == 0){
        // добавить его
        $('#checkout-form').append('<input type="hidden" name="custom_delivery_tax" value="0">');
    }
    // запись стоимости доставки в поле custom_delivery_tax
    $('input[name="custom_delivery_tax"]').val(cost);
}
