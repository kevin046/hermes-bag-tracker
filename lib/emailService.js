const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            }
        });
    }

    async sendAvailabilityNotification(userEmail, bagData) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: `🎉 ${bagData.name} is now available!`,
            html: `
                <h2>Good news! Your watched bag is now available.</h2>
                <p><strong>${bagData.name}</strong> is currently in stock.</p>
                <p>Details:</p>
                <ul>
                    <li>Price: $${bagData.price}</li>
                    <li>Color: ${bagData.color}</li>
                    <li>Material: ${bagData.material}</li>
                </ul>
                <p><a href="${bagData.url}" style="
                    background-color: #007bff;
                    color: white;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 5px;
                    display: inline-block;
                    margin-top: 10px;
                ">View Product</a></p>
                <p style="color: #666; font-size: 12px;">
                    This is an automated notification from Hermès Bag Tracker.
                </p>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Availability notification sent to ${userEmail}`);
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }
}

module.exports = new EmailService(); 