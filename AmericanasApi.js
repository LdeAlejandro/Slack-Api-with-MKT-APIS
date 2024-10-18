console.log('Executing AmericanaeApi.js');

//requires  to access .env
require('dotenv').config();

//requires
const axios = require('axios');
const qs = require('querystring');
const fs = require('fs')

//console.log color
const resetColor = "\x1b[0m";
const greenColor = "\x1b[32m";
const redColor = "\x1b[31m";
const yellowColor = "\x1b[33m";

//message Constructor para perguntas sin responder slackMessageQML y para perguntas respondidas slackMessageQMLAnswered
var slackMessageOrderAmericanas;

//slack importamos las variables y funciones del cript de slackApi
const {
    findChannelByName,
    sentMessageToSlack,
    checkQuestionChannelinfo,
    deleteSlackMessage,
    slackMLQuestionsChannel, slackMlOrdersChannel} = require('./slackApi');

const apiUrlAmericanasAuthToken = 'https://api.skyhub.com.br/auth';
const apiUrlAmericanasOrder = 'https://api.skyhub.com.br/orders';

//Informacion de .env para las apis 
var AmericanasRefreshToken = process.env.Americanas_REFRESH_TOKEN;
var Americanas_api_key = process.env.Americanas_api_key;
var Americanas_user_email = process.env.Americanas_user_email;

//cambiando console.log
//almacenar el console.log para cambiar funcionamiento po defecto.
const originalConsoleLog = console.log;

// cambiar como son impresos los console.log para que tenga astericos y el texto aparezca en verde
console.log = function () {
  originalConsoleLog('**********************************************************\n'+ greenColor, ...arguments, resetColor);
};

// almacenar el console.error para cambiar funcionamiento po defecto.
const originalConsoleError = console.error;

// Override console.error to print in red
console.error = function () {
  originalConsoleError(redColor, ...arguments, resetColor);
};

//codigo para actualizar y reemplazar los token o informaciones de .env 
// Function to add or update a variable in the .env file
function updateEnvVariable(key, value) {
  // Read the current contents of the .env file
  const envData = fs.readFileSync('.env', 'utf8').split('\n');

  // Find and remove the existing line with the specified key
  const updatedEnvData = envData.filter(line => !line.startsWith(`${key}=`));

  // Add the new key-value pair to the end of the file
  updatedEnvData.push(`${key}=${value}`);

  // Write the updated lines back to the .env file
  fs.writeFileSync('.env', updatedEnvData.join('\n'));

  console.log( `Variable ${key}=${value} updated successfully.` );
}


async function AmericanasAuthRefresh() {
    try {
      const response = await axios.post(
        apiUrlAmericanasAuthToken, 
        {
          user_email: Americanas_user_email,
          api_key: Americanas_api_key,
        },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Accountmanager-Key': Americanas_api_key,
          },
        }
      );
      //console.log('Americanas Auth Resfrehs reponse:', response.data.token);
        //actualizar token en .env
      updateEnvVariable('Americanas_REFRESH_TOKEN ', `'${response.data.token}'`);
    

    } catch (error) {
      console.error('Catch Error Response Americanas Auth:', error.response ? error.response.data : error.message);
    }
  }
  
  AmericanasAuthRefresh();