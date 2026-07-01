package com.kbn_backend.kbn_backend.repository;

import com.kbn_backend.kbn_backend.model.Rol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface RolRepository extends JpaRepository<Rol, Long> {
    Rol findByNombre(String nombre);

    @Query("SELECT r FROM Rol r")
    List<Rol> findAllRoles();
}
