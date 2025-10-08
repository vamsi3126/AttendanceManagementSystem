
let students = [];
let currentAttendance = {};
let attendanceManager = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadSampleData(); // Load some sample data for demonstration
    updateDashboard();
});

function initializeApp() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
    
    // Load data from localStorage
    loadDataFromStorage();
    
    // Update all dropdowns and displays
    updateClassDropdowns();
    updateStudentDropdowns();
}

function loadSampleData() {
    if (students.length === 0) {
        const sampleStudents = [
            {
                studentId: 'STU001',
                name: 'John Smith',
                email: 'john.smith@email.com',
                className: 'Grade 10A',
                attendance: {}
            },
            {
                studentId: 'STU002',
                name: 'Emily Johnson',
                email: 'emily.johnson@email.com',
                className: 'Grade 10A',
                attendance: {}
            },
            {
                studentId: 'STU003',
                name: 'Michael Brown',
                email: 'michael.brown@email.com',
                className: 'Grade 10B',
                attendance: {}
            },
            {
                studentId: 'STU004',
                name: 'Sarah Davis',
                email: 'sarah.davis@email.com',
                className: 'Grade 10A',
                attendance: {}
            },
            {
                studentId: 'STU005',
                name: 'David Wilson',
                email: 'david.wilson@email.com',
                className: 'Grade 10B',
                attendance: {}
            }
        ];
        
        students = sampleStudents;
        saveDataToStorage();
        updateDashboard();
        updateClassDropdowns();
        updateStudentDropdowns();
        updateStudentsTable();
    }
}

function showTab(tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    
    event.target.classList.add('active');
    
    switch(tabName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'students':
            updateStudentsTable();
            break;
        case 'attendance':
            // Update attendance tab if needed
            break;
        case 'reports':
            updateReportDropdowns();
            break;
    }
}

function updateDashboard() {
    const totalStudents = students.length;
    const todayAttendance = calculateTodayAttendance();
    const avgAttendance = calculateAverageAttendance();
    const totalClasses = calculateTotalClasses();
    
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('todayAttendance').textContent = todayAttendance.toFixed(1) + '%';
    document.getElementById('avgAttendance').textContent = avgAttendance.toFixed(1) + '%';
    document.getElementById('totalClasses').textContent = totalClasses;
    
    updateRecentActivity();
}

function calculateTodayAttendance() {
    const today = new Date().toISOString().split('T')[0];
    let presentCount = 0;
    let totalCount = 0;
    
    students.forEach(student => {
        if (student.attendance[today] !== undefined) {
            totalCount++;
            if (student.attendance[today]) {
                presentCount++;
            }
        }
    });
    
    return totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
}

function calculateAverageAttendance() {
    if (students.length === 0) return 0;
    
    const totalPercentage = students.reduce((sum, student) => {
        return sum + calculateStudentAttendancePercentage(student);
    }, 0);
    
    return totalPercentage / students.length;
}

function calculateStudentAttendancePercentage(student) {
    const attendanceValues = Object.values(student.attendance);
    if (attendanceValues.length === 0) return 0;
    
    const presentCount = attendanceValues.filter(present => present).length;
    return (presentCount / attendanceValues.length) * 100;
}

function calculateTotalClasses() {
    const allDates = new Set();
    students.forEach(student => {
        Object.keys(student.attendance).forEach(date => allDates.add(date));
    });
    return allDates.size;
}

function updateRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    const recentActivities = [];
    
    // Get recent attendance activities
    students.forEach(student => {
        Object.keys(student.attendance).forEach(date => {
            recentActivities.push({
                date: date,
                student: student.name,
                present: student.attendance[date],
                type: 'attendance'
            });
        });
    });
    
    // Sort by date (most recent first)
    recentActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Display last 5 activities
    const displayActivities = recentActivities.slice(0, 5);
    
    if (displayActivities.length === 0) {
        activityList.innerHTML = '<p>No recent activity</p>';
        return;
    }
    
    activityList.innerHTML = displayActivities.map(activity => {
        const status = activity.present ? 'Present' : 'Absent';
        const statusClass = activity.present ? 'success' : 'danger';
        return `
            <div class="activity-item">
                <span class="activity-date">${formatDate(activity.date)}</span>
                <span class="activity-student">${activity.student}</span>
                <span class="activity-status ${statusClass}">${status}</span>
            </div>
        `;
    }).join('');
}

function showAddStudentForm() {
    document.getElementById('addStudentForm').style.display = 'block';
    document.getElementById('studentName').focus();
}

function hideAddStudentForm() {
    document.getElementById('addStudentForm').style.display = 'none';
    document.getElementById('addStudentForm').reset();
}

function addStudent(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('studentId').value.trim();
    const name = document.getElementById('studentName').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const className = document.getElementById('studentClass').value.trim();
    
    if (!studentId || !name || !email || !className) {
        showMessage('Please fill in all fields.', 'error');
        return;
    }
    
    if (students.find(s => s.studentId === studentId)) {
        showMessage('Student ID already exists.', 'error');
        return;
    }
    
    const newStudent = {
        studentId: studentId,
        name: name,
        email: email,
        className: className,
        attendance: {}
    };
    
    students.push(newStudent);
    saveDataToStorage();
    
    showMessage('Student added successfully!', 'success');
    hideAddStudentForm();
    updateStudentsTable();
    updateClassDropdowns();
    updateStudentDropdowns();
    updateDashboard();
}

function updateStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No students found</td></tr>';
        return;
    }
    
    tbody.innerHTML = students.map(student => {
        const attendancePercentage = calculateStudentAttendancePercentage(student);
        return `
            <tr>
                <td>${student.studentId}</td>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.className}</td>
                <td>${attendancePercentage.toFixed(1)}%</td>
                <td>
                    <button class="btn btn-danger" onclick="removeStudent('${student.studentId}')">Remove</button>
                </td>
            </tr>
        `;
    }).join('');
}

function removeStudent(studentId) {
    if (confirm('Are you sure you want to remove this student?')) {
        students = students.filter(s => s.studentId !== studentId);
        saveDataToStorage();
        updateStudentsTable();
        updateClassDropdowns();
        updateStudentDropdowns();
        updateDashboard();
        showMessage('Student removed successfully!', 'success');
    }
}

function loadStudentsForAttendance() {
    const selectedClass = document.getElementById('selectedClass').value;
    const attendanceList = document.getElementById('attendanceList');
    
    if (!selectedClass) {
        attendanceList.style.display = 'none';
        return;
    }
    
    const classStudents = students.filter(s => s.className === selectedClass);
    
    if (classStudents.length === 0) {
        attendanceList.style.display = 'none';
        showMessage('No students found in this class.', 'error');
        return;
    }
    
    document.getElementById('className').textContent = selectedClass;
    const studentsList = document.getElementById('studentsAttendanceList');
    
    studentsList.innerHTML = classStudents.map(student => {
        const date = document.getElementById('attendanceDate').value;
        const isPresent = student.attendance[date] === true;
        
        return `
            <div class="student-attendance-item">
                <input type="checkbox" 
                       id="att_${student.studentId}" 
                       ${isPresent ? 'checked' : ''} 
                       onchange="updateAttendanceStatus('${student.studentId}', this.checked)">
                <div class="student-info">
                    <div class="student-name">${student.name}</div>
                    <div class="student-id">${student.studentId}</div>
                </div>
            </div>
        `;
    }).join('');
    
    attendanceList.style.display = 'block';
}

function updateAttendanceStatus(studentId, isPresent) {
    const date = document.getElementById('attendanceDate').value;
    const student = students.find(s => s.studentId === studentId);
    
    if (student) {
        student.attendance[date] = isPresent;
        saveDataToStorage();
    }
}

function markAllPresent() {
    const checkboxes = document.querySelectorAll('#studentsAttendanceList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        const studentId = checkbox.id.replace('att_', '');
        updateAttendanceStatus(studentId, true);
    });
}

function markAllAbsent() {
    const checkboxes = document.querySelectorAll('#studentsAttendanceList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        const studentId = checkbox.id.replace('att_', '');
        updateAttendanceStatus(studentId, false);
    });
}

function saveAttendance() {
    showMessage('Attendance saved successfully!', 'success');
    updateDashboard();
}

function updateReportDropdowns() {
    const classes = [...new Set(students.map(s => s.className))];
    const classSelects = ['reportClass', 'classReport'];
    
    classSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">All Classes</option>';
        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            select.appendChild(option);
        });
        
        select.value = currentValue;
    });
    
    // Update student dropdown
    const studentSelect = document.getElementById('individualStudent');
    const currentStudentValue = studentSelect.value;
    
    studentSelect.innerHTML = '<option value="">Select Student</option>';
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.studentId;
        option.textContent = `${student.name} (${student.studentId})`;
        studentSelect.appendChild(option);
    });
    
    studentSelect.value = currentStudentValue;
}

function generateIndividualReport() {
    const studentId = document.getElementById('individualStudent').value;
    
    if (!studentId) {
        showMessage('Please select a student.', 'error');
        return;
    }
    
    const student = students.find(s => s.studentId === studentId);
    if (!student) {
        showMessage('Student not found.', 'error');
        return;
    }
    
    const attendancePercentage = calculateStudentAttendancePercentage(student);
    const attendanceValues = Object.values(student.attendance);
    const presentCount = attendanceValues.filter(present => present).length;
    const absentCount = attendanceValues.length - presentCount;
    
    const report = `
        <h4>${student.name} - Individual Report</h4>
        <p><strong>Student ID:</strong> ${student.studentId}</p>
        <p><strong>Email:</strong> ${student.email}</p>
        <p><strong>Class:</strong> ${student.className}</p>
        <p><strong>Total Classes:</strong> ${attendanceValues.length}</p>
        <p><strong>Present Classes:</strong> ${presentCount}</p>
        <p><strong>Absent Classes:</strong> ${absentCount}</p>
        <p><strong>Attendance Percentage:</strong> ${attendancePercentage.toFixed(1)}%</p>
    `;
    
    document.getElementById('individualReport').innerHTML = report;
}

function generateClassReport() {
    const className = document.getElementById('classReport').value;
    
    if (!className) {
        showMessage('Please select a class.', 'error');
        return;
    }
    
    const classStudents = students.filter(s => s.className === className);
    
    if (classStudents.length === 0) {
        showMessage('No students found in this class.', 'error');
        return;
    }
    
    const totalStudents = classStudents.length;
    const avgAttendance = classStudents.reduce((sum, student) => {
        return sum + calculateStudentAttendancePercentage(student);
    }, 0) / totalStudents;
    
    let studentDetails = classStudents.map(student => {
        const percentage = calculateStudentAttendancePercentage(student);
        return `<li>${student.name} (${student.studentId}): ${percentage.toFixed(1)}%</li>`;
    }).join('');
    
    const report = `
        <h4>${className} - Class Report</h4>
        <p><strong>Total Students:</strong> ${totalStudents}</p>
        <p><strong>Average Attendance:</strong> ${avgAttendance.toFixed(1)}%</p>
        <h5>Student Details:</h5>
        <ul>${studentDetails}</ul>
    `;
    
    document.getElementById('classReportContent').innerHTML = report;
}

function generateOverallStats() {
    const totalStudents = students.length;
    const overallAvg = calculateAverageAttendance();
    const todayAttendance = calculateTodayAttendance();
    const totalClasses = calculateTotalClasses();
    
    const classes = [...new Set(students.map(s => s.className))];
    let classStats = classes.map(className => {
        const classStudents = students.filter(s => s.className === className);
        const classAvg = classStudents.reduce((sum, student) => {
            return sum + calculateStudentAttendancePercentage(student);
        }, 0) / classStudents.length;
        
        return `<li>${className}: ${classStudents.length} students, ${classAvg.toFixed(1)}% average attendance</li>`;
    }).join('');
    
    const report = `
        <h4>Overall Statistics</h4>
        <p><strong>Total Students:</strong> ${totalStudents}</p>
        <p><strong>Total Classes:</strong> ${totalClasses}</p>
        <p><strong>Overall Average Attendance:</strong> ${overallAvg.toFixed(1)}%</p>
        <p><strong>Today's Attendance:</strong> ${todayAttendance.toFixed(1)}%</p>
        <h5>Class-wise Statistics:</h5>
        <ul>${classStats}</ul>
    `;
    
    document.getElementById('overallStats').innerHTML = report;
}

function updateClassDropdowns() {
    const classes = [...new Set(students.map(s => s.className))];
    const selects = ['selectedClass', 'reportClass', 'classReport'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">Select a class</option>';
        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            select.appendChild(option);
        });
        
        select.value = currentValue;
    });
}

function updateStudentDropdowns() {
    const studentSelect = document.getElementById('individualStudent');
    const currentValue = studentSelect.value;
    
    studentSelect.innerHTML = '<option value="">Select Student</option>';
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.studentId;
        option.textContent = `${student.name} (${student.studentId})`;
        studentSelect.appendChild(option);
    });
    
    studentSelect.value = currentValue;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    
    // Insert at the top of the active tab content
    const activeTab = document.querySelector('.tab-content.active');
    activeTab.insertBefore(messageDiv, activeTab.firstChild);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

function saveDataToStorage() {
    try {
        localStorage.setItem('attendanceStudents', JSON.stringify(students));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

function loadDataFromStorage() {
    try {
        const savedData = localStorage.getItem('attendanceStudents');
        if (savedData) {
            students = JSON.parse(savedData);
        }
    } catch (error) {
        console.error('Error loading data:', error);
        students = [];
    }
}
