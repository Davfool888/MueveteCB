import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  initializeApp({
    credential: cert({
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
}),
  });
}

const db = getFirestore();
const auth = getAuth();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const {
      nombre,
      apellido,
      correo,
      telefono,
      contrasena,
      localidad,
      barrio,
      transportes,
    } = req.body;

    if (
      !nombre ||
      !apellido ||
      !correo ||
      !telefono ||
      !contrasena ||
      !localidad ||
      !transportes?.length
    ) {
      return res.status(400).json({
        error: "Faltan datos obligatorios",
      });
    }

    const userRecord = await auth.createUser({
  email: correo,
  password: contrasena,
  displayName: `${nombre} ${apellido}`,
});

const pasajeroRef = db.collection("pasajeros").doc(userRecord.uid);

    const pasajero = {
      userId: pasajeroRef.id,

      nombre,
      apellido,
      correo,
      telefono,

      localidad,
      barrio: barrio || null,

      transportes,

      estado: "activo",

      fechaRegistro: new Date(),
    };

    await pasajeroRef.set(pasajero);

    return res.status(201).json({
      message: "Pasajero registrado correctamente",
      userId: pasajeroRef.id,
    });
  } catch (error) {
    console.error("Error registrando pasajero:", error);

    return res.status(500).json({
      error: "No se pudo registrar el pasajero",
    });
  }
}