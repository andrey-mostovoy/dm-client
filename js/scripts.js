var _tmpl_viewMode = 'grid'; // 'grid' or 'list'
var _tmpl_newDays = 1;
var _tmpl_isMobile = false;
if (navigator.userAgent.match(/Android/i) ||
    navigator.userAgent.match(/webOS/i) ||
    navigator.userAgent.match(/iPhone/i) ||
    navigator.userAgent.match(/iPad/i) ||
    navigator.userAgent.match(/iPod/i) ||
    navigator.userAgent.match(/IEMobile/i) ||
    navigator.userAgent.match(/BlackBerry/i)
) {
    _tmpl_isMobile = true;
}

/**
 * Объект для работы с локал localStorage.
 */
window.DataStorage = new (function() {
    /**
     * Устанавливаем значение в localStorage
     * @param {string} key
     * @param {*} value
     * @param {number} [expirationMin] время жизни данных в минутах - по умолчанию 1ч.
     */
    this.set = function(key, value, expirationMin) {
        return;
        var expirationMs = (expirationMin || 60) * 60 * 1000;
        var record = {value: value, exp: (new Date().getTime() + expirationMs)};
        localStorage.setItem(key, JSON.stringify(record));
    };

    /**
     * Возвращает значение из localStorage по ключу.
     * @param {string} key
     * @return {*}
     */
    this.get = function(key) {
        return null;
        var record = JSON.parse(localStorage.getItem(key));
        if (!record) {
            return null;
        }
        if (new Date().getTime() > record.exp) {
            localStorage.removeItem(key);
            return null;
        }
        return record.value;
    };
})();

/**
 * Объект для работы с геопозицией пользователя.
 */
window.UserGeo = new (function() {
    /**
     * Ключ кеша.
     * @type {string}
     */
    this.cacheKey = 'ugcn';

    /**
     * Время жизни кеша в минутах. 2 дня.
     * @type {number}
     */
    this.cacheTtl = 2880;

    /**
     * Флаг того, что идет процесс.
     * @type {boolean}
     * @private
     */
    this._isWorking = false;

    /**
     * Возвращает координаты юзера.
     * Использует геокодирование от яндекс карт, и в случае ошибки - использует HTML5 Geolocation.
     *
     * @see https://www.w3schools.com/html/html5_geolocation.asp
     *
     * @param {function} onSuccess Будет передан объект Position, из которого можно будет получить координаты.
     * @param {function} [onError]
     */
    this.getLocation = function(onSuccess, onError) {
        var onYApiLoaded = function() {
            ymaps.ready(function() {
                console.log('try ymap');
                ymaps.geolocation.get()
                    .then(function (res) {
                        console.log('try ymap - ok');
                        onSuccess({
                            lat: res.geoObjects.position[0],
                            long: res.geoObjects.position[1],
                        });
                    })
                    .catch(function() {
                        console.log('try ymap - no');
                        if (navigator.geolocation) {
                            console.log('try html');
                            navigator.geolocation.getCurrentPosition(
                                function(Position) {
                                    console.log('try html - ok');
                                    onSuccess({
                                        lat: Position.coords.latitude,
                                        long: Position.coords.longitude,
                                    });
                                },
                                function(error) {
                                    console.log('try html - no');
                                    switch(error.code) {
                                        case error.PERMISSION_DENIED:
                                            console.log('User denied the request for Geolocation.');
                                            break;
                                        case error.POSITION_UNAVAILABLE:
                                            console.log('Location information is unavailable.');
                                            break;
                                        case error.TIMEOUT:
                                            console.log('The request to get user location timed out.');
                                            break;
                                        case error.UNKNOWN_ERROR:
                                        default:
                                            console.log('An unknown error occurred.');
                                            break;
                                    }
                                    typeof onError === 'function' && onError(error);
                                }
                            );
                        } else {
                            console.log('Geolocation is not supported by this browser.');
                        }
                    });
            });
        };

        if (typeof ymaps !== 'undefined') {
            onYApiLoaded();
        } else {
            $(document).on('ymapsLoad', function () {
                onYApiLoaded();
            });
        }
    };

    /**
     * Возвращает город юзера.
     * Используется HTML5 Geolocation для получения координат и обратное геокодирование от яндекс карт для получения
     * населенного пункта по координатам.
     * Предполагается, что апи яндекс карт подключено на странице. Один из скриптов
     * <script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU" type="text/javascript"></script>
     * или
     * <script src="https://api-maps.yandex.ru/2.0/?load=package.standard&lang=ru-RU" type="text/javascript"></script>
     *
     * @see https://www.w3schools.com/html/html5_geolocation.asp
     * @see https://tech.yandex.ru/maps/jsbox/2.1/reverse_geocode
     *
     * @param {function} onSuccess Будет передана строка - название населенного пункта
     * @param {function} [onError]
     */
    this.getCity = function(onSuccess, onError) {
        var t = this;

        if (this._isWorking) {
            setTimeout(function() {
                t.getCity(onSuccess, onError);
            }, 300);
            return;
        }

        this._isWorking = true;

        var city;

        // for test
        var hash = window.location.hash;
        if (hash.indexOf('#_t=') !== -1) {
            city = decodeURI(hash.replace('#_t=', ''));
            t._isWorking = false;
            typeof onSuccess === 'function' && onSuccess(city);
            return;
        }

        city = window.DataStorage.get(this.cacheKey);
        if (city) {
            t._isWorking = false;
            typeof onSuccess === 'function' && onSuccess(city);
            return;
        }

        this.getLocation(function(Position) {
            ymaps.geocode([Position.lat, Position.long], {
                kind: 'locality',
                json: true,
                results: 1,
            }).then(function (res) {
                city = res.GeoObjectCollection.featureMember[0].GeoObject.name || '';
                if (!city) {
                    console.log('City is empty string. Something wrong.');
                    t._isWorking = false;
                    return;
                }

                window.DataStorage.set(t.cacheKey, city, t.cacheTtl);
                t._isWorking = false;
                typeof onSuccess === 'function' && onSuccess(city);
            }).catch(function() {
                t._isWorking = false;
                typeof onError === 'function' && onError();
            });
        }, function() {
            t._isWorking = false;
            typeof onError === 'function' && onError();
        });
    };
})();

$(document).ready(function() {
    // _func_loader();

    _func_goTop();
    _func_goodsViewMode();
    _func_toBasket();
    _func_goodTabs();
    _func_blogEntries();
    _func_photoEntries();
    _func_newGood();
    _func_bindLinkClick();

    if (addCookiePrivacyInfoPanel()) {
        $('#vk_community_messages').addClass('widget_with_cookie_panel');
    }

    $('#shop-basket').on({
        click: function() {
            // $(this).addClass('opened');
            location.href = '/shop/checkout';
        },
        mouseleave: function() {
            $(this).removeClass('opened');
        }
    });

    $('#nav .uMenuRoot > li.uWithSubmenu > a').append('<i class="fa fa-angle-down"></i>');
    $('#nav .uMenuRoot > li > ul li.uWithSubmenu > a').append('<i class="fa fa-angle-right"></i>');

    // $("#slider").aSlider({
    //     prevBtn: '#slider-wrap .fa-angle-left',
    //     nextBtn: '#slider-wrap .fa-angle-right',
    //     fadeSpeed: 500,
    //     autoPlay: true,
    //     autoPlayDelay: 4000
    // });

    $('<tr><td class="catsTd"><a href="/photo" class="catName">Все</a></td></tr>').prependTo('.ph_cats .catsTable');


    $(document.body).on('appear', '.count-val', function(e, $affected) {
        var c = $(this).data('count');
        if ($(this).is(':appeared') && !$(this).hasClass('starting')) {
            $(this).addClass('starting');
            $(this).countTo({
                from: 0,
                to: c
            });
        }
    });
    $('.count-val').appear && $('.count-val').appear({
        force_process: true
    });

    $('#nav .menu-icon').click(function() {
        $('#nav .uMenuV').toggle(300);
    });

    $('#top_nav .menu-icon').click(function() {
        $('#top_nav .uMenuV').toggle(300);
    });

    $('.goods-list').each(function() {
        // удаляет все пустые блоки
        $('.list-item:empty', $(this)).remove();
    });

    $(".gcarousel .goods-list").each(function() {
        var carousel = $(this),
            prev = $(this).parent().parent().find('.title1 .fa-angle-left'),
            next = $(this).parent().parent().find('.title1 .fa-angle-right');

        $(this).owlCarousel({
            items: 3,
            itemsDesktop: [1199, 3],
            itemsDesktopSmall: [1024, 3],
            itemsTablet: [750, 2],
            itemsTabletSmall: false,
            itemsMobile: [490, 1]
        });
        prev.click(function() {
            carousel.trigger('owl.prev');
        });
        next.click(function() {
            carousel.trigger('owl.next');
        });
    });

    $('.gp_tabs').aTabs && $('.gp_tabs').aTabs();

    $('#qv_close, #qv_overlay').click(function() {
        $('#qv_container').fadeOut(300);
        setTimeout(function() {
            $('#gp_link_css').remove();
        }, 300);
        $('#qv_window #qv_content').remove();
    });


    $('.b_cats .cat-blocks ul').each(function() {
        var a = $(this).find('li');
        if ( a.length > 0 ) {
            $(this).prev().addClass('arrow');
        }
    });

    $('<button id="qv_more_button" title="Перейти на страницу товара">Подробности</button>').appendTo('#qv_container');

    <!-- Yandex.Metrika counter -->
    (function (d, w, c) {
        (w[c] = w[c] || []).push(function() {
            try {
                w.yaCounter41456449 = new Ya.Metrika2({
                    id:41456449,
                    clickmap:true,
                    trackLinks:true,
                    accurateTrackBounce:true,
                    webvisor:true
                });
            } catch(e) { }
        });

        var n = d.getElementsByTagName("script")[0],
            s = d.createElement("script"),
            f = function () { n.parentNode.insertBefore(s, n); };
        s.type = "text/javascript";
        s.async = true;
        s.src = "https://mc.yandex.ru/metrika/tag.js";

        if (w.opera == "[object Opera]") {
            d.addEventListener("DOMContentLoaded", f, false);
        } else { f(); }
    })(document, window, "yandex_metrika_callbacks2");
    <!-- /Yandex.Metrika counter -->
});



function _quickView(a) {
    var link = a.getAttribute("data-link");
    location.href = link;

    // if (_tmpl_isMobile) {
    //     location.href = link;
    // } else {
    //     // $('<style id="gp_link_css">.small {display: none;}</style>').appendTo('body');
    //     $('#qv_container').fadeIn(300);
    //     $('#qv_window').load('' + link + ' #qv_content', function () {
    //         $('#qv_content .gp_images .gphoto.big', this)
    //             .removeAttr('onclick')
    //             .click(function() {
    //                 location.href = link;
    //             })
    //         ;
    //     });
    //     $('#qv_more_button').click(function(){
    //         location.href = link;
    //     });
    // }
}


function _func_loader() {
    $("#loader").fadeOut(50);
}

function _func_goTop() {
    $('<span id="go-top" class="fa fa-angle-up" title="Вверх!"></span>').appendTo('body');
    $('#go-top').css({
        'opacity': '0',
        'visibility': 'hidden'
    });
    $(window).scroll(function() {
        if ($(this).scrollTop() > 500) {
            $('#go-top').css({
                'opacity': '1',
                'visibility': 'visible'
            });
        } else {
            $('#go-top').css({
                'opacity': '0',
                'visibility': 'hidden'
            });
        }
    });
    $('#go-top').click(function() {
        $('body,html').animate({
            scrollTop: 0
        }, 800);
        return false
    });
}

function _func_goodsViewMode() {


    switch (getCookie('itemViewMode')) {
        case 'grid':
            $('.goods-view-mode-grid').addClass('goods-view-mode-active');
            $('#content #goods_cont').removeClass('list-item-view-mode-list');
            break
        case 'list':
            $('.goods-view-mode-list').addClass('goods-view-mode-active');
            $('#content #goods_cont').addClass('list-item-view-mode-list');
            break
        case undefined:
            setCookie('itemViewMode', _tmpl_viewMode);
            switch (getCookie('itemViewMode')) {
                case 'grid':
                    $('.goods-view-mode-grid').addClass('goods-view-mode-active');
                    $('#content #goods_cont').removeClass('list-item-view-mode-list');
                    break
                case 'list':
                    $('.goods-view-mode-list').addClass('goods-view-mode-active');
                    $('#content #goods_cont').addClass('list-item-view-mode-list');
                    break
                default:
                    alert('ERROR!\ninvalid _tmpl_viewMode: "' + _tmpl_viewMode + '"');
            };
            break
        default:
            alert('ERROR!\ninvalid _tmpl_viewMode: "' + _tmpl_viewMode + '"');
    };

    $('.goods-view-mode > span').click(function() {
        if ($(this).hasClass('goods-view-mode-active')) {
            return false;
        } else {
            $('.goods-view-mode > span').removeClass('goods-view-mode-active');
            $(this).addClass('goods-view-mode-active');
            if ($(this).hasClass('goods-view-mode-grid')) {
                setCookie('itemViewMode', 'grid');
                $('#content #goods_cont').removeClass('list-item-view-mode-list');
            } else if ($(this).hasClass('goods-view-mode-list')) {
                setCookie('itemViewMode', 'list');
                $('#content #goods_cont').addClass('list-item-view-mode-list');
            }
        }
    });

}

function _func_newGood() {
    if (typeof _ucoz_date != 'undefined') { c_date = new Date(_ucoz_date.replace(/(\d+).(\d+).(\d+)/, '$3/$2/$1')); }
    $('.gnew').each(function() {
        g_date = new Date($(this).data('date').replace(/(\d+).(\d+).(\d+)/, '$3/$2/$1'));
        n_date = Math.floor((c_date - g_date) / (1000 * 60 * 60 * 24));
        if (n_date <= _tmpl_newDays) {
            $(this).css('display', 'block');
        };
    });
}

function _func_toBasket() {
    $('.gp_buttons input[type="text"]').before('<span class="fa fa-minus"></span>');
    $('.gp_buttons input[type="text"]').after('<span class="fa fa-plus"></span>');

    $('.gp_buttons .fa-plus').click(function() {
        var inputVal = +$('.gp_buttons input[type="text"]').val();
        $('.gp_buttons input[type="text"]').val(inputVal + 1)
    });
    $('.gp_buttons .fa-minus').click(function() {
        var inputVal = +$('.gp_buttons input[type="text"]').val();
        if (inputVal > 1) {
            $('.gp_buttons input[type="text"]').val(inputVal - 1)
        }
    });
}

function _func_goodTabs() {
    $('#tabs').aTabs && $('#tabs').aTabs();
}

function _func_blogEntries() {
    $('.post').parent().addClass('post-wrap col2').parent().addClass('oh');
}

function _func_photoEntries() {
    $('.photo').parent().removeAttr('id').removeAttr('class').removeAttr('style').parent().removeAttr('id').removeAttr('class').removeAttr('style').addClass('photo-wrap col4').parent().removeAttr('id').removeAttr('class').removeAttr('style').addClass('photo-list');
}

function setCookie(name, value, options) {
    options = options || {};
    var expires = options.expires;
    if (typeof expires == "number" && expires) {
        var d = new Date();
        d.setTime(d.getTime() + expires * 1000);
        expires = options.expires = d;
    }
    if (expires && expires.toUTCString) {
        options.expires = expires.toUTCString();
    }
    value = encodeURIComponent(value);
    var updatedCookie = name + "=" + value;
    for (var propName in options) {
        updatedCookie += "; " + propName;
        var propValue = options[propName];
        if (propValue !== true) {
            updatedCookie += "=" + propValue;
        }
    }
    document.cookie = updatedCookie;
}

function getCookie(name) {
    var matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

function deleteCookie(name) {
    setCookie(name, "", {
        expires: -1
    });
}

function addCookiePrivacyInfoPanel() {
    var key = 'cppanel_ok';
    if (DataStorage.get(key)) {
        return false;
    }
    var text = [
        'Сайт использует cookie, данные об IP-адресе и местоположении. ',
        'Если вы не хотите предоставлять эти данные, покиньте сайт.'
    ].join('');
    var $div = $('<div>').addClass('cookie_privacy_panel');
    var $p = $('<p>').text(text);
    var $a = $('<a>').text('Согласен');
    $a.on({
        click: function() {
            DataStorage.set(key, 1, 60 * 24 * 365 * 10); // 10 лет, wow...
            $div.remove();
        }
    });
    $div.append($p);
    $div.append($a);
    $('body').append($div);
    return true;
}

function _func_bindLinkClick() {
    $('body').delegate('.window-policy', 'click', function(event) {
        openPolicy(event);
    });
    $('body').delegate('.window-agreement', 'click', function(event) {
        openAgreement(event);
    });
    $('body').delegate('.window-pd', 'click', function(event) {
        openObrabotkaPD(event);
    });
    $('body').delegate('.window-offer', 'click', function(event) {
        openContractOffer(event);
    });
}

/**
 * Открытие окна с политикой конфиденциальности.
 * @param event
 * @return {boolean}
 */
function openPolicy(event) {
    window.open('/index?policy=1','police','scrollbars=1,top=1,left=1,width=650,height=450');
    return false;
}

/**
 * Открытие окна с информацией об обработке персональных данных.
 * @param event
 * @return {boolean}
 */
function openObrabotkaPD(event) {
    window.open('/docs/obrabotkapersonalnihdannih.pdf','personalData','scrollbars=1,top=1,left=1,width=650,height=450');
    return false;
}

/**
 * Открытие окна с пользовательским соглашением.
 * @param event
 * @return {boolean}
 */
function openAgreement(event) {
    window.open('/index?agreement=1','agreement','scrollbars=1,top=1,left=1,width=650,height=450');
    return false;
}

/**
 * Открытие окна с договором оферты.
 * @param event
 * @return {boolean}
 */
function openContractOffer(event) {
    window.open('/docs/contractOffer.pdf','offer','scrollbars=1,top=1,left=1,width=650,height=450');
    return false;
}
