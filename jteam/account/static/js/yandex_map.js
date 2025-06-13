document.addEventListener('DOMContentLoaded', function () {
  ymaps.ready(initMap);

  function initMap() {
    // Инициализируем карту по центру Самары
    var defaultZoom = 12;
    var map = new ymaps.Map("map", {
      center: [53.2001, 50.15], // Самара
      zoom: defaultZoom,
      controls: ['zoomControl', 'fullscreenControl']
    });

    // Создаем перетаскиваемую метку, позиция берется из центра карты
    var placemark = new ymaps.Placemark(map.getCenter(), {
      balloonContent: 'Место проведения игры'
    }, {
      draggable: true,
      preset: 'islands#greenDotIcon'
    });

    // Добавляем метку на карту
    map.geoObjects.add(placemark);

    // Элементы интерфейса
    var statusText = document.getElementById('map-status-text');
    var addressInput = document.getElementById('id_place');

    // Функция для обновления статуса карты
    function updateMapStatus(coords, address) {
      if (statusText) {
        if (coords && address) {
          statusText.textContent = 'Выбрано: ' + address;
          statusText.style.color = '#12c064';
          statusText.style.fontWeight = '500';
        } else if (coords) {
          statusText.textContent = 'Координаты: ' + coords[0].toFixed(4) + ', ' + coords[1].toFixed(4);
          statusText.style.color = '#12c064';
          statusText.style.fontWeight = '500';
        } else {
          statusText.textContent = 'Кликните на карте, чтобы выбрать место';
          statusText.style.color = '#666';
          statusText.style.fontWeight = 'normal';
        }
      }
    }

    // Функция для обновления координат в скрытых полях
    function updateCoordinates(coords) {
      var latField = document.getElementById('id_latitude');
      var lonField = document.getElementById('id_longitude');

      if (latField && lonField) {
        latField.value = coords[0].toFixed(6);
        lonField.value = coords[1].toFixed(6);
        console.log('Координаты обновлены:', coords[0].toFixed(6), coords[1].toFixed(6));
      }
    }

    // Обработчик перетаскивания метки
    placemark.events.add('dragend', function () {
      var coords = placemark.geometry.getCoordinates();
      updateCoordinates(coords);

      ymaps.geocode(coords, { results: 1, lang: 'ru_RU' })
        .then(function (res) {
          var firstGeoObject = res.geoObjects.get(0);
          if (firstGeoObject) {
            var addressLine = firstGeoObject.getAddressLine();
            if (addressInput) {
              addressInput.value = addressLine;
            }
            updateMapStatus(coords, addressLine);
          } else {
            updateMapStatus(coords);
          }
        })
        .catch(function (error) {
          console.error("Ошибка геокодирования:", error);
          updateMapStatus(coords);
        });
    });

    // Обработчик кликов по карте
    map.events.add('click', function (e) {
      var coords = e.get('coords');
      placemark.geometry.setCoordinates(coords);
      updateCoordinates(coords);

      // Получаем адрес по координатам
      ymaps.geocode(coords, { results: 1, lang: 'ru_RU' })
        .then(function (res) {
          var firstGeoObject = res.geoObjects.get(0);
          if (firstGeoObject) {
            var addressLine = firstGeoObject.getAddressLine();
            if (addressInput) {
              addressInput.value = addressLine;
            }
            updateMapStatus(coords, addressLine);
          } else {
            updateMapStatus(coords);
          }
        })
        .catch(function (error) {
          console.error("Ошибка геокодирования:", error);
          updateMapStatus(coords);
        });
    });

    // Обработчик для поля адреса
    if (addressInput) {
      let timeout = null;

      addressInput.addEventListener('input', function () {
        clearTimeout(timeout);
        timeout = setTimeout(geocodeAddress, 800);
      });

      addressInput.addEventListener('blur', geocodeAddress);
    }

    function geocodeAddress() {
      if (!addressInput) return;

      var address = addressInput.value.trim();

      if (address) {
        ymaps.geocode(address, { results: 1, lang: 'ru_RU' })
          .then(function (res) {
            var firstGeoObject = res.geoObjects.get(0);
            if (firstGeoObject) {
              var newCoords = firstGeoObject.geometry.getCoordinates();
              placemark.geometry.setCoordinates(newCoords);
              updateCoordinates(newCoords);
              updateMapStatus(newCoords, address);

              // Центрирование карты
              map.setCenter(newCoords, 15, { duration: 500 });
            } else {
              console.log("Адрес не найден:", address);
            }
          })
          .catch(function (error) {
            console.error("Ошибка геокодирования:", error);
          });
      }
    }

    // Попытка определить местоположение пользователя
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        var userCoords = [position.coords.latitude, position.coords.longitude];
        map.setCenter(userCoords, defaultZoom);
        placemark.geometry.setCoordinates(userCoords);
        updateCoordinates(userCoords);
        updateMapStatus(userCoords);
        console.log('Определено местоположение пользователя:', userCoords);
      }, function (error) {
        console.log('Не удалось определить местоположение:', error);
        // Устанавливаем начальные координаты
        var initialCoords = map.getCenter();
        updateCoordinates(initialCoords);
        updateMapStatus(initialCoords);
      });
    } else {
      // Если геолокация не поддерживается
      var initialCoords = map.getCenter();
      updateCoordinates(initialCoords);
      updateMapStatus(initialCoords);
    }

    // Проверка перед отправкой формы
    var form = document.querySelector('.game-form');
    if (form) {
      form.addEventListener('submit', function (event) {
        var latField = document.getElementById('id_latitude');
        var lonField = document.getElementById('id_longitude');

        if (!latField || !lonField || !latField.value || !lonField.value) {
          event.preventDefault();
          alert('Пожалуйста, выберите место на карте!');

          if (statusText) {
            statusText.textContent = 'Необходимо выбрать место на карте!';
            statusText.style.color = '#dc3545';
            statusText.style.fontWeight = 'bold';
          }
        }
      });
    }

    // Инициализация начального статуса
    updateMapStatus(null);

    console.log('Карта инициализирована успешно');
  }
});
