const { Resend } = require('resend');

const resend = new Resend('re_PteaggRZ_PZVhCrNmYMFLeDPicafCCt5d');

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'ericaaquino0114@gmail.com',
  subject: 'Hello World',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
}).then(data => console.log('Email sent:', data))
  .catch(error => console.error('Error sending email:', error));