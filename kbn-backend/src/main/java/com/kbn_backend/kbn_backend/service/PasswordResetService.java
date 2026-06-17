package com.kbn_backend.kbn_backend.service;

import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PasswordResetService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    private static final int TOKEN_EXPIRY_HOURS = 2;

    // ── Solicitar reset ───────────────────────────────────────────
    public void requestPasswordReset(String email) throws Exception {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new Exception("EMAIL_NOT_FOUND"));

        String token = UUID.randomUUID().toString();
        usuario.setResetToken(token);
        usuario.setResetTokenExpiry(LocalDateTime.now().plusHours(TOKEN_EXPIRY_HOURS));
        usuarioRepository.save(usuario);

        sendResetEmail(email, token, usuario.getNombre());
    }

    // ── Validar token ─────────────────────────────────────────────
    public boolean validateToken(String token) {
        return usuarioRepository.findByResetToken(token)
                .map(u -> u.getResetTokenExpiry() != null &&
                          u.getResetTokenExpiry().isAfter(LocalDateTime.now()))
                .orElse(false);
    }

    // ── Cambiar contraseña ────────────────────────────────────────
    public void resetPassword(String token, String newPassword) throws Exception {
        Usuario usuario = usuarioRepository.findByResetToken(token)
                .orElseThrow(() -> new Exception("TOKEN_INVALID"));

        if (usuario.getResetTokenExpiry() == null ||
            usuario.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new Exception("TOKEN_EXPIRED");
        }

        usuario.setPassword(passwordEncoder.encode(newPassword));
        usuario.setResetToken(null);
        usuario.setResetTokenExpiry(null);
        usuarioRepository.save(usuario);
    }

    // ── Enviar email ──────────────────────────────────────────────
    private void sendResetEmail(String to, String token, String nombre) throws Exception {
        String resetLink = frontendUrl + "/#/reset-password?token=" + token;

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom("nautica.atins@gmail.com", "KBN Admin · Náutica Atins");
        helper.setTo(to);
        helper.setSubject("Restablecer contraseña — KBN Admin");
        helper.setText(buildEmailHtml(nombre, resetLink), true);

        mailSender.send(message);
    }

    // ── Template HTML del email ───────────────────────────────────
    private String buildEmailHtml(String nombre, String resetLink) {
        return "<!DOCTYPE html>" +
            "<html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f0faf7;font-family:system-ui,sans-serif'>" +
            "<div style='max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #c5e8df'>" +

            // Header
            "<div style='background:#0F6E56;padding:28px 32px;text-align:center'>" +
            "<div style='width:52px;height:52px;border-radius:50%;background:#1ABFA0;margin:0 auto 12px;display:flex;align-items:center;justify-content:center'>" +
            "<span style='color:#fff;font-size:22px;font-weight:700'>N</span></div>" +
            "<h1 style='color:#fff;margin:0;font-size:20px;font-weight:500'>KBN Admin</h1>" +
            "<p style='color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px'>Náutica Atins</p>" +
            "</div>" +

            // Body
            "<div style='padding:32px'>" +
            "<h2 style='margin:0 0 12px;font-size:18px;font-weight:500;color:#0a2e27'>Hola, " + nombre + "</h2>" +
            "<p style='color:#3a6b5e;font-size:14px;line-height:1.6;margin:0 0 24px'>" +
            "Recibimos una solicitud para restablecer la contraseña de tu cuenta. " +
            "Hacé clic en el botón para crear una nueva contraseña. " +
            "Este enlace es válido por <strong>" + TOKEN_EXPIRY_HOURS + " horas</strong>." +
            "</p>" +

            "<a href='" + resetLink + "' style='display:block;text-align:center;background:#0F6E56;color:#fff;" +
            "text-decoration:none;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:500;margin-bottom:24px'>" +
            "Restablecer contraseña</a>" +

            "<p style='color:#9ca3af;font-size:12px;line-height:1.5;margin:0'>" +
            "Si no solicitaste este cambio, podés ignorar este email. Tu contraseña no cambiará.<br><br>" +
            "O copiá este enlace en tu navegador:<br>" +
            "<span style='color:#0F6E56;word-break:break-all'>" + resetLink + "</span>" +
            "</p>" +
            "</div>" +

            // Footer
            "<div style='background:#f0faf7;padding:16px 32px;text-align:center;border-top:1px solid #c5e8df'>" +
            "<p style='color:#9ca3af;font-size:12px;margin:0'>© 2026 Náutica Atins · KBN Admin</p>" +
            "</div>" +

            "</div></body></html>";
    }
}