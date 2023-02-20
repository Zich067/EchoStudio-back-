require('dotenv').config()

const nodemailer = require('nodemailer')

let transport

transport = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, 
  auth: {
    user: process.env.SMTP_TO_EMAIL,
    pass: process.env.SMTP_TO_PASSWORD,
  },
}

const transporter = nodemailer.createTransport(transport)

transporter.verify((error, success) => {
  if (error) {
 
    console.error(error)
  } else {

    console.log('Ready to send mail!')
  }
})

module.exports = { transporter }
