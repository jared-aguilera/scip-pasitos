// Consulta y visualizacion detallada del expediente (US-06)

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const idPaciente = urlParams.get('id');

    const btnVolver = document.getElementById('btnVolver');
    const btnEditar = document.getElementById('btnEditar');
    const avisoError = document.getElementById('avisoError');
    const cardExpediente = document.getElementById('cardExpediente');

    if (btnVolver) {
        btnVolver.addEventListener('click', () => {
            window.location.href = 'expedientes.html';
        });
    }

    if (!idPaciente) {
        mostrarError('No se especificó un ID de paciente en la URL.');
        return;
    }

    if (btnEditar) {
        btnEditar.addEventListener('click', () => {
            window.location.href = `editar-paciente.html?id=${encodeURIComponent(idPaciente)}`;
        });
    }

    function mostrarError(msg) {
        if (cardExpediente) cardExpediente.style.display = 'none';
        if (avisoError) {
            avisoError.textContent = msg;
            avisoError.style.display = 'block';
        }
    }

    const fmtFecha = fecha => {
        if (!fecha) return '—';
        const partes = fecha.split('-').map(Number);
        if (partes.length !== 3) return fecha;
        const d = new Date(partes[0], partes[1] - 1, partes[2]);
        return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const calcularEdad = fechaNac => {
        if (!fechaNac) return '—';
        const partes = fechaNac.split('-').map(Number);
        if (partes.length !== 3) return '';
        const nac = new Date(partes[0], partes[1] - 1, partes[2]);
        const hoy = new Date();
        let anios = hoy.getFullYear() - nac.getFullYear();
        let meses = hoy.getMonth() - nac.getMonth();
        if (hoy.getDate() < nac.getDate()) meses--;
        if (meses < 0) { anios--; meses += 12; }
        if (anios < 0) return '—';
        if (anios === 0) return meses === 1 ? '1 mes' : `${meses} meses`;
        return anios === 1 ? '1 año' : `${anios} años`;
    };

    const calcularAntiguedad = fechaIngreso => {
        if (!fechaIngreso) return '—';
        const partes = fechaIngreso.split('-').map(Number);
        if (partes.length !== 3) return fechaIngreso;
        const ing = new Date(partes[0], partes[1] - 1, partes[2]);
        const hoy = new Date();
        let anios = hoy.getFullYear() - ing.getFullYear();
        let meses = hoy.getMonth() - ing.getMonth();
        if (hoy.getDate() < ing.getDate()) meses--;
        if (meses < 0) { anios--; meses += 12; }
        if (anios < 1 && meses < 1) return 'Menos de un mes';
        const aT = anios === 1 ? '1 año' : `${anios} años`;
        const mT = meses === 1 ? '1 mes' : `${meses} meses`;
        if (anios < 1) return mT;
        return meses === 0 ? aT : `${aT} y ${mT}`;
    };

    const fmtTel = tel => {
        if (!tel) return '—';
        const limpio = String(tel).replace(/\D/g, '');
        return limpio.length === 10 ? limpio.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') : tel;
    };

    const aplicarBadge = (el, estatus) => {
        if (!el) return;
        el.textContent = estatus || 'Evaluación';
        el.className = 'badge-pill';
        switch (estatus) {
            case 'Evaluación': el.classList.add('badge-evaluacion'); break;
            case 'Terapia': el.classList.add('badge-terapia'); break;
            case 'Pausado': el.classList.add('badge-pausado'); break;
            case 'Egresado': el.classList.add('badge-egresado'); break;
            default: el.classList.add('badge-evaluacion'); break;
        }
    };

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (val !== null && val !== undefined && String(val).trim() !== '') ? val : '—';
    };

    try {
        const res = await fetch(`../backend/api/get_paciente.php?id=${encodeURIComponent(idPaciente)}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success || !data.paciente) {
            mostrarError(data.message || 'El expediente no existe o fue eliminado.');
            return;
        }

        const p = data.paciente;
        const nombreCompleto = [p.nombres, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ');
        const tutorNombre = [p.tutor_nombres, p.tutor_primer_apellido, p.tutor_segundo_apellido].filter(Boolean).join(' ');

        setText('txtNombrePaciente', nombreCompleto);
        setText('txtNumeroExpediente', p.numero_expediente);
        aplicarBadge(document.getElementById('badgeEstatus'), p.estatus);

        setText('txtEdad', calcularEdad(p.fecha_nacimiento));
        setText('txtFechaNacimiento', fmtFecha(p.fecha_nacimiento));
        setText('txtSexo', p.sexo);
        setText('txtEstatus', p.estatus);
        setText('txtPsicologa', p.psicologa_nombre || 'Sin asignar');
        setText('txtFechaIngreso', fmtFecha(p.fecha_ingreso));
        setText('txtAntiguedad', calcularAntiguedad(p.fecha_ingreso));
        setText('txtEscolaridad', p.escolaridad);
        setText('txtEscuela', p.escuela_procedencia);
        setText('txtMotivoConsulta', p.motivo_consulta);

        setText('txtTutorNombre', tutorNombre);
        setText('txtTutorParentesco', p.parentesco_tutor);
        setText('txtTutorCelular', fmtTel(p.telefono_principal));
        setText('txtTutorCasa', fmtTel(p.telefono_secundario));
        setText('txtDireccion', p.direccion_domicilio);

        const tomaMed = (p.toma_medicamento == 1 || p.toma_medicamento === 'si') ? 'Sí' : 'No';
        setText('txtTomaMed', tomaMed);
        setText('txtDetalleMed', p.detalle_medicamento);
        setText('txtAlergias', p.alergias);
        setText('txtProblemas', p.problemas_asociados);
        setText('txtMedicoNombre', p.medico_neurologo_nombre);
        setText('txtMedicoTelefono', fmtTel(p.medico_neurologo_telefono));

    } catch (err) {
        console.error('Error al cargar paciente:', err);
        mostrarError('Error de conexión al cargar el expediente.');
    }
});
