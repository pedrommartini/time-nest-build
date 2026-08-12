$EnvDir = "E:\AI\Antigravity\Time Nest\.android_env"
$env:JAVA_HOME = "$EnvDir\jdk-17.0.11+9"
$env:ANDROID_HOME = "$EnvDir\sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:PATH"

Write-Output "Cleaning old APK files to prevent recursive size growth..."
Remove-Item -Path "public\timenest.apk" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "dist\timenest.apk" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "android\app\src\main\assets\public\timenest.apk" -Force -ErrorAction SilentlyContinue

Write-Output "Building web bundle without APK..."
npm run build

Write-Output "Accepting Android SDK licenses..."
"y`ny`ny`ny`ny`ny`ny`ny" | sdkmanager --licenses

Write-Output "Syncing Capacitor..."
npx cap sync android

Write-Output "Building APK via Gradle..."
cd android
.\gradlew.bat assembleDebug
cd ..

Write-Output "Build completed. Copying fresh clean APK to public/timenest.apk"
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" -Destination "public\timenest.apk" -Force
