const express = require('express');
const cors = require('cors'); 
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const serviceAccount = require('./../des-web-f529d-firebase-adminsdk-fbsvc-6d6be80ad4.json'); 


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore(); 
const app = express();
const PORT = process.env.PORT || 3001;


app.use(cors()); 
app.use(express.json()); 


app.post('/register', async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      EMAIL: email,
      USERNAME: username,
      PASSWORD: hashedPassword, 
      LAST_LOGIN: new Date().toISOString(), 
    };

    const docRef = await db.collection('USERS').add(userData);
    console.log('Usuario registrado con ID:', docRef.id);

    res.status(201).json({ message: 'Usuario registrado exitosamente', userId: docRef.id });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
});

app.post('/createTask', async (req, res) => {
    const { name, description, dueDate, status, category } = req.body;

    if (!name || !description || !dueDate || !status || !category) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
  
    try {
      const newTask = {
        "Name Task": name,
        "Description": description,
        "Dead_line": dueDate,
        "Status": status,
        "Category": category
      };
      const docRef = await db.collection('TASA').add(newTask);
      console.log('Tarea insertada con ID:', docRef.id);
  
      res.status(201).json({ message: 'Tarea insertada exitosamente', taskId: docRef.id });
    } catch (error) {
      console.error('Error al insertar la tarea:', error);
      res.status(500).json({ error: 'Error al insertar la tarea' });
    }
  });

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});