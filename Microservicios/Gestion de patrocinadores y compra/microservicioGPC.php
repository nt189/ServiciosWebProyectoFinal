<?php 
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;
use Kreait\Firebase\Factory;
use Kreait\Firebase\ServiceAccount;

require __DIR__ . '/vendor/autoload.php';

$factory = (new Factory)
    ->withServiceAccount('firebaseCred.json')
    ->withDatabaseUri('https://frbsws-dc827-default-rtdb.firebaseio.com');

$database = $factory->createDatabase();

$app = AppFactory::create();

// Ruta raíz simple para evitar excepción NotFound cuando se ejecuta directamente
$app->get('/', function (Request $request, Response $response) {
    $response->getBody()->write(json_encode(['status' => 'running', 'message' => 'Microservicio GPC activo']));
    return $response->withHeader('Content-Type', 'application/json');
});

$productosDisponibles = ['libros', 'comics', 'mangas', 'revistas'];

# Endpoint para solicitudes un producto (create)
$app->post('/solicitudes', function (Request $request, Response $response) {
    global $database;
    global $productosDisponibles;

    $data = json_decode($request->getBody()->getContents(), true);

    if (empty($data['Producto'])) {
        $response->getBody()->write(json_encode([
            'status' => 400,
            'error' => 'El campo Producto es obligatorio'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $producto = strtolower($data['Producto']);
    $productoKey = $producto.'s';
    if (!in_array($productoKey, $productosDisponibles)) {
        $response->getBody()->write(json_encode([
            'status' => 400,
            'error' => 'La tienda no ofrece ese tipo de producto'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $required = ['Solicitante', 'Titulo', 'Autor', 'Año', 'ISBN'];

    foreach ($required as $campo) {
        if (empty($data[$campo])) {
            $response->getBody()->write(json_encode([
                'status' => 400,
                'error' => "El campo $campo es obligatorio"
            ]));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(400);
        }
    }

    $nuevaSolicitud = [
        'Solicitante' => $data['Solicitante'],
        'Titulo' => $data['Titulo'],
        'Autor' => $data['Autor'],
        'Año' => $data['Año'],
        'ISBN' => $data['ISBN'],
        'Estado' => 'Pendiente'
    ];

    $ref = $database->getReference('solicitudes/' . $productoKey)
                    ->push($nuevaSolicitud);

    $response->getBody()->write(json_encode([
        'status' => 201,
        'message' => 'Solicitud creada con éxito',
        'id' => $ref->getKey()
    ]));

    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(201);
});
# Endpoint para ver las solicitudes de un producto (read)
$app->get('/solicitudes', function (Request $request, Response $response){
    global $database;
    $query = $request->getQueryParams();

    $responseData = $database->getReference('solicitudes/')->getValue();
    $response->getBody()->write(json_encode($responseData));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});
$app->get('/solicitudes/{producto}', function (Request $request, Response $response, $args){
    global $database;
    
    $productoKey = strtolower($args['producto']);
    if (!in_array($productoKey, $GLOBALS['productosDisponibles'])) {
        $response->getBody()->write(json_encode([
            'status' => 400,
            'error' => 'La tienda no ofrece ese tipo de producto'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $responseData = $database->getReference('solicitudes/' . $productoKey)->getValue();
    
    if (is_null($responseData)) {
        $responseData = []; 
    }

    $response->getBody()->write(json_encode($responseData));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

// Actualizar estado de una solicitud (aprobar/rechazar)
$app->put('/solicitudes/{producto}/{id}/estado', function (Request $request, Response $response, $args) {
    global $database;
    $productoKey = strtolower($args['producto']);

    if (!in_array($productoKey, $GLOBALS['productosDisponibles'])) {
        $response->getBody()->write(json_encode([
            'status' => 400,
            'error' => 'La tienda no ofrece ese tipo de producto'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $id = $args['id'];
    $data = json_decode($request->getBody()->getContents(), true) ?: [];
    $nuevoEstado = isset($data['Estado']) ? $data['Estado'] : null;

    if (!$nuevoEstado) {
        $response->getBody()->write(json_encode([
            'status' => 400,
            'error' => 'El campo Estado es obligatorio'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $solicitudRefPath = 'solicitudes/' . $productoKey . '/' . $id;
    $solicitud = $database->getReference($solicitudRefPath)->getValue();
    if (is_null($solicitud)) {
        $response->getBody()->write(json_encode([
            'status' => 404,
            'error' => 'No se encontró la solicitud especificada'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
    }

    $database->getReference($solicitudRefPath)->update([
        'Estado' => $nuevoEstado
    ]);

    $response->getBody()->write(json_encode([
        'status' => 200,
        'message' => 'Estado actualizado',
        'id' => $id,
        'producto' => $productoKey,
        'Estado' => $nuevoEstado
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

# Endpoint para registrar compras de productos (create)
$app->post('/compras', function (Request $request, Response $response) {
    global $database;
    $data = json_decode($request->getBody()->getContents(), true);

    $nuevaSolicitud = [
        'Comprador' => $data['Comprador'],
        'Precio'=> $data['Precio'],
        'FechaCompra'=> $data['FechaCompra']
    ];

    $ref = $database->getReference('comprados/' . $data['ISBN'] )
             ->push($nuevaSolicitud);
    
    $response->getBody()->write(json_encode([
        'status' => 201,
        'message' => 'Compra realizada con éxito',
        'idCompra' => $ref->getKey()
    ]));

    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(201);
});
$app->get('/compras', function (Request $request, Response $response){
    global $database;
    $query = $request->getQueryParams();

    $responseData = $database->getReference('comprados/')->getValue();
    $response->getBody()->write(json_encode($responseData));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});
$app->get('/compras/{isbn}', function (Request $request, Response $response, $args){
    global $database;
    
    $isbn_key = strtoupper($args['isbn']);

    $responseData = $database->getReference('comprados/' . $isbn_key)->getValue();
    
    if (is_null($responseData)) {
        $response->getBody()->write(json_encode([
            'status' => 404,
            'error' => 'No se encontró ninguna compra con ese ISBN'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404); 
    }

    $response->getBody()->write(json_encode($responseData));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

$app->post('/patrocinadores', function (Request $request, Response $response) {
    global $database;
    $data = json_decode($request->getBody()->getContents(), true);

    $nuevoPatrocinador = [
        'Giro'=> $data['Giro'],
        'Nivel'=> $data['Nivel'],
        'FechaRegistro'=> $data['FechaRegistro'],
        'FechaActualización'=> $data['FechaActualización'],
        'Estado'=> 'Activo'
    ];

    $ref = $database->getReference('patrocinadores/' . strtolower($data['Nombre']))
             ->set($nuevoPatrocinador);
    
    $response->getBody()->write(json_encode([
        'status' => 201,
        'message' => 'Patrocinador registrado con éxito',
        'id' => $ref->getKey()
    ]));

    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(201);
});

$app->put('/patrocinadores/{nombre}', function (Request $request, Response $response, $args) {
    global $database;
    $nombre = strtolower($args['nombre']);

    $listaPatrocinadores = $database->getReference('patrocinadores/')->getValue();
    if (!isset($listaPatrocinadores[$nombre])) {
        $response->getBody()->write(json_encode([
            'status' => 404,
            'error' => 'No se encontró ningún patrocinador con ese nombre'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404); 
    }

    $data = json_decode($request->getBody()->getContents(), true);

    $reqyuired = ['Giro', 'Nivel', 'FechaRegistro', 'FechaActualización'];

    foreach ($reqyuired as $campo) {
        if (empty($data[$campo])) {
            $response->getBody()->write(json_encode([
                'status' => 400,
                'error' => "El campo $campo es obligatorio"
            ]));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(400);
        }
    }

    $actualizarPatrocinador = [
        'Giro'=> $data['Giro'],
        'Nivel'=> $data['Nivel'],
        'FechaRegistro'=> $data['FechaRegistro'],
        'FechaActualización'=> $data['FechaActualización'],
        'Estado'=> 'Activo'
    ];

    $database->getReference('patrocinadores/' . $nombre)
             ->update($actualizarPatrocinador);

    $response->getBody()->write(json_encode([
        'status' => 200,
        'message' => 'Patrocinador actualizado con éxito'
    ]));
    return $response;
});
$app->get('/patrocinadores', function (Request $request, Response $response){
    global $database;
    $query = $request->getQueryParams();

    $responseData = $database->getReference('patrocinadores/')->getValue();
    $response->getBody()->write(json_encode($responseData));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

$app->run();
?>