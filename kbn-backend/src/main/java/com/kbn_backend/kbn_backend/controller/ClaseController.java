package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.ClaseRegistro;
import com.kbn_backend.kbn_backend.repository.ClaseRepository;
import com.kbn_backend.kbn_backend.service.FinanzasService;
import com.kbn_backend.kbn_backend.dto.ReporteKiteDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Controlador para la gestión de movimientos financieros (Ingresos/Egresos)
 * y su impacto en el sistema de Pasivos de la escuela.
 */
@RestController
@RequestMapping("/api/clases")
public class ClaseController {

    @Autowired
    private ClaseRepository claseRepository;

    @Autowired
    private FinanzasService finanzasService;

    // --- DTO INTERNO PARA ASIGNACIONES ---
    public static class AsignacionRequest {
        private String asignadoA;
        private String detalles;
        public String getAsignadoA() { return asignadoA; }
        public void setAsignadoA(String asignadoA) { this.asignadoA = asignadoA; }
        public String getDetalles() { return detalles; }
        public void setDetalles(String detalles) { this.detalles = detalles; }
    }

    /**
     * 1. GUARDAR REGISTRO
     * Delega la lógica de negocio al Service para manejar la integridad
     * transaccional entre el Egreso y el Pasivo.
     */
    @PostMapping("/guardar")
    public ResponseEntity<ClaseRegistro> guardarClase(@RequestBody ClaseRegistro registro) {
        // El Service se encarga de:
        // - Validar tipos (Ingreso/Egreso)
        // - Calcular totales de seguridad
        // - Descontar del Pasivo si corresponde
        // - Registrar el historial de pagos
        ClaseRegistro savedRegistro = finanzasService.guardarTransaccion(registro);
        return ResponseEntity.ok(savedRegistro);
    }

    /**
     * 2. LISTAR CLASES
     * Retorna todos los movimientos ordenados por fecha descendente.
     */
    @GetMapping("/listar")
    public ResponseEntity<List<ClaseRegistro>> listarClases() {
        return ResponseEntity.ok(claseRepository.findAllByOrderByFechaDesc());
    }

    /**
     * 3. ASIGNAR INGRESO
     * Permite marcar a quién pertenece un ingreso pendiente.
     */
    @PutMapping("/asignar/{id}")
    public ResponseEntity<?> asignarIngreso(@PathVariable Long id, @RequestBody AsignacionRequest request) {
        System.out.println("Solicitud de asignación para ID: " + id + " -> " + request.getAsignadoA());

        return claseRepository.findById(id)
                .map(registro -> {
                    if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion())) {
                        return ResponseEntity.badRequest()
                                .body("No se puede asignar un responsable a una transacción de tipo EGRESO.");
                    }

                    registro.setAsignadoA(request.getAsignadoA());
                    registro.setRevisado(true);
                    if (request.getDetalles() != null) {
                        registro.setDetalles(request.getDetalles());
                    }

                    claseRepository.save(registro);
                    return ResponseEntity.ok("Asignación actualizada correctamente.");
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 4. GENERAR REPORTE
     * Obtiene el resumen financiero entre dos fechas.
     */
    @GetMapping("/reporte")
    public ResponseEntity<ReporteKiteDTO> generarReporte(
            @RequestParam String fechaInicio,
            @RequestParam String fechaFin) {

        Optional<ReporteKiteDTO> reporte = claseRepository.getReporteEntreFechas(fechaInicio, fechaFin);
        return reporte.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}