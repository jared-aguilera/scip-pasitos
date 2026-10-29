document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formLogin');
    const loginAlert = document.getElementById('loginAlert');

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Deshabilitar el botón temporalmente para evitar múltiples envios
            const btnSubmit = formLogin.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Verificando...';

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                // Ruta archivo PHP
                const response = await fetch('../backend/api/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    loginAlert.style.display = 'none';

                    // Redireccion basada en el rol devuelto por la base de datos
                    switch (data.rol) {
                        case 'Capturador':
                            window.location.href = 'index.html';
                            break;
                        case 'Psicólogo':
                            // Esta vista la haran Jared y Dominic
                            window.location.href = 'index.html';
                            break;
                        case 'Administrador':
                            window.location.href = 'index.html';
                            break;
                        default:
                            window.location.href = 'index.html';
                    }
                } else {
                    // Mostrar la alerta de credenciales invalidas
                    loginAlert.textContent = data.message || "Credenciales invalidas";
                    loginAlert.style.display = 'block';
                }
            } catch (error) {
                console.error("Error en la peticion:", error);
                loginAlert.textContent = "Error al conectar con el servidor.";
                loginAlert.style.display = 'block';
            } finally {
                // Restaurar el boton
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Ingresar al sistema';
            }
        });
    }
});