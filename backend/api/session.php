<?php
session_start();
header("Content-Type: application/json");

if (isset($_SESSION['usuario_id'])) {
    echo json_encode(["logged_in" => true, "rol" => $_SESSION['rol']]);
} else {
    echo json_encode(["logged_in" => false]);
}