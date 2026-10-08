package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Agenda;
import com.kbn_backend.kbn_backend.model.PagoPasivo;
import com.kbn_backend.kbn_backend.model.Pasivo;
import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.repository.AgendaRepository;
import com.kbn_backend.kbn_backend.repository.PagoPasivoRepository;
import com.kbn_backend.kbn_backend.repository.PasivoRepository;
import com.kbn_backend.kbn_backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.kbn_backend.kbn_backend.service.PushNotificationService;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "https://kbn-admin.vercel.app", allowCredentials = "true")
@RequestMapping("/api/agenda")
public class AgendaController {

    @Autowired
    private AgendaRepository agendaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasivoRepository pasivoRepository;

    @Autowired
    private PagoPasivoRepository pagoPasivoRepository;

    @Autowired
    private PushNotificationService pushService;

    // ── Helper: tarifa/hora del instructor desde su pasivo ───────────────────
    // El campo descripcion tiene el formato: "__tarifa__:120||Nombre Instructor"
    private static final String TARIFA_PREFIX = "__tarifa__:";

    private Double extraerTarifaHora(String descripcion) {
        if (descripcion == null || !descripcion.startsWith(TARIFA_PREFIX)) return null;
        try {
            String sin = descripcion.substring(TARIFA_PREFIX.length());
            int sep = sin.indexOf("||");
            String valorStr = sep >= 0 ? sin.substring(0, sep) : sin;
            return Double.parseDouble(valorStr.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private String normalizarNombre(String s) {
        return s == null ? "" : s.toLowerCase().replaceAll("\\s+", " ").trim();
    }

    // 1. Crear nueva cita (Secretaria)
    @PostMapping("/crear")
    public ResponseEntity<?> crearAgenda(@RequestBody Agenda agenda) {
        try {
            // Instructor es opcional — se puede asignar después editando la clase
            if (agenda.getInstructorId() != null) {
                Optional<Usuario> instructorOpt = usuarioRepository.findById(agenda.getInstructorId());
                if (instructorOpt.isEmpty()) {
                    return ResponseEntity.badRequest().body("Instructor no encontrado");
                }
                Usuario instructor = instructorOpt.get();
                agenda.setNombreInstructor(instructor.getNombre() + " " + instructor.getApellido());

                // Push de nueva clase al instructor
                Agenda nuevaAgenda = agendaRepository.save(agenda);
                nuevaAgenda.setEstado("PENDIENTE");
                agendaRepository.save(nuevaAgenda);

                String titulo = "📅 Nueva clase asignada";
                String cuerpo = String.format(
                        "%s — %s a las %s hs en %s",
                        nuevaAgenda.getAlumno(),
                        nuevaAgenda.getFecha().toString(),
                        nuevaAgenda.getHora() != null ? nuevaAgenda.getHora().toString().substring(0, 5) : "??",
                        nuevaAgenda.getLugar() != null ? nuevaAgenda.getLugar() : "Sin lugar"
                );
                pushService.enviarNotificacion(nuevaAgenda.getInstructorId(), titulo, cuerpo, "/#/instructor");
                return ResponseEntity.ok(nuevaAgenda);

            } else {
                // Sin instructor: guardar sin push, estado PENDIENTE
                agenda.setNombreInstructor(null);
                agenda.setEstado("PENDIENTE");
                return ResponseEntity.ok(agendaRepository.save(agenda));
            }

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Error al crear agenda: " + e.getMessage());
        }
    }

    // 2. Listar todas (Secretaria / Admin)
    @GetMapping("/listar")
    public List<Agenda> listarTodas() {
        return agendaRepository.findAll();
    }

    // 3. Listar por Instructor
    @GetMapping("/instructor/{id}")
    public List<Agenda> listarPorInstructor(@PathVariable Long id) {
        return agendaRepository.findByInstructorId(id);
    }

    // 4. Cambiar estado
    @PutMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(
            @PathVariable Long id,
            @RequestBody String nuevoEstado
    ) {
        return agendaRepository.findById(id).map(agenda -> {

            String estadoLimpio = nuevoEstado
                    .replace("\"", "")
                    .replace("{", "")
                    .replace("}", "")
                    .replace("estado:", "")
                    .trim();

            agenda.setEstado(estadoLimpio);
            agendaRepository.save(agenda);

            return ResponseEntity.ok("Estado actualizado a " + estadoLimpio);

        }).orElse(ResponseEntity.notFound().build());
    }

    // 4b. LIQUIDAR clase — solo secretaria/admin lo llama después de revisar el día.
    //     Acumula en el pasivo del instructor las horas correspondientes.
    //     Marca la clase como FINALIZADA para que no se pueda liquidar dos veces.
    /**
     * Deshace la liquidación de una clase: borra el movimiento que se le había
     * acreditado al instructor y recalcula el saldo de su tarjeta.
     *
     * Se usa cuando se edita el instructor o las horas de una clase ya
     * liquidada: lo acreditado quedó mal y hay que rehacerlo.
     */
    private int revertirLiquidacion(Long agendaId) {
        if (agendaId == null) return 0;
        List<PagoPasivo> previos = pagoPasivoRepository.findByOrigenAgendaId(agendaId);
        if (previos.isEmpty()) return 0;

        int borrados = 0;
        for (PagoPasivo mov : previos) {
            Pasivo pasivo = mov.getPasivo();
            if (pasivo == null) continue;
            // Con cascade + orphanRemoval, sacarlo de la colección del padre
            // es lo que dispara el DELETE real.
            final Long movId = mov.getId();
            int antes = pasivo.getHistorialPagos().size();
            pasivo.getHistorialPagos().removeIf(x -> movId.equals(x.getId()));
            borrados += antes - pasivo.getHistorialPagos().size();

            double total = 0;
            for (PagoPasivo p : pasivo.getHistorialPagos()) {
                total += p.getMontoPagado() != null ? p.getMontoPagado() : 0;
            }
            pasivo.setMontoTotal(Math.round(total * 100.0) / 100.0);
            pasivoRepository.save(pasivo);
        }
        return borrados;
    }

    @PostMapping("/{id}/liquidar")
    public ResponseEntity<?> liquidarClase(@PathVariable Long id) {
        return agendaRepository.findById(id).map(agenda -> {

            // Guardia: ya fue liquidada
            if ("FINALIZADA".equals(agenda.getEstado())) {
                return ResponseEntity.badRequest().body("Esta clase ya fue liquidada.");
            }

            // Guardia: necesita instructor y horas
            if (agenda.getNombreInstructor() == null || agenda.getNombreInstructor().isBlank()) {
                return ResponseEntity.badRequest().body("La clase no tiene instructor asignado.");
            }
            if (agenda.getHoras() == null || agenda.getHoras() <= 0) {
                return ResponseEntity.badRequest().body("La clase no tiene horas registradas.");
            }

            // Buscar tarjeta de pasivo del instructor
            String normInstructor = normalizarNombre(agenda.getNombreInstructor());
            Optional<Pasivo> pasivoOpt = pasivoRepository.findAll().stream()
                    .filter(p -> normalizarNombre(p.getTitulo()).equals(normInstructor))
                    .findFirst();

            if (pasivoOpt.isEmpty()) {
                // No tiene tarjeta → igual marcar FINALIZADA, solo avisar
                agenda.setEstado("FINALIZADA");
                agendaRepository.save(agenda);
                return ResponseEntity.ok(java.util.Map.of(
                    "estado", "FINALIZADA",
                    "aviso", "Clase marcada como finalizada, pero " + agenda.getNombreInstructor() + " no tiene tarjeta de pasivo."
                ));
            }

            Pasivo pasivo = pasivoOpt.get();
            Double tarifaHora = extraerTarifaHora(pasivo.getDescripcion());

            if (tarifaHora == null) {
                agenda.setEstado("FINALIZADA");
                agendaRepository.save(agenda);
                return ResponseEntity.ok(java.util.Map.of(
                    "estado", "FINALIZADA",
                    "aviso", "Clase finalizada, pero no se encontró tarifa en la tarjeta de " + agenda.getNombreInstructor() + "."
                ));
            }

            // Calcular y acumular deuda
            double horas    = agenda.getHoras();
            double deuda    = Math.round(tarifaHora * horas * 100.0) / 100.0;
            String actividad    = agenda.getTipoAula()        != null ? agenda.getTipoAula()        : "Clase";
            String alumno       = agenda.getAlumno()          != null ? agenda.getAlumno()          : "";
            String descripcion  = agenda.getHotelDerivacion() != null ? agenda.getHotelDerivacion() : "";
            String fechaStr     = agenda.getFecha()           != null ? agenda.getFecha().toString() : "";

            String nota = actividad + " · " + horas + "h × " + tarifaHora
                    + " BRL/h = " + deuda + " BRL"
                    + (alumno.isBlank()      ? "" : " (" + alumno + ")")
                    + (descripcion.isBlank() ? "" : " [" + descripcion + "]")
                    + " — " + fechaStr;

            // Defensive: montoTotal puede ser null en tarjetas recién creadas
            double montoActual = pasivo.getMontoTotal() != null ? pasivo.getMontoTotal() : 0.0;
            pasivo.setMontoTotal(montoActual - deuda);

            PagoPasivo registro = new PagoPasivo();
            registro.setMontoPagado(-deuda);
            registro.setFecha(agenda.getFecha() != null ? agenda.getFecha() : LocalDate.now());
            registro.setNota(nota);
            registro.setMoneda("BRL");
            registro.setOrigenAgendaId(agenda.getId());   // para poder revertirla
            registro.setPasivo(pasivo);

            pagoPasivoRepository.save(registro);
            pasivoRepository.save(pasivo);

            // Marcar clase como FINALIZADA para que no se liquide dos veces
            agenda.setEstado("FINALIZADA");
            agendaRepository.save(agenda);

            return ResponseEntity.ok(java.util.Map.of(
                "estado", "FINALIZADA",
                "instructorNombre", agenda.getNombreInstructor(),
                "horasAcumuladas", horas,
                "montoAcumulado", deuda,
                "tarifaHora", tarifaHora
            ));

        }).orElse(ResponseEntity.notFound().build());
    }

    // 5. Actualizar campos de la clase (tipoAula, horaSalida, horas, lugar, etc.)
    public static class ActualizarClaseRequest {
        // Distingue "no vino el campo" de "vino con null" (desasignar)
        private transient boolean instructorIdPresente = false;
        public boolean tieneInstructorId() { return instructorIdPresente; }
        private String tipoAula;
        private String hora;        // hora de inicio (HH:mm) — para drag & drop
        private String horaSalida;
        private Double horas;
        private String lugar;
        private String hotelDerivacion;
        private Double tarifa;
        private Double horasPagadas;
        private String estado;
        
        // 👉 1. Agregá estos dos campos nuevos con sus getters y setters
        private Boolean cobrada;
        private Long ingresoId;
        private Long instructorId; // para asignar/cambiar instructor y mandar push

        public String getTipoAula() { return tipoAula; }
        public void setTipoAula(String tipoAula) { this.tipoAula = tipoAula; }
        public String getHora() { return hora; }
        public void setHora(String hora) { this.hora = hora; }
        public String getHoraSalida() { return horaSalida; }
        public void setHoraSalida(String horaSalida) { this.horaSalida = horaSalida; }
        public Double getHoras() { return horas; }
        public void setHoras(Double horas) { this.horas = horas; }
        public String getLugar() { return lugar; }
        public void setLugar(String lugar) { this.lugar = lugar; }
        public String getHotelDerivacion() { return hotelDerivacion; }
        public void setHotelDerivacion(String hotelDerivacion) { this.hotelDerivacion = hotelDerivacion; }
        public Double getTarifa() { return tarifa; }
        public void setTarifa(Double tarifa) { this.tarifa = tarifa; }
        public Double getHorasPagadas() { return horasPagadas; }
        public void setHorasPagadas(Double horasPagadas) { this.horasPagadas = horasPagadas; }
        public String getEstado() { return estado; }
        public void setEstado(String estado) { this.estado = estado; }

        public Boolean getCobrada() { return cobrada; }
        public void setCobrada(Boolean cobrada) { this.cobrada = cobrada; }
        public Long getIngresoId() { return ingresoId; }
        public void setIngresoId(Long ingresoId) { this.ingresoId = ingresoId; }
        public Long getInstructorId() { return instructorId; }
        public void setInstructorId(Long id) { this.instructorIdPresente = true; this.instructorId = id; }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> actualizarClase(
            @PathVariable Long id,
            @RequestBody ActualizarClaseRequest req
    ) {
        return agendaRepository.findById(id).map(agenda -> {
            // Valores previos: si la clase ya estaba liquidada y cambia el
            // instructor o las horas, lo acreditado quedó mal y hay que rehacerlo.
            final Double horasAntes   = agenda.getHoras();
            final Long   instrAntes   = agenda.getInstructorId();
            final boolean yaLiquidada = "FINALIZADA".equals(agenda.getEstado());

            if (req.getTipoAula()         != null) agenda.setTipoAula(req.getTipoAula());
            if (req.getHora()             != null) {
                try { agenda.setHora(java.time.LocalTime.parse(req.getHora())); } catch (Exception ignored) {}
            }
            if (req.getHoraSalida()       != null) {
                try {
                    agenda.setHoraSalida(java.time.LocalTime.parse(req.getHoraSalida()));
                } catch (Exception ignored) {}
            }
            if (req.getHoras()            != null) agenda.setHoras(req.getHoras());
            if (req.getLugar()            != null) agenda.setLugar(req.getLugar());
            if (req.getHotelDerivacion()  != null) agenda.setHotelDerivacion(req.getHotelDerivacion());
            if (req.getTarifa()           != null) agenda.setTarifa(req.getTarifa());
            if (req.getHorasPagadas()     != null) agenda.setHorasPagadas(req.getHorasPagadas());
            if (req.getEstado()           != null) agenda.setEstado(req.getEstado());
            if (req.getCobrada()          != null) {
                agenda.setCobrada(req.getCobrada());
                agenda.setIngresoId(req.getIngresoId());
            }

            // ── Asignar, cambiar o quitar instructor ─────────────────────────
            // El front manda instructorId SOLO cuando cambió. Si manda null
            // explícito es para desasignar; antes eso se ignoraba y no había
            // forma de dejar una clase sin instructor.
            Long instructorAnteriorId = agenda.getInstructorId();
            boolean vieneInstructor   = req.tieneInstructorId();
            boolean instructorCambio  = false;

            if (vieneInstructor) {
                Long nuevoId = req.getInstructorId();
                if (nuevoId == null) {
                    if (instructorAnteriorId != null) {
                        agenda.setInstructorId(null);
                        agenda.setNombreInstructor(null);
                        agenda.setEstado("PENDIENTE");
                    }
                } else if (!nuevoId.equals(instructorAnteriorId)) {
                    Optional<Usuario> instrOpt = usuarioRepository.findById(nuevoId);
                    if (instrOpt.isPresent()) {
                        Usuario instr = instrOpt.get();
                        agenda.setInstructorId(nuevoId);
                        agenda.setNombreInstructor(instr.getNombre() + " " + instr.getApellido());
                        // El nuevo instructor tiene que verla como asignación nueva
                        agenda.setEstado("PENDIENTE");
                        instructorCambio = true;
                    }
                }
            }

            Agenda saved = agendaRepository.save(agenda);

            // ── Rehacer la liquidación si cambió algo que la afecta ──────────
            boolean cambioHoras = horasAntes == null
                    ? saved.getHoras() != null
                    : !horasAntes.equals(saved.getHoras());
            boolean cambioInstr = instrAntes == null
                    ? saved.getInstructorId() != null
                    : !instrAntes.equals(saved.getInstructorId());

            // Sacar una clase de FINALIZADA (por ejemplo volverla a PENDIENTE con
            // el toggle "notificar", o al desasignar el instructor) dejaba el
            // movimiento acreditado en la tarjeta del instructor. Resultado: el
            // Monitor la mostraba sin confirmar y el pasivo la seguía contando.
            boolean salioDeFinalizada = yaLiquidada && !"FINALIZADA".equals(saved.getEstado());

            String avisoLiquidacion = null;
            if (yaLiquidada && (cambioHoras || cambioInstr || salioDeFinalizada)) {
                int revertidos = revertirLiquidacion(saved.getId());
                if (revertidos > 0) {
                    // Si volvió a PENDIENTE a propósito, ese estado se respeta.
                    // Si no, queda CONFIRMADA para volver a liquidar corregida.
                    if (!salioDeFinalizada) {
                        saved.setEstado("CONFIRMADA");
                        saved = agendaRepository.save(saved);
                    }
                    avisoLiquidacion = "Se deshizo la liquidación anterior ("
                            + (cambioInstr ? "cambió el instructor"
                             : cambioHoras ? "cambiaron las horas"
                             : "la clase dejó de estar finalizada")
                            + "). Volvé a liquidar la clase.";
                }
            }

            // Push al instructor si cambió o si el toggle "notificar" vino activo
            // (cuando estado=PENDIENTE llega del front con notificar=true)
            boolean debeNotificar = instructorCambio
                    || ("PENDIENTE".equals(req.getEstado()) && saved.getInstructorId() != null);

            if (debeNotificar && saved.getInstructorId() != null) {
                try {
                    String titulo = instructorCambio ? "📅 Clase asignada" : "📅 Clase actualizada";
                    String cuerpo = String.format(
                            "%s — %s a las %s hs%s",
                            saved.getAlumno() != null ? saved.getAlumno() : "Clase",
                            saved.getFecha() != null ? saved.getFecha().toString() : "",
                            saved.getHora() != null ? saved.getHora().toString().substring(0, 5) : "??",
                            saved.getTipoAula() != null ? " (" + saved.getTipoAula() + ")" : ""
                    );
                    pushService.enviarNotificacion(saved.getInstructorId(), titulo, cuerpo, "/#/instructor");
                } catch (Exception ignored) {
                    // La push no debe bloquear el guardado
                }
            }

            if (avisoLiquidacion != null) {
                java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
                resp.put("clase", saved);
                resp.put("aviso", avisoLiquidacion);
                return ResponseEntity.ok(resp);
            }
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    // 6. Marcar clase(s) como cobradas — llamado al registrar un ingreso vinculado
    public static class CobrarRequest {
        private Long ingresoId;
        private java.util.List<Long> agendaIds;
        public Long getIngresoId() { return ingresoId; }
        public void setIngresoId(Long ingresoId) { this.ingresoId = ingresoId; }
        public java.util.List<Long> getAgendaIds() { return agendaIds; }
        public void setAgendaIds(java.util.List<Long> agendaIds) { this.agendaIds = agendaIds; }
    }

    @PostMapping("/cobrar")
    public ResponseEntity<?> marcarCobradas(@RequestBody CobrarRequest req) {
        if (req.getAgendaIds() == null || req.getAgendaIds().isEmpty()) {
            return ResponseEntity.badRequest().body("agendaIds requerido");
        }
        req.getAgendaIds().forEach(aid ->
            agendaRepository.findById(aid).ifPresent(a -> {
                a.setCobrada(true);
                a.setIngresoId(req.getIngresoId());
                agendaRepository.save(a);
            })
        );
        return ResponseEntity.ok("Clases marcadas como cobradas");
    }

    // 8. Eliminar clase
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarClase(@PathVariable Long id) {
        return agendaRepository.findById(id)
                .map(a -> {
                    // Si estaba liquidada, devolver al instructor lo acreditado
                    revertirLiquidacion(a.getId());
                    agendaRepository.delete(a);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

}