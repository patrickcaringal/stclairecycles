const express = require('express');
const router = express.Router();

// Ecommerce
router.get('/', function(req, res, next) {
    res.redirect('shop');
});

router.get('/login', function(req, res, next) {
    if (req.cookies.session) return res.redirect('shop');

    res.render('ecommerce/login', { page: 'login' });
});

router.get('/forgotpassword', function(req, res, next) {
    if (req.cookies.session) return res.redirect('shop');
    const { id } = req.query;

    res.render('ecommerce/forgotpassword', { page: 'forgot password', userId: id });
});

router.get('/:page', function(req, res, next) {
    const { page } = req.params;

    if (!req.cookies.session) {
        if (page === 'checkout' || page === 'orders' || page === 'order') return res.redirect('login');
    }

    const isLoggedIn = req.cookies.session ? true : false;

    res.render(`ecommerce/${page}`, { isLoggedIn, page, ...req.query });
});

// Admin panel
router.get('/admin/login', function(req, res, next) {
    if (req.cookies.session_admin) return res.redirect('users');

    res.render('ami/login');
});

router.get('/admin/:page', function(req, res, next) {
    const { page } = req.params;

    if (!req.cookies.session_admin) return res.redirect('login');

    res.render(`ami/${page}`);
});

/* Controller */
router.use('/api/user', require('./user').router);
router.use('/api/customer', require('./customer'));
router.use('/api/stock', require('./stock').router);
router.use('/api/product', require('./product').router);
router.use('/api/order', require('./order').router);
router.use('/api/rating', require('./rating').router);
router.use('/api/supply', require('./supply').router);
router.use('/api/others', require('./others').router);
// router.use('/counter', require('./counter').router);

module.exports = router;
