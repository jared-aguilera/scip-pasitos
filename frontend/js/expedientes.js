// US-06: busqueda de pacientes y vista general del expediente.
// Todo viene de la base de datos a traves de:
//   backend/api/session.php       -> usuario y rol en sesion
//   backend/api/get_pacientes.php -> lista para el buscador (ya filtrada por rol en el servidor)
//   backend/api/get_paciente.php  -> expediente completo de un paciente
// La edicion la hace editar-paciente.html?id=<id_paciente>.
(() => {
    const API = '../backend/api/';
    const $ = s => document.querySelector(s);

    let sesion = { rol: '' };
    let pacientes = [];
    let consulta = '';

    // ---------- Utilidades ----------
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const parseFecha = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
    const fmtFecha = s => s ? parseFecha(s).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const unir = (...partes) => partes.filter(Boolean).join(' ');
    const nombreCompleto = p => unir(p.nombres, p.primer_apellido, p.segundo_apellido);
    const iniciales = p => ((p.nombres || '?')[0] + (p.primer_apellido || '')[0]).toUpperCase();
    const fmtTel = t => (t && /^\d{10}$/.test(t)) ? t.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') : (t || '');
    const esPsicologo = () => sesion.rol === 'Psicólogo';

    function mesesDesde(fecha) {
        const a = parseFecha(fecha), b = new Date();
        let m = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
        if (b.getDate() < a.getDate()) m--;
        return Math.max(m, 0);
    }
    function calcularEdad(nac) {
        const m = mesesDesde(nac), y = Math.floor(m / 12);
        if (y < 1) return m === 1 ? '1 mes' : m + ' meses';
        return y === 1 ? '1 año' : y + ' años';
    }
    function calcularAntiguedad(ingreso) {
        const m = mesesDesde(ingreso);
        if (m < 1) return 'Menos de un mes';
        const y = Math.floor(m / 12), r = m % 12;
        const aT = y === 1 ? '1 año' : y + ' años';
        const mT = r === 1 ? '1 mes' : r + ' meses';
        if (y < 1) return mT;
        return r === 0 ? aT : aT + ' y ' + mT;
    }

    // ---------- Acceso al backend ----------
    async function pedir(endpoint) {
        const res = await fetch(API + endpoint, { credentials: 'same-origin' });
        if (res.status === 401) {
            window.location.href = 'login.html';
            throw new Error('sin-sesion');
        }
        let data = null;
        try { data = await res.json(); } catch (e) { /* respuesta no JSON */ }
        return { ok: res.ok, status: res.status, data };
    }

    const estado = (titulo, texto) => `<div class="empty-state"><strong>${esc(titulo)}</strong>${esc(texto)}</div>`;
    const errorServidor = () => estado('No se pudo conectar con el servidor', 'Revisa que Apache y MySQL estén encendidos e intenta de nuevo.');

    // ---------- Buscador ----------
    function buscar(q) {
        const palabras = norm(q).split(/\s+/).filter(Boolean);
        return pacientes.filter(p => {
            const n = norm(nombreCompleto(p));
            return palabras.every(w => n.includes(w));
        });
    }

    const ICONO_LUPA = '<svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

    async function vistaLista() {
        $('#app').innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Expedientes</h1>
            </div>
            <section class="form-card">
                <div class="search-box">
                    ${ICONO_LUPA}
                    <input class="form-control" id="q" type="search" autocomplete="off" placeholder="Buscar por nombre o apellidos" aria-label="Buscar paciente por nombre o apellidos">
                    <button class="search-clear" id="limpiar" type="button" aria-label="Borrar búsqueda">×</button>
                </div>
                <p class="result-count" id="conteo" aria-live="polite"></p>
                <div id="resultados">${estado('Cargando expedientes…', '')}</div>
            </section>
            <p class="list-note">${esPsicologo() ? 'Mostrando solo tus pacientes asignados.' : 'Tienes acceso a todos los expedientes.'}</p>`;

        const q = $('#q');
        q.value = consulta;
        q.oninput = () => { consulta = q.value; pintarResultados(); };
        q.onkeydown = e => { if (e.key === 'Escape' && q.value) $('#limpiar').click(); };
        $('#limpiar').onclick = () => { q.value = ''; consulta = ''; pintarResultados(); q.focus(); };

        try {
            const r = await pedir('get_pacientes.php');
            if (!$('#resultados')) return;              // el usuario ya cambio de vista
            if (!r.ok || !Array.isArray(r.data)) throw new Error('respuesta-invalida');
            pacientes = r.data;
            pintarResultados();
        } catch (err) {
            if (err.message === 'sin-sesion') return;
            console.error('Error al cargar pacientes:', err);
            if ($('#resultados')) $('#resultados').innerHTML = errorServidor();
        }
    }

    function pintarResultados() {
        const lista = buscar(consulta);
        $('#limpiar').style.display = consulta ? 'block' : 'none';

        if (!pacientes.length) {
            $('#conteo').textContent = '';
            $('#resultados').innerHTML = estado('Aún no hay expedientes', esPsicologo() ? 'Todavía no tienes pacientes asignados.' : 'Registra un paciente para que aparezca aquí.');
            return;
        }
        if (!lista.length) {
            $('#conteo').textContent = '';
            $('#resultados').innerHTML = `<div class="empty-state" role="alert"><strong>No existe el registro</strong>No encontramos pacientes que coincidan con “${esc(consulta.trim())}”. Revisa el nombre o los apellidos.</div>`;
            return;
        }

        $('#conteo').textContent = (consulta.trim() ? 'Resultados: ' : 'Expedientes: ') + lista.length;
        $('#resultados').innerHTML = '<ul class="result-list">' + lista.map(p => `
            <li><button class="result-row" type="button" data-id="${esc(p.id_paciente)}">
                <span class="avatar" aria-hidden="true">${esc(iniciales(p))}</span>
                <span class="result-info"><span class="result-name">${esc(nombreCompleto(p))}</span>
                    <span class="result-sub">${esc(p.numero_expediente)} · ${esc(calcularEdad(p.fecha_nacimiento))}</span></span>
                ${!esPsicologo() ? `<span class="result-psico">${esc(p.psicologa || 'Sin asignar')}</span>` : ''}
                <span class="pill">${esc(p.estatus)}</span>
            </button></li>`).join('') + '</ul>';
        document.querySelectorAll('.result-row').forEach(b => {
            b.onclick = () => { location.hash = '#/expediente/' + b.dataset.id; };
        });
    }

    // ---------- Expediente ----------
    async function vistaExpediente(id) {
        $('#app').innerHTML = `<button class="btn-back" id="volver" type="button">← Volver a expedientes</button>
            <section class="form-card">${estado('Cargando expediente…', '')}</section>`;
        $('#volver').onclick = () => { location.hash = '#/'; };

        let p;
        try {
            const r = await pedir('get_paciente.php?id=' + encodeURIComponent(id));
            if (r.status === 404) {
                $('#app').querySelector('.form-card').innerHTML = '<div class="empty-state" role="alert"><strong>No existe el registro</strong>El expediente que buscas no está disponible.</div>';
                return;
            }
            if (!r.ok || !r.data || !r.data.success) throw new Error('respuesta-invalida');
            p = r.data.paciente;
        } catch (err) {
            if (err.message === 'sin-sesion') return;
            console.error('Error al cargar expediente:', err);
            $('#app').querySelector('.form-card').innerHTML = errorServidor();
            return;
        }

        const dato = (etiqueta, valor) => `<div class="form-group"><span class="form-label">${etiqueta}</span><span class="data-value">${esc(valor || '—')}</span></div>`;
        $('#app').innerHTML = `
            <button class="btn-back" id="volver" type="button">← Volver a expedientes</button>
            <article class="form-card">
                <div class="exp-head">
                    <div><h1 class="page-title">${esc(nombreCompleto(p))}</h1>
                        <div class="exp-meta"><span>${esc(p.numero_expediente)}</span><span class="pill">${esc(p.estatus)}</span></div></div>
                    <a class="btn btn-primary" id="editar" href="editar-paciente.html?id=${encodeURIComponent(p.id_paciente)}">Editar</a>
                </div>
                <section class="form-section">
                    <h2 class="section-title">Datos generales</h2>
                    <div class="form-grid">
                        ${dato('Edad', calcularEdad(p.fecha_nacimiento))}
                        ${dato('Fecha de nacimiento', fmtFecha(p.fecha_nacimiento))}
                        ${dato('Estatus', p.estatus)}
                        ${dato('Psicóloga asignada', p.psicologa_nombre || 'Sin asignar')}
                        ${dato('Fecha de ingreso', fmtFecha(p.fecha_ingreso))}
                        ${dato('Tiempo en la institución', calcularAntiguedad(p.fecha_ingreso))}
                    </div>
                </section>
                <section class="form-section">
                    <h2 class="section-title">Datos del tutor y contacto</h2>
                    <div class="form-grid">
                        ${dato('Nombre del tutor', unir(p.tutor_nombres, p.tutor_primer_apellido, p.tutor_segundo_apellido))}
                        ${dato('Parentesco', p.parentesco_tutor)}
                        ${dato('Teléfono celular', fmtTel(p.telefono_principal))}
                        ${dato('Teléfono de casa', fmtTel(p.telefono_secundario))}
                        ${dato('Dirección actual', p.direccion_domicilio)}
                    </div>
                </section>
            </article>`;
        $('#volver').onclick = () => { location.hash = '#/'; };
        window.scrollTo(0, 0);
    }

    // ---------- Arranque y rutas ----------
    function enrutar() {
        const m = location.hash.match(/^#\/expediente\/(\d+)$/);
        m ? vistaExpediente(m[1]) : vistaLista();
    }

    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const r = await pedir('session.php');
            if (!r.data || !r.data.logged_in) {
                window.location.href = 'login.html';
                return;
            }
            sesion = r.data;
        } catch (err) {
            if (err.message === 'sin-sesion') return;
            console.error('No se pudo verificar la sesión:', err);
        }
        window.addEventListener('hashchange', enrutar);
        enrutar();
    });
})();
