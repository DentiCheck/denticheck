$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools"

Write-Host "Setting ANDROID_HOME to $env:ANDROID_HOME"
Write-Host "Added platform-tools to Path"

# Verify adb
adb version

# Reverse ports for Metro
adb reverse tcp:8081 tcp:8081

# Run Expo
npx expo run:android
