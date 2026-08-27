$EnvDir = "E:\AI\Programas\Emulador Android"
$env:JAVA_HOME = "$EnvDir\jdk-17.0.11+9"
$env:ANDROID_HOME = "$EnvDir\sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:PATH"

Write-Output "Cleaning all old APK files from public, dist, and native assets..."
Get-ChildItem -Path . -Include *.apk -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Output "Building web bundle..."
npm run build

Write-Output "Accepting Android SDK licenses..."
"y`ny`ny`ny`ny`ny`ny`ny" | sdkmanager --licenses

Write-Output "Syncing Capacitor..."
npx cap sync android

Write-Output "Building clean APK via Gradle..."
cd android
.\gradlew.bat clean assembleDebug
cd ..

Write-Output "Build completed. Copying fresh clean APK (timenest_v3.1.0.apk) to public and dist..."
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" -Destination "public\timenest_v3.1.0.apk" -Force
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" -Destination "dist\timenest_v3.1.0.apk" -Force

$apkSize = (Get-Item "public\timenest_v3.1.0.apk").Length / 1MB
Write-Output ("Clean APK generated! File size: {0:N2} MB" -f $apkSize)
