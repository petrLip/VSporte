// Получение геолокации
function displayLocalTime(latitude, longitude) {
    const userTimeElement = document.getElementById('user-local-time');

    fetch(`https://timeapi.io/api/Time/current/coordinate?latitude=${latitude}&longitude=${longitude}`)
        .then(response => response.json())
        .then(data => {
            userTimeElement.textContent = `Ваше местное время: ${data.time}`;
        })
        .catch(error => {
            userTimeElement.textContent = 'Не удалось получить местное время.';
            console.error(error);
        });
}

function getLocationAndTime() {
    const userTimeElement = document.getElementById('user-local-time');

    if (navigator.geolocation) {
        userTimeElement.textContent = 'Определяю местоположение...';
        navigator.geolocation.getCurrentPosition(position => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            displayLocalTime(latitude, longitude);
        }, () => {
            userTimeElement.textContent = 'Нет разрешения на определение местоположения.';
        });
    } else {
        userTimeElement.textContent = 'Геолокация не поддерживается браузером.';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('user-local-time');
    if (el) {
        try {
            var now = new Date();
            var options = {
                hour: '2-digit',
                minute: '2-digit'
            };
            var timeStr = now.toLocaleString('ru-RU', options);
            var tzOffset = -now.getTimezoneOffset() / 60;
            var sign = tzOffset >= 0 ? '+' : '-';
            var tzStr = '(GMT: ' + sign + Math.abs(tzOffset) + ')';
            el.innerHTML = '<span>' + timeStr + '</span><br><span style="color:#fe6b19; font-size:0.85em;">' + tzStr + '</span>';
        } catch (e) {
            el.textContent = 'Не удалось получить местное время.';
        }
    }
});