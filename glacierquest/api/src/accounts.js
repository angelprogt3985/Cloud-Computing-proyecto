const { fail } = require('./game');
// Passwords are forwarded only to Firebase Auth over HTTPS, never stored or logged.
async function accountAuth({email,password,mode}) {
  const key=process.env.FIREBASE_WEB_API_KEY;
  if(!key) fail(503,'El acceso por correo todavía no está configurado en este servidor');
  if(typeof email!=='string' || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400,'Escribe un correo válido');
  if(!['login','register','reset'].includes(mode)) fail(400,'Acción inválida');
  if(mode!=='reset' && (typeof password!=='string' || password.length<8 || password.length>128)) fail(400,'Usa una contraseña de 8 a 128 caracteres');
  const method={login:'signInWithPassword',register:'signUp',reset:'sendOobCode'}[mode];
  const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${encodeURIComponent(key)}`,{
    method:'POST',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json'},
    body:JSON.stringify(mode==='reset'?{requestType:'PASSWORD_RESET',email}:{email,password,returnSecureToken:true})
  });
  // Reset always gives the same answer to avoid exposing whether an email exists.
  if(mode==='reset') { if(response.status>=500) fail(503,'Intenta recuperar la cuenta más tarde'); return {reset:true}; }
  if(!response.ok) fail(400,mode==='login'?'Correo o contraseña incorrectos. También puedes recuperar tu cuenta.':'No se pudo crear la cuenta. Revisa el correo, la contraseña o inicia sesión si ya tienes cuenta.');
  const result=await response.json();
  const {getApps,initializeApp}=require('firebase-admin/app');
  const {getAuth}=require('firebase-admin/auth');
  const app=getApps()[0] || initializeApp({projectId:process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT});
  const verified=await getAuth(app).verifyIdToken(result.idToken);
  if(verified.uid!==result.localId) fail(401,'Identidad inválida');
  return {uid:verified.uid};
}
module.exports={accountAuth};
