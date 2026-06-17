package com.kbn_backend.kbn_backend.service;

import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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

    @Value("${resend.api.key}")
    private String resendApiKey;

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

    // ── Enviar email via Resend API ───────────────────────────────
    private void sendResetEmail(String to, String token, String nombre) throws Exception {
        String resetLink = frontendUrl + "/#/reset-password?token=" + token;
        String html = buildEmailHtml(nombre, resetLink);

        String jsonBody = "{"
            + "\"from\":\"KBN Admin <onboarding@resend.dev>\","
            + "\"to\":[\"" + to + "\"],"
            + "\"subject\":\"Restablecer contrasena - KBN Admin\","
            + "\"html\":" + jsonEscape(html)
            + "}";

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.resend.com/emails"))
                .header("Authorization", "Bearer " + resendApiKey)
                .header("Content-Type", "application/json; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, java.nio.charset.StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        System.out.println("Resend response: " + response.statusCode() + " - " + response.body());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new Exception("Resend API error: " + response.statusCode() + " - " + response.body());
        }
    }

    // ── Escapar JSON ──────────────────────────────────────────────
    private String jsonEscape(String html) {
        return "\"" + html
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "")
            .replace("\t", "\\t")
            + "\"";
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