// src/services/emailService.js
import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: config.email.service,
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass,
      },
    });
  }
  
  async sendQuoteEmail(to, quote, lead) {
    try {
      const mailOptions = {
        from: config.email.from,
        to,
        subject: `Your Sports Travel Quote: ${quote.package?.title || 'Travel Package'}`,
        html: this.generateQuoteEmailTemplate(quote, lead),
      };
      
      // In production, send actual email
      if (config.nodeEnv === 'test') {
        const info = await this.transporter.sendMail(mailOptions);
        logger.info(`Quote email sent to ${to}: ${info.messageId}`);
        return true;
      } else {
        // In development, just log
        logger.info(`[DEV] Would send email to ${to} with quote ${quote.id}`);
        console.log('Email content:', mailOptions.html);
        return true;
      }
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }
  
  generateQuoteEmailTemplate(quote, lead) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .price-breakdown { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .price-item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Sports Travel Quote</h1>
            </div>
            <div class="content">
              <p>Hello ${lead.name || 'Valued Customer'},</p>
              <p>Thank you for your interest in our sports travel packages. Here is your personalized quote:</p>
              
              <h3>Package Details</h3>
              <p><strong>Package:</strong> ${quote.package?.title || 'Travel Package'}</p>
              <p><strong>Event:</strong> ${quote.event?.title || 'Sports Event'}</p>
              <p><strong>Travel Dates:</strong> ${new Date(quote.travelDates[0]).toLocaleDateString()} - ${new Date(quote.travelDates[1]).toLocaleDateString()}</p>
              <p><strong>Travellers:</strong> ${quote.travellers}</p>
              
              <h3>Price Breakdown</h3>
              <div class="price-breakdown">
                <div class="price-item">
                  <span>Base Price:</span>
                  <span>$${quote.basePrice.toFixed(2)}</span>
                </div>
                ${quote.seasonalAdjustment > 0 ? `
                <div class="price-item">
                  <span>Seasonal Adjustment (+${(quote.calculations.seasonalMultiplier * 100)}%):</span>
                  <span>+$${quote.seasonalAdjustment.toFixed(2)}</span>
                </div>
                ` : ''}
                ${quote.earlyBirdDiscount > 0 ? `
                <div class="price-item">
                  <span>Early Bird Discount (-${(quote.calculations.earlyBirdDiscount * 100)}%):</span>
                  <span>-$${quote.earlyBirdDiscount.toFixed(2)}</span>
                </div>
                ` : ''}
                ${quote.lastMinuteSurcharge > 0 ? `
                <div class="price-item">
                  <span>Last Minute Surcharge (+${(quote.calculations.lastMinuteSurcharge * 100)}%):</span>
                  <span>+$${quote.lastMinuteSurcharge.toFixed(2)}</span>
                </div>
                ` : ''}
                ${quote.groupDiscount > 0 ? `
                <div class="price-item">
                  <span>Group Discount (-${(quote.calculations.groupDiscount * 100)}%):</span>
                  <span>-$${quote.groupDiscount.toFixed(2)}</span>
                </div>
                ` : ''}
                ${quote.weekendSurcharge > 0 ? `
                <div class="price-item">
                  <span>Weekend Surcharge (+${(quote.calculations.weekendSurcharge * 100)}%):</span>
                  <span>+$${quote.weekendSurcharge.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="price-item total">
                  <span>Final Price:</span>
                  <span>$${quote.finalPrice.toFixed(2)}</span>
                </div>
              </div>
              
              <p>This quote is valid until ${new Date(quote.expiryDate).toLocaleDateString()}.</p>
              <p>To proceed with booking or if you have any questions, please contact our team.</p>
              
              <p>Best regards,<br>The Sports Travel Team</p>
            </div>
            <div class="footer">
              <p>Sports Travel Packages &copy; ${new Date().getFullYear()}</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
  async sendWelcomeEmail(to, lead) {
  try {
    const mailOptions = {
      from: config.email.from,
      to,
      subject: `Welcome to Sports Travel, ${lead.name || 'Traveller'}!`,
      html: this.generateWelcomeEmailTemplate(lead),
    };

    // Send email only in production/test (same logic as quote email)
    if (config.nodeEnv === 'test') {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${to}: ${info.messageId}`);
      return true;
    } else {
      logger.info(`[DEV] Would send welcome email to ${to}`);
      console.log('Email content:', mailOptions.html);
      return true;
    }
  } catch (error) {
    logger.error('Failed to send welcome email:', error);
    return false;
  }
}

generateWelcomeEmailTemplate(lead) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1abc9c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">

          <div class="header">
            <h1>Welcome to Sports Travel!</h1>
          </div>

          <div class="content">
            <p>Hello ${lead.name || 'Traveller'},</p>

            <p>Thank you for your interest in our sports travel experiences!  
            Our team will reach out shortly with personalized packages, expert recommendations, and upcoming event details.</p>

            <p>What happens next?</p>
            <ul>
              <li>✔ A travel specialist will review your request</li>
              <li>✔ You will receive custom quotes based on your interests</li>
              <li>✔ You’ll get updates on early-bird offers and sports events</li>
            </ul>

            <p>If you need immediate help, simply reply to this email.</p>

            <p>We’re excited to help you experience world-class sports events!</p>

            <p>Best Regards,<br>The Sports Travel Team</p>
          </div>

          <div class="footer">
            <p>Sports Travel © ${new Date().getFullYear()}</p>
          </div>

        </div>
      </body>
    </html>
  `;
}

}

export default new EmailService();