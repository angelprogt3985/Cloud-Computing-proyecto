const { OAuth2Client } = require('google-auth-library');
const verifier = new OAuth2Client();
async function authorizeMaintenance(req) {
  const audience = process.env.CLEANUP_AUDIENCE;
  const email = process.env.CLEANUP_SERVICE_ACCOUNT;
  if (!audience || !email) return false;
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
  if (!match) return false;
  try {
    const ticket = await verifier.verifyIdToken({ idToken: match[1], audience });
    const payload = ticket.getPayload();
    return payload.email_verified === true && payload.email === email;
  } catch { return false; }
}
module.exports = { authorizeMaintenance };
