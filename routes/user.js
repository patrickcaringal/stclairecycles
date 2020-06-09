const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { incrementCounter } = require('./counter');

const User = mongoose.model(
    'User',
    new mongoose.Schema({
        userNo: {
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
        role: {
            type: String,
            required: true
        },
        contactNo: {
            type: String,
            required: true
        },
        // address: {
        //     type: String,
        //     required: true
        // },
        password: {
            type: String,
            required: true
        },
        logs: [
            {
                userNo: String,
                name: String,
                activity: String,
                dateCreated: Date
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
    const user = await User.find();
    res.send(user);
});

router.get('/logs', async (req, res, next) => {
    try {
        const user = await User.aggregate([{ $unwind: '$logs' }, { $replaceRoot: { newRoot: '$logs' } }]);
        res.send(user);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) return res.status(404).send('User not found.');

        res.send(user);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { data, logs } = req.body;

        let user = await User.countDocuments({
            email: data.email
        });

        if (user) return res.status(404).send('Account already exist.');

        const userNo = await incrementCounter('User');
        user = new User({
            ...data,
            userNo,

            dateCreated: new Date(),
            dateUpdated: new Date(),
            isActive: true
        });

        logs.activity += userNo;
        await User.findOneAndUpdate({ _id: logs.id }, { $push: { logs: { ...logs } } }, { useFindAndModify: false, new: true });

        user = await user.save();
        res.send(user);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.post('/auth', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password, isActive: true });
        console.log(req.body);
        if (!user) return res.status(400).send('Invalid login.');

        res.send(user);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.put('/logs', async (req, res, next) => {
    try {
        const user = await User.updateMany({}, { $set: { logs: [] } });

        res.send(user);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const { data, logs } = req.body;
        console.log(req.body);
        const user = await User.findOneAndUpdate({ _id: req.params.id }, { ...data }, { useFindAndModify: false, new: true });
        if (!user) return res.status(404).send('User not found.');

        // await User.findOneAndUpdate({ _id: logs.id }, { $push: { logs: { ...logs } } }, { useFindAndModify: false, new: true });

        res.send(user);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// router.delete('/', async (req, res, next) => {
//     try {
//         const user = await User.deleteMany({});
//         res.send(user);
//     } catch (e) {
//         res.status(500).send(e.message);
//     }
// });

// router.delete('/:id', async (req, res, next) => {
//     try {
//         const user = await User.findOneAndDelete({ _id: req.params.id });

//         if (!user) return res.status(404).send('User not found.');

//         res.send(user);
//     } catch (e) {
//         res.status(500).send(e.message);
//     }
// });

module.exports = {
    router,
    User
};
