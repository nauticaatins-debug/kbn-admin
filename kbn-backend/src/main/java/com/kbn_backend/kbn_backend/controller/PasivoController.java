package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Pasivo;
import com.kbn_backend.kbn_backend.model.PagoPasivo;
import com.kbn_backend.kbn_backend.repository.PasivoRepository;
import com.kbn_backend.kbn_backend.repository.PagoPasivoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/pasivos")
public class PasivoController {

    @Autowired
    private PasivoRepository pasivoRepository;

    @Autowired
    private PagoPasivoRepository pagoPasivoRepository;

    // --- DTO para acumular saldo sin generar movimiento de caja ---
    public static class AcumularRequest {
        private Double monto; // puede ser negativo (deuda) o positivo (a favor)
        private String nota;
        private String fecha; // opcional, formato yyyy-MM-dd

        public Double getMonto() { return monto; }
        public void setMonto(Double monto) { this.monto = monto; }
        public String getNota() { return nota; }
        public void setNota(String nota) { this.nota = nota; }
        public String getFecha() { return fecha; }
        public void setFecha(String fecha) { this.fecha = fecha; }
    }

    // 1. Obtener todas las cuentas corrientes
    @GetMapping
    public ResponseEntity<List<Pasivo>> listarPasivos() {
        return ResponseEntity.ok(pasivoRepository.findAll());
    }

    // 2. Crear un nuevo pasivo (Deuda o Adelanto inicial)
    @PostMapping
    public ResponseEntity<Pasivo> crearPasivo(@RequestBody Pasivo pasivo) {
        return ResponseEntity.ok(pasivoRepository.save(pasivo));
    }

    // 3. Actualizar un pasivo (Para editar nombre/descripción o actualizar saldo)
    @PutMapping("/{id}")
    public ResponseEntity<Pasivo> actualizarPasivo(@PathVariable Long id, @RequestBody Pasivo detallesPasivo) {
        return pasivoRepository.findById(id)
                .map(pasivo -> {
                    pasivo.setTitulo(detallesPasivo.getTitulo());
                    pasivo.setDescripcion(detallesPasivo.getDescripcion());
                    pasivo.setMontoTotal(detallesPasivo.getMontoTotal());
                    pasivo.setMoneda(detallesPasivo.getMoneda());
                    pasivo.setFecha(detallesPasivo.getFecha());
                    // Si tienes historialPagos como relación, asegúrate de manejarlo aquí si es necesario
                    Pasivo actualizado = pasivoRepository.save(pasivo);
                    return ResponseEntity.ok(actualizado);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 3b. ACUMULAR SALDO — actualiza montoTotal + historial, SIN generar movimiento de caja.
    //     Usar para deudas internas (horas de instructor, reparto de porcentajes) que NO
    //     implican que haya salido o entrado plata real de la caja todavía.
    @Transactional
    @PutMapping("/{id}/acumular")
    public ResponseEntity<?> acumularSaldo(@PathVariable Long id, @RequestBody AcumularRequest request) {
        return pasivoRepository.findById(id)
                .map(pasivo -> {
                    double monto = request.getMonto() != null ? request.getMonto() : 0;

                    pasivo.setMontoTotal(pasivo.getMontoTotal() + monto);

                    PagoPasivo registro = new PagoPasivo();
                    registro.setMontoPagado(monto);
                    registro.setFecha(
                            request.getFecha() != null ? LocalDate.parse(request.getFecha()) : LocalDate.now()
                    );
                    registro.setNota(request.getNota() != null ? request.getNota() : "Movimiento interno");
                    registro.setPasivo(pasivo);

                    pagoPasivoRepository.save(registro);
                    Pasivo actualizado = pasivoRepository.save(pasivo);

                    return ResponseEntity.ok(actualizado);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 4. Eliminar una cuenta corriente
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarPasivo(@PathVariable Long id) {
        return pasivoRepository.findById(id)
                .map(pasivo -> {
                    pasivoRepository.delete(pasivo);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 4b. ELIMINAR UN MOVIMIENTO PUNTUAL DEL HISTORIAL — para corregir cargas
    //     erróneas (ej: una clase que se acumuló dos veces por mal wifi).
    //     Resta del montoTotal exactamente lo que ese movimiento había sumado,
    //     y borra la fila del historial. No toca clases_registros: si el
    //     movimiento vino de un EGRESO real, ese registro de caja hay que
    //     borrarlo aparte desde /api/clases/{id}.
    @Transactional
    @DeleteMapping("/{pasivoId}/historial/{pagoId}")
    public ResponseEntity<?> eliminarMovimientoHistorial(
            @PathVariable Long pasivoId,
            @PathVariable Long pagoId) {

        Pasivo pasivo = pasivoRepository.findById(pasivoId).orElse(null);
        if (pasivo == null) return ResponseEntity.notFound().build();

        PagoPasivo pago = pagoPasivoRepository.findById(pagoId).orElse(null);
        if (pago == null) return ResponseEntity.notFound().build();

        if (pago.getPasivo() == null || !pago.getPasivo().getId().equals(pasivoId)) {
            return ResponseEntity.badRequest().body("Ese movimiento no pertenece a esta tarjeta.");
        }

        double monto = pago.getMontoPagado() != null ? pago.getMontoPagado() : 0;
        pasivo.setMontoTotal(pasivo.getMontoTotal() - monto);

        pagoPasivoRepository.delete(pago);
        Pasivo actualizado = pasivoRepository.save(pasivo);

        return ResponseEntity.ok(actualizado);
    }

    // 5. Obtener un pasivo específico (útil para ver detalles o historial)
    @GetMapping("/{id}")
    public ResponseEntity<Pasivo> obtenerPasivoPorId(@PathVariable Long id) {
        return pasivoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}