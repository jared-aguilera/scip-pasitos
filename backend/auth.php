<?php
// Utilidades de sesion compartidas por los endpoints.
// Uso: $sesion = sesion_requerida();  ->  ['id' => int, 'rol' => string]
function sesion_requerida(): array
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (!isset($_SESSION['usuario_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Sesión no iniciada']);
        exit;
    }

    return [
        'id'  => (int)$_SESSION['usuario_id'],
        'rol' => (string)($_SESSION['rol'] ?? '')
    ];
}
