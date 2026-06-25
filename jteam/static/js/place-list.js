(function () {
    const searchToggle = document.getElementById('places-search-toggle');
    const searchPanel = document.getElementById('places-page-search');
    if (searchToggle && searchPanel) {
        searchToggle.addEventListener('click', function () {
            const isOpen = searchPanel.classList.toggle('is-open');
            searchToggle.setAttribute('aria-expanded', String(isOpen));
            if (isOpen) {
                const input = searchPanel.querySelector('input');
                if (input) {
                    input.focus();
                }
            }
        });
    }

    const filterToggle = document.getElementById('places-filter-toggle');
    const filterPanel = document.getElementById('places-page-filter');
    if (filterToggle && filterPanel) {
        filterToggle.addEventListener('click', function () {
            const isOpen = filterPanel.classList.toggle('is-open');
            filterToggle.setAttribute('aria-expanded', String(isOpen));
        });
    }
})();
