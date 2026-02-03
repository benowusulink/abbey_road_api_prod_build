const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.mail.yahoo.com",
  port: 465,
  secure: true,
  auth: {
    user: "abbeyroadsendemail@gmail.com",
    pass: "LOnd_On123"  // use app password here
  },
  tls: {
    rejectUnauthorized: false
  }
});


module.exports ={
	transporter: transporter
}