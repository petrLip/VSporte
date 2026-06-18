(function () {
    const STORAGE_KEY = 'jteam_selected_city';
    const STORAGE_SOURCE_KEY = 'jteam_city_source';
    const MIN_QUERY_LENGTH = 2;
    const SEARCH_DEBOUNCE_MS = 250;

    function getConfig() {
        return document.getElementById('user-city-config');
    }

    function getSavedCity() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function saveCity(city, source) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(city));
        localStorage.setItem(STORAGE_SOURCE_KEY, source);
    }

    function updateCityLabels(text) {
        document.querySelectorAll('[data-city-label]').forEach(function (label) {
            label.textContent = text;
        });
    }

    function getCsrfToken() {
        if (typeof Cookies !== 'undefined') {
            return Cookies.get('csrftoken');
        }
        return '';
    }

    function postJson(url, payload) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify(payload),
        }).then(function (response) {
            if (!response.ok) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    throw new Error(data.error || 'request_failed');
                });
            }
            return response.json();
        });
    }

    function applyCity(city, source, pickerState) {
        if (!city || !city.name) {
            return;
        }
        saveCity(city, source);
        updateCityLabels(city.name);
        closeCityPicker(pickerState);
    }

    function showManualSelectionPrompt(pickerState) {
        updateCityLabels('Выберите город');
        openCityPicker(pickerState);
    }

    function resolveCityFromDetection(data, pickerState) {
        if (data.city) {
            applyCity(data.city, 'geo', pickerState);
            return;
        }

        if (data.detected_name) {
            applyCity({ name: data.detected_name, slug: null }, 'geo', pickerState);
            return;
        }

        showManualSelectionPrompt(pickerState);
    }

    function detectCityFromGeolocation(config, pickerState) {
        updateCityLabels('Определяем город...');

        if (!navigator.geolocation) {
            showManualSelectionPrompt(pickerState);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function (position) {
                postJson(config.dataset.detectUrl, {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                })
                    .then(function (data) {
                        resolveCityFromDetection(data, pickerState);
                    })
                    .catch(function () {
                        showManualSelectionPrompt(pickerState);
                    });
            },
            function () {
                showManualSelectionPrompt(pickerState);
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000,
            }
        );
    }

    function createPickerState(config) {
        const searchInput = document.getElementById('user-city-search');
        const list = document.getElementById('user-city-list');
        const hint = document.getElementById('user-city-search-hint');
        let searchTimeout = null;

        const pickerState = {
            resetSearchUi: function () {
                if (searchInput) {
                    searchInput.value = '';
                }
                if (list) {
                    list.innerHTML = '';
                    list.hidden = true;
                }
                if (hint) {
                    hint.hidden = false;
                    hint.textContent = 'Начните вводить название города';
                }
                if (searchInput) {
                    searchInput.setAttribute('aria-expanded', 'false');
                }
            },
            focusSearch: function () {
                if (searchInput) {
                    searchInput.focus();
                }
            },
        };

        function selectCity(city) {
            postJson(config.dataset.setCityUrl, { slug: city.slug })
                .then(function (data) {
                    applyCity(data.city, 'manual', pickerState);
                })
                .catch(function () {
                    applyCity(city, 'manual', pickerState);
                });
        }

        function renderResults(cities) {
            if (!list || !hint) {
                return;
            }

            list.innerHTML = '';

            if (!cities.length) {
                list.hidden = true;
                hint.hidden = false;
                hint.textContent = 'Город не найден. Попробуйте другой запрос.';
                searchInput.setAttribute('aria-expanded', 'false');
                return;
            }

            hint.hidden = true;
            list.hidden = false;
            searchInput.setAttribute('aria-expanded', 'true');

            cities.forEach(function (city) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'user-city-picker__item';
                button.setAttribute('role', 'option');
                button.textContent = city.name;
                button.addEventListener('click', function () {
                    selectCity(city);
                });
                list.appendChild(button);
            });
        }

        function searchCities(query) {
            const url = new URL(config.dataset.searchUrl, window.location.origin);
            url.searchParams.set('q', query);

            return fetch(url.toString(), {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            }).then(function (response) {
                if (!response.ok) {
                    return { cities: [] };
                }
                return response.json();
            }).then(function (data) {
                renderResults(data.cities || []);
            }).catch(function () {
                if (hint) {
                    hint.hidden = false;
                    hint.textContent = 'Не удалось загрузить список городов.';
                }
            });
        }

        function handleSearchInput() {
            const query = (searchInput.value || '').trim();

            clearTimeout(searchTimeout);

            if (query.length < MIN_QUERY_LENGTH) {
                if (list) {
                    list.innerHTML = '';
                    list.hidden = true;
                }
                if (hint) {
                    hint.hidden = false;
                    hint.textContent = query.length
                        ? 'Введите минимум 2 символа'
                        : 'Начните вводить название города';
                }
                searchInput.setAttribute('aria-expanded', 'false');
                return;
            }

            if (hint) {
                hint.hidden = false;
                hint.textContent = 'Ищем...';
            }

            searchTimeout = setTimeout(function () {
                searchCities(query);
            }, SEARCH_DEBOUNCE_MS);
        }

        if (searchInput) {
            searchInput.addEventListener('input', handleSearchInput);
        }

        return pickerState;
    }

    function openCityPicker(pickerState) {
        const picker = document.getElementById('user-city-picker');
        if (picker) {
            picker.hidden = false;
        }
        if (pickerState) {
            pickerState.resetSearchUi();
            pickerState.focusSearch();
        }
    }

    function closeCityPicker(pickerState) {
        const picker = document.getElementById('user-city-picker');
        if (picker) {
            picker.hidden = true;
        }
        if (pickerState) {
            pickerState.resetSearchUi();
        }
    }

    function initCityPicker(config, pickerState) {
        const picker = document.getElementById('user-city-picker');

        document.querySelectorAll('[data-city-trigger]').forEach(function (trigger) {
            trigger.addEventListener('click', function () {
                openCityPicker(pickerState);
            });
        });

        if (picker) {
            picker.querySelectorAll('[data-city-picker-close]').forEach(function (element) {
                element.addEventListener('click', function () {
                    closeCityPicker(pickerState);
                });
            });
        }
    }

    function initUserCity() {
        const config = getConfig();
        if (!config) {
            return;
        }

        const pickerState = createPickerState(config);
        initCityPicker(config, pickerState);

        const savedCity = getSavedCity();
        const savedSource = localStorage.getItem(STORAGE_SOURCE_KEY);

        if (savedCity && savedSource === 'manual') {
            updateCityLabels(savedCity.name);
            return;
        }

        if (savedCity && savedSource === 'geo') {
            updateCityLabels(savedCity.name);
            detectCityFromGeolocation(config, pickerState);
            return;
        }

        detectCityFromGeolocation(config, pickerState);
    }

    document.addEventListener('DOMContentLoaded', initUserCity);
})();
