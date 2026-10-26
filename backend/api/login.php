<?php
session_start();
header("Content-Type: application/json");

// Recibir los datos enviados desde el frontend
$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

if (empty($email) || empty($password)) {
    echo json_encode(["success" => false, "message" => "Faltan credenciales."]);
    exit;
}

try {
    // Conexion a la base de datos
    $pdo = new PDO("mysql:host=localhost;dbname=scip_db;charset=utf8mb4", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Buscar al usuario cruzando la tabla usuarios con roles
    $stmt = $pdo->prepare("
        SELECT u.id_usuario, u.password, u.nombre, r.nombre AS rol_nombre 
        FROM usuarios u 
        INNER JOIN roles r ON u.id_rol = r.id_rol 
        WHERE u.email = :email AND u.activo = 1
    ");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Validar credenciales encriptadas
    // Verificacion temporal en texto plano para el Sprint 1
    if ($user && $password === $user['password']) {
        
        // Guardar sesion
        $_SESSION['usuario_id'] = $user['id_usuario'];
        $_SESSION['rol'] = $user['rol_nombre'];
        
        echo json_encode([
            "success" => true, 
            "rol" => $user['rol_nombre']
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Credenciales invalidas"]);
    }
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Credenciales invalidas"]);
}