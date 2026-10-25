document.addEventListener('DOMContentLoaded', () => {
    const inputFechaNac = document.getElementById('fecha_nacimiento');
    const inputEdad = document.getElementById('edad_calculada');
    const inputFechaIngreso = document.getElementById('fecha_ingreso');
    const btnUserMenu = document.getElementById('btnUserMenu');
    const userDropdown = document.getElementById('userDropdown');
    const selectMedicamento = document.getElementById('toma_medicamento');
    const inputCualMedicamento = document.getElementById('detalle_medicamento');

    // Fecha actual por defecto
    if (inputFechaIngreso) {
        inputFechaIngreso.value = new Date().toISOString().split('T')[0];
    }

    // Calculo automatico de la edad
    if (inputFechaNac && inputEdad) {
        inputFechaNac.addEventListener('change', () => {
            const fechaVal = inputFechaNac.value;
            if (!fechaVal) {
                inputEdad.value = '';
                return;
            }

            const nac = new Date(fechaVal);
            const hoy = new Date();

            let anios = hoy.getFullYear() - nac.getFullYear();
            let meses = hoy.getMonth() - nac.getMonth();

            if (meses < 0 || (meses === 0 && hoy.getDate() < nac.getDate())) {
                anios--;
                meses += 12;
            }

            if (anios < 0) {
                inputEdad.value = 'Fecha invalida';
                return;
            }

            if (anios === 0) {
                inputEdad.value = `${meses} meses`;
            } else {
                inputEdad.value = `${anios} años ${meses > 0 ? meses + ' meses' : ''}`.trim();
            }
        });
    }

    // Control de campo para detalle de medicamento
    if (selectMedicamento && inputCualMedicamento) {
        selectMedicamento.addEventListener('change', () => {
            if (selectMedicamento.value === 'si') {
                inputCualMedicamento.disabled = false;
                inputCualMedicamento.focus();
            } else {
                inputCualMedicamento.disabled = true;
                inputCualMedicamento.value = '';
            }
        });
    }

    // Menu desplegable de usuario
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
});
