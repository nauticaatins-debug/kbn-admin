package com.kbn_backend.kbn_backend.service;

import com.kbn_backend.kbn_backend.model.Rol;
import com.kbn_backend.kbn_backend.repository.RolRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RolService {

    private final RolRepository rolRepository;

    public RolService(RolRepository rolRepository) {
        this.rolRepository = rolRepository;
    }

    public Rol createRole(Rol rol) {
        return rolRepository.save(rol);
    }

    public List<Rol> getAllRoles() {
        return rolRepository.findAllRoles();
    }

    public Optional<Rol> getRoleById(Long id) {
        return rolRepository.findById(id);
    }

    public Optional<Rol> updateRole(Long id, Rol rol) {
        if (rolRepository.existsById(id)) {
            rol.setId(id);
            return Optional.of(rolRepository.save(rol));
        }
        return Optional.empty();
    }

    public boolean deleteRole(Long id) {
        if (rolRepository.existsById(id)) {
            rolRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
