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

document.addEventListener('DOMContentLoaded', getLocationAndTime);