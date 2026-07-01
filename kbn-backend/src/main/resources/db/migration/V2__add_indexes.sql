-- Performance indexes to eliminate full table scans on frequently queried foreign keys and filter columns.
-- Resolves N+1 query bottlenecks identified on /usuario, /administracion/roles, and /api/agenda/listar.

CREATE INDEX idx_usuario_role_id ON usuario(role_id);
CREATE INDEX idx_agenda_instructor_id ON agenda(instructor_id);
CREATE INDEX idx_agenda_estado ON agenda(estado);
