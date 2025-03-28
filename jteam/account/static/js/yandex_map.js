document.addEventListener('DOMContentLoaded', function() {
    ymaps.ready(initMap);
  
    function initMap() {
      // Инициализируем карту по центру Москвы
      var defaultZoom = 18;
      var map = new ymaps.Map("map", {
        center: [55.76, 37.64],
        zoom: defaultZoom
      });
  
      // Создаем перетаскиваемую метку, позиция берется из центра карты
      var placemark = new ymaps.Placemark(map.getCenter(), {
        balloonContent: 'Выбрана локация'
      }, {
        draggable: true
      });
  
      // Добавляем метку на карту
      map.geoObjects.add(placemark);
  
      // Обновляем скрытые поля при окончании перетаскивания маркера
      placemark.events.add('dragend', function () {
        var coords = placemark.geometry.getCoordinates();
        updateCoordinates(coords);
        console.log("Метку перемещено вручную:", coords);
        ymaps.geocode(coords, { results: 1, lang: 'ru_RU' })
          .then(function (res) {
            var firstGeoObject = res.geoObjects.get(0);
            if (firstGeoObject) {
              var addressLine = firstGeoObject.getAddressLine();
              document.getElementById('id_place').value = addressLine;
              placemark.properties.set('balloonContent', addressLine);
              // Центрируем карту с фиксированным масштабом
              map.setCenter(coords, defaultZoom, {duration: 300});
              // Явно задаем масштаб
              map.setZoom(defaultZoom, {duration: 300});
            }
          })
          .catch(function(error) {
            console.error("Ошибка обратного геокодирования:", error);
          });
      });
  
      // При загрузке карты устанавливаем скрытые поля
      updateCoordinates(map.getCenter());
  
      // Обработчик события input (с дебаунсом) для поля "place"
      var addressInput = document.getElementById('id_place');
      if (addressInput) {
        let timeout = null;
        addressInput.addEventListener('input', function() {
          clearTimeout(timeout);
          timeout = setTimeout(geocodeAddress, 500);
        });
        addressInput.addEventListener('blur', geocodeAddress);
      }
  
      function geocodeAddress() {
        var address = document.getElementById('id_place').value;
        console.log("Геокодирование адреса:", address);
        if (address) {
          ymaps.geocode(address, { results: 1, lang: 'ru_RU' })
            .then(function (res) {
              var firstGeoObject = res.geoObjects.get(0);
              if (firstGeoObject) {
                var newCoords = firstGeoObject.geometry.getCoordinates();
                console.log("Найденные координаты:", newCoords);
                placemark.geometry.setCoordinates(newCoords);
                updateCoordinates(newCoords);
                placemark.properties.set('balloonContent', firstGeoObject.getAddressLine());
      
                // Центрирование и установка масштаба
                map.setCenter(newCoords, defaultZoom, {duration: 300});
              } else {
                console.log("Адрес не найден:", address);
              }
            })
            .catch(function(error) {
              console.error("Ошибка геокодирования:", error);
            });
        }
      }
      
  
      function updateCoordinates(coords) {
        document.getElementById('id_latitude').value = coords[0];
        document.getElementById('id_longitude').value = coords[1];
      }

        // Обязательно заполним скрытые поля координат перед отправкой формы
        document.querySelector('form').addEventListener('submit', function(event) {
            var lat = document.getElementById('id_latitude').value;
            var lon = document.getElementById('id_longitude').value;

            if (!lat || !lon) {
                event.preventDefault();
                alert('Пожалуйста, выберите место на карте или укажите корректный адрес.');
            }
        });
    }
  });
  