package com.kbn_backend.kbn_backend.service;

import com.kbn_backend.kbn_backend.model.*;
import com.kbn_backend.kbn_backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;

@Service
public class FinanzasService {

    @Autowired
    private ClaseRepository claseRepository;
    @Autowired
    private PasivoRepository pasivoRepository;
    @Autowired
    private PagoPasivoRepository pagoPasivoRepository;
    @Autowired
    private AgendaRepository agendaRepository;

    /**
     * ClaseRegistro.fecha es un String (normalmente "yyyy-MM-dd" desde el
     * <input type="date"> del front, a veces con hora pegada). Esto lo
     * convierte a LocalDate de forma tolerante, con fallback a hoy.
     */
    private LocalDate fechaDeRegistro(String fecha) {
        if (fecha == null || fecha.isBlank()) return LocalDate.now();
        try {
            return LocalDate.parse(fecha.trim().substring(0, 10));
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    @Transactional
    public ClaseRegistro guardarTransaccion(ClaseRegistro registro) {

        // 1. Inicialización según tipo de transacción
        if ("INGRESO".equalsIgnoreCase(registro.getTipoTransaccion())) {
            // Respetar el asignadoA que venga; sólo marcarlo como no revisado
            // si llega sin asignar (para que aparezca en Pendientes).
            boolean sinAsignar = registro.getAsignadoA() == null
                    || registro.getAsignadoA().isBlank()
                    || "NINGUNO".equalsIgnoreCase(registro.getAsignadoA());
            registro.setRevisado(!sinAsignar);
        } else if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion())) {
            registro.setAsignadoA(null);
            registro.setRevisado(true);
        }

        // 2. Cálculo automático del total si no viene explícito
        if (registro.getTotal() == null
                && registro.getCantidadHoras() != null
                && registro.getTarifaPorHora() != null) {
            try {
                double h = Double.parseDouble(registro.getCantidadHoras());
                double t = Double.parseDouble(registro.getTarifaPorHora());
                registro.setTotal(String.valueOf(h * t));
            } catch (Exception e) {
                registro.setTotal("0");
            }
        }

        // 3. Guardar el movimiento en caja
        ClaseRegistro saved = claseRepository.save(registro);

        // 4. Si es un INGRESO con agendaIds, marcar esas clases como cobradas
        if ("INGRESO".equalsIgnoreCase(registro.getTipoTransaccion())
                && registro.getAgendaIds() != null
                && !registro.getAgendaIds().isBlank()) {
            try {
                String[] ids = registro.getAgendaIds().split(",");
                for (String idStr : ids) {
                    long agendaId = Long.parseLong(idStr.trim());
                    agendaRepository.findById(agendaId).ifPresent(a -> {
                        a.setCobrada(true);
                        a.setIngresoId(saved.getId());
                        agendaRepository.save(a);
                    });
                }
            } catch (Exception e) {
                // IDs malformados — no bloquear el guardado del ingreso
                System.err.println("FinanzasService: error parseando agendaIds: " + e.getMessage());
            }
        }

        // 5. Si es un EGRESO vinculado a un Pasivo, actualizamos el saldo del pasivo
        if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion())
                && registro.getPasivoId() != null) {

            pasivoRepository.findById(registro.getPasivoId()).ifPresent(pasivo -> {

                double monto = Double.parseDouble(registro.getTotal());
                String monedaMovimiento = registro.getMoneda();

                // montoTotal solo se actualiza para movimientos en BRL o canales R$_*
                // Para EUR/USD, el saldo real vive en el historial (PagoPasivo.moneda)
                // y se calcula en PasivoController.calcularSaldosPorMoneda().
                boolean esBRL = monedaMovimiento == null
                        || monedaMovimiento.isBlank()
                        || monedaMovimiento.equals("BRL")
                        || monedaMovimiento.startsWith("R$_");

                if (esBRL) {
                    pasivo.setMontoTotal(pasivo.getMontoTotal() + monto);
                }
                // Para EUR/USD: montoTotal no cambia. El saldo se ve en saldosPorMoneda.

                // Guardar en historial con la moneda correcta para que
                // calcularSaldosPorMoneda() pueda agrupar bien.
                PagoPasivo pagoHistorial = new PagoPasivo();
                pagoHistorial.setMontoPagado(monto);
                // La fecha del movimiento del pasivo tiene que ser la MISMA que la
                // del movimiento de caja. Antes se usaba LocalDate.now(), así que si
                // se cargaba un pago con fecha pasada, en el historial de la tarjeta
                // aparecía bajo el día de hoy (fuera de orden).
                pagoHistorial.setFecha(fechaDeRegistro(registro.getFecha()));
                pagoHistorial.setNota(
                        registro.getDetalles() != null ? registro.getDetalles() : "Pago registrado"
                );
                pagoHistorial.setMoneda(monedaMovimiento); // ← CRÍTICO: guarda EUR/USD/BRL
                pagoHistorial.setPasivo(pasivo);

                pagoPasivoRepository.save(pagoHistorial);
                pasivoRepository.save(pasivo);
            });
        }

        return saved;
    }
}