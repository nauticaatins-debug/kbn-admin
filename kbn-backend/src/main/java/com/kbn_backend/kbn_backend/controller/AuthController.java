package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.dto.UsuarioDto;
import com.kbn_backend.kbn_backend.jwt.model.JwtRequest;
import com.kbn_backend.kbn_backend.jwt.model.JwtResponse;
import com.kbn_backend.kbn_backend.jwt.service.JwtUserDetailsService;
import com.kbn_backend.kbn_backend.jwt.util.JwtUtil;
import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.service.PasswordResetService;
import com.kbn_backend.kbn_backend.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@CrossOrigin(origins = "https://kbn-admin.vercel.app", allowCredentials = "true")
public class AuthController {

    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private JwtUserDetailsService userDetailsService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private UsuarioService usuarioService;
    @Autowired private PasswordResetService passwordResetService;

    // ── Login ─────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> createAuthenticationToken(@RequestBody JwtRequest authenticationRequest) throws Exception {
        authenticate(authenticationRequest.getEmail(), authenticationRequest.getPassword());

        final UserDetails userDetails = userDetailsService.loadUserByUsername(authenticationRequest.getEmail());
        Usuario usuario = usuarioService.findByEmail(authenticationRequest.getEmail())
                .orElseThrow(() -> new Exception("User not found"));

        List<String> roles = userDetails.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .collect(Collectors.toList());

        final String token = jwtUtil.generateToken(userDetails, roles, usuario.getNombre(), usuario.getApellido());
        return ResponseEntity.ok(new JwtResponse(token));
    }

    // ── Register ──────────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<?> saveUser(@RequestBody UsuarioDto usuario) throws Exception {
        usuario.setRol("INSTRUCTOR");
        return ResponseEntity.ok(userDetailsService.save(usuario));
    }

    // ── Solicitar reset de contraseña ─────────────────────────────
    @PostMapping("/auth/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email requerido."));
        }
        try {
            passwordResetService.requestPasswordReset(email.trim().toLowerCase());
            // Siempre responder OK para no exponer si el email existe
            return ResponseEntity.ok(Map.of("message", "Si el email existe, recibirás un enlace en breve."));
        } catch (Exception e) {
            // Mismo mensaje aunque falle — seguridad
            return ResponseEntity.ok(Map.of("message", "Si el email existe, recibirás un enlace en breve."));
        }
    }

    // ── Validar token (opcional, para mostrar error rápido en el front) ───
    @GetMapping("/auth/validate-reset-token")
    public ResponseEntity<?> validateToken(@RequestParam String token) {
        boolean valid = passwordResetService.validateToken(token);
        if (valid) {
            return ResponseEntity.ok(Map.of("valid", true));
        } else {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", "El enlace es inválido o expiró."));
        }
    }

    // ── Cambiar contraseña ────────────────────────────────────────
    @PostMapping("/auth/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String token    = body.get("token");
        String password = body.get("password");

        if (token == null || password == null || password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "Token y contraseña (mínimo 6 caracteres) son requeridos."));
        }
        try {
            passwordResetService.resetPassword(token, password);
            return ResponseEntity.ok(Map.of("message", "Contraseña actualizada correctamente."));
        } catch (Exception e) {
            String msg = switch (e.getMessage()) {
                case "TOKEN_EXPIRED" -> "El enlace expiró. Solicitá uno nuevo.";
                case "TOKEN_INVALID" -> "El enlace es inválido.";
                default -> "Error al restablecer la contraseña.";
            };
            return ResponseEntity.badRequest().body(Map.of("message", msg));
        }
    }

    // ── Auth helper ───────────────────────────────────────────────
    private void authenticate(String email, String password) throws Exception {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, password));
        } catch (DisabledException e) {
            throw new Exception("USER_DISABLED", e);
        } catch (BadCredentialsException e) {
            throw new Exception("INVALID_CREDENTIALS", e);
        }
    }
}