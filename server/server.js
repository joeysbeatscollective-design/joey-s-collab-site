require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// GMAIL TRANSPORTER
// ======================
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS.replace(/\s/g, '') // Remove spaces from app password
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Test email connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email connection failed:', error);
  } else {
    console.log('✅ Email server ready');
  }
});

// ======================
// MIDDLEWARE
// ======================
app.use(helmet());
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.PRODUCTION_URL],
  credentials: true
}));

// Parse JSON (except for Stripe webhooks)
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook/stripe') {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

// ======================
// BEATS DATABASE
// ======================
const beatsDatabase = {
  1: { 
    id: 1, 
    title: "Midnight Vibes", 
    files: { 
      mp3: "audio/full/midnight-vibes.mp3", 
      wav: "audio/full/midnight-vibes.wav" 
    }
  },
  2: { 
    id: 2, 
    title: "Summer Heat", 
    files: { 
      mp3: "audio/full/summer-heat.mp3", 
      wav: "audio/full/summer-heat.wav" 
    }
  },
  3: { 
    id: 3, 
    title: "Cold Streets", 
    files: { 
      mp3: "audio/full/cold-streets.mp3", 
      wav: "audio/full/cold-streets.wav" 
    }
  },
  4: { 
    id: 4, 
    title: "Dark Drill Deluxe", 
    files: { 
      mp3: "audio/full/dark-drill.mp3", 
      wav: "audio/full/dark-drill.wav",
      stems: "audio/stems/dark-drill-stems.zip"
    }
  },
  5: { 
    id: 5, 
    title: "Chill Lofi Dreams", 
    files: { 
      mp3: "audio/full/lofi-dreams.mp3", 
      wav: "audio/full/lofi-dreams.wav",
      stems: "audio/stems/lofi-dreams-stems.zip"
    }
  },
  6: { 
    id: 6, 
    title: "Trap Symphony", 
    files: { 
      mp3: "audio/full/trap-symphony.mp3", 
      wav: "audio/full/trap-symphony.wav",
      stems: "audio/stems/trap-symphony-stems.zip"
    }
  }
};

// ======================
// STRIPE ROUTES
// ======================

// Create Stripe Checkout Session
app.post('/create-stripe-checkout', async (req, res) => {
  try {
    const { beatId, beatTitle, license, price, email } = req.body;

    console.log('Creating Stripe checkout for:', beatTitle, license, email);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${beatTitle} - ${license.toUpperCase()} License`,
            description: `Beat license by Joey Flavour`,
            images: [`${process.env.FRONTEND_URL}/covers/cover${beatId}.jpg`]
          },
          unit_amount: Math.round(price * 100) // Stripe uses cents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/buy.html?canceled=true`,
      customer_email: email,
      metadata: {
        beatId: beatId.toString(),
        beatTitle: beatTitle,
        license: license,
        customerEmail: email
      }
    });

    console.log('✅ Stripe session created:', session.id);
    res.json({ url: session.url, sessionId: session.id });

  } catch (error) {
    console.error('❌ Stripe checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe Webhook Handler
app.post('/webhook/stripe', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    console.log('💰 Payment received!', session.id);
    
    const { beatId, beatTitle, license, customerEmail } = session.metadata;
    
    // Send beat files via email
    await sendBeatFiles(customerEmail, beatId, beatTitle, license);
    
    console.log(`✅ Beat files sent to ${customerEmail}`);
  }

  res.json({ received: true });
});

// Verify Stripe Session (for success page)
app.get('/verify-stripe-session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    
    if (session.payment_status === 'paid') {
      res.json({
        success: true,
        beatId: session.metadata.beatId,
        beatTitle: session.metadata.beatTitle,
        license: session.metadata.license,
        email: session.customer_email
      });
    } else {
      res.json({ success: false, message: 'Payment not completed' });
    }
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================
// PAYPAL ROUTES
// ======================
const paypal = require('@paypal/checkout-server-sdk');

function getPayPalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  const environment = process.env.PAYPAL_MODE === 'production'
    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
    : new paypal.core.SandboxEnvironment(clientId, clientSecret);
  
  return new paypal.core.PayPalHttpClient(environment);
}

// Create PayPal Order
app.post('/create-paypal-order', async (req, res) => {
  try {
    const { beatId, beatTitle, license, price, email } = req.body;
    
    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCreateRequest();
    
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: price.toFixed(2)
        },
        description: `${beatTitle} - ${license.toUpperCase()} License`,
        custom_id: JSON.stringify({ beatId, beatTitle, license, email })
      }],
      application_context: {
        return_url: `${process.env.FRONTEND_URL}/paypal-success.html`,
        cancel_url: `${process.env.FRONTEND_URL}/buy.html?canceled=true`,
        brand_name: 'Joey Flavour Beats',
        user_action: 'PAY_NOW'
      }
    });

    const order = await client.execute(request);
    const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
    
    console.log('✅ PayPal order created:', order.result.id);
    res.json({ 
      orderId: order.result.id,
      approvalUrl: approvalUrl
    });

  } catch (error) {
    console.error('❌ PayPal order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Capture PayPal Payment
app.post('/capture-paypal-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    
    const capture = await client.execute(request);
    
    if (capture.result.status === 'COMPLETED') {
      const customData = JSON.parse(capture.result.purchase_units[0].custom_id);
      const { beatId, beatTitle, license, email } = customData;
      
      // Send beat files
      await sendBeatFiles(email, beatId, beatTitle, license);
      
      console.log(`✅ PayPal payment captured, files sent to ${email}`);
      
      res.json({
        success: true,
        beatId,
        beatTitle,
        license,
        email
      });
    } else {
      res.json({ success: false, status: capture.result.status });
    }

  } catch (error) {
    console.error('❌ PayPal capture error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================
// EMAIL DELIVERY FUNCTION
// ======================
async function sendBeatFiles(email, beatId, beatTitle, license) {
  const beat = beatsDatabase[beatId];
  
  if (!beat) {
    console.error('❌ Beat not found:', beatId);
    return;
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🎵 Your Beat: ${beatTitle} (${license.toUpperCase()} License)`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; background: #0a0a0f; color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #1a1a25; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); padding: 40px 30px; text-align: center; }
          .logo { font-family: 'Arial Black', sans-serif; font-size: 32px; font-weight: bold; letter-spacing: 3px; color: #0a0a0f; }
          .content { padding: 40px 30px; }
          .beat-info { background: #0a0a0f; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #00b894; }
          .beat-title { font-size: 24px; margin-bottom: 10px; color: #00b894; }
          .license-badge { display: inline-block; background: #00b894; color: #0a0a0f; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px; letter-spacing: 1px; }
          .download-section { background: #0a0a0f; padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center; }
          .download-link { display: inline-block; background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); color: #0a0a0f; padding: 14px 30px; border-radius: 30px; text-decoration: none; font-weight: bold; margin: 10px 5px; }
          .license-terms { background: rgba(0, 184, 148, 0.1); border-left: 3px solid #00b894; padding: 20px; margin: 25px 0; border-radius: 8px; }
          .license-terms h3 { color: #00b894; margin-top: 0; }
          .license-terms ul { padding-left: 20px; line-height: 1.8; }
          .footer { text-align: center; padding: 30px; color: #666; border-top: 1px solid rgba(255,255,255,0.1); }
          a { color: #00b894; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">JOEY<span style="color: #fff;">FLAVOUR</span></div>
          </div>
          
          <div class="content">
            <h1>🎉 Thank You For Your Purchase!</h1>
            <p>Your beat files are ready to download below.</p>
            
            <div class="beat-info">
              <div class="beat-title">${beatTitle}</div>
              <p><span class="license-badge">${license.toUpperCase()} LICENSE</span></p>
            </div>
            
            <div class="download-section">
              <h3>📥 Download Your Files</h3>
              <p>Click the links below to download your files:</p>
              <p>
                <a href="${process.env.FRONTEND_URL}/${beat.files.mp3}" class="download-link">📀 Download MP3</a>
                <a href="${process.env.FRONTEND_URL}/${beat.files.wav}" class="download-link">🎧 Download WAV</a>
                ${(license === 'premium' || license === 'exclusive') && beat.files.stems ? 
                  `<a href="${process.env.FRONTEND_URL}/${beat.files.stems}" class="download-link">📦 Download Stems</a>` : ''}
              </p>
              <p style="margin-top: 20px; font-size: 13px; color: #888;">
                💡 Tip: Right-click and "Save Link As" if download doesn't start automatically
              </p>
            </div>
            
            <div class="license-terms">
              <h3>📋 License Terms - ${license.toUpperCase()}</h3>
              ${license === 'basic' ? `
                <ul>
                  <li>✅ Up to 10,000 streams allowed</li>
                  <li>✅ Music videos allowed</li>
                  <li>✅ Radio play allowed</li>
                  <li>⚠️ Producer credit required: "Prod. Joey Flavour"</li>
                  <li>❌ No distribution rights</li>
                </ul>
              ` : license === 'premium' ? `
                <ul>
                  <li>✅ Unlimited streams</li>
                  <li>✅ Music videos + TV/Radio allowed</li>
                  <li>✅ Distribution rights included</li>
                  <li>✅ Includes trackout stems</li>
                  <li>⚠️ Producer credit required: "Prod. Joey Flavour"</li>
                </ul>
              ` : `
                <ul>
                  <li>✅ Full exclusive ownership</li>
                  <li>✅ Beat removed from store</li>
                  <li>✅ All distribution rights</li>
                  <li>✅ Full trackout stems</li>
                  <li>✅ No producer credit required (optional)</li>
                </ul>
              `}
            </div>
            
            <p style="margin-top: 30px;">
              <strong>Questions or issues with your files?</strong><br>
              Reply to this email or DM me on Instagram 
              <a href="https://instagram.com/joeyflavour">@joeyflavour</a>
            </p>
            
            <p style="margin-top: 30px; font-size: 18px;">Let's make a hit! 🔥</p>
            <p><strong>- Joey Flavour</strong></p>
          </div>
          
          <div class="footer">
            <p>Instagram: <a href="https://instagram.com/joeyflavour">@joeyflavour</a></p>
            <p>&copy; ${new Date().getFullYear()} Joey Flavour. All rights reserved.</p>
            <p style="font-size: 12px; margin-top: 15px; color: #555;">
              This email was sent because you purchased a beat from JoeyFlavour.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${email} for ${beatTitle}`);
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw error;
  }
}

// ======================
// NEWSLETTER SIGNUP
// ======================
app.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('Newsletter signup:', email);
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔥 Welcome to Joey Flavour Beats!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #0a0a0f; color: white; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a25; border-radius: 16px; padding: 40px; text-align: center; }
            .logo { font-family: 'Arial Black', sans-serif; font-size: 32px; color: #00b894; margin-bottom: 20px; }
            h1 { color: #00b894; font-size: 36px; margin: 20px 0; }
            p { font-size: 18px; line-height: 1.6; color: #ccc; }
            .btn { display: inline-block; margin: 30px 0; padding: 16px 40px; background: linear-gradient(135deg, #00b894, #00cec9); color: #0a0a0f; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">JOEY<span style="color: white;">FLAVOUR</span></div>
            <h1>Welcome! 🎵</h1>
            
