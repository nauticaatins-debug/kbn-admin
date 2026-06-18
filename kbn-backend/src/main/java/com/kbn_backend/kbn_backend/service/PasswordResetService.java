package com.kbn_backend.kbn_backend.service;

import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.repository.UsuarioRepository;
import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PasswordResetService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${sendgrid.api.key}")
    private String sendgridApiKey;

    @Value("${sendgrid.from.email}")
    private String fromEmail;

    @Value("${sendgrid.from.name}")
    private String fromName;

    private static final int TOKEN_EXPIRY_HOURS = 2;

    // ── Solicitar reset ───────────────────────────────────────────
    public void requestPasswordReset(String email) throws Exception {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new Exception("EMAIL_NOT_FOUND"));

        String token = UUID.randomUUID().toString();
        usuario.setResetToken(token);
        usuario.setResetTokenExpiry(LocalDateTime.now().plusHours(TOKEN_EXPIRY_HOURS));
        usuarioRepository.save(usuario);

        try {
            sendResetEmail(email, token, usuario.getNombre());
            System.out.println("Email enviado a: " + email);
        } catch (Exception e) {
            System.err.println("Error enviando email: " + e.getMessage());
            throw e;
        }
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

    // ── Enviar email via SendGrid API ─────────────────────────────
    private void sendResetEmail(String to, String token, String nombre) throws Exception {
        String resetLink = frontendUrl + "/#/reset-password?token=" + token;
        String html = buildEmailHtml(nombre, resetLink);

        Email from = new Email(fromEmail, fromName);
        Email toEmail = new Email(to);
        Content content = new Content("text/html", html);
        Mail mail = new Mail(from, "Restablecer contrasena - KBN Admin", toEmail, content);

        SendGrid sg = new SendGrid(sendgridApiKey);
        Request request = new Request();
        request.setMethod(Method.POST);
        request.setEndpoint("mail/send");
        request.setBody(mail.build());

        Response response = sg.api(request);

        System.out.println("SendGrid response: " + response.getStatusCode() + " - " + response.getBody());

        if (response.getStatusCode() < 200 || response.getStatusCode() >= 300) {
            throw new Exception("SendGrid API error: " + response.getStatusCode() + " - " + response.getBody());
        }
    }

    // ── Template HTML ─────────────────────────────────────────────
    private String buildEmailHtml(String nombre, String resetLink) {
        return "<!DOCTYPE html>"
            + "<html><head><meta charset='UTF-8'></head>"
            + "<body style='margin:0;padding:0;background:#f0faf7;font-family:system-ui,sans-serif'>"
            + "<div style='max-width:480px;margin:40px auto;background:#fff;border-radius:16px;"
            + "overflow:hidden;border:1px solid #c5e8df'>"
            + "<div style='background:#0F6E56;padding:28px 32px;text-align:center'>"
            + "<h1 style='color:#fff;margin:0;font-size:20px;font-weight:500'>KBN Admin</h1>"
            + "<p style='color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px'>Nautica Atins</p>"
            + "</div>"
            + "<div style='padding:32px'>"
            + "<h2 style='margin:0 0 12px;font-size:18px;font-weight:500;color:#0a2e27'>Hola, " + nombre + "</h2>"
            + "<p style='color:#3a6b5e;font-size:14px;line-height:1.6;margin:0 0 24px'>"
            + "Recibimos una solicitud para restablecer tu contrasena. "
            + "Este enlace es valido por <strong>" + TOKEN_EXPIRY_HOURS + " horas</strong>."
            + "</p>"
            + "<a href='" + resetLink + "' style='display:block;text-align:center;background:#0F6E56;"
            + "color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;"
            + "font-size:15px;font-weight:500;margin-bottom:24px'>Restablecer contrasena</a>"
            + "<p style='color:#9ca3af;font-size:12px;line-height:1.5;margin:0'>"
            + "Si no solicitaste este cambio, ignora este email.<br><br>"
            + "O copia este enlace: <span style='color:#0F6E56;word-break:break-all'>"
            + resetLink + "</span>"
            + "</p>"
            + "</div>"
            + "<div style='background:#f0faf7;padding:16px 32px;text-align:center;"
            + "border-top:1px solid #c5e8df'>"
            + "<p style='color:#9ca3af;font-size:12px;margin:0'>2026 Nautica Atins - KBN Admin</p>"
            + "</div>"
            + "</div></body></html>";
    }
}