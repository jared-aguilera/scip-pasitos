// US-06: busqueda de pacientes y vista general del expediente.
// Datos de ejemplo con los mismos nombres de columna de database/schema.sql,
// para reemplazarlos despues por el endpoint (MySQL) sin tocar la interfaz.

// ---------- Datos de ejemplo (usuarios del seeds.sql) ----------
const USUARIOS = [
    { id_usuario: 5, nombre: 'Recepción', apellidos: 'Pasitos A.C.', rol: 'Capturador' },
    { id_usuario: 1, nombre: 'Susana', apellidos: 'Nieves', rol: 'Administrador' },
    { id_usuario: 2, nombre: 'Gabriela', apellidos: 'Balderas Cerón', rol: 'Psicólogo' },
    { id_usuario: 3, nombre: 'Angélica', apellidos: 'Gutiérrez', rol: 'Psicólogo' }
];

function hace(meses, dias) {
    const d = new Date();
    d.setMonth(d.getMonth() - meses);
    d.setDate(d.getDate() - (dias || 0));
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const P = (id, nombres, ap1, ap2, nac, ingreso, psic, tutor) => ({
    id_paciente: id,
    numero_expediente: 'EXP-' + String(id).padStart(4, '0'),
    nombres, primer_apellido: ap1, segundo_apellido: ap2,
    fecha_nacimiento: nac, fecha_ingreso: ingreso,
    estatus: 'Evaluación', id_psicologa: psic, tutor
});
const T = (nombres, ap1, ap2, parentesco, tel1, tel2, email, dir) => ({
    nombres, primer_apellido: ap1, segundo_apellido: ap2, parentesco,
    telefono_principal: tel1, telefono_secundario: tel2, email, direccion_domicilio: dir
});

const PACIENTES = [
    P(1, 'José Ángel', 'Hernández', 'Núñez', '2018-03-14', hace(27), 2, T('María', 'Núñez', 'Pérez', 'Madre', '6641234501', '6646001122', 'maria.nunez@correo.com', 'Calle Olivos 123, Col. Las Palmas, Tijuana')),
    P(2, 'Sofía', 'García', 'Luna', '2016-11-02', hace(5), 2, T('Roberto', 'García', 'Díaz', 'Padre', '6641234502', '', '', 'Av. Revolución 456, Zona Centro, Tijuana')),
    P(3, 'Mateo', 'Ramírez', 'Soto', '2019-07-21', hace(0, 12), 3, T('Laura', 'Soto', 'Vega', 'Madre', '6641234503', '6646003344', 'laura.soto@correo.com', 'Blvd. Salinas 78, Otay, Tijuana')),
    P(4, 'María Fernanda', 'López', 'Cota', '2015-01-30', hace(12), 3, T('Carmen', 'Cota', 'Ruiz', 'Abuela', '6641234504', '', '', 'Calle Pino 9, Col. Libertad, Tijuana')),
    P(5, 'Emiliano', 'Martínez', 'Rojas', '2017-09-09', hace(1), 2, T('Jorge', 'Martínez', 'León', 'Tutor', '6641234505', '', 'jorge.m@correo.com', 'Priv. Encino 31, Col. Mariano Matamoros, Tijuana')),
    P(6, 'Valentina', 'Núñez', 'Aguilar', '2020-05-17', hace(8, 3), 3, T('Daniela', 'Aguilar', 'Ponce', 'Madre', '6641234506', '6646005566', '', 'Calle Nogal 220, Col. Hidalgo, Tijuana')),
    P(7, 'Santiago', 'Pérez', 'Ibarra', '2014-12-25', hace(36), 2, T('Héctor', 'Pérez', 'Salas', 'Padre', '6641234507', '', 'hector.perez@correo.com', 'Av. Reforma 1500, Tijuana')),
    P(8, 'Camila', 'Gómez', 'Reyes', '2018-08-08', hace(18), 3, T('Patricia', 'Reyes', 'Mora', 'Madre', '6641234508', '6646007788', '', 'Calle Cedro 45, Col. Obrera, Tijuana')),
    P(9, 'Jose Luis', 'Hernández', 'Ortega', '2016-04-04', hace(3), 3, T('Elena', 'Ortega', 'Díaz', 'Madre', '6641234509', '', 'elena.o@correo.com', 'Calle Fresno 12, Col. Roma, Tijuana'))
];

// ---------- Utilidades ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const parseFecha = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtFecha = s => parseFecha(s).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const nombreCompleto = p => [p.nombres, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ');
const iniciales = p => (p.nombres[0] + p.primer_apellido[0]).toUpperCase();
const nombreUsuario = id => { const u = USUARIOS.find(x => x.id_usuario === id); return u ? u.nombre + ' ' + u.apellidos : 'Sin asignar'; };
const fmtTel = t => (t && t.length === 10) ? t.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') : (t || '');

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

// ---------- Sesion simulada y permisos ----------
// Usuario activo. Por ahora fijo (Capturador, igual que el navbar);
// para probar el filtro de psicologo cambia a USUARIOS[2] o USUARIOS[3].
// Despues vendra de la sesion real (session.php).
const usuario = USUARIOS[0];
let consulta = '';

// Psicologo: solo sus pacientes. Administrador y Capturador: todos.
function pacientesVisibles() {
    return usuario.rol === 'Psicólogo'
        ? PACIENTES.filter(p => p.id_psicologa === usuario.id_usuario)
        : PACIENTES;
}
function buscar(q) {
    const palabras = norm(q).split(/\s+/).filter(Boolean);
    return pacientesVisibles().filter(p => {
        const n = norm(nombreCompleto(p));
        return palabras.every(w => n.includes(w));
    });
}

// ---------- Vistas ----------
const ICONO_LUPA = '<svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

function vistaLista() {
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
            <div id="resultados"></div>
        </section>
        <p class="sim-note">${usuario.rol === 'Psicólogo' ? 'Mostrando solo tus pacientes asignados.' : 'Tienes acceso a todos los expedientes.'}</p>`;
    const q = $('#q');
    q.value = consulta;
    q.oninput = () => { consulta = q.value; pintarResultados(); };
    q.onkeydown = e => { if (e.key === 'Escape' && q.value) $('#limpiar').click(); };
    $('#limpiar').onclick = () => { q.value = ''; consulta = ''; pintarResultados(); q.focus(); };
    pintarResultados();
}

function pintarResultados() {
    const lista = buscar(consulta);
    $('#limpiar').style.display = consulta ? 'block' : 'none';
    if (!lista.length) {
        $('#conteo').textContent = '';
        $('#resultados').innerHTML = `<div class="empty-state" role="alert"><strong>No existe el registro</strong>No encontramos pacientes que coincidan con “${esc(consulta.trim())}”. Revisa el nombre o los apellidos.</div>`;
        return;
    }
    $('#conteo').textContent = (consulta.trim() ? 'Resultados: ' : 'Expedientes: ') + lista.length;
    $('#resultados').innerHTML = '<ul class="result-list">' + lista.map(p => `
        <li><button class="result-row" type="button" data-id="${p.id_paciente}">
            <span class="avatar" aria-hidden="true">${esc(iniciales(p))}</span>
            <span class="result-info"><span class="result-name">${esc(nombreCompleto(p))}</span>
                <span class="result-sub">${esc(p.numero_expediente)} · ${esc(calcularEdad(p.fecha_nacimiento))}</span></span>
            ${usuario.rol !== 'Psicólogo' ? `<span class="result-psico">${esc(nombreUsuario(p.id_psicologa))}</span>` : ''}
            <span class="pill">${esc(p.estatus)}</span>
        </button></li>`).join('') + '</ul>';
    document.querySelectorAll('.result-row').forEach(b => b.onclick = () => { location.hash = '#/expediente/' + b.dataset.id; });
}

function vistaExpediente(id) {
    const p = pacientesVisibles().find(x => x.id_paciente === id);
    if (!p) {
        $('#app').innerHTML = `<button class="btn-back" id="volver" type="button">← Volver a expedientes</button>
            <section class="form-card"><div class="empty-state" style="border:0"><strong>No existe el registro</strong>El expediente que buscas no está disponible.</div></section>`;
        $('#volver').onclick = () => { location.hash = '#/'; };
        return;
    }
    const t = p.tutor;
    const dato = (etiqueta, valor, ancho) => `<div class="form-group${ancho ? ' col-span-3' : ''}"><span class="form-label">${etiqueta}</span><span class="data-value">${esc(valor || '—')}</span></div>`;
    $('#app').innerHTML = `
        <button class="btn-back" id="volver" type="button">← Volver a expedientes</button>
        <article class="form-card">
            <div class="exp-head">
                <div><h1 class="page-title">${esc(nombreCompleto(p))}</h1>
                    <div class="exp-meta"><span>${esc(p.numero_expediente)}</span><span class="pill">${esc(p.estatus)}</span></div></div>
                <button class="btn btn-primary" id="editar" type="button">Editar</button>
            </div>
            <section class="form-section">
                <h2 class="section-title">Datos generales</h2>
                <div class="form-grid">
                    ${dato('Edad', calcularEdad(p.fecha_nacimiento))}
                    ${dato('Fecha de nacimiento', fmtFecha(p.fecha_nacimiento))}
                    ${dato('Estatus', p.estatus)}
                    ${dato('Psicóloga asignada', nombreUsuario(p.id_psicologa))}
                    ${dato('Fecha de ingreso', fmtFecha(p.fecha_ingreso))}
                    ${dato('Tiempo en la institución', calcularAntiguedad(p.fecha_ingreso))}
                </div>
            </section>
            <section class="form-section">
                <h2 class="section-title">Datos del tutor y contacto</h2>
                <div class="form-grid">
                    ${dato('Nombre del tutor', [t.nombres, t.primer_apellido, t.segundo_apellido].filter(Boolean).join(' '))}
                    ${dato('Parentesco', t.parentesco)}
                    ${dato('Correo electrónico', t.email)}
                    ${dato('Teléfono celular', fmtTel(t.telefono_principal))}
                    ${dato('Teléfono de casa', fmtTel(t.telefono_secundario))}
                    ${dato('Dirección actual', t.direccion_domicilio)}
                </div>
            </section>
        </article>`;
    $('#volver').onclick = () => { location.hash = '#/'; };
    $('#editar').onclick = () => avisar('La edición del expediente se conectará en su historia de usuario.');
    window.scrollTo(0, 0);
}

let temporizador;
function avisar(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { t.hidden = true; }, 3200);
}

function enrutar() {
    const m = location.hash.match(/^#\/expediente\/(\d+)$/);
    m ? vistaExpediente(Number(m[1])) : vistaLista();
}
window.addEventListener('hashchange', enrutar);
document.addEventListener('DOMContentLoaded', enrutar);
