package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Agenda;
import com.kbn_backend.kbn_backend.model.PagoPasivo;
import com.kbn_backend.kbn_backend.repository.AgendaRepository;
import com.kbn_backend.kbn_backend.repository.PagoPasivoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * DIAGNÓSTICO DE LIQUIDACIONES DESFASADAS.
 *
 * Busca las clases donde el Monitor y la tarjeta de pasivo no dicen lo mismo:
 *
 *   PENDIENTE_LIQUIDADA  La clase no figura como FINALIZADA, pero el instructor
 *                        ya tiene el movimiento acreditado en su tarjeta. Es el
 *                        caso que se veía como "sin confirmar en el Monitor pero
 *                        cobrada en pasivos". Lo generaba editar una clase ya
 *                        liquidada y volverla a PENDIENTE con el toggle de
 *                        notificar: el estado cambiaba y el movimiento quedaba.
 *
 *   FINALIZADA_SIN_PAGO  La clase figura liquidada pero no hay ningún movimiento
 *                        de origen. Suele ser una clase de un instructor sin
 *                        tarjeta, o sin tarifa cargada — no siempre es un error.
 *
 * GET  /api/diagnostico/liquidaciones          → solo mira, no toca nada
 * POST /api/diagnostico/liquidaciones/corregir → borra los movimientos de las
 *      PENDIENTE_LIQUIDADA, para que se puedan volver a liquidar limpias.
 *      Pide ?confirmar=true; sin eso devuelve la misma vista previa.
 */
@RestController
@RequestMapping("/api/diagnostico")
public class LiquidacionDiagnosticoController {

    @Autowired private AgendaRepository agendaRepository;
    @Autowired private PagoPasivoRepository pagoPasivoRepository;

    private List<Map<String, Object>> desfasadas() {
        List<Map<String, Object>> out = new ArrayList<>();

        for (Agenda a : agendaRepository.findAll()) {
            if (a.getId() == null) continue;
            List<PagoPasivo> movs = pagoPasivoRepository.findByOrigenAgendaId(a.getId());
            boolean finalizada = "FINALIZADA".equals(a.getEstado());

            if (!finalizada && !movs.isEmpty()) {
                double suma = 0;
                for (PagoPasivo m : movs) suma += m.getMontoPagado() != null ? m.getMontoPagado() : 0;

                Map<String, Object> fila = new LinkedHashMap<>();
                fila.put("problema", "PENDIENTE_LIQUIDADA");
                fila.put("agendaId", a.getId());
                fila.put("fecha", String.valueOf(a.getFecha()));
                fila.put("alumno", a.getAlumno());
                fila.put("instructor", a.getNombreInstructor());
                fila.put("estadoMonitor", a.getEstado());
                fila.put("movimientos", movs.size());
                fila.put("acreditado", Math.round(suma * 100.0) / 100.0);
                out.add(fila);

            } else if (finalizada && movs.isEmpty()) {
                Map<String, Object> fila = new LinkedHashMap<>();
                fila.put("problema", "FINALIZADA_SIN_PAGO");
                fila.put("agendaId", a.getId());
                fila.put("fecha", String.valueOf(a.getFecha()));
                fila.put("alumno", a.getAlumno());
                fila.put("instructor", a.getNombreInstructor());
                fila.put("estadoMonitor", a.getEstado());
                out.add(fila);
            }
        }

        out.sort((x, y) -> String.valueOf(y.get("fecha")).compareTo(String.valueOf(x.get("fecha"))));
        return out;
    }

    @GetMapping("/liquidaciones")
    public ResponseEntity<?> ver() {
        List<Map<String, Object>> filas = desfasadas();
        long pend = filas.stream().filter(f -> "PENDIENTE_LIQUIDADA".equals(f.get("problema"))).count();
        long sinPago = filas.size() - pend;

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("pendientesPeroLiquidadas", pend);
        r.put("finalizadasSinMovimiento", sinPago);
        r.put("detalle", filas);
        return ResponseEntity.ok(r);
    }

    @Transactional
    @PostMapping("/liquidaciones/corregir")
    public ResponseEntity<?> corregir(
            @RequestParam(defaultValue = "false") boolean confirmar) {

        List<Map<String, Object>> filas = desfasadas().stream()
                .filter(f -> "PENDIENTE_LIQUIDADA".equals(f.get("problema")))
                .toList();

        if (!confirmar) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("modo", "VISTA PREVIA — no se tocó nada");
            r.put("seBorrarian", filas.size());
            r.put("comoAplicar", "POST /api/diagnostico/liquidaciones/corregir?confirmar=true");
            r.put("detalle", filas);
            return ResponseEntity.ok(r);
        }

        int borrados = 0;
        for (Map<String, Object> f : filas) {
            Long agendaId = (Long) f.get("agendaId");
            for (PagoPasivo mov : pagoPasivoRepository.findByOrigenAgendaId(agendaId)) {
                var pasivo = mov.getPasivo();
                if (pasivo == null) continue;
                final Long movId = mov.getId();
                int antes = pasivo.getHistorialPagos().size();
                pasivo.getHistorialPagos().removeIf(x -> movId.equals(x.getId()));
                borrados += antes - pasivo.getHistorialPagos().size();

                double total = 0;
                for (PagoPasivo p : pasivo.getHistorialPagos()) {
                    total += p.getMontoPagado() != null ? p.getMontoPagado() : 0;
                }
                pasivo.setMontoTotal(Math.round(total * 100.0) / 100.0);
            }
        }

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("modo", "APLICADO");
        r.put("clasesAfectadas", filas.size());
        r.put("movimientosBorrados", borrados);
        r.put("siguiente", "Confirmá esas clases en el Monitor para volver a liquidarlas.");
        r.put("detalle", filas);
        return ResponseEntity.ok(r);
    }
}
