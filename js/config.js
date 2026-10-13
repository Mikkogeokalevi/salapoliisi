// Salapoliisi - Firebase-konfiguraatio
// Huom: selaimen API-avain on aina julkinen. Suojaus tulee
// Firestore-saannoista (firestore.rules), ei taman tiedoston salailusta.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBvJNN_seTDicowYr7cm5EwAA6v0ZIJhUk",
  authDomain: "salapoliisi-dc4c0.firebaseapp.com",
  projectId: "salapoliisi-dc4c0",
  storageBucket: "salapoliisi-dc4c0.firebasestorage.app",
  messagingSenderId: "61556329555",
  appId: "1:61556329555:web:b7ee5496150ecb26abcaa6"
};

// Sähköposti, jolla on admin-oikeudet hallintasivuille.
// VAIHDA omaan sähköpostiisi. Sama osoite pitää olla myös firestore.rules-tiedostossa.
window.ADMIN_EMAIL = "toni@kauppinen.info";
