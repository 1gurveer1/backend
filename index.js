const express = require('express');
const app = express();
var cors = require('cors')
app.use(cors())
const dotenv = require('dotenv').config()
const server = require('http').createServer(app);
const XlsxPopulate = require('xlsx-populate');
const mime = require('mime');

const path = require('path');
const io = require('socket.io')(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['content-type'],
    }
});
const connectToMongo = require('./db');
var ss = require('simple-statistics')
var stats = require("stats-analysis");
const FFT = require('fft.js');
const nodemailer = require("nodemailer");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('./model/User');

connectToMongo();
const MongoClient = require('mongodb').MongoClient

const mongoURI = "mongodb://localhost:27017/graph?readPreference=primary&appname=MongoDB%20Compass&ssl=false"

var realdatabase

const port = 5000


app.use(cookieParser())
app.use(express.json())


io.on('connection', async (socket) => {

    console.log('socket connected');

    realdataUpdate(socket);

})

server.listen(port, () => {
    console.log(`server is listening at port ${port}`);

    MongoClient.connect(mongoURI, { useNewUrlParser: true }, (err, res) => {
        if (err) throw err
        realdatabase = res.db('graph')
    })
});


async function realdataUpdate(socket) {

    const data = await realdatabase.collection('realdata').find({}).toArray()

    socket.emit('realdata', { data });

    setTimeout(() => {

        realdataUpdate(socket);

    }, 1000000)

}

function std(samples) {

    let Temp = []
    let Humidity = []
    let Power = []
    let battery = []

    let n = samples.length

    for (var i = 0; i < n; i++) {

        Temp[i] = samples[i].data.tempVal.value
        Humidity[i] = samples[i].data.humidityVal.value
        Power[i] = samples[i].data.powerVal.value
        battery[i] = samples[i].data.batteryVal.value

    }

    stdTemp = stats.stdev(Temp).toFixed(4) * 1
    stdHumidity = stats.stdev(Humidity).toFixed(4) * 1
    stdPower = stats.stdev(Power).toFixed(4) * 1
    stdBattery = stats.stdev(battery).toFixed(4) * 1

    return { stdTemp, stdHumidity, stdPower, stdBattery }
}


function medianValue(samples) {

    let Temp = []
    let Humidity = []
    let Power = []
    let battery = []

    let n = samples.length

    for (var i = 0; i < n; i++) {

        Temp[i] = samples[i].data.tempVal.value
        Humidity[i] = samples[i].data.humidityVal.value
        Power[i] = samples[i].data.powerVal.value
        battery[i] = samples[i].data.batteryVal.value

    }

    medianTemp = stats.median(Temp).toFixed(4) * 1
    medianHumidity = stats.median(Humidity).toFixed(4) * 1
    medianPower = stats.median(Power).toFixed(4) * 1
    medianBattery = stats.median(battery).toFixed(4) * 1

    return { medianTemp, medianHumidity, medianPower, medianBattery }

}

function meanValue(samples) {

    let Temp = []
    let Humidity = []
    let Power = []
    let battery = []

    let n = samples.length

    for (var i = 0; i < n; i++) {

        Temp[i] = samples[i].data.tempVal.value
        Humidity[i] = samples[i].data.humidityVal.value
        Power[i] = samples[i].data.powerVal.value
        battery[i] = samples[i].data.batteryVal.value

    }

    meanTemp = stats.mean(Temp).toFixed(4) * 1
    meanHumidity = stats.mean(Humidity).toFixed(4) * 1
    meanPower = stats.mean(Power).toFixed(4) * 1
    meanBattery = stats.mean(battery).toFixed(4) * 1

    return { meanTemp, meanHumidity, meanPower, meanBattery }


}

function rmsvalue(samples) {

    let Temp = []
    let Humidity = []
    let Power = []
    let battery = []

    let n = samples.length

    for (var i = 0; i < n; i++) {

        Temp[i] = samples[i].data.tempVal.value
        Humidity[i] = samples[i].data.humidityVal.value
        Power[i] = samples[i].data.powerVal.value
        battery[i] = samples[i].data.batteryVal.value

    }

    rmstemp = ss.rootMeanSquare(Temp)
    rmsHumidity = ss.rootMeanSquare(Humidity)
    rmsPower = ss.rootMeanSquare(Power)
    rmsbattery = ss.rootMeanSquare(battery)

    return { rmstemp, rmsHumidity, rmsPower, rmsbattery }

}

function fftValue(frequencyData)
{
    let len = frequencyData.length
    const f = new FFT(len);
    const input = new Array(4096);
    input.fill(0);
    const out = f.createComplexArray();

    const realInput = new Array(f.size);
    f.realTransform(out, realInput);

    const data = f.toComplexArray(input);
    f.transform(out, data);

    f.inverseTransform(data, out);

    return {f}
}

function findClosestIndex(arr, element) {
    let from = 0, until = arr.length - 1
    while (true) {
        const cursor = Math.floor((from + until) / 2);
        if (cursor === from) {
            const diff1 = element - arr[from];
            const diff2 = arr[until] - element;
            return diff1 <= diff2 ? from : until;
        }

        const found = arr[cursor];
        if (found === element) return cursor;

        if (found > element) {
            until = cursor;
        } else if (found < element) {
            from = cursor;
        }
    }
}

function fileredData(data, start, end) {

    let timeValue = []
    let i = -1
    let j = -1

    for (let ip = 0; ip < data.length; ip++) {
        timeValue[ip] = data[ip].timeVal;

    }

    let new_data = []

    data.forEach((data, index) => {

        if (data.timeVal == start) {
            i = index
        }
        

        if (data.timeVal == end) {
            j = index
        }

    })

    if(i == -1) {
        i = findClosestIndex(timeValue, start)
    }

    if (j == -1) {
        j = findClosestIndex(timeValue, end)
    }

    count = 0
    for (let k = i; k <= j; k++) {
        new_data[count] = data[k]
        count = count + 1
    }

    return new_data

}


app.post('/api/data', async (req, res) => {

    try {

        const data = await realdatabase.collection('data').find({}).toArray()
        
        data2 = data[0].samples

        const { start, end } = req.body;

        new_data = fileredData(data2, start, end)

        mean = meanValue(new_data)

        rms = rmsvalue(new_data)

        median = medianValue(new_data)

        standard_deviation = std(new_data)

        res.send({ new_data, mean, rms, median, standard_deviation });

    } catch (e) {
        res.status(500).send(e);
    }
});

app.get('/api/frequency', async (req, res) => {

    try {

        const data = await realdatabase.collection('data').find({}).toArray()

        frequencyData = data[0].frequency

        fftvalue = fftValue(frequencyData)

        res.send({ frequencyData, fftvalue });

    } catch (e) {
        res.status(500).send(e);
    }
});

app.get('/api/heatmap', async (req, res) => {

    try {

        const data = await realdatabase.collection('data').find({}).toArray()

        heatData = data[0].heatmap

        res.send({ heatData });

    } catch (e) {
        res.status(500).send(e);
    }
});

app.get('/csv', async(req, res) => {

    try {

        const data = await realdatabase.collection('realdata').find({}).toArray()

        excelData = data[0].samples

        XlsxPopulate.fromBlankAsync().then(workbook => {

            let index = 2

            workbook.sheet(`Sheet1`).cell(`A1`).value('Temperature');
            workbook.sheet(`Sheet1`).cell(`B1`).value('Humidity');;
            workbook.sheet(`Sheet1`).cell(`C1`).value('Battery');
            workbook.sheet(`Sheet1`).cell(`D1`).value('Power');


            excelData.forEach((currentData) => {
                
                workbook.sheet(`Sheet1`).cell(`A${index}`).value(currentData.data.tempVal.value);
                workbook.sheet(`Sheet1`).cell(`B${index}`).value(currentData.data.humidityVal.value);
                workbook.sheet(`Sheet1`).cell(`C${index}`).value(currentData.data.batteryVal.value);
                workbook.sheet(`Sheet1`).cell(`D${index}`).value(currentData.data.powerVal.value);

                index = index + 1;
            })

            if (OTP == null) {
                return res.status(400).json({ message: 'OTP Expired' });
            }
            else {
                return workbook.toFileAsync("./Data.xlsx", { password: `${OTP}` });
            };

        });

        const file = __dirname + "/Data.xlsx"
        const fileName = path.basename(file)
        const mimeType = mime.getType(file)
        res.setHeader("Content-Disposition", "attachment;filename=" + fileName)
        res.setHeader("Content-Type", mimeType)

        setTimeout(() => {
            res.download(file)

        }, 3000);


    } catch (e) {
        res.status(500).send(e);
    }
});



//---------------------------Create User------------------------------//

var transporter = nodemailer.createTransport({

    service: 'gmail',
    auth: {
        user: 'gurveer0091@gmail.com',
        pass: 'Gurveer123@'
    },

    tls: {
        rejectUnauthorized: false
    }

})

let OTP = null

const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET)
}

function otpgenerator() {
    OTP = null
}

app.post('/api/create', [

    body('name', 'Enter a valid user name').isLength({ min: 4 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password should be atleast 5 char long').isLength({ min: 5 }),

], async (req, res) => {

    let success = false;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ success, errors: errors.array() });
    }

    try {

        const { name, email, password, confirm_password } = req.body;

        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(req.body.password, salt);

        if (password == confirm_password) {

            user = await User.create({

                name: name,
                email: email,
                emailToken: crypto.randomBytes(64).toString('hex'),
                password: hashPassword,
                confirm_password: hashPassword

            })

            const token = createToken(user.id)
            console.log("token : ", token)
            res.cookie('access-token', token)
            res.json(user)


        }

        else {
            res.json('password not matched')
        }


    }
    catch (err) {
        console.log(err.message);
        res.status(500).send("Error occured");
    }

})


app.post('/generate', async (req, res) => {

    const { email } = req.body

    try {

        const user = await User.find({ email })
        
        if(user.length > 0)
        {
            OTP = Math.floor(Math.random() * (9 * (Math.pow(10, 5)))) + (Math.pow(10, 5));
            epoch_date = Date.now();
            var myDate = new Date(epoch_date * 1000)

            var mailOptions = {
                from: 'gurveer0091@gmail.com',
                to: user[0].email,
                subject: 'Your OTP',
                html: `
                    <h2> Use this OTP to Download the File</h2>
                    <h4> Message : otp will expire in 20 seconds</h4>
                    <h4> OTP : ${OTP}</h4>
                    <h4> Date : ${myDate}</h4>`
            }

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error)
                }
                else {
                    res.json('success')
                    console.log('OTP sent')
                }
            })

            setTimeout(() => {
                otpgenerator()

            }, 50000);

            res.json('Otp sent successfully');
        }

        else{
            return res.status(400).json({ message: 'User Login Failed' });
        }

    } catch (err) {
        console.log(err.message);
        res.status(500).send("Error occured");
    }
})

app.get('/api/otp', async (req, res) => {

    try {
        res.json(OTP);

    } catch (err) {
        console.log(err.message);
        res.status(500).send("Error occured");
    }
})



