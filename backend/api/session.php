<?php
session_start();
header("Content-Type: application/json");

if (isset($_SESSION['usuario_id'])) {
    echo json_encode([
        "logged_in"  => true,
        "rol"        => $_SESSION['rol'],
        "usuario_id" => (int)$_SESSION['usuario_id'],
        "nombre"     => $_SESSION['nombre'] ?? ''
    ]);
} else {
    echo json_encode(["logged_in" => false]);
}
