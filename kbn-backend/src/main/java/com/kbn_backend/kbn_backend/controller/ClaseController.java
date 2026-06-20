package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.ClaseRegistro;
import com.kbn_backend.kbn_backend.model.Pasivo;
import com.kbn_backend.kbn_backend.model.PagoPasivo;
import com.kbn_backend.kbn_backend.repository.ClaseRepository;
import com.kbn_backend.kbn_backend.repository.PasivoRepository;
import com.kbn_backend.kbn_backend.repository.PagoPasivoRepository;
import com.kbn_backend.kbn_backend.service.FinanzasService;
import com.kbn_backend.kbn_backend.dto.ReporteKiteDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
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

    @Autowired
    private PasivoRepository pasivoRepository;

    @Autowired
    private PagoPasivoRepository pagoPasivoRepository;

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

    /**
     * 5. EDITAR REGISTRO
     * Permite corregir un Ingreso o Egreso cargado mal (fecha, monto, moneda,
     * detalles, etc.). IMPORTANTE: esto NO ajusta automáticamente ningún saldo
     * de Pasivo asociado — si el registro ya generó una acumulación de deuda,
     * ese ajuste se hace aparte, manualmente, desde Cuentas Corrientes.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> editarClase(@PathVariable Long id, @RequestBody ClaseRegistro detalles) {
        return claseRepository.findById(id)
                .map(registro -> {
                    if (detalles.getFecha() != null) registro.setFecha(detalles.getFecha());
                    if (detalles.getActividad() != null) registro.setActividad(detalles.getActividad());
                    if (detalles.getDescripcionActividad() != null) registro.setDescripcionActividad(detalles.getDescripcionActividad());
                    if (detalles.getVendedor() != null) registro.setVendedor(detalles.getVendedor());
                    if (detalles.getInstructor() != null) registro.setInstructor(detalles.getInstructor());
                    if (detalles.getDetalles() != null) registro.setDetalles(detalles.getDetalles());
                    if (detalles.getCantidadHoras() != null) registro.setCantidadHoras(detalles.getCantidadHoras());
                    if (detalles.getTarifaPorHora() != null) registro.setTarifaPorHora(detalles.getTarifaPorHora());
                    if (detalles.getTotal() != null) registro.setTotal(detalles.getTotal());
                    if (detalles.getMoneda() != null) registro.setMoneda(detalles.getMoneda());
                    if (detalles.getGastosAsociados() != null) registro.setGastosAsociados(detalles.getGastosAsociados());
                    if (detalles.getComision() != null) registro.setComision(detalles.getComision());
                    if (detalles.getFormaPago() != null) registro.setFormaPago(detalles.getFormaPago());
                    if (detalles.getDetalleFormaPago() != null) registro.setDetalleFormaPago(detalles.getDetalleFormaPago());

                    ClaseRegistro actualizado = claseRepository.save(registro);
                    return ResponseEntity.ok(actualizado);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 6. ELIMINAR REGISTRO
     * Borra un Ingreso o Egreso cargado por error.
     *
     * Si el registro es un EGRESO vinculado a un Pasivo (pasivoId != null),
     * primero REVIERTE su efecto sobre el saldo del pasivo (resta lo que en
     * su momento sumó), para que el saldo no quede desincronizado. También
     * deja una entrada en el historial del pasivo documentando la reversión,
     * para que quede trazabilidad de que el ajuste se hizo por una corrección.
     */
    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarClase(@PathVariable Long id) {
        return claseRepository.findById(id)
                .map(registro -> {
                    if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion()) && registro.getPasivoId() != null) {
                        pasivoRepository.findById(registro.getPasivoId()).ifPresent(pasivo -> {
                            double monto;
                            try {
                                monto = Double.parseDouble(registro.getTotal());
                            } catch (Exception e) {
                                monto = 0;
                            }

                            // El registro original sumó "monto" al pasivo al crearse;
                            // para revertirlo, restamos ese mismo monto.
                            pasivo.setMontoTotal(pasivo.getMontoTotal() - monto);

                            PagoPasivo reversion = new PagoPasivo();
                            reversion.setMontoPagado(-monto);
                            reversion.setFecha(LocalDate.now());
                            reversion.setNota(
                                "Reversión por eliminación de registro #" + registro.getId()
                                + (registro.getDetalles() != null ? " (\"" + registro.getDetalles() + "\")" : "")
                            );
                            reversion.setPasivo(pasivo);

                            pagoPasivoRepository.save(reversion);
                            pasivoRepository.save(pasivo);
                        });
                    }

                    claseRepository.delete(registro);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}