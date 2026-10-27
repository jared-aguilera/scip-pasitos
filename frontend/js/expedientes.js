// Modulo de busqueda de pacientes (US-06)

document.addEventListener('DOMContentLoaded', () => {
    let pacientes = [];
    let consulta = '';
    let rolUsuario = 'Capturador';
    let idUsuarioActual = null;

    const esc = str => String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    const norm = str => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    const calcularEdad = fechaNac => {
        if (!fechaNac) return '';
        const partes = fechaNac.split('-').map(Number);
        if (partes.length !== 3) return '';
        const nac = new Date(partes[0], partes[1] - 1, partes[2]);
        const hoy = new Date();
        let anios = hoy.getFullYear() - nac.getFullYear();
        let meses = hoy.getMonth() - nac.getMonth();
        if (hoy.getDate() < nac.getDate()) meses--;
        if (meses < 0) { anios--; meses += 12; }
        if (anios < 0) return '';
        if (anios === 0) return meses === 1 ? '1 mes' : `${meses} meses`;
        return anios === 1 ? '1 año' : `${anios} años`;
    };

    const obtenerClaseBadge = estatus => {
        switch (estatus) {
            case 'Evaluación': return 'badge-evaluacion';
            case 'Terapia': return 'badge-terapia';
            case 'Pausado': return 'badge-pausado';
            case 'Egresado': return 'badge-egresado';
            default: return 'badge-evaluacion';
        }
    };

    const nombreCompleto = p => [p.nombres, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ');

    const inputBuscar = document.getElementById('inputBuscar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const conteo = document.getElementById('conteoResultados');
    const contenedor = document.getElementById('contenedorResultados');

    async function inicializar() {
        try {
            const resSes = await fetch('../backend/api/session.php');
            if (resSes.ok) {
                const dataSes = await resSes.json();
                if (dataSes.logged_in) {
                    rolUsuario = dataSes.rol || 'Capturador';
                    idUsuarioActual = dataSes.usuario_id || null;
                }
            }
        } catch (err) {
            console.error('Error al verificar sesion:', err);
        }

        try {
            const resPac = await fetch('../backend/api/get_pacientes.php');
            if (resPac.ok) {
                const dataPac = await resPac.json();
                if (Array.isArray(dataPac)) {
                    pacientes = dataPac;
                }
            }
        } catch (err) {
            console.error('Error al cargar pacientes:', err);
        }

        pintarResultados();
    }

    function pacientesVisibles() {
        if (rolUsuario === 'Psicólogo' && idUsuarioActual) {
            return pacientes.filter(p => p.id_psicologa == idUsuarioActual);
        }
        return pacientes;
    }

    function filtrar(q) {
        const palabras = norm(q).split(/\s+/).filter(Boolean);
        return pacientesVisibles().filter(p => {
            const nombre = norm(nombreCompleto(p));
            const exp = norm(p.numero_expediente);
            return palabras.every(palabra => nombre.includes(palabra) || exp.includes(palabra));
        });
    }

    function pintarResultados() {
        if (btnLimpiar) btnLimpiar.style.display = consulta ? 'block' : 'none';

        const lista = filtrar(consulta);

        if (!lista.length) {
            if (conteo) conteo.textContent = '';
            if (contenedor) {
                contenedor.innerHTML = `
                    <div class="empty-state">
                        <strong>No existe el registro</strong>
                        <span>No encontramos pacientes que coincidan con "${esc(consulta.trim())}".</span>
                    </div>
                `;
            }
            return;
        }

        if (conteo) {
            conteo.textContent = (consulta.trim() ? 'Resultados: ' : 'Expedientes: ') + lista.length;
        }

        if (contenedor) {
            contenedor.innerHTML = `
                <ul class="result-list">
                    ${lista.map(p => {
                        const edad = calcularEdad(p.fecha_nacimiento);
                        const psicologa = p.psicologa ? p.psicologa : 'Sin asignar';
                        return `
                            <li>
                                <button class="result-row" type="button" data-id="${p.id_paciente}">
                                    <div class="result-info">
                                        <span class="result-name">${esc(nombreCompleto(p))}</span>
                                        <span class="result-sub">${esc(p.numero_expediente)}${edad ? ` · ${esc(edad)}` : ''}</span>
                                    </div>
                                    <span class="result-psico">${esc(psicologa)}</span>
                                    <span class="badge-pill ${obtenerClaseBadge(p.estatus)}">${esc(p.estatus)}</span>
                                </button>
                            </li>
                        `;
                    }).join('')}
                </ul>
            `;

            contenedor.querySelectorAll('.result-row').forEach(btn => {
                btn.addEventListener('click', () => {
                    window.location.href = `ver-expediente.html?id=${encodeURIComponent(btn.dataset.id)}`;
                });
            });
        }
    }

    if (inputBuscar) {
        inputBuscar.addEventListener('input', () => {
            consulta = inputBuscar.value;
            pintarResultados();
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            inputBuscar.value = '';
            consulta = '';
            pintarResultados();
            inputBuscar.focus();
        });
    }

    inicializar();
});
