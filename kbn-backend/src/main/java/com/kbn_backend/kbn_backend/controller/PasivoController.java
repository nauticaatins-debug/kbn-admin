package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Pasivo;
import com.kbn_backend.kbn_backend.repository.PasivoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pasivos")
@CrossOrigin(origins = "*")
public class PasivoController {

    @Autowired
    private PasivoRepository pasivoRepository;

    @GetMapping
    public List<Pasivo> listar() {
        return pasivoRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Pasivo> crear(@RequestBody Pasivo pasivo) {
        try {
            // Si el front manda el número como string,
            // Jackson lo convierte a Double automáticamente si el modelo es Double.
            return ResponseEntity.ok(pasivoRepository.save(pasivo));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}