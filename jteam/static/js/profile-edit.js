(function () {
    const photoInput = document.getElementById('profile-photo-input');
    const photoBtn = document.getElementById('profile-photo-btn');
    const photoPreview = document.getElementById('profile-photo-preview');

    if (photoBtn && photoInput) {
        photoBtn.addEventListener('click', function () {
            photoInput.click();
        });

        photoInput.addEventListener('change', function () {
            const file = photoInput.files && photoInput.files[0];
            if (!file || !photoPreview) {
                return;
            }
            const reader = new FileReader();
            reader.onload = function (event) {
                if (photoPreview.tagName === 'IMG') {
                    photoPreview.src = event.target.result;
                } else {
                    const img = document.createElement('img');
                    img.id = 'profile-photo-preview';
                    img.className = 'profile-edit__avatar';
                    img.alt = '';
                    img.src = event.target.result;
                    photoPreview.replaceWith(img);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    const genderSelect = document.getElementById('id_gender');
    const genderValue = document.getElementById('profile-gender-value');
    const genderBtn = document.getElementById('profile-gender-btn');

    function updateGenderLabel() {
        if (!genderSelect || !genderValue) {
            return;
        }
        const option = genderSelect.options[genderSelect.selectedIndex];
        genderValue.textContent = option && option.value ? option.textContent : 'Не указан';
    }

    if (genderSelect) {
        updateGenderLabel();
        genderSelect.addEventListener('change', updateGenderLabel);
    }

    if (genderBtn && genderSelect) {
        genderBtn.addEventListener('click', function () {
            genderSelect.focus();
            if (typeof genderSelect.showPicker === 'function') {
                genderSelect.showPicker();
            } else {
                genderSelect.click();
            }
        });
    }
})();
