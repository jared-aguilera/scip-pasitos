<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../db.php';

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos vacios o invalidos']);
    exit;
}

// Validar campos obligatorios
$nombres = trim($data['nombres'] ?? '');
$primer_apellido = trim($data['primer_apellido'] ?? '');
$segundo_apellido = trim($data['segundo_apellido'] ?? '');
$fecha_nacimiento = trim($data['fecha_nacimiento'] ?? '');
$sexo = trim($data['sexo'] ?? 'Masculino');
$fecha_ingreso = !empty($data['fecha_ingreso']) ? trim($data['fecha_ingreso']) : date('Y-m-d');

// Datos del tutor
$nombre_tutor = trim($data['nombre_tutor'] ?? '');
$primer_apellido_tutor = trim($data['primer_apellido_tutor'] ?? '');
$segundo_apellido_tutor = trim($data['segundo_apellido_tutor'] ?? '');
$parentesco_tutor = trim($data['parentesco_tutor'] ?? 'Madre');

// Telefonos
$telefono_principal = preg_replace('/\D/', '', trim($data['telefono_principal'] ?? ''));
$telefono_secundario = !empty($data['telefono_secundario']) ? preg_replace('/\D/', '', trim($data['telefono_secundario'])) : null;
$medico_telefono = !empty($data['medico_neurologo_telefono']) ? preg_replace('/\D/', '', trim($data['medico_neurologo_telefono'])) : null;

if (empty($nombres) || empty($primer_apellido) || empty($fecha_nacimiento) || empty($nombre_tutor) || empty($primer_apellido_tutor) || empty($telefono_principal)) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Faltan campos obligatorios (*)'
    ]);
    exit;
}

if (strlen($telefono_principal) !== 10) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'El teléfono celular del tutor debe tener exactamente 10 dígitos'
    ]);
    exit;
}

try {
    $pdo->beginTransaction();

    // Generar numero de expediente
    $year = date('Y');
    $stmtCount = $pdo->query("SELECT COUNT(*) AS total FROM pacientes");
    $total = $stmtCount->fetch()['total'] + 1;
    $numero_expediente = sprintf("EXP-%s-%03d", $year, $total);

    // Insertar paciente
    $sqlPaciente = "
        INSERT INTO pacientes (
            numero_expediente, nombres, primer_apellido, segundo_apellido,
            apodo_afectivo, fecha_nacimiento, sexo, escolaridad, escuela_procedencia,
            estatus, fecha_ingreso, id_psicologa, motivo_consulta
        ) VALUES (
            :expediente, :nombres, :primer_apellido, :segundo_apellido,
            :apodo, :nacimiento, :sexo, :escolaridad, :escuela,
            'Evaluación', :ingreso, :psicologa, :motivo
        )
    ";

    $stmtPaciente = $pdo->prepare($sqlPaciente);
    $stmtPaciente->execute([
        ':expediente' => $numero_expediente,
        ':nombres' => $nombres,
        ':primer_apellido' => $primer_apellido,
        ':segundo_apellido' => !empty($segundo_apellido) ? $segundo_apellido : null,
        ':apodo' => !empty($data['apodo_afectivo']) ? trim($data['apodo_afectivo']) : null,
        ':nacimiento' => $fecha_nacimiento,
        ':sexo' => $sexo,
        ':escolaridad' => !empty($data['escolaridad']) ? trim($data['escolaridad']) : null,
        ':escuela' => !empty($data['escuela_procedencia']) ? trim($data['escuela_procedencia']) : null,
        ':ingreso' => $fecha_ingreso,
        ':psicologa' => !empty($data['id_psicologa']) ? intval($data['id_psicologa']) : null,
        ':motivo' => !empty($data['motivo_consulta']) ? trim($data['motivo_consulta']) : null
    ]);

    $id_paciente = $pdo->lastInsertId();

    // Insertar tutor
    $sqlTutor = "
        INSERT INTO tutores (
            nombres, primer_apellido, segundo_apellido, parentesco, telefono_principal, telefono_secundario, email, direccion_domicilio
        ) VALUES (
            :nombres, :primer_apellido, :segundo_apellido, :parentesco, :telefono, :telefono_secundario, :email, :direccion
        )
    ";

    $stmtTutor = $pdo->prepare($sqlTutor);
    $stmtTutor->execute([
        ':nombres' => $nombre_tutor,
        ':primer_apellido' => $primer_apellido_tutor,
        ':segundo_apellido' => !empty($segundo_apellido_tutor) ? $segundo_apellido_tutor : null,
        ':parentesco' => $parentesco_tutor,
        ':telefono' => $telefono_principal,
        ':telefono_secundario' => $telefono_secundario,
        ':email' => !empty($data['email_tutor']) ? trim($data['email_tutor']) : null,
        ':direccion' => !empty($data['direccion_domicilio']) ? trim($data['direccion_domicilio']) : null
    ]);

    $id_tutor = $pdo->lastInsertId();

    // Relacionar paciente con tutor
    $sqlRel = "
        INSERT INTO paciente_tutor (id_paciente, id_tutor, es_contacto_principal, es_contacto_emergencia, vive_con_paciente)
        VALUES (:id_paciente, :id_tutor, 1, 0, 1)
    ";
    $stmtRel = $pdo->prepare($sqlRel);
    $stmtRel->execute([
        ':id_paciente' => $id_paciente,
        ':id_tutor' => $id_tutor
    ]);

    // Insertar datos medicos
    $sqlMedicos = "
        INSERT INTO datos_medicos_paciente (
            id_paciente, toma_medicamento, detalle_medicamento, alergias, problemas_asociados,
            medico_neurologo_nombre, medico_neurologo_telefono
        ) VALUES (
            :id_paciente, :toma_medicamento, :detalle_medicamento, :alergias, :problemas_asociados,
            :medico_nombre, :medico_telefono
        )
    ";

    $stmtMedicos = $pdo->prepare($sqlMedicos);
    $stmtMedicos->execute([
        ':id_paciente' => $id_paciente,
        ':toma_medicamento' => (!empty($data['toma_medicamento']) && $data['toma_medicamento'] === 'si') ? 1 : 0,
        ':detalle_medicamento' => !empty($data['detalle_medicamento']) ? trim($data['detalle_medicamento']) : null,
        ':alergias' => !empty($data['alergias']) ? trim($data['alergias']) : null,
        ':problemas_asociados' => !empty($data['problemas_asociados']) ? trim($data['problemas_asociados']) : null,
        ':medico_nombre' => !empty($data['medico_neurologo_nombre']) ? trim($data['medico_neurologo_nombre']) : null,
        ':medico_telefono' => $medico_telefono
    ]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Paciente registrado exitosamente',
        'numero_expediente' => $numero_expediente
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar: ' . $e->getMessage()
    ]);
}
