document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formRegistroPaciente');
    const inputFechaNac = document.getElementById('fecha_nacimiento');
    const inputEdad = document.getElementById('edad_calculada');
    const inputFechaIngreso = document.getElementById('fecha_ingreso');
    const selectMedicamento = document.getElementById('toma_medicamento');
    const inputCualMedicamento = document.getElementById('detalle_medicamento');
    const btnSubmit = document.getElementById('btnRegistrarPaciente') || (form ? form.querySelector('button[type="submit"]') : null);

    // Fecha local actual por defecto (sin desfase UTC)
    const fechaActual = new Date();
    const hoy = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}-${String(fechaActual.getDate()).padStart(2, '0')}`;
    if (inputFechaIngreso) {
        inputFechaIngreso.value = hoy;
    }

    // Calcular edad
    if (inputFechaNac && inputEdad) {
        inputFechaNac.addEventListener('change', () => {
            const fechaVal = inputFechaNac.value;
            if (!fechaVal) {
                inputEdad.value = '';
                return;
            }

            const nac = new Date(fechaVal);
            const hoyDate = new Date();

            let anios = hoyDate.getFullYear() - nac.getFullYear();
            let meses = hoyDate.getMonth() - nac.getMonth();

            if (meses < 0 || (meses === 0 && hoyDate.getDate() < nac.getDate())) {
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

    // Activar campo medicamento
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

    // Filtrar telefonos solo numeros a 10 digitos
    const inputsTel = document.querySelectorAll('input[type="tel"]');
    inputsTel.forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        });
    });

    // Ventana de confirmacion
    const modal = document.getElementById('modalExito');
    const modalExpediente = document.getElementById('modalExpedienteTexto');
    const btnAceptarModal = document.getElementById('btnAceptarModal');
    const btnCerrarModalCruz = document.getElementById('btnCerrarModalCruz');

    function abrirModal(numeroExpediente) {
        if (!modal) return;
        if (modalExpediente) {
            modalExpediente.textContent = `Expediente: ${numeroExpediente}`;
        }
        modal.classList.add('show');
    }

    function cerrarModal() {
        if (!modal) return;
        modal.classList.remove('show');
    }

    if (btnAceptarModal) btnAceptarModal.addEventListener('click', cerrarModal);
    if (btnCerrarModalCruz) btnCerrarModalCruz.addEventListener('click', cerrarModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrarModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
            cerrarModal();
        }
    });

    // Enviar formulario al backend
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Guardando...';
            }

            const formData = new FormData(form);
            const datos = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('../backend/api/guardar_paciente.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });

                const resultado = await response.json();

                if (resultado.success) {
                    abrirModal(resultado.numero_expediente);
                    form.reset();
                    if (inputFechaIngreso) inputFechaIngreso.value = hoy;
                    if (inputEdad) inputEdad.value = '';
                    if (inputCualMedicamento) inputCualMedicamento.disabled = true;
                } else {
                    alert('Error: ' + (resultado.message || 'No se pudo registrar el paciente'));
                }
            } catch (error) {
                console.error(error);
                alert('Error al conectar con el servidor backend');
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Registrar paciente';
                }
            }
        });
    }
});
