require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');

const app = express();
const PORT = process.env.PORT || 3000;

// SendGrid setup
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Middleware
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

// Beats database (in production, use real database)
const beatsDatabase = {
  1: { id: 1, title: "Midnight Vibes", files: { mp3: "audio/full/midnight-vibes.mp3", wav: "audio/full/midnight-vibes.wav" }},
  2: { id: 2, title: "Summer Heat", files: { mp3: "audio/full/summer-heat.mp3", wav: "audio/full/summer-heat.wav" }},
  3: { id: 3, title: "Cold Streets", files: { mp3: "audio/full/cold-streets.mp3", wav: "audio/full/cold-streets.wav" }},
  4: { id: 4, title: "Dark Drill Deluxe", files: { mp3: "audio/full/dark-drill.mp3", wav: "audio/full/dark-drill.wav", stems: "audio/stems/dark-drill-stems.zip" }},
  5: { id: 5, title: "Chill Lofi Dreams", files: { mp3: "audio/full/lofi-dreams.mp3", wav: "audio/full/lofi-dreams.wav", stems: "audio/stems/lofi-dreams-stems.zip" }},
  6: { id: 6, title: "Trap Symphony", files: { mp3: "audio/full/trap-symphony.mp3", wav: "audio/full/trap-symphony.wav", stems: "audio/stems/trap-symphony-stems.zip" }}
};

// ======================
// STRIPE ROUTES
// ======================

app.post('/create-stripe-checkout', async (req, res) => {
  try {
    const { beatId, beatTitle, license, price, email } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${beatTitle} - ${license.toUpperCase()} License`,
            description: `Beat license by Joey Flavour`
          },
          unit_amount: Math.round(price * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/buy.html?canceled=true`,
      customer_email: email,
      metadata: { beatId: beatId.toString(), beatTitle, license, customerEmail: email }
    });

    console.log('✅ Stripe session created:', session.id);
    res.json({ url: session.url, sessionId: session.id });

  } catch (error) {
    console.error('❌ Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe Webhook
app.post('/webhook/stripe', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { beatId, beatTitle, license, customerEmail } = session.metadata;

    console.log('💰 Payment received!');
    await sendBeatFiles(customerEmail, beatId, beatTitle, license);
  }

  res.json({ received: true });
});

// Verify session
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
    res.status(500).json({ error: error.message });
  }
});

// ======================
// PAYPAL ROUTES
// ======================
const paypal = require('@paypal/checkout-server-sdk');

function getPayPalClient() {
  const environment = process.env.PAYPAL_MODE === 'production'
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  return new paypal.core.PayPalHttpClient(environment);
}

app.post('/create-paypal-order', async (req, res) => {
  try {
    const { beatId, beatTitle, license, price, email } = req.body;
    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCreateRequest();

    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: price.toFixed(2) },
        description: `${beatTitle} - ${license.toUpperCase()} License`,
        custom_id: JSON.stringify({ beatId, beatTitle, license, email })
      }],
      application_context: {
        return_url: `${process.env.FRONTEND_URL}/paypal-success.html`,
        cancel_url: `${process.env.FRONTEND_URL}/buy.html?canceled=true`,
        brand_name: 'Joey Flavour Beats'
      }
    });

    const order = await client.execute(request);
    const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;

    console.log('✅ PayPal order created:', order.result.id);
    res.json({ orderId: order.result.id, approvalUrl });

  } catch (error) {
    console.error('❌ PayPal error:', error);
    res.status
