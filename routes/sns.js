var async = require('async');
var express = require('express');
var router = express.Router();
var request = require('request');
var AWS = require('aws-sdk');

var logger, debug, getSessionId, authorization, aws;

router.get('/:phone/:message', function(req, res, next) {

    logger = req.app.locals.logger;
    debug = req.app.locals.debug;
    getSessionId = req.app.locals.utils.getSessionId();
    authorization = req.app.locals.authorization;
    aws = req.app.locals.aws;

    /**
     * Ramiro Portas : #1
     * (1) cargo a reqFull, parametros de tipo path y body
     */
    var reqFull = {}
    reqFull.path = req.params;
    reqFull.headers = req.headers;
    reqFull.body = req.body;
    //#1

    debug
        ?
        logger.info('Request method ' + '(/sns)' + ' : ' + JSON.stringify(reqFull)) :
        logger.info('Request method ' + '(/sns)' + ' : ' + JSON.stringify(reqFull));

    asyncResolve(reqFull, (err, rs) => {
        var response = {};
        response['result'] = {};
        response['status'] = {};
        if (!err) {
            debug
                ?
                logger.debug('\n\n asyncResolve(): cb rs -> \n\n' + JSON.stringify(rs)) :
                null;
            //aca preparar json de respuesta caso exitoso

            true ?
                (() => {
                    //caso exitoso
                    response.result['code'] = 2;
                    response.result['description'] = "OK";

                    response.status['code'] = 1;
                    response.status['description'] = "operacion exitosa";
                })() :
                (() => {
                    //otros casos
                    response.result['code'] = -1;
                    response.result['description'] = "Error";

                    response.status['code'] = "La operacion fracazó";
                    response.status['description'] = getSessionId;
                })();

            debug
                ?
                logger.info('Response method ' + '(/sns)' + ' : ' + JSON.stringify(response)) :
                logger.info('Response method ' + '(/sns)' + ' : ' + JSON.stringify(response));

            res.status(200).send(response);
        } else {
            //aca preparar json de respuesta caso err
            response.status['code'] = rs.code;
            response.status['description'] = rs.error;

            debug
                ?
                logger.info('Response method ' + '(/sns)' + ' : ' + JSON.stringify(response)) :
                logger.info('Response method ' + '(/sns)' + ' : ' + JSON.stringify(response));

            res.status(400).send(response);
        }
    });
});

/**
 * Ramiro Portas : Funcion que implementa async.waterfall
 * @param  {[Regular Obj]}      data    [description] objeto regular que contiene parametros de tipo path y body del request
 * @param  {[Function]}         cb      [description] funcion anonima que recibe 2 parametros : err, rs
 * @return {[void]}                     [description] quien resuelve es el callback
 */
var asyncResolve = (data, cb) => {

    //vector de funciones
    var ini = [
        (cb) => {
            //step 1 valido headers authorization
            (function ini(step, code, cantError) {
                data.step = step || 1;
                data.code = code || 99;
                data.cantError = cantError || 0;
            })(null, null, 2);

            debug
                ?
                logger.debug('step' + data.step + ' : valido header') :
                null;

            authorization.enable ? (() => {
                //valido que este headers.authorization
                data.headers.authorization ?
                    (() => {
                        var ha = {};
                        ha.value = data.headers.authorization.split(" ");
                        ha.type = ha.value[0];
                        ha.token = ha.value[1];
                        ha.decodeToken = new Buffer(ha.token, 'base64').toString('ascii').split(":");
                        ha.user = ha.decodeToken[0];
                        ha.pass = ha.decodeToken[1];

                        //valido que headers.authorization sea 'Basic' && decodifico el token y valido usuario y contraseña
                        ha.type === authorization.type &&
                            ha.user == authorization.user &&
                            ha.pass == authorization.password ?
                            cb(false, data) :
                            (() => {
                                (function error(error) {
                                    data.code--;
                                    mensajeDefaut = 'Error en step(' + data.step + '), code: ' + data.code;
                                    data.error = error || mensajeDefaut;
                                })("Error authorization : alguno de estos datos es incorrecto (type, user, pass)");

                                cb(true, data);
                            })();

                    })() :
                    (() => {
                        (function error(error) {
                            data.code--;
                            mensajeDefaut = 'Error en step(' + data.step + '), code: ' + data.code;
                            data.error = error || mensajeDefaut;
                        })("Error authorization : faltan las credenciales");

                        cb(true, data);
                    })()



            })() : (() => {
                cb(false, data)
            })();



        },
        (data, cb) => {
            //step 2 valido parametros
            (function update(cantError) {
                data.step++;
                data.code -= data.cantError;
                data.cantError = cantError || 0;
            })(2);

            debug
                ?
                logger.debug('step' + data.step + ' : valido parametros') :
                null;

            //valido si los parametros llegaron ok (phone, message)
            data.path.phone && data.path.message ?
                (() => {
                    cb(false, data);
                })() :
                (() => {
                    //no llegaron los parametros, envio los datos a funcion final con error
                    (function error(error) {
                        data.code--;
                        mensajeDefaut = 'Error en step(' + data.step + '), code: ' + data.code;
                        data.error = error || mensajeDefaut;
                    })("Error parametros : No llegaron los parametros (data.path.phone, data.path.message)");

                    cb(true, data);
                })();
        },
        (data, cb) => {
            //step 2 valido parametros
            (function update(cantError) {
                data.step++;
                data.code -= data.cantError;
                data.cantError = cantError || 0;
            })(1);


            // AWS ...

            // Set region
            AWS.config.update({
                region: aws.region
            });

            // Create SMS Attribute parameter you want to get
            var params = {
                Message: data.path.message,
                PhoneNumber: data.path.phone,
            };


            // Create promise and SNS service object
            var getSMSTypePromise = new AWS.SNS({
                apiVersion: '2010-03-31'
            }).publish(params).promise();

            // Handle promise's fulfilled/rejected states
            getSMSTypePromise.then(
                function(dataAWS) {
                    data.dataAWS = dataAWS;
                    cb(false, data);
                }).catch(
                function(err) {
                    //no llegaron los parametros, envio los datos a funcion final con error
                    logger.debug("Error dataAWS : " + JSON.stringify(err));
                    (function error(error) {
                        data.code--;
                        mensajeDefaut = 'Error en step(' + data.step + '), code: ' + data.code;
                        data.error = error || mensajeDefaut;
                    })("Error : " + err.message);
                    cb(true, data);
                });


        },
    ];

    //funcion final
    var final = (err, data) => {
        debug
            ?
            logger.debug('Final') :
            null;

        err
            ?
            (() => {
                logger.debug('Error final step(' + data.step + '): ' + data.error);
                cb(true, data);
            })() :
            cb(false, data);
    };

    //registro vector funciones, funcion final
    async.waterfall(ini, final);
}

module.exports = router;