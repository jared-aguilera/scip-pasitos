USE `scip_db`;

INSERT INTO `roles` (`id_rol`, `nombre`, `descripcion`) VALUES
(1, 'Administrador', 'Control total del sistema, reportes y gestión de usuarios'),
(2, 'Psicólogo', 'Atención clínica, evaluación, planes terapéuticos y notas de sesión'),
(3, 'Capturador', 'Recepción y captura inicial de expedientes y llamadas')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

INSERT INTO `usuarios` (`id_usuario`, `id_rol`, `nombre`, `apellidos`, `email`, `password`, `telefono`, `activo`) VALUES
(1, 1, 'Susana', 'Nieves', 'direccion@pasitos.org', 'admin123', '664-111-2233', 1),
(2, 2, 'Gabriela', 'Balderas Cerón', 'g.balderas@pasitos.org', '123456', '664-222-3344', 1),
(3, 2, 'Angélica', 'Gutiérrez', 'a.gutierrez@pasitos.org', '123456', '664-333-4455', 1),
(4, 2, 'Fernanda', 'López Martínez', 'f.lopez@pasitos.org', '123456', '664-444-5566', 1),
(5, 3, 'Recepción', 'Pasitos A.C.', 'recepcion@pasitos.org', '123456', '664-555-6677', 1)
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);
