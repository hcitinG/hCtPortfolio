import {configured,connectAdmin,requireAdmin,readableError} from '../runtime/firebase-sdk.js';
const form=document.getElementById('login-form'),message=document.getElementById('login-message'),submit=document.getElementById('login-submit'),reset=document.getElementById('reset-password');
const password=document.getElementById('password'),email=document.getElementById('email'),toggle=document.getElementById('show-password');
const google=document.getElementById('google-login');
toggle.addEventListener('click',()=>{const showing=password.type==='password';password.type=showing?'text':'password';toggle.textContent=showing?'隱藏':'顯示';toggle.setAttribute('aria-pressed',String(showing));toggle.setAttribute('aria-label',showing?'隱藏密碼':'顯示密碼');});
if(!configured){document.getElementById('connection-note').hidden=false;submit.disabled=reset.disabled=google.disabled=true;}
else{
 try{await requireAdmin();location.replace(new URL('editor.html',location.href));}catch{}
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!configured)return;submit.disabled=true;message.textContent='正在登入…';
 try{const sdk=await connectAdmin();await sdk.signInWithEmailAndPassword(sdk.auth,email.value.trim(),password.value);await requireAdmin();password.value='';location.replace(new URL('editor.html',location.href));}
 catch(error){message.textContent=readableError(error);try{const sdk=await connectAdmin();await sdk.signOut(sdk.auth);}catch{}}
 finally{submit.disabled=false;}
});
google.addEventListener('click',async()=>{
 if(!configured)return;google.disabled=true;message.textContent='請在 Google 視窗選擇你的管理員帳號。';
 try{const sdk=await connectAdmin(),provider=new sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await sdk.signInWithPopup(sdk.auth,provider);await requireAdmin();location.replace(new URL('editor.html',location.href));}
 catch(error){message.textContent=readableError(error);try{const sdk=await connectAdmin();await sdk.signOut(sdk.auth);}catch{}}
 finally{google.disabled=false;}
});
reset.addEventListener('click',async()=>{
 if(!email.value.trim()||!email.checkValidity()){message.textContent='請先填寫你的登入 Email，再按「忘記密碼」。';email.focus();return;}
 reset.disabled=true;
 try{const sdk=await connectAdmin();await sdk.sendPasswordResetEmail(sdk.auth,email.value.trim());message.textContent='如果這個 Email 有管理員帳號，將收到密碼重設信，請查看收件匣。';}
 catch(error){message.textContent=readableError(error);}
 finally{reset.disabled=false;}
});
