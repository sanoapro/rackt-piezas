/* ==========================================================================
   DESCARGABLES — la única lista de documentos del kit.
   La leen las dos páginas: la lámina (para el contador del botón «Descargables»)
   y descargables/index.html (para las tarjetas). Así el número nunca miente.
   Script clásico: desde file:// no se puede hacer fetch() de un JSON local.

   Dos clases de documento:
   · docId   → documento de Google. Deriva solo: Hacer una copia · PDF · Word.
               Debe estar compartido como «cualquiera con el enlace · lector».
   · archivo → archivo publicado en el sitio (URL absoluta). Acciones: Descargar · Abrir.
   Colores: los tokens de la lámina (--rojo, --marino, --naranja, --grafito,
   --acero, --petroleo, --verde, --ambar).
   ========================================================================== */
window.DOCS = [
  {
    id: 'acta',
    nombre: 'Acta de cierre de instalación',
    tipo: 'PDF para imprimir',
    color: '--rojo', color2: '#7a0303', tinte: '--rojo-t',
    desc: 'Se firma con el cliente al terminar la instalación. Con ella se cobra el saldo.',
    archivo: 'https://sanoapro.github.io/rackt-piezas/kit-rackt/descargables/archivos/acta-de-cierre-de-instalacion.pdf',
    nota: 'Una por instalación. El original firmado va al expediente del proyecto.'
  },
  {
    id: 'remision',
    nombre: 'Remisión de entrega de material',
    tipo: 'Word',
    color: '--marino', color2: '#00152f', tinte: '--marino-t',
    desc: 'El cliente confirma que recibió el material completo y como se cotizó.',
    archivo: 'https://sanoapro.github.io/rackt-piezas/kit-rackt/descargables/archivos/remision-de-entrega-de-material.docx',
    nota: 'La descripción de cada material debe ser idéntica a la de la cotización y la factura.'
  }
];
