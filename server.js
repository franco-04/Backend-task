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

app.post('/iniciarsesion', async (req, res) => {
  console.log('Datos recibidos:', req.body); // Para depuración
  const { username, password } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password.trim()) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios y deben ser cadenas de texto' });
  }

  try {
    const usersRef = db.collection('USERS');
    const snapshot = await usersRef.where('USERNAME', '==', username).get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    let user = null;
    snapshot.forEach(doc => {
      user = { id: doc.id, ...doc.data() };
    });

    if (!user || !user.PASSWORD) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const isMatch = await bcrypt.compare(password, user.PASSWORD);
    if (!isMatch) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    res.status(200).json({ message: 'Inicio de sesión exitoso', userId: user.id });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});


app.post('/createTask', async (req, res) => {
  const { name, description, dueDate, status, category, userId } = req.body; // 🠪 Nuevo campo

  if (!name || !description || !dueDate || !status || !category || !userId) { // Validación añadida
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const newTask = {
      "Name Task": name,
      "Description": description,
      "Dead_line": dueDate,
      "Status": status,
      "Category": category,
      "userId": userId // 🠪 Relación con el usuario
    };
    const docRef = await db.collection('TASKS').add(newTask); 
      console.log('Tarea insertada con ID:', docRef.id);
  
      res.status(201).json({ message: 'Tarea insertada exitosamente', taskId: docRef.id });
    } catch (error) {
      console.error('Error al insertar la tarea:', error);
      res.status(500).json({ error: 'Error al insertar la tarea' });
    }
});
app.get('/getTasks/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const tasksRef = db.collection('TASKS');
    const snapshot = await tasksRef.where('userId', '==', userId).get();
    
    const tasks = [];
    snapshot.forEach(doc => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

app.put('/updateTaskStatus/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { status } = req.body;

    await db.collection('TASKS').doc(taskId).update({
      Status: status
    });

    res.status(200).json({ message: 'Estado actualizado' });
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
});

// Crear grupo
app.post('/createGroup', async (req, res) => {
  try {
    const userId = req.headers['user-id']; // Obtenemos el ID del header
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const groupData = {
      name: req.body.name,
      adminId: userId,
      members: [userId],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const groupRef = await db.collection('groups').add(groupData);
    
    res.status(201).json({
      groupId: groupRef.id,
      message: 'Grupo creado exitosamente'
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Agregar usuario a grupo (solo admin)
app.post('/addUserToGroup', async (req, res) => {
  const { groupId, userId, adminId } = req.body;

  try {
    const groupRef = db.collection('groups').doc(groupId);
    const group = (await groupRef.get()).data();
    
    if (group.adminId !== adminId) {
      return res.status(403).json({ error: 'Solo el admin puede agregar usuarios' });
    }
    
    await groupRef.update({
      members: admin.firestore.FieldValue.arrayUnion(userId)
    });
    
    res.status(200).json({ message: 'Usuario agregado' });
  } catch (error) {
    res.status(500).json({ error: 'Error agregando usuario' });
  }
});

// Crear tarea grupal (solo admin)
app.post('/createGroupTask', async (req, res) => {
  const { taskData, groupId, adminId } = req.body;

  try {
    const group = (await db.collection('groups').doc(groupId).get()).data();
    
    if (group.adminId !== adminId) {
      return res.status(403).json({ error: 'Solo el admin puede crear tareas' });
    }
    
    const newTask = {
      ...taskData,
      groupId,
      createdBy: adminId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('tasks').add(newTask);
    res.status(201).json({ taskId: docRef.id });
  } catch (error) {
    res.status(500).json({ error: 'Error creating task' });
  }
});

// Obtener tareas del grupo
app.get('/getGroupTasks/:groupId/:userId', async (req, res) => {
  const { groupId, userId } = req.params;

  try {
    const group = (await db.collection('groups').doc(groupId).get()).data();
    
    if (!group.members.includes(userId)) {
      return res.status(403).json({ error: 'No perteneces a este grupo' });
    }
    
    const snapshot = await db.collection('tasks')
      .where('groupId', '==', groupId)
      .get();
    
    const tasks = [];
    snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
    
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo tareas' });
  }
});

// GET /groups?userId={userId}
app.get('/groups', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    const snapshot = await db.collection('groups')
      .where('members', 'array-contains', userId)
      .get();

    const groups = [];
    snapshot.forEach(doc => {
      groups.push({
        id: doc.id,
        name: doc.data().name,
        adminId: doc.data().adminId,
        members: doc.data().members,
        createdAt: doc.data().createdAt?.toDate()
      });
    });

    res.status(200).json(groups);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener grupos' });
  }
});
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
