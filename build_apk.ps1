$EnvDir = "E:\AI\Antigravity\Time Nest\.android_env"
$env:JAVA_HOME = "$EnvDir\jdk-17.0.11+9"
$env:ANDROID_HOME = "$EnvDir\sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:PATH"

Write-Output "Accepting Android SDK licenses..."
# This accepts all licenses by sending multiple 'y's
"y`ny`ny`ny`ny`ny`ny`ny" | sdkmanager --licenses

Write-Output "Syncing Capacitor..."
npx cap sync android

Write-Output "Building APK via Gradle..."
cd android
.\gradlew.bat assembleDebug

Write-Output "Build completed. Moving APK to public/timenest.apk"
cd ..
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" -Destination "public\timenest.apk" -Force
