/* ==========================================================================
   Motion — motor de movimiento compartido de las páginas de RACK-T
   Script CLÁSICO (no módulo ES): los módulos no cargan desde file:// y las
   páginas deben abrir con doble clic. Expone un solo global: window.Motion.

   Las cuatro reglas que este archivo hace cumplir:
   1. UN SOLO BUCLE. Todo lo que depende del cursor o del scroll se registra
      con Motion.onFrame(job) y corre dentro de un único requestAnimationFrame.
      Nadie pone su propio listener de scroll: con varios, cada uno forzaba un
      recálculo de estilos y la página se trababa en equipos modestos.
   2. LOS LISTENERS SOLO GUARDAN COORDENADAS. getBoundingClientRect se lee
      dentro del frame, nunca en el evento. pointermove dispara cientos de
      veces por segundo; leer geometría ahí provoca "layout thrashing".
   3. SE RESPETA "REDUCIR MOVIMIENTO". Con esa preferencia todo se monta en su
      estado final y el bucle no arranca. En táctil (pointer:coarse) los
      efectos de cursor no se montan: no hay cursor que seguir y quedarían a medias.
   4. NADA SE OCULTA HASTA QUE EL MOTOR CONFIRMA QUE CORRIÓ. El CSS solo
      esconde lo revelable bajo html.mo-ready, y esa clase la pone start(),
      que cada página llama en su ÚLTIMA línea. Si este archivo da 404 o falla,
      la página se ve completa y quieta, nunca en blanco.

   Este archivo NO define colores: el color es de cada página.
   ========================================================================== */
(function () {
  'use strict';

  var raiz = document.documentElement;
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q).matches : false; };
  var reducir = mq('(prefers-reduced-motion: reduce)');
  var tactil = mq('(pointer: coarse)');

  /* --- Estado compartido del cursor: el evento solo escribe aquí (regla 2) --- */
  var cursor = { x: -9999, y: -9999, movio: false };
  if (!tactil && !reducir) {
    window.addEventListener('pointermove', function (e) {
      cursor.x = e.clientX; cursor.y = e.clientY; cursor.movio = true;
    }, { passive: true });
  }

  /* La página puede estar escalada (la lámina del kit se escala con transform).
     Los desplazamientos que escribimos viven en coordenadas del contenido, así
     que se dividen entre la escala. Si la página no escala, vale 1. */
  var escala = function () { return window.__scale || 1; };

  /* --- Regla 1: un solo bucle --- */
  var trabajos = [];
  var corriendo = false;
  function bucle() {
    for (var i = 0; i < trabajos.length; i++) {
      try { trabajos[i](); } catch (err) { console.error('Motion: un trabajo falló', err); }
    }
    cursor.movio = false;           // se consume una vez por frame
    requestAnimationFrame(bucle);
  }
  function onFrame(fn) {
    trabajos.push(fn);
    // Regla 3: con "reducir movimiento" el bucle nunca arranca
    if (!corriendo && !reducir) { corriendo = true; requestAnimationFrame(bucle); }
    return function quitar() { var k = trabajos.indexOf(fn); if (k > -1) trabajos.splice(k, 1); };
  }

  function qsa(sel, base) { return Array.prototype.slice.call((base || document).querySelectorAll(sel)); }

  /* --- Cascada de entrada ---
     stagger marca a los hijos directos como revelables y les da un retardo
     escalonado. No los oculta: eso lo hace el CSS solo bajo html.mo-ready. */
  function stagger(contenedor, pasoMs, inicioMs) {
    if (!contenedor) return;
    var hijos = Array.prototype.slice.call(contenedor.children);
    hijos.forEach(function (h, i) {
      h.classList.add('mo-reveal');
      h.style.setProperty('--mo-delay', ((inicioMs || 0) + i * (pasoMs || 60)) + 'ms');
    });
  }

  /* revealAll: agrega .mo-in cuando el elemento entra en pantalla.
     En la lámina (sin scroll) se usa con umbral 0 y sin rootMargin. */
  function revealAll(selector, opciones) {
    var els = qsa(selector);
    if (reducir || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('mo-in'); });
      return;
    }
    opciones = opciones || {};
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('mo-in'); io.unobserve(en.target); }
      });
    }, { threshold: opciones.threshold || 0, rootMargin: opciones.rootMargin || '0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* --- Imán: el elemento interior se acerca al cursor ---
     wrap es la referencia de posición y NO se mueve (así su rectángulo no
     cambia con el propio efecto); inner es el que se desplaza. */
  function magnetic(wrap, inner, radio, fuerza) {
    if (tactil || reducir || !wrap || !inner) return;
    var activo = false;
    onFrame(function () {
      if (!cursor.movio && !activo) return;            // nada que recalcular
      var r = wrap.getBoundingClientRect();            // lectura DENTRO del frame
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = cursor.x - cx, dy = cursor.y - cy, s = escala();
      var alcance = (radio || 100) * s + Math.max(r.width, r.height) / 2;
      if (Math.sqrt(dx * dx + dy * dy) < alcance) {
        activo = true;
        inner.style.transform = 'translate(' + (dx * (fuerza || 0.2) / s).toFixed(2) + 'px,' + (dy * (fuerza || 0.2) / s).toFixed(2) + 'px)';
      } else if (activo) {
        activo = false;
        inner.style.transform = '';
      }
    });
  }

  /* --- Inclinación 3D bajo el cursor --- */
  function tilt(el, grados) {
    if (tactil || reducir || !el) return;
    var encima = false, estaba = false;
    el.addEventListener('pointerenter', function () { encima = true; });
    el.addEventListener('pointerleave', function () { encima = false; });
    onFrame(function () {
      if (!encima) {
        if (estaba) { el.style.transform = ''; estaba = false; }
        return;
      }
      if (!cursor.movio && estaba) return;
      var r = el.getBoundingClientRect();
      var px = (cursor.x - r.left) / r.width - 0.5, py = (cursor.y - r.top) / r.height - 0.5;
      var g = grados || 5;
      el.style.transform = 'perspective(700px) rotateX(' + (-py * g).toFixed(2) + 'deg) rotateY(' + (px * g).toFixed(2) + 'deg)';
      estaba = true;
    });
  }

  /* --- Botón que dice lo que pasó y vuelve solo ---
     Devuelve una función que se llama cuando la acción terminó bien. */
  function botonEstado(btn, op) {
    op = op || {};
    var original = null, t = null;
    return function marcar(texto) {
      if (!btn) return;
      if (original === null) original = btn.innerHTML;
      clearTimeout(t);
      btn.classList.add('mo-hecho');
      btn.setAttribute('data-estado', 'hecho');
      btn.innerHTML = texto || op.hecho || '✓ Listo';
      t = setTimeout(function () {
        btn.classList.remove('mo-hecho');
        btn.removeAttribute('data-estado');
        btn.innerHTML = original;
        original = null;
      }, (op.msTrabajo || 0) + (op.msHecho || 1400));
    };
  }

  /* --- Barra de avance de lectura (lee el scroll dentro del frame) --- */
  function progressBar(el) {
    if (!el) return;
    el.classList.add('mo-progress');
    var pintar = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 1).toFixed(4) + ')';
    };
    if (reducir) { window.addEventListener('scroll', pintar, { passive: true }); pintar(); return; }  // sin bucle, pero la barra informa
    var ultimo = -1;
    onFrame(function () { if (window.scrollY !== ultimo) { ultimo = window.scrollY; pintar(); } });
  }

  /* --- Paralaje suave --- */
  function parallax(el, factor) {
    if (reducir || !el) return;
    var ultimo = -1;
    onFrame(function () {
      if (window.scrollY === ultimo) return;
      ultimo = window.scrollY;
      el.style.transform = 'translateY(' + (window.scrollY * (factor || 0.1)).toFixed(1) + 'px)';
    });
  }

  /* --- Regla 4: la última línea de cada página ---
     Solo aquí se permite al CSS esconder lo revelable. */
  function start() {
    raiz.classList.add('mo-ready');
    if (reducir) raiz.classList.add('mo-quieto');
    if (tactil) raiz.classList.add('mo-tactil');
  }

  window.Motion = {
    onFrame: onFrame, qsa: qsa, stagger: stagger, revealAll: revealAll,
    magnetic: magnetic, tilt: tilt, botonEstado: botonEstado,
    progressBar: progressBar, parallax: parallax, start: start,
    reducir: reducir, tactil: tactil, cursor: cursor
  };
})();
