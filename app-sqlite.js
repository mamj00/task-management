// Modelo de datos usando SQL.js para almacenamiento persistente sin dependencias npm
let db = null;
let SQL = null;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // Cargar SQL.js desde CDN
    await loadSQLJS();
    initDatabase();
    loadDataFromDatabase();
    renderTasks();
    setupEventListeners();
});

// Cargar SQL.js desde CDN
async function loadSQLJS() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
        script.onload = () => {
            initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            }).then(sql => {
                SQL = sql;
                resolve();
            }).catch(reject);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Inicializar la base de datos
function initDatabase() {
    try {
        // Intentar cargar la base de datos desde localStorage
        const savedDBData = localStorage.getItem('taskDB');
        
        if (savedDBData) {
            // Convertir la cadena base64 a Uint8Array
            const binaryString = window.atob(savedDBData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            db = new SQL.Database(bytes);
        } else {
            // Crear una nueva base de datos
            db = new SQL.Database();
            // Crear las tablas necesarias
            db.run(`
                CREATE TABLE employees (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    position TEXT,
                    email TEXT
                );
                
                CREATE TABLE tasks (
                    id INTEGER PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    dueDate TEXT,
                    priority TEXT DEFAULT 'media',
                    assignee TEXT,
                    progress INTEGER DEFAULT 0,
                    parentId INTEGER,
                    createdAt TEXT,
                    updatedAt TEXT,
                    FOREIGN KEY (parentId) REFERENCES tasks(id) ON DELETE CASCADE,
                    FOREIGN KEY (assignee) REFERENCES employees(id)
                );
                
                CREATE TABLE settings (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );
                
                INSERT INTO settings (key, value) VALUES ('lastTaskId', '0');
            `);
            
            // Verificar si hay datos en localStorage para migrar
            migrateFromLocalStorage();
        }
        
        // Cargar datos iniciales
        loadDataFromDatabase();
    renderTasks();
    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
        alert('Error al inicializar la base de datos. Se usará una base de datos vacía.');
        db = new SQL.Database();
        // Crear las tablas necesarias
        db.run(`
            CREATE TABLE employees (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                position TEXT,
                email TEXT
            );
            
            CREATE TABLE tasks (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                dueDate TEXT,
                priority TEXT DEFAULT 'media',
                assignee TEXT,
                progress INTEGER DEFAULT 0,
                parentId INTEGER,
                createdAt TEXT,
                updatedAt TEXT,
                FOREIGN KEY (parentId) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (assignee) REFERENCES employees(id)
            );
            
            CREATE TABLE settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
            
            INSERT INTO settings (key, value) VALUES ('lastTaskId', '0');
        `);
    }
}

// Guardar la base de datos en localStorage
function saveDatabase() {
    if (!db) return;
    
    try {
        // Exportar la base de datos como Uint8Array
        const data = db.export();
        // Convertir Uint8Array a cadena base64
        const binaryString = String.fromCharCode.apply(null, data);
        const base64String = window.btoa(binaryString);
        // Guardar en localStorage
        localStorage.setItem('taskDB', base64String);
    } catch (error) {
        console.error('Error al guardar la base de datos:', error);
        alert('Error al guardar los datos. Intente exportar la base de datos para no perder información.');
    }
}

// Exportar la base de datos como archivo
function exportDatabase() {
    if (!db) return;
    
    try {
        const data = db.export();
        const blob = new Blob([data], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tareas_equipo.db';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error al exportar la base de datos:', error);
        alert('Error al exportar la base de datos.');
    }
}

// Importar base de datos desde archivo
function importDatabase(file) {
    const reader = new FileReader();
    reader.onload = function() {
        try {
            const arrayBuffer = this.result;
            const uint8Array = new Uint8Array(arrayBuffer);
            db = new SQL.Database(uint8Array);
            saveDatabase();
            loadDataFromDatabase();
    renderTasks();
            renderTasks();
            updateStatistics();
            populateEmployeeDropdowns();
            populateParentTaskDropdown();
            alert('Base de datos importada correctamente.');
        } catch (error) {
            console.error('Error al importar la base de datos:', error);
            alert('Error al importar la base de datos. Asegúrese de que el archivo es válido.');
        }
    };
    reader.readAsArrayBuffer(file);
}

// Variables globales para almacenar datos en memoria
let tasks = [];
let employees = [];
let lastTaskId = 0;

// Cargar datos desde la base de datos
function loadDataFromDatabase() {
    // Cargar empleados
    const employeesResult = db.exec('SELECT * FROM employees');
    employees = employeesResult.length > 0 ? 
        employeesResult[0].values.map(row => {
            return {
                id: row[0],
                name: row[1],
                position: row[2],
                email: row[3]
            };
        }) : [];
    
    // Cargar tareas
    const tasksResult = db.exec('SELECT * FROM tasks');
    tasks = tasksResult.length > 0 ? 
        tasksResult[0].values.map(row => {
            return {
                id: row[0],
                title: row[1],
                description: row[2],
                dueDate: row[3],
                priority: row[4],
                assignee: row[5],
                progress: row[6],
                parentId: row[7],
                createdAt: row[8],
                updatedAt: row[9]
            };
        }) : [];
    
    // Cargar último ID de tarea
    const lastIdResult = db.exec("SELECT value FROM settings WHERE key = 'lastTaskId'");
    lastTaskId = lastIdResult.length > 0 ? parseInt(lastIdResult[0].values[0][0]) : 0;

    // Populate employee dropdowns
    populateEmployeeDropdowns();
}

// Configurar event listeners
function setupEventListeners() {
    // Botones principales
    document.getElementById('btnAddTask').addEventListener('click', () => openTaskModal());
    // Cambia el botón de añadir empleado por gestionar empleados
    document.getElementById('btnManageEmployees').addEventListener('click', openManageEmployeesModal);

    // Formularios
    document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);
    document.getElementById('employeeForm').addEventListener('submit', handleEmployeeFormSubmit);

    // Botones de cancelar
    document.getElementById('btnCancelTask').addEventListener('click', closeTaskModal);
    document.getElementById('btnCancelEmployee').addEventListener('click', closeEmployeeModal);
    document.getElementById('btnCloseSubtasks').addEventListener('click', closeSubtasksModal);
    document.getElementById('btnAddSubtask').addEventListener('click', () => {
        const parentTaskId = document.getElementById('subtasksModal').dataset.taskId;
        openTaskModal(null, parentTaskId);
    });

    // Cerrar modales con X
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Filtros
    document.getElementById('filterEmployee').addEventListener('change', renderTasks);
    document.getElementById('filterStatus').addEventListener('change', renderTasks);
    document.getElementById('sortBy').addEventListener('change', renderTasks);

    // Actualizar valor del progreso
    document.getElementById('taskProgress').addEventListener('input', function() {
        document.getElementById('progressValue').textContent = this.value + '%';
    });
    
    // Añadir botones de exportar/importar
    addDatabaseControls();
}

// Añadir controles para exportar/importar la base de datos
function addDatabaseControls() {
    const headerControls = document.querySelector('.header-controls');
    
    // Botón de exportar
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn secondary';
    exportBtn.innerHTML = '<i class="fas fa-download"></i> Exportar DB';
    exportBtn.addEventListener('click', exportDatabase);
    headerControls.appendChild(exportBtn);
    
    // Botón de importar
    const importBtn = document.createElement('button');
    importBtn.className = 'btn secondary';
    importBtn.innerHTML = '<i class="fas fa-upload"></i> Importar DB';
    importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.db,.sqlite';
        input.onchange = (e) => {
            if (e.target.files.length > 0) {
                importDatabase(e.target.files[0]);
            }
        };
        input.click();
    });
    headerControls.appendChild(importBtn);
}

// Funciones para modales
function openTaskModal(taskId = null, parentTaskId = null) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const modalTitle = document.getElementById('modalTitle');
    const parentTaskContainer = document.getElementById('parentTaskContainer');

    // Resetear el formulario
    form.reset();
    document.getElementById('progressValue').textContent = '0%';

    if (taskId) {
        // Modo edición
        const task = tasks.find(t => t.id === parseInt(taskId));
        if (task) {
            modalTitle.textContent = 'Editar Tarea';
            document.getElementById('taskId').value = task.id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskDueDate').value = task.dueDate || '';
            document.getElementById('taskPriority').value = task.priority || 'media';
            document.getElementById('taskAssignee').value = task.assignee || '';
            document.getElementById('taskProgress').value = task.progress || 0;
            document.getElementById('progressValue').textContent = (task.progress || 0) + '%';
            document.getElementById('parentTask').value = task.parentId || '';
            
            // Mostrar selector de tarea padre solo si no es una tarea principal
            parentTaskContainer.style.display = task.parentId ? 'block' : 'none';
        }
    } else {
        // Modo nueva tarea
        modalTitle.textContent = 'Nueva Tarea';
        document.getElementById('taskId').value = '';
        document.getElementById('taskProgress').value = 0;
        
        // Si se está creando una subtarea
        if (parentTaskId) {
            document.getElementById('parentTask').value = parentTaskId !== null ? parentTaskId : '';
            parentTaskContainer.style.display = 'block';
        } else {
            document.getElementById('parentTask').value = '';
            parentTaskContainer.style.display = 'none';
        }
    }

    modal.style.display = 'block';
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
}

function openEmployeeModal() {
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeModal').style.display = 'block';
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'none';
}

function openSubtasksModal(taskId) {
    const task = tasks.find(t => t.id === parseInt(taskId));
    if (!task) return;

    const modal = document.getElementById('subtasksModal');
    modal.dataset.taskId = taskId;
    document.getElementById('subtasksModalTitle').textContent = `Subtareas de: ${task.title}`;
    
    renderSubtasks(parseInt(taskId));
    populateParentTaskDropdown();
    modal.style.display = 'block';
}

function closeSubtasksModal() {
    document.getElementById('subtasksModal').style.display = 'none';
}

// Manejadores de formularios
function handleTaskFormSubmit(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('taskId').value;
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const dueDate = document.getElementById('taskDueDate').value;
    const priority = document.getElementById('taskPriority').value;
    const assignee = document.getElementById('taskAssignee').value;
    const progress = parseInt(document.getElementById('taskProgress').value);
    const parentId = document.getElementById('parentTask').value || null;
    
    if (!title) return;
    
    const now = new Date().toISOString();
    
    if (taskId) {
        // Actualizar tarea existente
        db.run(
            `UPDATE tasks SET 
                title = ?, 
                description = ?, 
                dueDate = ?, 
                priority = ?, 
                assignee = ?, 
                progress = ?, 
                parentId = ?, 
                updatedAt = ? 
            WHERE id = ?`,
            [title, description, dueDate, priority, assignee, progress, parentId ? parseInt(parentId) : null, now, parseInt(taskId)]
        );
        
        // Actualizar en memoria
        const taskIndex = tasks.findIndex(t => t.id === parseInt(taskId));
        if (taskIndex !== -1) {
            tasks[taskIndex] = {
                ...tasks[taskIndex],
                title,
                description,
                dueDate,
                priority,
                assignee,
                progress,
                parentId: parentId ? parseInt(parentId) : null,
                updatedAt: now
            };
        }
    } else {
        // Crear nueva tarea
        lastTaskId++;
        
        // Actualizar lastTaskId en la base de datos
        db.run("UPDATE settings SET value = ? WHERE key = 'lastTaskId'", [lastTaskId.toString()]);
        
        // Insertar nueva tarea
        db.run(
            `INSERT INTO tasks (id, title, description, dueDate, priority, assignee, progress, parentId, createdAt, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [lastTaskId, title, description, dueDate, priority, assignee, progress, parentId ? parseInt(parentId) : null, now, now]
        );
        
        // Actualizar en memoria
        const newTask = {
            id: lastTaskId,
            title,
            description,
            dueDate,
            priority,
            assignee,
            progress,
            parentId: parentId ? parseInt(parentId) : null,
            createdAt: now,
            updatedAt: now
        };
        tasks.push(newTask);
    }
    
    saveDatabase();
    renderTasks();
    updateStatistics();
    closeTaskModal();
    closeSubtasksModal();
    
    
    // Si estamos añadiendo una subtarea, actualizar la vista de subtareas
    if (parentId && document.getElementById('subtasksModal').style.display === 'block') {
        renderSubtasks(parseInt(parentId));
        closeSubtasksModal();
    }
}

function handleEmployeeFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('employeeId').value;
    const name = document.getElementById('employeeName').value.trim();
    const position = document.getElementById('employeePosition').value.trim();
    const email = document.getElementById('employeeEmail').value.trim();

    if (!name) return;

    if (id) {
        // Edit existing employee
        db.run(
            `UPDATE employees SET name = ?, position = ?, email = ? WHERE id = ?`,
            [name, position, email, id]
        );
        const idx = employees.findIndex(e => e.id === id);
        if (idx !== -1) {
            employees[idx] = { id, name, position, email };
        }
    } else {
        // New employee
        const newId = Date.now().toString();
        db.run(
            `INSERT INTO employees (id, name, position, email) VALUES (?, ?, ?, ?)`,
            [newId, name, position, email]
        );
        employees.push({ id: newId, name, position, email });
    }

    saveDatabase();
    populateEmployeeDropdowns();
    renderEmployeeList();
    closeEmployeeModal();
}

// Funciones de renderizado
function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    const employeeFilter = document.getElementById('filterEmployee').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const sortBy = document.getElementById('sortBy').value;
    
    // Construir la consulta SQL base
    let query = 'SELECT * FROM tasks WHERE parentId IS NULL';
    const params = [];
    
    // Aplicar filtro de empleado
    if (employeeFilter) {
        query += ' AND assignee = ?';
        params.push(employeeFilter);
    }
    
    // Aplicar filtro de estado
    if (statusFilter) {
        switch (statusFilter) {
            case 'pendiente':
                query += ' AND progress = 0';
                break;
            case 'en-progreso':
                query += ' AND progress > 0 AND progress < 100';
                break;
            case 'completada':
                query += ' AND progress = 100';
                break;
        }
    }
    
    // Aplicar ordenamiento
    switch (sortBy) {
        case 'date-asc':
            query += ' ORDER BY createdAt ASC';
            break;
        case 'date-desc':
            query += ' ORDER BY createdAt DESC';
            break;
        case 'priority-desc':
            query += ' ORDER BY CASE priority WHEN "alta" THEN 1 WHEN "media" THEN 2 WHEN "baja" THEN 3 END';
            break;
        case 'progress-asc':
            query += ' ORDER BY progress ASC';
            break;
        default:
            query += ' ORDER BY updatedAt DESC';
    }
    
    // Ejecutar la consulta
    const stmt = db.prepare(query);
    let filteredTasks = [];
    
    while (stmt.step()) {
        const row = stmt.getAsObject();
        filteredTasks.push(row);
    }
    stmt.free();
    
    // Renderizar tareas
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks fa-3x"></i>
                <p>No hay tareas disponibles. ¡Añade una nueva tarea para comenzar!</p>
            </div>
        `;
        return;
    }
    
    tasksList.innerHTML = '';
    
    filteredTasks.forEach(task => {
        // Contar subtareas
        const subtasksStmt = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN progress = 100 THEN 1 ELSE 0 END) as completed FROM tasks WHERE parentId = ?');
        subtasksStmt.bind([task.id]);
        subtasksStmt.step();
        const subtasksCount = subtasksStmt.getAsObject();
        subtasksStmt.free();
        
        const subtasksTotal = subtasksCount.total || 0;
        const completedSubtasks = subtasksCount.completed || 0;
        
        // Crear elemento de tarea
        const taskElement = document.createElement('div');
        taskElement.className = 'task-card';
        taskElement.innerHTML = `
            <div class="task-header">
                <h3 class="task-title">${task.title}</h3>
                <span class="task-priority priority-${task.priority}">${getPriorityText(task.priority)}</span>
            </div>
            <div class="task-meta">
                <span><i class="far fa-calendar-alt"></i> ${task.dueDate ? formatDate(task.dueDate) : 'Sin fecha'}</span>
                <span><i class="far fa-user"></i> ${getEmployeeName(task.assignee) || 'Sin asignar'}</span>
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-progress">
                <div class="task-progress-label">
                    <span>Progreso:</span>
                    <span>${task.progress}%</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${task.progress}%;"></div>
                </div>
            </div>
            ${subtasksTotal > 0 ? `
                <div class="subtask-indicator" onclick="openSubtasksModal(${task.id})">
                    <i class="fas fa-tasks"></i>
                    <span>${completedSubtasks}/${subtasksTotal} subtareas</span>
                </div>
            ` : ''}
            <div class="task-actions">
                <button class="task-action-btn" onclick="openSubtasksModal(${task.id})">
                    <i class="fas fa-list"></i> Subtareas
                </button>
                <button class="task-action-btn" onclick="openTaskModal(${task.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="task-action-btn delete" onclick="deleteTask(${task.id})">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
            </div>
        `;
        
        tasksList.appendChild(taskElement);
    });
}

function renderSubtasks(parentTaskId) {
    const subtasksList = document.getElementById('subtasksList');
    
    // Obtener información de la tarea principal
    const parentTask = tasks.find(t => t.id === parentTaskId);
    if (!parentTask) return;
    
    // Consultar subtareas
    const stmt = db.prepare('SELECT * FROM tasks WHERE parentId = ?');
    stmt.bind([parentTaskId]);
    
    let subtasks = [];
    while (stmt.step()) {
        subtasks.push(stmt.getAsObject());
    }
    stmt.free();
    
    if (subtasks.length === 0) {
        subtasksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks fa-2x"></i>
                <p>No hay subtareas. ¡Añade una nueva subtarea!</p>
            </div>
        `;
        return;
    }
    
    subtasksList.innerHTML = '';
    
    // Añadir un encabezado que muestre la tarea principal
    const headerElement = document.createElement('div');
    headerElement.className = 'subtasks-header';
    headerElement.innerHTML = `
        <div class="parent-task-indicator">
            <i class="fas fa-level-up-alt fa-rotate-90"></i>
            <span>Subtareas de: <strong>${parentTask.title}</strong></span>
        </div>
    `;
    subtasksList.appendChild(headerElement);
    
    subtasks.forEach(task => {
        const subtaskElement = document.createElement('div');
        subtaskElement.className = 'task-card subtask-card';
        subtaskElement.innerHTML = `
            <div class="task-header">
                <h3 class="task-title">${task.title}</h3>
                <span class="task-priority priority-${task.priority}">${getPriorityText(task.priority)}</span>
            </div>
            <div class="task-meta">
                <span><i class="far fa-calendar-alt"></i> ${task.dueDate ? formatDate(task.dueDate) : 'Sin fecha'}</span>
                <span><i class="far fa-user"></i> ${getEmployeeName(task.assignee) || 'Sin asignar'}</span>
                <span class="parent-task-reference"><i class="fas fa-project-diagram"></i> Tarea principal: ${parentTask.title}</span>
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-progress">
                <div class="task-progress-label">
                    <span>Progreso:</span>
                    <span>${task.progress}%</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${task.progress}%;"></div>
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn" onclick="openTaskModal(${task.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="task-action-btn delete" onclick="deleteTask(${task.id})">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
            </div>
        `;
        
        subtasksList.appendChild(subtaskElement);
    });
}


// Funciones de utilidad
function populateEmployeeDropdowns() {
    const employeeSelects = [
        document.getElementById('taskAssignee'),
        document.getElementById('filterEmployee')
    ];
    
    employeeSelects.forEach(select => {
        // Guardar el valor seleccionado actualmente
        const currentValue = select.value;
        
        // Limpiar opciones excepto la primera
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Añadir opciones de empleados
        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = employee.name;
            select.appendChild(option);
        });
        
        // Restaurar el valor seleccionado si existe
        if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
            select.value = currentValue;
        }
    });
}

function populateParentTaskDropdown() {
    const select = document.getElementById('parentTask');
    
    // Guardar el valor seleccionado actualmente
    const currentValue = select.value;
    
    // Limpiar opciones excepto la primera
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Filtrar tareas principales (sin parentId)
    const mainTasks = tasks.filter(task => !task.parentId);
    
    // Añadir opciones de tareas principales
    mainTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.title;
        select.appendChild(option);
    });
    
    // Restaurar el valor seleccionado si existe
    if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
        select.value = currentValue;
    }
}

function updateStatistics() {
    // Consultar estadísticas
    const statsQuery = db.exec(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN progress = 100 THEN 1 ELSE 0 END) as completed,
            AVG(progress) as avgProgress
        FROM tasks
    `);
    
    const stats = statsQuery[0].values[0];
    const totalTasks = stats[0] || 0;
    const completedTasks = stats[1] || 0;
    const overallProgress = Math.round(stats[2] || 0);
    
    // Actualizar elementos en el DOM
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    
    const progressBar = document.getElementById('overallProgress');
    progressBar.style.width = `${overallProgress}%`;
    progressBar.textContent = `${overallProgress}%`;
}

function deleteTask(taskId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.')) {
        return;
    }
    
    // Eliminar la tarea y sus subtareas de la base de datos
    db.run('DELETE FROM tasks WHERE id = ? OR parentId = ?', [taskId, taskId]);
    
    // Actualizar en memoria
    tasks = tasks.filter(task => task.id !== taskId && task.parentId !== taskId);
    
    saveDatabase();
    renderTasks();
    updateStatistics();
    
    // Si el modal de subtareas está abierto, cerrarlo
    if (document.getElementById('subtasksModal').style.display === 'block') {
        closeSubtasksModal();
    }
}

function getEmployeeName(employeeId) {
    if (!employeeId) return '';
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.name : '';
}

function getPriorityText(priority) {
    switch (priority) {
        case 'alta': return 'Alta';
        case 'media': return 'Media';
        case 'baja': return 'Baja';
        default: return 'Media';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Migrar datos de localStorage a SQLite si existen
function migrateFromLocalStorage() {
    try {
        const savedTasks = localStorage.getItem('tasks');
        const savedEmployees = localStorage.getItem('employees');
        const savedLastId = localStorage.getItem('lastTaskId');
        
        if (savedTasks || savedEmployees) {
            if (confirm('Se han detectado datos en el almacenamiento anterior. ¿Desea migrarlos a la nueva base de datos?')) {
                try {
                    // Migrar empleados
                    if (savedEmployees) {
                        const oldEmployees = JSON.parse(savedEmployees);
                        oldEmployees.forEach(employee => {
                            db.run(
                                `INSERT INTO employees (id, name, position, email) VALUES (?, ?, ?, ?)`,
                                [employee.id, employee.name, employee.position, employee.email]
                            );
                        });
                    }
                    
                    // Migrar tareas
                    if (savedTasks) {
                        const oldTasks = JSON.parse(savedTasks);
                        oldTasks.forEach(task => {
                            db.run(
                                `INSERT INTO tasks (id, title, description, dueDate, priority, assignee, progress, parentId, createdAt, updatedAt) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [task.id, task.title, task.description, task.dueDate, task.priority, task.assignee, task.progress, task.parentId, task.createdAt, task.updatedAt]
                            );
                        });
                    }
                    
                    // Actualizar lastTaskId
                    if (savedLastId) {
                        db.run("UPDATE settings SET value = ? WHERE key = 'lastTaskId'", [savedLastId]);
                    }
                    
                    saveDatabase();
                    loadDataFromDatabase();
    renderTasks();
                    
                    alert('Datos migrados correctamente. Los datos antiguos se mantendrán en localStorage hasta que los elimine manualmente.');
                } catch (error) {
                    console.error('Error al migrar datos:', error);
                    alert('Error al migrar los datos. Se utilizará una base de datos vacía.');
                }
            }
        }
    } catch (error) {
        console.error('Error al verificar datos para migración:', error);
    }
}

// --- NUEVAS FUNCIONES PARA GESTIONAR EMPLEADOS ---

function openManageEmployeesModal() {
    const modal = document.getElementById('manageEmployeesModal');
    renderEmployeeList();
    modal.style.display = 'block';
}

function closeManageEmployeesModal() {
    document.getElementById('manageEmployeesModal').style.display = 'none';
}

function renderEmployeeList() {
    const list = document.getElementById('employeeList');
    list.innerHTML = '';
    employees.forEach(employee => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${employee.name}</td>
            <td>${employee.position || ''}</td>
            <td>${employee.email || ''}</td>
            <td>
                <button class="employee-action-btn edit" title="Editar" onclick="editEmployee('${employee.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="employee-action-btn delete" title="Borrar" onclick="deleteEmployee('${employee.id}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        list.appendChild(tr);
    });
}

function editEmployee(employeeId) {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    // Rellena el formulario de empleado con los datos actuales
    document.getElementById('employeeId').value = employee.id;
    document.getElementById('employeeName').value = employee.name;
    document.getElementById('employeePosition').value = employee.position || '';
    document.getElementById('employeeEmail').value = employee.email || '';
    // Opcional: Cierra el modal de gestión y abre el de edición si lo prefieres
    // closeManageEmployeesModal();
    document.getElementById('employeeModal').style.display = 'block';
}

function deleteEmployee(employeeId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este empleado? Esta acción no se puede deshacer.')) {
        return;
    }
    db.run('DELETE FROM employees WHERE id = ?', [employeeId]);
    employees = employees.filter(employee => employee.id !== employeeId);
    saveDatabase();
    populateEmployeeDropdowns();
    renderEmployeeList();
    alert('Empleado eliminado correctamente.');
}