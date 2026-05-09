package com.kbn_backend.kbn_backend.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;
import java.util.List;
import java.util.ArrayList;

@Entity
@Data
public class Pasivo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String titulo;
    private String descripcion;
    private Double montoTotal; // Asegurate que sea Double
    private String moneda;
    private String fecha;

    @OneToMany(mappedBy = "pasivo", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference // ESTO EVITA EL ERROR 500 POR BUCLE INFINITO
    private List<PagoPasivo> historialPagos = new ArrayList<>();
}