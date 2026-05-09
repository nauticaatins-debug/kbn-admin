package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Pasivo;
import com.kbn_backend.kbn_backend.repository.PasivoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pasivos")
@CrossOrigin(origins = "*") // Para evitar problemas de CORS
public class PasivoController {

    @Autowired
    private PasivoRepository pasivoRepository;

    // Obtener todos los pasivos
    @GetMapping
    public ResponseEntity<List<Pasivo>> listarPasivos() {
        return ResponseEntity.ok(pasivoRepository.findAll());
    }

    // Crear un nuevo pasivo
    @PostMapping
    public ResponseEntity<Pasivo> crearPasivo(@RequestBody Pasivo pasivo) {
        // Aseguramos que si historial es null, se inicialice
        if (pasivo.getMontoTotal() == null) pasivo.setMontoTotal(0.0);
        return ResponseEntity.ok(pasivoRepository.save(pasivo));
    }
}