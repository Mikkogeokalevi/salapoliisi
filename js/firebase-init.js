// Salapoliisi - Firebase-alustus (yksi ainoa paikka, compat SDK)
// Vaatii: firebase-app-compat.js, firebase-auth-compat.js, firebase-firestore-compat.js
// seka js/config.js ladattuna ennen tata tiedostoa.

(function () {
  "use strict";

  if (!window.FIREBASE_CONFIG) {
    throw new Error("FIREBASE_CONFIG puuttuu - lataa js/config.js ensin");
  }

  firebase.initializeApp(window.FIREBASE_CONFIG);

  window.fb = {
    app: firebase.app(),
    auth: firebase.auth(),
    db: firebase.firestore()
  };

  // Näkymätön kirjautuminen pelaajille (vastussuojauksen perusta).
  // Palauttaa Promise joka ratkeaa kun uid on tiedossa.
  window.fb.ensurePlayerAuth = function () {
    return new Promise(function (resolve, reject) {
      var off = window.fb.auth.onAuthStateChanged(function (user) {
        if (user) {
          off();
          resolve(user);
        }
      });
      window.fb.auth.signInAnonymously().catch(function (err) {
        // Jos jo kirjautuneena, onAuthStateChanged hoitaa; muuten virhe.
        if (err && err.code === "auth/operation-not-allowed") {
          reject(new Error("Anonyymi-kirjautuminen ei ole kaytossa Firebase-projektissa. Ota se kayttoon: Authentication > Sign-in method > Anonymous."));
        } else if (err && err.code !== "auth/already-initialized") {
          // auth/operation-not-supported-in-this-environment ym.
          reject(err);
        }
      });
    });
  };

  // Admin-kirjautuminen hallintasivuille
  window.fb.signInAdmin = function (email, password) {
    return window.fb.auth.signInWithEmailAndPassword(email, password);
  };

  window.fb.signOut = function () {
    return window.fb.auth.signOut();
  };

  window.fb.isAdmin = function (user) {
    return !!user && !user.isAnonymous &&
      String(user.email).toLowerCase() === String(window.ADMIN_EMAIL).toLowerCase();
  };

  window.fb.serverTs = function () {
    return firebase.firestore.FieldValue.serverTimestamp();
  };
})();
