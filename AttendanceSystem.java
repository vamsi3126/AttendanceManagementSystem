import java.util.Scanner;

public class AttendanceSystem {
    private AttendanceManager manager;
    private Scanner scanner;
    
    public AttendanceSystem() {
        this.manager = new AttendanceManager();
        this.scanner = new Scanner(System.in);
    }
    
    public static void main(String[] args) {
        AttendanceSystem system = new AttendanceSystem();
        system.run();
    }
    
    public void run() {
        System.out.println("=== Welcome to Attendance Management System ===");
        System.out.println("Note: This is a backend console interface.");
        System.out.println("For the full GUI, open index.html in your web browser.");
        System.out.println();
        
        while (true) {
            displayMenu();
            int choice = getIntInput("Enter your choice: ");
            
            switch (choice) {
                case 1:
                    addStudent();
                    break;
                case 2:
                    viewAllStudents();
                    break;
                case 3:
                    markAttendance();
                    break;
                case 4:
                    viewAttendance();
                    break;
                case 5:
                    generateReport();
                    break;
                case 6:
                    viewStatistics();
                    break;
                case 7:
                    searchStudents();
                    break;
                case 8:
                    removeStudent();
                    break;
                case 0:
                    System.out.println("Thank you for using Attendance Management System!");
                    return;
                default:
                    System.out.println("Invalid choice. Please try again.");
            }
            
            System.out.println("\nPress Enter to continue...");
            scanner.nextLine();
        }
    }
    
    private void displayMenu() {
        System.out.println("\n=== Main Menu ===");
        System.out.println("1. Add Student");
        System.out.println("2. View All Students");
        System.out.println("3. Mark Attendance");
        System.out.println("4. View Attendance");
        System.out.println("5. Generate Report");
        System.out.println("6. View Statistics");
        System.out.println("7. Search Students");
        System.out.println("8. Remove Student");
        System.out.println("0. Exit");
        System.out.println("==================");
    }
    
    private void addStudent() {
        System.out.println("\n=== Add New Student ===");
        
        String studentId = getStringInput("Enter Student ID: ");
        if (manager.getStudentById(studentId) != null) {
            System.out.println("Student with ID " + studentId + " already exists!");
            return;
        }
        
        String name = getStringInput("Enter Student Name: ");
        String email = getStringInput("Enter Email: ");
        String className = getStringInput("Enter Class: ");
        
        Student student = new Student(studentId, name, email, className);
        
        if (manager.addStudent(student)) {
            System.out.println("Student added successfully!");
        } else {
            System.out.println("Failed to add student. Student ID might already exist.");
        }
    }
    
    private void viewAllStudents() {
        System.out.println("\n=== All Students ===");
        List<Student> students = manager.getAllStudents();
        
        if (students.isEmpty()) {
            System.out.println("No students found.");
            return;
        }
        
        System.out.printf("%-10s %-20s %-25s %-10s %-10s%n", 
                         "ID", "Name", "Email", "Class", "Attendance%");
        System.out.println("-".repeat(80));
        
        for (Student student : students) {
            System.out.printf("%-10s %-20s %-25s %-10s %-10.1f%%%n",
                             student.getStudentId(),
                             student.getName(),
                             student.getEmail(),
                             student.getClassName(),
                             student.getAttendancePercentage());
        }
    }
    
    private void markAttendance() {
        System.out.println("\n=== Mark Attendance ===");
        
        System.out.println("Available Classes:");
        Set<String> classes = manager.getAllClasses();
        if (classes.isEmpty()) {
            System.out.println("No classes found. Please add students first.");
            return;
        }
        
        int index = 1;
        for (String className : classes) {
            System.out.println(index + ". " + className);
            index++;
        }
        
        int classChoice = getIntInput("Select class (number): ");
        if (classChoice < 1 || classChoice > classes.size()) {
            System.out.println("Invalid class selection.");
            return;
        }
        
        String selectedClass = classes.toArray(new String[0])[classChoice - 1];
        String date = getStringInput("Enter date (yyyy-mm-dd) or press Enter for today: ");
        if (date.isEmpty()) {
            date = manager.getCurrentDate();
        }
        
        if (!manager.isValidDate(date)) {
            System.out.println("Invalid date format. Please use yyyy-mm-dd format.");
            return;
        }
        
        List<Student> students = manager.getStudentsByClass(selectedClass);
        System.out.println("\nMarking attendance for class: " + selectedClass);
        System.out.println("Date: " + date);
        
        for (Student student : students) {
            String choice = getStringInput(student.getName() + " (" + student.getStudentId() + ") - Present? (y/n): ");
            boolean present = choice.toLowerCase().startsWith("y");
            manager.markAttendance(student.getStudentId(), date, present);
        }
        
        System.out.println("Attendance marked successfully!");
    }
    
    private void viewAttendance() {
        System.out.println("\n=== View Attendance ===");
        String studentId = getStringInput("Enter Student ID: ");
        
        Student student = manager.getStudentById(studentId);
        if (student == null) {
            System.out.println("Student not found.");
            return;
        }
        
        System.out.println("\nStudent Details:");
        System.out.println("ID: " + student.getStudentId());
        System.out.println("Name: " + student.getName());
        System.out.println("Email: " + student.getEmail());
        System.out.println("Class: " + student.getClassName());
        System.out.println("Total Classes: " + student.getTotalClasses());
        System.out.println("Present Classes: " + student.getPresentClasses());
        System.out.println("Absent Classes: " + student.getAbsentClasses());
        System.out.println("Attendance Percentage: " + String.format("%.1f%%", student.getAttendancePercentage()));
    }
    
    private void generateReport() {
        System.out.println("\n=== Generate Report ===");
        System.out.println("1. Individual Report");
        System.out.println("2. Class Report");
        System.out.println("3. Overall Statistics");
        
        int choice = getIntInput("Select report type: ");
        
        switch (choice) {
            case 1:
                String studentId = getStringInput("Enter Student ID: ");
                System.out.println("\n" + manager.generateIndividualReport(studentId));
                break;
            case 2:
                System.out.println("Available Classes:");
                Set<String> classes = manager.getAllClasses();
                int index = 1;
                for (String className : classes) {
                    System.out.println(index + ". " + className);
                    index++;
                }
                int classChoice = getIntInput("Select class: ");
                if (classChoice >= 1 && classChoice <= classes.size()) {
                    String selectedClass = classes.toArray(new String[0])[classChoice - 1];
                    System.out.println("\n" + manager.generateClassReport(selectedClass));
                }
                break;
            case 3:
                System.out.println("\n" + manager.generateOverallStats());
                break;
            default:
                System.out.println("Invalid choice.");
        }
    }
    
    private void viewStatistics() {
        System.out.println("\n=== Statistics ===");
        System.out.println("Total Students: " + manager.getAllStudents().size());
        System.out.println("Total Classes: " + manager.getTotalClasses());
        System.out.println("Overall Average Attendance: " + String.format("%.1f%%", manager.getOverallAttendancePercentage()));
        System.out.println("Today's Attendance: " + String.format("%.1f%%", manager.getTodayAttendancePercentage()));
        
        System.out.println("\nClass-wise Statistics:");
        for (String className : manager.getAllClasses()) {
            System.out.println("- " + className + ": " + 
                             manager.getStudentsByClass(className).size() + " students, " +
                             String.format("%.1f%%", manager.getClassAttendancePercentage(className)) + " average");
        }
    }
    
    private void searchStudents() {
        System.out.println("\n=== Search Students ===");
        String query = getStringInput("Enter search query (name, ID, email, or class): ");
        
        List<Student> results = manager.searchStudents(query);
        
        if (results.isEmpty()) {
            System.out.println("No students found matching your search.");
            return;
        }
        
        System.out.println("\nSearch Results:");
        System.out.printf("%-10s %-20s %-25s %-10s %-10s%n", 
                         "ID", "Name", "Email", "Class", "Attendance%");
        System.out.println("-".repeat(80));
        
        for (Student student : results) {
            System.out.printf("%-10s %-20s %-25s %-10s %-10.1f%%%n",
                             student.getStudentId(),
                             student.getName(),
                             student.getEmail(),
                             student.getClassName(),
                             student.getAttendancePercentage());
        }
    }
    
    private void removeStudent() {
        System.out.println("\n=== Remove Student ===");
        String studentId = getStringInput("Enter Student ID to remove: ");
        
        if (manager.removeStudent(studentId)) {
            System.out.println("Student removed successfully!");
        } else {
            System.out.println("Student not found.");
        }
    }
    
    private String getStringInput(String prompt) {
        System.out.print(prompt);
        return scanner.nextLine().trim();
    }
    
    private int getIntInput(String prompt) {
        while (true) {
            try {
                System.out.print(prompt);
                return Integer.parseInt(scanner.nextLine().trim());
            } catch (NumberFormatException e) {
                System.out.println("Please enter a valid number.");
            }
        }
    }
}
