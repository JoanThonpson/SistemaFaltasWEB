'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { ErroApi } = require('../middlewares/erros');
const { autenticarPermitindoTroca } = require('../middlewares/auth');
const auth = require('../controllers/authController');

// Só conta tentativas que FALHARAM: 10 por IP a cada 15 minutos.
const limitarTentativas = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next) => {
    const reinicio = req.rateLimit?.resetTime;
    const restante = reinicio instanceof Date ? reinicio.getTime() - Date.now() : 0;
    const minutos = Math.max(1, Math.ceil(restante / 60_000));
    const espera = minutos === 1 ? '1 minuto' : `${minutos} minutos`;
    next(new ErroApi(429, 'MUITAS_TENTATIVAS', `Muitas tentativas sem sucesso. Aguarde ${espera} e tente novamente.`));
  },
});

const router = express.Router();

router.post('/login', limitarTentativas, auth.login);
router.post('/logout', auth.logout);
router.get('/me', autenticarPermitindoTroca, auth.eu);
router.post('/trocar-senha', autenticarPermitindoTroca, limitarTentativas, auth.trocarSenha);

module.exports = router;