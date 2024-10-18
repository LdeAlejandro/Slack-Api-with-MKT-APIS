 //Main file
 //para poder acceder a funciones que requieran acceso al archivo .env
 require('dotenv').config();

 //importar funcion para validar funcionamiento de la api de Slack
const { checkSlackApiConnection} = require('./slackApi');
//importar y ejecutar archivo de mercadolibreApi.js
require('./mercadoLivreApi.js');
require('./AmericanasApi.js');

//ejecutar funcion slack APi test
checkSlackApiConnection();

