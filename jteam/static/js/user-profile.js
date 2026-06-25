(function () {
    const friendshipUrl = document.body.dataset.friendshipUrl;
    const actionContainer = document.querySelector('[data-friendship-action]');
    if (!friendshipUrl || !actionContainer) {
        return;
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return '';
    }

    function renderAction(userId, friendship) {
        if (friendship === 'pending_sent') {
            actionContainer.innerHTML =
                '<span class="profile-page__pending">Заявка отправлена</span>';
            return;
        }

        if (friendship === 'friends') {
            actionContainer.innerHTML =
                '<button type="button" class="profile-page__friend-btn profile-page__friend-btn--remove" ' +
                'data-id="' + userId + '" data-action="unfriend">Удалить из друзей</button>';
            return;
        }

        const action = friendship === 'pending_received' ? 'accept' : 'request';
        const label = friendship === 'pending_received' ? 'Принять заявку' : 'Добавить в друзья';
        actionContainer.innerHTML =
            '<button type="button" class="profile-page__friend-btn" ' +
            'data-id="' + userId + '" data-action="' + action + '">' + label + '</button>';
    }

    actionContainer.addEventListener('click', function (event) {
        const button = event.target.closest('.profile-page__friend-btn');
        if (!button) {
            return;
        }

        event.preventDefault();

        const formData = new FormData();
        formData.append('id', button.dataset.id);
        formData.append('action', button.dataset.action);

        fetch(friendshipUrl, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCookie('csrftoken') },
            body: formData,
            credentials: 'same-origin',
        })
            .then(function (response) { return response.json(); })
            .then(function (data) {
                if (data.status === 'ok') {
                    renderAction(button.dataset.id, data.friendship);
                }
            });
    });
})();
