document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('formEditarPaciente');
    const subtitulo = document.getElementById('subtituloPaciente');
    const aviso = document.getElementById('aviso');
    const btnGuardar = document.getElementById('btnGuardar');
    const btnDescartar = document.getElementById('btnDescartar');
    const indicadorCambios = document.getElementById('indicadorCambios');

    const selectMedicamento = document.getElementById('toma_medicamento');
    const inputCualMedicamento = document.getElementById('detalle_medicamento');
    const inputFechaNac = document.getElementById('fecha_nacimiento');
    const inputFechaIngreso = document.getElementById('fecha_ingreso');
    const inputEdad = document.getElementById('edad_calculada');
    const selectEstatus = document.getElementById('estatus');
    const selectPsicologa = document.getElementById('id_psicologa');
    const grupoMotivo = document.getElementById('grupoMotivoCambio');
    const inputMotivo = document.getElementById('motivo_cambio');

    const urlParams = new URLSearchParams(window.location.search);
    const idPaciente = urlParams.get('id');

    // Estatus con el que se cargó el expediente (para saber si cambió)
    let estatusOriginal = null;

    function mostrarError(msg) {
        if (subtitulo) subtitulo.style.display = 'none';
        if (form) form.style.display = 'none';
        if (aviso) {
            aviso.className = 'alert alert-danger';
            aviso.textContent = msg;
            aviso.style.display = 'block';
        } else {
            alert(msg);
        }
    }

    if (!idPaciente) {
        mostrarError('No se especificó un ID de paciente en la URL.');
        return;
    }

    function calcularEdad(fechaTexto) {
        if (!fechaTexto) return '';
        const partes = fechaTexto.split('-').map(Number);
        if (partes.length !== 3) return '';
        const [a, m, d] = partes;
        const nac = new Date(a, m - 1, d);
        if (isNaN(nac.getTime())) return '';

        const hoy = new Date();
        let anios = hoy.getFullYear() - nac.getFullYear();
        let meses = hoy.getMonth() - nac.getMonth();
        if (hoy.getDate() < nac.getDate()) meses--;
        if (meses < 0) {
            anios--;
            meses += 12;
        }

        if (anios < 0) return 'Fecha inválida';
        if (anios === 0) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
        const textoAnios = `${anios} ${anios === 1 ? 'año' : 'años'}`;
        return meses > 0 ? `${textoAnios} ${meses} ${meses === 1 ? 'mes' : 'meses'}` : textoAnios;
    }

    function actualizarEstadoMedicamento() {
        if (!selectMedicamento || !inputCualMedicamento) return;
        const toma = selectMedicamento.value === 'si';
        inputCualMedicamento.disabled = !toma;
        if (!toma) inputCualMedicamento.value = '';
    }

    // El motivo solo aparece (y es obligatorio) cuando se cambia el estatus
    function actualizarMotivoCambio() {
        if (!selectEstatus || !grupoMotivo || !inputMotivo || estatusOriginal === null) return;
        const cambio = selectEstatus.value !== estatusOriginal;
        grupoMotivo.classList.toggle('hidden', !cambio);
        inputMotivo.required = cambio;
        if (!cambio) inputMotivo.value = '';
    }

    function marcarCambios() {
        if (btnGuardar) btnGuardar.disabled = false;
        if (indicadorCambios) indicadorCambios.style.display = 'inline';
    }

    // Filtrar entradas de teléfonos a 10 dígitos numéricos
    document.querySelectorAll('input[type="tel"]').forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        });
    });

    // No se permiten fechas futuras
    const ahora = new Date();
    const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    if (inputFechaNac) inputFechaNac.max = hoy;
    if (inputFechaIngreso) inputFechaIngreso.max = hoy;

    // Psicólogas desde la BD (antes estaban escritas a mano en el HTML y no reflejaban altas/bajas de usuarios).
    // Si la petición falla se conservan las opciones del HTML.
    try {
        const resPsi = await fetch('../backend/api/get_psicologas.php');
        if (resPsi.ok) {
            const dataPsi = await resPsi.json();
            if (dataPsi.success && Array.isArray(dataPsi.data) && selectPsicologa) {
                selectPsicologa.replaceChildren(new Option('Sin psicóloga asignada', ''));
                dataPsi.data.forEach(ps => {
                    const nombre = [ps.nombre, ps.apellidos].filter(Boolean).join(' ');
                    selectPsicologa.appendChild(new Option(nombre, ps.id_usuario));
                });
            }
        }
    } catch (err) {
        console.error('No se pudo cargar la lista de psicólogas:', err);
    }

    try {
        const res = await fetch(`../backend/api/get_paciente.php?id=${encodeURIComponent(idPaciente)}`);
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success && data.paciente) {
            const p = data.paciente;

            // Poblado directo coincidiendo con los IDs / names del HTML
            Object.keys(p).forEach(key => {
                let valor = p[key] !== null && p[key] !== undefined ? p[key] : '';

                // toma_medicamento llega como 1/0 -> 'si'/'no'
                if (key === 'toma_medicamento') {
                    valor = (valor == 1 || valor === 'si' || valor === 'Sí') ? 'si' : 'no';
                }

                const el = document.getElementById(key) || form.querySelector(`[name="${key}"]`);
                if (el) {
                    el.value = valor;
                }
            });

            // Si la psicóloga asignada ya no aparece en la lista (p. ej. usuario inactivo), se agrega para no perderla al guardar
            if (selectPsicologa && p.id_psicologa && selectPsicologa.value !== String(p.id_psicologa)) {
                selectPsicologa.appendChild(new Option(`Usuario #${p.id_psicologa} (inactivo)`, p.id_psicologa));
                selectPsicologa.value = String(p.id_psicologa);
            }

            const inputId = document.getElementById('id_paciente');
            if (inputId) inputId.value = p.id_paciente || idPaciente;

            estatusOriginal = p.estatus || (selectEstatus ? selectEstatus.value : null);

            if (inputFechaNac && inputEdad) inputEdad.value = calcularEdad(inputFechaNac.value);
            actualizarEstadoMedicamento();
            actualizarMotivoCambio();

            if (subtitulo) {
                const nombre = [p.nombres, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ');
                subtitulo.textContent = `${p.numero_expediente || ''} · ${nombre}`.replace(/^ · /, '');
            }
        } else {
            mostrarError(data.message || 'No se pudieron obtener los datos del paciente.');
            return;
        }
    } catch (err) {
        console.error('Error al obtener paciente:', err);
        mostrarError('Error de conexión con el servidor backend.');
        return;
    }

    // Eventos reactivos del formulario
    if (inputFechaNac) {
        inputFechaNac.addEventListener('change', () => {
            if (inputEdad) inputEdad.value = calcularEdad(inputFechaNac.value);
        });
    }

    if (selectMedicamento) {
        selectMedicamento.addEventListener('change', actualizarEstadoMedicamento);
    }

    if (selectEstatus) {
        selectEstatus.addEventListener('change', actualizarMotivoCambio);
    }

    // Activar botón guardar al detectar cambios
    if (form && btnGuardar) {
        form.addEventListener('input', marcarCambios);
        form.addEventListener('change', marcarCambios);
    }

    if (btnDescartar) {
        btnDescartar.addEventListener('click', () => {
            window.location.reload();
        });
    }

    // Enviar actualización
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // El formulario tiene novalidate: se valida aquí (required, pattern de teléfonos, correo, etc.)
        if (!form.reportValidity()) return;

        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Guardando...';
        }

        let guardado = false;

        try {
            const res = await fetch('../backend/api/actualizar_paciente.php', {
                method: 'POST',
                body: new FormData(form)
            });

            const result = await res.json();

            if (result.success) {
                guardado = true;
                estatusOriginal = selectEstatus ? selectEstatus.value : estatusOriginal;
                actualizarMotivoCambio();

                if (aviso) {
                    aviso.className = 'alert alert-success';
                    aviso.textContent = '¡Paciente actualizado con éxito!';
                    aviso.style.display = 'block';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setTimeout(() => { aviso.style.display = 'none'; }, 4000);
                } else {
                    alert('¡Paciente actualizado con éxito!');
                }
                if (indicadorCambios) indicadorCambios.style.display = 'none';
            } else {
                alert(result.message || 'Error al actualizar la información.');
            }
        } catch (err) {
            console.error('Error al guardar:', err);
            alert('Ocurrió un error al intentar guardar los cambios.');
        } finally {
            if (btnGuardar) {
                // Tras guardar con éxito ya no hay cambios pendientes
                btnGuardar.disabled = guardado;
                btnGuardar.textContent = 'Guardar cambios';
            }
        }
    });
});
