document.addEventListener('DOMContentLoaded', function () {
    var initializedMaps = {};

    document.addEventListener('create-game:init-map', function (event) {
        var mapId = event.detail && event.detail.mapId;
        var statusId = event.detail && event.detail.statusId;
        if (!mapId || initializedMaps[mapId]) {
            return;
        }
        ymaps.ready(function () {
            initMap(mapId, statusId);
            initializedMaps[mapId] = true;
        });
    });

    if (!document.querySelector('[data-create-game]')) {
        ymaps.ready(function () {
            initMap('map', 'map-status-text');
        });
    }

    function initMap(mapElementId, statusElementId) {
        var mapElement = document.getElementById(mapElementId);
        if (!mapElement) {
            return;
        }

        var defaultZoom = 12;
        var map = new ymaps.Map(mapElementId, {
            center: [53.2001, 50.15],
            zoom: defaultZoom,
            controls: ['zoomControl', 'fullscreenControl']
        });

        var placemark = new ymaps.Placemark(map.getCenter(), {
            balloonContent: 'Место проведения игры'
        }, {
            draggable: true,
            preset: 'islands#greenDotIcon'
        });

        map.geoObjects.add(placemark);

        var statusText = statusElementId ? document.getElementById(statusElementId) : null;
        var addressInput = document.getElementById('id_place');
        var venueInput = document.getElementById('create-event-venue-input');
        var activeAddressInput = mapElementId === 'create-game-map' && venueInput ? venueInput : addressInput;

        function updateMapStatus(coords, address) {
            if (!statusText) {
                return;
            }
            if (coords && address) {
                statusText.textContent = 'Выбрано: ' + address;
                statusText.style.color = '#8fa393';
                statusText.style.fontWeight = '500';
            } else if (coords) {
                statusText.textContent = 'Координаты: ' + coords[0].toFixed(4) + ', ' + coords[1].toFixed(4);
                statusText.style.color = '#8fa393';
                statusText.style.fontWeight = '500';
            } else {
                statusText.textContent = 'Кликните на карте, чтобы выбрать место';
                statusText.style.color = '#666';
                statusText.style.fontWeight = 'normal';
            }
        }

        function updateCoordinates(coords) {
            var latField = document.getElementById('id_latitude');
            var lonField = document.getElementById('id_longitude');

            if (latField && lonField) {
                latField.value = coords[0].toFixed(6);
                lonField.value = coords[1].toFixed(6);
            }
        }

        function syncAddressValue(addressLine) {
            if (addressInput) {
                addressInput.value = addressLine;
            }
            if (venueInput) {
                venueInput.value = addressLine;
            }
        }

        function handleCoords(coords) {
            updateCoordinates(coords);

            ymaps.geocode(coords, { results: 1, lang: 'ru_RU' })
                .then(function (res) {
                    var firstGeoObject = res.geoObjects.get(0);
                    if (firstGeoObject) {
                        var addressLine = firstGeoObject.getAddressLine();
                        syncAddressValue(addressLine);
                        updateMapStatus(coords, addressLine);
                    } else {
                        updateMapStatus(coords);
                    }
                })
                .catch(function (error) {
                    console.error('Ошибка геокодирования:', error);
                    updateMapStatus(coords);
                });
        }

        placemark.events.add('dragend', function () {
            handleCoords(placemark.geometry.getCoordinates());
        });

        map.events.add('click', function (e) {
            var coords = e.get('coords');
            placemark.geometry.setCoordinates(coords);
            handleCoords(coords);
        });

        if (activeAddressInput) {
            var timeout = null;

            activeAddressInput.addEventListener('input', function () {
                clearTimeout(timeout);
                timeout = setTimeout(geocodeAddress, 800);
            });

            activeAddressInput.addEventListener('blur', geocodeAddress);
        }

        function geocodeAddress() {
            if (!activeAddressInput) {
                return;
            }

            var address = activeAddressInput.value.trim();

            if (address) {
                ymaps.geocode(address, { results: 1, lang: 'ru_RU' })
                    .then(function (res) {
                        var firstGeoObject = res.geoObjects.get(0);
                        if (firstGeoObject) {
                            var newCoords = firstGeoObject.geometry.getCoordinates();
                            placemark.geometry.setCoordinates(newCoords);
                            updateCoordinates(newCoords);
                            syncAddressValue(address);
                            updateMapStatus(newCoords, address);
                            map.setCenter(newCoords, 15, { duration: 500 });
                        }
                    })
                    .catch(function (error) {
                        console.error('Ошибка геокодирования:', error);
                    });
            }
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                var userCoords = [position.coords.latitude, position.coords.longitude];
                map.setCenter(userCoords, defaultZoom);
                placemark.geometry.setCoordinates(userCoords);
                updateCoordinates(userCoords);
                updateMapStatus(userCoords);
            }, function () {
                var initialCoords = map.getCenter();
                updateCoordinates(initialCoords);
                updateMapStatus(initialCoords);
            });
        } else {
            var initialCoords = map.getCenter();
            updateCoordinates(initialCoords);
            updateMapStatus(initialCoords);
        }

        setTimeout(function () {
            map.container.fitToViewport();
        }, 200);

        updateMapStatus(null);
    }

    var form = document.querySelector('.game-form');
    if (form) {
        form.addEventListener('submit', function (event) {
            var latField = document.getElementById('id_latitude');
            var lonField = document.getElementById('id_longitude');

            if (!latField || !lonField || !latField.value || !lonField.value) {
                event.preventDefault();
                alert('Пожалуйста, выберите место на карте!');

                var statusText = document.getElementById('map-status-text')
                    || document.getElementById('map-status-text-sheet');
                if (statusText) {
                    statusText.textContent = 'Необходимо выбрать место на карте!';
                    statusText.style.color = '#dc3545';
                    statusText.style.fontWeight = 'bold';
                }
            }
        });
    }
});
