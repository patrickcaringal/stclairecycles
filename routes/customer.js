const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const moment = require('moment');
const nodemailer = require('nodemailer');
const { Counter, incrementCounter } = require('./counter');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'stclairecycle@gmail.com',
        pass: '@password123'
    }
});

const Customer = mongoose.model(
    'Customer',
    new mongoose.Schema({
        customerNo: {
            type: String,
            required: true
        },
        firstname: {
            type: String,
            required: true
        },
        lastname: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        contactNo: {
            type: String,
            required: true
        },
        address: [
            {
                description: {
                    type: String,
                    required: true
                },
                street: {
                    type: String,
                    required: true
                },
                province: {
                    type: String,
                    required: true
                },
                city: {
                    type: String,
                    required: true
                }
            }
        ],

        password: {
            type: String,
            required: true
        },
        cart: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product'
                },
                stock: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Stock'
                },
                quantity: {
                    type: Number,
                    required: true
                }
            }
        ],

        dateCreated: {
            type: Date,
            required: true
        },
        dateUpdated: {
            type: Date,
            required: true
        },
        isActive: {
            type: Boolean,
            required: true
        }
    })
);

router.get('/', async (req, res, next) => {
    const customer = await Customer.find();
    res.send(customer);
});

router.get('/:id', async (req, res, next) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) return res.status(404).send('Customer not found.');

        res.send(customer);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.get('/:id/cart', async (req, res, next) => {
    try {
        // const customer = await Customer.findById(req.params.id)
        //     .populate('cart.product', 'title image ')
        //     .populate('cart.stock', 'productNo title image ')
        //     .select('cart');

        const customer = await Customer.aggregate([
            {
                $match: { _id: { $in: [mongoose.Types.ObjectId(req.params.id)] } }
            },
            { $unwind: '$cart' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'cart.product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $lookup: {
                    from: 'stocks',
                    localField: 'cart.stock',
                    foreignField: '_id',
                    as: 'stock'
                }
            },
            {
                $addFields: {
                    _id: '$cart.product',
                    title: { $arrayElemAt: ['$product.title', 0] },
                    image: { $arrayElemAt: ['$product.image', 0] },
                    price: { $arrayElemAt: ['$product.price', 0] },
                    remainingStock: { $arrayElemAt: ['$stock.remainingStock', 0] },
                    stock: '$cart.stock',
                    quantity: '$cart.quantity'
                    // stock: '$cart.stock'
                }
            },
            {
                $project: {
                    // cart: 1,
                    title: 1,
                    image: 1,
                    price: 1,
                    quantity: 1,
                    remainingStock: 1,
                    stock: 1
                }
            }
        ]);

        if (!customer) return res.status(404).send('Customer not found.');

        res.send(customer);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.post('/auth', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const customer = await Customer.find({ email, password, isActive: true });

        if (!customer.length) return res.status(400).send('Invalid login.');

        res.send(customer[0]);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.post('/forgotPassword', async (req, res, next) => {
    try {
        const { email } = req.body;
        const customer = await Customer.find({ email });

        if (customer.length) {
            const link = `${process.env.APP_HOST}forgotpassword?id=${customer[0]._id}`;
            transporter.sendMail(
                {
                    from: 'stclairecycle@gmail.com <St. Claire Cycles Shop>',
                    to: customer[0].email,
                    subject: 'St. Claire Cycles: Forgot Password',
                    html: `<div style="border: 1px solid rgba(0, 0, 0, 0.125); border-radius: 0.25rem; width: 40%; ">
                        <div style="background-color: rgba(0, 0, 0, 0.03); padding: 0.75rem 1.25rem; border-bottom: 1px solid rgba(0, 0, 0, 0.125);">
                            <img alt="" src="https://stclairecycles.herokuapp.com/ecommerce/img/logo/logo.png" />
                        </div>
                        <div style="padding: 1.25rem;">
                            <a href="${link}">Click here to change password</a>
                        </div>
                    </div>`
                },
                function(err, info) {
                    if (err) return res.status(404).send(err);
                    else return res.send(info);
                }
            );
        } else {
            return res.send(customer);
        }
    } catch (e) {
        console.log(e);
        res.status(500).send(e.message);
    }
});

router.post('/', async (req, res, next) => {
    try {
        let customer = await Customer.countDocuments({
            email: req.body.email
        });

        if (customer) return res.status(404).send('Account already exist.');

        const customerNo = await incrementCounter('Customer');

        customer = new Customer({
            ...req.body,
            customerNo,

            dateCreated: new Date(),
            dateUpdated: new Date(),
            isActive: true
        });

        customer = await customer.save();
        res.send(customer);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const customer = await Customer.findOneAndUpdate({ _id: req.params.id }, req.body, { useFindAndModify: false, new: true });

        if (!customer) return res.status(404).send('Customer not found.');

        res.send(customer);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// router.delete('/', async (req, res, next) => {
//     const customer = await Customer.deleteMany({});
//     res.send(customer);
// });

// router.delete('/:id', async (req, res, next) => {
//     try {
//         const customer = await Customer.findOneAndDelete({ _id: req.params.id });

//         if (!customer) return res.status(404).send('Customer not found.');

//         res.send(customer);
//     } catch (e) {
//         res.status(500).send(e.message);
//     }
// });

module.exports = router;
