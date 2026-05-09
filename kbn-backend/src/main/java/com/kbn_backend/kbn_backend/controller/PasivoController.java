package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Pasivo;
import com.kbn_backend.kbn_backend.repository.PasivoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pasivos")
public class PasivoController {

    @Autowired
    private PasivoRepository pasivoRepository;

    // Obtener todos los pasivos (Soluciona el GET 500)
    @GetMapping
    public ResponseEntity<List<Pasivo>> listarPasivos() {
        return ResponseEntity.ok(pasivoRepository.findAll());
    }

    // Crear un nuevo pasivo (Soluciona el POST 500)
    @PostMapping
    public ResponseEntity<Pasivo> crearPasivo(@RequestBody Pasivo pasivo) {
        return ResponseEntity.ok(pasivoRepository.save(pasivo));
    }
}