package com.kbn_backend.kbn_backend.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import com.kbn_backend.kbn_backend.model.Agenda;
import com.kbn_backend.kbn_backend.model.Usuario;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class WhatsAppService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppService.class);

    @Value("${twilio.account.sid}")
    private String accountSid;

    @Value("${twilio.auth.token}")
    private String authToken;

    @Value("${twilio.whatsapp.from}")
    private String fromNumber;

    @PostConstruct
    public void init() {
        Twilio.init(accountSid, authToken);
        log.info("✅ Twilio inicializado correctamente");
    }

    /**
     * Envía una notificación de nueva clase al instructor por WhatsApp.
     *
     * @param instructor El usuario instructor que recibirá el mensaje
     * @param agenda     La agenda recién creada con todos los detalles
     */
    public void notificarNuevaClase(Usuario instructor, Agenda agenda) {
        if (instructor.getTelefono() == null || instructor.getTelefono().isBlank()) {
            log.warn("⚠️ Instructor {} no tiene teléfono registrado. WhatsApp no enviado.", instructor.getId());
            return;
        }

        String toNumber = "whatsapp:+" + instructor.getTelefono();
        String cuerpo = construirMensaje(instructor, agenda);

        try {
            Message message = Message.creator(
                    new PhoneNumber(toNumber),
                    new PhoneNumber(fromNumber),
                    cuerpo
            ).create();

            log.info("📲 WhatsApp enviado al instructor {} | SID: {}", instructor.getNombre(), message.getSid());

        } catch (Exception e) {
            // No interrumpimos el flujo principal si falla el WhatsApp
            log.error("❌ Error al enviar WhatsApp al instructor {}: {}", instructor.getNombre(), e.getMessage());
        }
    }

    /**
     * Construye el cuerpo del mensaje con formato profesional.
     */
    private String construirMensaje(Usuario instructor, Agenda agenda) {
        return String.format(
                "🏄 *KBN Kite School*\n" +
                        "━━━━━━━━━━━━━━━━━━━━\n\n" +
                        "Hola *%s*, tienes una nueva clase asignada. Por favor confirma tu asistencia.\n\n" +
                        "📅 *Fecha:* %s\n" +
                        "🕐 *Hora:* %s hs\n" +
                        "👤 *Alumno:* %s\n" +
                        "📍 *Lugar:* %s\n" +
                        "⏱️ *Duración:* %s hs\n" +
                        "💵 *Tarifa:* $%s\n\n" +
                        "━━━━━━━━━━━━━━━━━━━━\n" +
                        "✅ *Confirmá o rechazá desde el panel:*\n" +
                        "👉 https://kbn-admin.vercel.app/\n\n" +
                        "_KBN Kite School — Sistema de Gestión_",
                instructor.getNombre(),
                agenda.getFecha(),
                agenda.getHora() != null ? agenda.getHora().toString().substring(0, 5) : "-",
                agenda.getAlumno(),
                agenda.getLugar(),
                agenda.getHoras(),
                agenda.getTarifa()
        );
    }
}