package com.kbn_backend.kbn_backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column
    private String nombre;
    @Column
    private String apellido;
    @Column
    private String email;
    @Column
    private String password;
    @Column
    private String telefono;
    @ManyToOne
    @JoinColumn(name = "role_id")
    private Rol rol;
}