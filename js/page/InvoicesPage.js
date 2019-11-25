/**
 * Страница заказов для админа.
 * @constructor
 */
var InvoicesPage = function() {
    /**
     * Объект курьерской компании.
     * @type {CourierGlavPunkt}
     */
    this.Courier = null;

    /**
     * Инициализация.
     */
    this.init = function() {
        this.Courier = new CourierGlavPunkt();

        this.bindEvents();
        this.run();
    };

    /**
     * Запуск
     */
    this.run = function() {
    };

    /**
     * Биндинг событий на странице.
     */
    this.bindEvents = function() {
        var t = this;

        $('#create_glavpunkt_order').on({
            click: function(event) {
                // При выборе способа доставки
                t.onCreateGlavpunktOrder();
                return false;
            },
        });
    };

    /**
     *
     */
    this.onCreateGlavpunktOrder = function() {
        var t = this;

        // получим выделенные чекбоксы.
        var ids = $.map($('.col_checkbox input[type=checkbox]:checked'), function(item) { return $(item).attr('name'); });

        if (!ids.length) {
            return;
        }

        // сначала получим урл для запроса информации о выбранных заказах
        $.ajax({
            method: 'post',
            url: '/php/order/glavpunkt/GlavpunktOrder.php',
            data: {
                method: 'url',
                ids: ids.join(',')
            },
            success: function(requestUrl) {
                $.ajax({
                    method: 'get',
                    url: requestUrl,
                    success: function(response) {
                        console.log('order process 1', response);

                        if (!response.success) {
                            alert('ERROR: no success');
                            return;
                        }

                        if (response.success.count != ids.length) {
                            alert('ERROR: order count and selected checkbox is not equal');
                            return;
                        }

                        t.Courier.createOrder(response.success);
                    }
                });
            },
        });
    };
};

window.Page = new InvoicesPage();

$(document).ready(function() {
    Page.init();
});
