CREATE DATABASE IF NOT EXISTS `scip_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `scip_db`;

CREATE TABLE IF NOT EXISTS `roles` (
    `id_rol` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(50) NOT NULL UNIQUE,
    `descripcion` VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `usuarios` (
    `id_usuario` INT AUTO_INCREMENT PRIMARY KEY,
    `id_rol` INT NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `apellidos` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `password` VARCHAR(100) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `activo` TINYINT(1) DEFAULT 1,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`id_rol`) REFERENCES `roles`(`id_rol`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `pacientes` (
    `id_paciente` INT AUTO_INCREMENT PRIMARY KEY,
    `numero_expediente` VARCHAR(30) NOT NULL UNIQUE,
    `nombres` VARCHAR(100) NOT NULL,
    `primer_apellido` VARCHAR(80) NOT NULL,
    `segundo_apellido` VARCHAR(80) NULL,
    `apodo_afectivo` VARCHAR(100) NULL,
    `fecha_nacimiento` DATE NOT NULL,
    `sexo` ENUM('Masculino', 'Femenino', 'Otro') NOT NULL,
    `escolaridad` VARCHAR(100) NULL,
    `escuela_procedencia` VARCHAR(150) NULL,
    `estatus` ENUM('Evaluación', 'Terapia', 'Pausado', 'Egresado') DEFAULT 'Evaluación' NOT NULL,
    `fecha_ingreso` DATE NOT NULL,
    `id_psicologa` INT NULL,
    `motivo_consulta` TEXT NULL,
    `servicio_solicitado` VARCHAR(100) NULL,
    `actividades_extraescolares` TEXT NULL,
    `id_creador` INT NULL,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`id_psicologa`) REFERENCES `usuarios`(`id_usuario`) ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (`id_creador`) REFERENCES `usuarios`(`id_usuario`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `tutores` (
    `id_tutor` INT AUTO_INCREMENT PRIMARY KEY,
    `nombres` VARCHAR(100) NOT NULL,
    `primer_apellido` VARCHAR(80) NOT NULL,
    `segundo_apellido` VARCHAR(80) NULL,
    `parentesco` VARCHAR(50) NOT NULL,
    `telefono_principal` VARCHAR(20) NOT NULL,
    `telefono_secundario` VARCHAR(20) NULL,
    `email` VARCHAR(120) NULL,
    `direccion_domicilio` VARCHAR(255) NULL,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `paciente_tutor` (
    `id_paciente_tutor` INT AUTO_INCREMENT PRIMARY KEY,
    `id_paciente` INT NOT NULL,
    `id_tutor` INT NOT NULL,
    `es_contacto_principal` TINYINT(1) DEFAULT 1,
    `es_contacto_emergencia` TINYINT(1) DEFAULT 0,
    `vive_con_paciente` TINYINT(1) DEFAULT 1,
    FOREIGN KEY (`id_paciente`) REFERENCES `pacientes`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`id_tutor`) REFERENCES `tutores`(`id_tutor`) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY `uq_paciente_tutor` (`id_paciente`, `id_tutor`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `datos_medicos_paciente` (
    `id_dato_medico` INT AUTO_INCREMENT PRIMARY KEY,
    `id_paciente` INT NOT NULL UNIQUE,
    `toma_medicamento` TINYINT(1) DEFAULT 0,
    `detalle_medicamento` TEXT NULL,
    `alergias` TEXT NULL,
    `problemas_asociados` TEXT NULL,
    `medico_neurologo_nombre` VARCHAR(150) NULL,
    `medico_neurologo_telefono` VARCHAR(20) NULL,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`id_paciente`) REFERENCES `pacientes`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `historial_estatus_paciente` (
    `id_historial` INT AUTO_INCREMENT PRIMARY KEY,
    `id_paciente` INT NOT NULL,
    `estatus_anterior` VARCHAR(50) NULL,
    `estatus_nuevo` VARCHAR(50) NOT NULL,
    `motivo_cambio` VARCHAR(255) NULL,
    `id_usuario` INT NULL,
    `fecha_cambio` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`id_paciente`) REFERENCES `pacientes`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;
