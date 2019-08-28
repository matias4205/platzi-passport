const router = require('express').Router();
const passport = require('passport');
const boom = require('@hapi/boom');
const jwt = require('jsonwebtoken');

const ApiKeysService = require('../services/apiKeys');
const UsersService = require('../services/users');
const validationHandler = require('../utils/middleware/validationHandler');
const { createUserSchema } = require('../utils/schemas/users');

const { config } = require('../config');

const apiKeyService = new ApiKeysService();
const usersService = new UsersService(); 

//Basic strategy
require('../utils/auth/strategies/basic');

router.post('/sign-in', async (req, res, next) => {
    const { apiKeyToken } = req.body;

    if(!apiKeyToken){
        next(boom.unauthorized('apiKeyToken is required'));
    }

    passport.authenticate('basic', (error, user) => {
        try {
            if(error || !user){
                next(boom.unauthorized());
            }

            req.login(user, { session: false }, async (err) => {
                if(err){
                    next(err);
                }

                const apiKey = await apiKeyService.getApiKey({ token: apiKeyToken });

                if(!apiKey) {
                    next(boom.unauthorized());
                }

                const { _id: id, name, email } = user;
                const payload = {
                    sub: id,
                    name,
                    email,
                    scopes: apiKey.scopes
                }

                const token = jwt.sign(payload, config.authJwtSecret, {
                    expiresIn: '15m'
                });

                return res.status(200).json({
                    token,
                    user: {
                        id,
                        name,
                        email
                    }
                });
            });
        } catch (err) {
            next(err)
        }
    })(req, res, next);
});

router.post('/sign-up', validationHandler(createUserSchema), async (req, res, next) => {
    const { body: user } = req;

    try {
        const createdUserId = await usersService.createUser({ user });

        res.status(201).json({
            data: createdUserId,
            message: "User created succesfully"
        });
    } catch (err) {
        next(err)
    }
});

module.exports = router;