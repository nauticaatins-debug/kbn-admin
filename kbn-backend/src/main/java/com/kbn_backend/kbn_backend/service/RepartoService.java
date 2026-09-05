package com.kbn_backend.kbn_backend.service;

import com.kbn_backend.kbn_backend.model.ClaseRegistro;
import com.kbn_backend.kbn_backend.model.PagoPasivo;
import com.kbn_backend.kbn_backend.model.Pasivo;
import com.kbn_backend.kbn_backend.repository.ClaseRepository;
import com.kbn_backend.kbn_backend.repository.PagoPasivoRepository;
import com.kbn_backend.kbn_backend.repository.PasivoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

/**
 * Reparto de un ingreso entre los dueños (Igna, José, Hans).
 *
 * IDEMPOTENTE por ingreso: cada movimiento generado queda marcado con
 * `origenIngresoId`. Recalcular primero borra los movimientos previos de ese
 * mismo ingreso y después crea los nuevos, así llamarlo N veces deja siempre
 * el mismo estado. Se invoca al crear, editar, asignar o borrar un ingreso, y
 * también desde la sincronización masiva.
 */
@Service
public class RepartoService {

    @Autowired private PasivoRepository pasivoRepository;
    @Autowired private PagoPasivoRepository pagoPasivoRepository;
    @Autowired private ClaseRepository claseRepository;

    public static final String T_IGNA = "Igna Krebs";
    public static final String T_JOSE = "José Sánchez";
    public static final String T_HANS = "Hans Leonhard Wurbs";

    private Map<String, Double> porcentajes(String asignadoA) {
        double pIgna, pJose;
        String a = asignadoA == null ? "" : asignadoA.trim().toUpperCase();
        switch (a) {
            case "IGNA":  pIgna = 16;   pJose = 8;    break;
            case "JOSE":  pIgna = 8;    pJose = 16;   break;
            case "AMBOS": pIgna = 12.5; pJose = 12.5; break;
            default:      pIgna = 10;   pJose = 10;   break;
        }
        Map<String, Double> m = new LinkedHashMap<>();
        m.put(T_IGNA, pIgna);
        m.put(T_JOSE, pJose);
        m.put(T_HANS, 5.0);
        return m;
    }

    /**
     * Recalcula el reparto de un ingreso: borra lo que había generado antes y
     * lo vuelve a crear con el monto y la asignación actuales. Si el ingreso ya
     * no corresponde (borrado, egreso, sin asignar o en cero), solo limpia.
     */
    @Transactional
    public Map<String, Object> recalcular(ClaseRegistro r) {
        Map<String, Object> resumen = new LinkedHashMap<>();
        if (r == null || r.getId() == null) { resumen.put("error", "ingreso sin id"); return resumen; }

        int borrados = limpiarPorIngreso(r);
        resumen.put("movimientosBorrados", borrados);

        if (!"INGRESO".equalsIgnoreCase(r.getTipoTransaccion())) {
            resumen.put("accion", "solo limpieza (no es INGRESO)"); return resumen;
        }
        String asignado = r.getAsignadoA();
        if (asignado == null || asignado.isBlank() || "NINGUNO".equalsIgnoreCase(asignado)) {
            resumen.put("accion", "solo limpieza (sin asignar)"); return resumen;
        }
        double total = parseMonto(r.getTotal());
        if (total <= 0) { resumen.put("accion", "solo limpieza (total 0)"); return resumen; }

        String moneda = r.getMoneda() != null && !r.getMoneda().isBlank() ? r.getMoneda() : "BRL";
        String actividad = r.getActividad() != null && !r.getActividad().isBlank() ? r.getActividad() : "Ingreso";
        LocalDate fecha = parseFecha(r.getFecha());

        Map<String, Object> creados = new LinkedHashMap<>();
        for (Map.Entry<String, Double> e : porcentajes(asignado).entrySet()) {
            double pct   = e.getValue();
            double monto = Math.round(total * pct / 100.0 * 100.0) / 100.0;
            if (monto <= 0) continue;
            Pasivo pasivo = buscar(e.getKey());
            if (pasivo == null) { creados.put(e.getKey(), "tarjeta no encontrada"); continue; }

            PagoPasivo mov = new PagoPasivo();
            mov.setMontoPagado(-monto);
            mov.setFecha(fecha);
            mov.setMoneda(moneda);
            mov.setOrigenIngresoId(r.getId());
            mov.setNota(fmtPct(pct) + "% de " + actividad + " — " + r.getFecha()
                    + " = " + String.format(Locale.US, "%.2f", monto) + " " + moneda);
            mov.setPasivo(pasivo);
            pasivo.getHistorialPagos().add(mov);
            recalcTotal(pasivo);
            pasivoRepository.save(pasivo);
            creados.put(e.getKey(), monto);
        }
        resumen.put("accion", "reparto recalculado");
        resumen.put("creados", creados);
        return resumen;
    }

    /** Borra los movimientos de reparto de un ingreso. Devuelve cuántos borró. */
    @Transactional
    public int limpiar(Long ingresoId) {
        if (ingresoId == null) return 0;
        List<PagoPasivo> previos = pagoPasivoRepository.findByOrigenIngresoId(ingresoId);
        return borrarLista(previos);
    }

    /**
     * Limpieza robusta a partir del ingreso completo.
     *
     * Borra primero por origenIngresoId (los movimientos nuevos, bien
     * vinculados). Si no encuentra ninguno — caso de repartos viejos creados
     * antes de existir el campo — cae a un respaldo: busca en las tres tarjetas
     * los movimientos de reparto cuya nota corresponde a este ingreso
     * (mismo % de <actividad> — <fecha>) y mismo monto esperado.
     *
     * Esto garantiza que borrar un ingreso limpie su reparto, sea nuevo o viejo.
     */
    @Transactional
    public int limpiarPorIngreso(ClaseRegistro r) {
        if (r == null || r.getId() == null) return 0;

        // 1) intento normal por origen
        int borrados = borrarLista(pagoPasivoRepository.findByOrigenIngresoId(r.getId()));
        if (borrados > 0) return borrados;

        // 2) respaldo por coincidencia de nota (para repartos viejos sin origen)
        String actividad = r.getActividad() != null && !r.getActividad().isBlank()
                ? r.getActividad() : "Ingreso";
        String fecha = r.getFecha();
        if (fecha == null || fecha.isBlank()) return 0;
        double total = parseMonto(r.getTotal());
        if (total <= 0) return 0;

        String asignado = r.getAsignadoA();
        Map<String, Double> pcts = porcentajes(asignado);

        List<PagoPasivo> aBorrar = new ArrayList<>();
        for (String titulo : new String[]{ T_IGNA, T_JOSE, T_HANS }) {
            Pasivo pasivo = buscar(titulo);
            if (pasivo == null || pasivo.getHistorialPagos() == null) continue;

            double pct = pcts.getOrDefault(titulo, 0.0);
            double montoEsperado = Math.round(total * pct / 100.0 * 100.0) / 100.0;
            // prefijo esperado de la nota: "<pct>% de <actividad> — <fecha>"
            String prefijo = fmtPct(pct) + "% de " + actividad + " — " + fecha;

            for (PagoPasivo p : pasivo.getHistorialPagos()) {
                if (p.getNota() == null) continue;
                boolean notaCoincide = p.getNota().startsWith(prefijo);
                boolean montoCoincide = p.getMontoPagado() != null
                        && Math.abs(Math.abs(p.getMontoPagado()) - montoEsperado) < 0.02;
                if (notaCoincide && montoCoincide) aBorrar.add(p);
            }
        }
        return borrarLista(aBorrar);
    }

    /** Saca una lista de movimientos de sus tarjetas y recalcula saldos. */
    private int borrarLista(List<PagoPasivo> movs) {
        if (movs == null || movs.isEmpty()) return 0;
        Map<Long, List<Long>> porTarjeta = new LinkedHashMap<>();
        for (PagoPasivo p : movs) {
            if (p.getPasivo() == null) continue;
            porTarjeta.computeIfAbsent(p.getPasivo().getId(), k -> new ArrayList<>()).add(p.getId());
        }
        int borrados = 0;
        for (Map.Entry<Long, List<Long>> e : porTarjeta.entrySet()) {
            Pasivo pasivo = pasivoRepository.findById(e.getKey()).orElse(null);
            if (pasivo == null) continue;
            int antes = pasivo.getHistorialPagos().size();
            pasivo.getHistorialPagos().removeIf(x -> e.getValue().contains(x.getId()));
            borrados += antes - pasivo.getHistorialPagos().size();
            recalcTotal(pasivo);
            pasivoRepository.save(pasivo);
        }
        return borrados;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────
    private Pasivo buscar(String titulo) {
        for (Pasivo p : pasivoRepository.findAll())
            if (p.getTitulo() != null && p.getTitulo().trim().equalsIgnoreCase(titulo.trim())) return p;
        return null;
    }
    private String fmtPct(double pct) {
        return pct == Math.floor(pct) ? String.valueOf((int) pct) : String.valueOf(pct).replace('.', ',');
    }
    private double parseMonto(String s) {
        if (s == null || s.isBlank()) return 0;
        try { return Double.parseDouble(s.trim().replace(",", ".")); } catch (Exception e) { return 0; }
    }
    private LocalDate parseFecha(String s) {
        try { return LocalDate.parse(s); } catch (Exception e) { return LocalDate.now(); }
    }
    private void recalcTotal(Pasivo pasivo) {
        double t = 0;
        if (pasivo.getHistorialPagos() != null)
            for (PagoPasivo p : pasivo.getHistorialPagos())
                t += p.getMontoPagado() != null ? p.getMontoPagado() : 0;
        pasivo.setMontoTotal(Math.round(t * 100.0) / 100.0);
    }
}