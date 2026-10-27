document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('navbar-container');
    if (!container) return;

    // Cargar navbar
    fetch('components/navbar.html')
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar navbar');
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;

            // Enlace activo
            const rutaActual = window.location.pathname.split('/').pop() || 'index.html';
            const enlaces = container.querySelectorAll('.nav-link');
            enlaces.forEach(link => {
                const destino = link.getAttribute('href');
                if (destino === rutaActual) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });

            // Menu de usuario
            const btnUserMenu = document.getElementById('btnUserMenu');
            const userDropdown = document.getElementById('userDropdown');

            if (btnUserMenu && userDropdown) {
                btnUserMenu.addEventListener('click', (e) => {
                    e.stopPropagation();
                    userDropdown.classList.toggle('show');
                });

                document.addEventListener('click', (e) => {
                    if (!userDropdown.contains(e.target) && e.target !== btnUserMenu) {
                        userDropdown.classList.remove('show');
                    }
                });
            }
        })
        .catch(err => console.error(err));
});
