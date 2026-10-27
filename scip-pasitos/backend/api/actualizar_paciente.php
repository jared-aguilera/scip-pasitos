<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../db.php';

function responder(bool $ok, string $mensaje, int $codigo = 200): void
{
    http_response_code($codigo);
    echo json_encode(['success' => $ok, 'message' => $mensaje]);
    exit;
}

// Texto recortado; cadena vacia -> null
function campo(string $nombre): ?string
{
    $v = trim((string)($_POST[$nombre] ?? ''));
    return $v === '' ? null : $v;
}

// Solo digitos; vacio -> null
function telefono(string $nombre): ?string
{
    $v = preg_replace('/\D/', '', (string)($_POST[$nombre] ?? ''));
    return $v === '' ? null : $v;
}

function fechaValida(?string $f): bool
{
    if ($f === null) return false;
    $d = DateTime::createFromFormat('Y-m-d', $f);
    return $d && $d->format('Y-m-d') === $f;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(false, 'Método no permitido', 405);
}

$id_paciente = filter_input(INPUT_POST, 'id_paciente', FILTER_VALIDATE_INT);
if (!$id_paciente) {
    responder(false, 'ID de paciente no recibido', 400);
}

// ---------- Lectura y validacion ----------
$estatusValidos = ['Evaluación', 'Terapia', 'Pausado', 'Egresado'];
$sexosValidos   = ['Masculino', 'Femenino', 'Otro'];
$hoy            = date('Y-m-d');

$estatus          = campo('estatus');
$fecha_ingreso    = campo('fecha_ingreso');
$nombres          = campo('nombres');
$primer_apellido  = campo('primer_apellido');
$fecha_nacimiento = campo('fecha_nacimiento');
$sexo             = campo('sexo');
$motivo_cambio    = campo('motivo_cambio');

$tutor_nombres         = campo('tutor_nombres');
$tutor_primer_apellido = campo('tutor_primer_apellido');
$parentesco_tutor      = campo('parentesco_tutor');
$telefono_principal    = telefono('telefono_principal');
$telefono_secundario   = telefono('telefono_secundario');
$medico_telefono       = telefono('medico_neurologo_telefono');
$email_tutor           = campo('email_tutor');

if (!$nombres || !$primer_apellido || !$tutor_nombres || !$tutor_primer_apellido || !$parentesco_tutor || !$telefono_principal) {
    responder(false, 'Faltan campos obligatorios (*)', 422);
}
if (!in_array($estatus, $estatusValidos, true)) {
    responder(false, 'Estatus no válido', 422);
}
if (!in_array($sexo, $sexosValidos, true)) {
    responder(false, 'Sexo no válido', 422);
}
if (!fechaValida($fecha_ingreso) || !fechaValida($fecha_nacimiento)) {
    responder(false, 'Las fechas no son válidas', 422);
}
if ($fecha_nacimiento > $hoy) {
    responder(false, 'La fecha de nacimiento no puede ser futura', 422);
}
foreach ([$telefono_principal, $telefono_secundario, $medico_telefono] as $tel) {
    if ($tel !== null && strlen($tel) !== 10) {
        responder(false, 'Los teléfonos deben tener exactamente 10 dígitos', 422);
    }
}
if ($email_tutor !== null && !filter_var($email_tutor, FILTER_VALIDATE_EMAIL)) {
    responder(false, 'El correo electrónico no es válido', 422);
}

$id_psicologa    = filter_input(INPUT_POST, 'id_psicologa', FILTER_VALIDATE_INT) ?: null;
$tomaMedicamento = (($_POST['toma_medicamento'] ?? '') === 'si') ? 1 : 0;
$detalleMed      = $tomaMedicamento ? campo('detalle_medicamento') : null;

try {
    $pdo->beginTransaction();

    // 0. El paciente debe existir; se bloquea la fila y se lee el estatus actual
    $stmtActual = $pdo->prepare("SELECT estatus FROM pacientes WHERE id_paciente = :id FOR UPDATE");
    $stmtActual->execute(['id' => $id_paciente]);
    $actual = $stmtActual->fetch(PDO::FETCH_ASSOC);

    if (!$actual) {
        $pdo->rollBack();
        responder(false, 'Paciente no encontrado', 404);
    }

    $cambioEstatus = $actual['estatus'] !== $estatus;
    if ($cambioEstatus && $motivo_cambio === null) {
        $pdo->rollBack();
        responder(false, 'Indica el motivo del cambio de estatus', 422);
    }

    // 1. Paciente
    $stmtP = $pdo->prepare("UPDATE pacientes SET
                                fecha_ingreso = :fecha_ingreso,
                                estatus = :estatus,
                                nombres = :nombres,
                                primer_apellido = :primer_apellido,
                                segundo_apellido = :segundo_apellido,
                                apodo_afectivo = :apodo_afectivo,
                                fecha_nacimiento = :fecha_nacimiento,
                                sexo = :sexo,
                                id_psicologa = :id_psicologa,
                                escolaridad = :escolaridad,
                                escuela_procedencia = :escuela_procedencia,
                                motivo_consulta = :motivo_consulta
                            WHERE id_paciente = :id_paciente");
    $stmtP->execute([
        'fecha_ingreso'       => $fecha_ingreso,
        'estatus'             => $estatus,
        'nombres'             => $nombres,
        'primer_apellido'     => $primer_apellido,
        'segundo_apellido'    => campo('segundo_apellido'),
        'apodo_afectivo'      => campo('apodo_afectivo'),
        'fecha_nacimiento'    => $fecha_nacimiento,
        'sexo'                => $sexo,
        'id_psicologa'        => $id_psicologa,
        'escolaridad'         => campo('escolaridad'),
        'escuela_procedencia' => campo('escuela_procedencia'),
        'motivo_consulta'     => campo('motivo_consulta'),
        'id_paciente'         => $id_paciente
    ]);

    // 1b. Historial de cambios de estatus
    if ($cambioEstatus) {
        $stmtH = $pdo->prepare("INSERT INTO historial_estatus_paciente
                                    (id_paciente, estatus_anterior, estatus_nuevo, motivo_cambio)
                                VALUES (:id, :anterior, :nuevo, :motivo)");
        $stmtH->execute([
            'id'       => $id_paciente,
            'anterior' => $actual['estatus'],
            'nuevo'    => $estatus,
            'motivo'   => $motivo_cambio
        ]);
    }

    // 2. Tutor (contacto principal). Si el paciente no tenia tutor, se crea.
    $stmtRel = $pdo->prepare("SELECT id_tutor FROM paciente_tutor
                              WHERE id_paciente = :id_paciente
                              ORDER BY es_contacto_principal DESC, id_paciente_tutor ASC
                              LIMIT 1");
    $stmtRel->execute(['id_paciente' => $id_paciente]);
    $rel = $stmtRel->fetch(PDO::FETCH_ASSOC);

    $datosTutor = [
        'nombres'             => $tutor_nombres,
        'primer_apellido'     => $tutor_primer_apellido,
        'segundo_apellido'    => campo('tutor_segundo_apellido'),
        'parentesco'          => $parentesco_tutor,
        'telefono_principal'  => $telefono_principal,
        'telefono_secundario' => $telefono_secundario,
        'email'               => $email_tutor,
        'direccion_domicilio' => campo('direccion_domicilio')
    ];

    if ($rel && !empty($rel['id_tutor'])) {
        $stmtT = $pdo->prepare("UPDATE tutores SET
                                    nombres = :nombres,
                                    primer_apellido = :primer_apellido,
                                    segundo_apellido = :segundo_apellido,
                                    parentesco = :parentesco,
                                    telefono_principal = :telefono_principal,
                                    telefono_secundario = :telefono_secundario,
                                    email = :email,
                                    direccion_domicilio = :direccion_domicilio
                                WHERE id_tutor = :id_tutor");
        $stmtT->execute($datosTutor + ['id_tutor' => $rel['id_tutor']]);
    } else {
        $stmtT = $pdo->prepare("INSERT INTO tutores
                                    (nombres, primer_apellido, segundo_apellido, parentesco,
                                     telefono_principal, telefono_secundario, email, direccion_domicilio)
                                VALUES
                                    (:nombres, :primer_apellido, :segundo_apellido, :parentesco,
                                     :telefono_principal, :telefono_secundario, :email, :direccion_domicilio)");
        $stmtT->execute($datosTutor);
        $id_tutor = $pdo->lastInsertId();

        $stmtNuevaRel = $pdo->prepare("INSERT INTO paciente_tutor
                                           (id_paciente, id_tutor, es_contacto_principal, es_contacto_emergencia, vive_con_paciente)
                                       VALUES (:id_paciente, :id_tutor, 1, 0, 1)");
        $stmtNuevaRel->execute(['id_paciente' => $id_paciente, 'id_tutor' => $id_tutor]);
    }

    // 3. Datos medicos (se crean si todavia no existian)
    $stmtM = $pdo->prepare("INSERT INTO datos_medicos_paciente
                                (id_paciente, toma_medicamento, detalle_medicamento, alergias,
                                 problemas_asociados, medico_neurologo_nombre, medico_neurologo_telefono)
                            VALUES
                                (:id_paciente, :toma_medicamento, :detalle_medicamento, :alergias,
                                 :problemas_asociados, :medico_nombre, :medico_telefono)
                            ON DUPLICATE KEY UPDATE
                                toma_medicamento = VALUES(toma_medicamento),
                                detalle_medicamento = VALUES(detalle_medicamento),
                                alergias = VALUES(alergias),
                                problemas_asociados = VALUES(problemas_asociados),
                                medico_neurologo_nombre = VALUES(medico_neurologo_nombre),
                                medico_neurologo_telefono = VALUES(medico_neurologo_telefono)");
    $stmtM->execute([
        'id_paciente'         => $id_paciente,
        'toma_medicamento'    => $tomaMedicamento,
        'detalle_medicamento' => $detalleMed,
        'alergias'            => campo('alergias'),
        'problemas_asociados' => campo('problemas_asociados'),
        'medico_nombre'       => campo('medico_neurologo_nombre'),
        'medico_telefono'     => $medico_telefono
    ]);

    $pdo->commit();

    responder(true, 'Paciente actualizado correctamente');

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('SCIP actualizar_paciente: ' . $e->getMessage());
    responder(false, 'Error al actualizar el paciente', 500);
}
