const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const MICROSERVICES = {


};

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => {
  res.json({
    message: 'API Gateway funcionando',
    microservicios: {
      gpc: MICROSERVICES.gpc,
      contenidos: MICROSERVICES.contenidos
    },
    endpoints: {
      'GET /status': 'Estado de todos los microservicios',
      'POST /solicitudes': 'Crear solicitud de producto',
      'GET /solicitudes': 'Listar todas las solicitudes',
      'GET /solicitudes/:producto': 'Obtener solicitudes por producto',
      'POST /compras': 'Registrar compra',
      'GET /compras': 'Listar todas las compras',
      'GET /compras/:isbn': 'Obtener compras por ISBN',
      'POST /patrocinadores': 'Registrar patrocinador',
      'PUT /patrocinadores/:nombre': 'Actualizar patrocinador',
      'GET /patrocinadores': 'Listar patrocinadores',
      'POST /contenidos': 'Agregar contenido digital',
      'GET /contenidos': 'Listar contenidos digitales',
      'GET /contenidos/:id': 'Obtener contenido por ID',
      'PUT /contenidos/:id': 'Actualizar contenido',
      'DELETE /contenidos/:id': 'Eliminar contenido'
    }
  });
});

app.get('/status', async (req, res) => {
  try {
    const status = {};
    
  
    try {
      const gpcResponse = await axios.get(`${MICROSERVICES.gpc}/`);
      status.gpc = {
        status: 'online',
        data: gpcResponse.data
      };
    } catch (error) {
      status.gpc = {
        status: 'offline',
        error: error.message
      };
    }
    
  
    try {
      const contenidosResponse = await axios.get(`${MICROSERVICES.contenidos}/`);
      status.contenidos = {
        status: 'online',
        data: contenidosResponse.data
      };
    } catch (error) {
      status.contenidos = {
        status: 'offline',
        error: error.message
      };
    }
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Error verificando estado de microservicios' });
  }
});


app.post('/solicitudes', async (req, res) => {
  try {
    const response = await axios.post(`${MICROSERVICES.gpc}/solicitudes`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});

app.get('/solicitudes', async (req, res) => {
  try {
    const response = await axios.get(`${MICROSERVICES.gpc}/solicitudes`);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});

app.get('/solicitudes/:producto', async (req, res) => {
  try {
    const response = await axios.get(`${MICROSERVICES.gpc}/solicitudes/${req.params.producto}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});

app.post('/compras', async (req, res) => {
  try {
    const response = await axios.post(`${MICROSERVICES.gpc}/compras`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});

app.get('/compras', async (req, res) => {
  try {
    const response = await axios.get(`${MICROSERVICES.gpc}/compras`);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});

app.get('/compras/:isbn', async (req, res) => {
  try {
    const response = await axios.get(`${MICROSERVICES.gpc}/compras/${req.params.isbn}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});

app.post('/patrocinadores', async (req, res) => {
  try {
    const response = await axios.post(`${MICROSERVICES.gpc}/patrocinadores`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});

app.put('/patrocinadores/:nombre', async (req, res) => {
  try {
    const response = await axios.put(
      `${MICROSERVICES.gpc}/patrocinadores/${req.params.nombre}`, 
      req.body
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});

app.get('/patrocinadores', async (req, res) => {
  try {
    const response = await axios.get(`${MICROSERVICES.gpc}/patrocinadores`);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});


app.post('/contenidos', async (req, res) => {
  try {
    const response = await axios.post(`${MICROSERVICES.contenidos}/contenidos`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});

app.get('/contenidos', async (req, res) => {
  try {
    const response = await axios.get(`${MICROSERVICES.contenidos}/contenidos`, {
      params: req.query
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});

app.get('/contenidos/:id', async (req, res) => {
  try {
    const response = await axios.get(`${MICROSERVICES.contenidos}/contenidos/${req.params.id}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});

app.put('/contenidos/:id', async (req, res) => {
  try {
    const response = await axios.put(
      `${MICROSERVICES.contenidos}/contenidos/${req.params.id}`,
      req.body
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});

app.delete('/contenidos/:id', async (req, res) => {
  try {
    const response = await axios.delete(`${MICROSERVICES.contenidos}/contenidos/${req.params.id}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleAxiosError(error, res);
  }
});


app.get('/estadisticas', async (req, res) => {
  try {
    const [solicitudes, compras, contenidos, patrocinadores] = await Promise.all([
      axios.get(`${MICROSERVICES.gpc}/solicitudes`).catch(() => ({ data: {} })),
      axios.get(`${MICROSERVICES.gpc}/compras`).catch(() => ({ data: {} })),
      axios.get(`${MICROSERVICES.contenidos}/contenidos`).catch(() => ({ data: { contenidos: [] } })),
      axios.get(`${MICROSERVICES.gpc}/patrocinadores`).catch(() => ({ data: {} }))
    ]);

    const estadisticas = {
      totalSolicitudes: Object.values(solicitudes.data).reduce((acc, curr) => acc + (curr ? Object.keys(curr).length : 0), 0),
      totalCompras: Object.values(compras.data).reduce((acc, curr) => acc + (curr ? Object.keys(curr).length : 0), 0),
      totalContenidos: contenidos.data.contenidos ? contenidos.data.contenidos.length : 0,
      totalPatrocinadores: patrocinadores.data ? Object.keys(patrocinadores.data).length : 0,
      timestamp: new Date().toISOString()
    };

    res.json(estadisticas);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

app.get('/buscar/:isbn', async (req, res) => {
  try {
    const isbn = req.params.isbn;
    
    const [comprasResponse, contenidosResponse] = await Promise.all([
      axios.get(`${MICROSERVICES.gpc}/compras/${isbn}`).catch(() => ({ data: null })),
      axios.get(`${MICROSERVICES.contenidos}/contenidos`).catch(() => ({ data: { contenidos: [] } }))
    ]);

    const resultado = {
      compras: comprasResponse.data,
      contenidosDigitales: contenidosResponse.data.contenidos.filter(
        contenido => contenido.isbn === isbn
      )
    };

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: 'Error en búsqueda' });
  }
});

function handleAxiosError(error, res) {
  if (error.response) {
  
    res.status(error.response.status).json(error.response.data);
  } else if (error.request) {
  
    res.status(503).json({ 
      error: 'Microservicio no disponible',
      message: 'No se pudo conectar con el microservicio'
    });
  } else {
  
    res.status(500).json({ 
      error: 'Error interno del gateway',
      message: error.message 
    });
  }
}

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe en este gateway`
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Verificar estado: http://localhost:${PORT}/status`);
  console.log(`🔍 Microservicio GPC: ${MICROSERVICES.gpc}`);
  console.log(`📚 Microservicio Contenidos: ${MICROSERVICES.contenidos}`);
});