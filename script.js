document.addEventListener('DOMContentLoaded', () => {
  const initialForm = document.getElementById('initialForm');
  const checkForm = document.getElementById('checkForm');
  const arancelForm = document.getElementById('arancelForm');
  const initialScreen = document.getElementById('initialScreen');
  const checkScreen = document.getElementById('checkScreen');
  const checkScreenDiscount = document.getElementById('checkScreenDiscount');
  const prioridadScreen = document.getElementById('prioridadScreen');
  const calculatorScreen = document.getElementById('calculatorScreen');
  const simpleResultScreen = document.getElementById('simpleResultScreen');
  const resultado = document.getElementById('resultado');

  const tiposConCalculadora = [
    "Estados Contables Soc. Comerciales",
    "Estados Contables Entidades Sin F/ Lucros",
    "Estados Contables De Cooperativa",
    "Estados Contables Intermedios",
    "Compilación",
    "Estados Contables Especiales",
    "Rectificativo"
  ];

  let discountPercentage = 0; // Variable para el descuento
  let tipoTramiteSeleccionado = ''; // Variable para guardar el tipo de trámite seleccionado

  initialForm.addEventListener('submit', function(event) {
    event.preventDefault();
    tipoTramiteSeleccionado = document.getElementById('tipoTramite').value;

    if (tiposConCalculadora.includes(tipoTramiteSeleccionado)) {
      initialScreen.style.display = 'none';
      checkScreen.style.display = 'block'; // Muestra la pantalla de chequeo
    } else {
      initialScreen.style.display = 'none';
      simpleResultScreen.style.display = 'block';
      document.getElementById('simpleResult').innerHTML = `
        <p><b>Trámite:</b> ${tipoTramiteSeleccionado}</p>
        <p>El valor del trámite es $50.000</p>
        <button type="button" id="enviarMailSimple">Enviar por Mail</button>
        <button type="button" id="otraConsultaSimple">Otra Consulta</button>
      `;
      document.getElementById('enviarMailSimple').addEventListener('click', () => enviarMail(false));
      document.getElementById('otraConsultaSimple').addEventListener('click', () => {
        simpleResultScreen.style.display = 'none';
        initialScreen.style.display = 'block';
        document.getElementById('simpleResult').innerHTML = '';
      });
    }
  });

  checkForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const prioridadCheck = document.getElementById('prioridadCheck').checked;
  
    // Obtén el tipo de trámite seleccionado
    const tipoTramiteSeleccionado = document.getElementById('tipoTramite').value;
  
    if (prioridadCheck) {
      checkScreen.style.display = 'none';
      prioridadScreen.style.display = 'block';
    } else {
      // Verifica si el tipo de trámite seleccionado es uno de los que tienen descuento
      if (
        tipoTramiteSeleccionado === "Estados Contables Entidades Sin F/ Lucros" || 
        tipoTramiteSeleccionado === "Estados Contables De Cooperativa"
      ) {
        checkScreen.style.display = 'none';
        checkScreenDiscount.style.display = 'block'; // Muestra la pantalla de descuentos
      } else {
        checkScreen.style.display = 'none';
        calculatorScreen.style.display = 'block';
      }
    }
  });
  

  checkScreenDiscount.addEventListener('submit', function(event) {
    event.preventDefault();

    // Obtener el descuento seleccionado
    const discountOptions = document.getElementsByName('discountCheck');
    discountPercentage = 0; // Reiniciar el descuento

    for (const option of discountOptions) {
      if (option.checked) {
        discountPercentage = parseFloat(option.value) / 100; // Convertir a porcentaje
        break;
      }
    }

    // Ir a la calculadora
    calculatorScreen.style.display = 'block'; 
  });

  arancelForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const activo = formatToNumber(document.getElementById('activo').value);
    const pasivo = formatToNumber(document.getElementById('pasivo').value);
    const ingresos = formatToNumber(document.getElementById('ingresos').value);

    calcularArancel(activo, pasivo, ingresos);
  });

  document.getElementById('enviarMail').addEventListener('click', () => enviarMail(true));
  document.getElementById('otraConsulta').addEventListener('click', () => {
    arancelForm.reset();
    calculatorScreen.style.display = 'none';
    initialScreen.style.display = 'block';
    resultado.innerHTML = '';
  });

  document.getElementById('continuarConPrioridad').addEventListener('click', () => {
    prioridadScreen.style.display = 'none';
    calculatorScreen.style.display = 'block';
  });

  document.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('input', function() {
      let value = this.value;
      value = value.replace(/[^0-9,]/g, '');
      this.value = formatNumber(formatToNumber(value));
    });
  });

  function calcularArancel(activo, pasivo, ingresos) {
    const importeBaseBusqueda = (activo + pasivo + ingresos) / 2;
    let arancel;

    if (document.getElementById('prioridadCheck').checked) {
      // Cálculo para trámites prioritarios
      if (importeBaseBusqueda <= 40000000) {
        arancel = 170000;
      } else if (importeBaseBusqueda <= 160000000) {
        arancel = 210000;
      } else if (importeBaseBusqueda <= 650000000) {
        arancel = 260000;
      } else if (importeBaseBusqueda <= 2600000000) {
        arancel = 320000;
      } else {
        arancel = 400000;
      }
    } else {
      // Cálculo para trámites no prioritarios
      if (importeBaseBusqueda <= 40000000) {
        arancel = 85000;
      } else if (importeBaseBusqueda <= 160000000) {
        arancel = 105000;
      } else if (importeBaseBusqueda <= 650000000) {
        arancel = 130000;
      } else if (importeBaseBusqueda <= 2600000000) {
        arancel = 160000;
      } else {
        arancel = 200000;
      }
    }

    // Aplicar el descuento si corresponde
    const descuento = arancel * discountPercentage;
    const arancelFinal = arancel - descuento;

    const formattedImporteBase = formatNumber(parseFloat(importeBaseBusqueda).toFixed(2));

    const formattedArancel = formatNumber(arancelFinal);

    resultado.innerHTML = `
      <p><b>Importe Base de Búsqueda:</b> $${formattedImporteBase}</p>
      <p><b>Arancel a pagar:</b> $${formattedArancel}</p>
      <p>El arancel incluye dos ejemplares. Para copias adicionales el 50% del arancel vigente.</p>
      <p style="text-align: left;">El arancel por escala solo corresponde para los siguientes trámites:</p>
      <ul>
        <li>Estados contables soc. comerciales</li>
        <li>Estados contables entidades sin f/ lucros</li>
        <li>Estados contables de cooperativa</li>
        <li>Estados contables intermedios</li>
        <li>Compilación</li>
        <li>Estados contables especiales</li>
        <li>Rectificativos</li>
      </ul>
      <p>Te esperamos en Mi Cuenta para gestionar el trámite.</p>
      <p><a href="https://micuenta.cpcemza.org.ar/" target="_blank"><button>Ingresar a Mi Cuenta</button></a></p>`;
  }

  function enviarMail(isCalculator) {
    const tipoTramite = document.getElementById('tipoTramite').value;
    let body;

    if (isCalculator) {
        const activo = formatToNumber(document.getElementById('activo').value);
        const pasivo = formatToNumber(document.getElementById('pasivo').value);
        const ingresos = formatToNumber(document.getElementById('ingresos').value);
        const importeBaseBusqueda = (activo + pasivo + ingresos) / 2;
        let arancel;

        if (document.getElementById('prioridadCheck').checked) {
            // Cálculo para trámites prioritarios
            if (importeBaseBusqueda <= 40000000) {
              arancel = 170000;
            } else if (importeBaseBusqueda <= 160000000) {
              arancel = 210000;
            } else if (importeBaseBusqueda <= 650000000) {
              arancel = 260000;
            } else if (importeBaseBusqueda <= 2600000000) {
              arancel = 320000;
            } else {
              arancel = 400000;
            }
        } else {
            // Cálculo para trámites no prioritarios
            if (importeBaseBusqueda <= 40000000) {
              arancel = 85000;
            } else if (importeBaseBusqueda <= 160000000) {
              arancel = 105000;
            } else if (importeBaseBusqueda <= 650000000) {
              arancel = 130000;
            } else if (importeBaseBusqueda <= 2600000000) {
              arancel = 160000;
            } else {
              arancel = 200000;
            }
        }

        // Aplicar descuento si corresponde
        const descuento = arancel * discountPercentage;
        const arancelFinal = arancel - descuento;

      const formattedImporteBase = formatNumber(importeBaseBusqueda);
      const formattedArancel = formatNumber(arancelFinal);

      body = `Importe Base De Búsqueda: $${formattedImporteBase}\nArancel a pagar: $${formattedArancel}\n
      El arancel incluye dos ejemplares. Para copias adicionales el 50% del arancel vigente.\n
      El arancel por escala solo corresponde para los siguientes trámites:\n
      Estados Contables Soc. Comerciales\n
      Estados Contables Entidades Sin F/ Lucros\n
      Estados Contables De Cooperativa\n
      Estados Contables Intermedios\n
      Compilación\n
      Estados Contables Especiales\n
      Rectificativos\n
      Te Esperamos En Mi Cuenta Para Gestionar El Trámite`;
    } else {
      body = `Trámite: ${tipoTramite}\nEl valor del trámite es $50.000`;
    }

    const recipient = prompt("Introduce el email del destinatario:", "destinatario@example.com");

    if (recipient) {
      const url = 'https://script.google.com/macros/s/AKfycbw3AqYbVEEF5ByaCxRfrtPo_xafEVM7d0vGGlZ52unDtvbifwTAMHKa2XJNgz_u_jAr0w/exec';

      const payload = {
        'recipient': recipient,
        'subject': 'Resultado Calculadora de Arancel CPCE Mendoza',
        'body': body
      };

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(payload).toString()
      })
      .then(response => response.text())
      .then(result => {
        alert('Correo enviado exitosamente');
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Error al enviar el correo');
      });
    }
  }

  function formatNumber(number) {
    var parts = number.toString().split('.');
    
    // Manejo de la parte entera con punto como separador de miles
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    // Manejo de la parte decimal
    if (parts[1]) {
        return parts[0] + ',' + parts[1]; // Usar coma para los decimales
    }
    return parts[0];
}

function formatToNumber(value) {
    // Eliminar el punto de los miles y reemplazar la coma por un punto
    let result = parseFloat(value.replace(/\./g, '').replace(/,/g, '.') || 0);
    if (value.endsWith(",")) {
      return result.toFixed() + ',';
    }
    return result
}
});



