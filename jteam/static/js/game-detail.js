(function () {
    function getCsrfToken() {
        if (typeof Cookies !== 'undefined') {
            return Cookies.get('csrftoken');
        }
        return '';
    }

    function initMenu() {
        const menuBtn = document.getElementById('game-view-menu-btn');
        const dropdown = document.getElementById('game-view-menu-dropdown');
        if (!menuBtn || !dropdown) {
            return;
        }

        menuBtn.addEventListener('click', function (event) {
            event.stopPropagation();
            dropdown.classList.toggle('is-open');
        });

        document.addEventListener('click', function () {
            dropdown.classList.remove('is-open');
        });
    }

    function initPlayersPanel() {
        const playersBtn = document.getElementById('game-action-players');
        const panel = document.getElementById('players-panel');
        if (!playersBtn || !panel) {
            return;
        }

        playersBtn.addEventListener('click', function () {
            panel.hidden = !panel.hidden;
        });
    }

    function initManageAction() {
        const manageBtn = document.getElementById('game-action-manage');
        const menuBtn = document.getElementById('game-view-menu-btn');
        if (!manageBtn || !menuBtn) {
            return;
        }

        manageBtn.addEventListener('click', function () {
            menuBtn.click();
        });
    }

    function initMap() {
        if (typeof ymaps === 'undefined' || !window.gameDetailMapConfig) {
            return;
        }

        const config = window.gameDetailMapConfig;
        ymaps.ready(function () {
            const map = new ymaps.Map('map', {
                center: [config.lat, config.lng],
                zoom: 17,
                controls: ['zoomControl'],
            });

            map.geoObjects.add(new ymaps.Placemark([config.lat, config.lng], {
                balloonContent: config.place,
            }, {
                preset: 'islands#greenDotIcon',
            }));
        });
    }

    function renderParticipantPreview(players, currentUsername, organizerUsername) {
        const preview = document.getElementById('participants-preview');
        if (!preview) {
            return;
        }

        if (!players.length && organizerUsername !== currentUsername) {
            preview.innerHTML = '<p class="game-view-empty">Пока нет участников. Будьте первым!</p>';
            return;
        }

        const rows = [];
        const seen = new Set();

        if (organizerUsername) {
            const organizer = players.find(function (player) {
                return player.username === organizerUsername;
            });
            const isCurrentOrganizer = organizerUsername === currentUsername;
            rows.push(buildParticipantRow(
                organizer || { username: organizerUsername, photo: null },
                isCurrentOrganizer,
                true
            ));
            seen.add(organizerUsername);
        }

        players.forEach(function (player) {
            if (seen.has(player.username)) {
                return;
            }
            rows.push(buildParticipantRow(
                player,
                player.username === currentUsername,
                false
            ));
        });

        preview.innerHTML = rows.join('');
    }

    function buildParticipantRow(player, isCurrentUser, isOrganizer) {
        const avatar = player.photo
            ? '<img src="' + player.photo + '" alt="" class="game-view-participant-avatar">'
            : '<span class="game-view-participant-avatar placeholder">' + player.username.charAt(0).toUpperCase() + '</span>';

        const name = isCurrentUser
            ? '<span class="game-view-participant-name">Вы</span>'
            : '<a href="#" class="game-view-participant-name">' + player.username + '</a>';

        const badge = isOrganizer ? '<span class="game-view-badge">Организатор</span>' : '';

        return (
            '<div class="game-view-participant">' +
                avatar +
                '<div>' + name + badge + '</div>' +
            '</div>'
        );
    }

    function renderPlayersList(players) {
        const list = document.getElementById('players-list');
        if (!list) {
            return;
        }

        if (!players.length) {
            list.innerHTML = '<p class="game-view-empty">Пока нет игроков.</p>';
            return;
        }

        list.innerHTML = '<div class="game-view-players-grid"></div>';
        const grid = list.querySelector('.game-view-players-grid');

        players.forEach(function (player) {
            const avatar = player.photo
                ? '<img src="' + player.photo + '" alt="" class="game-view-participant-avatar">'
                : '<span class="game-view-participant-avatar placeholder">' + player.username.charAt(0).toUpperCase() + '</span>';

            grid.insertAdjacentHTML('beforeend',
                '<div class="game-view-player-card">' +
                    avatar +
                    '<a href="#">' + player.username + '</a>' +
                '</div>'
            );
        });
    }

    function updateJoinButton(btn, action) {
        if (!btn) {
            return;
        }

        btn.dataset.action = action;
        if (action === 'leave') {
            btn.classList.add('danger');
            btn.innerHTML =
                '<span class="game-view-action-icon"><i class="fas fa-times"></i></span>Выйти';
        } else {
            btn.classList.remove('danger');
            btn.innerHTML =
                '<span class="game-view-action-icon"><i class="fas fa-plus"></i></span>Войти';
        }
    }

    function initJoinLeave() {
        const root = document.querySelector('.game-view');
        const joinBtn = document.getElementById('join-btn');
        if (!root || !joinBtn) {
            return;
        }

        const joinUrl = root.dataset.joinUrl;
        const organizerUsername = root.dataset.organizerUsername || '';
        const currentUsername = root.dataset.currentUsername || '';

        document.addEventListener('click', async function (event) {
            const btn = event.target.closest('#join-btn');
            if (!btn) {
                return;
            }

            event.preventDefault();
            const action = btn.dataset.action;
            const body = new FormData();
            body.append('id', btn.dataset.id);
            body.append('action', action);

            const response = await fetch(joinUrl, {
                method: 'POST',
                mode: 'same-origin',
                headers: { 'X-CSRFToken': getCsrfToken() },
                body: body,
            });

            const data = await response.json();
            if (data.status !== 'ok') {
                alert(data.message || 'Не удалось обновить участие');
                return;
            }

            const countNode = document.getElementById('players-count');
            if (countNode) {
                countNode.textContent = data.players_count;
            }

            renderParticipantPreview(data.players, currentUsername, organizerUsername);
            renderPlayersList(data.players);
            updateJoinButton(btn, action === 'join' ? 'leave' : 'join');
        });
    }

    function initChatButtons() {
        document.querySelectorAll('[data-game-chat-btn]').forEach(function (button) {
            button.addEventListener('click', function () {
                alert('Чат скоро будет доступен');
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initMenu();
        initPlayersPanel();
        initManageAction();
        initMap();
        initJoinLeave();
        initChatButtons();
    });
})();
