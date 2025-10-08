@echo off
echo ========================================
echo Attendance Management System
echo ========================================
echo.

echo Compiling Java files...
javac *.java

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Compilation failed!
    echo Please check that you have Java installed and the files are correct.
    pause
    exit /b 1
)

echo.
echo Compilation successful!
echo.
echo Starting the Attendance Management System...
echo.
echo NOTE: For the full GUI experience, open index.html in your web browser.
echo This console application is for testing the backend functionality.
echo.

java AttendanceSystem

echo.
echo Thank you for using the Attendance Management System!
pause
