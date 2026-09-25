import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import "dotenv/config";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

async function testFirebase() {
  try {
    const ref = db.collection("pasajeros").doc("prueba");

    await ref.set({
      nombres: "Prueba",
      apellidos: "Firebase",
      estado: "activo",
      fechaRegistro: new Date(),
    });

    console.log("Firebase conectado correctamente");
    console.log("Documento creado: pasajeros/prueba");
  } catch (error) {
    console.error("Error conectando con Firebase:");
    console.error(error);
  }
}

testFirebase();