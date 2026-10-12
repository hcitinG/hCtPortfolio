import {firebaseConfig,firestoreDatabaseId} from '../firebase-config.js';
export const configured=!!(firebaseConfig?.apiKey&&firebaseConfig?.projectId&&firebaseConfig?.appId);
let common,privateSDK;
export async function connect(){
 if(!configured)throw new Error('尚未完成 Firebase 連線設定，暫時無法登入。');
 if(!common)common=(async()=>{
  const [app,db]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')]);
  const instance=app.getApps().find(a=>a.name==='hct-portfolio')||app.initializeApp(firebaseConfig,'hct-portfolio');
  return {...db,instance,db:db.getFirestore(instance,firestoreDatabaseId),config:firebaseConfig};
 })().catch(error=>{common=null;throw error;});
 return common;
}
export async function connectAdmin(){
 if(!privateSDK)privateSDK=(async()=>{
  const [base,auth]=await Promise.all([connect(),import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js')]);
  const identity=auth.getAuth(base.instance);
  await auth.setPersistence(identity,auth.browserSessionPersistence);
  await identity.authStateReady();
  return {...base,...auth,auth:identity};
 })().catch(error=>{privateSDK=null;throw error;});
 return privateSDK;
}
export function readableError(error){
 const code=error?.code||'';
 if(/invalid-credential|wrong-password|user-not-found|invalid-email/.test(code))return 'Email 或密碼不正確，請重新輸入。';
 if(/too-many-requests/.test(code))return '嘗試次數過多，請稍後再登入。';
 if(/network-request-failed|unavailable/.test(code))return '目前無法連線，請確認網路後再試。';
 if(/permission-denied|unauthorized$/.test(code))return '這個帳號沒有作品集的管理權限，請確認管理員設定。';
 if(/operation-not-allowed/.test(code))return 'Firebase 尚未啟用這個登入方式，請到 Authentication 開啟 Google 或 Email／密碼登入。';
 if(/unauthorized-domain/.test(code))return '這個網站網域尚未加入 Firebase 的授權網域。';
 if(/configuration-not-found/.test(code))return 'Firebase 尚未建立 Authentication 設定，請先在 Firebase 啟用登入服務。';
 if(/popup-closed-by-user|cancelled-popup-request/.test(code))return '登入視窗已關閉，可以再按一次 Google 登入。';
 if(/popup-blocked/.test(code))return '瀏覽器阻擋了登入視窗，請允許此網站開啟彈出視窗後再試。';
 if(/account-exists-with-different-credential/.test(code))return '這個 Email 已使用其他方式註冊，請先用原本的方式登入。';
 if(/quota-exceeded/.test(code))return 'Firebase 儲存額度不足，請檢查專案用量。';
 return error?.message||'操作未完成，請稍後再試。';
}
export async function requireAdmin(){
 const sdk=await connectAdmin(),user=sdk.auth.currentUser;
 if(!user)throw Object.assign(new Error('請先登入作品集後台。'),{code:'auth/not-signed-in'});
 // The server rules authorize this private read. Editing frontend code cannot
 // bypass the Firestore rules. A missing first draft is valid.
 await sdk.getDocFromServer(sdk.doc(sdk.db,'hct_portfolio_drafts','main'));
 return {...sdk,user};
}
