// firebase.js
const _fbConfig = {
  apiKey: "AIzaSyAKnw9IVAh65FUCtxVcna7lSvAO3dx_4SM",
    authDomain: "hesap-kitap-234d1.firebaseapp.com",
      databaseURL: "https://hesap-kitap-234d1-default-rtdb.firebaseio.com",
        projectId: "hesap-kitap-234d1",
          storageBucket: "hesap-kitap-234d1.firebasestorage.app",
            messagingSenderId: "444640499049",
              appId: "1:444640499049:web:327244db97f698a69799f8"
              };

              let _fbDb = null;

              function fbInit() {
                try {
                    if (!firebase.apps.length) firebase.initializeApp(_fbConfig);
                        _fbDb = firebase.database();
                            window._fbDb = _fbDb;
                                firebase.auth().signInAnonymously().catch(function(e){ console.warn("Auth:", e); });
                                  } catch(e) { console.warn("Firebase init:", e); }
                                  }