<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../db.php';

try {
    // Solo las columnas que usa la busqueda (los expedientes completos se piden por id)
    $stmt = $pdo->query("
        SELECT p.id_paciente,
               p.numero_expediente,
               p.nombres,
               p.primer_apellido,
               p.segundo_apellido,
               p.apodo_afectivo,
               p.fecha_nacimiento,
               p.estatus,
               TRIM(CONCAT_WS(' ', u.nombre, u.apellidos)) AS psicologa
        FROM pacientes p
        LEFT JOIN usuarios u ON u.id_usuario = p.id_psicologa
        ORDER BY p.id_paciente ASC
    ");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (PDOException $e) {
    error_log('SCIP get_pacientes: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al obtener los pacientes']);
}
