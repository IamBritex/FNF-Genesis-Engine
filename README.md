neu run

neu build

neu update


--- ANDROID ---


npx cap sync

    (optional)
    
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export JAVA_HOME=/snap/android-studio/current/jbr
export CAPACITOR_ANDROID_STUDIO_PATH=/snap/bin/android-studio


npx cap run android

npx cap open android