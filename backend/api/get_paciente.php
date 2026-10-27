<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth.php';

$sesion = sesion_requerida();

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de paciente no recibido o invalido']);
    exit;
}

// El Psicologo solo puede abrir expedientes de pacientes asignados a el
$filtroPsicologo = '';
$params = ['id' => $id];
if ($sesion['rol'] === 'Psicólogo') {
    $filtroPsicologo = 'AND p.id_psicologa = :uid';
    $params['uid'] = $sesion['id'];
}

try {
    $sql = "SELECT p.*,
                   -- Datos del tutor (alias iguales a los id/name de editar-paciente.html)
                   t.nombres AS tutor_nombres,
                   t.primer_apellido AS tutor_primer_apellido,
                   t.segundo_apellido AS tutor_segundo_apellido,
                   t.parentesco AS parentesco_tutor,
                   t.telefono_principal AS telefono_principal,
                   t.telefono_secundario AS telefono_secundario,
                   t.email AS email_tutor,
                   t.direccion_domicilio AS direccion_domicilio,

                   -- Datos medicos
                   dm.toma_medicamento,
                   dm.detalle_medicamento,
                   dm.alergias,
                   dm.problemas_asociados,
                   dm.medico_neurologo_nombre,
                   dm.medico_neurologo_telefono,

                   -- Psicologa asignada (para mostrar en el expediente)
                   TRIM(CONCAT_WS(' ', u.nombre, u.apellidos)) AS psicologa_nombre

            FROM pacientes p
            LEFT JOIN paciente_tutor pt ON p.id_paciente = pt.id_paciente
            LEFT JOIN tutores t ON pt.id_tutor = t.id_tutor
            LEFT JOIN datos_medicos_paciente dm ON p.id_paciente = dm.id_paciente
            LEFT JOIN usuarios u ON u.id_usuario = p.id_psicologa
            WHERE p.id_paciente = :id {$filtroPsicologo}
            ORDER BY pt.es_contacto_principal DESC, pt.id_paciente_tutor ASC
            LIMIT 1";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $paciente = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($paciente) {
        echo json_encode(['success' => true, 'paciente' => $paciente]);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Paciente no encontrado']);
    }
} catch (PDOException $e) {
    error_log('SCIP get_paciente: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de base de datos']);
}
