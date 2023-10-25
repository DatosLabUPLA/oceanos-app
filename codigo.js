function consultarAPI(url, callback) {
    // Realizar una solicitud GET a la URL de la API
    fetch(url)
      .then(response => {
        // Verificar si la respuesta de la API es exitosa (código 200)
        if (!response.ok) {
          throw new Error(`Error al consultar la API: ${response.status} - ${response.statusText}`);
        }
        // Convertir la respuesta JSON a un objeto JavaScript
        return response.json();
      })
      .then(data => {
        // Llamar a la función de devolución de llamada con los datos
        callback(data);
      })
      .catch(error => {
        console.error('Error al consultar la API:', error);
      });
  }
  
  // Ejemplo de uso
  const urlAPI = 'http://127.0.0.1:8000/datos'; // Reemplaza con la URL de tu API
  const miCallback = function(data) {
    console.log('Datos de la API:', data);
    // Puedes realizar operaciones con los datos aquí
  };
  
  consultarAPI(urlAPI, miCallback);
  