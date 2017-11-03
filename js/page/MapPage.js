// $(document).ready(function() {
//     DeliveryHandler.selector.addressField = '#anchor';
//     var Map = DeliveryHandler.getMapByDeliveryId(1);
//     Map.isAllPointRequired = true;
//     Map.show();
// });

var myMap;
var PostPoint;
var Courier = new CourierGlavPunkt();
var points = [];
var pointsCount = 0;

ymaps.ready(init);

function init () {
    myMap = new ymaps.Map('map', {
        center: [55.76, 37.64],
        zoom: 10
    }, {
        searchControlProvider: 'yandex#search'
    });
    var objectManager = new ymaps.ObjectManager({
        clusterize: false,
    });

    // Чтобы задать опции одиночным объектам и кластерам,
    // обратимся к дочерним коллекциям ObjectManager.
    // objectManager.objects.options.set('preset', 'islands#greenDotIcon');
    // objectManager.clusters.options.set('preset', 'islands#greenClusterIcons');
    myMap.geoObjects.add(objectManager);


    collectPoints(function() {
        var data = {
            "type": "FeatureCollection",
            "features": points
        };
        objectManager.add(data);
    });
}

function collectPoints(callback) {
    Courier.getCityList(function() {
        for (var cityCode in Courier.pickupPoints) {
            if (!Courier.pickupPoints.hasOwnProperty(cityCode)) {
                continue;
            }

            for (var index in Courier.pickupPoints[cityCode]) {
                if (!Courier.pickupPoints[cityCode].hasOwnProperty(index)) {
                    continue;
                }

                addPoint(Courier.pickupPoints[cityCode][index]);
            }
        }

        callback();
    });
}

function addPoint(Point) {
    var presetColor = 'islands#darkOrangeIcon';
    if (Point.operator === 'Cdek') {
        presetColor = 'islands#darkGreenIcon';
    } else if (Point.operator === 'Boxberry') {
        presetColor = 'islands#violetIcon';
    }
    points.push({
        id: pointsCount++,
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [Point.geo_lat, Point.geo_lng]
        },
        properties: {
            balloonContentHeader: getBalloonHeader(Point),
            balloonContentBody: getBalloonBody(Point),
            balloonContentFooter: '',
            clusterCaption: "<strong><s>Еще</s> одна</strong> метка",
            hintContent: getBalloonHeader(Point)
        },
        options: {
            preset: presetColor,
        },
    });
}

function getBalloonHeader(Point) {
    return [
        '<h3>',
        Point.city,
        ', ',
        Point.address_short ? Point.address_short : Point.address,
        '</h3>',
    ].join('');
}

function getBalloonBody(Point) {
    var body = [
        '<p>',
        '<b>Адрес</b>',
        '<br/>'
    ];

    if (Point.region) {
        body.push(Point.region);
        body.push('<br/>');
    }

    body.push(Point.address);
    body.push('<br/>');

    if (Point.metro) {
        body.push('Метро: ');
        body.push(Point.metro);
    }

    body.push('</p>');

    body.push('<p>');
    body.push('<b>Доставка</b>');
    body.push('<br/>');

    if (Point.delivery_period || Point.tarif_base || Point.tarif_more) {
        if (Point.delivery_period) {
            body.push('Доставка за ');
            body.push(Point.delivery_period);
            body.push(' день/дня/дней');
            body.push('<br/>');
        }

        if (Point.tarif_base) {
            body.push('За 1-й кг: ');
            body.push(Point.tarif_base);
            body.push('р.');
            body.push('<br/>');
        }

        if (Point.tarif_more) {
            body.push('За n-й кг: ');
            body.push(Point.tarif_more);
            body.push('р.');
            body.push('<br/>');
        }
    }

    body.push('Расчетная стоимость: ');
    body.push('<a href="#" onclick="calculateDelivery(this, \'' + encodeURI(JSON.stringify(Point)) + '\')">Посчитать</a>');
    body.push('</p>');

    body.push('<p>');
    body.push('Время работы: ');
    body.push(Point.work_time);
    body.push('<br/>');
    body.push('Телефон: ');
    body.push(Point.phone);
    body.push('</p>');

    return body.join('');
}

function calculateDelivery(target, pointRaw) {
    var Point = JSON.parse(decodeURI(pointRaw));
    var link = $(target);

    Courier.getDeliveryCost({
        weight: $(':input[name=weight]').val(),
        price: $(':input[name=price]').val(),
        cityTo: Point.city,
        punktId: Point.id
    }, function (info) {
        link.text(info.price + 'р. Период: ' + info.period + ' дней.   Пересчитать.');
    });
}

function calculateCourierDelivery(event) {
    var $result = $(event.target).siblings('.result');
    var cityTo = $(':input[name=city]').val();
    $result.text('...');

    Courier.getDeliveryCost({
        weight: $(':input[name=weight]').val(),
        price: $(':input[name=price]').val(),
        serv: 'курьерская доставка',
        cityTo: cityTo
    }, function (info) {
        $result.text(info.price + 'р. Период: ' + info.period + ' дней.');
    });

    $result.text('.......');
}

function calculatePostDelivery(event) {
    var $result = $(event.target).siblings('.result');
    var address = $(':input[name=address]').val();
    $result.text('...');

    // поставим точку на карте для наглядности
    setPostAddressToMap(address);

    Courier.getPostDeliveryCost({
        weight: $(':input[name=weight]').val(),
        price: $(':input[name=price]').val(),
        address: address
    }, function (info) {
        $result.text(info.price + 'р. Период: ' + info.period + ' дней.');
    });

    $result.text('.......');
}

function setPostAddressToMap(address) {
    // если есть точка - удалим
    if (PostPoint) {
        myMap.geoObjects.remove(PostPoint);
        PostPoint = null;
    }

    // найдем координаты
    ymaps.geocode(address, {
        results: 1,
        boundedBy: myMap.getBounds()
    }).then(
        function(success) {
            // нашли - покажем
            var results = success;
            var metaData = results.metaData.geocoder;
            var result = results.geoObjects.get(0);
            // var balloonContent = '<p><small>по запросу:</small>&nbsp;<em>' + metaData.request + '</em></p>' +
            //         '<p><small>найдено:</small>&nbsp;<strong>' + result.properties.get('text') + '</strong></p>';

            PostPoint = new ymaps.Placemark(result.geometry.getCoordinates(), {
                // balloonContentBody: balloonContent
            }, {
                preset: 'islands#redIcon'
            });

            // добавим точку
            myMap.geoObjects.add(PostPoint);

            // отцентрируем по точке
            myMap.setBounds(result.properties.get('boundedBy'), {
                checkZoomRange: true,
                duration: 200,
                callback: function() {
                    // PostPoint.balloon.open();
                }
            });
        },
        function (error) {
            alert(error);
        });
}

$(document).ready(function() {
    $('button[name=courier_delivery]').on({
        click: function (event) {
            calculateCourierDelivery(event);
        }
    });
    $('button[name=post_delivery]').on({
        click: function (event) {
            calculatePostDelivery(event);
        }
    });
});
