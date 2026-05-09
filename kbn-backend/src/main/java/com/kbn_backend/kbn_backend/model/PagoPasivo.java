package com.kbn_backend.kbn_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Data
public class PagoPasivo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double montoPagado;
    private LocalDate fecha;
    private String nota;

    @ManyToOne
    @JoinColumn(name = "pasivo_id")
    @JsonBackReference // ESTO ES VITAL
    private Pasivo pasivo;
}