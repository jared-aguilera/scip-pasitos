<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth.php';

$sesion = sesion_requerida();

try {
    // Solo las columnas que usa la busqueda (el expediente completo se pide por id)
    $sql = "SELECT p.id_paciente,
                   p.numero_expediente,
                   p.nombres,
                   p.primer_apellido,
                   p.segundo_apellido,
                   p.apodo_afectivo,
                   p.fecha_nacimiento,
                   p.fecha_ingreso,
                   p.estatus,
                   p.id_psicologa,
                   TRIM(CONCAT_WS(' ', u.nombre, u.apellidos)) AS psicologa
            FROM pacientes p
            LEFT JOIN usuarios u ON u.id_usuario = p.id_psicologa";
    $params = [];

    // El Psicologo solo ve a los pacientes que tiene asignados; Administrador y Capturador ven todos
    if ($sesion['rol'] === 'Psicólogo') {
        $sql .= " WHERE p.id_psicologa = :uid";
        $params['uid'] = $sesion['id'];
    }

    $sql .= " ORDER BY p.nombres ASC, p.primer_apellido ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (PDOException $e) {
    error_log('SCIP get_pacientes: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al obtener los pacientes']);
}
