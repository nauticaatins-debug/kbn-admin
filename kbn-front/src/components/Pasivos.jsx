// Re-export desde la carpeta modularizada.
// Todos los imports existentes que apunten a './Pasivos' siguen funcionando.
export { default } from './Pasivos/index';
export { decodeTarifa, encodeTarifa } from './Pasivos/PasivosShared';