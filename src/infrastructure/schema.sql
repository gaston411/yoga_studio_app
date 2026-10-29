-- ====================================================================
-- ESQUEMA RELACIONAL Y CONTRATO DE ESTADO - YOGA STUDIO ENGINE (ANDREA)
-- ====================================================================

-- Estudiantes
CREATE TABLE students (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paquetes activos y saldos
CREATE TABLE packages (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    total_classes INT DEFAULT 10,
    remaining_classes INT NOT NULL CHECK (remaining_classes >= 0),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXHAUSTED', 'EXPIRED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pista de auditoría de consumos (Inmutable)
CREATE TABLE package_audit_log (
    id UUID PRIMARY KEY,
    package_id UUID REFERENCES packages(id),
    delta INT NOT NULL, -- Ej: -1 por clase asistida, +1 por cancelación a tiempo
    reason VARCHAR(50) NOT NULL, -- 'CLASS_ATTENDED', 'MANUAL_ADJUSTMENT', 'LATE_CANCEL_CHARGE', 'EMERGENCY_CANCEL_REFUND', etc.
    performed_by VARCHAR(50) NOT NULL, -- 'ADMIN', 'SYSTEM'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clases / Sesiones (límite vespertino: 12 cupos)
CREATE TABLE class_sessions (
    id UUID PRIMARY KEY,
    instructor_name VARCHAR(50) NOT NULL CHECK (instructor_name IN ('Instructora 1', 'Instructora 2', 'Andrea')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    max_capacity INT DEFAULT 12,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CANCELLED', 'SUBSTITUTED'))
);

-- Reservas y Lista de Espera (FIFO)
CREATE TABLE bookings (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    booking_status VARCHAR(20) NOT NULL CHECK (booking_status IN ('CONFIRMED', 'WAITLISTED', 'CANCELLED', 'ATTENDED')),
    waitlist_position INT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);
