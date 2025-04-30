// Modelo de datos
let tasks = [];
let employees = [];
let lastTaskId = 0;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromLocalStorage();
    renderTasks();
    updateStatistics();
    populateEmployeeDropdowns();
    populateParentTaskDropdown();
    setupEventListeners();
});

// Cargar datos desde localStorage
function loadDataFromLocalStorage() {
    const savedTasks = localStorage.getItem('tasks');
    const savedEmployees = localStorage.getItem('employees');
    const savedLastId = localStorage.getItem('lastTaskId');

    if (savedTasks) tasks = JSON.parse(savedTasks);
    if (savedEmployees) employees = JSON.parse(savedEmployees);
    if (savedLastId) lastTaskId = parseInt(savedLastId);
}

// Guardar datos en localStorage
function saveDataToLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('employees', JSON.stringify(employees));
    localStorage.setItem('lastTaskId', lastTaskId.toString());
}

// Configurar event listeners
function setupEventListeners() {
    // Botones principales
    document.getElementById('btnAddTask').addEventListener('click', () => openTaskModal());
    document.getElementById('btnAddEmployee').addEventListener('click', openEmployeeModal);

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
        const task = tasks.find(t => t.id === taskId);
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
            document.getElementById('parentTask').value = parentTaskId;
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
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById('subtasksModal');
    modal.dataset.taskId = taskId;
    document.getElementById('subtasksModalTitle').textContent = `Subtareas de: ${task.title}`;
    
    renderSubtasks(taskId);
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
    
    if (taskId) {
        // Actualizar tarea existente
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
                updatedAt: new Date().toISOString()
            };
        }
    } else {
        // Crear nueva tarea
        lastTaskId++;
        const newTask = {
            id: lastTaskId,
            title,
            description,
            dueDate,
            priority,
            assignee,
            progress,
            parentId: parentId ? parseInt(parentId) : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        tasks.push(newTask);
    }
    
    saveDataToLocalStorage();
    renderTasks();
    updateStatistics();
    closeTaskModal();
    
    // Si estamos añadiendo una subtarea, actualizar la vista de subtareas
    if (parentId && document.getElementById('subtasksModal').style.display === 'block') {
        renderSubtasks(parseInt(parentId));
    }
}

function handleEmployeeFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('employeeName').value.trim();
    const position = document.getElementById('employeePosition').value.trim();
    const email = document.getElementById('employeeEmail').value.trim();
    
    if (!name) return;
    
    const newEmployee = {
        id: Date.now().toString(),
        name,
        position,
        email
    };
    
    employees.push(newEmployee);
    saveDataToLocalStorage();
    populateEmployeeDropdowns();
    closeEmployeeModal();
}

// Funciones de renderizado
function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    const employeeFilter = document.getElementById('filterEmployee').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const sortBy = document.getElementById('sortBy').value;
    
    // Filtrar tareas principales (sin parentId)
    let filteredTasks = tasks.filter(task => !task.parentId);
    
    // Aplicar filtro de empleado
    if (employeeFilter) {
        filteredTasks = filteredTasks.filter(task => task.assignee === employeeFilter);
    }
    
    // Aplicar filtro de estado
    if (statusFilter) {
        switch (statusFilter) {
            case 'pendiente':
                filteredTasks = filteredTasks.filter(task => task.progress === 0);
                break;
            case 'en-progreso':
                filteredTasks = filteredTasks.filter(task => task.progress > 0 && task.progress < 100);
                break;
            case 'completada':
                filteredTasks = filteredTasks.filter(task => task.progress === 100);
                break;
        }
    }
    
    // Ordenar tareas
    filteredTasks.sort((a, b) => {
        switch (sortBy) {
            case 'date-asc':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'date-desc':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'priority-desc':
                const priorityValues = { 'alta': 3, 'media': 2, 'baja': 1 };
                return priorityValues[b.priority] - priorityValues[a.priority];
            case 'progress-asc':
                return a.progress - b.progress;
            default:
                return new Date(b.updatedAt) - new Date(a.updatedAt);
        }
    });
    
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
        const subtasks = tasks.filter(t => t.parentId === task.id);
        const completedSubtasks = subtasks.filter(t => t.progress === 100).length;
        
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
            ${subtasks.length > 0 ? `
                <div class="subtask-indicator" onclick="openSubtasksModal(${task.id})">
                    <i class="fas fa-tasks"></i>
                    <span>${completedSubtasks}/${subtasks.length} subtareas</span>
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
    const subtasks = tasks.filter(task => task.parentId === parentTaskId);
    
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
    
    subtasks.forEach(task => {
        const subtaskElement = document.createElement('div');
        subtaskElement.className = 'task-card';
        subtaskElement.innerHTML = `
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
        
        // Añadir empleados
        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = employee.name;
            select.appendChild(option);
        });
        
        // Restaurar el valor seleccionado si existe
        if (currentValue && [...select.options].some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        }
    });
}

function populateParentTaskDropdown() {
    const select = document.getElementById('parentTask');
    
    // Limpiar opciones excepto la primera
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Añadir solo tareas principales (sin parentId)
    const mainTasks = tasks.filter(task => !task.parentId);
    mainTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.title;
        select.appendChild(option);
    });
}

function updateStatistics() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.progress === 100).length;
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('overallProgress').textContent = overallProgress + '%';
    document.getElementById('overallProgress').style.width = overallProgress + '%';
}

function deleteTask(taskId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.')) {
        return;
    }
    
    // Eliminar la tarea
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        tasks.splice(taskIndex, 1);
    }
    
    // Eliminar subtareas asociadas
    const subtasks = tasks.filter(t => t.parentId === taskId);
    subtasks.forEach(subtask => {
        const subtaskIndex = tasks.findIndex(t => t.id === subtask.id);
        if (subtaskIndex !== -1) {
            tasks.splice(subtaskIndex, 1);
        }
    });
    
    saveDataToLocalStorage();
    renderTasks();
    updateStatistics();
    
    // Si estamos en el modal de subtareas, cerrarlo
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

// Hacer funciones accesibles globalmente para los event handlers en HTML
window.openTaskModal = openTaskModal;
window.openSubtasksModal = openSubtasksModal;
window.deleteTask = deleteTask;