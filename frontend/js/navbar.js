// Se agregó async
document.addEventListener('DOMContentLoaded', async () => {

    //INICIO DE CAMBIOS ABSALON: Protección de rutas
    let sesion = null;
    try {
        const sessionRes = await fetch('../backend/api/session.php');
        const sessionData = await sessionRes.json();
        sesion = sessionData;

        if (!sessionData.logged_in) {
            // Si no esta logueado, lo patea al login y detiene la ejecucion
            window.location.href = 'login.html';
            return;
        }
    } catch (error) {
        console.error("Error al verificar sesión", error);
    }
    //FIN DE CAMBIOS ABSALON


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
            let rutaActual = window.location.pathname.split('/').pop() || 'index.html';
            // La pantalla de edicion forma parte de Expedientes
            if (rutaActual === 'editar-paciente.html') rutaActual = 'expedientes.html';
            const enlaces = container.querySelectorAll('.nav-link');
            enlaces.forEach(link => {
                const destino = link.getAttribute('href');
                if (destino === rutaActual) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });

            // Nombre y rol reales del usuario en sesion
            if (sesion && sesion.logged_in) {
                const saludo = container.querySelector('.user-greeting');
                const rolBadge = container.querySelector('.user-role-badge');
                if (saludo && sesion.nombre) saludo.textContent = sesion.nombre;
                if (rolBadge && sesion.rol) rolBadge.textContent = sesion.rol + ' ▾';
            }

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

            // INICIO DE CAMBIOS ABSALON: Cerrar sesion
            const btnLogout = Array.from(document.querySelectorAll('.dropdown-item')).find(el => el.textContent.toLowerCase().includes('cerrar'));
            
            if (btnLogout) {
                btnLogout.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await fetch('../backend/api/logout.php');
                    window.location.href = 'login.html';
                });
            }
            // FIN DE CAMBIOS ABSALON

        })
        .catch(err => console.error(err));
});