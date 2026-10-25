<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once __DIR__ . '/../db.php';

try {
    $stmt = $pdo->query("
        SELECT u.id_usuario, u.nombre, u.apellidos 
        FROM usuarios u 
        INNER JOIN roles r ON u.id_rol = r.id_rol 
        WHERE (r.nombre LIKE '%Psic%' OR u.id_rol = 2) AND u.activo = 1 
        ORDER BY u.nombre ASC
    ");
    $psicologas = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $psicologas
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener psicologas: ' . $e->getMessage()
    ]);
}
