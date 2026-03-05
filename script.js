document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // PANEL DE CONFIGURACIÓN CENTRALIZADO
  // ==========================================
  const CONFIG = {
    aranceles: {
      tramiteSimple: 50000,
      escalas: [
        { tope: 40000000,   normal: 85000,  prioritario: 170000 },
        { tope: 160000000,  normal: 105000, prioritario: 210000 },
        { tope: 650000000,  normal: 130000, prioritario: 260000 },
        { tope: 2600000000, normal: 160000, prioritario: 320000 },
        { tope: Infinity,   normal: 200000, prioritario: 400000 },
      ],
    },
    tiposConCalculadora: [
      "Estados Contables Soc. Comerciales",
      "Estados Contables Entidades Sin F/ Lucros",
      "Estados Contables De Cooperativa",
      "Estados Contables Intermedios",
      "Compilación",
      "Estados Contables Especiales",
      "Rectificativo",
    ],
    tiposConDescuento: [
      "Estados Contables Entidades Sin F/ Lucros",
      "Estados Contables De Cooperativa",
    ],
    mail: {
      endpoint: 'https://script.google.com/macros/s/AKfycbw3AqYbVEEF5ByaCxRfrtPo_xafEVM7d0vGGlZ52unDtvbifwTAMHKa2XJNgz_u_jAr0w/exec',
      subject: 'Resultado Calculadora de Arancel CPCE Mendoza',
    },
  };

  // ==========================================
  // 1. ESTADO CENTRALIZADO
  // ==========================================
  const createInitialState = () => ({
    tipoTramite: '',
    esPrioritario: false,
    porcentajeDescuento: 0,
    valoresCalculados: { importeBase: 0, arancelFinal: 0 },
    calculoRealizado: false,
  });

  let state = createInitialState();

  // ==========================================
  // 2. GESTOR DE VISTAS
  // FIX: 'checkDiscount' ahora apunta a 'checkDiscountScreen' (renombrado en HTML)
  // ==========================================
  const screens = {
    initial:        document.getElementById('initialScreen'),
    check:          document.getElementById('checkScreen'),
    checkDiscount:  document.getElementById('checkDiscountScreen'),
    prioridad:      document.getElementById('prioridadScreen'),
    calculator:     document.getElementById('calculatorScreen'),
    simpleResult:   document.getElementById('simpleResultScreen'),
  };

  function navegarA(pantallaId) {
    Object.values(screens).forEach(s => (s.style.display = 'none'));
    if (screens[pantallaId]) screens[pantallaId].style.display = 'block';
  }

  // ==========================================
  // 3. LÓGICA DE NEGOCIO (Funciones Puras)
  // ==========================================
  function calcularArancel(activo, pasivo, ingresos, esPrioritario, descuento) {
    const importeBase = (activo + pasivo + ingresos) / 2;
    const escala      = CONFIG.aranceles.escalas.find(e => importeBase <= e.tope);
    const arancelBruto = esPrioritario ? escala.prioritario : escala.normal;
    const arancelFinal = arancelBruto * (1 - descuento);
    return { importeBase, arancelFinal };
  }

  // ==========================================
  // 4. VALIDACIÓN
  // FIX: Se agrega validación de campo vacío además de NaN/negativo
  // ==========================================
  function validarCamposNumericos(...valores) {
    return valores.every(v => typeof v === 'number' && !isNaN(v) && v >= 0);
  }

  // FIX: Al menos uno debe ser > 0 para evitar calcular sobre tres ceros
  function camposTienenDatos(activo, pasivo, ingresos) {
    return activo > 0 || pasivo > 0 || ingresos > 0;
  }

  function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  // ==========================================
  // 5. SERVICIO DE MAIL
  // ==========================================
  async function enviarMail(body) {
    const recipient = await pedirEmailModal();
    if (!recipient) return;

    mostrarLoadingMail(true);

    try {
      const res = await fetch(CONFIG.mail.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          recipient,
          subject: CONFIG.mail.subject,
          body,
        }).toString(),
      });

      if (!res.ok) throw new Error(`Error del servidor: ${res.status} ${res.statusText}`);
      mostrarNotificacion('Correo enviado exitosamente.', 'success');
    } catch (error) {
      console.error('[enviarMail]', error);
      mostrarNotificacion(`No se pudo enviar el correo: ${error.message}`, 'error');
    } finally {
      mostrarLoadingMail(false);
    }
  }

  // ==========================================
  // 6. UI HELPERS
  // FIX: Modal ahora es un elemento estático del HTML (no se crea/destruye en cada uso)
  //      Esto evita problemas con listeners huérfanos y es más performante
  // ==========================================
  const emailOverlay  = document.getElementById('emailModalOverlay');
  const emailInput    = document.getElementById('emailInput');
  const emailError    = document.getElementById('emailError');
  const btnModalOk    = document.getElementById('emailModalConfirm');
  const btnModalCancel = document.getElementById('emailModalCancel');

  let resolveModal = null;

  function pedirEmailModal() {
    return new Promise((resolve) => {
      resolveModal = resolve;
      emailInput.value = '';
      emailError.textContent = '';
      emailOverlay.style.display = 'flex';
      emailInput.focus();
    });
  }

  function cerrarModal(valor) {
    emailOverlay.style.display = 'none';
    if (resolveModal) {
      resolveModal(valor);
      resolveModal = null;
    }
  }

  btnModalOk.addEventListener('click', () => {
    const val = emailInput.value.trim();
    if (!validarEmail(val)) {
      emailError.textContent = 'Ingresá un email válido.';
      emailInput.focus();
      return;
    }
    cerrarModal(val);
  });

  btnModalCancel.addEventListener('click', () => cerrarModal(null));

  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  btnModalOk.click();
    if (e.key === 'Escape') cerrarModal(null);
  });

  // Cerrar al hacer click fuera del modal
  emailOverlay.addEventListener('click', (e) => {
    if (e.target === emailOverlay) cerrarModal(null);
  });

  function mostrarLoadingMail(activo) {
    let loader = document.getElementById('mailLoader');
    if (activo) {
      if (!loader) {
        loader = document.createElement('div');
        loader.id = 'mailLoader';
        loader.textContent = 'Enviando correo…';
        loader.setAttribute('aria-live', 'polite');
        document.body.appendChild(loader);
      }
    } else {
      loader?.remove();
    }
  }

  function mostrarNotificacion(mensaje, tipo = 'info') {
    const notif = document.createElement('div');
    notif.className = `notificacion notificacion--${tipo}`;
    notif.textContent = mensaje;
    notif.setAttribute('role', 'alert');
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
  }

  // ==========================================
  // 7. CONTROLADORES DE EVENTOS
  // ==========================================
  document.getElementById('initialForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.tipoTramite = document.getElementById('tipoTramite').value;

    if (CONFIG.tiposConCalculadora.includes(state.tipoTramite)) {
      navegarA('check');
    } else {
      renderizarResultadoSimple();
      navegarA('simpleResult');
    }
  });

  document.getElementById('checkForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.esPrioritario = document.getElementById('prioridadCheck').checked;

    if (state.esPrioritario) {
      navegarA('prioridad');
    } else if (CONFIG.tiposConDescuento.includes(state.tipoTramite)) {
      navegarA('checkDiscount');
    } else {
      navegarA('calculator');
    }
  });

  document.getElementById('discountForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const opcion = document.querySelector('input[name="discountCheck"]:checked');
    state.porcentajeDescuento = opcion ? parseFloat(opcion.value) / 100 : 0;
    navegarA('calculator');
  });

  document.getElementById('continuarConPrioridad').addEventListener('click', () => {
    navegarA('calculator');
  });

  document.getElementById('arancelForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const activo   = parsearInput('activo');
    const pasivo   = parsearInput('pasivo');
    const ingresos = parsearInput('ingresos');

    // FIX: Validación robusta — tipos correctos + al menos un valor > 0
    if (!validarCamposNumericos(activo, pasivo, ingresos)) {
      mostrarNotificacion('Por favor ingresá valores numéricos válidos.', 'error');
      return;
    }
    if (!camposTienenDatos(activo, pasivo, ingresos)) {
      mostrarNotificacion('Ingresá al menos un importe mayor a cero.', 'error');
      return;
    }

    state.valoresCalculados = calcularArancel(
      activo, pasivo, ingresos,
      state.esPrioritario,
      state.porcentajeDescuento
    );
    state.calculoRealizado = true;

    renderizarResultadoCalculadora();

    // FIX: Mostrar botones de acción recién cuando hay resultado
    document.getElementById('calculatorActions').style.display = 'block';
  });

  // FIX: Listeners directos sobre botones estáticos (no dentro del form)
  document.getElementById('enviarMail').addEventListener('click', () => {
    if (!state.calculoRealizado) {
      mostrarNotificacion('Primero realizá el cálculo.', 'error');
      return;
    }
    handleEnviarMailCalculadora();
  });

  document.getElementById('otraConsulta').addEventListener('click', reiniciarApp);
  document.getElementById('enviarMailSimple').addEventListener('click', handleEnviarMailSimple);
  document.getElementById('otraConsultaSimple').addEventListener('click', reiniciarApp);

  // ==========================================
  // 8. HANDLERS DE MAIL
  // ==========================================
  function handleEnviarMailCalculadora() {
    const { importeBase, arancelFinal } = state.valoresCalculados;
    const body = [
      `Importe Base De Búsqueda: $${formatNumber(importeBase.toFixed(2))}`,
      `Arancel a pagar: $${formatNumber(arancelFinal)}`,
      '',
      'El arancel incluye dos ejemplares. Para copias adicionales el 50% del arancel vigente.',
      '',
      'El arancel por escala corresponde para:',
      ...CONFIG.tiposConCalculadora.map(t => `  - ${t}`),
      '',
      'Te esperamos en Mi Cuenta para gestionar el trámite.',
      'https://micuenta.cpcemza.org.ar/',
    ].join('\n');

    enviarMail(body);
  }

  function handleEnviarMailSimple() {
    const body = [
      `Trámite: ${state.tipoTramite}`,
      `El valor del trámite es $${formatNumber(CONFIG.aranceles.tramiteSimple)}`,
    ].join('\n');

    enviarMail(body);
  }

  // ==========================================
  // 9. RENDERIZADO
  // ==========================================
  function renderizarResultadoSimple() {
    document.getElementById('simpleResult').innerHTML = `
      <p><b>Trámite:</b> ${state.tipoTramite}</p>
      <p>El valor del trámite es $${formatNumber(CONFIG.aranceles.tramiteSimple)}</p>
    `;
  }

  function renderizarResultadoCalculadora() {
    const { importeBase, arancelFinal } = state.valoresCalculados;
    const listaItems = CONFIG.tiposConCalculadora.map(t => `<li>${t}</li>`).join('');

    document.getElementById('resultado').innerHTML = `
      <p><b>Importe Base de Búsqueda:</b> $${formatNumber(importeBase.toFixed(2))}</p>
      <p><b>Arancel a pagar:</b> $${formatNumber(arancelFinal)}</p>
      <p>El arancel incluye dos ejemplares. Para copias adicionales el 50% del arancel vigente.</p>
      <p style="text-align:left;">El arancel por escala corresponde para:</p>
      <ul>${listaItems}</ul>
      <p>Te esperamos en Mi Cuenta para gestionar el trámite.</p>
      <p>
        <a href="https://micuenta.cpcemza.org.ar/" target="_blank" rel="noopener noreferrer">
          <button type="button">Ingresar a Mi Cuenta</button>
        </a>
      </p>
    `;
  }

  // ==========================================
  // 10. RESET
  // ==========================================
  function reiniciarApp() {
    state = createInitialState();

    ['arancelForm', 'checkForm', 'initialForm', 'discountForm'].forEach(id => {
      document.getElementById(id)?.reset();
    });

    document.getElementById('resultado').innerHTML = '';
    document.getElementById('simpleResult').innerHTML = '';
    document.getElementById('calculatorActions').style.display = 'none';

    navegarA('initial');
  }

  // ==========================================
  // 11. UTILIDADES DE FORMATEO
  // ==========================================
  // FIX: parsearInput siempre devuelve Number
  function parsearInput(id) {
    const raw = document.getElementById(id)?.value ?? '';
    return formatToNumber(raw);
  }

  // Formateo en tiempo real de los inputs
  document.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('input', function () {
      const num = formatToNumber(this.value);
      this.value = isNaN(num) ? '' : formatNumber(num);
    });
  });

  // FIX: Siempre retorna Number, nunca string con coma al final
  function formatToNumber(value) {
    if (!value) return 0;
    const cleaned = value.toString().replace(/\./g, '').replace(/,/g, '.');
    const result  = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
  }

  function formatNumber(number) {
    const num   = Number(number);
    const parts = num.toFixed(2).split('.');
    parts[0]    = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts[1] === '00' ? parts[0] : `${parts[0]},${parts[1]}`;
  }

});