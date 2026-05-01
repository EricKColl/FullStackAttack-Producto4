// ====== Datos iniciales del proyecto JobConnect ======
// Este archivo solo contiene semillas para la primera carga.
// A partir del Producto 2, la persistencia real vive en almacenaje.js

export const usuariosIniciales = [
  {
    id: 1,
    nombre: "Laura",
    apellidos: "Martínez",
    email: "laura@jobconnect.com",
    password: "1234",
    rol: "candidato"
  },
  {
    id: 2,
    nombre: "Carlos",
    apellidos: "Gómez",
    email: "carlos@techempresa.com",
    password: "1234",
    rol: "empresa"
  },
  {
    id: 3,
    nombre: "Ana",
    apellidos: "Ruiz",
    email: "ana@jobconnect.com",
    password: "1234",
    rol: "candidato"
  }
];

export const publicacionesIniciales = [
  {
    id: 1,
    tipo: "oferta",
    titulo: "Desarrollador/a Web Junior",
    categoria: "Desarrollo Web",
    autor: "TechNova SL",
    ubicacion: "Barcelona",
    descripcion: "Buscamos perfil junior con conocimientos de HTML, CSS y JavaScript.",
    emailContacto: "rrhh@technova.com",
    fecha: "2026-03-10"
  },
  {
    id: 2,
    tipo: "demanda",
    titulo: "Busco prácticas en frontend",
    categoria: "Frontend",
    autor: "Laura Martínez",
    ubicacion: "Girona",
    descripcion: "Estudiante DAW interesada en prácticas para aprender React y UX/UI.",
    emailContacto: "laura@jobconnect.com",
    fecha: "2026-03-12"
  },
  {
    id: 3,
    tipo: "oferta",
    titulo: "Técnico/a de soporte IT",
    categoria: "Sistemas",
    autor: "Innova Services",
    ubicacion: "Tarragona",
    descripcion: "Se requiere perfil para soporte técnico presencial y remoto.",
    emailContacto: "empleo@innovaservices.com",
    fecha: "2026-03-14"
  },
  {
    id: 4,
    tipo: "demanda",
    titulo: "Colaboración en startup tecnológica",
    categoria: "Full Stack",
    autor: "Ana Ruiz",
    ubicacion: "Remoto",
    descripcion: "Busco colaborar en un proyecto real para ganar experiencia práctica y portfolio.",
    emailContacto: "ana@jobconnect.com",
    fecha: "2026-03-15"
  }
];
