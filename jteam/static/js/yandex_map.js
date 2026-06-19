document.addEventListener('DOMContentLoaded', function () {
    var initializedMaps = {};
    var MIN_GEOCODE_LENGTH = 3;

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

    function getRoot() {
        return document.querySelector('[data-create-game]');
    }

    function getServerGeocodeUrl() {
        var root = getRoot();
        return root ? root.dataset.geocodeUrl : null;
    }

    function getServerSuggestUrl() {
        var root = getRoot();
        return root ? root.dataset.suggestUrl : null;
    }

    function isLocalhostOrigin() {
        return window.location.hostname === 'localhost' || window.location.hostname === '[::1]';
    }

    function geocodeViaServer(address, uri) {
        var geocodeUrl = getServerGeocodeUrl();
        if (!geocodeUrl) {
            return Promise.reject(new Error('server geocode url is not configured'));
        }

        var query = uri
            ? ('uri=' + encodeURIComponent(uri))
            : ('q=' + encodeURIComponent(address));

        return fetch(geocodeUrl + '?' + query, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            if (!response.ok) {
                return Promise.reject(new Error('geocode request failed'));
            }
            return response.json();
        }).then(function (data) {
            return {
                coords: [data.latitude, data.longitude],
                address: data.address || address
            };
        });
    }

    function geocodeViaClient(address, uri) {
        if (typeof ymaps === 'undefined' || !ymaps.geocode) {
            return Promise.reject(new Error('ymaps geocode unavailable'));
        }

        var queries = [];
        if (uri) {
            queries.push(uri);
        }
        if (address) {
            queries.push(address);
        }

        function tryQuery(index) {
            if (index >= queries.length) {
                return Promise.reject(new Error('address not found'));
            }

            return ymaps.geocode(queries[index], { results: 1, lang: 'ru_RU' })
                .then(function (res) {
                    var firstGeoObject = res.geoObjects.get(0);
                    if (!firstGeoObject) {
                        return tryQuery(index + 1);
                    }
                    return {
                        coords: firstGeoObject.geometry.getCoordinates(),
                        address: firstGeoObject.getAddressLine() || address || queries[index]
                    };
                })
                .catch(function () {
                    return tryQuery(index + 1);
                });
        }

        return tryQuery(0);
    }

    function resolveAddress(address, options) {
        options = options || {};

        function serverFallback() {
            return geocodeViaServer(address).catch(function () {
                if (options.uri) {
                    return geocodeViaServer(address, options.uri);
                }
                return Promise.reject(new Error('address not found'));
            });
        }

        if (options.preferServer) {
            return serverFallback().catch(function () {
                return geocodeViaClient(address, options.uri);
            });
        }

        return geocodeViaClient(address, options.uri).catch(function () {
            if (options.allowServer || options.uri) {
                return serverFallback();
            }
            return Promise.reject(new Error('address not found'));
        });
    }

    function initAddressSuggest(inputElement, onSelect) {
        var suggestUrl = getServerSuggestUrl();
        if (!suggestUrl || !inputElement) {
            return null;
        }

        var wrap = inputElement.closest('.create-event__venue-input-wrap') || inputElement.parentElement;
        if (!wrap) {
            return null;
        }

        var list = document.createElement('ul');
        list.className = 'create-event__suggest-list';
        list.hidden = true;
        wrap.appendChild(list);

        var suggestTimeout = null;
        var suggestRequestId = 0;
        var skipBlurGeocode = false;

        function hideSuggestions() {
            list.hidden = true;
            list.innerHTML = '';
        }

        function renderSuggestions(items) {
            list.innerHTML = '';
            if (!items.length) {
                hideSuggestions();
                return;
            }

            items.forEach(function (item) {
                var option = document.createElement('li');
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'create-event__suggest-item';
                button.textContent = item.label || item.value;
                button.addEventListener('mousedown', function (event) {
                    event.preventDefault();
                    skipBlurGeocode = true;
                    inputElement.value = item.value;
                    hideSuggestions();
                    onSelect(item);
                });
                option.appendChild(button);
                list.appendChild(option);
            });
            list.hidden = false;
        }

        inputElement.addEventListener('input', function () {
            clearTimeout(suggestTimeout);
            var query = inputElement.value.trim();
            if (query.length < 2) {
                hideSuggestions();
                return;
            }

            suggestTimeout = setTimeout(function () {
                var requestId = ++suggestRequestId;

                fetch(suggestUrl + '?q=' + encodeURIComponent(query), {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                })
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error('suggest request failed');
                        }
                        return response.json();
                    })
                    .then(function (data) {
                        if (requestId !== suggestRequestId) {
                            return;
                        }
                        renderSuggestions(data.suggestions || []);
                    })
                    .catch(function () {
                        if (requestId !== suggestRequestId) {
                            return;
                        }
                        hideSuggestions();
                    });
            }, 250);
        });

        inputElement.addEventListener('blur', function () {
            setTimeout(hideSuggestions, 150);
        });

        return { hideSuggestions: hideSuggestions, shouldSkipBlur: function () {
            return skipBlurGeocode;
        }, resetSkipBlur: function () {
            skipBlurGeocode = false;
        } };
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

        function warnIfNotLocalhost() {
            if (isLocalhostOrigin() || !statusText) {
                return;
            }
            statusText.textContent = 'Откройте сайт через http://localhost:8000/ — иначе Yandex Maps не работает';
            statusText.style.color = '#dc3545';
            statusText.style.fontWeight = '600';
        }

        function showGeocodeError(message) {
            if (!statusText) {
                return;
            }
            statusText.textContent = message;
            statusText.style.color = '#dc3545';
            statusText.style.fontWeight = '600';
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

        function applyGeocodeResult(coords, addressLine) {
            placemark.geometry.setCoordinates(coords);
            updateCoordinates(coords);
            syncAddressValue(addressLine);
            updateMapStatus(coords, addressLine);
            map.setCenter(coords, 15, { duration: 500 });
        }

        function runGeocode(address, options) {
            return resolveAddress(address, options)
                .then(function (result) {
                    applyGeocodeResult(result.coords, result.address);
                })
                .catch(function () {
                    showGeocodeError(
                        'Не удалось определить координаты. Кликните точку на карте. ' +
                        'Если ошибка повторяется — проверьте ключ JavaScript API в кабинете Yandex'
                    );
                });
        }

        function handleCoords(coords) {
            updateCoordinates(coords);

            if (typeof ymaps === 'undefined' || !ymaps.geocode) {
                updateMapStatus(coords);
                return;
            }

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
                .catch(function () {
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
            var geocodeTimeout = null;
            var suggestControl = null;

            activeAddressInput.addEventListener('input', function () {
                clearTimeout(geocodeTimeout);
            });

            activeAddressInput.addEventListener('blur', function () {
                if (suggestControl && suggestControl.shouldSkipBlur()) {
                    suggestControl.resetSkipBlur();
                    return;
                }
                var address = activeAddressInput.value.trim();
                if (address.length >= MIN_GEOCODE_LENGTH) {
                    runGeocode(address, { allowServer: true });
                }
            });

            suggestControl = initAddressSuggest(activeAddressInput, function (item) {
                runGeocode(item.value, { uri: item.uri, preferServer: true });
            });
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

        warnIfNotLocalhost();
        if (isLocalhostOrigin()) {
            updateMapStatus(null);
        }
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
