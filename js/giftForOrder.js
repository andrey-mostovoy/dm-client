function processGiftForOrder() {
    $.ajax('/php/giftsFromSpecialCategory/giftForOrder.php', {
        success: function (response) {
            if (response.giftEnabled) {
                $('.special-gifts').show();
            } else {
                $('.special-gifts').remove();
                if (response.isDeleted) {
                    location.reload();
                }
            }
            if (response.giftId) {
                var orderItem = $('#order-item-' + response.giftId);
                disableGiftOrderItem(orderItem);
            }
        }
    });
}

function disableGiftOrderItem($orderItem) {
    $('.order-item-name a', $orderItem).attr('href', 'javascript: void(0)').css('cursor', 'default');
    var countInput = $('.order-item-cnt input', $orderItem);
    var newCountInput = countInput.clone();
    newCountInput.attr('type', 'hidden');
    countInput.attr('name', 'cnt-gift');
    countInput.after(newCountInput);
    countInput.attr('disabled', 'disabled');
}

if (!add2Basket) {
    function add2Basket(id, pref) {
        _uPostForm('', {
            type: 'POST',
            url: '/shop/basket',
            data: {
                'mode': 'add',
                'id': id,
                'pref': pref,
                'opt': '',
                'cnt': $('#q' + pref + '-' + id + '-basket').attr('value')
            },
            'success': function () {
                location.reload();
            }
        });
        ga_event('basket_add');
    }
}

function processGiftForOrderByJs() {
    var $giftItem;
    var $orderItems = $('#order-form .order-item-price');
    $.each($orderItems, function(index, itemPriceTag) {
        if (parseFloat($(itemPriceTag).text().replace(' руб.', '')) == 0) {
            $giftItem = $(itemPriceTag).parent('.order-item').eq(0);
        }
    });

    if ($giftItem) {
        disableGiftOrderItem($giftItem);
    }

    var totalAmount = parseFloat($('#order-form .order-total').text().replace(' руб.', '').replace('Итого:', ''));
    if (totalAmount > 2000) {
        if ($giftItem) {
            $('.special-gifts').remove();
        } else {
            $('.special-gifts').show();
        }
    } else if ($giftItem) {
        $('.order-item-del input', $giftItem).attr('checked', 'checked');
        $('#order-but-recalc').click();
    }
}

processGiftForOrderByJs();
