const nodemailer = require('nodemailer');

let transporter;

const getTransporter = async () => {
  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  } else {
    // Fallback: Create ethereal email test account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('Nodemailer using Ethereal test account:', testAccount.user);
    } catch (err) {
      console.error('Failed to create Nodemailer test account, falling back to console logging:', err.message);
      transporter = {
        sendMail: async (mailOptions) => {
          console.log('--- EMAIL MOCK LOG ---');
          console.log('To:', mailOptions.to);
          console.log('Subject:', mailOptions.subject);
          console.log('Body:', mailOptions.html || mailOptions.text);
          console.log('----------------------');
          return { messageId: 'mock-id-' + Date.now() };
        }
      };
    }
  }
  return transporter;
};

const sendDonationNotification = async (donation, recipientUser, donorUser, type) => {
  try {
    const tx = await getTransporter();
    
    let subject = '';
    let html = '';
    
    if (type === 'ACCEPTED') {
      subject = `Donation Accepted: ${donation.foodItem.name}`;
      html = `
        <h3>Donation Accepted Notification</h3>
        <p>Hi <b>${donorUser.name}</b>,</p>
        <p>Your donation of <b>${donation.foodItem.quantity} ${donation.foodItem.unit}</b> of <b>${donation.foodItem.name}</b> has been accepted by <b>${recipientUser.name}</b>.</p>
        <p><b>Pickup Location:</b> ${donation.pickupLocation}</p>
        <p><b>Scheduled Time:</b> ${new Date(donation.scheduledAt).toLocaleString()}</p>
        <p>Please prepare the food for pickup.</p>
        <br/>
        <p>Thank you for reducing food waste!</p>
      `;
    } else if (type === 'COMPLETED') {
      subject = `Donation Completed: ${donation.foodItem.name}`;
      html = `
        <h3>Donation Completed Notification</h3>
        <p>Hi <b>${donorUser.name}</b> & <b>${recipientUser.name}</b>,</p>
        <p>The donation of <b>${donation.foodItem.quantity} ${donation.foodItem.unit}</b> of <b>${donation.foodItem.name}</b> has been successfully collected and completed.</p>
        <br/>
        <p>Thank you for working together to combat food waste!</p>
      `;
    } else {
      return;
    }

    const info = await tx.sendMail({
      from: '"Food Waste Rescue" <no-reply@foodwasterescue.org>',
      to: `${donorUser.email}, ${recipientUser.email}`,
      subject,
      html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Email preview URL:', previewUrl);
    }
    return info;
  } catch (err) {
    console.error('Error sending email:', err.message);
  }
};

module.exports = {
  sendDonationNotification
};
